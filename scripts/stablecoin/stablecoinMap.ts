// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { StablecoinGroupMap, StablecoinProps } from '../utils/types'
import { normGroup, normName, StablecoinSymbolMap } from './identity'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Loads the stablecoin snapshot (stablecoin.json, produced by `npm run stablecoin`) and exposes
 * an assetGroup-keyed lookup used by the generator to overlay `props.stablecoin` onto tokens.
 * Tolerates a missing snapshot so `generate` never hard-fails if the step hasn't run.
 */
function loadSnapshot(): StablecoinGroupMap {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './stablecoin.json'), 'utf-8'))
  } catch {
    console.warn('[stablecoin] stablecoin.json not found — run `npm run stablecoin`. Proceeding without overlay.')
    return {}
  }
}

/** Symbol-keyed evidence snapshot (stablecoin-symbols.json) — the fallback for fragmented groups. */
function loadSymbolSnapshot(): StablecoinSymbolMap {
  try {
    const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, './stablecoin-symbols.json'), 'utf-8'))
    // A pre-evidence snapshot (`{ SYMBOL: { base } }`) is exactly the bare-ticker map
    // this format replaced: refuse it rather than tag by ticker.
    for (const v of Object.values<any>(raw)) if (!v || typeof v.names !== 'object') return {}
    return raw
  } catch {
    console.warn(
      '[stablecoin] stablecoin-symbols.json not found — run `npm run stablecoin`. Proceeding without symbol fallback.',
    )
    return {}
  }
}

/** Curated overrides keyed by assetGroup. These WIN over the snapshot. */
export const STABLECOIN_MANUAL: StablecoinGroupMap = {
  // 'USDC': { base: 'USD' },
}

export const STABLECOIN_MAP: StablecoinGroupMap = { ...loadSnapshot(), ...STABLECOIN_MANUAL }
export const STABLECOIN_SYMBOL_MAP: StablecoinSymbolMap = loadSymbolSnapshot()

/**
 * normGroup() of every flagged group -> its props: a collision-suffixed / re-cased / PoS
 * variant of a flagged group (`Liquity BOLD::BOLD::8453::0`) IS that group. Variants whose
 * flagged groups disagree on the money are dropped.
 */
const VARIANT_MAP: StablecoinGroupMap = (() => {
  const out: StablecoinGroupMap = {}
  const bad = new Set<string>()
  for (const [group, props] of Object.entries(STABLECOIN_MAP)) {
    if (!group.includes('::')) continue // a bare group (`USDC`) has no name to vouch for a variant
    const k = normGroup(group)
    if (bad.has(k)) continue
    if (out[k] && out[k].base !== props.base) {
      delete out[k]
      bad.add(k)
      continue
    }
    out[k] = props
  }
  return out
})()

/**
 * normName() of every flagged BARE group (`GHO`, `CRVUSD`, `EURA`) -> its props. A bare group
 * is the lists' curated "this ticker IS the known asset", so a `X::X` group whose name is just
 * that ticker (`GHO::GHO`, `crvUSD::CRVUSD`, `EURA (previously agEUR)::EURA`) is a variant of
 * it — exactly as a deployment folded into the bare group would be. Lazy ticker-copies are
 * still caught upstream by the CoinGecko impostor guard.
 */
const BARE_MAP: StablecoinGroupMap = Object.fromEntries(
  Object.entries(STABLECOIN_MAP)
    .filter(([g]) => !g.includes('::'))
    .map(([g, p]) => [normName(g), p]),
)

/** `::suspicious::<hash>` groups are the unifier's quarantine for address-conflicting copies. */
const isQuarantined = (group: string) => /::suspicious::/i.test(group)

const toProps = (base: string): StablecoinProps => (base ? { base } : {})

/** Which path tagged each deployment, for `STABLECOIN_TRACE=<file>` (one TSV row per lookup hit). */
const TRACE: string[] = []
if (process.env.STABLECOIN_TRACE)
  process.on('exit', () => fs.writeFileSync(process.env.STABLECOIN_TRACE!, TRACE.join('\n')))
const trace = (...cols: (string | undefined)[]) => {
  if (process.env.STABLECOIN_TRACE) TRACE.push(cols.map((c) => c ?? '').join('\t'))
}

/**
 * Lookup a token's stablecoin overlay.
 *
 *  1. exact `assetGroup` — the precise, chain-independent identity;
 *  2. a VARIANT of a flagged group — same name part and symbol modulo the
 *     `::<chain>::<n>` collision suffix, bracketed bridge/rename notes, vintage and casing;
 *  3. the ticker, but ONLY with identity evidence: the deployment's own address is one the
 *     feed lists for that ticker, or its NAME is one the real asset is known under.
 *
 * A bare ticker is never enough: `Ethernity Chain::ERN`, `Hacken::HAI`, `Modefi::MOD`
 * share a DefiLlama stablecoin's ticker and are not dollars.
 */
export function lookupStablecoin(
  assetGroup: string,
  symbol?: string,
  name?: string,
  chainId?: string,
  address?: string,
): StablecoinProps | undefined {
  if (assetGroup && STABLECOIN_MAP[assetGroup]) {
    trace('group', assetGroup, name, symbol, STABLECOIN_MAP[assetGroup].base)
    return STABLECOIN_MAP[assetGroup]
  }
  // Below here is fallback; a quarantined group never gets one.
  if (!assetGroup || isQuarantined(assetGroup)) return undefined
  if (assetGroup.includes('::')) {
    const v = VARIANT_MAP[normGroup(assetGroup)]
    if (v) {
      trace('variant', assetGroup, name, symbol, v.base)
      return v
    }
    const stripped = assetGroup.replace(/(::[^:]+::\d+)+$/, '')
    const [namePart, symPart] = [
      stripped.slice(0, stripped.lastIndexOf('::')),
      stripped.slice(stripped.lastIndexOf('::') + 2),
    ]
    const bare = normName(namePart) === normName(symPart) ? BARE_MAP[normName(symPart)] : undefined
    if (bare) {
      trace('bare-variant', assetGroup, name, symbol, bare.base)
      return bare
    }
  }
  const entry = symbol ? STABLECOIN_SYMBOL_MAP[symbol.toUpperCase()] : undefined
  if (!entry) return undefined
  // Address evidence: this exact deployment, or the same 20-byte address on another chain
  // (deterministic / vanity deployments: AUSD `0x00000000efe3…`, zkBob `0xb0b1…`).
  const lc = address?.toLowerCase()
  const byAddr =
    chainId && lc
      ? (entry.addresses?.[`${chainId}:${lc}`] ??
        (lc.startsWith('0x') && lc.length === 42
          ? Object.entries(entry.addresses ?? {}).find(([k]) => k.endsWith(`:${lc}`))?.[1]
          : undefined))
      : undefined
  if (byAddr !== undefined) {
    trace('address', assetGroup, name, symbol, byAddr)
    return toProps(byAddr)
  }
  // Name evidence. A name that is just the ticker (`Xai`, `BOB (Build on Bitcoin)`, `Uno`)
  // carries no identity — it is the ticker again — so it needs the address evidence above.
  const n = normName(name)
  const byName = n && n !== normName(symbol) ? entry.names[n] : undefined
  if (byName !== undefined) {
    trace('name', assetGroup, name, symbol, byName)
    return toProps(byName)
  }
  trace('rejected', assetGroup, name, symbol)
  return undefined
}
