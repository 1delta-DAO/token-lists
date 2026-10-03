// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { IssuerExposure, IssuerExposureGroupMap, IssuerGroupMap, IssuerProps } from '../utils/types'
import { ISSUER_BY_ADDRESS, ISSUER_CURATED } from './issuerAssets'
import { WRAPPER_ISSUERS, wrapperHop } from './wrappers'
import { STABLECOIN_MAP } from '../stablecoin/stablecoinMap'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Builds the assetGroup -> issuer snapshot (issuer.json) the generator overlays
 * as `props.issuer`.
 *
 * Two inputs, in this order of authority:
 *
 *  1. DERIVED from the props already published on the previous omni-list —
 *     `rwa.issuer`, `lst.provider`, `oft.routes[].oapp`. These are the only
 *     issuer-shaped fields that exist today and they cost nothing to reuse;
 *     between them they attribute the staking and RWA corners in full.
 *  2. CURATED (issuerAssets.ts), merged LAST so it always wins. The dollar menu
 *     lives entirely here — no feed names the desk behind USDS, USDe, syrupUSDC
 *     or GHO.
 *
 * Reading the previous omni-list rather than the source lists is deliberate:
 * it is the one place where every group's props are already resolved and
 * alias-collapsed, so one pass covers all three seeds with no per-source
 * address→group plumbing. It also means a freshly-added LST attributes itself
 * on the NEXT run; the curated map is the escape hatch when that is too slow.
 *
 * Non-fatal by design (same contract as stablecoin.ts): if the omni-list cannot
 * be read, the committed snapshot stands and `generate` still runs.
 */

/** Display names and kinds for slugs the seeds emit. Unlisted slugs get a title-cased name. */
const SEED_ALIASES: Record<string, IssuerProps> = {
  lido: { id: 'lido', name: 'Lido', kind: 'protocol' },
  etherfi: { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  'ether.fi': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  'ether-fi': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  rocketpool: { id: 'rocketpool', name: 'Rocket Pool', kind: 'protocol' },
  'rocket-pool': { id: 'rocketpool', name: 'Rocket Pool', kind: 'protocol' },
  stakewise: { id: 'stakewise', name: 'StakeWise', kind: 'protocol' },
  renzo: { id: 'renzo', name: 'Renzo', kind: 'protocol' },
  kelp: { id: 'kelp', name: 'Kelp', kind: 'protocol' },
  swell: { id: 'swell', name: 'Swell', kind: 'protocol' },
  puffer: { id: 'puffer', name: 'Puffer', kind: 'protocol' },
  mantle: { id: 'mantle', name: 'Mantle', kind: 'protocol' },
  bedrock: { id: 'bedrock', name: 'Bedrock', kind: 'protocol' },
  ankr: { id: 'ankr', name: 'Ankr', kind: 'protocol' },
  stader: { id: 'stader', name: 'Stader', kind: 'protocol' },
  benqi: { id: 'benqi', name: 'BENQI', kind: 'protocol' },
  lista: { id: 'lista', name: 'Lista', kind: 'protocol' },
  jito: { id: 'jito', name: 'Jito', kind: 'protocol' },
  marinade: { id: 'marinade', name: 'Marinade', kind: 'protocol' },
  'liquid-collective': { id: 'liquid-collective', name: 'Liquid Collective', kind: 'protocol' },
  // Exchanges staking their own users' deposits — a different promise again.
  coinbase: { id: 'coinbase', name: 'Coinbase', kind: 'cex' },
  binance: { id: 'binance', name: 'Binance', kind: 'cex' },
  bybit: { id: 'bybit', name: 'Bybit', kind: 'cex' },
  // LayerZero mesh names (`oft.routes[].oapp`) that ARE the issuer's own mesh.
  'frax-finance': { id: 'frax', name: 'Frax', kind: 'protocol' },
  usdt0: { id: 'tether', name: 'Tether', kind: 'institution' },
  ethena: { id: 'ethena', name: 'Ethena', kind: 'protocol' },
  reservoir: { id: 'reservoir', name: 'Reservoir', kind: 'protocol' },
  yieldfi: { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'fx-protocol': { id: 'fx-protocol', name: 'f(x) Protocol', kind: 'protocol' },
  river: { id: 'river', name: 'River', kind: 'protocol' },
  cap: { id: 'cap', name: 'Cap', kind: 'protocol' },
  usdai: { id: 'usdai', name: 'USDai', kind: 'protocol' },
  // RWA issuers (`rwa.issuer`) — off-chain entities without exception.
  midas: { id: 'midas', name: 'Midas', kind: 'institution' },
  ondo: { id: 'ondo', name: 'Ondo', kind: 'institution' },
  backed: { id: 'backed', name: 'Backed', kind: 'institution' },
  securitize: { id: 'securitize', name: 'Securitize', kind: 'institution' },
  franklin: { id: 'franklin', name: 'Franklin Templeton', kind: 'institution' },
  superstate: { id: 'superstate', name: 'Superstate', kind: 'institution' },
  hashnote: { id: 'hashnote', name: 'Hashnote', kind: 'institution' },
  paxos: { id: 'paxos', name: 'Paxos', kind: 'institution' },
  // Tokenized-stock desks (`rwa.issuer` from the per-provider rules in labels/rwaLstRules.ts
  // and the Robinhood rows in rwa/rwaAssets.ts). Listed so the display name is not the
  // title-cased slug ("Bstocks", "St0x").
  bstocks: { id: 'bstocks', name: 'bStocks', kind: 'institution' }, // BTECH Holdings (Binance-affiliated, ADGM)
  anchored: { id: 'anchored', name: 'Anchored', kind: 'institution' }, // Anchored (BVI); not Anchored Coins (AEUR)
  st0x: { id: 'st0x', name: 'ST0x', kind: 'institution' },
  robinhood: { id: 'robinhood', name: 'Robinhood', kind: 'institution' }, // Robinhood Assets (Jersey) Ltd
  // Solana desks (`solana.json`'s `lst.provider` / `rwa.issuer`, and the
  // curated Solana rows in issuerAssets.ts).
  jupiter: { id: 'jupiter', name: 'Jupiter', kind: 'protocol' },
  drift: { id: 'drift', name: 'Drift', kind: 'protocol' },
  sanctum: { id: 'sanctum', name: 'Sanctum', kind: 'protocol' },
  helius: { id: 'helius', name: 'Helius', kind: 'protocol' },
  phantom: { id: 'phantom', name: 'Phantom', kind: 'institution' }, // a company, as the CASH row says (issuerAssets.ts)
  solblaze: { id: 'solblaze', name: 'SolBlaze', kind: 'protocol' },
  blaze: { id: 'solblaze', name: 'SolBlaze', kind: 'protocol' }, // the rule engine's provider slug for bSOL
  onre: { id: 'onre', name: 'OnRe', kind: 'institution' },
  huma: { id: 'huma', name: 'Huma', kind: 'protocol' },
  solstice: { id: 'solstice', name: 'Solstice', kind: 'protocol' },
  hylo: { id: 'hylo', name: 'Hylo', kind: 'protocol' },
  okx: { id: 'okx', name: 'OKX', kind: 'cex' },
  hastra: { id: 'hastra', name: 'Hastra', kind: 'protocol' },
  jpool: { id: 'jpool', name: 'JPool', kind: 'protocol' },
  thevault: { id: 'thevault', name: 'The Vault', kind: 'protocol' },
  fragmetric: { id: 'fragmetric', name: 'Fragmetric', kind: 'protocol' },
  solayer: { id: 'solayer', name: 'Solayer', kind: 'protocol' },
}

/**
 * LayerZero meshes that ARE their issuer's own — an ALLOWLIST, not a denylist.
 *
 * A mesh name is a corridor brand, and most of them name a bridge, a chain or
 * an app rather than a promise. Accepting them by default attributed **WETH to
 * "Movement"** (150 tokens), every Glue-bridged token to "Glue" (233) and a
 * further 300-odd ids to things that issue nothing — the exact failure §9.9
 * rule 3 describes, arriving through a different door. An asset with no issuer
 * is a FACT, so anything not listed here stays unattributed and waits for a
 * curated line.
 *
 * The bar for an entry: the mesh moves the ISSUER'S OWN token (Ethena's USDe
 * over the `ethena` mesh, Tether's USDT over `usdt0`), so the corridor and the
 * desk are the same party. `wbtc`, `euler`, `zro-token`, `rootstock`,
 * `hybridge`, `movement`, `glue` and friends fail it and are deliberately
 * absent.
 */
const OAPP_ISSUER_MESHES = new Set([
  'usdt0',
  'ethena',
  'frax-finance',
  'reservoir',
  'yieldfi',
  'fx-protocol',
  'river',
  'cap',
  'usdai',
  'resolv',
  're',
  'usual',
  'paypal',
  'solv',
  'lorenzo',
  'lombard',
  'avalon',
  'yala',
])

/** 'liquid-collective' -> 'Liquid Collective' (only used for slugs no alias names). */
function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Normalize a raw seed label into a slug: lowercase, `[a-z0-9.-]`. */
function slug(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
  return s.length > 0 ? s : undefined
}

function resolve(raw: unknown, kind?: IssuerProps['kind']): IssuerProps | undefined {
  const s = slug(raw)
  if (!s) return undefined
  const alias = SEED_ALIASES[s]
  if (alias) return alias
  return { id: s, name: titleCase(s), ...(kind ? { kind } : {}) }
}

interface OmniCurrencyLike {
  currencies?: { chainId?: string; address?: string; name?: string; symbol?: string; props?: Record<string, any> }[]
}

/** Derive one group's issuer from the props its deployments already carry. */
function fromProps(group: OmniCurrencyLike): IssuerProps | undefined {
  for (const c of group.currencies ?? []) {
    const p = c?.props
    if (!p) continue
    // A deployment with its own ISSUER_BY_ADDRESS line speaks only for itself: it sits
    // in a split group (e.g. Robinhood's GameStop stock token on 4663 shares
    // `GameStop::GME` with unrelated Base/PulseChain tokens), and seeding the GROUP
    // from it would hand its desk to every other member.
    if (c.address && ISSUER_BY_ADDRESS[`${c.chainId}:${String(c.address).toLowerCase()}`]) continue
    // An RWA's issuer is the strongest signal there is: it is the legal entity.
    const rwa = resolve(p.rwa?.issuer, 'institution')
    if (rwa) return rwa
    // A staking provider IS the desk whose validator set and withdrawal queue
    // the holder depends on.
    const lst = resolve(p.lst?.provider, 'protocol')
    if (lst) return lst
    for (const r of p.oft?.routes ?? []) {
      const oapp = slug(r?.oapp)
      if (!oapp || !OAPP_ISSUER_MESHES.has(oapp)) continue
      const resolved = resolve(oapp)
      if (resolved) return resolved
    }
  }
  return undefined
}

/**
 * Resolve the WRAPPER groups to the desk their underlying walk terminates at.
 *
 * A PT over sUSDe is Pendle's instrument and Ethena's credit. Before this
 * existed it matched neither filter: of 2 203 wrapper tokens in the lists, zero
 * carried an issuer of any kind.
 *
 * The walk follows the hops that already exist per family — there is no generic
 * one to use, because the phase-4 walker (`props.underlying`) is declared in
 * the type file and emitted on 0 of 50 303 tokens. It stops at the first asset
 * whose GROUP carries an issuer, so it answers with today's curation rather
 * than with whatever the previous run happened to publish: curate one
 * underlying and every wrapper over it lights up on the next run.
 *
 * Keyed by the WRAPPER's group, so every deployment of that PT inherits it.
 *
 * Deliberately conservative:
 *  - `MAX_HOPS` and a seen-set, because a PT points at its SY as often as at
 *    the asset and a mis-declared pair could otherwise loop;
 *  - a group whose deployments disagree about the desk is DROPPED, not
 *    majority-voted — a disagreement means the hop data is wrong, and guessing
 *    would launder that into an attribution;
 *  - an exposure equal to the wrapper's own issuer is omitted, since repeating
 *    it says nothing.
 */
const MAX_HOPS = 8

function resolveExposures(
  omni: Record<string, OmniCurrencyLike>,
  issuers: IssuerGroupMap,
): { map: IssuerExposureGroupMap; stats: Record<string, number> } {
  // (chain, address) -> the group it belongs to, so a hop can be looked up.
  const byAddr = new Map<string, { group: string; currency: any }>()
  for (const [group, entry] of Object.entries(omni)) {
    for (const c of entry.currencies ?? []) {
      if (!c?.address) continue
      byAddr.set(`${c.chainId}:${String(c.address).toLowerCase()}`, { group, currency: c })
    }
  }

  const perGroup = new Map<string, Map<string, IssuerExposure>>()
  const stats: Record<string, number> = { wrappers: 0, resolved: 0, deadEnd: 0, cycles: 0, multiLeg: 0 }

  for (const [group, entry] of Object.entries(omni)) {
    for (const c of entry.currencies ?? []) {
      if (!wrapperHop(c?.props)) continue
      stats.wrappers++

      let cursor: any = c
      const seen = new Set<string>()
      let hops = 0
      let hit: IssuerExposure | undefined

      while (hops < MAX_HOPS) {
        const next = wrapperHop(cursor?.props)
        if (!next) break
        const key = `${cursor.chainId}:${String(next).toLowerCase()}`
        if (seen.has(key)) {
          stats.cycles++
          break
        }
        seen.add(key)
        const node = byAddr.get(key)
        if (!node) break
        hops++
        // A per-deployment desk (split groups like BUSD) beats the group's.
        const desk = ISSUER_BY_ADDRESS[key] ?? issuers[node.group]
        if (desk) {
          hit = { ...desk, hops }
          break
        }
        cursor = node.currency
      }

      if (!hit) {
        stats.deadEnd++
        continue
      }
      const perId = perGroup.get(group) ?? new Map<string, IssuerExposure>()
      perId.set(hit.id, hit)
      perGroup.set(group, perId)
    }
  }

  const map: IssuerExposureGroupMap = {}
  for (const [group, perId] of perGroup) {
    // Several DESKS for one group is not a conflict — it is a multi-leg
    // wrapper, and the whole reason this is a list. What would be a conflict is
    // two deployments of one group disagreeing, and that is indistinguishable
    // from here, so both are simply kept: a desk any deployment reaches is a
    // desk the group reaches.
    if (perId.size > 1) stats.multiLeg++
    const exposures = [...perId.values()]
      // The wrapper's own desk is not an exposure — `pendle -> pendle` adds an
      // entry and no information.
      .filter((e) => issuers[group]?.id !== e.id)
      .sort((a, b) => a.hops! - b.hops! || a.id.localeCompare(b.id))
    if (exposures.length === 0) continue
    map[group] = exposures
    stats.resolved++
  }
  return { map, stats }
}

/**
 * Savings wrappers resolve through `props.savings.underlying` the way PTs
 * resolve through `pendle.underlyingAsset`.
 *
 * - A savings group with NO desk of its own inherits its underlying's desk as
 *   its `issuer`: sDOLA is Inverse's, savUSD is Avant's — the staking leg of a
 *   desk's own dollar is that desk's instrument. Curated entries are already in
 *   `issuers` when this runs, so a third party's vault over someone else's
 *   dollar is fixed by curating the vault, never overridden from here.
 * - A savings group that HAS a desk, different from the underlying's, carries
 *   the underlying's as an exposure (hops 1): Strata's srUSDe -> Ethena.
 *
 * `savings.underlying` is a SYMBOL, not an address, and a ticker is not an
 * identity (USDF is Falcon's on one row and Astherus' on the next). So the
 * symbol is resolved only against deployments on the SAME chain as the
 * wrapper (exact casing preferred), only when every candidate there agrees on
 * one desk, and only when NO deployment of the wrapper is ambiguous. A
 * candidate with no desk is a vote for "unknown" and blocks the inheritance —
 * otherwise Astherus' asUSDF would inherit Falcon through a shared `USDF`.
 * Junk is thinned first: when any candidate is a stablecoin BY GROUP
 * (stablecoin.json — not the ticker fallback), the others are ignored. Deployments of one group that resolve to different
 * desks drop the group (same rule as the wrapper walk: never majority-vote).
 *
 * A fiat-reserve underlying (kind `institution`: Circle, Tether, Paxos …) is
 * NOT followed. A vault that takes USDC is denominated in USDC; its holder
 * carries the vault's credit, and naming Circle would file syrupUSDC, Spark's
 * sUSDC and every Strata mHYPER tranche under "Circle".
 */
function inheritSavings(
  omni: Record<string, OmniCurrencyLike>,
  issuers: IssuerGroupMap,
): { issuers: IssuerGroupMap; exposures: IssuerExposureGroupMap; stats: Record<string, number> } {
  // (chain, UPPER symbol) -> deployments with that ticker on that chain
  const bySymbol = new Map<string, { group: string; symbol: string; stable: boolean }[]>()
  for (const [group, entry] of Object.entries(omni)) {
    for (const c of entry.currencies ?? []) {
      if (typeof c?.symbol !== 'string') continue
      const key = `${c.chainId}:${c.symbol.toUpperCase()}`
      const list = bySymbol.get(key) ?? []
      // "Stable" means listed as a stablecoin BY GROUP (stablecoin.json), not
      // tagged through the ticker fallback (stablecoin-symbols.json) — that
      // fallback tags `StableUSD::USDS` as readily as Sky's USDS, and would
      // let any ticker-copy veto (or win) the resolution.
      const stable = !!(STABLECOIN_MAP[group] || STABLECOIN_MAP[`${c.name}::${c.symbol}`] || c.props?.savings)
      list.push({ group, symbol: c.symbol, stable })
      bySymbol.set(key, list)
    }
  }

  const stats: Record<string, number> = { wrappers: 0, ambiguous: 0, unresolved: 0, fiat: 0, conflicts: 0 }
  const inherited: IssuerGroupMap = {}
  const exposures: IssuerExposureGroupMap = {}

  for (const [group, entry] of Object.entries(omni)) {
    const deployments = (entry.currencies ?? []).filter((c) => typeof c?.props?.savings?.underlying === 'string')
    if (deployments.length === 0) continue
    stats.wrappers++

    const desks = new Map<string, IssuerProps>()
    let ambiguous = false
    for (const c of deployments) {
      const underlying = String(c.props!.savings.underlying)
      let candidates = (bySymbol.get(`${c.chainId}:${underlying.toUpperCase()}`) ?? []).filter((x) => x.group !== group)
      // Exact casing first: `YUSD` (Aegis) and `yUSD` (YieldFi) are different
      // dollars, and only when no deployment spells it exactly is the casing
      // treated as list noise (`USDf` listed as `USDF`).
      const exact = candidates.filter((x) => x.symbol === underlying)
      if (exact.length) candidates = exact
      if (candidates.some((x) => x.stable)) candidates = candidates.filter((x) => x.stable)
      if (candidates.length === 0) continue
      const ids = new Set(candidates.map((x) => issuers[x.group]?.id ?? ''))
      if (ids.size !== 1 || ids.has('')) {
        ambiguous = true
        continue
      }
      const desk = issuers[candidates[0].group]
      desks.set(desk.id, desk)
    }

    // One ambiguous deployment sinks the group: the ticker demonstrably means
    // more than one thing for this wrapper, so a clean answer on another chain
    // is as likely to be a ticker collision as the truth (Aegis' sYUSD resolved
    // to YieldFi's yUSD on Katana before this rule).
    if (ambiguous) {
      stats.ambiguous++
      continue
    }
    if (desks.size === 0) {
      stats.unresolved++
      continue
    }
    if (desks.size > 1) {
      stats.conflicts++
      continue
    }
    const desk = [...desks.values()][0]
    if (desk.kind === 'institution') {
      stats.fiat++
      continue
    }
    const own = issuers[group]
    if (!own) inherited[group] = desk
    else if (own.id !== desk.id) exposures[group] = [{ ...desk, hops: 1 }]
  }
  return { issuers: inherited, exposures, stats }
}

/**
 * `solana.json` folded into the omni-list shape (group -> currencies), because
 * the omni-list is built by the EVM generator and holds 0 Solana currencies.
 * Without it `fromProps` derives no Solana LST / RWA desk and the exposure walk
 * has no Exponent PT to start from. A Solana mint that joined a global group
 * (`USDC`, `CBBTC`, `sUSDai::SUSDAI`) is appended to that group's currencies —
 * on a COPY, the omni-list object is not mutated.
 *
 * Non-fatal like the omni-list read: a bare checkout has no solana.json. Its
 * own build reads issuer.json back (`solanaClassify.ts`), hence the order
 * `npm run solana` -> `npm run issuer` -> `npm run solana`.
 */
const SOLANA_CHAIN = 'solana'

function withSolana(omni: Record<string, OmniCurrencyLike>): Record<string, OmniCurrencyLike> {
  let list: Record<string, any>
  try {
    list = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../solana.json'), 'utf-8'))?.list ?? {}
  } catch (error) {
    console.warn('[issuer] could not read solana.json, deriving without Solana:', (error as Error).message)
    return omni
  }
  const out: Record<string, OmniCurrencyLike> = { ...omni }
  let n = 0
  for (const t of Object.values<any>(list)) {
    if (!t?.assetGroup || !t?.address) continue
    const prior = out[t.assetGroup]
    out[t.assetGroup] = {
      ...prior,
      currencies: [
        ...(prior?.currencies ?? []),
        { chainId: SOLANA_CHAIN, address: t.address, name: t.name, symbol: t.symbol, props: t.props },
      ],
    }
    n++
  }
  console.log(`  + ${n} Solana token(s) from solana.json.`)
  return out
}

function serialize(map: Record<string, unknown>): string {
  const keys = Object.keys(map).sort()
  return JSON.stringify(
    keys.reduce((acc: Record<string, unknown>, k) => ((acc[k] = map[k]), acc), {}),
    null,
    2,
  )
}

function generateIssuerMap() {
  console.log('Generating issuer overlay...')
  const out = path.resolve(__dirname, './issuer.json')
  const map: IssuerGroupMap = {}
  let derived = 0
  let omniGroups: Record<string, OmniCurrencyLike> = {}

  try {
    const omni: Record<string, OmniCurrencyLike> = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../omni-list.json'), 'utf-8'),
    )
    omniGroups = withSolana(omni)
    for (const [group, entry] of Object.entries(omniGroups)) {
      const issuer = fromProps(entry)
      if (issuer) {
        map[group] = issuer
        derived++
      }
    }
  } catch (error) {
    // Non-fatal: the curated map alone is still a valid (smaller) snapshot, and
    // a missing omni-list means this is a bare checkout, not a bad input.
    console.warn('[issuer] could not read omni-list.json, using the curated map alone:', (error as Error).message)
  }

  // Only DERIVED desks are expanded into pre-alias keys below (unchanged
  // behaviour): a curated key is often a bare-ticker group (`USDC`, `WBTC`)
  // whose deployments are named `USDC::USDC` or `BTC::BTC`, and as pre-alias
  // keys those also catch unrelated tokens (PulseChain's fork-copy USDC,
  // native BTC on Merlin). Curated entries spell out their own variants; the
  // lookup's GROUP_ALIAS fallback (issuerMap.ts) covers the unifier's folds.
  const expandable: IssuerGroupMap = { ...map }

  // Curated first (re-applied after the alias expansion below), so the
  // savings inheritance resolves against curated desks too.
  Object.assign(map, ISSUER_CURATED)

  // Savings wrappers inherit their underlying's desk — see inheritSavings().
  const savings = inheritSavings(omniGroups, map)
  for (const [group, desk] of Object.entries(savings.issuers)) map[group] = expandable[group] = desk
  console.log(
    `  + ${Object.keys(savings.issuers).length} savings wrapper(s) inherited their underlying's desk; ` +
      `${Object.keys(savings.exposures).length} carry it as an exposure ` +
      `(${savings.stats.wrappers} savings groups seen, ${savings.stats.ambiguous} ambiguous, ` +
      `${savings.stats.unresolved} unresolved, ${savings.stats.fiat} fiat-reserve underlyings skipped).`,
  )

  // ---------------------------------------------------------------------
  // Pre-alias aliases.
  //
  // The generator looks the overlay up on the group the token holds AT THAT
  // POINT, which for many deployments is the `Name::SYMBOL` string it was
  // stored under — the unifier folds it into the canonical group (`RSETH`,
  // `WSTETH`) only afterwards. So a group-keyed entry silently misses those
  // deployments: ten bridged rsETH, four stETH, three LBTC, and the whole
  // `Savings USDS::sUSDS` group on Base and Arbitrum, all attributed on
  // Ethereum and blank everywhere else. `stablecoin.ts` and `savingsAssets.ts`
  // patch this by hand, one casing at a time; here it is closed generically by
  // emitting the composite key for every attributed deployment.
  //
  // Two guards, because a `Name::SYMBOL` string is weaker than a group key:
  // an alias NEVER overwrites a different desk (a collision is skipped and
  // counted, not resolved), and the generator's impostor check still runs at
  // overlay time, so a ticker-copy cannot inherit through one.
  let aliases = 0
  let conflicts = 0
  for (const [group, entry] of Object.entries(omniGroups)) {
    const issuer = expandable[group]
    if (!issuer) continue
    for (const c of entry.currencies ?? []) {
      // Not for a Solana deployment: its group is `::solana`-scoped or a
      // global group joined on cross-chain evidence, so the overlay already
      // finds it by its own key, and its `Name::SYMBOL` would only reach EVM
      // tokens that happen to share the string — a ticker, not an identity.
      if (c?.chainId === SOLANA_CHAIN) continue
      const name = typeof c?.name === 'string' ? c.name : ''
      const symbol = typeof c?.symbol === 'string' ? c.symbol : ''
      if (!name || !symbol) continue
      const alias = `${name}::${symbol}`
      if (alias === group) continue
      const existing = map[alias]
      if (existing) {
        if (existing.id !== issuer.id) conflicts++
        continue
      }
      map[alias] = issuer
      aliases++
    }
  }
  if (aliases || conflicts)
    console.log(`  + ${aliases} pre-alias key(s); skipped ${conflicts} that named a different desk.`)

  // Curation wins, always — a hand-written desk beats anything inferred.
  Object.assign(map, ISSUER_CURATED)

  const issuers = new Set(Object.values(map).map((i) => i.id))
  fs.writeFileSync(out, serialize(map))
  console.log(
    `Wrote issuer.json with ${Object.keys(map).length} groups (${derived} derived from existing props, ` +
      `${Object.keys(ISSUER_CURATED).length} curated) across ${issuers.size} distinct issuers.`,
  )

  // The exposure half — which desk a WRAPPER's underlying walk ends at. Runs
  // after the self-issuer map is final, because it resolves against it.
  const { map: exposures, stats } = resolveExposures(omniGroups, map)
  // Savings exposures join the wrapper walk's: a Strata srUSDe is Strata's
  // instrument (issuer) and Ethena's credit (exposure), exactly like a PT.
  for (const [group, legs] of Object.entries(savings.exposures)) {
    const own = map[group]?.id
    const merged = new Map((exposures[group] ?? []).map((e) => [e.id, e]))
    for (const leg of legs) if (leg.id !== own && !merged.has(leg.id)) merged.set(leg.id, leg)
    const list = [...merged.values()].sort((a, b) => a.hops! - b.hops! || a.id.localeCompare(b.id))
    if (list.length) exposures[group] = list
  }
  fs.writeFileSync(path.resolve(__dirname, './issuerExposure.json'), serialize(exposures))
  console.log(
    `Wrote issuerExposure.json with ${Object.keys(exposures).length} wrapper groups ` +
      `(${stats.wrappers} wrapper tokens seen, ${stats.deadEnd} reached no desk, ` +
      `${stats.multiLeg} group(s) with more than one desk, ${stats.cycles} cycle(s) cut).`,
  )
  console.log(
    `  Wrapper instruments themselves are attributed at overlay time: ` + `${Object.keys(WRAPPER_ISSUERS).join(', ')}.`,
  )
}

generateIssuerMap()
