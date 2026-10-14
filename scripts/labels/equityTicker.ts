/**
 * The real-world ticker a tokenized equity / ETF tracks (`props.rwa.underlying`), read off
 * the TOKENIZER'S OWN naming convention — and only where that convention makes it certain.
 *
 * Every issuer spells its token as the exchange ticker plus a fixed affix:
 *
 *   xStocks (Backed)   TSLAx      "<Name> xStock"                  ticker + `x`
 *                      wTSLAx     "Wrapped <Name> xStock"          `w` + ticker + `x`
 *   Ondo GM            NVDAon     "<Name> (Ondo Tokenized …)"      ticker + `on`
 *   Dinari dShares     TSLA       "<Name> (Dinari Tokenized …)"    the bare ticker
 *   Backed (legacy)    bTSLA      "Backed <Name>"                  `b` + ticker
 *                      wbCOIN     "Wrapped Backed <Name>"          `wb` + ticker
 *   Coinbase           AAPLC      "<Name> (Coinbase Tokenized …)"  ticker + `C`
 *   bStocks            NVDAB      "<Name> (bStocks Tokenized …)"   ticker + `B`
 *   ST0x               WTNVDA     "<Name> (ST0x Tokenized …)"      `WT` + ticker
 *   Anchored           ASPCX      "<Name> (Anchored Tokenized …)"  `A` + ticker
 *   Sailing            TSLAs      "<Name> Tokenized by Sailing"    ticker + `s`
 *
 * Measured over every list (2026-10-14): each affix holds on 100 % of its family's rows, and
 * the xStocks / Ondo strips agree with the underlying Jupiter's tags give the same names on
 * Solana on 5 939 / 5 939 and 522 / 522 rows (the only "disagreements" were the share-class
 * spellings below). Many lists UPPER-CASE the symbol (`TSLAX`, `NVDAON`), so the affix is
 * stripped case-insensitively and exactly once: `TEX` "T1 Energy xStock" → `TE`, `ONON` →
 * `ON`, never a second strip.
 *
 * Anything else answers `undefined` — the family is not listed above, the name does not carry
 * the family's marker, or what is left is not ticker-shaped. A wrong ticker would put a token
 * into somebody else's `underlyings=` filter, so an unknown is the only safe default.
 * Pure: no I/O, no registry.
 */

export type EquityFamily =
  | 'xstocks'
  | 'ondo'
  | 'dinari'
  | 'backed'
  | 'coinbase'
  | 'bstocks'
  | 'st0x'
  | 'anchored'
  | 'sailing'

/**
 * A ticker: letters / digits, an optional share-class or exchange suffix after ONE dot
 * (`BRK.B`, `HEI.A`, `GRG.GB`). The same shape pos-indexer's `underlyingTickerOf` accepts.
 */
const TICKER = /^[A-Z0-9]{1,8}(\.[A-Z]{1,2})?$/

/**
 * Share-class tickers some deployments spell without the dot. Only an entry whose dotted
 * form the SAME issuer publishes elsewhere: xStocks' Berkshire is `BRK.Bx` on Solana and on
 * Mantle (5000) and `BRKBX` on Ethereum / BNB / Arbitrum — one token, one ticker.
 */
const DOTLESS_SHARE_CLASS: Record<string, string> = { BRKB: 'BRK.B' }

const ticker = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined
  const t = raw.trim().toUpperCase()
  const fixed = DOTLESS_SHARE_CLASS[t] ?? t
  return TICKER.test(fixed) ? fixed : undefined
}

/** `symbol` with `re` removed, or undefined when it does not match. */
const strip = (symbol: string, re: RegExp): string | undefined => {
  const m = re.exec(symbol.trim())
  return m ? m[1] : undefined
}

export function equityTicker(family: EquityFamily, name: string, symbol: string): string | undefined {
  const n = (name ?? '').trim()
  const s = (symbol ?? '').trim()
  if (!n || !s) return undefined
  switch (family) {
    case 'xstocks': {
      if (!/xstock\s*$/i.test(n)) return undefined
      // "Wrapped <Name> xStock" carries a leading `w`; nothing else does.
      return /^wrapped\s/i.test(n) ? ticker(strip(s, /^w(.+)x$/i)) : ticker(strip(s, /^(.+)x$/i))
    }
    case 'ondo':
      if (!/ondo/i.test(n)) return undefined
      return ticker(strip(s, /^(.+)on$/i))
    case 'dinari':
      if (!/dinari/i.test(n)) return undefined
      // The bare ticker, as the issuer spells it: upper-case only (a lower-case letter means
      // the symbol is something else).
      return /^[A-Z0-9.]+$/.test(s) ? ticker(s) : undefined
    case 'backed': {
      if (/^wrapped\s+backed\s/i.test(n)) return ticker(strip(s, /^wb(.+)$/i))
      if (/^backed\s/i.test(n)) return ticker(strip(s, /^b(.+)$/i))
      return undefined
    }
    case 'coinbase':
      if (!/coinbase/i.test(n)) return undefined
      return ticker(strip(s, /^(.+)c$/i))
    case 'bstocks':
      if (!/bstocks/i.test(n)) return undefined
      return ticker(strip(s, /^(.+)b$/i))
    case 'st0x':
      if (!/st0x/i.test(n)) return undefined
      return ticker(strip(s, /^wt(.+)$/i))
    case 'anchored':
      if (!/anchored/i.test(n)) return undefined
      return ticker(strip(s, /^a(.+)$/i))
    case 'sailing':
      if (!/tokenized by sailing/i.test(n)) return undefined
      return ticker(strip(s, /^(.+)s$/i))
    default:
      return undefined
  }
}

/* -------------------------------------------------------------------------- */
/* ETF or single stock — keyed on the ticker, not on the name                 */
/* -------------------------------------------------------------------------- */

/**
 * Exchange-traded funds by their US ticker. The class of a tokenized equity used to be read off
 * its NAME (`isEtf`), and an issuer that does not write "ETF" in the name defeated it: xStocks
 * spells SPY "SP500 xStock", GLD "Gold xStock", VTI "Vanguard xStock", IWM "Russell 2000
 * xStock"; Ondo spells IBIT "iShares Bitcoin Trust (Ondo Tokenized)"; bStocks files SPY as
 * "SPY (bStocks Tokenized Stock)". The same instrument then read `fund/etf` under one issuer and
 * `equity/stock` under the next (measured 2026-10-14: 25 tickers split that way).
 *
 * Every entry is an ETF (or an exchange-traded commodity pool / trust registered as one) that a
 * token in these lists tracks. Built from (a) every ticker some issuer's own name already calls
 * an ETF, (b) the fund-named rows the name rule missed, each checked by hand; nothing is added
 * because a ticker "looks like" a fund. Not here on purpose: closed-end funds and BDCs (CEF,
 * SPPP, CSQ, BXSL, MSDL, VCX) — they trade as shares of a company-like vehicle, not an ETF.
 */
export const ETF_UNDERLYINGS: ReadonlySet<string> = new Set([
  // broad US equity
  'SPY',
  'VOO',
  'IVV',
  'CSPX',
  'VTI',
  'ITOT',
  'QQQ',
  'QQQM',
  'DIA',
  'IWM',
  'IWF',
  'IWN',
  'IJH',
  'IJR',
  'IJS',
  'VUG',
  'VTV',
  'VIG',
  'VYM',
  'SCHD',
  'SPMO',
  'BLCR',
  'DYNF',
  'FLQL',
  'FLQM',
  'USPX',
  'INCE',
  'FFOG',
  'MAGS',
  // sector / theme
  'XLK',
  'XLE',
  'XBI',
  'XOP',
  'VDE',
  'VNQ',
  'SCHH',
  'IYW',
  'IGV',
  'IBB',
  'ICLN',
  'ITA',
  'SOXX',
  'SOXQ',
  'SMH',
  'CIBR',
  'AIQ',
  'BAI',
  'BOTZ',
  'BKCH',
  'DTCR',
  'DRAM',
  'LYTE',
  'PAVE',
  'ORBX',
  'SHLD',
  'IDEF',
  'KDEF',
  'NASA',
  'UFO',
  'ARKK',
  'ARKX',
  'DAPP',
  'WGMI',
  'QTUM',
  'LIT',
  'REMX',
  'URA',
  'URNM',
  'NLR',
  'NIKL',
  'SIL',
  'SILJ',
  'GDX',
  'COPX',
  'SLX',
  'OIH',
  'MOO',
  'WOOD',
  'IQM',
  'CORO',
  'INRO',
  'IALT',
  'HLAL',
  'SPUS',
  'SPRE',
  'SPTE',
  'SPSK',
  'SPWO',
  'KWEB',
  'KWIN',
  'BWET',
  // international
  'VXUS',
  'VT',
  'VGK',
  'VWO',
  'EFA',
  'EFV',
  'IEFA',
  'EEM',
  'IEMG',
  'FEZ',
  'DAX',
  'EWG',
  'EWJ',
  'EWQ',
  'EWU',
  'EWY',
  'EWZ',
  'EWT',
  'ECH',
  'ARGT',
  'INDA',
  'FXI',
  'SCHF',
  // fixed income
  'AGG',
  'BND',
  'FBND',
  'TLT',
  'IEF',
  'IEI',
  'SHY',
  'SGOV',
  'BIL',
  'BOXX',
  'TIP',
  'USFR',
  'JPST',
  'NEAR',
  'YEAR',
  'HYG',
  'HYGW',
  'USHY',
  'HYDB',
  'HYS',
  'BRHY',
  'FLHY',
  'FLBL',
  'BRLN',
  'SRLN',
  'BRTR',
  'BINC',
  'SECU',
  'SYSB',
  'IGEB',
  'QLTA',
  'GGOV',
  'EUHY',
  'LEMB',
  'CLOA',
  'CLOI',
  'JAAA',
  'JBBB',
  'TMF',
  // commodities
  'GLD',
  'IAU',
  'FGDL',
  'SLV',
  'SIVR',
  'PPLT',
  'PALL',
  'GLTR',
  'USO',
  'BNO',
  'UNG',
  'CPER',
  'DBC',
  'PDBC',
  'FTGC',
  'WEAT',
  'DEFI',
  // crypto
  'IBIT',
  'FBTC',
  'BITB',
  'ARKB',
  'BTCO',
  'BTCW',
  'HODL',
  'EZBC',
  'GBTC',
  'ETHA',
  'ETHE',
  'ETHU',
  'BITX',
  'FSOL',
  // income / options
  'QYLD',
  'XYLD',
  'DIVO',
  'SVOL',
  'MSTY',
  'ULTY',
  'YMAX',
  // leveraged / inverse / volatility
  'TQQQ',
  'SQQQ',
  'PSQ',
  'SH',
  'SPXU',
  'TNA',
  'SOXL',
  'SOXS',
  'YINN',
  'YANG',
  'KORU',
  'TSLL',
  'NVDL',
  'MSTU',
  'MSTZ',
  'MUU',
  'MVLL',
  'INTW',
  'SNXX',
  'SKUU',
  'SKDD',
  'RAM',
  'SPCH',
  'UVXY',
  'VXX',
])

/**
 * Companies whose NAME trips the ETF phrase test (`s&p`, `msci`, `nasdaq` are index words) — the
 * ticker settles it the other way. S&P Global Inc., MSCI Inc., Nasdaq Inc.: Ondo files SPGI
 * "(Ondo Tokenized Stock)", xStocks "S&P Global xStock" read `fund/etf`.
 */
export const COMPANY_UNDERLYINGS: ReadonlySet<string> = new Set(['SPGI', 'MSCI', 'NDAQ'])

/**
 * ETF or stock for a tokenized equity: the ticker first (either list), the name only when the
 * ticker is unknown or on neither list — the fallback `isEtf` is the name rule the lists have
 * always used.
 */
export function isEtfUnderlying(
  underlying: string | undefined,
  name: string,
  isEtfName: (name: string) => boolean,
): boolean {
  const u = underlying?.toUpperCase()
  if (u && ETF_UNDERLYINGS.has(u)) return true
  if (u && COMPANY_UNDERLYINGS.has(u)) return false
  return isEtfName(name)
}

/**
 * The ticker of an `ishares-etf` row (a fund whose name says "iShares … ETF", tokenized by a
 * desk with no symbol rule of its own: Ondo rows whose name lost "(Ondo Tokenized" to
 * truncation, the "… rStock" / "… aStock" families, bare-ticker deployments). Taken ONLY when one
 * reading of the symbol — itself, without Ondo's `ON` suffix, without the `R` / `A` prefix the
 * name's "rStock" / "aStock" announces — is a known ETF: `RIVV` "iShares Core S&P 500 ETF
 * rStock" → IVV, `AGGON` → AGG, `ATLT` "… aStock" → TLT, `SGOV` → SGOV.
 */
export function isharesEtfTicker(name: string, symbol: string): string | undefined {
  const s = (symbol ?? '').trim().toUpperCase()
  const n = (name ?? '').trim()
  if (!s) return undefined
  const candidates = [s]
  if (/ON$/.test(s)) candidates.push(s.slice(0, -2))
  if (/\brstock\s*$/i.test(n) && s.startsWith('R')) candidates.push(s.slice(1))
  if (/\bastock\s*$/i.test(n) && s.startsWith('A')) candidates.push(s.slice(1))
  return candidates.find((c) => ETF_UNDERLYINGS.has(c))
}
