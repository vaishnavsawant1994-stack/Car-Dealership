import { describe, expect, it } from 'vitest'
import { AUDIT_PAGE_SIZE, auditListSelect, auditPageOffset, buildAuditWhere, parseAuditFilters } from './audit-query'

describe('P1-08 audit timeline query boundaries', () => {
  it('parses only bounded numeric pages', () => {
    expect(parseAuditFilters({ page: '2' }).page).toBe(2)
    expect(parseAuditFilters({ page: '0' }).page).toBe(1)
    expect(parseAuditFilters({ page: '-200' }).page).toBe(1)
    expect(parseAuditFilters({ page: 'Infinity' }).page).toBe(1)
    expect(parseAuditFilters({ page: '999999999999' }).page).toBe(1)
    expect(parseAuditFilters({ page: '10001' }).page).toBe(10_000)
    expect(auditPageOffset(parseAuditFilters({ page: '3' }))).toBe(2 * AUDIT_PAGE_SIZE)
  })

  it('ignores malicious, invalid or unbounded action/resource categories', () => {
    expect(parseAuditFilters({ action: 'some.action', resource: 'User', search: ' test ' })).toMatchObject({
      action: 'some.action', resource: 'User', search: 'test',
    })
    expect(parseAuditFilters({ action: 'a'.repeat(100) }).action).toBe('')
    expect(parseAuditFilters({ resource: 'Vehicle; DROP TABLE User' }).resource).toBe('')
    expect(parseAuditFilters({ search: 'b'.repeat(500) }).search).toHaveLength(120)
  })

  it('builds exact action/resource filters while retaining case-insensitive search', () => {
    expect(buildAuditWhere(parseAuditFilters({ page: '2', action: 'USER_DISABLED', resource: 'User', search: 'record' }))).toMatchObject({
      action: 'USER_DISABLED',
      resourceType: 'User',
      OR: [{ summary: { contains: 'record', mode: 'insensitive' } }, { action: { contains: 'record', mode: 'insensitive' } }],
    })
  })

  it('never includes sensitive legacy metadata fields in list selection', () => {
    for (const key of ['metadata', 'userAgent', 'rawIp', 'secret', 'passwordHash']) {
      expect(Object.prototype.hasOwnProperty.call(auditListSelect, key)).toBe(false)
    }
    expect(auditListSelect.actor.select).toEqual({ name: true, email: true })
  })
})
