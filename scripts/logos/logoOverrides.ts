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
 * Applied as the last step before each chain list is written.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const LOGO_OVERRIDES: Record<string, Record<string, string>> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'logoOverrides.json'), 'utf-8'),
)

/** Mutates `list` in place; returns how many entries were overridden. */
export function applyLogoOverrides(chainId: string, list: Record<string, any>): number {
  const byAddress = LOGO_OVERRIDES[chainId]
  if (!byAddress) return 0
  let n = 0
  for (const [address, logoURI] of Object.entries(byAddress)) {
    const entry = list[address]
    if (entry && entry.logoURI !== logoURI) {
      entry.logoURI = logoURI
      n++
    }
  }
  return n
}
