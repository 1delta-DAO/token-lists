// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { SavingsGroupMap, SavingsProps } from '../utils/types'
import { SAVINGS_CURATED } from './savingsAssets'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the savings snapshot (savings.json, produced by `npm run savings` = the curated groups
 * with their `underlying` enriched on-chain) and exposes an assetGroup-keyed lookup used by the
 * generator to overlay `props.savings` onto tokens.
 *
 * The curated allowlist (SAVINGS_CURATED, in savingsAssets.ts) is layered on top so a
 * freshly-added entry still classifies even before the snapshot is regenerated. Curation is the
 * source of truth — nothing is overlaid unless its assetGroup is curated. Tolerates a missing
 * snapshot so `generate` never hard-fails if the step hasn't run.
 */
function loadSnapshot(): SavingsGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './savings.json'), 'utf-8'))
  } catch {
    console.warn('[savings] savings.json not found — run `npm run savings`. Using curated allowlist only.')
    return {}
  }
}

export const SAVINGS_MAP: SavingsGroupMap = { ...loadSnapshot(), ...SAVINGS_CURATED }

/** Lookup a token's savings overlay by its assetGroup. */
export function lookupSavings(assetGroup: string): SavingsProps | undefined {
  return SAVINGS_MAP[assetGroup]
}
