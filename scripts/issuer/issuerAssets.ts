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
