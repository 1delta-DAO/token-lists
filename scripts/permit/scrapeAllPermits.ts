import { scrapePermitsForTokens } from './scrape_permit'
import { ONE_DELTA_LISTS, accessListUnfiltered } from '../externalLists'
// @ts-ignore
import * as fs from 'fs'
// @ts-ignore
import * as path from 'path'
// @ts-ignore
import { fileURLToPath } from 'url'
import { Token } from './consts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PERMIT_OUTPUT_DIR = path.resolve(__dirname, '../permit-info')
const MAX_CONCURRENT_CHAINS = 5

if (!fs.existsSync(PERMIT_OUTPUT_DIR)) {
  fs.mkdirSync(PERMIT_OUTPUT_DIR, { recursive: true })
}

interface TokenListFile {
  chainId: string
  version: string
  list: { [address: string]: any }
  mainTokens?: string[]
  bridgeTokens?: string[]
}

interface ChainInfo {
  chainId: string
  url: string
  access: string
  isMap: boolean
  tokenData?: TokenListFile
}

// Get list of chains that actually have token lists available and fetch token data
async function getAvailableChains(): Promise<ChainInfo[]> {
  const availableChains: ChainInfo[] = []

  for (const tokenList of ONE_DELTA_LISTS) {
    try {
      const response = await fetch(tokenList.url)
      if (response.ok) {
        const chainId = tokenList.url.split('/').pop()?.replace('.json', '') || ''
        if (chainId) {
          console.log(`Fetching token data for chain ${chainId}...`)

          const rawData = await response.json()

          const tokens = accessListUnfiltered(rawData, tokenList.access || 'list', tokenList.isMap || false, false)

          if (!Array.isArray(tokens) || tokens.length === 0) {
            console.log(`No tokens found in token list for chain ${chainId}`)
            continue
          }

          const tokenMap: { [address: string]: any } = {}
          tokens.forEach((token: any) => {
            if (token.address) {
              tokenMap[token.address.toLowerCase()] = token
            }
          })

          const tokenData: TokenListFile = { chainId, version: '1.0.0', list: tokenMap }

          availableChains.push({
            chainId,
            url: tokenList.url,
            access: tokenList.access || 'list',
            isMap: tokenList.isMap || false,
            tokenData,
          })
        }
      } else {
        console.log(`No token list for ${tokenList.url.split('/').pop()}`)
      }
    } catch (error: any) {
      console.log(`Error checking ${tokenList.url.split('/').pop()}:`, error.message)
    }
  }

  console.log(`\nFound ${availableChains.length} chains with token lists`)
  return availableChains
}

async function processChainsInBatches(
  chains: ChainInfo[],
): Promise<{ chainId: string; success: boolean; permitCount: number }[]> {
  const results: { chainId: string; success: boolean; permitCount: number }[] = []

  for (let i = 0; i < chains.length; i += MAX_CONCURRENT_CHAINS) {
    const batch = chains.slice(i, i + MAX_CONCURRENT_CHAINS)
    console.log(`\n Processing batch ${Math.floor(i / MAX_CONCURRENT_CHAINS) + 1}`)

    const batchPromises = batch.map(async (chainInfo) => {
      try {
        const tokens: Token[] = chainInfo.tokenData ? (Object.values(chainInfo.tokenData.list) as Token[]) : []
        const permitMap = await scrapePermitsForTokens(tokens, chainInfo.chainId)

        const permitFilePath = path.join(PERMIT_OUTPUT_DIR, `${chainInfo.chainId}.permit.json`)

        if (Object.keys(permitMap).length === 0) {
          console.log(`No tokens with permit support found for chain ${chainInfo.chainId}`)
          const emptyResult = { ...chainInfo.tokenData, list: {} }
          fs.writeFileSync(permitFilePath, JSON.stringify(emptyResult, null, 2))
          return { chainId: chainInfo.chainId, success: true, permitCount: 0 }
        }

        const result = {
          ...chainInfo.tokenData,
          list: Object.keys(permitMap).reduce((acc, address) => {
            const token = chainInfo.tokenData!.list[address]
            if (token) {
              acc[address] = { ...token, permit: permitMap[address] }
            }
            return acc
          }, {} as any),
        }

        fs.writeFileSync(permitFilePath, JSON.stringify(result, null, 2))
        console.log(
          `Saved permit data for chain ${chainInfo.chainId}: ${Object.keys(permitMap).length} tokens with permit support`,
        )

        return { chainId: chainInfo.chainId, success: true, permitCount: Object.keys(permitMap).length }
      } catch (error) {
        console.error(`Error processing chain ${chainInfo.chainId}:`, error)
        return { chainId: chainInfo.chainId, success: false, permitCount: 0 }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

export async function scrapeAllPermits() {
  const availableChains = await getAvailableChains()

  if (availableChains.length === 0) {
    console.log('No chains with token lists found!')
    return
  }

  const results = await processChainsInBatches(availableChains)

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length

  console.log(`Successfully processed: ${successCount} chains`)
  console.log(`Errors: ${errorCount} chains`)

  if (errorCount > 0) {
    console.log('\nFailed chains:')
    results.filter((r) => !r.success).forEach((r) => console.log(`  - ${r.chainId}`))
  }
}

export function verifyPermitFiles(chainIds: string[]): void {
  console.log('\nVerifying permit files can be read by the application...')

  const permitFilePath = (chainId: string) => path.resolve(__dirname, `../../asset-lists/permit/${chainId}.permit.json`)

  let validFiles = 0
  let invalidFiles = 0

  for (const chainId of chainIds) {
    const filePath = permitFilePath(chainId)

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(content)

        if (parsed && typeof parsed === 'object' && parsed.list) {
          console.log(`Chain ${chainId}: Valid permit file (${Object.keys(parsed.list).length} tokens)`)
          validFiles++
        } else {
          console.log(`Chain ${chainId}: Invalid permit file format`)
          invalidFiles++
        }
      } catch (error: any) {
        console.log(`Chain ${chainId}: Failed to parse permit file - ${error.message}`)
        invalidFiles++
      }
    } else {
      console.log(`Chain ${chainId}: Permit file not found`)
      invalidFiles++
    }
  }

  console.log(`Verification results: ${validFiles} valid files, ${invalidFiles} invalid/missing files`)
}

scrapeAllPermits()
  .then(() => console.log('Done'))
  .catch((error) => {
    console.error(error)
    console.log('Error')
  })
