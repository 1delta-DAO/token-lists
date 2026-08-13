#!/usr/bin/env node
/**
 * Report every vault underlying that is NOT in the asset registry, per chain.
 *
 * Method matters here: it diffs the vaults' `underlying` addresses against
 * `/assets/available`, NOT against "rows whose symbol came back null". The
 * latter would report every Pendle PT as missing right now, because the
 * pendle→assets join is fixed but not yet deployed — a false positive on ~50
 * rows. Asking the registry directly is immune to that.
 *
 * Usage: node missing-underlyings.mjs [--origin URL] [--json]
 */

const ORIGIN = process.argv.includes('--origin')
  ? process.argv[process.argv.indexOf('--origin') + 1]
  : 'https://yields-r0.1delta.io'
const AS_JSON = process.argv.includes('--json')

/** Native sentinel — not a token, never "missing". */
const ZERO = '0x0000000000000000000000000000000000000000'
const PAGE = 1000

async function getJson(path) {
  const res = await fetch(`${ORIGIN}${path}`)
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

/** Walk `/vaults/latest` to exhaustion (paging param is `count`, not `limit`). */
async function allVaults() {
  const items = []
  for (let start = 0; ; start += PAGE) {
    const body = await getJson(`/vaults/latest?start=${start}&count=${PAGE}`)
    const page = body.items ?? []
    items.push(...page)
    if (page.length < PAGE) break
  }
  return items
}

async function registryFor(chainId) {
  const body = await getJson(`/assets/available?chainId=${chainId}&count=5000&includeExpired=true`)
  return new Set((body.items ?? []).map((a) => String(a.address ?? '').toLowerCase()).filter(Boolean))
}

const usd = (n) =>
  n == null
    ? '—'
    : n >= 1e6
      ? `$${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `$${(n / 1e3).toFixed(1)}K`
        : `$${Number(n).toFixed(2)}`

const main = async () => {
  const vaults = await allVaults()

  // (chain, underlying) → what references it. Several vaults can share one
  // missing token, so aggregate rather than listing the address N times.
  const byChain = new Map()
  for (const v of vaults) {
    const chainId = String(v.chainId ?? '')
    const underlying = String(v.underlying ?? '').toLowerCase()
    if (!chainId || !underlying || underlying === ZERO) continue

    if (!byChain.has(chainId)) byChain.set(chainId, new Map())
    const perChain = byChain.get(chainId)
    const entry = perChain.get(underlying) ?? {
      address: underlying,
      tvlUsd: 0,
      providers: new Set(),
      vaults: [],
      vaultAddresses: [],
      // What the API currently reports — lets us separate "absent from the
      // registry" from "registered but not surfacing", which are different bugs.
      reportedSymbol: v?.underlyingInfo?.asset?.symbol ?? null,
    }
    entry.tvlUsd += Number(v?.tvl?.totalAssetsUsd ?? 0) || 0
    entry.providers.add(v.provider)
    if (entry.vaults.length < 3) {
      const label = v.displayName ?? v.name ?? v.symbol
      if (label) entry.vaults.push(String(label))
    }
    if (entry.vaultAddresses.length < 3 && v.vaultAddress) entry.vaultAddresses.push(String(v.vaultAddress))
    if (!entry.reportedSymbol && v?.underlyingInfo?.asset?.symbol) entry.reportedSymbol = v.underlyingInfo.asset.symbol
    perChain.set(underlying, entry)
  }

  // Registries for every chain up front, so a missing address can be checked
  // against OTHER chains too.
  const registries = new Map()
  for (const chainId of byChain.keys()) {
    registries.set(chainId, await registryFor(chainId))
  }

  /**
   * Is this address a known token on a DIFFERENT chain?
   *
   * If so it is almost certainly a wrong-chain `underlying` in the vault
   * ingest, not a registry gap — an Avalanche vault pointing at Ethereum's
   * USDC address, say. Adding it to the Avalanche registry would enshrine the
   * bug instead of fixing it, so these are separated out.
   */
  const foundOnOtherChains = (chainId, address) =>
    [...registries.entries()].filter(([c, set]) => c !== chainId && set.has(address)).map(([c]) => c)

  const out = {}
  let totalMissing = 0

  for (const [chainId, perChain] of [...byChain].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const registry = await registryFor(chainId)
    const missing = [...perChain.values()].filter((e) => !registry.has(e.address)).sort((a, b) => b.tvlUsd - a.tvlUsd)

    if (missing.length === 0) continue
    totalMissing += missing.length
    out[chainId] = missing.map((m) => ({
      address: m.address,
      tvlUsd: Math.round(m.tvlUsd),
      providers: [...m.providers].sort(),
      reportedSymbol: m.reportedSymbol,
      examples: m.vaults,
      vaultAddresses: m.vaultAddresses,
      knownOnChains: foundOnOtherChains(chainId, m.address),
    }))

    if (!AS_JSON) {
      console.log(`\n── chain ${chainId} — ${missing.length} missing of ${perChain.size} distinct underlyings`)
      for (const m of missing) {
        const other = foundOnOtherChains(chainId, m.address)
        console.log(
          `  ${m.address}  ${usd(m.tvlUsd).padStart(9)}  ` +
            `[${[...m.providers].join(',')}]  ${m.vaults?.[0] ?? m.vaultAddresses?.[0] ?? ''}` +
            (other.length ? `  ⚠ known on chain(s) ${other.join(',')}` : ''),
        )
      }
    }
  }

  if (AS_JSON) {
    console.log(JSON.stringify(out, null, 2))
  } else {
    console.log(
      `\n${totalMissing} missing underlyings across ${Object.keys(out).length} chains ` +
        `(${vaults.length} vaults scanned)`,
    )
    // A flat, paste-ready list per chain.
    // Split the output: genuine registry gaps are additions; wrong-chain
    // references are an ingest bug and must NOT be added.
    console.log('\n── TO ADD (genuine registry gaps) ──')
    for (const [chainId, rows] of Object.entries(out)) {
      const add = rows.filter((r) => r.knownOnChains.length === 0)
      if (!add.length) continue
      console.log(`\nchain ${chainId}:`)
      console.log(add.map((r) => r.address).join('\n'))
    }

    const suspect = Object.entries(out).flatMap(([chainId, rows]) =>
      rows.filter((r) => r.knownOnChains.length > 0).map((r) => ({ chainId, ...r })),
    )
    if (suspect.length) {
      console.log('\n── DO NOT ADD — wrong-chain underlying (ingest bug) ──')
      for (const r of suspect) {
        console.log(
          `  chain ${r.chainId}  ${r.address}  ${usd(r.tvlUsd)}  ` +
            `[${r.providers.join(',')}]  registered on ${r.knownOnChains.join(',')}  ` +
            `vault ${r.vaultAddresses?.[0] ?? '?'}`,
        )
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
