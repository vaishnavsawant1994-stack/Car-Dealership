'use client'

import { MessageCircle } from 'lucide-react'
import { useSiteConfig } from '@/components/providers/SiteConfigProvider'

export function WhatsAppFloatingButton() {
  const config = useSiteConfig()

  return (
    <a
      className="whatsapp-float"
      href={config.whatsAppUrl}
      aria-label="Contact the demonstration team"
      title="Demo contact form"
    >
      <span className="whatsapp-float__icon"><MessageCircle aria-hidden="true" /></span>
      <span className="whatsapp-float__copy"><small>Need help?</small><strong>Contact demo team</strong></span>
    </a>
  )
}
