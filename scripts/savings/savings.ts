// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { isAddress, zeroAddress } from 'viem'
import { multicallRetryUniversal } from '@1delta/providers'
import { SavingsGroupMap, SavingsProps } from '../utils/types'
import { loadRiskDataFile } from '../utils/riskDataSource'
import { ERC4626_ABI } from './erc4626'
import { SAVINGS_CURATED } from './savingsAssets'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Builds the savings-token overlay from risk-data (data/defillama/yield-bearing-stablecoins.json),
 * the sibling feed of the stablecoin-quality feed the stablecoin overlay uses.
 *
 * CURATION-FIRST: a token is classified as savings ONLY if its assetGroup is in the curated
 * allowlist (savingsAssets.ts) — because an actively-managed fund also reports a stablecoin from
 * ERC-4626 `asset()` and would otherwise false-positive. The generator's job is to:
 *   - write `savings.json`            — the curated groups, with `underlying` enriched on-chain
 *   - write `savings-candidates.json` — EVERY feed row (with a resolved-underlying suggestion),
 *                                       sorted by market cap, for a human to promote into the allowlist
 *
 * `underlying` resolution is HYBRID: on-chain ERC-4626 `asset()` → `symbol()` (authoritative),
 * falling back to a symbol heuristic (strip leading `s` / `syrup`). Keyed by `assetGroup` since a
 * wrapper's underlying is chain-independent, so the overlay covers every deployment.
 */
interface RawSavings {
  symbol?: string
  name?: string
  market_cap?: number | null
  assetGroup?: string | null
  matchedChainId?: string | null
  matchedAddress?: string | null
}

interface Candidate {
  assetGroup: string
  symbol: string
  name: string
  marketCap: number | null
  chainId: string | null
  address: string | null
  /** suggested underlying (verify before promoting) */
  underlying?: string
  /** how the suggestion was derived */
  source: 'onchain' | 'heuristic' | 'none'
  /** already in the curated allowlist? */
  curated: boolean
}

/** Best-effort underlying from the wrapper symbol; on-chain resolution is preferred. */
function heuristicUnderlying(symbol?: string): string | undefined {
  const s = (symbol ?? '').trim()
  if (!s) return undefined
  const lower = s.toLowerCase()
  // Maple's syrupUSDC / syrupUSDT wrap the trailing ticker.
  if (lower.startsWith('syrup') && s.length > 5) return s.slice(5).toUpperCase()
  // Generic staked/savings prefix: sDAI→DAI, sUSDe→USDE, sfrxUSD→FRXUSD, savUSD→AVUSD.
  if (lower.startsWith('s') && s.length > 1) return s.slice(1).toUpperCase()
  return undefined
}

/** Fiat peg of the underlying. This feed is USD-dominated; detect the rare EUR/GBP by ticker. */
function baseFor(underlying?: string, symbol?: string): string {
  const str = `${underlying ?? ''} ${symbol ?? ''}`.toUpperCase()
  if (str.includes('EUR')) return 'EUR'
  if (str.includes('GBP')) return 'GBP'
  return 'USD'
}

function isRealAddress(v: unknown): v is string {
  return typeof v === 'string' && isAddress(v) && v.toLowerCase() !== zeroAddress
}

/** Resolve assetGroup -> underlying symbol via on-chain `asset()` then `symbol()`, per chain. */
async function resolveOnchain(byChain: {
  [chainId: string]: { assetGroup: string; address: string }[]
}): Promise<{ [assetGroup: string]: string }> {
  const out: { [assetGroup: string]: string } = {}
  for (const [chainId, rows] of Object.entries(byChain)) {
    try {
      const assetRes = (await multicallRetryUniversal({
        chain: chainId,
        calls: rows.map((r) => ({ address: r.address, name: 'asset', args: [] })),
        abi: ERC4626_ABI,
        batchSize: 40,
        allowFailure: true,
        logErrors: false,
      })) as any[]

      const rowUnderlying = assetRes.map((a) => (isRealAddress(a) ? a.toLowerCase() : undefined))
      const distinct = [...new Set(rowUnderlying.filter(Boolean) as string[])]
      if (distinct.length === 0) continue

      const symRes = (await multicallRetryUniversal({
        chain: chainId,
        calls: distinct.map((a) => ({ address: a, name: 'symbol', args: [] })),
        abi: ERC4626_ABI,
        batchSize: 40,
        allowFailure: true,
        logErrors: false,
      })) as any[]

      const symOf: { [addr: string]: string } = {}
      distinct.forEach((a, i) => {
        if (typeof symRes[i] === 'string' && symRes[i]) symOf[a] = symRes[i]
      })

      rows.forEach((r, i) => {
        const u = rowUnderlying[i]
        const sym = u ? symOf[u] : undefined
        if (sym) out[r.assetGroup] = sym
      })
      const hit = rows.filter((r) => out[r.assetGroup]).length
      console.log(`[savings] chain ${chainId}: resolved ${hit}/${rows.length} underlyings on-chain`)
    } catch (e) {
      console.warn(`[savings] on-chain resolution failed for chain ${chainId}: ${(e as Error).message}`)
    }
  }
  return out
}

function serialize(map: SavingsGroupMap): string {
  const keys = Object.keys(map).sort()
  return JSON.stringify(
    keys.reduce((acc: SavingsGroupMap, k) => ((acc[k] = map[k]), acc), {}),
    null,
    2,
  )
}

async function generateSavingsMap() {
  console.log('Generating savings overlay from risk-data...')
  try {
    const raw = await loadRiskDataFile<RawSavings[]>('data/defillama/yield-bearing-stablecoins.json')

    // Only rows with an assetGroup can be overlaid (matches the stablecoin overlay's keying).
    const rows = raw.filter((r): r is RawSavings & { assetGroup: string } => !!r?.assetGroup)
    const skipped = raw.length - rows.length

    // Group the on-chain-matched rows by chain for batched asset()/symbol() resolution.
    const byChain: { [chainId: string]: { assetGroup: string; address: string }[] } = {}
    for (const r of rows) {
      if (r.matchedChainId && isRealAddress(r.matchedAddress)) {
        ;(byChain[r.matchedChainId] ??= []).push({ assetGroup: r.assetGroup, address: r.matchedAddress.toLowerCase() })
      }
    }
    const onchain = await resolveOnchain(byChain)

    // Review queue: every feed row with its resolved-underlying suggestion, richest first.
    const seen = new Set<string>()
    const candidates: Candidate[] = []
    for (const r of rows) {
      if (seen.has(r.assetGroup)) continue
      seen.add(r.assetGroup)
      const onchainSym = onchain[r.assetGroup]
      const underlying = onchainSym ?? heuristicUnderlying(r.symbol)
      candidates.push({
        assetGroup: r.assetGroup,
        symbol: r.symbol ?? '',
        name: r.name ?? '',
        marketCap: r.market_cap ?? null,
        chainId: r.matchedChainId ?? null,
        address: isRealAddress(r.matchedAddress) ? r.matchedAddress.toLowerCase() : null,
        ...(underlying ? { underlying } : {}),
        source: onchainSym ? 'onchain' : underlying ? 'heuristic' : 'none',
        curated: !!SAVINGS_CURATED[r.assetGroup],
      })
    }
    candidates.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))

    // Effective snapshot: ONLY curated groups, with underlying enriched (curated pin wins).
    const map: SavingsGroupMap = {}
    for (const [group, curated] of Object.entries(SAVINGS_CURATED)) {
      const feedSymbol = rows.find((r) => r.assetGroup === group)?.symbol
      const underlying = curated.underlying ?? onchain[group] ?? heuristicUnderlying(feedSymbol)
      const props: SavingsProps = {
        ...(underlying ? { underlying } : {}),
        base: curated.base ?? baseFor(underlying, feedSymbol),
      }
      map[group] = props
    }

    const withUnderlying = Object.values(map).filter((v) => v.underlying).length
    fs.writeFileSync(path.resolve(__dirname, './savings.json'), serialize(map))
    fs.writeFileSync(path.resolve(__dirname, './savings-candidates.json'), JSON.stringify(candidates, null, 2))

    console.log(
      `Wrote savings.json with ${Object.keys(map).length} curated groups (${withUnderlying} with an underlying).`,
    )
    console.log(
      `Wrote savings-candidates.json: ${candidates.length} candidates for review ` +
        `(${candidates.filter((c) => c.curated).length} already curated)` +
        (skipped ? `; ${skipped} feed rows skipped (no assetGroup — not overlayable).` : '.'),
    )
  } catch (error) {
    // Non-fatal: keep the last committed snapshot so the generate pipeline never breaks.
    console.warn('[savings] could not refresh savings.json, keeping existing snapshot:', (error as Error).message)
    process.exit(0)
  }
}

generateSavingsMap()
