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
}

export const LST_GROUP_MAP: LstGroupMap = { ...loadSnapshot(), ...LST_GROUP_MANUAL }

/** Lookup a token's LST/LRT overlay by its assetGroup. */
export function lookupLstGroup(assetGroup: string): LstProps | undefined {
  return LST_GROUP_MAP[assetGroup]
}
