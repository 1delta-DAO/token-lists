# Asset groups

Every token row in the lists carries two identity strings:

```jsonc
// 42161.json → list["0xff970a61a04b1ca14834a43f5de4533ebddb5cc8"]
{
  "name": "Bridged USDC",
  "symbol": "USDC.e",
  "currencyId": "Bridged USDC::USDC.e", // this deployment's own label
  "assetGroup": "USDC"                  // the asset it IS, on every chain
}
```

| field        | what it is                                                                                    | stable across chains? |
| ------------ | --------------------------------------------------------------------------------------------- | --------------------- |
| `currencyId` | `` `${name}::${symbol}` `` exactly as the source list spells it. A label, not an identity. | no                    |
| `assetGroup` | The asset this deployment is. All deployments that are the same asset share one group.       | yes, by design        |

**Use `assetGroup` to join anything that's about the asset**: prices, yield history, notes, logos, and the "same asset on another chain" lookup. Consumers key on it, so a group string that changes breaks their joins (see [Renaming a group](#renaming-a-group)).

## What a group looks like

| shape                               | meaning                                                                                                 | example                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `SYMBOL`                            | A known core asset matched by `knownAssets` (or an explicit alias). The cleanest form.                 | `USDC`, `ETH`, `WSTETH`, `RSETH`                           |
| `Name::SYMBOL`                      | No core-asset match, so the group is the `currencyId`. Still shared across chains when the spelling agrees. | `Cap USD::CUSD`, `Yield Optimizer USD::YOUSD`              |
| `Name::SYMBOL::<chainId>::<n>`      | Same-chain collision suffix: another, unrelated token already holds `Name::SYMBOL` on that chain.     | `PT syrupUSDC (USDC) Arbitrum::PT-syrupUSDC-29JAN2026::42161::0` |
| `Name::SYMBOL::solana[::<n>]`       | A Solana mint with no evidence it's an asset listed on an EVM chain. Scoped to Solana.                | `hyUSD::hyUSD::solana`                                     |
| `Name::SYMBOL::fuel`                | A Fuel asset that isn't in `FUEL_MAPPEDS`. Scoped to Fuel.                                             |                                                            |
| `Name::SYMBOL::suspicious::<hash>`  | Quarantine for an address that copies another token's name/symbol (from `portalTokens.script.ts`). Never inherits labels or logos. | `USD Coin::USDC::suspicious::564fa4e3`                     |

A bare `SYMBOL` group is a strong claim ("this is *the* USDC"). An unqualified `Name::SYMBOL` is a weaker one ("these rows spell themselves the same way"). Chain-scoped groups are a deliberate dead end: they can never join an unrelated asset that happens to share a ticker.

### Natives and wrapped natives

The native coin (zero address, `props.isNative`) and its wrapper (`props.wnative`) share one group: ETH and WETH are both `ETH`, and native SOL and wSOL share wSOL's group. That's one asset in two forms with one price. `GROUP_TO_GROUP_MAPPER` handles this for every chain (`WBNB → BNB`, `WPOL → POL`, `MATIC → POL`, …).

## How a group is assigned

`scripts/generateTokenMap.script.ts` walks every source list in `ALL_LISTS` order (see `scripts/externalLists.ts`). **The first list to supply an address wins.** For each row it runs the steps below. Later steps override earlier ones.

```
 1. categorizeToken       knownAssets match? → SYMBOL   else → currencyId
    …or, for a row from our own published lists, keep its stored assetGroup
 2. OFT mesh              oft/mesh-groups.json         (per deployment)
 3. address override      ADDRESS_GROUP_OVERRIDE       (per deployment, early pass)
    ── group-keyed overlays run here: stablecoin, savings, lst, issuer, denomination ──
 4. fuel scoping          unmapped Fuel asset → currencyId::fuel
 5. same-chain dedup      collision → currencyId[::<chainId>::<n>]
 6. GROUP_ALIAS           curated same-asset merges + xStock ticker upper-casing
 7. Nest identity         rwa/nestIdentity.ts sets Nest vault groups outright
 8. address override      ADDRESS_GROUP_OVERRIDE       (final word)
```

### 1. Core-asset match (`scripts/utils/index.ts` → `categorizeToken`)

- The symbol is normalised: one bridged prefix is stripped (`sy`, `axl`, `bridged`, `wrapped`, `m.`, `vb`, `xc`), then one suffix (`.e`, `.b`, `.m`, `ET`), and the result is upper-cased. So `USDC.e → USDC` and `axlUSDC → USDC`.
- Bridge words (`knownBridges`) are removed from the name.
- The result is looked up in `knownAssets` (`scripts/utils/data/knownAssets.ts`). A match needs **both** the normalised symbol **and** a name fragment (or the exact name, if `requireExactName` is set). A symbol alone never matches, which keeps fake tickers out of `USDC`.
- On a match the group is `mapAssetGroup(symbol)`, so wrapped natives collapse to the native. With no match, the group is the `currencyId`.
- Multichain/Anyswap-bridged tokens and blacklisted rows always get the `currencyId`.

### Groups are sticky: the seed list

The repo's own published lists (`ONE_DELTA_LISTS`, fetched from `main`) sit near the front of `ALL_LISTS`. For those rows the generator **keeps the stored `assetGroup`** instead of recomputing it, and skips the dedup. So:

- a group, once published, is carried forward run to run;
- changing `knownAssets` or the normalisation rules does **not** move rows that are already published;
- the only things that move an existing row are steps 2, 3, 6, 7 and 8: the OFT mesh, `GROUP_ALIAS`, Nest identity and `ADDRESS_GROUP_OVERRIDE`.

Only the overlay lists come before the seed: pendle, spectra, rwa and lst. Their rows are re-derived on every run.

### 2. OFT mesh (`scripts/oft/`)

LayerZero peer links (`props.oft.routes[].peers`, read on-chain) connect every deployment of one OFT asset, whatever each chain's list calls it. `npm run oft:mesh` writes `mesh-groups.json` (`chainId → address → group`). A deployment in it takes that group and skips the dedup, because the peer links already prove what it is. `mesh-exclude.json` lists the reviewed meshes that must **not** merge. Details: [`scripts/oft/README.md`](../scripts/oft/README.md).

### 5. Same-chain dedup

A group must not hold two different, non-bridged addresses on the same chain. When a non-bridged row would join a group that already has a non-bridged row on its chain at a different address, the row falls back to its `currencyId`. If that's taken on the chain too, it gets `::<chainId>::0`, `::1`, and so on. Rows tagged `bridged`, mesh members, the chain's `NATIVE_ERC20`, and entries force-included by `GROUP_HARD_SETTER` (`scripts/blacklist.ts`) are exempt.

This step causes most splits: a legitimate second deployment, or a token whose name differs by one character, ends up in its own group. `GROUP_ALIAS` and the mesh exist to undo those splits.

### 6. `GROUP_ALIAS` (`scripts/utils/data/assetGroupUnifier.ts`)

This is an exact string map from a split-off group to the canonical one. It runs after the dedup, so its result is final (until step 8). Canonical, in order of preference:

1. a bare `SYMBOL` group, if one exists;
2. otherwise the chain-1 spelling (Ethereum is usually where the real vault, the yield fetcher key and the overlays live);
3. otherwise the spelling with the most chains.

The xStocks get a rule rather than ~740 alias lines: any `... xStock::<ticker>` group has its ticker upper-cased.

**Rules for adding an alias.** Every entry in the file documents its evidence. Follow the same discipline:

- Merge only **the same asset**. Evidence is the same contract address on several chains, CoinGecko's platform map putting the deployments under one coin, or an on-chain bridge/peer link. A shared ticker is never evidence: StaFi rETH ≠ Rocket Pool RETH, and Manta mETH ≠ Mantle mETH.
- The merged group must still hold **one address per chain**.
- Never alias a PulseChain (369) row on the strength of an Ethereum address. A state-fork copy isn't that asset.
- If two *different* assets share one `name::symbol`, a group alias would move both. Use `ADDRESS_GROUP_OVERRIDE` (`"<chainId>:<lowercaseAddress>": "<group>"`) instead.

### Solana (`scripts/solana/solana.ts`)

`solana.json` doesn't go through the generator. Each Jupiter-verified mint joins an existing global group when there's evidence it is that asset:

1. Nest identity;
2. `SOLANA_MAPPEDS` (hand-curated);
3. CoinGecko's `include_platform` map: the same coin id has an address on an EVM chain we list, and that row's group is used.

With no evidence, the mint gets `currencyId::solana`, numbered on a case-insensitive collision. Two Solana mints are never allowed to claim one global group. That's reported as an error, not resolved silently.

## Why groups matter: the overlays hang off them

Several props are stored **per group** and apply to every deployment of the group on every chain (see [token-props.md](./token-props.md)):

| keyed by `assetGroup`                                                     | keyed by `chainId:address`                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `stablecoin`, `savings`, `lst` (group fallback), `issuer`, `issuerExposures`, `denomination`, notes, logos | `risk`, `oft`, `permit`, `rwa`, `pendle`, `spectra`, `exponent`, `receipt`, `wnative` |

So a split group is not cosmetic. A bridged deployment that ends up in the wrong group silently loses its stablecoin/issuer/savings labels, its notes and logo, and downstream its intrinsic yield. Yield joins in margin-fetcher are case-sensitive, so the losing side reads 0 %. Many `GROUP_ALIAS` comments record exactly this: Cap `stcUSD`, Treehouse `tETH`, Theo `sthUSD`.

The group-keyed overlays are **impostor-guarded**: a ticker copy (`name === symbol`) at an address that isn't CoinGecko's canonical one for that symbol never inherits them, even when it shares the group.

## Generated files keyed by group

| file                             | content                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `omni-list.json`                 | `{ [assetGroup]: { id, name, symbol, logoURI, currencies: [row, …] } }`. Every deployment of every group across all chains. |
| `logos.json`                     | `{ [assetGroup]: logoURI }`. One logo per group (`npm run logos:groups`).                 |
| `logos-by-symbol.json`           | `{ [SYMBOL]: logoURI }`. One winner per ticker; suspicious/mimic groups can't win.        |
| `asset-notes.json`               | `{ [assetGroup]: note }`. What the token is ([`scripts/notes/README.md`](../scripts/notes/README.md)). |
| `native-currencies.json`         | Per chain: the gas coin, its `assetGroup`, its `shape` and wrapper.                       |
| `asset-group-corrections.json`   | The rename log for consumers (below).                                                     |

## Renaming a group

Downstream stores (price and yield history, the indexer) key rows on `assetGroup`. When a change folds one group into another, record it in `asset-group-corrections.json` as a new batch:

```jsonc
{
  "id": "2026-10-23-cross-chain",
  "date": "2026-10-23",
  "base": "b9b96c4",                // commit the OLD strings come from
  "summary": "…",
  "groupFolds": { "<old group>": "<new group>", … },  // every old string folded completely
  "rows": [{ "chainId": "1", "address": "0x…", "from": "<old>", "to": "<new>" }, …]
}
```

A fold must be complete: after it, no row carries the old string, and every row that carried it carries the same new one. Consumers apply a batch after the lists it belongs to are published.

## Checklist: an asset is split across groups

1. Confirm it's the same asset (same address, CoinGecko coin id, bridge `l1Address()` / OFT peer). If not, leave it split.
2. If it's an OFT, run `npm run oft:mesh`; the mesh may already resolve it.
3. Otherwise add `GROUP_ALIAS` entries (or `ADDRESS_GROUP_OVERRIDE` for a shared `name::symbol`), with a comment that gives the evidence and the reason for the canonical choice.
4. Run `npm run generate:cached`, then check that the merged group holds one address per chain.
5. Add a batch to `asset-group-corrections.json` for every old string that disappeared.
