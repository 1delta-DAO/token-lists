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
  [lender: string]: {
    [chainId: string]: {
      baseAsset: string
      baseBorrowMin: bigint
    }
  }
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
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  infoURL: string
  shortName: string
  key?: string
  chainId: number | string
  networkId: number | string
  slip44?: number
  ens?: {
    registry: string
  }
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

export type LenderPresets = {
  [lender: string]: {
    [chain: string | number]: {
      debt: string[]
      collateral: string[]
    }
  }
}

export type SimpleAsset =
  | {
      decimals: number
      isNative: true
      name: string
      symbol: string
      props?: TokenProps
    }
  | {
      decimals: number
      name: string
      address: string
      symbol: string
      props?: TokenProps
    }

/** chainId -> ChainInfo */
export type WrappedNativeInfo = {
  [chainId: number | string]: {
    decimals: number
    name: string
    address: string
    symbol: string
  }
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

export type ChainPreset = {
  [chainId: string]: Preset
}

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
  }
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
/** assetGroup -> stablecoin overlay (base is chain-independent) */
export type StablecoinGroupMap = { [assetGroup: string]: StablecoinProps }
/** assetGroup -> savings overlay (underlying/base is chain-independent) */
export type SavingsGroupMap = { [assetGroup: string]: SavingsProps }
