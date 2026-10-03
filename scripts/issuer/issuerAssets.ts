import { IssuerGroupMap, IssuerProps } from '../utils/types'
import { RWA_MANUAL } from '../rwa/rwaAssets'

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

  // --- Dollars, euros and other fiat found by the reconciliation gate (2026-10-01) ---
  // From `npm run issuer:check`'s worklist, prioritising deployments on 1, 8453,
  // 42161, 56, 43114, 999, 9745, 143, 137, 10. Every key is a group whose NAME is
  // the desk's product (or a feed row / address named in the comment), so no
  // ticker is doing the attributing. Left blank on purpose (unattributed-ok.json):
  // mixed groups (`nUSD::nUSD` = Synapse AND Nexus, `eUSD::EUSD` = Lybra AND
  // Telcoin, `USDV`, `USDA::USDA`), and names that do not identify a desk.
  // Synthetic / CDP / delta-neutral dollars — the group name is the desk's product name.
  'apxUSD::APXUSD': { id: 'apyx', name: 'Apyx', kind: 'protocol' }, // feed row apxUSD, 1: 0x98a8…
  'apxUSD::apxUSD': { id: 'apyx', name: 'Apyx', kind: 'protocol' },
  'apyUSD::APYUSD': { id: 'apyx', name: 'Apyx', kind: 'protocol' }, // staked apxUSD, 1: 0x38ee…
  'apyUSD::apyUSD': { id: 'apyx', name: 'Apyx', kind: 'protocol' },
  'Neutrl USD::NUSD': { id: 'neutrl', name: 'Neutrl', kind: 'protocol' }, // feed "Neutrl USD", 0xe556… on 1/42161/9745
  'Staked NUSD::sNUSD': { id: 'neutrl', name: 'Neutrl', kind: 'protocol' },
  'Noon USN::USN': { id: 'noon', name: 'Noon', kind: 'protocol' }, // 1: 0xda67…
  SUSN: { id: 'noon', name: 'Noon', kind: 'protocol' }, // every deployment "Staked USN"
  'Pareto synthetic dollar USP::USP': { id: 'pareto', name: 'Pareto', kind: 'protocol' },
  'Pareto USP::USP': { id: 'pareto', name: 'Pareto', kind: 'protocol' },
  'Pareto Staked USP::SUSP': { id: 'pareto', name: 'Pareto', kind: 'protocol' },
  'Pareto Staked USP::sUSP': { id: 'pareto', name: 'Pareto', kind: 'protocol' },
  'USDp::USDp': { id: 'parallel', name: 'Parallel', kind: 'protocol' }, // feed "Parallel USDp" lists 1: 0x9b3a… — this group on 1
  'Parallel USDp::USDP': { id: 'parallel', name: 'Parallel', kind: 'protocol' },
  'Parallel USDp::USDp': { id: 'parallel', name: 'Parallel', kind: 'protocol' },
  'Parallel::PAR': { id: 'parallel', name: 'Parallel', kind: 'protocol' },
  'Parallel USD::paUSD': { id: 'parallel', name: 'Parallel', kind: 'protocol' },
  'Metronome Synth USD::msUSD': { id: 'metronome', name: 'Metronome', kind: 'protocol' }, // NOT Main Street msUSD
  'Metronome Synth USD::MSUSD': { id: 'metronome', name: 'Metronome', kind: 'protocol' },
  'Main Street USD::MSUSD': { id: 'main-street', name: 'Main Street', kind: 'protocol' },
  'Main Street USD::msUSD': { id: 'main-street', name: 'Main Street', kind: 'protocol' },
  'msUSD::msUSD': { id: 'main-street', name: 'Main Street', kind: 'protocol' }, // 1: 0x4ba0… = feed "Main Street USD" deployment
  'dTRINITY USD::DUSD': { id: 'dtrinity', name: 'dTRINITY', kind: 'protocol' },
  'dTRINITY USD::dUSD': { id: 'dtrinity', name: 'dTRINITY', kind: 'protocol' },
  'dTRINITY Staked dUSD::SDUSD': { id: 'dtrinity', name: 'dTRINITY', kind: 'protocol' },
  'dTrinity Staked dUSD::SDUSD': { id: 'dtrinity', name: 'dTRINITY', kind: 'protocol' },
  'StandX DUSD::DUSD': { id: 'standx', name: 'StandX', kind: 'protocol' },
  'Davos xyz USD::DUSD': { id: 'davos', name: 'Davos', kind: 'protocol' },
  'Davos.xyz USD::DUSD': { id: 'davos', name: 'Davos', kind: 'protocol' },
  'Alto DUSD::DUSD': { id: 'alto', name: 'Alto', kind: 'protocol' },
  'Unity::UTY': { id: 'xsy', name: 'XSY', kind: 'protocol' }, // XSY's Unity, vanity 0xba51… (Base/Avalanche)
  'Unity::UTY::43114::0': { id: 'xsy', name: 'XSY', kind: 'protocol' },
  'Staked UTY::YUTY': { id: 'xsy', name: 'XSY', kind: 'protocol' },
  'Staked UTY::yUTY': { id: 'xsy', name: 'XSY', kind: 'protocol' },
  'Decentralized USD::USDD': { id: 'usdd', name: 'USDD', kind: 'protocol' }, // USDD v2 `name()`
  'Decentralized USD (PoS)::USDD': { id: 'usdd', name: 'USDD', kind: 'protocol' },
  USDD: { id: 'usdd', name: 'USDD', kind: 'protocol' },
  'Savings Usdd::sUSDD': { id: 'usdd', name: 'USDD', kind: 'protocol' },
  'Savings USDD::SUSDD': { id: 'usdd', name: 'USDD', kind: 'protocol' },
  'Liquity BOLD::BOLD::1::0': { id: 'liquity', name: 'Liquity', kind: 'protocol' }, // collision-suffixed canonical BOLD 0x6440…
  'Legacy BOLD::Bold': { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  'Bold Stablecoin::Bold': { id: 'liquity', name: 'Liquity', kind: 'protocol' },
  'sBold::sBOLD': { id: 'k3-capital', name: 'K3 Capital', kind: 'protocol' }, // K3 Capital's Stability Pool vault over BOLD
  'Origin Dollar::OUSD': { id: 'origin', name: 'Origin', kind: 'protocol' },
  OUSD: { id: 'origin', name: 'Origin', kind: 'protocol' }, // every deployment "Origin Dollar"; NOT `Open USD`/`OpenUSD`
  'Wrapped OUSD::WOUSD': { id: 'origin', name: 'Origin', kind: 'protocol' },
  'Electronic USD::EUSD': { id: 'reserve', name: 'Reserve', kind: 'protocol' }, // feed: 1: 0xa0d6…
  'Electronic USD::eUSD': { id: 'reserve', name: 'Reserve', kind: 'protocol' },
  'eUSD (OLD)::EUSD': { id: 'lybra', name: 'Lybra', kind: 'protocol' }, // Lybra v1 eUSD 0x97de… (feed row)
  'eUSD (OLD)::eUSD': { id: 'lybra', name: 'Lybra', kind: 'protocol' },
  'peg eUSD::PEUSD': { id: 'lybra', name: 'Lybra', kind: 'protocol' },
  'peg-eUSD::peUSD': { id: 'lybra', name: 'Lybra', kind: 'protocol' },
  'eUSD::EUSD::1::0': { id: 'telcoin', name: 'Telcoin', kind: 'protocol' }, // feed "Telcoin eUSD" 0x1491… on 1/137/8453
  'eUSD::eUSD': { id: 'telcoin', name: 'Telcoin', kind: 'protocol' }, // 137: 0x1491…
  'ARYZE eUSD::EUSD': { id: 'aryze', name: 'ARYZE', kind: 'institution' },
  'ARYZE eUSD::eUSD': { id: 'aryze', name: 'ARYZE', kind: 'institution' },
  'ARYZE eEUR::EEUR': { id: 'aryze', name: 'ARYZE', kind: 'institution' },
  'ARYZE eEUR::eEUR': { id: 'aryze', name: 'ARYZE', kind: 'institution' },
  'ARYZE eGBP::EGBP': { id: 'aryze', name: 'ARYZE', kind: 'institution' },
  'ARYZE eGBP::eGBP': { id: 'aryze', name: 'ARYZE', kind: 'institution' },
  'Mezo USD::MUSD': { id: 'mezo', name: 'Mezo', kind: 'protocol' },
  MUSD: { id: 'mstable', name: 'mStable', kind: 'protocol' }, // every deployment "mStable USD"
  'Yield Optimizer USD::YOUSD': { id: 'yo', name: 'YO', kind: 'protocol' }, // yoUSD vault, vanity 0x0000000f2eb9…
  'Yield Optimizer USD::yoUSD': { id: 'yo', name: 'YO', kind: 'protocol' },
  'Zunami USD::ZUNUSD': { id: 'zunami', name: 'Zunami', kind: 'protocol' },
  'Zunami USD::zunUSD': { id: 'zunami', name: 'Zunami', kind: 'protocol' },
  'Zunami USD::zunUSD::10::0': { id: 'zunami', name: 'Zunami', kind: 'protocol' },
  'dForce USD::USX': { id: 'dforce', name: 'dForce', kind: 'protocol' },
  'dForce USD::USX::42161::0': { id: 'dforce', name: 'dForce', kind: 'protocol' },
  'Ethos Reserve Note::ERN': { id: 'ethos', name: 'Ethos', kind: 'protocol' },
  'Gyroscope GYD::GYD': { id: 'gyroscope', name: 'Gyroscope', kind: 'protocol' },
  'Gyroscope GYD::GYD::137::0': { id: 'gyroscope', name: 'Gyroscope', kind: 'protocol' },
  'Gyro Dollar::GYD': { id: 'gyroscope', name: 'Gyroscope', kind: 'protocol' },
  'US Permissionless Dollar::USPD': { id: 'uspd', name: 'USPD', kind: 'protocol' },
  'Staked Stream USD::xUSD': { id: 'stream', name: 'Stream Finance', kind: 'protocol' },
  'Staked Stream USD::XUSD': { id: 'stream', name: 'Stream Finance', kind: 'protocol' },
  'Staked Yuzu USD::syzUSD': { id: 'yuzu', name: 'Yuzu', kind: 'protocol' },
  'Staked Yuzu USD::SYZUSD': { id: 'yuzu', name: 'Yuzu', kind: 'protocol' },
  'Yuzu USD::yzUSD': { id: 'yuzu', name: 'Yuzu', kind: 'protocol' },
  'YieldFi vyUSD::VYUSD': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'YieldFi vyUSD::vyUSD': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'M by M0::M': { id: 'm0', name: 'M0', kind: 'protocol' },
  'Dackie USD::DCKUSD': { id: 'dackie', name: 'DackieSwap', kind: 'protocol' },
  'Dackie USD::dckUSD': { id: 'dackie', name: 'DackieSwap', kind: 'protocol' },
  GRAI: { id: 'gravita', name: 'Gravita', kind: 'protocol' }, // every deployment "Gravita Debt Token"
  'Gravita Debt Token::GRAI': { id: 'gravita', name: 'Gravita', kind: 'protocol' },
  'Grai::GRAI': { id: 'gravita', name: 'Gravita', kind: 'protocol' },
  'Anzen USDz::USDZ': { id: 'anzen', name: 'Anzen', kind: 'protocol' },
  'Anzen USDz::USDz': { id: 'anzen', name: 'Anzen', kind: 'protocol' },
  'Anzen Staked USDz::SUSDZ': { id: 'anzen', name: 'Anzen', kind: 'protocol' },
  'Anzen Staked USDz::sUSDz': { id: 'anzen', name: 'Anzen', kind: 'protocol' },
  'Alchemix USD::ALUSD': { id: 'alchemix', name: 'Alchemix', kind: 'protocol' },
  'Alchemix USD::alUSD': { id: 'alchemix', name: 'Alchemix', kind: 'protocol' },
  'ZeUSD::ZEUSD': { id: 'zoth', name: 'Zoth', kind: 'protocol' },
  'ZeUSD::ZeUSD': { id: 'zoth', name: 'Zoth', kind: 'protocol' },
  'R Stablecoin::R': { id: 'raft', name: 'Raft', kind: 'protocol' },
  'ebUSD Stablecoin::EBUSD': { id: 'ebisu', name: 'Ebisu', kind: 'protocol' },
  'ebUSD Stablecoin::ebUSD': { id: 'ebisu', name: 'Ebisu', kind: 'protocol' },
  'Felix feUSD::FEUSD': { id: 'felix', name: 'Felix', kind: 'protocol' },
  'Felix feUSD::feUSD': { id: 'felix', name: 'Felix', kind: 'protocol' },
  'Last USD::USDXL': { id: 'hypurrfi', name: 'HypurrFi', kind: 'protocol' },
  'Balanced Dollar::bnUSD': { id: 'balanced', name: 'Balanced', kind: 'protocol' },
  'Decentralized Euro::DEURO': { id: 'deuro', name: 'dEURO', kind: 'protocol' },
  'Decentralized Euro::dEURO': { id: 'deuro', name: 'dEURO', kind: 'protocol' },
  'Coin98 Dollar::CUSD': { id: 'coin98', name: 'Coin98', kind: 'protocol' },
  'Rings scUSD::SCUSD': { id: 'rings', name: 'Rings', kind: 'protocol' },
  'Rings scUSD::scUSD': { id: 'rings', name: 'Rings', kind: 'protocol' },
  'Staked thUSD::STHUSD': { id: 'threshold', name: 'Threshold', kind: 'protocol' },
  'Threshold USD::thUSD': { id: 'threshold', name: 'Threshold', kind: 'protocol' },
  'Vesper V-Dollar (Legacy)::VUSD.L': { id: 'vesper', name: 'Vesper', kind: 'protocol' },
  'Dollar on Chain::DOC': { id: 'money-on-chain', name: 'Money On Chain', kind: 'protocol' },
  'f(x) USD::fxUSD': { id: 'fx-protocol', name: 'f(x) Protocol', kind: 'protocol' },
  'f(x) Protocol fxUSD::fxUSD': { id: 'fx-protocol', name: 'f(x) Protocol', kind: 'protocol' },
  'Magic Internet Money::MIM': { id: 'abracadabra', name: 'Abracadabra', kind: 'protocol' },
  'PicWe_USDC::WEUSD': { id: 'picwe', name: 'PicWe', kind: 'protocol' }, // WEUSD::WEUSD shares 0xdd73… with it on 8453/42161
  'WEUSD::WEUSD': { id: 'picwe', name: 'PicWe', kind: 'protocol' },
  'Spark USDC Vault::sUSDC': { id: 'spark', name: 'Spark', kind: 'protocol' }, // Spark's USDC vault (over sUSDS)
  'Spark USDC::SUSDC': { id: 'spark', name: 'Spark', kind: 'protocol' },
  'Midas mRe7YIELD::MRE7YIELD': { id: 'midas', name: 'Midas', kind: 'institution' },
  'Midas mRe7YIELD::mRe7YIELD': { id: 'midas', name: 'Midas', kind: 'institution' },
  'Etherfuse KTB::KTB': { id: 'etherfuse', name: 'Etherfuse', kind: 'institution' },
  SYRUPUSDG: { id: 'maple', name: 'Maple', kind: 'protocol' }, // Maple syrupUSDG, 1: 0x87b6…
  'syrupUSDG::SYRUPUSDG': { id: 'maple', name: 'Maple', kind: 'protocol' },
  'Syrup USDT::syrupUSDT': { id: 'maple', name: 'Maple', kind: 'protocol' },
  'syrupUSDT::SYRUPUSDT': { id: 'maple', name: 'Maple', kind: 'protocol' },
  'syrupUSDT::syrupUSDT': { id: 'maple', name: 'Maple', kind: 'protocol' },
  'ether.fi USD::eUSD': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' },
  // Fiat-reserve / regulated issuers — named in the group (institution).
  USDM: { id: 'mountain', name: 'Mountain Protocol', kind: 'institution' }, // every deployment "Mountain Protocol USD", 0x59d9…
  'Mountain Protocol USD::USDM': { id: 'mountain', name: 'Mountain Protocol', kind: 'institution' },
  'AllUnity EUR::EURAU': { id: 'allunity', name: 'AllUnity', kind: 'institution' },
  'AllUnity CHF::CHFAU': { id: 'allunity', name: 'AllUnity', kind: 'institution' },
  'AllUnity SEK::SEKAU': { id: 'allunity', name: 'AllUnity', kind: 'institution' },
  'Tokenised GBP::TGBP': { id: 'bcp', name: 'BCP Technologies', kind: 'institution' },
  'Tokenised GBP::tGBP': { id: 'bcp', name: 'BCP Technologies', kind: 'institution' },
  'Worldwide USD::WUSD': { id: 'wspn', name: 'WSPN', kind: 'institution' },
  'Worldwide USD::WUSD::1::0': { id: 'wspn', name: 'WSPN', kind: 'institution' },
  'Frontier Stable Token::FRNT': { id: 'wyoming', name: 'Wyoming Stable Token Commission', kind: 'institution' },
  'BiLira::TRYB': { id: 'bilira', name: 'BiLira', kind: 'institution' },
  'BiLira (PoS)::TRYB': { id: 'bilira', name: 'BiLira', kind: 'institution' },
  'Glo Dollar::USDGLO': { id: 'glo', name: 'Glo Foundation', kind: 'institution' },
  'VNX Swiss Franc::VCHF': { id: 'vnx', name: 'VNX', kind: 'institution' },
  'VNX Franc::VCHF': { id: 'vnx', name: 'VNX', kind: 'institution' },
  'VNX EURO::VEUR': { id: 'vnx', name: 'VNX', kind: 'institution' },
  'VNX Euro::VEUR': { id: 'vnx', name: 'VNX', kind: 'institution' },
  GYEN: { id: 'gmo-trust', name: 'GMO-Z.com Trust', kind: 'institution' }, // every deployment "GYEN"; same issuer as ZUSD
  'GMO JPY::GYEN': { id: 'gmo-trust', name: 'GMO-Z.com Trust', kind: 'institution' },
  'Z.com USD::ZUSD': { id: 'gmo-trust', name: 'GMO-Z.com Trust', kind: 'institution' },
  'Stable Coin::SBC': { id: 'brale', name: 'Brale', kind: 'institution' },
  'Forte AUD::AUDF': { id: 'forte', name: 'Forte', kind: 'institution' },
  'Schuman EUR P::EUROP': { id: 'schuman', name: 'Schuman Financial', kind: 'institution' },
  'EURØP::EUROP': { id: 'schuman', name: 'Schuman Financial', kind: 'institution' },
  'XSGD::XSGD': { id: 'straitsx', name: 'StraitsX', kind: 'institution' },
  'XSGD::XSGD::42161::0': { id: 'straitsx', name: 'StraitsX', kind: 'institution' },
  'XSGD::XSGD::137::0': { id: 'straitsx', name: 'StraitsX', kind: 'institution' },
  'StraitsX XUSD::XUSD': { id: 'straitsx', name: 'StraitsX', kind: 'institution' },
  'JPY Coin::JPYC': { id: 'jpyc', name: 'JPYC', kind: 'institution' },
  JPYC: { id: 'jpyc', name: 'JPYC', kind: 'institution' }, // every deployment "JPY Coin v1"
  EURT: { id: 'tether', name: 'Tether', kind: 'institution' }, // every deployment "Euro Tether"
  'Euro Tether (PoS)::EURT': { id: 'tether', name: 'Tether', kind: 'institution' },
  'EUROe Stablecoin::EUROE': { id: 'membrane', name: 'Membrane Finance', kind: 'institution' },
  'EUROe Stablecoin::EUROe': { id: 'membrane', name: 'Membrane Finance', kind: 'institution' },
  'Agant GBP::GBPA': { id: 'agant', name: 'Agant', kind: 'institution' },
  GUSD: { id: 'gemini', name: 'Gemini', kind: 'institution' }, // every deployment "Gemini Dollar"
  'Gemini dollar::GUSD': { id: 'gemini', name: 'Gemini', kind: 'institution' },
  'Quantoz EURQ::EURQ': { id: 'quantoz', name: 'Quantoz', kind: 'institution' },
  'Quantoz USDQ::USDQ': { id: 'quantoz', name: 'Quantoz', kind: 'institution' },
  'Stablecorp QCAD::QCAD': { id: 'stablecorp', name: 'Stablecorp', kind: 'institution' },
  'United Stables::U': { id: 'united-stables', name: 'United Stables', kind: 'institution' },
  'Anchored Coins AEUR::AEUR': { id: 'anchored-coins', name: 'Anchored Coins', kind: 'institution' },
  'Eurite::EURI': { id: 'banking-circle', name: 'Banking Circle', kind: 'institution' },
  'Lift Dollar::USDL': { id: 'paxos', name: 'Paxos', kind: 'institution' }, // Paxos International
  'Lift Dollar - Deprecated::USDL': { id: 'paxos', name: 'Paxos', kind: 'institution' },
  'Macropod::AUDM': { id: 'macropod', name: 'Macropod', kind: 'institution' },
  'SoFiUSD::SOFID': { id: 'sofi', name: 'SoFi', kind: 'institution' },
  'Fidelity Digital Dollar::FIDD': { id: 'fidelity', name: 'Fidelity', kind: 'institution' },
  'Ondo U.S. Dollar Token::USDON': { id: 'ondo', name: 'Ondo', kind: 'institution' },
  'Ondo U.S. Dollar Token::USDon': { id: 'ondo', name: 'Ondo', kind: 'institution' },
  'Hex Trust USD::USDX': { id: 'hex-trust', name: 'Hex Trust', kind: 'institution' }, // NOT Stables Labs USDX
  'Hex Trust USD::USDX::1::0': { id: 'hex-trust', name: 'Hex Trust', kind: 'institution' },
  'StablR Euro::EURR': { id: 'stablr', name: 'StablR', kind: 'institution' },
  USDR: { id: 'stablr', name: 'StablR', kind: 'institution' }, // every deployment "StablR USD"
  'Australian Digital Dollar::AUDD': { id: 'novatti', name: 'Novatti', kind: 'institution' },
  'Novatti Australian Digital Dollar::AUDD': { id: 'novatti', name: 'Novatti', kind: 'institution' },
  'Asian Dollar::AZND': { id: 'mu-digital', name: 'Mu Digital', kind: 'institution' },
  'Mu Digital AZND::AZND': { id: 'mu-digital', name: 'Mu Digital', kind: 'institution' },
  'Monerium EUR emoney::EURe': { id: 'monerium', name: 'Monerium', kind: 'institution' },
  'Monerium EUR emoney [OLD]::EURe': { id: 'monerium', name: 'Monerium', kind: 'institution' },
  'Monerium EUR emoney [OLD]::EURE': { id: 'monerium', name: 'Monerium', kind: 'institution' },
  'Monerium EUR emoney::EURE::1::0': { id: 'monerium', name: 'Monerium', kind: 'institution' },
  'Monerium EUR emoney::EURE::100::0': { id: 'monerium', name: 'Monerium', kind: 'institution' },
  BRLA: { id: 'brla', name: 'BRLA Digital', kind: 'institution' }, // every deployment "BRLA Digital BRLA"
  'BRLA Token::BRLA': { id: 'brla', name: 'BRLA Digital', kind: 'institution' },
  // Bridged USDC is still Circle's dollar (README: the bridge is not the desk).
  USDBC: { id: 'circle', name: 'Circle', kind: 'institution' }, // "USD Base Coin" 8453: 0xd9aa… — Base standard-bridge USDC
  'USDC::USDC(Wormhole)': { id: 'circle', name: 'Circle', kind: 'institution' },
  'Bridged USDC (Pharos)::USDC.e': { id: 'circle', name: 'Circle', kind: 'institution' },
  'USDC+::USDC+': { id: 'overnight', name: 'Overnight', kind: 'protocol' },

  // --- Second pass over the gate's worklist (same rule: the group names the desk) --
  'MetaMask USD::mUSD': { id: 'metamask', name: 'MetaMask', kind: 'institution', parent: 'bridge' }, // MetaMask-branded, minted by Bridge (Stripe) on M0 — cf. PYUSD/paxos
  'MetaMask USD::MUSD': { id: 'metamask', name: 'MetaMask', kind: 'institution', parent: 'bridge' },
  FEI: { id: 'fei', name: 'Fei Protocol', kind: 'protocol' }, // every deployment "Fei USD"
  USTC: { id: 'terra', name: 'Terra Classic', kind: 'protocol' }, // "Wrapped USTC"
  'Threshold USD::THUSD': { id: 'threshold', name: 'Threshold', kind: 'protocol' },
  'Prisma mkUSD::MKUSD': { id: 'prisma', name: 'Prisma', kind: 'protocol' },
  'Prisma mkUSD::mkUSD': { id: 'prisma', name: 'Prisma', kind: 'protocol' },
  'Level USD::LVLUSD': { id: 'level', name: 'Level', kind: 'protocol' },
  'Level USD::lvlUSD': { id: 'level', name: 'Level', kind: 'protocol' },
  'Staked Level USD::SLVLUSD': { id: 'level', name: 'Level', kind: 'protocol' },
  'Staked Level USD::slvlUSD': { id: 'level', name: 'Level', kind: 'protocol' },
  'Jigsaw USD::JUSD': { id: 'jigsaw', name: 'Jigsaw', kind: 'protocol' },
  'Jigsaw USD::jUSD': { id: 'jigsaw', name: 'Jigsaw', kind: 'protocol' },
  'YieldFi Stable Token::sUSD': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'YieldFi Valos::YVALOS': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'YieldFi yHLP::YHLP': { id: 'yieldfi', name: 'YieldFi', kind: 'protocol' },
  'Spark Savings USDC::SPUSDC': { id: 'spark', name: 'Spark', kind: 'protocol' },
  'Spark Savings USDT::SPUSDT': { id: 'spark', name: 'Spark', kind: 'protocol' },
  'SMARDEX USDN::USDN': { id: 'smardex', name: 'SmarDex', kind: 'protocol' },
  'Dyad::DYAD': { id: 'dyad', name: 'DYAD', kind: 'protocol' },
  'MNEE USD Stablecoin::MNEE': { id: 'mnee', name: 'MNEE', kind: 'institution' },
  'M::M': { id: 'm0', name: 'M0', kind: 'protocol' }, // 1: 0x866a… = M by M0
  'EUR CoinVertible::EURCV': { id: 'sg-forge', name: 'SG-FORGE', kind: 'institution' },
  'USD CoinVertible::USDCV': { id: 'sg-forge', name: 'SG-FORGE', kind: 'institution' },
  'GAIB AID::AID': { id: 'gaib', name: 'GAIB', kind: 'protocol' },
  'GAIB sAID::SAID': { id: 'gaib', name: 'GAIB', kind: 'protocol' },
  'Flying Tulip USD::FTUSD': { id: 'flying-tulip', name: 'Flying Tulip', kind: 'protocol' },
  'Flying Tulip USD::ftUSD': { id: 'flying-tulip', name: 'Flying Tulip', kind: 'protocol' },
  "Let's Get HAI::HAI": { id: 'hai', name: 'HAI', kind: 'protocol' },
  'Defi.money::MONEY': { id: 'defi-money', name: 'Defi.money', kind: 'protocol' },
  'Defi money::MONEY': { id: 'defi-money', name: 'Defi.money', kind: 'protocol' },
  'Defi.Money Stablecoin::MONEY': { id: 'defi-money', name: 'Defi.money', kind: 'protocol' },
  'Overnight.fi DAI+::DAI+': { id: 'overnight', name: 'Overnight', kind: 'protocol' },
  'Overnight fi DAI::DAI+': { id: 'overnight', name: 'Overnight', kind: 'protocol' },
  'DAI+::DAI+': { id: 'overnight', name: 'Overnight', kind: 'protocol' },
  'Overnight.fi USDT+::USDT+': { id: 'overnight', name: 'Overnight', kind: 'protocol' },
  'Overnight.fi USDT::USDT+': { id: 'overnight', name: 'Overnight', kind: 'protocol' },
  'Synth sEUR::sEUR': { id: 'synthetix', name: 'Synthetix', kind: 'protocol' },
  'sEUR::SEUR': { id: 'synthetix', name: 'Synthetix', kind: 'protocol' }, // 1: 0xd71e… Synthetix sEUR
  'sUSD::sUSD': { id: 'synthetix', name: 'Synthetix', kind: 'protocol' }, // 1: 0x57ab1e… Synthetix sUSD
  'VAI Stablecoin::VAI': { id: 'venus', name: 'Venus', kind: 'protocol' },
  'Astherus USDF::USDF': { id: 'aster', name: 'Aster', kind: 'protocol' }, // NOT Falcon USDf
  'Astherus Staked USDF::asUSDF': { id: 'aster', name: 'Aster', kind: 'protocol' },
  'Aster USDF::USDF': { id: 'aster', name: 'Aster', kind: 'protocol' },
  'Real USD::USDR': { id: 'tangible', name: 'Tangible', kind: 'protocol' },
  'Magic Internet Money (Polygon)::MIM': { id: 'abracadabra', name: 'Abracadabra', kind: 'protocol' },
  'Stabl.fi CASH::CASH': { id: 'stabl', name: 'Stabl.fi', kind: 'protocol' },
  'Num ARS::nARS': { id: 'num-finance', name: 'Num Finance', kind: 'institution' },
  'PAR Stablecoin (PoS)::PAR': { id: 'parallel', name: 'Parallel', kind: 'protocol' },
  'PAR Stablecoin::PAR': { id: 'parallel', name: 'Parallel', kind: 'protocol' },
  'Frankencoin (PoS)::ZCHF': { id: 'frankencoin', name: 'Frankencoin', kind: 'protocol' },
  'Frankencoin::ZCHF::42161::0': { id: 'frankencoin', name: 'Frankencoin', kind: 'protocol' },
  'Mu Digital Locked AZND::LOAZND': { id: 'mu-digital', name: 'Mu Digital', kind: 'institution' },
  'Mento British Pound::GBPm': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Mento Dollar::USDm': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Mento Swiss Franc::CHFm': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Mento Japanese Yen::JPYm': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Mento Euro::EURm': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Hyperstable::USH': { id: 'hyperstable', name: 'Hyperstable', kind: 'protocol' },
  'Hyperstable USD::USH': { id: 'hyperstable', name: 'Hyperstable', kind: 'protocol' },
  'Hyperbeat USDT::hbUSDT': { id: 'hyperbeat', name: 'Hyperbeat', kind: 'protocol' },
  'Hyperbeat USD::beatUSD': { id: 'hyperbeat', name: 'Hyperbeat', kind: 'protocol' },
  'USDH::USDH': { id: 'native-markets', name: 'Native Markets', kind: 'protocol' }, // Hyperliquid USDH, 999: 0x1111…1111
  'Monetrix USD::USDM': { id: 'monetrix', name: 'Monetrix', kind: 'protocol' },
  'Cygnus Finance Global USD::CGUSD': { id: 'cygnus', name: 'Cygnus Finance', kind: 'protocol' },
  'Cygnus Finance Global USD::cgUSD': { id: 'cygnus', name: 'Cygnus Finance', kind: 'protocol' },
  'Phase Dollar::CASH': { id: 'phase', name: 'Phase', kind: 'protocol' },
  'Cod3x USD::CDXUSD': { id: 'cod3x', name: 'Cod3x', kind: 'protocol' },
  'Cod3x USD::cdxUSD': { id: 'cod3x', name: 'Cod3x', kind: 'protocol' },
  'Parabol USD::PARAUSD': { id: 'parabol', name: 'Parabol', kind: 'protocol' },
  'Parabol USD::paraUSD': { id: 'parabol', name: 'Parabol', kind: 'protocol' },
  'VNX British Pound::VGBP': { id: 'vnx', name: 'VNX', kind: 'institution' },
  'USDM Stablecoin (Meridian)::USDM': { id: 'meridian', name: 'Meridian', kind: 'protocol' },
  'Vesta Stable::VST': { id: 'vesta', name: 'Vesta', kind: 'protocol' },
  'Sperax USD::USDs': { id: 'sperax', name: 'Sperax', kind: 'protocol' },
  'Sperax USD::USDS': { id: 'sperax', name: 'Sperax', kind: 'protocol' },
  'The Standard USD::USDS': { id: 'the-standard', name: 'The Standard', kind: 'protocol' },
  'TheStandard USD::USDs': { id: 'the-standard', name: 'The Standard', kind: 'protocol' },
  'STASIS EURS Token::EURS': { id: 'stasis', name: 'STASIS', kind: 'institution' },
  'f(x) rUSD::rUSD': { id: 'fx-protocol', name: 'f(x) Protocol', kind: 'protocol' },
  'StableJack aUSD::aUSD': { id: 'stablejack', name: 'StableJack', kind: 'protocol' },
  'Moremoney USD::MONEY': { id: 'moremoney', name: 'Moremoney', kind: 'protocol' },

  // --- ETH / BTC wrappers and staked forms (issuer:check --eth-btc) ----------
  // Each also carries its money: `denomination` (denominationMap.ts) for canonical-style
  // wrappers, `lst.asset` (LST_GROUP_MANUAL in lst/lstGroupMap.ts) for staked forms.
  TBTC: { id: 'threshold', name: 'Threshold', kind: 'protocol' }, // bare group: "tBTC v2" (Threshold) on Hemi / BOB
  'Function ƒBTC::FBTC': { id: 'function', name: 'Function', kind: 'protocol' }, // FBTC (Ignition) rebranded; same 0xc96d… on every chain
  FBTC: { id: 'function', name: 'Function', kind: 'protocol' }, // every deployment "Fire Bitcoin", 0xc96d…
  'Fire Bitcoin::FBTC': { id: 'function', name: 'Function', kind: 'protocol' },
  KBTC: { id: 'kraken', name: 'Kraken', kind: 'cex' }, // "Kraken Wrapped BTC", 0x73e0…
  'M-BTC': { id: 'merlin', name: 'Merlin Chain', kind: 'protocol' }, // "Merlin BTC"
  'Bitcoin::BTC.b': { id: 'ava-labs', name: 'Ava Labs', kind: 'institution' }, // Avalanche Bridge BTC.b
  'eBTC::EBTC': { id: 'badger', name: 'Badger', kind: 'protocol' }, // 1: 0x661c… is Badger eBTC — NOT ether.fi eBTC (0x657e…)
  'Universal BTC::UNIBTC': { id: 'bedrock', name: 'Bedrock', kind: 'protocol' },
  'Universal ETH::uniETH::42161::0': { id: 'bedrock', name: 'Bedrock', kind: 'protocol' },
  'SOLVBTC.ENA': { id: 'solv', name: 'Solv', kind: 'protocol' },
  'SOLVBTC.JUP': { id: 'solv', name: 'Solv', kind: 'protocol' },
  SOLVBTCPLUS: { id: 'solv', name: 'Solv', kind: 'protocol' },
  'Solv Protocol SolvBTC BNB::SOLVBTCBNB': { id: 'solv', name: 'Solv', kind: 'protocol' },
  'Solv Protocol SolvBTC.BERA::SOLVBTC.BERA': { id: 'solv', name: 'Solv', kind: 'protocol' },
  'SolvBTC Avalanche::SolvBTC.AVAX': { id: 'solv', name: 'Solv', kind: 'protocol' },
  'SolvBTC DEX LP::SolvBTC.DLP': { id: 'solv', name: 'Solv', kind: 'protocol' },
  'Acre Staked Bitcoin::stBTC': { id: 'acre', name: 'Acre', kind: 'protocol' },
  'ynETH MAX::YNETHX': { id: 'yieldnest', name: 'YieldNest', kind: 'protocol' },
  'ynETH MAX::ynETHx': { id: 'yieldnest', name: 'YieldNest', kind: 'protocol' },
  'YieldNest Restaked ETH::YNETH': { id: 'yieldnest', name: 'YieldNest', kind: 'protocol' },
  'Dinero Staked ETH::PXETH': { id: 'dinero', name: 'Dinero', kind: 'protocol' },
  'Dinero apxETH::APXETH': { id: 'dinero', name: 'Dinero', kind: 'protocol' },
  'frxETH::frxETH': { id: 'frax', name: 'Frax', kind: 'protocol' },
  FRXETH: { id: 'frax', name: 'Frax', kind: 'protocol' },
  'Super Symbiotic LRT::weETHs': { id: 'etherfi', name: 'Ether.fi', kind: 'protocol' }, // ether.fi Liquid weETHs
  'Origin Ether::OETH': { id: 'origin', name: 'Origin', kind: 'protocol' },
  'Wrapped OETH::WOETH': { id: 'origin', name: 'Origin', kind: 'protocol' },
  'Wrapped OETH::wOETH': { id: 'origin', name: 'Origin', kind: 'protocol' },
  'Super OETH::superOETHb': { id: 'origin', name: 'Origin', kind: 'protocol' },
  WSUPEROETHB: { id: 'origin', name: 'Origin', kind: 'protocol' },
  'swETH::swETH': { id: 'swell', name: 'Swell', kind: 'protocol' },
  'Stader ETHx::ETHx': { id: 'stader', name: 'Stader', kind: 'protocol' },

  // --- Third pass: the gate's 2026-10-01 baseline (the 189 "not yet curated") ---
  //
  // Evidence per line: "feed" = the deployment's (chain, address) is listed by
  // DeFiLlama's stablecoin row of that name (risk-data stablecoin-quality.json)
  // and that row's own metadata (stablecoins.llama.fi/stablecoin/<id>) names
  // the issuer; "chain" = read on-chain 2026-10-01 (name(), owner(), bridge
  // getters, implementation slot). Groups whose deployments disagree are split
  // in ISSUER_BY_ADDRESS below instead of keyed here.
  //
  // Ripio wFIAT suite. Feed rows 379-384 ("Issued by Ripio … reserves in
  // <country> bank accounts"); Ripio's wFIAT whitepaper lists one address per
  // currency on every chain; chain: same name() and the same ERC-1967
  // implementation (0xba0030bb…) on 1 and 999 for the HyperEVM copies the
  // whitepaper predates.
  'Argentine Peso::WARS': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Argentine Peso::wARS': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Peso Argentino::wARS': { id: 'ripio', name: 'Ripio', kind: 'institution' }, // 480, same 0x0dc4… as above
  'Brazilian real::WBRL': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Brazilian real::wBRL': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Mexican Peso::WMXN': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Mexican Peso::wMXN': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Colombian Peso::WCOP': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Colombian Peso::wCOP': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Peruvian Sol::WPEN': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Peruvian Sol::wPEN': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Chilean Peso::WCLP': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  'Chilean Peso::wCLP': { id: 'ripio', name: 'Ripio', kind: 'institution' },
  // Mento (Celo) — feed matches each address to the Mento row (cUSD -> USDm,
  // cEUR… -> <FIAT>m, PUSO -> PHPm, eXOF -> XOFm); `mento` already exists.
  CUSD: { id: 'mento', name: 'Mento', kind: 'protocol' }, // only deployment: "Celo Dollar" 42220 0x765d…
  'Celo Australian Dollar::cAUD': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Canadian Dollar::cCAD': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Colombian Peso::cCOP': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Ghanian Cedi::cGHS': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Japanese Yen::cJPY': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Kenyan Shilling::CKES': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Nigerian Naira::cNGN': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo Real::CREAL': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'Celo South African Rand::cZAR': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'ECO CFA::eXOF': { id: 'mento', name: 'Mento', kind: 'protocol' },
  'PUSO::PUSO': { id: 'mento', name: 'Mento', kind: 'protocol' },
  // Fiat-reserve issuers named by the feed row that lists the address.
  'A7A5::A7A5': { id: 'old-vector', name: 'Old Vector', kind: 'institution' }, // feed 258; issuer Old Vector LLC (KG), per UK/EU/US sanction notices
  'CAD Coin::CADC': { id: 'paytrie', name: 'PayTrie', kind: 'institution' }, // feed 145 "issued by PAYTRIE AB Inc."; Linea copy: FiatToken, currency() = CAD
  'CAD Coin (PoS)::CADC': { id: 'paytrie', name: 'PayTrie', kind: 'institution' }, // chain: Polygon ChildChainManager.childToRootToken = 0xcadc… (1)
  'CAD Digital::CADD': { id: 'tetra', name: 'Tetra Trust', kind: 'institution' }, // feed 387 "issued by Tetra Trust Company"
  'CNH Tether::CNHT': { id: 'tether', name: 'Tether', kind: 'institution' }, // feed 280
  'Mexican Peso Tether::MXNT': { id: 'tether', name: 'Tether', kind: 'institution' }, // feed 281
  'HUSD::HUSD': { id: 'stable-universal', name: 'Stable Universal', kind: 'institution' }, // feed 17
  'JPYSC::JPYSC': { id: 'sbi-shinsei', name: 'SBI Shinsei Trust & Banking', kind: 'institution' }, // feed 427
  'KRW1::KRW1': { id: 'bdacs', name: 'BDACS', kind: 'institution' }, // feed 429
  'Newrails Euro::EURW': { id: 'newrails', name: 'Newrails', kind: 'institution' }, // feed 392
  'Palm USD::PUSD': { id: 'palm', name: 'Palm', kind: 'institution' }, // feed 314
  'Royal Dollar::RUSD': { id: 'rib-digital', name: 'RIB Digital', kind: 'institution' }, // feed 415 "issued by The RIB Digital Holdings Limited, Hong Kong"
  'Royal Euro::REUR': { id: 'rib-digital', name: 'RIB Digital', kind: 'institution' }, // feed 414, same issuer
  'Stable Mint USD::USDSM': { id: 'stable-mint', name: 'Stable Mint', kind: 'institution' }, // feed 411 (Malta EMI); 42793 copy: same owner() 0x1bb0… as 1
  'Unity USD::UUSD': { id: 'anything-labs', name: 'Anything Labs', kind: 'institution' }, // feed 407 "built by Anything Labs"; one address, same owner() 0x009c… on 1/56/8453/4663
  'Universal USD::USDU': { id: 'universal-digital', name: 'Universal Digital', kind: 'institution' }, // feed 410
  'USDKG::USDKG': { id: 'virtual-asset-issuer', name: 'Virtual Asset Issuer (Kyrgyz MoF)', kind: 'institution' }, // feed 409; issuer OJSC Virtual Asset Issuer
  'uaht.io::UAHT': { id: 'uaht', name: 'UAHT', kind: 'institution' }, // feed 131
  'DigitalDollar::DUSD': { id: 'fluid-ch', name: 'Fluid (fluid.ch)', kind: 'institution' }, // feed 70 — NOT Instadapp's Fluid
  'FinChain Dollar::FUSD': { id: 'finchain', name: 'FinChain', kind: 'institution' }, // feed 390; Fosun Wealth's FinChain
  'YLDS::YLDS': { id: 'figure', name: 'Figure', kind: 'institution' }, // feed 272 "issued by Figure Certificate Company"
  'Yield TRYB::YTRYB': { id: 'bilira', name: 'BiLira', kind: 'institution' }, // Balsa Finance (BiLira subsidiary) yTRYB on Base
  'GGUSD::GGUSD': { id: 'fsl', name: 'FSL', kind: 'institution' }, // feed 285: FSL's GGUSD, minted 1:1 from AUSD
  'Gaming XP USD::XPUSD': { id: 'growth-protocol', name: 'The Growth Protocol', kind: 'institution' }, // feed 330 (both addresses); the row's "via Brale" sentence is copied from litUSD and Brale does not list xpUSD, so no parent
  USC: { id: 'brale', name: 'Brale', kind: 'institution' }, // "Classic USD": feed 196 + brale.xyz/stablecoins/USC "issued by Brale"
  'Startale USD::USDSC': { id: 'startale', name: 'Startale', kind: 'institution' }, // feed 420 "issued by Startale Group", on M0
  // Branded programs minted by another desk — `parent` names it (cf. PYUSD/paxos, MetaMask USD/bridge).
  'litUSD::LITUSD': { id: 'lit-financial', name: 'LitFinancial', kind: 'institution', parent: 'brale' }, // brale.xyz/stablecoins/litUSD "issued by Brale for LitFinancial", 0x3b5f…
  'Revolut Euro::EURR': { id: 'revolut', name: 'Revolut', kind: 'institution', parent: 'bridge' }, // feed 436 "issued by Bridge Building S.A."
  'Deel USD::DLUSD': { id: 'deel', name: 'Deel', kind: 'institution', parent: 'bridge' }, // feed 440 "issued through Bridge's Open Issuance"
  'Open USD::OUSD': { id: 'open-standard', name: 'Open Standard', kind: 'institution', parent: 'bridge' }, // feed 443 (1 0x9f6f…, 8453 0xb200…); NOT Origin's OUSD
  'OpenUSD::OUSD': { id: 'open-standard', name: 'Open Standard', kind: 'institution', parent: 'bridge' }, // feed 443, Tempo 0x20c0…6a37
  'USAT::USAT': { id: 'tether', name: 'Tether', kind: 'institution', parent: 'anchorage' }, // feed 343: Tether's USA₮, "Anchorage Digital Bank, N.A. issues USAT"
  'MegaUSD::USDM': { id: 'megaeth', name: 'MegaETH', kind: 'protocol', parent: 'ethena' }, // feed 342; Ethena Whitelabel on USDtb rails
  PATHUSD: { id: 'bridge', name: 'Bridge', kind: 'institution' }, // feed 385 "PathUSD is issued by Bridge (Stripe)"
  'USDBridge::USDB': { id: 'bridge', name: 'Bridge', kind: 'institution' }, // feed 439
  // fUSD is Falcon-branded but Anchorage-ISSUED (anchorage.com "Anchorage Digital
  // Issues fUSD"). Not `falcon` + parent: that id is a protocol desk (USDf), and
  // one id must not carry two kinds.
  'Falcon Finance USD::FUSD': { id: 'anchorage', name: 'Anchorage Digital', kind: 'institution' }, // feed 395
  // Protocol dollars (CDP / synthetic / wrapper) — feed row names the protocol.
  'BAI Stablecoin::BAI': { id: 'astriddao', name: 'AstridDAO', kind: 'protocol' }, // feed 48
  'BITUSD::bitusd': { id: 'bitsmiley', name: 'bitSmiley', kind: 'protocol' }, // feed 191
  'BOB Token::BOB': { id: 'zkbob', name: 'zkBob', kind: 'protocol' }, // feed 84
  'BaoUSD::BaoUSD': { id: 'bao', name: 'Bao Finance', kind: 'protocol' }, // feed 94
  'Bitcoin USD::BtcUSD': { id: 'btcfi', name: 'BTCFi', kind: 'protocol' }, // feed 183
  'CZUSD::CZUSD': { id: 'czodiac', name: 'Czodiac', kind: 'protocol' }, // feed 107
  'Convertible JPY Token::CJPY': { id: 'yamato', name: 'Yamato', kind: 'protocol' }, // feed 179
  'Deuterium::d2O': { id: 'dam-finance', name: 'DAM Finance', kind: 'protocol' }, // feed 108
  'Digital Standard Unit::DSU': { id: 'emptyset', name: 'Empty Set', kind: 'protocol' }, // feed 100; docs.dsu.money "DSU by Emptyset"
  'Digital Standard Unit (PoS)::DSU': { id: 'emptyset', name: 'Empty Set', kind: 'protocol' }, // chain: childToRootToken = 0x605d… (1)
  'Dollar V3::FUSD': { id: 'fuse', name: 'Fuse', kind: 'protocol' }, // feed 338 "Fuse Dollar V3"
  'Fuse Dollar::fUSD': { id: 'fuse', name: 'Fuse', kind: 'protocol' }, // earlier Fuse Dollar contracts on 122
  'Fuse Dollar::fUSD::122::0': { id: 'fuse', name: 'Fuse', kind: 'protocol' },
  'EURO3::EURO3': { id: '3adao', name: '3A DAO', kind: 'protocol' }, // feed 170
  'Fantom USD::FUSD': { id: 'fantom', name: 'Fantom Foundation', kind: 'protocol' }, // feed 63 (fMint)
  'Fathom Dollar::FXD': { id: 'fathom', name: 'Fathom', kind: 'protocol' }, // product name of Fathom's XDC CDP
  'Fixed Income Asset Token::FIAT': { id: 'fiat-dao', name: 'FIAT DAO', kind: 'protocol' }, // feed 61
  'HEXDC Stablecoin::HEXDC': { id: 'powercity', name: 'POWERCITY', kind: 'protocol' }, // feed 201
  'PXDC Stablecoin::PXDC': { id: 'powercity', name: 'POWERCITY', kind: 'protocol' }, // feed 175
  'HYDT::HYDT': { id: 'hydt', name: 'HYDT Protocol', kind: 'protocol' }, // feed 142
  'Home::HOME': { id: 'homecoin', name: 'HomeCoin', kind: 'protocol' }, // feed 60, 1 0xb891… — NOT `HOME::HOME` (Defi App's governance token)
  'Honey::HONEY': { id: 'berachain', name: 'Berachain', kind: 'protocol' }, // feed 231 (Berachain's native HONEY)
  'Inverse USD::INVUSD': { id: 'inverse', name: 'Inverse Finance', kind: 'protocol' }, // feed 394 invUSD (Monolith)
  'Iron Bank EUR::IBEUR': { id: 'iron-bank', name: 'Iron Bank', kind: 'protocol' }, // feed 91
  'KEI Stablecoin::KEI': { id: 'keiko', name: 'Keiko Finance', kind: 'protocol' }, // feed 323
  'LCNY Stablecoin::LCNY': { id: 'alternity', name: 'Alternity', kind: 'protocol' }, // feed 127
  'Mead::MEAD': { id: 'rootsfi', name: 'RootsFi', kind: 'protocol' }, // feed 267
  'NECTAR::NECT': { id: 'beraborrow', name: 'Beraborrow', kind: 'protocol' }, // feed 329, 80094 0x1ce0…
  'NXUSD::NXUSD': { id: 'nereus', name: 'Nereus Finance', kind: 'protocol' }, // feed 103
  'Orki USDK::USDK': { id: 'orki', name: 'Orki', kind: 'protocol' }, // feed 265
  'Parallel USD::PAUSD': { id: 'parallel', name: 'Parallel', kind: 'protocol' }, // feed 222; casing twin of `Parallel USD::paUSD`
  'Pinto::PINTO': { id: 'pinto', name: 'Pinto', kind: 'protocol' }, // feed 232
  'Pleasing USD::PUSD': { id: 'pleasing', name: 'Pleasing', kind: 'protocol' }, // feed 341 (42161); 33139 copy is its LayerZero OFT
  'Polymarket USD::pUSD': { id: 'polymarket', name: 'Polymarket', kind: 'protocol' }, // feed 406
  'PHT Stablecoin::PHT': { id: 'apacx', name: 'APACX', kind: 'protocol' }, // feed 299 (1); product name on 137 too
  'Precious Metals USD::PMUSD': { id: 'raac', name: 'RAAC', kind: 'protocol' }, // feed 332 pmUSD, 1 0xc0c1… (pmusd.raac.io)
  'Quill USDQ::USDQ': { id: 'quill', name: 'Quill', kind: 'protocol' }, // feed 228
  'RIF US Dollar::USDRIF': { id: 'rif-on-chain', name: 'RIF on Chain', kind: 'protocol' }, // feed 159 (30); 42161 copy is its OFT
  'Real World Asset USD::rwaUSD': { id: 'multipli', name: 'Multipli', kind: 'protocol' }, // feed 432
  'rwaUSDi::rwaUSDi': { id: 'multipli', name: 'Multipli', kind: 'protocol' }, // feed 340 (143); 1672 copy: same owner() + implementation
  'Satoshi Stablecoin::satUSD': { id: 'river', name: 'River', kind: 'protocol' }, // feed 218 (60808); 223 copy: same owner/factory contract shape
  'Savvy USD::svUSD': { id: 'savvy', name: 'Savvy', kind: 'protocol' }, // feed 130
  'SoulPeg USD::SPUSD': { id: 'soulpeg', name: 'SoulPeg', kind: 'protocol' }, // feed 413
  'Sovryn Dollar::DLLR': { id: 'sovryn', name: 'Sovryn', kind: 'protocol' }, // feed 160
  'XUSD BabelFish::XUSD': { id: 'babelfish', name: 'BabelFish', kind: 'protocol' }, // feed 162
  'Spice USD::USDS': { id: 'spice-trade', name: 'Spice Trade', kind: 'protocol' }, // feed 31 — NOT Sky's USDS
  'STAR Token::STAR': { id: 'preon', name: 'Preon', kind: 'protocol' }, // feed 123, one OFT address 0xc196… on 137/8453/42161/81457
  'STAR::STAR': { id: 'preon', name: 'Preon', kind: 'protocol' }, // 534352, same 0xc196… and owner() as on 81457
  'Staked InfiniFi USD::siUSD': { id: 'infinifi', name: 'InfiniFi', kind: 'protocol' }, // casing twin of `Staked infiniFi USD::siUSD`; 747474 OFT
  'Synnax Stablecoin::SYUSD': { id: 'synnax', name: 'Synnax', kind: 'protocol' }, // docs.synnax.fi, Sei 0x059a…
  'TREN Debt Token::XY': { id: 'tren', name: 'Tren Finance', kind: 'protocol' }, // feed 223
  'The Fedz FUSD::FUSD': { id: 'the-fedz', name: 'The Fedz', kind: 'protocol' }, // feed 425
  'ULTRA::ULTRA': { id: 'prisma', name: 'Prisma', kind: 'protocol' }, // feed 163 PrismaLRT
  'US Sonic Dollar::USSD': { id: 'sonic-labs', name: 'Sonic Labs', kind: 'protocol' }, // feed 356; soniclabs.com/ussd
  'USC Stablecoin::USC': { id: 'orby', name: 'Orby', kind: 'protocol' }, // feed 188
  'USC::USC': { id: 'chi', name: 'Chi Protocol', kind: 'protocol' }, // feed 193 (1); 8453 copy: OP bridge remoteToken() = 0x3854… (1)
  'USDL Stablecoin::USDL': { id: 'liquid-loans', name: 'Liquid Loans', kind: 'protocol' }, // feed 152
  'USDM Stablecoin::USDM': { id: 'meridian', name: 'Meridian', kind: 'protocol' }, // Meridian deployed USDM natively on Telos (40) and Fuse (122)
  'USDP Stablecoin::USDP': { id: 'unit-protocol', name: 'Unit Protocol', kind: 'protocol' }, // feed 33 — NOT Paxos' USDP
  'USDT+::USDT+': { id: 'overnight', name: 'Overnight', kind: 'protocol' }, // feed 112 (59144)
  'USDu::USDu': { id: 'unitas', name: 'Unitas', kind: 'protocol' }, // feed 283
  'USP Yield Optimized Stablecoin::USP': { id: 'piku', name: 'PikuDAO', kind: 'protocol' }, // feed 331 — NOT Pareto's USP
  'XAI Stablecoin::XAI': { id: 'silo', name: 'Silo', kind: 'protocol' }, // feed 89
  'YUSD Stablecoin::YUSD': { id: 'yeti', name: 'Yeti Finance', kind: 'protocol' }, // feed 13
  'ZAI Stablecoin::USDZ': { id: 'maha', name: 'MahaDAO', kind: 'protocol' }, // ZAI (USDz) of the MAHA ecosystem, 1 0x6900…
  'bnb USD::bnbUSD': { id: 'sigma-money', name: 'Sigma Money', kind: 'protocol' }, // feed 293
  'zkUSD::ZKUSD': { id: 'goal3', name: 'Goal3', kind: 'protocol' }, // feed 151
  'flexUSD::FLEXUSD': { id: 'coinflex', name: 'CoinFLEX', kind: 'cex' }, // feed 21 (defunct desk is still the desk)
  'Nest Elixir Vault::NELIXIR': { id: 'nest', name: 'Nest', kind: 'institution' }, // a Nest vault, like the rwa-derived `nest` ones
  // a Nest vault OVER BlackRock's CLO ETF: the share is Nest's (rwaAssets.ts says so too); the seed read the name
  'Nest BlackRock iShares AAA CLO Active ETF Vault::NCLOA': { id: 'nest', name: 'Nest', kind: 'institution' },
  // Reserve Protocol RTokens — same treatment as `Electronic USD` / `Web 3 Dollar`.
  'Reserve::RSV': { id: 'reserve', name: 'Reserve', kind: 'protocol' }, // feed 25
  'KNOX::KNOX': { id: 'reserve', name: 'Reserve', kind: 'protocol' }, // feed 187; chain: main() (RToken)
  'High Yield USD Base::HYUSD': { id: 'reserve', name: 'Reserve', kind: 'protocol' }, // feed 144; chain: main() (RToken)
  RGUSD: { id: 'reserve', name: 'Reserve', kind: 'protocol' }, // feed 190 (1, main()); 8453 OP-bridge / 42161 gateway l1 = 0x78da…
  // Same asset, separate group — verified to be the curated desk's own token.
  'GHO::GHO': { id: 'aave', name: 'Aave', kind: 'protocol' }, // 57073 0xfc42…: same address + implementation as GHO on 43114/100/143
  'EURA (previously agEUR)::EURA': { id: 'angle', name: 'Angle', kind: 'protocol' }, // 1101 0xa61b…: same address as Base EURA, AgToken treasury()
  'EURA::EURA': { id: 'angle', name: 'Angle', kind: 'protocol' }, // 59144 0x1a7e…: same address as Ethereum EURA, AgToken treasury()
  'USDA::USDA': { id: 'angle', name: 'Angle', kind: 'protocol' }, // 0x0000206… (Angle vanity) on 1101/42220/43114 + 42161 0xfac5… whose gateway l1Address() = 0x0000206…
  'crvUSD::CRVUSD': { id: 'curve', name: 'Curve', kind: 'protocol' }, // 252: OP-standard bridge remoteToken() = crvUSD 0xf939… (1)
  'nUSD::nUSD': { id: 'synapse', name: 'Synapse', kind: 'protocol' }, // Synapse's own nexus dollar (feed 18 "Nexus USD", synapseprotocol.com); sdk-go token list has 56/137/42161/43114, sole MINTER_ROLE on 10/81457 is the SynapseBridge
  'Binance-Peg BUSD::BUSD': { id: 'binance', name: 'Binance', kind: 'cex' }, // 137 0x9c9e… — Binance-peg deployment (same address/impl as 10/43114)
  'TrueUSD::TUSD': { id: 'techteryx', name: 'Techteryx', kind: 'institution' }, // 56 0x40af… — TrueUSD's native BNB deployment (bscscan "TrueUSD: TUSD Token")
  'PayPal USD::PYUSD::42161::0': { id: 'paypal', name: 'PayPal', kind: 'institution', parent: 'paxos' }, // 42161 0x3270…: Arbitrum gateway l1Address() = PYUSD 0x6c3e… (1)
  'World Liberty Financial USD::USD1': { id: 'world-liberty', name: 'World Liberty Financial', kind: 'institution' }, // 42161 0x7550…: gateway l1Address() = USD1 0x8d0d… (1)
  'Verified USD::USDV': { id: 'verified-usd', name: 'Verified USD Foundation', kind: 'institution' }, // docs.usdv.money lists 1 0x0e57… and 0x3236… on 10/56/137/42161/43114
  'Wrapped iTRY::WITRY': { id: 'brix', name: 'Brix', kind: 'institution' }, // chain: wiTRY (1) asset() = iTRY 0xb492…; brix.money/itry — Brix's staked iTRY, OFT on 4326/4663

  // --- Solana (`solana.json`) ----------------------------------------------
  //
  // Keyed EXACTLY as solana.json holds the group: a mint with no cross-chain
  // evidence is `Name::SYMBOL::solana` (scripts/solana/solana.ts), so these
  // can never reach an EVM token. The few bare / global keys below are groups
  // a Solana mint JOINED, and the desk is the same on every chain. The LST /
  // RWA corners derive from `lst.provider` / `rwa.issuer` (issuer.ts reads
  // solana.json); these are the products no feed names. Same rule as above:
  // the group NAME (or the issuer's own metadata host) names the desk.
  'OnRe Tokenized Reinsurance::ONyc::solana': { id: 'onre', name: 'OnRe', kind: 'institution' }, // 5Y8NV33V… — OnRe's reinsurance note; Exponent's PT-ONyc walks to it
  'Jupiter Perps::JLP::solana': { id: 'jupiter', name: 'Jupiter', kind: 'protocol' }, // 27G8MtK7… — the Jupiter Perps LP token
  'Jupiter Staked SOL::JupSOL::solana': { id: 'jupiter', name: 'Jupiter', kind: 'protocol' }, // jupSoLaH…
  'Jupiter USD::JupUSD::solana': { id: 'jupiter', name: 'Jupiter', kind: 'protocol' }, // JuprjznT…
  'Infinity::INF::solana': { id: 'sanctum', name: 'Sanctum', kind: 'protocol' }, // 5oVNBeEE… — Sanctum Infinity, the multi-LST pool
  // Huma's PayFi Strategy Token: Solana original + its CCIP mirrors on 1 / 5042
  // (solana.ts SOLANA_MAPPEDS joins the mint to this group).
  'PayFi Strategy Token::PST': { id: 'huma', name: 'Huma', kind: 'protocol' },
  'USX::USX::solana': { id: 'solstice', name: 'Solstice', kind: 'protocol' }, // 6FrrzDk5…
  // Solstice's own yield-bearing USX. Carries no `savings.underlying`, so the
  // savings walk cannot reach USX from it — curated, as sUSDS is with USDS.
  'eUSX::eUSX::solana': { id: 'solstice', name: 'Solstice', kind: 'protocol' }, // 3ThdFZQK…
  // Phantom's CASH, issued through Bridge (Stripe) — its metadata is served from
  // token-metadata.bridge.xyz. Same shape as MetaMask USD above.
  'CASH::CASH::solana': { id: 'phantom', name: 'Phantom', kind: 'institution', parent: 'bridge' }, // CASHx9KJ…
  'hyUSD::hyUSD::solana': { id: 'hylo', name: 'Hylo', kind: 'protocol' }, // 5YMkXAYc… (metadata on hylo-token-metadata)
  'Earn Hylo USD::eHYUSD::solana': { id: 'hylo', name: 'Hylo', kind: 'protocol' }, // HnnGv3Hr…
  'Hylo Leveraged BTC::xBTC::solana': { id: 'hylo', name: 'Hylo', kind: 'protocol' }, // 2zCo6bUo… — NOT OKX's xBTC
  'Hylo Leveraged SOL::xSOL::solana': { id: 'hylo', name: 'Hylo', kind: 'protocol' }, // 4sWNB8zG…
  'Hylo Staked SOL::hyloSOL::solana': { id: 'hylo', name: 'Hylo', kind: 'protocol' }, // hy1oXYgr…
  'Hylo SOL Plus::hyloSOL+::solana': { id: 'hylo', name: 'Hylo', kind: 'protocol' }, // hy1opf2b…
  // OKX's wrapped BTC: X Layer (196 0xb7c0…) and its Solana mint CtzPWv73…,
  // one group. An exchange's own wrapper, like cbBTC / BTCB.
  'OKX Wrapped BTC::xBTC': { id: 'okx', name: 'OKX', kind: 'cex' },
  // Hastra (Figure's yield program): PRIME on 1 / 4217 / Solana, AUTO on 1 /
  // Solana. wYLDS is NOT here: its Solana metadata carries no name at all
  // (`::wYLDS::solana`), so nothing in the list says whose it is.
  'Hastra PRIME::PRIME': { id: 'hastra', name: 'Hastra', kind: 'protocol' },
  'Hastra AUTO::AUTO': { id: 'hastra', name: 'Hastra', kind: 'protocol' },
  // Wormhole Portal DAI (EjmyN6qE…) — a bridged copy over a live bridge is
  // still the desk's dollar, cf. `USDC::USDC(Wormhole)` above.
  'DAI (Portal)::DAI::solana': { id: 'sky', name: 'Sky', kind: 'protocol' },
  // Save's own stake pool — both mints are reserves of Save's main market under
  // that name (SAVEDpx3…, and sctmpFDK… which the list numbers `::0`).
  'Save Staked SOL::saveSOL::solana': { id: 'save', name: 'Save', kind: 'protocol' },
  'Save Staked SOL::saveSOL::solana::0': { id: 'save', name: 'Save', kind: 'protocol' },
}

/**
 * Per-DEPLOYMENT issuer, keyed `chainId:lowercaseAddress` — for the groups whose
 * deployments are different desks' tokens under one assetGroup (`BUSD` holds
 * Paxos' BUSD on 1 and Binance-peg BUSD on 56; `eUSD::EUSD` holds Lybra on 1
 * and Telcoin on 8453). A group key cannot say that, and majority-voting the
 * group would launder the other half into a wrong desk, so the generator
 * consults this BEFORE the group map, and `issuer.ts`' wrapper walk does too.
 *
 * Rules, stricter than the group map's:
 *  - one line per (chain, address), each citing on-chain or published evidence
 *    that THIS contract is the desk's token or a verifiable 1:1 bridge of it
 *    (canonical L2 bridge getters, Polygon PoS `childToRootToken`, Omnibridge
 *    `foreignTokenAddress`, Binance-peg `getOwner`) — a bridge is not a desk,
 *    but a verified route to one is still that desk's asset (README);
 *  - members that cannot be verified stay unattributed, and the group stays in
 *    unattributed-ok.json with a reason naming what is left.
 */
export const ISSUER_BY_ADDRESS: Record<string, IssuerProps> = {
  // --- BUSD: Paxos-minted vs Binance-peg -----------------------------------
  // Paxos' BUSD (feed 4) and its canonical-bridge copies.
  '1:0x4fabb145d64652a948d72533023f6e7a623c7c53': { id: 'paxos', name: 'Paxos', kind: 'institution' },
  '130:0xa4da5c92f44422dfa3e2e309b53d93bbbda9f9c6': { id: 'paxos', name: 'Paxos', kind: 'institution' }, // OP bridge remoteToken() = 0x4fab…
  '42161:0x31190254504622cefdfa55a7d3d272e6462629a2': { id: 'paxos', name: 'Paxos', kind: 'institution' }, // gateway l1Address() = 0x4fab…
  '137:0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7': { id: 'paxos', name: 'Paxos', kind: 'institution' }, // "(PoS) Binance USD", childToRootToken = 0x4fab…
  '100:0xd5fe5f651dde69f6fc444d123f2c0cfb804542cd': { id: 'paxos', name: 'Paxos', kind: 'institution' }, // Omnibridge foreignTokenAddress = 0x4fab…
  // Binance-peg BUSD (feed 153 "issued by Binance", 56 0xe9e7…) and Binance's
  // peg deployment at one address on 10/43114 (+137, keyed by group above).
  '56:0xe9e7cea3dedca5984780bafc599bd69add087d56': { id: 'binance', name: 'Binance', kind: 'cex' },
  '10:0x9c9e5fd8bbc25984b178fdce6117defa39d2db39': { id: 'binance', name: 'Binance', kind: 'cex' }, // "BUSD Token", impl 0x7619… = 43114's
  '43114:0x9c9e5fd8bbc25984b178fdce6117defa39d2db39': { id: 'binance', name: 'Binance', kind: 'cex' },

  // --- TUSD: Techteryx (owner of TrueUSD since 2020, sole operator since July
  // 2023 per Bloomberg/HK court filings) — native deployments and verified
  // canonical bridges; Binance-peg TUSD is Binance's.
  '1:0x0000000000085d4780b73119b644ae5ecd22b376': { id: 'techteryx', name: 'Techteryx', kind: 'institution' },
  '43114:0x1c20e891bab6b1727d14da358fae2984ed9b59eb': { id: 'techteryx', name: 'Techteryx', kind: 'institution' }, // TrueUSD's native Avalanche deployment
  '10:0xcb59a0a753fdb7491d5f3d794316f1ade197b21e': { id: 'techteryx', name: 'Techteryx', kind: 'institution' }, // OP bridge l1Token() = 0x0000…085d
  '42161:0x4d15a3a2286d883af0aa1b3f21367843fac63e07': { id: 'techteryx', name: 'Techteryx', kind: 'institution' }, // gateway l1Address() = 0x0000…085d
  '137:0x2e1ad108ff1d8c782fcbbb89aad783ac49586756': { id: 'techteryx', name: 'Techteryx', kind: 'institution' }, // "TrueUSD (PoS)", childToRootToken = 0x0000…085d
  '100:0xb714654e905edad1ca1940b7790a8239ece5a9ff': { id: 'techteryx', name: 'Techteryx', kind: 'institution' }, // Omnibridge foreignTokenAddress = 0x0000…085d
  '56:0x14016e85a25aeb13065688cafb43044c2ef86784': { id: 'binance', name: 'Binance', kind: 'cex' }, // getOwner() = 0xf68a… (Binance-peg owner, as on Binance-Peg ETH 0x2170…)

  // --- eUSD::EUSD: Lybra v2 on 1, Telcoin on 8453 ---------------------------
  '1:0xdf3ac4f479375802a821f7b7b46cd7eb5e4262cc': { id: 'lybra', name: 'Lybra', kind: 'protocol' }, // feed 125 "eUSD (V2)", lybra.finance
  '8453:0x14913815bcfde78baead2111f463d038ac9c2949': { id: 'telcoin', name: 'Telcoin', kind: 'protocol' }, // feed 416 Telcoin eUSD, same address as 1/137

  // --- USDV: Verified USD vs Delpho ----------------------------------------
  // docs.usdv.money lists exactly these. DeFiLlama's "Valtorum USD" row maps
  // 0x3236… on 56, but valtorum.com/contract-addresses lists different
  // contracts (56 0x96c2…, 137 0x2b9b…, 42161 0xdef7…), so that mapping is wrong.
  '10:0x323665443cef804a3b5206103304bd4872ea4253': {
    id: 'verified-usd',
    name: 'Verified USD Foundation',
    kind: 'institution',
  },
  '56:0x323665443cef804a3b5206103304bd4872ea4253': {
    id: 'verified-usd',
    name: 'Verified USD Foundation',
    kind: 'institution',
  },
  '42161:0x323665443cef804a3b5206103304bd4872ea4253': {
    id: 'verified-usd',
    name: 'Verified USD Foundation',
    kind: 'institution',
  },
  '43114:0x323665443cef804a3b5206103304bd4872ea4253': {
    id: 'verified-usd',
    name: 'Verified USD Foundation',
    kind: 'institution',
  },
  '42161:0xaa77663912565623ab91ddfe08b803762792a8a9': {
    id: 'verified-usd',
    name: 'Verified USD Foundation',
    kind: 'institution',
  }, // gateway l1Address() = 0x0e57… (1)
  '999:0x8c6eb3c8d1fddc752684274fb4a3eb98dbe9cd26': { id: 'delpho', name: 'Delpho', kind: 'protocol' }, // feed 431; name() "Delpho Stable Token"

  // --- USDB::USDB: Bancor's legacy USDB on 1, Blast's native USDB on 81457 ---
  '1:0x309627af60f0926daa6041b8279484312f2bf060': { id: 'bancor', name: 'Bancor', kind: 'protocol' }, // name() "Bancor USD Token"
  '81457:0x4300000000000000000000000000000000000003': { id: 'blast', name: 'Blast', kind: 'protocol' }, // feed 172, Blast predeploy

  // --- Remaining split groups -----------------------------------------------
  '56:0x17eafd08994305d8ace37efb82f1523177ec70ee': { id: 'ap-web3', name: 'AP Web3', kind: 'institution' }, // `USDA::USDA::56::0`, feed 405 AP USDA
  '100:0xa555d5344f6fb6c65da19e403cb4c1ec4a1a5ee3': { id: 'breadchain', name: 'Breadchain', kind: 'protocol' }, // feed 180; name() "Breadchain Stablecoin"
  '250:0x74e23df9110aa9ea0b6ff2faee01e740ca1c642e': { id: 'hector', name: 'Hector Network', kind: 'protocol' }, // TOR, feed 29 (tor.cash)
  '146:0x53e24706d6642ca495498557415b1af7a025d8da': { id: 'overnight', name: 'Overnight', kind: 'protocol' }, // USD+ with Overnight's exchange() interface
  '56:0x23e8a70534308a4aaf76fb8c32ec13d17a3bd89e': { id: 'linear', name: 'Linear Finance', kind: 'protocol' }, // ℓUSD (bscscan / CoinGecko "Linear Finance lUSD")
  '56:0xd89336eac00e689d218c46cdd854585a09f432b3': { id: 'linear', name: 'Linear Finance', kind: 'protocol' }, // pre-migration ℓUSD, same proxy admin 0x2002… as above

  // --- BTC (issuer:check:eth-btc): the mixed bare `BTC` group --------------
  // Ava Labs' BTC.b and its LayerZero OFT copies. On Avalanche the OFT proxy
  // 0x2297… has token() = 0x152b… (BTC.b); on 10/137/1116/42161 the OFT at
  // the same 0x2297… has trustedRemoteLookup(106 = Avalanche) = that proxy.
  '43114:0x152b9d0fdc40c096757f570a51e494bd4b943e50': { id: 'ava-labs', name: 'Ava Labs', kind: 'institution' },
  '10:0x2297aebd383787a160dd0d9f71508148769342e3': { id: 'ava-labs', name: 'Ava Labs', kind: 'institution' },
  '137:0x2297aebd383787a160dd0d9f71508148769342e3': { id: 'ava-labs', name: 'Ava Labs', kind: 'institution' },
  '1116:0x2297aebd383787a160dd0d9f71508148769342e3': { id: 'ava-labs', name: 'Ava Labs', kind: 'institution' },
  '42161:0x2297aebd383787a160dd0d9f71508148769342e3': { id: 'ava-labs', name: 'Ava Labs', kind: 'institution' },
  // Symbiosis' bridged BTC — the bridge custodies the BTC it mints against, so
  // it is the desk here (as Ava Labs is for BTC.b). Only the deployment whose
  // name() says so; `syBTC` on 30/56 is left blank.
  '324:0xed0c95ebe5a3e687cb2224687024fec6518e683e': { id: 'symbiosis', name: 'Symbiosis', kind: 'protocol' },

  // --- Robinhood Stock Tokens on Robinhood Chain (4663) ----------------------
  // Robinhood Assets (Jersey) Ltd. One line per token, generated from the address-keyed
  // RWA rows in rwa/rwaAssets.ts (membership = the shared token beacon 0xe10b…1b00, see
  // there). Address-scoped rather than group-keyed on purpose: the list names them like
  // the company ("Apple::AAPL", "GameStop::GME", "Oracle::ORCL"), groups that unrelated
  // tokens on other chains already share (GME on 369/8453, ORCL on 8453, the aliased
  // bare `FLY` group), and a group key would hand those Robinhood's desk.
  ...Object.fromEntries(
    Object.entries(RWA_MANUAL['4663'] ?? {})
      .filter(([, rwa]) => rwa.issuer === 'robinhood')
      .map(([address]) => [`4663:${address}`, { id: 'robinhood', name: 'Robinhood', kind: 'institution' } as IssuerProps]),
  ),

  // --- Solana: base58 mints, lower-cased as a LOOKUP KEY only ---------------
  // (lookupIssuerByAddress lower-cases both sides; solana.json keeps the mint
  // verbatim.) Superstate's FWDI share (`7GzQgf6D…`, Kamino "Superstate Opening
  // Bell Market", icon on assets.superstate.com) — Backpack's FWDI (`FWDtiB5f…`)
  // is a different token and derives `backpack` from its rwa tag.
  'solana:7gzqgf6dpo6zanjnbhe9tncpkgtv3zqhbsdx74jyqf9': { id: 'superstate', name: 'Superstate', kind: 'institution' },
}
