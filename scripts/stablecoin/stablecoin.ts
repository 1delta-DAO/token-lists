// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { StablecoinGroupMap } from '../utils/types'
import { loadRiskDataFile } from '../utils/riskDataSource'

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
  symbol?: string
  pegType?: string
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
}

/**
 * Symbol-keyed overlays for feed rows that carry NO `assetGroup` — the group-keyed
 * snapshot can never reach them, so they are stamped by ticker. Keyed by UPPER-CASED
 * symbol, merged after the feed like `STABLECOIN_MANUAL`. EUR + CHF only for now.
 */
const STABLECOIN_SYMBOL_MANUAL: StablecoinGroupMap = {
  // Harbor haEUR — EUR-pegged, feed row has no assetGroup.
  HAEUR: { base: 'EUR' },
  // Quantoz EURD — EUR-pegged, feed row has no assetGroup.
  EURD: { base: 'EUR' },
  // Hedera Swiss Franc — CHF-pegged, feed row has no assetGroup.
  HCHF: { base: 'CHF' },
  // Quantillon Euro — EUR-pegged, feed row has no assetGroup.
  QEURO: { base: 'EUR' },
  // agEUR — Angle's euro under its PRE-rename ticker (the feed lists it as EURA).
  // The old agEUR/AGEUR deployments are the same EUR money, so they inherit EUR.
  AGEUR: { base: 'EUR' },
}

function serialize(map: StablecoinGroupMap): string {
  const keys = Object.keys(map).sort()
  return JSON.stringify(
    keys.reduce((acc: StablecoinGroupMap, k) => ((acc[k] = map[k]), acc), {}),
    null,
    2,
  )
}

async function generateStablecoinMap() {
  console.log('Generating stablecoin overlay from risk-data...')
  try {
    const raw = await loadRiskDataFile<RawStablecoin[]>('data/defillama/stablecoin-quality.json')

    const map: StablecoinGroupMap = {}
    const symbolMap: StablecoinGroupMap = {}
    for (const s of raw) {
      const base = fiatBase(s.pegType)
      const props = base ? { base } : {}
      if (s.assetGroup) map[s.assetGroup] = props
      // Symbol-keyed fallback: the lists fragment a stablecoin's assetGroup string
      // (collision suffixes, PoS bridge variants, renames, casing), but its ticker
      // does not — key the same fact by symbol so every group variant inherits it.
      if (s.symbol) symbolMap[s.symbol.toUpperCase()] = props
    }

    // Merge manual overlays last so they win and survive feed refreshes.
    Object.assign(map, STABLECOIN_MANUAL)
    Object.assign(symbolMap, STABLECOIN_SYMBOL_MANUAL)

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
