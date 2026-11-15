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
  "mechanism": "private-credit",                   // how it earns, as an id (see below); optional
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

## `mechanism`

How the token earns, as one id from a closed list (`MECHANISMS` in `notes.ts`): `lending`, `staking`, `restaking`, `basis-trade`, `treasuries`, `private-credit`, `reinsurance`, `dividends`, `hedged-trading`, `mixed`. Consumers turn the id into their own words (yieldcircle's Lite names a row "Basis trade via Ethena").

- Set it per token, never per issuer: sUSDS and stUSDS are both Sky's and earn differently.
- Leave it out for a token that earns nothing itself (USDC, USDe), and when the issuer's docs do not say. `mixed` is for a product that is honestly several of these, not for a guess.
- A derived note gets one from props: `lst.type`, and `rwa.subType` for treasuries, private credit, reinsurance and basis-trade funds. A live Pendle PT takes its underlying's. A curated note without the field keeps the derived one.
- `notes:check` fails on an id outside the list.
- `mechanismOf` names the ONE thing that pays it, as a ticker: `"mechanism": "dividends", "mechanismOf": "STRC"` on Saturn's sUSDat and Strata's srUSDat, so a consumer can say "STRC dividends". Leave it out for a basket (Apyx's apyUSD earns from several issuers' preferred shares). A live Pendle PT takes its underlying's along with the mechanism.

## Adding a note

1. Find the group id. Use the `assetGroup` on the token row, or the key in `omni-list.json`; a Solana-only token has a chain-local group (`hyUSD::hyUSD::solana`) that only `solana.json` carries, which the check accepts too. **Never use a ticker**: KBTC alone is 4 groups.
2. Add `"<group>": { "what": …, … }` to `notes.json`. If the same asset sits under more than one group (a duplicate or a per-chain split), list the others in `alsoGroups`.
3. Run `npm run notes` to regenerate the file, then `npm run notes:check` (CI runs this too).

The checklist for a note (what it is, whose credit, backing, yield source, redemption, sources) lives in yieldcircle's `docs/asset-research-backlog.md`.
