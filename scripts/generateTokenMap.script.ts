// @ts-ignore-next-line
import * as fs from 'fs'
import { AutoGenHelpers } from './utils'
import { accessListUnfiltered, ALL_LISTS, defaultmutateEntry } from './externalLists'

import { BLACKLIST_PER_CHAIN, GENERAL_BLACKLIST, GROUP_BLACKLIST, GROUP_HARD_SETTER, NATIVE_ERC20 } from './blacklist'
import { isAddress, zeroAddress } from 'viem'
import { PRESET_SYMBOLS } from './presets'
import { FUEL_MAPPEDS } from './utils/data/knownAssets'
import { OmniCurrencyList, TokenProps } from './utils/types'
import { PERMIT_MAP } from './utils/data/permitMap'
import { lookupRisk } from './risk/riskMap'
import { lookupStablecoin } from './stablecoin/stablecoinMap'
import { lookupSavings } from './savings/savingsMap'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { Chain } from '@1delta/chain-registry'
import { WRAPPED_NATIVE_INFO } from '@1delta/wnative'
// import { scrapeAllPermits } from '../permit/scrapeAllPermits'

interface MinimalTokenNoChainId {
  name: string
  symbol: string
  decimals: number
  assetGroup?: string
}

const WNATIVE_OVERRIDES: { [c: string]: string } = {
  [Chain.KATANA]: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62', // vbETH
  [Chain.FUEL]: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07', // fuelETh
}

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const permitFilePath = (chainId: string) => path.resolve(__dirname, `./permit-info/${chainId}.permit.json`)

function getNativeIcon(symb: string) {
  return `https://raw.githubusercontent.com/1delta-DAO/asset-icons/main/native/${symb.toLowerCase()}.webp`
}

const baseUrlChains = 'https://raw.githubusercontent.com/1delta-DAO/chains/main'

const chainsURL = baseUrlChains + '/data.json'

type ChainIdAddressMetaMap = {
  [chainId: string]: { [address: string]: MinimalTokenNoChainId }
}

type Register = { [assetEnum: string]: string }

const ALL_NETWORKS = Object.values(Chain)

const BANNED_NETWORKS = [
  '167009', // taiko test
]

const DEFAULT_PERMIT: any = { type: 1, version: '1' }

interface MinimalToken {
  chainId: string
  name: string
  isNative?: boolean
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  icon?: string
  tags?: string[]
  props?: TokenProps
}

type AssetList = { [address: string]: MinimalToken }

type ChainPreset = {
  [chainId: string | number]: {
    stable?: MinimalToken
    usdt?: MinimalToken
    usdc?: MinimalToken
    dai?: MinimalToken
    eth?: MinimalToken
    btc?: MinimalToken
  } & Record<string, MinimalToken>
}

interface List {
  chainId: any
  version: string
  list: AssetList
  mainTokens: string[]
  bridgeTokens?: string[]
}

type ListOfLists = { [chainId: string]: AssetList }
type ListOfMainTokens = { [chainId: string]: string[] }
type ListOfBridgeTokens = { [chainId: string]: string[] }
type SymbolToNames = {
  [symbol: string]: {
    address: string
    chainId: string
    name: string
    tags: string[]
  }[]
}

function checkUri(a?: string) {
  if (!a) return true
  if (
    a.includes('icecreamswap') ||
    a.includes('s3.openocean') ||
    a.includes('ipfs://') ||
    a.includes('api.swapscanner.io')
  )
    return true
  return false
}

function getNativeTokenIcon(symbol: string) {
  return `https://raw.githubusercontent.com/1delta-DAO/asset-icons/main/native/${symbol?.toLowerCase()}.webp`
}

async function readTokenLists(): Promise<{
  chainIdAddressMetaMap: ChainIdAddressMetaMap
  listOfLists: ListOfLists
  symbolToNames: SymbolToNames
  listOfMainTokens: ListOfMainTokens
  listOfBridgeTokens: ListOfBridgeTokens
  chainPreset: ChainPreset
  omnis: OmniCurrencyList
  CHAIN_INFO: any
}> {
  const CHAIN_INFO = await fetch(chainsURL).then((a) => a.json())
  let chainIdAddressMetaMap: ChainIdAddressMetaMap = {}
  let symbolToNames: SymbolToNames = {}
  let omnis: OmniCurrencyList = {}
  let chainPreset: ChainPreset = {}
  let listOfLists: ListOfLists = {}
  let listOfMainTokens: ListOfMainTokens = {}
  let listOfBridgeTokens: ListOfBridgeTokens = {}
  let permitMaps: { [c: string]: any } = {}
  for (let list of ALL_LISTS) {
    console.log('processing', list.url)
    const is1delta = list.tag === '1delta'
    try {
      let data
      if (list.url.startsWith('file://')) {
        const filePath = fileURLToPath(list.url)
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      } else {
        const listDataRaw = await fetch(list.url, {
          method: list.method ?? 'GET',
          headers: list.headers,
          body: list.body,
        })
        if (list.wait) {
          await AutoGenHelpers.sleep(list.wait)
        }
        data = await listDataRaw.json()
      }

      if (data.mainTokens && data.chainId) {
        listOfMainTokens[AutoGenHelpers.safeparseChainId(data.chainId)] = data.mainTokens
        try {
          const permitFile = permitFilePath(data.chainId)
          if (fs.existsSync(permitFile)) {
            const pMap = JSON.parse(fs.readFileSync(permitFile, 'utf-8')).list
            permitMaps[data.chainId] = pMap
          } else {
            console.log(`No permit file found for chain ${data.chainId}`)
          }
        } catch (r: any) {
          console.log(`Error reading permit data for chain ${data.chainId}:`, r.message)
        }
      }

      let bridgedTokensMapped: any = {}
      if (data.bridgeTokens && data.chainId) {
        listOfBridgeTokens[AutoGenHelpers.safeparseChainId(data.chainId)] = data.bridgeTokens
        bridgedTokensMapped[data.chainId] = true
      }
      const array = accessListUnfiltered(data, list.access, list?.isMap, list?.isChainMap, list.url)
      if (!Array.isArray(array)) {
        console.log('object is not an array, skipping')
        continue
      }
      array.forEach((tokenInList0: any) => {
        const mutator = list.mutateEntry ?? defaultmutateEntry
        const assets = mutator(tokenInList0)

        assets.forEach((tokenInList) => {
          const isPolkadotXc = tokenInList.symbol && tokenInList.symbol.toLowerCase().startsWith('xc')
          const enumKey = AutoGenHelpers.symbolToKey(tokenInList.symbol)
          const symbolParsed = AutoGenHelpers.normalizeSymbol(tokenInList.symbol)
          if (!symbolToNames[symbolParsed]) symbolToNames[symbolParsed] = []
          if (enumKey && tokenInList.decimals) {
            const lcAddress = tokenInList.address?.toLowerCase() ?? tokenInList.id?.toLowerCase()
            /** Filter for NATIVE placeholders */
            if ((lcAddress.length === 66 || isAddress(lcAddress)) && !GENERAL_BLACKLIST.includes(lcAddress)) {
              const tokenInListName = tokenInList.name
              const parsedSymbol = AutoGenHelpers.safeparseSymbol(tokenInList.symbol, tokenInListName)
              const chainId = AutoGenHelpers.safeparseChainId(tokenInList.chainId)
              if (!BANNED_NETWORKS.includes(chainId))
                if (ALL_NETWORKS.includes(chainId as any)) {
                  /** Only proceed if asset is not blacklisted */
                  // @ts-ignore
                  if (!BLACKLIST_PER_CHAIN[chainId]?.includes(lcAddress)) {
                    // initialize lists
                    if (!listOfLists[chainId]) listOfLists[chainId] = {}
                    if (!listOfMainTokens[chainId]) listOfMainTokens[chainId] = []
                    if (!listOfBridgeTokens[chainId]) listOfBridgeTokens[chainId] = []

                    let logoURI =
                      tokenInList.logoURI ?? tokenInList.icon ?? tokenInList.logo ?? tokenInList.metadata?.logoURI

                    const isBlacklisted =
                      GROUP_BLACKLIST?.[chainId]?.[enumKey] && GROUP_BLACKLIST?.[chainId]?.[enumKey].includes(lcAddress) // @ts-ignore

                    // create base tag list
                    let tags: string[] = list.ignoreTags
                      ? []
                      : [...(tokenInList.tags ?? []), ...(tokenInList.metadata?.tags ?? [])]
                    // add tags for tokens with xc prefix
                    if (isPolkadotXc) tags = AutoGenHelpers.uniq([...tags, 'polkadot', 'bridged'])
                    if (
                      chainId === '1284' &&
                      tokenInList.name &&
                      tokenInList.name.toLowerCase().includes('multichain')
                    ) {
                      tags = AutoGenHelpers.uniq([...tags, 'multichain'])
                    }
                    // get grouping
                    let assetGroup = ''

                    const { currencyId, group: _assetGroup } = AutoGenHelpers.categorizeToken(
                      tokenInList,
                      isBlacklisted,
                    )

                    if (is1delta) {
                      assetGroup = tokenInList.assetGroup
                    } else {
                      assetGroup = _assetGroup
                    }

                    const permit = PERMIT_MAP[chainId]?.[lcAddress]

                    let tokenProps: TokenProps = tokenInList?.props ?? {}

                    if (permit) tokenProps = { ...tokenProps, permit }

                    if (permitMaps[chainId]) {
                      if (permitMaps[chainId]?.[lcAddress]) {
                        const { type, version } = permitMaps[chainId]?.[lcAddress]
                        tokenProps = {
                          ...tokenProps,
                          permit: {
                            type: type === 'EIP2612' ? 1 : 0,
                            version,
                          },
                        }
                      }
                    }
                    if (tokenInList?.name?.startsWith('Vault Bridge'))
                      tokenProps = { ...tokenProps, permit: DEFAULT_PERMIT }

                    // Asset risk overlay (from risk-data). Orthogonal to rwa/lst/pendle, so
                    // it's merged here by address rather than carried on a source list.
                    const risk = lookupRisk(chainId, lcAddress)
                    if (risk) tokenProps = { ...tokenProps, risk }

                    // Stablecoin overlay (from risk-data). Keyed by assetGroup since the fiat
                    // base is chain-independent — covers every deployment of the group.
                    const stablecoin = lookupStablecoin(assetGroup)
                    if (stablecoin && !tokenProps.stablecoin) tokenProps = { ...tokenProps, stablecoin }

                    // Savings overlay (yield-bearing stablecoin wrappers, from risk-data). Keyed by
                    // assetGroup so the underlying/base carries across every chain deployment.
                    const savings = lookupSavings(assetGroup)
                    if (savings && !tokenProps.savings) tokenProps = { ...tokenProps, savings }

                    tags = AutoGenHelpers.uniq([...tags])

                    // we basically disqualify assets on fuel that are not explicitly mapped
                    if (chainId === 'fuel' && !FUEL_MAPPEDS.includes(lcAddress)) {
                      assetGroup = currencyId + '::fuel'
                    }

                    // This is a case where the group exists and there is an entry
                    // in it that matches the chain already and is NOT bridged
                    // We then assign a new asset group to it that has a different name
                    if (
                      !is1delta &&
                      !tags.includes('bridged') && // asset is bridged
                      !GROUP_HARD_SETTER[chainId]?.[assetGroup]?.includes(lcAddress) && // not force-included
                      symbolToNames[assetGroup]
                        ?.filter((c) => !c.tags.includes('bridged')) // bridged assets filtered
                        ?.filter(
                          (x) => String(x.chainId) === chainId && x.address !== lcAddress, // same chain, different address
                        ).length > 0
                    ) {
                      assetGroup = currencyId
                      let baseGroup = assetGroup
                      if (symbolToNames[baseGroup]?.some((x) => String(x.chainId) === chainId)) {
                        baseGroup = assetGroup + '::' + chainId + '::' + '0'
                      }
                      let n = 1
                      while (symbolToNames[baseGroup]?.filter((x) => String(x.chainId) === chainId).length > 0) {
                        baseGroup = assetGroup + '::' + chainId + '::' + String(n)
                        n++
                      }
                      assetGroup = baseGroup
                    }

                    let parsedEntry = {
                      chainId,
                      decimals: Number(tokenInList.decimals),
                      name: tokenInListName,
                      address: lcAddress,
                      symbol: tokenInList.symbol,
                      logoURI,
                      assetGroup,
                      currencyId,
                      // ...(tags.length > 0 ? { tags } : {}),
                      ...(Object.values(tokenProps).length > 0 && {
                        props: tokenProps,
                      }),
                    }

                    const isWrappedNative =
                      WNATIVE_OVERRIDES[chainId] === lcAddress ||
                      (chainId !== 'fuel' && WRAPPED_NATIVE_INFO[chainId]?.address === lcAddress)

                    if (isWrappedNative) {
                      // wnative always in mainlist
                      listOfMainTokens[chainId].push(lcAddress)
                      if (!parsedEntry.props) parsedEntry.props = {}
                      parsedEntry.props = {
                        ...parsedEntry.props,
                        wnative: true,
                      }
                    }

                    const omniAssetEntry = {
                      // tier,
                      decimals: Number(tokenInList.decimals),
                      name: tokenInListName,
                      address: lcAddress,
                      symbol: tokenInList.symbol,
                      chainId,
                      logoURI,
                      // ...(tags.length > 0 ? { tags: [...tags] } : {}),
                      ...(Object.values(tokenProps).length > 0 && {
                        props: tokenProps,
                      }),
                    }

                    // all of this only for assets not yet mapped
                    if (!listOfLists[chainId][lcAddress]) {
                      // get omniAsset for group
                      if (omnis[assetGroup]) {
                        if (!tags.includes('bridged'))
                          if (!omnis[assetGroup].name) {
                            omnis[assetGroup].name = tokenInListName
                            omnis[assetGroup].symbol = tokenInList.symbol
                            omnis[assetGroup].logoURI = logoURI
                          }

                        // add entry if not exist
                        omnis[assetGroup].currencies.push(omniAssetEntry)

                        // add native
                        if (isWrappedNative) {
                          if (chainId !== Chain.FUEL) {
                            const info = CHAIN_INFO[chainId]?.nativeCurrency
                            if (!info) {
                              console.warn(
                                `[wnative-native-inject skipped] chain ${chainId} missing from chains data feed; ` +
                                  `wrapped-native ${lcAddress} added but no native asset injected for omni group ${assetGroup}`,
                              )
                            } else {
                              let newCcy = {
                                ...omniAssetEntry,
                                ...info,
                                tags: [],
                              }
                              omnis[assetGroup].name = info.name
                              omnis[assetGroup].symbol = info.symbol
                              omnis[assetGroup].currencies.push({
                                ...newCcy,
                                address: '0x0000000000000000000000000000000000000000',
                                logoURI: getNativeIcon(info.symbol),
                                tags: AutoGenHelpers.uniq([...tags.filter((t) => t !== 'wnative'), 'native']),
                              })
                            }
                          }
                        }
                      } else {
                        // @ts-ignore
                        omnis[assetGroup] = {
                          id: assetGroup,
                          currencies: [omniAssetEntry],
                        }
                        // add native
                        if (isWrappedNative) {
                          if (chainId !== Chain.FUEL) {
                            const info = CHAIN_INFO[chainId]?.nativeCurrency
                            if (!info) {
                              console.warn(
                                `[wnative-native-inject skipped] chain ${chainId} missing from chains data feed; ` +
                                  `wrapped-native ${lcAddress} added but no native asset injected for omni group ${assetGroup}`,
                              )
                            } else {
                              let newCcy = {
                                ...omniAssetEntry,
                                ...info,
                                tags: [],
                              }
                              omnis[assetGroup].name = info.name
                              omnis[assetGroup].symbol = info.symbol
                              omnis[assetGroup].currencies.push({
                                ...newCcy,
                                address: '0x0000000000000000000000000000000000000000',
                                logoURI: getNativeIcon(info.symbol),
                                tags: AutoGenHelpers.uniq([...tags.filter((t) => t !== 'wnative'), 'native']),
                              })
                            }
                          }
                        }
                        // skip naming if bridged only
                        if (!tags.includes('bridged'))
                          if (!omnis[assetGroup].name) {
                            omnis[assetGroup].name = tokenInListName
                            omnis[assetGroup].symbol = tokenInList.symbol
                            omnis[assetGroup].logoURI = logoURI
                          }
                      }
                    }

                    if (!chainIdAddressMetaMap[chainId]) {
                      chainIdAddressMetaMap[chainId] = {}
                    }

                    if (!listOfLists[chainId][lcAddress]) {
                      listOfLists[chainId][lcAddress] = parsedEntry
                      if (!symbolToNames[assetGroup]) symbolToNames[assetGroup] = []
                      symbolToNames[assetGroup].push({
                        chainId,
                        address: lcAddress,
                        name: tokenInListName,
                        tags,
                      })

                      chainIdAddressMetaMap[chainId][lcAddress] = {
                        decimals: Number(tokenInList.decimals),
                        name: listOfLists[chainId][lcAddress].name,
                        symbol: parsedSymbol,
                        assetGroup,
                      }
                    }

                    if (checkUri(listOfLists[chainId][lcAddress]?.logoURI) && parsedEntry.logoURI) {
                      listOfLists[chainId][lcAddress] = {
                        ...listOfLists[chainId][lcAddress],
                        logoURI: parsedEntry.logoURI,
                      }
                    }

                    // if (list.tag && list.tag !== 'sushi') {
                    //   listOfLists[chainId][lcAddress] = {
                    //     ...listOfLists[chainId][lcAddress],
                    //     tags: AutoGenHelpers.uniq([...(listOfLists[chainId][lcAddress].tags ?? []), list.tag]),
                    //   }
                    // }

                    if (
                      listOfBridgeTokens[chainId].length < 10 &&
                      !bridgedTokensMapped[chainId] &&
                      AutoGenHelpers.isEligibleBridgeAsset(enumKey) && // eligible key
                      !assetGroup.includes('::') // no low tier assets
                    ) {
                      listOfBridgeTokens[chainId].push(lcAddress)
                    }

                    const includeBridged = !tags.includes('multichain') && !tags.includes('anyswap')
                    // add coingecko token if not enough main toikens
                    const uniqueGroupOrBridged = tags.includes('bridged') && includeBridged
                    const eligibleForMainList = AutoGenHelpers.isEligibleMainAsset(enumKey, tokenInListName)
                    if (
                      listOfMainTokens[chainId].length < 2 &&
                      !isBlacklisted &&
                      (eligibleForMainList ||
                        ((list.tag === 'coingecko' || list.tag === 'sushi') && uniqueGroupOrBridged)) &&
                      listOfMainTokens[chainId].length < 50
                    ) {
                      listOfMainTokens[chainId].push(lcAddress)
                    }

                    if (
                      includeBridged &&
                      (assetGroup === 'USDC' ||
                        assetGroup == 'USDT' ||
                        (chainId === Chain.BLAST && parsedEntry.name === 'USDB')) &&
                      !tags.includes('bridged') &&
                      !parsedEntry.name.toLowerCase().includes('(ice)') &&
                      !chainPreset[chainId]?.stable
                    ) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        stable: parsedEntry,
                      }
                    }
                    if (
                      parsedEntry.symbol == 'DAI' &&
                      !tags.includes('bridged') &&
                      !parsedEntry.name.toLowerCase().includes('ice bridge') &&
                      !chainPreset[chainId]?.dai
                    ) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        dai: parsedEntry,
                      }
                    }
                    if (
                      parsedEntry.symbol == 'USDT' &&
                      !tags.includes('bridged') &&
                      !parsedEntry.name.toLowerCase().includes('ice bridge') &&
                      !chainPreset[chainId]?.usdt
                    ) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        usdt: parsedEntry,
                      }
                    }
                    if (
                      parsedEntry.symbol == 'USDC' &&
                      !tags.includes('bridged') &&
                      !parsedEntry.name.toLowerCase().includes('ice bridge') &&
                      !chainPreset[chainId]?.usdc
                    ) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        usdc: parsedEntry,
                      }
                    }
                    if (
                      (assetGroup === 'BTC' || assetGroup === 'WBTC') &&
                      !tags.includes('bridged') &&
                      !parsedEntry.name.toLowerCase().includes('ice bridge') &&
                      !chainPreset[chainId]?.btc
                    ) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        btc: parsedEntry,
                      }
                    }
                    if (
                      (assetGroup === 'ETH' || assetGroup === 'WETH') &&
                      !tags.includes('bridged') &&
                      !parsedEntry.name.toLowerCase().includes('ice bridge') &&
                      !chainPreset[chainId]?.eth
                    ) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        eth: parsedEntry,
                      }
                    }
                    if (PRESET_SYMBOLS[chainId]?.includes(parsedEntry.symbol.toUpperCase())) {
                      chainPreset[chainId] = {
                        ...(chainPreset[chainId] ?? {}),
                        [parsedEntry.symbol.toLowerCase()]: parsedEntry,
                      }
                    }
                  }
                }
            }
          }
        })
      })
    } catch (error) {
      console.warn(`Error processing ${list.url}:`, error.message)
      continue
    }
  }

  Object.entries(listOfLists).forEach(([chain, data]) => {
    if (chain !== Chain.FUEL) {
      // add zero as native to mains
      if (!listOfMainTokens[chain].includes(zeroAddress))
        listOfMainTokens[chain] = [zeroAddress, ...listOfMainTokens[chain]]
      if (!CHAIN_INFO[chain]) {
        console.warn(
          `chain ${chain} is in @1delta/chain-registry but missing from chains data feed (${chainsURL}); skipping native injection. Tokens for this chain: ${
            Object.keys(data).length
          }`,
        )
        return
      }
      const info = CHAIN_INFO[chain].nativeCurrency
      if (!info) {
        console.warn(`chain ${chain} has no nativeCurrency in chains data feed; skipping native injection.`)
        return
      }
      if (info && !data[zeroAddress]) {
        // let tags = ['native']
        const wnative = WRAPPED_NATIVE_INFO[chain]
        let dataBase
        if (wnative) {
          // // // tags = [...tags, ...(data[wnative.address].tags ?? [])]
          // tags.push(`wrapped:${wnative.address}`)
          if (data[wnative.address]) dataBase = { ...data[wnative.address] }
        }

        // if (NATIVE_ERC20[chain]) tags.push(`erc20:${NATIVE_ERC20[chain].toLowerCase()}`)

        data[zeroAddress] = {
          ...dataBase,
          chainId: chain,
          address: zeroAddress,
          logoURI: getNativeTokenIcon(info.symbol),
          currencyId: info.name + '::' + info.symbol,
          // tag native and wnative
          // tags: AutoGenHelpers.uniq(tags).filter((t) => t !== 'wnative'),
          ...info,
          props: {
            isNative: true,
            ...(NATIVE_ERC20[chain] && {
              erc20: NATIVE_ERC20[chain].toLowerCase(),
            }),
            ...(wnative && { wrapped: wnative.address.toLowerCase() }),
          },
        }
      }
    }
  })

  // attach names if not given
  Object.entries(omnis).forEach(([e, data]) => {
    if (!data.name) {
      const ccy = data.currencies[0]
      omnis[e].name = ccy.name
      omnis[e].symbol = ccy.symbol
    }
  })

  return {
    CHAIN_INFO,
    omnis,
    symbolToNames,
    chainIdAddressMetaMap,
    listOfLists,
    listOfMainTokens,
    listOfBridgeTokens,
    chainPreset,
  }
}

const importSnippetTokenMeta = `import {AssetMetaMap} from "../types";\n`
/** Create js file for chainInfo */
function createTokenMeta(chainMap: ChainIdAddressMetaMap) {
  let data = importSnippetTokenMeta
  data += `export const ASSET_META:AssetMetaMap = {\n`
  Object.entries(chainMap).forEach(([chainId, eipVals]) => {
    data += `"${chainId}": {\n`
    Object.entries(eipVals).forEach(([k, v]) => {
      if (Array.isArray(v) || typeof v !== 'string') {
        data += `"${k}": ${JSON.stringify(v)},\n`
      } else {
        data += `"${k}": "${v}",\n`
      }
    })
    data += `},\n`
  })
  data += `}`
  return data
}

function trimForWrapped(name: string, symbol: string) {
  const newName = name.replace('Wrapped ', '').replace('wrapped ', '')

  const newSymbol = symbol.slice(1)

  return [newName, newSymbol]
}

function filterForWNative(native: { decimals: number; symbol: string; name: string }, candidates: MinimalToken[]) {
  if (candidates[0]?.chainId === Chain.CELO_MAINNET) {
    return candidates.find((a) => a.address === '0x471ece3750da237f93b8e339c536989b8978a438')
  }
  if (candidates[0]?.chainId === Chain.FUEL) {
    return candidates.find((a) => a.address === '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07')
  }
  if (candidates[0]?.chainId === Chain.KATANA) {
    return candidates.find((a) => a.address === '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62')
  }
  if (candidates[0]?.chainId === Chain.TELOS_EVM_MAINNET) {
    return candidates.find((a) => a.address === '0xd102ce6a4db07d247fcc28f366a623df0938ca9e')
  }
  if (candidates[0]?.chainId === Chain.ETHEREUM_CLASSIC) {
    return candidates.find((a) => a.address === '0x82a618305706b14e7bcf2592d4b9324a366b6dad')
  }
  if (candidates[0]?.chainId === Chain.ARBITRUM_ONE) {
    return candidates.find((a) => a.address === '0x82af49447d8a07e3bd95bd0d56f35241523fbab1')
  }
  if (candidates[0]?.chainId === Chain.MONAD_MAINNET) {
    return candidates.find((a) => a.address === '0x3bd359c1119da7da1d913d1c4d2b7c461115433a')
  }
  const found = candidates.filter((c) => {
    if (c.name.toLowerCase().startsWith('wrapped') && c.symbol.toLowerCase().startsWith('w')) {
      const [cutname, cutSymbol] = trimForWrapped(c.name, c.symbol)
      return (
        (cutname.toUpperCase() === native?.name?.toUpperCase() ||
          cutname.toUpperCase() === native?.symbol?.toUpperCase()) &&
        cutSymbol === native?.symbol &&
        Number(c.decimals) === Number(native?.decimals)
      )
    }
    return false
  })

  if (found.length > 1) {
    console.log('found', found)
    throw new Error('Inconsistent wNatives found')
  }
  return found[0]
}

const importSnippetWNativeData = `import {WrappedNativeInfo} from "../types";\n`
/** Create js file for chainInfo */
function createWnativeMap(
  chainMap: ListOfLists,
  CHAIN_INFO: any,
): {
  data: string
  wNative: any
} {
  let wNative: any = {}
  let data = importSnippetWNativeData
  data += `export const WRAPPED_NATIVE_INFO:WrappedNativeInfo = {\n`
  Object.entries(chainMap).forEach(([chainId, assetList]) => {
    const nativeCurrency = CHAIN_INFO[chainId]?.nativeCurrency
    const wnative = filterForWNative(nativeCurrency, Object.values(assetList))
    wNative[chainId] = wnative
    if (wnative) {
      data += `"${chainId}": {\n`
      data += `name: "${wnative.name}",\n`
      data += `symbol: "${wnative.symbol.toUpperCase()}",\n`
      data += `address: "${wnative.address}",\n`
      data += `decimals: ${wnative.decimals},\n`
      data += `},\n`
    }
  })
  data += `}`
  return { data, wNative }
}

const importSnippetPeesets = `import {ChainPreset} from "../types";\n`
/** Create js file for chainInfo */
function createPresetMap(chainPreset: ChainPreset, wnative: { [c: string]: any }, CHAIN_INFO: any) {
  let data = importSnippetPeesets
  data += `export const CHAIN_PRESETS:ChainPreset = {\n`
  Object.entries(chainPreset).forEach(([chainId, presets]) => {
    const nativeCurrency = CHAIN_INFO[chainId]?.nativeCurrency

    if (nativeCurrency) {
      presets = {
        ...presets,
        nativeAsset: { ...nativeCurrency, isNative: true } as any,
      }
    }
    if (wnative[chainId] && nativeCurrency.symbol.toLowerCase() !== wnative[chainId].symbol.toLowerCase())
      presets = {
        ...presets,
        [wnative[chainId].symbol.toLowerCase()]: wnative[chainId],
      }
    data += `"${chainId}": {\n`
    Object.entries(presets).map(([k, t]) => {
      if (t) {
        data += `"${k}": {\n`
        data += `name: "${t.name}",\n`
        data += `symbol: "${t.symbol}",\n`
        if (t.address) data += `address: "${t.address}",\n`
        if (t.isNative) data += `isNative: true,\n`
        data += `decimals: ${t.decimals},\n`
        data += `},\n`
      }
    })
    data += `},\n`
  })
  data += `}`
  return data
}

// Specify the directory containing JSON files
async function main() {
  // await scrapeAllPermits()

  const {
    omnis,
    // chainIdAddressMap,
    // symbolToNames,
    // chainIdAssetMap,
    chainPreset,
    CHAIN_INFO,
    listOfLists,
    listOfMainTokens,
  } = await readTokenLists()

  // const tokenMeta = createTokenMeta(chainIdAddressMetaMap)
  // const tokenMetaPath = './src/data/assetMeta.ts'
  // fs.writeFileSync(tokenMetaPath, tokenMeta)

  // const { data: WNativeMap, wNative } = createWnativeMap(listOfLists, CHAIN_INFO)
  // const WNativeMapPath = "./src/data/wnative.ts";
  // fs.writeFileSync(WNativeMapPath, WNativeMap);

  // const PresetMap = createPresetMap(chainPreset, wNative, CHAIN_INFO);
  // const PresetMapPath = "./src/data/assetPresets.ts";
  // fs.writeFileSync(PresetMapPath, PresetMap);

  /** Token lists as jsons */
  const chainIds = Object.keys(listOfLists)

  chainIds.map((chainId) => {
    const addressToAssetPath = `../${chainId}.json`
    const data: List = {
      chainId,
      version: '0',
      list: listOfLists[chainId],
      mainTokens: AutoGenHelpers.uniqAndLc(listOfMainTokens[chainId]),
      // bridgeTokens: AutoGenHelpers.uniqAndLc(listOfBridgeTokens[chainId]),
    }
    fs.writeFileSync(addressToAssetPath, JSON.stringify(data))
  })

  const addressToOmniPath = `../omni-list.json`
  fs.writeFileSync(addressToOmniPath, JSON.stringify(omnis))
}

main()
  // @ts-ignore
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    // @ts-ignore
    process.exit(1)
  })
