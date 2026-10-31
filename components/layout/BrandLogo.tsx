import Image from 'next/image'
import Link from 'next/link'
import { businessIdentity } from '@/lib/constants/business'

type BrandLogoProps = {
  compact?: boolean
  priority?: boolean
}

export function OptimumMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`optimum-mark ${className}`}
      viewBox="0 0 96 42"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 12h27l8 9-8 9H12l-7-7h22l2-2-2-2H9L3 12Z" />
      <path d="M93 12H66l-8 9 8 9h18l7-7H69l-2-2 2-2h18l6-7Z" />
      <circle cx="48" cy="21" r="15" />
      <text x="48" y="26" textAnchor="middle">CD</text>
    </svg>
  )
}

export function BrandLogo({ compact = false, priority = false }: BrandLogoProps) {
  return (
    <Link className={`brand-logo${compact ? ' brand-logo--compact' : ''}`} href="/" aria-label="Car Dealership Demo home">
      <Image
        className="brand-logo__image"
        src={businessIdentity.logoUrl}
        alt="Car Dealership Demo — Demonstration Platform"
        width={1774}
        height={887}
        priority={priority}
        sizes={compact ? '126px' : '(max-width: 1180px) 138px, 172px'}
      />
    </Link>
  )
}
