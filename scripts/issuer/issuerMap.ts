// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { IssuerGroupMap, IssuerProps } from '../utils/types'
import { ISSUER_CURATED } from './issuerAssets'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the issuer snapshot (issuer.json, produced by `npm run issuer`) and exposes an
 * assetGroup-keyed lookup used by the generator to overlay `props.issuer` onto tokens.
 *
 * The curated map is layered on top so a freshly-added desk classifies even before the
 * snapshot is regenerated — the same contract savingsMap.ts has. Tolerates a missing
 * snapshot so `generate` never hard-fails if the step hasn't run.
 */
function loadSnapshot(): IssuerGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './issuer.json'), 'utf-8'))
  } catch {
    console.warn('[issuer] issuer.json not found — run `npm run issuer`. Using the curated map only.')
    return {}
  }
}

export const ISSUER_MAP: IssuerGroupMap = { ...loadSnapshot(), ...ISSUER_CURATED }

/** Lookup a token's issuer by its assetGroup. */
export function lookupIssuer(assetGroup: string): IssuerProps | undefined {
  return ISSUER_MAP[assetGroup]
}
