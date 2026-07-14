// @ts-ignore-next-line
import * as fs from 'fs'
// @ts-ignore-next-line
import * as path from 'path'
// @ts-ignore-next-line
import { fileURLToPath } from 'url'
import { LstRegistry } from '../utils/types'
import { CandidateRow, LabelToken, readChainLists, serializeRegistry, toLabelToken } from '../labels/labelUtils'
import { classifyRwaLst } from '../labels/rwaLstRules'
import { LST_MANUAL } from './lstAssets'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Builds the LST / LRT asset list, mirroring `pendle/pendle.ts` (RWA lives in the sibling
 * `rwa/` module — categorically separate map, identical mechanism):
 *  - writes `lst.json` (registered as LST_LIST in externalLists.ts; props flow into the maps)
 *  - refreshes the auto-rule registry seed (lstAssets.generated.ts)
 *  - writes the candidate review queue (lst-candidates.json)
 */
function generateLstList() {
  console.log('Generating LST/LRT asset list...')
  try {
    const lists = readChainLists()
    const tokens: LabelToken[] = []
    const generated: LstRegistry = {}
    const candidates: CandidateRow[] = []
    let scanned = 0

    for (const { chainId, tokens: chainTokens } of lists) {
      for (const t of chainTokens) {
        scanned++
        const address = (t.address ?? '').toLowerCase()
        if (!address) continue

        const manual = LST_MANUAL[chainId]?.[address]
        const c = classifyRwaLst({ name: t.name, symbol: t.symbol })

        if (c?.confidence === 'auto' && c.lst) {
          ;(generated[chainId] ??= {})[address] = c.lst
        } else if (c?.confidence === 'candidate' && c.lst && !manual) {
          candidates.push({ chainId, address, symbol: t.symbol ?? '', name: t.name ?? '', rule: c.rule, lst: c.lst })
        }

        const props = manual ?? (c?.confidence === 'auto' ? c.lst : undefined)
        if (!props) continue
        tokens.push(toLabelToken(chainId, t, { lst: props }))
      }
    }

    candidates.sort((a, b) => a.rule.localeCompare(b.rule) || a.symbol.localeCompare(b.symbol))
    const count = Object.values(generated).reduce((n, c) => n + Object.keys(c).length, 0)

    fs.writeFileSync(path.resolve(__dirname, './lst.json'), JSON.stringify(tokens, null, 2))
    fs.writeFileSync(
      path.resolve(__dirname, './lstAssets.generated.ts'),
      serializeRegistry('LST_GENERATED', 'LstRegistry', 'npm run lst', generated),
    )
    fs.writeFileSync(path.resolve(__dirname, './lst-candidates.json'), JSON.stringify(candidates, null, 2))

    console.log(`Scanned ${scanned} tokens across ${lists.length} chain lists.`)
    console.log(`Wrote lst.json with ${tokens.length} labelled tokens (auto seed: ${count}).`)
    console.log(`Candidates for review: ${candidates.length} -> lst/lst-candidates.json`)
  } catch (error) {
    console.error('Error generating LST/LRT asset list:', error)
    process.exit(1)
  }
}

generateLstList()
