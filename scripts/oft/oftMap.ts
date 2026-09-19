// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { OftProps, OftRegistry } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the LayerZero OFT snapshot (oft.json, produced by `npm run oft`) and
 * exposes an address-keyed lookup the generator overlays as `props.oft`. Like
 * the risk overlay it tolerates a missing snapshot so `generate` never
 * hard-fails when the step has not run.
 */
function loadOftSnapshot(): OftRegistry {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './oft.json'), 'utf-8'))
  } catch {
    console.warn('[oft] oft.json not found — run `npm run oft`. Proceeding without OFT overlay.')
    return {}
  }
}

const OFT_REGISTRY: OftRegistry = (() => {
  const raw = loadOftSnapshot()
  const out: OftRegistry = {}
  for (const chainId of Object.keys(raw)) {
    out[chainId] = {}
    for (const address of Object.keys(raw[chainId])) out[chainId][address.toLowerCase()] = raw[chainId][address]
  }
  return out
})()

/** Lookup a token's LayerZero OFT overlay. */
export function lookupOft(chainId: string, address: string): OftProps | undefined {
  return OFT_REGISTRY[chainId]?.[address.toLowerCase()]
}
