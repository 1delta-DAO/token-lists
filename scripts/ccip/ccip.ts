// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { readChainLists } from '../labels/labelUtils'
import { CcipProps } from './ccipGroupMap'
import { CCIP_LEGACY } from './ccipLegacy'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Chainlink CCIP copies of assets we already list (`npm run ccip`).
 *
 * Many assets reach a chain twice: through the issuer's canonical bridge, and
 * through a Chainlink CCIP token pool at ANOTHER address (rsETH on Base is
 * Kelp's LayerZero `wrsETH` 0x1bc7… AND a CCIP rsETH 0xe211…; LINK on
 * Etherlink is two contracts). Third-party lists rarely carry the CCIP copy, so
 * the CCIP bridge roster (bridge-configs `generateCcipConstants.ts`, which keeps
 * a lane only when BOTH ends are in our lists) silently drops the asset.
 *
 * The rule (2026-10-29): a CCIP copy is the SAME asset — it shares the home
 * token's `assetGroup`, so it prices and earns like it — and carries the token's own
 * name, undecorated: for an issuer that ships over CCIP, CCIP IS the native bridge
 * (stake.link wstLINK, Kelp rsETH, Lombard LBTC), so "Bridged … (CCIP)" misdescribed the
 * live token. `props.ccip` (ccip-props.json) is what tells it from another copy in the
 * group on the same chain; a copy that REPLACED an older one retires it (ccipLegacy.ts). Arbitrum's USDC.e under `USDC` is the precedent for two addresses in
 * one group on one chain.
 *
 * Home = the family's lock/release chain (the pool that HOLDS the token), else
 * Ethereum, else the group most listed rows already agree on. Only rows whose
 * address is NOT otherwise in a chain list are emitted, and only when at least one
 * of their CCIP destinations is a chain we list — a copy with no lane we serve
 * is just noise. Families whose home group is itself a same-chain dedup
 * leftover (`X::<chain>::<n>`) are skipped: there is no clean group to join.
 *
 * CCIP is the asset's MAIN deployment (2026-11-03): an issuer pays Chainlink for the
 * pools, and a CCIP lane makes the two ends fungible. So every CCIP deployment we list —
 * not only the copies — is pinned to the home group: the lists file the same token as
 * `LINK`, `Chainlink::LINK` and `ChainLink Token::LINK` on different chains, and the
 * same-chain dedup handed the bare group to whichever row came first (Arbitrum's CCIP
 * ZCHF sat in `Frankencoin::ZCHF::42161::0` beside the old bridged ZCHF). The pin also
 * exempts the row from that dedup. {@link UNPINNED_FAMILIES} are the exceptions.
 *
 * Output:
 *  - `ccip.json` — a token list (CCIP_LIST in externalLists.ts, read before our
 *    own lists so its names win), one row per copy.
 *  - `ccip-groups.json` — `<chainId>:<address>` -> home assetGroup for every CCIP
 *    deployment, applied by the generator before the overlays and exempt from the
 *    same-chain dedup (an explicit ADDRESS_GROUP_OVERRIDE still wins).
 *  - `ccip-props.json` — chainId -> address -> `props.ccip` (pool, pool type, home
 *    chain, lanes to chains we list) for EVERY CCIP deployment we list, copy or not.
 *
 * A copy stays a copy across runs (last run's `ccip.json`, plus the "(CCIP)" suffix
 * copies carried until 2026-11-03), so the
 * snapshot does not empty itself once `generate` has put the copies into the lists.
 * Same-chain, same-group non-CCIP rows are printed as candidates for `ccipLegacy.ts`.
 *
 * Source: Chainlink's CCIP Directory API v1 (the same one the bridge roster
 * reads). Decimals are the Directory's; `onchain:decimals` re-checks them.
 */

const DIRECTORY_TOKENS = 'https://docs.chain.link/api/ccip/v1/tokens?environment=mainnet'
/** USDC is CCTP inside a CCIP wrapper and WETH carries a $45 flat token fee — the roster excludes both. */
const EXCLUDED_FAMILIES = new Set(['USDC', 'WETH'])
/** Retired (Blast, Abstract) or shutting down (Lisk) — never add a route into them. */
const SKIPPED_CHAINS = new Set(['81457', '2741', '1135'])
const DEDUP_GROUP = /::\d+::\d+$/
/**
 * Families whose listed (non-copy) deployments keep their own groups: the CCIP lane is not
 * the issuer's, or the home row is filed wrong, so pinning would mis-file the rest.
 */
const UNPINNED_FAMILIES = new Set([
  'USDT', // OpenUSDT (a third-party USDT wrapper) on the L2s, not Tether's own token
  'BTC.b', // Lombard's new BTC.b 0xb0f7… homes on Ethereum; Avalanche's original BTC.b stays in `BTC`
  'QUICK', // the home (Polygon 0xb5c0…, the NEW QUICK) is filed under `Quickswap (OLD)`
  'WASTR', // home is Astar's wrapped native; ASTR on Ethereum / Soneium belongs with `ASTR`
])

interface DirRow {
  chainId: number
  decimals: number
  destinations: string[]
  name: string
  symbol: string
  tokenAddress: string
  pool: { address: string; rawType: string; type: CcipProps['poolType']; version?: string }
}

type ListRow = { assetGroup?: string; name?: string; symbol?: string; logoURI?: string }

async function main() {
  const res = await fetch(DIRECTORY_TOKENS, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`CCIP Directory answered ${res.status}`)
  const families = ((await res.json()) as { data: { [family: string]: { [chainId: string]: DirRow } } }).data

  const lists: { [chainId: string]: Map<string, ListRow> } = {}
  for (const { chainId, tokens } of readChainLists()) {
    if (SKIPPED_CHAINS.has(chainId)) continue
    lists[chainId] = new Map(tokens.map((t) => [t.address.toLowerCase(), t as ListRow]))
  }
  const listed = (c: string, a: string) => lists[c]?.get(a.toLowerCase())

  // Last run's copies. Once `generate` has run, a copy IS in a chain list, so "not yet
  // listed" alone would drop it from the next snapshot — and with it its group, leaving the
  // copy in its own `Bridged … (CCIP)::SYM` group (the 2026-11-03 regression). A copy stays a
  // copy: last run's rows, plus any listed row still carrying the old "(CCIP)" name suffix.
  const prevCopies = new Set<string>()
  try {
    for (const r of JSON.parse(fs.readFileSync(path.resolve(__dirname, 'ccip.json'), 'utf-8')))
      prevCopies.add(`${r.chainId}:${String(r.address).toLowerCase()}`)
  } catch {}
  const isCopy = (c: string, a: string) => {
    const row = listed(c, a)
    return !row || prevCopies.has(`${c}:${a.toLowerCase()}`) || / \(CCIP\)$/.test(row.name ?? '')
  }

  const out: object[] = []
  const groups: { [key: string]: string } = {}
  const props: { [chainId: string]: { [address: string]: CcipProps } } = {}
  const legacyCandidates: string[] = []
  let skippedDedup = 0
  for (const [family, rows] of Object.entries(families)) {
    if (EXCLUDED_FAMILIES.has(family)) continue
    // the family's deployments the lists carry on their own — never our own copies, which
    // would otherwise vote for (or, holding a lock/release pool, become) their own home
    const ours = Object.entries(rows).filter(([c, r]) => lists[c] && !isCopy(c, r.tokenAddress))
    if (!ours.length) continue

    const lockRelease = ours.find(([, r]) => /LockRelease/.test(r.pool.rawType))
    let home = lockRelease ?? ours.find(([c]) => c === '1')
    if (!home) {
      const votes = new Map<string, number>()
      for (const [c, r] of ours) {
        const g = listed(c, r.tokenAddress)!.assetGroup ?? ''
        votes.set(g, (votes.get(g) ?? 0) + 1)
      }
      const top = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
      home = ours.find(([c, r]) => listed(c, r.tokenAddress)!.assetGroup === top)!
    }

    // props.ccip — a fact about each deployment, written whatever its group turns out to be
    const setProps = (chainId: string, r: DirRow) => {
      const destinations = r.destinations.filter((d) => lists[d]).sort((a, b) => Number(a) - Number(b))
      if (!destinations.length) return
      ;(props[chainId] ??= {})[r.tokenAddress.toLowerCase()] = {
        pool: r.pool.address.toLowerCase(),
        poolType: r.pool.type,
        ...(r.pool.version ? { poolVersion: r.pool.version } : {}),
        home: home![0],
        destinations,
      }
    }
    for (const [chainId, r] of ours) setProps(chainId, r)

    const homeRow = listed(home[0], home[1].tokenAddress)!
    const homeGroup = homeRow.assetGroup
    if (!homeGroup) continue
    if (DEDUP_GROUP.test(homeGroup)) {
      skippedDedup++
      continue
    }

    // CCIP is the main deployment: the listed ones are pinned to the home group too (see
    // header) — all of them, not only those filed elsewhere today: a row already in the home
    // group may hold it only through last run's pin (an external list names it otherwise).
    if (!UNPINNED_FAMILIES.has(family))
      for (const [chainId, r] of ours) groups[`${chainId}:${r.tokenAddress.toLowerCase()}`] = homeGroup

    for (const [chainId, r] of Object.entries(rows)) {
      if (!lists[chainId]) continue
      const address = r.tokenAddress.toLowerCase()
      if (!isCopy(chainId, address)) continue
      if (!r.destinations.some((d) => lists[d])) continue
      // The Directory's own name for the copy ("Falcon USD") — home rows inherit whatever a
      // third-party list called them (USDf's chain-1 row is "Falcon Finance").
      out.push({
        chainId,
        name: r.name || homeRow.name || r.symbol,
        symbol: r.symbol,
        address,
        decimals: r.decimals,
        logoURI: homeRow.logoURI,
        tags: [],
      })
      groups[`${chainId}:${address}`] = homeGroup
      setProps(chainId, r)
    }

    // Another deployment of the same asset on a CCIP chain that is not CCIP: the CCIP one may
    // have REPLACED it (ccipLegacy.ts) — or it is a parallel bridge. Listed for review.
    if (UNPINNED_FAMILIES.has(family)) continue
    for (const [chainId, r] of Object.entries(rows)) {
      const address = r.tokenAddress.toLowerCase()
      if (!lists[chainId] || !(groups[`${chainId}:${address}`] ?? listed(chainId, address))) continue
      for (const [a2, t2] of lists[chainId]) {
        if (a2 === address || t2.assetGroup !== homeGroup || CCIP_LEGACY[`${chainId}:${a2}`]) continue
        legacyCandidates.push(`  ${homeGroup} @${chainId}: CCIP ${address} vs ${a2} "${t2.name}"`)
      }
    }
  }

  out.sort((a: any, b: any) => Number(a.chainId) - Number(b.chainId) || a.address.localeCompare(b.address))
  const sortedGroups = Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(path.resolve(__dirname, 'ccip.json'), JSON.stringify(out, null, 2) + '\n')
  fs.writeFileSync(path.resolve(__dirname, 'ccip-groups.json'), JSON.stringify(sortedGroups, null, 2) + '\n')
  const sortedProps = Object.fromEntries(
    Object.entries(props)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([c, m]) => [c, Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)))]),
  )
  fs.writeFileSync(path.resolve(__dirname, 'ccip-props.json'), JSON.stringify(sortedProps, null, 2) + '\n')
  console.log(
    `Wrote ccip.json: ${out.length} CCIP copies; ${Object.keys(groups).length} deployments pinned to ${new Set(Object.values(groups)).size} home groups` +
      ` (${skippedDedup} families skipped: home group is a dedup leftover);` +
      ` props.ccip on ${Object.values(sortedProps).reduce((n, m) => n + Object.keys(m).length, 0)} deployments`,
  )
  if (legacyCandidates.length)
    console.log(
      `${legacyCandidates.length} same-chain, same-group non-CCIP deployments — replaced (add to ccipLegacy.ts) or parallel?\n` +
        legacyCandidates.join('\n'),
    )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
