/**
 * P0-08 phase-zero release readiness is intentionally distinct from permission
 * to continue development in P1. This is a policy/evidence validator, not proof
 * that external systems were tested.
 */
export const phaseZeroGates = [
  { id: 'repo_private', owner: 'P0-03', reason: 'Source must be private.' },
  { id: 'release_controls', owner: 'P0-08', reason: 'Reviewed, exact-commit release controls must be enforceable.' },
  { id: 'staging_isolation', owner: 'P0-04', reason: 'Staging must have its own verified database and storage.' },
  { id: 'demo_isolation', owner: 'P0-04', reason: 'Demo must be independent of staging.' },
  { id: 'staging_deployment', owner: 'P0-06', reason: 'Staging must be protected and healthy.' },
  { id: 'admin_signin', owner: 'P0-06', reason: 'Authenticated admin login, permissions and logout must pass.' },
  { id: 'image_workflow', owner: 'P0-06', reason: 'Authenticated image upload, processing and cleanup must pass.' },
  { id: 'demo_deployment', owner: 'P0-06', reason: 'Independent protected demo must be accepted.' },
  { id: 'messaging_disabled', owner: 'P0-06', reason: 'Real external messaging and payments must remain disabled.' },
  { id: 'security_change_review', owner: 'P0-07', reason: 'Exact-head security PR must be reviewed and incorporated into the release.' },
  { id: 'audit_append_only', owner: 'P0-07', reason: 'Runtime must not UPDATE or DELETE audit records.' },
  { id: 'backup_policy', owner: 'P0-07', reason: 'Backup frequency, retention, recovery objectives and cost must be approved and verified.' },
  { id: 'restore_drill', owner: 'P0-07', reason: 'Restore must be verified safely without promoting a live branch.' },
  { id: 'credential_isolation', owner: 'P0-07', reason: 'Cross-environment credential and private-object denial must be tested.' },
  { id: 'final_approval', owner: 'P0-08', reason: 'Security and release acceptance must be explicitly recorded.' },
] as const

export type GateId = (typeof phaseZeroGates)[number]['id']
export type GateStatus = 'passed' | 'pending' | 'blocked'
export type ReleaseGateEvidence = {
  status: GateStatus
  note: string
  evidence?: string
}
export type PhaseZeroEvidence = {
  schemaVersion: 1
  lastReviewed: string
  gates: Partial<Record<GateId, ReleaseGateEvidence>>
}
export type PhaseZeroEvaluation = {
  releaseApproved: boolean
  independentDevelopmentAllowed: true
  passed: GateId[]
  outstanding: { id: GateId; owner: string; status: 'pending' | 'blocked'; reason: string }[]
  invalidEvidence: GateId[]
}

export function evaluatePhaseZeroEvidence(input: unknown): PhaseZeroEvaluation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid release evidence manifest.')
  }
  const manifest = input as Record<string, unknown>
  if (manifest.schemaVersion !== 1 ||
      typeof manifest.lastReviewed !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(manifest.lastReviewed)) {
    throw new Error('Evidence requires schemaVersion=1 and YYYY-MM-DD review date.')
  }
  const gates = manifest.gates
  if (!gates || typeof gates !== 'object' || Array.isArray(gates)) {
    throw new Error('Evidence requires the exact release-gates mapping.')
  }
  const gateMap = gates as Record<string, unknown>
  const passed: GateId[] = []
  const outstanding: PhaseZeroEvaluation['outstanding'] = []
  const invalidEvidence: GateId[] = []
  for (const definition of phaseZeroGates) {
    const item = gateMap[definition.id]
    const value = item && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {}
    const note = typeof value.note === 'string' ? value.note.trim() : ''
    const link = typeof value.evidence === 'string' ? value.evidence.trim() : ''
    // A human "passed" assertion without a rationale and linked evidence
    // never satisfies this gate. Links are references, not proof of truth.
    const hasLinkedEvidence = /^https:\/\/[^\s]+$/.test(link)
    const validPass = value.status === 'passed' && note.length >= 10 && hasLinkedEvidence
    if (validPass) passed.push(definition.id)
    else {
      if (value.status === 'passed') invalidEvidence.push(definition.id)
      outstanding.push({
        id: definition.id,
        owner: definition.owner,
        status: value.status === 'blocked' ? 'blocked' : 'pending',
        reason: definition.reason,
      })
    }
  }
  const permitted = new Set(phaseZeroGates.map((g) => g.id))
  for (const field of Object.keys(gateMap)) {
    if (!permitted.has(field as GateId)) throw new Error('Unknown release gate: ' + field)
  }
  return {
    releaseApproved: outstanding.length === 0,
    independentDevelopmentAllowed: true,
    passed,
    outstanding,
    invalidEvidence,
  }
}
