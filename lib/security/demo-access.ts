/** Hosted demo environments must never onboard real customers or deliver messages. */
export function isHostedDemoEnvironment(env = process.env.APP_ENV): boolean {
  return env === 'staging' || env === 'demo' || env === 'preview'
}

export function isDemoEmail(email: string): boolean {
  return /^[a-z0-9][a-z0-9._+-]*@car-dealership\.test$/i.test(email.trim())
}

export function assertDemoEmail(email: string, env = process.env.APP_ENV): void {
  if (isHostedDemoEnvironment(env) && !isDemoEmail(email)) {
    throw new Error('Only reserved fictional .test accounts are permitted in hosted demos.')
  }
}

export function canUseSelfRegistration(env = process.env.APP_ENV): boolean {
  return !isHostedDemoEnvironment(env) && env !== 'commercial'
}

export const demoAccountFixtureRoles = {
  'demo.admin@car-dealership.test': 'SUPER_ADMIN',
  'demo.manager@car-dealership.test': 'ADMIN',
  'demo.sales@car-dealership.test': 'SALES',
  'demo.operations@car-dealership.test': 'OPERATIONS',
  'demo.content@car-dealership.test': 'CONTENT_MANAGER',
  'customer.one@car-dealership.test': 'CUSTOMER',
  'customer.two@car-dealership.test': 'CUSTOMER',
} as const
