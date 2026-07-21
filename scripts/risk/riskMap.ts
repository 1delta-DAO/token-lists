// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { RiskProps, RiskRegistry } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the risk snapshot (risk.json, produced by `npm run risk`) and exposes an
 * address-keyed lookup used by the generator to overlay `props.risk` onto tokens.
 * Tolerates a missing snapshot (returns an empty map) so `generate` never hard-fails
 * if the risk step hasn't run.
 */
function loadRiskSnapshot(): RiskRegistry {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './risk.json'), 'utf-8'))
  } catch {
    console.warn('[risk] risk.json not found — run `npm run risk`. Proceeding without risk overlay.')
    return {}
  }
}

/**
 * Curated overrides, keyed by chainId -> lowercase address. These WIN over the snapshot.
 */
export const RISK_MANUAL: RiskRegistry = {
  // '1': { '0x1234...': { score: 1, category: 'BLUE_CHIP' } },
}

const RISK_SNAPSHOT = loadRiskSnapshot()

export const RISK_REGISTRY: RiskRegistry = (() => {
  const out: RiskRegistry = {}
  for (const reg of [RISK_SNAPSHOT, RISK_MANUAL]) {
    for (const chainId of Object.keys(reg)) {
      out[chainId] = { ...(out[chainId] ?? {}) }
      for (const address of Object.keys(reg[chainId])) {
        out[chainId][address.toLowerCase()] = reg[chainId][address]
      }
    }
  }
  return out
})()

/** Lookup a token's risk overlay. */
export function lookupRisk(chainId: string, address: string): RiskProps | undefined {
  return RISK_REGISTRY[chainId]?.[address.toLowerCase()]
}
