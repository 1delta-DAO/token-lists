import { LstProps, LstRegistry } from '../utils/types'
import { LST_GENERATED } from './lstAssets.generated'

/**
 * Curated, authoritative LST/LRT classifications keyed by chainId -> lowercase address.
 * These WIN over both the auto-generated seed and the rule-based classifier.
 */
export const LST_MANUAL: LstRegistry = {
  // '1': {
  //   '0x1234...': { type: 'staking', asset: 'ETH', provider: 'lido' },
  // },

  // Binance wBETH — plain ETH staking (not restaking). Needs to be manual on
  // both chains: "Wrapped Binance Beacon ETH" trips no `classifyRwaLst` rule,
  // so it never even reached the candidate queue despite being the 2nd-largest
  // ETH LST (~$7.1B). Same token address on both chains, and both already
  // share the `Wrapped Binance Beacon ETH::wBETH` assetGroup — listing both
  // makes the group vote unanimous so the x-chain overlay in lst-groups.json
  // picks up the same props.
  '1': {
    '0xa2e3356610840701bdf5611a53974510ae27e2e1': {
      type: 'staking',
      asset: 'ETH',
      provider: 'binance',
    },
  },
  '56': {
    '0xa2e3356610840701bdf5611a53974510ae27e2e1': {
      type: 'staking',
      asset: 'ETH',
      provider: 'binance',
    },
  },
}

/** Merge two registries; `override` wins per (chainId,address). */
export function mergeLstRegistry(base: LstRegistry, override: LstRegistry): LstRegistry {
  const out: LstRegistry = {}
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
export const LST_REGISTRY: LstRegistry = mergeLstRegistry(LST_GENERATED, LST_MANUAL)

/** Lookup helper */
export function lookupLst(chainId: string, address: string): LstProps | undefined {
  return LST_REGISTRY[chainId]?.[address.toLowerCase()]
}
