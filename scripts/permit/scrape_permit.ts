import {
  createPublicClient,
  http,
  Address,
  BaseError,
  parseAbi,
  keccak256,
  encodeAbiParameters,
  MulticallResults,
} from 'viem'
// @ts-ignore-next-line
import * as fs from 'fs'
import { Chain } from '@1delta/chain-registry'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import {
  EIP712_DOMAIN_TYPEHASH,
  hashedVersion1,
  hashedVersion2,
  CHUNK_SIZE,
  Token,
  TokenListFile,
  TokenWithPermits,
  EIP2612_PERMIT_ABI,
  DAI_PERMIT_ABI,
} from './consts'
import { chunk } from './utils'
import { checkPermit, PermitSupportStatus } from './permitValidator'
import { getEvmChain } from '@1delta/providers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const inputFilePath = (chainId: string) =>
  `https://raw.githubusercontent.com/1delta-DAO/token-lists/main/${chainId}.json`
const outputFilePath = (chainId: string) => path.resolve(__dirname, `../permit-info/${chainId}.permit.json`)

async function checkRpcHealth(client: any, chainId: string): Promise<boolean> {
  try {
    const blockNumber = await client.getBlockNumber()

    if (blockNumber && blockNumber > 0n) {
      return true
    } else {
      return false
    }
  } catch {
    return false
  }
}

async function filterForPermits(
  tokens: Token[],
  chainId: string,
  client: ReturnType<typeof createPublicClient>,
): Promise<TokenWithPermits[]> {
  const filtered: Partial<TokenWithPermits>[] = []
  const chunks: Token[][] = chunk(tokens, CHUNK_SIZE)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const calls = chunk.flatMap((token) => [
      {
        address: token.address,
        abi: EIP2612_PERMIT_ABI,
        functionName: 'permit',
        args: [
          '0x0000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000002',
          0n,
          0n,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ] as const,
      },
      {
        address: token.address,
        abi: DAI_PERMIT_ABI,
        functionName: 'permit',
        args: [
          '0x0000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000002',
          0n,
          0n,
          true,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ] as const,
      },
    ])

    try {
      const multicallResults: MulticallResults<any[]> = await client.multicall({
        contracts: calls,
        allowFailure: true,
      })

      for (let j = 0; j < multicallResults.length; j += 2) {
        const token = chunk[Math.floor(j / 2)]
        const eip2612Result = multicallResults[j]
        const daiResult = multicallResults[j + 1]

        if (
          eip2612Result.status === 'failure' &&
          eip2612Result.error &&
          checkExpiry(eip2612Result.error.message.toLowerCase())
        ) {
          filtered.push({ token, type: 'EIP2612' })
        } else if (
          daiResult.status === 'failure' &&
          daiResult.error &&
          checkExpiry(daiResult.error.message.toLowerCase())
        ) {
          filtered.push({ token, type: 'DAI' })
        }
      }
      console.log(`[${i + 1}/${chunks.length}] Processed chunk for ${chainId}`)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } catch (error: any) {
      console.error(
        `\nFailed to process chunk ${i + 1}. Error:`,
        error instanceof BaseError ? error.shortMessage : error.message,
      )
    }
  }

  if (filtered.length === 0) {
    return []
  }
  const tokensWithVersion = await getDomainSeparatorVersion(filtered, chainId, client)
  const permitResults = await checkPermit(client, tokensWithVersion, getEvmChain(chainId) as any)
  return tokensWithVersion
    .map((token) => ({
      ...token,
      status: permitResults.find((r) => r.tokenAddress === token.token.address)?.status,
      version: permitResults.find((r) => r.tokenAddress === token.token.address)?.version,
    }))
    .filter((t) => t.status === PermitSupportStatus.Supported)
}

function checkExpiry(msg: string) {
  return msg.includes('expired') || msg.includes('deadline') || msg.includes('expiry')
}

async function getDomainSeparatorVersion(
  tokens: Partial<TokenWithPermits>[],
  chainId: string,
  client: ReturnType<typeof createPublicClient>,
): Promise<TokenWithPermits[]> {
  const validTokens = tokens.filter((t) => t.token?.address)

  const chunks: Partial<TokenWithPermits>[][] = []
  for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
    chunks.push(validTokens.slice(i, i + CHUNK_SIZE))
  }

  const multicallPromises = chunks.map((chunk) => {
    const contracts = chunk.flatMap((token) => [
      {
        address: token.token!.address as Address,
        abi: parseAbi(['function version() view returns (string)']),
        functionName: 'version',
      },
      {
        address: token.token!.address as Address,
        abi: parseAbi(['function name() view returns (string)']),
        functionName: 'name',
      },
      {
        address: token.token!.address as Address,
        abi: parseAbi(['function DOMAIN_SEPARATOR() view returns (bytes32)']),
        functionName: 'DOMAIN_SEPARATOR',
      },
      {
        address: token.token!.address as Address,
        abi: parseAbi(['function implementation() view returns (address)']),
        functionName: 'implementation',
      },
    ])
    return client.multicall({ contracts, allowFailure: true })
  })

  const processedResults: TokenWithPermits[] = []

  try {
    const multicallResults = await Promise.all(multicallPromises)

    multicallResults.forEach((multicallResult, chunkIndex) => {
      const chunk = chunks[chunkIndex]
      chunk.forEach((token, tokenIndex) => {
        const resultIndex = tokenIndex * 4
        const versionResult = multicallResult[resultIndex]
        const nameResult = multicallResult[resultIndex + 1]
        const domainSeparatorResult = multicallResult[resultIndex + 2]
        const implementationResult = multicallResult[resultIndex + 3]

        let version: '1' | '2' | undefined
        let name: string | undefined
        let domainSeparator: `0x${string}` | undefined
        let implementation: Address | undefined

        if (versionResult?.status === 'success') {
          const v = versionResult.result as string
          if (v === '1' || v === '2') {
            version = v
          }
        }
        if (nameResult?.status === 'success') {
          name = nameResult.result as string
        }
        if (domainSeparatorResult?.status === 'success') {
          domainSeparator = domainSeparatorResult.result as `0x${string}`
        }
        if (implementationResult?.status === 'success') {
          const impl = implementationResult.result as Address
          if (impl && impl !== '0x0000000000000000000000000000000000000000') {
            implementation = impl
          }
        }

        if (version || (name && domainSeparator)) {
          processedResults.push({
            ...(token as TokenWithPermits),
            version,
            name: name!,
            domainSeparator: domainSeparator!,
            implementation,
          })
        }
      })
    })

    processedResults.forEach((token) => {
      if (!token.version && token.name && token.domainSeparator) {
        // acc. to https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.4.0/contracts/utils/cryptography/EIP712.sol

        const hashedName = keccak256(new TextEncoder().encode(token.name))

        const v1DomainHash = getDomainHash(hashedName, hashedVersion1, chainId, token.token.address)
        const v2DomainHash = getDomainHash(hashedName, hashedVersion2, chainId, token.token.address)

        if (token.domainSeparator.toLowerCase() === v1DomainHash.toLowerCase()) {
          token.version = '1'
        } else if (token.domainSeparator.toLowerCase() === v2DomainHash.toLowerCase()) {
          token.version = '2'
        } else {
          console.warn('no version or name or domain separator', {
            v1DomainHash,
            v2DomainHash,
            token,
          })
        }
      }
    })

    return processedResults
  } catch (error) {
    console.error('Error in getDomainSeparatorVersion:', error)
    return []
  }
}

function getDomainHash(name: `0x${string}`, version: `0x${string}`, chainId: string, address: Address) {
  const encoded = encodeAbiParameters(
    [
      { name: 'typeHash', type: 'bytes32' },
      { name: 'name', type: 'bytes32' },
      { name: 'version', type: 'bytes32' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    [EIP712_DOMAIN_TYPEHASH, name, version, BigInt(chainId), address],
  )
  return keccak256(encoded)
}

export async function scrapePermits(chainId: string, startIndex?: number, endIndex?: number) {
  if (!chainId || !getEvmChain(chainId)) {
    console.error('chainId is required')
    return
  }

  const chain = getEvmChain(chainId)
  const rpcUrl = chain?.rpcUrls?.default?.http?.[0]
  if (!rpcUrl) {
    console.error(`No rpc url found for chain ${chainId}`)
    return
  }

  const inPath = inputFilePath(chainId)
  const outPath = outputFilePath(chainId)

  console.log(`Starting permit check for chain ${chainId} using ${rpcUrl}`)

  const fileContent = inPath.startsWith('https')
    ? await fetch(inPath).then(async (s) => {
        return await s.json()
      })
    : fs.readFileSync(inPath, 'utf-8')
  const tokenList: TokenListFile = fileContent
  const tokens = Object.values(tokenList.list)

  const client = createPublicClient({
    chain: getEvmChain(chainId) as any,
    transport: http(rpcUrl),
  })

  const isRpcHealthy = await checkRpcHealth(client as any, chainId)
  if (!isRpcHealthy) {
    console.log(`Skipping chain ${chainId} due to rpc error`)
    return
  }

  const supportedTokens = await filterForPermits(
    tokens.slice(startIndex || 0, endIndex || tokens.length),
    chainId,
    client as any,
  )

  const result = {
    ...tokenList,
    list: supportedTokens.reduce((acc, token) => {
      // @ts-ignore
      acc[token.token.address.toLowerCase()] = token
      return acc
    }, {}),
  }

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
  console.log(`found ${supportedTokens.length} tokens with permit support`)
}

export async function scrapePermitsForTokens(
  tokens: Token[],
  chainId: string,
  options?: {
    client?: any
    startIndex?: number
    endIndex?: number
  },
): Promise<{ [address: string]: { type: string; version: string } }> {
  if (!chainId || !getEvmChain(chainId)) {
    throw new Error(`Invalid chainId: ${chainId}`)
  }

  const chain = getEvmChain(chainId)
  const rpcUrl = chain?.rpcUrls?.default?.http?.[0]
  if (!rpcUrl) {
    throw new Error(`No rpc url found for chain ${chainId}`)
  }

  const client =
    options?.client ||
    createPublicClient({
      chain: getEvmChain(chainId) as any,
      transport: http(rpcUrl),
    })

  // Check RPC health before proceeding
  const isRpcHealthy = await checkRpcHealth(client as any, chainId)
  if (!isRpcHealthy) {
    console.log(`⚠️  Skipping chain ${chainId} due to RPC health check failure`)
    return {}
  }

  const startIndex = options?.startIndex || 0
  const endIndex = options?.endIndex || tokens.length

  const tokensToProcess = tokens.slice(startIndex, endIndex)

  const supportedTokens = await filterForPermits(tokensToProcess, chainId, client)

  const permitMap: { [address: string]: { type: string; version: string } } = {}

  supportedTokens.forEach((tokenWithPermit) => {
    const address = tokenWithPermit.token.address.toLowerCase()
    permitMap[address] = {
      type: tokenWithPermit.type,
      version: tokenWithPermit.version || '1', // TODO: defaults to 1
    }
  })

  return permitMap
}
const chains = [
  // Chain.HEMI_NETWORK,
  // Chain.ETHEREUM_MAINNET,
  // Chain.BASE,
  // Chain.ARBITRUM_ONE,
  // Chain.UNICHAIN,
  // Chain.HYPEREVM,
  // Chain.KATANA,
  // Chain.KAIA_MAINNET,
  // Chain.TAIKO_ALETHIA,
  // Chain.SONIC_MAINNET,
  // Chain.SCROLL,
  // Chain.LINEA,
  Chain.MONAD_MAINNET,
]

Promise.all(
  chains.map((c) =>
    scrapePermits(c)
      .then(() => {
        console.log('Done')
      })
      .catch((error) => {
        console.error(error)
      }),
  ),
)
