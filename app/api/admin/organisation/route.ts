import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import {
  getOrganisationProfile, OrganisationProfileConflict, OrganisationProfileValidationError,
  updateOrganisationProfile,
} from '@/lib/admin/organisation-service'
import { organisationUpdateSchema } from '@/lib/admin/organisation-profile'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

export async function GET() {
  try {
    await authorizeAdminRequest('settings.view')
    return NextResponse.json({ data: await getOrganisationProfile() }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) { return adminError(error) }
}

export async function PATCH(request: Request) {
  try {
    const actor = await authorizeAdminRequest('settings.update')
    const parsed = organisationUpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const data = await updateOrganisationProfile(actor.id, parsed.data.changes)
    return NextResponse.json({ data, message: 'Business profile saved.' }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    if (error instanceof OrganisationProfileConflict) return conflictError(error.message)
    if (error instanceof OrganisationProfileValidationError) {
      return validationError(Object.fromEntries(Object.entries(error.fields).map(([key, message]) => [key, [message]])))
    }
    return adminError(error)
  }
}
