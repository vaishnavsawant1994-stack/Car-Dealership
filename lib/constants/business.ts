type BusinessIdentity = {
  name: string
  displayName: string
  tagline: string
  phone: string
  phoneNumber: string
  primaryEmail: string
  secondaryEmail: string
  whatsappNumber: string
  whatsappMessage: string
  logoUrl: string
}

/** Neutral, non-operational identity until independent client branding is approved. */
export const businessIdentity: BusinessIdentity = {
  name: 'Car Dealership Demo',
  displayName: 'CAR DEALERSHIP DEMO',
  tagline: 'Automotive retail platform — demonstration',
  phone: 'Demo enquiries only',
  phoneNumber: '',
  primaryEmail: 'demo@car-dealership.test',
  secondaryEmail: 'support@car-dealership.test',
  whatsappNumber: '',
  whatsappMessage: 'I would like more information about a vehicle.',
  logoUrl: '/images/brand/car-dealership-demo.svg',
}

// Do not create external WhatsApp deep links during Phase 0. Previous source
// dealership contacts must never receive messages from client demonstrations.
export function buildWhatsAppUrl(_message: string = businessIdentity.whatsappMessage, _number: string = businessIdentity.whatsappNumber): string {
  return '/contact'
}

export function buildVehicleWhatsAppUrl(_vehicle: { year: number; make: string; model: string; variant?: string; stockNumber?: string }): string {
  return '/contact'
}
