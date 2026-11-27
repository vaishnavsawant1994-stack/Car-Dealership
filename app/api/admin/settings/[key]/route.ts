import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { organisationKeys, validateOrganisationValue, type OrganisationKey } from '@/lib/admin/organisation-profile'
import { evaluateSettingUpdate } from '@/lib/admin/settings-policy'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import { prisma } from '@/lib/db/prisma'
import { settingUpdateSchema } from '@/lib/validation/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const actor = await authorizeAdminRequest('settings.update')
    const { key } = await params
    const current = await prisma.siteSetting.findUnique({
      where: { key }, select: { id: true, key: true, category: true },
    })
    if (!current) return NextResponse.json({
      error: { code: 'FORBIDDEN_SETTING', message: 'This setting cannot be changed through the admin interface.' },
    }, { status: 403 })

    const parsed = settingUpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)

    // P1-06 fail-closed registry first: no secret, arbitrary or miscategorized keys.
    const decision = evaluateSettingUpdate(current, parsed.data.value, getCarDealershipEnvironment())
    if (!decision.allowed) return NextResponse.json({
      error: { code: decision.status === 403 ? 'FORBIDDEN_SETTING' : 'INVALID_SETTING', message: decision.message },
    }, { status: decision.status })

    // P1-02 applies stricter identity/contact policy on the *legacy* single-key
    // editor too; the organization batch endpoint is not a validation bypass.
    if ((organisationKeys as readonly string[]).includes(key)) {
      const error = validateOrganisationValue(key as OrganisationKey, decision.value, getCarDealershipEnvironment())
      if (error) return validationError({ value: [error] })
    }

    const written = await prisma.siteSetting.updateMany({
      where: { key, category: current.category, version: parsed.data.version },
      data: { value: decision.value, version: { increment: 1 } },
    })
    if (!written.count) return conflictError()
    const data = await prisma.siteSetting.findUnique({ where: { key } })
    await writeAuditLog({
      actorId: actor.id, action: 'SETTING_UPDATED',
      resourceType: 'SiteSetting', resourceId: current.id,
      summary: 'Updated a classified public site setting.',
      metadata: { key, category: current.category }, request,
    })
    return NextResponse.json({ data, message: 'Setting updated.' })
  } catch (error) { return adminError(error) }
}
