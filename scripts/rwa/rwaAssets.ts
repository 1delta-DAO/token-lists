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
