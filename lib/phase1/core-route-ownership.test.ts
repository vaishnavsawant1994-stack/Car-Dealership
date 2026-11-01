import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { UserRole } from '@prisma/client'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { coreFoundationRoutes } from './core-route-ownership'

const readSource = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8')

function handlerSource(content: string, method: string) {
  const expr = new RegExp('export\\s+async\\s+function\\s+' + method + '\\s*\\(')
  const first = expr.exec(content)
  if (!first) return ''
  const from = first.index + first[0].length
  const next = /export\s+async\s+function\s+(GET|POST|PATCH|DELETE)\s*\(/g
  next.lastIndex = from
  return content.slice(from, next.exec(content)?.index ?? content.length)
}

describe('P1-01 core foundation route contracts', () => {
  it('keeps all inventoried pages and API route files present', () => {
    for (const item of coreFoundationRoutes) {
      expect(existsSync(join(process.cwd(), item.page)), item.page).toBe(true)
      expect(existsSync(join(process.cwd(), item.api)), item.api).toBe(true)
    }
  })
  it('enforces the expected authorization in each server handler', () => {
    for (const item of coreFoundationRoutes) {
      const content = readSource(item.api)
      for (const { method, permission } of item.methods) {
        const region = handlerSource(content, method)
        expect(region.length, item.api + ' ' + method).toBeGreaterThan(0)
        expect(region, item.api + ' ' + method)
          .toContain("authorizeAdminRequest('" + permission + "')")
      }
    }
  })
  it('does not duplicate API handler ownership', () => {
    const keys = coreFoundationRoutes.flatMap((item) =>
      item.methods.map(({ method }) => item.api + '#' + method))
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('denies customer access to all foundation admin operations', () => {
    const perms = new Set(coreFoundationRoutes.flatMap(item => item.methods.map(x => x.permission)))
    for (const permission of perms) expect(hasPermission(UserRole.CUSTOMER, permission), permission).toBe(false)
  })
  it('SUPER_ADMIN has foundation permissions but SALES cannot manage system/security', () => {
    const perms = new Set(coreFoundationRoutes.flatMap(item => item.methods.map(x => x.permission)))
    for (const permission of perms) expect(hasPermission(UserRole.SUPER_ADMIN, permission), permission).toBe(true)
    for (const permission of ['showroom.manage','settings.update','auditLog.view','emailCapture.view','user.update'] as const) {
      expect(hasPermission(UserRole.SALES, permission), permission).toBe(false)
    }
  })
})
