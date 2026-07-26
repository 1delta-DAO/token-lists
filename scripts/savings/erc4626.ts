/**
 * Minimal ABI for resolving a savings-wrapper's underlying on-chain.
 * `asset()` is the ERC-4626 getter (returns the underlying token address); `symbol()`
 * reads the underlying's ticker once we have that address. Both are `view`, so they can
 * be batched through `multicallRetryUniversal` with `allowFailure` — non-4626 wrappers
 * simply revert on `asset()` and fall back to the symbol heuristic.
 */
export const ERC4626_ABI = [
  {
    inputs: [],
    name: 'asset',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
