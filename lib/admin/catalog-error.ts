import { NextResponse } from 'next/server'
import { adminError } from './api'

/** Non-sensitive catalog DB conflict mapping; never return raw database errors. */
export function catalogError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined
  if (code === 'P2002') {
    return NextResponse.json({ error: { code: 'CATALOG_DUPLICATE', message: 'A catalog record with this unique name or slug already exists.' } }, { status: 409 })
  }
  if (code === 'P2003') {
    return NextResponse.json({ error: { code: 'RESOURCE_IN_USE', message: 'This catalog record is referenced by another record.' } }, { status: 409 })
  }
  if (code === 'P2025') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'The catalog record was not found.' } }, { status: 404 })
  }
  return adminError(error)
}
