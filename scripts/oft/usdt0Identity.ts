import { lookupOft } from './oftMap'

/**
 * Tether's USDT0 deployments, keyed chainId -> token address (lower-case).
 * Source: https://docs.usdt0.to/technical-documentation/deployments, every
 * address cross-checked against a `usdt0` route in `oft.json`.
 *
 * The external lists name the same token four ways — `USDT0`, `USD₮0`, and
 * `USDT` / "Tether USD" on the chains where USDT0 upgraded the legacy USDT
 * contract in place (Arbitrum, Polygon) or where a source just copied the
 * Ethereum label (Monad, Berachain). The contracts themselves all answer
 * `USDT0` / `USD₮0`, so a search for "USDT0" missed half of them. Every row
 * here gets ONE identity, ASCII, before the group is chosen.
 *
 * Only the label changes: the assetGroup stays `USDT` (GROUP_TO_GROUP_MAPPER
 * and the OFT mesh already put every deployment there), so prices and yield
 * joins are untouched.
 *
 * Deliberately ABSENT: Ethereum `0xdac17f95…` and Celo `0x48065fbb…` — both are
 * Tether's native USDT behind a USDT0 adapter and answer `USDT` / `USD₮`
 * on-chain. Stargate's hydra "USDT0" (`0x102d758f…` on Base/Soneium/Swell/Mode)
 * is not Tether's token and has no USDT0 peer.
 */
export const USDT0_DEPLOYMENTS: { [chainId: string]: string } = {
  '10': '0x01bff41798a0bcf287b996046ca68b395dbc1071', // Optimism
  '14': '0xe7cd86e13ac4309349f30b3435a9d337750fc82d', // Flare
  '30': '0x779ded0c9e1022225f8e0630b35a9b54be713736', // Rootstock
  '130': '0x9151434b16b9763660705744891fa906f660ecc5', // Unichain
  '137': '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // Polygon (upgraded legacy USDT)
  '143': '0xe7cd86e13ac4309349f30b3435a9d337750fc82d', // Monad
  '196': '0x779ded0c9e1022225f8e0630b35a9b54be713736', // X Layer
  '988': '0x779ded0c9e1022225f8e0630b35a9b54be713736', // Stable (ERC-20 view of the gas coin)
  '999': '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', // HyperEVM
  '1030': '0xaf37e8b6c9ed7f6318979f56fc287d76c30847ff', // Conflux eSpace
  '1329': '0x9151434b16b9763660705744891fa906f660ecc5', // Sei
  '2818': '0xe7cd86e13ac4309349f30b3435a9d337750fc82d', // Morph
  '4217': '0x20c00000000000000000000014f22ca97301eb73', // Tempo
  '4326': '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', // MegaETH
  '5000': '0x779ded0c9e1022225f8e0630b35a9b54be713736', // Mantle
  '9745': '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', // Plasma
  '21000000': '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', // Corn (no longer on the docs page)
  '42161': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // Arbitrum (upgraded legacy USDT)
  '57073': '0x0200c29006150606b650577bbe7b6248f58470c1', // Ink
  '80094': '0x779ded0c9e1022225f8e0630b35a9b54be713736', // Berachain
}

export const USDT0_IDENTITY = { name: 'USDT0', symbol: 'USDT0' } as const

export function isUsdt0Deployment(chainId: string, address: string): boolean {
  return USDT0_DEPLOYMENTS[chainId] === address.toLowerCase()
}

// A table entry without a `usdt0` OFT route is a typo or a retired deployment:
// say so loudly instead of relabelling an unrelated token.
for (const [chainId, address] of Object.entries(USDT0_DEPLOYMENTS)) {
  const oft = lookupOft(chainId, address)
  if (oft && !oft.routes.some((r) => r.oapp === 'usdt0'))
    console.warn(`[usdt0] ${chainId}:${address} has OFT routes but none is usdt0 — check USDT0_DEPLOYMENTS`)
}
