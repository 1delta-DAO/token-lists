// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { TokenProps } from '../utils/types'
import { classifySolanaToken } from './solanaClassify'
import { lookupOft } from '../oft/oftMap'
import { lookupNestIdentity, nestGroupOf } from '../rwa/nestIdentity'
import { applyLogoOverrides } from '../logos/logoOverrides'

/**
 * Generates `solana.json`, the chain list for `Chain.SOLANA = 'solana'`.
 *
 * WHY JUPITER IS THE ROSTER AND COINGECKO IS THE IDENTITY
 * ------------------------------------------------------
 * Two different jobs, two different sources.
 *
 * WHICH tokens to carry comes from **Jupiter's verified list**: it is what our
 * aggregator will actually route, and a token list is a promise that the pair
 * is tradeable. CoinGecko's `tokens.coingecko.com/solana/all.json` is the
 * obvious first idea and fails that test — 4,258 of its 6,965 tokens (61 %) are
 * not in Jupiter's verified set, and every row carries `chainId: null`.
 *
 * WHICH ASSET each one IS comes from **CoinGecko's `/coins/list?
 * include_platform=true`**, which maps one coin id onto its address on every
 * chain. That is the piece a symbol/name heuristic cannot supply, and without
 * it this list is actively wrong: **1,336 of the 3,240 verified mints (41 %)
 * are assets we ALREADY carry on an EVM chain** — Wormhole-bridged WETH and
 * WBTC, cbBTC, USDS, sUSDe, Ondo's USDY and its whole tokenized-equity book,
 * the xStocks, AAVE, LINK. Scoping those to `::solana` would sever every one of
 * them from its own group and show the user two unrelated rows for one asset.
 *
 * WHAT EACH ONE IS (lst / rwa / stablecoin / savings) is overlaid by
 * `solanaClassify.ts` from Jupiter's own tags, the shared rule engine and the
 * assetGroup-keyed snapshots — this list never passes through the generic
 * generator, so the overlay step it would get there is applied here.
 *
 * EXPONENT PT/YT/SY (`exponent/exponent.json`, from `npm run exponent`) are
 * merged in last. Jupiter does not verify them, so none of the 200-odd mints
 * would otherwise be listed at all — and a holder of a matured PT needs it in
 * the list to redeem it.
 */

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const OUT = path.resolve(REPO_ROOT, 'solana.json')

const JUPITER_VERIFIED = 'https://lite-api.jup.ag/tokens/v2/tag?query=verified'
const JUPITER_SEARCH = 'https://lite-api.jup.ag/tokens/v2/search?query='
const COINGECKO_SOLANA = 'https://tokens.coingecko.com/solana/all.json'
const COINGECKO_PLATFORMS = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
const COINGECKO_ASSET_PLATFORMS = 'https://api.coingecko.com/api/v3/asset_platforms'

/**
 * Curation floor, OFF by default: Jupiter's `verified` tag is the curation, and
 * chain 1 publishes 13,771 tokens against Solana's 3,240. Set
 * `SOLANA_MIN_LIQUIDITY=250000` for a ~245-token starter list.
 */
const MIN_LIQUIDITY_USD = Number(process.env.SOLANA_MIN_LIQUIDITY ?? 0)

/** How many of the most liquid mints go into `mainTokens`. */
const MAIN_TOKEN_COUNT = 30

const SPL_TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

/** Wrapped SOL — the chain's wrapped native, flagged the way `WRAPPED_NATIVE_INFO` flags WETH. */
const WSOL = 'So11111111111111111111111111111111111111112'

/**
 * NATIVE SOL — the System Program id, the industry's address for native SOL
 * (LI.FI, Relay, DZap; `@1delta/wnative` `SOLANA_NATIVE_ADDRESS`). Native SOL
 * has no mint; this row is the Solana twin of every EVM list's zero-address
 * row (`props.isNative`, `props.wrapped`), and it SHARES wSOL's assetGroup
 * the way ETH and WETH share `ETH` — one asset in two forms, one price.
 *
 * Without it the list's only "SOL" was the wSOL mint, which four of five
 * bridges (LI.FI, Relay, DZap, Mayan) read as WRAPPED SOL: a user picking
 * "SOL" received wSOL in a token account, or was asked to pay from one.
 */
const NATIVE_SOL = '11111111111111111111111111111111'
const NATIVE_SOL_LOGO = 'https://raw.githubusercontent.com/1delta-DAO/asset-icons/main/native/sol.webp'

const EXPONENT_LIST = path.resolve(__dirname, '../exponent/exponent.json')

/**
 * Human override, applied BEFORE the CoinGecko resolution and beating it.
 *
 * Deliberately tiny — this is for an asset we know CoinGecko gets wrong or does
 * not cover, not a substitute for the cross-chain map. Everything else earns
 * its group from evidence.
 */
const SOLANA_MAPPEDS: { [mint: string]: string } = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  // Huma's PST: the Solana original of the CCIP mirrors on Ethereum
  // (`0x22ae3d9a…`) and Arc (`0xa6db07eb…`), which carry this group. CoinGecko
  // lists no PST coin at all, so the cross-chain map cannot join it.
  '59obFNBzyTBGowrkif5uK7ojS58vsuWz3ZCvg6tfZAGw': 'PayFi Strategy Token::PST',
  // USD.AI's Staked USDai: Jupiter-verified, vanity mint, metadata served from
  // usd.ai/metadata/solana/; Kamino's "sUSDai Market" lends it. The EVM
  // deployments (1/5042/8453/9745/42161 `0x0b2b2b20…`) carry this group.
  sUSDai6Y3GxysDEtA9BVcEFTaog6UZpYUVxJiMhAKYE: 'sUSDai::SUSDAI',
  // Nest's BlackOpal LiquidStone II (Plume): same name, icon served from
  // assets.plume.org/…/nest/nOPAL/, Kamino's "Nest Market" lends it. The EVM
  // deployments (1/5042/98866 `0x119dd7da…`) carry this group.
  GArhnnDj3GYhmQeApKVXaRv4TQFwhPcs3SNF6FXsTeXq: 'Nest BlackOpal LiquidStone II Vault::nOPAL',
  // VNX's VEUR: joined the EVM group through CoinGecko's platform map until
  // 2026-10-04, when that row stopped matching. A group is an identity and
  // may not move between runs, so the join it already had is pinned.
  C4Kkr9NZU3VbyedcgutU6LKmi6MKz81sx6gRmk5pX519: 'VNX EURO::VEUR',
  // Wrapped SOL (and so native SOL, which shares its group): joined `SOL` through
  // CoinGecko's platform map until the 2026-10-14 run, when that row stopped
  // matching and the mint fell through to `Wrapped SOL::SOL::solana` — every
  // price / yield series and asset-group filter downstream keys `SOL`. Pinned,
  // same rule as VEUR.
  [WSOL]: 'SOL',
  // The rest of Nest's Solana shares: each is the `solana.mintAddress` that
  // `api.nest.credit/v1/vaults` publishes for the vault (LayerZero OFT of the
  // Plume share, same decimals, metadata on assets.plume.org). The group is
  // Plume's — the hub chain, where the vault and its `rwa` row live.
  '8qujzAXj2nz99CmeiCgPPc2JxEuDNYvPffzRomroJnee': 'Nest Alpha Vault::nALPHA',
  '2sA2jW9e8EYJkLFpq9hkhxfVUQBwVGJwq6iP4TmTKrL4': 'Nest Treasuries Vault::nTBILL',
  G6SkPqYTbtVFYU4krZLDgHf5MVMfARG57G1kog4RYH2n: 'Nest Basis Vault::nBASIS',
  '77DTSzxisdQWshFYHP9M2JBDuHNojLAVoC7GBNC2yadT': 'Nest WisdomTree Vault::nWISDOM',
  '14BM5Nvq2kuJPn4vFNqiPM3XSBzVaqEjZrDT7ZYLS2nB': 'Nest Liquid Credit Vault::nLCRD',
  '4bpR1mvWgL25NxWBfYKDjiYGfAVttTeo9VJ1LvmbPj9y': 'Nest FalconX CLO::nFALCON',
  BKHcMUx4XXy3JA4tk9BXM8f6huFLESFtvq9tj9PDiVzf: 'Nest BlackRock iShares AAA CLO Active ETF Vault::nCLOA',
  '6ESVavhfwC4rXHHHZmR6ajg7nLmL6X5UkpZuAcoA7xj7': 'Plume Factor Vault::FACTOR',
  // OnRe's ONyc: issued natively on Solana (OnRe program `onreuGhH…`), not a
  // bridged copy of an EVM token. CoinGecko's platform map has no other chain
  // to join it to, so it fell through to the `::solana` scope reserved for
  // name-squatting copies; the issuer and savings rows key this group.
  '5Y8NV33Vv7WbnLfq3zBcKSdYPrk7g2KoiQoe7M2tcxp5': 'OnRe Tokenized Reinsurance::ONyc',
  // Hastra (Figure / Provenance): the Solana mints of the products Ethereum
  // (and Tempo) list as `Hastra wYLDS` / `Hastra PRIME` / `Hastra AUTO` —
  // the mint addresses are the ones Hastra's own PoR feed publishes per chain
  // (`hastra.io/hastra-pulse/public/api/v1/por`, `mint_address_by_chain`).
  // Jupiter carries wYLDS and PRIME with an EMPTY name, so wYLDS fell through
  // to `::wYLDS::solana` and the lending join could not see it as the EVM
  // token; PRIME / AUTO joined through CoinGecko and are pinned so they cannot
  // move.
  '8fr7WGTVFszfyNWRMXj6fRjZZAnDwmXwEpCrtzmUkdih': 'Hastra wYLDS::wYLDS',
  '3b8X44fLF9ooXaUm3hhSgjpmVs6rZZ3pPoGnGahc3Uu7': 'Hastra PRIME::PRIME',
  GNE6oDS6jHrfaV3GQVVCCp37fDnT7PiPuewMKBj2bqNm: 'Hastra AUTO::AUTO',
  // Bridged / multichain deployments of assets we already carry on EVM, which
  // CoinGecko's platform map does not join (the coin lists no `solana` platform,
  // or no EVM address we publish), so each fell through to `::solana`. Every one
  // is Jupiter-verified and checked on 2026-10-23: same name and ticker, and
  // Jupiter's price within ~1 % of the EVM group's (DefiLlama / CoinGecko) —
  // e.g. Aster's vanity `ASTER…` mint at $0.7075 against `aster-2` at $0.7094.
  // Same-ticker tokens WITHOUT that price match are left chain-scoped (Solayer
  // vs UniLayer `LAYER`, Solana vs Sonic Name Service `SNS`, the Backpack
  // stocks vs Dinari / Robinhood ones — different issuers, different assets).
  ASTERYpc2EhivYWSbtuWPuCMdXtZGmHwtH93NqYVw45Z: 'Aster::ASTER',
  '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN': 'Official Trump::TRUMP',
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 'Marinade staked SOL (mSOL)::mSOL',
  GbbesPbaYh5uiAZSYNXTc7w9jty1rpg3P9L4JeN4LkKc: 'TRON::TRX',
  '5GgRAEmv8ZxF2PR5hY72Qs5x1bnQ6UK2RbTPoqJ3wSwW': 'PAXG',
  taoC6xyv2v8tDLcev4uaGUgV4vdQsWJrGft2kcBRrBY: 'Bittensor::TAO',
  EicWvteVi2fWepEzS3FYWsnuPoP6caZfjnKqNvydLjCH: 'Lighter::LIT',
  '4SoQ8UkWfeDH47T56PA53CZCeW4KytYCiU65CwBWoJUt': 'MNT',
  a11bdAAuV8iB2fu7X6AxAvDTo1QZ8FXB3kk5eecdasp: 'Allbridge::ABR',
  // the bare group is Binance-Peg DOGE; `Dogecoin::DOGE` on 56 is a meme
  DoGEV7LASBkQbibMc5k5vKnTZoMg423GpJ5QtJEGfm7R: 'DOGE',
  PEPEqnuuCDbBC89p1u9vpnP1KQ2oj1xTcQBsjt9X55m: 'PEPE',
  CrAr4RRJMBVwRsZtT62pEhfA9H5utymC2mVx8e7FreP2: 'MON',
  '9gP2kCy3wA1ctvYWQk75guqXuHfrEomqydHLtcTCqiLa': 'BNB',
  soKqZS9pASwBNS46G388nhK7XVtPaTyReffXEd3zora: 'Zora::ZORA',
  Morpho2VPeTr2E1Jx6monxCzF7mqwUnjz74RdwLXYyP: 'MORPHO',
  // the deeper of the two UNI mints; Portal UNI (`8FU95…`) stays chain-scoped
  uniHfuPhEQSrtpzXpJZDCSq53yaejKKpNhFUiKoHKHV: 'UNI',
  avaxGHCq3T7hoxd73oY2KY9hJSTaeMibXvHy5KNzh5D: 'AVAX',
  WLDTE73PPdfFFjhpBz8Yuhvx5N45gvgEgyMXqwa3rFn: 'WLD',
  qntUzPUsJ51abNP7VYNxkmsQ4RnvEZAhavUxsCxpxH4: 'QNT',
  ondohH8Vssxiqcy5u6Efi4AYN17KZrzQtv2a91dnrgW: 'Ondo Finance::ONDO',
  // Ondo's OUSG: CoinGecko's `ousg` coin names this mint beside 1 / 137 (0x1b19… / 0xba11…),
  // which carry this group. Not Jupiter-verified, so it joins through SOLANA_EXTRA_MINTS.
  i7u4r16TcsJTgq1kAG8opmVZyVnAKBwLKu6ZPMwzxNc: 'Ondo Short-Term US Government Treasuries::OUSG',
  VVV4UdRywr7SLafPHzqXwRCw7myXkmgCtitXUvj8g8c: 'Venice Token::VVV',
  cbLTC4T5NpzSUtQ7ekgEMZGaUPVJY1ko6BUikqa4gGf: 'Coinbase Wrapped LTC::CBLTC',
  cbADAmv9issuPfhFwyQG3xac4DGPd1LDSt1oz7vwJsg: 'Coinbase Wrapped ADA::CBADA',
  ARBzQTYDCW2KnVEjs1Mc81LekB1ibVFZKbSVmorkoT9d: 'ARB',
  // the original SHX (`0xee75…`), not the `::1::0` second listing
  EFchnNkBvh4gSY5zqDgqRfuPR7mStBLvKBxPq5JUJcmP: 'Stronghold::SHX',
  '3UCMiSnkcnkPE1pgQ5ggPCBv6dXgVUy16TmMUe1WpG9x': 'ALEPH',
  '26VfKb7jjtdEdvfovoBijScoZmJbWWasFZkgfUD5w7cy': 'Mog Coin::MOG',
  '3rQK45d1ojXR7vtvCmeNjKKVycnVWqaVcP3zk1G39RJR': 'S',
  XPLTrL1ZH3tZJBdFWbbtrNjK9qoqZWfuhQJnXibbdfT: 'XPL',
  megaA5QDK1qLXtjpvg9oCFMvxT9d5BCMrVTBddnM5kV: 'MegaETH::MEGA',
  shib5gSoVKPjwkXrxRk7SbQFzb2R9rQB3TgQWYX4RwW: 'SHIB',
  EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o: 'DAI',
  // the one Solana xStock whose EVM twin CoinGecko does not join (same Backed product)
  Xsy66wss7g59sgVeeCGvC1fDujEZcHgFMQxXPWgaDhF: 'Webster Financial xStock::WBSX',
}

/**
 * Mints Jupiter does NOT verify that a Solana lending market nevertheless
 * holds as a reserve — so positions in them exist, and a token the list does
 * not carry never reaches the classification / issuer overlay. Each is fetched
 * one by one from Jupiter's search (`tokens/v2/search?query=<mint>`, which
 * answers unverified mints too) and joins the roster past the liquidity floor.
 *
 * The bar: the mint is a reserve of a named lending market (the evidence on
 * the line), and its identity is corroborated by the issuer's own metadata
 * host. A mint that merely shares a ticker with something is not listed —
 * `STCC` (ScarCoin, a Save memecoin market) and the second `DAI` on Save's
 * "LST" market (`FWhZyxJQ…`, no issuer metadata) are deliberately absent.
 */
const SOLANA_EXTRA_MINTS: { [mint: string]: string } = {
  sUSDai6Y3GxysDEtA9BVcEFTaog6UZpYUVxJiMhAKYE:
    'Kamino "sUSDai Market" reserve; Jupiter-verified today, kept here should that lapse',
  GArhnnDj3GYhmQeApKVXaRv4TQFwhPcs3SNF6FXsTeXq: 'Kamino "Nest Market" reserve; icon on assets.plume.org (Nest)',
  // Nest's other Solana shares: not a lending reserve today, but the issuer
  // publishes the mint (`api.nest.credit/v1/vaults` → `solana.mintAddress`),
  // which is a stronger identity than a reserve, and a holder needs the row.
  '8qujzAXj2nz99CmeiCgPPc2JxEuDNYvPffzRomroJnee': 'Nest nALPHA; mint published by api.nest.credit',
  '2sA2jW9e8EYJkLFpq9hkhxfVUQBwVGJwq6iP4TmTKrL4': 'Nest nTBILL; mint published by api.nest.credit',
  G6SkPqYTbtVFYU4krZLDgHf5MVMfARG57G1kog4RYH2n: 'Nest nBASIS; mint published by api.nest.credit',
  '77DTSzxisdQWshFYHP9M2JBDuHNojLAVoC7GBNC2yadT': 'Nest nWISDOM; mint published by api.nest.credit',
  '14BM5Nvq2kuJPn4vFNqiPM3XSBzVaqEjZrDT7ZYLS2nB': 'Nest nLCRD; mint published by api.nest.credit',
  '4bpR1mvWgL25NxWBfYKDjiYGfAVttTeo9VJ1LvmbPj9y': 'Nest nFALCON; mint published by api.nest.credit',
  BKHcMUx4XXy3JA4tk9BXM8f6huFLESFtvq9tj9PDiVzf: 'Nest nCLOA; mint published by api.nest.credit',
  '6ESVavhfwC4rXHHHZmR6ajg7nLmL6X5UkpZuAcoA7xj7': 'Nest FACTOR (Plume Factor Vault); mint published by api.nest.credit',
  BwB3tNH92jKw6naNGDYDbDwRo8bvYxZVvZjRZRcoWR2h: 'Kamino "Obligate Market" reserve (oTFY); icon on app.obligate.com',
  '7GzQgf6DPo6ZANjnbhe9tNCpkGTv3zqHbsDx74jyQf9':
    'Kamino "Superstate Opening Bell Market" reserve (FWDI); icon on assets.superstate.com — NOT the Backpack FWDI',
  SAVEDpx3nFNdzG3ymJfShYnrBuYy7LtQEABZQ3qtTFt:
    'Save main market reserve "Save Staked SOL (saveSOL)"; icon on save-assets',
  sctmpFDKXZPEfTCEgDHqwxepmorCpYA5Q2CrYUytGDU: 'Save main market reserve "Save Staked SOL"; icon on save-assets',
  // Exponent's senior tranche of Hastra AUTO — not in Exponent's /tokens yet
  // (no PT vault), but its mint authority is a PDA of Exponent's tranching
  // program (XPTrnch…), the same owner as srONyc's.
  F17tzaQaFf1x3tC5gQFVvXAF2hcgq1qX6Mc9595zo3FD:
    'Loopscale "srAUTO / USDC" loop collateral (srAUTO, Exponent Senior AUTO); mint authority owned by Exponent tranching',
  // The rest of Loopscale's pairs (`/markets/lending_vaults/info` assetTerms ∪
  // `/markets/loop/info`, 2026-10-05) whose mint the list did not carry: the
  // converter then names the leg `F17t…o3FD`. The 35 0-decimal, supply-1
  // collateral mints (NFTs, 32 of them on the `dawn…` principal) are out of
  // scope. Exponent's senior tranches: mint authority a
  // PDA of Exponent's tranching program (XPTrnch…), metadata on
  // `api.exponent.finance/tranching-token/<mint>`.
  '9J8VvigcjFTkN3jhZH2ieTi2hdGVBVpEXbcA1JDo7QpA':
    'Loopscale "srONyc / USDC" + "srONyc / USDG" loop collateral; Exponent /tokens + /sy-tokens (wsrONyc underlying)',
  FvQP1fjox2GPSwkEhENuZisz8UeRURLWf7GYF9n2mURD:
    'Loopscale "srEHYUSD / USDC" loop collateral; Exponent /tokens + /sy-tokens (wsrEHYUSD underlying)',
  '4tnzVYkaXKwMt7p86wpDzeTyzHSZhj2BvdGwBem7peH5':
    'Loopscale "srnOPAL / USDC" loop collateral; Exponent tranching-token metadata — NOT Strata\'s EVM srNOPAL',
  E1ovyHMqfSQxEofRP2T1pP5iZ2obug92WBvar1KKQKn8:
    'Loopscale "PT-sUSDai-25FEB27 / USDG" loop collateral; api.exponent.finance/pt-token metadata (vault absent from /vaults)',
  // Loopscale's own vault shares: the `lpMint` of its curated vaults.
  Hj3avy8d4k1skU3aScok7VWxEQSw6Bchuu5C9oV6vNz5:
    'Loopscale "USDC Genesis" vault lpMint (oneUSDC); collateral on Loopscale USDC + SOL vaults',
  GMGm82jMiMCVQZfnHcD96b8YF8BXvLHteKhEaj3fZjDe:
    'Loopscale "SOL Genesis" vault lpMint (oneSOL); collateral on a Loopscale USDC vault',
  // Securitize funds — Token-2022 metadata on metadata.securitize.io.
  FubtUcvhSCr3VPXEcxouoQjKQ7NWTCzXyECe76B7L3f8:
    'Loopscale "ACRED / USDG" loop collateral; metadata.securitize.io/acred.json',
  EuTtCw35R3BJnTmXCREctjCU9XTkZXsQjqnoNg7NwdnZ:
    'Loopscale "HINC / USDG" loop collateral; metadata.securitize.io/hinc.json',
  // Etherfuse stablebonds and the local-currency stables they loop against.
  CETES7CKqqKQizuSN6iWQwmTeFRjbJR6Vw2XRKfEDR8f:
    'Loopscale "CETES / MXNe" + "CETES / USDC" loop collateral; metadata on stablebonds.s3 (Etherfuse)',
  GiLTSeSFnNse7xQVYeKdMyckGw66AoRmyggGg1NNd4yr:
    'Loopscale "GILTS / tGBP" loop collateral; metadata on stablebonds.s3 (Etherfuse)',
  BRNTNaZeTJANz9PeuD8drNbBHwGgg7ZTjiQYrFgWQ48p:
    'Loopscale "TESOURO / BRZ" + "TESOURO / USDC" loop collateral; metadata on stablebonds.s3 (Etherfuse)',
  '6zYgzrT7X2wi9a9NeMtUvUWLLmf2a8vBsbYkocYdB9wa':
    'Loopscale "CETES / MXNe" loop principal; metadata on brale.xyz (Real MXN)',
  '2zMqyX4AYCk6mgy5UZ2S7zUaLxwERhK5WjqDzkPPbSpW':
    'Loopscale "GILTS / tGBP" loop principal; metadata on superset-finance, CoinGecko `tokenised-gbp` names this mint',
  BRZbFNQDcWLfcdHmAkqEVnLHCAWKTRf6eHyEaWdZp3JN:
    'Loopscale "TESOURO / BRZ" loop principal; Token-2022 metadata on transferotokensconfig (Transfero)',
  // Staked / wrapped collateral on Loopscale vault offers and loops.
  WFRGB49tP8CdKubqCdt5Spo2BdGS4BpgoinNER5TYUm:
    'Loopscale zBTC vault collateral (wfragBTC); mint authority owned by Fragmetric (fragnAis…), icon on fragmetric-assets',
  FRAGSEthVFL7fdqM8hxfxkfCZzUvmg21cqPJVvC1qdbo:
    'Fragmetric fragSOL — the receipt wfragSOL wraps 1:1 (Exponent PT-fragSOL underlying); Token-2022, mint authority = the Fragmetric fund 3TK9fNeP…, icon on fragmetric-assets',
  CHa1NzoGsJ8wAEQUBjwtyUcv7rQBDW2yk3c8LvqaA8Lb: 'Loopscale "chainSOL / SOL" loop collateral (Chainflow Staked SOL)',
  G4L8PeENzfepB3jBpDKJ5McnHbXA7nh8gQQsZJQptVM7:
    'Loopscale "sUSD.tel / USDG" loop collateral (Dawn telecom-revenue vault); Metaplex metadata on its own pinata gateway',
  // Upshift curator vault shares (August's shared `august_vault` program,
  // up12…): the `receipt.address` app.upshift.finance/api/proxy/vaults
  // publishes for each Solana vault, whose mint authority is the vault's own
  // VaultState PDA. Served as earn rows; a holder needs the row.
  DM1tChyt4i988nhqrUs4iog96jXeRaGCas6MgR9iMe3x:
    'Upshift "Gamma Research USDC Vault" share (upGammaUSD); mint published by app.upshift.finance, authority = its august_vault VaultState',
  CnhPtD2gHHrUvfuA6HrDdLQBKjGgVL8HZMJNCZdXuWEs:
    'Upshift "Y10k GMTrade MetaVault" share (y10kGMV); mint published by app.upshift.finance, authority = its august_vault VaultState',
  i7u4r16TcsJTgq1kAG8opmVZyVnAKBwLKu6ZPMwzxNc:
    'Ondo OUSG — CoinGecko `ousg` platforms list this mint beside Ethereum / Polygon; Jupiter answers it unverified ("Ondo Short-Term US Gov Bond Fund")',
}

/**
 * Name / symbol for an extra mint whose Jupiter answer is unusable, beating it.
 * Jupiter answers the Exponent senior tranches and sUSD.tel BLANK (they would
 * publish with `symbol: ""`), and the PT with its bare on-chain `PT-sUSDai`,
 * which every later maturity would share. Taken from the issuer's metadata,
 * never invented; the PT gets Exponent's `<ticker>-<DDMONYY>` symbol, the
 * spelling `exponentApi.ts` gives every other PT.
 */
const SOLANA_IDENTITY: { [mint: string]: { name: string; symbol: string } } = {
  '9J8VvigcjFTkN3jhZH2ieTi2hdGVBVpEXbcA1JDo7QpA': { name: 'Exponent Senior ONyc', symbol: 'srONyc' },
  FvQP1fjox2GPSwkEhENuZisz8UeRURLWf7GYF9n2mURD: { name: 'Exponent Senior eHYUSD', symbol: 'srEHYUSD' },
  '4tnzVYkaXKwMt7p86wpDzeTyzHSZhj2BvdGwBem7peH5': { name: 'Exponent Senior nOPAL', symbol: 'srnOPAL' },
  G4L8PeENzfepB3jBpDKJ5McnHbXA7nh8gQQsZJQptVM7: { name: 'sUSD.tel', symbol: 'sUSD.tel' },
  E1ovyHMqfSQxEofRP2T1pP5iZ2obug92WBvar1KKQKn8: { name: 'Exponent PT-sUSDai-25FEB27', symbol: 'PT-sUSDai-25FEB27' },
  // Jupiter-VERIFIED but nameless (`name: ""`): the names Hastra publishes on
  // its EVM deployments, so `currencyId` is not `::PRIME`.
  '8fr7WGTVFszfyNWRMXj6fRjZZAnDwmXwEpCrtzmUkdih': { name: 'Hastra wYLDS', symbol: 'wYLDS' },
  '3b8X44fLF9ooXaUm3hhSgjpmVs6rZZ3pPoGnGahc3Uu7': { name: 'Hastra PRIME', symbol: 'PRIME' },
  // Upshift vault shares: the vault name and receipt symbol Upshift's listing
  // publishes — Jupiter answers y10kGMV blank and upGammaUSD as "upGammaUSD Solana".
  DM1tChyt4i988nhqrUs4iog96jXeRaGCas6MgR9iMe3x: { name: 'Gamma Research USDC Vault', symbol: 'upGammaUSD' },
  CnhPtD2gHHrUvfuA6HrDdLQBKjGgVL8HZMJNCZdXuWEs: { name: 'Y10k GMTrade MetaVault', symbol: 'y10kGMV' },
}

/**
 * Icons for listed mints that neither Jupiter nor CoinGecko carries one for —
 * the issuer's own host only, the same host its sibling shares are served from.
 */
const SOLANA_LOGOS: { [mint: string]: string } = {
  BKHcMUx4XXy3JA4tk9BXM8f6huFLESFtvq9tj9PDiVzf: 'https://assets.plume.org/images/logos/nest/nCLOA/nCLOA-token.svg',
  '14BM5Nvq2kuJPn4vFNqiPM3XSBzVaqEjZrDT7ZYLS2nB': 'https://assets.plume.org/images/logos/nest/nLCRD/nLCRD-token.svg',
  // Exponent senior tranches: the `image` of api.exponent.finance/tranching-token/<mint>.
  F17tzaQaFf1x3tC5gQFVvXAF2hcgq1qX6Mc9595zo3FD: 'https://cdn.exponent.finance/senior-tokens/srAUTO.svg',
  '9J8VvigcjFTkN3jhZH2ieTi2hdGVBVpEXbcA1JDo7QpA': 'https://cdn.exponent.finance/senior-tokens/srONyc.svg',
  FvQP1fjox2GPSwkEhENuZisz8UeRURLWf7GYF9n2mURD: 'https://cdn.exponent.finance/senior-tokens/srEHYUSD.svg',
  '4tnzVYkaXKwMt7p86wpDzeTyzHSZhj2BvdGwBem7peH5': 'https://cdn.exponent.finance/senior-tokens/srnOPAL.svg',
  // The `image` of metadata.securitize.io/hinc.json.
  EuTtCw35R3BJnTmXCREctjCU9XTkZXsQjqnoNg7NwdnZ: 'https://metadata.securitize.io/hinc_logo.png',
  // The `logoUrl` of each vault in app.upshift.finance/api/proxy/vaults.
  DM1tChyt4i988nhqrUs4iog96jXeRaGCas6MgR9iMe3x:
    'https://imagedelivery.net/JKqfgGWnlUbSJb3LhpWg6w/a4149528-4dc0-43f7-1895-c0aa0b293d00/public',
  CnhPtD2gHHrUvfuA6HrDdLQBKjGgVL8HZMJNCZdXuWEs:
    'https://imagedelivery.net/JKqfgGWnlUbSJb3LhpWg6w/04e323ee-0c2d-4a2c-c072-177dbcaabf00/public',
}

interface JupToken {
  id: string
  createdAt?: string
  name: string
  symbol: string
  icon?: string
  decimals: number
  liquidity?: number
  tokenProgram?: string
  isVerified?: boolean
  /** Jupiter's curation tags: `verified`, `lst`, `stable`, `yb`, `rwa`, `xstocks`, `ondo`, … */
  tags?: string[]
}

interface ListEntry {
  chainId: string
  decimals: number
  name: string
  address: string
  symbol: string
  logoURI?: string
  assetGroup: string
  currencyId: string
  props?: TokenProps
}

interface ExponentListToken {
  chainId: string
  name: string
  symbol: string
  address: string
  decimals: number
  logoURI?: string
  props: { exponent: NonNullable<TokenProps['exponent']> }
}

/** Tolerates a missing file so this list never hard-fails on the Exponent step. */
function readExponentList(): ExponentListToken[] {
  try {
    return JSON.parse(fs.readFileSync(EXPONENT_LIST, 'utf8'))
  } catch {
    console.warn('[solana] exponent.json not found — run `npm run exponent`. Proceeding without Exponent PT/YT/SY.')
    return []
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`)
  return (await res.json()) as T
}

/**
 * Every `assetGroup` we already publish, indexed by the address that carries
 * it. OUR OWN LISTS ARE THE AUTHORITY on what a group is — CoinGecko supplies
 * only the claim that two addresses are one asset, never the group's name.
 */
function readPublishedGroups(): { byKey: Map<string, Set<string>>; usage: Map<string, number> } {
  const byKey = new Map<string, Set<string>>()
  const usage = new Map<string, number>()
  for (const file of fs.readdirSync(REPO_ROOT)) {
    if (!file.endsWith('.json')) continue
    const base = file.slice(0, -5)
    if (!/^\d+$/.test(base)) continue // EVM chain lists only
    let data: any
    try {
      data = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'))
    } catch {
      continue
    }
    for (const [address, t] of Object.entries<any>(data?.list ?? {})) {
      const g = t?.assetGroup
      if (!g) continue
      // KEYED BY (chain, address), never by address alone. The same 0x address
      // is a DIFFERENT asset on different chains — `0xf4d92352…` is Tether Gold
      // on HyperEVM and WETH on chain 33139 — so an address-only index put
      // Tether Gold into the `ETH` group. That was a real mis-join this guard
      // caught, not a hypothetical.
      const key = `${base}:${address.toLowerCase()}`
      if (!byKey.has(key)) byKey.set(key, new Set())
      byKey.get(key)!.add(g)
      usage.set(g, (usage.get(g) ?? 0) + 1)
    }
  }
  return { byKey, usage }
}

async function main() {
  const [jup, cgList, cgCoins, cgPlatforms] = await Promise.all([
    getJson<JupToken[]>(JUPITER_VERIFIED),
    getJson<{ tokens: { address: string; logoURI?: string }[] }>(COINGECKO_SOLANA).catch(() => ({ tokens: [] })),
    getJson<{ id: string; symbol: string; platforms?: Record<string, string | null> }[]>(COINGECKO_PLATFORMS),
    getJson<{ id: string; chain_identifier: number | null }[]>(COINGECKO_ASSET_PLATFORMS),
  ])
  const cgLogo = new Map(cgList.tokens.map((t) => [t.address, t.logoURI]))
  const { byKey, usage } = readPublishedGroups()

  // CoinGecko's own slug -> EIP-155 id table (275 of its 466 platforms carry
  // one). Fetched rather than hardcoded, and a slug without an id is simply
  // ignored — failing closed loses a match, guessing invents one.
  const slugToChain = new Map<string, string>()
  for (const p of cgPlatforms) if (p.chain_identifier) slugToChain.set(p.id, String(p.chain_identifier))

  const kept = jup.filter((t) => t.isVerified !== false).filter((t) => (t.liquidity ?? 0) >= MIN_LIQUIDITY_USD)

  // The lending reserves Jupiter does not verify (SOLANA_EXTRA_MINTS). A mint
  // the search does not answer EXACTLY is skipped and reported, never guessed.
  const keptIds = new Set(kept.map((t) => t.id))
  const extrasMissing: string[] = []
  let extrasAdded = 0
  for (const mint of Object.keys(SOLANA_EXTRA_MINTS)) {
    if (keptIds.has(mint)) continue
    // Retried with backoff: the search rate-limits a burst of ~30 lookups, and a swallowed 429
    // used to drop every listed mint past the fourth from the list (2026-10-23, 30 of 34).
    let answer: JupToken[] = []
    for (const wait of [0, 1500, 4000, 10000]) {
      if (wait) await new Promise((r) => setTimeout(r, wait))
      try {
        answer = await getJson<JupToken[]>(JUPITER_SEARCH + mint)
        break
      } catch {
        /* retry */
      }
    }
    const hit = answer.find((t) => t.id === mint)
    if (!hit) {
      extrasMissing.push(mint)
      continue
    }
    const identity = SOLANA_IDENTITY[mint]
    kept.push(identity ? { ...hit, ...identity } : hit)
    keptIds.add(mint)
    extrasAdded++
  }
  const bySymbol = new Map(kept.map((t) => [t.id, t.symbol]))

  /**
   * mint -> the group it already has on our EVM chains.
   *
   * Three guards, each of which drops a match rather than guessing:
   *  - the CoinGecko coin's symbol must match Jupiter's, so a bad platform row
   *    cannot quietly move a token into someone else's group;
   *  - candidates are collapsed case-insensitively (`MMMX` / `MMMx` are one);
   *  - a remaining tie prefers a BARE group (no `::`), which is the canonical,
   *    undisambiguated one — `AAVE` over `Aave Token::1AAVE` — then the most
   *    widely used spelling. 56 cases resolve here, all of that shape.
   */
  const crossChain = new Map<string, string>()
  for (const coin of cgCoins) {
    const mint = coin.platforms?.solana
    if (!mint || !bySymbol.has(mint)) continue
    if ((coin.symbol ?? '').toLowerCase() !== (bySymbol.get(mint) ?? '').toLowerCase()) continue

    const candidates = new Set<string>()
    for (const [slug, address] of Object.entries(coin.platforms ?? {})) {
      if (slug === 'solana' || !address) continue
      const chain = slugToChain.get(slug)
      if (!chain) continue
      for (const g of byKey.get(`${chain}:${String(address).toLowerCase()}`) ?? []) candidates.add(g)
    }
    if (!candidates.size) continue

    const bare = [...candidates].filter((g) => !g.includes('::'))
    const pool = bare.length ? bare : [...candidates]
    crossChain.set(
      mint,
      pool.sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0) || a.length - b.length || (a < b ? -1 : 1))[0],
    )
  }

  /**
   * Disambiguation order, and it must be IMMUTABLE.
   *
   * `assetGroup` is an identity downstream joins key on, so a token's suffix
   * may never move between runs. Ordering by liquidity would do exactly that.
   * `createdAt` is fixed forever AND semantically right — where two tokens
   * claim one name the impostor is the newcomer, so the ORIGINAL keeps the
   * clean group. It is absent on 49 of the verified set and ties outright on
   * `pepe::pepe`, which is why the mint is the tiebreak, not the other way
   * round.
   */
  const ordered = [...kept].sort((a, b) => {
    const ca = a.createdAt ?? '￿'
    const cb = b.createdAt ?? '￿'
    if (ca !== cb) return ca < cb ? -1 : 1
    return a.id < b.id ? -1 : 1
  })

  const exponent = readExponentList()
  const exponentByMint = new Map(exponent.map((e) => [e.address, e]))

  const list: { [address: string]: ListEntry } = {}
  const skippedNoDecimals: string[] = []
  const takenGroups = new Set<string>()
  const globalGroupOwner = new Map<string, string>()
  let suffixed = 0
  let joinedGlobal = 0
  const doubleClaimed: string[] = []

  for (const t0 of ordered) {
    // Nest (Plume Vaults) shares carry the name / symbol they have on every EVM chain
    // (rwa/nestIdentity.ts), not whatever Jupiter's metadata says.
    const nest = lookupNestIdentity(t0.id)
    // SOLANA_IDENTITY also covers verified mints Jupiter publishes nameless
    const identity = SOLANA_IDENTITY[t0.id]
    const t = nest ? { ...t0, name: nest.name, symbol: nest.symbol } : identity ? { ...t0, ...identity } : t0
    // DECIMALS COME FROM THE SOURCE OR THE TOKEN IS DROPPED. Solana decimals are
    // genuinely mixed (6 / 9 / 8 / 5 / 4 / 2), so a default here is the
    // chain-1672 mistake: 48 tokens published at the wrong scale because the
    // list assumed 18.
    if (typeof t.decimals !== 'number' || !Number.isInteger(t.decimals)) {
      skippedNoDecimals.push(t.id)
      continue
    }

    const currencyId = `${t.name}::${t.symbol}`
    const global = (nest && nestGroupOf(nest)) ?? SOLANA_MAPPEDS[t.id] ?? crossChain.get(t.id)
    let assetGroup: string

    if (global) {
      // Two Solana mints claiming one global group would be two rows rendering
      // as one asset. Measured: this does not happen today (0 cases), so it is
      // reported rather than silently resolved — if it starts happening the
      // cross-chain map is wrong and a human should look.
      const prior = globalGroupOwner.get(global.toLowerCase())
      if (prior) {
        doubleClaimed.push(`${global} <- ${prior} & ${t.id}`)
        assetGroup = `${currencyId}::solana`
      } else {
        globalGroupOwner.set(global.toLowerCase(), t.id)
        assetGroup = global
        joinedGlobal++
      }
    } else {
      // No evidence it is a known asset ⇒ scope the group to this chain so it
      // can never collide with an unrelated asset that shares a ticker. The
      // Fuel rule (`FUEL_MAPPEDS`).
      assetGroup = `${currencyId}::solana`
    }

    // Two chain-scoped tokens claiming one `name::symbol`, CASE-INSENSITIVELY —
    // the invariant is about what a human sees, and `Pepe::Pepe` vs `Pepe::PEPE`
    // are two strings and one row to a reader. Nine of the fifteen collisions
    // differ only in capitalisation. The first through the ordering above keeps
    // the clean group; the rest are numbered, the shape
    // `generateTokenMap.script.ts` produces on every other chain.
    if (!global && takenGroups.has(assetGroup.toLowerCase())) {
      let n = 0
      while (takenGroups.has(`${assetGroup}::${n}`.toLowerCase())) n++
      assetGroup = `${assetGroup}::${n}`
      suffixed++
    }
    takenGroups.add(assetGroup.toLowerCase())

    let props: TokenProps = {}
    // Token-2022 supports transfer FEES and transfer HOOKS, so a mint on this
    // program is the fee-on-transfer class the EVM side already treats
    // specially — a quote against one can under-deliver. Flagged rather than
    // excluded: several are majors.
    if (t.tokenProgram === TOKEN_2022) props.solana = { tokenProgram: 'token-2022' }
    else if (t.tokenProgram === SPL_TOKEN) props.solana = { tokenProgram: 'spl-token' }
    if (t.id === WSOL) props = { ...props, wnative: true, denomination: 'SOL' }
    if (exponentByMint.has(t.id)) props.exponent = exponentByMint.get(t.id)!.props.exponent

    props = classifySolanaToken(t, assetGroup, props)
    // LayerZero OFT stores of this mint (`npm run oft`), the into-Solana half
    // of the `props.oft` overlay the EVM lists carry
    const oft = lookupOft('solana', t.id)
    if (oft) props = { ...props, oft }

    list[t.id] = {
      chainId: 'solana',
      decimals: t.decimals,
      // Jupiter publishes some verified mints nameless (nine Ondo GM tokens: ECHon, FLHYon …).
      // A mint joined to a global `Name::SYMBOL` group takes that name for display; the
      // `currencyId` key above keeps Jupiter's own spelling.
      name: t.name || (global?.includes('::') ? global.split('::')[0] : t.name),
      address: t.id,
      // Jupiter calls the wSOL mint "SOL". With the native row below also
      // "SOL", the selector would show two identical rows for two different
      // balances — so the wrapper is `wSOL`. Its `currencyId` and `assetGroup`
      // keep the Jupiter symbol: they are keys (prices, the lending join).
      symbol: t.id === WSOL ? 'wSOL' : t.symbol,
      logoURI: t.icon ?? cgLogo.get(t.id) ?? SOLANA_LOGOS[t.id],
      assetGroup,
      currencyId,
      ...(Object.keys(props).length ? { props } : {}),
    }
  }

  // Exponent mints Jupiter does not carry. Always chain-scoped: a PT/YT/SY
  // exists on exactly one chain and joins no global group. A mint Jupiter DOES
  // carry keeps its Jupiter identity and picked up `props.exponent` above.
  let exponentAdded = 0
  for (const e of exponent) {
    if (list[e.address]) continue
    if (typeof e.decimals !== 'number' || !Number.isInteger(e.decimals)) continue
    const currencyId = `${e.name}::${e.symbol}`
    let assetGroup = `${currencyId}::solana`
    if (takenGroups.has(assetGroup.toLowerCase())) {
      let n = 0
      while (takenGroups.has(`${assetGroup}::${n}`.toLowerCase())) n++
      assetGroup = `${assetGroup}::${n}`
      suffixed++
    }
    takenGroups.add(assetGroup.toLowerCase())
    // Through the same overlay as a Jupiter token, so the PT / YT / SY gets
    // its issuer (`exponent`, from the family prop) and the exposure its
    // underlying walk reaches. Untagged, so nothing tag-gated fires.
    const props = classifySolanaToken({ id: e.address, name: e.name, symbol: e.symbol }, assetGroup, {
      exponent: e.props.exponent,
    })
    list[e.address] = {
      chainId: 'solana',
      decimals: e.decimals,
      name: e.name,
      address: e.address,
      symbol: e.symbol,
      logoURI: e.logoURI,
      assetGroup,
      currencyId,
      props,
    }
    exponentAdded++
  }

  // The native row, after the roster: it shares wSOL's group by design, so it
  // must not pass through the group-uniqueness bookkeeping above.
  const wsol = list[WSOL]
  if (wsol) {
    list[NATIVE_SOL] = {
      chainId: 'solana',
      decimals: 9,
      name: 'Solana',
      address: NATIVE_SOL,
      symbol: 'SOL',
      logoURI: NATIVE_SOL_LOGO,
      assetGroup: wsol.assetGroup,
      currencyId: 'Solana::SOL',
      props: { isNative: true, wrapped: WSOL },
    }
  } else {
    console.warn('wSOL missing from the roster — no native SOL row written')
  }

  const sortedList: { [address: string]: ListEntry } = {}
  for (const k of Object.keys(list).sort()) sortedList[k] = list[k]
  applyLogoOverrides('solana', sortedList)

  const mainTokens = kept
    .filter((t) => list[t.id])
    .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))
    .slice(0, MAIN_TOKEN_COUNT)
    .map((t) => t.id)

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      { chainId: 'solana', version: { major: 1, minor: 0, patch: 0 }, list: sortedList, mainTokens },
      null,
      2,
    ) + '\n',
  )

  const vals = Object.values(sortedList)
  const byGroup = new Map<string, number>()
  for (const e of vals) {
    const k = e.assetGroup.toLowerCase()
    byGroup.set(k, (byGroup.get(k) ?? 0) + 1)
  }
  // Native SOL and wSOL share a group ON PURPOSE (one asset, two forms — the
  // ETH/WETH rule); every other share is a defect.
  const nativeGroup = sortedList[NATIVE_SOL]?.assetGroup.toLowerCase()
  const groupDupes = [...byGroup.entries()].filter(([k, c]) => c > (k === nativeGroup ? 2 : 1))

  console.log(`jupiter verified            : ${jup.length}`)
  console.log(`kept (liquidity >= $${MIN_LIQUIDITY_USD.toLocaleString()})   : ${vals.length}`)
  console.log(
    `joined an EXISTING group    : ${joinedGlobal}  (${((joinedGlobal / vals.length) * 100).toFixed(1)} % — cross-chain assets)`,
  )
  console.log(`  of which by explicit map  : ${vals.filter((e) => SOLANA_MAPPEDS[e.address]).length}`)
  console.log(`chain-scoped (::solana)     : ${vals.filter((e) => e.assetGroup.includes('::solana')).length}`)
  console.log(`disambiguated with ::N      : ${suffixed}`)
  console.log(
    `token-2022 mints            : ${vals.filter((e) => e.props?.solana?.tokenProgram === 'token-2022').length}`,
  )
  const withProp = (k: keyof TokenProps) => vals.filter((e) => e.props?.[k]).length
  console.log(`classified lst              : ${withProp('lst')}`)
  console.log(`classified rwa              : ${withProp('rwa')}`)
  console.log(`classified stablecoin       : ${withProp('stablecoin')}`)
  console.log(`classified savings          : ${withProp('savings')}`)
  console.log(`denomination set            : ${withProp('denomination')}`)
  console.log(`issuer set                  : ${withProp('issuer')}`)
  console.log(`issuerExposures set         : ${withProp('issuerExposures')}`)
  console.log(`unverified lending mints    : ${extrasAdded} added (SOLANA_EXTRA_MINTS)`)
  if (extrasMissing.length) console.log(`  NOT ANSWERED by search     : ${extrasMissing.join(', ')}`)
  console.log(
    `exponent PT/YT/SY           : ${withProp('exponent')}  (${exponentAdded} added, ${exponent.length - exponentAdded} already verified by Jupiter)`,
  )
  if (skippedNoDecimals.length) console.log(`DROPPED, no decimals        : ${skippedNoDecimals.length}`)
  if (doubleClaimed.length)
    console.log(`GROUP DOUBLE-CLAIMED        : ${doubleClaimed.length} ${JSON.stringify(doubleClaimed.slice(0, 5))}`)
  // THE invariant. Anything but 0 means two rows would render as one thing.
  console.log(
    `shared assetGroups          : ${groupDupes.length}${groupDupes.length ? '  <- MUST BE 0: ' + JSON.stringify(groupDupes.slice(0, 5)) : ''}`,
  )
  console.log(`written                     : ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
