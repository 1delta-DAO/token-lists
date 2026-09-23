// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { IssuerExposure, IssuerExposureGroupMap, IssuerGroupMap, IssuerProps } from '../utils/types'
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

/**
 * The exposure snapshot (issuerExposure.json, produced by the same
 * `npm run issuer`): the desk a WRAPPER group's underlying walk terminates at.
 *
 * Not layered with a curated map, unlike the self-issuer above: an exposure is
 * derived from a hop the token itself declares, so the way to fix a wrong one
 * is to fix the hop or curate the UNDERLYING, never to hand-write the answer
 * here. Tolerates a missing snapshot for the same reason as the other loaders.
 */
function loadExposures(): IssuerExposureGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './issuerExposure.json'), 'utf-8'))
  } catch {
    console.warn('[issuer] issuerExposure.json not found — run `npm run issuer`. No exposure overlay.')
    return {}
  }
}

export const ISSUER_EXPOSURE_MAP: IssuerExposureGroupMap = loadExposures()

/** Lookup the desks a wrapper's underlying resolves to, by the WRAPPER's assetGroup. */
export function lookupIssuerExposures(assetGroup: string): IssuerExposure[] | undefined {
  const hit = ISSUER_EXPOSURE_MAP[assetGroup]
  return hit && hit.length > 0 ? hit : undefined
}
