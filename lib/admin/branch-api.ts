import { NextResponse } from 'next/server'
import { ShowroomWorkflowError } from '@/lib/admin/showroom-service'
import { adminError } from '@/lib/admin/api'

export function branchError(error: unknown) {
  if (error instanceof ShowroomWorkflowError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } },
      { status: error.httpStatus, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return adminError(error)
}
