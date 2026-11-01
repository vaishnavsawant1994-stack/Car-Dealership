import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { OrganisationProfileManager } from '@/components/admin/OrganisationProfileManager'
import { getOrganisationProfile } from '@/lib/admin/organisation-service'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'

export default async function OrganisationPage() {
  const actor = await requirePermission('settings.view')
  const initial = await getOrganisationProfile()
  const canManageShowrooms = hasPermission(actor.role, 'showroom.manage')
  return (
    <>
      <AdminPageHeader
        title="Organisation & Business Profile"
        breadcrumb="Management / Organisation"
        text="Manage the dealership identity, approved branding and display preferences. Primary location information stays linked to the existing showroom records."
        actions={canManageShowrooms ? (
          <Link className="admin-button admin-button--secondary" href="/admin/showrooms">Showrooms</Link>
        ) : undefined}
      />
      <OrganisationProfileManager
        initial={initial}
        canEdit={hasPermission(actor.role, 'settings.update')}
        canManageShowrooms={canManageShowrooms}
        hostedDemo={isHostedDemoEnvironment(getCarDealershipEnvironment())}
      />
    </>
  )
}
