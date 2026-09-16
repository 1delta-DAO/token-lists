import { classifyRwaLst, isEtf } from '../labels/rwaLstRules'
import { lookupLstGroup } from '../lst/lstGroupMap'
import { lookupStablecoin } from '../stablecoin/stablecoinMap'
import { lookupSavings } from '../savings/savingsMap'
import { lookupDenomination } from '../denomination/denominationMap'
import { LstProps, RwaProps, SavingsProps, StablecoinProps, TokenProps } from '../utils/types'

/**
 * Classification overlay for `solana.json` — the `props.lst` / `rwa` /
 * `stablecoin` / `savings` / `denomination` flags every EVM list carries.
 *
 * WHY THIS IS NOT THE GENERATOR'S OVERLAY STEP
 * --------------------------------------------
 * `generateTokenMap.script.ts` overlays those props in its main loop, but
 * `solana.json` never passes through it (the generator admits only EVM/Fuel
 * address shapes). So the same lookups are applied here, plus one source the
 * EVM side does not have: JUPITER'S TAGS. Jupiter curates its verified list by
 * hand and tags it — `lst` (Sanctum stake-pool tokens), `stable`, `yb`
 * (yield-bearing stables), `rwa` with an issuer sub-tag (`xstocks`, `ondo`,
 * `backpack`, `prestocks`, `tessera`, `shift`, `commodities`). Measured on the
 * verified set (3,374 tokens): 147 `lst`, 21 `stable`, 15 `yb`, 1,363 `rwa`.
 * That is a far better signal than the name-phrase rules, which on Solana
 * mostly do not know the issuers.
 *
 * PRECEDENCE, per category, first hit wins:
 *  1. the shared rule engine (`labels/rwaLstRules.ts`) — it is the only source
 *     that names a `provider` / `issuer`, so it goes first where it fires. It
 *     is GATED on a corroborating Jupiter tag: a name-phrase alone is too weak
 *     on a chain where any token can call itself "Jito Staked SOL", and the
 *     EVM side has the CoinGecko impostor guard that this list lacks.
 *  2. the assetGroup-keyed overlays (`lst-groups.json`, `stablecoin.json`,
 *     `savings.json`) — for the ~40 % of mints that joined a global group.
 *  3. Jupiter's tags, which know WHAT a token is (a SOL LST, a stable, a
 *     tokenized stock) but rarely WHO issued it. A field the tag cannot
 *     support is left out rather than guessed.
 */

export interface TaggedToken {
  name: string
  symbol: string
  tags?: string[]
}

/** Jupiter's issuer sub-tags under `rwa` → the issuer slug the EVM lists use. */
const STOCK_ISSUER_BY_TAG: { [tag: string]: string } = {
  xstocks: 'backed', // xStocks are issued by Backed Finance — same slug the EVM `xstocks` rule emits
  ondo: 'ondo',
  backpack: 'backpack',
  prestocks: 'prestocks',
  tessera: 'tessera',
  shift: 'shift',
}

/** Symbol suffix each issuer appends to the underlying's ticker (`NVDAx`, `NVDAon`). */
const TICKER_SUFFIX_BY_TAG: { [tag: string]: RegExp } = {
  xstocks: /x$/,
  ondo: /on$/,
  backpack: /$/, // Backpack uses the bare ticker
}

const pegBase = (name: string, symbol: string): string | undefined => {
  const s = `${symbol} ${name}`
  if (/EUR/i.test(s)) return 'EUR'
  if (/USD|DOLLAR/i.test(s)) return 'USD'
  return undefined
}

function lstFromTags(t: TaggedToken, tags: Set<string>): LstProps | undefined {
  // Jupiter's `lst` tag is Sanctum's stake-pool roster — every one is a SOL LST.
  if (tags.has('lst')) return { type: 'staking', asset: 'SOL' }
  // `yield` is broader (also covers jlUSDC, LBTC, xORCA …), so it needs the
  // name to say "(re)staked" and the ticker to say SOL before it counts.
  if (!tags.has('yield') || !/sol\b/i.test(t.symbol)) return undefined
  if (/restak/i.test(t.name)) return { type: 'restaking', asset: 'SOL' }
  if (/\bstaked?\b/i.test(t.name)) return { type: 'staking', asset: 'SOL' }
  return undefined
}

function rwaFromTags(t: TaggedToken, tags: Set<string>): RwaProps | undefined {
  if (!tags.has('rwa')) return undefined
  const n = t.name.toLowerCase()

  // Stocks BEFORE the metal test: Goldman Sachs, B2Gold, First Majestic Silver
  // and the SPDR/iShares metal trusts are all tokenized EQUITIES whose names
  // would otherwise trip the gold/silver match. Jupiter's `stocks` tag is the
  // tie-break the name cannot supply.
  const issuerTag = Object.keys(STOCK_ISSUER_BY_TAG).find((tag) => tags.has(tag))
  const isStock = tags.has('stocks') || tags.has('equities') || !!issuerTag

  if (!isStock && (tags.has('commodities') || /gold|silver|\bxau|\bxag/i.test(n))) {
    const silver = /silver|\bxag/i.test(n)
    return { type: 'commodity', subType: silver ? 'silver' : 'gold', underlying: silver ? 'XAG' : 'XAU' }
  }

  if (isStock) {
    const issuer = issuerTag ? STOCK_ISSUER_BY_TAG[issuerTag] : undefined
    const strip = issuerTag ? TICKER_SUFFIX_BY_TAG[issuerTag] : undefined
    const underlying = strip ? t.symbol.replace(strip, '') : undefined
    if (isEtf(t.name)) return { type: 'fund', subType: 'etf', issuer, underlying }
    // Pre-IPO synthetic exposure (PreStocks, Tessera) and Shift's leveraged
    // long/short tokens are equity-shaped but are NOT a share of stock; the
    // sub-type is where that difference lives.
    const subType =
      issuerTag === 'prestocks' || issuerTag === 'tessera' ? 'pre-ipo' : issuerTag === 'shift' ? 'leveraged' : 'stock'
    return { type: 'equity', subType, issuer, underlying }
  }

  return { type: 'other' }
}

function stablecoinFromTags(t: TaggedToken, tags: Set<string>): StablecoinProps | undefined {
  if (!tags.has('stable')) return undefined
  const base = pegBase(t.name, t.symbol)
  return base ? { base } : {}
}

function savingsFromTags(t: TaggedToken, tags: Set<string>): SavingsProps | undefined {
  if (!tags.has('yb')) return undefined
  // Only the wrappers whose ticker literally names the underlying: Jupiter
  // Lend `jlUSDC` → USDC, Maple `syrupUSDC` → USDC. `sUSD` (Solayer) does NOT
  // wrap a token called USD, so an `s`-prefix rule would lie.
  const m = /^(?:jl|syrup)(.+)$/.exec(t.symbol)
  const base = pegBase(t.name, t.symbol)
  return { ...(m ? { underlying: m[1] } : {}), ...(base ? { base } : {}) }
}

/** Strip `undefined` fields so the written JSON matches the EVM lists' shape. */
function compact<T extends object>(o: T | undefined): T | undefined {
  if (!o) return undefined
  const out: any = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v
  return out
}

/**
 * The overlay for one Jupiter token. `assetGroup` is the group `solana.ts`
 * resolved (global or `::solana`-scoped); `existing` is the props the entry
 * already carries (`solana.tokenProgram`, `exponent`, …).
 */
export function classifySolanaToken(t: TaggedToken, assetGroup: string, existing: TokenProps = {}): TokenProps {
  const tags = new Set(t.tags ?? [])
  const rule = classifyRwaLst({ name: t.name, symbol: t.symbol })
  const auto = rule?.confidence === 'auto' ? rule : null

  const lst =
    (tags.has('lst') || tags.has('yield') ? auto?.lst : undefined) ?? lookupLstGroup(assetGroup) ?? lstFromTags(t, tags)
  const rwa = (tags.has('rwa') ? auto?.rwa : undefined) ?? rwaFromTags(t, tags)
  const stablecoin = lookupStablecoin(assetGroup) ?? stablecoinFromTags(t, tags)
  const savings = lookupSavings(assetGroup) ?? savingsFromTags(t, tags)

  let props: TokenProps = { ...existing }
  if (lst && !props.lst) props.lst = compact(lst)
  if (rwa && !props.rwa) props.rwa = compact(rwa)
  if (stablecoin && !props.stablecoin) props.stablecoin = compact(stablecoin)
  if (savings && !props.savings) props.savings = compact(savings)

  // Same rule as the generator: `denomination` means "IS ETH/BTC/SOL", never
  // "tracks it", so a derivative keeps its own flag and gets none.
  const denomination = lookupDenomination(assetGroup)
  if (denomination && !props.denomination && !props.lst && !props.savings && !props.exponent)
    props.denomination = denomination

  return props
}
