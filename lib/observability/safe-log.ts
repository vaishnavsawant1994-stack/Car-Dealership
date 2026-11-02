type SafeContextValue = string | number | boolean | null

/** Log a stable error class and deliberately selected non-secret identifiers. */
export function logSafeError(
  event: string,
  error: unknown,
  context: Record<string, SafeContextValue> = {},
) {
  const candidate = error instanceof Error ? error.name : ''
  const errorType = /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(candidate) ? candidate : 'UnknownError'
  console.error(event, { ...context, errorType })
}
