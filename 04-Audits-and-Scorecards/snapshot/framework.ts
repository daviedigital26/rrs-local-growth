/**
 * Local Revenue Opportunity Snapshot™ — transparent 100-point framework (v1.0).
 * 5 categories × 20 points. Criteria score at 0/25/50/75/100% tiers (DECISIONS D-012).
 * Missing evidence is "Not verified" and is excluded from the denominator. It is never a failing score.
 * This file is the single source for the engine, the website methodology page, the public
 * self-check and (Phase 3) the XLSX scorecard.
 */
import type { OfferId } from '../../03-Offers-and-Pricing/types.ts';

export const FRAMEWORK_VERSION = '1.0.0';

export type CategoryId = 'maps' | 'ai' | 'reviews' | 'website' | 'followup';
export type Tier = 0 | 0.25 | 0.5 | 0.75 | 1;
export const TIERS: readonly Tier[] = [0, 0.25, 0.5, 0.75, 1];

/** How a criterion was evidenced. Weight feeds the confidence calculation. */
export type EvidenceType = 'public_observation' | 'api_data' | 'sampled_test' | 'owner_reported' | 'authorized_test';
export const EVIDENCE_WEIGHT: Record<EvidenceType, number> = {
  public_observation: 1,
  api_data: 1,
  authorized_test: 1,
  sampled_test: 0.6, // AI answers and local results vary by time, place and person
  owner_reported: 0.6, // useful, but not independently verified
};
export const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  public_observation: 'Public observation',
  api_data: 'Documented API data',
  sampled_test: 'Sampled test (recorded conditions)',
  owner_reported: 'Owner-reported',
  authorized_test: 'Authorised test',
};

export interface OwnerQuestion {
  prompt: string;
  options: Array<{ label: string; tier: Tier | 'not_verified' }>;
}

export interface Criterion {
  id: string;
  label: string;
  points: number;
  /** Measurable criterion. */
  measure: string;
  /** What earns each tier. 1 and 0 are always defined. */
  tiers: Partial<Record<'1' | '0.75' | '0.5' | '0.25' | '0', string>> & { '1': string; '0': string };
  /** Source requirements. */
  sources: string[];
  /** Evidence that must be stored with the result. */
  evidence: string;
  allowedEvidence: EvidenceType[];
  /** What to do when evidence can't be obtained. */
  missingData: string;
  /** Results older than this are stale and lower confidence. */
  freshnessDays: number;
  limitations: string;
  /** Present only when the owner can self-report this criterion. */
  ownerQuestion?: OwnerQuestion;
}

export interface Category {
  id: CategoryId;
  name: string;
  outcome: 'Get Discovered' | 'Get Chosen' | 'Get Booked';
  question: string;
  recommendedOffer: OfferId;
  limitations: string;
  criteria: Criterion[];
}

const NV = 'If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0.';

export const categories: Category[] = [
  {
    id: 'maps',
    name: 'Google Maps presence',
    outcome: 'Get Discovered',
    question: 'Can nearby customers find an accurate, complete profile when they search on Google Maps?',
    recommendedOffer: 'local-visibility-jumpstart',
    limitations: 'Local results vary by searcher location, device and time. Sampled positions are observations, not rankings. Private profile data (e.g. Insights) is only available with the owner’s delegated access.',
    criteria: [
      { id: 'maps.profile', label: 'Profile found and matches the business', points: 4, measure: 'A Google Business Profile exists for the business name, phone and area.', tiers: { '1': 'Found; name, phone and area match', '0.5': 'Found, but details conflict or an apparent duplicate exists', '0': 'No profile found after a documented search using name, phone and address variants' }, sources: ['Google Maps public listing', 'Google Places API (approved key)'], evidence: 'Profile URL, search queries used, date checked', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 30, limitations: '"Not found" is an observation only after the documented search; it is never assumed.' },
      { id: 'maps.category', label: 'Primary category and services fit', points: 4, measure: 'Primary category matches the core service; services are listed.', tiers: { '1': 'Primary category correct and services listed', '0.5': 'Category acceptable but services missing, or category too broad', '0': 'Primary category clearly mismatched' }, sources: ['Google Maps public listing'], evidence: 'Screenshot or noted category + services, date', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 30, limitations: 'Secondary categories are not always publicly visible.' },
      { id: 'maps.completeness', label: 'Profile completeness', points: 4, measure: 'Count of: hours, website link, phone, address/service area, business description.', tiers: { '1': '5 of 5 present', '0.75': '4 of 5', '0.5': '3 of 5', '0.25': '2 of 5', '0': '0–1 of 5' }, sources: ['Google Maps public listing', 'Google Places API'], evidence: 'Checklist of the five fields with date', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 30, limitations: 'Descriptions are hidden in some views; check the full profile.' },
      { id: 'maps.activity', label: 'Recent photos or updates', points: 3, measure: 'Owner-added photos or updates visible within the last 90 days.', tiers: { '1': 'Within 30 days', '0.5': 'Within 90 days', '0': 'None visible in 90 days' }, sources: ['Google Maps public listing'], evidence: 'Date of most recent owner photo/update', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 30, limitations: 'Photo dates are approximate in the public interface.' },
      { id: 'maps.local_results', label: 'Visible in sampled local results', points: 5, measure: 'Position in local results for "<core service> <city>" in a sampled search with recorded conditions.', tiers: { '1': 'Top 3', '0.75': 'Positions 4–5', '0.5': 'Positions 6–10', '0.25': 'Positions 11–20', '0': 'Not in top 20' }, sources: ['Approved search API or manual sample with recorded location, device, date'], evidence: 'Query, location, device, date, observed position', allowedEvidence: ['sampled_test', 'api_data'], missingData: NV, freshnessDays: 30, limitations: 'One sample from one location. Positions change by searcher location and over time.' },
    ],
  },
  {
    id: 'ai',
    name: 'AI discovery readiness',
    outcome: 'Get Discovered',
    question: 'Is the information AI assistants rely on consistent, structured and worth citing?',
    recommendedOffer: 'ai-discovery-accelerator',
    limitations: 'AI assistant answers vary by assistant, version, date, location and conversation context. Results are observations under recorded conditions and never a stable ranking.',
    criteria: [
      { id: 'ai.entity', label: 'Business facts consistent across sources', points: 5, measure: 'Name, address/service area and phone match across website, Google profile and the top 3 directories for the industry.', tiers: { '1': 'All consistent', '0.5': 'One mismatch', '0': 'Two or more mismatches' }, sources: ['Business website', 'Google Business Profile', 'Top industry directories'], evidence: 'Table of values per source with URLs and date', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 60, limitations: 'Directory choice is industry-specific and recorded with the result.' },
      { id: 'ai.schema', label: 'Local business structured data', points: 4, measure: 'Valid LocalBusiness (or subtype) structured data with name, phone and area on the website.', tiers: { '1': 'Present and valid', '0.5': 'Present with errors or missing key fields', '0': 'Absent' }, sources: ['Website HTML', 'Schema validator'], evidence: 'Validator result/screenshot and date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Structured data supports understanding; it does not guarantee use by any AI system.' },
      { id: 'ai.answers', label: 'Answer-focused service content', points: 4, measure: 'Service pages directly answer common customer questions (what’s included, process, pricing factors, area served).', tiers: { '1': 'Most core services answered clearly', '0.5': 'Some services, thin answers', '0': 'No answer-focused content' }, sources: ['Business website'], evidence: 'URLs reviewed and notes, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Qualitative review against a written checklist.' },
      { id: 'ai.mentions', label: 'Reputable third-party mentions', points: 3, measure: 'Business appears on reputable third-party sources (associations, local media, quality directories).', tiers: { '1': '3+ reputable sources', '0.5': '1–2 sources', '0': 'None found after documented search' }, sources: ['Public web search via approved service', 'Industry association directories'], evidence: 'Source URLs and date', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 60, limitations: 'Coverage of search tools is incomplete; absence is "none found", not "none exist".' },
      { id: 'ai.assistant_sample', label: 'Mentioned in sampled AI answers', points: 4, measure: 'Across a recorded prompt set on named assistants, the business is mentioned and described accurately.', tiers: { '1': 'Mentioned accurately in at least half of prompts', '0.5': 'Mentioned in some prompts or with inaccuracies', '0': 'Not mentioned in any sampled prompt' }, sources: ['Named AI assistants, used within their terms'], evidence: 'Prompt text, assistant + version if shown, date, location context, raw answers saved', allowedEvidence: ['sampled_test'], missingData: NV, freshnessDays: 30, limitations: 'High variability. Repeat with identical conditions before comparing months.' },
    ],
  },
  {
    id: 'reviews',
    name: 'Reviews & trust',
    outcome: 'Get Chosen',
    question: 'When customers compare you, does your reputation make you the obvious choice?',
    recommendedOffer: 'reputation-revenue-engine',
    limitations: 'Only public review data is used. Competitor set (3–5 nearby, same category) is recorded with the result.',
    criteria: [
      { id: 'reviews.volume', label: 'Review volume vs. local competitors', points: 5, measure: 'Google review count compared with the median of 3–5 nearby competitors.', tiers: { '1': 'At or above median', '0.75': '75–99% of median', '0.5': '50–74%', '0.25': '25–49%', '0': 'Below 25%' }, sources: ['Google Maps public listings', 'Google Places API'], evidence: 'Counts for business and named competitors, date', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 30, limitations: 'Volume is relative to the recorded competitor set only.' },
      { id: 'reviews.rating', label: 'Average rating', points: 4, measure: 'Google average star rating.', tiers: { '1': '4.7 or higher', '0.75': '4.5–4.6', '0.5': '4.2–4.4', '0.25': '3.8–4.1', '0': 'Below 3.8' }, sources: ['Google Maps public listing'], evidence: 'Rating and count, date', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 30, limitations: 'Ratings with very few reviews are low-information; note count.' },
      { id: 'reviews.recency', label: 'Review recency', points: 4, measure: 'Age of the most recent Google review.', tiers: { '1': '14 days or less', '0.75': '15–30 days', '0.5': '31–60 days', '0.25': '61–90 days', '0': 'Over 90 days' }, sources: ['Google Maps public listing'], evidence: 'Date of latest review', allowedEvidence: ['public_observation', 'api_data'], missingData: NV, freshnessDays: 14, limitations: 'Public dates can be relative ("2 weeks ago").' },
      { id: 'reviews.responses', label: 'Owner responses', points: 4, measure: 'Share of the 10 most recent reviews with an owner response.', tiers: { '1': '80% or more', '0.5': '50–79%', '0.25': '1–49%', '0': 'None' }, sources: ['Google Maps public listing'], evidence: 'Count of responses in last 10, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 30, limitations: 'Fewer than 10 reviews: use all available and note it.' },
      { id: 'reviews.site_trust', label: 'Trust proof on website', points: 3, measure: 'Count of: licence/insurance info where applicable, real team or job photos, stated warranty/guarantee terms, link to public reviews.', tiers: { '1': '4 of 4', '0.75': '3 of 4', '0.5': '2 of 4', '0.25': '1 of 4', '0': 'None' }, sources: ['Business website'], evidence: 'URLs and checklist, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Photo authenticity is judged visually; stock photos do not count.' },
    ],
  },
  {
    id: 'website',
    name: 'Website conversion',
    outcome: 'Get Chosen',
    question: 'Does the website make it easy to understand, trust and contact you, especially on a phone?',
    recommendedOffer: 'website-to-customer-conversion',
    limitations: 'We observe the site as a visitor would and never submit fake inquiries. Speed uses lab data, which differs from real-user data.',
    criteria: [
      { id: 'website.mobile_cta', label: 'Call/CTA visible on mobile', points: 5, measure: 'On a ~390px-wide screen, tap-to-call or the primary CTA is visible without scrolling.', tiers: { '1': 'Visible and tappable', '0.5': 'Present but below the fold or not tappable', '0': 'No phone/CTA found on the homepage' }, sources: ['Business website at mobile viewport'], evidence: 'Mobile screenshot, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Homepage only unless noted.' },
      { id: 'website.clarity', label: 'Clear offer above the fold', points: 4, measure: 'First screen states the service, the area served and a reason to choose them.', tiers: { '1': 'All three', '0.5': 'Two of three', '0': 'One or none' }, sources: ['Business website'], evidence: 'Screenshot + checklist, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Judged against the written checklist.' },
      { id: 'website.speed', label: 'Mobile page speed', points: 4, measure: 'Google PageSpeed Insights mobile performance score for the homepage.', tiers: { '1': '90–100', '0.75': '75–89', '0.5': '50–74', '0.25': '25–49', '0': 'Below 25' }, sources: ['PageSpeed Insights API (free key)'], evidence: 'Score, report URL or JSON, date', allowedEvidence: ['api_data'], missingData: NV, freshnessDays: 30, limitations: 'Lab score; varies run to run (take the median of 3 runs).' },
      { id: 'website.form', label: 'Low-friction inquiry form', points: 4, measure: 'A quote/contact form exists, needs 5 or fewer required fields and is usable on mobile.', tiers: { '1': 'Exists, ≤5 required fields, mobile-friendly', '0.5': 'Exists but long or awkward on mobile', '0': 'No form found' }, sources: ['Business website'], evidence: 'Form URL, field count, date (not submitted)', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Forms are inspected, never submitted with fake data.' },
      { id: 'website.basics', label: 'Technical basics', points: 3, measure: 'Valid HTTPS, no security warnings, primary navigation links work.', tiers: { '1': 'All pass', '0.5': 'One issue', '0': 'Two or more issues' }, sources: ['Business website'], evidence: 'Checklist, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Spot check, not a full crawl.' },
    ],
  },
  {
    id: 'followup',
    name: 'Lead follow-up',
    outcome: 'Get Booked',
    question: 'When someone reaches out, how reliably do they hear back and get booked?',
    recommendedOffer: 'lead-rescue-booking-engine',
    limitations: 'Internal follow-up processes are usually not public. They are Not verified unless the owner reports them or authorises a test. We never send fake inquiries.',
    criteria: [
      { id: 'followup.paths', label: 'Ways to reach the business', points: 4, measure: 'Count of public inquiry paths: phone, form, text/SMS, online booking.', tiers: { '1': '4 paths', '0.75': '3 paths', '0.5': '2 paths', '0.25': '1 path', '0': 'None found' }, sources: ['Business website', 'Google Business Profile'], evidence: 'Checklist with URLs, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Counts visible paths only.' },
      { id: 'followup.after_hours', label: 'After-hours capture', points: 3, measure: 'A visible way to start an inquiry outside business hours (booking, form with response promise, chat).', tiers: { '1': 'Clear after-hours option with response expectation', '0.5': 'Form only, no expectation set', '0': 'None visible' }, sources: ['Business website'], evidence: 'Screenshot/notes, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Does not test whether anyone responds.' },
      { id: 'followup.booking', label: 'Online booking or quote request', points: 3, measure: 'Customers can book or request a quote online.', tiers: { '1': 'Self-serve booking or instant quote', '0.5': 'Quote request form only', '0': 'Neither' }, sources: ['Business website', 'Google Business Profile booking link'], evidence: 'URL, date', allowedEvidence: ['public_observation'], missingData: NV, freshnessDays: 60, limitations: 'Not submitted.' },
      {
        id: 'followup.speed', label: 'Speed to first response', points: 4, measure: 'Typical time to first response for a new inquiry.', tiers: { '1': 'Within 5 minutes', '0.75': 'Within an hour', '0.5': 'Same day', '0.25': 'Next day', '0': 'Longer or inconsistent' }, sources: ['Owner report', 'Authorised test agreed in writing'], evidence: 'Owner answer with date, or authorised test log', allowedEvidence: ['owner_reported', 'authorized_test'], missingData: 'Not publicly observable. Mark Not verified unless owner-reported or tested with written authorisation. Never assume a slow response.', freshnessDays: 90, limitations: 'Owner reports are not independently verified.',
        ownerQuestion: { prompt: 'How fast do you usually respond to a new inquiry?', options: [{ label: 'Within 5 minutes', tier: 1 }, { label: 'Within an hour', tier: 0.75 }, { label: 'Same day', tier: 0.5 }, { label: 'Next day', tier: 0.25 }, { label: 'Not sure / it varies', tier: 'not_verified' }] },
      },
      {
        id: 'followup.missed_calls', label: 'Missed-call recovery', points: 3, measure: 'What happens after a missed call.', tiers: { '1': 'Text or call back within 15 minutes', '0.5': 'Called back same day', '0.25': 'Voicemail only', '0': 'Nothing consistent' }, sources: ['Owner report', 'Authorised test'], evidence: 'Owner answer with date, or authorised test log', allowedEvidence: ['owner_reported', 'authorized_test'], missingData: 'Not publicly observable. Mark Not verified unless owner-reported or tested with written authorisation.', freshnessDays: 90, limitations: 'Owner reports are not independently verified.',
        ownerQuestion: { prompt: 'What happens when you miss a call?', options: [{ label: 'We text or call back within 15 min', tier: 1 }, { label: 'We call back the same day', tier: 0.5 }, { label: 'They can leave a voicemail', tier: 0.25 }, { label: 'Nothing consistent', tier: 0 }, { label: 'Not sure', tier: 'not_verified' }] },
      },
      {
        id: 'followup.quotes', label: 'Quote follow-up', points: 3, measure: 'Unaccepted quotes receive structured follow-up.', tiers: { '1': 'Set schedule, 2+ touches', '0.5': 'Usually one follow-up', '0': 'Only if the customer calls back' }, sources: ['Owner report'], evidence: 'Owner answer with date', allowedEvidence: ['owner_reported', 'authorized_test'], missingData: 'Not publicly observable. Mark Not verified unless owner-reported.', freshnessDays: 90, limitations: 'Owner reports are not independently verified.',
        ownerQuestion: { prompt: 'Do you follow up on quotes that haven’t been accepted?', options: [{ label: 'Yes, on a set schedule (2+ touches)', tier: 1 }, { label: 'Usually once', tier: 0.5 }, { label: 'Only if they call us', tier: 0 }, { label: 'Not sure', tier: 'not_verified' }] },
      },
    ],
  },
];

export const allCriteria = categories.flatMap((c) => c.criteria.map((cr) => ({ ...cr, category: c.id })));
export const criterionById = (id: string) => allCriteria.find((c) => c.id === id);

/** Thresholds (configurable). */
export const THRESHOLDS = {
  /** Below this coverage a category shows "Not verified" instead of a number. */
  categoryMinCoverage: 0.25,
  /** Below this overall coverage no overall score is shown. */
  overallMinCoverage: 0.5,
  /** A verified category scoring below this share is an opportunity. */
  weakCategory: 0.6,
  /** Number of weak categories that triggers the flagship recommendation. */
  flagshipWeakCount: 3,
};
