// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { RwaRegistry } from '../utils/types'
import { CandidateRow, LabelToken, readChainLists, serializeRegistry, toLabelToken } from '../labels/labelUtils'
import { classifyRwaLst } from '../labels/rwaLstRules'
import { RWA_MANUAL } from './rwaAssets'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Builds the RWA asset list, mirroring `pendle/pendle.ts` (LST lives in the sibling
 * `lst/` module — categorically separate map, identical mechanism):
 *  - writes `rwa.json` (registered as RWA_LIST in externalLists.ts; props flow into the maps)
 *  - refreshes the auto-rule registry seed (rwaAssets.generated.ts)
 *  - writes the candidate review queue (rwa-candidates.json)
 */
function generateRwaList() {
  console.log('Generating RWA asset list...')
  try {
    const lists = readChainLists()
    const tokens: LabelToken[] = []
    const generated: RwaRegistry = {}
    const candidates: CandidateRow[] = []
    let scanned = 0

    for (const { chainId, tokens: chainTokens } of lists) {
      for (const t of chainTokens) {
        scanned++
        const address = (t.address ?? '').toLowerCase()
        if (!address) continue

        const manual = RWA_MANUAL[chainId]?.[address]
        const c = classifyRwaLst({ name: t.name, symbol: t.symbol })

        if (c?.confidence === 'auto' && c.rwa) {
          ;(generated[chainId] ??= {})[address] = c.rwa
        } else if (c?.confidence === 'candidate' && c.rwa && !manual) {
          candidates.push({ chainId, address, symbol: t.symbol ?? '', name: t.name ?? '', rule: c.rule, rwa: c.rwa })
        }

        const props = manual ?? (c?.confidence === 'auto' ? c.rwa : undefined)
        if (!props) continue
        tokens.push(toLabelToken(chainId, t, { rwa: props }))
      }
    }

    candidates.sort((a, b) => a.rule.localeCompare(b.rule) || a.symbol.localeCompare(b.symbol))
    const count = Object.values(generated).reduce((n, c) => n + Object.keys(c).length, 0)

    fs.writeFileSync(path.resolve(__dirname, './rwa.json'), JSON.stringify(tokens, null, 2))
    fs.writeFileSync(
      path.resolve(__dirname, './rwaAssets.generated.ts'),
      serializeRegistry('RWA_GENERATED', 'RwaRegistry', 'npm run rwa', generated),
    )
    fs.writeFileSync(path.resolve(__dirname, './rwa-candidates.json'), JSON.stringify(candidates, null, 2))

    console.log(`Scanned ${scanned} tokens across ${lists.length} chain lists.`)
    console.log(`Wrote rwa.json with ${tokens.length} labelled tokens (auto seed: ${count}).`)
    console.log(`Candidates for review: ${candidates.length} -> rwa/rwa-candidates.json`)
  } catch (error) {
    console.error('Error generating RWA asset list:', error)
    process.exit(1)
  }
}

generateRwaList()
