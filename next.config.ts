import type { NextConfig } from 'next'

const isDevelopment = process.env.NODE_ENV !== 'production'
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

function getStorageRemotePattern() {
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.trim()
  if (!publicBase) return null

  try {
    const url = new URL(publicBase)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

    return {
      protocol: url.protocol.slice(0, -1) as 'http' | 'https',
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/$/, '') || ''}/**`,
    }
  } catch {
    return null
  }
}

const storageRemotePattern = getStorageRemotePattern()

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ...(process.env.APP_ENV === 'commercial' ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }]),
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    }]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...(storageRemotePattern ? [storageRemotePattern] : []),
    ],
  },
}

export default nextConfig
