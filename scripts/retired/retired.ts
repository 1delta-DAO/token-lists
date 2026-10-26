import { RiskProps, TokenProps } from '../utils/types'

export type RetiredProps = NonNullable<TokenProps['retired']>

const BOLD_V1: RetiredProps = { reason: 'superseded', successor: 'Liquity BOLD::BOLD', source: 'curated' }

/**
 * Curated retirements, keyed `chainId:lowercaseAddress`. These WIN over the risk-derived
 * flag, because they carry the successor. Per address on purpose: the usual case is a v1
 * whose `name()` / `symbol()` are byte-identical to the live v2 (the same deployments
 * `ADDRESS_GROUP_OVERRIDE` splits into a `… v1 (superseded)::…` group), so nothing keyed on
 * the name or the group could tell them apart.
 */
export const RETIRED_BY_ADDRESS: Record<string, RetiredProps> = {
  // Liquity BOLD v1 — the Jan-2025 deployment, retired by the May-2025 redeploy (Liquity's
  // `contracts/addresses/1.json`); the live BOLD is 0x6440…b01d, the asset sBOLD and the
  // stability pools hold. Ethereum plus its CCIP BurnMint mirrors at 0x087c…bb9b.
  '1:0xb01dd87b29d187f3e3a4bf6cdaebfb97f3d9ab98': BOLD_V1,
  '10:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': BOLD_V1,
  '8453:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': BOLD_V1,
  '42161:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': BOLD_V1,
  '43114:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': BOLD_V1,
  '534352:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': BOLD_V1,
  // Inverse jrDOLA v1 — "superseded v1 addresses (do not use)" per Inverse's jrDOLA docs;
  // relaunched as v2 0x6f80…fbc7.
  '1:0x633821b8e003344e5223509277f2084ea809a452': {
    reason: 'superseded',
    successor: 'Junior DOLA::JRDOLA',
    source: 'curated',
  },
}

/**
 * A token's retirement, if any: the curated line first, else risk-data's `DISCONTINUED`
 * category (Angle USDA / stUSD / stEUR, Mountain wUSDM, Level lvlUSD and the PTs over it, …).
 * Takes the row's already-resolved `risk` so the two overlays can never disagree.
 */
export function lookupRetired(chainId: string, lcAddress: string, risk?: RiskProps): RetiredProps | undefined {
  const curated = RETIRED_BY_ADDRESS[`${chainId}:${lcAddress}`]
  if (curated) return curated
  if (risk?.category === 'DISCONTINUED') return { reason: 'discontinued', source: 'risk' }
  return undefined
}
