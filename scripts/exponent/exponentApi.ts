import { TokenProps } from '../utils/types'

/**
 * Exponent Finance (Solana) — yield tokenisation, the Pendle model on SPL.
 *
 * THREE ENDPOINTS, AND WHY ALL THREE
 * ----------------------------------
 * Exponent's API is shaped like Pendle's `assets/all` + `markets/all` pair, but
 * the pieces sit in different places:
 *
 *  - `/vaults`    every vault ever deployed (85 today, 15 live), each with its
 *                 `pt_mint` / `yt_mint` / `sy_token`, its maturity
 *                 (`end_timestamp`) and the venues it trades on. This is the
 *                 ROSTER — it is the only endpoint that still lists a matured
 *                 vault, and a holder of a matured PT needs the token in the
 *                 list to redeem it (the Pendle `expired` lesson).
 *  - `/sy-tokens` the SY registry: name, ticker, DECIMALS, the underlying mint
 *                 it wraps, the platform. One SY serves every maturity of an
 *                 underlying, so this is also where the vault → underlying link
 *                 lives. `/vaults` carries no underlying at all.
 *  - `/markets`   the LIVE markets only (status, venues). Consulted for nothing
 *                 the other two do not say; kept out of the roster on purpose.
 *
 * DECIMALS come from `/sy-tokens`. Every vault's PT, YT and SY were read
 * on-chain when this was written (255 mints, `getMultipleAccounts`) and all
 * three matched the SY's declared decimals in every case — so the API is
 * trusted rather than adding a Solana RPC dependency to the build. A vault
 * whose SY is not in the registry is DROPPED, not defaulted: Solana decimals
 * are mixed (6 / 8 / 9 / 11 here) and a guess would publish the wrong scale.
 *
 * NAMES AND SYMBOLS are synthesised, not read. On-chain metadata is uneven —
 * the YT mints carry an empty name, the PTs mix `PT-fragSOL-15DEC26` with
 * `Exponent PT-STRCx-16NOV26`, and every PT's on-chain symbol is the bare
 * `PT-fragSOL` with no maturity, which would collapse every maturity of one
 * underlying into a single `name::symbol` group. The vault's own name
 * (`fragSOL-15DEC26`) is Exponent's canonical `<ticker>-<DDMONYY>` spelling and
 * is unique per vault, so the symbols are built from it, Pendle-style.
 */

const API = 'https://api.exponent.finance'

/** `Chain.SOLANA` is not in the registry yet; `solana.ts` uses the same literal. */
const SOLANA = 'solana'

export interface ExponentVault {
  address: string
  start_timestamp: string
  end_timestamp: string
  pt_mint: string
  yt_mint: string
  sy_token: string
  is_production_visible: boolean
  /** Legacy AMM markets. */
  markets: { address: string; vault_address: string }[]
  orderbooks: { address: string; vault_address: string }[]
  clmm_markets: unknown[]
  /** `<underlyingTicker>-<DDMONYY>`, e.g. `fragSOL-15DEC26`. */
  name: string
}

export interface ExponentSyToken {
  mint: string
  name: string
  ticker: string
  decimals: number
  platform?: string
  platform_name?: string
  categories?: string[]
  quote_asset?: { mint: string; name: string; ticker: string; decimals: number }
  underlying_asset?: { mint: string; name: string; ticker: string; decimals: number }
}

export interface ExponentToken {
  mint: string
  name: string
  symbol: string
  decimals: number
  imageUrl?: string
}

export interface ExponentListToken {
  chainId: string
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  tags: string[]
  props: { exponent: NonNullable<TokenProps['exponent']> }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`${API}${path} answered HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function fetchExponentVaults(): Promise<ExponentVault[]> {
  return getJson<ExponentVault[]>('/vaults')
}

export async function fetchExponentSyTokens(): Promise<ExponentSyToken[]> {
  return getJson<ExponentSyToken[]>('/sy-tokens')
}

/** Underlying / quote token metadata; the only source of an icon. Best-effort. */
export async function fetchExponentTokens(): Promise<ExponentToken[]> {
  return getJson<ExponentToken[]>('/tokens').catch(() => [])
}

function toUnixSeconds(iso: string): number | undefined {
  const ms = new Date(iso).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined
}

/**
 * Builds the flat Exponent token list: one PT and one YT per vault, one SY per
 * distinct SY mint. Keyed by mint so a SY shared by several vaults is emitted
 * once.
 */
export async function processExponentAssets(): Promise<{ [mint: string]: ExponentListToken }> {
  console.log('Processing Exponent assets from API...')
  const [vaults, syTokens, tokens] = await Promise.all([
    fetchExponentVaults(),
    fetchExponentSyTokens(),
    fetchExponentTokens(),
  ])

  const syByMint = new Map(syTokens.map((s) => [s.mint, s]))
  const iconByMint = new Map(tokens.filter((t) => t.imageUrl).map((t) => [t.mint, t.imageUrl!]))

  const out: { [mint: string]: ExponentListToken } = {}
  const dropped: string[] = []

  for (const vault of vaults) {
    const sy = syByMint.get(vault.sy_token)
    const maturity = toUnixSeconds(vault.end_timestamp)
    if (!sy || typeof sy.decimals !== 'number' || !Number.isInteger(sy.decimals) || maturity === undefined) {
      dropped.push(vault.name)
      continue
    }

    const underlying = sy.underlying_asset
    const quote = sy.quote_asset?.ticker
    const logoURI = underlying ? iconByMint.get(underlying.mint) : undefined
    // `PT fragSOL (SOL) Solana` — the shape `pendleAssetsFromApi.ts` produces,
    // so the two protocols read alike in any list that carries both.
    const describe = (leg: string) => `${leg} ${underlying?.ticker ?? sy.ticker}${quote ? ` (${quote})` : ''} Solana`

    const common = {
      vaultAddress: vault.address,
      ptAddress: vault.pt_mint,
      ytAddress: vault.yt_mint,
      syAddress: vault.sy_token,
      underlyingAsset: underlying?.mint,
      maturity,
      marketAddress: vault.markets?.[0]?.address,
      orderbookAddress: vault.orderbooks?.[0]?.address,
      platform: sy.platform,
    }

    out[vault.pt_mint] = {
      chainId: SOLANA,
      name: describe('PT'),
      symbol: `PT-${vault.name}`,
      address: vault.pt_mint,
      decimals: sy.decimals,
      logoURI,
      tags: ['PT'],
      props: { exponent: { tokenType: 'PT', ...common } },
    }
    out[vault.yt_mint] = {
      chainId: SOLANA,
      name: describe('YT'),
      symbol: `YT-${vault.name}`,
      address: vault.yt_mint,
      decimals: sy.decimals,
      logoURI,
      tags: ['YT'],
      props: { exponent: { tokenType: 'YT', ...common } },
    }
    // The SY is Exponent's own mint with its own on-chain name/ticker
    // (`Exponent Wrapped fragSOL` / `wfragSOL`), and it outlives any one
    // maturity — so it carries no vault pointer and no maturity.
    if (!out[vault.sy_token]) {
      out[vault.sy_token] = {
        chainId: SOLANA,
        name: sy.name,
        symbol: sy.ticker,
        address: vault.sy_token,
        decimals: sy.decimals,
        logoURI,
        tags: ['SY'],
        props: { exponent: { tokenType: 'SY', underlyingAsset: underlying?.mint, platform: sy.platform } },
      }
    }
  }

  const n = Object.keys(out).length
  console.log(`Processed ${n} Exponent tokens from ${vaults.length} vaults (${syByMint.size} SY in registry)`)
  if (dropped.length)
    console.log(`DROPPED (no SY registry entry / no decimals): ${dropped.length} ${JSON.stringify(dropped)}`)
  return out
}
