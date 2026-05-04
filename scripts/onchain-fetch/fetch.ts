import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { multicallRetryUniversal } from '@1delta/providers'
import { ERC20ABI } from '../pendle/erc20'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

type Coins = { [chainId: string]: string[] }

interface TokenEntry {
  chainId: string
  decimals: number
  name: string
  address: string
  symbol: string
  assetGroup: string
  currencyId: string
}

interface TokenListFile {
  chainId: string
  version: string
  list: { [address: string]: any }
}

function isValidField(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (v === '0x') return false
  if (typeof v === 'string' && v.length === 0) return false
  if (typeof v === 'number' && !Number.isFinite(v)) return false
  return true
}

async function fetchTokens(
  chainId: string,
  addrs: string[],
): Promise<{ tokens: TokenEntry[]; failed: string[] }> {
  const calls = addrs
    .map((addr) => [
      { address: addr, name: 'name', args: [] },
      { address: addr, name: 'symbol', args: [] },
      { address: addr, name: 'decimals', args: [] },
    ])
    .flat()

  const datas = (await multicallRetryUniversal({
    chain: chainId,
    calls,
    abi: ERC20ABI,
    batchSize: 40,
    allowFailure: true,
    logErrors: true,
  })) as any[]

  const tokens: TokenEntry[] = []
  const failed: string[] = []

  for (let i = 0; i < addrs.length; i++) {
    const addr = addrs[i]
    const name = datas[i * 3] as string
    const symbol = datas[i * 3 + 1] as string
    const decimals = datas[i * 3 + 2] as number

    if (!isValidField(name) || !isValidField(symbol) || !isValidField(decimals)) {
      failed.push(addr)
      continue
    }

    const lcAddr = addr.toLowerCase()
    tokens.push({
      chainId,
      decimals: Number(decimals),
      name,
      address: lcAddr,
      symbol,
      assetGroup: `${name}::${symbol}`,
      currencyId: `${name}::${symbol}`,
    })
  }

  return { tokens, failed }
}

function tokenListPath(chainId: string) {
  return path.join(repoRoot, `${chainId}.json`)
}

function readTokenList(chainId: string): TokenListFile {
  const p = tokenListPath(chainId)
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  }
  return { chainId, version: '0', list: {} }
}

function writeTokenList(chainId: string, data: TokenListFile) {
  fs.writeFileSync(tokenListPath(chainId), JSON.stringify(data, null, 2) + '\n')
}

async function main() {
  const coinsPath = path.join(__dirname, 'coins.json')
  const coins: Coins = JSON.parse(fs.readFileSync(coinsPath, 'utf-8'))

  for (const chainId of Object.keys(coins)) {
    const addrs = coins[chainId].map((a) => a.toLowerCase())
    console.log(`\nChain ${chainId}: fetching ${addrs.length} tokens on-chain...`)

    const listFile = readTokenList(chainId)

    const missing = addrs.filter((a) => !listFile.list[a])
    if (missing.length === 0) {
      console.log(`Chain ${chainId}: all ${addrs.length} tokens already in list — skipping`)
      continue
    }
    console.log(`Chain ${chainId}: ${missing.length} not in list, fetching metadata...`)

    const { tokens, failed } = await fetchTokens(chainId, missing)

    let added = 0
    for (const t of tokens) {
      if (!listFile.list[t.address]) {
        listFile.list[t.address] = t
        added += 1
      }
    }

    writeTokenList(chainId, listFile)
    console.log(
      `Chain ${chainId}: added ${added} new tokens to ${chainId}.json` +
        (failed.length > 0 ? `, skipped ${failed.length} failed: ${failed.join(', ')}` : ''),
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
