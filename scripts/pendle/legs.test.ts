// Run: npm test (tsx --test). The fixture cases read the committed pendle.json / 1.json.
import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import * as fs from 'fs'
import * as path from 'path'
import { applyUnmappedLegs, decodeLegReads, legReadCalls, previousLegsFromList } from './legs'

const SY = '0xa99a50d95003e7687d7962f29aad6cdd3655d411'
const YT = '0xea8c2da5af6d9baa39d83f0fa8e8871d3896bf86'
const PT = '0x85ae004c57aea030f747fa504458871874d62154'
const MARKET = '0x0e201d27ded56cf4a0da8853d7604743de217435'
const ROY_ST = '0xbd373c9d3d8976a4fecc504a93c768bbe8c3227c'
const ok = (result: unknown) => ({ status: 'success', result })

test('legReadCalls: three reads per token, the other leg by type', () => {
  const calls = legReadCalls([
    { address: PT, type: 'PT' },
    { address: YT, type: 'YT' },
  ])
  assert.deepEqual(
    calls.map((c) => `${c.address}.${c.name}`),
    [`${PT}.SY`, `${PT}.YT`, `${PT}.expiry`, `${YT}.SY`, `${YT}.PT`, `${YT}.expiry`],
  )
})

test('decodeLegReads: PT gets yt, YT gets pt, addresses lower-cased', () => {
  const out = decodeLegReads(
    [
      { address: PT.toUpperCase().replace('0X', '0x'), type: 'PT' },
      { address: YT, type: 'YT' },
    ],
    [
      ok('0xA99a50D95003E7687d7962f29Aad6cDd3655d411'),
      ok('0xea8c2Da5AF6D9bAA39d83f0Fa8e8871d3896Bf86'),
      ok(1787788800n),
      ok(SY),
      ok(PT),
      ok(1787788800n),
    ],
  )
  assert.deepEqual(out[PT], { syAddress: SY, ytAddress: YT, expiry: 1787788800 })
  assert.deepEqual(out[YT], { syAddress: SY, ptAddress: PT, expiry: 1787788800 })
})

test('decodeLegReads: a failed or empty read records nothing, never a sentinel', () => {
  const t = [{ address: PT, type: 'PT' as const }]
  // multicall's raw-data fallback: the literal '0x' is NOT an address
  assert.deepEqual(decodeLegReads(t, ['0x', '0x', '0x']), {})
  // a revert object
  assert.deepEqual(decodeLegReads(t, [{ status: 'failure', error: new Error('revert') }, ok(YT), ok(1n)]), {})
  // the zero address (an unset immutable)
  assert.deepEqual(decodeLegReads(t, [ok(SY), ok('0x0000000000000000000000000000000000000000'), ok(1n)]), {})
  // one leg alone is not a redeemable pair
  assert.deepEqual(decodeLegReads(t, [ok(SY), '0x', ok(1n)]), {})
  // legs decode, expiry does not: legs kept, no expiry
  assert.deepEqual(decodeLegReads(t, [ok(SY), ok(YT), ok(0n)]), { [PT]: { syAddress: SY, ytAddress: YT } })
})

test('previousLegsFromList: only rows with an SY, keyed chain:address', () => {
  const out = previousLegsFromList([
    {
      chainId: '1',
      address: '0x44DB865CC6D5768703FB5BF73DFB7A5A0F95C1FC',
      props: {
        pendle: {
          tokenType: 'PT',
          marketAddress: MARKET,
          syAddress: SY,
          ytAddress: '0x7cf9ea7bc05c6b3f8517b71f8d87feecb006def4',
          underlyingAsset: ROY_ST,
          expiry: 1793836800,
          expired: false,
        },
      },
    },
    // the stripped shape this module exists to repair — nothing to carry
    { chainId: '1', address: PT, props: { pendle: { tokenType: 'PT', expiry: 1787788800, expired: true } } },
    { chainId: '1', address: '0x1111111111111111111111111111111111111111', props: {} },
  ])
  assert.deepEqual(Object.keys(out), ['1:0x44db865cc6d5768703fb5bf73dfb7a5a0f95c1fc'])
  assert.equal(out['1:0x44db865cc6d5768703fb5bf73dfb7a5a0f95c1fc'].marketAddress, MARKET)
})

test('applyUnmappedLegs: previous wins, chain fills gaps, market only from previous', () => {
  const props: Record<string, unknown> = { tokenType: 'PT' }
  applyUnmappedLegs(
    props,
    'PT',
    { syAddress: SY, ytAddress: YT, expiry: 1787788800, underlyingAsset: ROY_ST },
    { marketAddress: MARKET, syAddress: SY, ytAddress: YT },
  )
  assert.deepEqual(props, {
    tokenType: 'PT',
    marketAddress: MARKET,
    expiry: 1787788800,
    underlyingAsset: ROY_ST,
    ytAddress: YT,
    syAddress: SY,
  })

  const fromChain: Record<string, unknown> = { tokenType: 'PT' }
  applyUnmappedLegs(fromChain, 'PT', { syAddress: SY, ytAddress: YT }, undefined)
  assert.equal(fromChain.marketAddress, undefined)
  assert.equal(fromChain.syAddress, SY)
})

test('applyUnmappedLegs: the redeem pair is written together or not at all', () => {
  const pt: Record<string, unknown> = { tokenType: 'PT' }
  applyUnmappedLegs(pt, 'PT', { syAddress: SY }, undefined)
  assert.equal(pt.syAddress, undefined)
  // a PT's `ptAddress` leg is not a YT for it
  applyUnmappedLegs(pt, 'PT', { syAddress: SY, ptAddress: PT }, undefined)
  assert.equal(pt.syAddress, undefined)

  const yt: Record<string, unknown> = { tokenType: 'YT' }
  applyUnmappedLegs(yt, 'YT', { syAddress: SY, ptAddress: PT }, undefined)
  assert.equal(yt.ptAddress, PT)
  assert.equal(yt.ytAddress, undefined)

  const none: Record<string, unknown> = { tokenType: 'PT' }
  applyUnmappedLegs(none, 'PT', undefined, undefined)
  assert.deepEqual(none, { tokenType: 'PT' })
})

// ---- the generated output --------------------------------------------------

const ROOT = path.resolve(__dirname, '..', '..')
const pendleList: any[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'pendle.json'), 'utf8'))
const pendleOf = (t: any) => t?.props?.pendle ?? {}

/**
 * Native-looking PTs whose contract has no `SY()`: LayerZero OFTs (both answer
 * `endpoint()` = 0x1a44…728c) bridged WITHOUT the `-(ORIGIN)` suffix, so
 * nothing marks them `bridgedFrom`. Correctly leg-less.
 */
const LEGLESS_OFTS = new Set([
  '42161:0x9d2ce39c0bf9baa959cb65163fbca89b91d240c5', // PT-mHYPER-20NOV2025
  '43114:0x9da7f8c0d6e3f247affdf92c3dddd83c1e248e14', // PT-USDe-27NOV2025
])

test('pendle.json: every native PT/YT carries the legs a redeem needs', () => {
  const missing = pendleList
    .filter((t) => ['PT', 'YT'].includes(pendleOf(t).tokenType) && !pendleOf(t).bridgedFrom)
    .filter((t) => !LEGLESS_OFTS.has(`${t.chainId}:${t.address.toLowerCase()}`))
    .filter((t) => {
      const p = pendleOf(t)
      return !p.syAddress || !(p.tokenType === 'PT' ? p.ytAddress : p.ptAddress)
    })
    .map((t) => `${t.chainId}:${t.symbol}`)
  assert.deepEqual(missing, [])
})

test('pendle.json: a PT and its YT point at each other, one SY, one expiry', () => {
  const by = new Map(pendleList.map((t) => [`${t.chainId}:${t.address.toLowerCase()}`, t]))
  const broken: string[] = []
  let checked = 0
  for (const t of pendleList) {
    const p = pendleOf(t)
    if (p.tokenType !== 'PT' || !p.ytAddress) continue
    const yt = by.get(`${t.chainId}:${p.ytAddress}`)
    if (!yt) continue
    checked++
    const y = pendleOf(yt)
    if (y.ptAddress !== t.address.toLowerCase() || y.syAddress !== p.syAddress || y.expiry !== p.expiry)
      broken.push(`${t.chainId}:${t.symbol}`)
  }
  assert.ok(checked > 1000, `only ${checked} PT/YT pairs checked`)
  assert.deepEqual(broken, [])
})

test('1.json: the expired ROY-ST PT keeps its legs after Pendle dropped its market', () => {
  // `markets/all` stopped serving the 27AUG2026 Royco markets by 2026-10-19.
  const list = JSON.parse(fs.readFileSync(path.resolve(ROOT, '1.json'), 'utf8'))
  const row = (list.list ?? list)[PT]
  assert.equal(row.symbol, 'PT-ROY-ST-apyUSD-27AUG2026')
  const p = row.props.pendle
  assert.equal(p.tokenType, 'PT')
  assert.equal(p.expired, true)
  assert.equal(p.syAddress, SY)
  assert.equal(p.ytAddress, YT)
  assert.equal(p.underlyingAsset, ROY_ST)
  assert.equal(p.expiry, 1787788800)
})
