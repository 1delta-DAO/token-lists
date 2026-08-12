# On-chain token fetch — adding tokens to the lists

`coins.json` is a **manual worklist**: a map of `chainId → [address]` for tokens
that should be in the token lists but are not yet. `fetch.ts` reads it, pulls
`name` / `symbol` / `decimals` from each contract via multicall, and writes the
new entries into the chain's list file at the repo root (`1.json`,
`8453.json`, …).

It is additive and idempotent — an address already present in the list is
skipped without an RPC call, so re-running is cheap and safe.

---

## The two ways addresses get into `coins.json`

|                  |                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **by hand**      | paste addresses under a chain id — the path this document is about                                                        |
| **`pnpm sugar`** | `sugar.ts` harvests every token from Velodrome-family LpSugar deployments and **appends them into `coins.json`**, deduped |

Both feed the same `pnpm onchain` step. If you have just run `sugar`, the file
will already contain a large batch; adding your own addresses alongside them is
fine, and the fetch handles the whole file in one pass.

---

## Adding tokens

1. **Add the addresses** to `coins.json` under their chain id. Create the chain
   key if it does not exist. Case does not matter (the script lowercases), but
   lowercase keeps diffs clean.

   ```json
   {
     "1": ["0x5e8422345238f34275888049021821e8e08caa1f", "0x1aad217b8f78dba5e6693460e8470f8b1a3977f3"],
     "8453": ["0xd993935e13851dd7517af10687ec7e5022127228"]
   }
   ```

2. **Run the fetch** from `scripts/`:

   ```bash
   pnpm onchain            # tsx onchain-fetch/fetch.ts
   ```

3. **Read the output.** Per chain it prints how many were already present, how
   many were fetched, how many were added, and — importantly — **which addresses
   failed**. See [Failures](#failures-are-signal) below; a failure is usually
   telling you something true.

4. **Check the diff** on the touched `<chainId>.json` files, then commit.

Entries are written in this shape, with `assetGroup` and `currencyId` both
derived as `` `${name}::${symbol}` ``:

```json
"0x5e8422345238f34275888049021821e8e08caa1f": {
  "chainId": "1",
  "address": "0x5e8422345238f34275888049021821e8e08caa1f",
  "name": "Frax Ether",
  "symbol": "frxETH",
  "decimals": 18,
  "assetGroup": "Frax Ether::frxETH",
  "currencyId": "Frax Ether::frxETH"
}
```

---

## Failures are signal

`fetch.ts` skips any address whose `name`/`symbol`/`decimals` call does not
return a usable value, and lists them at the end. Before re-running, work out
**which** kind of failure it is — they need opposite responses:

| symptom                                        | cause                                                              | what to do                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| every call reverts / returns `0x`              | **the address is on a different chain**                            | do NOT add it. Fix the source that produced the wrong-chain reference. |
| `name`/`symbol` revert but the contract exists | non-standard ERC-20 (bytes32 name, or a proxy without the getters) | add the entry by hand to `<chainId>.json`                              |
| intermittent, different addresses each run     | RPC flakiness                                                      | just re-run — already-added tokens are skipped                         |

The first row matters most. A wrong-chain address is the one case where the
fetch failing is the _correct_ outcome: there is no contract at that address on
that chain, so any entry you added by hand would be fiction. This is a real and
recurring source of "missing" tokens — an Avalanche vault reporting Ethereum's
USDC address, a chain-1 market reporting Base USDC. Those are ingest bugs
upstream, not gaps here.

---

## After the fetch: check the asset group

`assetGroup` is auto-derived as `` `${name}::${symbol}` `` from whatever the
contract returns. That is right often enough to automate, but it is **not**
always the group you want:

- **Same asset, different deployments** should share one group so prices and
  balances aggregate. If the new token is a variant of something already
  listed (a bridged form, a second-chain deployment, a renamed wrapper), add an
  entry to `GROUP_ALIAS` in
  [`scripts/utils/data/assetGroupUnifier.ts`](../utils/data/assetGroupUnifier.ts)
  mapping the raw `Name::SYMBOL` to the canonical group.
- **Different assets that merely share a ticker must NOT be merged.** That file
  documents the ones deliberately kept apart (StaFi rETH ≠ Rocket Pool RETH,
  the mETH memes ≠ Mantle mETH, and so on). A wrong merge silently prices one
  asset with another's feed, which is worse than an ungrouped token.

Rule of thumb: alias when it is the _same underlying asset_; leave it alone when
it merely looks similar.

---

## Gotchas

- **The nightly regeneration overwrites the raw list JSON.** Hand edits to a
  `<chainId>.json` outside this script can be lost. Prefer adding to
  `coins.json` and re-running; when a manual edit is unavoidable, make it a
  narrow string replacement rather than a rewrite of the file.
- **`coins.json` is a worklist, not a registry.** It is safe (and normal) to
  leave old entries in it — they are skipped once listed. There is no need to
  prune it after a successful run. `sugar.ts` appends to the same file, so it
  grows over time by design.
- **Only the listed chains are touched.** A chain key with an empty array is a
  no-op.

---

## Finding what is missing

The lists are consumed by the yields backend, so the practical question is
"which underlyings does the data reference that the lists do not have".
[`missing-underlyings.mjs`](./missing-underlyings.mjs) in this directory
answers exactly that, and emits `coins.json`-shaped output:

```bash
# against the deployed origin
node missing-underlyings.mjs

# against a local yield-tracer (what you want while developing)
node missing-underlyings.mjs --origin http://localhost:3001

# machine-readable — the `--json` shape drops straight into coins.json
node missing-underlyings.mjs --origin http://localhost:3001 --json
```

It walks every vault the origin serves, collects each distinct `underlying`,
and diffs those against `/assets/available`. Note it diffs against the
**registry**, not against "rows whose symbol came back empty" — a provider whose
asset join is broken would otherwise report every one of its tokens as missing.

It reports two groups, and **only the first belongs in `coins.json`**:

- **genuine registry gaps** — referenced by a vault, absent from the lists;
- **wrong-chain references** — the address is registered on a _different_
  chain, so it is an upstream ingest bug (see [Failures](#failures-are-signal)).

Sort by TVL and start at the top: the tail is usually a long list of zero-TVL
synthetic tokens that cost nothing to add but unblock nothing either.

The script also excludes the native sentinel `0x000…000`. Chain-native
pseudo-addresses that are not ERC-20s — Polygon's `0x000…1010`, for instance —
will surface as "missing" but should be handled as native, not listed as
tokens.
