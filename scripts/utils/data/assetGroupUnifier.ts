/** wrapped assets to overarching group */
export const GROUP_TO_GROUP_MAPPER: Record<string, string> = {
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
  // YO Protocol vaults — ONE vault per asset at ONE address on Ethereum, Base and
  // Arbitrum, with one share price (YoOracle) across all of them. CoinGecko lists only
  // one chain per vault ("Yield Optimizer USD"/YOUSD on Base, …), so every deployment
  // `onchain-fetch` adds arrives under its on-chain `name()::symbol()`. Arbitrum yoUSD
  // even answers `yoVaultUSD`. Canonical = the CoinGecko-named group that already holds
  // the issuer, risk and note overlays. (yoUSDT and yoTest have no CoinGecko row and
  // keep their on-chain groups.)
  'yoUSD::yoUSD': 'Yield Optimizer USD::YOUSD',
  'yoVaultUSD::yoUSD': 'Yield Optimizer USD::YOUSD',
  'yoETH::yoETH': 'Yield Optimizer ETH::YOETH',
  'yoBTC::yoBTC': 'Yield Optimizer BTC::YOBTC',
  'yoEUR::yoEUR': 'Yield Optimizer EUR::yoEUR',
  'yoUSD Edge::yoUSD Edge': 'Yield Optimizer USD Edge::YOUSDEDGE',
  'yoloETH::yoloETH': 'Yield Optimizer yoloETH::YOLOETH',
  // ether.fi Liquid vaults (Veda BoringVaults) — ONE vault per asset at one address on Ethereum,
  // Optimism, Base and Arbitrum. The Ethereum liquidETH row came in upper-cased
  // (`Ether.Fi Liquid ETH::LIQUIDETH`) and every deployment `onchain-fetch` adds arrives under
  // the on-chain `liquidETH` / `liquidUSD`. Canonical = the chain-1 form for liquidETH, and the
  // same casing for liquidUSD (margin-fetcher's `llamaGap.ts` keys both rates on these).
  'Ether.Fi Liquid ETH::liquidETH': 'Ether.Fi Liquid ETH::LIQUIDETH',
  'Ether.Fi Liquid USD::liquidUSD': 'Ether.Fi Liquid USD::LIQUIDUSD',
  // ether.fi eBTC (Veda BoringVault) — ONE vault at ONE address 0x657e…c642 on Ethereum,
  // Berachain, Arbitrum, Scroll and Corn. Ethereum / Berachain list the CoinGecko form
  // (`ether-fi-staked-btc`), the others the on-chain `ether.fi BTC::eBTC`. Canonical = the
  // chain-1 form, which carries the issuer and LST overlays. NOT Badger's eBTC (`eBTC::EBTC`,
  // 1: 0x661c…) nor Echo's eBTC on Monad (ADDRESS_GROUP_OVERRIDE).
  'ether.fi BTC::eBTC': 'Ether fi Staked BTC::EBTC',
  // Liminal (HyperEVM) — xHYPE's HyperEVM row is stored `xHYPE::XHYPE`; its LayerZero OFT copies on
  // Ethereum 0xac96…1e03 and Arbitrum 0xcffe…18e4 (peers of the HyperEVM adapter 0x0c01…0bd5)
  // arrive as `xHYPE::xHYPE`. xLEND takes its siblings' casing, the key `llamaGap.ts` uses.
  'xHYPE::xHYPE': 'xHYPE::XHYPE',
  'xLEND::xLEND': 'xLEND::XLEND',
  // BitFi bfBTC — ONE asset at two vanity addresses across eight chains (`0xCdFb…fb15`
  // on 1/1116/200901, `0x623F…d9DF` on 56/8453/43111/1672/239/2345). The external lists
  // uppercase the ticker (`BFBTC`) on 1/56/8453/1116/200901 while the on-chain `symbol()`
  // — which is what `onchain-fetch` writes for 43111/1672/239/2345 — is `bfBTC`, so one
  // asset arrived as two groups. Canonical = the uppercase form: it is the chain-1 form,
  // it is the majority of deployments, and it is the key the margin-fetcher rows and the
  // intrinsic-yield join must match (the Treehouse `tETH`/`TETH` lesson — that join is a
  // case-sensitive index, so the split reads as 0 % yield on whichever side loses).
  'BitFi Bitcoin::bfBTC': 'BitFi Bitcoin::BFBTC',
  // Saturn USDat / sUSDat — one asset per row at ONE address across its chains
  // (USDat `0x2323…` on 1 and `0x0Bb1…` on 56/143; sUSDat `0xd166…` on 1 and
  // `0x9cd5…` on 56/143), split into two groups because the deployments do not
  // agree on the NAME: Ethereum's USDat answers `name() == 'USDat'` while the
  // OFTs answer `'Saturn USD'`, and Ethereum's share is listed as
  // `Saturn sUSDat::SUSDAT` while the OFTs answer `'Staked Saturn USD'`.
  //
  // Canonical = the chain-1 form in both cases, because Ethereum is where the
  // only real vault is (the mirrors' 4626 surface reverts entirely) and it is
  // the key margin-fetcher's SAVINGS_REGISTRY row and `saturnFetcher` bind to.
  // Without this, Monad's ~6.08 M sUSDat and 31.1 M USDat read 0 % intrinsic
  // yield — the Cap `stcUSD` / Treehouse `tETH` lesson, since that join is a
  // case-sensitive index and the losing side simply reports nothing.
  'Staked Saturn USD::sUSDat': 'Saturn sUSDat::SUSDAT',
  'Saturn USD::USDat': 'Saturn Dollar::USDAT',
  // Nest vault shares — one OFT at ONE address per vault on every chain (rwa/rwaAssets.ts
  // `NEST_SHARES`), split into several groups because the deployments do not agree on the
  // NAME or the ticker's casing: nALPHA answers 'Nest Alpha Vault' on 1/8453/56/9745 and
  // 'Nest Institutional Alpha Vault' on World Chain, nBASIS 'Nest Basis' on 56/480/9745,
  // and Ethereum's nLCRD / nFALCON rows were listed upper-case. Canonical = the Plume form:
  // Plume is the hub (the vault, its accountant, every lending market on the share) and it
  // is the key the Morpho rows and the Solana mints (solana/solana.ts) already join.
  // (rwa/nestIdentity.ts now sets every Nest group outright; these stay for the group
  // strings older rows carried. nALPHA's canonical moved to the contract's own casing.)
  'Nest ALPHA Vault::nALPHA': 'Nest Alpha Vault::nALPHA',
  'Nest Institutional Alpha Vault::nALPHA': 'Nest Alpha Vault::nALPHA',
  'Nest Basis::nBASIS': 'Nest Basis Vault::nBASIS',
  'Nest Liquid Credit Vault::NLCRD': 'Nest Liquid Credit Vault::nLCRD',
  'Nest FalconX CLO::NFALCON': 'Nest FalconX CLO::nFALCON',
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
  // Origin wOETH — one asset: the Ethereum vault 0xdcee…2192 plus its bridged copies at
  // 0xd872…f839 on Arbitrum, Base and Plume. The lists spell those three ways (`WOETH` on 1 and
  // 42161, `wOETH` on 8453, `Bridged wOETH` on 98866), so the Base / Plume deployments never
  // reached the wOETH yield key. Canonical = the chain-1 form, which margin-fetcher's wOETH rate
  // is keyed on.
  'Wrapped OETH::wOETH': 'Wrapped OETH::WOETH',
  'Bridged wOETH::wOETH': 'Wrapped OETH::WOETH',
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
  // Tori strUSD / trUSD — the Ethereum vault stores `Tori Staked trUSD::STRUSD`
  // (name "Tori Staked trUSD"); the Monad (143, 9.2M strUSD, Morpho Blue
  // collateral in two USDC markets) and Pharos (1672) mirrors are bare
  // bridged ERC-20s named "Staked trUSD" whose 4626 surface reverts, so they
  // stored `Staked trUSD::strUSD` and read NO intrinsic yield, no savings and
  // no stablecoin props — the stcUSD trap again. Canonical is the Ethereum
  // form, the key `toriFetcher` and the SAVINGS_REGISTRY row use.
  'Staked trUSD::strUSD': 'Tori Staked trUSD::STRUSD',
  'trUSD::trUSD': 'Tori trUSD::TRUSD',
  // Tempo (4217) deployments of the same assets arrive from the chain's own registry with
  // the on-chain `symbol()` casing (`cUSD`, `reUSD`) or a re-ordered `name()`
  // ("InfiniFi Staked USD"), while every other chain stores the CoinGecko/majority form.
  // Same-asset unification only; the overlays below list the Tempo form as well because
  // they are looked up on the PRE-alias group.
  'Cap USD::cUSD': 'Cap USD::CUSD',
  'Re Protocol reUSD::reUSD': 'Re Protocol reUSD::REUSD',
  'InfiniFi USD::iUSD': 'infiniFi USD::iUSD',
  'InfiniFi Staked USD::siUSD': 'Staked infiniFi USD::siUSD',
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
  //   1            Savings crvUSD::SCRVUSD              (the only real vault)
  //   42161, 50    Savings crvUSD::scrvUSD              ← canonical
  //   8453         Superbridge Bridged scrvUSD::SCRVUSD (bridge-branded name)
  // Canonical is the on-chain casing the token itself answers (`scrvUSD`),
  // which is also what the majority of deployments store. Only Ethereum is a
  // vault — the other three are bare ERC-20s whose `asset()` and
  // `totalAssets()` revert — but that distinction belongs to margin-fetcher's
  // SAVINGS_REGISTRY, not to the group, which names an ASSET. Without these
  // the bridged rows read 0 % intrinsic yield.
  'Savings crvUSD::SCRVUSD': 'Savings crvUSD::scrvUSD',
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
  // Maple syrup* — the legacy Ethereum/Base/Arbitrum rows carry the March-2025 CoinGecko
  // casing (`SYRUPUSDC`) as their group, which is also the key of the savings/stablecoin
  // overlays. Newer deployments (Tempo) arrive with the on-chain name/symbol, and
  // `normalizeSymbol` strips the `sy` "bridged prefix" so they never match by symbol either.
  'Syrup USDC::syrupUSDC': 'SYRUPUSDC',
  'Syrup USDT::syrupUSDT': 'SYRUPUSDT',
  'Syrup USDG::syrupUSDG': 'SYRUPUSDG',
  // Arbitrum syrupUSDG (0xe1b0…c762) — Maple's CCIP BurnMintERC20 mirror (getCCIPAdmin
  // 0xdd2d…, pool 0x5355…b75f in the Arbitrum TokenAdminRegistry; same admin as the
  // Robinhood mirror). Its on-chain name is the bare ticker, so it stored `syrupUSDG::SYRUPUSDG`
  // and lost the savings / risk / notes overlays and margin-fetcher's intrinsic yield (0 % on
  // its Morpho collateral). Same asset → the mainnet group.
  'syrupUSDG::SYRUPUSDG': 'SYRUPUSDG',
  // --- Cross-chain splits found by the 2026-10-22 CoinGecko-platform sweep (same coin id, same
  // contract identity read on-chain, different group per chain) ---
  // Reserve eUSD on Arbitrum (0x1227…b844): Arbitrum standard-gateway token, `l1Address()` =
  // mainnet eUSD 0xa0d6…482f; named "Electronic Dollar" so it grouped apart and lost the
  // stablecoin / issuer overlays.
  'Electronic Dollar::eUSD': 'Electronic USD::EUSD',
  // Angle EURA on Linea (same address 0x1a7e…bce8 as mainnet; on-chain name "EURA") and on
  // Polygon zkEVM (0xa61b…25b4, "EURA (previously agEUR)") — every other deployment is `EURA`.
  'EURA::EURA': 'EURA',
  'EURA (previously agEUR)::EURA': 'EURA',
  // Hamilton Lane HLSCOPE — Ethereum / OP rows carry a 39-char truncated list name; same
  // Securitize token (owner 0x59c1…76ee) as Polygon's full-name group.
  'Hamilton Lane Senior Credit Opportuniti::HLSCOPE':
    'Hamilton Lane Senior Credit Opportunities Securitize Fund::HLSCOPE',
  // deJTRSY on Monad was listed under the fund's long name; on-chain it answers "JTRSY deRWA"
  // like 1 / 8453 / 196.
  'DeFi Janus Henderson Anemoy Treasury Fund Token::deJTRSY': 'JTRSY deRWA::DEJTRSY',
  // MetaMask USD (0xaca9…35da, same address everywhere): Linea's list name still says "(Test)"
  // while `name()` reads "MetaMask USD" (5.78M supply), and Monad's group is upper-cased.
  'MetaMask USD (Test)::mUSD': 'MetaMask USD::mUSD',
  'MetaMask USD::MUSD': 'MetaMask USD::mUSD',
  // Tether Gold XAUt0 on BNB (0x21ca…a3bf) — the one XAUt0 deployment the OFT registry does
  // not carry, so the mesh unification (oft/mesh-groups.json) cannot reach it. Same coin as
  // every other XAUt0: CoinGecko files it under `tether-gold-tokens` exactly as it does
  // Arbitrum's and HyperEVM's XAUt0, and `name()` / `symbol()` answer "Tether Gold" / "XAUt".
  'Tether Gold::XAUt0': 'Tether Gold::XAUt',
  // NetNet sNET (Robinhood Chain 0xb773…a4c7) — rebasing stake of NET, always 1:1 with NET
  // (the stETH/ETH shape). wsNET is the non-rebasing wrap (sNET × index) and keeps its own
  // group `Wrapped Staked NET::wsNET`; merging it here would price it with NET's feed.
  'Staked NET::sNET': 'NetNet::NET',
  // Axis USDx (Ethereum 0xa1fa…33f8, the asset under `Staked Axis USD::SUSDX`) — its on-chain
  // name is the bare ticker "USDx", so it stored the unqualified group `USDx::USDx` in a ticker
  // space it shares with dForce's USDx and Stables Labs' / Hex Trust's USDX. Qualified to the
  // issuer's name so no other USDx can ever join it. NOT a merge of two assets.
  'USDx::USDx': 'Axis USD::USDx',
  // Strata srUSDat on Monad (0x17b8…b3fa) — a LayerZero OFT of the Ethereum senior tranche
  // (the Ethereum adapter locks exactly the Monad supply; risk-data 2026-10-16), stored under
  // its bare on-chain `srUSDat::srUSDat`. Same asset → the Ethereum group, which the savings /
  // stablecoin / issuer overlays and margin-fetcher's `SRUSDAT_KEY` already key.
  'srUSDat::srUSDat': 'Strata Senior USDat::SRUSDAT',
  // Hyperwave hwHLP — ONE OFT at one address (0x9fd7…72d1) on Ethereum and HyperEVM; chain 1
  // stores `hwHLP::hwHLP` (on-chain name "hwHLP"), 999 `Hyperwave HLP::hwHLP`. Canonical = the
  // HyperEVM (home-chain, CoinGecko-named) form.
  'hwHLP::hwHLP': 'Hyperwave HLP::hwHLP',
  // Swell swETH — Arbitrum's bridged row (0xbc01…cf18) stores the on-chain casing `swETH`,
  // Ethereum the CoinGecko `SWETH`. Canonical = Ethereum's, the LST / issuer / yield key.
  'Swell Ethereum::swETH': 'Swell Ethereum::SWETH',
  // Morini Capital vaults on Ethereum (Piku) — the chain-1 rows were seeded from CoinGecko,
  // which stores a symbol TRUNCATED to 20 characters and UPPER-CASED. `1.json` now carries the
  // on-chain `symbol()` (read 2026-10-19); the old CoinGecko groups fold into it so a row or a
  // downstream join still keyed on them lands on the same asset.
  'Morini CarryTradeUSDTRYLeverage Vault::CARRYTRADEUSDTRYLEVE':
    'Morini CarryTradeUSDTRYLeverage Vault::CarryTradeUSDTRYLeverage',
  'Morini StockMarketTRBasisTrade Vault::STOCKMARKETTRBASISTR':
    'Morini StockMarketTRBasisTrade Vault::StockMarketTRBasisTrade',
  'Morini FXArbUSDTRY::AFXARBUSDTRY': 'Morini FXArbUSDTRY::aFXArbUSDTRY',
  // Alchemix alUSD / alETH — one asset per ticker, split by CASING only: Ethereum (and
  // Fantom, and Arbitrum's alUSD) store the CoinGecko form `ALUSD` / `ALETH`, while Optimism,
  // Arbitrum's alETH, Metis and Linea store the on-chain `symbol()` `alUSD` / `alETH`. The L2
  // deployments are Alchemix's own cross-chain canonical alAssets — OP and Arbitrum alUSD AND
  // alETH run the SAME implementation bytecode (read 2026-10-19), Metis and Linea an earlier
  // version of it — and Alchemix v3's L2 Alchemists mint them as debt (data-sdk alchemix.ts),
  // so they are the asset the chain-1 group names. Canonical = the chain-1 form (the
  // stablecoin overlay key `Alchemix USD::ALUSD` and every price row already use it).
  // NOT folded: Arbitrum's `0x95d2…f84e` — a STANDARD Arbitrum-gateway bridge token of L1
  // alUSD (`l1Address()` = mainnet alUSD, `l2Gateway()` = Arbitrum's ERC20 gateway, 10 alUSD
  // supply), which Alchemix's contracts do not accept; it gets its own group below
  // (ADDRESS_GROUP_OVERRIDE). And Base `alUSDb` ("Alchemic USD Base") is a separate asset.
  'Alchemix USD::alUSD': 'Alchemix USD::ALUSD',
  'Alchemix ETH::alETH': 'Alchemix ETH::ALETH',
  // Elixir deUSD / sdeUSD — Ethereum, Plasma and Berachain list the Elixir-named group, while
  // Reya, Arbitrum, Avalanche (and Linea) list the bare on-chain `deUSD` / `Staked deUSD`, which
  // knownAssets' exact-name `DEUSD` rule turned into a second group. Same product: the DEX lists
  // (Camelot, Trader Joe, Balancer) serve them with Elixir's logo, risk-data flags every one of
  // them COMPROMISED with the Ethereum rows, and no other deUSD exists. CoinGecko has delisted
  // the coin and the LayerZero peers were cleared at the wind-down, so no feed can join them.
  // Canonical = the chain-1 form, which carries the issuer and stablecoin overlays.
  DEUSD: 'Elixir deUSD::DEUSD',
  'deUSD::deUSD': 'Elixir deUSD::DEUSD',
  'Staked deUSD::sdeUSD': 'Elixir Staked deUSD::SDEUSD',
  // Overnight USD+ family — one product per ticker, deployed per chain; the Linea / Base rows
  // carry the bare `name()` and split off from the Overnight-named group.
  'USDT+::USDT+': 'Overnight.fi USDT+::USDT+',
  'DAI+::DAI+': 'Overnight.fi DAI+::DAI+',
  // CROSS-CHAIN SPLITS (scouted 2026-10-23). One asset filed under two `name::symbol` keys
  // because the source lists disagree on the NAME's punctuation or the ticker's casing, or one
  // list carries the bare ticker. Each pair is backed by evidence, never by the ticker alone:
  // `addr:` = the SAME contract address carries both groups on different chains; `cg:` =
  // CoinGecko's platform map puts both deployments under one coin. Kept only when the merged
  // group would still hold ONE address per chain, and never for a PulseChain (369) row — a
  // state-fork copy of an Ethereum address is not that asset. Canonical = a bare group, else
  // the chain-1 form (the convention above), else the most chains.
  '0xBitcoin::0XBTC': '0XBTC', // 137,8453 -> 1,10,42161 (cg:oxbitcoin)
  'OneArt::1ART': '1ART', // 1,250 -> 137,56 (addr:0xd3c32584)
  'aBTC::aBTC': 'ABTC', // 21000000,34443 -> 1116,200901,4200,59144 (addr:0x7a087e75)
  'Acria.AI::ACRIA': 'Acria AI::ACRIA', // 56 -> 1 (addr:0x44f5909e)
  'Agua Global Carry Vault::aguaUSDCgc': 'Agua Global Carry Vault::AGUAUSDCGC', // 143 -> 1 (cg:agua-global-carry-vault)
  'ALEX::ALEX': 'ALEX', // 42161 -> 1,34443 (addr:0xdfd06600)
  'Alethea AI::ALI': 'ALI', // 25 -> 1,130,137,42161,8453 (cg:alethea-artificial-liquid-intelligence-token)
  'Dexalot Token::ALOT': 'ALOT', // 43114 -> 42161,56,8453 (cg:dexalot)
  'Alvey Chain::wALV': 'Alvey Chain::WALV', // 56 -> 1,4663 (addr:0x256d1fce)
  'Ankr Staked BNB::ankrBNB': 'Ankr Staked BNB::ANKRBNB', // 56 -> 204 (cg:ankr-staked-bnb)
  'Anzen Staked USDz::sUSDz': 'Anzen Staked USDz::SUSDZ', // 42161 -> 1,169,81457,8453 (cg:anzen-staked-usdz)
  'Ape ETH::ApeETH': 'Ape ETH::apeETH', // 42161 -> 33139 (addr:0xcf800f49)
  'Arcana arcUSD::ARCUSD': 'Arcana arcUSD::arcUSD', // 8453 -> 10,56 (addr:0xaec9e50e)
  'Argentine Peso::wARS': 'Argentine Peso::WARS', // 137 -> 1,100,5042,56,8453,999 (addr:0x0dc4f928)
  'Arianee::ARIA20': 'ARIA20', // 137 -> 1,8453 (cg:arianee)
  'ARYZE eEUR::eEUR': 'ARYZE eEUR::EEUR', // 137 -> 1 (addr:0x735fa792)
  'ARYZE eGBP::eGBP': 'ARYZE eGBP::EGBP', // 137,56 -> 1 (addr:0xd711d7d8)
  'ARYZE eUSD::eUSD': 'ARYZE eUSD::EUSD', // 137,56 -> 1,59144 (addr:0xa4335da3)
  'Aurora::Aurora': 'Aurora::AURORA', // 1313161554 -> 1,25 (cg:aurora-near)
  'AxCNH::AxCNH': 'AxCNH::AXCNH', // 1030 -> 1 (cg:axcnh)
  'Backed ERNX Bond::BERNX': 'Backed ERNX € Bond::bERNX', // 100 -> 137,56 (addr:0x3f95aa88)
  'Backed GameStop Corp::bGME': 'Backed GameStop Corp::BGME', // 137 -> 1,100,42161,43114,8453 (addr:0x7212088a)
  'Badger::BADGER': 'BADGER', // 250 -> 1,100,130,137,42161 (cg:badger-dao)
  'Bankless DAO::BANK': 'BANK', // 137,42161 -> 1,10 (cg:bankless-dao)
  'Beluga.fi::BELUGA': 'Beluga fi::BELUGA', // 56 -> 250 (cg:beluga-fi)
  'Franklin Templeton BENJI::BENJI': 'BENJI', // 1 -> 137,42161,43114,8453 (cg:franklin-templeton-benji)
  'Backed ERNA Bond::BERNA': 'BERNA', // 100 -> 1,137,42161,43114,56,8453 (addr:0x0f76d32c)
  'Backed HIGH   High Yield Corp Bond::BHIGH': 'BHIGH', // 43114 -> 1,100,137,42161,56,8453 (addr:0x20c64dee)
  'Backed IB01 Treasury Bond 0 1yr::BIB01': 'BIB01', // 42161 -> 1,100,137,43114,56,8453 (addr:0xca30c93b)
  'Backed IBTA Treasury Bond 1 3yr::BIBTA': 'BIBTA', // 42161 -> 1,100,137,43114,56,8453 (addr:0x52d134c6)
  'Beefy::BIFI': 'BIFI', // 1,43114 -> 1285,250 (addr:0xd6070ae9)
  'BlazeX::BlazeX': 'BlazeX::BLAZEX', // 56 -> 1 (addr:0xdd1b6b25)
  'Blind Boxes::BLES': 'BLES', // 137 -> 1,56 (cg:blind-boxes)
  'BNS.Finance::BNSD': 'bns.finance::BNSD', // 56 -> 1 (cg:bnsd-finance)
  'bobcoin::BOBC': 'Bobcoin::BOBC', // 137 -> 1,43114,56 (addr:0x590eb292)
  'Forj::BONDLY': 'BONDLY', // 137 -> 1,56 (cg:bondly)
  'Brazilian real::wBRL': 'Brazilian real::WBRL', // 137 -> 1,100,5042,56,8453,999 (addr:0xd76f5faf)
  'BRC-20 DEX::BD20': 'BRC 20 DEX::BD20', // 56 -> 1 (addr:0x312d4388)
  'BTC Proxy::BTCpx': 'BTC Proxy::BTCPX', // 137 -> 1 (addr:0x9c32185b)
  'Buying.com::BUY': 'Buying com::BUY', // 56 -> 1 (cg:buying)
  'Cere Network::CERE': 'CERE Network::CERE', // 137 -> 1,8453 (addr:0x2da719db)
  'CyberFi::CFI': 'CFI', // 137,250 -> 1,56 (addr:0x6a545f9c)
  'Chilean Peso::wCLP': 'Chilean Peso::WCLP', // 137 -> 1,100,5042,56,8453,999 (addr:0x61d450a0)
  'Choise.ai::CHO': 'Choise ai::CHO', // 56 -> 1 (cg:choise)
  'Clover::CLV': 'CLV', // 1 -> 130,56 (cg:clover-finance)
  'Colombian Peso::wCOP': 'Colombian Peso::WCOP', // 137 -> 1,100,5042,56,8453,999 (addr:0x8a1d45e1)
  'CoW Protocol Token::COW': 'COW', // 8453 -> 1,100,130,137,42161,56 (cg:cow-protocol)
  'Croginal Cats::Croginal': 'Croginal Cats::CROGINAL', // 25 -> 8453 (cg:croginal-cats)
  'Cross-Chain Bridge::BRIDGE': 'Cross Chain Bridge::BRIDGE', // 137,56 -> 1,250,43114 (addr:0x92868a52)
  'crvUSD::CRVUSD': 'CRVUSD', // 252 -> 1,10,100,137,146,167000… (cg:crvusd)
  'CryptoArt.ai::CART': 'CryptoArt Ai::CART', // 56 -> 1 (addr:0x5c8c8d56)
  'CryptoCart V2::CCv2': 'CryptoCart V2::CCV2', // 56 -> 1 (addr:0x612e1726)
  'Davos.xyz USD::DUSD': 'Davos xyz USD::DUSD', // 10,137,56,59144 -> 1,1101,34443,42161,5000,81457… (addr:0x8ec18776)
  'DedaCoin::Deda': 'DedaCoin::DEDA', // 56 -> 1 (addr:0x15f9eb4b)
  'Defi money::MONEY': 'Defi.money::MONEY', // 42161 -> 10 (addr:0x69420f9e)
  'Bridged USDC (deBridge)::deUSDC': 'DEUSDC', // 137 -> 42161,43114,56 (addr:0x1ddcaa4e)
  'Memento::DEXTF': 'DEXTF', // 8453 -> 1,324,42161,43114 (cg:dextf)
  'dHEDGE DAO::DHT': 'DHT', // 137 -> 1,10,42161,8453 (cg:dhedge-dao)
  'DOLZ.io::DOLZ': 'DOLZ io::DOLZ', // 137 -> 1,8453 (cg:dolz-io)
  '1DSLA::DSLA': 'DSLA', // 1666600000 -> 1,250,42161,43114,56,59144 (cg:stacktical)
  'dTrinity Staked dUSD::SDUSD': 'dTRINITY Staked dUSD::SDUSD', // 252 -> 1 (cg:dtrinity-staked-dusd)
  'Dubbz::Dubbz': 'Dubbz::DUBBZ', // 137 -> 8453 (addr:0x38029c62)
  'Dusk::DUSK': 'DUSK', // 56 -> 1,42161 (cg:dusk-network)
  'Dyl::Dyl': 'Dyl::DYL', // 137 -> 1,8453 (addr:0x4a506181)
  'EternalAI::EAI': 'EAI', // 1,8453 -> 33139,42161 (addr:0x4b6bf1d3)
  'EURC::EURC': 'EURC', // 10,25,480,5042 -> 1,130,137,42161,43114,8453 (cg:euro-coin)
  'EUROe Stablecoin::EUROe': 'EUROe Stablecoin::EUROE', // 10,137 -> 1,42161,43114 (addr:0x820802fa)
  'Function ƒBTC::FBTC': 'FBTC', // 56 -> 1,1329,146,42161,5000,60808… (addr:0xc96de260)
  'Fluid USDC::fUSDC': 'Fluid USDC::FUSDC', // 42161 -> 1 (cg:fluid-usdc)
  'Flying Tulip USD::ftUSD': 'Flying Tulip USD::FTUSD', // 146 -> 1 (addr:0xf7d85ec4)
  'FOOM::FOOM': 'Foom::FOOM', // 8453 -> 1 (cg:foom)
  'handle.fi::FOREX': 'FOREX', // 137 -> 1,42161 (addr:0xdb298285)
  'ShapeShift FOX::FOX': 'FOX', // 100 -> 1,10,130,137,1666600000,42161… (cg:shapeshift-fox-token)
  'Gauntlet USD Alpha::gtUSDa': 'Gauntlet USD Alpha::GTUSDA', // 10 -> 1,42161,8453 (addr:0x00000000)
  'GHO::GHO': 'GHO', // 57073 -> 1,100,143,196,42161,43114… (addr:0xfc421ad3)
  'Goat Network::GOATED': 'GOAT Network::GOATED', // 2345 -> 56 (cg:goat-network)
  'GOG::GOG': 'GOG', // 13371 -> 1,42161 (cg:guild-of-guardians)
  'HANePlatform::HANeP': 'HANePlatform::HANEP', // 10,42161,8453 -> 1 (cg:haneplatform)
  'HEGIC::HEGIC': 'HEGIC', // 42161 -> 1,137,250 (cg:hegic)
  'Hot Cross::HOTCROSS': 'HOTCROSS', // 1,43114 -> 56 (cg:hot-cross)
  'hwUSD::hwUSD': 'hwUSD::HWUSD', // 999 -> 1,8453 (addr:0xa2f8da4a)
  'HYB deRWA::deHYB': 'HYB deRWA::DEHYB', // 10 -> 1,196 (addr:0xc5a9f6ed)
  'HyperCycle::HyPC': 'HyperCycle::HYPC', // 56 -> 1 (cg:hypercycle)
  'Impossible Decentralized Incubator::IDIA': 'IDIA', // 56 -> 1285,42161,43114 (cg:idia)
  'iDypius::iDYP': 'iDypius::IDYP', // 56 -> 1,43114 (addr:0xbd100d06)
  'iFARM::iFARM': 'iFARM::IFARM', // 42161 -> 1,8453 (cg:ifarm)
  'Inception Restaked slisBNB::inslisBNB': 'Inception Restaked slisBNB::INSLISBNB', // 56 -> 1 (cg:inception-restaked-slisbnb)
  'INSPECT::INSP': 'Inspect::INSP', // 56 -> 1 (cg:inspect)
  'IronBank::IB': 'Iron Bank::IB', // 10 -> 250 (addr:0x00a35fd8)
  'Izumi Finance::IZI': 'IZI', // 1 -> 137,169,324,42161,534352,56… (cg:izumi-finance)
  'iZUMi Token::iZi': 'IZI', // 5000 -> 137,169,324,42161,534352,56… (addr:0x60d01ec2)
  'Kaizen.Finance::KZEN': 'Kaizen Finance::KZEN', // 137,56 -> 1 (addr:0x45500031)
  'Kalmar::KALM': 'KALM', // 56 -> 250,43114 (cg:kalmar)
  'KGEN::KGEN': 'KGeN::KGEN', // 56 -> 8453 (addr:0xf3d5b4c3)
  'KiiChain::KII': 'Kiichain::KII', // 5000,56 -> 1,137,8453 (addr:0xeec6574e)
  'Kyte.One::KTE': 'Kyte One::KTE', // 56 -> 43114 (cg:kyte-one)
  'LightSpeed::Speed': 'Lightspeed::SPEED', // 10 -> 1,42161,8453 (addr:0xb01cf1be)
  'Lightspeed::Speed': 'Lightspeed::SPEED', // 137,56 -> 1,42161,8453 (addr:0xb01cf1be)
  // Liquity BOLD — two generations share `name::symbol`. 0x087c… is the CCIP mirror of the
  // RETIRED Jan-2025 BOLD (see ADDRESS_GROUP_OVERRIDE); the live redeploy's mirrors at
  // 0x0356…b01d (OP/Base/Arb/Avax/Scroll) and Sonic 0xf05a… answer "BOLD Stablecoin".
  'Liquity BOLD::Bold': 'Liquity BOLD v1 (superseded)::BOLD', // 10 (addr:0x087c440f)
  'BOLD Stablecoin::BOLD': 'Liquity BOLD::BOLD', // 10,146,42161,43114,534352,8453 -> 1 (ccip:0xf05a2074 pool)
  'Lucky Block::LBlock': 'Lucky Block::LBLOCK', // 56 -> 1 (cg:lucky-block)
  "Merlin's Seal BTC::M-BTC": 'M-BTC', // 2222 -> 1,1135,1329,167000,324,34443… (addr:0x59889b70)
  'MaziMatic::Mazi': 'MaziMatic::MAZI', // 56 -> 1 (addr:0x5b8650cd)
  'Melega::MARCO': 'MELEGA::MARCO', // 56 -> 137,4663,5042 (cg:melega)
  'Metronome Synth USD::MSUSD': 'Metronome Synth USD::msUSD', // 8453 -> 1,10,43111,9745 (cg:metronome-synth-usd)
  'Mexican Peso::wMXN': 'Mexican Peso::WMXN', // 137 -> 1,100,5042,56,8453,999 (addr:0x337e7456)
  'Mezo::MEZO': 'MEZO::MEZO', // 56,8453 -> 1 (addr:0x8e4cbbcc)
  'Midas Fasanara Global Open::mGLO': 'Midas Fasanara Global Open::MGLO', // 10 -> 1,4663,8453 (cg:midas-fasanara-global-open)
  'MiL k::MLK': 'MiL.k::MLK', // 56 -> 42161 (addr:0x374c5fb7)
  'MAI::MIMATIC': 'MIMATIC', // 1101,8217 -> 10,100,1088,1284,1285,1313161554… (addr:0x3f56e0c3)
  'Molandak::MOLANDAK': 'MOLANDAK::MOLANDAK', // 42161 -> 143,8453 (addr:0xa170eaa9)
  'Monerium EUR emoney::EURe': 'Monerium EUR emoney::EURE', // 137,8453 -> 1,100,42161,534352,59144 (cg:monerium-eur-money-2)
  'Minted Token::MTD': 'MTD', // 25 -> 1 (cg:minted)
  'MX::MX': 'MX', // 1 -> 2818,56 (cg:mx-token)
  'Non-Playable Coin::NPC': 'Non Playable Coin::NPC', // 4663,56 -> 1,8453 (cg:non-playable-coin)
  'NvirWorld::Nvir': 'NvirWorld::NVIR', // 56 -> 1 (addr:0x9d71ce49)
  'O3 Swap Token::O3': 'O3', // 42161,42220 -> 1,10,137,250,43114,56 (addr:0xee980166)
  'Origin Token::OGN': 'OGN', // 146 -> 1,130,137,25,42161,8453 (cg:origin-protocol)
  'OGzClub::OGz': 'OGzClub::OGZ', // 56 -> 1 (addr:0xb7bda6a8)
  'OpenUSDT::oUSDT': 'OpenUSDT::OUSDT', // 10,1088,146,5000,59144 -> 130,1868,252,34443,8453 (addr:0x1217bfe6)
  'openUSDT::oUSDT': 'OpenUSDT::OUSDT', // 60808 -> 130,1868,252,34443,8453 (addr:0x1217bfe6)
  'Orion::ORN': 'ORN', // 56 -> 1,130,137,42161 (cg:orion-protocol)
  'Overnight.fi USDT+::USDT+': 'Overnight.fi USDT::USDT+', // 56 -> 42161 (cg:usdtplus)
  'Paint Swap::BRUSH': 'PaintSwap::BRUSH', // 250 -> 146 (cg:paint-swap)
  'Peruvian Sol::wPEN': 'Peruvian Sol::WPEN', // 137 -> 1,100,5042,56,8453,999 (addr:0x4f34c8b3)
  'Penpie Token::PNP': 'PNP', // 42161,56 -> 1,10 (cg:penpie)
  'Portal To Bitcoin::PTB': 'Portal to Bitcoin::PTB', // 56 -> 1 (cg:portal-to-bitcoin)
  ' QIAN second generation dollar::QSD': 'QIAN second generation dollar::QSD', // 42161 -> 56 (addr:0x07aaa29e)
  'QuickSwap::QUICK': 'QUICK', // 8453 -> 1,1101,130,137,169,2000 (cg:quickswap)
  'RARI::RARI': 'RARI', // 1380012617,8453 -> 1,130,137,42161 (cg:rarible)
  'RealToken S 13895 Saratoga St Detroit MI::REALTOKEN-S-13895-SARATOGA-ST-DETROIT-MI':
    'RealToken S 13895 Saratoga st Detroit MI::REALTOKEN-S-13895-SARATOGA-ST-DETROIT-MI', // 100 -> 1 (addr:0x6f442da5)
  'RealToken S 14078 Carlisle St Detroit MI::REALTOKEN-S-14078-CARLISLE-ST-DETROIT-MI':
    'RealToken S 14078 Carlisle st Detroit MI::REALTOKEN-S-14078-CARLISLE-ST-DETROIT-MI', // 100 -> 1 (addr:0x315699f1)
  'RealToken S 14319 Rosemary St Detroit MI::REALTOKEN-S-14319-ROSEMARY-ST-DETROIT-MI':
    'RealToken S 14319 Rosemary st Detroit MI::REALTOKEN-S-14319-ROSEMARY-ST-DETROIT-MI', // 100 -> 1 (addr:0x41599149)
  'RealToken S 15796 Hartwell St Detroit MI::REALTOKEN-S-15796-HARTWELL-ST-DETROIT-MI':
    'RealToken S 15796 Hartwell st Detroit MI::REALTOKEN-S-15796-HARTWELL-ST-DETROIT-MI', // 100 -> 1 (addr:0xb3d3c1bb)
  'RealToken S 17813 Bradford St Detroit MI::REALTOKEN-S-17813-BRADFORD-ST-DETROIT-MI':
    'RealToken S 17813 Bradford st Detroit MI::REALTOKEN-S-17813-BRADFORD-ST-DETROIT-MI', // 100 -> 1 (addr:0x499a6c19)
  'RealToken S 18273 Monte-Vista St Detroit MI::REALTOKEN-S-18273-MONTEVISTA-ST-DETROIT-MI':
    'RealToken S 18273 Monte Vista St Detroit MI::REALTOKEN-S-18273-MONTEVISTA-ST-DETROIT-MI', // 100 -> 1 (addr:0x9856c5ca)
  'RealToken S 2703-2705 W Grand St Detroit MI ::REALTOKEN-S-2703-2705-W-GRAND-ST-DETROIT-MI':
    'RealToken S 2703-2705 W Grand St Detroit MI::REALTOKEN-S-2703-2705-W-GRAND-ST-DETROIT-MI', // 1 -> 100 (addr:0x994c6981)
  'RealToken S 4380 Beaconsfield St Detroit MI::REALTOKEN-S-4380-BEACONSFIELD-ST-DETROIT-MI':
    'RealToken S 4380 Beaconsfield st Detroit MI::REALTOKEN-S-4380-BEACONSFIELD-ST-DETROIT-MI', // 100 -> 1 (addr:0x96700ffa)
  'Redstone::RED': 'RedStone::RED', // 8453 -> 1 (cg:redstone-oracles)
  'Rejuve.AI::RJV': 'Rejuve AI::RJV', // 56 -> 1 (cg:rejuve-ai)
  'Rezerve Money::RZR': 'Rezerve.money::RZR', // 42161,8453 -> 1,146 (addr:0xb4444468)
  'Rogue MAV::rMAV': 'Rogue MAV::RMAV', // 56 -> 1,324,8453 (addr:0x8f0f5647)
  'SeedifyFund::SFUND': 'Seedify fund::SFUND', // 42161 -> 1 (addr:0x560363bd)
  'saffron.finance::SFI': 'SFI', // 42161,4663 -> 1,137 (cg:saffron-finance)
  'Savings GYD::sGYD': 'SGYD', // 100 -> 1,10,137,42161,43114 (addr:0xea50f402)
  'Symbiosis::SIS': 'SIS', // 4663 -> 1,324,42161,534352,56,59144 (cg:symbiosis-finance)
  'Skibidi Dop Dop::Skibidi': 'Skibidi Dop Dop::SKIBIDI', // 56 -> 1,8453 (cg:skibidi-dop-dop)
  'Slimex::SLX': 'SLIMEX::SLX', // 56 -> 8217 (cg:slimex)
  'SMARDEX::SDEX': 'SmarDex::SDEX', // 137,56 -> 1,42161,8453 (cg:smardex)
  'Heco-Peg SNX Token::SNX': 'SNX', // 128 -> 1,10,130,137,1666600000,25… (cg:havven)
  'Solv Protocol BTC::SOLVBTC': 'SOLVBTC', // 30 -> 1,1329,137,143,146,167000… (addr:0x541fd749)
  'SOMBRA::SMBR': 'Sombra::SMBR', // 56 -> 1 (addr:0x16b3e050)
  'SpacePi Token::SpacePi': 'SpacePi Token::SPACEPI', // 56 -> 1 (addr:0x69b14e8d)
  'Spectra [OLD]::APW': 'Spectra (OLD)::APW', // 137 -> 1 (cg:apwine)
  'Spiko Amundi Overnight Swap Fund (CHF)::chfSAFO': 'Spiko Amundi Overnight Swap Fund (CHF)::CHFSAFO', // 137 -> 1,42161,42793,8453 (cg:spiko-amundi-overnight-swap-fund-chf)
  'Spiko Amundi Overnight Swap Fund (EUR)::eurSAFO': 'Spiko Amundi Overnight Swap Fund (EUR)::EURSAFO', // 137 -> 1,42161,42793,8453 (cg:spiko-amundi-overnight-swap-fund-eur)
  'Spiko Amundi Overnight Swap Fund (GBP)::gbpSAFO': 'Spiko Amundi Overnight Swap Fund (GBP)::GBPSAFO', // 137 -> 1,42161,42793,8453 (cg:spiko-amundi-overnight-swap-fund-gbp)
  'Spiko Digital Assets Cash & Carry Fund - Euro Share Class::eurSPKCC':
    'Spiko Digital Assets Cash & Carry Fund - Euro Share Class::EURSPKCC', // 137 -> 1,42161,8453 (cg:spiko-digital-assets-cash-carry-fund-euro-share-class)
  'Spiko EU T-Bills Money Market Fund::EUTBL': 'Spiko EU T Bills Money Market Fund::EUTBL', // 137 -> 1,42161,42793,8453 (addr:0xa0769f7a)
  'Spiko US T-Bills Money Market Fund::USTBL': 'Spiko US T Bills Money Market Fund::USTBL', // 137 -> 1,42161,42793,8453 (addr:0xe4880249)
  'sPOL::sPOL': 'sPOL::SPOL', // 137 -> 1 (cg:spol)
  'Stable.com USD3::USD3': 'Stable com USD3::USD3', // 137,56 -> 1,42161,43114 (addr:0x046029f6)
  'Stake Token::STAKE': 'STAKE', // 100 -> 1,137,42161 (cg:xdai-stake)
  'SUBHUB::SUBHUB': 'SubHub::SUBHUB', // 56 -> 8453 (addr:0x9efdae4d)
  'Sumerian BTC::suBTC': 'SUBTC', // 200901,2345,810180 -> 1,1116,143,223,42161,43111… (addr:0xe85411c0)
  'Sumerian ETH::suETH': 'SUETH', // 143,2345,43111 -> 82 (addr:0x1c22531a)
  'Sumerian suETH::SUETH': 'SUETH', // 42161,8453 -> 82 (addr:0x1c22531a)
  'SuperVerse::SUPER': 'SUPER', // 1868,43114,8453 -> 1,130,137,42161,56 (cg:superfarm)
  'sUSDS::sUSDS': 'sUSDS::SUSDS', // 10 -> 1,42161,8453 (cg:susds)
  'Wrapped sUSDX::sUSDX': 'SUSDX', // 8453 -> 1,42161,56 (addr:0x7788a353)
  'SushiToken::SUSHI': 'SUSHI', // 747474 -> 1,10,100,1088,122,128… (cg:sushi)
  'Sumerian USD::suUSD': 'SUUSD', // 82 -> 143,223,42161,43111,8453 (addr:0x8bf591ea)
  'Token Teknoloji A    EURO::EUROT': 'Token Teknoloji A.Ş. EURO::EUROT', // 43114 -> 137 (addr:0x14eb40fb)
  'Token Teknoloji A    USD::USDOT': 'Token Teknoloji A.Ş. USD::USDOT', // 43114 -> 137 (addr:0x2f5de518)
  'TRAXX::TRAXX': 'Traxx::TRAXX', // 137 -> 1 (addr:0xd43be54c)
  'Tellor::TRB': 'TRB', // 1,10,130,137,42161,8453 -> 100,169,5000 (cg:tellor)
  'Treehouse ETH::tETH': 'Treehouse ETH::TETH', // 42161,8453 -> 1 (cg:treehouse-eth)
  'TrumpMAGA::TruMaga': 'TrumpMAGA::TRUMAGA', // 56 -> 1 (addr:0x328ea6e5)
  'uBTC::uBTC': 'UBTC', // 2345 -> 1116,1329,1868,1923,204,223… (addr:0x78e26e8b)
  'Universal BTC::UNIBTC': 'UNIBTC', // 30,8453 -> 1,10,130,146,167000,196… (addr:0x93919784)
  'US Debt::USDEBT': 'USDEBT::USDEBT', // 8453 -> 1 (cg:usdebt)
  'Verified USD::USDV': 'USDV', // 1,137 -> 10,250,42161,43114,56,999 (addr:0x32366544)
  'Wrapped USDX::USDX': 'USDX', // 8453 -> 1,42161,56 (addr:0xf3527ef8)
  'unshETHing Token::USH': 'USH', // 1 -> 42161,56 (cg:unsheth)
  'UST (Wormhole)::UST': 'UST', // 10,43114 -> 137,250,56 (cg:terrausd-wormhole)
  'Wormhole-UST::UST': 'UST', // 1 -> 137,250,56 (cg:terrausd-wormhole)
  'BLOCKv Token::VEE': 'VEE', // 8453 -> 1,10,137 (cg:blockv)
  'Welle::Welle': 'Welle::WELLE', // 56 -> 1,1284 (cg:riverex-welle)
  'WLD::WLD': 'WLD', // 480 -> 1,10,42161 (cg:worldcoin-wld)
  'Wombat Exchange::WOM': 'WOM', // 1 -> 42161,56 (cg:wombat-exchange)
  'WOWSwap::WOW': 'WOWswap::WOW', // 128 -> 1,1088,137,43114,56 (cg:wowswap)
  'Wrapped Banano::wBAN': 'Wrapped Banano::WBAN', // 137,56 -> 1,250,42161 (addr:0xe20b9e24)
  'Wrapped bMSTR::wbMSTR': 'Wrapped bMSTR::WBMSTR', // 137 -> 1,100,43114,8453 (addr:0x1a4f71b0)
  'Wrapped bNVDA::wbNVDA': 'Wrapped bNVDA::WBNVDA', // 137 -> 1,100,43114,8453 (addr:0x7e8101a1)
  'WrappedNCG::WNCG': 'Wrapped NCG::WNCG', // 56 -> 1,42161 (cg:wrapped-ncg)
  'WrappedM by M0::WM': 'WrappedM by M 0::WM', // 98866 -> 1 (addr:0x437cc333)
  'WrappedM by M0::wM': 'WrappedM by M 0::WM', // 143 -> 1 (addr:0x437cc333)
  'WrappedM by M^0::WM': 'WrappedM by M 0::WM', // 42161 -> 1 (addr:0x437cc333)
  'XODEX::XODEX': 'Xodex::XODEX', // 56 -> 1 (addr:0xb81408a1)
  'Yield Yak::YAK': 'YAK', // 5000 -> 42161,43114 (addr:0x7f4db37d)
  'Yel.Finance::YEL': 'Yel Finance::YEL', // 10,137,56 -> 1,146,250,42161,43114,80094… (addr:0x949185d3)
  'Heco-Peg YFI Token::YFI': 'YFI', // 128 -> 1,10,100,130,137,42161… (cg:yearn-finance)
  'Yield Farming Index::YFX': 'YieldFarming Index::YFX', // 8453 -> 10,42161 (addr:0x8901cb2e)
  'YieldFi vyUSD::vyUSD': 'YieldFi vyUSD::VYUSD', // 747474,9745 -> 1,10,146,42161,8453 (addr:0xf4f447e6)
  'Zaro Coin::ZARO': 'ZARO Coin::ZARO', // 8453 -> 1,56 (cg:zaro-coin)
  'ZetaChain::ZETA': 'Zetachain::Zeta', // 56 -> 1,130,42161 (cg:zetachain)
  // second round — exposed once the merges above settled
  'yearn.finance::YFI': 'YFI', // 1666600000,25,56,747474 -> 1,10,100,128,130,137… (cg:yearn-finance)
  'DSLA Protocol::DSLA': 'DSLA', // 137 -> 1,1666600000,250,42161,43114,56… (cg:stacktical)
  // xStocks whose NAME the lists punctuate differently (`&` dropped to spaces, a hyphen, a
  // missing "xStock"). Same contract address on every chain; canonical = the chain-1 spelling,
  // which is also the group the Solana mint already joined.
  'Coca-Cola xStock::KOX': 'Coca Cola xStock::KOX', // 5000 -> 1,42161,56 (addr:0xdcc1a269)
  'Johnson & Johnson xStock::JNJX': 'Johnson   Johnson xStock::JNJX', // 5000 -> 1,56 (addr:0xdb0482cf)
  'Johnson&Johnson xStock::JNJX': 'Johnson   Johnson xStock::JNJX', // 42161 -> 1,56 (addr:0xdb0482cf)
  'Procter&Gamble xStock::PGX': 'Procter   Gamble xStock::PGX', // 42161 -> 1,56 (addr:0xa90424d5)
  'Procter & Gamble xStock::PGX': 'Procter   Gamble xStock::PGX', // 5000 -> 1,56 (addr:0xa90424d5)
  'DFDV xStock::DFDVX': 'DeFi Development Corp ::DFDVX', // 42161 -> 1,56 (cg:dfdv-xstock)
  'Wrapped International Business Machines::WIBMX': 'Wrapped International Business Machines xStock::WIBMX', // 42161 -> 196 (cg:wrapped-international-business-machines-xstock)
}

/**
 * Per-DEPLOYMENT group overrides, keyed `chainId:lowercaseAddress`, applied LAST (after
 * GROUP_ALIAS). For the case GROUP_ALIAS cannot express: two different assets whose
 * `name::symbol` is the SAME string, so any group-keyed alias would move both.
 */
export const ADDRESS_GROUP_OVERRIDE: Record<string, string> = {
  // Alchemix v3 MYT on Base answers `name() == 'USDC Mix Yield Token'` — byte-identical to
  // Ethereum's mixUSDC — but it is a SEPARATE Morpho Vault V2 with its own strategies and
  // share price (1.00316 vs Ethereum's 1.02406 on 2026-10-19). The other L2 MYTs carry the
  // chain in their own name ("Optimism USDC Mix Yield Token"); Base gets the same shape.
  // margin-fetcher's `alchemixMyt.ts` keys the Base vault's APR on this string.
  '8453:0xb8befe5a6941ca4022a52042075ff269c3c67467': 'Base USDC Mix Yield Token::mixUSDC',
  // Arbitrum standard-gateway bridge token of L1 alUSD — see the alUSD note in GROUP_ALIAS.
  '42161:0x95d2c35934f4ea0076e6f5e8d6edd8080666f84e': 'Arbitrum Bridged Alchemix USD::alUSD',
  // Inverse jrDOLA v1 — "superseded v1 addresses (do not use)" per Inverse's jrDOLA docs;
  // relaunched as v2 `0x6f80…bc7` (mill 390), which takes `Junior DOLA::JRDOLA` below. Same `name::symbol` as v2, so only an address override separates
  // them. Its share price reads 0.0024 sDOLA (183k shares over 438 sDOLA, 2026-10-23).
  '1:0x633821b8e003344e5223509277f2084ea809a452': 'Junior DOLA v1 (superseded)::JRDOLA',
  // …and the live v2 takes the plain group. It was filed under `Junior DOLA::JRDOLA::1::0` by
  // the same-chain dedup while v1 held the plain key, and our own list carries that forward
  // run to run, so only an address override moves it back.
  '1:0x6f80a22a57c7f0257094ea8d426af3f747defbc7': 'Junior DOLA::JRDOLA',
  // Telcoin eUSD on Polygon — briefly folded into `eUSD::EUSD` (2026-10-23), a group whose
  // chain-1 member is Lybra's eUSD, so it lost its Telcoin desk. Back to its own key; the
  // seeded lists would otherwise carry the wrong group forward.
  '137:0x14913815bcfde78baead2111f463d038ac9c2949': 'eUSD::eUSD',
  // Liquity BOLD v1 — the Jan-2025 deployment, retired after the May-2025 redeploy (Liquity's
  // `contracts/addresses/1.json`). Ethereum 0xb01d…ab98 plus its CCIP BurnMint mirrors at
  // 0x087c…bb9b, wired to it by the Ethereum LockRelease pool 0x6F58…f193 (getRemoteToken,
  // 2026-10-26). ~201k supply against ~38.4M for the live BOLD. It held the plain group and
  // pushed the live token to `Liquity BOLD::BOLD::1::0` (the jrDOLA shape).
  '1:0xb01dd87b29d187f3e3a4bf6cdaebfb97f3d9ab98': 'Liquity BOLD v1 (superseded)::BOLD',
  '10:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': 'Liquity BOLD v1 (superseded)::BOLD',
  '8453:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': 'Liquity BOLD v1 (superseded)::BOLD',
  '42161:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': 'Liquity BOLD v1 (superseded)::BOLD',
  '43114:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': 'Liquity BOLD v1 (superseded)::BOLD',
  '534352:0x087c440f251ff6cfe62b86dde1be558b95b4bb9b': 'Liquity BOLD v1 (superseded)::BOLD',
  // …and the live BOLD takes the plain group. Its CCIP pool 0xf05a…1C9 maps to 0x0356…b01d on
  // OP/Base/Arb/Avax/Scroll and to 0xf05a…b1c9 on Sonic (GROUP_ALIAS `BOLD Stablecoin::BOLD`).
  '1:0x6440f144b7e50d6a8439336510312d2f54beb01d': 'Liquity BOLD::BOLD',
  // "Liquid Staked ETH Index" — a Set-protocol basket (getComponents = cbETH, ankrETH, wstETH,
  // sfrxETH, rETH; 17.7 supply), NOT Liquid Collective's LsETH 0x8c1b…6549 (244.8k supply). Both
  // answer `name() = "Liquid Staked ETH"` / `symbol() = "LSETH"`, so a group alias would move both;
  // the Arbitrum copy is the gateway bridge of the basket (`l1Address()` = 0x628e…). CoinGecko's
  // `liquid-staked-ethereum` lists 0x8c1b… (Ethereum) and 0xb297…30b6 (Base) only.
  '1:0x628ebc64a38269e031afbdd3c5ba857483b5d048': 'Liquid Staked ETH Index::LSETH',
  '42161:0x8ffd9f31980f26fbf4ac693678db700f1d8c51f6': 'Liquid Staked ETH Index::LSETH',
  // Arbitrum standard-gateway bridge token of Bedrock's Ethereum uniETH (`l1Address()` =
  // 0xf137…51f4, 0.0185 supply). Bedrock's own Arbitrum uniETH is 0x3d15…c3a0 (CoinGecko), which
  // keeps `Universal ETH::uniETH`; this one sat in a dedup suffix (`…::42161::0`).
  '42161:0xcdf9bc1f8362555984ee497a1ed3654f21662e7e': 'Arbitrum Bridged Universal ETH::uniETH',
  // Aegis JUSD (minter `AegisMintingJUSD` 0xbb0f…b520; `Staked JUSD` 0x4aa8… is a 4626 over it).
  // It sat in the bare `JUSD` group, which claims "the" JUSD while four unrelated tokens use the
  // ticker (Jigsaw USD, Jarvis jUSD, jAsset jUSD, the JUSD Credit Vault on Accountable).
  '1:0xc86168d2424d28942ee0866f043c1206bc9e4900': 'Aegis JUSD::JUSD',
  // Echo Protocol eBTC on Monad (CoinGecko `ebtc-2`, 10 decimals). Its `name::symbol` is
  // `eBTC::EBTC`, the group whose chain-1 member is Badger's eBTC 0x661c…, so it inherited
  // Badger as issuer. A different asset from both Badger's and ether.fi's eBTC.
  '143:0xd691b0afed67f96cec28ab6308cbe5b2c103b7e9': 'Echo eBTC::EBTC',
}

export function overrideAssetGroupByAddress(chainId: string, lcAddress: string, gr: string) {
  return ADDRESS_GROUP_OVERRIDE[`${chainId}:${lcAddress}`] ?? gr
}

/**
 * Backed xStocks — ONE token per stock at ONE address on every EVM chain, but Optimism (and a
 * few Ink / Mantle rows) store the on-chain ticker `AAPLx` while the other chains store the
 * CoinGecko form `AAPLX`, which split ~740 stocks into two groups each. Canonical = the
 * upper-case ticker (seven chains of eight). A rule rather than 740 GROUP_ALIAS lines; verified
 * 2026-10-23 to put no second address into any chain's group. The `Wrapped … xStock` wrappers
 * split the same way (`wAAPLx` on Ethereum, `WAAPLX` on X Layer / Arbitrum / Mantle) and fold
 * too. Chain-scoped `::<chain>::<n>` / `::solana` groups never match.
 */
const XSTOCK_GROUP = /^(.+ xStock)::([^:]+)$/

export function aliasAssetGroup(gr: string) {
  const aliased = GROUP_ALIAS[gr] ?? gr
  const xStock = XSTOCK_GROUP.exec(aliased)
  return xStock ? `${xStock[1]}::${xStock[2].toUpperCase()}` : aliased
}
