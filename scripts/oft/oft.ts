// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { multicallRetryUniversal } from '@1delta/providers'
import { OftProps, OftRegistry, OftRoute } from '../utils/types'
import { readChainLists } from '../labels/labelUtils'
import { carryForwardFrozen, isFrozenChain } from '../utils/frozenChains'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Builds the LayerZero OFT overlay (`props.oft`) — which contract moves a listed
 * token over LayerZero V2, and to which of OUR chains it actually has a peer.
 *
 * Source of the roster: LayerZero's own registry
 * (`metadata.layerzero-api.com/v1/metadata`). Per chain it carries a `tokens`
 * map whose entries are typed `NativeOFT` (the token IS the OFT), `ProxyOFT`
 * (an adapter — lock-box or mint/burn — over `erc20TokenAddress`), `HydraOFT`
 * / `WABProxyOFT` (Stargate's own hydra deployments) or plain `ERC20` with
 * `proxyAddresses` pointing at its adapters, plus `addressToOApp` naming the
 * mesh each contract belongs to.
 *
 * What the registry CANNOT tell you, and what this script reads on-chain:
 *
 *  1. Which corridors exist. One token can carry SEVERAL adapters on one chain,
 *     each belonging to a different mesh — Ethereum USDT has the USDT0 adapter,
 *     a deprecated USDT0 adapter, and one-corridor bridges to Citrea and
 *     Harmony; cbBTC has four (Nibiru / 0G / TAC / Hemi). An adapter is only a
 *     route to the chains it has `peers(eid)` set for, and `quoteSend` reverts
 *     `NoPeer` everywhere else. So every route carries `peers`, read on-chain
 *     over every chain this repo lists — the same discipline as CCTP's
 *     `burnToken` table: pin by address, never by symbol.
 *  2. Whether the token really is the adapter's `token()` — a registry row is
 *     a claim; a mismatch drops the route.
 *  3. `approvalRequired()` — a lock-box adapter pulls the token (USDT0's
 *     Ethereum adapter), a mint/burn adapter does not (USDT0's spokes, USD.AI's
 *     OAdapters). The approval target of a route is a fact of the CONTRACT.
 *
 * Excluded on purpose: LayerZero V1 OFTs (`endpointVersion !== 2` — a
 * different `send` and no `peers`), `HydraOFT` rows and anything whose OApp is
 * `stargate` (Stargate pools and hydra tokens are served by the Stargate bridge
 * configs, with credit limits and pool fees an OFT quote does not model), and
 * rows the registry marks `DEPRECATED`.
 *
 * Output: `oft.json`, chainId -> token address -> {@link OftProps}. A route
 * without `peers` means the chain could not be read this run, not "no peers".
 */

const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata'

/**
 * Solana in the OFT overlay (2026-10-06). Two halves:
 *  - every EVM route reads `peers(30168)` like any other chain; a Solana peer
 *    is a 32-byte pubkey (the OFT STORE account), kept as base58 under
 *    `peers.solana` — never lower-cased.
 *  - `solana.json` mints get `props.oft` from the registry's Solana rows: the
 *    mint's `proxyAddresses` are its OFT stores, and an EVM peer naming one of
 *    them is the corridor. Solana-side `peers` are NOT read (a PeerConfig PDA
 *    per store per eid, no Multicall) — absent, i.e. "unread", which is all the
 *    INTO-Solana direction needs: the join runs off the EVM side's peers.
 */
const SOLANA_CHAIN_ID = 'solana'
const SOLANA_EID = 30168
const SOLANA_LIST = path.resolve(__dirname, '../../solana.json')
const OFT_TYPES = new Set(['NativeOFT', 'ProxyOFT', 'HydraOFT', 'WABProxyOFT'])
const EXCLUDED_OAPPS = new Set(['stargate'])
const CHAIN_CONCURRENCY = 6
/** calls per `multicallRetryUniversal` invocation — keeps one slow chain from eating the whole budget */
const CALLS_PER_SLICE = 4000

const OFT_ABI = [
  { type: 'function', name: 'token', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'approvalRequired', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'sharedDecimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  {
    type: 'function',
    name: 'peers',
    stateMutability: 'view',
    inputs: [{ type: 'uint32', name: 'eid' }],
    outputs: [{ type: 'bytes32' }],
  },
] as const

interface LzToken {
  type?: string
  symbol?: string
  erc20TokenAddress?: string
  proxyAddresses?: string[]
  sharedDecimals?: number
  oftVersion?: number
  endpointVersion?: number
  status?: string
}

interface LzChain {
  chainKey: string
  environment?: string
  chainDetails?: { chainType?: string; nativeChainId?: number | string }
  deployments?: { version: number; eid: string }[]
  rpcs?: { url: string }[]
  tokens?: { [address: string]: LzToken }
  addressToOApp?: { [address: string]: { id: string } }
}

type LzMetadata = { [chainKey: string]: LzChain }

interface Candidate {
  token: string
  route: OftRoute
}

async function loadMetadata(): Promise<LzMetadata> {
  // @ts-ignore
  const file = process.env.LZ_METADATA_FILE
  if (file) return JSON.parse(fs.readFileSync(file, 'utf-8'))
  const res = await fetch(LAYERZERO_METADATA_URL)
  if (!res.ok) throw new Error(`LayerZero metadata: HTTP ${res.status}`)
  return (await res.json()) as LzMetadata
}

/** LayerZero chain rows by EVM chain id, mainnet only, with their V2 endpoint id. */
function indexChains(lz: LzMetadata) {
  const byChainId: { [chainId: string]: { chain: LzChain; eid: number } } = {}
  for (const chain of Object.values(lz)) {
    const details = chain.chainDetails
    if (!details || details.chainType !== 'evm' || chain.environment !== 'mainnet') continue
    if (details.nativeChainId === undefined || details.nativeChainId === null) continue
    const v2 = (chain.deployments ?? []).find((d) => d.version === 2)
    if (!v2) continue
    byChainId[String(details.nativeChainId)] = { chain, eid: Number(v2.eid) }
  }
  return byChainId
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** A bytes32 peer as the Solana pubkey it is (base58, leading zero bytes as '1'). */
export function bytes32ToBase58(v: unknown): string | undefined {
  if (typeof v !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(v)) return undefined
  if (/^0x0{64}$/.test(v)) return undefined
  let n = BigInt(v)
  let out = ''
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out
    n /= 58n
  }
  const zeros = (v.slice(2).match(/^(00)*/)?.[0].length ?? 0) / 2
  return '1'.repeat(zeros) + out
}

function bytes32ToAddress(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.startsWith('0x') || v.length !== 66) return undefined
  if (/^0x0{64}$/.test(v)) return undefined
  // a non-EVM peer (Solana, Aptos, …) fills the high bytes — not an address we can name
  if (!/^0x0{24}[0-9a-fA-F]{40}$/.test(v)) return undefined
  return '0x' + v.slice(26).toLowerCase()
}

/** Candidate routes for the tokens this repo lists on one chain, from the registry alone. */
function candidatesFor(chain: LzChain, listed: Set<string>): Candidate[] {
  const tokens = chain.tokens ?? {}
  const oapps = chain.addressToOApp ?? {}
  const out: Candidate[] = []
  const seen = new Set<string>()

  const consider = (token: string, contract: string, meta: LzToken) => {
    const key = `${token}:${contract}`
    if (seen.has(key)) return
    seen.add(key)
    if (!OFT_TYPES.has(meta.type ?? '')) return
    if (meta.endpointVersion !== 2) return
    if (meta.type === 'HydraOFT' || meta.type === 'WABProxyOFT') return
    if (meta.status === 'DEPRECATED') return
    const oapp = oapps[contract]?.id
    if (oapp && EXCLUDED_OAPPS.has(oapp)) return
    const route: OftRoute = {
      contract,
      kind: meta.type === 'NativeOFT' ? 'native' : 'adapter',
      sharedDecimals: meta.sharedDecimals ?? 6,
    }
    if (oapp) route.oapp = oapp
    out.push({ token, route })
  }

  for (const token of listed) {
    const meta = tokens[token]
    if (!meta) continue
    if (OFT_TYPES.has(meta.type ?? '')) consider(token, token, meta)
    for (const proxy of meta.proxyAddresses ?? []) {
      const p = proxy.toLowerCase()
      const pm = tokens[p]
      if (pm) consider(token, p, pm)
    }
  }
  return out
}

/**
 * Solana rows: the mint's own entry when it IS an OFT, plus every
 * `proxyAddresses` store. Keys are base58 and compared verbatim. There are no
 * approvals on Solana, so `approvalRequired` is never set.
 */
function solanaCandidates(chain: LzChain, mints: string[]): Candidate[] {
  const tokens = chain.tokens ?? {}
  const oapps = chain.addressToOApp ?? {}
  const out: Candidate[] = []
  const consider = (mint: string, contract: string, meta: LzToken | undefined) => {
    if (!meta || !OFT_TYPES.has(meta.type ?? '')) return
    if (meta.type === 'HydraOFT' || meta.type === 'WABProxyOFT') return
    if (meta.status === 'DEPRECATED') return
    // Solana rows rarely carry `endpointVersion`; a V1 store is marked 1
    if (meta.endpointVersion !== undefined && meta.endpointVersion !== 2) return
    const oapp = oapps[contract]?.id
    if (oapp && EXCLUDED_OAPPS.has(oapp)) return
    const route: OftRoute = {
      contract,
      kind: meta.type === 'NativeOFT' ? 'native' : 'adapter',
      sharedDecimals: meta.sharedDecimals ?? 6,
    }
    if (oapp) route.oapp = oapp
    out.push({ token: mint, route })
  }
  for (const mint of mints) {
    const meta = tokens[mint]
    if (!meta) continue
    consider(mint, mint, meta)
    for (const store of meta.proxyAddresses ?? []) consider(mint, store, tokens[store])
  }
  return out
}

function readSolanaMints(): string[] {
  try {
    return Object.keys(JSON.parse(fs.readFileSync(SOLANA_LIST, 'utf-8'))?.list ?? {})
  } catch {
    return []
  }
}

async function readChain(
  chainId: string,
  candidates: Candidate[],
  peerChains: { chainId: string; eid: number }[],
  rpcs: string[],
): Promise<{ ok: boolean; results: any[] }> {
  const calls: any[] = []
  for (const c of candidates) {
    calls.push({ address: c.route.contract, name: 'token', args: [] })
    calls.push({ address: c.route.contract, name: 'approvalRequired', args: [] })
    calls.push({ address: c.route.contract, name: 'sharedDecimals', args: [] })
    for (const p of peerChains) calls.push({ address: c.route.contract, name: 'peers', args: [p.eid] })
  }
  const results: any[] = []
  const attempt = async (overrdies?: Record<string, string[]>) => {
    results.length = 0
    for (let i = 0; i < calls.length; i += CALLS_PER_SLICE) {
      const slice = calls.slice(i, i + CALLS_PER_SLICE)
      const r = (await multicallRetryUniversal({
        chain: chainId,
        calls: slice,
        abi: OFT_ABI,
        allowFailure: true,
        logErrors: false,
        maxTotalMs: 120_000,
        ...(overrdies && { overrdies }),
      })) as any[]
      results.push(...r)
    }
  }
  const usable = () => results.some((r) => r !== undefined && r !== '0x' && r !== null)
  try {
    await attempt()
    if (usable()) return { ok: true, results }
  } catch (e: any) {
    console.warn(`[oft] chain ${chainId}: ${e?.message ?? e} — retrying on LayerZero's rpc roster`)
  }
  if (rpcs.length > 0) {
    try {
      await attempt({ [chainId]: rpcs })
      if (usable()) return { ok: true, results }
    } catch (e: any) {
      console.warn(`[oft] chain ${chainId}: ${e?.message ?? e}`)
    }
  }
  return { ok: false, results }
}

function serialize(reg: OftRegistry): string {
  const chainIds = Object.keys(reg).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
  return JSON.stringify(
    chainIds.reduce((acc: OftRegistry, chainId) => {
      const addrs = Object.keys(reg[chainId]).sort()
      acc[chainId] = addrs.reduce((m: { [a: string]: OftProps }, a) => ((m[a] = reg[chainId][a]), m), {})
      return acc
    }, {}),
    null,
    2,
  )
}

async function generateOftMap() {
  console.log('Generating LayerZero OFT overlay...')
  const lz = await loadMetadata()
  const chains = indexChains(lz)
  const lists = readChainLists().filter(({ chainId }) => chains[chainId])
  const peerChains = lists.map(({ chainId }) => ({ chainId, eid: chains[chainId].eid }))
  // Solana is a peer of every EVM route (read on the EVM side) — see the header
  const solanaChain = lz[SOLANA_CHAIN_ID]
  if (solanaChain) peerChains.push({ chainId: SOLANA_CHAIN_ID, eid: SOLANA_EID })
  console.log(`  ${lists.length} listed chains have a LayerZero V2 endpoint`)

  const out: OftRegistry = {}
  const stats = { routes: 0, verified: 0, corridors: 0, dropped: 0, unreadChains: [] as string[] }

  const work = lists.map(({ chainId, tokens }) => async () => {
    // A frozen chain (Blast) is never read: its routes are carried forward
    // below. It stays in `peerChains`, so live chains still report their
    // corridors INTO it — that is a read on the live chain.
    if (isFrozenChain(chainId)) return
    const { chain, eid } = chains[chainId]
    const listed = new Set(tokens.map((t) => (t.address ?? '').toLowerCase()).filter(Boolean))
    const candidates = candidatesFor(chain, listed)
    if (candidates.length === 0) return
    const others = peerChains.filter((p) => p.chainId !== chainId)
    const rpcs = (chain.rpcs ?? []).map((r) => r.url).filter((u) => u.startsWith('https://'))
    const { ok, results } = await readChain(chainId, candidates, others, rpcs)
    if (!ok) stats.unreadChains.push(chainId)
    const stride = 3 + others.length

    const perToken: { [token: string]: OftRoute[] } = {}
    candidates.forEach((c, i) => {
      const route: OftRoute = { ...c.route }
      if (ok) {
        const token = results[i * stride]
        const approval = results[i * stride + 1]
        const shared = results[i * stride + 2]
        const tokenRead = typeof token === 'string' && token.startsWith('0x') && token.length === 42
        // an adapter that names another token is a registry error, not a route
        if (tokenRead && token.toLowerCase() !== c.token) {
          stats.dropped++
          console.warn(`[oft] ${chainId} ${c.token}: ${route.contract}.token() is ${token} — dropped`)
          return
        }
        if (tokenRead) {
          if (typeof approval === 'boolean') route.approvalRequired = approval
          if (typeof shared === 'number' || typeof shared === 'bigint') route.sharedDecimals = Number(shared)
          const peers: { [chainId: string]: string } = {}
          others.forEach((p, j) => {
            const raw = results[i * stride + 3 + j]
            const addr = p.chainId === SOLANA_CHAIN_ID ? bytes32ToBase58(raw) : bytes32ToAddress(raw)
            if (addr) peers[p.chainId] = addr
          })
          route.peers = peers
          stats.verified++
          stats.corridors += Object.keys(peers).length
        }
      }
      stats.routes++
      ;(perToken[c.token] ??= []).push(route)
    })

    for (const [token, routes] of Object.entries(perToken)) {
      routes.sort((a, b) => a.contract.localeCompare(b.contract))
      ;(out[chainId] ??= {})[token] = { eid, routes }
    }
    console.log(
      `  ${chainId}: ${Object.keys(perToken).length} tokens, ${candidates.length} routes${ok ? '' : ' (UNREAD)'}`,
    )
  })

  let next = 0
  const runners = Array.from({ length: CHAIN_CONCURRENCY }, async () => {
    while (next < work.length) {
      const job = work[next++]
      await job()
    }
  })
  await Promise.all(runners)

  // Solana rows, from the registry alone (no on-chain read — see the header)
  if (solanaChain) {
    const perMint: { [mint: string]: OftRoute[] } = {}
    for (const c of solanaCandidates(solanaChain, readSolanaMints())) (perMint[c.token] ??= []).push(c.route)
    for (const [mint, routes] of Object.entries(perMint)) {
      routes.sort((a, b) => a.contract.localeCompare(b.contract))
      ;(out[SOLANA_CHAIN_ID] ??= {})[mint] = { eid: SOLANA_EID, routes }
    }
    console.log(`  solana: ${Object.keys(perMint).length} mints with an OFT store (registry only)`)
  }

  const file = path.resolve(__dirname, './oft.json')
  carryForwardFrozen(file, out)
  fs.writeFileSync(file, serialize(out) + '\n')
  console.log(
    `Wrote ${file}: ${Object.keys(out).length} chains, ${stats.routes} routes (${stats.verified} verified on-chain, ` +
      `${stats.corridors} peer corridors, ${stats.dropped} dropped on token() mismatch)` +
      (stats.unreadChains.length ? `; unread chains: ${stats.unreadChains.join(', ')}` : ''),
  )
}

generateOftMap().catch((e) => {
  console.error(e)
  // @ts-ignore
  process.exit(1)
})
