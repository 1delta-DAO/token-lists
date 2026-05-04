import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { getEvmClient } from '@1delta/providers'
import type { Address } from 'viem'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const coinsPath = path.join(__dirname, 'coins.json')

// LpSugar deployments (https://github.com/velodrome-finance/sugar/tree/main/deployments)
const SUGAR_DEPLOYMENTS: Record<string, Address> = {
  '10': '0x347512180804A8B40AA7525AE932a31198F074aA',
  '8453': '0xD1F6d32b89ADE1d4Efc415CB4e7d32fadCF692c0',
  '42220': '0xCA10F2EEfcCC3cDAEd50113227132037718947Da',
  '252': '0xA154A8975d38AA16BDCBC540acC3e542Da5f4D18',
  '57073': '0xDd1399Df41d012F58cf2035A79839892BC0A2A25',
  '1135': '0xa3a6F881A1Db3d5DA0F7c10659239F9FAdF74C5e',
  '1750': '0xa916A76b052AcD3b0FF6Cc76b55602fba456a85C',
  '34443': '0x217265DE6FAC8E395489456afC8199f5F26023C0',
  '1868': '0x054286B43797791A55814509848Ad92dD3E9AC9E',
  '5330': '0xDd1399Df41d012F58cf2035A79839892BC0A2A25',
  '1923': '0xc703cDA5468bE663e4546C495E1D0E503082A8e0',
  '130': '0x907a3a1bA965C223E683B427E253B1a6BB37370F',
}

// Token struct fields, both current and legacy (without `emerging`)
const TOKEN_TUPLE = [
  { name: 'token_address', type: 'address' },
  { name: 'symbol', type: 'string' },
  { name: 'decimals', type: 'uint8' },
  { name: 'account_balance', type: 'uint256' },
  { name: 'listed', type: 'bool' },
  { name: 'emerging', type: 'bool' },
] as const

const TOKEN_TUPLE_LEGACY = [
  { name: 'token_address', type: 'address' },
  { name: 'symbol', type: 'string' },
  { name: 'decimals', type: 'uint8' },
  { name: 'account_balance', type: 'uint256' },
  { name: 'listed', type: 'bool' },
] as const

// Current LpSugar: tokens(uint256,uint256,address,address[])
const ABI_CURRENT = [
  {
    type: 'function',
    name: 'tokens',
    stateMutability: 'view',
    inputs: [
      { name: '_limit', type: 'uint256' },
      { name: '_offset', type: 'uint256' },
      { name: '_account', type: 'address' },
      { name: '_addresses', type: 'address[]' },
    ],
    outputs: [{ type: 'tuple[]', components: TOKEN_TUPLE }],
  },
] as const

const ABI_CURRENT_LEGACY_TOKEN = [
  {
    type: 'function',
    name: 'tokens',
    stateMutability: 'view',
    inputs: [
      { name: '_limit', type: 'uint256' },
      { name: '_offset', type: 'uint256' },
      { name: '_account', type: 'address' },
      { name: '_addresses', type: 'address[]' },
    ],
    outputs: [{ type: 'tuple[]', components: TOKEN_TUPLE_LEGACY }],
  },
] as const

// Older deployments: tokens(uint256,uint256,address,address,address[])
const ABI_LEGACY_ORACLE = [
  {
    type: 'function',
    name: 'tokens',
    stateMutability: 'view',
    inputs: [
      { name: '_limit', type: 'uint256' },
      { name: '_offset', type: 'uint256' },
      { name: '_account', type: 'address' },
      { name: '_oracle', type: 'address' },
      { name: '_oracle_connectors', type: 'address[]' },
    ],
    outputs: [{ type: 'tuple[]', components: TOKEN_TUPLE_LEGACY }],
  },
] as const

const ZERO: Address = '0x0000000000000000000000000000000000000000'
const PAGE_LIMIT = 500n

type SugarToken = { token_address: Address }

type Variant = {
  abi: any
  args: readonly unknown[]
}

const buildVariants = (offset: bigint): Variant[] => [
  { abi: ABI_CURRENT, args: [PAGE_LIMIT, offset, ZERO, [] as Address[]] },
  { abi: ABI_CURRENT_LEGACY_TOKEN, args: [PAGE_LIMIT, offset, ZERO, [] as Address[]] },
  { abi: ABI_LEGACY_ORACLE, args: [PAGE_LIMIT, offset, ZERO, ZERO, [] as Address[]] },
]

async function callPage(
  client: ReturnType<typeof getEvmClient>,
  sugar: Address,
  offset: bigint,
  preferredIdx: number,
): Promise<{ page: readonly SugarToken[]; variantIdx: number } | null> {
  const variants = buildVariants(offset)
  // try preferred first, then the rest
  const order = [preferredIdx, ...variants.map((_, i) => i).filter((i) => i !== preferredIdx)]
  let lastErr: any
  for (const i of order) {
    try {
      const page = (await client.readContract({
        address: sugar,
        abi: variants[i].abi,
        functionName: 'tokens',
        args: variants[i].args,
      })) as readonly SugarToken[]
      return { page, variantIdx: i }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

async function harvest(chainId: string, sugar: Address): Promise<string[]> {
  let client: ReturnType<typeof getEvmClient>
  try {
    client = getEvmClient(chainId)
  } catch (e: any) {
    console.warn(`  chain ${chainId}: skipping — no EVM client (${e.message ?? e})`)
    return []
  }

  const out = new Set<string>()
  let offset = 0n
  let preferredIdx = 0

  while (true) {
    let result
    try {
      result = await callPage(client, sugar, offset, preferredIdx)
      if (!result) break
    } catch (e: any) {
      console.warn(`  chain ${chainId} offset ${offset}: ${e.shortMessage ?? e.message ?? e}`)
      break
    }
    preferredIdx = result.variantIdx

    for (const t of result.page) {
      if (t.token_address && t.token_address !== ZERO) {
        out.add(t.token_address.toLowerCase())
      }
    }
    console.log(`  chain ${chainId} offset ${offset}: +${result.page.length} (abi#${result.variantIdx})`)
    if (result.page.length < Number(PAGE_LIMIT)) break
    offset += PAGE_LIMIT
  }
  return [...out]
}

async function main() {
  const coins: Record<string, string[]> = fs.existsSync(coinsPath)
    ? JSON.parse(fs.readFileSync(coinsPath, 'utf-8'))
    : {}

  for (const [chainId, sugar] of Object.entries(SUGAR_DEPLOYMENTS)) {
    console.log(`\nSugar harvest chain ${chainId} (${sugar})`)
    let addrs: string[] = []
    try {
      addrs = await harvest(chainId, sugar)
    } catch (e: any) {
      console.warn(`Chain ${chainId}: harvest failed — ${e.message ?? e}`)
      continue
    }
    if (addrs.length === 0) {
      console.log(`Chain ${chainId}: no tokens harvested`)
      continue
    }

    const existing = new Set((coins[chainId] ?? []).map((a) => a.toLowerCase()))
    const before = existing.size
    for (const a of addrs) existing.add(a)
    coins[chainId] = [...existing].sort()
    console.log(`Chain ${chainId}: ${addrs.length} from sugar, ${coins[chainId].length - before} new`)
  }

  fs.writeFileSync(coinsPath, JSON.stringify(coins, null, 2) + '\n')
  console.log(`\nWrote ${coinsPath}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
