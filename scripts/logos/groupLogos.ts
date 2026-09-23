/**
 * Break the omni list down to just its icons.
 *
 * `omni-list.json` is the per-asset-group index (27 MB: every deployment of
 * every group, with props, decimals and addresses). Consumers that only want
 * to draw a token — a front end, a bot, a dashboard — end up either shipping
 * all of it or hand-curating a symbol→icon map of their own, which then rots
 * the moment a list gains a better icon. This pass writes that map for them,
 * straight off the generated omni list, so nobody curates icons by hand again:
 *
 *   logos.json             { "<assetGroup>": "<logoURI>" }   every group that resolves one
 *   logos-by-symbol.json   { "<SYMBOL>": "<logoURI>" }       one winner per ticker
 *
 * The group-keyed file is the exact join: every token row in every chain list
 * carries `assetGroup`, so a consumer that has a token has the key. The
 * symbol-keyed file is for consumers that only ever hold a ticker (a UI asset
 * mark, a balance row); it is a lossy view by construction — two unrelated
 * assets do ship the same ticker — so the winner is ranked, not arbitrary, and
 * groups flagged `suspicious`/`mimic` are never allowed to win one.
 *
 *   npx tsx logos/groupLogos.ts            # writes both files
 *   npx tsx logos/groupLogos.ts --check    # exit 1 if the files are stale (CI)
 *
 * Runs after `generate` (it reads that script's output), and is part of
 * `generate:formatted`. Unlike `backfillLogos.ts` this pass NEVER touches the
 * chain lists — it is a pure projection, so re-running it is always safe.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { GROUP_TO_GROUP_MAPPER } from '../utils/data/assetGroupUnifier'
import { OmniCurrency, OmniCurrencyList } from '../utils/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

const OMNI_PATH = path.join(repoRoot, 'omni-list.json')
const BY_GROUP_PATH = path.join(repoRoot, 'logos.json')
const BY_SYMBOL_PATH = path.join(repoRoot, 'logos-by-symbol.json')

/** Icons we host ourselves win a tie — see the same note in `backfillLogos.ts`:
 *  a path we control cannot be re-numbered or expired the way a scraped CDN URL
 *  with a cache-busting query can. It only ever decides a TIE. */
const isSelfHosted = (uri: string) => uri.includes('1delta-DAO/asset-icons')

/**
 * Field-by-field comparison of two rank tuples, lowest wins.
 *
 * NOT `a < b`: JavaScript compares arrays by stringifying them, so
 * `[0, -154] < [0, -1]` is false — "0,-154" sorts after "0,-1" on the comma —
 * and the 154-chain ETH group quietly lost its own ticker to a one-chain
 * CoinGecko film still. Anything that ranks by tuple needs this.
 */
type Rank = (number | string)[]
function compareRank(a: Rank, b: Rank): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i]
    const y = b[i]
    if (x === y) continue
    if (typeof x === 'number' && typeof y === 'number') return x - y
    return String(x) < String(y) ? -1 : 1
  }
  return 0
}

/**
 * An impostor never speaks for a ticker. The generator marks them
 * (`props.suspicious` / `props.mimic`, and a `::suspicious::<hash>` group key);
 * a fake "wstETH" winning the WSTETH row is exactly the failure this file would
 * otherwise introduce into every consumer at once.
 *
 * The flag is per DEPLOYMENT, so a group is only disqualified when the marked
 * rows are all it has. Testing `.some()` instead cost the real `ETH` group its
 * own ticker — 154 deployments, one of them flagged — and handed ETH to a
 * CoinGecko film still.
 */
const isSuspicious = (group: string, entry: OmniCurrency) =>
  group.includes('::suspicious::') || entry.currencies.every((c) => c.props?.suspicious || c.props?.mimic)

/**
 * The group's icon: its own `logoURI` when the generator settled one, otherwise
 * the deployments vote.
 *
 * 4292 groups carry no top-level icon (the generator only sets it from the first
 * deployment that had a name), and 45 of those have deployments that disagree —
 * so "first non-empty" would silently pick whichever chain happened to be read
 * first. Majority wins; ties go to a self-hosted icon, then to the lowest chain
 * id, which puts Ethereum's form first wherever the asset exists there.
 */
function resolveLogo(entry: OmniCurrency): string | undefined {
  if (entry.logoURI) return entry.logoURI
  const votes = new Map<string, { count: number; chainId: number }>()
  for (const c of entry.currencies) {
    const uri = c.logoURI
    if (!uri) continue
    const chainId = Number(c.chainId) || Number.MAX_SAFE_INTEGER
    const seen = votes.get(uri)
    if (seen) {
      seen.count++
      seen.chainId = Math.min(seen.chainId, chainId)
    } else {
      votes.set(uri, { count: 1, chainId })
    }
  }
  let best: string | undefined
  let bestRank: Rank | undefined
  for (const [uri, v] of votes) {
    const rank: Rank = [-v.count, isSelfHosted(uri) ? 0 : 1, v.chainId]
    if (!bestRank || compareRank(rank, bestRank) < 0) {
      best = uri
      bestRank = rank
    }
  }
  return best
}

/**
 * Which group owns a ticker.
 *
 * Ranked, because tickers are not unique and the loser is invisible: whoever
 * wins `WBTC` is what every consumer draws for it.
 *
 *   1. a deployment on Ethereum — the canonical home of nearly every asset that
 *      has one, and the cheapest way to tell the real tBTC (chains 1/130/137/
 *      8453/42161) from the two-chain `TBTC` group that only exists on Hemi and
 *      BOB;
 *   2. the widest chain footprint;
 *   3. main-token membership, LAST of the three signals on purpose — it is per
 *      chain, so a fork chain listing its copy as a main token outranked the
 *      real asset when this came before the footprint (the PulseChain sUSDS
 *      copy took the sUSDS ticker that way);
 *   4. the group key, so the file is stable across runs — an unstable tie-break
 *      would churn the nightly diff.
 */
const symbolRank = (group: string, entry: OmniCurrency, isMain: boolean): Rank => [
  entry.currencies.some((c) => String(c.chainId) === '1') ? 0 : 1,
  -entry.currencies.length,
  isMain ? 0 : 1,
  group,
]

/** group → the wrapper tickers that fold into it, the reverse of `mapAssetGroup`. */
const WRAPPERS_OF: { [group: string]: string[] } = Object.entries(GROUP_TO_GROUP_MAPPER).reduce(
  (acc, [wrapper, group]) => {
    const g = group.toUpperCase()
    ;(acc[g] ??= []).push(wrapper.toUpperCase())
    return acc
  },
  {} as { [group: string]: string[] },
)

/**
 * Tickers a group answers to, beyond its own `symbol`.
 *
 * Two gaps otherwise leave a real ticker to whichever fork claims it:
 *   · the group KEY, when the generator's canonical bare key disagrees with the
 *     symbol it backfilled — `WBTC` is keyed `WBTC` but carries `symbol: 'BTC'`,
 *     so without this the WBTC ticker fell through to a five-chain `Wrapped
 *     BTC::WBTC` fork;
 *   · the WRAPPED NATIVES, which `mapAssetGroup` folds away by design (WETH→ETH,
 *     WAVAX→AVAX, WBNB→BNB, WMATIC→POL …). No group is left keyed `WETH`, so the
 *     ticker went to a bridged Fantom row. The wrapper draws as its native.
 */
function tickersOf(group: string, entry: OmniCurrency): string[] {
  const out = new Set<string>()
  if (entry.symbol) out.add(entry.symbol.toUpperCase())
  if (!group.includes('::')) {
    out.add(group.toUpperCase())
    for (const w of WRAPPERS_OF[group.toUpperCase()] ?? []) out.add(w)
  }
  return [...out]
}

/** `chainId:address` of every token some chain list calls a main token. */
function readMainTokens(): Set<string> {
  const out = new Set<string>()
  try {
    const data: { [chainId: string]: string[] } = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'main-tokens.json'), 'utf8'),
    )
    for (const [chainId, addresses] of Object.entries(data))
      for (const a of addresses) out.add(`${chainId}:${String(a).toLowerCase()}`)
  } catch {
    // main-tokens.json is itself generated; without it the ticker tie-break just
    // falls through to the chain count, which is a weaker order, not a wrong one.
    console.warn('main-tokens.json not readable — ranking tickers without it')
  }
  return out
}

function main() {
  const check = process.argv.includes('--check')
  const omni: OmniCurrencyList = JSON.parse(fs.readFileSync(OMNI_PATH, 'utf8'))
  const mainTokens = readMainTokens()

  const byGroup: { [group: string]: string } = {}
  const bySymbol: { [symbol: string]: string } = {}
  const symbolWinner = new Map<string, Rank>()
  const contested = new Map<string, number>()
  let noLogo = 0

  for (const group of Object.keys(omni).sort()) {
    const entry = omni[group]
    const logoURI = resolveLogo(entry)
    if (!logoURI) {
      noLogo++
      continue
    }
    byGroup[group] = logoURI

    if (isSuspicious(group, entry)) continue
    const isMain = entry.currencies.some((c) => mainTokens.has(`${c.chainId}:${String(c.address).toLowerCase()}`))
    const rank = symbolRank(group, entry, isMain)
    for (const symbol of tickersOf(group, entry)) {
      const held = symbolWinner.get(symbol)
      if (held) contested.set(symbol, (contested.get(symbol) ?? 1) + 1)
      if (!held || compareRank(rank, held) < 0) {
        symbolWinner.set(symbol, rank)
        bySymbol[symbol] = logoURI
      }
    }
  }

  const files: [string, object][] = [
    [BY_GROUP_PATH, byGroup],
    [BY_SYMBOL_PATH, bySymbol],
  ]
  if (check) {
    // Compare parsed content, not bytes: `npm run format` re-indents these files.
    const stale = files.filter(([p, data]) => {
      try {
        return JSON.stringify(JSON.parse(fs.readFileSync(p, 'utf8'))) !== JSON.stringify(data)
      } catch {
        return true
      }
    })
    for (const [p] of stale) console.error(`stale: ${path.relative(repoRoot, p)}`)
    if (stale.length) process.exit(1)
    console.log('logos up to date')
    return
  }

  for (const [p, data] of files) fs.writeFileSync(p, JSON.stringify(data))

  const topContested = [...contested.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  console.log(
    `${Object.keys(byGroup).length} groups (${noLogo} without any icon) → logos.json\n` +
      `${Object.keys(bySymbol).length} tickers → logos-by-symbol.json` +
      (topContested.length ? `, most contested: ${topContested.map(([s, n]) => `${s}×${n}`).join(', ')}` : ''),
  )
}

main()
