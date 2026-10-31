import {
  BadgeIndianRupee,
  Banknote,
  Car,
  FileCheck,
  Handshake,
  Headset,
  KeyRound,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { buildWhatsAppUrl, businessIdentity } from '@/lib/constants/business'

const configuredPrimaryPhone = businessIdentity.phone
const configuredSecondaryPhone: string = ''
const configuredWhatsApp = businessIdentity.whatsappNumber

export const siteConfig = {
  name: businessIdentity.name,
  tagline: businessIdentity.tagline,
  logoUrl: businessIdentity.logoUrl,
  phone: configuredPrimaryPhone,
  phoneHref: '/contact',
  secondaryPhone: configuredSecondaryPhone,
  secondaryPhoneHref: configuredSecondaryPhone ? `tel:${configuredSecondaryPhone.replace(/[^+\d]/g, '')}` : '/contact',
  email: businessIdentity.primaryEmail,
  emailHref: '/contact',
  secondaryEmail: businessIdentity.secondaryEmail,
  secondaryEmailHref: '/contact',
  address: 'Demo showroom — no physical location',
  hours: 'Demonstration only',
  mapsUrl: '/contact',
  whatsAppUrl: buildWhatsAppUrl(businessIdentity.whatsappMessage, configuredWhatsApp),
  instagram: '',
  facebook: '',
  youtube: '',
  linkedin: '',
  ownerName: 'Demonstration team',
  establishedDate: 'Demo',
  establishedYear: 'Demo',
}

export const navItems = [
  { label: 'Home', href: '/' },
  {
    label: 'Inventory',
    href: '/inventory',
    children: [
      ['All Cars', '/inventory'],
      ['New Arrivals', '/inventory?newArrival=true'],
      ['Certified Cars', '/inventory?certified=true'],
      ['Luxury Sedans', '/body-types/sedan'],
      ['Premium SUVs', '/body-types/suv'],
      ['Sports Cars', '/body-types/sports-car'],
    ],
  },
  { label: 'Sell Your Car', href: '/sell-your-car' },
  {
    label: 'Services',
    href: '/services',
    children: [
      ['Buy Used Cars', '/services'],
      ['Sell Your Car', '/sell-your-car'],
      ['Ownership Transfer', '/services/rc-transfer'],
      ['Car Finance', '/services/finance'],
      ['Insurance Assistance', '/services/insurance'],
      ['Extended Warranty', '/services/extended-warranty'],
    ],
  },
  { label: 'About Us', href: '/about-us' },
  { label: 'Contact Us', href: '/contact' },
]

export const stats = [
  { value: '2019', label: 'Year Founded', icon: Car },
  { value: 'Pune', label: 'Local Showroom', icon: UsersRound },
  { value: 'Curated', label: 'Premium Inventory', icon: ShieldCheck },
  { value: 'Clear', label: 'Documented Process', icon: Handshake },
]

export const trustPoints = [
  'Inspection-led Cars',
  'Clear Price Breakdown',
  'Finance Assistance',
  'Transfer Support',
]

export const brands = [
  ['Mercedes-Benz', '#f4f7f8'],
  ['BMW', '#1c69d4'],
  ['Audi', '#e21d38'],
  ['Porsche', '#d5001c'],
  ['Land Rover', '#1f8a50'],
  ['Volvo', '#3f8fcb'],
  ['Jaguar', '#f1f2f2'],
  ['Lexus', '#f1f2f2'],
  ['Toyota', '#eb0a1e'],
  ['MINI', '#f1f2f2'],
].map(([name, accent]) => ({
  name,
  accent,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
}))

export const vehicles = [
  {
    id: 'mercedes-e-class-2021',
    slug: 'mercedes-benz-e-class-e-220d-exclusive-2021',
    make: 'Mercedes-Benz',
    model: 'E-Class',
    variant: 'E 220d Exclusive',
    year: 2021,
    mileage: '28,900 km',
    fuel: 'Diesel',
    transmission: 'Automatic',
    price: '₹ 48,50,000',
    image:
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=85',
    badge: 'New',
  },
  {
    id: 'bmw-x5-2020',
    slug: 'bmw-x5-xdrive40d-m-sport-2020',
    make: 'BMW',
    model: 'X5',
    variant: 'xDrive40d M Sport',
    year: 2020,
    mileage: '36,000 km',
    fuel: 'Diesel',
    transmission: 'Automatic',
    price: '₹ 64,90,000',
    image:
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=85',
    badge: 'New',
  },
  {
    id: 'audi-q7-2021',
    slug: 'audi-q7-45-tdi-quattro-premium-2021',
    make: 'Audi',
    model: 'Q7',
    variant: '45 TDI Quattro Premium',
    year: 2021,
    mileage: '31,000 km',
    fuel: 'Diesel',
    transmission: 'Automatic',
    price: '₹ 58,75,000',
    image:
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=85',
    badge: 'New',
  },
  {
    id: 'land-rover-discovery-2019',
    slug: 'land-rover-discovery-hse-luxury-2019',
    make: 'Land Rover',
    model: 'Discovery',
    variant: 'HSE Luxury',
    year: 2019,
    mileage: '42,000 km',
    fuel: 'Diesel',
    transmission: 'Automatic',
    price: '₹ 49,90,000',
    image:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=85',
    badge: 'New',
  },
  {
    id: 'lexus-es-300h-2021',
    slug: 'lexus-es-300h-luxury-2021',
    make: 'Lexus',
    model: 'ES 300h',
    variant: 'Luxury',
    year: 2021,
    mileage: '22,000 km',
    fuel: 'Hybrid',
    transmission: 'Automatic',
    price: '₹ 46,25,000',
    image:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=85',
    badge: 'New',
  },
  {
    id: 'porsche-cayenne-2022',
    slug: 'porsche-cayenne-platinum-edition-2022',
    make: 'Porsche',
    model: 'Cayenne',
    variant: 'Platinum Edition',
    year: 2022,
    mileage: '18,400 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    price: '₹ 1,18,00,000',
    image:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
    badge: 'Just In',
  },
  {
    id: 'jaguar-f-pace-2021',
    slug: 'jaguar-f-pace-r-dynamic-2021',
    make: 'Jaguar',
    model: 'F-PACE',
    variant: 'R-Dynamic S',
    year: 2021,
    mileage: '24,700 km',
    fuel: 'Diesel',
    transmission: 'Automatic',
    price: '₹ 72,50,000',
    image:
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85',
    badge: 'Certified',
  },
  {
    id: 'volvo-xc90-2022',
    slug: 'volvo-xc90-b6-inscription-2022',
    make: 'Volvo',
    model: 'XC90',
    variant: 'B6 Inscription',
    year: 2022,
    mileage: '19,800 km',
    fuel: 'Hybrid',
    transmission: 'Automatic',
    price: '₹ 82,90,000',
    image:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85',
    badge: 'New',
  },
  {
    id: 'mercedes-s-class-2021',
    slug: 'mercedes-benz-s-class-s-450-2021',
    make: 'Mercedes-Benz',
    model: 'S-Class',
    variant: 'S 450 4MATIC',
    year: 2021,
    mileage: '21,300 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    price: '₹ 1,42,00,000',
    image:
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=85',
    badge: 'Signature',
  },
]

export const benefits = [
  {
    title: 'Inspection-led Cars',
    text: 'Available condition information is shared clearly.',
    icon: ShieldCheck,
  },
  {
    title: 'No Hidden Charges',
    text: 'Transparent pricing with complete clarity.',
    icon: BadgeIndianRupee,
  },
  {
    title: 'Easy Paperwork',
    text: 'Coordinated documentation and ownership-transfer support.',
    icon: FileCheck,
  },
  {
    title: 'After Sales Support',
    text: 'Dedicated support even after you buy.',
    icon: Headset,
  },
  {
    title: 'Focused Dealership',
    text: 'A Pune showroom founded in 2019 with a premium-car focus.',
    icon: Handshake,
  },
]

export const servicePromos = [
  {
    title: 'Sell Your Car',
    text: 'Request a market-led evaluation and a documented offer.',
    cta: 'Get Free Evaluation',
    href: '/sell-your-car',
    image:
      'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1000&q=85',
    icon: KeyRound,
  },
  {
    title: 'Ownership Transfer',
    text: 'Document checklist and ownership-transfer coordination.',
    cta: 'Know More',
    href: '/services/rc-transfer',
    image:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1000&q=85',
    icon: FileCheck,
  },
  {
    title: 'Finance Made Easy',
    text: 'Compare lender options with application support.',
    cta: 'Explore Finance',
    href: '/services/finance',
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=85',
    icon: Banknote,
  },
]

export const testimonials = [
  {
    name: 'OPTIMUM AUTOMOBILES',
    quote:
      'The experience was seamless from start to finish. Optimum Automobiles truly delivers trust and transparency.',
    purchase: 'Mercedes-Benz E-Class',
    location: 'Hinjawadi, Pune',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=85',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    quote:
      'Got my dream car at the best price. Highly professional team and great service!',
    purchase: 'BMW X5',
    location: 'Baner, Pune',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=85',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    quote:
      'Smooth process, genuine cars and excellent after-sales support. Highly recommended!',
    purchase: 'Audi Q7',
    location: 'Wakad, Pune',
    avatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=85',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    quote:
      'The team understood exactly what I wanted. Every detail was explained clearly, and delivery was right on schedule.',
    purchase: 'Land Rover Discovery',
    location: 'Kharadi, Pune',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=85',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    quote:
      'From the first test drive to the final paperwork, everything felt premium, honest, and remarkably well organised.',
    purchase: 'Lexus ES 300h',
    location: 'Aundh, Pune',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=85',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    quote:
      'A genuinely dependable dealership. The car was exactly as presented and the after-sales follow-up has been excellent.',
    purchase: 'Volvo XC90',
    location: 'Balewadi, Pune',
    avatar:
      'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=240&q=85',
  },
]

export const gallery = [
  ['Showroom exterior', '/images/hero/deccan-wheels-hero-v3.png'],
  ['Mercedes interior', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=700&q=85'],
  ['Customer delivery', 'https://images.unsplash.com/photo-1570294646112-27ce4f174e38?auto=format&fit=crop&w=700&q=85'],
  ['Luxury SUV', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=700&q=85'],
  ['Dealership building', '/images/showroom/deccan-wheels-showroom-final.png'],
  ['Premium sedan', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=700&q=85'],
].map(([alt, image]) => ({ alt, image }))

export const heroImage = '/images/hero/deccan-wheels-hero-v3.png'

export const heroCarSlides = [
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-bmw-5-series.webp',
    alt: 'Black BMW 5 Series outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-bmw-5-series-white.webp',
    alt: 'Pearl white BMW 5 Series outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-audi-rs7.webp',
    alt: 'Black Audi RS7 outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-audi-rs7-nardo-grey.webp',
    alt: 'Nardo grey Audi RS7 outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-mercedes-s-class.webp',
    alt: 'Black Mercedes-Benz S-Class outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-mercedes-s-class-white.webp',
    alt: 'Pearl white Mercedes-Benz S-Class outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-defender-110.webp',
    alt: 'Black Land Rover Defender 110 outside a premium showroom at night',
  },
  {
    name: 'OPTIMUM AUTOMOBILES',
    image: '/images/hero/hero-defender-110-green.webp',
    alt: 'British racing green Land Rover Defender 110 outside a premium showroom at night',
  },
]

export const showroomImage = '/images/showroom/deccan-wheels-showroom-final.png'

export const mapImage =
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80'

export const footerColumns: Array<[string, string[]]> = [
  ['Quick Links', ['Home', 'Inventory', 'Sell Your Car', 'Services', 'About Us', 'Contact Us']],
  [
    'Our Services',
    [
      'Buy Used Cars',
      'Sell Your Car',
      'Ownership Transfer',
      'Car Finance',
      'Insurance Assistance',
      'Extended Warranty',
    ],
  ],
  ['Information', ['About Us', 'Our Process', 'Why Choose Us', 'Testimonials', 'FAQs', 'Blog']],
  ['Legal', ['Terms & Conditions', 'Privacy Policy', 'Refund Policy', 'Cookie Policy', 'Sitemap']],
]

export const searchableRoutes = [
  ...vehicles.map((vehicle) => ({
    title: `${vehicle.make} ${vehicle.model}`,
    subtitle: `${vehicle.year} - ${vehicle.price}`,
    href: `/inventory/${vehicle.slug}`,
    image: vehicle.image,
  })),
  ...brands.map((brand) => ({
    title: brand.name,
    subtitle: 'Browse brand inventory',
    href: `/brands/${brand.slug}`,
    image: heroImage,
  })),
]

export const makeModelMap: Record<string, string[]> = {
  mercedes: ['E-Class', 'C-Class', 'GLC', 'GLE'],
  bmw: ['X5', '5 Series', '7 Series', 'X3'],
  audi: ['Q7', 'A6', 'Q5', 'A8'],
  porsche: ['Cayenne', 'Macan', 'Panamera'],
  'land-rover': ['Discovery', 'Range Rover', 'Defender'],
  lexus: ['ES 300h', 'RX', 'NX'],
}

export const routeTitles: Record<string, string> = {
  inventory: 'Inventory',
  brands: 'Brands',
  'body-types': 'Body Types',
  compare: 'Compare Cars',
  'sell-your-car': 'Sell Your Car',
  services: 'Services',
  'happy-customers': 'Happy Customers',
  'about-us': 'About Us',
  'contact-us': 'Contact Us',
  contact: 'Contact Us',
  favorites: 'Favorites',
  login: 'Login',
  signup: 'Create Account',
  'forgot-password': 'Forgot Password',
  account: 'Account',
  admin: 'Admin',
  terms: 'Terms and Conditions',
  privacy: 'Privacy Policy',
  'refund-policy': 'Refund Policy',
  'cookie-policy': 'Cookie Policy',
  sitemap: 'Sitemap',
}
