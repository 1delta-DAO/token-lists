/**
 * Generates main-tokens.json — a single small aggregated file mapping
 * chainId → mainTokens[] extracted from every per-chain list file.
 *
 * Rationale: the full per-chain lists can hold tens of thousands of
 * tokens (multi-MB each). Multi-chain consumers (e.g. the worker-api
 * balance rpc-call endpoint) need only the curated main-token subset —
 * this file lets them fetch one ~100KB artifact instead of N full lists.
 *
 *   npx tsx scripts/generateMainTokens.script.ts
 *
 * Re-run whenever mainTokens change in any chain file (i.e. alongside
 * generateTokenMap.script.ts).
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

const result: { [chainId: string]: string[] } = {}

for (const file of readdirSync(ROOT).sort()) {
  if (!/^\d+\.json$/.test(file)) continue
  const chainId = file.replace('.json', '')
  try {
    const data = JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
    const mainTokens: string[] = Array.isArray(data.mainTokens)
      ? data.mainTokens.map((t: string) => t.toLowerCase())
      : []
    if (mainTokens.length > 0) result[chainId] = mainTokens
  } catch (e) {
    console.warn(`skipping ${file}:`, (e as Error).message)
  }
}

const outPath = join(ROOT, 'main-tokens.json')
writeFileSync(outPath, JSON.stringify(result, null, 1))

const chains = Object.keys(result).length
const tokens = Object.values(result).reduce((a, b) => a + b.length, 0)
console.log(`main-tokens.json written: ${chains} chains, ${tokens} tokens`)
