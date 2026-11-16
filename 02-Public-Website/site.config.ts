/**
 * Website configuration from environment variables (see .env.example).
 * Every external integration is OFF unless configured AND approved by the owner.
 */
const env = (k: string): string => (typeof process !== 'undefined' ? process.env[k]?.trim() ?? '' : '');

const PLACEHOLDER_ORIGIN = 'https://www.example-rrs-domain.com';
const siteUrl = (env('SITE_URL') || PLACEHOLDER_ORIGIN).replace(/\/$/, '');

export const config = {
  siteUrl,
  /** True until a real, approved domain is configured: adds noindex + Disallow to stop accidental indexing. */
  isPreview: siteUrl === PLACEHOLDER_ORIGIN || /example|localhost|127\.0\.0\.1/.test(siteUrl),
  formEndpoint: env('FORM_ENDPOINT'),
  bookingUrl: env('BOOKING_URL'),
  analytics: { provider: env('ANALYTICS_PROVIDER') as '' | 'plausible' | 'ga4', id: env('ANALYTICS_ID') },
  errorEndpoint: env('ERROR_ENDPOINT'),
  publicPhone: env('PUBLIC_PHONE'),
  publicEmail: env('PUBLIC_EMAIL'),
  company: {
    name: 'Reale Revenue Systems',
    parent: 'Reale Labs',
    founder: 'David Reale',
    serviceArea: ['Phoenix', 'Surprise', 'Peoria', 'Glendale', 'Scottsdale'],
    region: 'Arizona',
  },
  /** Owner-approval-required copy. Shown on the Snapshot page; edit once approved. */
  snapshotTurnaround: 'We review every request by hand and email your Snapshot once it’s ready.',
} as const;

export type SiteConfig = typeof config;
