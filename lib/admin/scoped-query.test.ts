import { describe, expect, it } from 'vitest'
import { andFilters } from './scoped-query'

describe('scoped database filters', () => {
  it('preserves independent assignment, branch, and search OR conditions', () => {
    const assignment = { OR: [{ assignedToId: null }, { assignedToId: 'staff-a' }] }
    const branch = { showroomId: { in: ['showroom-a'] } }
    const search = { OR: [{ referenceNumber: { contains: 'lead' } }, { email: { contains: 'lead' } }] }

    expect(andFilters<Record<string, unknown>>(assignment, branch, search)).toEqual({ AND: [assignment, branch, search] })
  })

  it('removes empty optional filters without dropping access conditions', () => {
    const branch = { showroomId: { in: [] as string[] } }
    expect(andFilters<Record<string, unknown>>({}, branch, undefined)).toEqual({ AND: [branch] })
  })
})
