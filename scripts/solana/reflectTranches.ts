/**
 * Reflect tranches (tranches.reflect.money) on Solana — per market a SENIOR
 * wrapper ("Protected …", minted by the Reflect Proxy program's proxy-state
 * PDA) and a JUNIOR first-loss pool LP ("Amplified …", minted by the RLP
 * program's liquidity-pool PDA), plus SUSDG, Reflect's tokenised share of
 * Steakhouse's USDG Kamino vault that one market is built on.
 *
 * Pinned, not discovered: the same Proxy program issues ~90 whitelabel
 * stablecoins, so a mint cannot be recognised as a tranche by its program.
 * The roster is lending-sdks margin-fetcher-sol `REFLECT_MARKETS`; names and
 * symbols are the mints' Metaplex metadata (what Jupiter's search answers),
 * checked 2026-10-29 together with each mint's `mintAuthority` (the proxy /
 * pool PDA). Jupiter does not verify any of them, so they join through
 * SOLANA_EXTRA_MINTS.
 */
export interface ReflectTrancheToken {
  mint: string
  name: string
  symbol: string
  side: 'senior' | 'junior' | 'underlying'
  /** The asset the tranche holds (savings `underlying`). */
  baseSymbol: string
}

export const REFLECT_TRANCHE_TOKENS: readonly ReflectTrancheToken[] = [
  { mint: 'sro4agJ6nJ89MJgj2DfDdx8zXVqSyZfCZjbhBfQaJU5', name: 'Protected SyrupUSDC', symbol: 'pSyrupUSDC', side: 'senior', baseSymbol: 'syrupUSDC' },
  { mint: 'jrByePxMbHAevzMG4kjUrfMWoZ7bQYwwKJTPcq2WysG', name: 'Amplified SyrupUSDC', symbol: 'aSyrupUSDC', side: 'junior', baseSymbol: 'syrupUSDC' },
  { mint: 'sRr4h6qhdZAqQjstXbqKNvtdj1pNDPczLr49HQ5QaRS', name: 'Protected Hastra Prime', symbol: 'pPRIME', side: 'senior', baseSymbol: 'PRIME' },
  { mint: 'JrGsMfJodyVEqLGnyAKa9qHzRqZ9dzFfeSjouV3qEeG', name: 'Amplified Hastra Prime', symbol: 'aPRIME', side: 'junior', baseSymbol: 'PRIME' },
  { mint: 'SRcbNRqXP585fbxMNo2NkCbrgjZNZv9y8JMcwXonUap', name: 'Protected Earn Hylo USD', symbol: 'pEHYUSD', side: 'senior', baseSymbol: 'eHYUSD' },
  { mint: 'jrZjCWLJMu5rabYcu1fbkZPK6daMdjLbyQM5NVeVGNG', name: 'Amplified Earn Hylo USD', symbol: 'aEHYUSD', side: 'junior', baseSymbol: 'eHYUSD' },
  { mint: 'SrBhwwen83jYAkgpMqT9k1yjjeM3ciYdoCNyMzVY1eH', name: 'Protected reUSD', symbol: 'pREUSD', side: 'senior', baseSymbol: 'reUSD' },
  { mint: 'jrFLwUZLRwk6JyQhqnVR2vkBgziNapAu6aJiS8MeWac', name: 'Amplified reUSD', symbol: 'aREUSD', side: 'junior', baseSymbol: 'reUSD' },
  { mint: 'sRTteWAWvtdmNPMRvhbJWBsa687CYeRt2jJFnUfTQfr', name: 'Protected Steakhouse USDG', symbol: 'pSUSDG', side: 'senior', baseSymbol: 'SUSDG' },
  { mint: 'jrsLHAvEaeyyWSqey33Vm8oaddxTNRx4vbD7ZvyTn8E', name: 'Amplified Steakhouse USDG', symbol: 'aSUSDG', side: 'junior', baseSymbol: 'SUSDG' },
  // Jupiter answers it with an EMPTY name and symbol: the name and ticker are Reflect's app's (`steakhouse-usdg`)
  { mint: '9YEKjRbRFE3bkvCu3QiuznqK6y9mddqD73qfA2MKv5Dp', name: 'Steakhouse USDG', symbol: 'SUSDG', side: 'underlying', baseSymbol: 'USDG' },
]

/** The scoped group solana.ts gives an unmatched mint — none of these exists on another chain. */
export const reflectTrancheGroup = (t: Pick<ReflectTrancheToken, 'name' | 'symbol'>) => `${t.name}::${t.symbol}::solana`
