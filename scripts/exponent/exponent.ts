import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { processExponentAssets } from './exponentApi'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Writes `exponent.json`, the Exponent Finance PT/YT/SY list for Solana.
 *
 * Unlike `pendle.json` / `spectra.json` this is NOT registered in
 * `externalLists.ts`: the generic generator only admits EVM (and Fuel) address
 * shapes and does not carry a Solana chain list at all. `solana/solana.ts`
 * reads this file directly and merges it into `solana.json`, so run
 * `npm run exponent` before `npm run solana` (the `solana` script does).
 */
async function generateExponentList() {
  console.log('Generating Exponent asset list...')
  try {
    const assets = await processExponentAssets()

    // Sort by mint, for the reason `pendle.ts` gives: the API's order is not
    // stable and an unsorted write turns every regeneration into a reorder diff.
    const flatList = Object.values(assets).sort((a, b) => a.address.localeCompare(b.address))

    const outputPath = path.resolve(__dirname, './exponent.json')
    fs.writeFileSync(outputPath, JSON.stringify(flatList, null, 2))

    console.log(`Successfully generated exponent.json with ${flatList.length} assets.`)
  } catch (error) {
    console.error('Error generating Exponent asset list:', error)
    process.exit(1)
  }
}

generateExponentList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
