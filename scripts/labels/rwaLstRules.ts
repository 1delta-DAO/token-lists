import { LstProps, RwaProps } from '../utils/types'

/**
 * Shared RWA / LST classifier.
 *
 * RWA and LST are kept as two categorically separate maps/lists, but they share this
 * single rule engine. Each build step (rwa/rwa.ts, lst/lst.ts) runs the classifier,
 * keeps only its own category, and writes its own list (rwa.json / lst.json), which are
 * registered as separate source lists in externalLists.ts (RWA_LIST / LST_LIST). Props
 * then flow into the generated maps through the generic `tokenInList.props` path — no
 * special-casing in the generator (same mechanism as Pendle).
 *
 * Two layers per category:
 *  1. Address registries (rwa/rwaAssets.ts, lst/lstAssets.ts) — authoritative, address-exact.
 *  2. Rule-based classifier (this file) — name/issuer-phrase rules, split into:
 *       - 'auto'      : unambiguous issuer families, safe to apply automatically.
 *       - 'candidate' : softer signals, emitted to a review queue only, NEVER auto-applied.
 *
 * Naming in the lists is noisy (governance tokens share names with their LSTs; symbols
 * collide, e.g. ETHX="Super WETH", EETH="EverETH"). Rules therefore key primarily on
 * issuer name-phrases, guarded by an exclusion set and a derivative-wrapper filter.
 */

export type Confidence = 'auto' | 'candidate'

export interface RwaLstClassification {
  rwa?: RwaProps
  lst?: LstProps
  confidence: Confidence
  /** which rule matched, for the discovery report */
  rule: string
}

interface Rule {
  /** identifier surfaced in the discovery report */
  id: string
  test: (name: string, symbol: string) => boolean
  rwa?: RwaProps
  lst?: LstProps
  /** allow the props to depend on the matched token (e.g. Backed equity vs credit vs fund) */
  build?: (name: string, symbol: string) => { rwa?: RwaProps; lst?: LstProps }
  confidence: Confidence
}

/* -------------------------------------------------------------------------- */
/* Exclusions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Governance / protocol tokens and unrelated assets that must NEVER be classified,
 * even though their name mentions "staked", "restaked", a fund, etc.
 */
const EXCLUDED_SYMBOLS = new Set(
  [
    'LDO', // Lido governance
    'RPL', // Rocket Pool governance
    'ETHFI', // ether.fi governance
    'REZ', // Renzo governance
    'SD', // Stader governance
    'SWELL', // Swell governance
    'EIGEN', // EigenLayer
    'EEIGEN',
    'PENDLE',
    'FXS', // Frax Share (governance)
    'ANKR', // Ankr governance
    'RSR', // Reserve Rights
    'SSV',
  ].map((s) => s.toUpperCase()),
)

/** Substrings that mark a derivative/wrapper we should not classify from the base rules. */
const DERIVATIVE_MARKERS = [
  'balancer',
  'curve',
  'aave',
  'aura',
  'convex',
  'yearn',
  'beefy',
  'moo', // beefy vaults
  'gamma',
  'uni-v2',
  'univ2',
  ' lp',
  '-lp',
  'bpt',
  'stakedao',
]

const norm = (s?: string) => (s ?? '').trim().toUpperCase()
const has =
  (...phrases: string[]) =>
  (name: string) => {
    const n = name.toLowerCase()
    return phrases.some((p) => n.includes(p.toLowerCase()))
  }

/** ETF / index vehicle detector (routes tokenized equities into the `fund` bucket). */
const isEtf = has('etf', 's&p', 'nasdaq', 'msci', ' index', 'core s&p', 'ftse', 'russell', 'qqq', 'spdr', 'ucits')

/** Pendle principal/yield/standardized-yield wrappers are handled by the pendle props. */
function isPendleWrapper(_name: string, symbol: string): boolean {
  const s = symbol.toUpperCase()
  return s.startsWith('PT-') || s.startsWith('YT-') || s.startsWith('SY-')
}

function isDerivativeWrapper(name: string): boolean {
  const n = name.toLowerCase()
  return DERIVATIVE_MARKERS.some((m) => n.includes(m))
}

/* -------------------------------------------------------------------------- */
/* LST / LRT rules (auto)                                                     */
/* -------------------------------------------------------------------------- */

const stake = (asset: string, provider: string, type: LstProps['type'] = 'staking'): LstProps => ({
  type,
  asset,
  provider,
})

const LST_RULES: Rule[] = [
  // --- ETH liquid staking ---
  {
    id: 'lido',
    confidence: 'auto',
    lst: stake('ETH', 'lido'),
    // symbol match also covers bridged variants ("Bridged wstETH", "Wrapped Liquid Staked ETH", …)
    test: (n, s) =>
      has('lido staked', 'liquid staked ether', 'wrapped liquid staked ether')(n) ||
      ['STETH', 'WSTETH'].includes(norm(s)),
  },
  { id: 'rocketpool', confidence: 'auto', lst: stake('ETH', 'rocketpool'), test: has('rocket pool eth') },
  { id: 'coinbase-eth', confidence: 'auto', lst: stake('ETH', 'coinbase'), test: has('coinbase wrapped staked eth') },
  { id: 'frax-eth', confidence: 'auto', lst: stake('ETH', 'frax'), test: has('frax ether', 'staked frax ether') },
  // Mantle mETH (liquid staking). Symbol METH collides with memes (ETH Monsta, "meme eth",
  // a fuel "Meth"), so match the issuer name / case-exact "mETH", never the bare ticker.
  {
    id: 'mantle-eth',
    confidence: 'auto',
    lst: stake('ETH', 'mantle'),
    test: (n) => has('mantle staked ether', 'manta meth', 'mantle meth')(n) || n.trim() === 'mETH',
  },
  // Mantle cmETH — restaked mETH (LRT)
  {
    id: 'mantle-cmeth',
    confidence: 'auto',
    lst: stake('ETH', 'mantle', 'restaking'),
    test: (n, s) => norm(s) === 'CMETH' || has('cmeth')(n),
  },
  {
    id: 'stakewise-eth',
    confidence: 'auto',
    lst: stake('ETH', 'stakewise'),
    test: (n, s) => has('stakewise staked eth')(n) || norm(s) === 'OSETH',
  },
  { id: 'stader-eth', confidence: 'auto', lst: stake('ETH', 'stader'), test: has('stader ethx') },
  { id: 'ankr-eth', confidence: 'auto', lst: stake('ETH', 'ankr'), test: has('ankr staked eth') },
  {
    id: 'swell-eth',
    confidence: 'auto',
    lst: stake('ETH', 'swell'),
    test: (n) => has('swell')(n) && has('eth')(n) && !has('restaked', 'rsweth')(n),
  },

  // --- ETH liquid restaking (LRT) ---
  { id: 'renzo', confidence: 'auto', lst: stake('ETH', 'renzo', 'restaking'), test: has('renzo restaked') },
  {
    id: 'kelp',
    confidence: 'auto',
    lst: stake('ETH', 'kelp', 'restaking'),
    // symbol match covers bridged variants ("KelpDAO Bridged rsETH", bare "rsETH", wrapped)
    test: (n, s) => has('kelpdao restaked', 'kelp dao restaked')(n) || ['RSETH', 'WRSETH'].includes(norm(s)),
  },
  {
    id: 'etherfi',
    confidence: 'auto',
    lst: stake('ETH', 'etherfi', 'restaking'),
    test: has('wrapped eeth', 'ether.fi'),
  },
  {
    id: 'puffer',
    confidence: 'auto',
    lst: stake('ETH', 'puffer', 'restaking'),
    test: (n, s) => has('puffer')(n) || norm(s) === 'PUFETH',
  },
  {
    id: 'swell-restaked',
    confidence: 'auto',
    lst: stake('ETH', 'swell', 'restaking'),
    test: has('swell restaked', 'rsweth'),
  },
  { id: 'inception', confidence: 'auto', lst: stake('ETH', 'inception', 'restaking'), test: has('inception restaked') },

  // --- more ETH LSTs / LRTs. Name/symbol-keyed and guarded against symbol collisions
  // (Test ETH=TETH, PANGEA/Staked One=STONE) — match the issuer name, not the bare ticker. ---
  // StakeStone: STONE (liquid staking) vs beraSTONE (Berachain restaking vault)
  { id: 'stakestone-eth', confidence: 'auto', lst: stake('ETH', 'stakestone'), test: has('stakestone ether') },
  {
    id: 'stakestone-bera',
    confidence: 'auto',
    lst: stake('ETH', 'stakestone', 'restaking'),
    test: has('stakestone berachain'),
  },
  // Liquid Collective lsETH (symbol is unambiguous; name varies "Liquid Staked ETH[ Index]")
  {
    id: 'liquid-collective',
    confidence: 'auto',
    lst: stake('ETH', 'liquid-collective'),
    test: (_n, s) => norm(s) === 'LSETH',
  },
  // Treehouse tETH (restaking) — NOT "Test ETH"
  { id: 'treehouse-eth', confidence: 'auto', lst: stake('ETH', 'treehouse', 'restaking'), test: has('treehouse eth') },
  // Avant savETH (staked avETH, restaking)
  { id: 'avant-eth', confidence: 'auto', lst: stake('ETH', 'avant', 'restaking'), test: has('staked aveth') },
  // Reserve ETH+ (ETHPlus — LSD basket) and Overnight ETH+
  { id: 'reserve-ethplus', confidence: 'auto', lst: stake('ETH', 'reserve'), test: has('ethplus') },
  { id: 'overnight-ethplus', confidence: 'auto', lst: stake('ETH', 'overnight'), test: has('ethereum overnight') },

  // --- non-ETH staking ---
  { id: 'stader-pol', confidence: 'auto', lst: stake('POL', 'stader'), test: has('stader maticx') },
  { id: 'lido-pol', confidence: 'auto', lst: stake('POL', 'lido'), test: has('lido staked matic') },
  { id: 'benqi-avax', confidence: 'auto', lst: stake('AVAX', 'benqi'), test: has('staked avax') },
  { id: 'lista-bnb', confidence: 'auto', lst: stake('BNB', 'lista'), test: has('lista staked bnb') },
  { id: 'ankr-bnb', confidence: 'auto', lst: stake('BNB', 'ankr'), test: has('ankr staked bnb') },
  { id: 'jito-sol', confidence: 'auto', lst: stake('SOL', 'jito'), test: has('jito staked sol') },
  { id: 'marinade-sol', confidence: 'auto', lst: stake('SOL', 'marinade'), test: has('marinade staked sol') },

  // --- BTC staking ---
  {
    id: 'lombard-btc',
    confidence: 'auto',
    lst: stake('BTC', 'lombard'),
    test: has('lombard staked btc', 'lombard staked bitcoin'),
  },
  { id: 'lorenzo-btc', confidence: 'auto', lst: stake('BTC', 'lorenzo'), test: has('lorenzo stbtc') },
  // Solv xSolvBTC (yield-bearing SolvBTC), Bedrock brBTC (restaking), pumpBTC — symbols are
  // unambiguous; name backup covers the "Solv Protocol Staked BTC" / "Bedrock BTC" variants.
  {
    id: 'solv-xbtc',
    confidence: 'auto',
    lst: stake('BTC', 'solv'),
    test: (n, s) => norm(s) === 'XSOLVBTC' || has('solv protocol staked btc')(n),
  },
  {
    id: 'bedrock-brbtc',
    confidence: 'auto',
    lst: stake('BTC', 'bedrock', 'restaking'),
    test: (n, s) => norm(s) === 'BRBTC' || has('bedrock btc')(n),
  },
  { id: 'pumpbtc', confidence: 'auto', lst: stake('BTC', 'pumpbtc'), test: (_n, s) => norm(s) === 'PUMPBTC' },
]

/* -------------------------------------------------------------------------- */
/* RWA rules (auto)                                                           */
/* -------------------------------------------------------------------------- */

const rwa = (type: RwaProps['type'], subType: string, issuer: string): RwaProps => ({ type, subType, issuer })

/** Tokenized-equity issuers: single stock -> equity, index/ETF -> fund. */
const equityIssuer =
  (issuer: string) =>
  (name: string): { rwa: RwaProps } => ({
    rwa: isEtf(name) ? { type: 'fund', subType: 'etf', issuer } : { type: 'equity', subType: 'stock', issuer },
  })

const RWA_RULES: Rule[] = [
  // --- Tokenized equities / equity ETFs ---
  {
    id: 'ondo-stock',
    confidence: 'auto',
    test: has('ondo tokenized stock', 'tokenized stock'),
    build: equityIssuer('ondo'),
  },
  { id: 'sailing-stock', confidence: 'auto', test: has('tokenized by sailing'), build: equityIssuer('sailing') },
  { id: 'xstocks', confidence: 'auto', test: has('xstock'), build: equityIssuer('backed') },
  {
    id: 'backed',
    confidence: 'auto',
    test: (n) => has('backed ')(n) || n.toLowerCase().startsWith('backed'),
    build: (n) => {
      if (isEtf(n)) return { rwa: { type: 'fund', subType: 'etf', issuer: 'backed' } }
      const isDebt = has('treasury', 'bond', 'govies', 't-bill', 'bill', 'gilt', 'high yield', 'corp')(n)
      if (!isDebt) return { rwa: { type: 'equity', subType: 'stock', issuer: 'backed' } }
      const corporate = has('corp', 'high yield', 'corporate')(n)
      return { rwa: { type: 'credit', subType: corporate ? 'corporate-debt' : 'treasury', issuer: 'backed' } }
    },
  },

  // --- Tokenized funds: money-market / treasury / credit funds & ETFs ---
  {
    id: 'blackrock-buidl',
    confidence: 'auto',
    rwa: rwa('fund', 'money-market', 'securitize'),
    test: has('blackrock usd institutional'),
  },
  {
    id: 'franklin-benji',
    confidence: 'auto',
    rwa: rwa('fund', 'money-market', 'franklin'),
    test: has('franklin onchain'),
  },
  {
    id: 'hashnote-usyc',
    confidence: 'auto',
    rwa: rwa('fund', 'money-market', 'circle'),
    test: has('circle usyc', 'hashnote'),
  },
  {
    id: 'ondo-treasury',
    confidence: 'auto',
    rwa: rwa('fund', 'treasury', 'ondo'),
    test: has('ondo short-term us government', 'ondo u.s. dollar yield', 'short-term us government treasuries'),
  },
  { id: 'superstate', confidence: 'auto', rwa: rwa('fund', 'treasury', 'superstate'), test: has('superstate') },
  {
    id: 'midas-tbill',
    confidence: 'auto',
    rwa: rwa('fund', 'treasury', 'midas'),
    test: has('midas mtbill', 'midas mbasis'),
  },
  { id: 'vaneck-treasury', confidence: 'auto', rwa: rwa('fund', 'treasury', 'vaneck'), test: has('vaneck treasury') },
  {
    id: 'anemoy-treasury',
    confidence: 'auto',
    rwa: rwa('fund', 'treasury', 'anemoy'),
    test: has('anemoy treasury', 'janus henderson anemoy'),
  },
  {
    id: 'ishares-etf',
    confidence: 'auto',
    rwa: rwa('fund', 'etf', 'blackrock'),
    test: (n) => has('ishares')(n) && has('etf', 'treasury bond')(n),
  },
  {
    id: 'securitize-credit',
    confidence: 'auto',
    rwa: rwa('fund', 'private-credit', 'securitize'),
    test: has('securitize fund', 'apollo diversified credit', 'diversified credit securitize'),
  },
  {
    // Reservoir rUSD — USD stablecoin backed by a reinsurance / RWA portfolio.
    // Matches ONLY the base rUSD (symbol RUSD + a Reservoir name); the savings wrappers
    // srUSD/wsrUSD (symbols SRUSD/WSRUSD) stay savings, and the unrelated RUSD clones
    // (f(x), Royal Dollar, Reya, Rose, generic "rUSD") lack the Reservoir name.
    id: 'reservoir-rusd',
    confidence: 'auto',
    rwa: rwa('credit', 'reinsurance', 'reservoir'),
    test: (n, s) => norm(s) === 'RUSD' && has('reservoir')(n),
  },

  // --- Tokenized gold / commodities ---
  {
    id: 'pax-gold',
    confidence: 'auto',
    rwa: { type: 'commodity', subType: 'gold', issuer: 'paxos', underlying: 'XAU' },
    test: has('pax gold'),
  },
  {
    id: 'tether-gold',
    confidence: 'auto',
    rwa: { type: 'commodity', subType: 'gold', issuer: 'tether', underlying: 'XAU' },
    test: (n, s) => has('tether gold')(n) || norm(s).startsWith('XAUT'),
  },
  {
    id: 'matrixdock-gold',
    confidence: 'auto',
    rwa: { type: 'commodity', subType: 'gold', issuer: 'matrixdock', underlying: 'XAU' },
    test: has('matrixdock gold'),
  },
]

/* -------------------------------------------------------------------------- */
/* Candidate rules (review queue only)                                        */
/* -------------------------------------------------------------------------- */

const CANDIDATE_RULES: Rule[] = [
  // Ondo-style tokenized-stock symbol suffix, name mentions no known issuer
  {
    id: 'cand-suffix-ON',
    confidence: 'candidate',
    rwa: { type: 'equity', subType: 'stock' },
    test: (_n, s) => /^[A-Z]{2,6}ON$/.test(norm(s)),
  },
  {
    id: 'cand-suffix-S',
    confidence: 'candidate',
    rwa: { type: 'equity', subType: 'stock' },
    test: (n, s) => /^[A-Z]{2,6}S$/.test(norm(s)) && has('inc', 'corp', 'tokenized', 'company')(n),
  },
  { id: 'cand-fund', confidence: 'candidate', rwa: { type: 'fund' }, test: has('etf', ' fund', 'index fund') },
  {
    id: 'cand-treasury',
    confidence: 'candidate',
    rwa: { type: 'credit', subType: 'treasury' },
    test: has('treasury', 't-bill', 'money market', 'government securities'),
  },
  {
    id: 'cand-credit',
    confidence: 'candidate',
    rwa: { type: 'credit' },
    test: has('private credit', 'corporate bond', 'diversified credit'),
  },
  {
    id: 'cand-commodity',
    confidence: 'candidate',
    rwa: { type: 'commodity' },
    test: has('gold', 'silver', 'xau', 'xag'),
  },
  {
    id: 'cand-restaking',
    confidence: 'candidate',
    lst: { type: 'restaking' },
    test: has('restaked', 'restaking', 'liquid restaking'),
  },
  { id: 'cand-staking', confidence: 'candidate', lst: { type: 'staking' }, test: has('staked', 'liquid staking') },
]

const ALL_RULES: Rule[] = [...LST_RULES, ...RWA_RULES, ...CANDIDATE_RULES]

/**
 * Classify a token by rules alone (no registry). Returns null when nothing matches
 * or the token is excluded / a derivative wrapper. Auto rules are tested before
 * candidate rules, so an auto match always wins.
 */
export function classifyRwaLst(token: { name?: string; symbol?: string }): RwaLstClassification | null {
  const name = token.name ?? ''
  const symbol = token.symbol ?? ''
  if (!name && !symbol) return null
  if (EXCLUDED_SYMBOLS.has(norm(symbol))) return null
  if (isPendleWrapper(name, symbol)) return null
  if (isDerivativeWrapper(name)) return null

  for (const rule of ALL_RULES) {
    if (!rule.test(name, symbol)) continue
    const built = rule.build ? rule.build(name, symbol) : { rwa: rule.rwa, lst: rule.lst }
    if (!built.rwa && !built.lst) continue
    return { ...built, confidence: rule.confidence, rule: rule.id }
  }
  return null
}
