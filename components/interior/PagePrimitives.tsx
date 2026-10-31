'use client'

import { ArrowRight, BadgeCheck, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { OptimumMark } from '@/components/layout/BrandLogo'
import { HeroCarRotator } from '@/components/shared/HeroCarRotator'
import { trustPoints } from '@/lib/constants/site'

export function PageHero({
  eyebrow,
  title,
  accent,
  text,
  actions,
}: {
  eyebrow?: string
  title: string
  accent?: string
  text: string
  image: string
  actions?: Array<{ label: string; href: string; secondary?: boolean }>
  compact?: boolean
}) {
  const heroActions = actions?.length
    ? actions
    : eyebrow?.includes('Inventory')
      ? [
          { label: 'Sell Your Car', href: '/sell-your-car' },
          { label: 'Contact Our Team', href: '/contact', secondary: true },
        ]
      : [
          { label: 'Explore Inventory', href: '/inventory' },
          { label: 'Contact Our Team', href: '/contact', secondary: true },
        ]

  return (
    <section className="hero-home page-hero-home">
      <HeroCarRotator />
      <div className="hero-home__overlay" />
      <div className="hero-home__content container-wide">
        <div className="hero-copy-block">
          <div className="hero-kicker">
            <OptimumMark className="hero-kicker__mark" />
            <span>
              <strong>Car Dealership Demo</strong>
              <small>{eyebrow ?? 'Premium pre-owned luxury cars'}</small>
            </span>
          </div>
          <h1>{title}{accent ? <><br /><span>{accent}</span></> : null}</h1>
          <p className="hero-description">{text}</p>
          <div className="hero-actions">
            {heroActions.map((action) => (
              <Link className={action.secondary ? 'dark-button' : 'gold-button'} href={action.href} key={action.label}>
                {action.label}<ArrowRight size={18} />
              </Link>
            ))}
          </div>
          <div className="trust-row">
            {trustPoints.map((point) => <span key={point}><BadgeCheck size={14} />{point}</span>)}
          </div>
        </div>
        <div className="hero-assurance" aria-label="Car Dealership Demo quality standard">
          <span className="hero-assurance__icon"><BadgeCheck aria-hidden="true" /></span>
          <span><small>The Optimum Standard</small><strong>Verified. Transparent. Ready.</strong></span>
        </div>
      </div>
    </section>
  )
}

export function InteriorHeading({ title, eyebrow, text }: { title: string; eyebrow?: string; text?: string }) {
  return (
    <header className="interior-heading">
      {eyebrow ? <p>{eyebrow}</p> : null}
      <h2>{title}</h2>
      {text ? <span>{text}</span> : null}
    </header>
  )
}

export function IconFeatureGrid({
  items,
  className = '',
}: {
  items: Array<{ title: string; text: string; icon: LucideIcon; href?: string }>
  className?: string
}) {
  return (
    <div className={`interior-feature-grid ${className}`}>
      {items.map((item) => {
        const Icon = item.icon
        const content = (
          <>
            <span className="interior-feature__icon"><Icon aria-hidden="true" /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            {item.href ? <small>Learn more <ArrowRight size={12} /></small> : null}
          </>
        )
        return item.href ? <Link href={item.href} key={item.title}>{content}</Link> : <article key={item.title}>{content}</article>
      })}
    </div>
  )
}

export function ProcessSteps({ items }: { items: Array<{ title: string; text: string; icon: LucideIcon }> }) {
  return (
    <ol className="process-steps">
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <li key={item.title}>
            <span className="process-step__number">{String(index + 1).padStart(2, '0')}</span>
            <span className="process-step__icon"><Icon aria-hidden="true" /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        )
      })}
    </ol>
  )
}

export function FaqList({ items }: { items: string[][] }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="interior-faq">
      {items.map(([question, answer], index) => {
        const expanded = open === index
        return (
          <div className={expanded ? 'is-open' : ''} key={question}>
            <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? -1 : index)}>
              <span>{question}</span><ChevronDown aria-hidden="true" />
            </button>
            {expanded ? <p>{answer}</p> : null}
          </div>
        )
      })}
    </div>
  )
}

export function InteriorCta({ title, text, image, primary, secondary }: {
  title: string
  text: string
  image: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}) {
  return (
    <section className="interior-cta container-wide">
      <Image src={image} alt="Luxury pre-owned car" fill sizes="100vw" />
      <div className="interior-cta__shade" />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
        <span className="interior-actions">
          <Link className="gold-button" href={primary.href}>{primary.label}<ArrowRight size={16} /></Link>
          {secondary ? <Link className="outline-button" href={secondary.href}>{secondary.label}</Link> : null}
        </span>
      </div>
    </section>
  )
}
