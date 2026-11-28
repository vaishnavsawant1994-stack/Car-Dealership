import { NewsletterStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { adminError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { newsletterAdminSchema } from '@/lib/validation/admin'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await authorizeAdminRequest('newsletter.view'); const { id } = await params; const data = await prisma.newsletterSubscriber.findUnique({ where: { id } }); return data ? NextResponse.json({ data }) : NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 }) } catch (error) { return adminError(error) } }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const actor = await authorizeAdminRequest('content.manage'); const parsed = newsletterAdminSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors); const { id } = await params; const now = new Date(); const data = await prisma.newsletterSubscriber.update({ where: { id }, data: { status: parsed.data.status, active: false, unsubscribedAt: parsed.data.status === NewsletterStatus.UNSUBSCRIBED ? now : null, suppressedAt: parsed.data.status === NewsletterStatus.SUPPRESSED ? now : null } }); await writeAuditLog({ actorId: actor.id, action: 'NEWSLETTER_STATUS_UPDATED', resourceType: 'NewsletterSubscriber', resourceId: id, summary: `Subscriber status changed to ${data.status}.`, request }); return NextResponse.json({ data, message: 'Subscriber updated.' }) } catch (error) { return adminError(error) } }
