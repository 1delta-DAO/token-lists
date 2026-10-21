/**
 * Fills `.list-cache` with every third-party list `generate` would fetch, so the pipeline
 * can run this (≈ the CoinGecko queue, the slowest one) alongside the overlay steps and
 * then `generate` with GEN_CACHE=1. Our own 1delta lists are skipped — `generate` never
 * serves them from cache.
 *
 * A list that fails here has its cache entry REMOVED, not left stale: `generate` then
 * fetches it live and fails (or succeeds) exactly as it would have without this step.
 *
 *   npx tsx fetchLists.script.ts
 */
import * as fs from 'fs'
import { ALL_LISTS } from './externalLists'
import { listCacheFile, prefetchLists, writeListCache } from './listFetch'

async function main() {
  const t0 = Date.now()
  const lists = ALL_LISTS.filter((l) => !l.url.startsWith('file://') && l.tag !== '1delta')
  const prefetched = prefetchLists(lists)
  let failed = 0
  await Promise.all(
    lists.map((list) =>
      prefetched.get(list)!.then(
        (data) => writeListCache(list, data),
        (e) => {
          failed++
          console.log(`fetch failed ${list.url}: ${e?.message ?? e}`)
          fs.rmSync(listCacheFile(list), { force: true })
        },
      ),
    ),
  )
  console.log(`Fetched ${lists.length - failed}/${lists.length} lists in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}

main()
