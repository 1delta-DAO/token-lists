/**
 * Asset notes: what a token IS, in words, per asset group.
 *
 * Every other overlay in this repo answers a narrow question in a field
 * (`props.issuer`: whose credit; `props.stablecoin.base`: what money). None
 * says, in a sentence a person reads, what the token is, what backs it and
 * where its yield comes from — which is what an asset page needs before any
 * number on it means anything (yieldcircle docs/asset-research-backlog.md).
 *
 *   asset-notes.json   { "<assetGroup>": AssetNote }
 *
 * Keyed by assetGroup, like `logos.json`: every token row in every chain list
 * carries `assetGroup`, so one note covers every chain the group lives on.
 *
 * Two sources, curated always wins:
 *
 *   curated  `notes.json` here — hand-written, checked against the issuer's own
 *            docs. `what` (one line, ≤ 90 chars) plus optional `body`,
 *            `backing`, `yieldSource`, `redemption`, `links`, `updated`.
 *            `alsoGroups` points more groups (a mislabelled twin, a per-chain
 *            split) at the same note.
 *   derived  a `what` line read off props the generator already curated
 *            (pendle, spectra, savings, lst, rwa, stablecoin). Generic by
 *            construction — "Pendle principal token on sUSDe · redeems for USDe
 *            on 22 Oct 2026" — and only ever a fallback.
 *
 * A group with neither gets no entry; "no description" is an answer.
 *
 *   npx tsx notes/notes.ts            # writes asset-notes.json
 *   npx tsx notes/notes.ts --check    # exit 1 if notes.json is invalid or the file is stale (CI)
 *
 * Runs after `generate` (it reads that script's output); a pure projection,
 * like `logos/groupLogos.ts`, so re-running it is always safe.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { OmniCurrency, OmniCurrencyList } from '../utils/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

const OMNI_PATH = path.join(repoRoot, 'omni-list.json')
const CURATED_PATH = path.join(__dirname, 'notes.json')
const OUT_PATH = path.join(repoRoot, 'asset-notes.json')

/** The one-liner budget — the same as the `what` lines in yieldcircle's `assets.ts`. */
const WHAT_MAX = 90

export interface CuratedNote {
  what: string
  body?: string
  backing?: string | null
  yieldSource?: string | null
  redemption?: string | null
  /** Whose credit, in words; `props.issuer` stays the machine-readable desk. */
  issuer?: string | null
  links?: string[]
  /** ISO date the facts were last checked against the issuer's docs. */
  updated?: string
  /** How well the facts are sourced: high = issuer docs + contract checked; low = could not identify. */
  confidence?: 'high' | 'medium' | 'low'
  /** Other groups that are the same asset and share this note. */
  alsoGroups?: string[]
  /** Something is off (price, contract, identity) — consumers may hide or caveat the note. */
  verify?: string
}

export interface AssetNote extends Omit<CuratedNote, 'alsoGroups'> {
  source: 'curated' | 'derived'
}

type Props = Record<string, any>

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (unix: number) => {
  const d = new Date(unix * 1000)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** First currency in the group carrying `key` — groups are curated as one, so the first answer is the group's. */
function prop(entry: OmniCurrency, key: string): Props | undefined {
  for (const c of entry.currencies ?? []) {
    const p = (c as any).props?.[key]
    if (p) return p
  }
  return undefined
}

const issuerName = (entry: OmniCurrency): string | undefined => prop(entry, 'issuer')?.name

/** Display names for `props.rwa.issuer` ids that title-casing gets wrong. */
const RWA_ISSUER_NAME: Record<string, string> = { bstocks: 'bStocks', st0x: 'st0x' }
const titleCase = (id: string) =>
  RWA_ISSUER_NAME[id] ?? id.replace(/(^|-)([a-z])/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase())

/** Keep a derived line inside the budget: cut the trailing clause, never mid-word. */
function fit(line: string): string {
  if (line.length <= WHAT_MAX) return line
  const head = line.split(' · ')[0]
  return head.length <= WHAT_MAX ? head : head.slice(0, WHAT_MAX - 1).replace(/\s+\S*$/, '') + '…'
}

const RWA_KIND: Record<string, string> = {
  'equity/stock': 'tokenized stock',
  'fund/etf': 'tokenized ETF',
  'fund/treasury': 'tokenized treasury fund',
  'credit/treasury': 'tokenized treasuries',
  'fund/money-market': 'tokenized money-market fund',
  'fund/private-credit': 'tokenized private-credit fund',
  'fund/closed-end': 'tokenized closed-end fund',
  'fund/basis-trade': 'tokenized basis-trade fund',
  'credit/reinsurance': 'tokenized reinsurance',
  'credit/corporate-debt': 'tokenized corporate debt',
  'commodity/gold': 'tokenized gold',
}

const LST_VERB: Record<string, string> = { staking: 'liquid-staked', restaking: 'liquid-restaked' }

/** The `what` line props alone can support, or undefined. Most specific overlay first. */
export function deriveWhat(group: string, entry: OmniCurrency): string | undefined {
  const name = entry.name ?? group

  const pendle = prop(entry, 'pendle')
  if (pendle) {
    // "PT sUSDe (USDe) Plasma" / "YT eUSDe Ethereum" / SY: "weETHs Ethereum"
    const m = name.match(/^(?:PT|YT) (\S+)(?: \((.+?)\))? (.+)$/)
    const inner = m?.[1]
    const asset = m?.[2]
    const when = pendle.expiry ? fmtDate(pendle.expiry) : undefined
    const matured = pendle.expired ? 'matured' : undefined
    if (pendle.tokenType === 'PT' && inner)
      return fit(
        `Pendle principal token on ${inner} · ` +
          (matured ? `${matured} ${when}` : `redeems for ${asset ?? inner} on ${when}`) +
          (pendle.expired ? '' : ' · fixed rate'),
      )
    if (pendle.tokenType === 'YT' && inner)
      return fit(`Pendle yield token on ${inner} · ${matured ? `${matured} ${when}` : `earns its yield until ${when}`}`)
    if (pendle.tokenType === 'SY') return fit(`Pendle standardized wrapper (SY) of ${name.replace(/ \S+$/, '')}`)
  }

  const spectra = prop(entry, 'spectra')
  if (spectra) {
    // "Principal Token: ESPN(USDS) 2026/12/08 Ethereum"
    const m = name.match(/^(?:Principal|Yield) Token: (.+?)\((.+?)\) (\d{4})\/(\d{2})\/(\d{2})/)
    if (m) {
      const [, inner, asset, y, mo, d] = m
      const when = `${+d} ${MONTHS[+mo - 1]} ${y}`
      if (spectra.tokenType === 'PT')
        return fit(`Spectra principal token on ${inner} · redeems for ${asset} on ${when} · fixed rate`)
      if (spectra.tokenType === 'YT') return fit(`Spectra yield token on ${inner} · earns its yield until ${when}`)
    }
    const w = name.match(/^Spectra ERC4626 Wrapper: (.+) \S+$/)
    if (spectra.tokenType === 'IBT' && w) return fit(`Spectra ERC-4626 wrapper of ${w[1]}`)
  }

  const savings = prop(entry, 'savings')
  if (savings?.underlying) {
    const who = issuerName(entry)
    return fit(`${who ? `${who} savings` : 'Savings'} wrapper of ${savings.underlying} · earns its savings rate`)
  }

  const lst = prop(entry, 'lst')
  if (lst?.asset) {
    const who = issuerName(entry) ?? (lst.provider ? titleCase(lst.provider) : undefined)
    return fit(
      `${who ? `${who} ` : ''}${LST_VERB[lst.type] ?? 'staked'} ${lst.asset}`.replace(/^./, (c) => c.toUpperCase()),
    )
  }

  const rwa = prop(entry, 'rwa')
  if (rwa) {
    const kind = RWA_KIND[`${rwa.type}/${rwa.subType}`]
    const who = issuerName(entry) ?? (rwa.issuer ? titleCase(rwa.issuer) : undefined)
    if (kind) {
      // "Costco (Ondo Tokenized Stock)", "Affirm xStock", "MongoDB" → tracks Costco / Affirm / MongoDB
      const tracks =
        rwa.type === 'equity' || rwa.subType === 'etf'
          ? name.replace(/\s*\(.*\)\s*$/, '').replace(/\s+xStock$/i, '')
          : undefined
      const head = `${who ? `${who} ` : ''}${kind}`.replace(/^./, (c) => c.toUpperCase())
      return fit(tracks && tracks !== entry.symbol ? `${head} · tracks ${tracks}` : head)
    }
  }

  const stable = prop(entry, 'stablecoin')
  if (stable?.base) {
    const who = issuerName(entry)
    // without a desk the label only says what money it counts in — vaults and wrappers carry it too
    return fit(who ? `${who} ${stable.base} stablecoin` : `Token denominated in ${stable.base}`)
  }

  return undefined
}

/** Problems with the curated file; empty when it is fit to ship. */
export function validate(curated: Record<string, CuratedNote>, omni: OmniCurrencyList): string[] {
  const errors: string[] = []
  const claimed = new Map<string, string>()
  for (const [group, n] of Object.entries(curated)) {
    const at = `notes.json["${group}"]`
    if (!(group in omni)) errors.push(`${at}: no such assetGroup in omni-list.json`)
    if (typeof n.what !== 'string' || !n.what.trim()) errors.push(`${at}: empty \`what\``)
    else if (n.what.length > WHAT_MAX) errors.push(`${at}: \`what\` is ${n.what.length} chars (max ${WHAT_MAX})`)
    if (n.confidence && !['high', 'medium', 'low'].includes(n.confidence)) errors.push(`${at}: bad \`confidence\``)
    if (n.updated && !/^\d{4}-\d{2}-\d{2}$/.test(n.updated)) errors.push(`${at}: \`updated\` must be YYYY-MM-DD`)
    for (const l of n.links ?? []) if (!/^https:\/\//.test(l)) errors.push(`${at}: link is not https: ${l}`)
    for (const g of [group, ...(n.alsoGroups ?? [])]) {
      if (g !== group && !(g in omni)) errors.push(`${at}: alsoGroups entry "${g}" is not an assetGroup`)
      if (g !== group && g in curated) errors.push(`${at}: alsoGroups entry "${g}" has a note of its own`)
      const prev = claimed.get(g)
      if (prev) errors.push(`${at}: "${g}" is already covered by notes.json["${prev}"]`)
      claimed.set(g, group)
    }
  }
  return errors
}

export function buildNotes(curated: Record<string, CuratedNote>, omni: OmniCurrencyList): Record<string, AssetNote> {
  const out: Record<string, AssetNote> = {}
  for (const [group, entry] of Object.entries(omni)) {
    const what = deriveWhat(group, entry)
    if (what) out[group] = { what, source: 'derived' }
  }
  for (const [group, { alsoGroups, ...note }] of Object.entries(curated)) {
    for (const g of [group, ...(alsoGroups ?? [])]) if (g in omni) out[g] = { ...note, source: 'curated' }
  }
  // stable key order so the file diffs cleanly
  return Object.fromEntries(
    Object.keys(out)
      .sort()
      .map((k) => [k, out[k]]),
  )
}

function main() {
  const check = process.argv.includes('--check')
  const omni: OmniCurrencyList = JSON.parse(fs.readFileSync(OMNI_PATH, 'utf-8'))
  const curated: Record<string, CuratedNote> = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf-8'))

  const errors = validate(curated, omni)
  for (const e of errors) console.error(`[notes] ${e}`)

  const notes = buildNotes(curated, omni)
  const text = JSON.stringify(notes, null, 2) + '\n'
  const all = Object.values(notes)
  const nCurated = all.filter((n) => n.source === 'curated').length
  console.log(
    `[notes] ${all.length} of ${Object.keys(omni).length} groups described: ` +
      `${nCurated} curated (${Object.keys(curated).length} notes), ${all.length - nCurated} derived.`,
  )

  if (check) {
    const current = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf-8') : ''
    // compare parsed, so a prettier pass over the file does not read as stale
    const stale = current === '' || JSON.stringify(JSON.parse(current)) !== JSON.stringify(notes)
    if (stale) console.error('[notes] asset-notes.json is stale — run `npm run notes`.')
    process.exit(errors.length || stale ? 1 : 0)
  }
  if (errors.length) process.exit(1)
  fs.writeFileSync(OUT_PATH, text)
  console.log(`[notes] wrote ${path.relative(repoRoot, OUT_PATH)}`)
}

main()
