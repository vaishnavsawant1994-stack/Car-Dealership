import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const roots = ['app', 'components', 'lib']
const forbidden = [
  /Optimum Automobiles/i,
  /optimumautomobiles\\.com/i,
  /adminoptimumautomobiles/i,
  /omkarpatil525@gmail\\.com/i,
  /919373778780|93737\\s?78780/,
]
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(p)
    return entry.isFile() && /\\.(?:ts|tsx)$/.test(entry.name) && !/\\.test\\.(?:ts|tsx)$/.test(entry.name) ? [p] : []
  })
}

describe('P0-03 client demo source branding safety', () => {
  it('does not include the previous dealership name, live email domain or original phone in active app sources', () => {
    const violations: string[] = []
    for (const root of roots) {
      for (const file of sourceFiles(path.join(process.cwd(), root))) {
        const body = readFileSync(file, 'utf8')
        for (const pattern of forbidden) {
          if (pattern.test(body)) violations.push(`${path.relative(process.cwd(), file)}: ${pattern.source}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
