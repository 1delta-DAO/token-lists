# The issuer overlay — `props.issuer`

**Whose credit is this?**

Every other axis on a token answers something else. `props.stablecoin.base` and
`props.denomination` say what *money* it is worth. `assetGroup` says *which
token* it is. `props.lst.provider` covers staking and nothing else. None of them
answers the question a lender, an allocator or a risk dashboard actually asks
about a dollar: **whose solvency, administration and redemption terms am I
holding?**

That is `props.issuer`:

```jsonc
"props": {
  "issuer": { "id": "ethena", "name": "Ethena", "kind": "protocol" }
}
```

`sky` for USDS / sUSDS / DAI. `ethena` for USDe / sUSDe / USDtb. `circle` for
USDC / EURC. At the 2026-09-23 regeneration this reached **8 385 tokens across
81 issuers**.

## What it is NOT

Each of these looks like the issuer and is a different question. Getting them
confused is the failure this overlay exists to prevent.

| Not this | Because |
|---|---|
| the **money** it is worth | USDe and USDC are both `USD`. They are not the same credit. |
| the **venue** that hosts it | a Morpho vault holding sUSDe is Ethena's credit on Morpho's rails. |
| the **curator** who allocates to it | Steakhouse curating a USDC vault does not make Steakhouse the issuer of USDC. |
| the **chain or bridge** it arrived over | USDC.e is still Circle's asset; the bridge is a separate risk. |
| the **staking provider** alone | `lst.provider` is a *seed* for this field, not a synonym — it covers ~390 tokens, and none of the dollar menu. |

## No issuer is an answer

WETH, BNB, AVAX, POL and every other gas base carry **no `issuer` key at all**.
Nobody issues them; they are nobody's liability. An absent issuer is a fact
about the asset, not a gap waiting to be filled, and nothing in this overlay
guesses one. The same applies to any token whose desk has simply not been
curated yet — it stays blank rather than borrowing an attribution from its
ticker.

## How a token gets one

```
issuerAssets.ts  (curated, 97 entries, assetGroup -> issuer)
                                │
omni-list.json ──► issuer.ts ───┤  derive from props already published:
  (previous run)                │    rwa.issuer  ·  lst.provider  ·  oft.routes[].oapp (allowlisted)
                                │  + pre-alias expansion (Name::SYMBOL keys)
                                ▼
                          issuer.json          2 580 groups, 82 issuers
                                │
                        issuerMap.ts  →  lookupIssuer(assetGroup)
                                │
                  generateTokenMap.script.ts  →  props.issuer on every token of the group
```

Three properties worth knowing:

* **Keyed by `assetGroup`, not by address.** A desk does not change per chain,
  so one entry attributes every deployment of the group — Ethereum, Base,
  Arbitrum, and any bridged mirror.
* **Curation always wins.** `ISSUER_CURATED` is merged last, over anything
  derived. A hand-written desk beats an inference, always.
* **The impostor guard still applies.** `generateTokenMap.script.ts` skips the
  overlay for a token flagged by `isImpostor`, so a ticker-copy can never
  inherit a real desk's name through a shared group.

### The `kind` field

`protocol` (governed on-chain: sky, ethena, curve — 246 groups), `institution`
(an off-chain legal entity with a redemption desk: circle, tether, paxos,
backed — 2 304 groups, dominated by the RWA registry) and `cex` (an exchange's
own wrapper: coinbase, binance — 8 groups). Circle and Sky are both issuers, but
a redemption desk and a governance process are not the same promise, and a
consumer that wants to say so needs the distinction.

`parent` is for a product line whose desk is someone else's — currently only
`PayPal USD::PYUSD`, which PayPal brands and Paxos Trust mints. Facets group on
`id`; a consumer that wants the family folds by `parent`.

## Adding or fixing an issuer

Add a line to `ISSUER_CURATED` in [`issuerAssets.ts`](./issuerAssets.ts), then:

```bash
cd scripts
npm run issuer                      # rebuilds issuer.json
GEN_CACHE=1 npm run generate        # overlays it onto the lists
```

**Key it on the group string exactly as the lists hold it**, which is the
PRE-ALIAS string — the same rule `stablecoin.ts` and `savingsAssets.ts` follow,
and why several entries appear in two casings. To find the real key:

```bash
# from scripts/
node -e "const l=require('../omni-list.json');
  console.log(Object.keys(l).filter(k => k.toUpperCase().includes('SUSDS')))"
```

Then check nothing regressed:

```bash
# from scripts/
node --max-old-space-size=4096 -e "const l=require('../omni-list.json');
  let n=0; const ids=new Set();
  for (const g of Object.values(l)) for (const c of g.currencies||[])
    if (c.props?.issuer) { n++; ids.add(c.props.issuer.id) }
  console.log(n, 'tokens,', ids.size, 'issuers')"
```

An attribution count that **falls** between runs means the overlay regressed,
not that the assets changed.

## Four traps, each one paid for

These are the mistakes that were actually made building this. They all have the
same shape: something that *looks* like an issuer and is not.

### 1. A LayerZero mesh is a corridor, not a desk

`oft.routes[].oapp` names the mesh a token moves over. Accepting those names by
default attributed **WETH to "Movement"** (150 tokens), 233 tokens to "Glue",
another 51 to "hybridge", and inflated the roster to **372 issuers**.

So `OAPP_ISSUER_MESHES` in [`issuer.ts`](./issuer.ts) is an **allowlist**, not a
denylist — the junk is not enumerable, the legitimate cases are. The bar for an
entry: *the mesh moves the issuer's own token*, so the corridor and the desk are
the same party (`usdt0` → Tether, `ethena` → Ethena, `frax-finance` → Frax).
`wbtc`, `euler`, `zro-token`, `rootstock`, `movement` and `glue` fail it and are
deliberately absent. 372 issuers → 81.

### 2. The lookup happens on the PRE-ALIAS group

`generateTokenMap.script.ts` calls `lookupIssuer(assetGroup)` *before* the
unifier folds `Kelp DAO Restaked ETH::RSETH` into `RSETH`. A group-only key
therefore misses every deployment that arrives under its own `Name::SYMBOL`
string — which was 22 groups attributed on Ethereum and blank on every bridged
chain (rsETH, stETH, wstETH, LBTC, lsETH).

`issuer.ts` closes this generically: for every attributed group it also emits the
`Name::SYMBOL` composite of each of its deployments (254 keys at the last run).
An alias never overwrites a different desk — a collision is skipped and counted,
never resolved.

### 3. A ticker is not an identity

A scan of the live list found **119 unattributed groups whose symbol a curated
desk claims**. They are `ETHERBUTTS::METH`, `ETH Monsta::METH`,
`USDollarToken::USDT`, `USD Coin Test::USDC`, `StableUSD::USDS`,
`Chad USD::CUSD`, `Royal Dollar::RUSD`, `yearn Curve::yUSD`. Seven were real
deployments and were curated; the other **112 are left blank on purpose**.

Attributing by symbol is the exact consumer-side mistake this field exists to
end — a front end deriving the axis from symbols and names filed PT-apyUSD,
sUSDai and reUSD under "USDC", and ten of 46 rows on that tab were not USDC in
the hand.

Two that look like misses and are not: **`f(x) rUSD::RUSD` is f(x) Protocol's,
not Reservoir's**, and **`Coin98 Dollar::CUSD` is Coin98's, not Cap's**. Same
ticker, different desk — which is why every ambiguous entry is keyed in full.

### 4. `generate` writes minified JSON

The committed tree is prettier-formatted, so `npm run generate` alone produces a
diff that reads as a million deleted lines. The repo's own `generate:formatted`
pairs them (`generate && format`) — but `npm run format` runs prettier over the
**entire repo**. If you only regenerated the lists, format only those:

```bash
# from scripts/, so prettier picks up the config in scripts/package.json
git diff --name-only -- '*.json' | grep -v '^scripts/' \
  | sed 's|^|../|' | xargs npx prettier -w --object-wrap collapse
```

## Merge conflicts in the generated lists

`omni-list.json` and the chain files are **generated artifacts**. When two
branches both regenerate them, the conflict is not resolvable by hand and must
not be resolved textually. Take one side's *inputs* (the `scripts/*/**.json`
snapshots), then re-run `npm run issuer && GEN_CACHE=1 npm run generate` and
format. The output is the resolution.

## Downstream

The overlay is consumed by `yield-tracer`, which lifts `id` and `name` into
`assets.issuer` / `assets.issuer_name` (migration 0150) on its lending ingest,
and serves them as filters on `/assets/available`, `/pools`, `/pairs/optimize`
and `/earn/latest`, plus an `issuers` facet with counts. `kind` and `parent` stay
in the stored props blob for whoever wants them.

Nothing downstream infers an issuer of its own. If this overlay does not name a
desk, the row is honestly unattributed everywhere — which is the point.
