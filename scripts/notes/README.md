# Asset notes — `asset-notes.json`

**What is this token?**

The other overlays in this repo answer narrow questions in fields: `props.issuer` says whose credit it is, and `props.stablecoin.base` says what money it counts in. Asset notes answer the question an asset page needs answered first. In words, they say what the token is, what backs it and where its yield comes from.

```jsonc
// asset-notes.json — keyed by assetGroup, valid on every chain the group lives on
"apyUSD::APYUSD": {
  "what": "Apyx savings wrapper of apxUSD · …",   // one line, ≤ 90 chars
  "body": "…",                                     // 2–4 sentences
  "backing": "…",
  "yieldSource": "…",                              // null: the token earns nothing itself
  "redemption": "…",
  "issuer": "Apyx",
  "links": ["https://…"],
  "updated": "2026-10-06",                         // when the facts were checked
  "confidence": "high",                            // high | medium | low
  "verify": "…",                                   // present: something is off, show with a caveat
  "source": "curated"                              // or "derived"
}
```

## Two sources

| source    | where                      | what it carries                                                                                                                                                                                    |
| --------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `curated` | `notes.json` (this folder) | Hand-written and checked against the issuer's own docs. Every field.                                                                                                                               |
| `derived` | `notes.ts`                 | A `what` line read off props the pipeline already curated (pendle, spectra, savings, lst, rwa, stablecoin), e.g. "Pendle principal token on sUSDe · redeems for USDe on 22 Oct 2026 · fixed rate". |

A curated note always wins. A group with neither gets no entry, because "no description" is an answer too.

## Adding a note

1. Find the group id. Use the `assetGroup` on the token row, or the key in `omni-list.json`; a Solana-only token has a chain-local group (`hyUSD::hyUSD::solana`) that only `solana.json` carries, which the check accepts too. **Never use a ticker**: KBTC alone is 4 groups.
2. Add `"<group>": { "what": …, … }` to `notes.json`. If the same asset sits under more than one group (a duplicate or a per-chain split), list the others in `alsoGroups`.
3. Run `npm run notes` to regenerate the file, then `npm run notes:check` (CI runs this too).

The checklist for a note (what it is, whose credit, backing, yield source, redemption, sources) lives in yieldcircle's `docs/asset-research-backlog.md`.
