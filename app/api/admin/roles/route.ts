import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { effectiveRoleMatrix, groupedPermissionMatrix } from '@/lib/admin/role-matrix'

export async function GET() {
  try {
    await authorizeAdminRequest('user.view')
    return NextResponse.json({
      data: { roles: effectiveRoleMatrix(), permissions: groupedPermissionMatrix() },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
