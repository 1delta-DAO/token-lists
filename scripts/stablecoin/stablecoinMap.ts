// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { StablecoinGroupMap, StablecoinProps } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the stablecoin snapshot (stablecoin.json, produced by `npm run stablecoin`) and exposes
 * an assetGroup-keyed lookup used by the generator to overlay `props.stablecoin` onto tokens.
 * Tolerates a missing snapshot so `generate` never hard-fails if the step hasn't run.
 */
function loadSnapshot(): StablecoinGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './stablecoin.json'), 'utf-8'))
  } catch {
    console.warn('[stablecoin] stablecoin.json not found — run `npm run stablecoin`. Proceeding without overlay.')
    return {}
  }
}

/** Symbol-keyed snapshot (stablecoin-symbols.json) — the ticker fallback for fragmented groups. */
function loadSymbolSnapshot(): StablecoinGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './stablecoin-symbols.json'), 'utf-8'))
  } catch {
    console.warn('[stablecoin] stablecoin-symbols.json not found — run `npm run stablecoin`. Proceeding without symbol fallback.')
    return {}
  }
}

/** Curated overrides keyed by assetGroup. These WIN over the snapshot. */
export const STABLECOIN_MANUAL: StablecoinGroupMap = {
  // 'USDC': { base: 'USD' },
}

export const STABLECOIN_MAP: StablecoinGroupMap = { ...loadSnapshot(), ...STABLECOIN_MANUAL }
export const STABLECOIN_SYMBOL_MAP: StablecoinGroupMap = loadSymbolSnapshot()

/**
 * Lookup a token's stablecoin overlay. Group first (the precise, chain-independent
 * identity); symbol as fallback (the lists fragment a stablecoin's assetGroup string
 * under collision/rename resolution, but its ticker does not).
 */
export function lookupStablecoin(assetGroup: string, symbol?: string): StablecoinProps | undefined {
  if (assetGroup && STABLECOIN_MAP[assetGroup]) return STABLECOIN_MAP[assetGroup]
  if (symbol && STABLECOIN_SYMBOL_MAP[symbol.toUpperCase()]) return STABLECOIN_SYMBOL_MAP[symbol.toUpperCase()]
  return undefined
}
