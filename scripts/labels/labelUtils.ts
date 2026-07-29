// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { LstProps, RwaProps, TokenProps } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')

export interface RawToken {
  chainId?: string | number
  address: string
  name?: string
  symbol?: string
  decimals?: number
  logoURI?: string
}

export interface LabelToken {
  chainId: string
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  tags: string[]
  props: TokenProps
}

export interface CandidateRow {
  chainId: string
  address: string
  symbol: string
  name: string
  rule: string
  rwa?: RwaProps
  lst?: LstProps
}

/** Read every top-level chain list (e.g. 1.json, 8453.json, fuel.json). */
export function readChainLists(): { chainId: string; tokens: RawToken[] }[] {
  const out: { chainId: string; tokens: RawToken[] }[] = []
  for (const file of fs.readdirSync(REPO_ROOT)) {
    if (!file.endsWith('.json')) continue
    if (file === 'omni-list.json') continue
    const base = file.replace('.json', '')
    if (!/^\d+$/.test(base) && base !== 'fuel') continue
    let data: any
    try {
      data = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'))
    } catch {
      continue
    }
    const list = data?.list
    if (!list || typeof list !== 'object') continue
    const tokens = Object.entries(list).map(([address, t]: [string, any]) => ({ ...t, address }))
    out.push({ chainId: String(data.chainId ?? base), tokens })
  }
  return out
}

/** CoinGecko canonical addresses per chain/symbol, snapshot written by the CG validation.
 *  Shape: { chainId: { SYMBOL: [address, …] } }. Absent ⇒ no CoinGecko cross-check. */
function loadCoinGeckoCanonical(): { [chainId: string]: { [symbol: string]: string[] } } {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './coingecko-canonical.json'), 'utf-8'))
  } catch {
    return {}
  }
}

/**
 * Per-token CoinGecko impostor check (self-contained, no cross-token context) — used by the
 * generator to gate overlay application so an impostor never inherits a label via a shared
 * assetGroup. A token is an impostor when it is a lazy ticker-copy (`name === symbol`) and
 * CoinGecko lists that symbol on that chain but NOT at this address. Returns a predicate.
 */
export function makeImpostorCheck(): (chainId: string, address: string, name?: string, symbol?: string) => boolean {
  const cg = loadCoinGeckoCanonical()
  return (chainId, address, name, symbol) => {
    const n = (name ?? '').trim()
    const s = (symbol ?? '').trim()
    if (!n || n.toLowerCase() !== s.toLowerCase()) return false
    const cgAddrs = cg[chainId]?.[s.toUpperCase()]
    return !!cgAddrs && cgAddrs.length > 0 && !cgAddrs.includes(address.toLowerCase())
  }
}

/**
 * Identify mimic/impostor tokens that must NOT be classified — a lazy ticker-copy whose
 * `name === symbol` (e.g. name "wstEth", symbol "wstEth") that is NOT the real asset. Two
 * authorities decide "real", both requiring the name==symbol lazy-copy signature so legit
 * bridged tokens (descriptive names like "Frax Ether", "Bridged USDC (Wormhole)") are never
 * touched:
 *   1. CoinGecko — the symbol is listed on this chain but at a DIFFERENT address (impostor).
 *   2. In-list — a token with the same symbol has a canonical (knownAsset, non-`::`) group
 *      on the same chain (fallback for symbols CoinGecko doesn't cover).
 *
 * Returns a Set of `"<chainId>:<address-lowercase>"` keys to skip during classification.
 */
export function computeMimicExclusions(lists: { chainId: string; tokens: RawToken[] }[]): Set<string> {
  const norm = (s?: string) => (s ?? '').trim().toUpperCase()
  const cg = loadCoinGeckoCanonical()
  // Per chain: symbols that have a canonical (bare, non-currencyId) assetGroup = the real token.
  const canonicalByChain: { [chainId: string]: Set<string> } = {}
  for (const { chainId, tokens } of lists) {
    const set = (canonicalByChain[chainId] ??= new Set())
    for (const t of tokens) {
      const g = (t as { assetGroup?: string }).assetGroup
      if (g && !g.includes('::')) set.add(norm(t.symbol))
    }
  }
  const exclude = new Set<string>()
  for (const { chainId, tokens } of lists) {
    for (const t of tokens) {
      const name = (t.name ?? '').trim()
      const symbol = (t.symbol ?? '').trim()
      const address = (t.address ?? '').toLowerCase()
      if (name.toLowerCase() !== symbol.toLowerCase()) continue // only lazy ticker copies are suspect

      const cgAddrs = cg[chainId]?.[norm(symbol)]
      const cgImpostor = cgAddrs && cgAddrs.length > 0 && !cgAddrs.includes(address)
      const g = (t as { assetGroup?: string }).assetGroup ?? ''
      const inListImpostor = g.includes('::') && canonicalByChain[chainId]?.has(norm(symbol))

      if (cgImpostor || inListImpostor) exclude.add(`${chainId}:${address}`)
    }
  }
  return exclude
}

/** Build a token entry for a label list (rwa.json / lst.json). */
export function toLabelToken(chainId: string, t: RawToken, props: TokenProps): LabelToken {
  return {
    chainId,
    name: t.name ?? '',
    symbol: t.symbol ?? '',
    address: (t.address ?? '').toLowerCase(),
    decimals: Number(t.decimals ?? 18),
    ...(t.logoURI ? { logoURI: t.logoURI } : {}),
    tags: [],
    props,
  }
}

/** Serialize an address registry to a `.generated.ts` module string. */
export function serializeRegistry<T>(
  constName: string,
  typeName: string,
  generatorCmd: string,
  reg: { [c: string]: { [a: string]: T } },
): string {
  const chainIds = Object.keys(reg).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
  const body = chainIds
    .map((chainId) => {
      const addrs = Object.keys(reg[chainId]).sort()
      const entries = addrs.map((a) => `    '${a}': ${JSON.stringify(reg[chainId][a])},`).join('\n')
      return `  '${chainId}': {\n${entries}\n  },`
    })
    .join('\n')
  return (
    `// AUTO-GENERATED by \`${generatorCmd}\`. Do not edit by hand.\n` +
    `// Seeded from conservative auto-rules over the token lists. Curated overrides\n` +
    `// live in the sibling registry file and win over anything in here.\n` +
    `import { ${typeName} } from '../utils/types'\n\n` +
    `export const ${constName}: ${typeName} = {\n${body}\n}\n`
  )
}
