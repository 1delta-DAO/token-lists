import { SavingsGroupMap } from '../utils/types'

/**
 * Curated, authoritative savings-token allowlist, keyed by `assetGroup`.
 *
 * This is the SOURCE OF TRUTH for what counts as a "savings token": a PASSIVE yield-bearing
 * wrapper whose underlying is a stablecoin (deposit X → accrue a savings rate → redeem X).
 * A token is classified as savings ONLY if its assetGroup appears here — nothing is
 * auto-included. This is deliberate: an actively-managed fund (Maple's syrupUSDC, Midas
 * mTBILL/mBASIS, yield optimizers, …) also reports a stablecoin from ERC-4626 `asset()`, so
 * on-chain resolution alone would false-positive. Those must be judged by a human.
 *
 * `underlying` may be omitted — the generator (`npm run savings`) fills it in from the
 * on-chain `asset()` getter. Set it explicitly here to pin/override the resolver.
 *
 * To add a wrapper: find its assetGroup in `savings/savings-candidates.json` (the review
 * queue, sorted by market cap) and copy the row here once you've confirmed it is passive.
 */
export const SAVINGS_CURATED: SavingsGroupMap = {
  // --- Sky (ex-Maker) — DSR / Sky Savings Rate ---
  // Same token carries several assetGroup strings across chains (case + name prefix),
  // so every variant must be listed for the overlay to cover all deployments.
  SDAI: { underlying: 'DAI', base: 'USD' },
  'Savings Dai (PoS)::sDAI': { underlying: 'DAI', base: 'USD' },
  'sUSDS::SUSDS': { underlying: 'USDS', base: 'USD' },
  'sUSDS::sUSDS': { underlying: 'USDS', base: 'USD' },
  'Savings USDS::sUSDS': { underlying: 'USDS', base: 'USD' },
  'Savings USDS from Ethereum::sUSDS': { underlying: 'USDS', base: 'USD' },
  'Staked USDS::stUSDS': { underlying: 'USDS', base: 'USD' },
  // --- Spark Savings V1 — sUSDC (PSM3 wrapper; a share IS an sUSDS, so the rate is the Sky
  // Savings Rate verbatim). "Spark USDC::SUSDC" is aliased to the Vault form in
  // `assetGroupUnifier.ts`; kept here so the overlay still resolves if that alias is ever
  // dropped. ---
  'Spark USDC Vault::sUSDC': { underlying: 'USDC', base: 'USD' },
  'Spark USDC::SUSDC': { underlying: 'USDC', base: 'USD' },
  // --- Spark Vaults V2 — `sp*`, a different product from sUSDC above: its own chi/rho/vsr
  // accumulator rather than a PSM3 wrapper. Still a passive savings wrapper from the holder's
  // side (deposit X → accrue an administered `vsr` → redeem X), so it belongs here; the fact
  // that Spark lends the deposits out through the Liquidity Layer is a credit risk, not an
  // active-management one on the depositor's position. ---
  // spETH is deliberately absent: this allowlist is for stablecoin wrappers and `base` is a
  // FIAT peg, which a WETH-underlying vault has none of. It is still a first-class savings
  // vault in margin-fetcher's SAVINGS_REGISTRY — the two lists answer different questions.
  'Spark Savings USDC::SPUSDC': { underlying: 'USDC', base: 'USD' },
  'Spark Savings USDT::SPUSDT': { underlying: 'USDT', base: 'USD' },
  // --- Frax staked frxUSD ---
  'Staked Frax USD::sfrxUSD': { underlying: 'frxUSD', base: 'USD' },
  // --- OpenEden cUSDO — permissionless 4626 over rebasing USDO (T-bill yieldcoin);
  // casing/spacing variants aliased to the canonical group in assetGroupUnifier, all
  // listed here Sky-style so the overlay resolves either way. ---
  'Compounding Open Dollar::CUSDO': { underlying: 'USDO', base: 'USD' },
  'Compounding Open Dollar::cUSDO': { underlying: 'USDO', base: 'USD' },
  'Compounding OpenDollar::CUSDO': { underlying: 'USDO', base: 'USD' },
  // --- Inverse Finance sDOLA ---
  'sDOLA::SDOLA': { underlying: 'DOLA', base: 'USD' },
  // --- Ethena sUSDe (7d cooldown; canonical savings wrapper) ---
  SUSDE: { underlying: 'USDe', base: 'USD' },
  // --- Reservoir — both minted from rUSD, both NON-rebasing (price appreciates in rUSD), both
  // omnichain via LayerZero OFT. srUSD accrues daily (micro burn fee on redeem); wsrUSD accrues
  // per-block (no fee) — distinct exchange rates, so they stay separate groups (NOT unified like
  // wrsETH→RSETH, since srUSD bridges itself and wsrUSD is a separate wrapper, not srUSD's OFT). ---
  'Reservoir srUSD::SRUSD': { underlying: 'rUSD', base: 'USD' },
  'Wrapped Savings rUSD::WSRUSD': { underlying: 'rUSD', base: 'USD' },
  'Wrapped Savings rUSD::wsrUSD': { underlying: 'rUSD', base: 'USD' },
  // --- Resolv wstUSR (non-rebasing wrapper of stUSR, over USR) ---
  'Resolv wstUSR::WSTUSR': { underlying: 'USR', base: 'USD' },
  // --- Falcon sUSDf ---
  'Staked Falcon USD::sUSDf': { underlying: 'USDf', base: 'USD' },
  // --- InfiniFi siUSD ---
  'Staked infiniFi USD::siUSD': { underlying: 'iUSD', base: 'USD' },
  'Staked InfiniFi USD::siUSD': { underlying: 'iUSD', base: 'USD' },
  // --- Avant savUSD (Avalanche; 24h cooldown) ---
  'Staked avUSD::savUSD': { underlying: 'avUSD', base: 'USD' },
  // --- YieldFi yUSD (ERC-4626 over USDC) ---
  'YieldFi yUSD::yUSD': { underlying: 'USDC', base: 'USD' },
  'YieldFi yToken::yUSD': { underlying: 'USDC', base: 'USD' },
  'YieldFi yToken::YUSD': { underlying: 'USDC', base: 'USD' },
  // --- USD.ai sUSDAI — two assetGroup forms across chains (1/42161/9745 vs Base) ---
  'sUSDai::SUSDAI': { underlying: 'USDai', base: 'USD' },
  'Staked USDai::sUSDai': { underlying: 'USDai', base: 'USD' },
  // --- TRON Savings USDD (sUSDD) ---
  'Savings Usdd::sUSDD': { underlying: 'USDD', base: 'USD' },
  // --- Cap Staked USD (stcUSD, over cUSD) — case variant across chains ---
  'Staked Cap USD::stcUSD': { underlying: 'cUSD', base: 'USD' },
  'Staked cap USD::stcUSD': { underlying: 'cUSD', base: 'USD' },
  // --- Staked YUSD (sYUSD) — NOT 'Synnax Stablecoin::SYUSD' (a different token) ---
  'Staked YUSD::sYUSD': { underlying: 'YUSD', base: 'USD' },
  // --- YieldFi vyUSD (vault yUSD) — NOT 'Vyro vyUSD' (different issuer) ---
  'YieldFi vyUSD::VYUSD': { underlying: 'USDC', base: 'USD' },
  'YieldFi vyUSD::vyUSD': { underlying: 'USDC', base: 'USD' },
  // --- Staked UTY (yUTY) ---
  'Staked UTY::YUTY': { underlying: 'UTY', base: 'USD' },
  'Staked UTY::yUTY': { underlying: 'UTY', base: 'USD' },
  // --- Surfaced via DeFiLlama yield-bearing-stablecoins cross-check (passive wrappers only;
  // Midas mTBILL/mBASIS are RWA funds, and steakUSDC/YOUSD/USP are actively-managed → excluded) ---
  'f(x) USD Saving::fxSAVE': { underlying: 'fxUSD', base: 'USD' },
  SUSN: { underlying: 'USN', base: 'USD' },
  'Staked USN::sUSN': { underlying: 'USN', base: 'USD' },
  'Astherus Staked USDF::asUSDF': { underlying: 'USDF', base: 'USD' },
  'Anzen Staked USDz::SUSDZ': { underlying: 'USDz', base: 'USD' },
  'Anzen Staked USDz::sUSDz': { underlying: 'USDz', base: 'USD' },
  'Staked USDz::sUSDz': { underlying: 'USDz', base: 'USD' },
  'Staked Level USD::SLVLUSD': { underlying: 'lvlUSD', base: 'USD' },
  'sUSD1+::sUSD1+': { underlying: 'USD1+', base: 'USD' },
  'Strata Senior NUSD::srNUSD': { underlying: 'NUSD', base: 'USD' },
  // --- Neutrl sNUSD (over NUSD) — canonical + the pre-alias reversed stored form ---
  'Staked NUSD::sNUSD': { underlying: 'NUSD', base: 'USD' },
  'sNUSD::Staked NUSD': { underlying: 'NUSD', base: 'USD' },
  // --- Apyx apyUSD (over apxUSD; STRC preferred-stock dividend yield) — canonical + the
  // pre-alias chain-1 case-split ---
  'apyUSD::APYUSD': { underlying: 'apxUSD', base: 'USD' },
  'apyUSD::apyUSD': { underlying: 'apxUSD', base: 'USD' },
  // --- 3Jane USD3 (senior tranche over USDC) + sUSD3 (junior, over USD3) ---
  // Canonical qualified groups + the pre-alias bare stored forms. NB the bare
  // keys are 3Jane-specific: the unrelated USD3 tickers (Stable.com, Reserve)
  // hold qualified groups and never resolve to these.
  '3Jane USD3::USD3': { underlying: 'USDC', base: 'USD' },
  'USD3::USD3': { underlying: 'USDC', base: 'USD' },
  '3Jane Staked USD3::sUSD3': { underlying: 'USD3', base: 'USD' },
  'sUSD3::sUSD3': { underlying: 'USD3', base: 'USD' },
  'YieldFi Stable Token::sUSD': { underlying: 'USDC', base: 'USD' },
  // --- Angle stUSD (over USDA) ---
  'Angle Staked USDA::stUSD': { underlying: 'USDA', base: 'USD' },
  'Bridged Angle Staked USDA::stUSD': { underlying: 'USDA', base: 'USD' },
  // --- Angle stEUR (over EURA — EUR-pegged; three assetGroup forms across chains) ---
  'Angle Staked EURA::stEUR': { underlying: 'EURA', base: 'EUR' },
  'Angle Staked EURA::STEUR': { underlying: 'EURA', base: 'EUR' },
  'Staked EURA::stEUR': { underlying: 'EURA', base: 'EUR' },
  STEUR: { underlying: 'EURA', base: 'EUR' },
  // --- Maple syrup* — actively-managed credit pools (request-based redemption).
  // Included per request despite the managed-fund caveat; the underlying is the deposit ticker.
  SYRUPUSDC: { underlying: 'USDC', base: 'USD' },
  SYRUPUSDT: { underlying: 'USDT', base: 'USD' },
  SYRUPUSDG: { underlying: 'USDG', base: 'USD' },

  // --- FLAGGED, left out pending your call (actively-managed / exotic) ---
  // Hastra PRIME wraps wYLDS (4626-over-USDC), whitelist-gated:
  // 'Hastra PRIME::PRIME': { underlying: 'wYLDS', base: 'USD' },
}
