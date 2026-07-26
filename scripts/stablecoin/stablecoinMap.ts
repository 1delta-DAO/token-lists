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

/** Curated overrides keyed by assetGroup. These WIN over the snapshot. */
export const STABLECOIN_MANUAL: StablecoinGroupMap = {
  // 'USDC': { base: 'USD' },
}

export const STABLECOIN_MAP: StablecoinGroupMap = { ...loadSnapshot(), ...STABLECOIN_MANUAL }

/** Lookup a token's stablecoin overlay by its assetGroup. */
export function lookupStablecoin(assetGroup: string): StablecoinProps | undefined {
  return STABLECOIN_MAP[assetGroup]
}
