import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { UserStatus, UserRole } from '@prisma/client'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { credentialsSchema } from '@/lib/auth/validation'
import { verifyPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/db/prisma'
import { isDemoEmail, isHostedDemoEnvironment } from '@/lib/security/demo-access'

const configuredAuthSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

if (process.env.NODE_ENV === 'production' || isHostedDemoEnvironment()) {
  if (!configuredAuthSecret || Buffer.byteLength(configuredAuthSecret, 'utf8') < 32) {
    throw new Error('A unique AUTH_SECRET of at least 32 bytes is required for hosted authentication.')
  }
  if (isHostedDemoEnvironment() && (process.env.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_SECRET)) {
    throw new Error('External social authentication is disabled in hosted Car-Dealership demonstrations.')
  }
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Email and password',
    credentials: {
      email: { label: 'Email address', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials)
      if (!parsed.success) return null
      if (isHostedDemoEnvironment() && !isDemoEmail(parsed.data.email)) return null

      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } })
      if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.password))) return null
      if (!user.emailVerified || user.status === UserStatus.PENDING_VERIFICATION) throw new Error('EMAIL_NOT_VERIFIED')
      if (user.status !== UserStatus.ACTIVE || user.deletedAt) throw new Error('ACCOUNT_INACTIVE')

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
        sessionVersion: user.sessionVersion,
      }
    },
  }),
]

if (!isHostedDemoEnvironment() && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(GoogleProvider({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }))
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: configuredAuthSecret ?? 'development-only-secret-not-used-in-production',
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === 'google') {
        if (profile && 'email_verified' in profile && profile.email_verified !== true) return false
        if (user.id) {
          try {
            await prisma.user.updateMany({ where: { id: user.id }, data: { status: UserStatus.ACTIVE, emailVerified: new Date() } })
          } catch {}
          user.status = UserStatus.ACTIVE
          user.sessionVersion ??= 1
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.status = user.status
        token.sessionVersion = user.sessionVersion
      }
      if (!token.sub) return token

      try {
        const current = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, status: true, sessionVersion: true, deletedAt: true },
        })
        if (!current || current.deletedAt || current.status !== UserStatus.ACTIVE) {
          token.authError = 'ACCOUNT_INACTIVE'
          return token
        }
        if (token.sessionVersion !== undefined && token.sessionVersion !== current.sessionVersion) {
          token.authError = 'SESSION_REVOKED'
          return token
        }
        token.role = current.role
        token.status = current.status
        token.sessionVersion = current.sessionVersion
        token.authError = undefined
      } catch {
        // Fail closed: an unverified database-backed session must not retain access.
        token.authError = 'AUTH_SERVICE_UNAVAILABLE'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role ?? UserRole.CUSTOMER
        session.user.status = token.status ?? UserStatus.PENDING_VERIFICATION
        session.user.sessionVersion = token.sessionVersion ?? 0
      }
      session.authError = token.authError
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return
      try {
        await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ACTIVE, emailVerified: new Date() } })
      } catch {}
    },
    async signIn({ user, account }) {
      if (!user.id) return
      try {
        await prisma.auditLog.create({
          data: { actorId: user.id, action: 'AUTH_SIGN_IN', entity: 'User', entityId: user.id, metadata: { provider: account?.provider ?? 'unknown' } },
        })
      } catch {}
    },
  },
}

export const googleAuthEnabled = !isHostedDemoEnvironment() && Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
