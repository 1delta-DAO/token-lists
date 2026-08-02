/** wrapped assets to overarching group */
const GROUP_TO_GROUP_MAPPER: Record<string, string> = {
  // wnatives
  WBNB: 'BNB',
  WETH: 'ETH',
  WPOL: 'POL',
  WPLUME: 'PLUME',
  WSOPH: 'SOPH',
  // maps the polygon migration
  MATIC: 'POL',
  WMATIC: 'POL',
  WMETIS: 'METIS',
  WCORE: 'CORE',
  WMNT: 'MNT',
  WFTN: 'FTN',
  WXDAI: 'XDAI',
  WAVAX: 'AVAX',
  WGLMR: 'GLMR',
  WAZERO: 'AZERO',
  WBERA: 'BERA',
  WBTCN: 'BTCN',
  WTLOS: 'TLOS',
  WFUSE: 'FUSE',
  WFTM: 'FTM',
  WEDU: 'EDU',
  WFIL: 'FIL',
  WIOTX: 'IOTX',
  WPALM: 'PALM',
  WNEON: 'NEON',
  WWINR: 'WINR',
  WXAI: 'XAI',
  WONE: 'ONE',
  WISLM: 'ISLM',
  WKAIA: 'KAIA',
  WSHM: 'SHM',
  WBTT: 'BTT',
  WZETA: 'ZETA',
  WXODEX: 'XODEX',
  WKAVA: 'KAVA',
  WDMT: 'DMT',
  WSEI: 'SEI',
  WMOVR: 'MOVR',
  WIP: 'IP',
  WDOGE: 'DOGE',
  WG: 'G',
  WS: 'S',
  WAPE: 'APE',
  WROSE: 'ROSE',
  WXTZ: 'XTZ',
  WDEGEN: 'DEGEN',
  WASTR: 'ASTR',
  WHYPE: 'HYPE',
  WXPL: 'XPL',
  // kelp dao ETH wrapper
  WRSETH: 'RSETH',
  // USDT l0
  USDT0: 'USDT',
  // solvbtcs
  'SolvBTC.b': 'SolvBTC',
  'SolvBTC.m': 'SolvBTC',
  // merlin ones
  'M-USDT': 'USDT',
  'M-USDC': 'USDC',
  // vault bridge ones
  vbUSDT: 'USDT',
  vbUSDC: 'USDC',
  // Thunder Core uSDC
  'TT-USDC': 'USDC',
  'TT-USDT': 'USDT',
  'Wrapped BTC::TT-WBTC': 'WBTC',
}

export function mapAssetGroup(gr: string) {
  return GROUP_TO_GROUP_MAPPER[gr] ?? gr
}

/**
 * Merge specific split-off (currencyId `Name::SYMBOL`) groups back into a canonical group.
 * Applied to the FINAL asset group after the same-chain dedup — for deployments whose name or
 * casing splits them off from the shared group instead of unifying (e.g. Kelp wrsETH, whose
 * `WRSETH → RSETH` mapping is defeated by names like "rsETHWrapper" and by the dedup when
 * rsETH already occupies RSETH on that chain). Keyed on the exact group string.
 */
export const GROUP_ALIAS: Record<string, string> = {
  // Only SAME-asset variants are merged here. Different tokens that merely share a ticker are
  // deliberately NOT unified (StaFi rETH ≠ Rocket Pool RETH, PANGEA/Staked One ≠ StakeStone
  // STONE, SOUL/YieldFi ≠ Synthetix SUSD, the mETH memes ≠ Mantle mETH, …).

  // Ankr ankrETH
  'Ankr Staked ETH::ANKRETH': 'ANKRETH',
  // Bedrock brBTC
  'Bedrock BTC::BRBTC': 'BRBTC',
  // Coinbase cbETH
  'Coinbase Wrapped Staked ETH on Gnosis::cbETH': 'CBETH',
  // Renzo ezETH
  'Renzo Restaked ETH::ezETH': 'EZETH',
  // Frax frxETH
  'Bridged FRAX Ether (Axelar)::AXLFRXETH': 'FRXETH',
  'Bridged FRAX Ether (Axelar)::frxETH': 'FRXETH',
  'Frax Ether::FRXETH': 'FRXETH',
  'Frax Ether::frxETH': 'FRXETH',
  'Frax Ether::frxETH::42161::0': 'FRXETH',
  // Lombard LBTC
  'Lombard Staked Bitcoin::LBTC': 'LBTC',
  // Liquid Collective lsETH
  'Liquid Staked ETH::LSETH': 'LSETH',
  // NOTE: Manta mETH is a DIFFERENT asset from Mantle mETH — intentionally NOT unified.
  // StakeWise osETH — no bare group exists; unify every variant to a clean OSETH
  'StakeWise Staked ETH::OSETH': 'OSETH',
  'StakeWise Staked ETH::osETH': 'OSETH',
  'Staked ETH::osETH': 'OSETH',
  'Staked ETH::osETH::42161::0': 'OSETH',
  'Bridged Staked ETH::osETH': 'OSETH',
  // Puffer pufETH
  'PufferVault::PufETH': 'PUFETH',
  // Kelp rsETH + wrsETH (WRSETH → RSETH)
  'Kelp DAO Restaked ETH::RSETH': 'RSETH',
  'KelpDAO Bridged rsETH::rsETH': 'RSETH',
  'KelpDAO Restaked ETH::rsETH': 'RSETH',
  'Wrapped rsETH::WRSETH': 'RSETH',
  'Wrapped rsETH::wrsETH': 'RSETH',
  'rsETHWrapper::wrsETH': 'RSETH',
  // Sky sDAI
  'Savings Dai (PoS)::sDAI': 'SDAI',
  'Wrapped sDAI::sDAI': 'SDAI',
  // Frax sfrxETH
  'Staked Frax Ether::sfrxETH': 'SFRXETH',
  'Staked Frax Ether::sfrxETH::42161::0': 'SFRXETH',
  // Lido stETH
  'Liquid staked Ether 2.0 on Gnosis::stETH': 'STETH',
  'Liquid staked Ether 2.0::stETH': 'STETH',
  // Angle stEUR
  'Angle Staked EURA::STEUR': 'STEUR',
  'Angle Staked EURA::stEUR': 'STEUR',
  'Staked EURA::stEUR': 'STEUR',
  // Noon sUSN
  'Staked USN::sUSN': 'SUSN',
  // EtherFi weETH
  'Wrapped eETH::weETH': 'WEETH',
  // Lido wstETH
  'Bridged wstETH::wstETH': 'WSTETH',
  'Wrapped Liquid Staked ETH::wstETH': 'WSTETH',
  'Wrapped liquid staked Ether 2.0::wstETH': 'WSTETH',
  // Reservoir rUSD — reinsurance-backed USD stablecoin (RWA). Unify its split deployments
  // (canonical multichain OFT + the "Reservoir Stablecoin"-named variant) into one group.
  // NOTE: the generic "rUSD::rUSD" clones (f(x) on Polygon, another on BNB) are DIFFERENT
  // tokens and are intentionally left out.
  'Reservoir Stablecoin::rUSD': 'Reservoir rUSD::RUSD',
  // Reservoir wsrUSD (wrapped savings rUSD) — merge the lowercase-symbol case-split so every
  // deployment matches the margin-fetcher yield key `Wrapped Savings rUSD::WSRUSD`.
  'Wrapped Savings rUSD::wsrUSD': 'Wrapped Savings rUSD::WSRUSD',
  // Spark Savings V1 sUSDC — one asset, five deployments, split in two by a stale name on the
  // Ethereum row. On-chain `name()` reads "Spark USDC Vault" on BOTH Ethereum
  // (0xBc65ad17…) and the L2s (0xCF9326e2… / 0x940098b1… / 0x14d9143B…), so the "Spark USDC"
  // variant is the odd one out and the Vault form is canonical. Merging matters beyond
  // cosmetics: every deployment shares ONE share price (a sUSDC share IS an sUSDS, priced
  // through PSM3 off the Sky Savings Rate), so a split group makes the same asset look like
  // two, and the margin-fetcher yield key `Spark USDC Vault::sUSDC` only resolves for one of
  // them. NOTE: "Wrapped sUSDC::sUSDC" (0xd7bc0dcb…) and "SUSDC::SUSDC" on Ink are DIFFERENT
  // assets and are deliberately left alone.
  'Spark USDC::SUSDC': 'Spark USDC Vault::sUSDC',
  // Solv xSolvBTC
  'Solv Protocol Staked BTC::XSOLVBTC': 'XSOLVBTC',
  // TapiocaBar wrapped BTC (previously a dead entry in GROUP_TO_GROUP_MAPPER)
  'Wrapped BTC::TT-WBTC': 'WBTC',

  // --- Distinct-asset unifications: a DIFFERENT asset that shares a ticker with a canonical
  // one, whose own variants are merged together WITHOUT touching the canonical group. ---
  // StaFi rETH — NOT Rocket Pool RETH; unify StaFi's variants into their own StaFi::rETH group.
  'StaFi Staked ETH::RETH': 'StaFi::rETH',
  'StaFi Staked ETH::rETH': 'StaFi::rETH',
  'StaFi (PoS)::rETH': 'StaFi::rETH',
}

export function aliasAssetGroup(gr: string) {
  return GROUP_ALIAS[gr] ?? gr
}
