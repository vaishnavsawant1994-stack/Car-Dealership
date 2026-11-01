import { describe, expect, it } from 'vitest'
import { evaluatePhaseZeroEvidence, phaseZeroGates, type PhaseZeroEvidence } from './readiness'

const goodEvidence = { status: 'passed' as const, note: 'Independently verified and reviewed.', evidence: 'https://github.com/example/example/issues/1' }
const allPassed = (): PhaseZeroEvidence => ({
  schemaVersion: 1,
  lastReviewed: '2026-11-01',
  gates: Object.fromEntries(phaseZeroGates.map(({ id }) => [id, { ...goodEvidence }])) as PhaseZeroEvidence['gates'],
})

describe('P0-08 release-readiness gate', () => {
  it('blocks final approval if P0-06 staff login and image upload are pending', () => {
    const evidence = allPassed()
    evidence.gates.admin_signin = { status: 'pending', note: 'Waiting for ephemeral provisioning.' }
    evidence.gates.image_workflow = { status: 'blocked', note: 'No authenticated image acceptance yet.' }
    const result = evaluatePhaseZeroEvidence(evidence)
    expect(result.releaseApproved).toBe(false)
    expect(result.independentDevelopmentAllowed).toBe(true)
    expect(result.outstanding).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'admin_signin', owner: 'P0-06' }),
      expect.objectContaining({ id: 'image_workflow', owner: 'P0-06' }),
    ]))
  })
  it('also blocks sign-off when audit rights and scheduled backup evidence are missing', () => {
    const evidence = allPassed()
    evidence.gates.audit_append_only = { status: 'pending', note: 'UPDATE privilege still present.' }
    evidence.gates.backup_policy = { status: 'blocked', note: 'No snapshot schedule exists.' }
    const result = evaluatePhaseZeroEvidence(evidence)
    expect(result.outstanding.map(({ id }) => id)).toContain('audit_append_only')
    expect(result.outstanding.map(({ id }) => id)).toContain('backup_policy')
    expect(result.releaseApproved).toBe(false)
  })
  it('fails closed if any required gate is missing', () => {
    const evidence = allPassed()
    delete evidence.gates.final_approval
    expect(evaluatePhaseZeroEvidence(evidence).releaseApproved).toBe(false)
  })
  it('refuses superficial passed claims without a reason and URL evidence', () => {
    const evidence = allPassed()
    evidence.gates.admin_signin = { status: 'passed', note: 'ok', evidence: 'no link' }
    const result = evaluatePhaseZeroEvidence(evidence)
    expect(result.invalidEvidence).toEqual(['admin_signin'])
    expect(result.releaseApproved).toBe(false)
  })
  it('throws for a malformed manifest or unrecognized gate', () => {
    expect(() => evaluatePhaseZeroEvidence({})).toThrow()
    const evidence = allPassed()
    ;(evidence.gates as Record<string, unknown>).secret_bypass = goodEvidence
    expect(() => evaluatePhaseZeroEvidence(evidence)).toThrow('Unknown release gate')
  })
  it('only passes for a fully evidenced manifest', () => {
    const result = evaluatePhaseZeroEvidence(allPassed())
    expect(result.releaseApproved).toBe(true)
    expect(result.passed).toHaveLength(phaseZeroGates.length)
    expect(result.outstanding).toHaveLength(0)
  })
})
