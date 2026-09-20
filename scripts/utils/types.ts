/** AssetId -> chainId -> address */
export type AssetGroup = { [assetId: string]: { [chainId: string]: string } }

interface AssetMeta {
  decimals: number
  name: string
  symbol: string
  assetGroup?: string
}

/**  chainId -> address -> metadata(decimals,name,symbol)*/
export type AssetMetaMap = { [chainId: string]: { [address: string]: AssetMeta } }

interface AaveTokens {
  aToken: string
  sToken: string
  vToken: string
}

/** lender -> chainId -> addressOfUnderlying -> aaveTokens(aToken,sToken,vToken)*/
export type AaveLendingTokenMap = { [lender: string]: { [chainId: string]: { [address: string]: AaveTokens } } }

/** lender -> chainId -> addressOfUnderlying -> aaveTokens(aToken,sToken,vToken)*/
export type CompoundV3BaseTokenMap = {
  [lender: string]: { [chainId: string]: { baseAsset: string; baseBorrowMin: bigint } }
}

type ModeEntry = { pool: string; underlying: string }
type PoolDatas = { [pool: string]: { underlying: string; modes: number[] } }
type ModeData = { [mode: number]: ModeEntry[] }

export type InitMap = {
  [fork: string]: {
    [chainid: string]: {
      poolsToUnderlying: { [poolAddress: string]: string }
      modeData: ModeData
      poolData: PoolDatas
      reserves: string[]
    }
  }
}

/**  chainId -> address -> metadata(decimals,name,symbol)*/
export type LenderReservesMap = { [lender: string]: { [chainId: string]: string[] } }

type L2ChainInfo = {
  type: string // Represents the type of the chain (e.g., "L2")
  chain: string // Chain identifier (e.g., "eip155-1")
  bridges?: {
    url: string // URL for the bridge
  }[]
}

export interface ChainInfo {
  name: string
  chain: string
  title?: string
  icon?: string
  rpc: string[]
  features?: { name: string }[]
  faucets: string[]
  nativeCurrency: { name: string; symbol: string; decimals: number }
  infoURL: string
  shortName: string
  key?: string
  chainId: number | string
  networkId: number | string
  slip44?: number
  ens?: { registry: string }
  explorers: {
    name: string
    url: string
    icon?: string // Optional, as some explorers may not have an icon
    standard: string
  }[]
  enum: string
  status?: string
  parent?: L2ChainInfo
  redFlags?: string[]
}

/** chainId -> ChainInfo */
export type ChainInfoMap = { [chainId: number | string]: ChainInfo }

export type LenderPresets = { [lender: string]: { [chain: string | number]: { debt: string[]; collateral: string[] } } }

export type SimpleAsset =
  | { decimals: number; isNative: true; name: string; symbol: string; props?: TokenProps }
  | { decimals: number; name: string; address: string; symbol: string; props?: TokenProps }

/** chainId -> ChainInfo */
export type WrappedNativeInfo = {
  [chainId: number | string]: { decimals: number; name: string; address: string; symbol: string }
}

export interface AaveInfo {
  pool: string
  protocolDataProvider: string
}

/** lender -> chainId -> addressOfUnderlying -> cTokenAddress*/
export type CTokenTokenMap = { [lender: string]: { [chainId: string]: { [address: string]: string } } }

type BasePreset = {
  stable?: SimpleAsset
  usdt?: SimpleAsset
  usdc?: SimpleAsset
  dai?: SimpleAsset
  eth?: SimpleAsset
  btc?: SimpleAsset
}

type Preset = BasePreset & Record<string, SimpleAsset>

export type ChainPreset = { [chainId: string]: Preset }

/** Instead of a native flag, we use zero address as Id for native assets */
export type AbstractedAsset = {
  chainId: string
  decimals: number
  name: string
  address: string
  symbol: string
  /** Auto-assigned */
  tier?: string
  logoURI?: string
  tags?: string[]
  props?: TokenProps
}

/**
 * An object that holds multichain assets of one type, e.g. USDC
 * Note that this holds the full currency info for each array-entry
 */
export interface OmniCurrency {
  /**
   * The id of the asset, typically the symbol if distinct (e.g. USDC, WBTC)
   * This can deviate if the asset is not distinct
   */
  id: string
  /** The symbol of the asset */
  symbol: string
  /** The name of the asset */
  name: string
  /** The logo for the group */
  logoURI?: string

  /** some tags for additional info */
  tags?: string[]
  /** Main asset infos - liquid version (includes native & wNative)*/
  currencies: AbstractedAsset[]
}

/**
 * ---------------------------------------------------------------------------
 * Underlying / base vocabulary (BASE_UNDERLYING_PLAN.md in lending-sdks, phase 0).
 *
 * Three axes, deliberately kept apart because they diverge on every
 * strategy token:
 *
 *   `underlying` — the NEXT HOP: the token this contract ACCOUNTS in and pays
 *                  redemptions in (`asset()`, `UNDERLYING_TOKEN()`,
 *                  `SY.yieldToken()`, a registry `underlying`). A hop is a
 *                  CLAIM on `to`. The mint input is never a hop.
 *   `terminal`   — where the walk ends: a gas/BTC base, a PEG (with the
 *                  mechanism that holds it), a basket, an RWA instrument, or
 *                  the token itself.
 *   `entry`      — what a holder on THIS chain can pay to mint / receives on
 *                  redeem, and how gated that is. Per chain: the same
 *                  assetGroup mints on Ethereum, bridges to Plasma and is
 *                  PSM-enterable on Base.
 *
 * A synthetic has NO hop: msETH is minted as debt against collateral and is
 * never redeemable into ETH, USDe's USDT is not kept by Ethena, apxUSD's USDC
 * buys STRC preferred stock. All three end in a `peg` terminal and their mint
 * input lives on `entry`.
 * ---------------------------------------------------------------------------
 */

/** A token reference inside a resolution. `chainId` differs from the host token's only across a `bridge` hop. */
export interface UnderlyingRef {
  chainId: string
  /** lowercase */
  address: string
  assetGroup: string
  symbol: string
}

/** How value moves between a token and the token it is a claim on. */
export type UnderlyingRelation =
  /** 1:1, protocol-internal (dGM → GM, lisAster → ASTER) */
  | 'receipt'
  /** 1:1 non-yield wrap (WETH → ETH, sw-sFLR → sFLR) */
  | 'wrapper'
  /** same assetGroup on another chain; this chain has no local surface */
  | 'bridge'
  /** share price over `to` (ERC-4626 or bespoke: sUSDe → USDe, savETH → avETH, syrupUSDC → USDC) */
  | 'vault'
  /** LST exchange rate over `to` (wstETH → stETH, tETH → wstETH, kHYPE → HYPE) */
  | 'staking'
  /** Pendle / Spectra / Exponent PT → the SY / IBT it redeems into at maturity */
  | 'principal'
  /** SY / IBT → its accounting asset (SY-sUSDS → USDS via `assetInfo()`) */
  | 'accounting'

/** Where a hop came from — every hop is attributable. */
export type UnderlyingSource =
  | 'onchain:erc4626.asset'
  | 'onchain:sy.yieldToken'
  | 'onchain:sy.assetInfo'
  | 'onchain:UNDERLYING_TOKEN'
  | 'onchain:wsteth.stETH'
  | 'onchain:vault.getUnderlying'
  | 'registry:lst'
  | 'registry:savings'
  | 'registry:dolomite-isolation'
  | 'tokenlist:pendle'
  | 'tokenlist:spectra'
  | 'tokenlist:exponent'
  | 'tokenlist:receipt'
  /** curated — rebasing LSTs and bespoke vaults that expose no getter */
  | 'declared'

/** One hop down. */
export interface UnderlyingHop {
  to: UnderlyingRef
  relation: UnderlyingRelation
  source: UnderlyingSource
  /** 1:1 by construction (receipt, wrapper, bridge, principal at maturity) vs priced (vault, staking). */
  exact: boolean
}

/**
 * What holds a peg. This is the fact a risk consumer needs and the whole
 * difference between USDe, apxUSD and USDC, which all say "USD".
 */
export type PegMechanism =
  /** custodied fiat / T-bills: USDC, USDT, USDG, tGBP, iTRY */
  | 'fiat-reserve'
  /**
   * minted as DEBT against collateral, held at peg by liquidation + arbitrage,
   * NO redemption into the base: msETH / msUSD, crvUSD, lisUSD, GHO, DOLA,
   * BOLD, satUSD, ZCHF, USG, MIM, MAI, USDD 2.0, feUSD, USDH — and DAI / USDS
   * (mixed with a PSM)
   */
  | 'cdp-debt'
  /** issuer-minted 1:1 against a vault of listed tokens, redeemable: dUSD, pUSD, USR, HONEY (PSM) */
  | 'reserve'
  /** hedged spot + derivatives book: USDe, avUSD, avETH, NUSD, bfUSD, USDat */
  | 'delta-neutral'
  /** oracle-marked claim on an off-chain book: apxUSD, PST, reUSD, USPC */
  | 'nav'
  /** 1:1 mint / redeem against the base through an issuer: SolvBTC, uniBTC, LBTC, FXRP */
  | 'mint-redeem'

/**
 * Where a walk ends. A peg is a TERMINAL, never a hop — there is no token it is
 * a claim on.
 */
export type UnderlyingTerminal =
  /**
   * The canonical form of a gas / BTC base on THIS chain: WETH ⇒ ETH,
   * WBTC / cbBTC / BTCB ⇒ BTC, WHYPE ⇒ HYPE. `token` is that canonical form,
   * absent when the base is native-only on the chain.
   */
  | { kind: 'base'; base: string; token?: { chainId: string; address: string } }
  /**
   * A pegged claim with no token hop. `base` is a fiat or gas symbol
   * ('USD' | 'EUR' | 'CHF' | 'TRY' | 'ETH' | 'BTC' | …). `backing` lists the
   * assetGroups it is collateralised by, informational only and allowed to rot
   * (crvUSD: ['WETH', 'WSTETH', …]; dUSD: ['USDC', 'USDS']).
   */
  | { kind: 'peg'; base: string; mechanism: PegMechanism; backing?: string[] }
  /**
   * LP-shaped: GM, GLV, Lista SmartLP, Fluid smart legs. Folds to one `base`
   * only when every leg agrees (GM [WETH-WETH] ⇒ ETH; GM [WETH-USDC] ⇒ none).
   */
  | { kind: 'basket'; legs: { weight?: number; resolution: UnderlyingResolution }[] }
  /** A tokenised real-world instrument: NVDAon ⇒ 'NVDA', XAUt ⇒ 'XAU'. */
  | { kind: 'rwa'; instrument: string }
  /** LINK, ARB, BGT — the token is its own base. */
  | { kind: 'self' }

/** The full walk for one (chain, address). */
export interface UnderlyingResolution {
  /** `[]` for a base token AND for a synthetic (see msETH). */
  chain: UnderlyingHop[]
  terminal: UnderlyingTerminal
  /**
   * The fold: the terminal's base, or the shared base of every basket leg,
   * else absent. Always a fiat / gas symbol, never an identity — USDC ⇒ 'USD',
   * not 'USDC'. For a `self` terminal it is the token's own assetGroup.
   */
  base?: string
  /** Index into `chain` of the first hop whose `exact` is false — where "tracks 1:1" stops being a contract fact. */
  firstPricedHop?: number
}

/**
 * The third axis, per chain. Never folded into `chain`: USDC on apxUSD and
 * USDT on USDe are entries, not underlyings. Mostly already known elsewhere
 * (margin-fetcher registry `mintContract` / `isMintable` /
 * `secondaryMarketOnly`, the mint-composition roster, the CCTP roster) and
 * published beside the walk.
 */
export interface EntryTerms {
  /** what a holder on this chain can PAY to mint, and whether that is allowlist / KYC / minter-role gated */
  mint?: { assets: string[]; gated: boolean; via?: 'native' | 'psm' | 'issuer' }
  /** what redemption on this chain pays out, and how */
  redeem?: { assets: string[]; gated: boolean; via?: 'instant' | 'queued' | 'market' | 'issuer' }
  /** minted by borrowing (`cdp-debt`) — there is no "pay to mint" at all */
  asDebt?: boolean
  /**
   * Chains where this assetGroup has a REAL surface (accounting + mint /
   * redeem). Only set on a chain that has none itself. A chain is a surface
   * chain iff a registry row or a non-decoy getter exists there — derived,
   * never declared, so adding a registry row flips a mirror to local
   * resolution with no further edit. Non-EVM homes are allowed ('solana').
   */
  surfaceChains?: string[]
  /** How a holder on THIS chain reaches a surface when there is none locally. */
  reach?: ('bridge' | 'market')[]
}

export interface TokenProps {
  pendle?: {
    /** Market address for PT tokens */
    marketAddress?: string
    /** YT address for PT tokens */
    ytAddress?: string
    /** PT address for YT tokens */
    ptAddress?: string
    /** SY address for the market */
    syAddress?: string
    /** Underlying asset address */
    underlyingAsset?: string
    /** Expiry timestamp */
    expiry?: number
    /** Token type: 'PT' | 'YT' | 'SY' */
    tokenType?: 'PT' | 'YT' | 'SY'
    /** Whether the token has expired */
    expired?: boolean
    /**
     * Origin chain code (`ETH` / `ARB` / `PLASMA`) of a PT BRIDGED to this
     * chain, from the contract's own symbol suffix. Present ⇒ no Pendle market
     * here: tradeable, not mintable or redeemable except back on the origin.
     */
    bridgedFrom?: string
    /**
     * The origin PT itself — same asset on the issuing chain, where the SY,
     * YT and market live. Resolved on-chain from the bridged token's LayerZero
     * peer link (`peers(originEid)` → OFT adapter → `token()`), never from the
     * symbol. Consumers join yield / maturity / mint surface through it.
     */
    origin?: { chainId: string; address: string }
  }
  /**
   * Spectra V2 yield tokenisation — the same instrument family as
   * {@link TokenProps.pendle}, over a rate-adjusted Curve StableSwap-NG pool.
   *
   * Note the deliberate asymmetry with `pendle`: there is **no `expired`
   * flag**. A generated boolean is only as fresh as the last regeneration, so a
   * PT that matures the day after a run keeps advertising itself as live —
   * compare `maturity` against the clock instead.
   */
  spectra?: {
    /** `PT` — the fixed-rate leg. `YT` — the floating leg. `IBT` — the wrapper. */
    tokenType: 'PT' | 'YT' | 'IBT'
    /** The Curve StableSwap-NG pool the PT trades on. */
    poolAddress?: string
    ptAddress?: string
    ytAddress?: string
    /** The interest-bearing token the PT is minted from (Pendle's SY analogue). */
    ibtAddress?: string
    /** The vault behind a `Spectra4626Wrapper` IBT. */
    baseIbtAddress?: string
    /** What the PT redeems for at maturity. */
    underlyingAsset?: string
    /** Maturity, unix SECONDS. */
    maturity?: number
  }
  /**
   * Exponent Finance yield tokenisation on Solana — the same instrument family
   * as {@link TokenProps.pendle}. A VAULT (not a market) is the primary
   * entity: it owns the PT/YT/SY mints and is where mint/redeem happen. The
   * trading venues hang off it, and a vault may have none, one, or several.
   *
   * No `expired` flag, for the reason `spectra` gives: a generated boolean
   * goes stale the day after a run — compare `maturity` against the clock.
   */
  exponent?: {
    tokenType: 'PT' | 'YT' | 'SY'
    /** The Exponent vault that issued this PT/YT. Absent on SY (one SY serves every maturity). */
    vaultAddress?: string
    ptAddress?: string
    ytAddress?: string
    syAddress?: string
    /** Mint of the yield-bearing asset the SY wraps (what the PT redeems for at maturity). */
    underlyingAsset?: string
    /** Maturity, unix SECONDS. Absent on SY. */
    maturity?: number
    /** Legacy AMM market the PT trades on, if one exists. */
    marketAddress?: string
    /** Orderbook the PT trades on, if one exists. */
    orderbookAddress?: string
    /** Exponent's platform slug for the underlying, e.g. 'fragmetric' | 'hylo' | 'kamino'. */
    platform?: string
  }
  /**
   * A protocol-internal RECEIPT over another listed token: not transferable,
   * never held by a user, priced 1:1 through `underlying`. Dolomite's
   * isolation-mode market tokens (`dGM`, `dsavETH`, `dGMX`, …) are
   * `IsolationModeVaultFactory` contracts — the user deposits `underlying`
   * into their per-market vault and the factory mints the receipt into the
   * vault's DolomiteMargin account. Keyed per ADDRESS because twelve of them
   * share the on-chain name/symbol "Dolomite Isolation: GMX Market" / "dGM":
   * the row's name/symbol/assetGroup are curated from the underlying, and
   * this prop is how a consumer gets back to it without the lender's table.
   */
  receipt?: {
    protocol: 'dolomite-isolation'
    /** the token the receipt wraps 1:1 (same chain, lowercase) */
    underlying: string
  }
  /**
   * The next hop down — what this contract accounts in and pays redemptions
   * in (see {@link UnderlyingHop}). Per (chain, address); a bridged mirror's
   * hop is a `bridge` to a surface chain of the same assetGroup. Absent on a
   * base token and on a synthetic (those carry `peg` / a terminal instead).
   * Emitted by the phase-4 walker; phase 0 only declares the shape.
   */
  underlying?: UnderlyingHop
  /**
   * Where the walk from this token ends (see {@link UnderlyingTerminal}).
   * A `peg` here is the generalisation of {@link TokenProps.stablecoin} past
   * USD — `stablecoin` stays and is DERIVED from a `peg` whose `base` is a
   * fiat, because too many consumers read it.
   */
  terminal?: UnderlyingTerminal
  /**
   * Shorthand for `terminal` when it is a peg: the one block a synthetic
   * carries. msETH: `{ base: 'ETH', mechanism: 'cdp-debt' }`; USDe:
   * `{ base: 'USD', mechanism: 'delta-neutral' }`. Declared per assetGroup
   * (PEG_DECLARATIONS), never derived.
   */
  peg?: { base: string; mechanism: PegMechanism; backing?: string[] }
  /**
   * The fold of the walk — the fiat / gas symbol this token's value
   * denominates in: dsavETH ⇒ 'ETH', PT-sUSDS ⇒ 'USD', wiTRY ⇒ 'TRY'. Never an
   * identity (`denomination` is the identity: "IS USDC"). Absent when the
   * terminal is a basket whose legs disagree.
   */
  base?: string
  /**
   * The canonical token `base` maps to on THIS chain, lowercase (WETH for
   * 'ETH' on 42161, WBTC / cbBTC by chain for 'BTC'). Absent for fiat bases
   * and native-only gas bases.
   */
  baseToken?: string
  /** Mint / redeem terms on THIS chain (see {@link EntryTerms}). */
  entry?: EntryTerms
  /** Real-world-asset classification (tokenized off-chain assets) */
  rwa?: {
    /** coarse, stable class used for filtering */
    type: 'equity' | 'credit' | 'commodity' | 'fund' | 'other'
    /**
     * finer-grained descriptor under `type`, e.g.
     * equity: 'stock'
     * credit: 'treasury' | 'corporate-debt' (direct debt instruments)
     * commodity: 'gold' | 'silver'
     * fund: 'etf' | 'money-market' | 'treasury' | 'private-credit' (pooled vehicles)
     */
    subType?: string
    /** issuing entity, e.g. 'ondo' | 'backed' | 'securitize' | 'franklin' | 'midas' */
    issuer?: string
    /** underlying real-world instrument, e.g. 'AAPL' | 'US T-Bill' | 'XAU' */
    underlying?: string
  }
  /** Liquid (re)staking token classification */
  lst?: {
    /** 'staking' = liquid staking, 'restaking' = (liquid) re-staking / LRT */
    type: 'staking' | 'restaking'
    /** base staked asset, e.g. 'ETH' | 'BTC' | 'SOL' | 'BNB' | 'POL' | 'AVAX' */
    asset?: string
    /** staking provider, e.g. 'lido' | 'rocketpool' | 'renzo' | 'kelp' */
    provider?: string
  }
  /**
   * Asset risk overlay, sourced from the risk-data repository (data/asset-risks.json).
   * This is a lagging annotation — risk-data is computed downstream of token-lists.
   * Volatile fields (e.g. liquidityUsd) are intentionally excluded to avoid list churn.
   */
  risk?: {
    /** risk score, 1 (safest) … 5 (riskiest) */
    score: number
    /** e.g. 'BLUE_CHIP' | 'STABLECOIN' | 'LST' | 'LRT' | 'COMPROMISED' | 'DISCONTINUED' | ... */
    category?: string
    /** provenance, e.g. 'whitelist' | 'default' | 'stablecoin' | 'pendle_inherit' */
    source?: string
  }
  /**
   * Stablecoin classification (from risk-data's DeFiLlama stablecoin-quality feed).
   * Presence of this prop is the stablecoin flag; `base` is the fiat peg when known.
   */
  stablecoin?: {
    /** fiat peg base, e.g. 'USD' | 'EUR' | 'GBP'. Omitted for floating/variable pegs. */
    base?: string
  }
  /**
   * Savings-token classification: a yield-bearing wrapper whose underlying is a
   * stablecoin (e.g. sDAI→DAI, sUSDe→USDe, sfrxUSD→frxUSD). Sourced from risk-data's
   * DeFiLlama yield-bearing-stablecoins feed; the underlying is resolved on-chain via
   * the ERC-4626 `asset()` getter (heuristic fallback). Presence of this prop is the
   * savings flag.
   */
  savings?: {
    /** underlying asset the wrapper earns yield on, e.g. 'DAI' | 'USDe' | 'frxUSD' */
    underlying?: string
    /** fiat peg of the underlying when known, e.g. 'USD' | 'EUR' | 'GBP' */
    base?: string
  }
  /**
   * Canonical denomination for *base* assets — the underlying the token simply
   * IS, for coarse "show me all ETH / BTC markets" filtering (e.g. WETH/ETH →
   * `ETH`, WBTC/cbBTC/tBTC/FBTC → `BTC`). Set ONLY on canonical base tokens,
   * never on derivatives — LST/LRT/Pendle/savings keep their own flags, so an
   * `ETH` denomination filter returns WETH, not wstETH. Keyed by assetGroup in
   * the denomination overlay so it carries across chains.
   */
  denomination?: 'ETH' | 'BTC' | 'BNB' | 'POL' | 'AVAX' | 'SOL' | string
  /** permit data if any */
  permit?: { type: 0 | 1; version: string }
  /** Default wrapped native token address */
  wrapped?: string
  /** If it is a wrappend native, this flag is set to true */
  wnative?: boolean
  /** ERC20 address for native assets */
  erc20?: string
  /** Flag for native assets */
  isNative?: boolean
  /** Flag for tokens that look suspicious (e.g. mimic an existing legit token) */
  suspicious?: boolean
  /** Flag for tokens that mimic another token's name/symbol on the same chain */
  mimic?: boolean
  /**
   * Solana-only. Token-2022 mints support transfer fees and hooks — the
   * fee-on-transfer class — so the program is stated on every mint.
   */
  solana?: { tokenProgram: 'spl-token' | 'token-2022' }
  /**
   * LayerZero V2 OFT overlay — how this deployment moves over LayerZero, from
   * LayerZero's metadata registry cross-checked on-chain (see `oft/oft.ts`).
   *
   * A LIST of routes, not one contract: the same token can carry several OFT
   * contracts on one chain, each belonging to a different mesh (Ethereum USDT
   * has the USDT0 adapter plus one-corridor bridges to Citrea and Harmony;
   * cbBTC has four). A route is a corridor only to the chains in its `peers`,
   * which is what `peers(eid)` answered on-chain — `quoteSend` reverts
   * `NoPeer` anywhere else. Stargate's own pools and hydra tokens are
   * deliberately NOT here (they are a bridge with credit limits and pool
   * fees, served by the Stargate configs), nor is anything on LayerZero V1.
   */
  oft?: {
    /** LayerZero V2 endpoint id of THIS chain (the `dstEid` a sender targets to reach it) */
    eid: number
    routes: OftRoute[]
  }
}

/**
 * One LayerZero OFT contract that moves a token, with the corridors it was
 * verified to have. Amounts are dust-truncated to `sharedDecimals` on send
 * (an 18-decimal USDai moves in 6-decimal units).
 */
export interface OftRoute {
  /** the contract that takes `quoteSend` / `send` — the token itself for a native OFT */
  contract: string
  /** `native`: the token IS the OFT (burn/mint). `adapter`: a contract over the token (lock-box or mint/burn) */
  kind: 'native' | 'adapter'
  /** the mesh this contract belongs to, as LayerZero's registry names it (`usdt0`, `usdai`, `ethena`, …) */
  oapp?: string
  /** decimals amounts are normalised to on the wire; `amountLD` loses anything below 10^(local − shared) */
  sharedDecimals: number
  /** `approvalRequired()` read on-chain: true = the route pulls the token and needs an ERC-20 approval to `contract` */
  approvalRequired?: boolean
  /**
   * chainId -> the peer OFT contract on that chain, from `peers(eid)` on-chain over
   * every chain this repo lists. ABSENT (not `{}`) means the chain could not be read
   * when the snapshot was taken — an unverified route, not a route with no peers.
   */
  peers?: { [chainId: string]: string }
}

export type OmniCurrencyList = { [assetId: string]: OmniCurrency }

/** RWA props shape, derived from TokenProps */
export type RwaProps = NonNullable<TokenProps['rwa']>
/** LST props shape, derived from TokenProps */
export type LstProps = NonNullable<TokenProps['lst']>
/** Risk props shape, derived from TokenProps */
export type RiskProps = NonNullable<TokenProps['risk']>
/** Stablecoin props shape, derived from TokenProps */
export type StablecoinProps = NonNullable<TokenProps['stablecoin']>
/** Peg props shape, derived from TokenProps */
export type PegProps = NonNullable<TokenProps['peg']>
/** assetGroup -> peg terminal (chain-independent; the mechanism is a property of the asset) */
export type PegGroupMap = { [assetGroup: string]: PegProps }
/** Savings props shape, derived from TokenProps */
export type SavingsProps = NonNullable<TokenProps['savings']>
/** chainId -> address(lowercase) -> RWA classification */
export type RwaRegistry = { [chainId: string]: { [address: string]: RwaProps } }
/** chainId -> address(lowercase) -> LST classification */
export type LstRegistry = { [chainId: string]: { [address: string]: LstProps } }
/** assetGroup -> LST/LRT classification (chain-independent; covers bridged deployments) */
export type LstGroupMap = { [assetGroup: string]: LstProps }
/** chainId -> address(lowercase) -> risk overlay */
export type RiskRegistry = { [chainId: string]: { [address: string]: RiskProps } }
/** OFT props shape, derived from TokenProps */
export type OftProps = NonNullable<TokenProps['oft']>
/** chainId -> address(lowercase) -> LayerZero OFT overlay */
export type OftRegistry = { [chainId: string]: { [address: string]: OftProps } }
/** assetGroup -> stablecoin overlay (base is chain-independent) */
export type StablecoinGroupMap = { [assetGroup: string]: StablecoinProps }
/** assetGroup -> savings overlay (underlying/base is chain-independent) */
export type SavingsGroupMap = { [assetGroup: string]: SavingsProps }
