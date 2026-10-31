'use client'

import { ArrowUp, ChevronDown, ChevronRight, Clock3, Compass, Info, Mail, MapPin, Phone, Scale, Send, ShieldCheck, Wrench } from 'lucide-react'
import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { SocialIcon } from '@/components/layout/SocialIcon'
import { footerColumns } from '@/lib/constants/site'
import { useSiteConfig } from '@/components/providers/SiteConfigProvider'

function slugify(label: string) {
  const routes: Record<string, string> = {
    Home: '/',
    Inventory: '/inventory',
    'Sell Your Car': '/sell-your-car',
    Services: '/services',
    'About Us': '/about-us',
    'Contact Us': '/contact',
    'Buy Used Cars': '/inventory',
    'Ownership Transfer': '/services/rc-transfer',
    'Car Finance': '/services/finance',
    'Insurance Assistance': '/services/insurance',
    'Extended Warranty': '/services/extended-warranty',
    'Our Process': '/our-process',
    'Why Choose Us': '/why-choose-us',
    Testimonials: '/testimonials',
    FAQs: '/faqs',
    Blog: '/blog',
    'Terms & Conditions': '/terms',
    'Privacy Policy': '/privacy',
    'Refund Policy': '/refund-policy',
    'Cookie Policy': '/cookie-policy',
    Sitemap: '/sitemap',
  }

  if (routes[label]) return routes[label]
  return `/${label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [openSection, setOpenSection] = useState<string | null>('Quick Links')
  const config = useSiteConfig()
  const publicConfig = { ...config, location: config.address }

  const columnIcons = {
    'Quick Links': Compass,
    'Our Services': Wrench,
    Information: Info,
    Legal: Scale,
  }

  async function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await response.json().catch(() => ({ message: 'Subscription could not be completed.' })) as { message?: string }
      setStatus(response.ok ? 'success' : 'error')
      setMessage(body.message ?? 'Something went wrong.')
      if (response.ok) setEmail('')
    } catch {
      setStatus('error')
      setMessage('We could not connect. Check your connection and try again.')
    }
  }

  const socialLinks = [
    ['facebook', publicConfig.facebook],
    ['instagram', publicConfig.instagram],
    ['youtube', publicConfig.youtube],
    ['linkedin', publicConfig.linkedin],
  ].filter(([, href]) => href && !/^https?:\/\/(www\.)?(facebook|linkedin)\.com\/?$/i.test(href)) as Array<[string, string]>

  return (
    <footer className="site-footer">
      <div className="footer-grid container-wide">
        <div className="footer-brand">
          <BrandLogo />
          <span className="footer-brand__badge"><ShieldCheck aria-hidden="true" /> Established in 2019</span>
          <p>
            A focused Pune destination for premium pre-owned luxury
            cars, with clear information and coordinated ownership support.
          </p>
          <div className="footer-contact-list">
            <a href={publicConfig.mapsUrl} target="_blank" rel="noreferrer">
              <MapPin aria-hidden="true" />
              <span><small>Showroom</small><strong>{publicConfig.location}</strong></span>
            </a>
            <a href={publicConfig.phoneHref}>
              <Phone aria-hidden="true" />
              <span><small>Call us</small><strong>{publicConfig.phone}</strong></span>
            </a>
            <a href={publicConfig.emailHref}>
              <Mail aria-hidden="true" />
              <span><small>Business email</small><strong>{publicConfig.email}</strong></span>
            </a>
            <a href={publicConfig.secondaryEmailHref}>
              <Mail aria-hidden="true" />
              <span><small>Alternate email</small><strong>{publicConfig.secondaryEmail}</strong></span>
            </a>
            <div><Clock3 aria-hidden="true" /><span><small>Open daily</small><strong>{publicConfig.hours}</strong></span></div>
          </div>
          {socialLinks.length ? <><small className="footer-social-label">Follow Car Dealership Demo</small><div className="social-row">{socialLinks.map(([network, href]) => <a href={href} aria-label={network} target="_blank" rel="noreferrer" key={network}><SocialIcon network={network as 'facebook' | 'instagram' | 'youtube' | 'linkedin'} /></a>)}</div></> : null}
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          {footerColumns.map(([title, links]) => {
            const Icon = columnIcons[title as keyof typeof columnIcons]
            const isOpen = openSection === title

            return (
              <section className={`footer-column${isOpen ? ' is-open' : ''}`} key={title}>
                <button
                  className="footer-column__toggle"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenSection(isOpen ? null : title)}
                >
                  <span><Icon aria-hidden="true" /><strong>{title}</strong></span>
                  <ChevronDown className="footer-column__chevron" aria-hidden="true" />
                </button>
                <div className="footer-column__links">
                  {links.map((label) => (
                    <Link href={slugify(label)} key={label}>
                      <span>{label}</span><ChevronRight aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </nav>

        <div className="footer-column footer-newsletter">
          <div className="footer-newsletter__heading">
            <span className="footer-newsletter__icon"><Send aria-hidden="true" /></span>
            <span><small>Stay informed</small><h2>Newsletter</h2></span>
          </div>
          <p>Subscribe to get the latest updates on new arrivals, offers and more.</p>
          <form onSubmit={submitNewsletter}>
            <label htmlFor="newsletter-email">Email address</label>
            <input
              id="newsletter-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              type="email"
              autoComplete="email"
              required
            />
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              <Send size={15} aria-hidden="true" />
            </button>
          </form>
          <small className="footer-newsletter__note"><ShieldCheck aria-hidden="true" /> Private, useful updates. No spam.</small>
          {message ? (
            <p className={`form-status form-status--${status}`} role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container-wide">
          <p>Car Dealership Demo — illustrative content only. No real sales or customer communication.</p>
          <span>Premium pre-owned automobiles in Pune</span>
          <button type="button" aria-label="Back to top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  )
}
