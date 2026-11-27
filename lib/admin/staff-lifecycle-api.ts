import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { StaffLifecycleError } from '@/lib/admin/staff-lifecycle-service'

export function staffLifecycleError(error: unknown) {
  if (error instanceof StaffLifecycleError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } },
      { status: error.status, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return adminError(error)
}
