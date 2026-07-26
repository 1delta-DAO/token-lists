// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads a file from the (private) risk-data repository. Resolution order:
 *   1. $RISK_DATA_DIR/<relPath>            (explicit checkout, used by CI)
 *   2. ../../risk-data/<relPath>           (sibling checkout, local dev)
 *   3. GitHub contents API with $GH_PAT / $GITHUB_TOKEN (private-repo fetch)
 *
 * `relPath` is repo-relative, e.g. 'data/asset-risks.json'.
 */
export async function loadRiskDataFile<T = any>(relPath: string): Promise<T> {
  const dirs = [process.env.RISK_DATA_DIR, path.resolve(__dirname, '../../../risk-data')].filter(Boolean) as string[]
  for (const dir of dirs) {
    const p = path.join(dir, relPath)
    if (fs.existsSync(p)) {
      console.log(`Reading local risk-data: ${p}`)
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  }

  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN
  const url = `https://api.github.com/repos/1delta-DAO/risk-data/contents/${relPath}?ref=main`
  console.log(`Fetching risk-data via GitHub API (private repo): ${relPath}`)
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.raw',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${relPath}: ${res.status}. risk-data is private — ` +
        `set RISK_DATA_DIR to a local checkout or provide GH_PAT/GITHUB_TOKEN with repo access.`,
    )
  }
  return res.json()
}
