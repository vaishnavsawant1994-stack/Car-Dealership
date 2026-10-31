'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import useEmblaCarousel from 'embla-carousel-react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Fuel,
  Gauge,
  Heart,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BrandMark } from '@/components/home/BrandMark'
import { OptimumMark } from '@/components/layout/BrandLogo'
import { SocialIcon } from '@/components/layout/SocialIcon'
import { HeroCarRotator } from '@/components/shared/HeroCarRotator'
import { CustomerReviews } from '@/components/shared/CustomerReviews'
import { useFavourites } from '@/components/providers/FavouriteProvider'
import { useSiteConfig } from '@/components/providers/SiteConfigProvider'
import {
  benefits,
  gallery as defaultGallery,
  mapImage,
  servicePromos,
  showroomImage,
  stats,
  trustPoints,
} from '@/lib/constants/site'
import type { BrandSummary, VehicleCardData } from '@/lib/types/inventory'
import { contactSchema, searchSchema, type ContactInput, type SearchInput } from '@/lib/validation/forms'

type ApiMessage = {
  message?: string
}

function slugFor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function AnimatedStatValue({ value }: { value: string }) {
  const target = Number.parseInt(value.replace(/\D/g, ''), 10)
  const suffix = value.replace(/[\d,]/g, '')
  const [display, setDisplay] = useState(0)
  const valueRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = valueRef.current
    if (!element) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()

        if (reducedMotion) {
          setDisplay(target)
          return
        }

        const startedAt = performance.now()
        const animate = (now: number) => {
          const progress = Math.min((now - startedAt) / 1200, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(Math.round(target * eased))
          if (progress < 1) animationFrame = requestAnimationFrame(animate)
        }
        animationFrame = requestAnimationFrame(animate)
      },
      { threshold: 0.4 },
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  }, [target])

  return <strong ref={valueRef}>{Number.isNaN(target) ? value : `${display}${suffix}`}</strong>
}

export function HomePage({ vehicles, brands }: { vehicles: VehicleCardData[]; brands: BrandSummary[] }) {
  return (
    <main id="main-content">
      <HeroSection />
      <StatsPanel />
      <VehicleSearchPanel vehicles={vehicles} brands={brands} />
      <BrowseByBrand brands={brands} />
      <NewArrivals vehicles={vehicles} />
      <Benefits />
      <ServicePromos />
      <CustomerReviews />
      <InstagramGallery />
      <ShowroomContact />
      <MobileActionBar />
    </main>
  )
}

function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="section-title">
      <span />
      <h2>{title}</h2>
      {actionHref && actionLabel ? (
        <Link href={actionHref}>
          {actionLabel}
          <ArrowRight size={15} />
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}

function HeroSection() {
  const [copy, setCopy] = useState({ heroEyebrow: 'Car Dealership Demo', headline: 'Drive Luxury, Own Excellence.', supportingCopy: 'An illustrative automotive retail experience with fictional inventory.' })
  useEffect(() => {
    let active = true
    fetch('/api/content/homepage').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (active && payload?.data?.value) setCopy((current) => ({ ...current, ...payload.data.value }))
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  const [firstLine, secondLine = ''] = copy.headline.split(/,(.*)/s)
  const highlightLast = (line: string) => { const words = line.trim().split(/\s+/); const last = words.pop(); return <>{words.join(' ')}{words.length ? ' ' : ''}<span>{last}</span></> }
  return (
    <section className="hero-home">
      <HeroCarRotator />
      <div className="hero-home__overlay" />
      <div className="hero-home__content container-wide">
        <div className="hero-copy-block">
          <div className="hero-kicker">
            <OptimumMark className="hero-kicker__mark" />
            <span>
              <strong>{copy.heroEyebrow}</strong>
              <small>Pre-owned luxury cars</small>
            </span>
          </div>
          <h1>{highlightLast(firstLine)},<br />{highlightLast(secondLine)}</h1>
          <p className="hero-description">{copy.supportingCopy}</p>
          <div className="hero-actions">
            <Link className="gold-button" href="/inventory">
              Explore Inventory
              <ArrowRight size={18} />
            </Link>
            <Link className="dark-button" href="/sell-your-car">
              Sell Your Car
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="trust-row">
            {trustPoints.map((point) => (
              <span key={point}>
                <BadgeCheck size={14} />
                {point}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-assurance" aria-label="Car Dealership Demo quality standard">
          <span className="hero-assurance__icon"><BadgeCheck aria-hidden="true" /></span>
          <span>
            <small>Demo Inspection Standard</small>
            <strong>Verified. Transparent. Ready.</strong>
          </span>
        </div>
      </div>
    </section>
  )
}

function StatsPanel() {
  return (
    <section className="stats-panel container-wide" aria-label="Car Dealership Demo statistics">
      {stats.map((item, index) => {
        const Icon = item.icon
        return (
          <div className="stat-item" key={item.label}>
            <span className="stat-item__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="stat-item__icon"><Icon aria-hidden="true" /></span>
            <div className="stat-item__copy">
              <AnimatedStatValue value={item.value} />
              <span>{item.label}</span>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function VehicleSearchPanel({ vehicles, brands }: { vehicles: VehicleCardData[]; brands: BrandSummary[] }) {
  const router = useRouter()
  const { register, handleSubmit, watch } = useForm<SearchInput>({
    resolver: zodResolver(searchSchema),
    defaultValues: { make: '', model: '', price: '', year: '', mileage: '' },
  })
  const make = watch('make') ?? ''
  const modelOptions = useMemo(
    () => [...new Set(vehicles.filter((vehicle) => !make || vehicle.brandSlug === make).map((vehicle) => vehicle.model))],
    [make, vehicles],
  )

  function onSubmit(values: SearchInput) {
    const params = new URLSearchParams()
    if (values.make) params.set('brand', values.make)
    if (values.model) params.set('model', slugFor(values.model))
    if (values.price) params.set('price', values.price)
    if (values.year) params.set('year', values.year)
    if (values.mileage) params.set('mileage', values.mileage)
    router.push(`/inventory${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <section className="search-panel container-wide" aria-labelledby="vehicle-search-title">
      <div className="search-panel__header">
        <div className="search-panel__title">
          <span className="search-panel__title-icon"><Search aria-hidden="true" /></span>
          <div>
            <h2 id="vehicle-search-title">Find Your Perfect Car</h2>
            <p>Search from our wide range of premium pre-owned cars.</p>
          </div>
        </div>
        <Link href="/inventory/search?advanced=true">
          Advanced Search
          <SlidersHorizontal size={15} />
        </Link>
      </div>
      <form className="vehicle-search-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          <span><CarFront aria-hidden="true" />Make</span>
          <select {...register('make')}>
            <option value="">All Makes</option>
            {brands.map((brand) => (
              <option value={brand.slug} key={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
          <ChevronDown className="select-chevron" size={15} />
        </label>
        <label>
          <span><Settings2 aria-hidden="true" />Model</span>
          <select {...register('model')}>
            <option value="">All Models</option>
            {modelOptions.map((model) => (
              <option value={model} key={model}>
                {model}
              </option>
            ))}
          </select>
          <ChevronDown className="select-chevron" size={15} />
        </label>
        <label>
          <span><IndianRupee aria-hidden="true" />Price Range</span>
          <select {...register('price')}>
            <option value="">Min - Max</option>
            <option value="4000000-6000000">40L - 60L</option>
            <option value="6000000-9000000">60L - 90L</option>
            <option value="9000000-15000000">90L - 1.5Cr</option>
          </select>
          <ChevronDown className="select-chevron" size={15} />
        </label>
        <label>
          <span><CalendarDays aria-hidden="true" />Year</span>
          <select {...register('year')}>
            <option value="">Any Year</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>
          <ChevronDown className="select-chevron" size={15} />
        </label>
        <label>
          <span><Gauge aria-hidden="true" />Total Run</span>
          <select {...register('mileage')}>
            <option value="">Any Total Run</option>
            <option value="0-20000">Under 20,000 km</option>
            <option value="20000-40000">20,000 - 40,000 km</option>
            <option value="40000-70000">40,000 - 70,000 km</option>
          </select>
          <ChevronDown className="select-chevron" size={15} />
        </label>
        <button className="gold-button" type="submit">
          Search Cars
          <ArrowRight size={17} />
        </button>
      </form>
    </section>
  )
}

function BrowseByBrand({ brands }: { brands: BrandSummary[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: true, skipSnaps: false, duration: 34 })
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!emblaApi || isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => emblaApi.scrollNext(), 2600)
    return () => window.clearInterval(timer)
  }, [emblaApi, isPaused])

  return (
    <section className="brand-strip container-wide" aria-labelledby="brand-title">
      <SectionTitle title="Browse By Brand" />
      <div
        className="brand-carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
      >
        <button className="round-nav round-nav--left" type="button" aria-label="Previous brands" onClick={() => emblaApi?.scrollPrev()}>
          <ArrowLeft size={18} />
        </button>
        <div className="embla" ref={emblaRef}>
          <div className="brand-track">
            {brands.map((brand) => (
              <Link
                href={`/brands/${brand.slug}`}
                key={brand.slug}
                aria-label={`Browse ${brand.name} vehicles`}
              >
                <span className="brand-mark-frame">
                  <BrandMark slug={brand.slug} accent={brand.accent} />
                </span>
                <span className="brand-tooltip" role="tooltip">{brand.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <button className="round-nav round-nav--right" type="button" aria-label="Next brands" onClick={() => emblaApi?.scrollNext()}>
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  )
}

function NewArrivals({ vehicles }: { vehicles: VehicleCardData[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: true, skipSnaps: false })
  const favorites = useFavourites()
  const [activeVehicle, setActiveVehicle] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!emblaApi) return
    const updateSelected = () => setActiveVehicle(emblaApi.selectedScrollSnap())
    emblaApi.on('select', updateSelected)
    return () => {
      emblaApi.off('select', updateSelected)
    }
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi || isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => emblaApi.scrollNext(), 5200)
    return () => window.clearInterval(timer)
  }, [emblaApi, isPaused])

  return (
    <section className="new-arrivals container-wide" aria-labelledby="new-arrivals-title">
      <div className="inventory-heading">
        <h2 id="new-arrivals-title">New Arrivals</h2>
        <Link href="/inventory">
          View All Inventory
          <ArrowRight size={15} />
        </Link>
      </div>
      <div
        className="carousel-shell vehicle-carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
        }}
      >
        <button className="round-nav round-nav--left" type="button" aria-label="Previous vehicles" onClick={() => emblaApi?.scrollPrev()}>
          <ArrowLeft size={18} />
        </button>
        <div className="embla" ref={emblaRef}>
          <div className="vehicle-track">
            {vehicles.map((vehicle) => (
              <article className="vehicle-card" key={vehicle.id}>
                <Link className="vehicle-card__image" href={`/inventory/${vehicle.slug}`} aria-label={`View ${vehicle.make} ${vehicle.model}`}>
                  <Image src={vehicle.image} alt={vehicle.imageAlt} fill sizes="(min-width: 1200px) 25vw, 88vw" />
                  <span>{vehicle.badge}</span>
                  <small><BadgeCheck aria-hidden="true" />Certified</small>
                </Link>
                <button
                  className="favorite-button"
                  type="button"
                  aria-label={`${favorites.has(vehicle.id) ? 'Remove' : 'Add'} ${vehicle.make} ${vehicle.model} favorite`}
                  aria-pressed={favorites.has(vehicle.id)}
                  onClick={() => favorites.toggle(vehicle.id)}
                >
                  <Heart size={18} fill={favorites.has(vehicle.id) ? 'currentColor' : 'none'} />
                </button>
                <div className="vehicle-card__body">
                  <h3>{`${vehicle.make} ${vehicle.model}`}</h3>
                  <p>
                    {vehicle.variant} | {vehicle.year}
                  </p>
                  <ul>
                    <li><Gauge aria-hidden="true" />{vehicle.mileage}</li>
                    <li><Fuel aria-hidden="true" />{vehicle.fuel}</li>
                    <li><Settings2 aria-hidden="true" />{vehicle.transmission}</li>
                  </ul>
                  <div className="vehicle-card__footer">
                    <strong>{vehicle.price}</strong>
                    <Link href={`/inventory/${vehicle.slug}`}>View Details <ArrowRight aria-hidden="true" /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <button className="round-nav round-nav--right" type="button" aria-label="Next vehicles" onClick={() => emblaApi?.scrollNext()}>
          <ArrowRight size={18} />
        </button>
      </div>
      <div className="carousel-pagination" aria-label="Choose vehicle">
        {vehicles.map((vehicle, index) => (
          <button
            type="button"
            key={vehicle.id}
            className={activeVehicle === index ? 'is-active' : ''}
            aria-label={`Show ${vehicle.make} ${vehicle.model}`}
            aria-pressed={activeVehicle === index}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section className="benefits container-wide">
      <SectionTitle title="Why Choose Car Dealership Demo?" />
      <div className="benefit-grid">
        {benefits.map((item, index) => {
          const Icon = item.icon
          return (
            <article key={item.title}>
              <span className="benefit-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className="benefit-icon" aria-hidden="true">
                <Icon />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ServicePromos() {
  return (
    <section className="service-promos container-wide" aria-label="Services">
      {servicePromos.map((promo) => {
        const Icon = promo.icon
        return (
          <article key={promo.title}>
            <Image src={promo.image} alt="" fill sizes="(min-width: 900px) 33vw, 100vw" />
            <div className="service-promo__content">
              <header>
                <span><Icon aria-hidden="true" /></span>
                <h2>{promo.title}</h2>
              </header>
              <p>{promo.text}</p>
              <Link className="gold-button gold-button--small" href={promo.href}>
                {promo.cta}
                <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function InstagramGallery() {
  const siteConfig = useSiteConfig()
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: true, skipSnaps: false })
  const [activePost, setActivePost] = useState(0)
  const [galleryItems, setGalleryItems] = useState(defaultGallery)

  useEffect(() => {
    let active = true
    fetch('/api/gallery').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (active && payload?.data?.length) setGalleryItems(payload.data)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    const updateSelected = () => setActivePost(emblaApi.selectedScrollSnap())
    emblaApi.on('select', updateSelected)
    return () => {
      emblaApi.off('select', updateSelected)
    }
  }, [emblaApi])

  return (
    <section className="instagram-section container-wide" aria-labelledby="instagram-title">
      <header className="instagram-card">
        <div className="instagram-card__icon"><SocialIcon network="instagram" /></div>
        <div className="instagram-card__copy">
          <h2 id="instagram-title">Follow Us On Instagram</h2>
          <p>Sample gallery — no social account</p>
        </div>
        <a className="dark-button" href={siteConfig.instagram} target="_blank" rel="noreferrer">
          <SocialIcon network="instagram" />
          Follow Us
        </a>
      </header>
      <div className="instagram-gallery-shell">
        <button className="round-nav round-nav--left" type="button" aria-label="Previous Instagram posts" onClick={() => emblaApi?.scrollPrev()}>
          <ArrowLeft size={18} />
        </button>
        <div className="embla" ref={emblaRef}>
          <div className="instagram-track">
            {galleryItems.map((item, index) => (
              <a href={siteConfig.instagram} target="_blank" rel="noreferrer" key={`gallery-item-${index}-${item.alt}`} aria-label={`View ${item.alt} on Instagram`}>
                <Image src={item.image} alt="" fill sizes="(min-width: 1180px) 25vw, (min-width: 760px) 50vw, 84vw" />
                <span><SocialIcon network="instagram" />{item.alt}</span>
              </a>
            ))}
          </div>
        </div>
        <button className="round-nav round-nav--right" type="button" aria-label="Next Instagram posts" onClick={() => emblaApi?.scrollNext()}>
          <ArrowRight size={18} />
        </button>
      </div>
      <div className="instagram-pagination" aria-label="Choose Instagram post">
        {galleryItems.map((item, index) => (
          <button
            type="button"
            key={`gallery-item-${index}-${item.alt}`}
            className={activePost === index ? 'is-active' : ''}
            aria-label={`Show ${item.alt}`}
            aria-pressed={activePost === index}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </section>
  )
}

function ShowroomContact() {
  const siteConfig = useSiteConfig()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [addressCopied, setAddressCopied] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) })

  const submitContact = useCallback(
    async (values: ContactInput) => {
      setStatus('loading')
      setMessage('')
      try {
        const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        const body = await response.json().catch(() => ({ message: 'The message could not be sent.' })) as ApiMessage
        setStatus(response.ok ? 'success' : 'error')
        setMessage(body.message ?? 'Something went wrong.')
        if (response.ok) reset()
      } catch {
        setStatus('error')
        setMessage('We could not connect to the showroom. Check your connection and try again.')
      }
    },
    [reset],
  )

  return (
    <section className="showroom-section container-wide" aria-labelledby="showroom-section-title">
      <SectionTitle title="Visit & Connect" />
      <div className="showroom-contact">
        <div className="showroom-card">
        <span className="showroom-card__eyebrow"><MapPin aria-hidden="true" />Demo</span>
        <h2 id="showroom-section-title">Visit Our Showroom</h2>
        <address>
          <a href={siteConfig.mapsUrl} target="_blank" rel="noreferrer">
            <MapPin size={18} />
            {siteConfig.address}
          </a>
          <a href={siteConfig.phoneHref}>
            <Phone size={18} />
            {siteConfig.phone}
          </a>
          {siteConfig.secondaryPhone ? <a href={siteConfig.secondaryPhoneHref}>
            <Phone size={18} />
            {siteConfig.secondaryPhone}
          </a> : null}
          <a href={siteConfig.emailHref}>
            <Mail size={18} />
            {siteConfig.email}
          </a>
          <span>
            <Clock3 size={18} />
            {siteConfig.hours}
          </span>
        </address>
        <div className="showroom-actions">
          <button
            className="dark-button dark-button--small"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(siteConfig.address)
              setAddressCopied(true)
              window.setTimeout(() => setAddressCopied(false), 1800)
            }}
          >
            {addressCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {addressCopied ? 'Copied' : 'Copy Address'}
          </button>
          <a className="gold-button gold-button--small" href={siteConfig.mapsUrl} target="_blank" rel="noreferrer">
            <Navigation aria-hidden="true" />Directions
          </a>
        </div>
        </div>
        <div className="showroom-photo">
        <Image src={showroomImage} alt="" fill sizes="(min-width: 1180px) 66vw, 100vw" />
        <span><BadgeCheck aria-hidden="true" />Premium pre-owned showroom</span>
        </div>
        <form className="contact-form" onSubmit={handleSubmit(submitContact)} noValidate>
        <h2>Get In Touch</h2>
        <div className="contact-form__grid">
          <label>
            <span>Your Name</span>
            <input {...register('name')} aria-invalid={Boolean(errors.name)} />
            {errors.name ? <small>{errors.name.message}</small> : null}
          </label>
          <label>
            <span>Phone Number</span>
            <input {...register('phone')} aria-invalid={Boolean(errors.phone)} />
            {errors.phone ? <small>{errors.phone.message}</small> : null}
          </label>
        </div>
        <label>
          <span>Email Address</span>
          <input type="email" {...register('email')} aria-invalid={Boolean(errors.email)} />
          {errors.email ? <small>{errors.email.message}</small> : null}
        </label>
        <label>
          <span>Your Message</span>
          <textarea rows={4} {...register('message')} aria-invalid={Boolean(errors.message)} />
          {errors.message ? <small>{errors.message.message}</small> : null}
        </label>
        <input className="honeypot" tabIndex={-1} autoComplete="off" {...register('company')} />
        <button className="gold-button" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending' : 'Send Message'}
          <ArrowRight size={17} />
        </button>
        {message ? (
          <p className={`form-status form-status--${status}`} role="status">
            {message}
          </p>
        ) : null}
        </form>
        <a className="map-panel" href={siteConfig.mapsUrl} target="_blank" rel="noreferrer" aria-label="Open Car Dealership Demo showroom in Google Maps">
        <Image src={mapImage} alt="" fill sizes="(min-width: 1180px) 33vw, 100vw" />
        <span>
          <MapPin size={20} />
          <strong>Car Dealership Demo</strong>
          <small>Demo contact</small>
        </span>
        </a>
      </div>
    </section>
  )
}

function MobileActionBar() {
  const siteConfig = useSiteConfig()
  return (
    <div className="mobile-action-bar">
      <a href={siteConfig.phoneHref}>
        <Phone size={17} />
        Call
      </a>
      <a href={siteConfig.whatsAppUrl} target="_blank" rel="noreferrer">
        <MessageCircle size={17} />
        {siteConfig.whatsAppUrl.startsWith('https://wa.me/') ? 'WhatsApp' : 'Contact'}
      </a>
    </div>
  )
}
