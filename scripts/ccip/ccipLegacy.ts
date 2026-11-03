import { TokenProps } from '../utils/types'

type RetiredProps = NonNullable<TokenProps['retired']>

/**
 * Deployments a Chainlink CCIP copy REPLACED on the same chain (`npm run ccip` lists the
 * candidates: a non-CCIP row in the same assetGroup as a CCIP deployment on that chain).
 *
 * Curated, not derived: an issuer adding a CCIP pool does not by itself retire the old
 * bridge, and "OFT with no peers" is not proof either (oft.ts reads peers only toward chains
 * we list — 332 of 1481 OFTs are peerless that way). Each line below carries the evidence.
 *
 * The replaced row KEEPS its assetGroup (it is still a claim on the same asset, and the
 * stranded supply must still price), but it is renamed with a `(legacy …)` suffix and carries
 * `props.retired = { reason: 'superseded', successor }`, so a UI can hide it from menus.
 */
interface CcipLegacy {
  /** the bridge the replaced deployment came over, for the name suffix */
  via: 'LayerZero' | 'canonical bridge'
  /** assetGroup of the CCIP successor (the same group the replaced row sits in) */
  successor: string
}

// Kelp rsETH — Kelp moved its L2 rsETH from the LayerZero OFT mesh to CCIP (2026-11-03,
// on-chain): every chain's `wrsETH` wrapper holds 100% CCIP rsETH and 0 of the OFT, and the
// OFT has no peers left on these chains (Ethereum's adapter 0xa129…e5a7 peers Arbitrum only).
// Mantle's OFT still has 524 rsETH outstanding — stranded, not live.
const KELP_LZ: CcipLegacy = { via: 'LayerZero', successor: 'RSETH' }

export const CCIP_LEGACY: { [chainAddress: string]: CcipLegacy } = {
  '10:0x4186bfc76e2e237523cbc30fd220fe055156b41f': KELP_LZ,
  '5000:0x4186bfc76e2e237523cbc30fd220fe055156b41f': KELP_LZ,
  '8453:0x1bc71130a0e39942a7658878169764bbd8a45993': KELP_LZ,
  '57073:0xc3eacf0612346366db554c991d7858716db09f58': KELP_LZ,
  '59144:0x4186bfc76e2e237523cbc30fd220fe055156b41f': KELP_LZ,
}

export const CCIP_LEGACY_RETIRED: { [chainAddress: string]: RetiredProps } = Object.fromEntries(
  Object.entries(CCIP_LEGACY).map(([k, v]) => [k, { reason: 'superseded', successor: v.successor, source: 'curated' }]),
)

/** `"<name> (legacy LayerZero)"` for a replaced deployment; idempotent over last run's output. */
export function ccipLegacyName(chainId: string, lcAddress: string, name: string): string {
  const legacy = CCIP_LEGACY[`${chainId}:${lcAddress}`]
  if (!legacy) return name
  const suffix = ` (legacy ${legacy.via})`
  return name.endsWith(suffix) ? name : name + suffix
}
