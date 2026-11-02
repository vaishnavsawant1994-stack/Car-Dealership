import { NextResponse } from 'next/server'
import { AdminPermissionError } from '@/lib/auth/require-permission'
import { logSafeError } from '@/lib/observability/safe-log'

export function adminError(error: unknown) {
  if (error instanceof AdminPermissionError) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Your staff role does not permit this operation.' } }, { status: 403 })
  if (error instanceof Error && error.message === 'ASSIGNMENT_FORBIDDEN') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only assign records within your permitted queue.' } }, { status: 403 })
  logSafeError('admin_operation_failed', error)
  return NextResponse.json({ error: { code: 'OPERATION_FAILED', message: 'The admin operation could not be completed.' } }, { status: 500 })
}

export function validationError(fields?: Record<string, string[] | undefined>) {
  return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Review the highlighted fields.', fields } }, { status: 400 })
}

export function conflictError(message = 'This record changed after you opened it. Reload before saving again.') {
  return NextResponse.json({ error: { code: 'EDIT_CONFLICT', message } }, { status: 409 })
}
