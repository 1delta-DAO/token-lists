import { IssuerGroupMap } from '../utils/types'

/**
 * Hand-curated issuer attribution, keyed by `assetGroup`.
 *
 * The seeds (`props.lst.provider`, `props.rwa.issuer`, `props.oft.routes[].oapp`)
 * cover the staking and RWA corners and almost none of the dollar menu: measured
 * against a live lending/earn catalogue, 19 of 222 asset groups (8.6 %) could be
 * attributed from them, and every major stablecoin — USDS, USDe, syrupUSDC, GHO,
 * crvUSD, PYUSD, RLUSD, AUSD, USD1 — fell in the gap. This file closes it.
 *
 * Rules for an entry:
 *  - the key is the group EXACTLY as the lists hold it, which is the PRE-alias
 *    string (cf. the case-split entries in stablecoin.ts / savingsAssets.ts).
 *    List both casings when the group is a `Name::SYMBOL` form;
 *  - only the DESK is named. Not the venue that lends it, not the curator that
 *    allocates to it, not the bridge it arrived over;
 *  - a gas base (WETH, BNB, AVAX, POL) gets NO entry: nobody issues it. An
 *    absent issuer is a fact, and blanking it is how the `—` bucket stays
 *    honest;
 *  - symbols collide across desks. Three of the entries below exist only
 *    because of that: reUSD is Re's AND Resupply's, USD3 is Reserve's AND
 *    3Jane's, rETH is Rocket Pool's AND StaFi's. Key on the full group string
 *    whenever a bare symbol would be ambiguous.
 */
export const ISSUER_CURATED: IssuerGroupMap = {
  // --- Fiat-reserve desks (off-chain entity, redemption window) -------------
  USDC: { id: 'circle', name: 'Circle', kind: 'institution' },
  EURC: { id: 'circle', name: 'Circle', kind: 'institution' },
  'EURC::EURC': { id: 'circle', name: 'Circle', kind: 'institution' },
  USDT: { id: 'tether', name: 'Tether', kind: 'institution' },
  'Tether Gold::XAUt': { id: 'tether', name: 'Tether', kind: 'institution' },
  'Tether Gold from Ethereum::XAUt': { id: 'tether', name: 'Tether', kind: 'institution' },
  'XAUt::XAUt': { id: 'tether', name: 'Tether', kind: 'institution' },
  PAXG: { id: 'paxos', name: 'Paxos', kind: 'institution' },
  // PYUSD is minted by Paxos Trust under PayPal's brand — `parent` keeps the
  // issuing entity reachable without hiding whose dollar a user thinks it is.
  'PayPal USD::PYUSD': { id: 'paypal', name: 'PayPal', kind: 'institution', parent: 'paxos' },
  'Global Dollar::USDG': { id: 'paxos', name: 'Paxos', kind: 'institution' },
  'Ripple USD::RLUSD': { id: 'ripple', name: 'Ripple', kind: 'institution' },
  AUSD: { id: 'agora', name: 'Agora', kind: 'institution' },
  'USD1::USD1': { id: 'world-liberty', name: 'World Liberty Financial', kind: 'institution' },
  FDUSD: { id: 'first-digital', name: 'First Digital', kind: 'institution' },
  'Monerium EUR emoney::EURE': { id: 'monerium', name: 'Monerium', kind: 'institution' },
  EURS: { id: 'stasis', name: 'STASIS', kind: 'institution' },

  // --- Protocol dollars ----------------------------------------------------
  USDS: { id: 'sky', name: 'Sky', kind: 'protocol' },
  'sUSDS::SUSDS': { id: 'sky', name: 'Sky', kind: 'protocol' },
  'sUSDS::sUSDS': { id: 'sky', name: 'Sky', kind: 'protocol' },
  DAI: { id: 'sky', name: 'Sky', kind: 'protocol' },
  SDAI: { id: 'sky', name: 'Sky', kind: 'protocol' },
  USDE: { id: 'ethena', name: 'Ethena', kind: 'protocol' },
  SUSDE: { id: 'ethena', name: 'Ethena', kind: 'protocol' },
  'USDtb::USDTB': { id: 'ethena', name: 'Ethena', kind: 'protocol' },
  SYRUPUSDC: { id: 'maple', name: 'Maple', kind: 'protocol' },
  SYRUPUSDT: { id: 'maple', name: 'Maple', kind: 'protocol' },
  'Syrup USDC::syrupUSDC': { id: 'maple', name: 'Maple', kind: 'protocol' },
  GHO: { id: 'aave', name: 'Aave', kind: 'protocol' },
  CRVUSD: { id: 'curve', name: 'Curve', kind: 'protocol' },
  'Savings crvUSD::scrvUSD': { id: 'curve', name: 'Curve', kind: 'protocol' },
  FRXUSD: { id: 'frax', name: 'Frax', kind: 'protocol' },
  'Staked Frax USD::sfrxUSD': { id: 'frax', name: 'Frax', kind: 'protocol' },
  'USDai::USDAI': { id: 'usdai', name: 'USDai', kind: 'protocol' },
  'sUSDai::SUSDAI': { id: 'usdai', name: 'USDai', kind: 'protocol' },
  'Resolv USD::USR': { id: 'resolv', name: 'Resolv', kind: 'protocol' },
  'Resolv wstUSR::WSTUSR': { id: 'resolv', name: 'Resolv', kind: 'protocol' },
  'Elixir deUSD::DEUSD': { id: 'elixir', name: 'Elixir', kind: 'protocol' },
  'Elixir Staked deUSD::SDEUSD': { id: 'elixir', name: 'Elixir', kind: 'protocol' },
  'Liquity BOLD::BOLD': { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  'Liquity BOLD::Bold': { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  LUSD: { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  MIM: { id: 'abracadabra', name: 'Abracadabra', kind: 'protocol' },
  'Asymmetry USDaf::USDAF': { id: 'asymmetry', name: 'Asymmetry', kind: 'protocol' },
  'Asymmetry USDaf Stablecoin::USDaf': { id: 'asymmetry', name: 'Asymmetry', kind: 'protocol' },
  'YieldFi yToken::YUSD': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'YieldFi yToken::yUSD': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'YieldFi yUSD::yUSD': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'Aegis YUSD::YUSD': { id: 'aegis', name: 'Aegis', kind: 'protocol' },
  // Same symbol, two desks — the reason this map keys on the full group string.
  'Re Protocol reUSD::REUSD': { id: 're', name: 'Re', kind: 'protocol' },
  'Re Protocol reUSD::reUSD': { id: 're', name: 'Re', kind: 'protocol' },
  'Resupply USD::REUSD': { id: 'resupply', name: 'Resupply', kind: 'protocol' },
  'Web 3 Dollar::USD3': { id: 'reserve', name: 'Reserve', kind: 'protocol' },
  '3Jane USD3::USD3': { id: '3jane', name: '3Jane', kind: 'protocol' },
  'Cap USD::cUSD': { id: 'cap', name: 'Cap', kind: 'protocol' },
  'InfiniFi USD::iUSD': { id: 'infinifi', name: 'InfiniFi', kind: 'protocol' },
  'BitFi USD::BFUSD': { id: 'bitfi', name: 'BitFi', kind: 'protocol' },
  'Reservoir rUSD::RUSD': { id: 'reservoir', name: 'Reservoir', kind: 'protocol' },
  'Reservoir Stablecoin::rUSD': { id: 'reservoir', name: 'Reservoir', kind: 'protocol' },

  // --- Separate GROUPS of an already-curated desk -------------------------
  //
  // A deployment that never unified into the canonical group, so neither the
  // group key above nor the generator's pre-alias expansion reaches it. Each
  // one is here because the group NAME is the desk's own product name.
  //
  // Everything else that merely shares a ticker is deliberately left blank. A
  // scan of the live list found 119 unattributed groups whose symbol one of
  // these desks claims, and they are things like `ETHERBUTTS::METH`,
  // `ETH Monsta::METH`, `USDollarToken::USDT`, `USD Coin Test::USDC`,
  // `StableUSD::USDS`, `Chad USD::CUSD`, `Royal Dollar::RUSD` and
  // `yearn Curve::yUSD` — unrelated tokens wearing a ticker. Attributing by
  // symbol is the consumer-side mistake this whole axis exists to end
  // (§9.2: ten of 46 rows on a "USDC" tab were not USDC), so the rule is the
  // same here: no name, no attribution.
  //
  // Two that look like a miss and are NOT: `f(x) rUSD::RUSD` is f(x)
  // Protocol's, not Reservoir's, and `Coin98 Dollar::CUSD` is Coin98's, not
  // Cap's — same ticker, different desk, which is why they are keyed in full.
  'Savings USDS::sUSDS': { id: 'sky', name: 'Sky', kind: 'protocol' },
  'Savings USDS from Ethereum::sUSDS': { id: 'sky', name: 'Sky', kind: 'protocol' },
  'BOLD Stablecoin::BOLD': { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  'LUSD Stablecoin::LUSD': { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  'Optimism tBTC v2::tBTC': { id: 'threshold', name: 'Threshold', kind: 'protocol' },
  'infiniFi USD::iUSD': { id: 'infinifi', name: 'InfiniFi', kind: 'protocol' },
  'f(x) rUSD::RUSD': { id: 'fx-protocol', name: 'f(x) Protocol', kind: 'protocol' },

  // --- ETH staking / restaking (complements props.lst.provider, which the
  //     generator already seeds from — these are the groups it misses) -------
  STETH: { id: 'lido', name: 'Lido', kind: 'protocol' },
  WSTETH: { id: 'lido', name: 'Lido', kind: 'protocol' },
  WEETH: { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  'ether.fi ETH::eETH': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  'ether fi Staked ETH::EETH': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  RETH: { id: 'rocketpool', name: 'Rocket Pool', kind: 'protocol' },
  'StaFi::rETH': { id: 'stafi', name: 'StaFi', kind: 'protocol' },
  CBETH: { id: 'coinbase', name: 'Coinbase', kind: 'cex' },
  RSETH: { id: 'kelp', name: 'Kelp', kind: 'protocol' },
  EZETH: { id: 'renzo', name: 'Renzo', kind: 'protocol' },
  'Treehouse ETH::TETH': { id: 'treehouse', name: 'Treehouse', kind: 'protocol' },
  'Treehouse ETH::tETH': { id: 'treehouse', name: 'Treehouse', kind: 'protocol' },
  METH: { id: 'mantle', name: 'Mantle', kind: 'protocol' },
  CMETH: { id: 'mantle', name: 'Mantle', kind: 'protocol' },
  OSETH: { id: 'stakewise', name: 'StakeWise', kind: 'protocol' },
  'Swell Ethereum::SWETH': { id: 'swell', name: 'Swell', kind: 'protocol' },
  'Swell Ethereum::swETH': { id: 'swell', name: 'Swell', kind: 'protocol' },
  'Restaked Swell ETH::RSWETH': { id: 'swell', name: 'Swell', kind: 'protocol' },
  'rswETH::rswETH': { id: 'swell', name: 'Swell', kind: 'protocol' },
  'Bridged RSWETH (Layerzero)::RSWETH': { id: 'swell', name: 'Swell', kind: 'protocol' },
  PUFETH: { id: 'puffer', name: 'Puffer', kind: 'protocol' },
  LSETH: { id: 'liquid-collective', name: 'Liquid Collective', kind: 'protocol' },
  SAVAX: { id: 'benqi', name: 'BENQI', kind: 'protocol' },
  'Lista Staked BNB::slisBNB': { id: 'lista', name: 'Lista', kind: 'protocol' },

  // --- Found by running the axis against live market data -----------------
  //
  // Each of these backs real lending markets and was arriving unattributed.
  // Ranked by the markets they back in a dev ingest of chains
  // 1/42161/56/8453/137/146/...: BTCB 68, U 39, stS 19, DOLA 18, USND 17,
  // eBTC 16, lisUSD 15, ZCHF 15, siUSD 14.
  //
  // Deliberately NOT added from that same scan: WETH/ETH (245 markets), WBNB,
  // ARB, LINK, UNI, AERO, wS, ASTER. A gas base and a governance token have no
  // issuer, and their market count is not a reason to invent one.
  BTCB: { id: 'binance', name: 'Binance', kind: 'cex' },
  DOLA: { id: 'inverse', name: 'Inverse Finance', kind: 'protocol' },
  'Beets Staked Sonic::STS': { id: 'beets', name: 'Beets', kind: 'protocol' },
  'Beets Staked Sonic::stS': { id: 'beets', name: 'Beets', kind: 'protocol' },
  'US Nerite Dollar::USND': { id: 'nerite', name: 'Nerite', kind: 'protocol' },
  'Ether fi Staked BTC::EBTC': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  'Lista USD::lisUSD': { id: 'lista', name: 'Lista', kind: 'protocol' },
  'Frankencoin::ZCHF': { id: 'frankencoin', name: 'Frankencoin', kind: 'protocol' },
  'Staked infiniFi USD::siUSD': { id: 'infinifi', name: 'InfiniFi', kind: 'protocol' },

  // --- Top wrapper blockers (§9.11's curation worklist) --------------------
  // Each of these is an UNDERLYING that dead-ends a pile of PTs, so one line
  // lights up every wrapper over it on the next run: uniBTC 27, uniETH 18,
  // sENA 13.
  UNIBTC: { id: 'bedrock', name: 'Bedrock', kind: 'protocol' },
  'Universal ETH::uniETH': { id: 'bedrock', name: 'Bedrock', kind: 'protocol' },
  'Ethena Staked ENA::SENA': { id: 'ethena', name: 'Ethena', kind: 'protocol' },

  // --- Loop collateral / earn assets that arrived with no desk -------------
  //
  // Measured from YieldCircle's loop + earn menu (docs/stablecoin-exposure.md,
  // phase 1). Every line names the evidence: the token's own name, or the
  // ERC-4626 `asset()` it was read to wrap on Ethereum (2026-10-01). Keyed on
  // the full group because every one of these tickers is shared elsewhere.
  //
  // Falcon Finance. sUSDf (0xc8cf…) `asset()` = 0xfa2b…cec2, the group listed
  // as `Falcon Finance::USDF` on 1; BNB and XDC carry the name "Falcon USD".
  // NOT `Astherus USDF`, `USD Flex`, `USDF - Global Fund Dollar` or Fractal's
  // USDF — same ticker, other desks. `Hakutora Staked Falcon USD` is a third
  // party's vault over sUSDf and is left to the wrapper walk.
  'Falcon Finance::USDF': { id: 'falcon', name: 'Falcon Finance', kind: 'protocol' },
  'Falcon USD::USDF': { id: 'falcon', name: 'Falcon Finance', kind: 'protocol' },
  'Falcon USD::USDf': { id: 'falcon', name: 'Falcon Finance', kind: 'protocol' },
  'Staked Falcon USD::sUSDf': { id: 'falcon', name: 'Falcon Finance', kind: 'protocol' },
  // Avant — `avant` already exists (savETH via lst.provider); the dollar pair
  // was unmapped. savUSD's underlying is avUSD (savings.json).
  'avUSD::avUSD': { id: 'avant', name: 'Avant', kind: 'protocol' },
  'Staked avUSD::savUSD': { id: 'avant', name: 'Avant', kind: 'protocol' },
  // Saturn — names say so; sUSDat's underlying is USDat (savings.json). Both
  // pre-alias spellings of the OFT mirrors fold here via GROUP_ALIAS.
  'Saturn Dollar::USDAT': { id: 'saturn', name: 'Saturn', kind: 'protocol' },
  'Saturn sUSDat::SUSDAT': { id: 'saturn', name: 'Saturn', kind: 'protocol' },
  // Strata — senior/junior tranches over someone else's dollar. The tranche is
  // Strata's instrument; the credit under it (USDe -> Ethena, USDat -> Saturn)
  // is resolved as an EXPOSURE by the savings walk in issuer.ts, not here.
  // NB `Tori Staked trUSD::STRUSD` is NOT Strata — see Tori below.
  'Strata Senior USDe::SRUSDE': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior USDe::jrUSDe': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Senior NUSD::srNUSD': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior NUSD::JRNUSD': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Senior USDat::SRUSDAT': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior USDat::JRUSDAT': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Senior mHYPER::srmHYPER': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior mHYPER::JRMHYPER': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Senior mM1-USD::SRMM1-USD': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior mM1-USD::JRMM1-USD': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Senior PRIME::SRPRIME': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior PRIME::JRPRIME': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Senior nOPAL::SRNOPAL': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Junior nOPAL::JRNOPAL': { id: 'strata', name: 'Strata', kind: 'protocol' },
  'Strata Pre-deposit Receipt Token::pUSDe': { id: 'strata', name: 'Strata', kind: 'protocol' },
  // Tori — the only STRUSD in the lists is "Tori Staked trUSD" (0x2808…),
  // whose `asset()` is 0xd058…, listed as `Tori trUSD::TRUSD`.
  'Tori trUSD::TRUSD': { id: 'tori', name: 'Tori', kind: 'protocol' },
  'Tori Staked trUSD::STRUSD': { id: 'tori', name: 'Tori', kind: 'protocol' },
  // 3Jane — the staked (junior) tranche. `asset()` of sUSD3 (0xf689…) is
  // 0x056b…, i.e. `3Jane USD3::USD3` above. `Stable com USD3` / `Stable.com
  // USD3` (0x0460…) is Stable.com's and `Web 3 Dollar` is Reserve's: neither
  // is 3Jane, so neither is keyed here.
  '3Jane Staked USD3::sUSD3': { id: '3jane', name: '3Jane', kind: 'protocol' },
  // Aegis — "Staked YUSD" (0xfe0c… on 1) `asset()` = 0x4274…, i.e. `Aegis
  // YUSD::YUSD`. NOT YieldFi's yUSD, which the savings walk would otherwise
  // reach through a case-insensitive ticker on Katana.
  'Staked YUSD::sYUSD': { id: 'aegis', name: 'Aegis', kind: 'protocol' },
  // Inverse — sDOLA (0xb45a…) `asset()` = DOLA 0x8653…, already `inverse`.
  'sDOLA::SDOLA': { id: 'inverse', name: 'Inverse Finance', kind: 'protocol' },
  // Aave — sGho (0xe175…) `asset()` = GHO 0x40d1…, already `aave`.
  'sGho::sGho': { id: 'aave', name: 'Aave', kind: 'protocol' },
  // Moved upstream from pos-indexer's config/issuer-overrides.json (tickets/0011)
  // so both consumers agree:
  //  - REUSDE "Re Protocol reUSDe" (0xddc0…): the name states the desk; sibling
  //    of `Re Protocol reUSD` (`re`). Not 4626, so no asset() to read.
  //  - stUSR "Staked USR" (0x6c89…): the staked form of Resolv's USR.
  //  - sreUSD "Savings reUSD" (0x557a…): `asset()` = 0x57ab…4bec "Resupply
  //    USD". NOT Re Protocol's reUSD, which wears the same ticker.
  'Re Protocol reUSDe::REUSDE': { id: 're', name: 'Re', kind: 'protocol' },
  'Staked USR::stUSR': { id: 'resolv', name: 'Resolv', kind: 'protocol' },
  'Savings reUSD::sreUSD': { id: 'resupply', name: 'Resupply', kind: 'protocol' },
  // Plume USD (pUSD, 0xdddd…3f5 on 1 and Plume) is the base unit of Plume's
  // Nest vault system, so it joins the existing `nest` desk (same id/name/kind
  // as the RWA-derived Nest vaults, so the facet does not split). NOT
  // `Palm USD`, `Polymarket USD`, `Pleasing USD`, `PUSD_Polyquity`.
  'Plume USD::PUSD': { id: 'nest', name: 'Nest', kind: 'institution' },
  'Plume USD::pUSD': { id: 'nest', name: 'Nest', kind: 'institution' },
  // Stables Labs USDX / sUSDX — one vanity address per token on every chain
  // (USDX 0xf352…, sUSDX 0x7788…); sUSDX `asset()` = 0xf352… "USDX". Base
  // lists the same two addresses as `Wrapped USDX` / `Wrapped sUSDX`. NOT
  // `Hex Trust USD`, dForce's `USDx`, Synthetix `USDx` or `X20 USD`.
  USDX: { id: 'stables-labs', name: 'Stables Labs', kind: 'protocol' },
  SUSDX: { id: 'stables-labs', name: 'Stables Labs', kind: 'protocol' },
  'Wrapped USDX::USDX': { id: 'stables-labs', name: 'Stables Labs', kind: 'protocol' },
  'Wrapped sUSDX::sUSDX': { id: 'stables-labs', name: 'Stables Labs', kind: 'protocol' },
  // Axis — "Staked Axis USD" (0xeb89…); its `asset()` 0xa1fa… answers only
  // `name() == 'USDx'`, which is too weak to key `USDx::USDx` on, so only the
  // named share is attributed.
  'Staked Axis USD::SUSDX': { id: 'axis', name: 'Axis', kind: 'protocol' },

  // --- Largest unattributed stable/savings groups (reconciliation gate) ----
  //
  // Picked from `npm run issuer:check`'s worklist where every deployment in
  // the group carries the desk's own product name (checked 2026-10-01), so no
  // ticker is doing the attributing. Binance-peg BUSD and TrueUSD stay blank:
  // whose desk a bridged BUSD is (Paxos or Binance) differs per deployment.
  EURA: { id: 'angle', name: 'Angle', kind: 'protocol' },
  AGEUR: { id: 'angle', name: 'Angle', kind: 'protocol' },
  USDA: { id: 'angle', name: 'Angle', kind: 'protocol' }, // every deployment named "Angle USDA", 0x0000206…
  STEUR: { id: 'angle', name: 'Angle', kind: 'protocol' }, // "Angle Staked EURA" / "Staked agEUR", one address 0x004626…
  'Angle Staked EURA::STEUR': { id: 'angle', name: 'Angle', kind: 'protocol' },
  'Angle Staked EURA::stEUR': { id: 'angle', name: 'Angle', kind: 'protocol' },
  'Angle Staked USDA::stUSD': { id: 'angle', name: 'Angle', kind: 'protocol' },
  'Bridged Angle Staked USDA::stUSD': { id: 'angle', name: 'Angle', kind: 'protocol' },
  USDP: { id: 'paxos', name: 'Paxos', kind: 'institution' }, // every deployment named "Pax Dollar"
  'OpenEden Open Dollar::USDO': { id: 'openeden', name: 'OpenEden', kind: 'institution' },
  'Compounding Open Dollar::CUSDO': { id: 'openeden', name: 'OpenEden', kind: 'institution' },
  'Compounding Open Dollar::cUSDO': { id: 'openeden', name: 'OpenEden', kind: 'institution' },
  'Compounding OpenDollar::CUSDO': { id: 'openeden', name: 'OpenEden', kind: 'institution' },
  'USD+': { id: 'overnight', name: 'Overnight', kind: 'protocol' }, // every deployment "Overnight.fi USD+"
  SUSD: { id: 'synthetix', name: 'Synthetix', kind: 'protocol' }, // every deployment "Synth sUSD" (0x57ab1e… on 1)

  // --- BTC wrappers --------------------------------------------------------
  WBTC: { id: 'bitgo', name: 'BitGo', kind: 'institution' },
  'Wrapped BTC::WBTC': { id: 'bitgo', name: 'BitGo', kind: 'institution' },
  CBBTC: { id: 'coinbase', name: 'Coinbase', kind: 'cex' },
  LBTC: { id: 'lombard', name: 'Lombard', kind: 'protocol' },
  SOLVBTC: { id: 'solv', name: 'Solv', kind: 'protocol' },
  'Solv Protocol BTC::SOLVBTC': { id: 'solv', name: 'Solv', kind: 'protocol' },
  'tBTC::tBTC': { id: 'threshold', name: 'Threshold', kind: 'protocol' },
  'tBTC::TBTC': { id: 'threshold', name: 'Threshold', kind: 'protocol' },
}
