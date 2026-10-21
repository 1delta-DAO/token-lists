/**
 * `npm run generate:formatted` — the nightly pipeline, run in dependency phases. Steps
 * inside a phase are independent and run side by side; a phase starts only once the
 * previous one fully succeeded, and the first failing phase stops the run (what the old
 * `a && b && …` chain did, just not one step at a time).
 *
 *  1. overlays + list fetch. Each overlay reads only the committed root lists and its own
 *     files; `fetch:lists` fills `.list-cache` with the third-party lists. The overlays'
 *     RPC reads go through multicallRetryUniversal's endpoint failover.
 *  2. issuer — reads rwa (rwa.json, rwaAssets.generated.ts) and stablecoin.json.
 *  3. generate — reads every overlay; GEN_CACHE=1 serves the lists phase 1 fetched.
 *  4. checks / derived files — read the generated lists, write disjoint files.
 *  5. format.
 *
 * Each step's output is buffered and printed as one block when it ends, so parallel
 * logs never interleave.
 */
import { spawn } from 'child_process'

type Step = { script: string; env?: Record<string, string> }

const PHASES: Step[][] = [
  ['fetch:lists', 'pendle', 'spectra', 'rwa', 'lst', 'risk', 'stablecoin', 'savings', 'oft'].map((script) => ({
    script,
  })),
  [{ script: 'issuer' }],
  [{ script: 'generate', env: { GEN_CACHE: '1' } }],
  ['oft:mesh:check', 'onchain:decimals', 'logos:groups', 'notes'].map((script) => ({ script })),
  [{ script: 'format' }],
]

function run({ script, env }: Step): Promise<boolean> {
  const t0 = Date.now()
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', '-s', script], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const out: Buffer[] = []
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => out.push(d))
    child.on('close', (code) => {
      const secs = ((Date.now() - t0) / 1000).toFixed(0)
      console.log(`\n── ${script} ${code === 0 ? 'ok' : `FAILED (exit ${code})`} in ${secs}s ──`)
      process.stdout.write(Buffer.concat(out))
      resolve(code === 0)
    })
  })
}

async function main() {
  const t0 = Date.now()
  for (const phase of PHASES) {
    const results = await Promise.all(phase.map(run))
    const failed = phase.filter((_, i) => !results[i]).map((s) => s.script)
    if (failed.length) {
      console.error(`\npipeline stopped: ${failed.join(', ')} failed`)
      process.exit(1)
    }
  }
  console.log(`\npipeline done in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}

main()
