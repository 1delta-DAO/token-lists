import { fileURLToPath } from 'url'
import * as path from 'path'
// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
interface ArbitraryTokenList {
  /** Token url that responds with the list */
  url: string
  /** access equence to get to the array of tokens */
  access?: string | undefined
  /** If the above acces does not return an array but a map */
  isMap?: boolean | undefined
  /** if the list is a map cahinid-> {isMap} */
  isChainMap?: boolean | undefined

  /* logo has a custom field*/
  tag?: string
  /** wait timer */
  wait?: number

  /**
   * Some like Izumi have one multichain entry - correctly create multiple tokens here
   * Also to be used for any other sort of re-mappings
   */
  mutateEntry?: (a: any) => any[]
  /** Ignore tags if any */
  ignoreTags?: boolean | undefined
}

/** Default mutator does nothing */
export const defaultmutateEntry = (a: any) => [a]

const ICECREAM_LIST: ArbitraryTokenList = {
  url: `https://icecreamswap.com/api/trpc/token.defaultList,token.defaultList?batch=1&input=%7B%7D`,
  access: '0.result.data.tokens',
}
const UNISWAP_EXTENDED_LIST: ArbitraryTokenList = {
  url: `https://extendedtokens.uniswap.org/`,
  access: 'tokens',
}
const UNISWAP_LIST: ArbitraryTokenList = {
  url: 'https://tokens.uniswap.org',
  access: 'tokens',
}
const MONAD_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/monad-crypto/token-list/refs/heads/main/tokenlist-mainnet.json',
  access: 'tokens',
}
const BEAMSWAP_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/BeamSwap/beamswap-tokenlist/main/tokenlist.json',
  access: 'tokens',
}
const BASESWAP_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/baseswapfi/default-token-list/main/src/tokens/base.json',
  access: 'tokens',
}
const BLAST_LIST: ArbitraryTokenList = {
  url: 'https://tokens.coingecko.com/blast/all.json',
  access: 'tokens',
}
const LINEA_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/Consensys/linea-token-list/main/json/linea-mainnet-token-shortlist.json',
  access: 'tokens',
}
const PANCAKE_EXTENDED_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/pancakeswap/token-list/main/src/tokens/pancakeswap-extended.json',
  access: 'direct',
}
const TRADERJOE_TOKENLIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/mc.tokenlist.json',
  access: 'tokens',
}
const MOE_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/merchant-moe/moe-tokenlists/main/tokens.json',
  access: 'tokens',
}

const BULBASWAP_LIST: ArbitraryTokenList = {
  url: 'https://api.bulbaswap.io/v1/tokens/topTokens',
  access: 'data',
  mutateEntry: ({ logo, ...rest }: { logo: string }) => [{ ...rest, logoURI: logo, chainId: '2818' }],
}

const GLOWSWAP_LIST: ArbitraryTokenList = {
  url: 'https://tokenlist.glowswap.io/glow.json',
  access: 'tokens',
}

const MORPHO_LIST: ArbitraryTokenList = {
  url: `https://raw.githubusercontent.com/morpho-org/morpho-blue-api-metadata/main/data/tokens.json`,
  access: 'direct',
}

const POLYCAT_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/polycatfi/polycat-default-token-list/master/polycat-default.tokenlist.json',
  access: 'tokens',
}

const DFYN_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/dfyn/new-host/arbitrum-token-add/list-token.tokenlist.json',
  access: 'tokens',
}

const others = [
  '1.json',
  '137.json',
  '146.json',
  '1890.json',
  '2525.json',
  '40.json',
  '42161.json',
  '56.json',
  '59144.json',
  '80094.json',
  '81457.json',
  '8453.json',
  '8822.json',
]

export const ONE_DELTA_LISTS_OTHER: ArbitraryTokenList[] = others.map((filename) => ({
  url: `https://raw.githubusercontent.com/1delta-DAO/random/main/${filename}`,
  access: 'direct',
  isMap: true,
}))

const lending = ['lending.json']

export const ONE_DELTA_LISTS_LENDING: ArbitraryTokenList[] = lending.map((filename) => ({
  url: `https://raw.githubusercontent.com/1delta-DAO/random/main/${filename}`,
  access: 'direct',
}))

const camelotNames = [
  'aleph-zero',
  'apechain',
  'arbitrum-one',
  'corn',
  'degen',
  'duckchain',
  'educhain',
  'example-chain',
  'geist',
  'gravity',
  'molten',
  'proof-of-play',
  'rari',
  'reya',
  'sanko',
  'winr',
  'xai',
]

const CAMELOT_TOKENLIST = (n: string): ArbitraryTokenList => ({
  url: `https://raw.githubusercontent.com/CamelotLabs/default-token-list/main/src/tokens/${n}.json`,
  access: 'direct',
  mutateEntry: ({ logoURI, ...rest }: { logoURI: string }) => [
    {
      ...rest,
      logoURI: logoURI.replace('BASE_URL', 'https://raw.githubusercontent.com/CamelotLabs/default-token-list/main/src'),
    },
  ],
})

const CAMELOT_TOKENLISTS = camelotNames.map(CAMELOT_TOKENLIST)

const swapsicleNames = [
  'matic',
  'mainnet',
  'fantom',
  'telos',
  'taiko',
  'bsc',
  'optimism',
  'arbitrum',
  'avalanche',
  'mantle',
]

const SWAPSICLE_TOKENLIST = (n: string): ArbitraryTokenList => ({
  url: `https://raw.githubusercontent.com/swapsicledex/swapsicle-default-token-list/master/tokens/${n}.json`,
  access: 'direct',
})

const SWAPSICLE_TOKENLISTS = swapsicleNames.map(SWAPSICLE_TOKENLIST)

const sushiNames = [
  'arbitrum-nova.json',
  'arbitrum.json',
  'avalanche.json',
  'base.json',
  'blast.json',
  'boba-avax.json',
  'boba-bnb.json',
  'boba.json',
  'bsc.json',
  'bttc.json',
  'celo.json',
  'clover.json',
  'core.json',
  'cronos.json',
  'ethereum.json',
  'fantom.json',
  'filecoin.json',
  'fuse.json',
  'gnosis.json',
  'haqq.json',
  'harmony.json',
  'heco.json',
  'kava.json',
  'linea.json',
  'metis.json',
  'moonbase.json',
  'moonbeam.json',
  'moonriver.json',
  'okex.json',
  'optimism.json',
  'palm.json',
  'polygon-zkevm.json',
  'polygon.json',
  'rootstock.json',
  'scroll.json',
  'skale-europa.json',
  'telos.json',
  'thundercore.json',
  'xdai.json',
  'zetachain.json',
  'zksync-era.json',
]

const SUSHI_TOKENLIST = (n: string): ArbitraryTokenList => ({
  url: `https://raw.githubusercontent.com/sushiswap/list/master/lists/token-lists/default-token-list/tokens/${n}`,
  access: 'direct',
  tag: 'sushi',
})

const SUSHI_TOKENLISTS = sushiNames.map(SUSHI_TOKENLIST)

const MIST_TOKENLIST: ArbitraryTokenList = {
  url: `https://raw.githubusercontent.com/mistswapdex/default-token-list/master/tokens/smartbch.json`,
  access: 'direct',
}
const DGSWAP_LIST: ArbitraryTokenList = {
  url: 'https://dgswap.io/api/tokens/?poolOnly=false',
  access: 'direct',
  isMap: true,
  mutateEntry: ({ address, ...rest }: { address: string }) => [
    { ...rest, address, logoURI: `https://api.swapscanner.io/v0/tokens/${address}/icon` },
  ],
}

const IZUMI_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/izumiFinance/izumi-tokenList/main/build/tokenList.json',
  access: 'direct',
  isMap: false,
  // multichain entries
  mutateEntry: ({
    chains,
    address,
    decimal,
    icon,
    contracts,
    ...rest
  }: {
    chains: number[]
    address: string
    decimal: number
    icon: string
    contracts: { [c: string]: { address: string; decimal: number } }
  }) => chains.map((chain) => ({ ...rest, logoURI: icon, address, decimals: decimal, chainId: chain })),
}

const KLAYSWAP_LIST: ArbitraryTokenList[] = [0, 100, 200].map((ind) => ({
  url: `https://api.klayswap.com/tokens?skip=${ind}&take=100&keyword=`,
  access: 'tokens',
  mutateEntry: ({ nameEn, decimal, image, ...rest }) => [
    { ...rest, name: nameEn, decimals: decimal, chainId: 8217, logoURI: image },
  ],
}))

const VVS_LIST: ArbitraryTokenList = {
  url: `https://api.vvs.finance/general/api/v1/whitelist-tokens`,
  access: 'direct',
  mutateEntry: ({ decimal, logoImageSvgUrl, ...rest }) => [{ ...rest, decimals: decimal, logoURI: logoImageSvgUrl }],
}

const SOLARBEAM_LIST: ArbitraryTokenList = {
  url: `https://raw.githubusercontent.com/solarbeamio/solarbeam-tokenlist/main/solarbeam.tokenlist.json`,
  access: 'tokens',
  mutateEntry: ({ address, ...rest }) => [
    {
      ...rest,
      address,
      logoURI: `https://raw.githubusercontent.com/solarbeamio/solarbeam-tokenlist/main/assets/moonbeam/${address}/logo.png`,
    },
  ],
}

const STELLASWAP_LIST: ArbitraryTokenList = {
  url: `https://raw.githubusercontent.com/stellaswap/assets/main/tokenlist.json`,
  access: 'tokens',
  mutateEntry: ({ address, ...rest }) => [
    {
      ...rest,
      address,
      logoURI: `https://raw.githubusercontent.com/stellaswap/assets/main/tokenlist/${address}/logo.png`,
    },
  ],
}

const KODIAK_LIST: ArbitraryTokenList = {
  url: `https://api.panda.kodiak.finance/80094/tokenList.json`,
  access: 'tokens',
}

const MOBULA_LISTS = [
  43114, 5165, 1101, 5000, 250, 23294,
  // 137,
  8217, 42161,
].map((a) => ({
  url: `https://api.mobula.io/api/1/market/query?sortOrder=desc&limit=100&offset=0&blockchain=${a}`,
  access: 'direct',
  wait: 501,
  mutateEntry: ({ contracts, logo, ...rest }) => {
    const contract = contracts.find((b) => a === Number(b.blockchainId.split(':')[1]))
    return [{ ...rest, address: contract.address, decimals: contract.decimals, logoURI: logo, chainId: a }]
  },
}))

const IGUANADEX_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/iguanadex/assets/main/lists/etherlink.listed.json',
  access: 'tokens',
}
const BALANCER_LIST: ArbitraryTokenList = {
  url: `https://raw.githubusercontent.com/balancer/tokenlists/main/generated/balancer.tokenlist.json`,
  access: 'tokens',
}
const SMOL_TOKENLIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/SmolDapp/tokenLists/main/lists/10/1inch.json',
  access: 'tokens',
}
const MANTLE_LIST: ArbitraryTokenList = {
  url: 'https://token-list.mantle.xyz/mantle.tokenlist.json',
  access: 'tokens',
  tag: 'mantlelist',
}
const TAIKO_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/HenjinDEX/default-token-list/main/build/henjin-mainnet.tokenlist.json',
  access: 'tokens',
}
const TAIKO_LIST_KODO: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/kodo-exchange/tokenlist/main/tokenlist.json',
  access: 'tokens',
}
const HYPERSWAP_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/HyperSwapX/hyperswap-token-list/main/tokens.json',
  access: 'tokens',
  ignoreTags: true,
}

const JUMPER_LIST: ArbitraryTokenList = {
  url: 'https://api.jumper.exchange/p/lifi/tokens?chainTypes=EVM%2CSVM%2CUTXO%2CMVM',
  access: 'tokens',
  isChainMap: true,
}

const FATHOM_LIST: ArbitraryTokenList = {
  url: 'https://raw.githubusercontent.com/Into-the-Fathom/fathom-swap-default-token-list/main/src/tokenlists/xdc.json',
  access: 'tokens',
}

const OPEN_OCEAN_LISTS = [
  1, 10, 25, 56, 58, 66, 100, 137, 250, 324, 1101, 1088, 1285, 1625, 2222, 8217, 42220, 43114, 42161, 9745,
  // 59140,
  59144, 81457, 1313161554, 1666600000, 40, 8453, 5000, 204, 169, 8453, 534352, 195, 34443, 369, 4200, 30, 1329, 33139,
  146,
  // 80084,
  80094, 10143, 130, 14, 1923,
].map((a) => ({
  url: `https://open-api.openocean.finance/v4/${a}/tokenList`,
  access: 'data',
  tag: 'openocean',
  // OpenOcean has API call limits, therefore, sleep for a bit after each call
  wait: 1000,
}))

const COINGECKO_LISTS = [
  'ethereum',
  'blast',
  'arbitrum-one',
  'ethereum-classic',
  'linea',
  'celo',
  'core',
  'zetachain',
  'xdc-network',
  'metis-andromeda',
  'xdai',
  'mantle',
  'oasis',
  'zksync',
  'opbnb',
  'bitlayer',
  'sonic',
  'mode',
  'cronos',
  'binance-smart-chain',
  'cronos-zkevm',
  'dogechain',
  // "klaytn",
  'base',
  'fantom',
  'avalanche',
  'duckchain',
  'scroll',
  'unichain',
  'rootstock',
  'unichain',
  'sonic',
  'merlin-chain',
  'berachain',
  'degen',
  'ink',
  'fraxtal',
  'kava',
  'aurora',
  'iota-evm',
  'abstract',
  'iotex',
  'story',
  'fuse',
  'apechain',
  'telos',
  'corn',
  'soneium',
  'swellchain',
  'astar',
  'etherlink',
  'conflux',
  'chiliz',
  'x-layer',
  'boba',
  'bob-network',
  'zircuit',
  'kroma',
  'moonbeam',
  'moonriver',
  'sei-v2',
  'polygon-zkevm',
  'gravity-alpha',
  'hyperevm',
  'bsquared-network',
  'edu-chain',
  'katana',
  'thundercore',
  'botanix',
  'manta-pacific',
  'monad',
  'stable',
  'megaeth',
  'plume-network',
].map((a) => ({
  url: `https://tokens.coingecko.com/${a}/all.json`,
  access: 'tokens',
  tag: 'coingecko',
  // same as for open ocean
  wait: 1000,
}))

const DEBRIDGE_CID: any = {
  7565164: 'solana',
  100000001: 245022934,
  100000004: 1088,
  100000006: 4158,
  100000008: 32769,
  100000009: 747,
  100000010: 388,
  100000013: 1514,
  100000014: 146,
  100000015: 48900,
  100000017: 2741,
  100000020: 80094,
  100000021: 60808,
  100000022: 999,
  100000023: 5000,
  100000024: 98866,
  100000025: 50104,
}

const DEBRIDGE_LSITS = [
  1,
  10,
  56,
  137,
  250,
  8453,
  42161,
  43114,
  59144,
  7565164, // solana
  100000001,
  100000004,
  100000006,
  100000008,
  100000009,
  100000010,
  100000013,
  100000014,
  100000015,
  100000017,
  100000020,
  100000021,
  100000022,
  100000023,
  100000024,
  100000025,
].map((a) => ({
  url: `https://dln.debridge.finance/v1.0/token-list?chainId=${a}`,
  access: 'tokens',
  isMap: true,
  tag: 'debridge',
  // same as for open ocean
  wait: 1000,
  mutateEntry: (x) => [{ ...x, chainId: DEBRIDGE_CID[a] ?? a, tags: [] }],
}))

const listDirs = [
  '1',
  '10',
  '25',
  '30',
  '40',
  '42',
  '50',
  '56',
  '61',
  '66',
  '100',
  '108',
  '122',
  '128',
  '130',
  '137',
  '143',
  '146',
  '148',
  '169',
  '185',
  '196',
  '199',
  '204',
  '223',
  '232',
  '250',
  '252',
  '255',
  '288',
  '314',
  '324',
  '360',
  '388',
  '480',
  '592',
  '747',
  '813',
  '999',
  '1030',
  '1868',
  '1088',
  '1101',
  '1116',
  '1135',
  '1284',
  '1285',
  '1329',
  '1480',
  '1514',
  '1625',
  '1729',
  '1890',
  '1923',
  '1996',
  '2000',
  '2020',
  '2222',
  '2345',
  '2415',
  '2525',
  '2741',
  '2818',
  '3637',
  '4158',
  '4200',
  '4689',
  '5000',
  '5165',
  '7000',
  '8081',
  '8082',
  '8217',
  '8453',
  '8822',
  '9745',
  '11235',
  '13371',
  '23294',
  '32520',
  '57073',
  '32769',
  '33139',
  '34443',
  '41455',
  '41923',
  '42161',
  '42170',
  '42220',
  '42262',
  '42793',
  '43111',
  '43114',
  '48900',
  '50104',
  '55244',
  '56288',
  '59144',
  '60808',
  '61916',
  '63157',
  '70700',
  '81457',
  '80094',
  '98866',
  '167000',
  '200901',
  '534352',
  '660279',
  '747474',
  '777777',
  '7777777',
  '21000000',
  '245022934',
  '666666666',
  '1313161554',
  '1380012617',
  '1666600000',
  '2046399126',
  '11297108109',
  'fuel',
]

export const ONE_DELTA_LISTS: ArbitraryTokenList[] = listDirs.map((filename) => ({
  url: `https://raw.githubusercontent.com/1delta-DAO/token-lists/main/${filename}.json`,
  access: 'list',
  tag: '1delta',
  isMap: true,
}))

export const GLUE_LIST: ArbitraryTokenList = {
  url: 'https://exchange-rates.gluex.xyz/tokens',
  access: 'tokens',
  tag: 'biconomy-gas-token',
  isChainMap: true,
}

export const PENDLE_LIST: ArbitraryTokenList = {
  url: 'file://' + path.resolve(__dirname, 'pendle/pendle.json'),
  access: 'direct',
}

export const ALL_LISTS: ArbitraryTokenList[] = [
  PENDLE_LIST,
  ...ONE_DELTA_LISTS,
  ...ONE_DELTA_LISTS_OTHER,
  ...ONE_DELTA_LISTS_LENDING,
  SOLARBEAM_LIST,
  STELLASWAP_LIST,
  ICECREAM_LIST,
  UNISWAP_EXTENDED_LIST,
  UNISWAP_LIST,
  MONAD_LIST,
  BEAMSWAP_LIST,
  MORPHO_LIST,
  PANCAKE_EXTENDED_LIST,
  BASESWAP_LIST,
  LINEA_LIST,
  BLAST_LIST,
  TRADERJOE_TOKENLIST,
  SMOL_TOKENLIST,
  MOE_LIST,
  MANTLE_LIST,
  BULBASWAP_LIST,
  TAIKO_LIST,
  TAIKO_LIST_KODO,
  BALANCER_LIST,
  MIST_TOKENLIST,
  IGUANADEX_LIST,
  DGSWAP_LIST,
  HYPERSWAP_LIST,
  POLYCAT_LIST,
  DFYN_LIST,
  IZUMI_LIST,
  GLUE_LIST,
  // GLOWSWAP_LIST,
  VVS_LIST,
  KODIAK_LIST,
  FATHOM_LIST,
  // JUMPER_LIST,
  ...KLAYSWAP_LIST,
  // ...MOBULA_LISTS,
  ...SUSHI_TOKENLISTS,
  ...SWAPSICLE_TOKENLISTS,
  ...CAMELOT_TOKENLISTS,
  ...OPEN_OCEAN_LISTS,
  ...COINGECKO_LISTS,
  ...DEBRIDGE_LSITS,
]

interface MinimalToken {
  chainId: number
  name: string
  symbol: string
  address: string
  decimals: number
}

export function accessListUnfiltered(data: any, access: string | undefined, isMap = false, isChainMap = false) {
  try {
    // no access - assume standard set by uniswap
    if (!access) return data as MinimalToken[]

    // data is directly an array
    if (access === 'direct') {
      if (isMap) return Object.values(data)
      return data
    }
    // access data
    const accessSplit = access.split('.')
    let dataAccessed = data
    accessSplit.map((a) => {
      dataAccessed = dataAccessed?.[a]
    })

    if (isChainMap) {
      // @ts-ignore
      return Object.values(dataAccessed).reduce((acc, b) => [...acc, ...b], [])
    }
    // console.log("dataAccessed", dataAccessed)
    // regular lists
    if (!isMap) return dataAccessed as MinimalToken[]
    // special case, data as map
    return Object.values(dataAccessed)
  } catch (e) {
    console.log('error - skipping', e)
    return []
  }
}
