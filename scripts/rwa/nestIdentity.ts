/**
 * ONE name, symbol and assetGroup per Nest (Plume Vaults) product, on every chain.
 *
 * Every Nest share is ONE contract address on every EVM chain it is deployed to (a LayerZero
 * OFT, see `NEST_SHARES` in rwaAssets.ts), plus a Solana mint, and the contract answers the
 * same `name()` / `symbol()` everywhere. The source lists do not: they disagree on casing
 * (`NFALCON` / `nFALCON`, `NBYBIT1` / `nBYBIT1`), on the name (nALPHA was 'Nest Alpha Vault',
 * 'Nest ALPHA Vault' and 'Nest Institutional Alpha Vault' depending on the chain; Plume listed
 * nELIXIR as 'Nest Institutional Core Vault'), on whitespace ('Nest Alpha Vault  LP ') and in
 * one case on the decimals (Plume's nETF row said 8; the contract says 6). Each disagreement
 * either split one product into two assetGroups or rendered it under two names.
 *
 * So this table states the identity once and both generators apply it last
 * (`generateTokenMap.script.ts` for EVM, `solana/solana.ts` for the mints): name, symbol,
 * `currencyId = name::symbol` and `assetGroup = name::symbol`.
 *
 * The identity is the contract's own `name()` / `symbol()`, read on Plume (the hub) on
 * 2026-10-05 and identical on Ethereum, with three deliberate exceptions, each the form Nest
 * publishes (`api.nest.credit/v1/vaults`) and the one most rows already used:
 *  - nBASIS: the contract says 'Nest Basis'; Nest and every existing group say 'Nest Basis Vault'.
 *  - nCLOA: the contract says 'Nest CLO Vault' / `nCLO`; Nest, its Solana mint and every list
 *    say 'Nest BlackRock iShares AAA CLO Active ETF Vault' / `nCLOA`.
 *  - nAXI: the contract name differs by chain (Plume 'Nest AXI Vault', Ethereum 'Nest USDC
 *    PayFi Lending Vault'); the hub's form, which is also Nest's.
 *
 * `NEST_GROUP_RENAMES` lists every group string a row carried before this table existed, so a
 * consumer keyed on an old string can follow it (lending-sdks' `nestFetcher` emits both during
 * the publish transition).
 */
export interface NestIdentity {
  name: string
  symbol: string
  /** Per-chain decimals, ONLY where a source list published a wrong value. */
  decimals?: { [chainId: string]: number }
}

const id = (name: string, symbol: string, decimals?: NestIdentity['decimals']): NestIdentity =>
  decimals ? { name, symbol, decimals } : { name, symbol }

/** Keyed by lower-case EVM address (the same on every chain) and by verbatim Solana mint. */
export const NEST_IDENTITY: { [addressOrMint: string]: NestIdentity } = {
  // ─── vaults Nest lists today ─────────────────────────────────────────────
  '0x593ccca4c4bf58b7526a4c164ceef4003c6388db': id('Nest Alpha Vault', 'nALPHA'),
  '8qujzAXj2nz99CmeiCgPPc2JxEuDNYvPffzRomroJnee': id('Nest Alpha Vault', 'nALPHA'),
  '0xe72fe64840f4ef80e3ec73a1c749491b5c938cb9': id('Nest Treasuries Vault', 'nTBILL'),
  '2sA2jW9e8EYJkLFpq9hkhxfVUQBwVGJwq6iP4TmTKrL4': id('Nest Treasuries Vault', 'nTBILL'),
  '0x11113ff3a60c2450f4b22515cb760417259ee94b': id('Nest Basis Vault', 'nBASIS'),
  G6SkPqYTbtVFYU4krZLDgHf5MVMfARG57G1kog4RYH2n: id('Nest Basis Vault', 'nBASIS'),
  '0xa5f78b2a0ab85429d2dfbf8b60abc70f4cec066c': id('Nest Credit Vault', 'nCREDIT'),
  '0x2a3e301dbd45c143dfbb7b1ce1c55bf0bbf161cb': id('Nest Apollo ACRDX Vault', 'nACRDX'),
  '0x29bf22381a5811dec89dc7b46a5ce57ad02c0240': id('Nest WisdomTree Vault', 'nWISDOM'),
  '77DTSzxisdQWshFYHP9M2JBDuHNojLAVoC7GBNC2yadT': id('Nest WisdomTree Vault', 'nWISDOM'),
  '0x119dd7daff816f29d7ee47596ae5e4bdc4299165': id('Nest BlackOpal LiquidStone II Vault', 'nOPAL'),
  GArhnnDj3GYhmQeApKVXaRv4TQFwhPcs3SNF6FXsTeXq: id('Nest BlackOpal LiquidStone II Vault', 'nOPAL'),
  '0xdf45b8322ea4ce898331602e2d1f3d1a67ae0ee8': id('Nest Liquid Credit Vault', 'nLCRD'),
  '14BM5Nvq2kuJPn4vFNqiPM3XSBzVaqEjZrDT7ZYLS2nB': id('Nest Liquid Credit Vault', 'nLCRD'),
  '0x7488b23f4c26b44eef2e0766896be47443e86d79': id('Nest AXI Vault', 'nAXI'),
  '0x066d10e240999aea6798b2e2ca0bdac2923cbdff': id('Nest FalconX CLO', 'nFALCON'),
  '4bpR1mvWgL25NxWBfYKDjiYGfAVttTeo9VJ1LvmbPj9y': id('Nest FalconX CLO', 'nFALCON'),
  '0x63810d7f1c7b4dbfb60c173ba120a2be98b59e13': id('Nest BlackRock iShares AAA CLO Active ETF Vault', 'nCLOA'),
  BKHcMUx4XXy3JA4tk9BXM8f6huFLESFtvq9tj9PDiVzf: id('Nest BlackRock iShares AAA CLO Active ETF Vault', 'nCLOA'),
  '0x6fec234e8801ed88964bc058a0f9fbcc9fcbd2eb': id('Prime Vault', 'nPRIME'),
  '0x1f37620a0e0660db3cdbb8cdbf62d8099f959925': id('Plume Factor Vault', 'FACTOR'),
  '6ESVavhfwC4rXHHHZmR6ajg7nLmL6X5UkpZuAcoA7xj7': id('Plume Factor Vault', 'FACTOR'),
  // ─── legacy / institutional vaults (no longer in Nest's API) ─────────────
  '0x02cdb5ccc97d5dc7ed2747831b516669eb635706': id('Nest Bitcoin Vault', 'nBTC'),
  '0x7f80d7a9c0dfe52de38692f4642a5aa3d3a7f5dd': id('Nest Etherfi Vault', 'nETHERFI'),
  '0x6e28fb79ba12b808c439fddb22c09753a83057fc': id('Nest Fidelity Total Bond ETF Vault', 'nFBND'),
  '0x2b89048d45e9eff64bc5ff563b8ba40a2f0aa83e': id('Nest Goldfinch Prime', 'nGPRIME'),
  '0x9d08946ca5856f882a56c29042fbedc5142663b9': id('Nest Mineral Vault', 'nMNRL'),
  '0x8e95a7d99812190bf9691c1df0eef3405165e0fe': id('Nest Bybit Vault 1', 'nBYBIT1'),
  '0x138c1ad7ca9b54be83c398c6bb465d707681b5a8': id('Nest Bybit Vault 2', 'nBYBIT2'),
  '0x9fbc367b9bb966a2a537989817a088afcaffdc4c': id('Nest Elixir Vault', 'nELIXIR'),
  '0xdea736937d464d288ec80138bcd1a2e109a200e3': id('Nest ETF Vault', 'nETF', { '98866': 6 }),
  '0xbfc5770631641719cd1cf809d8325b146aed19de': id('Nest Institutional Vault', 'nINSTO'),
  '0xb52b090837a035f93a84487e5a7d3719c32aa8a9': id('Nest PayFi Vault', 'nPAYFI'),
  '0xd99076fcfd61b3695c5a00740364a84ac8c46cba': id('Nest Perena Vault', 'nPERENA'),
  '0x11a8d8694b656112d9a94285223772f4aad269fc': id('Nest RWA', 'nRWA'),
  '0x770c2d6b16c8f8ab5535ae719a5475411c120f6e': id('Nest Hamilton Lane SCOPE Vault', 'nSCOPE'),
  '0x64ab176c545bb85eca75d53c3ffcb361deafb855': id('Nest Institutional Alpha Vault', 'inALPHA'),
  '0xd3bfd6e6187444170a1674c494e55171587b5641': id('Nest Institutional Elixir Vault', 'inELIXIR'),
  '0xdea149f84859d1ec50480c209b71bffa482b0530': id('Nest Institutional Treasuries Vault', 'inTBILL'),
  // Plume's own dollar — every Nest vault's deposit asset on the hub.
  '0xdddd73f5df1f0dc31373357beac77545dc5a6f3f': id('Plume USD', 'pUSD'),
}

/** Old assetGroup → the group the identity above produces. */
export const NEST_GROUP_RENAMES: { [oldGroup: string]: string } = {
  'Nest ALPHA Vault::nALPHA': 'Nest Alpha Vault::nALPHA',
  'Nest Institutional Alpha Vault::nALPHA': 'Nest Alpha Vault::nALPHA',
  'Nest BlackRock iShares AAA CLO Active ETF Vault::NCLOA': 'Nest BlackRock iShares AAA CLO Active ETF Vault::nCLOA',
  'Nest USDC PayFi Lending Vault::nAXI': 'Nest AXI Vault::nAXI',
  'Nest BTC Vault::NBTC': 'Nest Bitcoin Vault::nBTC',
  'Nest Etherfi Vault::NETHERFI': 'Nest Etherfi Vault::nETHERFI',
  'Nest Fidelity Total Bond ETF Vault::NFBND': 'Nest Fidelity Total Bond ETF Vault::nFBND',
  'Nest Goldfinch Prime Vault::NGPRIME': 'Nest Goldfinch Prime::nGPRIME',
  'Nest Mineral Vault::NMNRL': 'Nest Mineral Vault::nMNRL',
  'Nest Bybit Vault 1::NBYBIT1': 'Nest Bybit Vault 1::nBYBIT1',
  'Nest Elixir Vault::NELIXIR': 'Nest Elixir Vault::nELIXIR',
  'Nest Institutional Core Vault::nELIXIR': 'Nest Elixir Vault::nELIXIR',
  'Nest ETF Vault::NETF': 'Nest ETF Vault::nETF',
  'Nest Institutional Vault::NINSTO': 'Nest Institutional Vault::nINSTO',
  'Nest PayFi Vault::NPAYFI': 'Nest PayFi Vault::nPAYFI',
  'Nest Alpha Vault  LP ::INALPHA': 'Nest Institutional Alpha Vault::inALPHA',
  'Nest Alpha Vault (LP)::INALPHA': 'Nest Institutional Alpha Vault::inALPHA',
  'Nest Elixir Vault  LP::INELIXIR': 'Nest Institutional Elixir Vault::inELIXIR',
  'Nest Elixir Vault (LP)::INELIXIR': 'Nest Institutional Elixir Vault::inELIXIR',
  'Nest Treasury Vault (LP)::INTBILL': 'Nest Institutional Treasuries Vault::inTBILL',
  'Plume USD::PUSD': 'Plume USD::pUSD',
}

/** The identity for an address (EVM, any case) or a Solana mint (verbatim). */
export const lookupNestIdentity = (addressOrMint: string): NestIdentity | undefined =>
  NEST_IDENTITY[addressOrMint] ?? NEST_IDENTITY[addressOrMint.toLowerCase()]

export const nestGroupOf = (n: NestIdentity) => `${n.name}::${n.symbol}`
