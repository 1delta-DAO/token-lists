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
  // Binance wBETH — one asset at ONE address on Ethereum and BNB, but the source
  // lists disagree on the symbol's casing (`WBETH` on 1, `wBETH` on 56) and Fuel's
  // bridged row carries a name==symbol group. Canonical = the chain-56 form, which
  // is what the LST registry rows and `wbethFetcher` key their intrinsic APR on.
  'Wrapped Binance Beacon ETH::WBETH': 'Wrapped Binance Beacon ETH::wBETH',
  'wbETH::wbETH': 'Wrapped Binance Beacon ETH::wBETH',
  // Tokenised GBP — same deterministic address on 1/56/137/8453/43114, but the Polygon
  // source row carries the on-chain casing (`tGBP`) while the rest carry `TGBP`, which
  // split one asset into two groups. Canonical = the uppercase form, matching the
  // majority of chains and the stablecoin overlay key.
  'Tokenised GBP::tGBP': 'Tokenised GBP::TGBP',
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
  // Cap stcUSD — ONE asset at ONE vanity address on Ethereum, MegaETH (4326)
  // and Katana (747474), split by a single character of `name()`: mainnet
  // returns "Staked cap USD", the two bridged mirrors "Staked Cap USD".
  // Canonical is the MAINNET form, because Ethereum holds the only real vault
  // (the mirrors' `asset()` / `totalAssets()` / `convertToAssets()` all
  // revert) and it is the key `capFetcher` and the SAVINGS_REGISTRY row use —
  // the wBETH precedent. Left unaliased this cost the bridged chains their
  // intrinsic yield entirely, and 21.6 % of the supply sits on MegaETH.
  // The underlying cUSD does NOT need this: it already stores
  // `Cap USD::CUSD` on every chain. Do not bare-alias to `STCUSD` without
  // updating `capFetcher` — and note several unrelated tokens ship a `cUSD`
  // ticker (Celo Dollar, Chips USD, Chad USD, SyntheX), so the qualified form
  // is the safe one either way.
  'Staked Cap USD::stcUSD': 'Staked cap USD::stcUSD',
  // Theo sthUSD — one asset at one address on Ethereum + Stable (988) +
  // Arbitrum + BNB + Mantle, but only Ethereum is the vault; the rest are
  // LayerZero OFTs whose `name()` is just the ticker, so they group as
  // `sthUSD::sthUSD` while chain 1 groups as `Staked thUSD::STHUSD`. Exactly
  // the stcUSD split above, and with the same consequence if left alone:
  // Stable holds 97 % of the supply and is where sthUSD is the largest Morpho
  // collateral, so the unaliased side is the side that matters. Canonical =
  // the chain-1 form, which is what the savings registry rows and
  // `sthusdFetcher` key their intrinsic APR on.
  'sthUSD::sthUSD': 'Staked thUSD::STHUSD',
  // Theo thBILL — same address on 1 / 143 / 988 / 999 / 42161 / 8453, but the
  // Monad row carries `name() == symbol() == 'thBILL'` while every other chain
  // carries the fund's full name. Live consequence, not hypothetical:
  // `thbillFetcher` keys its APR on the canonical group, so Monad's thBILL
  // reads 0 % intrinsic yield today.
  'thBILL::thBILL': 'Theo Short Duration US Treasury Fund::THBILL',
  // Curve scrvUSD (Savings crvUSD) — ONE asset, THREE stored spellings:
  //   1            Savings crvUSD::scrvUSD              (the only real vault)
  //   42161, 50    Savings crvUSD::scrvUSD              ← canonical
  //   8453         Superbridge Bridged scrvUSD::SCRVUSD (bridge-branded name)
  // Canonical is the on-chain casing the token itself answers (`scrvUSD`),
  // which is also what the majority of deployments store. Only Ethereum is a
  // vault — the other three are bare ERC-20s whose `asset()` and
  // `totalAssets()` revert — but that distinction belongs to margin-fetcher's
  // SAVINGS_REGISTRY, not to the group, which names an ASSET. Without these
  // the bridged rows read 0 % intrinsic yield.
  'Savings crvUSD::scrvUSD': 'Savings crvUSD::scrvUSD',
  'Superbridge Bridged scrvUSD::SCRVUSD': 'Savings crvUSD::scrvUSD',
  // Noon sUSN
  'Staked USN::sUSN': 'SUSN',
  // EtherFi weETH
  'Wrapped eETH::weETH': 'WEETH',
  // Lido wstETH
  'Bridged wstETH::wstETH': 'WSTETH',
  'Wrapped Liquid Staked ETH::wstETH': 'WSTETH',
  'Wrapped liquid staked Ether 2.0::wstETH': 'WSTETH',
  // Neutrl NUSD — the chain-1 row was ingested under the bare CoinGecko ticker ("NUSD::NUSD")
  // while Plasma/Arbitrum carry the on-chain `name()` = "Neutrl USD"; the qualified form is
  // canonical. NOTE: other NUSD-ticker tokens (Neutrino USD, etc.) are DIFFERENT assets —
  // never bare-alias NUSD.
  'NUSD::NUSD': 'Neutrl USD::NUSD',
  // Neutrl sNUSD — Ethereum + Plasma rows store the reversed symbol::name form (the mHYPER
  // shape); canonical matches the currencyId `Staked NUSD::sNUSD`.
  'sNUSD::Staked NUSD': 'Staked NUSD::sNUSD',
  // Apyx apyUSD — the chain-1 row (Morpho-list ingest) is a lowercase-symbol case-split of
  // the Base/BNB CoinGecko form; unify on the majority casing. apxUSD is already consistent
  // (`apxUSD::APXUSD`) on all three chains.
  'apyUSD::apyUSD': 'apyUSD::APYUSD',
  // 3Jane USD3 / sUSD3 — the credit-tranche pair (senior / junior first-loss) behind the
  // savings vaults in lending-sdks. The Morpho-list ingest stores the bare on-chain names
  // ("USD3", "sUSD3"), and TWO unrelated Ethereum tokens also carry the USD3 ticker
  // (Stable.com `Stable com USD3::USD3`, Reserve's `Web 3 Dollar::USD3`) — those are
  // DIFFERENT assets with qualified groups already; qualify 3Jane's under the issuer.
  // sUSD3's underlying is USD3 itself (ERC-4626 over the senior tranche).
  'USD3::USD3': '3Jane USD3::USD3',
  'sUSD3::sUSD3': '3Jane Staked USD3::sUSD3',
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

  // --- Ondo cross-chain unification (2026-08). The chain-1 Ondo Global Markets entries
  // were ingested with punctuation stripped and names truncated to ~38 chars, splitting
  // ~90 tokenized stocks/ETFs (plus USDON) off their chain-56/999 groups; two HyperEVM
  // rows (::CRCLon / ::MUon) are casing-splits of the same assets. Canonical = the
  // chain-56 form ("X (Ondo Tokenized Stock)::SYM"). USDY instead unifies to the
  // majority bare group `USDY` (chains 1/1329/5000/42161 — the form baked into price
  // history; the margin-fetcher ondo yield fetcher emits BOTH forms so either resolves).
  // The unrelated `USDy` (Optimism "Stablecoin Yield", BNB clone) shares only the
  // ticker and is deliberately NOT touched.
  'AMD Ondo Tokenized::AMDON': 'AMD (Ondo Tokenized Stock)::AMDON',
  'ASML Holding NV Ondo Tokenized::ASMLON': 'ASML Holding NV (Ondo Tokenized Stock)::ASMLON',
  'Abbott Ondo Tokenized::ABTON': 'Abbott (Ondo Tokenized Stock)::ABTON',
  'Accenture Ondo Tokenized::ACNON': 'Accenture (Ondo Tokenized Stock)::ACNON',
  'Adobe Ondo Tokenized::ADBEON': 'Adobe (Ondo Tokenized Stock)::ADBEON',
  'Airbnb Ondo Tokenized::ABNBON': 'Airbnb (Ondo Tokenized Stock)::ABNBON',
  'Alibaba Ondo Tokenized::BABAON': 'Alibaba (Ondo Tokenized Stock)::BABAON',
  'Alphabet Class A Ondo Tokenized::GOOGLON': 'Alphabet Class A (Ondo Tokenized Stock)::GOOGLON',
  'Amazon Ondo Tokenized::AMZNON': 'Amazon (Ondo Tokenized Stock)::AMZNON',
  'American Express Ondo Tokenized::AXPON': 'American Express (Ondo Tokenized Stock)::AXPON',
  'Apollo Global Management Ondo Tokenized::APOON': 'Apollo Global Management (Ondo Tokenized Stock)::APOON',
  'AppLovin Ondo Tokenized::APPON': 'AppLovin (Ondo Tokenized Stock)::APPON',
  'Apple Ondo Tokenized::AAPLON': 'Apple (Ondo Tokenized Stock)::AAPLON',
  'Arm Holdings plc Ondo Tokenized::ARMON': 'Arm Holdings plc (Ondo Tokenized Stock)::ARMON',
  'Baidu Ondo Tokenized::BIDUON': 'Baidu (Ondo Tokenized Stock)::BIDUON',
  'Blackrock  Inc Ondo Tokenized::BLKON': 'Blackrock, Inc. (Ondo Tokenized Stock)::BLKON',
  'Boeing Ondo Tokenized::BAON': 'Boeing (Ondo Tokenized Stock)::BAON',
  'Broadcom Ondo Tokenized::AVGOON': 'Broadcom (Ondo Tokenized Stock)::AVGOON',
  'Chevron Ondo Tokenized::CVXON': 'Chevron (Ondo Tokenized Stock)::CVXON',
  'Chipotle Ondo Tokenized::CMGON': 'Chipotle (Ondo Tokenized Stock)::CMGON',
  'Circle Internet Group (Ondo Tokenized Stock)::CRCLon': 'Circle Internet Group (Ondo Tokenized Stock)::CRCLON',
  'Circle Internet Group Ondo Tokenized S::CRCLON': 'Circle Internet Group (Ondo Tokenized Stock)::CRCLON',
  'Cisco Systems Ondo Tokenized::CSCOON': 'Cisco Systems (Ondo Tokenized Stock)::CSCOON',
  'Coca Cola Ondo Tokenized::KOON': 'Coca-Cola (Ondo Tokenized Stock)::KOON',
  'Coinbase Ondo Tokenized::COINON': 'Coinbase (Ondo Tokenized Stock)::COINON',
  'Costco Ondo Tokenized::COSTON': 'Costco (Ondo Tokenized Stock)::COSTON',
  'D Wave Quantum Ondo Tokenized::QBTSON': 'D-Wave Quantum (Ondo Tokenized Stock)::QBTSON',
  'Disney Ondo Tokenized::DISON': 'Disney (Ondo Tokenized Stock)::DISON',
  'DoorDash Ondo Tokenized::DASHON': 'DoorDash (Ondo Tokenized Stock)::DASHON',
  'Eli Lilly Ondo Tokenized::LLYON': 'Eli Lilly (Ondo Tokenized Stock)::LLYON',
  'Equinix Ondo Tokenized::EQIXON': 'Equinix (Ondo Tokenized Stock)::EQIXON',
  'Figma Ord Shs Ondo Tokenized::FIGON': 'Figma Ord Shs (Ondo Tokenized Stock)::FIGON',
  'Futu Holdings Ondo Tokenized::FUTUON': 'Futu Holdings (Ondo Tokenized Stock)::FUTUON',
  'GameStop Ondo Tokenized::GMEON': 'GameStop (Ondo Tokenized Stock)::GMEON',
  'General Electric Ondo Tokenized::GEON': 'General Electric (Ondo Tokenized Stock)::GEON',
  'Goldman Sachs Ondo Tokenized::GSON': 'Goldman Sachs (Ondo Tokenized Stock)::GSON',
  'Hims Hers Health Ondo Tokenized::HIMSON': 'Hims & Hers Health (Ondo Tokenized Stock)::HIMSON',
  'IBM Ondo Tokenized::IBMON': 'IBM (Ondo Tokenized Stock)::IBMON',
  'Intel Ondo Tokenized::INTCON': 'Intel (Ondo Tokenized Stock)::INTCON',
  'Intuit Ondo Tokenized::INTUON': 'Intuit (Ondo Tokenized Stock)::INTUON',
  'Invesco QQQ ETF Ondo Tokenized ETF ::QQQON': 'Invesco QQQ ETF (Ondo Tokenized ETF)::QQQON',
  'JD com Ondo Tokenized::JDON': 'JD.com (Ondo Tokenized Stock)::JDON',
  'JPMorgan Chase Ondo Tokenized::JPMON': 'JPMorgan Chase (Ondo Tokenized Stock)::JPMON',
  'Lockheed Ondo Tokenized::LMTON': 'Lockheed (Ondo Tokenized Stock)::LMTON',
  'MARA Holdings Ondo Tokenized::MARAON': 'MARA Holdings (Ondo Tokenized Stock)::MARAON',
  'Marvell Technology Ondo Tokenized::MRVLON': 'Marvell Technology (Ondo Tokenized Stock)::MRVLON',
  'Mastercard Ondo Tokenized::MAON': 'Mastercard (Ondo Tokenized Stock)::MAON',
  'McDonald s Ondo Tokenized::MCDON': "McDonald's (Ondo Tokenized Stock)::MCDON",
  'MercadoLibre Ondo Tokenized::MELION': 'MercadoLibre (Ondo Tokenized Stock)::MELION',
  'Meta Platforms Ondo Tokenized::METAON': 'Meta Platforms (Ondo Tokenized Stock)::METAON',
  'MicroStrategy Ondo Tokenized::MSTRON': 'MicroStrategy (Ondo Tokenized Stock)::MSTRON',
  'Micron Technology (Ondo Tokenized Stock)::MUon': 'Micron Technology (Ondo Tokenized Stock)::MUON',
  'Micron Technology Ondo Tokenized::MUON': 'Micron Technology (Ondo Tokenized Stock)::MUON',
  'Microsoft Ondo Tokenized::MSFTON': 'Microsoft (Ondo Tokenized Stock)::MSFTON',
  'NVIDIA Ondo Tokenized::NVDAON': 'NVIDIA (Ondo Tokenized Stock)::NVDAON',
  'Netflix Ondo Tokenized::NFLXON': 'Netflix (Ondo Tokenized Stock)::NFLXON',
  'Nike Ondo Tokenized::NKEON': 'Nike (Ondo Tokenized Stock)::NKEON',
  'Novo Nordisk Ondo Tokenized::NVOON': 'Novo Nordisk (Ondo Tokenized Stock)::NVOON',
  'Ondo U S  Dollar Token::USDON': 'Ondo U.S. Dollar Token::USDON',
  'Ondo US Dollar Yield::USDY': 'USDY',
  'Oracle Ondo Tokenized::ORCLON': 'Oracle (Ondo Tokenized Stock)::ORCLON',
  'Palantir Technologies (Ondo Tokenized Stock)::PLTRon': 'Palantir Technologies (Ondo Tokenized Stock)::PLTRON',
  'Palantir Technologies Ondo Tokenized S::PLTRON': 'Palantir Technologies (Ondo Tokenized Stock)::PLTRON',
  'Palo Alto Networks Ondo Tokenized::PANWON': 'Palo Alto Networks (Ondo Tokenized Stock)::PANWON',
  'PayPal Ondo Tokenized::PYPLON': 'PayPal (Ondo Tokenized Stock)::PYPLON',
  'PepsiCo Ondo Tokenized::PEPON': 'PepsiCo (Ondo Tokenized Stock)::PEPON',
  'Petrobras Ondo Tokenized::PBRON': 'Petrobras (Ondo Tokenized Stock)::PBRON',
  'Pfizer Ondo Tokenized::PFEON': 'Pfizer (Ondo Tokenized Stock)::PFEON',
  'Procter   Gamble Ondo Tokenized::PGON': 'Procter & Gamble (Ondo Tokenized Stock)::PGON',
  'Qualcomm Ondo Tokenized::QCOMON': 'Qualcomm (Ondo Tokenized Stock)::QCOMON',
  'Reddit Ondo Tokenized::RDDTON': 'Reddit (Ondo Tokenized Stock)::RDDTON',
  'Riot Platforms Ondo Tokenized::RIOTON': 'Riot Platforms (Ondo Tokenized Stock)::RIOTON',
  'Robinhood Markets Ondo Tokenized::HOODON': 'Robinhood Markets (Ondo Tokenized Stock)::HOODON',
  'S P Global Ondo Tokenized::SPGION': 'S&P Global (Ondo Tokenized Stock)::SPGION',
  'SPDR S&P 500 ETF Ondo Tokenized ETF ::SPYON': 'SPDR S&P 500 ETF (Ondo Tokenized ETF)::SPYON',
  'Salesforce Ondo Tokenized::CRMON': 'Salesforce (Ondo Tokenized Stock)::CRMON',
  'ServiceNow Ondo Tokenized::NOWON': 'ServiceNow (Ondo Tokenized Stock)::NOWON',
  'SharpLink Gaming  Inc Ondo Tokenized S::SBETON': 'SharpLink Gaming, Inc (Ondo Tokenized Stock)::SBETON',
  'Shopify Ondo Tokenized::SHOPON': 'Shopify (Ondo Tokenized Stock)::SHOPON',
  'Snowflake Ondo Tokenized::SNOWON': 'Snowflake (Ondo Tokenized Stock)::SNOWON',
  'Spotify Ondo Tokenized::SPOTON': 'Spotify (Ondo Tokenized Stock)::SPOTON',
  'Starbucks Ondo Tokenized::SBUXON': 'Starbucks (Ondo Tokenized Stock)::SBUXON',
  'Super Micro Computer Ondo Tokenized::SMCION': 'Super Micro Computer (Ondo Tokenized Stock)::SMCION',
  'Tesla Ondo Tokenized::TSLAON': 'Tesla (Ondo Tokenized Stock)::TSLAON',
  'Toyota Ondo Tokenized::TMON': 'Toyota (Ondo Tokenized Stock)::TMON',
  'Uber Ondo Tokenized::UBERON': 'Uber (Ondo Tokenized Stock)::UBERON',
  'UnitedHealth Ondo Tokenized::UNHON': 'UnitedHealth (Ondo Tokenized Stock)::UNHON',
  'Visa Ondo Tokenized::VON': 'Visa (Ondo Tokenized Stock)::VON',
  'Walmart Ondo Tokenized::WMTON': 'Walmart (Ondo Tokenized Stock)::WMTON',
  'Wells Fargo Ondo Tokenized::WFCON': 'Wells Fargo (Ondo Tokenized Stock)::WFCON',
  'iShares Core S&P 500 ETF Ondo Tokenized::IVVON': 'iShares Core S&P 500 ETF (Ondo Tokenized ETF)::IVVON',
  'iShares Gold Trust Ondo Tokenized::IAUON': 'iShares Gold Trust (Ondo Tokenized Stock)::IAUON',
  'iShares MSCI EAFE ETF Ondo Tokenized E::EFAON': 'iShares MSCI EAFE ETF (Ondo Tokenized ETF)::EFAON',
  'iShares Russell 2000 ETF Ondo Tokenized::IWMON': 'iShares Russell 2000 ETF (Ondo Tokenized ETF)::IWMON',
  'iShares Silver Trust Ondo Tokenized::SLVON': 'iShares Silver Trust (Ondo Tokenized Stock)::SLVON',
  'iShares TIPS Bond ETF Ondo Tokenized E::TIPON': 'iShares TIPS Bond ETF (Ondo Tokenized ETF)::TIPON',

  // --- RWA fund cross-chain unification (2026-08). Same chain-1 name-truncation
  // defect as the Ondo block above (BUIDL), an issuer rename (USYC: Hashnote →
  // Circle; canonical follows the current issuer + the $2.9B BSC deployment),
  // a naming split (USCC) and casing/spacing splits (cUSDO). Impostors are NOT
  // aliased: `Re al US T Bill::USTB`, `BUIDL 404::BUIDL`, `dfohub::buidl`,
  // `Benji Bean::BENJI`, `cUSDO Ethereum::cUSDO` (unverified), Base
  // `US Yield Coin::USYC` (unverified).
  'BlackRock USD Institutional Digital Liq::BUIDL': 'BlackRock USD Institutional Digital Liquidity Fund::BUIDL',
  'Hashnote USYC::USYC': 'Circle USYC::USYC',
  'Superstate Crypto Carry Fund::USCC': 'Superstate USCC::USCC',
  'Compounding Open Dollar::cUSDO': 'Compounding Open Dollar::CUSDO',
  'Compounding OpenDollar::CUSDO': 'Compounding Open Dollar::CUSDO',

  // --- Midas LYT cross-chain unification (2026-08). Casing/name splits of the
  // canonical chain-1 groups, incl. Plasma's REVERSED `symbol::name` row for
  // mHYPER. Canonical = the chain-1 form the midas fetcher keys against.
  'Midas mBASIS::mBASIS': 'Midas mBASIS::MBASIS',
  'Midas mEDGE::mEDGE': 'Midas mEDGE::MEDGE',
  'Midas BTC Yield Token::mBTC': 'Midas mBTC::MBTC',
  'mHYPER::Midas Hyperithm': 'Midas Hyperithm::mHYPER',
  'Midas Hyperithm BTC::MHYPERBTC': 'Midas Hyperithm BTC::mHyperBTC',
  'Midas Re7 Yield::mRe7YIELD': 'Midas mRe7YIELD::MRE7YIELD',
  // OpenEden USDO spacing split (56/8453 vs the chain-1 form). NB the Avalanche
  // `MEV BTC::mevBTC` (0x1f8e769b…) is NOT aliased to Midas mevBTC — issuer
  // unverifiable (Midas API is Cloudflare-walled); same rule as the other
  // unverified rows.
  'OpenEden OpenDollar::USDO': 'OpenEden Open Dollar::USDO',

  // --- Distinct-asset unifications: a DIFFERENT asset that shares a ticker with a canonical
  // one, whose own variants are merged together WITHOUT touching the canonical group. ---
  // StaFi rETH — NOT Rocket Pool RETH; unify StaFi's variants into their own StaFi::rETH group.
  'StaFi Staked ETH::RETH': 'StaFi::rETH',
  'StaFi Staked ETH::rETH': 'StaFi::rETH',
  'StaFi (PoS)::rETH': 'StaFi::rETH',
  // USDD 2.0 — the live Maker-fork stablecoin (docs.usdd.io), native-minted on Ethereum
  // (0x4f8e5de4…) and BNB (0x45e51bc2…) and the asset under sUSDD. Its on-chain name DIFFERS
  // per chain ("Usdd Stablecoin" on 1, "Decentralized USD" on 56), and the legacy v1 token
  // holds `USDD::USDD` on both chains, so the Ethereum 2.0 deployment gets same-chain-deduped
  // to the suffixed group. Unify 2.0 under the BNB-derived group; v1 keeps `USDD::USDD`.
  'USDD::USDD::1::0': 'Decentralized USD::USDD',
}

export function aliasAssetGroup(gr: string) {
  return GROUP_ALIAS[gr] ?? gr
}
