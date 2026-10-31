import { ArrowLeft, CalendarCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AccountHeading, DetailRow, StatusBadge } from '@/components/account/AccountPrimitives'
import { EngagementActions } from '@/components/account/EngagementActions'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function TestDriveDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const user = await requireAuthenticatedUser(`/account/test-drives/${reference}`)
  const drive = await prisma.testDrive.findFirst({ where: { referenceNumber: reference, userId: user.id }, select: { referenceNumber: true, status: true, preferredDate: true, preferredTime: true, confirmedDate: true, confirmedTime: true, message: true, cancellationReason: true, preferredContactMethod: true, submittedAt: true, vehicle: { select: { shortTitle: true, slug: true, variant: true, images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } } } }, messages: { where: { customerVisible: true }, select: { id: true, body: true, sentByCustomer: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } })
  if (!drive) notFound()
  const canChange = !['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(drive.status)
  return <><Link className="account-back" href="/account/test-drives"><ArrowLeft />All test drives</Link><AccountHeading eyebrow={drive.referenceNumber} title={drive.vehicle.shortTitle} text="Your appointment details and customer-visible updates." />
    <div className="account-detail-grid"><section className="account-detail-card">{drive.vehicle.images[0] ? <Image className="detail-vehicle-image" src={drive.vehicle.images[0].url} alt={drive.vehicle.images[0].altText} width={720} height={430} /> : <div className="detail-vehicle-placeholder"><CalendarCheck /></div>}<header><div><small>Current status</small><StatusBadge status={drive.status} /></div><Link href={`/inventory/${drive.vehicle.slug}`}>View vehicle</Link></header><DetailRow label="Requested date">{drive.preferredDate.toLocaleDateString('en-IN')}</DetailRow><DetailRow label="Requested time">{drive.preferredTime}</DetailRow>{drive.confirmedDate ? <DetailRow label="Confirmed visit">{drive.confirmedDate.toLocaleDateString('en-IN')} · {drive.confirmedTime}</DetailRow> : null}<DetailRow label="Preferred contact">{drive.preferredContactMethod}</DetailRow>{drive.message ? <div className="detail-message"><span>Your note</span><p>{drive.message}</p></div> : null}{drive.cancellationReason ? <div className="detail-message"><span>Cancellation note</span><p>{drive.cancellationReason}</p></div> : null}</section><EngagementActions kind="test-drives" reference={reference} canChange={canChange} /></div>
    {drive.messages.length ? <section className="message-timeline"><h2>Conversation</h2>{drive.messages.map((message) => <article key={message.id}><span>{message.sentByCustomer ? 'You' : 'Car Dealership Demo'}</span><p>{message.body}</p><time>{message.createdAt.toLocaleString('en-IN')}</time></article>)}</section> : null}</>
}
