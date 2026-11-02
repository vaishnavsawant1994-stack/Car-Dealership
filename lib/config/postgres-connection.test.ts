import { describe, expect, it } from 'vitest'
import { withVerifyFullSslMode } from './postgres-connection'

describe('withVerifyFullSslMode', () => {
  it('leaves the isolated loopback test database unchanged', () => {
    const connectionString = 'postgresql://postgres:postgres@localhost:5432/car_dealership_test'

    expect(withVerifyFullSslMode(connectionString)).toBe(connectionString)
  })

  it('pins strict TLS verification when sslmode is absent', () => {
    const result = new URL(withVerifyFullSslMode('postgresql://user:pass@db.example.test:5432/app'))

    expect(result.searchParams.get('sslmode')).toBe('verify-full')
    expect(result.hostname).toBe('db.example.test')
  })

  it.each(['require', 'prefer', 'verify-ca', 'disable'])('replaces ambiguous or weaker sslmode=%s', (mode) => {
    const result = new URL(withVerifyFullSslMode(`postgres://user:pass@db.example.test/app?sslmode=${mode}&pool=true`))

    expect(result.searchParams.get('sslmode')).toBe('verify-full')
    expect(result.searchParams.get('pool')).toBe('true')
  })

  it('preserves strict verification and rejects non-PostgreSQL URLs', () => {
    expect(withVerifyFullSslMode('postgres://user:pass@db.example.test/app?sslmode=verify-full'))
      .toContain('sslmode=verify-full')
    expect(() => withVerifyFullSslMode('https://example.test')).toThrow('A PostgreSQL connection URL is required.')
  })
})
