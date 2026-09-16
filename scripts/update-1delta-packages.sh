#!/usr/bin/env bash
# Bump every @1delta/* package in scripts/package.json to its latest npm release.
#
# Usage (from anywhere):
#   scripts/update-1delta-packages.sh            # install latest, update package.json + lockfile
#   scripts/update-1delta-packages.sh --dry-run  # only print installed vs latest
#   npm run update:1delta                        # same as the first form
#
# The generator gates every token on `Object.values(Chain)` from @1delta/chain-registry
# and reads wrapped-native addresses from @1delta/wnative, so a new chain only shows up
# in the lists once these packages are current. Run this before adding a chain.
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCOPE="@1delta"
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run | -n) DRY_RUN=1 ;;
    -h | --help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

cd "$SCRIPTS_DIR"

# All @1delta/* names across dependencies and devDependencies, in package.json order.
mapfile -t PACKAGES < <(node -e '
  const p = require("./package.json")
  const names = [...Object.keys(p.dependencies ?? {}), ...Object.keys(p.devDependencies ?? {})]
  for (const n of names) if (n.startsWith(process.argv[1] + "/")) console.log(n)
' "$SCOPE")

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  echo "no $SCOPE/* packages found in $SCRIPTS_DIR/package.json" >&2
  exit 1
fi

# Read node_modules/<pkg>/package.json directly: `require('<pkg>/package.json')` is blocked
# by packages that declare an `exports` map (e.g. @1delta/providers).
installed_version() {
  local f="node_modules/$1/package.json"
  [[ -f "$f" ]] && node -p "JSON.parse(require('fs').readFileSync('$f', 'utf8')).version" || echo '-'
}

declare -a TO_INSTALL=()
printf '%-28s %-10s %-10s\n' PACKAGE INSTALLED LATEST
for pkg in "${PACKAGES[@]}"; do
  current="$(installed_version "$pkg")"
  latest="$(npm view "$pkg" version 2>/dev/null || echo '?')"
  marker=''
  if [[ "$latest" != '?' && "$current" != "$latest" ]]; then
    marker='  <- update'
    TO_INSTALL+=("$pkg@$latest")
  fi
  printf '%-28s %-10s %-10s%s\n' "$pkg" "$current" "$latest" "$marker"
done

if [[ ${#TO_INSTALL[@]} -eq 0 ]]; then
  echo "all $SCOPE/* packages are already at their latest version"
  exit 0
fi

if [[ $DRY_RUN -eq 1 ]]; then
  echo "dry run: would run  npm install ${TO_INSTALL[*]}"
  exit 0
fi

echo "running: npm install ${TO_INSTALL[*]}"
# Pinning the resolved version (not `@latest`) keeps package.json and package-lock.json
# reproducible for `npm ci` in CI; npm still writes the usual caret range.
npm install "${TO_INSTALL[@]}"

echo
echo "updated. Review with:  git diff -- scripts/package.json scripts/package-lock.json"
