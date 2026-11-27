import { AdminPageHeader } from './AdminPrimitives'
import { SettingsManager } from './SettingsManager'
import { getSettingDefinition, isSettingEditable } from '@/lib/admin/settings-policy'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export async function SettingsPage({ category, title }: { category?: string; title: string }) {
  const actor = await requirePermission('settings.view')
  const settings = await prisma.siteSetting.findMany({
    where: category ? { category } : {},
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  })
  const canEdit = hasPermission(actor.role, 'settings.update')
  const visibleSettings = settings
    .filter((setting) => getSettingDefinition(setting) !== null)
    .map((setting) => ({
      ...setting,
      editable: canEdit && isSettingEditable(setting, process.env.APP_ENV),
    }))

  return <>
    <AdminPageHeader title={title} text="Classified configuration; provider credentials and unknown setting keys are never exposed in this editor." breadcrumb={`Settings / ${title}`} />
    <SettingsManager settings={visibleSettings} />
  </>
}
