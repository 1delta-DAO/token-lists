/**
 * Port a `logoURI` across an asset's other deployments.
 *
 * The same asset arrives from a different source list on every chain, and only
 * some of those sources carry an icon — so one token routinely renders branded
 * on Ethereum and as a blank circle on Base. That is not a data gap anyone
 * reports, it just looks broken. bfBTC was the case that prompted this: five
 * chains carried the CoinGecko icon, Hemi carried a self-hosted one, and three
 * deployments — including Pharos, which holds 330 bfBTC — carried none.
 *
 * The pass is deliberately NON-DESTRUCTIVE: it only fills an entry that has no
 * `logoURI` at all, and never replaces one. Two chains disagreeing about which
 * icon to use is a cosmetic difference; overwriting a curated icon with a
 * scraped one is a regression, and there is no way to tell them apart from
 * here.
 *
 * Grouping is by the ALIASED asset group (`aliasAssetGroup`), the same key the
 * generator writes, CASE-FOLDED — otherwise a case-split group like
 * `BitFi Bitcoin::bfBTC` vs `::BFBTC` hides the very donors it needs, and the
 * alias map only covers the splits someone already noticed by hand. Two groups
 * whose `name::symbol` differs only in case are the same asset; nothing else in
 * the repo tells them apart. Folding found donors for 660 groups the alias map
 * still had listed as having no icon anywhere.
 *
 *   npx tsx logos/backfillLogos.ts                    # dry run, whole repo
 *   npx tsx logos/backfillLogos.ts --group BitFi      # dry run, filtered
 *   npx tsx logos/backfillLogos.ts --group BitFi --apply
 *   npx tsx logos/backfillLogos.ts --apply --no-verify
 *
 * Run `pnpm format` afterwards — writing the lists re-expands objects the
 * files store on one line.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { aliasAssetGroup } from '../utils/data/assetGroupUnifier'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

interface TokenListFile {
  chainId: string
  version: string
  list: { [address: string]: any }
}

/**
 * Icons we host ourselves win a tie.
 *
 * Not a preference for our own branding: a `raw.githubusercontent.com` path we
 * control cannot be re-numbered or expired the way a scraped CDN URL with a
 * cache-busting query can, and it is the only candidate whose lifetime we can
 * actually promise. It only ever decides a TIE — a genuine majority still wins,
 * because agreeing with the other chains matters more than the host.
 */
const isSelfHosted = (uri: string) => uri.includes('1delta-DAO/asset-icons')

const listFiles = (): string[] =>
  fs
    .readdirSync(repoRoot)
    .filter((f) => /^\d+\.json$/.test(f))
    .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')))

/** HEAD the winner before copying it onto more chains — porting a dead URL
 *  just multiplies a broken icon, and a 404 here is common enough (a token
 *  delisted from the source CDN keeps its stale link in the lists). */
const resolves = async (uri: string): Promise<boolean> => {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    // Some CDNs refuse HEAD; fall back to a ranged GET rather than trusting a 405.
    let res = await fetch(uri, { method: 'HEAD', signal: ctrl.signal })
    if (res.status === 405 || res.status === 403)
      res = await fetch(uri, { headers: { range: 'bytes=0-0' }, signal: ctrl.signal })
    clearTimeout(timer)
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')
  } catch {
    return false
  }
}

interface Holder {
  file: string
  chainId: string
  address: string
  symbol: string
}

async function main() {
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const verify = !argv.includes('--no-verify')
  const gi = argv.indexOf('--group')
  const filter = gi >= 0 ? argv[gi + 1]?.toLowerCase() : undefined

  const files = new Map<string, TokenListFile>()
  // group → logoURI → holders that already carry it
  const donors = new Map<string, Map<string, Holder[]>>()
  const gaps = new Map<string, Holder[]>()
  // case-folded key -> the spelling to print, so the log still reads naturally
  const label = new Map<string, string>()

  for (const f of listFiles()) {
    const parsed: TokenListFile = JSON.parse(
      fs.readFileSync(path.join(repoRoot, f), 'utf-8'),
    )
    files.set(f, parsed)
    for (const [address, t] of Object.entries(parsed.list ?? {})) {
      const groupName = aliasAssetGroup(t.assetGroup ?? '')
      if (!groupName) continue
      const group = groupName.toLowerCase()
      if (filter && !group.includes(filter)) continue
      if (!label.has(group)) label.set(group, groupName)
      const holder: Holder = {
        file: f,
        chainId: String(t.chainId ?? f.replace('.json', '')),
        address,
        symbol: t.symbol ?? '',
      }
      if (t.logoURI) {
        if (!donors.has(group)) donors.set(group, new Map())
        const byUri = donors.get(group)!
        if (!byUri.has(t.logoURI)) byUri.set(t.logoURI, [])
        byUri.get(t.logoURI)!.push(holder)
      } else {
        if (!gaps.has(group)) gaps.set(group, [])
        gaps.get(group)!.push(holder)
      }
    }
  }

  let filled = 0
  let unverifiable = 0
  const touched = new Set<string>()
  const noDonor: string[] = []

  for (const [group, missing] of [...gaps.entries()].sort()) {
    const byUri = donors.get(group)
    if (!byUri || byUri.size === 0) {
      noDonor.push(`${label.get(group)} (${missing.length})`)
      continue
    }
    // Majority wins; self-hosted breaks a tie; then the lowest chain id, so the
    // choice is reproducible rather than dependent on file order.
    const winner = [...byUri.entries()].sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length
      if (isSelfHosted(a[0]) !== isSelfHosted(b[0])) return isSelfHosted(a[0]) ? -1 : 1
      return Math.min(...a[1].map((h) => Number(h.chainId))) - Math.min(...b[1].map((h) => Number(h.chainId)))
    })[0]

    if (verify && !(await resolves(winner[0]))) {
      unverifiable += missing.length
      console.log(
        `SKIP  ${label.get(group)} — the only candidate does not resolve as an image: ${winner[0]}`,
      )
      continue
    }

    const from = winner[1].map((h) => h.chainId).join(',')
    const to = missing.map((h) => h.chainId).join(',')
    console.log(
      `${apply ? 'FILL ' : 'would'} ${label.get(group)}\n        ${winner[0]}\n        from chain(s) ${from} → ${to}` +
        (byUri.size > 1 ? `  [${byUri.size} candidates, majority ${winner[1].length}]` : ''),
    )
    filled += missing.length
    if (apply) {
      for (const h of missing) {
        files.get(h.file)!.list[h.address].logoURI = winner[0]
        touched.add(h.file)
      }
    }
  }

  if (apply) {
    for (const f of touched)
      fs.writeFileSync(
        path.join(repoRoot, f),
        JSON.stringify(files.get(f), null, 2) + '\n',
      )
  }

  console.log(
    `\n${apply ? 'Filled' : 'Would fill'} ${filled} entries across ${touched.size || new Set([...gaps.values()].flat().map((h) => h.file)).size} chain files.` +
      (unverifiable ? ` Skipped ${unverifiable} whose only candidate 404s.` : ''),
  )
  if (noDonor.length)
    console.log(
      `${noDonor.length} groups have no logo on ANY chain (nothing to port): ${noDonor.slice(0, 10).join(', ')}${noDonor.length > 10 ? ', …' : ''}`,
    )
  if (apply) console.log('Run `pnpm format` before committing.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
