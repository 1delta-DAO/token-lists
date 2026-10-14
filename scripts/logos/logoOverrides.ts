/**
 * Hand-curated `logoURI`s that WIN over whatever the source lists carry.
 *
 * `backfillLogos.ts` only ever fills an EMPTY logo, and the generator keeps the
 * first source icon it sees. Neither can replace an icon that exists but is
 * wrong. The case that needs it: CoinGecko serves ONE Robinhood-feather
 * placeholder for every Robinhood stock token on chain 4663 (AAPL and SHY are
 * byte-identical), so 200 equities and funds rendered as the same lime circle.
 * Those icons now live in 1delta-DAO/asset-icons `stocks/<TICKER>.webp`
 * (company logos, normalized to 128 px), keyed here by address.
 *
 * `logoOverrides.json` is `{ [chainId]: { [lowercase address]: logoURI } }`.
 *
 * `ipfsMirror.json` is the other half: `{ "<cid>[/path]": logoURI }`, written by
 * `mirror_ipfs.py`. The public IPFS gateways the source lists point at (ipfs.io,
 * dweb.link, nftstorage.link, …) are gone, so every content-addressed logo with
 * a mirror is swapped for its asset-icons `ipfs/` copy, whatever gateway it named.
 *
 * Applied as the last step before each chain list is written.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const LOGO_OVERRIDES: Record<string, Record<string, string>> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'logoOverrides.json'), 'utf-8'),
)

export const IPFS_MIRROR: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ipfsMirror.json'), 'utf-8'),
)

const CID = '(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})'
/** `<cid>` or `<cid>/<path>` for a content-addressed logo URL (same rule as `mirror_ipfs.py`), else undefined. */
export function ipfsKey(uri: string | undefined): string | undefined {
  if (!uri) return undefined
  const tail = (p: string | undefined) => {
    try {
      return (p ? decodeURIComponent(p) : '').replace(/\/+$/, '')
    } catch {
      return (p ?? '').replace(/\/+$/, '')
    }
  }
  const scheme = uri.match(new RegExp(`^ipfs://(?:ipfs/)?${CID}(/[^?#]*)?`))
  if (scheme) return scheme[1] + tail(scheme[2])
  let u: URL
  try {
    u = new URL(uri)
  } catch {
    return undefined
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined
  const gw = u.pathname.match(new RegExp(`^/ipfs/${CID}(/[^?#]*)?$`))
  if (gw) return gw[1] + tail(gw[2])
  const sub = u.hostname.match(new RegExp(`^${CID}\\.ipfs\\.`))
  return sub ? sub[1] + tail(u.pathname === '/' ? '' : u.pathname) : undefined
}

/** Mutates `list` in place; returns how many entries were overridden. */
export function applyLogoOverrides(chainId: string, list: Record<string, any>): number {
  let n = 0
  for (const entry of Object.values(list)) {
    const key = ipfsKey(entry?.logoURI)
    const mirrored = key && IPFS_MIRROR[key]
    if (mirrored) {
      entry.logoURI = mirrored
      n++
    }
  }
  const byAddress = LOGO_OVERRIDES[chainId]
  if (!byAddress) return n
  for (const [address, logoURI] of Object.entries(byAddress)) {
    const entry = list[address]
    if (entry && entry.logoURI !== logoURI) {
      entry.logoURI = logoURI
      n++
    }
  }
  return n
}
