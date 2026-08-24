import { Chain } from '@1delta/chain-registry'

export const BLACKLIST_PER_CHAIN = {
  [Chain.ETHEREUM_MAINNET]: [
    '0x000ae314e2a2172a039b26378814c252734f556a', // ASTER _ EOA address
    // impostors: name===symbol ticker-copies, not CoinGecko's canonical address for the symbol
    '0x0c10bf8fcb7bf5412187a595ab97a3609160b5c6', // fake USDD
    '0xdde3ec717f220fc6a29d6a4be73f91da5b718e55', // fake USDU
    '0x20b3b07e9c0e37815e2892ab09496559f57c3603', // fake USDV
    '0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef', // fake sUSDai
    // Superseded Yield Basis markets. Every generation shares the
    // `yb-<ASSET>` symbol AND produces the same `name::symbol` assetGroup,
    // and the dead ones still answer every getter while holding real funds
    // — so a list carrying both makes the live market indistinguishable
    // from a withdraw-only one. Only the four current LTs (market indices
    // 7-10, pulled in via onchain-fetch/coins.json) belong in the list.
    '0xfbf3c16676055776ab9b286492d8f13e30e2e763', // yb-WBTC v2
    '0xac0cfa7742069a8af0c63e14ffd0fe6b3e1bf8d2', // yb-cbBTC v2
    '0xac0a340c1644321d0bbc6404946d828c1ebfac92', // yb-tBTC v2
    '0x931d40dd07b25b91932b481b63631ea86d236e09', // yb-WETH legacy
    '0xd6a1147666f6e4d7161caf436d9923d44d901112', // yb-cbBTC legacy
    '0x6095a220c5567360d459462a25b1ad5aead45204', // yb-WBTC legacy
    '0x2b513ebe7070cff91cf699a0bfe5075020c732ff', // yb-tBTC legacy
  ],
  [Chain.ARBITRUM_ONE]: [
    // Not a token at all: only `decimals()` (=8) answers, while symbol(),
    // name() and totalSupply() all revert — the shape of a Chainlink-style
    // price feed, not an ERC20. It was published as symbol/name "UNKNOWN",
    // which made it squat the `UNKNOWN::UNKNOWN` group — a group key every
    // future unnameable token would also land in, merging unrelated addresses
    // into one pricing identity downstream (yield-tracer joins prices and
    // intrinsic yields on assetGroup). Same failure mode as the phantom TGBP
    // entry in GENERAL_BLACKLIST.
    '0xf8b3fa720a9cd8abeed5a81f11f80cd8f93e6b57',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // fake WETH
    '0x3d19a8b57e8082c4bbd5e068016295cfdb255e6a', // fake rsETH (impostor)
    '0x47973ada5cd8ead11bfec6af139177d801dec0c2', // fake rswETH (impostor)
    '0xa05245ade25cc1063ee50cf7c083b4524c1c4302', // fake XSGD (impostor)
  ],
  [Chain.POLYGON_MAINNET]: [
    // "0x0000000000000000000000000000000000001010", // MATIC
    '0xb8a1d66f1bf5a16a53945ec560ad027166c0d303', // syBTC
    '0x769434dca303597c8fc4997bf3dab233e961eda2', // fake XSGD (impostor)
  ],
  [Chain.MANTLE]: [
    // "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000" // MNT
  ],
  [Chain.OP_MAINNET]: [
    '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000', // legacy ETH
    '0x7bfd4ca2a6cf3a3fddd645d10b323031afe47ff0', // wrsETH _ eoa address
    '0x9dc6821ae74faae71dfd1016f14eadca7823faf4', // fake wstETH (impostor, unverified on chain 10)
  ],
  [Chain.BNB_SMART_CHAIN_MAINNET]: [
    '0xd17479997f34dd9156deef8f95a52d81d265be9c', // fake USDD (impostor)
  ],
  [Chain.FRAXTAL]: [
    '0xb3a7862d7b29b8e3d235299128c6985e2cd44c33', // fake USDe (impostor)
  ],
  [Chain.BASE]: [
    '0x80eede496655fb9047dd39d9f418d5483ed600df', // frax usd _ eoa address
  ],
  [Chain.METIS_ANDROMEDA_MAINNET]: [
    '0x80eede496655fb9047dd39d9f418d5483ed600df', // frax usd _ eoa address
  ],
}

export const GROUP_BLACKLIST: { [c: string | number]: { [a: string]: string[] } } = {
  [Chain.ETHEREUM_MAINNET]: {
    METH: ['0xdf9307dff0a1b57660f60f9457d32027a55ca0b2'],
    AXL: ['0x25b24b3c47918b7962b3e49c4f468367f73cc0e0'],
    SOL: ['0x1f54638b7737193ffd86c19ec51907a7c41755d8'],
  },
  [Chain.BNB_SMART_CHAIN_MAINNET]: {
    FUEL: ['0x2090c8295769791ab7a3cf1cc6e0aa19f35e441a'],
  },
  [Chain.OP_MAINNET]: {
    ETH: ['0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000'], // this one is disabled on OP
  },
  [Chain.MANTLE]: {
    AUSD: ['0xd2b4c9b0d70e3da1fbdd98f469bd02e77e12fc79'],
    // "MNT": ["0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000"],
  },
  [Chain.MANTA_PACIFIC_MAINNET]: {
    METH: ['0xaccbc418a994a27a75644d8d591afc22faba594e'],
    // "MNT": ["0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000"],
  },
  [Chain.AVALANCHE_C_CHAIN]: {
    AUSD: ['0xabe7a9dfda35230ff60d1590a929ae0644c47dc1', '0x783c08b5f26e3daf8c4681f3bf49844e425b6393'],
  },
  [Chain.SONIC_MAINNET]: {
    MIM: ['0x65a3e654790a2b7ed80afca646caaebaa84db4df'],
  },
  [Chain.MOONBEAM]: {
    // multichain bridged tokens
    BEANS: ['0xe5cf1558a1470cb5c166c2e8651ed0f3c5fb8f42'],
    FRAX: ['0x1ccca1ce62c62f7be95d4a67722a8fdbed6eecb4'],
    FXS: ['0x264c1383ea520f73dd837f915ef3a732e204a493'],
    MIMATIC: ['0xf44fb887334fa17d2c5c0f970b5d320ab53ed557'],
    ZLK: ['0x965f84d915a9efa2dd81b653e3ae736555d945f4'],
    WAVAX: ['0x4792c1ecb969b036eb51330c63bd27899a13d84e'],
    BIFI: ['0x595c8481c48894771ce8fade54ac6bf59093f9e8'],
    BNB: ['0xc9baa8cfdde8e328787e29b4b078abf2dadc2055'],
    BUSD: ['0xa649325aa7c5093d12d6f98eb4378deae68ce23f'],
    DAI: ['0x765277eebeca2e31912c9946eae1021199b39c61'],
    ETH: ['0xfa9343c3897324496a05fc75abed6bac29f8a40f'],
    FTM: ['0xc19281f22a075e0f10351cd5d6ea9f0ac63d4327'],
    LDO: ['0x9fda7ceec4c18008096c2fe2b85f05dc300f94d0'],
    POL: ['0x3405a1bd46b85c5c029483fbecf2f3e611026e45'],
    USDC: ['0x818ec0a7fe18ff94269904fced6ae3dae6d6dc0b'],
    USDT: ['0xefaeee334f0fd1712f9a8cc375f427d9cdd40d73'],
    WBTC: ['0x922d641a426dcffaef11680e5358f34d97d112e1'],
  },
}

export const NATIVE_ERC20: { [a: string]: string } = {
  [Chain.POLYGON_MAINNET]: '0x0000000000000000000000000000000000001010',
  [Chain.METIS_ANDROMEDA_MAINNET]: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
  [Chain.CELO_MAINNET]: '0x471ece3750da237f93b8e339c536989b8978a438',
  [Chain.STABLE_MAINNET]: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
  [Chain.MANTLE]: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
  [Chain.MOONBEAM]: '0x0000000000000000000000000000000000000802',
}

export const GROUP_HARD_SETTER: { [c: string | number]: { [a: string]: string[] } } = {
  // metis native asset
  [Chain.METIS_ANDROMEDA_MAINNET]: {
    METIS: ['0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000'],
  },
  [Chain.MANTLE]: {
    // mantle as ERC20
    MNT: ['0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000'],
  },
  // these are the polygon duplicates (POL OLD)
  [Chain.ETHEREUM_MAINNET]: {
    POL: [
      '0x455e53cbb86018ac2b8092fdcd39d8444affc3f6',
      '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
      '0x0000000000000000000000000000000000001010',
    ],
    // wormhole bnb
    BNB: ['0x418d75f65a02b3d53b2418fb8e1fe493759c7605'],
  },
  [Chain.UNICHAIN]: {
    POL: ['0xf6a49aedbd7861ded0da2be1f21c6954e5682e95', '0xf6ac97b05b3bc92f829c7584b25839906507176b'],
  },
  [Chain.ARBITRUM_ONE]: {
    POL: ['0x561877b6b3dd7651313794e5f2894b2f18be0766', '0x044d8e7f3a17751d521efea8ccf9282268fe08cc'],
  },
  [Chain.POLYGON_ZKEVM]: {
    POL: ['0x22b21beddef74fe62f031d2c5c8f7a9f8a4b304d', '0xa2036f0538221a77a3937f1379699f44945018d0'],
  },
  [Chain.THUNDERCORE_MAINNET]: {
    USDC: [
      // tt-usdc
      '0x22e89898a04eaf43379beb70bf4e38b1faf8a31e',
    ],
  },
  [Chain.HYPEREVM]: {
    HYPE: ['0x2222222222222222222222222222222222222222'],
  },
  [Chain.POLYGON_MAINNET]: {
    POL: [
      '0x0000000000000000000000000000000000001010', // MATIC
    ],
  },
}

/**
 * Symbols that mean "metadata resolution failed", not a ticker. They must never
 * reach a published list, and the reason is the GROUP, not the cosmetics:
 * `currencyId`/`assetGroup` are built as `name::symbol`, so every token that
 * fails to resolve collapses into the SAME key (`UNKNOWN::UNKNOWN`, `0x::0x`).
 * Consumers group cross-chain identity by that key — yield-tracer joins prices
 * and intrinsic yields on it — so two unrelated addresses sharing a placeholder
 * group share one price.
 *
 * `"0x"` specifically is an upstream multicall stringifying the empty return
 * data of a REVERTED `symbol()` call, so it marks a contract that is usually not
 * an ERC20 at all (oracles and adapters answer `decimals()` and revert the rest).
 *
 * Matched on the SYMBOL only, and only as a whole-string, case-folded equality.
 * Every looser formulation was tried against the 41k published entries and each
 * one deleted real tokens:
 *   - flagging placeholder NAMES would drop ELDE (name is a raw address) and
 *     0x0.ai — a usable symbol with a bad name is a curation gap, not a
 *     non-token, and the group key survives it;
 *   - a `/^0x[0-9a-f]+$/` "hex blob" test matches the real tickers `0x0`,
 *     `0x4444` and the name `0xDEFCAFE`;
 *   - adding `null` would delete NULL MATRIX (4 chains) and Base's NULL, and
 *     `test` / `tbd` are likewise live symbols.
 * None of the words below currently appears as a symbol anywhere in the lists,
 * so this rule removes nothing that exists today — it only stops the next one.
 */
const PLACEHOLDER_SYMBOLS = new Set([
  'unknown',
  'unknown token',
  'unk',
  'n/a',
  'na',
  'none',
  'undefined',
  '0x',
  '?',
  '-',
])

export function isUnnamedToken(symbol: unknown, name: unknown): boolean {
  const s = String(symbol ?? '').trim()
  const n = String(name ?? '').trim()
  if (s === '' && n === '') return true
  return PLACEHOLDER_SYMBOLS.has(s.toLowerCase())
}

/** Ether placeholders */
export const GENERAL_BLACKLIST = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  '0x2222222222222222222222222222222222222222',
  '0x0000000000000000000000000000000000000000',
  // Phantom "Tokenised GBP" — a digit transposition of the real tGBP address
  // (…bed1f519… mistyped as …bedf1519…). Verified undeployed via eth_getCode on
  // 1/56/137/8453/43114: no code anywhere, while the real address carries the same
  // 2739-byte deterministic deployment on all five. It is general (not per-chain)
  // because the bad address was published for every one of those chains, and it
  // squatted the canonical `Tokenised GBP::TGBP` group, forcing the REAL token into
  // suffixed splinter groups (`::1::0`, `::56::0`, …).
  '0x27f6c8289550fce67f6b50bedf1519966afe5287',
]
