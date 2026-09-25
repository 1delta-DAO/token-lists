/**
 * LayerZero OFT meshes as an asset-identity key.
 *
 * Every OFT deployment names, per remote chain, the peer contract it sends to
 * (`props.oft.routes[].peers`, read on-chain by `oft.ts`). Those links join the
 * deployments of ONE asset into a connected component regardless of what the
 * external lists call the token on each chain. A component that spans more than
 * one asset group is an asset the generator split — Stable's USDT0 as
 * `USDT0::USDT0` beside every other chain's `USDT`, Tether Gold under five keys.
 *
 * `oapp` alone is NOT an identity (`frax-finance` covers ten assets); the peer
 * contracts are.
 */

export interface MeshCurrency {
  chainId: string
  address: string
  symbol: string
  name?: string
  props?: { oft?: { routes?: { contract: string; peers?: Record<string, string> }[] } }
}

export interface MeshMove {
  chainId: string
  address: string
  symbol: string
  from: string
  to: string
}

export interface MeshSplit {
  canonical: string
  /** group -> the chains its members sit on */
  groups: Record<string, string[]>
  moves: MeshMove[]
  excluded?: string
}

/** `Name::SYM::<chain>::<n>` — a same-chain dedup suffix, never a canonical name */
const DEDUP_SUFFIX = /::\d+::\d+$/

/**
 * The group a split mesh is unified under: a group that is not a dedup suffix,
 * then one holding the Ethereum deployment (the convention `GROUP_ALIAS`
 * already follows — chain 1 is where the vault or lock-box lives), then the
 * one on the most chains, then the shortest name.
 */
export function canonicalGroup(groups: Record<string, string[]>): string {
  return Object.keys(groups).sort(
    (a, b) =>
      Number(DEDUP_SUFFIX.test(a)) - Number(DEDUP_SUFFIX.test(b)) ||
      Number(!groups[a].includes('1')) - Number(!groups[b].includes('1')) ||
      groups[b].length - groups[a].length ||
      a.length - b.length ||
      a.localeCompare(b),
  )[0]
}

/** components over (chain, OFT contract) peer links; one entry per token */
export function meshComponents(currencies: { group: string; c: MeshCurrency }[]) {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x)
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    let y = x
    while (parent.get(y) !== r) {
      const n = parent.get(y)!
      parent.set(y, r)
      y = n
    }
    return r
  }
  const union = (a: string, b: string) => parent.set(find(a), find(b))

  const tokens: { key: string; group: string; c: MeshCurrency }[] = []
  for (const { group, c } of currencies) {
    const routes = c.props?.oft?.routes ?? []
    if (!routes.length) continue
    const key = `t:${c.chainId}:${c.address.toLowerCase()}`
    for (const r of routes) {
      const me = `c:${c.chainId}:${r.contract.toLowerCase()}`
      union(key, me)
      for (const [chain, peer] of Object.entries(r.peers ?? {})) union(me, `c:${chain}:${peer.toLowerCase()}`)
    }
    tokens.push({ key, group, c })
  }
  const comps = new Map<string, typeof tokens>()
  for (const t of tokens) {
    const root = find(t.key)
    comps.set(root, [...(comps.get(root) ?? []), t])
  }
  return [...comps.values()]
}

/**
 * The split meshes and the moves that unify them. `exclude` names a group
 * whose mesh must NOT be merged (a peer link that joins two assets —
 * a misconfigured adapter — or a canonical that is itself a ticker collision),
 * with the reason; such a mesh is reported, not moved.
 */
export function meshSplits(
  omni: Record<string, { currencies: MeshCurrency[] }>,
  exclude: Record<string, string> = {},
): MeshSplit[] {
  const currencies = Object.entries(omni).flatMap(([group, v]) => v.currencies.map((c) => ({ group, c })))
  const out: MeshSplit[] = []
  for (const comp of meshComponents(currencies)) {
    const groups: Record<string, string[]> = {}
    for (const t of comp) {
      const chains = (groups[t.group] ??= [])
      if (!chains.includes(t.c.chainId)) chains.push(t.c.chainId)
    }
    if (Object.keys(groups).length < 2) continue
    for (const g of Object.keys(groups)) groups[g].sort((a, b) => Number(a) - Number(b))
    const canonical = canonicalGroup(groups)
    const excluded = Object.keys(groups)
      .map((g) => exclude[g])
      .find((x) => !!x)
    const seen = new Set<string>()
    const moves: MeshMove[] = []
    for (const t of comp) {
      if (t.group === canonical || seen.has(t.key)) continue
      seen.add(t.key)
      moves.push({
        chainId: t.c.chainId,
        address: t.c.address.toLowerCase(),
        symbol: t.c.symbol,
        from: t.group,
        to: canonical,
      })
    }
    moves.sort((a, b) => a.from.localeCompare(b.from) || Number(a.chainId) - Number(b.chainId))
    out.push({ canonical, groups, moves, ...(excluded ? { excluded } : {}) })
  }
  return out.sort((a, b) => a.canonical.localeCompare(b.canonical))
}

/** chainId -> address -> group, for the splits that are not excluded */
export function meshGroupMap(splits: MeshSplit[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {}
  for (const s of splits) {
    if (s.excluded) continue
    for (const m of s.moves) (out[m.chainId] ??= {})[m.address] = m.to
  }
  for (const chain of Object.keys(out))
    out[chain] = Object.fromEntries(Object.entries(out[chain]).sort(([a], [b]) => a.localeCompare(b)))
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => Number(a) - Number(b)))
}
