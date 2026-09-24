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
  '1': { '0xa2e3356610840701bdf5611a53974510ae27e2e1': { type: 'staking', asset: 'ETH', provider: 'binance' } },
  '56': { '0xa2e3356610840701bdf5611a53974510ae27e2e1': { type: 'staking', asset: 'ETH', provider: 'binance' } },

  // Firelight stXRP (Flare 14) — FXRP (XRP's 1:1 FAsset) restaked to back
  // Firelight's cover markets. `restaking` = LRT: the capital secures OTHER
  // protocols, like weETH/ezETH/rsETH. `asset` is the base staked asset (XRP),
  // not the wrapper (FXRP). Manual because "Firelight stXRP" trips no
  // `classifyRwaLst` rule.
  '14': { '0x4c18ff3c89632c3dd62e796c0afa5c07c4c1b2b3': { type: 'restaking', asset: 'XRP', provider: 'firelight' } },

  // Monad (143) liquid staking. None of these names trips a `classifyRwaLst`
  // rule ("ShMonad", "gMON", "aPriori Monad LST"), so without an entry every
  // MON LST reached the lending optimizer with no `lst` prop and the
  // `lst,lrt -> wnative` archetype answered ZERO pairs on Monad while 17 real
  // LST / WMON loops existed (Euler, Gearbox, Neverland, Curvance). The old
  // shMON deployment is listed too so a legacy balance still resolves to MON.
  '143': {
    '0x1b68626dca36c7fe922fd2d55e4f631d962de19c': { type: 'staking', asset: 'MON', provider: 'fastlane' }, // shMON
    '0x1ce060d47a0fd08b0869748fd7eccf151f4ec5d1': { type: 'staking', asset: 'MON', provider: 'fastlane' }, // shMON (old)
    '0xa3227c5969757783154c60bf0bc1944180ed81b9': { type: 'staking', asset: 'MON', provider: 'kintsu' }, // sMON
    '0x8498312a6b3cbd158bf0c93abdcf29e6e4f55081': { type: 'staking', asset: 'MON', provider: 'magma' }, // gMON
    '0x0c65a0bc65a5d819235b71f554d210d3f80e0852': { type: 'staking', asset: 'MON', provider: 'apriori' }, // aprMON
  },

  // HyperEVM (999) liquid staking. kHYPE and WSTHYPE only ever matched the
  // catch-all `cand-staking` rule (no `asset`), so they sat in the candidate
  // queue; beHYPE matched the `etherfi` rule on the words "ether.fi" and was
  // stamped `asset: 'ETH'`, which turns a beHYPE / WHYPE carry into an ETH vs
  // HYPE price bet downstream. The manual entry wins over that rule.
  '999': {
    '0xfd739d4e423301ce9385c1fb8850539d657c296d': { type: 'staking', asset: 'HYPE', provider: 'kinetiq' }, // kHYPE
    '0xffaa4a3d97fe9107cef8a3f48c069f577ff76cc1': { type: 'staking', asset: 'HYPE', provider: 'valantis' }, // stHYPE
    '0x94e8396e0869c9f2200760af0621afd240e1cf38': { type: 'staking', asset: 'HYPE', provider: 'valantis' }, // wstHYPE
    '0xd8fc8f0b03eba61f64d08b0bef69d80916e5dda9': { type: 'staking', asset: 'HYPE', provider: 'etherfi' }, // beHYPE
    '0x81e064d0eb539de7c3170edf38c1a42cbd752a76': { type: 'staking', asset: 'HYPE', provider: 'hyperbeat' }, // lstHYPE
    '0xbef0142a0955a7d5dcce5c2a13fb84e332669d2d': { type: 'staking', asset: 'HYPE', provider: 'kintsu' }, // sHYPE
    '0x4d0ff6a0dd9f7316b674fb37993a3ce28bea340e': { type: 'staking', asset: 'HYPE', provider: 'hyperdrive' }, // HYPED
    '0x8888888fdaac0e7cf8c6523c8955bf7954c216fa': { type: 'staking', asset: 'HYPE', provider: 'ventuals' }, // vHYPE
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
