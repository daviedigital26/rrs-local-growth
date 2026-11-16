/**
 * Industry page content. Each page must stay genuinely distinct (no doorway pages, D-007);
 * the e2e suite checks that industry pages don't share body paragraphs.
 * "What we often check first" items are starting hypotheses, not claims about any business.
 */
import type { OfferId } from '../../../03-Offers-and-Pricing/types.ts';
import type { FaqItem } from './site.ts';

export interface IndustryContent {
  slug: string;
  name: string;
  short: string;
  examples: string[];
  seoTitle: string;
  description: string;
  h1: string;
  intro: string;
  moments: Array<{ title: string; text: string }>;
  checkFirst: string[];
  startWith: OfferId;
  startWhy: string;
  related?: { name: string; note: string; href: string };
  notes?: string;
  faq: FaqItem[];
}

export const industries: IndustryContent[] = [
  {
    slug: 'home-services',
    name: 'Home services',
    short: 'HVAC, plumbing, roofing & electrical',
    examples: ['HVAC', 'Plumbing', 'Roofing', 'Electrical'],
    seoTitle: 'Lead Follow-Up & Local SEO for HVAC, Plumbing, Roofing and Electrical Contractors',
    description: 'For Phoenix-area HVAC, plumbing, roofing and electrical contractors: get found on Maps, win the comparison and book the urgent calls that come in mid-job.',
    h1: 'When the AC quits in July, the first business to answer usually gets the job.',
    intro: 'Home-service demand is urgent and seasonal. Customers search, compare two or three profiles and call whoever looks trustworthy and picks up. Your techs are on roofs and in attics when those calls come in, so systems have to cover the gap.',
    moments: [
      { title: 'Peak-season overflow', text: 'Call volume spikes on the hottest days, exactly when your team has the least time to answer.' },
      { title: 'The two-quote comparison', text: 'For replacements and bigger repairs, customers compare reviews, warranties and response times before choosing.' },
      { title: 'Licensed and insured', text: 'Customers look for proof you’re legitimate. Licence and insurance details on your site and profile build that trust.' },
    ],
    checkFirst: ['What happens to calls missed during jobs', 'Whether the phone number is tappable on mobile', 'Review recency through the busy season', 'Whether licence and warranty details are visible'],
    startWith: 'lead-rescue-booking-engine',
    startWhy: 'Urgent demand rewards speed. Capturing and following up every inquiry usually comes before more visibility.',
    notes: 'Arizona contractor licence information is public. We use it only to verify business details.',
    faq: [
      { q: 'We already pay for leads. Why would we need this?', a: 'Paid leads are only worth something if they’re answered quickly and followed up. We help you book more of the leads you’re already paying for.' },
      { q: 'Can you handle seasonal swings?', a: 'Yes. Seasonal campaign launches are available as an add-on, timed to your busy periods.' },
    ],
  },
  {
    slug: 'auto-detailing',
    name: 'Auto detailing & tint',
    short: 'Mobile detailers, tint and auto services',
    examples: ['Mobile detailing', 'Ceramic coating', 'Window tint', 'Paint protection'],
    seoTitle: 'Booking & Review Systems for Mobile Detailers and Window Tint Shops',
    description: 'For Phoenix-area mobile detailers and tint shops: turn DMs, texts and calls into booked appointments, and let your photos and reviews sell the work.',
    h1: 'Your work sells itself. Your booking process shouldn’t get in the way.',
    intro: 'Detailing and tint customers decide visually and book quickly. They scroll photos, check reviews and message whoever makes it easiest. If you’re polishing a car when the message comes in, a simple booking path and quick follow-up keep the job from going to the next result.',
    moments: [
      { title: 'Messages from everywhere', text: 'Inquiries arrive by text, DM, call and form, and some get lost between them.' },
      { title: 'Photos do the selling', text: 'Recent before-and-after photos on your profile often matter more than anything you write.' },
      { title: 'Packages and add-ons', text: 'Clear packages let customers choose and book without a back-and-forth on price.' },
    ],
    checkFirst: ['Whether customers can book online', 'How many inquiry channels exist and where they land', 'Photo freshness on your Google profile', 'Review volume compared with nearby detailers'],
    startWith: 'lead-rescue-booking-engine',
    startWhy: 'A clean booking path and on-time follow-up turn existing interest into appointments.',
    related: { name: 'Detailer Booking Recovery', note: 'Our booking and inquiry recovery service built specifically for detailers.', href: '/contact/?topic=detailer-booking-recovery' },
    faq: [
      { q: 'I’m a one-person mobile operation. Is this overkill?', a: 'Not if it saves you from answering every message mid-job. We size the setup to your volume and recommend only what pays for itself.' },
      { q: 'Can customers book specific packages?', a: 'Yes. We set up booking around your real packages and service area.' },
    ],
  },
  {
    slug: 'property-management',
    name: 'Property management',
    short: 'Residential property management firms',
    examples: ['Residential PM', 'Single-family portfolios', 'Small multifamily'],
    seoTitle: 'Owner-Lead Follow-Up & Reputation for Property Management Companies',
    description: 'For Phoenix-area property management firms: win more owner clients with faster follow-up, a stronger review profile and a website that answers owners’ questions.',
    h1: 'Owners compare managers carefully. Make the comparison easy to win.',
    intro: 'Property owners choosing a manager read reviews, many of them written by tenants, and compare how clearly each firm explains fees, communication and maintenance. Owner inquiries are high-value and infrequent, so every one deserves a fast, thoughtful response.',
    moments: [
      { title: 'Reviews from two audiences', text: 'Tenant and owner reviews sit side by side. Responding professionally to both shapes how owners see you.' },
      { title: 'High-value, low-volume leads', text: 'A single owner inquiry can mean years of management fees. Slow follow-up is expensive.' },
      { title: 'Questions before the call', text: 'Owners want fees, reporting and maintenance processes explained up front.' },
    ],
    checkFirst: ['How owner inquiries are captured and followed up', 'Owner-response rate on recent reviews', 'Whether fees and process are explained on the website', 'Consistency of business details across directories'],
    startWith: 'reputation-revenue-engine',
    startWhy: 'Reputation and response quality weigh heavily when owners compare managers.',
    related: { name: 'Property Management Profit Leak Audit', note: 'Our paid, PM-specific diagnostic for firms that want a deeper operational review.', href: '/contact/?topic=profit-leak-audit' },
    faq: [
      { q: 'Do you work with AppFolio, Buildium or DoorLoop?', a: 'We work alongside the platform you use and recommend integrations only where your platform documents them.' },
      { q: 'How is this different from the Profit Leak Audit?', a: 'The free Snapshot looks at public-facing visibility and follow-up. The Profit Leak Audit is a deeper, paid review of PM operations.' },
    ],
  },
  {
    slug: 'recurring-services',
    name: 'Recurring services',
    short: 'Cleaning, landscaping & pool',
    examples: ['House cleaning', 'Landscaping', 'Pool service', 'Pest control'],
    seoTitle: 'Reviews, Reactivation & Follow-Up for Cleaning, Landscaping and Pool Companies',
    description: 'For Phoenix-area cleaning, landscaping and pool businesses: keep recurring customers, earn steady reviews and win back past customers with permission-based follow-up.',
    h1: 'Recurring customers are your margin. Keep them, and earn more like them.',
    intro: 'Recurring-service businesses live on retention. A steady flow of honest reviews shows new customers you’re reliable week after week, and permission-based check-ins bring back customers who paused for the summer or moved on without saying why.',
    moments: [
      { title: 'The quiet cancel', text: 'Customers often pause or stop without complaint. A timely check-in can bring some back.' },
      { title: 'Reliability is the product', text: 'New customers look for evidence that you show up every time: recent, consistent reviews.' },
      { title: 'Seasonal demand', text: 'Pool openings, monsoon cleanups and spring landscaping create predictable peaks to plan for.' },
    ],
    checkFirst: ['Review recency and response rate', 'Whether past customers can be re-engaged with consent', 'Online quote or booking options', 'Service-area clarity on the website'],
    startWith: 'reputation-revenue-engine',
    startWhy: 'Steady reviews from every customer build the reliability signal recurring services depend on.',
    faq: [
      { q: 'Can you help win back past customers?', a: 'Yes, through a Revenue Reactivation Sprint, as long as you have an applicable consent basis to contact them.' },
      { q: 'We’re booked solid. Do we need this?', a: 'Maybe not right now. The Snapshot will tell you honestly whether anything is worth fixing.' },
    ],
  },
  {
    slug: 'remodeling',
    name: 'Remodeling & home improvement',
    short: 'Remodelers and home-improvement contractors',
    examples: ['Kitchen & bath', 'Flooring', 'Cabinets', 'Outdoor living'],
    seoTitle: 'Websites & Quote Follow-Up for Remodeling and Home Improvement Contractors',
    description: 'For Phoenix-area remodelers: show your real work, make it easy to request a consultation, and follow up on every quote through a long decision cycle.',
    h1: 'Big projects take long decisions. Stay present for all of them.',
    intro: 'Remodeling customers research for weeks, collect several quotes and decide slowly. The contractor who shows real past work, explains the process clearly and follows up thoughtfully after the estimate is often the one who gets the signature.',
    moments: [
      { title: 'Portfolio over promises', text: 'Real project photos and clear process pages carry more weight than slogans.' },
      { title: 'The estimate gap', text: 'Weeks can pass between an estimate and a decision. Structured follow-up keeps you in the conversation.' },
      { title: 'Trust at a high price point', text: 'Licensing, warranties and reviews matter more as project size grows.' },
    ],
    checkFirst: ['Quote follow-up after estimates', 'Real project photos on the website and profile', 'Consultation request friction on mobile', 'Trust proof such as licence, warranty and reviews'],
    startWith: 'website-to-customer-conversion',
    startWhy: 'Your website carries much of the persuasion in a long, high-value decision.',
    faq: [
      { q: 'Can you write about our projects?', a: 'Yes, from real projects you approve, with homeowner permission where they’re identifiable.' },
      { q: 'Do you run ads?', a: 'Ad campaign packages are planned. Ad spend and launches always need your explicit approval.' },
    ],
  },
  {
    slug: 'professional-services',
    name: 'Professional services',
    short: 'Selected professional firms',
    examples: ['Accounting & bookkeeping', 'Insurance agencies', 'Consultants'],
    seoTitle: 'Local Visibility & Website Clarity for Professional Service Firms',
    description: 'For Phoenix-area professional firms with suitable budgets: clearer websites, stronger reputations and compliant follow-up, mindful of professional advertising rules.',
    h1: 'Clients choose expertise they can understand. Make yours easy to see.',
    intro: 'Professional services are hard to evaluate before you buy, so prospects lean on clarity, reputation and responsiveness. We help firms explain what they do in plain language, show credible proof and respond promptly, within the advertising rules that apply to their profession.',
    moments: [
      { title: 'Explaining the invisible', text: 'Clear service pages that answer real questions do more than credentials alone.' },
      { title: 'Referral checks', text: 'Even referred prospects look you up. Your profile and reviews confirm the referral.' },
      { title: 'Rules matter', text: 'Many professions limit testimonials, claims or solicitation. Compliance comes first.' },
    ],
    checkFirst: ['Service-page clarity and answers to common questions', 'Profile completeness and categories', 'Review responses', 'Any profession-specific advertising constraints'],
    startWith: 'website-to-customer-conversion',
    startWhy: 'Clarity on the website is usually the biggest lever when the service is hard to evaluate.',
    notes: 'We confirm profession-specific advertising and solicitation rules before recommending reviews, testimonials or outreach.',
    faq: [
      { q: 'Which professions do you work with?', a: 'Selected firms with suitable budgets and manageable compliance requirements. We’ll tell you honestly if another provider is a better fit.' },
      { q: 'Can we use client testimonials?', a: 'Only where your profession’s rules allow it, and only with written permission.' },
    ],
  },
];

export const secondaryIndustries = [
  { name: 'Realtors & real estate teams', note: 'Served through Realtor Pipeline Recovery™ and Price Drop Pro™.', href: '/contact/?topic=realtor-pipeline-recovery' },
  { name: 'Med spas', note: 'Booking and reputation, with healthcare advertising rules reviewed first.', href: '/contact/?topic=med-spa' },
  { name: 'Chiropractors', note: 'Appointment follow-up and reviews, with privacy-safe messaging.', href: '/contact/?topic=chiropractic' },
  { name: 'Dental offices', note: 'Booking and reputation, with no patient health information in automated messages.', href: '/contact/?topic=dental' },
];

export const industryBySlug = (slug: string) => industries.find((i) => i.slug === slug);
