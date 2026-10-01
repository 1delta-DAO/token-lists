// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { LstGroupMap, LstProps } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the assetGroup-keyed LST/LRT snapshot (lst-groups.json, produced by `npm run lst`)
 * and exposes a lookup used by the generator to overlay `props.lst` onto tokens x-chain.
 *
 * The address-keyed `lst.json` source list already classifies each rule-matched token; this
 * overlay is the CHAIN-INDEPENDENT complement — a token inherits the classification whenever
 * it shares a canonical LST's assetGroup (bridged wstETH / wrsETH / weETH / … on any chain),
 * even if its own name/symbol didn't trip the rule. Tolerates a missing snapshot so `generate`
 * never hard-fails if the step hasn't run.
 */
function loadSnapshot(): LstGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './lst-groups.json'), 'utf-8'))
  } catch {
    console.warn('[lst] lst-groups.json not found — run `npm run lst`. Proceeding without x-chain overlay.')
    return {}
  }
}

/** Curated overrides keyed by assetGroup. These WIN over the derived snapshot. */
export const LST_GROUP_MANUAL: LstGroupMap = {
  // 'WSTETH': { type: 'staking', asset: 'ETH', provider: 'lido' },
  //
  // Staked / yield ETH and BTC groups the rule-based lst.json misses, so they carried
  // no money at all (a consumer could not tell they were ETH or BTC). Each is also
  // attributed in issuer/issuerAssets.ts; `npm run issuer:check` asserts both.
  'stETH::stETH': { type: 'staking', asset: 'ETH', provider: 'lido' },
  UNIBTC: { type: 'staking', asset: 'BTC', provider: 'bedrock' },
  'Universal BTC::UNIBTC': { type: 'staking', asset: 'BTC', provider: 'bedrock' },
  'Universal ETH::uniETH': { type: 'staking', asset: 'ETH', provider: 'bedrock' },
  'Universal ETH::uniETH::42161::0': { type: 'staking', asset: 'ETH', provider: 'bedrock' },
  'SOLVBTC.ENA': { type: 'staking', asset: 'BTC', provider: 'solv' },
  'SOLVBTC.JUP': { type: 'staking', asset: 'BTC', provider: 'solv' },
  SOLVBTCPLUS: { type: 'staking', asset: 'BTC', provider: 'solv' },
  'Solv Protocol SolvBTC BNB::SOLVBTCBNB': { type: 'staking', asset: 'BTC', provider: 'solv' },
  'Solv Protocol SolvBTC.BERA::SOLVBTC.BERA': { type: 'staking', asset: 'BTC', provider: 'solv' },
  'SolvBTC Avalanche::SolvBTC.AVAX': { type: 'staking', asset: 'BTC', provider: 'solv' },
  'SolvBTC DEX LP::SolvBTC.DLP': { type: 'staking', asset: 'BTC', provider: 'solv' },
  'Ether fi Staked BTC::EBTC': { type: 'restaking', asset: 'BTC', provider: 'etherfi' },
  'ether fi Staked ETH::EETH': { type: 'restaking', asset: 'ETH', provider: 'etherfi' },
  'Super Symbiotic LRT::weETHs': { type: 'restaking', asset: 'ETH', provider: 'etherfi' },
  'Acre Staked Bitcoin::stBTC': { type: 'staking', asset: 'BTC', provider: 'acre' },
  'StaFi::rETH': { type: 'staking', asset: 'ETH', provider: 'stafi' },
  'Dinero Staked ETH::PXETH': { type: 'staking', asset: 'ETH', provider: 'dinero' },
  'Dinero apxETH::APXETH': { type: 'staking', asset: 'ETH', provider: 'dinero' },
  'frxETH::frxETH': { type: 'staking', asset: 'ETH', provider: 'frax' },
  'Origin Ether::OETH': { type: 'staking', asset: 'ETH', provider: 'origin' },
  'Wrapped OETH::WOETH': { type: 'staking', asset: 'ETH', provider: 'origin' },
  'Wrapped OETH::wOETH': { type: 'staking', asset: 'ETH', provider: 'origin' },
  'Super OETH::superOETHb': { type: 'staking', asset: 'ETH', provider: 'origin' },
  WSUPEROETHB: { type: 'staking', asset: 'ETH', provider: 'origin' },
  'swETH::swETH': { type: 'staking', asset: 'ETH', provider: 'swell' },
  'ynETH MAX::YNETHX': { type: 'restaking', asset: 'ETH', provider: 'yieldnest' },
  'ynETH MAX::ynETHx': { type: 'restaking', asset: 'ETH', provider: 'yieldnest' },
  'YieldNest Restaked ETH::YNETH': { type: 'restaking', asset: 'ETH', provider: 'yieldnest' },
}

export const LST_GROUP_MAP: LstGroupMap = { ...loadSnapshot(), ...LST_GROUP_MANUAL }

/** Lookup a token's LST/LRT overlay by its assetGroup. */
export function lookupLstGroup(assetGroup: string): LstProps | undefined {
  return LST_GROUP_MAP[assetGroup]
}
