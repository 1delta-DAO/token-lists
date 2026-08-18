import { Chain } from '@1delta/chain-registry'

/**
 * Spectra V2 principal / yield / interest-bearing tokens, from the app API.
 *
 * The Pendle sibling (`../pendle`) is the template and the differences are all
 * upstream ones, each of which is a silent bug if carried over unchanged:
 *
 *  1. **The route key is a network NAME, not a chain id.** `/api/v1/1/pools`
 *     answers `400 {"error":"Invalid network"}`, and there is no route that
 *     enumerates the valid names — so {@link SPECTRA_NETWORKS} is
 *     hand-maintained and a new Spectra chain stays invisible until it is
 *     added here. Pendle's single global listing has no such failure mode.
 *  2. **One request per network**, since no global listing exists.
 *  3. `maturity` is unix SECONDS (Pendle's `expiry` is ISO-8601).
 *  4. There is no separate assets endpoint — the pools payload embeds a full
 *     token record (address, symbol, name, decimals, logo) for the PT, YT, IBT
 *     and underlying alike.
 *
 * Kept deliberately in sync with `@1delta/margin-fetcher`'s `vaults/spectra`
 * provider, which reads the same endpoint for the earn rows. The two are
 * independent readers of one source, not a shared client — this file must run
 * with no workspace dependency beyond the chain registry.
 */

/** Chain id → the network name the API routes on. Verified live 2026-08-17. */
export const SPECTRA_NETWORKS: Record<string, string> = {
  '1': 'mainnet',
  '10': 'optimism',
  '14': 'flare',
  '56': 'bsc',
  '143': 'monad',
  '146': 'sonic',
  '999': 'hyperevm',
  '8453': 'base',
  '42161': 'arbitrum',
  '43114': 'avalanche',
  '43111': 'hemi',
  '747474': 'katana',
}

export interface SpectraToken {
  address?: string
  chainId?: number
  name?: string
  symbol?: string
  decimals?: number
  logoURI?: string
  protocol?: string
}

export interface SpectraPool {
  address?: string
  type?: string
  liquidity?: { underlying?: number | null; usd?: number | null }
}

export interface SpectraMarket {
  /** The PrincipalToken contract. */
  address?: string
  chainId?: number
  name?: string
  symbol?: string
  decimals?: number
  /** Unix SECONDS. */
  maturity?: number
  yt?: SpectraToken
  ibt?: SpectraToken
  baseIbt?: SpectraToken
  underlying?: SpectraToken
  pools?: SpectraPool[]
  tags?: string[]
}

const isAddress = (v: unknown): v is string => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)

const lower = (v: unknown): string | undefined => (isAddress(v) ? v.toLowerCase() : undefined)

/**
 * Is this IBT Spectra's own `Spectra4626Wrapper`, rather than a third-party
 * yield token Spectra merely accepts?
 *
 * Both markers are checked because either alone has a plausible failure: the
 * symbol convention could change, and the name is a free-text field. A miss
 * here is safe in one direction only — a wrapper we fail to recognise is
 * simply absent from the list, while a third-party token we wrongly claim
 * overwrites a curated entry.
 */
function isSpectraWrapper(ibt: SpectraToken): boolean {
  const name = (ibt.name ?? '').toLowerCase()
  const symbol = (ibt.symbol ?? '').toLowerCase()
  return name.startsWith('spectra erc4626') || symbol.startsWith('sw-')
}

/** Fetch one network's listing. A failure is logged and yields nothing. */
async function fetchNetwork(network: string): Promise<SpectraMarket[]> {
  const url = `https://app.spectra.finance/api/v1/${network}/pools`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      console.warn(`  spectra ${network}: HTTP ${res.status}`)
      return []
    }
    const json = await res.json()
    return Array.isArray(json) ? (json as SpectraMarket[]) : []
  } catch (e: any) {
    console.warn(`  spectra ${network}: ${e?.message ?? e}`)
    return []
  }
}

export interface SpectraTokenEntry {
  chainId: string
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  tags?: string[]
  props?: { spectra: SpectraProps }
}

export interface SpectraProps {
  /** `PT` — the fixed-rate leg. `YT` — the floating leg. `IBT` — the wrapper. */
  tokenType: 'PT' | 'YT' | 'IBT'
  /** The Curve StableSwap-NG pool the PT trades on. */
  poolAddress?: string
  ptAddress?: string
  ytAddress?: string
  /** The interest-bearing token the PT is minted from (the SY analogue). */
  ibtAddress?: string
  /** The vault behind a `Spectra4626Wrapper` IBT. */
  baseIbtAddress?: string
  /** What the PT redeems for at maturity. */
  underlyingAsset?: string
  /**
   * Unix SECONDS.
   *
   * **There is deliberately no `expired` boolean here**, unlike
   * `props.pendle.expired`. A generated flag is only as fresh as the last
   * regeneration, and a PT that matures the day after a run keeps advertising
   * itself as live until the next one — which is precisely the staleness the
   * margin-fetcher provider re-derives from the clock at every layer, and
   * which yield-tracer migration 0088 already had to clean up once. Consumers
   * compare this against `now`.
   */
  maturity?: number
}

export interface SpectraAssetList {
  [chainId: string]: { [address: string]: SpectraTokenEntry }
}

/**
 * Build the Spectra asset list across every known network.
 *
 * Emits PT, YT and IBT entries. The LP token is skipped — it is an AMM
 * position with impermanent loss, not a token a lending or earn surface should
 * treat as an asset (the same call `pendleAssetsFromApi` makes for
 * `PENDLE_LP`).
 */
export async function processSpectraAssets(): Promise<SpectraAssetList> {
  console.log('Processing Spectra assets from API...')

  const chains = await fetch('https://raw.githubusercontent.com/1delta-DAO/chains/main/data.json').then((x) => x.json())

  const entries = await Promise.all(
    Object.entries(SPECTRA_NETWORKS).map(async ([chainId, network]) => ({
      chainId,
      network,
      markets: await fetchNetwork(network),
    })),
  )

  const assetList: SpectraAssetList = {}

  for (const { chainId, network, markets } of entries) {
    if (!Object.values(Chain).includes(chainId as Chain)) {
      console.warn(`  spectra ${network}: chain ${chainId} not in the registry — skipped`)
      continue
    }
    if (markets.length === 0) continue

    const chainSuffix = chains[chainId]?.name?.split(' ')[0]

    for (const m of markets) {
      const pt = lower(m.address)
      const underlying = lower(m.underlying?.address)
      if (!pt) continue

      const pool = (m.pools ?? []).find((p) => lower(p.address))
      const shared = {
        poolAddress: lower(pool?.address),
        ptAddress: pt,
        ytAddress: lower(m.yt?.address),
        ibtAddress: lower(m.ibt?.address),
        baseIbtAddress: lower(m.baseIbt?.address),
        underlyingAsset: underlying,
        maturity: typeof m.maturity === 'number' && Number.isFinite(m.maturity) ? m.maturity : undefined,
      }

      // The PT carries no logo of its own in the payload; Spectra's own UI
      // shows the IBT's, which is also what makes the row recognisable.
      const fallbackLogo = m.ibt?.logoURI ?? m.baseIbt?.logoURI ?? m.underlying?.logoURI

      const push = (entry: SpectraTokenEntry) => {
        if (!assetList[chainId]) assetList[chainId] = {}
        assetList[chainId][entry.address] = entry
      }

      const named = (base: string | undefined, fallback: string) =>
        chainSuffix ? `${base ?? fallback} ${chainSuffix}` : (base ?? fallback)

      if (typeof m.decimals === 'number' && m.symbol) {
        push({
          chainId,
          name: named(m.name, m.symbol),
          symbol: m.symbol,
          address: pt,
          decimals: m.decimals,
          logoURI: fallbackLogo,
          tags: ['PT', 'spectra'],
          props: { spectra: { tokenType: 'PT', ...shared } },
        })
      }

      const yt = lower(m.yt?.address)
      if (yt && typeof m.yt?.decimals === 'number') {
        // The API ships no symbol/name for the YT — derive them from the PT's,
        // which is what makes a YT row identifiable at all. Never reuse the
        // PT's symbol verbatim: they are opposite sides of the same trade.
        const ytSymbol = m.yt.symbol ?? (m.symbol ? m.symbol.replace(/^PT-/, 'YT-') : undefined)
        if (ytSymbol) {
          push({
            chainId,
            name: named(m.yt.name ?? m.name?.replace(/^Principal Token/, 'Yield Token'), ytSymbol),
            symbol: ytSymbol,
            address: yt,
            decimals: m.yt.decimals,
            logoURI: fallbackLogo,
            tags: ['YT', 'spectra'],
            props: { spectra: { tokenType: 'YT', ...shared } },
          })
        }
      }

      // Only Spectra's OWN wrapper is emitted, never a plain third-party IBT.
      //
      // This is the one place the Pendle template does not transfer. Pendle's
      // SY is a Pendle-specific contract nobody else lists, so emitting it is
      // free. A Spectra IBT is usually NOT Spectra's — 23 of 36 live markets
      // are minted from someone else's token (`steakUSDC`, `yvvbUSDC`,
      // `sUSG`, `stXRP`, …), all of which we already curate. The generator
      // takes the FIRST list that carries an address and discards the rest,
      // and only a `1delta`-tagged list supplies a curated `assetGroup` — so
      // an early Spectra entry for `steakUSDC` would silently replace the
      // curated row with an auto-derived group. That is the identity-collision
      // failure in AGENTS.md, arrived at from the other direction.
      //
      // `Spectra4626Wrapper` tokens (`sw-…`) are genuinely Spectra's, exist
      // nowhere else, and are safe to claim.
      const ibt = lower(m.ibt?.address)
      if (ibt && typeof m.ibt?.decimals === 'number' && m.ibt.symbol && isSpectraWrapper(m.ibt)) {
        push({
          chainId,
          name: named(m.ibt.name, m.ibt.symbol),
          symbol: m.ibt.symbol,
          address: ibt,
          decimals: m.ibt.decimals,
          logoURI: m.ibt.logoURI,
          tags: ['IBT', 'spectra'],
          // A wrapper is shared by every market minted from it, so it carries
          // no maturity and no pool — those belong to a PT, not to the wrapper.
          props: {
            spectra: {
              tokenType: 'IBT',
              ibtAddress: ibt,
              baseIbtAddress: shared.baseIbtAddress,
              underlyingAsset: underlying,
            },
          },
        })
      }
    }
  }

  const total = Object.values(assetList).reduce((sum, chain) => sum + Object.keys(chain).length, 0)
  console.log(`Processed ${total} Spectra assets across ${Object.keys(assetList).length} chains`)

  return assetList
}
