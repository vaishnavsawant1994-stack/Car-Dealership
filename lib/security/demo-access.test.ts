import { describe, expect, it } from 'vitest'
import { assertDemoEmail, canUseSelfRegistration, demoAccountFixtureRoles, isDemoEmail, isHostedDemoEnvironment } from './demo-access'

describe('hosted demonstration identity controls', () => {
  it('restricts hosted signup but keeps local/test flows testable', () => {
    expect(isHostedDemoEnvironment('staging')).toBe(true)
    expect(isHostedDemoEnvironment('demo')).toBe(true)
    expect(isHostedDemoEnvironment('preview')).toBe(true)
    expect(canUseSelfRegistration('staging')).toBe(false)
    expect(canUseSelfRegistration('demo')).toBe(false)
    expect(canUseSelfRegistration('commercial')).toBe(false)
    expect(canUseSelfRegistration('test')).toBe(true)
  })
  it('requires a fictional Car-Dealership test domain for hosted communications', () => {
    expect(isDemoEmail('Demo.Admin@Car-Dealership.TEST')).toBe(true)
    for (const address of ['hello@gmail.com', 'name@example.com', 'anyone@fake.test', 'admin@car-dealership.test.evil.com', 'nobody@car-dealership.test,bad@example.com']) {
      expect(isDemoEmail(address)).toBe(false)
      expect(() => assertDemoEmail(address, 'demo')).toThrow()
    }
    expect(() => assertDemoEmail('demo.admin@car-dealership.test', 'demo')).not.toThrow()
  })
  it('only defines deliberate, non-deliverable demo accounts', () => {
    for (const email of Object.keys(demoAccountFixtureRoles)) expect(isDemoEmail(email)).toBe(true)
  })
})
