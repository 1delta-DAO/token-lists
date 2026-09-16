import { Chain } from '@1delta/chain-registry'

export const PRESET_SYMBOLS: { [ch: string | number]: string[] } = {
  [Chain.TAIKO_ALETHIA]: ['TAIKO'],
  [Chain.GNOSIS]: ['GNO', 'COW'],
  [Chain.HEMI_NETWORK]: ['HEMIBTC', 'USDC.E'],
  // Sonic's USDC (0x2921…) was Circle-upgraded to native: on-chain symbol is
  // `USDC` now, so the old `USDC.E` preset key matched nothing.
  [Chain.SONIC_MAINNET]: ['AXLETH', 'AXLUSDT', 'SOLVBTC'],
  [Chain.CORE_BLOCKCHAIN_MAINNET]: ['SOLVBTC.M', 'SOLVBTC.CORE'],
  [Chain.METIS_ANDROMEDA_MAINNET]: ['ARTMETIS', 'M.USDT'],
  [Chain.POLYGON_MAINNET]: ['HEMIBTC'],
  [Chain.MANTLE]: ['FBTC', 'METH', 'USDE'],
  [Chain.ARBITRUM_ONE]: ['ARB', 'USDE', 'EZETH'],
  [Chain.OP_MAINNET]: ['OP', 'SNX'],
  [Chain.BASE]: ['USDBC'],
  [Chain.MODE]: ['UNIBTC', 'SOLVBTC'],
  [Chain.FUEL]: ['FUEL', 'EZETH', 'PZETH'],
  [Chain.SCROLL]: ['SCR'],
  [Chain.KATANA]: ['VBETH', 'VBWBTC', 'VBUSDC', 'VBUSDT'],
}
