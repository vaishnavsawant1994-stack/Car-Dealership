import {
  BadgeCheck,
  Banknote,
  Car,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  HandCoins,
  Handshake,
  Headphones,
  KeyRound,
  MapPin,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
  Wrench,
} from 'lucide-react'
import { businessIdentity } from '@/lib/constants/business'

export const interiorImages = {
  hero: '/images/hero/hero-audi-rs7-nardo-grey.webp',
  showroom: '/images/hero/hero-bmw-5-series-white.webp',
  sedan: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=88',
  service: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1600&q=88',
  paperwork: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=86',
  key: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1400&q=86',
  finance: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=86',
  founder: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1000&q=86',
}

export const inventoryVehicles = [
  ['Mercedes-Benz', 'E-Class', 'E 220d AMG Line', 2021, '28,500 km', 'Diesel', 'Automatic', '54,90,000', 'Certified', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=86'],
  ['BMW', '5 Series', '530i M Sport', 2022, '22,000 km', 'Petrol', 'Automatic', '56,90,000', 'New', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=86'],
  ['Audi', 'Q7', '45 TDI Quattro Premium Plus', 2020, '31,000 km', 'Diesel', 'Automatic', '67,90,000', 'Certified', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=86'],
  ['Porsche', 'Macan', '2.0 Petrol', 2021, '19,000 km', 'Petrol', 'PDK', '79,90,000', 'New', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=86'],
  ['Land Rover', 'Range Rover', 'Vogue SE', 2019, '45,000 km', 'Diesel', 'Automatic', '92,90,000', 'Certified', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=86'],
  ['Lexus', 'RX 300', 'Luxury', 2021, '26,000 km', 'Petrol', 'Automatic', '59,90,000', 'New', 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=86'],
  ['Jaguar', 'XF', '20d Prestige', 2019, '38,000 km', 'Diesel', 'Automatic', '32,90,000', 'Certified', 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=900&q=86'],
  ['Volvo', 'XC60', 'D4 Inscription', 2021, '24,000 km', 'Diesel', 'Automatic', '43,90,000', 'New', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=86'],
  ['MINI', 'Cooper S', '3 Door', 2022, '15,000 km', 'Petrol', 'Automatic', '29,90,000', 'New', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=86'],
  ['Toyota', 'Fortuner', '2.8 Legender 4x4 AT', 2021, '33,000 km', 'Diesel', 'Automatic', '36,90,000', 'Certified', 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=900&q=86'],
  ['Mercedes-Benz', 'GLC', 'GLC 300 4MATIC', 2022, '18,000 km', 'Petrol', 'Automatic', '66,90,000', 'New', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=900&q=86'],
  ['Audi', 'A6', '35 TDI Technology', 2019, '40,000 km', 'Diesel', 'Automatic', '31,90,000', 'Certified', 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=900&q=86'],
].map(([make, model, variant, year, mileage, fuel, transmission, price, badge, image], index) => ({
  id: `inventory-${index + 1}`,
  slug: `${String(make)}-${String(model)}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  make: String(make),
  model: String(model),
  variant: String(variant),
  year: Number(year),
  mileage: String(mileage),
  mileageValue: Number(String(mileage).replace(/\D/g, '')),
  fuel: String(fuel),
  transmission: String(transmission),
  price: `₹ ${price}`,
  priceValue: Number(String(price).replace(/\D/g, '')),
  badge: String(badge),
  image: String(image),
}))

export const serviceCards = [
  { title: 'Car Finance', text: 'Compare available lender terms with application support.', icon: Banknote },
  { title: 'Insurance Assistance', text: 'Comprehensive protection with the right coverage and quick claims support.', icon: ShieldCheck },
  { title: 'RC Transfer', text: 'Ownership-transfer coordination with a clear document checklist.', icon: FileCheck2 },
  { title: 'Extended Warranty', text: 'Long-term peace of mind and protection beyond purchase.', icon: BadgeCheck },
  { title: 'Detailing Services', text: 'Professional detailing that restores a showroom-new finish.', icon: Sparkles },
  { title: 'Buyback Solutions', text: 'A market-led valuation and documented offer process.', icon: HandCoins },
  { title: 'Car Evaluation', text: 'Accurate inspection by experts who understand premium cars.', icon: SearchCheck },
  { title: 'Roadside Assistance', text: 'Round-the-clock help for a worry-free ownership experience.', icon: Wrench },
]

export const sellingSteps = [
  { title: 'Submit Your Details', text: 'Tell us about your car and upload a few clear photographs.', icon: ClipboardCheck },
  { title: 'Expert Evaluation', text: 'Our specialists inspect and value your car fairly.', icon: SearchCheck },
  { title: 'Best Offer & Get Paid', text: 'Accept the offer, complete paperwork and receive payment.', icon: HandCoins },
]

export const whySell = [
  { title: 'Market-led Valuation', text: 'Receive an estimate based on the car and current market information.', icon: WalletCards },
  { title: 'Document Coordination', text: 'Receive support with the applicable forms and transfer steps.', icon: FileCheck2 },
  { title: 'Quick Payment', text: 'Secure payment immediately after verification.', icon: HandCoins },
  { title: 'Hassle-Free Process', text: 'One expert guides the complete transaction.', icon: Handshake },
  { title: 'Documented Process', text: 'Clear steps from evaluation through payment and transfer.', icon: ShieldCheck },
]

export const aboutValues = [
  { title: 'Trust & Integrity', text: 'Honest deals and complete transparency in every transaction.', icon: ShieldCheck },
  { title: 'Curated Selection', text: 'Handpicked luxury cars with available condition information.', icon: BadgeCheck },
  { title: 'Multi-Point Inspection', text: 'Vehicle checks support an informed purchase decision.', icon: SearchCheck },
  { title: 'Finance Made Easy', text: 'Flexible financing options with leading bank partners.', icon: Banknote },
  { title: 'After Sales Support', text: 'Dedicated support continues after your dream car comes home.', icon: Headphones },
  { title: 'Complete Transparency', text: 'Clear documentation with no hidden surprises.', icon: ClipboardCheck },
]

export const helpCards = [
  { title: 'Buy Luxury Cars', text: 'Browse available premium pre-owned cars.', icon: Car, href: '/inventory' },
  { title: 'Sell Your Car', text: 'Request a market-led valuation and documented offer.', icon: HandCoins, href: '/sell-your-car' },
  { title: 'Finance Assistance', text: 'Compare available lender options and terms.', icon: Banknote, href: '/services/finance' },
  { title: 'After Sales Support', text: 'Dedicated support even after purchase.', icon: Headphones, href: '/services' },
  { title: 'RC Transfer', text: 'Complete ownership-transfer support.', icon: FileCheck2, href: '/services/rc-transfer' },
  { title: 'Inspection Help', text: 'Condition information explained clearly.', icon: SearchCheck, href: '/services' },
]

export const faqs = {
  sell: [
    ['How long does the valuation process take?', 'Most preliminary valuations are completed within one business day.'],
    ['Do I need to visit the showroom?', 'We can begin remotely and arrange an inspection at a convenient location.'],
    ['What documents are required?', 'RC, insurance, identity proof, service history and loan closure documents where applicable.'],
    ['Is there any fee for valuation?', 'No. Car Dealership Demo vehicle valuation is completely free and carries no obligation.'],
  ],
  services: [
    ['What documents are required for RC transfer?', 'RC, insurance, valid ID, address proof and signed transfer forms are normally required.'],
    ['Do you offer cashless insurance claims?', 'Yes, subject to the policy and network-garage eligibility.'],
    ['What is included in extended warranty?', 'Coverage varies by plan and can include major engine, transmission and electrical components.'],
    ['Is roadside assistance available across India?', 'Coverage is available across a wide partner network; exact availability depends on the selected plan.'],
  ],
  contact: [
    ['What are your showroom opening hours?', 'We are open Monday to Sunday from 10:00 AM to 8:00 PM.'],
    ['Do you offer test drives?', 'Yes. Our team can schedule a supervised test drive for available vehicles.'],
    ['Do you provide finance options?', 'Yes, we work with leading banks to offer tailored finance options.'],
    ['Can I exchange my car?', 'Yes. Your existing vehicle can be evaluated as part of a purchase or exchange.'],
    ['Do you help with RC transfer?', 'Yes, our documentation team manages the complete ownership-transfer process.'],
    ['Is there a warranty on the cars?', 'Selected vehicles include warranty coverage, clearly stated before purchase.'],
  ],
}

export const trustStats = [
  { value: 'Demo', label: 'Environment', icon: Clock3 },
  { value: 'Sample', label: 'Showroom', icon: Handshake },
  { value: 'Curated', label: 'Premium Cars', icon: Car },
  { value: 'Clear', label: 'Documented Pricing', icon: ShieldCheck },
  { value: 'Multi-step', label: 'Vehicle Checks', icon: SearchCheck },
  { value: 'Direct', label: 'Showroom Support', icon: Headphones },
]

export const journeySteps = [
  { title: 'Discover', text: 'Browse our premium collection.', icon: SearchCheck },
  { title: 'Choose', text: 'Find the car that matches your needs.', icon: Car },
  { title: 'Inspect', text: 'Review our quality checks.', icon: ClipboardCheck },
  { title: 'Finance', text: 'Choose a tailored finance plan.', icon: Banknote },
  { title: 'Paperwork', text: 'We handle every document.', icon: FileCheck2 },
  { title: 'Delivery', text: 'Drive home with confidence.', icon: KeyRound },
]

export const contactDetails = [
  { title: 'Phone', lines: [businessIdentity.phone], icon: Car },
  { title: 'Email', lines: [businessIdentity.primaryEmail, businessIdentity.secondaryEmail], icon: Upload },
  { title: 'Showroom Address', lines: ['Demonstration environment — no physical address'], icon: MapPin },
  { title: 'Opening Hours', lines: ['Mon - Sun: 10:00 AM - 8:00 PM'], icon: Clock3 },
  { title: 'WhatsApp', lines: [businessIdentity.phone], icon: Headphones },
]
