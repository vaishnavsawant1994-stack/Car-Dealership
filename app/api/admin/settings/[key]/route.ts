import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { evaluateSettingUpdate } from '@/lib/admin/settings-policy'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { settingUpdateSchema } from '@/lib/validation/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const actor = await authorizeAdminRequest('settings.update')
    const { key } = await params
    // Checking the canonical registry before querying also prevents arbitrary keys
    // from being accessed through the settings editor.
    const current = await prisma.siteSetting.findUnique({
      where: { key },
      select: { id: true, key: true, category: true },
    })
    if (!current) {
      return NextResponse.json({ error: { code: 'FORBIDDEN_SETTING', message: 'This setting cannot be changed through the admin interface.' } }, { status: 403 })
    }
    const parsed = settingUpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const decision = evaluateSettingUpdate(current, parsed.data.value, process.env.APP_ENV)
    if (!decision.allowed) {
      return NextResponse.json({ error: { code: decision.status === 403 ? 'FORBIDDEN_SETTING' : 'INVALID_SETTING', message: decision.message } }, { status: decision.status })
    }
    // Exact category and optimistic version are part of the write predicate, so
    // concurrent recategorization or edits cannot silently cross this policy.
    const written = await prisma.siteSetting.updateMany({
      where: { key, category: current.category, version: parsed.data.version },
      data: { value: decision.value, version: { increment: 1 } },
    })
    if (!written.count) return conflictError()
    const data = await prisma.siteSetting.findUnique({ where: { key } })
    await writeAuditLog({
      actorId: actor.id,
      action: 'SETTING_UPDATED',
      resourceType: 'SiteSetting',
      resourceId: current.id,
      summary: 'Updated a classified public site setting.',
      metadata: { key, category: current.category },
      request,
    })
    return NextResponse.json({ data, message: 'Setting updated.' })
  } catch (error) {
    return adminError(error)
  }
}
