// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')

/**
 * `npm run rwa:check` — two independent sources must agree on what a tokenized stock is.
 *
 * risk-data files a deployment under `props.risk.category = 'TOKENIZED_EQUITY'`; this repo's
 * RWA classifier (labels/rwaLstRules.ts + rwa/rwaAssets.ts) files it under `props.rwa`. Every
 * TOKENIZED_EQUITY row must carry `rwa.type === 'equity'` or `rwa.type === 'fund'` with
 * `subType: 'etf'` — consumers (the asset-class filter) read the class off `props.rwa` only,
 * so a stock risk-data knows and `rwa` does not is invisible to `assetClasses=stocks`.
 *
 * Exempt, and printed as such: principal / yield / SY wrappers (`props.pendle`,
 * `props.spectra`). They are a protocol's instrument over a stock, never the stock — the
 * classifier refuses them on purpose (`isPrincipalTokenWrapper`) and the stock reaches them
 * as an issuer EXPOSURE.
 *
 * Also reports (never fails on) the equity / ETF rows with no `rwa.underlying`, per issuer —
 * the gap the `underlyings=` filter cannot see — and every underlying ticker filed as `fund/etf`
 * on one row and `equity/stock` on another (one instrument, one class: labels/equityTicker.ts
 * ETF_UNDERLYINGS / COMPANY_UNDERLYINGS is where that is settled).
 *
 * Exit 1 when a non-exempt row disagrees.
 */

interface Row {
  chainId: string
  address: string
  symbol?: string
  name?: string
  props?: Record<string, any>
}

function readLists(): Row[] {
  const out: Row[] = []
  for (const file of fs.readdirSync(REPO_ROOT)) {
    const base = file.replace(/\.json$/, '')
    if (!file.endsWith('.json') || !(/^\d+$/.test(base) || base === 'solana')) continue
    let data: any
    try {
      data = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'))
    } catch {
      continue
    }
    const list = data?.list
    if (!list || typeof list !== 'object') continue
    for (const [address, t] of Object.entries<any>(list))
      out.push({ ...t, chainId: String(data.chainId ?? base), address })
  }
  return out
}

const isEquityRwa = (rwa: any): boolean => rwa?.type === 'equity' || (rwa?.type === 'fund' && rwa?.subType === 'etf')

function main() {
  const rows = readLists()
  const violators: Row[] = []
  const exempt: Row[] = []
  let tokenizedEquity = 0
  const missingUnderlying = new Map<string, number>()
  let equityRows = 0
  // underlying ticker -> class -> example symbols: one instrument must be ONE class everywhere.
  const classesByTicker = new Map<string, Map<string, string[]>>()

  for (const r of rows) {
    const p = r.props ?? {}
    if (isEquityRwa(p.rwa)) {
      equityRows++
      const u = typeof p.rwa.underlying === 'string' ? p.rwa.underlying.toUpperCase() : ''
      if (u) {
        const byClass = classesByTicker.get(u) ?? new Map<string, string[]>()
        const cls = `${p.rwa.type}/${p.rwa.subType}`
        byClass.set(cls, [...(byClass.get(cls) ?? []), `${r.chainId}:${r.symbol}`])
        classesByTicker.set(u, byClass)
      }
      if (!p.rwa.underlying) {
        const k = String(p.rwa.issuer ?? '(none)')
        missingUnderlying.set(k, (missingUnderlying.get(k) ?? 0) + 1)
      }
    }
    if (p.risk?.category !== 'TOKENIZED_EQUITY') continue
    tokenizedEquity++
    if (isEquityRwa(p.rwa)) continue
    if (p.pendle || p.spectra) exempt.push(r)
    else violators.push(r)
  }

  const fmt = (r: Row) =>
    `  ${r.chainId.padEnd(8)} ${r.address}  ${String(r.symbol ?? '').padEnd(14)} ${r.name ?? ''}  rwa=${JSON.stringify(r.props?.rwa ?? null)}`

  console.log(`TOKENIZED_EQUITY rows: ${tokenizedEquity} over ${rows.length} deployments.`)
  if (exempt.length) {
    console.log(`Exempt (a wrapper over a stock, not the stock): ${exempt.length}`)
    exempt.forEach((r) => console.log(fmt(r)))
  }
  const missing = [...missingUnderlying.entries()].sort((a, b) => b[1] - a[1])
  const nMissing = missing.reduce((n, [, c]) => n + c, 0)
  console.log(`Equity / ETF rows without rwa.underlying: ${nMissing} of ${equityRows}`)
  missing.forEach(([issuer, n]) => console.log(`  ${issuer.padEnd(12)} ${n}`))

  // Reported, not fatal: the lists only pick a rule fix up on the next `generate` / `solana`.
  const split = [...classesByTicker.entries()].filter(([, m]) => m.size > 1)
  console.log(`Underlying tickers filed under more than one class (ETF vs stock): ${split.length}`)
  for (const [u, m] of split)
    console.log(
      `  ${u.padEnd(8)} ${[...m.entries()].map(([c, ex]) => `${c}: ${ex.slice(0, 3).join(' ')}`).join(' | ')}`,
    )

  if (violators.length) {
    console.error(`\n${violators.length} TOKENIZED_EQUITY row(s) whose props.rwa is not equity / fund-etf:`)
    violators.forEach((r) => console.error(fmt(r)))
    process.exit(1)
  }
  console.log('OK: every TOKENIZED_EQUITY row is equity / fund-etf in props.rwa.')
}

main()
