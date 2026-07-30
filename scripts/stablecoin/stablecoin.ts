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
    for (const s of raw) {
      const group = s?.assetGroup
      if (!group) continue
      const base = fiatBase(s.pegType)
      map[group] = base ? { base } : {}
    }

    // Merge manual overlays last so they win and survive feed refreshes.
    Object.assign(map, STABLECOIN_MANUAL)

    const withBase = Object.values(map).filter((v) => v.base).length
    fs.writeFileSync(path.resolve(__dirname, './stablecoin.json'), serialize(map))
    console.log(`Wrote stablecoin.json with ${Object.keys(map).length} groups (${withBase} with a fiat base).`)
  } catch (error) {
    // Non-fatal: keep the last committed snapshot so the generate pipeline never breaks.
    console.warn('[stablecoin] could not refresh stablecoin.json, keeping existing snapshot:', (error as Error).message)
    process.exit(0)
  }
}

generateStablecoinMap()
