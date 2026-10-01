// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Reconciliation gate: every dollar (or euro, franc …) in the lists has a desk.
 *
 *   npm run issuer:check            # exit 1 on a violation
 *
 * A token whose `props.stablecoin.base` or `props.savings.base` is set says
 * what MONEY it is worth; a consumer grouping by desk (YieldCircle's "whose
 * credit do you hold") then needs `props.issuer` or `props.issuerExposures`
 * too, or the row lands in an unattributed bucket. This asserts that on the
 * generated omni-list, per assetGroup, because desks are curated per group.
 *
 * The escape hatch is `unattributed-ok.json` — `{ "<group>": "<reason>" }`.
 * It is a RATCHET, not a mute button:
 *  - a group missing a desk and absent from the list FAILS (a new stablecoin
 *    landed; curate it in issuerAssets.ts or allowlist it with a reason);
 *  - an entry with an empty reason FAILS;
 *  - an entry whose group now HAS a desk, or no longer exists, FAILS — delete
 *    it, so the list only ever shrinks.
 *
 * The baseline entries were written when the gate was introduced and carry
 * that as their reason; replace it with a real one (or a desk) as each group
 * is looked at. "No issuer is an answer" (README) still holds — a group with
 * no desk on purpose belongs here with that stated.
 */

interface Currency {
  chainId?: string
  address?: string
  name?: string
  symbol?: string
  props?: Record<string, any>
}

const omniPath = path.resolve(__dirname, '../../omni-list.json')
const allowPath = path.resolve(__dirname, './unattributed-ok.json')

const omni: Record<string, { currencies?: Currency[] }> = JSON.parse(fs.readFileSync(omniPath, 'utf-8'))
const allow: Record<string, string> = fs.existsSync(allowPath) ? JSON.parse(fs.readFileSync(allowPath, 'utf-8')) : {}

let money = 0
let unattributedTokens = 0
const unattributed = new Map<string, Currency[]>()
const attributedGroups = new Set<string>()

for (const [group, entry] of Object.entries(omni)) {
  for (const c of entry.currencies ?? []) {
    const p = c.props ?? {}
    if (!p.stablecoin?.base && !p.savings?.base) continue
    money++
    if (p.issuer || (Array.isArray(p.issuerExposures) && p.issuerExposures.length > 0)) {
      attributedGroups.add(group)
      continue
    }
    unattributedTokens++
    const list = unattributed.get(group) ?? []
    list.push(c)
    unattributed.set(group, list)
  }
}

const missing = [...unattributed.keys()].filter((g) => !(g in allow))
const noReason = Object.entries(allow)
  .filter(([, reason]) => typeof reason !== 'string' || reason.trim().length === 0)
  .map(([g]) => g)
const stale = Object.keys(allow).filter((g) => !unattributed.has(g))

const allowed = [...unattributed.keys()].filter((g) => g in allow)
console.log(
  `[issuer:check] ${money} stablecoin/savings tokens; ${money - unattributedTokens} carry a desk, ` +
    `${unattributedTokens} do not (${unattributed.size} groups: ${allowed.length} allowlisted, ${missing.length} not).`,
)

const show = (g: string) => {
  const cs = unattributed.get(g) ?? []
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
  console.error(`\n${missing.length} group(s) with a stablecoin/savings base and NO desk, not allowlisted:`)
  for (const g of missing.sort((a, b) => unattributed.get(b)!.length - unattributed.get(a)!.length))
    console.error(show(g))
  console.error(
    `→ curate a desk in issuer/issuerAssets.ts, or add the group to issuer/unattributed-ok.json with a reason.`,
  )
}
if (noReason.length) {
  failed = true
  console.error(`\n${noReason.length} allowlist entr(y/ies) without a reason:`)
  for (const g of noReason) console.error(`  ${g}`)
}
if (stale.length) {
  failed = true
  console.error(
    `\n${stale.length} allowlist entr(y/ies) no longer needed (group has a desk now, or is gone) — delete them:`,
  )
  for (const g of stale.sort()) console.error(`  ${g}${attributedGroups.has(g) ? '  (attributed)' : ''}`)
}

if (failed) process.exit(1)
console.log('[issuer:check] ok')
