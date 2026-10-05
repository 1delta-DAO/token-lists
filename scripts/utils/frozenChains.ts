// @ts-ignore-next-line
import * as fs from 'fs'

/**
 * Chains whose records are FROZEN: we stop fetching and updating anything
 * there, but every record we already publish stays, unchanged — the chain's
 * list, its main tokens, its native currency, its OFT routes and the corridors
 * other chains have into it. Bridge and cross-chain records stay complete,
 * because a frozen chain is still a real place that funds can sit in and leave
 * from; it is just no longer worth an RPC call or a third-party list.
 *
 * What a generator does with a frozen chain:
 * - never queries an RPC ON it and never reads a third-party list FOR it;
 * - carries its existing records forward from the last published output
 *   (`carryForwardFrozen`), or, for the token map, re-reads them from our own
 *   published list only (`generateTokenMap.script.ts`);
 * - may still read other chains' state ABOUT it (e.g. an Ethereum OFT's
 *   `peers(blastEid)`), since that is a read on a live chain.
 *
 * - 81457 Blast: frozen 2026-10-04 — the chain is shutting down (announced
 *   2026-10-02; withdrawals via the normal bridge UI end 2026-10-26).
 */
export const FROZEN_CHAINS: ReadonlySet<string> = new Set(['81457'])

/**
 * The wrapped native of each frozen chain. `@1delta/wnative` drops a chain
 * once nothing we serve runs on it, but a frozen list still carries its
 * wrapped native (tagged `props.wnative`, in `mainTokens`, the base of the
 * native row), so the token map resolves it here instead of from that package.
 */
export const FROZEN_WNATIVE: { readonly [chainId: string]: string } = {
  '81457': '0x4300000000000000000000000000000000000004', // Blast WETH
}

export const isFrozenChain = (chainId: string | number | undefined | null): boolean =>
  chainId !== undefined && chainId !== null && FROZEN_CHAINS.has(String(chainId))

/**
 * Copy every frozen chain's entry of a chain-keyed output from the previous
 * file into `out`, so a regeneration that no longer reads the chain does not
 * delete what it published. A missing or unreadable previous file carries
 * nothing.
 */
export function carryForwardFrozen<T>(previousFile: string, out: { [chainId: string]: T }): void {
  let prev: { [chainId: string]: T } | undefined
  try {
    prev = JSON.parse(fs.readFileSync(previousFile, 'utf8'))
  } catch {
    return
  }
  for (const chainId of FROZEN_CHAINS) if (prev?.[chainId] !== undefined) out[chainId] = prev[chainId]
}
