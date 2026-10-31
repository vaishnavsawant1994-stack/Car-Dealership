import { ArrowLeft, CarFront } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AccountHeading, DetailRow, StatusBadge } from '@/components/account/AccountPrimitives'
import { EngagementActions } from '@/components/account/EngagementActions'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function EnquiryDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const user = await requireAuthenticatedUser(`/account/enquiries/${reference}`)
  const inquiry = await prisma.inquiry.findFirst({ where: { referenceNumber: reference, userId: user.id }, select: { referenceNumber: true, status: true, message: true, preferredContactMethod: true, submittedAt: true, updatedAt: true, vehicle: { select: { shortTitle: true, slug: true, variant: true, year: true, images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } } } }, messages: { where: { customerVisible: true }, select: { id: true, body: true, sentByCustomer: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } })
  if (!inquiry) notFound()
  const canChange = !['RESOLVED', 'CLOSED', 'CANCELLED', 'SPAM'].includes(inquiry.status)
  return <><Link className="account-back" href="/account/enquiries"><ArrowLeft />All enquiries</Link><AccountHeading eyebrow={inquiry.referenceNumber} title={inquiry.vehicle?.shortTitle ?? 'Vehicle Enquiry'} text="Customer-visible request details and updates." />
    <div className="account-detail-grid"><section className="account-detail-card">{inquiry.vehicle?.images[0] ? <Image className="detail-vehicle-image" src={inquiry.vehicle.images[0].url} alt={inquiry.vehicle.images[0].altText} width={720} height={430} /> : <div className="detail-vehicle-placeholder"><CarFront /></div>}<header><div><small>Current status</small><StatusBadge status={inquiry.status} /></div>{inquiry.vehicle ? <Link href={`/inventory/${inquiry.vehicle.slug}`}>View vehicle</Link> : null}</header><DetailRow label="Submitted">{inquiry.submittedAt.toLocaleString('en-IN')}</DetailRow><DetailRow label="Preferred contact">{inquiry.preferredContactMethod}</DetailRow><div className="detail-message"><span>Original message</span><p>{inquiry.message}</p></div></section><EngagementActions kind="enquiries" reference={reference} canChange={canChange} /></div>
    {inquiry.messages.length ? <section className="message-timeline"><h2>Conversation</h2>{inquiry.messages.map((message) => <article key={message.id}><span>{message.sentByCustomer ? 'You' : 'Car Dealership Demo'}</span><p>{message.body}</p><time>{message.createdAt.toLocaleString('en-IN')}</time></article>)}</section> : null}</>
}
