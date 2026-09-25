# One asset, every chain — the OFT mesh and the gas-coin shape

Two facts the lists already carry, turned into asset identity.

## The OFT peer mesh (`mesh.ts`, `meshReport.ts`, `mesh-groups.json`)

`props.oft.routes[].peers` (read on-chain by `oft.ts`) names, per remote
chain, the contract each LayerZero deployment sends to. Those links join every
deployment of one asset into a connected component, whatever the external
lists call the token on each chain. A component spanning more than one
`assetGroup` is an asset the generator split.

Measured 2026-09-25 over the omni-list: 716 meshes, **88 split** — USDT
(`USDT` + `USDT0::USDT0` on Stable, Tempo, MegaETH, Rootstock, Conflux, 2818),
Tether Gold (five keys), USDe on Fraxtal, weETH on Mode, WBTC, ENA (three
keys), PYUSD (seven), every `Name::SYM::<chain>::<n>` dedup suffix of an OFT…
152 deployments in all. The cause of the biggest one is the same-chain dedup in
`generateTokenMap.script.ts`: Stable's zero address (native USDT0) sits in
`USDT`, so the ERC-20 view of the same balance was pushed out to its
`currencyId`.

- `npm run oft:mesh` — prints every split mesh, writes `mesh-groups.json`
  (chainId → address → group). Canonical = a group that is not a dedup suffix,
  then the one holding the Ethereum deployment (the `GROUP_ALIAS` convention),
  then the most chains. Accumulates, so the file converges: a deployment moved
  by an earlier run sits in the canonical group and no longer shows as a move.
- `mesh-exclude.json` — the reviewed meshes that must NOT merge (a peer link
  that joins two assets — IQ's second adapter into KRWT — or a canonical that is
  itself a ticker collision — Flexa's `AMP`). `oapp` alone is not an identity:
  `frax-finance` covers ten assets.
- The generator applies `mesh-groups.json` right after the group is chosen —
  before the group-keyed overlays, so a moved deployment inherits the asset's
  stablecoin / issuer / lst labels, and over the 1delta list's stored group —
  and skips the same-chain dedup for it.
- `npm run oft:mesh:check` (in `generate:formatted`) exits 1 while an
  unreviewed split remains: run `oft:mesh` to add it or exclude it.

## The gas-coin shape (`../../native-currencies.json`)

Written by the generator from every chain list's zero-address entry
(`props.erc20` = `NATIVE_ERC20`, `props.wrapped` = the wnative), so a consumer
can read it without the chain lists:

| shape        | meaning                                                          | e.g.                      |
| ------------ | ---------------------------------------------------------------- | ------------------------- |
| `coin`       | a coin with a separate wrapper — two balances                    | ETH / WETH                |
| `coin+erc20` | a coin, an ERC-20 VIEW of the same balance, and a wrapper        | Polygon `0x…1010` / WPOL  |
| `erc20`      | the coin IS the ERC-20; the zero address is its alias            | Arc USDC, Stable USDT0    |
| `none`       | no gas coin; `eth_getBalance` is a placeholder (Tempo)           | pathUSD `0x20c0…0000`     |

On Arc and Stable the native balance equals `balanceOf` to the token's last
digit (16 holders, 2026-09-25), which is why a consumer that adds the zero
address and the ERC-20 counts the same money twice. pos-indexer reads this file
into `idx.chain_natives` (its asset pages fold the aliases into one member).
