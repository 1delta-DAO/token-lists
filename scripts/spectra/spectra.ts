import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { processSpectraAssets } from './spectraApi'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function generateSpectraList() {
  console.log('Generating Spectra asset list...')
  try {
    const spectraAssets = await processSpectraAssets()

    // Sort deterministically, for the same reason `pendle.ts` does: the API
    // returns markets in an unstable order, and an unsorted write turns every
    // regeneration into a whole-file reorder diff. Address is the only
    // immutable key — sorting on symbol or name would reshuffle the moment
    // Spectra renames a market upstream.
    const flatList = Object.values(spectraAssets)
      .flatMap((chainAssets) => Object.values(chainAssets))
      .sort((a, b) => Number(a.chainId) - Number(b.chainId) || a.address.localeCompare(b.address))

    const outputPath = path.resolve(__dirname, './spectra.json')
    fs.writeFileSync(outputPath, JSON.stringify(flatList, null, 2))

    console.log(`Successfully generated spectra.json with ${flatList.length} assets.`)
  } catch (error) {
    console.error('Error generating Spectra asset list:', error)
    process.exit(1)
  }
}

generateSpectraList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
