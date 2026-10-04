import { RwaProps, RwaRegistry } from '../utils/types'
import { RWA_GENERATED } from './rwaAssets.generated'

/**
 * Curated, authoritative RWA classifications keyed by chainId -> lowercase address.
 * These WIN over both the auto-generated seed and the rule-based classifier.
 * Add entries here to fix/override an asset that the rules get wrong or miss.
 */
/**
 * Nest's vault shares (nest.credit) — ONE LayerZero OFT per vault, at the SAME address on every
 * chain `api.nest.credit/v1/vaults` lists for it (its `chain` keys), plus the Solana mint it
 * publishes (`solana.mintAddress`). Every EVM row below was probed 2026-10-04: code, `symbol()`
 * and supply at that address on that chain (nOPAL: 29.8 M on BNB, 4.8 M on Avalanche — none of
 * which the lists carried). The BNB deployments of nALPHA / nTBILL / nBASIS / nCREDIT / nACRDX
 * answer 18 decimals, the rest 6; decimals come from the chain, never from here.
 *
 * `issuer: 'nest'` is what marks the `NestComposite` swap source (lending-sdks
 * NEST_RWA_COMPOSITE.md) as venue-native for a pair. nCLOA is a Nest vault OVER BlackRock's
 * CLO ETF, so the issuer is Nest, not BlackRock (the rule seed had it wrong).
 * `denomination: 'USD'`: every share is a BoringVault whose accountant's `base()` is a dollar
 * (USDC.e for nALPHA/nBASIS/nCREDIT, USDC for nTBILL/nLCRD/nAXI/nFALCON/nCLOA/nPRIME/FACTOR,
 * pUSD for nACRDX/nWISDOM/nOPAL) and `getRate()` is the NAV in it — checked 2026-10-02, nOPAL
 * 1.101612 = its USD price. A floating NAV (nWISDOM 0.93), not a peg. nPRIME and FACTOR carry no
 * sub-type: Nest's API names no strategy for either and a guess would be a claim.
 *
 * Solana keys are the verbatim mint (the registry lower-cases them as a lookup key,
 * `lookupRwa`), read by solana/solanaClassify.ts.
 */
const NEST_SHARES: { symbol: string; address: string; subType?: string; chains: string[]; solana?: string }[] = [
  {
    symbol: 'nALPHA',
    address: '0x593ccca4c4bf58b7526a4c164ceef4003c6388db',
    subType: 'private-credit',
    chains: ['98866', '1', '56', '480', '8453', '9745'],
    solana: '8qujzAXj2nz99CmeiCgPPc2JxEuDNYvPffzRomroJnee',
  },
  {
    symbol: 'nTBILL',
    address: '0xe72fe64840f4ef80e3ec73a1c749491b5c938cb9',
    subType: 'treasury',
    chains: ['98866', '1', '56', '480', '9745', '42161'],
    solana: '2sA2jW9e8EYJkLFpq9hkhxfVUQBwVGJwq6iP4TmTKrL4',
  },
  {
    symbol: 'nBASIS',
    address: '0x11113ff3a60c2450f4b22515cb760417259ee94b',
    subType: 'basis-trade',
    chains: ['98866', '1', '56', '480', '9745'],
    solana: 'G6SkPqYTbtVFYU4krZLDgHf5MVMfARG57G1kog4RYH2n',
  },
  {
    symbol: 'nCREDIT',
    address: '0xa5f78b2a0ab85429d2dfbf8b60abc70f4cec066c',
    subType: 'private-credit',
    chains: ['98866', '1', '56', '9745'],
  },
  {
    symbol: 'nACRDX',
    address: '0x2a3e301dbd45c143dfbb7b1ce1c55bf0bbf161cb',
    subType: 'private-credit',
    chains: ['98866', '1', '56', '9745'],
  },
  {
    symbol: 'nWISDOM',
    address: '0x29bf22381a5811dec89dc7b46a5ce57ad02c0240',
    subType: 'private-credit',
    chains: ['98866', '1', '56', '9745'],
    solana: '77DTSzxisdQWshFYHP9M2JBDuHNojLAVoC7GBNC2yadT',
  },
  {
    symbol: 'nOPAL',
    address: '0x119dd7daff816f29d7ee47596ae5e4bdc4299165',
    subType: 'private-credit',
    chains: ['98866', '1', '56', '480', '4663', '5042', '9745', '43114'],
    solana: 'GArhnnDj3GYhmQeApKVXaRv4TQFwhPcs3SNF6FXsTeXq',
  },
  {
    symbol: 'nLCRD',
    address: '0xdf45b8322ea4ce898331602e2d1f3d1a67ae0ee8',
    subType: 'private-credit',
    chains: ['98866', '1'],
    solana: '14BM5Nvq2kuJPn4vFNqiPM3XSBzVaqEjZrDT7ZYLS2nB',
  },
  {
    symbol: 'nAXI',
    address: '0x7488b23f4c26b44eef2e0766896be47443e86d79',
    subType: 'private-credit',
    chains: ['98866', '1'],
  },
  {
    symbol: 'nFALCON',
    address: '0x066d10e240999aea6798b2e2ca0bdac2923cbdff',
    subType: 'private-credit',
    chains: ['98866', '1', '56', '4663', '5042'],
    solana: '4bpR1mvWgL25NxWBfYKDjiYGfAVttTeo9VJ1LvmbPj9y',
  },
  {
    symbol: 'nCLOA',
    address: '0x63810d7f1c7b4dbfb60c173ba120a2be98b59e13',
    subType: 'etf',
    chains: ['98866', '1'],
    solana: 'BKHcMUx4XXy3JA4tk9BXM8f6huFLESFtvq9tj9PDiVzf',
  },
  { symbol: 'nPRIME', address: '0x6fec234e8801ed88964bc058a0f9fbcc9fcbd2eb', chains: ['98866', '1', '56'] },
  {
    symbol: 'FACTOR',
    address: '0x1f37620a0e0660db3cdbb8cdbf62d8099f959925',
    chains: ['98866', '1', '4663', '5042', '8453'],
    solana: '6ESVavhfwC4rXHHHZmR6ajg7nLmL6X5UkpZuAcoA7xj7',
  },
]

const NEST_ROWS: RwaRegistry = {}
for (const n of NEST_SHARES) {
  const rwa: RwaProps = {
    type: 'fund',
    ...(n.subType ? { subType: n.subType } : {}),
    issuer: 'nest',
    denomination: 'USD',
  }
  for (const chain of n.chains) (NEST_ROWS[chain] ??= {})[n.address] = rwa
  if (n.solana) (NEST_ROWS.solana ??= {})[n.solana] = rwa
}

const RWA_MANUAL_ROWS: RwaRegistry = {
  // '1': {
  //   '0x1234...': { type: 'fund', subType: 'treasury', issuer: 'ondo', underlying: 'US T-Bill' },
  // },

  // Robinhood Stock Tokens on Robinhood Chain — issued by Robinhood Assets (Jersey) Ltd
  // (terms: robinhood.com/stocktoken/…). The list names them like the company ("NVIDIA",
  // "Space Exploration Technologies Corp"), so no name rule can see them; they are keyed
  // by address instead. Membership is the shared token beacon
  // 0xe10b6f6b275de231345c20d14ab812db62151b00 (EIP-1967 beacon slot), cross-checked
  // against the on-chain name() suffix "• Robinhood Token" — read 2026-10-03, 201 of the
  // 1 310 listed 4663 tokens. Same-ticker tokens off that beacon are NOT Robinhood's
  // (NetNet NET 0xca9c… vs Cloudflare NET 0x116f…, and the Pendle SY/PT/YT legs over
  // these, which carry their own `pendle` issuer and reach robinhood as an exposure).
  // ETFs / commodity trusts -> fund/etf; Robinhood Ventures Fund I -> fund/closed-end.
  // Issuer is the tokenizer, not the fund manager (iShares tokens are not BlackRock's
  // credit here) — same rule as Dinari in labels/rwaLstRules.ts.
  '4663': {
    '0x521cf887e6531c6f667b5bc4d896e5d9bfe8eb2e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AAOI',
    },
    '0xaf3d76f1834a1d425780943c99ea8a608f8a93f9': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AAPL',
    },
    '0x3139d77ace0cbaa5bdfd38bd1f1911a794af0b0e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ABCL',
    },
    '0x232b8ed6377be97813853b0ac104c4cda8378d1b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ADBE',
    },
    '0x5f604fba1162193a4388a5dfa56f556f3e133cc2': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AEHR',
    },
    '0xfaf9cb261b5fcc1f404bb10cd39c5c6c1974e612': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AEIS',
    },
    '0x748c32c3ca24edf31ea597db1f3d330a7a6da3dc': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ALAB',
    },
    '0x36046893810a7e7fce501229d57dc3fc8c8716d0': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AMAT',
    },
    '0x99d9d8663545151603863c5acbd6fc3218899009': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AMBA',
    },
    '0x05a3d1cd21d0c88145e82600e62e7e496e0f222b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AMC',
    },
    '0x86923f96303d656e4aa86d9d42d1e57ad2023fdc': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AMD',
    },
    '0xdd356aa38f40a7b7076755ac854b6fbb1f0d305b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AMKR',
    },
    '0x12f190a9f9d7d37a250758b26824b97ce941bf54': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AMZN',
    },
    '0x28babd556b60e53663b8615036479a29c2cdd1bf': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ANET',
    },
    '0xb8dbf92f9741c9ac1c32115e78581f23509916fd': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'APLD',
    },
    '0xa249baf1063af884807c1e1400aef7784836917e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'APP',
    },
    '0x666716999e75d2652398ff830bbc2e485946e140': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ARM',
    },
    '0x47f93d52cbec7c6d2cfc080e154002370a60daea': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ASML',
    },
    '0x1af6446f07eb1d97c546afc8c9544cbdf3ad5137': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ASTS',
    },
    '0x373c06c4f7bde527d7dae4ba169e42b55e393ced': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AUR',
    },
    '0xf6290b5e7c26502e2da514c31509849718ea76a5': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AVAV',
    },
    '0x156e175dd063a8ce274c50654ef40e0032b3fbcf': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AVGO',
    },
    '0xc27dbd474af5181c5a8777903690d8d262d12648': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AXON',
    },
    '0x141eea040c2250eec0314e336975e81f85f6585e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'AXTI',
    },
    '0x4d21483a44bf67a86b77e3da301411880797d452': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'BA',
    },
    '0xad25ac6c84d497db898fa1e8387bf6af3532a1c4': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'BABA',
    },
    '0x48e39e56acdba37b09020c0b734a613c9a2f100a': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'BB',
    },
    '0x822cc93ffd030293e9842c30bbd678f530701867': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'BE',
    },
    '0x2f62fc9fabb470c690f141c28340ed832bb27020': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'BND',
    },
    '0xcef9027c7d6985b85f0ba431125073529a947a68': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'BULL',
    },
    '0x5c90450bbb4273d7b2f17cf6917aeb237a569679': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CBRS',
    },
    '0x9651342cea770ae9a2969ba2a52611523146aef9': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CCL',
    },
    '0xae517a2903e68bd929dfd15be875f8369d53e94a': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CEG',
    },
    '0x8cf07c5a878945185d327aaa6e33faa95f95e7bf': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CELH',
    },
    '0x44f6d488021f8233b9416294d1fe9b1fee28382d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CIEN',
    },
    '0x62200915e7deab1ec7f79fb246dadbb80eacddd0': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CLOV',
    },
    '0xbf449977089c718c004a66c554b26b94ef3ad4de': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CLS',
    },
    '0xcbb95bbf36099d34da091dc6fa6f49efa257cee3': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CLSK',
    },
    '0x92f9f459f1a9a5ad266b182be7bffd1c6c666894': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'COHR',
    },
    '0x6330d8c3178a418788df01a47479c0ce7ccf450b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'COIN',
    },
    '0x4ea005168d7f09a7a0ba9d1def21a479950e44c2': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'COST',
    },
    '0xdf0992e440dd0be65bd8439b609d6d4366bf1cb5': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CRCL',
    },
    '0x4d67253bc223e6b0e104f1084c1fb2b669ddc41b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CRDO',
    },
    '0xd95b44124e475743a7589e68f3d74008a5536d44': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CRM',
    },
    '0xea72ecca2d0f6bfa1394dbbcff85b52cd4233931': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CRWD',
    },
    '0x5f10a1c971b69e47e059e1dc91901b59b3fb49c3': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CRWV',
    },
    '0xf543967eebb6f1917992ef0e68de63ab07a5a0da': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CSCO',
    },
    '0x63d5a3b6939a33f1e75d8bcd85759858239600db': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CTSH',
    },
    '0xa4f319104089fe321dc8093c6e707d4fe190a988': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'CVNA',
    },
    '0x27c99fbde9d0d2aa4f4bfb4943f237843ddf6958': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'DDOG',
    },
    '0x941ae714ec6d8130c7b75d67160ca08f1e7d11dd': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'DELL',
    },
    '0x1d11f0496982706c5e14a514d4e79f2e6bde4516': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'DJT',
    },
    '0xc02f12b9fe9e707079ec0d546f3050d3f6c1f8bd': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'DOCN',
    },
    '0x33c18e2cc8ae9ae486e785090d86b2ce632ff994': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'DRAM',
    },
    '0x39ec44bee4f6a116c6f9b8de566848a985c53c60': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ELF',
    },
    '0x1c690498150252222c275a5ced69d3a6b1f52d5e': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'EWT',
    },
    '0x7f0abef0c07280f82c6a08ead09ded6bae2c13fc': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'EWY',
    },
    '0x25c288e6d899b9bc30160965ad9644c67e73be0c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'F',
    },
    '0xa48f22a46c0f1c46ca7d111cb6c137c271987180': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FICO',
    },
    '0x41f4267525a8aff329540ef24fd83d9044758b33': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FIG',
    },
    '0x9ece29a4a2397c0a35fb5fa8ee2b9509130a98cc': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FISV',
    },
    '0x93dbb1d2dc5d63f4abacff30485273f538df68ac': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FIX',
    },
    '0x282e87451e10fa6679bc7d76c69be44cd3fc777c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FLNC',
    },
    '0x03bc731ffb162cdd7b98d3c6542bfc291126075d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FLY',
    },
    '0x3fb8976980d486084b2eb4a404bd12e72823958f': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FTNT',
    },
    '0xeb30663bdff0622ef4e4e5cbb4e975f19f33f51d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'FUTU',
    },
    '0x63b814ddbd6bf339f25fed8c36158a008d5b373e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'GE',
    },
    '0x94b8aae43a1ccc08aa64b7d1f29b4d920af4a0c9': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'GEV',
    },
    '0xc9a981fee1f9dec688bb123ccdecc63d0debfc4e': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'GLD',
    },
    '0x7c04e6a3368f2a1de3874f0e80d2e0a1a9915da6': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'GLW',
    },
    '0x2d427692e928fa156ec22acfabafa0447c5805b7': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'GLXY',
    },
    '0x1b0e319c6a659f002271b69db8a7df2f911c153e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'GME',
    },
    '0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'GOOGL',
    },
    '0xeb61c0ed490a367d4e3631ccf8a74b3bfc7e775d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'HII',
    },
    '0xccee82fe024c36fa15e1005ede3e9e4787e23d09': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'HIMS',
    },
    '0x59dd09d4900c2e4b5f75b7c0d4e6796fcc234cb1': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'HPE',
    },
    '0xaea445c5f3db1a462998ccc422a875a361ee5d99': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'HWM',
    },
    '0x980dcf6766fa79f5cf0c4aadb3ab477ff15a9619': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'IBM',
    },
    '0x7c148f74ac7445d1f28366b7fcdc6792a9fcd0cf': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'IBRX',
    },
    '0xacef2e09adb47ad6abebad9ff06689e60615c2b6': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'INDA',
    },
    '0xb853bc83a753342a4f8320ea680b4b1e84118d21': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'INFQ',
    },
    '0xf1953dab6fad537488d5a022361ffaa8b4c95ec6': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'INOD',
    },
    '0xc72b96e0e48ecd4dc75e1e45396e26300bc39681': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'INTC',
    },
    '0x56d23bee5f41a7120170b0c603dae30128e460e9': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'INTU',
    },
    '0x558378e000d634a36593e338ebacdd6207640efe': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'IONQ',
    },
    '0xf0ab0c93be6f41369d302e55db1a96b3c430212d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'IREN',
    },
    '0xeaf2512dfc1beac608f8794b3793cd4e02894aa6': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'JBL',
    },
    '0x03dfbbe0ac4e7bcdafd08ed41a400326b77d8c80': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'JNJ',
    },
    '0xb334c5ce741b80b5b671f47f5c269cb193fe8e24': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'JOBY',
    },
    '0x96b933c74ecb4a0926b9210cef7b743ef46be2e9': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'KLAC',
    },
    '0x12e3c047bf9aecaf9ddc98c05c31bfd1dd043993': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'KSS',
    },
    '0x7fd06a4d81ccfa3f351394e144d5191874c31313': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'KTOS',
    },
    '0x48d60243c66437c6ac3c2495be94747aed5dfe25': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LHX',
    },
    '0x8ef20885f94e3d9bc7eb3080279188bd5ed7c08c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LITE',
    },
    '0x8005d266423c7ea827372c9c864491e5786600ea': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LLY',
    },
    '0x329fcaceb9ad6f9580dd5f643fed0646900d043c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LMT',
    },
    '0x57b0030166db0c31690d1a5aa167e2e26e2c29a4': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LRCX',
    },
    '0x4e62068525ab11fe768e29dfd00ef909b9803016': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LULU',
    },
    '0xa5d4968421ba94814be3b136b15cf422101ac1a3': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'LUNR',
    },
    '0xddf2266b79abf0b48898959b0ed6e6adf512be74': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MDB',
    },
    '0xc0d6457c16cc70d6790dd43521c899c87ce02f35': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'META',
    },
    '0xc6cbad1016b38b797610c25e1dc7d95988b1f362': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MOD',
    },
    '0x52d50d0280ad1054b43f052bd70a49a212a1b128': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MPWR',
    },
    '0x43b07d15ce533bec5476d70c22a78a1b2b662155': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MRNA',
    },
    '0x62fd0668e10d8b72339be2dcf7643001688ff13b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MRVL',
    },
    '0xe93237c50d904957cf27e7b1133b510c669c2e74': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MSFT',
    },
    '0xec262a75e413fafd0df80480274532c79d42da09': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MSTR',
    },
    '0xc93f4d80e268ab922e871bd169156c3cc41894e6': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MTSI',
    },
    '0xff080c8ce2e5feadaca0da81314ae59d232d4afd': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MU',
    },
    '0x48961813349333209994750ffa89b3c5c22ec969': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'MXL',
    },
    '0x6ddb95405db6179012bff2fff7e0f8d49cf00137': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'NASA',
    },
    '0xf7181b63fdb858558a74ba96bc42732684cd7965': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NAVN',
    },
    '0x9d9c6684f596f66a64c030b93a886d51fd4d7931': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NBIS',
    },
    '0x116f00968269b7bfbad4109ce591d6e74c0601d4': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NET',
    },
    '0xe0444ef8bf4ed74f74fd73686e2ddf4c1c5591e8': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NFLX',
    },
    '0xbef75684c43c4ea7bd18dd532a2244674ee8b926': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NNE',
    },
    '0x25ee805ac369b6e3f8bf5764c682d34a37cb7175': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NOK',
    },
    '0x0c3260af4b8f13a69c4c2dfb84fd667890cdfa14': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NOW',
    },
    '0x408c14038a04f7bd235329e26d2bf569ee20e250': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NU',
    },
    '0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NVDA',
    },
    '0xbe6702d7b70315376dc48a3293f24f0982f86386': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'NVTS',
    },
    '0x8b2f88497f15a18e9d4ffa1a8ffb8538399ae774': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'OKLO',
    },
    '0xbbd09f72b025360fee5c928053dca6248d35be54': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ON',
    },
    '0x8ff63eaeee3fe54ba450c4f5538064ec5a893aef': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ONTO',
    },
    '0xb0992820e760d836549ba69bc7598b4af75dee03': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ORCL',
    },
    '0x40e7a279850e443f582059ae5dc1c3b6563e6395': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'OUST',
    },
    '0x1cdad396db64bda184d5182a97dd9b3c62100b7d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'P',
    },
    '0xb039597ed45cba7b6e2fb9e8be51802969cee5be': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PANW',
    },
    '0xfb2664f07b6aadd29ea7a59d8859b1aeb8645cda': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PATH',
    },
    '0x9b23573b156b52565012f5ce02cdf60afbaa70be': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PENG',
    },
    '0x7066a64c24e4206cd62e83bf198c1e7eb361f51e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PFE',
    },
    '0xaa4d64474c172010ab57719cb9951e6142a100d3': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PL',
    },
    '0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PLTR',
    },
    '0xcf6b2d875361be807eafa57458c80f28521f9333': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'POET',
    },
    '0x237c16d66590f67b886d978acd362eaead8b18c7': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'POWL',
    },
    '0x4189f0c66ebbb0bfef1c31f763131361ef32f77c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PR',
    },
    '0x9ab02ead789b6903c3c44d0ed32f9c707cdf12fd': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'PWR',
    },
    '0xc583c60aef9dc401da72cec1b404743a93cea1cc': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'QBTS',
    },
    '0x0f17206447090e464c277571124dd2688e48aea9': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'QCOM',
    },
    '0xb7edfe2f33c1ac06830a971dfb559bde8a2a3d76': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'QNT',
    },
    '0xd5f3879160bc7c32ebb4dc785f8a4f505888de68': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'QQQ',
    },
    '0x59818904ab4ce163b3ce4ffb64f2d6ca02c434b4': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'QUBT',
    },
    '0xf0c4bf4c582cb3836e98394b1d4e7b7281101be8': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RBLX',
    },
    '0xfde6b5d9bb419b10c23268c74e369abff39c0460': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RCAT',
    },
    '0x05b37fb53a299a1b874a619e1c4c404d52c36f4c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RDDT',
    },
    '0x92ef19e82bd8ff36661de838d5eae7e5cef0effe': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RDW',
    },
    '0x284358abc07f9359f19f4b5b4ac91901be2597ba': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RGTI',
    },
    '0xb1bf26c1d20ff267a4f93550d1e0d06ac40a114b': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RIVN',
    },
    '0x3b14c39e89d60d627b42a1a4ca45b5bb45fc12e2': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RKLB',
    },
    '0x756bc80af765c82da966a788858d65adf14f3793': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'RUN',
    },
    '0xb02e3e1b7f68559427c2d9100566e4f3cc5b7611': {
      type: 'fund',
      subType: 'closed-end',
      issuer: 'robinhood',
      underlying: 'RVI',
    },
    '0x95052ddcd5dc25641657424a8cf04834997e1730': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SATS',
    },
    '0xd63abb2c13d7a8421a8017a712802053568e3c1d': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SCHD',
    },
    '0x92fd66527192e3e61d4ddd13322aa222de86f9b5': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SGOV',
    },
    '0xf53f66751b1eff985311b693531e3290f600c410': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SHOP',
    },
    '0xbe274710bf3d9567e1b290ef6a5f9f90ca016fd8': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SHY',
    },
    '0x77e655e37f4d913fb9540e0d541d824171a60e81': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SIMO',
    },
    '0x84cab63bc87912e71ad199ff14a0ba45de68fef8': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SKYHY',
    },
    '0x285b231728c7e4333799183df1094d775246a535': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SLS',
    },
    '0x411efb0e7f985935daec3d4c3ebaea0d0ad7d89f': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SLV',
    },
    '0xc01aa1fecec0605b13bc84874ff7256c0f5f562a': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SMCI',
    },
    '0x072f979c2cac8e1391b0162a87fee094bf8744a0': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SMH',
    },
    '0x1eebee7f74517e0279dfb09d25b0407beec3fdd6': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SMR',
    },
    '0xf6589f11bc40b669e584073f428b05562f568733': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SNAP',
    },
    '0xb90a19ff0af67f7779aff50a882a9cff42446400': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SNDK',
    },
    '0xba0cab75495255d0cb58e22b648bfed4ecd1f47e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SNOW',
    },
    '0x98e75885157c80992a8d41b696d8c9c6fb30a926': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SOFI',
    },
    '0x6e3dfd9f7e1649baa14d25cac18c94d62db10a54': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SOUN',
    },
    '0x75742c18bc1f1c5c5f448f4c9d9c6f66dafaaa38': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SOXX',
    },
    '0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'SPCX',
    },
    '0xad622320e520de39e72d41ef07438c3fd3354875': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SPMO',
    },
    '0x117cc2133c37b721f49de2a7a74833232b3b4c0c': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'SPY',
    },
    '0xb1969f6604ca1ae7a2cd3f1827876e914594ca2d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TE',
    },
    '0x5b97476b922f3305131b8f0b9d333172e87f4aae': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TEAM',
    },
    '0xb1cc0ec7db69cf43539119814df40071b9d61793': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TEM',
    },
    '0x2778c5024d5ca2cdb0f8ead671ffc69963adcd9c': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TER',
    },
    '0x89776d4cd68193597a2fc132cfac1fde36ccea8a': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TSEM',
    },
    '0x322f0929c4625ed5bad873c95208d54e1c003b2d': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TSLA',
    },
    '0x58ffe4a942d3885baa22d7520691f611ef09e7aa': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TSM',
    },
    '0x0b5fb4031cae9163db10b169ee72685f0edc8545': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TTD',
    },
    '0x5e81213613b6b86eab4c6c50d718d34359459786': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'TTWO',
    },
    '0x0e6e67ba88e7b5d9b67636a215c76779b948de79': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'UMC',
    },
    '0xcf364ea52787e289de6f32077834056e3e70d6a8': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'UNH',
    },
    '0xf23250dac154d05bb671cb0d0ebef3c635c79ce2': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'UPS',
    },
    '0xd917b029c761d264c6a312bbbcda868658ef86a6': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'USAR',
    },
    '0xa30fa36db767ad9ed3f7a60fc79526fb4d56d344': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'USO',
    },
    '0x6006ed4b2f94110851ff7509d97d034f0eed9226': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'VICR',
    },
    '0xfa78c12e6488814a0262e4e802749a4a737d5fb7': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'VRT',
    },
    '0x26dcbfb34fc83cabd6990f449674efdc6097ff85': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'VSAT',
    },
    '0x561e2a49212b7ccf47f2744ccb83e200722fadbc': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'VST',
    },
    '0x0594134df3f171a354d9c85ebd65b7a6148f6d09': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'VTI',
    },
    '0x82da4646242e1d962e96e932269dc644c94a9caa': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'WDAY',
    },
    '0xf52597345a8edf418bc4071b4a35112472277d3e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'WDC',
    },
    '0x348be1a8663f15edde5cdf8a96bb69078f7ab6fd': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'WULF',
    },
    '0x9e7abd3c9139d14e4c86dce0e455aab7a0c2fb3e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'WYFI',
    },
    '0x15cd20759ce7f3285c29a319de2d1a2e098c6f43': {
      type: 'fund',
      subType: 'etf',
      issuer: 'robinhood',
      underlying: 'XLK',
    },
    '0xa8eb3bccbf2017ee7cbfb652eb51cf2e1b153289': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'XNDU',
    },
    '0xf9b46d3d1b22199d4d1025a9cedb540a33f1a2d5': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'XOM',
    },
    '0xe674c5c071821f48bb2d12cadb83617eff438f9e': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ZETA',
    },
    '0x44c4f142009036cf477ed2d09932051843137cf1': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ZM',
    },
    '0x7dc013eb55e436f30d7ed1afe4e36d6e45e3c3f7': {
      type: 'equity',
      subType: 'stock',
      issuer: 'robinhood',
      underlying: 'ZS',
    },
  },
}

/** Curated rows win over the generated seed; the Nest table is merged per chain under the literal. */
export const RWA_MANUAL: RwaRegistry = Object.fromEntries(
  [...new Set([...Object.keys(NEST_ROWS), ...Object.keys(RWA_MANUAL_ROWS)])].map((chain) => [
    chain,
    { ...NEST_ROWS[chain], ...RWA_MANUAL_ROWS[chain] },
  ]),
)

/** Merge two registries; `override` wins per (chainId,address). */
export function mergeRwaRegistry(base: RwaRegistry, override: RwaRegistry): RwaRegistry {
  const out: RwaRegistry = {}
  for (const reg of [base, override]) {
    for (const chainId of Object.keys(reg)) {
      out[chainId] = { ...(out[chainId] ?? {}) }
      for (const address of Object.keys(reg[chainId])) {
        out[chainId][address.toLowerCase()] = reg[chainId][address]
      }
    }
  }
  return out
}

/** The effective registry: generated seed, with manual overrides on top. */
export const RWA_REGISTRY: RwaRegistry = mergeRwaRegistry(RWA_GENERATED, RWA_MANUAL)

/** Lookup helper */
export function lookupRwa(chainId: string, address: string): RwaProps | undefined {
  return RWA_REGISTRY[chainId]?.[address.toLowerCase()]
}
