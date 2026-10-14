#!/usr/bin/env bash
set -euo pipefail

# update-1delta.sh — bump every @1delta/* package across this repo to its
# latest published version, then install in each package dir that changed
# (`pnpm install` next to a pnpm-lock.yaml, `npm install` next to a
# package-lock.json). Same script in yield-tracer, pos-indexer and
# token-lists; this copy also takes exact pins and npm lockfiles.
#
# Usage:
#   ./update-1delta.sh             # update to latest, install, typecheck
#   ./update-1delta.sh --check     # report drift only; exit non-zero if any
#   ./update-1delta.sh --dry-run   # show planned changes, write nothing
#   ./update-1delta.sh --no-build  # skip the post-install typecheck / build
#   ./update-1delta.sh --allow-major  # permit MAJOR-version jumps (see below)
#   ./update-1delta.sh --skip-unavailable  # bump what the registry can serve,
#                                          # skip versions whose tarball 404s
#
# Notes
# - Walks every package.json under the repo (excluding node_modules) that
#   references "@1delta/" — so both deps AND pnpm.overrides get bumped in
#   lockstep. Mismatched overrides make `pnpm install` error, so we always
#   update them together via a single in-place sed.
# - Uses `npm view <pkg> version` for the registry lookup. No jq dependency.
# - Pin format is preserved: an exact `X.Y.Z` stays exact (pos-indexer's
#   standalone apps), a `^X.Y.Z` / `~X.Y.Z` keeps its prefix (caret on 0.0.x
#   is effectively a pin under semver).
# - After the install, each changed dir runs its `typecheck` script (else its
#   `build`), and `scripts/check-deps.mjs` runs when the repo has one — in
#   pos-indexer that is the guard that keeps heavy @1delta/* imports out of
#   `packages/*` (only the standalone apps may use them).
# - The `--no-build` escape hatch is for the rare case the new package
#   genuinely breaks the build and you want to keep the lockfile change
#   while you fix the call sites.
# - MAJOR jumps are REFUSED by default. Our registry history is not always
#   clean — `@1delta/margin-fetcher` runs 0.0.409 -> 0.0.2889 -> 0.0.3423 ->
#   5.0.0, so `latest` can cross a major boundary (or land on a different
#   release track entirely) without anyone intending it. Silently rewriting a
#   pin across that line is how a repo ends up on a package it was never
#   tested against. Re-run with `--allow-major` once you have decided the
#   jump is real.
# - A freshly published version is REFUSED until its tarball is actually
#   served. npm updates the packument (what `npm view` reads) the instant a
#   publish lands, but the .tgz lags behind on the registry CDN — usually a
#   few minutes. In that window `latest` resolves fine, the sed runs, and
#   `pnpm install` dies with ERR_PNPM_FETCH_404, leaving package.json bumped
#   and the lockfile untouched (2026-09-16, calldata-sdk 0.0.212). Because
#   @1delta/* release in lockstep, one unavailable tarball aborts the whole
#   run before anything is written; `--skip-unavailable` bumps the rest.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DRY=0
CHECK=0
DO_BUILD=1
ALLOW_MAJOR=0
SKIP_UNAVAILABLE=0
SKIPPED_MAJOR=()
for arg in "${@:-}"; do
  case "$arg" in
    ""|--) ;;
    --dry-run) DRY=1 ;;
    --check)   CHECK=1; DRY=1 ;;
    --no-build) DO_BUILD=0 ;;
    --allow-major) ALLOW_MAJOR=1 ;;
    --skip-unavailable) SKIP_UNAVAILABLE=1 ;;
    -h|--help)
      sed -n '3,49p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# ── 1. Find every package.json that references @1delta/ ─────────────────
mapfile -t PKG_FILES < <(
  grep -rl --include=package.json --exclude-dir=node_modules --exclude-dir=.git \
    --exclude-dir=dist '@1delta/' . 2>/dev/null \
  | grep -v '/node_modules/' \
  | sort
)

if [[ ${#PKG_FILES[@]} -eq 0 ]]; then
  echo "no package.json files reference @1delta/*"
  exit 0
fi

# Collect unique @1delta/* package names referenced anywhere.
mapfile -t PKGS < <(
  grep -h -oE '"@1delta/[a-z0-9-]+"' "${PKG_FILES[@]}" \
  | sort -u | tr -d '"'
)

echo "Found ${#PKGS[@]} @1delta package(s) across ${#PKG_FILES[@]} package.json file(s)"

# ── 2. Resolve latest versions in parallel, and verify each tarball ────
# One `npm view` per package gives version + tarball URL + publish times;
# a HEAD on the tarball tells us whether the registry can actually serve it
# yet (see the note in the header).
declare -A LATEST
UNAVAILABLE=()
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
for pkg in "${PKGS[@]}"; do
  safe=${pkg//\//__}
  (
    npm view "$pkg" version dist.tarball time --json 2>/dev/null > "$TMPDIR/$safe.json" || exit 0
    # -> "<version> <tarball-url> <age>" ; age is minutes/hours since publish
    node -e '
      const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const v = d.version; if (!v) process.exit(0);
      const url = d["dist.tarball"] || "";
      const t = (d.time || {})[v];
      const m = t ? Math.round((Date.now() - Date.parse(t)) / 60000) : -1;
      const age = m < 0 ? "?" : m < 60 ? m + "min" : Math.round(m / 60) + "h";
      console.log(v, url, age);
    ' "$TMPDIR/$safe.json" > "$TMPDIR/$safe" 2>/dev/null || exit 0
    read -r _v url _age < "$TMPDIR/$safe" || exit 0
    code=000
    if [[ -n "$url" ]]; then
      code=$(curl -sS -o /dev/null -w '%{http_code}' -I --max-time 30 "$url" 2>/dev/null || echo 000)
    fi
    printf '%s\n' "$code" > "$TMPDIR/$safe.http"
  ) &
done
wait
for pkg in "${PKGS[@]}"; do
  safe=${pkg//\//__}
  v=""; url=""; age="?"
  read -r v url age < "$TMPDIR/$safe" 2>/dev/null || true
  if [[ -z "$v" ]]; then
    echo "  ! could not resolve latest for $pkg — skipping" >&2
    continue
  fi
  code=$(cat "$TMPDIR/$safe.http" 2>/dev/null || echo 000)
  if [[ "$code" != "200" ]]; then
    echo "  ! $pkg@$v: tarball not served yet (HTTP $code, published ${age} ago) — skipping" >&2
    UNAVAILABLE+=("$pkg@$v (published ${age} ago, HTTP $code)")
    continue
  fi
  LATEST[$pkg]="$v"
done

if [[ ${#UNAVAILABLE[@]} -gt 0 ]]; then
  echo
  echo "latest is published but its tarball is not on the registry yet (${#UNAVAILABLE[@]}):"
  printf '  %s\n' "${UNAVAILABLE[@]}"
  if [[ $DRY -eq 0 && $SKIP_UNAVAILABLE -eq 0 ]]; then
    echo
    echo "@1delta/* packages release in lockstep, so nothing was written." >&2
    echo "Re-run in a few minutes, or pass --skip-unavailable to bump the rest anyway." >&2
    exit 3
  fi
  echo
fi

# ── 3. Update every (pkg, file) pair where the pinned version drifts ───
CHANGED_DIRS=()
ANY_DRIFT=0
for f in "${PKG_FILES[@]}"; do
  workspace_dir=$(dirname "$f")
  changed_this_file=0
  for pkg in "${!LATEST[@]}"; do
    latest=${LATEST[$pkg]}
    # Find every distinct currently-pinned version of this package in this
    # file. There can be more than one (dep + overrides) but they SHOULD
    # be identical — if they aren't, we bump all of them to `latest`.
    mapfile -t currents < <(
      grep -oE "\"$pkg\": *\"[~^]?[0-9.]+\"" "$f" \
      | sed -E 's/.*"[~^]?([0-9.]+)"$/\1/' \
      | sort -u
    )
    [[ ${#currents[@]} -eq 0 ]] && continue
    for cur in "${currents[@]}"; do
      if [[ "$cur" == "$latest" ]]; then continue; fi
      # Refuse to cross a major boundary unless explicitly allowed.
      cur_major=${cur%%.*}
      latest_major=${latest%%.*}
      if [[ $ALLOW_MAJOR -eq 0 && "$cur_major" != "$latest_major" ]]; then
        echo "  ${f#./}: $pkg $cur -> $latest  [SKIPPED: major bump — re-run with --allow-major]"
        SKIPPED_MAJOR+=("$pkg $cur -> $latest")
        continue
      fi
      ANY_DRIFT=1
      echo "  ${f#./}: $pkg $cur -> $latest"
      if [[ $DRY -eq 0 ]]; then
        # Escape dots in `cur` so the sed pattern is literal. The package
        # name has a slash, which is fine inside an alternative delimiter.
        cur_esc=${cur//./\\.}
        sed -E -i "s#(\"$pkg\": *\")([~^]?)$cur_esc\"#\\1\\2$latest\"#g" "$f"
        changed_this_file=1
      fi
    done
  done
  if [[ $changed_this_file -eq 1 ]]; then
    CHANGED_DIRS+=("$workspace_dir")
  fi
done

if [[ ${#SKIPPED_MAJOR[@]} -gt 0 ]]; then
  echo
  echo "major-version jumps NOT applied (${#SKIPPED_MAJOR[@]}):"
  printf '  %s\n' "${SKIPPED_MAJOR[@]}"
fi

if [[ $CHECK -eq 1 ]]; then
  if [[ $ANY_DRIFT -eq 1 ]]; then
    echo "drift detected"
    exit 1
  fi
  echo "all @1delta/* packages already at latest"
  exit 0
fi

if [[ $ANY_DRIFT -eq 0 ]]; then
  echo "all @1delta/* packages already at latest"
  exit 0
fi

if [[ $DRY -eq 1 ]]; then
  echo "(dry run — no files written)"
  exit 0
fi

# ── 4. Install in each affected dir, with the package manager its lockfile names
mapfile -t UNIQUE_DIRS < <(printf '%s\n' "${CHANGED_DIRS[@]}" | sort -u)
pm_of() { [[ -f "$1/package-lock.json" && ! -f "$1/pnpm-lock.yaml" ]] && echo npm || echo pnpm; }
for d in "${UNIQUE_DIRS[@]}"; do
  pm=$(pm_of "$d")
  echo
  echo "== $pm install in $d =="
  (cd "$d" && $pm install)
done

# ── 5. Optional typecheck so the bump fails loudly on a breaking SDK ───
if [[ $DO_BUILD -eq 1 ]]; then
  for d in "${UNIQUE_DIRS[@]}"; do
    pm=$(pm_of "$d")
    # `typecheck` when the dir has one, else `build`, else nothing — keeps the
    # script generic across repos where some package.json files are leaf libs.
    script=$(cd "$d" && node -e "const s=require('./package.json').scripts||{};console.log(s.typecheck?'typecheck':s.build?'build':'')" 2>/dev/null || true)
    if [[ -n "$script" ]]; then
      echo
      echo "== $pm run $script in $d =="
      (cd "$d" && $pm run "$script")
    fi
  done
fi

# ── 6. The repo's own dependency guard, if it has one ───────────────────
if [[ -f "$ROOT/scripts/check-deps.mjs" ]]; then
  echo
  echo "== node scripts/check-deps.mjs =="
  node "$ROOT/scripts/check-deps.mjs"
fi

echo
echo "done. Updated workspaces:"
printf '  %s\n' "${UNIQUE_DIRS[@]}"
