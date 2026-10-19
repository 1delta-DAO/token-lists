/**
 * The pure half of the PT/YT leg recovery in `pendleAssetsFromApi.ts`: decoding
 * the on-chain reads, reading the previous list, and merging both into a token's
 * `props.pendle`. Kept apart from the reader so it can be tested without an RPC
 * (`legs.test.ts`).
 */

/** The market-derived fields of a PT/YT entry, minus the market itself where unknown. */
export interface PendleLegs {
  marketAddress?: string
  syAddress?: string
  ytAddress?: string
  ptAddress?: string
  underlyingAsset?: string
  expiry?: number
}

export type LegTokenType = 'PT' | 'YT'

export function isAddressString(v: unknown): v is string {
  return typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v) && !/^0x0{40}$/.test(v)
}

export const resultOf = (r: unknown) => (r && typeof r === 'object' && 'result' in (r as any) ? (r as any).result : r)

/**
 * The calls `decodeLegReads` expects, three per token in this order:
 * PT → [SY, YT, expiry], YT → [SY, PT, expiry].
 */
export const legReadCalls = (tokens: { address: string; type: LegTokenType }[]) =>
  tokens.flatMap((t) => [
    { address: t.address, name: 'SY', args: [] as [] },
    { address: t.address, name: t.type === 'PT' ? 'YT' : 'PT', args: [] as [] },
    { address: t.address, name: 'expiry', args: [] as [] },
  ])

/**
 * Decode the `legReadCalls` results. A token is recorded only when BOTH
 * addresses decoded — the raw `'0x'` a failed call comes back as, a revert
 * object or the zero address leave it out — and `expiry` only when positive.
 */
export function decodeLegReads(
  tokens: { address: string; type: LegTokenType }[],
  results: unknown[],
): Record<string, PendleLegs> {
  const out: Record<string, PendleLegs> = {}
  tokens.forEach((t, i) => {
    const sy = resultOf(results[3 * i])
    const other = resultOf(results[3 * i + 1])
    const expiry = resultOf(results[3 * i + 2])
    if (!isAddressString(sy) || !isAddressString(other)) return
    const legs: PendleLegs = { syAddress: sy.toLowerCase() }
    if (t.type === 'PT') legs.ytAddress = other.toLowerCase()
    else legs.ptAddress = other.toLowerCase()
    if (typeof expiry === 'bigint' && expiry > 0n) legs.expiry = Number(expiry)
    out[t.address.toLowerCase()] = legs
  })
  return out
}

/** Legs recorded in a previously generated `pendle.json`, keyed `chainId:address`. */
export function previousLegsFromList(prev: any[]): Record<string, PendleLegs> {
  const out: Record<string, PendleLegs> = {}
  for (const t of prev) {
    const p = t?.props?.pendle
    if (!p?.syAddress) continue
    const legs: PendleLegs = {}
    for (const k of ['marketAddress', 'syAddress', 'ytAddress', 'ptAddress', 'underlyingAsset'] as const) {
      if (isAddressString(p[k])) legs[k] = p[k].toLowerCase()
    }
    if (typeof p.expiry === 'number') legs.expiry = p.expiry
    out[`${t.chainId}:${String(t.address).toLowerCase()}`] = legs
  }
  return out
}

/**
 * Write the legs of a PT/YT the API maps to no market into `pendleProps`. The
 * previous list wins over the chain (it is the only source of `marketAddress`;
 * legs are immutable, so the two can only differ by one being absent), and the
 * pair a redeem needs is written together or not at all.
 */
export function applyUnmappedLegs(
  pendleProps: Record<string, unknown>,
  type: LegTokenType,
  onChain: PendleLegs | undefined,
  previous: PendleLegs | undefined,
): void {
  const legs: PendleLegs = { ...onChain, ...previous }
  if (legs.marketAddress) pendleProps.marketAddress = legs.marketAddress
  if (legs.expiry !== undefined) pendleProps.expiry = legs.expiry
  if (legs.underlyingAsset) pendleProps.underlyingAsset = legs.underlyingAsset
  if (type === 'PT' && legs.ytAddress && legs.syAddress) {
    pendleProps.ytAddress = legs.ytAddress
    pendleProps.syAddress = legs.syAddress
  } else if (type === 'YT' && legs.ptAddress && legs.syAddress) {
    pendleProps.ptAddress = legs.ptAddress
    pendleProps.syAddress = legs.syAddress
  }
}
