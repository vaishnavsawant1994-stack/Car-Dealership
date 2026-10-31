import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="auth-page" id="main-content">
      <section className="auth-visual" aria-label="Car Dealership Demo customer account">
        <Image src="/images/hero/hero-bmw-5-series.webp" alt="Black luxury sedan at the Car Dealership Demo showroom" fill sizes="(max-width: 840px) 100vw, 50vw" priority />
        <div className="auth-visual__shade" />
        <div className="auth-visual__copy">
          <span><ShieldCheck /> Verified ownership experience</span>
          <h1>Your garage,<br />always within reach.</h1>
          <p>Save handpicked cars, track every request and manage test drives from one private account.</p>
        </div>
      </section>
      <section className="auth-workspace">
        <div className="auth-panel">
          <Link className="auth-back" href="/"><ArrowLeft /> Back to showroom</Link>
          <header>
            <span className="auth-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{intro}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  )
}
