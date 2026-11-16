/** Service page content. Offer facts (price, deliverables, scope) come from the offer catalog. */
import type { OfferId } from '../../../03-Offers-and-Pricing/types.ts';
import type { CategoryId } from '../../../04-Audits-and-Scorecards/snapshot/framework.ts';
import type { FaqItem } from './site.ts';

export interface ServiceContent {
  slug: string;
  offerId: OfferId;
  category: CategoryId;
  navLabel: string;
  icon: 'pin' | 'spark' | 'star' | 'reply' | 'browser';
  seoTitle: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  signs: string[];
  process: Array<{ title: string; text: string }>;
  wontDo: string[];
  faq: FaqItem[];
  related: string[];
}

export const services: ServiceContent[] = [
  {
    slug: 'local-seo',
    offerId: 'local-visibility-jumpstart',
    category: 'maps',
    navLabel: 'Local SEO & Maps',
    icon: 'pin',
    seoTitle: 'Local SEO & Google Maps Optimization for Phoenix-Area Businesses',
    description: 'Fix your Google Business Profile, business listings and website basics so nearby customers can find you. Evidence-based local SEO in the Phoenix metro.',
    eyebrow: 'Get Discovered · Local SEO',
    h1: 'Show up correctly where local customers look first.',
    intro: 'Most customers find local businesses on Google Maps before they ever visit a website. We make sure your profile is complete and accurate, your business details agree everywhere they appear, and the basics are in place to turn that attention into calls.',
    signs: [
      'Your Google profile is missing services, a description or recent photos',
      'Directories list an old phone number or address',
      'Competitors appear on the map for your core service and you don’t',
      'You’ve never claimed or cleaned up your listings',
    ],
    process: [
      { title: 'Audit', text: 'We check your profile, categories and key listings, and record exactly what we found and when.' },
      { title: 'Correct', text: 'We fix your profile through delegated manager access and correct the listings that matter most.' },
      { title: 'Equip', text: 'We set up a simple, compliant review-request link and quick website fixes like tap-to-call.' },
      { title: 'Report', text: 'Each month you get a plain-English report of what changed and what comes next.' },
    ],
    wontDo: ['Stuff keywords into your business name', 'Create listings at addresses you don’t operate from', 'Buy or fake reviews or citations'],
    faq: [
      { q: 'How long until I see changes?', a: 'Profile and listing corrections are usually live within days of approval. How visibility responds varies by market and competition, so we report what we observe rather than promise a timeline.' },
      { q: 'Do I need a physical office?', a: 'No. Service-area businesses can have a profile without showing an address. You do need a legitimate location or service area. We never use virtual offices or fake addresses.' },
      { q: 'Can you manage more than one location?', a: 'Yes, as an add-on, as long as each location is real and staffed.' },
    ],
    related: ['ai-search-visibility', 'reviews-reputation'],
  },
  {
    slug: 'ai-search-visibility',
    offerId: 'ai-discovery-accelerator',
    category: 'ai',
    navLabel: 'AI Search Visibility',
    icon: 'spark',
    seoTitle: 'AI Search Visibility for Local Businesses | ChatGPT, Gemini & More',
    description: 'Make your business easy for AI assistants to understand and cite. Consistent business facts, structured data and original answers, tracked with recorded test conditions.',
    eyebrow: 'Get Discovered · AI search',
    h1: 'Be the business AI tools can describe accurately.',
    intro: 'People now ask AI assistants which local business to call. Those answers draw on your website, your profiles and what other reputable sites say about you. We make that information consistent, structured and worth citing, and we track what assistants say over time without pretending it’s a ranking.',
    signs: [
      'AI assistants describe competitors in your category but not you',
      'Your business details differ between your site and your profiles',
      'Your website lists services but doesn’t answer customers’ real questions',
      'You have no structured data describing your business',
    ],
    process: [
      { title: 'Baseline', text: 'We run a repeatable set of local prompts on named assistants and record the date, conditions and full answers.' },
      { title: 'Align', text: 'We make your name, phone, area and services consistent across your site, profiles and key sources.' },
      { title: 'Publish', text: 'We add structured data and write original, answer-focused content from your expertise, with your approval.' },
      { title: 'Track', text: 'Each month we repeat the same sample, compare competitors and show which sources the answers cite.' },
    ],
    wontDo: ['Guarantee placement in any AI answer', 'Publish mass-produced or AI-spun pages', 'Present a single AI answer as a stable ranking'],
    faq: [
      { q: 'Can you get us recommended by ChatGPT?', a: 'No one can guarantee that. AI answers vary by assistant, date, location and conversation. We improve the information assistants rely on and report what we observe under the same recorded conditions each month.' },
      { q: 'Is this different from SEO?', a: 'It builds on the same foundations (accurate information, helpful content, reputable mentions) but measures something different: how assistants describe and cite you.' },
      { q: 'Who writes the content?', a: 'We draft it from an interview with you, so it reflects real expertise. Nothing is published without your approval.' },
    ],
    related: ['local-seo', 'website-conversion'],
  },
  {
    slug: 'reviews-reputation',
    offerId: 'reputation-revenue-engine',
    category: 'reviews',
    navLabel: 'Reviews & Reputation',
    icon: 'star',
    seoTitle: 'Review & Reputation Management for Local Businesses | Honest, Compliant',
    description: 'Earn more honest reviews, respond to every one and collect testimonials with permission. No incentives, no review gating.',
    eyebrow: 'Get Chosen · Reputation',
    h1: 'Earn more honest reviews, and answer every one.',
    intro: 'When customers compare businesses, recent reviews and thoughtful responses do a lot of the convincing. We build a simple routine that asks every customer for an honest review, alerts you to new ones and drafts responses you approve with a tap.',
    signs: [
      'Competitors have more, or more recent, reviews than you',
      'Reviews sit unanswered for weeks',
      'Your team asks for reviews only occasionally',
      'Great customer feedback never makes it onto your website',
    ],
    process: [
      { title: 'Audit', text: 'We compare your review volume, rating, recency and response rate with nearby competitors.' },
      { title: 'Ask everyone', text: 'We set up a request after every completed job: same message, every customer, no filtering.' },
      { title: 'Respond', text: 'You get alerts and drafted responses to approve. Nothing posts without your OK.' },
      { title: 'Report', text: 'Monthly reporting on volume, recency, response time and themes from private feedback.' },
    ],
    wontDo: ['Offer incentives for reviews', 'Ask only happy customers (review gating)', 'Hide or suppress negative feedback', 'Use a testimonial without written permission'],
    faq: [
      { q: 'Can you remove bad reviews?', a: 'We can help you flag reviews that genuinely violate platform policies through the official process. We don’t offer review removal, and we help you respond professionally instead.' },
      { q: 'Why not just ask happy customers?', a: 'Selectively asking only satisfied customers is called review gating. It breaks platform rules and undermines trust. Asking everyone is both compliant and more credible.' },
      { q: 'Do you need my customer list?', a: 'We need a way to know when a job is complete, such as your CRM, booking tool or a simple sheet, plus confirmation that customers agreed to be contacted.' },
    ],
    related: ['lead-recovery', 'local-seo'],
  },
  {
    slug: 'lead-recovery',
    offerId: 'lead-rescue-booking-engine',
    category: 'followup',
    navLabel: 'Lead Recovery',
    icon: 'reply',
    seoTitle: 'Missed-Call Text Back, Lead Follow-Up & Booking Automation',
    description: 'Capture every inquiry, follow up on time with permission, recover missed calls where allowed and make booking easy. Usage costs billed transparently at cost.',
    eyebrow: 'Get Booked · Lead recovery',
    h1: 'Book more of the leads you already get.',
    intro: 'Leads rarely disappear because a business doesn’t care. They disappear because calls hit voicemail at a busy moment and quotes go cold. We connect your calls, forms and quotes to one pipeline, follow up on time with the consent the law requires, and make booking effortless.',
    signs: [
      'Calls regularly go to voicemail during jobs',
      'Quotes go out and nobody follows up',
      'Form inquiries wait until the end of the day',
      'You can’t say how many inquiries became booked jobs last month',
    ],
    process: [
      { title: 'Map', text: 'We map every way customers reach you and design a simple pipeline with you.' },
      { title: 'Consent first', text: 'We set up consent language, opt-out handling and any required carrier registration before anything sends.' },
      { title: 'Automate', text: 'Missed-call text-back where supported and permitted, quote follow-ups and a 24/7 booking path.' },
      { title: 'Measure', text: 'Track inquiries, response times and bookings, with messaging costs shown at cost.' },
    ],
    wontDo: ['Text or call anyone without appropriate consent', 'Use purchased contact lists', 'Pretend an automated message is a person', 'Hide usage-based messaging costs'],
    faq: [
      { q: 'What does missed-call text-back cost?', a: 'The monthly fee covers setup and management. Text messages, calling minutes and phone numbers are usage-based and billed at cost, and we estimate them in writing before go-live.' },
      { q: 'Is automated texting legal?', a: 'It can be, with the right consent and opt-out handling. Rules like the TCPA and carrier registration apply, so we build those controls in and won’t launch without them.' },
      { q: 'Will this work with my phone system?', a: 'Many systems can integrate. We confirm what your provider supports during the audit before recommending anything.' },
    ],
    related: ['reviews-reputation', 'website-conversion'],
  },
  {
    slug: 'website-conversion',
    offerId: 'website-to-customer-conversion',
    category: 'website',
    navLabel: 'Website Conversion',
    icon: 'browser',
    seoTitle: 'Conversion-Focused Websites for Local Service Businesses',
    description: 'Refresh five core pages so mobile visitors instantly understand what you do, trust you and can call, request a quote or book. Tracking included.',
    eyebrow: 'Get Chosen · Website',
    h1: 'A website that makes it easy to choose you.',
    intro: 'Most local customers visit your website on a phone, in a hurry. They need to see what you do, where you work and why to trust you, then reach you in one tap. We refresh your five core pages around exactly that and keep improving them with real data.',
    signs: [
      'Your phone number isn’t tappable, or isn’t visible on mobile',
      'Visitors can’t tell which areas you serve',
      'Your quote form asks for more than it needs',
      'The site is slow on phones',
    ],
    process: [
      { title: 'Audit', text: 'We review conversion and mobile performance and agree the five pages and content plan.' },
      { title: 'Build', text: 'We design and build on your platform or an approved one, with two revision rounds per page.' },
      { title: 'Track', text: 'We add local business structured data, analytics and conversion events, then test every form.' },
      { title: 'Improve', text: 'One data-informed improvement each month, reported plainly.' },
    ],
    wontDo: ['Fill pages with stock photos of people who aren’t your team', 'Publish testimonials you didn’t collect', 'Lock you out of your own website'],
    faq: [
      { q: 'Do you host the site?', a: 'Hosting, domain and platform fees stay in your name. You own everything we build.' },
      { q: 'What if I need more than five pages?', a: 'Additional pages are available as an add-on, each with unique, useful content.' },
      { q: 'Can you work on my existing site?', a: 'Often, yes. If your platform can do the job, we’ll improve it rather than start over.' },
    ],
    related: ['lead-recovery', 'ai-search-visibility'],
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
