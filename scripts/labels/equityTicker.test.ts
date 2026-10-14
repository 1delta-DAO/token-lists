// Run: npm test (tsx --test). Every case below is a real row from the lists (chain in the comment).
import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { equityTicker, isharesEtfTicker } from './equityTicker'
import { classifyRwaLst } from './rwaLstRules'

test('xStocks: ticker + x, case-insensitive, stripped once', () => {
  assert.equal(equityTicker('xstocks', 'Tesla xStock', 'TSLAx'), 'TSLA') // 10
  assert.equal(equityTicker('xstocks', 'HP xStock', 'HPQX'), 'HPQ') // 1, upper-cased list symbol
  assert.equal(equityTicker('xstocks', 'T1 Energy xStock', 'TEX'), 'TE')
  assert.equal(equityTicker('xstocks', 'AT&T xStock', 'TX'), 'T')
  assert.equal(equityTicker('xstocks', 'HEICO xStock', 'HEI.AX'), 'HEI.A') // class A, 1
  assert.equal(equityTicker('xstocks', 'Berkshire Hathaway xStock', 'BRK.BX'), 'BRK.B') // 5000
  assert.equal(equityTicker('xstocks', 'Berkshire Hathaway xStock', 'BRKBX'), 'BRK.B') // 1 — same token
  assert.equal(equityTicker('xstocks', 'Greggs xStock', 'GRG.GBx'), 'GRG.GB') // solana
  assert.equal(equityTicker('xstocks', 'Wrapped Apple xStock', 'wAAPLx'), 'AAPL')
  assert.equal(equityTicker('xstocks', 'Wrapped Tesla xStock', 'WTSLAX'), 'TSLA')
  assert.equal(equityTicker('xstocks', 'Wrapped Berkshire Hathaway xStock', 'WBRKBX'), 'BRK.B') // 42161
  // Not an xStock name, or nothing ticker-shaped left: unknown, never a guess.
  assert.equal(equityTicker('xstocks', 'Tesla', 'TSLAX'), undefined)
  assert.equal(equityTicker('xstocks', 'Tesla xStock', 'TSLA'), undefined)
  assert.equal(equityTicker('xstocks', 'Tesla xStock', 'X'), undefined)
})

test('Ondo Global Markets: ticker + on', () => {
  assert.equal(equityTicker('ondo', 'NVIDIA (Ondo Tokenized Stock)', 'NVDAON'), 'NVDA') // 1
  assert.equal(equityTicker('ondo', 'Micron Technology (Ondo Tokenized Stock)', 'MUon'), 'MU') // 999
  assert.equal(equityTicker('ondo', 'Invesco QQQ ETF Ondo Tokenized ETF ', 'QQQON'), 'QQQ') // 1
  assert.equal(equityTicker('ondo', 'ON Semiconductor (Ondo Tokenized)', 'ONON'), 'ON')
  assert.equal(equityTicker('ondo', 'Ondo', 'ONDO'), undefined)
})

test('Dinari: the bare ticker', () => {
  assert.equal(equityTicker('dinari', 'Walmart (Dinari Tokenized Stock)', 'WMT'), 'WMT') // 8453
  assert.equal(equityTicker('dinari', 'Berkshire Hathaway Class B (Dinari Tokenized Stock)', 'BRK.B'), 'BRK.B') // 1
  assert.equal(equityTicker('dinari', 'ProShares UltraPro Short QQQ (Dinari Tokenized ETF)', 'SQQQ'), 'SQQQ') // 43114
  assert.equal(equityTicker('dinari', 'Walmart (Dinari Tokenized Stock)', 'WMT.d'), undefined)
})

test('Backed legacy: b + ticker, wb + ticker when wrapped', () => {
  assert.equal(equityTicker('backed', 'Backed Tesla', 'BTSLA'), 'TSLA')
  assert.equal(equityTicker('backed', 'Backed NVIDIA', 'bNVDA'), 'NVDA')
  assert.equal(equityTicker('backed', 'Backed Alphabet Class A', 'bGOOGL'), 'GOOGL')
  assert.equal(equityTicker('backed', 'Wrapped Backed Coinbase Global', 'wbCOIN'), 'COIN')
  assert.equal(equityTicker('backed', 'Backed', 'BACKED'), undefined) // the brand, not a product
  assert.equal(equityTicker('backed', 'RWA Backed Lending by Valos', 'vUSD'), undefined)
})

test('Coinbase / bStocks / ST0x / Anchored / Sailing affixes', () => {
  assert.equal(equityTicker('coinbase', 'Apple (Coinbase Tokenized Stock)', 'AAPLC'), 'AAPL') // 8453
  assert.equal(equityTicker('coinbase', 'Unity Software Inc. (Coinbase Tokenized Stock)', 'UC'), 'U')
  assert.equal(
    equityTicker('coinbase', 'Berkshire Hathaway Inc. Class B (Coinbase Tokenized Stock)', 'BRK.BC'),
    'BRK.B',
  )
  assert.equal(equityTicker('bstocks', 'NVIDIA (bStocks Tokenized Stock)', 'NVDAB'), 'NVDA') // 56
  assert.equal(equityTicker('bstocks', 'Goldman Sachs (bStocks Tokenized Stock)', 'GSB'), 'GS')
  assert.equal(equityTicker('st0x', 'NVIDIA (ST0x Tokenized Stock)', 'WTNVDA'), 'NVDA') // 8453
  assert.equal(equityTicker('st0x', 'Invesco NASDAQ 100 (ST0x Tokenized ETF)', 'WTQQQM'), 'QQQM')
  assert.equal(equityTicker('anchored', 'SPDR Bloomberg 1-3 Month T-Bill ETF (Anchored Tokenized ETF)', 'ABIL'), 'BIL')
  assert.equal(equityTicker('sailing', 'Tesla Inc Tokenized by Sailing', 'TSLAs'), 'TSLA') // 42161
})

test('the rule engine stamps underlying on the equity / ETF rows only', () => {
  assert.deepEqual(classifyRwaLst({ name: 'Tesla xStock', symbol: 'TSLAX' })?.rwa, {
    type: 'equity',
    subType: 'stock',
    issuer: 'backed',
    underlying: 'TSLA',
  })
  assert.deepEqual(classifyRwaLst({ name: 'iShares MSCI EAFE Value ETF (Ondo Tokenized)', symbol: 'EFVON' })?.rwa, {
    type: 'fund',
    subType: 'etf',
    issuer: 'ondo',
    underlying: 'EFV',
  })
  // Backed's debt products keep no ticker: `IB01` is a fund code under a credit row.
  assert.equal(
    classifyRwaLst({ name: 'Backed IB01 $ Treasury Bond 0-1yr', symbol: 'bIB01' })?.rwa?.underlying,
    undefined,
  )
  // A family with no certain convention keeps none.
  assert.equal(classifyRwaLst({ name: 'Circle USYC', symbol: 'USYC' })?.rwa?.underlying, undefined)
})

test('ETF vs stock is decided on the ticker, the name only as fallback', () => {
  const cls = (name: string, symbol: string) => {
    const r = classifyRwaLst({ name, symbol })?.rwa
    return r && `${r.type}/${r.subType}:${r.underlying ?? ''}`
  }
  // ETFs whose names never say "ETF" (all real list rows).
  assert.equal(cls('SP500 xStock', 'SPYX'), 'fund/etf:SPY') // 1
  assert.equal(cls('Wrapped SP500 xStock', 'wSPYx'), 'fund/etf:SPY')
  assert.equal(cls('Gold xStock', 'GLDX'), 'fund/etf:GLD')
  assert.equal(cls('Vanguard xStock', 'VTIX'), 'fund/etf:VTI')
  assert.equal(cls('iShares Bitcoin Trust (Ondo Tokenized)', 'IBITON'), 'fund/etf:IBIT') // 1
  assert.equal(cls('SPY (bStocks Tokenized Stock)', 'SPYB'), 'fund/etf:SPY') // 56
  // Unchanged: already ETFs by name, and plain companies.
  assert.equal(cls('Nasdaq xStock', 'QQQX'), 'fund/etf:QQQ')
  assert.equal(cls('TQQQ xStock', 'TQQQX'), 'fund/etf:TQQQ')
  assert.equal(cls('Tesla xStock', 'TSLAx'), 'equity/stock:TSLA')
  // Companies whose names carry index words.
  assert.equal(cls('S&P Global xStock', 'SPGIX'), 'equity/stock:SPGI')
  assert.equal(cls('MSCI xStock', 'MSCIx'), 'equity/stock:MSCI')
  assert.equal(cls('Nasdaq Inc. xStock', 'NDAQx'), 'equity/stock:NDAQ')
  // No ticker: the name rule still decides.
  assert.equal(cls('Some Index ETF (Ondo Tokenized)', 'ON'), 'fund/etf:')
})

test('ishares-etf rows get a ticker only when a reading of the symbol is a known ETF', () => {
  assert.equal(isharesEtfTicker('iShares Core S&P 500 ETF rStock', 'RIVV'), 'IVV') // 42161
  assert.equal(isharesEtfTicker('iShares Core US Aggregate Bond ETF  Ond', 'AGGON'), 'AGG') // 1
  assert.equal(isharesEtfTicker('iShares 20+ Year Treasury Bond aStock', 'ATLT'), 'TLT') // 4663
  assert.equal(isharesEtfTicker('iShares 0-3 Month Treasury Bond ETF', 'SGOV'), 'SGOV')
  assert.equal(isharesEtfTicker('iShares Something ETF rStock', 'RZZZZ'), undefined)
  // No "rStock" in the name: the R is part of the symbol, not a prefix.
  assert.equal(isharesEtfTicker('iShares Core S&P 500 ETF', 'RIVV'), undefined)
})

test('backed rule: Backed / Wrapped Backed names only, and `Corp` is not debt', () => {
  const r = (name: string, symbol: string) => classifyRwaLst({ name, symbol })?.rwa
  // false positives seen in the lists: a bare "Backed" (4663) and prose (143)
  assert.equal(r('Backed', 'BACKED'), undefined)
  assert.equal(r('RWA Backed Lending by Valos', 'vUSD'), undefined)
  // GameStop is the company, not corporate debt (1, 100, 42161, 43114, 137)
  assert.deepEqual(
    [r('Backed GameStop Corp', 'BGME')?.type, r('Backed GameStop Corp', 'BGME')?.underlying],
    ['equity', 'GME'],
  )
  assert.equal(r('Backed HIGH € High Yield Corp Bond', 'BHIGH')?.subType, 'corporate-debt')
  assert.equal(r('Backed IB01 $ Treasury Bond 0-1yr', 'BIB01')?.subType, 'treasury')
  assert.equal(r('Wrapped Backed Coinbase Global', 'wbCOIN')?.underlying, 'COIN')
  assert.equal(r('Backed Tesla', 'BTSLA')?.underlying, 'TSLA')
})
