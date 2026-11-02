import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const routeRoot = join(process.cwd(), 'app', 'api', 'admin')
const leadApiPath = join(process.cwd(), 'lib', 'admin', 'lead-api.ts')
const leadHandlerFactories = new Set([
  'leadCollectionHandlers',
  'leadDetailHandlers',
  'leadAssignHandler',
  'leadMessageHandler',
])

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listRouteFiles(path) : entry.name === 'route.ts' ? [path] : []
  })
}

function exportedMethods(source: string) {
  const functions = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)]
  const destructured = [...source.matchAll(/export\s+const\s+\{([^}]+)\}\s*=\s*([A-Za-z_$][\w$]*)\s*\(/g)]
  const aliases = [...source.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*([A-Za-z_$][\w$]*)\s*\(/g)]

  const directMethods = functions.map((match) => match[1]!)
  const delegatedFactories = [
    ...destructured.flatMap((match) => [
      ...match[1]!.matchAll(/GET|POST|PUT|PATCH|DELETE/g),
    ].map((method) => ({ method: method[0]!, factory: match[2]! }))),
    ...aliases.map((match) => ({ method: match[1]!, factory: match[2]! })),
  ]
  return { directMethods, delegatedFactories }
}

describe('admin API route authorization contract', () => {
  it('covers every exported HTTP handler in every admin route file', () => {
    const routeFiles = listRouteFiles(routeRoot)
    expect(routeFiles.length).toBeGreaterThan(0)

    for (const file of routeFiles) {
      const source = readFileSync(file, 'utf8')
      const { directMethods, delegatedFactories } = exportedMethods(source)
      const label = relative(process.cwd(), file)
      const totalMethods = directMethods.length + delegatedFactories.length
      expect(totalMethods, `${label} exports at least one handler`).toBeGreaterThan(0)

      const authCalls = [...source.matchAll(/authorizeAdminRequest\s*\(|requirePermission\s*\(/g)].length
      if (directMethods.length) {
        expect(delegatedFactories, `${label} does not mix direct and delegated handlers`).toHaveLength(0)
        expect(authCalls, `${label} guards every direct HTTP method`).toBe(directMethods.length)
        const functionMatches = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)]
        for (let index = 0; index < functionMatches.length; index += 1) {
          const start = functionMatches[index]!.index!
          const end = functionMatches[index + 1]?.index ?? source.length
          const handler = source.slice(start, end)
          const handlerAuthCalls = [...handler.matchAll(/authorizeAdminRequest\s*\(|requirePermission\s*\(/g)]
          expect(handlerAuthCalls, `${label} ${functionMatches[index]![1]} is server-authorized`).toHaveLength(1)
        }
      } else {
        expect(authCalls, `${label} delegates instead of implementing its own HTTP methods`).toBe(0)
        expect(delegatedFactories, `${label} delegates every HTTP method`).toHaveLength(totalMethods)
        for (const { factory } of delegatedFactories) {
          expect(leadHandlerFactories.has(factory), `${label} uses an approved secured lead handler`).toBe(true)
        }
      }
    }
  })

  it('keeps every shared lead handler behind its matching server-side permission', () => {
    const source = readFileSync(leadApiPath, 'utf8')
    expect(source).toContain("authorizeAdminRequest(permissions[kind].view)")
    expect(source).toContain("authorizeAdminRequest(permissions[kind].update)")
    expect(source).toContain("authorizeAdminRequest(permissions[kind].assign)")
  })
})
