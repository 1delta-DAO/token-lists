// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { RiskProps, RiskRegistry } from '../utils/types'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Snapshots the asset-risk overlay from the risk-data repository, mirroring the way
 * `pendle/pendle.ts` snapshots the Pendle API.
 *
 * risk-data is computed DOWNSTREAM of token-lists (it fetches token-lists to score assets),
 * so this is a lagging annotation. Only stable fields are kept — `liquidityUsd` and other
 * volatile fields are dropped so the generated token lists don't churn on every run.
 *
 * Unlike RWA/LST, risk is NOT a source list: it's an address-keyed overlay merged onto
 * whatever props a token already has (see riskMap.ts / generateTokenMap.script.ts).
 *
 * risk-data is a PRIVATE repo, so the source is resolved in order:
 *   1. $RISK_DATA_JSON (explicit path to asset-risks.json)
 *   2. a sibling checkout at ../../risk-data/data/asset-risks.json (local dev)
 *   3. the authenticated GitHub contents API using $GH_PAT / $GITHUB_TOKEN (CI)
 */
const RISK_API_URL = 'https://api.github.com/repos/1delta-DAO/risk-data/contents/data/asset-risks.json?ref=main'
const RISK_REL = '../../../risk-data/data/asset-risks.json'

interface RawRisk {
  riskScore?: number
  category?: string | null
  source?: string | null
}

type RawRiskMap = { [chainId: string]: { [address: string]: RawRisk } }

async function loadRawRisks(): Promise<RawRiskMap> {
  const localCandidates = [process.env.RISK_DATA_JSON, path.resolve(__dirname, RISK_REL)].filter(Boolean) as string[]
  for (const p of localCandidates) {
    if (fs.existsSync(p)) {
      console.log(`Reading local asset-risks.json: ${p}`)
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  }

  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN
  console.log('Fetching asset-risks.json via GitHub API (private repo)...')
  const res = await fetch(RISK_API_URL, {
    headers: {
      Accept: 'application/vnd.github.raw',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error(
      `Failed to fetch asset-risks.json: ${res.status}. risk-data is private — ` +
        `set RISK_DATA_JSON to a local path or provide GH_PAT/GITHUB_TOKEN with repo access.`,
    )
  }
  return res.json()
}

function serializeRisk(reg: RiskRegistry): string {
  const chainIds = Object.keys(reg).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
  return JSON.stringify(
    chainIds.reduce((acc: RiskRegistry, chainId) => {
      const addrs = Object.keys(reg[chainId]).sort()
      acc[chainId] = addrs.reduce((m: { [a: string]: RiskProps }, a) => ((m[a] = reg[chainId][a]), m), {})
      return acc
    }, {}),
    null,
    2,
  )
}

async function generateRiskMap() {
  console.log('Generating asset risk overlay from risk-data...')
  try {
    const raw = await loadRawRisks()

    const out: RiskRegistry = {}
    let count = 0
    for (const [chainId, assets] of Object.entries(raw)) {
      for (const [address, r] of Object.entries(assets)) {
        if (r?.riskScore == null) continue
        const entry: RiskProps = { score: r.riskScore }
        if (r.category) entry.category = r.category
        if (r.source) entry.source = r.source
        ;(out[chainId] ??= {})[address.toLowerCase()] = entry
        count++
      }
    }

    fs.writeFileSync(path.resolve(__dirname, './risk.json'), serializeRisk(out))
    console.log(`Wrote risk.json with ${count} asset-risk entries across ${Object.keys(out).length} chains.`)
  } catch (error) {
    // Non-fatal: risk is an optional overlay. Keep the last committed risk.json snapshot
    // so the generate pipeline is never broken by a transient/private-repo access issue.
    console.warn('[risk] could not refresh risk.json, keeping the existing snapshot:', (error as Error).message)
    process.exit(0)
  }
}

generateRiskMap()
