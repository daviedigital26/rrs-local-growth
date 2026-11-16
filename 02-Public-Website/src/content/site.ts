/** Global site content: navigation, footer, shared FAQ. */

export const nav = [
  { label: 'Services', href: '/services/' },
  { label: 'Industries', href: '/industries/' },
  { label: 'Pricing', href: '/pricing/' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About', href: '/about/' },
] as const;

export const footerNav = [
  {
    heading: 'Services',
    links: [
      { label: 'Local SEO & Maps', href: '/services/local-seo/' },
      { label: 'AI Search Visibility', href: '/services/ai-search-visibility/' },
      { label: 'Reviews & Reputation', href: '/services/reviews-reputation/' },
      { label: 'Lead Recovery', href: '/services/lead-recovery/' },
      { label: 'Website Conversion', href: '/services/website-conversion/' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'Industries', href: '/industries/' },
      { label: 'Pricing', href: '/pricing/' },
      { label: 'Case studies', href: '/case-studies/' },
      { label: 'Resources', href: '/resources/' },
      { label: 'Contact', href: '/contact/' },
    ],
  },
  {
    heading: 'Free Snapshot',
    links: [
      { label: 'Get your Snapshot', href: '/free-snapshot/' },
      { label: 'How we score', href: '/free-snapshot/methodology/' },
      { label: 'Sample report', href: '/free-snapshot/sample-report/' },
    ],
  },
] as const;

export const legalNav = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
  { label: 'Accessibility', href: '/accessibility/' },
] as const;

export interface FaqItem { q: string; a: string }

export const homeFaq: FaqItem[] = [
  { q: 'Why is the Snapshot free?', a: 'It’s how we start useful conversations. You get an honest, evidence-labelled look at where customers may be slipping away. If one of our programs fits, we’ll show you which one and why. If none fits, we’ll say so.' },
  { q: 'What do you actually check?', a: 'Twenty-six criteria across Google Maps presence, AI discovery readiness, reviews and trust, website conversion and lead follow-up. Every result records its source and the date we checked. Anything we can’t verify is labelled “Not verified”, never counted against you.' },
  { q: 'Do you guarantee rankings or AI recommendations?', a: 'No. Nobody can honestly guarantee Google rankings or what an AI assistant will say. We improve the things those systems rely on, and we report what we observe under recorded conditions.' },
  { q: 'Will you contact my customers?', a: 'Only through workflows you approve, and only with the consent the law requires. You approve message wording before anything goes live, and opt-outs are honoured immediately.' },
  { q: 'Do I need a new website?', a: 'Often not. Many businesses need a few focused fixes, like a tap-to-call button, a shorter form or clearer service pages. We recommend a refresh only when the evidence supports it.' },
  { q: 'Will you ask for my passwords?', a: 'Never. We use delegated access: you add us as a user or manager on your accounts and can remove us anytime.' },
  { q: 'Which areas do you serve?', a: 'We focus on the Phoenix metro: Phoenix, Surprise, Peoria, Glendale, Scottsdale and nearby communities.' },
  { q: 'How does pricing work?', a: 'Each program has a one-time setup fee and a monthly fee, shown on our pricing page. Messaging and calling costs for follow-up automation are usage-based and billed at cost, and we estimate them before anything goes live.' },
];
