// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { StablecoinGroupMap } from '../utils/types'
import { isFrozenChain } from '../utils/frozenChains'
import { loadRiskDataFile } from '../utils/riskDataSource'
import { normName, StablecoinSymbolEntry, StablecoinSymbolMap } from './identity'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Snapshots the stablecoin classifier from risk-data (data/defillama/stablecoin-quality.json).
 *
 * Keyed by `assetGroup` (not address): a stablecoin's fiat base is chain-independent, and the
 * generator overlays it onto every token in the group, giving full multi-chain coverage.
 * Presence of the prop is the stablecoin flag; `base` is the fiat peg (from `pegType`).
 * Floating pegs (`peggedVAR`) are flagged but carry no base.
 */
interface RawStablecoin {
  assetGroup?: string
  name?: string
  symbol?: string
  pegType?: string
  deployments?: { chainId: string; address: string }[]
}

/** 'peggedUSD' -> 'USD'; floating/variable pegs -> undefined (flag only). */
function fiatBase(pegType?: string): string | undefined {
  if (!pegType || !pegType.startsWith('pegged')) return undefined
  const base = pegType.slice('pegged'.length).toUpperCase()
  return base && base !== 'VAR' ? base : undefined
}

/**
 * Manual stablecoin overlays merged on top of the DeFiLlama feed — for pegged stablecoins the
 * feed omits. Keyed by `assetGroup` (same shape as the generated map) and applied AFTER the feed
 * so they can never be dropped on a refresh. Because the generator looks the overlay up on the
 * PRE-alias group, list every pre-unification variant (cf. savingsAssets.ts wsrUSD case-split).
 */
const STABLECOIN_MANUAL: StablecoinGroupMap = {
  // Reservoir rUSD — ERC-20 dollar-denominated stablecoin (1:1 vs USDC/USDT/USD1), also
  // RWA-backed (reinsurance / real-world + digital assets). Not in the DeFiLlama feed.
  'Reservoir rUSD::RUSD': { base: 'USD' },
  'Reservoir Stablecoin::rUSD': { base: 'USD' },
  // BitFi bfUSD — minted 1:1 against USDC/USDT through the protocol's minters and
  // redeemable 1:1 (free through the StandardRedeemer, 0.5 % for the instant leg).
  // Absent from the DeFiLlama feed, and no integrated lender quotes it, so without
  // this overlay it has NO price at all — and the two staking pools over it
  // (hbfUSD / pbfUSD) render with no share price and $0 TVL, which is the "$0 row"
  // failure, not a small vault. See BITFI.md.
  'BitFi USD::BFUSD': { base: 'USD' },
  // Tokenised GBP (tGBP) — GBP-pegged ERC-20, not in the DeFiLlama feed. The generator looks
  // the overlay up on the group it holds at that point, which for a `1delta`-tagged source is
  // the stored (already collision-suffixed) string — hence both forms.
  'Tokenised GBP::TGBP': { base: 'GBP' },
  'Tokenised GBP::tGBP': { base: 'GBP' },
  // Splinter groups the phantom address forced the real token into. They disappear once
  // the blacklisted twin is out of the PUBLISHED lists (which the generator re-seeds from),
  // so these are transitional — safe to drop after a full CI cycle.
  'Tokenised GBP::TGBP::1::0': { base: 'GBP' },
  'Tokenised GBP::TGBP::56::0': { base: 'GBP' },
  'Tokenised GBP::TGBP::8453::0': { base: 'GBP' },
  'Tokenised GBP::TGBP::43114::0': { base: 'GBP' },
  // Tempo pathUSD — fiat-backed USD stablecoin and the chain's default fee token. DeFiLlama
  // lists it (id 385, peggedUSD) but the feed row carries no assetGroup until the lists do.
  PATHUSD: { base: 'USD' },
  // Tempo (4217) deployments that arrive with on-chain name/symbol casing. Each is aliased to
  // the group the feed already covers (assetGroupUnifier.ts), but the lookup is pre-alias.
  'Syrup USDC::syrupUSDC': { base: 'USD' },
  'Cap USD::cUSD': { base: 'USD' },
  'Re Protocol reUSD::reUSD': { base: 'USD' },
  'InfiniFi USD::iUSD': { base: 'USD' },
  // AllUnity's CHF/SEK siblings of EURAU (feed covers only the EUR one) and BRLA under its
  // Tempo group (`BRLA Token::BRLA`; the feed keys the bare `BRLA`, pegType peggedREAL).
  'AllUnity CHF::CHFAU': { base: 'CHF' },
  'AllUnity SEK::SEKAU': { base: 'SEK' },
  'BRLA Token::BRLA': { base: 'REAL' },
  // Ticker-named groups of real dollars the feed lists without (or under another) group.
  // Their deployments' names are just the ticker, which is no identity evidence for the
  // symbol fallback, so they are keyed here by group, each checked against its deployments in the lists:
  //  - Tether's USDT0 OFT (aliased into USDT downstream; issuer tether).
  'USDT0::USDT0': { base: 'USD' },
  'USD₮0::USD₮0': { base: 'USD' },
  //  - Apyx apyUSD (staked apxUSD; feed row 'apyUSD', no group), 1: 0x38eeb52f…
  'apyUSD::APYUSD': { base: 'USD' },
  'apyUSD::apyUSD': { base: 'USD' },
  //  - Maple syrupUSDG (feed row 'syrupUSDG', no group), 1: 0x87b65c4a…
  'syrupUSDG::SYRUPUSDG': { base: 'USD' },
  SYRUPUSDG: { base: 'USD' },
  //  - Angle agEUR — the curated bare group under the pre-rename ticker (feed: EURA).
  AGEUR: { base: 'EUR' },
  //  - ether.fi Cash eUSD (issuer etherfi); not in the feed.
  'ether.fi USD::eUSD': { base: 'USD' },
  //  - 3Jane USD3 (1: 0x056b269e…, IMPOSTOR_EXEMPT) — `name()` is the bare ticker.
  '3Jane USD3::USD3': { base: 'USD' },
}

/**
 * Symbol-keyed overlays for feed rows that carry NO `assetGroup` — the group-keyed
 * snapshot can never reach them, so they are stamped by ticker. Keyed by UPPER-CASED
 * symbol, merged after the feed like `STABLECOIN_MANUAL`. Like every symbol entry they
 * need identity evidence: a deployment only matches when its NAME is one of `names`.
 */
const STABLECOIN_SYMBOL_MANUAL: { [upperSymbol: string]: { base: string; names: string[] } } = {
  // Harbor haEUR — EUR-pegged, feed row has no assetGroup.
  HAEUR: { base: 'EUR', names: ['Harbor haEUR', 'haEUR'] },
  // Quantoz EURD — EUR-pegged, feed row has no assetGroup.
  EURD: { base: 'EUR', names: ['Quantoz EURD', 'Quantoz EUR'] },
  // Hedera Swiss Franc — CHF-pegged, feed row has no assetGroup.
  HCHF: { base: 'CHF', names: ['Hedera Swiss Franc'] },
  // Quantillon Euro — EUR-pegged, feed row has no assetGroup.
  QEURO: { base: 'EUR', names: ['Quantillon Euro'] },
  // agEUR — Angle's euro under its PRE-rename ticker (the feed lists it as EURA).
  // The old agEUR/AGEUR deployments are the same EUR money, so they inherit EUR.
  AGEUR: { base: 'EUR', names: ['agEUR', 'Angle Protocol', 'Angle Euro', 'agEUR Stablecoin', 'EURA'] },
  // On-chain names the feed does not carry for tickers it does (each the real contract's
  // `name()`: Liquity's LUSD/BOLD ERC-20s, Parallel's PAR, TRON-DAO's USDD v2, Sky's sUSDS,
  // Angle's EURA under its old name, 3Jane's USD3).
  EURA: { base: 'EUR', names: ['agEUR', 'Angle Euro'] },
  LUSD: { base: 'USD', names: ['LUSD Stablecoin'] },
  BOLD: { base: 'USD', names: ['BOLD Stablecoin'] },
  PAR: { base: 'EUR', names: ['PAR Stablecoin'] },
  USR: { base: 'USD', names: ['Resolv USR'] },
  USDD: { base: 'USD', names: ['Decentralized USD'] },
  SUSDS: { base: 'USD', names: ['Savings USDS', 'Savings USDS from Ethereum'] },
  USD3: { base: 'USD', names: ['3Jane USD3'] },
  EURS: { base: 'EUR', names: ['STASIS EURS Token'] },
  AUDD: { base: 'AUD', names: ['Australian Digital Dollar'] },
  // Mento's pre-rename names (Celo Dollar → USDm, Celo Japanese Yen → JPYm).
  CUSD: { base: 'USD', names: ['Celo Dollar'] },
  CJPY: { base: 'JPY', names: ['Celo Japanese Yen'] },
  FXUSD: { base: 'USD', names: ['f(x) USD'] },
  CRVUSD: { base: 'USD', names: ['Bridged Curve Fi USD Stablecoin'] },
  SCRVUSD: { base: 'USD', names: ['Superbridge Bridged scrvUSD'] },
  USDC: { base: 'USD', names: ['Circle USD from Noble'] },
  USDT: { base: 'USD', names: ['Stargate Bridged USDT Flare Network'] },
}

/** Names of the curated (group-flagged) groups' members, from the previous published omni-list. */
function memberNames(groups: StablecoinGroupMap): Map<string, Map<string, string | undefined>> {
  const out = new Map<string, Map<string, string | undefined>>()
  try {
    const omni = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../omni-list.json'), 'utf-8'))
    for (const [group, entry] of Object.entries<any>(omni)) {
      if (!groups[group]) continue
      for (const c of entry?.currencies ?? []) {
        if (typeof c?.symbol !== 'string' || typeof c?.name !== 'string') continue
        const key = c.symbol.toUpperCase()
        const byName = out.get(key) ?? new Map<string, string | undefined>()
        byName.set(normName(c.name), groups[group].base)
        out.set(key, byName)
      }
    }
  } catch (error) {
    console.warn(
      '[stablecoin] omni-list.json unreadable, symbol evidence from the feed only:',
      (error as Error).message,
    )
  }
  return out
}

function sortKeys<T>(o: { [k: string]: T }): { [k: string]: T } {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

function serialize<T>(map: { [k: string]: T }): string {
  const keys = Object.keys(map).sort()
  return JSON.stringify(
    keys.reduce((acc: { [k: string]: T }, k) => ((acc[k] = map[k]), acc), {}),
    null,
    2,
  )
}

async function generateStablecoinMap() {
  console.log('Generating stablecoin overlay from risk-data...')
  try {
    const raw = await loadRiskDataFile<RawStablecoin[]>('data/defillama/stablecoin-quality.json')

    const map: StablecoinGroupMap = {}
    for (const s of raw) {
      const base = fiatBase(s.pegType)
      if (s.assetGroup) map[s.assetGroup] = base ? { base } : {}
    }
    // Merge manual overlays last so they win and survive feed refreshes.
    Object.assign(map, STABLECOIN_MANUAL)

    // Symbol-keyed fallback for fragmented group variants (collision suffix, PoS bridge,
    // rename, casing). A ticker is NOT an identity — every DefiLlama ticker keyed bare
    // tagged ~600 non-dollar tokens (Ethernity ERN, Hacken HAI, …) — so each entry carries
    // the evidence a deployment must match: the names the asset is known under, and the
    // feed's own deployments.
    const members = memberNames(map)
    const symbolMap: StablecoinSymbolMap = {}
    const conflicted = new Set<string>()
    // `base` per piece of evidence, not per ticker: `MUSD` is MetaMask's AND mStable's,
    // `USDX` three different desks — the name decides which row a deployment is.
    const put = (bag: { [k: string]: string }, sym: string, k: string, base: string | undefined) => {
      if (!k || conflicted.has(`${sym}|${k}`)) return
      const v = base ?? ''
      if (k in bag && bag[k] !== v) {
        delete bag[k]
        conflicted.add(`${sym}|${k}`)
        return
      }
      bag[k] = v
    }
    const entryOf = (sym: string): StablecoinSymbolEntry => (symbolMap[sym] ??= { names: {} })
    for (const s of raw) {
      if (!s.symbol) continue
      const sym = s.symbol.toUpperCase()
      const base = fiatBase(s.pegType)
      const e = entryOf(sym)
      const groupName = s.assetGroup?.includes('::') ? s.assetGroup.slice(0, s.assetGroup.indexOf('::')) : undefined
      put(e.names, sym, normName(s.name), base)
      if (groupName) put(e.names, sym, normName(groupName), base)
      for (const d of s.deployments ?? [])
        if (!isFrozenChain(d.chainId)) put((e.addresses ??= {}), sym, `${d.chainId}:${d.address.toLowerCase()}`, base)
    }
    // A frozen chain's deployments (Blast) are no longer refreshed: carry the
    // last published ones forward unchanged (utils/frozenChains.ts).
    try {
      const prev: StablecoinSymbolMap = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, './stablecoin-symbols.json'), 'utf8'),
      )
      for (const [sym, pe] of Object.entries(prev))
        for (const [k, v] of Object.entries(pe.addresses ?? {}))
          if (isFrozenChain(k.slice(0, k.indexOf(':')))) (entryOf(sym).addresses ??= {})[k] = v
    } catch {}
    // Names the curated groups' own deployments carry (`Bridged DAI (OmniBridge)` in `DAI`).
    for (const [sym, byName] of members) {
      const e = entryOf(sym)
      for (const [n, base] of byName) put(e.names, sym, n, base)
    }
    for (const [sym, m] of Object.entries(STABLECOIN_SYMBOL_MANUAL)) {
      const e = entryOf(sym)
      for (const n of m.names) e.names[normName(n)] = m.base // manual wins
    }
    for (const [sym, e] of Object.entries(symbolMap)) {
      e.names = sortKeys(e.names)
      if (e.addresses) e.addresses = sortKeys(e.addresses)
      if (!Object.keys(e.names).length && !Object.keys(e.addresses ?? {}).length) delete symbolMap[sym]
    }

    const withBase = Object.values(map).filter((v) => v.base).length
    fs.writeFileSync(path.resolve(__dirname, './stablecoin.json'), serialize(map))
    fs.writeFileSync(path.resolve(__dirname, './stablecoin-symbols.json'), serialize(symbolMap))
    console.log(
      `Wrote stablecoin.json (${Object.keys(map).length} groups, ${withBase} with a fiat base) ` +
        `and stablecoin-symbols.json (${Object.keys(symbolMap).length} symbols).`,
    )
  } catch (error) {
    // Non-fatal: keep the last committed snapshot so the generate pipeline never breaks.
    console.warn('[stablecoin] could not refresh stablecoin.json, keeping existing snapshot:', (error as Error).message)
    process.exit(0)
  }
}

generateStablecoinMap()
