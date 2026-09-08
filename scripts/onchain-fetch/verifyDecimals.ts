/**
 * Repair `decimals` in a chain's token list against the chain itself.
 *
 * Exists because a source list can INVENT the field. `PHAROS_SOCIALSCAN_LIST`
 * in `externalLists.ts` is the case: socialscan's token response carries no
 * `decimals`, and the generator drops any entry whose `decimals` is falsy
 * (`generateTokenMap.script.ts`, the `tokenInList.decimals` guard) — so the
 * adapter has to supply a number for the token to exist at all, and it supplies
 * `18`. That is right for most ERC-20s and catastrophically wrong for the rest:
 * on Pharos it put USDC, USDC.e and zProsUSDC (all 6) and BitFi's bfBTC (8) at
 * 18, i.e. every balance and price on those rows off by 10^12 / 10^10.
 *
 * The invented default cannot simply be removed — that would delete the whole
 * chain from the lists. So the list stays a DISCOVERY source and this pass is
 * the authority on the number, which is the same division of labour
 * `sugar.ts` → `fetch.ts` already uses for addresses.
 *
 * Unlike `fetch.ts` this is CORRECTIVE, not additive: it rewrites entries that
 * are already present. It only ever touches `decimals`, and only when the chain
 * answers a usable value — an address that reverts (not an ERC-20, or a dead
 * proxy) is reported and left exactly as it was.
 *
 *   npx tsx onchain-fetch/verifyDecimals.ts            # DECIMALS_UNVERIFIED_CHAINS
 *   npx tsx onchain-fetch/verifyDecimals.ts 1672 239   # explicit chain ids
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { multicallRetryUniversal } from '@1delta/providers'
import { ERC20ABI } from '../pendle/erc20'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

/**
 * Chains whose source list supplies a GUESSED `decimals` for every token, so
 * the whole list needs re-reading rather than a spot check.
 *
 * Add a chain here the moment you give its adapter a hardcoded `decimals` —
 * the guess and the repair belong to the same change, or the chain ships with
 * silently mis-scaled balances until someone notices a price.
 */
export const DECIMALS_UNVERIFIED_CHAINS = ['1672']

interface TokenListFile {
  chainId: string
  version: string
  list: { [address: string]: any }
}

const listPath = (chainId: string) => path.join(repoRoot, `${chainId}.json`)

async function verifyChain(chainId: string): Promise<void> {
  const p = listPath(chainId)
  if (!fs.existsSync(p)) {
    console.log(`Chain ${chainId}: no ${chainId}.json — skipping`)
    return
  }
  const file: TokenListFile = JSON.parse(fs.readFileSync(p, 'utf-8'))
  const addrs = Object.keys(file.list)
  if (addrs.length === 0) return

  console.log(`\nChain ${chainId}: verifying decimals for ${addrs.length} tokens...`)
  const results = (await multicallRetryUniversal({
    chain: chainId,
    calls: addrs.map((address) => ({ address, name: 'decimals', args: [] })),
    abi: ERC20ABI,
    batchSize: 40,
    allowFailure: true,
    logErrors: false,
  })) as any[]

  const fixed: string[] = []
  const unreadable: string[] = []
  for (let i = 0; i < addrs.length; i++) {
    const onChain = results[i]
    // `undefined`/`null` is a failed call, never a real answer. `0` IS a legal
    // decimals value, so it must not be filtered out with the failures.
    if (onChain === undefined || onChain === null) {
      unreadable.push(addrs[i])
      continue
    }
    const dec = Number(onChain)
    if (!Number.isFinite(dec)) {
      unreadable.push(addrs[i])
      continue
    }
    const entry = file.list[addrs[i]]
    if (Number(entry.decimals) !== dec) {
      fixed.push(`${entry.symbol ?? addrs[i]} ${entry.decimals} -> ${dec}`)
      entry.decimals = dec
    }
  }

  if (fixed.length > 0) fs.writeFileSync(p, JSON.stringify(file, null, 2) + '\n')
  console.log(
    `Chain ${chainId}: corrected ${fixed.length}, unreadable ${unreadable.length}` +
      (fixed.length ? `\n  ${fixed.join('\n  ')}` : ''),
  )
  if (unreadable.length > 0) {
    console.log(`  unreadable (left untouched): ${unreadable.slice(0, 20).join(', ')}${unreadable.length > 20 ? ', …' : ''}`)
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const chains = args.length > 0 ? args : DECIMALS_UNVERIFIED_CHAINS
  for (const c of chains) await verifyChain(c)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
