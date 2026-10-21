import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'
import { AutoGenHelpers } from './utils'
import { ALL_LISTS } from './externalLists'
// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * External-list fetch cache. Every fresh run writes each fetched list here; running with
 * `GEN_CACHE=1` reuses it (no network, no rate-limit waits) — for reprocessing minor generator
 * changes (asset-group aliases, symbol overrides, …) without re-fetching ~100 sources.
 * `npm run fetch:lists` fills it ahead of `generate` so the pipeline can overlap the slow,
 * rate-limited fetches with the other overlay steps.
 */
export const LIST_CACHE_DIR = path.resolve(__dirname, '.list-cache')
export const USE_LIST_CACHE = process.env.GEN_CACHE === '1'
export function listCacheFile(list: { url: string; method?: string; body?: string }): string {
  const h = crypto
    .createHash('sha1')
    .update(`${list.url}|${list.method ?? ''}|${list.body ?? ''}`)
    .digest('hex')
  return path.resolve(LIST_CACHE_DIR, `${h}.json`)
}

export function writeListCache(list: RemoteList, data: any) {
  try {
    fs.mkdirSync(LIST_CACHE_DIR, { recursive: true })
    fs.writeFileSync(listCacheFile(list), JSON.stringify(data))
  } catch {}
}

/**
 * Concurrent fetch of the remote lists. Requests are queued PER HOST: a host whose lists
 * carry a `wait` (OpenOcean, CoinGecko, deBridge — the rate-limited APIs) stays strictly
 * serial with that pause after every response, exactly as before; hosts without one
 * (raw.githubusercontent and the single-list APIs) run a few requests at a time. Only the
 * hosts run side by side, so no provider sees more traffic than it did when the whole
 * run was one serial loop — the run just stops waiting on CoinGecko to fetch GitHub.
 *
 * Every request has a timeout, and a 429 / 5xx is retried after `Retry-After` (or a
 * backoff) instead of being parsed as a list.
 */
const FETCH_TIMEOUT_MS = 60_000
const FETCH_RETRIES = 3
const UNTHROTTLED_HOST_CONCURRENCY = 8

export type RemoteList = (typeof ALL_LISTS)[number]

async function fetchListJson(list: RemoteList): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(list.url, {
      method: list.method ?? 'GET',
      headers: list.headers,
      body: list.body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (list.wait) await AutoGenHelpers.sleep(list.wait)
    if ((res.status === 429 || res.status >= 500) && attempt < FETCH_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'))
      const backoff = retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 2000 * 2 ** attempt
      console.log(`HTTP ${res.status} from ${list.url} — retrying in ${backoff}ms`)
      await res.body?.cancel()
      await AutoGenHelpers.sleep(backoff)
      continue
    }
    return res.json()
  }
}

export function prefetchLists(lists: RemoteList[]): Map<RemoteList, Promise<any>> {
  const byHost = new Map<string, RemoteList[]>()
  for (const list of lists) {
    const host = new URL(list.url).host
    if (!byHost.has(host)) byHost.set(host, [])
    byHost.get(host)!.push(list)
  }
  const out = new Map<RemoteList, Promise<any>>()
  for (const hostLists of byHost.values()) {
    const throttled = hostLists.some((l) => l.wait)
    const pending = hostLists.map((list) => {
      let resolve!: (v: any) => void, reject!: (e: any) => void
      out.set(list, new Promise((res, rej) => ((resolve = res), (reject = rej))))
      return { list, resolve, reject }
    })
    const worker = async () => {
      for (let job = pending.shift(); job; job = pending.shift()) {
        await fetchListJson(job.list).then(job.resolve, job.reject)
      }
    }
    for (let i = 0; i < (throttled ? 1 : UNTHROTTLED_HOST_CONCURRENCY); i++) worker()
  }
  // A list that fails is reported where it is awaited — not as an unhandled rejection.
  for (const p of out.values()) p.catch(() => {})
  return out
}
