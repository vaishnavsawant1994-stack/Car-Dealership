import { ContentStatus, GalleryCategory, LeadPriority, UserRole, VehicleImageCategory, VehicleStatus } from '@prisma/client'
import { z } from 'zod'

const currentYear = new Date().getFullYear()
const optionalText = z.string().trim().max(500).optional().or(z.literal(''))

export const adminDateRangeSchema = z.object({
  range: z.enum(['today', '7d', '30d', 'month', 'custom']).default('7d'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).superRefine((value, context) => {
  if (value.range === 'custom' && (!value.from || !value.to)) context.addIssue({ code: 'custom', message: 'Choose both custom dates.' })
  if (value.from && value.to && value.from > value.to) context.addIssue({ code: 'custom', message: 'The start date must be before the end date.' })
})

export const vehicleAdminSchema = z.object({
  brandId: z.string().min(1, 'Choose a brand.'),
  bodyTypeId: z.string().min(1, 'Choose a body type.'),
  model: z.string().trim().min(1).max(100),
  variant: z.string().trim().min(1).max(160),
  stockNumber: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9-]+$/),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shortTitle: z.string().trim().min(3).max(160),
  year: z.coerce.number().int().min(1950).max(currentYear + 1),
  registrationYear: z.coerce.number().int().min(1950).max(currentYear + 1).optional(),
  registrationState: optionalText,
  registrationNumberMasked: optionalText,
  price: z.coerce.number().int().positive(),
  originalPrice: z.coerce.number().int().positive().optional(),
  currency: z.string().trim().length(3).default('INR'),
  mileage: z.coerce.number().int().nonnegative().max(2_000_000),
  fuelType: z.string().trim().min(1).max(40),
  transmission: z.string().trim().min(1).max(40),
  exteriorColor: optionalText,
  interiorColor: optionalText,
  engineDescription: optionalText,
  power: optionalText,
  torque: optionalText,
  drivetrain: optionalText,
  seatingCapacity: z.coerce.number().int().min(1).max(20).optional(),
  doors: z.coerce.number().int().min(1).max(8).optional(),
  ownershipCount: z.coerce.number().int().min(1).max(10).optional(),
  insuranceValidity: z.coerce.date().optional(),
  serviceHistory: optionalText,
  keysAvailable: z.coerce.number().int().min(0).max(10).optional(),
  shortDescription: z.string().trim().min(20).max(500),
  description: z.string().trim().min(40).max(10_000),
  status: z.enum(VehicleStatus).default(VehicleStatus.DRAFT),
  featured: z.coerce.boolean().default(false),
  newArrival: z.coerce.boolean().default(false),
  certified: z.coerce.boolean().default(false),
  featureIds: z.array(z.string().cuid()).max(100).default([]),
  version: z.coerce.number().int().positive().default(1),
}).superRefine((value, context) => {
  if (value.originalPrice && value.originalPrice < value.price) context.addIssue({ code: 'custom', path: ['originalPrice'], message: 'Original price cannot be lower than the sale price.' })
  if ((value.status === VehicleStatus.SOLD || value.status === VehicleStatus.ARCHIVED) && value.featured) context.addIssue({ code: 'custom', path: ['featured'], message: 'Sold or archived vehicles cannot remain featured.' })
})

export const vehicleStatusSchema = z.object({
  status: z.enum(VehicleStatus),
  reason: z.string().trim().max(500).optional(),
  version: z.number().int().positive(),
})

export const assignmentSchema = z.object({ assigneeId: z.string().cuid().nullable(), version: z.number().int().positive() })
export const leadUpdateSchema = z.object({ status: z.string().trim().min(1).max(60), priority: z.enum(LeadPriority).optional(), followUpAt: z.coerce.date().nullable().optional(), version: z.number().int().positive() })
export const operationalMessageSchema = z.object({ body: z.string().trim().min(2).max(4000), customerVisible: z.boolean().default(false), type: z.enum(['INTERNAL_NOTE', 'CUSTOMER_MESSAGE', 'CALL_LOG', 'EMAIL_LOG', 'WHATSAPP_LOG']).default('INTERNAL_NOTE') })
export const testDriveScheduleSchema = z.object({
  confirmedDate: z.coerce.date(),
  confirmedTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, for example 14:30.'),
  version: z.number().int().positive(),
  note: z.string().trim().max(1000).optional(),
})

export const inspectionSchema = z.object({
  scheduledAt: z.coerce.date().optional(), location: optionalText,
  exteriorScore: z.coerce.number().int().min(1).max(10).optional(), interiorScore: z.coerce.number().int().min(1).max(10).optional(), mechanicalScore: z.coerce.number().int().min(1).max(10).optional(),
  tyreCondition: optionalText, documentsVerified: z.boolean().default(false), serviceHistoryVerified: z.boolean().default(false), accidentHistoryNotes: optionalText,
  overallConditionScore: z.coerce.number().int().min(1).max(10).optional(), staffNotes: optionalText, customerSummary: optionalText,
})

export const valuationSchema = z.object({
  marketMinimum: z.coerce.number().int().positive(), marketMaximum: z.coerce.number().int().positive(), recommendedOffer: z.coerce.number().int().positive(), finalOffer: z.coerce.number().int().positive().optional(), validUntil: z.coerce.date(), notes: optionalText,
}).superRefine((value, context) => {
  if (value.marketMaximum < value.marketMinimum) context.addIssue({ code: 'custom', path: ['marketMaximum'], message: 'Maximum must be at least the minimum.' })
  if (value.recommendedOffer < value.marketMinimum || value.recommendedOffer > value.marketMaximum) context.addIssue({ code: 'custom', path: ['recommendedOffer'], message: 'Recommended offer must be inside the market range.' })
})

export const contentUpdateSchema = z.object({ value: z.record(z.string(), z.unknown()), status: z.enum(ContentStatus), version: z.number().int().positive() })
export const staffInviteSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), role: z.enum([UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER, UserRole.ADMIN]) })
export { staffLifecycleSchema as staffUpdateSchema } from '@/lib/admin/staff-lifecycle-policy'
export const settingUpdateSchema = z.object({ value: z.string().trim().max(2000), version: z.number().int().positive() })
export const imageMetadataSchema = z.object({ category: z.enum(VehicleImageCategory).exclude(['DOCUMENT']), altText: z.string().trim().min(3).max(240), isPrimary: z.boolean().default(false) })
export const testimonialSchema = z.object({ name: z.string().trim().min(2).max(120), rating: z.coerce.number().int().min(1).max(5), quote: z.string().trim().min(10).max(1200), avatarUrl: z.string().trim().max(1000).optional().or(z.literal('')), purchase: z.string().trim().max(160).optional().or(z.literal('')), location: z.string().trim().max(160).optional().or(z.literal('')), vehicleId: z.string().cuid().nullable().optional(), verifiedBuyer: z.boolean().default(false), featured: z.boolean().default(false), published: z.boolean().default(false), archived: z.boolean().default(false), sortOrder: z.coerce.number().int().min(0).max(10000).default(0) })
export const gallerySchema = z.object({ title: z.string().trim().min(2).max(160), imageUrl: z.string().trim().min(1).max(1000), alt: z.string().trim().min(3).max(240), caption: z.string().trim().max(1000).optional().or(z.literal('')), category: z.enum(GalleryCategory).default(GalleryCategory.OTHER), href: z.string().trim().max(1000).optional().or(z.literal('')), featured: z.boolean().default(false), published: z.boolean().default(false), sortOrder: z.coerce.number().int().min(0).max(10000).default(0) })
export const newsletterAdminSchema = z.object({ status: z.enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'SUPPRESSED']) })
export const acceptStaffInvitationSchema = z.object({ token: z.string().min(20).max(300), name: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^[6-9]\d{9}$/), password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) })
export const showroomSchema = z.object({ name: z.string().trim().min(2).max(160), address: z.string().trim().min(5).max(500), city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100), postalCode: z.string().trim().min(4).max(12), country: z.string().trim().min(2).max(100).default('India'), latitude: z.coerce.number().min(-90).max(90).nullable().optional(), longitude: z.coerce.number().min(-180).max(180).nullable().optional(), phone: z.string().trim().min(8).max(30), email: z.string().trim().email(), whatsapp: z.string().trim().max(30).optional().or(z.literal('')), hours: z.string().trim().min(3).max(300), mapUrl: z.string().trim().url().optional().or(z.literal('')), active: z.boolean().default(true), isPrimary: z.boolean().default(false) })
export const adminProfileSchema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^[6-9]\d{9}$/).nullable().optional(), image: z.string().trim().max(1000).nullable().optional(), emailNotifications: z.boolean().default(true), leadNotifications: z.boolean().default(true), inventoryNotifications: z.boolean().default(true) })
export const adminPasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) })
