/**
 * Perena (perena.org) on Solana — the shares of its `bankineco` vault
 * program (`save8RQV…`): USD* (verified on Jupiter, already listed), its
 * junior tranche USD*-J (verified) and senior tranche USD*-P ("Principal
 * USD*"), and Forest Road's sUSD-FR, a curator vault on the same program and
 * one of USD*'s venues. All four are minted by their vault PDA (USD*'s
 * `ECJGrTZ6…`, sUSD-FR's `JBmJMnnG…`), checked 2026-10-29.
 *
 * Pinned, not discovered: the program hosts empty and prototype vaults too.
 * The roster is lending-sdks margin-fetcher-sol `vaults/perena`
 * (`PERENA_VAULTS`); names and symbols are the mints' own metadata (what
 * Jupiter's search answers). The unverified ones join through
 * SOLANA_EXTRA_MINTS.
 */
export interface PerenaShareToken {
  mint: string
  name: string
  symbol: string
}

export const PERENA_SHARE_TOKENS: readonly PerenaShareToken[] = [
  { mint: 'star9agSpjiFe3M49B3RniVU4CMBBEK3Qnaqn3RGiFM', name: 'USD Star', symbol: 'USD*' },
  { mint: '3AJYCjrhKitmBd8tRUurPA5dGHCAQh6A8L9DkuSC37Rm', name: 'Junior USD*', symbol: 'USD*-J' },
  { mint: 'CPFZ7wUFpg5obsGB2GKXQ8rPY5ALuxs87dEjQjsrVxWw', name: 'Principal USD*', symbol: 'USD*-P' },
  { mint: '3TPJDfcAx438Ait2cg9fs98jenJ9nDCWJF1hneh7fPdw', name: 'Forest Road sUSD-FR', symbol: 'SUSD-FR' },
]

/** The scoped group solana.ts gives an unmatched mint — none of these exists on another chain. */
export const perenaShareGroup = (t: Pick<PerenaShareToken, 'name' | 'symbol'>) => `${t.name}::${t.symbol}::solana`

/**
 * Perena's carry tokens ("Kestrel" in the app — the `long_yield_carry`
 * program `LYC8…`): BTC*, SOL*, GOLD*, each minted by its `Token` PDA. The
 * app's own roster (`btc-star` / `sol-star` / `gold-star`); Jupiter answers
 * GOLD* nameless, so the names are the app's. NOT savings-overlaid: each is
 * denominated in its collateral (cbBTC / SOL / PAXG), not a fiat money.
 */
export const KESTREL_TOKENS: readonly PerenaShareToken[] = [
  { mint: 'YXyMDi4y5aUDmxUFgUvxbm2hXR945yhYaoY9nFnM1KN', name: 'BTC Star', symbol: 'BTC*' },
  { mint: 'FDhu9642aPYNnbTnSoHdAsR9tgSxftPDPjEVdbD58nP2', name: 'SOL Star', symbol: 'SOL*' },
  { mint: '4uNpwqFP97Hd5xKVS2a1wC7frqBY9yZi7x4Dgtwwi2FU', name: 'GOLD Star', symbol: 'GOLD*' },
]
