import { createPublicClient, createWalletClient, http, keccak256, parseUnits, type Address, type Chain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { DAI_PERMIT_ABI, EIP2612_PERMIT_ABI, TokenWithPermits } from './consts'
import { chunk } from './utils'

export enum PermitSupportStatus {
  Supported = 'supported',
  Unsupported = 'unsupported',
  Unknown = 'unknown',
  Failed = 'failed',
}

export interface PermitSupportResult {
  tokenAddress: Address
  status: PermitSupportStatus
  version: '1' | '2' | undefined
}

const ownerAccount = privateKeyToAccount(keccak256(new TextEncoder().encode('Account 1')))

const spenderAddress: Address = '0x1de17a0000000000000000000000000000000000'

function splitSignature(signature: `0x${string}`) {
  const r = `0x${signature.slice(2, 66)}` as const
  const s = `0x${signature.slice(66, 130)}` as const
  const v = parseInt(signature.slice(130, 132), 16)
  return { v, r, s }
}

export async function checkPermit(
  client: ReturnType<typeof createPublicClient>,
  tokens: TokenWithPermits[],
  chain: Chain,
  chunkSize: number = 100,
) {
  const walletClient = createWalletClient({ account: ownerAccount, chain, transport: http(client.transport.url) })

  const tokenChunks = chunk(tokens, chunkSize)
  let allResults: PermitSupportResult[] = []

  for (const tokenChunk of tokenChunks) {
    try {
      const multicallContracts: any[] = []
      const tokenCallMappings: { tokenAddress: Address; callCount: number }[] = []

      for (const token of tokenChunk) {
        let callCountForToken = 0
        const permitAmount = parseUnits('1', token.token.decimals)
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour

        const verifyingContract = token.implementation ?? token.beacon ?? token.token.address

        // DAI style permit
        if (token.type === 'DAI' && (token.version === '1' || !token.version)) {
          const domainV1 = { name: token.name, version: '1', chainId: chain.id, verifyingContract: verifyingContract }
          const typesV1 = {
            Permit: [
              { name: 'holder', type: 'address' },
              { name: 'spender', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'expiry', type: 'uint256' },
              { name: 'allowed', type: 'bool' },
            ],
          }
          const signatureV1 = await walletClient.signTypedData({
            account: ownerAccount,
            domain: domainV1,
            types: typesV1,
            primaryType: 'Permit',
            message: {
              holder: ownerAccount.address,
              spender: spenderAddress,
              nonce: 0n,
              expiry: deadline,
              allowed: true,
            },
          })
          const { v, r, s } = splitSignature(signatureV1)

          multicallContracts.push(
            {
              address: token.token.address,
              abi: DAI_PERMIT_ABI,
              functionName: 'permit',
              args: [ownerAccount.address, spenderAddress, 0n, deadline, true, v, r, s],
            },
            {
              address: token.token.address,
              abi: DAI_PERMIT_ABI,
              functionName: 'allowance',
              args: [ownerAccount.address, spenderAddress],
            },
          )
          callCountForToken += 2
        }

        // EIP-2612 permit
        if (token.type === 'EIP2612') {
          if (token.version === '1' || !token.version) {
            const domainV1 = { name: token.name, version: '1', chainId: chain.id, verifyingContract: verifyingContract }
            const typesV1 = {
              Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
              ],
            }
            const signatureV1 = await walletClient.signTypedData({
              account: ownerAccount,
              domain: domainV1,
              types: typesV1,
              primaryType: 'Permit',
              message: {
                owner: ownerAccount.address,
                spender: spenderAddress,
                value: permitAmount,
                nonce: 0n,
                deadline: deadline,
              },
            })
            const { v, r, s } = splitSignature(signatureV1)
            multicallContracts.push(
              {
                address: token.token.address,
                abi: EIP2612_PERMIT_ABI,
                functionName: 'permit',
                args: [ownerAccount.address, spenderAddress, permitAmount, deadline, v, r, s],
              },
              {
                address: token.token.address,
                abi: EIP2612_PERMIT_ABI,
                functionName: 'allowance',
                args: [ownerAccount.address, spenderAddress],
              },
            )
            callCountForToken += 2
          }
          if (token.version === '2' || !token.version) {
            const domainV2 = { name: token.name, version: '2', chainId: chain.id, verifyingContract: verifyingContract }
            const typesV2 = {
              Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
              ],
            }
            const signatureV2 = await walletClient.signTypedData({
              account: ownerAccount,
              domain: domainV2,
              types: typesV2,
              primaryType: 'Permit',
              message: {
                owner: ownerAccount.address,
                spender: spenderAddress,
                value: permitAmount,
                nonce: 0n,
                deadline: deadline,
              },
            })
            const { v, r, s } = splitSignature(signatureV2)
            multicallContracts.push(
              {
                address: token.token.address,
                abi: EIP2612_PERMIT_ABI,
                functionName: 'permit',
                args: [ownerAccount.address, spenderAddress, permitAmount, deadline, v, r, s],
              },
              {
                address: token.token.address,
                abi: EIP2612_PERMIT_ABI,
                functionName: 'allowance',
                args: [ownerAccount.address, spenderAddress],
              },
            )
            callCountForToken += 2
          }
        }
        tokenCallMappings.push({ tokenAddress: token.token.address, callCount: callCountForToken })
      }

      const multicallResult = await client.multicall({ contracts: multicallContracts, allowFailure: true })

      let resultIndex = 0
      for (let i = 0; i < tokenChunk.length; i++) {
        const token = tokenChunk[i]
        const { callCount } = tokenCallMappings[i]
        const tokenResults = multicallResult.slice(resultIndex, resultIndex + callCount)
        resultIndex += callCount

        let finalResult: PermitSupportResult = {
          tokenAddress: token.token.address,
          status: PermitSupportStatus.Unsupported,
          version: undefined,
        }

        const permitAmount = parseUnits('1', token.token.decimals)

        let v1Success = false
        let v2Success = false

        if (token.type === 'DAI' && (token.version === '1' || !token.version)) {
          const [, allowanceRes] = tokenResults.slice(0, 2)
          if (!allowanceRes?.status) {
            console.log('multicall failed', token.token.address, { token, allowanceRes })
          } else if (
            allowanceRes?.status === 'success' &&
            allowanceRes?.result === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
          ) {
            v1Success = true
          }
        }

        if (token.type === 'EIP2612' && (token.version === '1' || !token.version)) {
          const offset = !token.version ? 2 : 0
          const [, allowanceRes] = tokenResults.slice(offset, offset + 2)
          if (!allowanceRes?.status) {
            console.log('multicall failed', token.token.address, { token, allowanceRes })
          } else if (allowanceRes?.status === 'success' && allowanceRes?.result === permitAmount) {
            v1Success = true
          }
        }

        if (token.type === 'EIP2612' && (token.version === '2' || !token.version)) {
          const offset = !token.version ? 4 : 0
          const [, allowanceRes] = tokenResults.slice(offset, offset + 2)
          if (!allowanceRes?.status) {
            console.log('multicall failed', token.token.address, { token, allowanceRes })
          } else if (allowanceRes?.status === 'success' && allowanceRes?.result === permitAmount) {
            v2Success = true
          }
        }

        if (v1Success) {
          finalResult.status = PermitSupportStatus.Supported
          finalResult.version = '1'
        } else if (v2Success) {
          finalResult.status = PermitSupportStatus.Supported
          finalResult.version = '2'
        }

        allResults.push(finalResult)
      }
    } catch (error) {
      console.error('An error occurred during multicall for a chunk:', error)
      // Mark all tokens in the chunk as failed
      const failedResults = tokenChunk.map((t) => ({
        tokenAddress: t.token.address,
        status: PermitSupportStatus.Failed,
        version: undefined,
      }))
      allResults.push(...failedResults)
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  return allResults
}
