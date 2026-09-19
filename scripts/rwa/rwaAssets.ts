import { RwaProps, RwaRegistry } from '../utils/types'
import { RWA_GENERATED } from './rwaAssets.generated'

/**
 * Curated, authoritative RWA classifications keyed by chainId -> lowercase address.
 * These WIN over both the auto-generated seed and the rule-based classifier.
 * Add entries here to fix/override an asset that the rules get wrong or miss.
 */
export const RWA_MANUAL: RwaRegistry = {
  // '1': {
  //   '0x1234...': { type: 'fund', subType: 'treasury', issuer: 'ondo', underlying: 'US T-Bill' },
  // },

  // Nest vault shares on Plume — the shares whose mint/redeem the
  // `NestComposite` swap source serves (lending-sdks NEST_RWA_COMPOSITE.md).
  // `issuer: 'nest'` is what marks the source as venue-native for the pair;
  // the roster itself is `api.nest.credit/v1/vaults`, only the shares it
  // lists on chain 98866 are here. nCLOA is a Nest vault OVER BlackRock's CLO
  // ETF, so the issuer is Nest, not BlackRock (the rule seed had it wrong).
  '98866': {
    '0x593ccca4c4bf58b7526a4c164ceef4003c6388db': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nALPHA
    '0xe72fe64840f4ef80e3ec73a1c749491b5c938cb9': { type: 'fund', subType: 'treasury', issuer: 'nest' }, // nTBILL
    '0x11113ff3a60c2450f4b22515cb760417259ee94b': { type: 'fund', subType: 'basis-trade', issuer: 'nest' }, // nBASIS
    '0xa5f78b2a0ab85429d2dfbf8b60abc70f4cec066c': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nCREDIT
    '0x2a3e301dbd45c143dfbb7b1ce1c55bf0bbf161cb': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nACRDX
    '0x29bf22381a5811dec89dc7b46a5ce57ad02c0240': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nWISDOM
    '0x119dd7daff816f29d7ee47596ae5e4bdc4299165': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nOPAL
    '0xdf45b8322ea4ce898331602e2d1f3d1a67ae0ee8': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nLCRD
    '0x7488b23f4c26b44eef2e0766896be47443e86d79': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nAXI
    '0x066d10e240999aea6798b2e2ca0bdac2923cbdff': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nFALCON
    '0x63810d7f1c7b4dbfb60c173ba120a2be98b59e13': { type: 'fund', subType: 'etf', issuer: 'nest' }, // nCLOA
  },
  // Arc (5042) — the same two Nest shares at their Plume addresses (verified on-chain:
  // same name/symbol/decimals, live supply). The name carries no "Nest"-rule the
  // classifier knows, so they need the manual row exactly like Plume's.
  '5042': {
    '0x119dd7daff816f29d7ee47596ae5e4bdc4299165': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nOPAL
    '0x066d10e240999aea6798b2e2ca0bdac2923cbdff': { type: 'fund', subType: 'private-credit', issuer: 'nest' }, // nFALCON
  },
}

/** Merge two registries; `override` wins per (chainId,address). */
export function mergeRwaRegistry(base: RwaRegistry, override: RwaRegistry): RwaRegistry {
  const out: RwaRegistry = {}
  for (const reg of [base, override]) {
    for (const chainId of Object.keys(reg)) {
      out[chainId] = { ...(out[chainId] ?? {}) }
      for (const address of Object.keys(reg[chainId])) {
        out[chainId][address.toLowerCase()] = reg[chainId][address]
      }
    }
  }
  return out
}

/** The effective registry: generated seed, with manual overrides on top. */
export const RWA_REGISTRY: RwaRegistry = mergeRwaRegistry(RWA_GENERATED, RWA_MANUAL)

/** Lookup helper */
export function lookupRwa(chainId: string, address: string): RwaProps | undefined {
  return RWA_REGISTRY[chainId]?.[address.toLowerCase()]
}
