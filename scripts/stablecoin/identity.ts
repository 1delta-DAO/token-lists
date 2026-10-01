/**
 * Identity normalisation shared by the stablecoin snapshot (stablecoin.ts) and the
 * lookup (stablecoinMap.ts).
 *
 * The ticker fallback exists for FRAGMENTED group variants of a real stablecoin —
 * collision suffixes (`Liquity BOLD::BOLD::8453::0`), bridge suffixes (`PAR Stablecoin
 * (PoS)`), casing (`Cap USD::cUSD` vs `Cap USD::CUSD`) and renames (`EURA (previously
 * agEUR)`). A ticker alone is not an identity — `Ethernity Chain::ERN` is not Ethos'
 * `ERN`, `Hacken::HAI` is not Let's Get HAI — so a symbol hit must ALSO match the name
 * on the same evidence normalisation.
 */

/** Trailing version / vintage words that do not change identity (`USDaf Legacy`, `… V2`, `[OLD]`). */
const VINTAGE = /(?:\s+(?:v\d+|legacy|old|new))+$/i

/**
 * `Let's Get HAI` → `letsgethai`; `USD Coin (PoS)` → `usdcoin`; `EURA (previously agEUR)` →
 * `eura`; `Asymmetry USDaf V2` → `asymmetryusdaf`. Bracketed segments are bridge / rename
 * annotations, never identity.
 */
export function normName(name: string | undefined): string {
  if (!name) return ''
  let s = name.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').trim()
  s = s.replace(VINTAGE, '')
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * A group string modulo the variant noise the lists introduce: the `::<chain>::<n>`
 * collision suffix, the name's bracketed annotations / vintage and casing, and the symbol's
 * casing. `Liquity BOLD::BOLD::8453::0` and `Liquity BOLD::BOLD::1::0` → `liquitybold::BOLD`.
 * A bare group (`USDC`) keeps its symbol only.
 */
export function normGroup(group: string): string {
  const stripped = group.replace(/(::[^:]+::\d+)+$/, '')
  const i = stripped.lastIndexOf('::')
  if (i < 0) return `::${stripped.toUpperCase()}`
  return `${normName(stripped.slice(0, i))}::${stripped.slice(i + 2).toUpperCase()}`
}

/** Evidence row of the symbol snapshot: the money, plus who may claim it. */
export interface StablecoinSymbolEntry {
  /**
   * normName() of every name the real asset is known under (feed name, feed group's name
   * part, names of the curated group's own deployments) -> its fiat base ('' = flagged,
   * floating peg). A name two feed rows disagree on the money for is dropped.
   */
  names: { [normalizedName: string]: string }
  /** `chainId:lcAddress` deployments the feed attributes to this ticker -> base. */
  addresses?: { [chainAddress: string]: string }
}
export type StablecoinSymbolMap = { [upperSymbol: string]: StablecoinSymbolEntry }
