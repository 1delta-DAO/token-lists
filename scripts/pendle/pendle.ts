import * as fs from 'fs'
import * as path from 'path'
import { processPendleAssets } from './pendleAssetsFromApi'
import { fileURLToPath } from 'url'

// @ts-igonre
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function generatePendleList() {
  console.log('Generating Pendle asset list...')
  try {
    const pendleAssets = await processPendleAssets()
    const flatList = Object.values(pendleAssets).flatMap((chainAssets) => Object.values(chainAssets))

    const outputPath = path.resolve(__dirname, './pendle.json')
    fs.writeFileSync(outputPath, JSON.stringify(flatList, null, 2))

    console.log(`Successfully generated pendle.json with ${flatList.length} assets.`)
  } catch (error) {
    console.error('Error generating Pendle asset list:', error)
    process.exit(1)
  }
}

generatePendleList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
