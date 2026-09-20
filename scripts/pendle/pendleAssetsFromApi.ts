import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Chain } from '@1delta/chain-registry'
import { multicallRetryUniversal } from '@1delta/providers'
import { fetchAllAssetsData, fetchAllMarketsData, PendleMarketMapping } from './pendleUtils'

const SYMBOL_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * LayerZero V2 OFT surface — what a BRIDGED Pendle PT actually is.
 *
 * Every PT bridged off its issuing chain is a LayerZero OFT (verified on all 31
 * tokens across 10 chains, 2026-09-20): the token on the destination chain
 * answers `endpoint()` / `peers(eid)` / `oftVersion()`, and its peer on the
 * origin chain is an OFT ADAPTER whose `token()` is the origin PT — the one
 * with the SY, the YT and the Pendle market. So the identity of a bridged PT
 * is fully derivable on-chain: `peers(originEid)` → adapter → `token()`.
 */
const OFT_ABI = [
  {
    inputs: [{ internalType: 'uint32', name: 'eid', type: 'uint32' }],
    name: 'peers',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Pendle's origin code (the `-(…)` suffix) → the chain that issued the PT.
 * Only the codes observed on live tokens; an unknown code is logged and the
 * token keeps `bridgedFrom` with no `origin` pointer.
 */
const ORIGIN_CHAIN_BY_CODE: Record<string, string> = {
  ETH: Chain.ETHEREUM_MAINNET,
  ARB: Chain.ARBITRUM_ONE,
  PLASMA: Chain.PLASMA_MAINNET,
}

/** LayerZero V2 endpoint ids for the origin chains above. */
const LZ_EID_BY_CHAIN: Record<string, number> = {
  [Chain.ETHEREUM_MAINNET]: 30101,
  [Chain.ARBITRUM_ONE]: 30110,
  [Chain.PLASMA_MAINNET]: 30383,
}

interface PendleOrigin {
  chainId: string
  address: string
}

function bytes32ToAddress(v: unknown): string | undefined {
  if (typeof v !== 'string' || !/^0x0{24}[0-9a-fA-F]{40}$/.test(v)) return undefined
  const a = '0x' + v.slice(26).toLowerCase()
  return /^0x0{40}$/.test(a) ? undefined : a
}

function isAddressString(v: unknown): v is string {
  return typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v) && !/^0x0{40}$/.test(v)
}

/**
 * Resolve the ORIGIN PT of every bridged token on `chainId`, keyed by the
 * bridged token's lower-cased address.
 *
 * Two reads: `peers(originEid)` on the bridged OFT (this chain), then `token()`
 * on that peer — the OFT adapter — on the origin chain. Both are best-effort and
 * fail per token, never per chain; the caller applies the same FLOOR rule as
 * the symbol read, so a pointer already recorded survives an unreachable RPC.
 *
 * Why this exists: the Pendle API serves a bridged PT with no link to its
 * origin — same name, same symbol (stripped), same expiry, same icon, and
 * nothing else — so a consumer wanting the origin market's yield, maturity
 * mechanics or mint/redeem surface has nothing to key on but a symbol match,
 * which the API's own Ink collision (USDat vs sUSDat, one symbol) shows is not
 * safe. The peer link is the contract's own statement of what it wraps.
 */
async function fetchBridgedOrigins(
  chainId: string,
  bridged: { address: string; originCode: string }[],
): Promise<Record<string, PendleOrigin>> {
  const out: Record<string, PendleOrigin> = {}
  const resolvable = bridged.filter((b) => {
    const originChain = ORIGIN_CHAIN_BY_CODE[b.originCode]
    if (!originChain || LZ_EID_BY_CHAIN[originChain] === undefined) {
      console.warn(`  pendle: unknown origin code ${b.originCode} on ${chainId}:${b.address} — no origin pointer`)
      return false
    }
    return true
  })
  if (resolvable.length === 0) return out

  // 1. peers(originEid) on the bridged token, on THIS chain
  let peers: unknown[]
  try {
    peers = (await multicallRetryUniversal({
      chain: chainId,
      calls: resolvable.map((b) => ({
        address: b.address,
        name: 'peers',
        args: [LZ_EID_BY_CHAIN[ORIGIN_CHAIN_BY_CODE[b.originCode]]],
      })),
      abi: OFT_ABI,
      allowFailure: true,
    })) as unknown[]
  } catch (e) {
    console.warn(`  pendle: peers() read failed on chain ${chainId} — keeping previous origin pointers`, e)
    return out
  }

  // 2. token() on the adapter, on the ORIGIN chain — grouped per origin chain
  const byOrigin: Record<string, { bridged: string; adapter: string }[]> = {}
  peers.forEach((r, i) => {
    const v = r && typeof r === 'object' && 'result' in (r as any) ? (r as any).result : r
    const adapter = bytes32ToAddress(v)
    if (!adapter) return
    const originChain = ORIGIN_CHAIN_BY_CODE[resolvable[i].originCode]
    ;(byOrigin[originChain] ??= []).push({ bridged: resolvable[i].address.toLowerCase(), adapter })
  })

  for (const [originChain, rows] of Object.entries(byOrigin)) {
    try {
      const res = (await multicallRetryUniversal({
        chain: originChain,
        calls: rows.map((r) => ({ address: r.adapter, name: 'token', args: [] })),
        abi: OFT_ABI,
        allowFailure: true,
      })) as unknown[]
      res.forEach((r, i) => {
        const v = r && typeof r === 'object' && 'result' in (r as any) ? (r as any).result : r
        if (isAddressString(v)) out[rows[i].bridged] = { chainId: originChain, address: v.toLowerCase() }
      })
    } catch (e) {
      console.warn(`  pendle: token() read failed on origin chain ${originChain} — keeping previous origin pointers`, e)
    }
  }
  return out
}

/**
 * A failed read must never be mistaken for an answer.
 *
 * `multicallRetryUniversal` hands back the RAW return data when it cannot decode
 * a call, so a transport failure arrives as the string `'0x'` — which is a
 * non-empty string and sails through a naive truthiness check. It did: a first
 * pass overwrote all five Robinhood (4663) Pendle symbols with the literal
 * `"0x"`, on a chain whose contracts answer `SY-sNET` perfectly well when read
 * directly. Nothing about that output looked like an error.
 *
 * A token symbol is never `0x`-prefixed hex and never blank, so reject both and
 * let the caller keep the API value.
 */
/**
 * Origin-suffixed symbols from the LAST generated list, keyed `chainId:address`.
 *
 * The on-chain read is best-effort by design — a chain we cannot reach keeps the
 * API's symbol rather than losing the token. But that makes the output depend on
 * RPC luck: Ethereum answered on one run and not the next, so the two thBILL PTs
 * gained `-(ARB)` and then silently lost it again. A marker that comes and goes
 * with the weather is worse than one that is merely late, because every regen
 * churns the diff and any run can quietly undo the fix.
 *
 * So the previous list acts as a FLOOR for exactly this fact: an origin suffix
 * already recorded is never dropped by a run that could not read the chain. Only
 * a successful read may change a symbol. (Same rule as the oracle-roster merge
 * in lender-metadata: a refresh may add or change information, never delete it.)
 */
function loadPreviousOriginSymbols(): { symbols: Record<string, string>; origins: Record<string, PendleOrigin> } {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url))
    const prev = JSON.parse(fs.readFileSync(path.resolve(dir, './pendle.json'), 'utf8'))
    const symbols: Record<string, string> = {}
    const origins: Record<string, PendleOrigin> = {}
    for (const t of prev) {
      const key = `${t.chainId}:${String(t.address).toLowerCase()}`
      if (typeof t?.symbol === 'string' && ORIGIN_SUFFIX.test(t.symbol)) {
        symbols[key] = t.symbol
      }
      const o = t?.props?.pendle?.origin
      if (o && typeof o.chainId === 'string' && isAddressString(o.address)) {
        origins[key] = { chainId: o.chainId, address: o.address.toLowerCase() }
      }
    }
    return { symbols, origins }
  } catch {
    // No previous list (first run) — nothing to protect.
    return { symbols: {}, origins: {} }
  }
}

/**
 * Trailing `-(ORIGIN)` on a Pendle token symbol, e.g. `PT-USDe-7MAY2026-(ETH)`.
 * Pendle uses it for a token bridged away from the chain that issued it.
 */
const ORIGIN_SUFFIX = /-\(([A-Z0-9]+)\)$/

function isPlausibleSymbol(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const t = v.trim()
  if (t.length === 0) return false
  if (/^0x[0-9a-f]*$/i.test(t)) return false
  return true
}

/**
 * On-chain `symbol()` for every asset on a chain, keyed by lower-cased address.
 *
 * The Pendle API is NOT authoritative for a PT's symbol. Pendle names a PT that
 * was bridged from another chain with its ORIGIN in the symbol — the contract on
 * BNB answers `PT-sUSDai-15OCT2026-(ARB)` — but the API serves the same asset as
 * a bare `PT-sUSDai-15OCT2026`. That suffix is the only marker distinguishing a
 * bridged PT from a natively-issued one, and it carries a fact a holder needs:
 * a bridged PT has no Pendle market on the chain it sits on, so it cannot be
 * minted or redeemed there — only traded, or bridged back to its origin.
 *
 * Taking the API's symbol dropped it on 27 tokens across 5 chains (BNB 13,
 * Unichain 6 — all of them, Base 4, Ethereum 2, HyperEVM 2), and the loss
 * propagated: every downstream label is built from this symbol, so
 * `lender-metadata` rendered Lista's PT markets as `Lista PT-sUSDE-7MAY2026-USDT
 * 86` with nothing to say the collateral is the Ethereum PT.
 *
 * It also resolves collisions the API creates outright. On Ink (57073) two
 * genuinely different tokens — the PT over USDat and the PT over STAKED USDat,
 * same maturity — are both served as `PT-sUSDat-27AUG2026`; the contracts
 * distinguish them (`PT-USDat-27AUG2026-(ETH)` vs `PT-sUSDat-27AUG2026-(ETH)`).
 * Two entries rendering as one thing is precisely what `assetGroup` exists to
 * prevent.
 *
 * Failures are left to the API value rather than dropping the asset — a symbol
 * we could not read is a worse answer than a slightly lossy one, but it is not
 * a reason to lose the token. See `isPlausibleSymbol` for what counts as read.
 */
async function fetchOnChainSymbols(chainId: string, addresses: string[]): Promise<Record<string, string>> {
  if (addresses.length === 0) return {}
  try {
    const res = (await multicallRetryUniversal({
      chain: chainId,
      calls: addresses.map((address) => ({ address, name: 'symbol', args: [] })),
      abi: SYMBOL_ABI,
      allowFailure: true,
    })) as unknown[]
    const out: Record<string, string> = {}
    res.forEach((r, i) => {
      const v = r && typeof r === 'object' && 'result' in (r as any) ? (r as any).result : r
      if (isPlausibleSymbol(v)) out[addresses[i].toLowerCase()] = (v as string).trim()
    })
    return out
  } catch (e) {
    console.warn(`  pendle: on-chain symbol read failed on chain ${chainId} — keeping API symbols`, e)
    return {}
  }
}

interface Token {
  chainId: string
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  tags?: string[]
  props?: any
}

interface PendleAssetList {
  [chainId: string]: { [address: string]: Token }
}

/**
 * Fetch pendle assets and markets data from pendle api and process them
 */
export async function processPendleAssets(): Promise<PendleAssetList> {
  console.log('Processing Pendle assets from API...')

  const chains = await fetch('https://raw.githubusercontent.com/1delta-DAO/chains/main/data.json').then((x) => x.json())

  const [assetsData, marketsData] = await Promise.all([fetchAllAssetsData(), fetchAllMarketsData()])

  const { symbols: previousOriginSymbols, origins: previousOrigins } = loadPreviousOriginSymbols()
  const assetList: PendleAssetList = {}
  const marketsByChain = marketsData

  const ptToMarketMap: { [chainId: string]: { [ptAddress: string]: PendleMarketMapping } } = {}
  const ytToMarketMap: { [chainId: string]: { [ytAddress: string]: PendleMarketMapping } } = {}
  const syToMarketMap: { [chainId: string]: { [syAddress: string]: PendleMarketMapping } } = {}

  Object.entries(marketsByChain).forEach(([chainId, markets]: [string, any]) => {
    ptToMarketMap[chainId] = {}
    ytToMarketMap[chainId] = {}
    syToMarketMap[chainId] = {}

    markets.forEach((market) => {
      const expiryTimestamp = market.expiry ? Math.floor(new Date(market.expiry).getTime() / 1000) : undefined
      const marketData: PendleMarketMapping = {
        marketAddress: market.address.toLowerCase(),
        syAddress: market.sy?.split('-')[1]?.toLowerCase(),
        expiry: expiryTimestamp,
        ytAddress: market.yt?.split('-')[1]?.toLowerCase(),
        ptAddress: market.pt,
        underlyingAsset: market.underlyingAsset?.split('-')[1]?.toLowerCase(),
        name: market.name,
        isNew: market.isNew,
        isPrime: market.isPrime,
        categoryIds: market.categoryIds,
        details: market.details,
      }

      if (market.pt) {
        const ptAddress = market.pt.split('-')[1]?.toLowerCase()
        if (ptAddress) {
          ptToMarketMap[chainId][ptAddress] = marketData
        }
      }

      if (market.yt) {
        const ytAddress = market.yt.split('-')[1]?.toLowerCase()
        if (ytAddress) {
          ytToMarketMap[chainId][ytAddress] = marketData
        }
      }

      if (market.sy) {
        const syAddress = market.sy.split('-')[1]?.toLowerCase()
        if (syAddress) {
          syToMarketMap[chainId][syAddress] = marketData
        }
      }
    })
  })

  for (const [chainId, assets] of Object.entries(assetsData)) {
    if (!Object.values(Chain).includes(chainId as Chain)) {
      continue
    }

    // Authoritative symbols for this chain's assets, read once per chain.
    const onChainSymbols = await fetchOnChainSymbols(
      chainId,
      // @ts-ignore
      assets.filter((a: any) => !a.tags?.includes('PENDLE_LP')).map((a: any) => a.address),
    )

    // Origin PT of every bridged token on this chain, via the LayerZero peer
    // link. Needs the symbols first: the suffix is what says a token is bridged.
    const bridgedOnChain: { address: string; originCode: string }[] = []
    // @ts-ignore
    for (const asset of assets) {
      if (asset.tags?.includes('PENDLE_LP')) continue
      const address = asset.address.toLowerCase()
      const symbol = onChainSymbols[address] ?? previousOriginSymbols[`${chainId}:${address}`] ?? asset.symbol
      const origin = ORIGIN_SUFFIX.exec(symbol)
      if (origin) bridgedOnChain.push({ address, originCode: origin[1] })
    }
    const onChainOrigins = await fetchBridgedOrigins(chainId, bridgedOnChain)

    // @ts-ignore
    for (const asset of assets) {
      if (!assetList[chainId]) {
        assetList[chainId] = {}
      }

      const address = asset.address.toLowerCase()
      const isPT = asset.tags.includes('PT')
      const isYT = asset.tags.includes('YT')
      const isSY = asset.tags.includes('SY')
      const isLPT = asset.tags.includes('PENDLE_LP')

      if (isLPT) {
        continue
      }

      // The contract wins over the API: it is the only source that marks a
      // bridged PT. See `fetchOnChainSymbols`. Failing that, an origin suffix
      // recorded by an earlier run outranks the API's stripped symbol, so an
      // unreachable RPC cannot undo it — see `loadPreviousOriginSymbols`.
      const symbol = onChainSymbols[address] ?? previousOriginSymbols[`${chainId}:${address}`] ?? asset.symbol
      // Keep the name in step with the symbol, or the origin marker survives in
      // one field and not the other — and the name is what seeds `assetGroup`.
      const name = symbol !== asset.symbol && asset.name === asset.symbol ? symbol : asset.name

      const tokenEntry: Token = {
        chainId,
        name: name + ' ' + chains[chainId].name.split(' ')[0],
        symbol,
        address,
        decimals: asset.decimals,
        logoURI: asset.proIcon,
        tags: [...asset.tags],
      }

      const pendleProps: any = { tokenType: isPT ? 'PT' : isYT ? 'YT' : isSY ? 'SY' : undefined }

      // A PT whose contract names an ORIGIN chain was bridged here, and there
      // is no Pendle market for it on this chain: it can be traded, but it
      // cannot be MINTED or REDEEMED except back on its origin. Today that fact
      // is only implied — the entry simply comes out with no `marketAddress`,
      // which reads as missing metadata rather than as a statement. State it,
      // so a caller can gate a mint/redeem route on a fact instead of on the
      // absence of one.
      const origin = ORIGIN_SUFFIX.exec(symbol)
      if (origin) {
        pendleProps.bridgedFrom = origin[1]
        // The ORIGIN PT — same asset, on the chain that issued it, where the SY,
        // the YT and the market live. A consumer joins yield, maturity mechanics
        // and the mint/redeem surface through this, never through the symbol.
        // Read now if the chain answered, else what the last run recorded.
        const resolved = onChainOrigins[address] ?? previousOrigins[`${chainId}:${address}`]
        if (resolved) {
          pendleProps.origin = resolved
          if (!assetsData[resolved.chainId]?.some((a: any) => a.address.toLowerCase() === resolved.address)) {
            console.warn(
              `  pendle: origin ${resolved.chainId}:${resolved.address} of ${chainId}:${address} is not a Pendle asset`,
            )
          }
        } else {
          console.warn(`  pendle: could not resolve origin of bridged PT ${chainId}:${address} (${symbol})`)
        }
      }

      let marketData: PendleMarketMapping | undefined

      if (isPT) {
        marketData = ptToMarketMap[chainId]?.[address]
      } else if (isYT) {
        marketData = ytToMarketMap[chainId]?.[address]
      } else if (isSY) {
        marketData = syToMarketMap[chainId]?.[address]
      }

      if (marketData) {
        pendleProps.marketAddress = marketData.marketAddress
        pendleProps.expiry = marketData.expiry
        pendleProps.underlyingAsset = marketData.underlyingAsset

        if (isPT) {
          pendleProps.ytAddress = marketData.ytAddress
          pendleProps.syAddress = marketData.syAddress
        } else if (isYT) {
          pendleProps.ptAddress = marketData.ptAddress.split('-')[1]?.toLowerCase()
          pendleProps.syAddress = marketData.syAddress
        } else if (isSY) {
          pendleProps.ptAddress = marketData.ptAddress.split('-')[1]?.toLowerCase()
          pendleProps.ytAddress = marketData.ytAddress
        }
      }

      if (asset.expiry) {
        const expiryDate = new Date(asset.expiry)
        const now = new Date()
        const isExpired = expiryDate < now

        // Maturity comes from the MARKET above, which a bridged PT does not
        // have on this chain — so all 31 of them carried `expired` and no
        // `expiry`, even though the assets feed states the date. That is the
        // worst of both: `expired` is frozen at GENERATION time (the trap
        // PENDLE_PT.md names — a cached expired flag is never enough), and with
        // no timestamp beside it a consumer cannot recompute maturity itself.
        // `isPendlePositionMatured` reads an absent expiry as NOT MATURED, so a
        // bridged PT past its date claimed to be live.
        //
        // The market's value still wins where there is one: it is the market
        // this token actually settles against.
        if (pendleProps.expiry === undefined) {
          const seconds = Math.floor(expiryDate.getTime() / 1000)
          if (Number.isFinite(seconds)) pendleProps.expiry = seconds
        }

        if (isExpired) {
          pendleProps.expired = true
        }
      }

      if (Object.keys(pendleProps).length > 0) {
        tokenEntry.props = { pendle: pendleProps }
      }

      assetList[chainId][address] = tokenEntry
    }
  }

  const totalAssets = Object.values(assetList).reduce((sum, chain) => sum + Object.keys(chain).length, 0)
  console.log(`Processed ${totalAssets} Pendle assets across ${Object.keys(assetList).length} chains`)

  return assetList
}

export function convertPendleAssetsToTokenMap(pendleAssets: PendleAssetList): {
  [chainId: string]: { [address: string]: any }
} {
  const result: { [chainId: string]: { [address: string]: any } } = {}

  Object.entries(pendleAssets).forEach(([chainId, assets]) => {
    result[chainId] = {}

    Object.entries(assets).forEach(([address, asset]) => {
      result[chainId][address] = {
        chainId: asset.chainId,
        name: asset.name,
        symbol: asset.symbol,
        address: asset.address,
        decimals: asset.decimals,
        logoURI: asset.logoURI,
        tags: asset.tags,
        props: asset.props,
      }
    })
  })

  return result
}
