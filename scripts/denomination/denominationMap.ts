import { WRAPPED_NATIVE_INFO } from '@1delta/wnative'

/**
 * Canonical denomination overlay — sets `props.denomination` on *base* assets so
 * the yield-tracer / UI can filter "all ETH markets" / "all BTC markets".
 *
 * Keyed by `assetGroup` (chain-independent), mirroring stablecoin/lst overlays.
 * ONLY canonical base tokens belong here — the plain wrapped/bridged forms of
 * ETH and BTC. Derivatives (LST/LRT like wstETH/weETH, Pendle PTs, yield-BTC
 * like SolvBTC/pumpBTC/uniBTC/LBTC) are deliberately EXCLUDED: they carry their
 * own `lst`/`pendle`/`savings` flags, and the generator only applies this
 * overlay when none of those are set (see generateTokenMap.script.ts). That
 * keeps `denomination: 'ETH'` meaning "is ETH", not "tracks ETH".
 *
 * Extend the curated maps below as new canonical base groups appear. Native gas
 * tokens are handled separately via `props.wnative`/`isNative` (WETH/WBNB/WPOL…
 * additionally get `native`/`wnative`), so they need no entry here beyond their
 * denomination (ETH is included; other gas tokens are added on demand).
 */

/** assetGroup → denomination, for canonical base ETH tokens. */
const ETH_GROUPS = [
  'ETH',
  'WETH',
  // Alchemix alETH (1 / 10 / 42161, one group) — the ETH alAsset, the alUSD of ether: minted
  // against mixWETH and redeemed 1:1 for WETH through the Transmuter. The debt of every
  // mixWETH/alETH CDP; without a money it matched neither the ETH nor the stable loop filter.
  // Not a staking derivative (no `lst`), so the "is ETH" reading holds the way it does for the
  // 1:1 BTC wrappers below — at the alAsset's market discount, which the price states.
  'Alchemix ETH::ALETH',
] as const

/** assetGroup → denomination, for canonical base BTC tokens (wrapped/bridged
 *  BTC that is ~1:1 BTC and NOT a staking/yield derivative). */
const BTC_GROUPS = [
  'WBTC',
  'CBBTC',
  'TBTC',
  'FBTC',
  'BTC',
  // Pre-alias / per-chain spellings of the canonical wrappers above, and the 1:1
  // custodial or bridge wrappers that carried no money at all (each also has a desk
  // in issuer/issuerAssets.ts, asserted by `npm run issuer:check`).
  'tBTC::tBTC',
  'tBTC::TBTC',
  'Optimism tBTC v2::tBTC',
  'Fire Bitcoin::FBTC',
  'Function ƒBTC::FBTC',
  'Wrapped BTC::WBTC',
  'BTCB',
  'SOLVBTC',
  'Solv Protocol BTC::SOLVBTC',
  'ENZOBTC',
  'KBTC',
  'M-BTC',
  'Bitcoin::BTC.b',
  'eBTC::EBTC',
  'Echo eBTC::EBTC',
  // OKX's 1:1 custodial BTC on X Layer (196 0xb7c0…6b4f); desk okx in issuer.json.
  'OKX Wrapped BTC::xBTC',
  // Circle's 1:1 custodial BTC on Ethereum (0x72df…075e) and Arc (0x171a…baa0); desk circle.
  'Circle Wrapped BTC::CIRBTC',
] as const

/** assetGroup → denomination, for FXRP — Flare's 1:1 FAsset representation of
 *  XRP, the canonical XRP base on the chains Flare serves. stXRP is its LST
 *  (carries `props.lst`, so the generator skips denomination for it). */
const XRP_GROUPS = ['FXRP::FXRP'] as const

/** Curated assetGroup → denomination map. */
export const DENOMINATION_MAP: Record<string, string> = {
  ...Object.fromEntries(ETH_GROUPS.map((g) => [g, 'ETH'])),
  ...Object.fromEntries(BTC_GROUPS.map((g) => [g, 'BTC'])),
  ...Object.fromEntries(XRP_GROUPS.map((g) => [g, 'XRP'])),
}

/**
 * Wrapped-native assetGroups → their gas-token denomination (BNB/POL/AVAX/…),
 * derived from `@1delta/wnative` so it stays in sync with the wnative registry.
 * The wrapped-native symbol (`WBNB`, `WPOL`, …) is normalized to its assetGroup
 * (uppercased, `W`-prefix dropped) and mapped to the bare gas-token symbol.
 * Skips ETH/WETH — already covered as `ETH` above.
 */
function wrappedNativeDenominations(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const info of Object.values(WRAPPED_NATIVE_INFO)) {
    const wsym = String(info.symbol || '').toUpperCase()
    if (!wsym || wsym === 'WETH') continue
    const bare = wsym.startsWith('W') ? wsym.slice(1) : wsym
    // assetGroup for a wrapped native is its bare gas-token symbol (POL, AVAX…).
    if (bare && !out[bare]) out[bare] = bare
  }
  return out
}

/** Full map: curated base ETH/BTC groups win over the derived native denominations. */
export const DENOMINATION_GROUP_MAP: Record<string, string> = { ...wrappedNativeDenominations(), ...DENOMINATION_MAP }

/** Lookup a token's denomination by its assetGroup. */
export function lookupDenomination(assetGroup: string): string | undefined {
  return DENOMINATION_GROUP_MAP[assetGroup]
}
