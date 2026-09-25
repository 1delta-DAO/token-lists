// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * The reviewed OFT-mesh unification (mesh-groups.json, written by
 * `npm run oft:mesh`): chainId -> address -> the asset group every deployment
 * of that mesh shares. Address-keyed, so it moves exactly the deployments the
 * peer links prove and nothing else that happens to share a group string.
 */
const MESH_GROUPS: Record<string, Record<string, string>> = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(path.resolve(__dirname, './mesh-groups.json'), 'utf-8'))
    return j.groups ?? {}
  } catch {
    return {}
  }
})()

export function lookupMeshGroup(chainId: string, address: string): string | undefined {
  return MESH_GROUPS[chainId]?.[address.toLowerCase()]
}
