// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Reconciliation gate for ETH and BTC — the sibling of check.ts (which covers
 * fiat money).
 *
 *   npm run issuer:check:eth-btc     # exit 1 on a violation
 *
 * Two assertions on the generated omni-list:
 *
 *  1. DESK. A token whose money is ETH or BTC — `props.lst.asset`,
 *     `props.denomination` or `props.savings.base` — carries `issuer` or
 *     `issuerExposures`, or its group is in `unattributed-eth-btc-ok.json`.
 *     Unlike dollars, "nobody issues it" is a common, correct answer here:
 *     native ETH and plain WETH are nobody's liability, and they are listed
 *     with exactly that reason rather than left implicit.
 *
 *  2. MONEY. A token that HAS a desk and wears an ETH/BTC ticker (no wrapper
 *     props — a PT's money is its underlying's) must also say what money it is:
 *     tBTC, SolvBTC and BTCB once carried an issuer and neither `denomination`
 *     nor `lst`, so no consumer could tell they were bitcoin. Exempt only via
 *     the same allowlist, under `"money:<group>"`.
 *
 * Same ratchet as check.ts: a missing entry fails, an entry without a reason
 * fails, and an entry that is no longer needed (group attributed / has a money /
 * gone) fails — delete it.
 */

interface Currency {
  chainId?: string
  address?: string
  name?: string
  symbol?: string
  props?: Record<string, any>
}

const omniPath = path.resolve(__dirname, '../../omni-list.json')
const allowPath = path.resolve(__dirname, './unattributed-eth-btc-ok.json')

const omni: Record<string, { currencies?: Currency[] }> = JSON.parse(fs.readFileSync(omniPath, 'utf-8'))
const allow: Record<string, string> = fs.existsSync(allowPath) ? JSON.parse(fs.readFileSync(allowPath, 'utf-8')) : {}

const MONIES = new Set(['ETH', 'BTC'])
const moneyOf = (p: Record<string, any>): string | undefined =>
  [p.lst?.asset, p.denomination, p.savings?.base].find((m) => typeof m === 'string' && MONIES.has(m))
const hasDesk = (p: Record<string, any>) =>
  !!p.issuer || (Array.isArray(p.issuerExposures) && p.issuerExposures.length > 0)
const isWrapper = (p: Record<string, any>) => !!(p.pendle || p.spectra || p.exponent || p.receipt || p.rwa)
const ETH_BTC_TICKER = /BTC|ETH/i

const noDesk = new Map<string, Currency[]>()
const noMoney = new Map<string, Currency[]>()
let money = 0
for (const [group, entry] of Object.entries(omni)) {
  for (const c of entry.currencies ?? []) {
    const p = c.props ?? {}
    const m = moneyOf(p)
    if (m) {
      money++
      if (!hasDesk(p)) noDesk.set(group, [...(noDesk.get(group) ?? []), c])
    } else if (hasDesk(p) && !isWrapper(p) && ETH_BTC_TICKER.test(c.symbol ?? '')) {
      const k = `money:${group}`
      noMoney.set(k, [...(noMoney.get(k) ?? []), c])
    }
  }
}

const violations = new Map<string, Currency[]>([...noDesk, ...noMoney])
const missing = [...violations.keys()].filter((g) => !(g in allow))
const noReason = Object.entries(allow)
  .filter(([, r]) => typeof r !== 'string' || r.trim().length === 0)
  .map(([g]) => g)
const stale = Object.keys(allow).filter((g) => !violations.has(g))

const tokens = [...noDesk.values()].reduce((n, cs) => n + cs.length, 0)
console.log(
  `[issuer:check:eth-btc] ${money} ETH/BTC-money tokens; ${money - tokens} carry a desk, ${tokens} do not ` +
    `(${noDesk.size} groups); ${noMoney.size} attributed ETH/BTC-ticker group(s) without a money; ` +
    `${missing.length} not allowlisted.`,
)

const show = (g: string) => {
  const cs = violations.get(g) ?? []
  const names = [...new Set(cs.map((c) => c.name))].slice(0, 2).join(' / ')
  const where = cs
    .slice(0, 3)
    .map((c) => `${c.chainId}:${c.address}`)
    .join(', ')
  return `  ${g}  (${cs.length} deployment(s); "${names}"; ${where}${cs.length > 3 ? ', …' : ''})`
}

let failed = false
if (missing.length) {
  failed = true
  console.error(`\n${missing.length} group(s) not allowlisted:`)
  for (const g of missing.sort()) console.error(show(g))
  console.error(
    `→ "<group>": curate a desk in issuer/issuerAssets.ts; "money:<group>": add it to ` +
      `denomination/denominationMap.ts or lst/lstGroupMap.ts — or allowlist it in ` +
      `issuer/unattributed-eth-btc-ok.json with a reason.`,
  )
}
if (noReason.length) {
  failed = true
  console.error(`\n${noReason.length} allowlist entr(y/ies) without a reason:`)
  for (const g of noReason) console.error(`  ${g}`)
}
if (stale.length) {
  failed = true
  console.error(`\n${stale.length} allowlist entr(y/ies) no longer needed — delete them:`)
  for (const g of stale.sort()) console.error(`  ${g}`)
}

if (failed) process.exit(1)
console.log('[issuer:check:eth-btc] ok')
