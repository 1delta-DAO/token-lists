import { Chain } from '@1delta/chain-registry'

export const PENDLE_CHAINS = [
  Chain.ETHEREUM_MAINNET,
  Chain.ARBITRUM_ONE,
  Chain.OP_MAINNET,
  Chain.BNB_SMART_CHAIN_MAINNET,
  Chain.MANTLE,
  Chain.BASE,
  Chain.SONIC_MAINNET,
  Chain.BERACHAIN,
  Chain.HYPEREVM,
  Chain.MONAD_MAINNET,
  Chain.PLASMA_MAINNET,
  Chain.UNICHAIN,
  Chain.INK,
  Chain.AVALANCHE_C_CHAIN,
  Chain.KATANA,
  Chain.X_LAYER_MAINNET,
]

export interface PendleMarket {
  name: string
  address: string
  expiry: string
  pt: string
  yt: string
  sy: string
  underlyingAsset: string
  details: any
  isNew: boolean
  isPrime: boolean
  timestamp: string
  lpWrapper?: string
  categoryIds: string[]
  chainId: number
}

export interface PendleMarketsResponse {
  markets: PendleMarket[]
}

export interface PendleMarketsByChain {
  [chainId: string]: PendleMarket[]
}

export interface PendleMarketMapping {
  marketAddress: string
  syAddress?: string
  expiry?: number
  ytAddress?: string
  ptAddress: string
  underlyingAsset?: string
  name: string
  isNew: boolean
  isPrime: boolean
  categoryIds: string[]
  details: any
}

export interface PendleAsset {
  name: string
  decimals: number
  address: string
  symbol: string
  tags: string[]
  expiry: string
  proIcon: string
  chainId: number
}

export interface PendleAssetsResponse {
  assets: PendleAsset[]
}

export interface PendleAssetsByChain {
  [chainId: string]: PendleAsset[]
}

let allMarketsCache: PendleMarketsByChain = {}
let allAssetsCache: PendleAssetsByChain = {}

/**
 * Fetches all markets data from the Pendle API and caches it
 */
export async function fetchAllMarketsData(): Promise<PendleMarketsByChain> {
  if (Object.keys(allMarketsCache).length) {
    console.log('Using cached all markets data')
    return allMarketsCache
  }

  const url = 'https://api-v2.pendle.finance/core/v1/markets/all'

  try {
    console.log(`Fetching all pendle markets data`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch all markets data: ${response.status}`)
    }

    const data: PendleMarketsResponse = await response.json()

    const marketsByChain: PendleMarketsByChain = {}

    if (data.markets) {
      for (const market of data.markets) {
        const chainId = market.chainId.toString()
        if (!marketsByChain[chainId]) {
          marketsByChain[chainId] = []
        }
        marketsByChain[chainId].push(market)
      }
    }

    // Cache the result
    allMarketsCache = marketsByChain

    console.log(`Fetched ${data.markets?.length || 0} total markets across all chains`)
    return marketsByChain
  } catch (error) {
    console.error('Error fetching all markets data:', error)
    return {}
  }
}

/**
 * Gets market data for a specific chain from the cached all markets data
 */
export async function fetchMarketData(chainId: string): Promise<PendleMarketsResponse> {
  if (!Object.keys(allMarketsCache).length) {
    await fetchAllMarketsData()
  }

  const chainMarkets = allMarketsCache?.[chainId] || []

  console.log(`Found ${chainMarkets.length} markets for chain ${chainId}`)

  return {
    markets: chainMarkets,
  }
}

/**
 * Creates PT to market mapping for a specific chain
 */
export function createPTToMarketMapping(marketData: PendleMarketsResponse): {
  [ptAddress: string]: PendleMarketMapping
} {
  const mapping: { [ptAddress: string]: PendleMarketMapping } = {}

  if (marketData?.markets) {
    for (const market of marketData.markets) {
      if (market.pt) {
        // Extract address from "chainId-address" format
        const ptAddress = market.pt.split('-')[1]?.toLowerCase()
        if (ptAddress) {
          const expiryTimestamp = market.expiry ? Math.floor(new Date(market.expiry).getTime() / 1000) : undefined

          mapping[ptAddress] = {
            marketAddress: market.address.toLowerCase(),
            syAddress: market.sy?.split('-')[1]?.toLowerCase(),
            expiry: expiryTimestamp,
            ytAddress: market.yt?.split('-')[1]?.toLowerCase(),
            ptAddress: market.pt,
            underlyingAsset: market.underlyingAsset?.split('-')[1]?.toLowerCase(),
            name: market.name,
            isNew: market.isNew,
            isPrime: market.isPrime,
            categoryIds: market.categoryIds,
            details: market.details,
          }
        }
      }
    }
  }

  return mapping
}

export async function fetchAllAssetsData(): Promise<PendleAssetsByChain> {
  if (Object.keys(allAssetsCache).length) {
    return allAssetsCache
  }

  const url = 'https://api-v2.pendle.finance/core/v1/assets/all'

  try {
    console.log(`Fetching all pendle assets data`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch all assets data: ${response.status}`)
    }

    const data: PendleAssetsResponse = await response.json()

    const assetsByChain: PendleAssetsByChain = {}

    if (data.assets) {
      for (const asset of data.assets) {
        const chainId = asset.chainId.toString()
        if (!assetsByChain[chainId]) {
          assetsByChain[chainId] = []
        }
        assetsByChain[chainId].push(asset)
      }
    }

    allAssetsCache = assetsByChain

    return assetsByChain
  } catch (error) {
    console.error('Error fetching all assets data:', error)
    return {}
  }
}

export async function fetchAssetsData(chainId: string): Promise<PendleAsset[]> {
  if (!Object.keys(allAssetsCache).length) {
    await fetchAllAssetsData()
  }

  const chainAssets = allAssetsCache?.[chainId] || []

  return chainAssets
}

/**
 * Gets all markets data for all chains (useful for debugging or analysis)
 */
export async function getAllMarketsData(): Promise<PendleMarketsByChain> {
  if (!allMarketsCache) {
    await fetchAllMarketsData()
  }
  return allMarketsCache!
}
