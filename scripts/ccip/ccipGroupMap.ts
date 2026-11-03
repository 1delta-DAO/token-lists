// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { TokenProps } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export type CcipProps = NonNullable<TokenProps['ccip']>

/**
 * `<chainId>:<address>` -> the home assetGroup of a Chainlink CCIP deployment (ccip-groups.json,
 * written by `npm run ccip`; every copy, and every listed deployment filed elsewhere). Applied
 * like the OFT mesh group: before the group-keyed overlays, so the deployment inherits the
 * asset's lst / savings / stablecoin / risk labels, and exempt from the same-chain dedup —
 * CCIP is the asset's main deployment, so it never yields the bare group to another copy. Tolerates a missing snapshot so `generate` never hard-fails.
 *
 * `ccip-props.json` (same script) is chainId -> address -> {@link CcipProps}, overlaid as
 * `props.ccip` on EVERY CCIP deployment we list, copy or not.
 */
function loadSnapshot<T>(file: string): { [key: string]: T } {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, file), 'utf-8'))
  } catch {
    console.warn(`[ccip] ${file} not found — run \`npm run ccip\`. Proceeding without it.`)
    return {}
  }
}

const CCIP_GROUPS = loadSnapshot<string>('./ccip-groups.json')
const CCIP_PROPS = loadSnapshot<{ [address: string]: CcipProps }>('./ccip-props.json')
/** `<chainId>:<address>` -> the copy's name in ccip.json (the Directory's name for the token) */
const CCIP_NAMES: { [key: string]: string } = Object.fromEntries(
  Object.values(loadSnapshot<{ chainId: string; address: string; name: string }>('./ccip.json')).map((r) => [
    `${r.chainId}:${r.address.toLowerCase()}`,
    r.name,
  ]),
)

export function lookupCcipGroup(chainId: string, lcAddress: string): string | undefined {
  return CCIP_GROUPS[`${chainId}:${lcAddress}`]
}

/**
 * A CCIP copy's name, whichever list the row arrives through. LST_LIST / RWA_LIST are read
 * ahead of CCIP_LIST and copy their names from last run's chain lists, so without this a
 * renamed copy kept its old name forever (first list wins the whole row).
 */
export function lookupCcipCopyName(chainId: string, lcAddress: string): string | undefined {
  return CCIP_NAMES[`${chainId}:${lcAddress}`]
}

/** A token's Chainlink CCIP overlay. */
export function lookupCcip(chainId: string, lcAddress: string): CcipProps | undefined {
  return CCIP_PROPS[chainId]?.[lcAddress]
}
