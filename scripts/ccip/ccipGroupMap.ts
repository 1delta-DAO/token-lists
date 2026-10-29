// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * `<chainId>:<address>` -> the home assetGroup of a Chainlink CCIP copy (ccip-groups.json,
 * written by `npm run ccip`). Applied like the OFT mesh group: before the group-keyed
 * overlays, so the copy inherits the asset's lst / savings / stablecoin / risk labels, and
 * exempt from the same-chain dedup, because sharing the group with the canonical copy on the
 * same chain is the point. Tolerates a missing snapshot so `generate` never hard-fails.
 */
function loadSnapshot(): { [key: string]: string } {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './ccip-groups.json'), 'utf-8'))
  } catch {
    console.warn('[ccip] ccip-groups.json not found — run `npm run ccip`. Proceeding without CCIP copies.')
    return {}
  }
}

const CCIP_GROUPS = loadSnapshot()

export function lookupCcipGroup(chainId: string, lcAddress: string): string | undefined {
  return CCIP_GROUPS[`${chainId}:${lcAddress}`]
}
