/**
 * Make PostgreSQL TLS behavior explicit before handing a URL to node-postgres.
 * pg-connection-string 2.x currently treats `require`, `prefer`, and
 * `verify-ca` as `verify-full`, but a future major version will follow libpq
 * semantics for those aliases. The warning in staging confirms the deployed
 * URL uses one of those ambiguous modes. Pinning `verify-full` preserves the
 * current strict certificate and hostname verification behavior across that
 * dependency upgrade.
 */
export function withVerifyFullSslMode(connectionString: string): string {
  const url = new URL(connectionString)
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('A PostgreSQL connection URL is required.')
  }

  // Local development and the isolated CI service use a loopback Postgres
  // instance that intentionally has no TLS listener. Hosted remote databases
  // are subject to the strict mode below; this exception cannot match the
  // configured Neon staging/production hosts.
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname.toLowerCase())) {
    return connectionString
  }

  url.searchParams.set('sslmode', 'verify-full')
  return url.toString()
}
