import { Chain } from '@1delta/chain-registry'
import { mapAssetGroup } from './data/assetGroupUnifier'
import { FUEL_MAPPEDS, knownAssets } from './data/knownAssets'
export namespace AutoGenHelpers {
  export function reverseForkToPoolData(input: { [lender: string]: { [chainId: string]: any } }): {
    [chainId: string]: string[]
  } {
    const result: { [chainId: string]: string[] } = {}

    for (const lender in input) {
      const chainMap = input[lender]
      for (const chainId in chainMap) {
        if (!result[chainId]) {
          result[chainId] = []
        }
        result[chainId].push(lender)
      }
    }

    return result
  }

  export function generateCombinedChainMapTsFile(
    maps: Array<{ [chain: string]: string[] }>,
    exportName: string = 'CHAIN_TO_LENDERS',
  ): string {
    const combinedMap: { [chain: string]: Set<string> } = {}

    for (const map of maps) {
      for (const chain in map) {
        if (!combinedMap[chain]) {
          combinedMap[chain] = new Set()
        }
        map[chain].forEach((value) => combinedMap[chain].add(value))
      }
    }

    // Create TS lines
    const lines: string[] = []
    lines.push(`export const ${exportName}: { [chain: string]: string[] } = {`)

    for (const chain of Object.keys(combinedMap).sort()) {
      const values = Array.from(combinedMap[chain])
      const formatted = values.map((v) => `"${v}"`).join(', ')
      lines.push(`  "${chain}": [${formatted}],`)
    }

    lines.push('};')

    return lines.join('\n')
  }

  export function getLendersByChainIdAndAddress(reservesMap: any, chainId: string, address: string): string[] {
    const matchedLenders: string[] = []

    for (const lender in reservesMap) {
      const chainMap = reservesMap[lender]
      const addresses = chainMap[chainId]

      if (addresses && addresses.includes(address)) {
        matchedLenders.push(lender)
      }
    }

    return matchedLenders
  }
  export function safeparseSymbol(symbol: any, name: any) {
    if (name === 'Wrapped Ether' && symbol === 'wETH') return 'WETH'
    return symbol
  }

  export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // convert number to a word
  export function numberToWords(num: number) {
    if (num === 0) return 'zero'
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
    return ones[num]
  }

  export function replacePlusSymbol(str: string) {
    // @ts-ignore
    return str
      .replace(/\++/, (match, offset, input) => {
        // Check if the match is at the end of the string
        if (offset === input.length - 1) {
          return '_PLUS_PLUS'
        }
        return '_PLUS_PLUS_'
        // @ts-ignore
      })
      .replace(/\+/, (match, offset, input) => {
        // Check if the match is at the end of the string
        if (offset === input.length - 1) {
          return '_PLUS'
        }
        return '_PLUS_'
      })
  }
  export function isAlphaNumericOrDollar(str: string) {
    // Test the string with a regular expression that includes the "$" symbol
    return /^[a-zA-Z0-9$_]*$/.test(str)
  }

  // List of known bridge/keyword identifiers
  const keyTags = [
    'Wormhole',
    'Axelar',
    'Celer',
    'Symbiosis',
    'Mainnet',
    'Multichain',
    'Nomad',
    'Stargate',
    'Bridged',
    'LayerZero',
    'PolyNetwork',
    'CrossCurve',
    'ICE',
    'Portal',
    'Everclear',
    'ChainPort',
    'Vault Bridge',
  ].map((a) => a.toLowerCase())

  function findMatchingKeywords(inputString: string, keywords = keyTags, tagsAdded: string[] = []): string[] {
    // Convert input string to lowercase to ensure case-insensitive matching
    const lowerCaseInput = inputString.toLowerCase()
    // Filter the keywords that are found in the input string
    const matchingKeywords = keywords.filter((keyword) => {
      let k = keyword.toLowerCase()
      if (keyword === 'ice') k = '(ice)'
      return k !== lowerCaseInput && k !== 'stargate finance' && lowerCaseInput.includes(k)
    })

    return matchingKeywords.length > 0
      ? uniq([...tagsAdded, ...matchingKeywords.map((a) => a.replace('(', '').replace(')', '')), 'bridged'])
      : []
  }

  /** Generate a valid enum key for an asset */
  export function symbolToKey(s: string) {
    return s
  }

  // List of known bridge/keyword identifiers
  const knownBridges = [
    'Wormhole',
    'from Mainnet',
    'Axelar',
    'Polygon',
    'Arbitrum',
    'Avalanche',
    'LayerZero',
    'Optimism',
    'Wrapped',
    'Celer',
    'CrossCurve',
    'Symbiosis',
    'Synapse',
    'Stargate',
    'Bridged',
    'Free',
    'PolyNetwork',
    'ICE',
    'Portal',
    'Everclear',
    'ChainPort',
    'Vault Bridge',
  ]

  function createCurrencyId(name: string, symbol: string) {
    return `${name}::${symbol}`
  }

  // Suffixes used for bridged assets
  const bridgedSuffixes: string[] = ['.e', '.b', '.m', 'ET']

  // Prefixes used for bridged assets
  const bridgedPrefixes: string[] = ['sy', 'axl', 'bridged', 'wrapped', 'm.', 'vb', 'xc']

  // List of known core assets with symbol and name combinations

  // Token type definition
  interface Token {
    chainId: number
    decimals: number
    name: string
    address: string
    symbol: string
    logoURI: string
    assetGroup?: string // Optional
    metadata?: any
    tags?: any
  }

  // Function to remove known prefixes and suffixes from the symbol
  export function normalizeSymbol(symbol: string): string {
    let symb = symbol
    // Remove prefixes
    for (const prefix of bridgedPrefixes) {
      if (symb.toLowerCase().startsWith(prefix.toLowerCase())) {
        symb = symb.slice(prefix.length) // Remove the prefix
        break
      }
    }

    // Remove suffixes
    for (const suffix of bridgedSuffixes) {
      if (symb.toLowerCase().endsWith(suffix.toLowerCase())) {
        symb = symb.slice(0, -suffix.length) // Remove the suffix
        break
      }
    }
    return symb !== '' ? symb.toUpperCase() : symbol.toUpperCase()
  }

  /** check if this is a multichain-bridged asset (formerly anyswap) */
  function isExploitBridged(n: string) {
    const lcn = n.toLowerCase()
    return (
      (lcn !== 'multichain' && lcn.includes('multichain')) ||
      (lcn !== 'anyswap' && lcn.includes('anyswap')) ||
      (lcn !== 'nomad' && lcn.includes('nomad'))
    )
  }

  // Function to categorize tokens into core assets
  export function categorizeToken(
    token: Token,
    bl: boolean,
  ): { currencyId: string; group: string; tags: string[]; tier: string } {
    const { name, symbol } = token
    const currencyId = createCurrencyId(name, symbol)
    //@ts-ignore
    let baseTags: string[] = token.metadata?.tags ?? []
    if (
      isExploitBridged(name) || // multichain bridged excluded
      bl || // not blacklisted
      (String(token.chainId) == Chain.FUEL && !FUEL_MAPPEDS.includes(token.address)) // fuel and not explicitly mapped
    )
      return { currencyId, group: currencyId, tags: findMatchingKeywords(name, keyTags, baseTags), tier: '5' }
    // Helper function to clean names and remove known bridges/keywords
    const cleanName = (name: string): string => {
      const regex = new RegExp(`\\b(${knownBridges.join('|')})\\b`, 'gi')
      const n = name.replace(regex, '').replace(/\s+/g, ' ').trim()
      return n !== '' ? n : name
    }

    // Clean the token name
    const cleanedName = cleanName(name)

    // Normalize the symbol (handle prefixes and suffixes)
    const normalizedSymbol = normalizeSymbol(symbol)
    // Match known asset by normalized symbol and cleaned name
    const matchedAsset = knownAssets.find(
      (asset) =>
        asset.symbol === normalizedSymbol &&
        asset.names.some(
          (assetName) => {
            if (asset.requireExactName) {
              return name == assetName.replace(' (as ERC20)', '')
            }
            return (
              cleanedName.toUpperCase().includes(assetName.toUpperCase()) ||
              name.toUpperCase().includes(assetName.toUpperCase())
            )
          }, // Match by name
        ),
    )

    const tags = findMatchingKeywords(name, keyTags, baseTags)

    let tier = '4'
    if (matchedAsset) {
      tier = '1'
      // canonical
      if (tags.includes('bridged')) tier = '2'
      // sg
      if (tags.includes('stargate')) tier = '2'
      // wormhole
      if (tags.includes('wormhole')) tier = '3'
      // celer
      if (tags.includes('celer')) tier = '3'
      // ice
      if (tags.includes('ice')) tier = '4'
    }

    // If a match is found, return the symbol (or symbol + name for clarity)
    if (matchedAsset) {
      return { currencyId, group: mapAssetGroup(matchedAsset.symbol), tags, tier }
    }
    // If no match, return a fallback with symbol and name for clarity
    return { currencyId, group: currencyId, tags, tier }
  }

  export function transformMap(
    map: Record<string, { address: string; name: string; chainId: string | number }[]>,
  ): Record<string, Record<string, { chainId: string | number; address: string }[]>> {
    const transformed: Record<string, Record<string, { chainId: string | number; address: string }[]>> = {}

    for (const key in map) {
      transformed[key] = {}
      for (const item of map[key]) {
        if (!transformed[key][item.name]) {
          transformed[key][item.name] = []
        }
        transformed[key][item.name].push({ chainId: item.chainId, address: item.address })
      }
    }

    return transformed
  }

  export function transformEntry(
    map: { address: string; name: string; chainId: string | number }[],
  ): Record<string, { chainId: string | number; address: string }[]> {
    const transformed: Record<string, { chainId: string | number; address: string }[]> = {}

    for (const item of map) {
      if (!transformed[item.name]) {
        transformed[item.name] = []
      }
      transformed[item.name].push({ chainId: item.chainId, address: item.address })
    }

    return transformed
  }

  export function safeparseChainId(cId: any) {
    if (cId === -1) return 'fuel'
    return String(cId)
  }

  export function uniq(a: string[]) {
    return Array.from(new Set(a))
  }

  export function uniqAndLc(arr: string[]) {
    return Array.from(new Set(arr.map((a) => a.toLowerCase())))
  }

  export function isEligibleMainAsset(s: string, n = '') {
    return (
      !isAaveColl(n) &&
      !isAxelar(n) &&
      !isIce(n) &&
      !isSilo(n) &&
      !isEuler(n) &&
      !isWormhole(n) &&
      !isBalancerPoolToken(n) &&
      isEligibleBridgeAsset(s) &&
      isEligible(s, n)
    )
  }

  function isAaveColl(s: string) {
    return s.toLowerCase().includes('aave ') || s.toLowerCase().includes(' aave')
  }

  function isWormhole(s: string) {
    return s.toLowerCase().includes('(wormhole)')
  }
  function isAxelar(s: string) {
    return s.toLowerCase().includes('(axelar)') || s.toLowerCase().includes('axelar ')
  }
  function isEuler(s: string) {
    return s.toLowerCase().includes('euler ')
  }
  function isSilo(s: string) {
    return s.toLowerCase().includes('silo wrapped')
  }
  function isIce(s: string) {
    return s.toLowerCase().includes('(ice)')
  }
  function isBalancerPoolToken(s: string) {
    return s.toLowerCase().includes('balancer ')
  }

  export function isEligibleBridgeAsset(s: string) {
    const lc = s.toLowerCase()
    return lc.includes('axl') || lc.includes('.e') || isEligible(lc)
  }

  export function isEligible(s: string, n = '') {
    const lc = s.toLowerCase()
    return (
      !n.toLowerCase().includes('multichain') &&
      !lc.toLowerCase().startsWith('any') &&
      !n.toLowerCase().includes('anyswap') &&
      !n.toLowerCase().includes('nomad') &&
      (lc === 'usdc' ||
        lc === 'usdt' ||
        lc === 'weth' ||
        lc === 'wbtc' ||
        lc === 'avax' ||
        lc === 'eth' ||
        lc === 'wavax' ||
        lc === 'mnt' ||
        lc === 'wmnt' ||
        lc === 'bnb' ||
        lc === 'wbnb')
    )
  }
}
