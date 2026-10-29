// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { readChainLists } from '../labels/labelUtils'

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
 * token's `assetGroup`, so it prices and earns like it — but its name says
 * "Bridged … (CCIP)" so a UI can tell it from the canonical copy on the same
 * chain. Arbitrum's USDC.e under `USDC` is the precedent for two addresses in
 * one group on one chain.
 *
 * Home = the family's lock/release chain (the pool that HOLDS the token), else
 * Ethereum, else the group most listed rows already agree on. Only rows whose
 * address is NOT yet in a chain list are emitted, and only when at least one
 * of their CCIP destinations is a chain we list — a copy with no lane we serve
 * is just noise. Families whose home group is itself a same-chain dedup
 * leftover (`X::<chain>::<n>`) are skipped: there is no clean group to join.
 *
 * Output:
 *  - `ccip.json` — a token list (CCIP_LIST in externalLists.ts, read before our
 *    own lists so its names win), one row per copy.
 *  - `ccip-groups.json` — `<chainId>:<address>` -> home assetGroup, applied by
 *    the generator after the dedup (an explicit ADDRESS_GROUP_OVERRIDE still wins).
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

interface DirRow {
  chainId: number
  decimals: number
  destinations: string[]
  name: string
  symbol: string
  tokenAddress: string
  pool: { rawType: string }
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

  const out: object[] = []
  const groups: { [key: string]: string } = {}
  let skippedDedup = 0
  for (const [family, rows] of Object.entries(families)) {
    if (EXCLUDED_FAMILIES.has(family)) continue
    const ours = Object.entries(rows).filter(([c, r]) => listed(c, r.tokenAddress))
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
    const homeRow = listed(home[0], home[1].tokenAddress)!
    const homeGroup = homeRow.assetGroup
    if (!homeGroup) continue
    if (DEDUP_GROUP.test(homeGroup)) {
      skippedDedup++
      continue
    }

    for (const [chainId, r] of Object.entries(rows)) {
      if (!lists[chainId]) continue
      const address = r.tokenAddress.toLowerCase()
      if (lists[chainId].has(address)) continue
      if (!r.destinations.some((d) => lists[d])) continue
      // The Directory's own name for the copy ("Falcon USD") — home rows inherit whatever a
      // third-party list called them (USDf's chain-1 row is "Falcon Finance").
      const baseName = r.name || homeRow.name || r.symbol
      out.push({
        chainId,
        name: /bridged/i.test(baseName) ? `${baseName} (CCIP)` : `Bridged ${baseName} (CCIP)`,
        symbol: r.symbol,
        address,
        decimals: r.decimals,
        logoURI: homeRow.logoURI,
        tags: [],
      })
      groups[`${chainId}:${address}`] = homeGroup
    }
  }

  out.sort((a: any, b: any) => Number(a.chainId) - Number(b.chainId) || a.address.localeCompare(b.address))
  const sortedGroups = Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(path.resolve(__dirname, 'ccip.json'), JSON.stringify(out, null, 2) + '\n')
  fs.writeFileSync(path.resolve(__dirname, 'ccip-groups.json'), JSON.stringify(sortedGroups, null, 2) + '\n')
  console.log(
    `Wrote ccip.json: ${out.length} CCIP copies over ${new Set(Object.values(groups)).size} groups` +
      ` (${skippedDedup} families skipped: home group is a dedup leftover)`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
