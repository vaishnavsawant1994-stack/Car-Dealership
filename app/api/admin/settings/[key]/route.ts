import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { settingUpdateSchema } from '@/lib/validation/admin'
import { organisationKeys, validateOrganisationValue, type OrganisationKey } from '@/lib/admin/organisation-profile'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
const forbidden = /secret|password|token|api[_-]?key/i
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) { try { const actor = await authorizeAdminRequest('settings.update'); const { key } = await params; if (forbidden.test(key)) return NextResponse.json({ error: { code: 'FORBIDDEN_SETTING', message: 'Secret values are configured outside the admin interface.' } }, { status: 403 }); const parsed = settingUpdateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors); if ((organisationKeys as readonly string[]).includes(key)) { const error = validateOrganisationValue(key as OrganisationKey, parsed.data.value, getCarDealershipEnvironment()); if (error) return validationError({ value: [error] }) } const result = await prisma.siteSetting.updateMany({ where: { key, version: parsed.data.version }, data: { value: parsed.data.value, version: { increment: 1 } } }); if (!result.count) return conflictError(); const data = await prisma.siteSetting.findUnique({ where: { key } }); await writeAuditLog({ actorId: actor.id, action: 'SETTING_UPDATED', resourceType: 'SiteSetting', resourceId: data?.id, summary: `Updated ${key}.`, metadata: { key }, request }); return NextResponse.json({ data, message: 'Setting updated.' }) } catch (error) { return adminError(error) } }
