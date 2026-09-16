// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { TokenProps } from '../utils/types'
import { classifySolanaToken } from './solanaClassify'

/**
 * Generates `solana.json`, the chain list for `Chain.SOLANA = 'solana'`.
 *
 * WHY JUPITER IS THE ROSTER AND COINGECKO IS THE IDENTITY
 * ------------------------------------------------------
 * Two different jobs, two different sources.
 *
 * WHICH tokens to carry comes from **Jupiter's verified list**: it is what our
 * aggregator will actually route, and a token list is a promise that the pair
 * is tradeable. CoinGecko's `tokens.coingecko.com/solana/all.json` is the
 * obvious first idea and fails that test — 4,258 of its 6,965 tokens (61 %) are
 * not in Jupiter's verified set, and every row carries `chainId: null`.
 *
 * WHICH ASSET each one IS comes from **CoinGecko's `/coins/list?
 * include_platform=true`**, which maps one coin id onto its address on every
 * chain. That is the piece a symbol/name heuristic cannot supply, and without
 * it this list is actively wrong: **1,336 of the 3,240 verified mints (41 %)
 * are assets we ALREADY carry on an EVM chain** — Wormhole-bridged WETH and
 * WBTC, cbBTC, USDS, sUSDe, Ondo's USDY and its whole tokenized-equity book,
 * the xStocks, AAVE, LINK. Scoping those to `::solana` would sever every one of
 * them from its own group and show the user two unrelated rows for one asset.
 *
 * WHAT EACH ONE IS (lst / rwa / stablecoin / savings) is overlaid by
 * `solanaClassify.ts` from Jupiter's own tags, the shared rule engine and the
 * assetGroup-keyed snapshots — this list never passes through the generic
 * generator, so the overlay step it would get there is applied here.
 *
 * EXPONENT PT/YT/SY (`exponent/exponent.json`, from `npm run exponent`) are
 * merged in last. Jupiter does not verify them, so none of the 200-odd mints
 * would otherwise be listed at all — and a holder of a matured PT needs it in
 * the list to redeem it.
 */

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const OUT = path.resolve(REPO_ROOT, 'solana.json')

const JUPITER_VERIFIED = 'https://lite-api.jup.ag/tokens/v2/tag?query=verified'
const COINGECKO_SOLANA = 'https://tokens.coingecko.com/solana/all.json'
const COINGECKO_PLATFORMS = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
const COINGECKO_ASSET_PLATFORMS = 'https://api.coingecko.com/api/v3/asset_platforms'

/**
 * Curation floor, OFF by default: Jupiter's `verified` tag is the curation, and
 * chain 1 publishes 13,771 tokens against Solana's 3,240. Set
 * `SOLANA_MIN_LIQUIDITY=250000` for a ~245-token starter list.
 */
const MIN_LIQUIDITY_USD = Number(process.env.SOLANA_MIN_LIQUIDITY ?? 0)

/** How many of the most liquid mints go into `mainTokens`. */
const MAIN_TOKEN_COUNT = 30

const SPL_TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

/** Wrapped SOL — the chain's wrapped native, flagged the way `WRAPPED_NATIVE_INFO` flags WETH. */
const WSOL = 'So11111111111111111111111111111111111111112'

const EXPONENT_LIST = path.resolve(__dirname, '../exponent/exponent.json')

/**
 * Human override, applied BEFORE the CoinGecko resolution and beating it.
 *
 * Deliberately tiny — this is for an asset we know CoinGecko gets wrong or does
 * not cover, not a substitute for the cross-chain map. Everything else earns
 * its group from evidence.
 */
const SOLANA_MAPPEDS: { [mint: string]: string } = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  // Huma's PST: the Solana original of the CCIP mirrors on Ethereum
  // (`0x22ae3d9a…`) and Arc (`0xa6db07eb…`), which carry this group. CoinGecko
  // lists no PST coin at all, so the cross-chain map cannot join it.
  '59obFNBzyTBGowrkif5uK7ojS58vsuWz3ZCvg6tfZAGw': 'PayFi Strategy Token::PST',
}

interface JupToken {
  id: string
  createdAt?: string
  name: string
  symbol: string
  icon?: string
  decimals: number
  liquidity?: number
  tokenProgram?: string
  isVerified?: boolean
  /** Jupiter's curation tags: `verified`, `lst`, `stable`, `yb`, `rwa`, `xstocks`, `ondo`, … */
  tags?: string[]
}

interface ListEntry {
  chainId: string
  decimals: number
  name: string
  address: string
  symbol: string
  logoURI?: string
  assetGroup: string
  currencyId: string
  props?: TokenProps
}

interface ExponentListToken {
  chainId: string
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  props: { exponent: NonNullable<TokenProps['exponent']> }
}

/** Tolerates a missing file so this list never hard-fails on the Exponent step. */
function readExponentList(): ExponentListToken[] {
  try {
    return JSON.parse(fs.readFileSync(EXPONENT_LIST, 'utf8'))
  } catch {
    console.warn('[solana] exponent.json not found — run `npm run exponent`. Proceeding without Exponent PT/YT/SY.')
    return []
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`)
  return (await res.json()) as T
}

/**
 * Every `assetGroup` we already publish, indexed by the address that carries
 * it. OUR OWN LISTS ARE THE AUTHORITY on what a group is — CoinGecko supplies
 * only the claim that two addresses are one asset, never the group's name.
 */
function readPublishedGroups(): { byKey: Map<string, Set<string>>; usage: Map<string, number> } {
  const byKey = new Map<string, Set<string>>()
  const usage = new Map<string, number>()
  for (const file of fs.readdirSync(REPO_ROOT)) {
    if (!file.endsWith('.json')) continue
    const base = file.slice(0, -5)
    if (!/^\d+$/.test(base)) continue // EVM chain lists only
    let data: any
    try {
      data = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'))
    } catch {
      continue
    }
    for (const [address, t] of Object.entries<any>(data?.list ?? {})) {
      const g = t?.assetGroup
      if (!g) continue
      // KEYED BY (chain, address), never by address alone. The same 0x address
      // is a DIFFERENT asset on different chains — `0xf4d92352…` is Tether Gold
      // on HyperEVM and WETH on chain 33139 — so an address-only index put
      // Tether Gold into the `ETH` group. That was a real mis-join this guard
      // caught, not a hypothetical.
      const key = `${base}:${address.toLowerCase()}`
      if (!byKey.has(key)) byKey.set(key, new Set())
      byKey.get(key)!.add(g)
      usage.set(g, (usage.get(g) ?? 0) + 1)
    }
  }
  return { byKey, usage }
}

async function main() {
  const [jup, cgList, cgCoins, cgPlatforms] = await Promise.all([
    getJson<JupToken[]>(JUPITER_VERIFIED),
    getJson<{ tokens: { address: string; logoURI?: string }[] }>(COINGECKO_SOLANA).catch(() => ({ tokens: [] })),
    getJson<{ id: string; symbol: string; platforms?: Record<string, string | null> }[]>(COINGECKO_PLATFORMS),
    getJson<{ id: string; chain_identifier: number | null }[]>(COINGECKO_ASSET_PLATFORMS),
  ])
  const cgLogo = new Map(cgList.tokens.map((t) => [t.address, t.logoURI]))
  const { byKey, usage } = readPublishedGroups()

  // CoinGecko's own slug -> EIP-155 id table (275 of its 466 platforms carry
  // one). Fetched rather than hardcoded, and a slug without an id is simply
  // ignored — failing closed loses a match, guessing invents one.
  const slugToChain = new Map<string, string>()
  for (const p of cgPlatforms) if (p.chain_identifier) slugToChain.set(p.id, String(p.chain_identifier))

  const kept = jup.filter((t) => t.isVerified !== false).filter((t) => (t.liquidity ?? 0) >= MIN_LIQUIDITY_USD)
  const bySymbol = new Map(kept.map((t) => [t.id, t.symbol]))

  /**
   * mint -> the group it already has on our EVM chains.
   *
   * Three guards, each of which drops a match rather than guessing:
   *  - the CoinGecko coin's symbol must match Jupiter's, so a bad platform row
   *    cannot quietly move a token into someone else's group;
   *  - candidates are collapsed case-insensitively (`MMMX` / `MMMx` are one);
   *  - a remaining tie prefers a BARE group (no `::`), which is the canonical,
   *    undisambiguated one — `AAVE` over `Aave Token::1AAVE` — then the most
   *    widely used spelling. 56 cases resolve here, all of that shape.
   */
  const crossChain = new Map<string, string>()
  for (const coin of cgCoins) {
    const mint = coin.platforms?.solana
    if (!mint || !bySymbol.has(mint)) continue
    if ((coin.symbol ?? '').toLowerCase() !== (bySymbol.get(mint) ?? '').toLowerCase()) continue

    const candidates = new Set<string>()
    for (const [slug, address] of Object.entries(coin.platforms ?? {})) {
      if (slug === 'solana' || !address) continue
      const chain = slugToChain.get(slug)
      if (!chain) continue
      for (const g of byKey.get(`${chain}:${String(address).toLowerCase()}`) ?? []) candidates.add(g)
    }
    if (!candidates.size) continue

    const bare = [...candidates].filter((g) => !g.includes('::'))
    const pool = bare.length ? bare : [...candidates]
    crossChain.set(
      mint,
      pool.sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0) || a.length - b.length || (a < b ? -1 : 1))[0],
    )
  }

  /**
   * Disambiguation order, and it must be IMMUTABLE.
   *
   * `assetGroup` is an identity downstream joins key on, so a token's suffix
   * may never move between runs. Ordering by liquidity would do exactly that.
   * `createdAt` is fixed forever AND semantically right — where two tokens
   * claim one name the impostor is the newcomer, so the ORIGINAL keeps the
   * clean group. It is absent on 49 of the verified set and ties outright on
   * `pepe::pepe`, which is why the mint is the tiebreak, not the other way
   * round.
   */
  const ordered = [...kept].sort((a, b) => {
    const ca = a.createdAt ?? '￿'
    const cb = b.createdAt ?? '￿'
    if (ca !== cb) return ca < cb ? -1 : 1
    return a.id < b.id ? -1 : 1
  })

  const exponent = readExponentList()
  const exponentByMint = new Map(exponent.map((e) => [e.address, e]))

  const list: { [address: string]: ListEntry } = {}
  const skippedNoDecimals: string[] = []
  const takenGroups = new Set<string>()
  const globalGroupOwner = new Map<string, string>()
  let suffixed = 0
  let joinedGlobal = 0
  const doubleClaimed: string[] = []

  for (const t of ordered) {
    // DECIMALS COME FROM THE SOURCE OR THE TOKEN IS DROPPED. Solana decimals are
    // genuinely mixed (6 / 9 / 8 / 5 / 4 / 2), so a default here is the
    // chain-1672 mistake: 48 tokens published at the wrong scale because the
    // list assumed 18.
    if (typeof t.decimals !== 'number' || !Number.isInteger(t.decimals)) {
      skippedNoDecimals.push(t.id)
      continue
    }

    const currencyId = `${t.name}::${t.symbol}`
    const global = SOLANA_MAPPEDS[t.id] ?? crossChain.get(t.id)
    let assetGroup: string

    if (global) {
      // Two Solana mints claiming one global group would be two rows rendering
      // as one asset. Measured: this does not happen today (0 cases), so it is
      // reported rather than silently resolved — if it starts happening the
      // cross-chain map is wrong and a human should look.
      const prior = globalGroupOwner.get(global.toLowerCase())
      if (prior) {
        doubleClaimed.push(`${global} <- ${prior} & ${t.id}`)
        assetGroup = `${currencyId}::solana`
      } else {
        globalGroupOwner.set(global.toLowerCase(), t.id)
        assetGroup = global
        joinedGlobal++
      }
    } else {
      // No evidence it is a known asset ⇒ scope the group to this chain so it
      // can never collide with an unrelated asset that shares a ticker. The
      // Fuel rule (`FUEL_MAPPEDS`).
      assetGroup = `${currencyId}::solana`
    }

    // Two chain-scoped tokens claiming one `name::symbol`, CASE-INSENSITIVELY —
    // the invariant is about what a human sees, and `Pepe::Pepe` vs `Pepe::PEPE`
    // are two strings and one row to a reader. Nine of the fifteen collisions
    // differ only in capitalisation. The first through the ordering above keeps
    // the clean group; the rest are numbered, the shape
    // `generateTokenMap.script.ts` produces on every other chain.
    if (!global && takenGroups.has(assetGroup.toLowerCase())) {
      let n = 0
      while (takenGroups.has(`${assetGroup}::${n}`.toLowerCase())) n++
      assetGroup = `${assetGroup}::${n}`
      suffixed++
    }
    takenGroups.add(assetGroup.toLowerCase())

    let props: TokenProps = {}
    // Token-2022 supports transfer FEES and transfer HOOKS, so a mint on this
    // program is the fee-on-transfer class the EVM side already treats
    // specially — a quote against one can under-deliver. Flagged rather than
    // excluded: several are majors.
    if (t.tokenProgram === TOKEN_2022) props.solana = { tokenProgram: 'token-2022' }
    else if (t.tokenProgram === SPL_TOKEN) props.solana = { tokenProgram: 'spl-token' }
    if (t.id === WSOL) props = { ...props, wnative: true, denomination: 'SOL' }
    if (exponentByMint.has(t.id)) props.exponent = exponentByMint.get(t.id)!.props.exponent

    props = classifySolanaToken(t, assetGroup, props)

    list[t.id] = {
      chainId: 'solana',
      decimals: t.decimals,
      name: t.name,
      address: t.id,
      symbol: t.symbol,
      logoURI: t.icon ?? cgLogo.get(t.id),
      assetGroup,
      currencyId,
      ...(Object.keys(props).length ? { props } : {}),
    }
  }

  // Exponent mints Jupiter does not carry. Always chain-scoped: a PT/YT/SY
  // exists on exactly one chain and joins no global group. A mint Jupiter DOES
  // carry keeps its Jupiter identity and picked up `props.exponent` above.
  let exponentAdded = 0
  for (const e of exponent) {
    if (list[e.address]) continue
    if (typeof e.decimals !== 'number' || !Number.isInteger(e.decimals)) continue
    const currencyId = `${e.name}::${e.symbol}`
    let assetGroup = `${currencyId}::solana`
    if (takenGroups.has(assetGroup.toLowerCase())) {
      let n = 0
      while (takenGroups.has(`${assetGroup}::${n}`.toLowerCase())) n++
      assetGroup = `${assetGroup}::${n}`
      suffixed++
    }
    takenGroups.add(assetGroup.toLowerCase())
    list[e.address] = {
      chainId: 'solana',
      decimals: e.decimals,
      name: e.name,
      address: e.address,
      symbol: e.symbol,
      logoURI: e.logoURI,
      assetGroup,
      currencyId,
      props: { exponent: e.props.exponent },
    }
    exponentAdded++
  }

  const sortedList: { [address: string]: ListEntry } = {}
  for (const k of Object.keys(list).sort()) sortedList[k] = list[k]

  const mainTokens = kept
    .filter((t) => list[t.id])
    .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))
    .slice(0, MAIN_TOKEN_COUNT)
    .map((t) => t.id)

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      { chainId: 'solana', version: { major: 1, minor: 0, patch: 0 }, list: sortedList, mainTokens },
      null,
      2,
    ) + '\n',
  )

  const vals = Object.values(sortedList)
  const byGroup = new Map<string, number>()
  for (const e of vals) {
    const k = e.assetGroup.toLowerCase()
    byGroup.set(k, (byGroup.get(k) ?? 0) + 1)
  }
  const groupDupes = [...byGroup.entries()].filter(([, c]) => c > 1)

  console.log(`jupiter verified            : ${jup.length}`)
  console.log(`kept (liquidity >= $${MIN_LIQUIDITY_USD.toLocaleString()})   : ${vals.length}`)
  console.log(
    `joined an EXISTING group    : ${joinedGlobal}  (${((joinedGlobal / vals.length) * 100).toFixed(1)} % — cross-chain assets)`,
  )
  console.log(`  of which by explicit map  : ${vals.filter((e) => SOLANA_MAPPEDS[e.address]).length}`)
  console.log(`chain-scoped (::solana)     : ${vals.filter((e) => e.assetGroup.includes('::solana')).length}`)
  console.log(`disambiguated with ::N      : ${suffixed}`)
  console.log(
    `token-2022 mints            : ${vals.filter((e) => e.props?.solana?.tokenProgram === 'token-2022').length}`,
  )
  const withProp = (k: keyof TokenProps) => vals.filter((e) => e.props?.[k]).length
  console.log(`classified lst              : ${withProp('lst')}`)
  console.log(`classified rwa              : ${withProp('rwa')}`)
  console.log(`classified stablecoin       : ${withProp('stablecoin')}`)
  console.log(`classified savings          : ${withProp('savings')}`)
  console.log(`denomination set            : ${withProp('denomination')}`)
  console.log(
    `exponent PT/YT/SY           : ${withProp('exponent')}  (${exponentAdded} added, ${exponent.length - exponentAdded} already verified by Jupiter)`,
  )
  if (skippedNoDecimals.length) console.log(`DROPPED, no decimals        : ${skippedNoDecimals.length}`)
  if (doubleClaimed.length)
    console.log(`GROUP DOUBLE-CLAIMED        : ${doubleClaimed.length} ${JSON.stringify(doubleClaimed.slice(0, 5))}`)
  // THE invariant. Anything but 0 means two rows would render as one thing.
  console.log(
    `shared assetGroups          : ${groupDupes.length}${groupDupes.length ? '  <- MUST BE 0: ' + JSON.stringify(groupDupes.slice(0, 5)) : ''}`,
  )
  console.log(`written                     : ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
