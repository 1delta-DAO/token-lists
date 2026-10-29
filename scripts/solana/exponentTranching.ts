import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

/**
 * Exponent's TRANCHING roster — EVERY senior and junior LP of every market
 * (srEHYUSD / jrEHYUSD, srONyc / jrONyc …) — so the Solana list, the savings
 * overlay and the issuer overlay carry each tranche without a per-mint line.
 *
 * `npm run solana` fetches it live (`refreshExponentTranches`) and writes the
 * snapshot `exponentTranching.json`; the savings and issuer curations read
 * that snapshot (`exponentTrancheGroups`) so they stay offline. A market
 * Exponent launches is listed on the next `npm run solana`.
 *
 * Sources: `app.exponent.finance/api/tranching-markets` (both LP mints, the
 * base mint and symbol, per market) and `api.exponent.finance/
 * tranching-token/<mint>` (the LP's name, symbol and icon). Jupiter answers
 * these mints NAMELESS, so the name and symbol here beat Jupiter's.
 */
const ROSTER = 'https://app.exponent.finance/api/tranching-markets'
const TOKEN_META = 'https://api.exponent.finance/tranching-token/'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const EXPONENT_TRANCHING_SNAPSHOT = path.resolve(__dirname, 'exponentTranching.json')

export interface ExponentTranche {
  mint: string
  /** The tranching market — the LP's mint authority, checked against Jupiter in solana.ts. */
  market: string
  side: 'senior' | 'junior'
  name: string
  symbol: string
  image?: string
  /** The market's base (what a deposit takes): eHYUSD, ONyc, nOPAL, AUTO. */
  baseSymbol: string
  baseMint: string
}

async function getJson<T>(url: string): Promise<T> {
  for (const wait of [0, 1500, 4000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    const res = await fetch(url, { headers: { accept: 'application/json' } }).catch(() => undefined)
    if (res?.ok) return (await res.json()) as T
  }
  throw new Error(`${url} did not answer`)
}

/** The live roster; a market whose LP metadata does not answer is skipped and reported, never named by guess. */
export async function refreshExponentTranches(): Promise<ExponentTranche[]> {
  const markets = await getJson<
    { address: string; mintLpSenior?: string; mintLpJunior?: string; mintBase?: string; baseTokenSymbol?: string }[]
  >(ROSTER)
  const out: ExponentTranche[] = []
  for (const m of Array.isArray(markets) ? markets : []) {
    if (!m.address || !m.mintBase || !m.baseTokenSymbol) continue
    for (const [side, mint] of [
      ['senior', m.mintLpSenior],
      ['junior', m.mintLpJunior],
    ] as const) {
      if (!mint) continue
      const meta = await getJson<{ name?: string; symbol?: string; image?: string }>(TOKEN_META + mint).catch(
        () => undefined,
      )
      if (!meta?.name || !meta.symbol) {
        console.warn(`[solana] exponent tranche ${mint}: no metadata — skipped`)
        continue
      }
      out.push({
        mint,
        market: m.address,
        side,
        name: meta.name,
        symbol: meta.symbol,
        image: meta.image,
        baseSymbol: m.baseTokenSymbol,
        baseMint: m.mintBase,
      })
    }
  }
  if (out.length)
    fs.writeFileSync(EXPONENT_TRANCHING_SNAPSHOT, JSON.stringify(out, null, 2) + '\n')
  return out
}

/** The last snapshot (offline) — what the savings and issuer overlays read. */
export function readExponentTranches(): ExponentTranche[] {
  try {
    return JSON.parse(fs.readFileSync(EXPONENT_TRANCHING_SNAPSHOT, 'utf8'))
  } catch {
    return []
  }
}

/**
 * The `assetGroup` each tranche publishes under: `<name>::<symbol>::solana`,
 * the scoped form solana.ts gives an unmatched mint — the key margin-fetcher's
 * `exponentTrancheFetcher` derives from the same metadata.
 */
export const exponentTrancheGroup = (t: Pick<ExponentTranche, 'name' | 'symbol'>) =>
  `${t.name}::${t.symbol}::solana`

/** group → tranche, from the snapshot. */
export function exponentTrancheGroups(): Map<string, ExponentTranche> {
  return new Map(readExponentTranches().map((t) => [exponentTrancheGroup(t), t]))
}
