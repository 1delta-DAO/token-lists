# Token row and `props` reference

Each chain file (`<chainId>.json`, `solana.json`, `fuel.json`) has this shape:

```jsonc
{
  "chainId": "42161",
  "version": 0,
  "list": { "<lowercase address>": TokenRow, … },
  "mainTokens": ["<address>", …]   // curated short list for pickers; always includes the wrapped native
}
```

The canonical TypeScript definition is `TokenProps` in [`scripts/utils/types.ts`](../scripts/utils/types.ts). This page summarises it. When the two disagree, the type file is right.

## Top-level fields

| field        | type   | meaning                                                                                       |
| ------------ | ------ | --------------------------------------------------------------------------------------------- |
| `chainId`    | string | Chain id as a string (`"42161"`, `"solana"`, `"fuel"`).                                       |
| `address`    | string | Lower-cased address. `0x000…000` is the chain's native coin. On Solana, the mint (base58).   |
| `name`       | string | Display name from the winning source list.                                                    |
| `symbol`     | string | Display ticker from the winning source list.                                                  |
| `decimals`   | number | Token decimals. Rows without verified decimals are dropped, never defaulted.                  |
| `logoURI`    | string | Optional. Per-deployment icon. For one icon per asset, use `logos.json`.                      |
| `currencyId` | string | `` `${name}::${symbol}` ``. This deployment's label.                                          |
| `assetGroup` | string | The asset this deployment is, shared across chains. See [asset-groups.md](./asset-groups.md). |
| `props`      | object | Optional. Everything below. Absent when empty.                                                |

## How to read `props`

- **A prop being present is the flag.** There's no `isStablecoin: false`. A missing `stablecoin` means "not classified as one".
- **Absent ≠ negative** for probed facts. `rwa.transferRestricted` missing means *not probed*, not "transfers freely". `oft.routes[].peers` missing a chain means *that chain couldn't be read*.
- **Group-keyed vs address-keyed.** Some props are resolved per `assetGroup` and repeat on every deployment of the group. Others are facts about one contract. The tables below give the key for each.
- **No stale booleans for time.** `spectra` and `exponent` carry `maturity` instead of an `expired` flag, so compare against the clock yourself. (`pendle.expired` exists for legacy reasons and is only as fresh as the last run.)

## Classification

### `stablecoin`, keyed by group

```jsonc
"stablecoin": { "base": "USD" }
```

| field  | meaning                                                                 |
| ------ | ----------------------------------------------------------------------- |
| `base` | Fiat peg, upper-case (`USD`, `EUR`, `GBP`, …). Omitted for floating/variable pegs. |

Source: risk-data's DeFiLlama stablecoin feed (`scripts/stablecoin/`). Test tokens and impostors are excluded.

### `savings`, keyed by group

A yield-bearing wrapper over a stablecoin (sDAI, sUSDe, sfrxUSD, …).

| field        | meaning                                                         |
| ------------ | --------------------------------------------------------------- |
| `underlying` | The stablecoin it earns on, by symbol (`DAI`, `USDe`, `rUSD`).  |
| `base`       | The underlying's fiat peg (`USD`, …).                           |

Source: risk-data's yield-bearing-stablecoin feed. The underlying is resolved on-chain via ERC-4626 `asset()` (`scripts/savings/`).

### `lst`, keyed by address, with a group fallback

A liquid staking or restaking token.

| field      | values                                         |
| ---------- | ---------------------------------------------- |
| `type`     | `staking` (LST) · `restaking` (LRT)            |
| `asset`    | Staked base: `ETH`, `BTC`, `SOL`, `BNB`, `POL`, `AVAX`, … |
| `provider` | `lido`, `rocketpool`, `renzo`, `kelp`, …       |

Source: `scripts/lst/lst.json` (per address), with `lst-groups.json` filling bridged deployments by group.

### `denomination`, keyed by group

A plain string: the base asset the token simply **is**, used for "show me all ETH markets" filters. Examples: `ETH` on WETH, `BTC` on WBTC/cbBTC/tBTC, `USDC` on USDC and USDC.e.

It's set **only on base tokens**. It's skipped whenever the row has `lst`, `pendle` or `savings`, so an `ETH` filter returns WETH, not wstETH. Source: `scripts/denomination/denominationMap.ts`.

### `rwa`, keyed by address

A tokenised real-world asset.

| field                | meaning                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `type`               | `equity` · `fund` · `credit` · `commodity` · `other`                                                      |
| `subType`            | Finer class: `stock`, `etf`, `treasury`, `money-market`, `private-credit`, `corporate-debt`, `gold`, `silver`, `pre-ipo`, `reinsurance`, `basis-trade`, … |
| `issuer`             | Issuing platform slug: `backed`, `ondo`, `dinari`, `robinhood`, `securitize`, `midas`, `nest`, …          |
| `underlying`         | The off-chain instrument: `AAPL`, `US T-Bill`, `XAU`, …                                                   |
| `denomination`       | Currency the NAV is struck in (`USD`). This is a floating NAV, **not** a peg. Set only where verified on-chain. |
| `transferRestricted` | `true` means the token itself reverts transfers to non-allowlisted holders, so it can't be used outside the allowlist at all. Set only when probed. |
| `transferGate`       | `{ kind: 'allowlist' \| 'registry' \| 'role', probedAt, evidence? }`. What enforces the restriction, and when it was probed. |

Source: `scripts/rwa/` (`rwa.json` plus rule-based detection).

### `issuer`, keyed by group (an address override can win)

**Whose promise you hold**: the entity whose solvency and redemption the asset depends on. It's not the money it's worth (`stablecoin.base`), not the venue that hosts it, and not the bridge it came over. USDC.e is still `circle`.

| field    | meaning                                                                                       |
| -------- | --------------------------------------------------------------------------------------------- |
| `id`     | Stable slug, use it for filtering/grouping: `circle`, `tether`, `sky`, `ethena`, `lido`, `pendle`, … |
| `name`   | Display name.                                                                                 |
| `kind`   | `protocol` (DAO/contracts) · `institution` (off-chain legal entity with a redemption desk) · `cex` (exchange wrapper) |
| `parent` | Parent issuer when this is a product line (`spark` → `sky`). Fold by `parent` to get the family. |

Absent on assets nobody owes: ETH, BNB and the other gas coins. A wrapper with no curated group falls back to the protocol that minted it, so a Pendle PT gets `pendle`. Source and coverage rules: [`scripts/issuer/README.md`](../scripts/issuer/README.md).

### `issuerExposures`, keyed by group

A **list** of the desks a wrapper ultimately exposes you to, beyond its own `issuer`. A PT over sUSDe has `issuer: pendle` and `issuerExposures: [ethena]`.

```jsonc
"issuerExposures": [{ "id": "lido", "name": "Lido", "kind": "protocol", "hops": 1 }]
```

| field                        | meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `id`, `name`, `kind`, `parent` | As in `issuer`.                                                        |
| `hops`                       | How far the walk went: 1 is the direct underlying, 2 is through the SY. More hops is a weaker claim. |
| `weight`                     | Share 0..1. Absent when legs aren't weighted, which is every case today. |

It's derived by walking `pendle.underlyingAsset`, `spectra.underlyingAsset`, `exponent.underlyingAsset` and `receipt.underlying` to the first group that has an issuer. **It's absent, not `[]`,** when the walk finds nothing, or when the only desk it finds is the token's own issuer.

### `risk`, keyed by address

A lagging annotation from the risk-data repo (`data/asset-risks.json`, via `scripts/risk/`).

| field      | meaning                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------- |
| `score`    | 1 (safest) … 5 (riskiest)                                                                     |
| `category` | `BLUE_CHIP`, `NATIVE`, `STABLECOIN`, `YIELD_STABLE`, `LST`, `LRT`, `ESTABLISHED_DEFI`, `BRIDGED`, `PRINCIPAL_TOKEN`, `YIELD_TOKEN`, `TOKENIZED_EQUITY`, `UNKNOWN_ISSUER`, `DISCONTINUED`, `COMPROMISED`, `OTHER` |
| `source`   | How it was scored: `whitelist`, `stablecoin`, `default`, or inherited from the underlying: `pendle_inherit`, `issuer_inherit`, `vault_inherit`, `savings_inherit`. |

### `retired`, keyed by address

The issuer no longer runs this deployment. The row stays in the list so holders can find it and exit, but nothing should route new money into it.

```jsonc
"retired": { "reason": "superseded", "successor": "Liquity BOLD::BOLD", "source": "curated" }
```

| field       | meaning                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `reason`    | `superseded`: replaced by a redeploy of the same asset (Liquity BOLD v1, Inverse jrDOLA v1). `discontinued`: wound down with no replacement (Angle USDA / stUSD / stEUR, Mountain wUSDM, Level lvlUSD). |
| `successor` | `assetGroup` of the live replacement, when there is one.                                                      |
| `source`    | `curated` (`scripts/retired/retired.ts`) or `risk` (the row's `risk.category` is `DISCONTINUED`).             |

It's keyed per address because a superseded v1 usually has the same `name::symbol` as the live v2. Those v1s also get a `… v1 (superseded)::…` group through `ADDRESS_GROUP_OVERRIDE`, so the live token keeps the plain group. To retire a token by hand, add a line to `RETIRED_BY_ADDRESS`.

## Yield tokenisation (PT / YT / SY)

All three are keyed by address and come from the protocol's own API (`scripts/pendle/`, `scripts/spectra/`, `scripts/exponent/`).

### `pendle`

| field                                    | meaning                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `tokenType`                              | `PT` · `YT` · `SY`                                                     |
| `marketAddress`                          | The Pendle market (PT/YT).                                             |
| `ptAddress` / `ytAddress` / `syAddress`  | The sibling legs. A PT carries `ytAddress`, a YT carries `ptAddress`.  |
| `underlyingAsset`                        | Address of the asset the SY wraps.                                     |
| `expiry`                                 | Maturity, unix seconds.                                                |
| `expired`                                | Snapshot at generation time. Prefer comparing `expiry` to now.         |
| `bridgedFrom`                            | Origin chain code (`ETH`, `ARB`, `PLASMA`) for a PT **bridged** here. There's no market on this chain, so it can be traded but not minted or redeemed. |
| `origin`                                 | `{ chainId, address }` of the origin PT, resolved from the LayerZero peer link. Join yield and maturity through it. |

### `spectra`

| field                         | meaning                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `tokenType`                   | `PT` · `YT` · `IBT` (the interest-bearing wrapper, Spectra's SY) |
| `poolAddress`                 | The Curve StableSwap-NG pool the PT trades on.                   |
| `ptAddress` / `ytAddress`     | Sibling legs.                                                    |
| `ibtAddress`                  | IBT the PT is minted from.                                       |
| `baseIbtAddress`              | Vault behind a `Spectra4626Wrapper` IBT.                         |
| `underlyingAsset`             | What the PT redeems for.                                         |
| `maturity`                    | Unix seconds. There's no `expired` flag.                         |

### `exponent` (Solana only)

| field                                    | meaning                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `tokenType`                              | `PT` · `YT` · `SY`                                                          |
| `vaultAddress`                           | The vault that owns the PT/YT/SY mints (mint/redeem happen here). Absent on SY. |
| `ptAddress` / `ytAddress` / `syAddress`  | Sibling legs.                                                               |
| `underlyingAsset`                        | Mint of the yield-bearing asset the SY wraps.                               |
| `maturity`                               | Unix seconds. Absent on SY.                                                 |
| `marketAddress` / `orderbookAddress`     | Trading venues, where they exist (none, either, or both).                   |
| `platform`                               | Exponent's slug for the underlying: `fragmetric`, `hylo`, `kamino`, `sanctum`, … |

### `receipt`, keyed by address, hand-set

A token that wraps another listed token 1:1 and is priced through it.

| field        | meaning                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `protocol`   | `dolomite-isolation`: a Dolomite isolation-mode receipt (not transferable, never user-held). `spectra-4626-wrapper`: Spectra's `sw-` wrapper (transferable). |
| `underlying` | Lower-cased address of the wrapped token on the same chain.                                                    |

## Transport and execution

### `oft`, keyed by address

LayerZero V2 OFT routes from LayerZero's registry, cross-checked on-chain (`scripts/oft/oft.ts`). Stargate pools and LayerZero V1 aren't included.

```jsonc
"oft": {
  "eid": 30319,                       // LayerZero endpoint id of THIS chain
  "routes": [{
    "contract": "0x4809…5d",          // what takes quoteSend / send
    "kind": "native",                 // native: token IS the OFT · adapter: a contract over the token
    "oapp": "reservoir",              // mesh name in LayerZero's registry
    "sharedDecimals": 6,              // amounts are truncated to this on the wire
    "approvalRequired": false,        // true: approve `contract` before sending
    "peers": { "1": "0xbb43…258a" }   // chainId → peer contract; only these chains are reachable
  }]
}
```

A token can have several routes on one chain, each belonging to a different mesh. A chain missing from `peers` reverts `NoPeer` when you send to it.

### `permit`, keyed by address

| field     | meaning                                                                |
| --------- | ---------------------------------------------------------------------- |
| `type`    | `1` = EIP-2612 `permit`, `0` = a non-standard permit                   |
| `version` | EIP-712 domain `version` string (`"1"`, `"2"`)                         |

Source: `scripts/permit/`.

## Native coins and wrappers

| prop       | on                         | meaning                                                                                           |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| `isNative` | the zero-address row       | `true`: this row is the gas coin.                                                                 |
| `wrapped`  | the zero-address row       | Address of the chain's wrapped native (WETH, WBNB, …).                                            |
| `erc20`    | the zero-address row       | ERC-20 view of the **same balance** as the native coin (e.g. Polygon `0x…1010`). Don't add both balances. |
| `wnative`  | the wrapped-native row     | `true`: this is the chain's canonical wrapper.                                                    |

The native coin and its wrapper share one `assetGroup`. For a per-chain summary without loading the lists, read `native-currencies.json`. Its `shape` field is documented in [`scripts/oft/README.md`](../scripts/oft/README.md#the-gas-coin-shape-native-currenciesjson).

## Safety flags

| prop         | meaning                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `suspicious` | The token looks like it impersonates a legit one. Its group is quarantined as `…::suspicious::<hash>`. |
| `mimic`      | It copies another token's name/symbol on the same chain.                                             |

Both come from `scripts/portalTokens.script.ts`. Flagged rows never win a group logo and never inherit group overlays.

## Chain-specific

| prop                   | meaning                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `solana.tokenProgram`  | `spl-token` · `token-2022`. Token-2022 supports transfer fees and hooks, so a quote can under-deliver. |

## Declared but not yet emitted

`underlying`, `terminal`, `peg`, `base`, `baseToken` and `entry` are defined in `TokenProps` for the underlying-walk work (next hop, where the walk ends, peg mechanism, mint/redeem terms). No list row carries them yet. Don't depend on them until they ship.

## Where props come from

The generator merges these overlays onto every row (`scripts/generateTokenMap.script.ts`). Overlays that come from source lists win **first list wins**, so `pendle`, `spectra`, `rwa` and `lst` rows are placed first in `ALL_LISTS`. Group-keyed overlays only fill a key that's still missing, and they're re-derived on every run: `stablecoin`, `issuer`, `issuerExposures` and `rwa` are deliberately dropped from the seed (last run's output) so a fixed rule takes effect. `npm run generate:formatted` (`scripts/pipeline.ts`) runs everything in dependency order.
