# token-lists

1delta's multichain token lists, generated nightly from third-party lists plus curated overlays.

## Files

| file                                  | content                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `<chainId>.json`                      | Per-chain list: `{ chainId, version, list: { address → row }, mainTokens }` |
| `solana.json`, `fuel.json`            | The same shape for non-EVM chains.                                          |
| `omni-list.json`                      | Every deployment of every asset, keyed by `assetGroup`.                     |
| `main-tokens.json`                    | `chainId → mainTokens` for all chains in one file.                          |
| `native-currencies.json`              | Each chain's gas coin, its wrapper and its shape.                           |
| `logos.json` / `logos-by-symbol.json` | One logo per asset group / per ticker.                                      |
| `asset-notes.json`                    | What each asset is, keyed by group.                                         |
| `asset-group-corrections.json`        | Log of group renames for downstream stores.                                 |

## Docs

- [Asset groups](docs/asset-groups.md): how deployments are joined into one asset across chains, and how to fix a split.
- [Token row and `props` reference](docs/token-props.md): every field on a row and what it means.
- Subsystems: [issuer](scripts/issuer/README.md) · [OFT mesh](scripts/oft/README.md) · [asset notes](scripts/notes/README.md) · [on-chain fetch](scripts/onchain-fetch/README.md)

## Regenerating

```sh
cd scripts
npm ci
npm run generate:formatted   # full nightly pipeline (scripts/pipeline.ts)
npm run regen                # just the generator from cached lists, then format
```
