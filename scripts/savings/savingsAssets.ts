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
  // Inverse jrDOLA (v2) — the junior, first-loss tranche: a 4626 over sDOLA (itself the DOLA
  // savings wrapper), so the underlying is sDOLA, not DOLA. Passive from the holder's side (DBR
  // revenue accrues into the share price); the first-loss slash is a credit risk, the Strata
  // junior call. v1 (`Junior DOLA v1 (superseded)::JRDOLA`) is deliberately absent. sINV
  // (staked INV) is absent too: INV is not a stablecoin, the spETH call.
  'Junior DOLA::JRDOLA': { underlying: 'sDOLA', base: 'USD' },
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
  'InfiniFi Staked USD::siUSD': { underlying: 'iUSD', base: 'USD' }, // Tempo name()
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
  // --- Cap stcUSD (over cUSD) — one vanity address on Ethereum / MegaETH /
  // Katana whose `name()` differs by a single character ("Staked cap USD" on
  // mainnet, "Staked Cap USD" on the two bridged mirrors). Both forms are kept
  // Sky-style so the overlay resolves either way, but the split is now fixed at
  // the source: `assetGroupUnifier.ts` aliases the capitalised form to the
  // mainnet one, which is the only chain with a real vault and the key
  // margin-fetcher's `capFetcher` and SAVINGS_REGISTRY row use. ---
  'Staked Cap USD::stcUSD': { underlying: 'cUSD', base: 'USD' },
  'Staked cap USD::stcUSD': { underlying: 'cUSD', base: 'USD' },
  // --- Flying Tulip ssftUSD (Ethereum) — auto-compounding ERC-4626 over
  // ftUSD whose epoch rewards vest into the share price over 8 h; Morpho Blue
  // collateral. Shares are 18-dec over 6-dec ftUSD. ---
  'Stable Staked Flying Tulip USD::ssftUSD': { underlying: 'ftUSD', base: 'USD' },
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
  // --- eva.markets evaUSDC / evaUSDT (Ethereum vault + OFT mirrors) ---
  // A 4626 over USDC / USDT whose price is PINNED at 1: the Wildcat interest is skimmed to
  // eva's operator, so the holder earns nothing — `savings` classifies the SHAPE (a 4626 over a
  // dollar), never a yield. evaETH is absent on the spETH rule (dollar wrappers only).
  'evaUSDC::EVAUSDC': { underlying: 'USDC', base: 'USD' },
  'evaUSDT::EVAUSDT': { underlying: 'USDT', base: 'USD' },
  // --- Lista USDT.Treasury (BNB) — Lista's permissionless 18-dec wrapper over the
  // KYC-only Centrifuge JTRSY vault (Janus Henderson short-dated US T-bills). Passive by
  // this list's test: deposit USDT, accrue the fund's interest (dripped weekly into the
  // share price, 5 % to Lista), request USDT back on the fund's 5–14-day cycle. Its
  // sibling USDT.AAA (0x82664f43…, over JAAA, AAA-rated CLOs) is deliberately ABSENT:
  // an actively-managed credit fund, the syrupUSDC exclusion. Both are savings rows in
  // margin-fetcher's SAVINGS_REGISTRY — the two lists answer different questions.
  'USDT.Treasury::USDT.Treasury': { underlying: 'USDT', base: 'USD' },
  // --- Saturn sUSDat (over USDat) — passive by the test this list applies:
  // deposit USDat, accrue a distribution the protocol pays in every three
  // days, redeem USDat, with no allocation decisions on the depositor's
  // position.
  //
  // **Included with the loudest caveat on this list.** `base: 'USD'` is right
  // — USDat is a dollar and holds its peg ($0.9997, and it round-trips the
  // Curve pool at −3 bps) — but the SHARE is not principal-stable: sUSDat's
  // assets are 96.5 % Strategy's STRC preferred stock, held outright and
  // marked to an oracle, and the share price ran 1.0000 → 0.7792 → 1.0176
  // over the vault's first five months. It paid a ~12 % dividend across that
  // period and still returned 3.7 % annualised, after a 22.8 % drawdown.
  //
  // That is the same "shape vs risk" split the Strata juniors below are
  // included under, and the same warning: `savings` classifies the WRAPPER,
  // never the principal. margin-fetcher carries the machine-readable half as
  // `yieldProfile: 'volatile'`; see SATURN.md in `lending-sdks`.
  //
  // BOTH stored spellings are keyed, for the pre-alias reason spelled out
  // under scrvUSD: chain 1 stores `Saturn sUSDat::SUSDAT` while the BNB (56)
  // and Monad (143) OFT mirrors store `Staked Saturn USD::sUSDat`, and
  // `lookupSavings` runs before `aliasAssetGroup` folds them. Only Ethereum
  // is the vault — the mirrors' entire 4626 surface reverts — and that
  // distinction lives in margin-fetcher's SAVINGS_REGISTRY, not here. ---
  'Saturn sUSDat::SUSDAT': { underlying: 'USDat', base: 'USD' },
  'Staked Saturn USD::sUSDat': { underlying: 'USDat', base: 'USD' },
  // --- Tori strUSD — same shape: chain 1 stores `Tori Staked trUSD::STRUSD`,
  // the Monad (143) / Pharos (1672) CCIP mirrors `Staked trUSD::strUSD`,
  // aliased to the chain-1 form AFTER this lookup (assetGroupUnifier). The
  // chain-1 key is in the generated block below; this is the mirrors'. ---
  'Staked trUSD::strUSD': { underlying: 'trUSD', base: 'USD' },
  // --- Ripe sGREEN — plain instant ERC-4626 over GREEN on Base and Robinhood
  // Chain. The two vaults are independent (different share prices), so
  // Robinhood's stores a chain-suffixed group and must never be aliased onto
  // Base's. ---
  'Savings Green USD::sGREEN': { underlying: 'GREEN', base: 'USD' },
  'Savings Green USD::sGREEN::4663::0': { underlying: 'GREEN', base: 'USD' },
  // --- Strata (docs.strata.markets) — risk-tranched CDOs over yield-bearing
  // dollars, 5 listed markets × senior/junior. `underlying` is the tranche's
  // ERC-4626 `asset()` (what you deposit), NOT the market's staked collateral:
  // the mHYPER / mM1-USD markets account in USDC while holding mHYPER / mM1.
  // Casing is per-token inconsistent in the stored list (SRUSDE vs srNUSD vs
  // jrUSDe) and no GROUP_ALIAS normalises it, so each group is keyed verbatim
  // — verified against the live chain-1 list 2026-08-04.
  //
  // The juniors are included deliberately, following the 3Jane sUSD3
  // precedent above: this flag classifies the *shape* (a passive 4626 wrapper
  // over a stable underlying), while risk lives in `props.risk`. Do NOT read
  // `savings` as "principal-stable" — a junior tranche is first-loss capital
  // and jrUSDat is the live proof, marked to ~0.36 absorbing the 2026-06/07
  // drawdown in its collateral while its senior held par. Note what that
  // collateral is: Saturn's sUSDat, marked to Strategy's STRC preferred stock
  // and down 22.8 % peak to trough. **USDat itself never lost its peg** — it
  // traded at $0.9997 throughout — so "the USDat depeg", which this comment
  // used to say, named the wrong token.
  // Liminal limUSD (HyperEVM) — delta-neutral USD NAV token; no `asset()`, so the
  // candidate generator could not resolve it (a miss, not an exclusion).
  'limUSD::LIMUSD': { underlying: 'USDC', base: 'USD' },
  'Strata Senior USDe::SRUSDE': { underlying: 'USDe', base: 'USD' },
  'Strata Junior USDe::jrUSDe': { underlying: 'USDe', base: 'USD' },
  'Strata Senior NUSD::srNUSD': { underlying: 'NUSD', base: 'USD' },
  'Strata Junior NUSD::JRNUSD': { underlying: 'NUSD', base: 'USD' },
  'Strata Senior mHYPER::srmHYPER': { underlying: 'USDC', base: 'USD' },
  'Strata Junior mHYPER::JRMHYPER': { underlying: 'USDC', base: 'USD' },
  'Strata Senior nOPAL::SRNOPAL': { underlying: 'USDC', base: 'USD' },
  'Strata Junior nOPAL::JRNOPAL': { underlying: 'USDC', base: 'USD' },
  'Strata Senior mM1-USD::SRMM1-USD': { underlying: 'USDC', base: 'USD' },
  'Strata Junior mM1-USD::JRMM1-USD': { underlying: 'USDC', base: 'USD' },
  'Strata Senior USDat::SRUSDAT': { underlying: 'USDat', base: 'USD' },
  'Strata Junior USDat::JRUSDAT': { underlying: 'USDat', base: 'USD' },
  // srPRIME / jrPRIME (the Hastra PRIME market) are absent from the token
  // list entirely, so keys for them would be inert — and PRIME itself is the
  // flagged/whitelist-gated entry at the bottom of this file. Add both
  // together if that call changes:
  // 'Strata Senior PRIME::srPRIME': { underlying: 'USDC', base: 'USD' },
  // 'Strata Junior PRIME::jrPRIME': { underlying: 'USDC', base: 'USD' },
  // --- Tori strUSD — StakedUSDeV2 clone over trUSD, Tori's delta-neutral
  // synthetic dollar. Missed when the vault shipped; trUSD itself is already
  // in the stablecoin feed ('Tori trUSD::TRUSD'). ---
  'Tori Staked trUSD::STRUSD': { underlying: 'trUSD', base: 'USD' },
  // --- Brix wiTRY — StakedUSDeV2 clone over iTRY, a TURKISH LIRA stablecoin
  // backed by shares in a regulated basket of Turkish money-market funds.
  // Passive by the test this list applies: deposit iTRY → accrue an
  // administered distribution → redeem iTRY, with no allocation decisions on
  // the depositor's position.
  //
  // `base: 'TRY'` is load-bearing, not decoration. Every other row here is a
  // dollar (or the two Angle euro rows), so a consumer that ignores `base`
  // will render a ~37 % lira rate in the same column as a 4 % dollar one —
  // and the lira pays 37 % precisely because it depreciates. This field is the
  // only machine-readable signal that the two are not comparable. Same
  // reasoning as `stEUR` above, one order of magnitude louder.
  //
  // One assetGroup covers both deployments (chain 1 and MegaETH 4326) and it
  // is already canonical in the stored lists, so no GROUP_ALIAS is needed —
  // but note only the chain-1 token is the actual vault; the MegaETH one is a
  // LayerZero OFT whose 4626 surface reverts. That distinction lives in
  // margin-fetcher's SAVINGS_REGISTRY, not here: this overlay classifies the
  // ASSET, which is the same asset on both chains.
  'Wrapped iTRY::WITRY': { underlying: 'iTRY', base: 'TRY' },
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
  // The bare-ticker keys are the legacy (March-2025 CoinGecko) groups on 1/8453/42161; newer
  // deployments (Tempo) group by on-chain name/symbol and are aliased to them AFTER this lookup.
  SYRUPUSDC: { underlying: 'USDC', base: 'USD' },
  SYRUPUSDT: { underlying: 'USDT', base: 'USD' },
  SYRUPUSDG: { underlying: 'USDG', base: 'USD' },
  'Syrup USDC::syrupUSDC': { underlying: 'USDC', base: 'USD' },
  'Syrup USDT::syrupUSDT': { underlying: 'USDT', base: 'USD' },
  'Syrup USDG::syrupUSDG': { underlying: 'USDG', base: 'USD' },
  // Arbitrum's CCIP mirror names itself the bare ticker (`syrupUSDG::SYRUPUSDG`), aliased too.
  'syrupUSDG::SYRUPUSDG': { underlying: 'USDG', base: 'USD' },
  // --- Huma PayFi Strategy Token — USDC in, PayFi receivables yield accrues to the share.
  // Solana's original already reads `savings: {base: USD}` (solanaClassify, from its tags); this
  // gives its CCIP mirrors on 1 / 5042, one group, the same money. ---
  'PayFi Strategy Token::PST': { underlying: 'USDC', base: 'USD' },
  // --- Wren wstGBP (over tGBP — GBP-pegged). `underlying` is PINNED because the wrapper
  // exposes no 4626 surface at all (`asset()`/`underlying()`/`token()` all revert), so the
  // on-chain resolver cannot fill it in. The link was verified by backing instead: the wstGBP
  // contract holds 84,071.70 tGBP against 83,293.90 wstGBP outstanding (~1.0093 tGBP per share,
  // i.e. accrued yield) — the signature of a passive savings wrapper. ---
  'Wren Staked tGBP::wstGBP': { underlying: 'tGBP', base: 'GBP' },
  // --- Theo sthUSD (over thUSD) — a passive staked wrapper by the test this
  // list applies: deposit thUSD, accrue a pushed distribution, redeem thUSD,
  // with no allocation decisions on the depositor's position.
  //
  // `base: 'USD'` and it is worth being explicit about why, because the yield
  // is GOLD: thUSD is a dollar stablecoin whose return comes from gold leasing
  // and CME futures roll. The holder has no gold exposure — only the issuer
  // does — so this row is comparable to the other dollars here in a way
  // Brix's lira row above is not.
  //
  // One assetGroup covers both deployments, and only via the GROUP_ALIAS that
  // folds Stable's OFT spelling into Ethereum's: chain 1 stores
  // `Staked thUSD::STHUSD`, while the 988 token answers
  // name() == symbol() == 'sthUSD'. Ethereum is the only actual vault; the
  // Stable token is a LayerZero OFT holding 97 % of the supply, and that
  // distinction lives in margin-fetcher's SAVINGS_REGISTRY — this overlay
  // classifies the ASSET, which is the same asset on both chains. ---
  // Both stored spellings, for the pre-alias reason spelled out under scrvUSD
  // below: chain 1 stores `Staked thUSD::STHUSD`, and the Stable (988) OFT —
  // which holds 97 % of the supply — answers `name() == symbol() == 'sthUSD'`
  // and so stores `sthUSD::sthUSD`. ---
  'Staked thUSD::STHUSD': { underlying: 'thUSD', base: 'USD' },
  'sthUSD::sthUSD': { underlying: 'thUSD', base: 'USD' },
  // --- Curve scrvUSD (over crvUSD) — the savings wrapper for crvUSD borrow-fee
  // revenue. Passive by the test this list applies: deposit crvUSD, accrue a
  // distribution released through the vault's profit-unlocking rail, redeem
  // crvUSD, with no allocation decisions on the depositor's position.
  //
  // One key covers all four deployments, via the GROUP_ALIAS that folds
  // Arbitrum/XDC's case split and Base's bridge-branded name into the chain-1
  // form. Only Ethereum is the vault; the other three are bare bridged
  // ERC-20s, and that distinction lives in margin-fetcher's SAVINGS_REGISTRY
  // — this overlay classifies the ASSET, which is the same on all four. ---
  //
  // All THREE stored spellings are keyed, not just the canonical one, because
  // `lookupSavings` runs on the PRE-alias group: the generator applies this
  // overlay before `aliasAssetGroup` folds the variants, so a key that only
  // matches the post-alias form silently misses every chain that stores
  // another. Canonical is `Savings crvUSD::scrvUSD`. ---
  'Savings crvUSD::scrvUSD': { underlying: 'crvUSD', base: 'USD' },
  'Savings crvUSD::SCRVUSD': { underlying: 'crvUSD', base: 'USD' },
  'Superbridge Bridged scrvUSD::SCRVUSD': { underlying: 'crvUSD', base: 'USD' },

  // --- OnRe ONyc (Solana) — share of OnRe's Bermuda reinsurance fund, minted
  // and redeemed against USDC through OnRe's offers, yield paid as a rising
  // NAV (core.api.onre.finance/data/nav). Jupiter tags it `yb`, but
  // `savingsFromTags` cannot read a money off "OnRe Tokenized Reinsurance",
  // so without this row it shipped as `savings: {}` and consumers that test
  // `savings.base` against the debt's money read an ONyc/USDC loop as a
  // price bet. ---
  'OnRe Tokenized Reinsurance::ONyc': { underlying: 'USDC', base: 'USD' },

  // --- Hastra PRIME / AUTO — 4626 (Ethereum) and `vault-stake` (Solana)
  // vaults over wYLDS, Figure's USDC-backed YLDS held 1:1; yield is the share
  // price rising (PoR `effective_rate`). Deposit and redeem are permissionless
  // and instant against wYLDS — fork-proven on Ethereum 2026-10-06, so the
  // earlier "whitelist-gated" flag no longer holds. ---
  'Hastra PRIME::PRIME': { underlying: 'wYLDS', base: 'USD' },
  // --- Yuzu yzPrime (Monad 0xc9ea…7DA, 4626 over USDC, linear manager-set daily accrual —
  // 179 ppm/day = 6.5 % APR on 2026-10-20; mint/redeem role-gated) and the Yuzu Money Vault YZM
  // (USDC-denominated, holds syzUSD). Both are Euler / Morpho / Curvance collateral on Monad;
  // without a money YieldCircle read every loop on them as "not mapped". ---
  'Yuzu Prime::YZPRIME': { underlying: 'USDC', base: 'USD' },
  'Yuzu Money Vault::YZM': { underlying: 'USDC', base: 'USD' },
  'Hastra AUTO::AUTO': { underlying: 'wYLDS', base: 'USD' },
  // Solstice eUSX (Solana): USX staked in the YieldVault, a rising price. Jupiter tags it `yb` but
  // `savingsFromTags` cannot read a money off "eUSX", so it shipped as `savings: {}`.
  'eUSX::eUSX::solana': { underlying: 'USX', base: 'USD' },

  // --- Exponent senior tranches (Solana) — the senior LP of an Exponent
  // tranching market: a protected share of the base asset's yield, paid as a
  // rising LP price in the market's dollar quote (hyUSD / USD); the junior
  // takes the first loss. Loopscale loops them against USDC / USDG, which
  // without `base` read as a price bet. `underlying` is the base asset. ---
  'Exponent Senior eHYUSD::srEHYUSD::solana': { underlying: 'eHYUSD', base: 'USD' },
  'Exponent Senior AUTO::srAUTO::solana': { underlying: 'AUTO', base: 'USD' },
  'Exponent Senior ONyc::srONyc::solana': { underlying: 'ONyc', base: 'USD' },
  'Exponent Senior nOPAL::srnOPAL::solana': { underlying: 'nOPAL', base: 'USD' },

  // --- 2026-10-16 earn integrations (lending-sdks registryEthStablesA / EthSavingsB /
  // EthStructuredC / L2sD / Jarvis). Each is a margin-fetcher savings row; the keys are the
  // stored groups verbatim (the yield fetchers key the same strings).
  //
  // Credit-book caveat, the syrupUSDC line above: SIERRA (OpenTrade LYT pool — CLO/CP/basis
  // book), sAID (GAIB — off-chain AI-infrastructure financing) and sUSDfr (Forest Road — one
  // originator's specialty-finance credit) are operator-run credit, admitted here because the
  // depositor's position takes no allocation decision of its own and every exit pays the
  // underlying at NAV; the credit risk lives in risk-data (all three score 4).
  // Deliberately NOT here: Piku USP (the "USP actively-managed" exclusion above — a
  // fund-of-funds over synthetic dollars, TRY carry and FX-arbitrage vaults), Solstice stSLX
  // (SLX-denominated: no fiat `base`, the spETH rule), Yearn st-yCRV (yCRV / CRV-denominated —
  // CRV is no money any consumer of `savings.base` knows; it is a savings row in margin-fetcher
  // all the same).
  //
  // Alchemix mixUSDC — the MYT behind alUSD, a Morpho Vault V2 the Alchemix curator allocates
  // across Yearn / Fluid / InfiniFi / Tokemak USDC legs. Excluded at first on the Vesper
  // precedent (a strategy vault); classified 2026-10-20 because every leg is a USDC lending /
  // savings position, both legs are synchronous at par (fork-proven through the
  // Erc4626Composite on 1 / 10 / 8453) and it is the earn row a user holding alUSD's backing
  // actually holds. Base's vault answers the Ethereum name, so its pre-override group is the
  // Ethereum string before ADDRESS_GROUP_OVERRIDE runs — but once the override is published the
  // repo's own list feeds the row back already carrying `Base USDC …`, so BOTH strings are keyed.
  'USDC Mix Yield Token::mixUSDC': { underlying: 'USDC', base: 'USD' },
  'Base USDC Mix Yield Token::mixUSDC': { underlying: 'USDC', base: 'USD' },
  'Optimism USDC Mix Yield Token::mixUSDC': { underlying: 'USDC', base: 'USD' },
  'Arbitrum USDC Mix Yield Token::mixUSDC': { underlying: 'USDC', base: 'USD' },
  // Alchemix mixWETH — the alETH-side MYT. `base: 'ETH'` breaks the fiat-only habit of this
  // list on purpose: `issuer:check:eth-btc` reads `savings.base` as an ETH/BTC money (and failed
  // on these three groups without one), and YieldCircle compares it with the debt's money, so a
  // mixWETH/WETH loop reads as an ETH carry, which it is. NB its share price is a MARK (staked-ETH
  // legs) — margin-fetcher registers it `volatile` (VOLATILE_VAULT_OVERRIDES, 1 + 10).
  'WETH Mix Yield Token::mixWETH': { underlying: 'WETH', base: 'ETH' },
  'Optimism WETH Mix Yield Token::mixWETH': { underlying: 'WETH', base: 'ETH' },
  'Arbitrum WETH Mix Yield Token::mixWETH': { underlying: 'WETH', base: 'ETH' },
  // Inverse sinvUSD (0x3ff3…427d) — the Monolith savings vault: a plain 4626 over invUSD that
  // accrues the interest invUSD borrowers pay (~8 % APR realized, 2026-10-20). FiRM collateral.
  'Staked invUSD Stablecoin::sinvUSD': { underlying: 'invUSD', base: 'USD' },
  // Yearn ysyBOLD (0x2334…91cd) — "Staked yBOLD", a Yearn V3 vault over yBOLD, which is itself
  // a par 4626 over BOLD deposited in Liquity V2's stability pools; the yield accrues HERE
  // (yBOLD's own price stays 1). The money is BOLD's. FiRM and Morpho collateral.
  'Staked yBOLD::ysyBOLD': { underlying: 'BOLD', base: 'USD' },
  'Sierra::SIERRA::1::0': { underlying: 'USDC', base: 'USD' }, // Ethereum-native pool 0xbceb…; the Avalanche OFT keeps `Sierra::SIERRA`
  'Staked Axis USD::SUSDX': { underlying: 'USDx', base: 'USD' }, // Axis, NOT Stables Labs' bare `SUSDX`
  'GAIB sAID::SAID': { underlying: 'AID', base: 'USD' },
  'Staked Forest Road USDfr::SUSDFR': { underlying: 'USDfr', base: 'USD' },
  'sBold::sBOLD': { underlying: 'BOLD', base: 'USD' },
  'Wrapped OUSD::WOUSD': { underlying: 'OUSD', base: 'USD' },
  'Savings USG::sUSG': { underlying: 'USG', base: 'USD' },
  'aptUSD::APTUSD': { underlying: 'alqUSD', base: 'USD' },
  // Royco v2 tranches over apyUSD — the junior is first-loss capital (registered `volatile` in
  // margin-fetcher), included on the Strata-junior / 3Jane sUSD3 rule: `savings` classifies
  // the WRAPPER and its money, never the principal.
  'Royco Senior Tranche apyUSD::ROY-ST-apyUSD': { underlying: 'apyUSD', base: 'USD' },
  'Royco Junior Tranche apyUSD::ROY-JT-apyUSD': { underlying: 'apyUSD', base: 'USD' },
  // Unitas sUSDu (BNB) — StakedUSDeV2 clone over USDu.
  'Staked USDu::sUSDu': { underlying: 'USDu', base: 'USD' },
  // Jarvis sjEUR (Base) — 4626 over jEUR, a Jarvis Synthereum EURO synthetic: `base: 'EUR'`.
  'Super Jarvis Synthetic Euro::sjEUR': { underlying: 'jEUR', base: 'EUR' },
  // Loopscale lending vault over USD.infra (Solana; curator and sole borrower DAWN). A curated
  // lending vault is the steakUSDC shape; admitted because it lends one dollar to one
  // borrower on fixed terms rather than allocating across markets.
  'sUSD.infra::sUSD.infra::solana': { underlying: 'USD.infra', base: 'USD' },

  // --- 2026-10-27 earn gap sweep (lending-sdks registryLlamaGap / registryGapSweep /
  // registryMellow / aera, docs/earn/GAP_SWEEP_TOKEN_LISTS.md §4). Admitted on the mixUSDC rule
  // above, not the older steakUSDC exclusion: the holder takes no allocation decision of its
  // own and every exit pays the underlying at the vault's NAV. Most of these are operator-run
  // books whose share price is a MARK (Veda / Mellow / Makina accountants, Tokemak autopools,
  // Liminal's delta-neutral pipes) — margin-fetcher says so per row and registers the ones that
  // have dipped `volatile`; this overlay classifies only the wrapper and its money. Every key is
  // listed in both its pre-alias form (what a fresh `onchain` row carries) and the canonical
  // form (what the published list feeds back), since `lookupSavings` has no alias fallback.
  'Ether.Fi Liquid USD::LIQUIDUSD': { underlying: 'USDC', base: 'USD' }, // Veda BoringVault, 1 + 10
  'Ether.Fi Liquid USD::liquidUSD': { underlying: 'USDC', base: 'USD' },
  'Plasma USD Vault::PlasmaUSD': { underlying: 'USDT0', base: 'USD' }, // Veda BoringVault, 9745 + 1
  'Lido EarnUSD::EARNUSD': { underlying: 'USDC', base: 'USD' }, // Mellow core vault; NOT a stablecoin
  'Gauntlet USD Alpha::GTUSDA': { underlying: 'USDC', base: 'USD' }, // Aera vault, 1/10/42161/8453
  'Fluid Lite USD Vault::fLiteUSD': { underlying: 'USDC', base: 'USD' },
  'Tokemak autoUSD::autoUSD': { underlying: 'USDC', base: 'USD' },
  'Tokemak baseUSD::baseUSD': { underlying: 'USDC', base: 'USD' },
  // One open-term credit line to JUSD Finance on Accountable — the SIERRA / sUSDfr credit
  // caveat. NOT Aegis JUSD, Jigsaw USD or any other JUSD ticker.
  'JUSD Credit Vault::JUSD': { underlying: 'USDC', base: 'USD' },
  'Yuzu Syrup::yzSyrup': { underlying: 'USDC', base: 'USD' }, // the yzPrime shape
  'Steakhouse USD Machine::usdSHFmk': { underlying: 'USDC', base: 'USD' }, // Makina
  'Dialectic Carry Machine::DCM': { underlying: 'USDC', base: 'USD' }, // Makina; allowlisted mint
  'Concrete Decentralized Finance USDT::ctDefiUSDT': { underlying: 'USDT', base: 'USD' },
  'Concrete RWA USD1::ctRWA_USD1': { underlying: 'USD1', base: 'USD' },
  'ZIG USD1::ctZigUSD1': { underlying: 'USD1', base: 'USD' },
  'Colb USD1::ctColbUSD1': { underlying: 'USD1', base: 'USD' },
  // Liminal (HyperEVM): USDC in, a delta-neutral book on the named asset — the money is the
  // DOLLAR, not HYPE / BTC (the funding-and-basis income is what accrues).
  'xHYPE::XHYPE': { underlying: 'USDC', base: 'USD' },
  'xHYPE::xHYPE': { underlying: 'USDC', base: 'USD' },
  'xBTC::XBTC': { underlying: 'USDC', base: 'USD' },
  'xLEND::XLEND': { underlying: 'USDC', base: 'USD' },
  'xLEND::xLEND': { underlying: 'USDC', base: 'USD' },
  // ETH-money strategy vaults — `base: 'ETH'` on the mixWETH rule.
  'Lido Earn ETH::EARNETH': { underlying: 'WETH', base: 'ETH' }, // Mellow; exits pay wstETH
  'Instadapp ETH v2::IETHV2': { underlying: 'stETH', base: 'ETH' }, // Fluid Lite: leveraged stETH
  'Tokemak autoETH::autoETH': { underlying: 'WETH', base: 'ETH' },
}
