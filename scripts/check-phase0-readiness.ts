import { readFileSync } from 'node:fs'
import { evaluatePhaseZeroEvidence } from '../lib/release/readiness'

/**
 * Read-only stage gate: reports missing evidence; --verify exits nonzero when
 * any mandatory P0-08 release requirement is not accepted.
 * Never contacts providers, changes environments, or infers a pass from CI.
 */
const allowed = new Set(['--verify'])
const args = process.argv.slice(2)
if (args.some((arg) => !allowed.has(arg))) {
  console.error('Usage: npx tsx scripts/check-phase0-readiness.ts [--verify]')
  process.exitCode = 2
} else {
  try {
    const input = JSON.parse(readFileSync(new URL('../docs/release-evidence/p0-08.json', import.meta.url), 'utf8')) as unknown
    const result = evaluatePhaseZeroEvidence(input)
    console.log('Car-Dealership Phase 0 release readiness:', result.releaseApproved ? 'ACCEPTED' : 'BLOCKED')
    console.log('Independent P1 development:', result.independentDevelopmentAllowed ? 'ALLOWED' : 'BLOCKED')
    console.log('Gates passed:', result.passed.length)
    console.log('Outstanding:', result.outstanding.length)
    for (const entry of result.outstanding) {
      console.log(' - ' + entry.owner + ' / ' + entry.id + ' [' + entry.status + ']: ' + entry.reason)
    }
    if (result.invalidEvidence.length) console.log('Invalid evidence on:', result.invalidEvidence.join(', '))
    if (args.includes('--verify') && !result.releaseApproved) process.exitCode = 1
  } catch (error) {
    console.error('Readiness check failed:', error instanceof Error ? error.message : 'invalid evidence')
    process.exitCode = 2
  }
}
