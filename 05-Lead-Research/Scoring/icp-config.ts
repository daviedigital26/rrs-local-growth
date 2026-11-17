/**
 * ICP scoring configuration — the single source of every weight, band and threshold.
 *
 * Spec Part 6 "Lead Qualification": a configurable weighted 100-point score, with ICP fit,
 * opportunity, research confidence and outreach priority kept SEPARATE.
 *
 * Provenance of the defaults:
 *  - Component weights: the spec's suggested initial weights (25/25/20/15/10/5).
 *  - Property-management bands (review-volume size proxy, rating band, 8-points-per-signal
 *    pain scale capped at 26, franchise deprioritisation): the owner's existing PM Lead Scorer
 *    (2026), converted to ratios so its calibration carries over.
 *  - Units band 30–250: the owner's stated PM target.
 *  - Geography: spec 1.3 primary markets; west-coast states are the owner's stated expansion order.
 * Everything else is a starting assumption marked `calibrated: false`; tune it with real call outcomes.
 */
import type { INDUSTRY_VALUES } from '../intake/lead-intake.ts';

export type Industry = (typeof INDUSTRY_VALUES)[number];
export type ComponentId = 'commercial_fit' | 'opportunity' | 'benefit' | 'reachability' | 'priority_match' | 'confidence';
export type Ownership = 'independent' | 'multi_location' | 'national_franchise' | 'corporate';
export type EvidenceKind = 'snapshot' | 'public_observation' | 'listing_data' | 'review_sample' | 'owner_reported' | 'tracker_flag';
export type PriorityBand = 'p1' | 'p2' | 'p3' | 'research_first' | 'inbound' | 'in_progress' | 'closed' | 'do_not_contact' | 'disqualified';

/** A size band: inclusive [min, max]; `max: null` = no upper bound. */
export interface Band { min: number; max: number | null; credit: number; label: string }

export interface PainTheme {
  id: string;
  label: string;
  /** How directly Reale Revenue Systems' services address this problem (0–1). */
  relevance: number;
  /** Lower-case regex sources. `neg: true` = ignore when "no/not/never/without" precedes it. */
  patterns: Array<{ re: string; neg?: boolean }>;
}

export interface IndustryProfile {
  id: string;
  calibrated: boolean;
  note: string;
  /** Review-count bands used as a size proxy when no verified size is on file. */
  reviewBands: Band[];
  /** Verified size bands (e.g. units managed). Preferred over the review proxy. */
  sizeBands?: { field: 'units_managed'; label: string; bands: Band[] };
  ratingBands: Band[];
  pain: { pointsPerSignal: number; cap: number; themes: PainTheme[] };
}

const reviewBandsLegacy: Band[] = [
  { min: 50, max: 600, credit: 1, label: 'established but not oversized (50–600 reviews)' },
  { min: 601, max: 1200, credit: 0.65, label: 'large (601–1,200 reviews)' },
  { min: 1201, max: null, credit: 0.25, label: 'very large, likely corporate systems (1,200+ reviews)' },
  { min: 0, max: 49, credit: 0.5, label: 'small or new (under 50 reviews)' },
];

/** Bands are tried in order; the first whose [min, max] contains the value wins. */
const ratingBandsLegacy: Band[] = [
  { min: 3.8, max: 4.6, credit: 1, label: 'solid with room to improve (3.8–4.6)' },
  { min: 4.6, max: null, credit: 0.6, label: 'near-perfect, less visible pain (above 4.6)' },
  { min: 0, max: null, credit: 0.5, label: 'struggling reputation (below 3.8)' },
];

/**
 * Complaint themes. Grouping keywords into themes stops one complaint counting twice
 * ("cancel" + "canceled"), and negation handling stops praise ("no voicemail runaround")
 * counting as pain. Relevance down-weights problems Reale Revenue Systems does not fix.
 */
export const PAIN_THEMES: PainTheme[] = [
  {
    id: 'unanswered', label: 'calls or messages go unanswered', relevance: 1, patterns: [
      { re: '\\bnever (?:respond|responded|responds|return(?:ed|s)?|call(?:ed|s)? back|got back|initiated|reached out|followed up|heard back)' },
      { re: '\\b(?:not|never) (?:received|gotten|got|had) (?:an? |any )?(?:answer|response|reply|call ?back)\\b' },
      { re: '\\bunresponsive\\b' },
      { re: '\\bno (?:response|reply|answer|call ?backs?|return calls?)\\b' },
      { re: "\\b(?:did|does|do|would|will) ?(?:n[o']?t) (?:respond|reply|answer|return|call back)" },
      { re: '\\bnot (?:respond(?:ing)?|returned|returning|answered|answering)\\b' },
      { re: '\\brarely (?:returned?|respond(?:ed|s)?|answer(?:ed|s)?)\\b' },
      { re: '\\bvoicemail\\b', neg: true },
      { re: '\\bradio silence\\b' },
      { re: '\\bignored?\\b', neg: true },
      { re: '\\black of communication\\b' },
      { re: '\\bno (?:good )?communication\\b' },
      { re: '\\bcalling after \\S+ gets you nowhere\\b' },
    ],
  },
  {
    id: 'slow', label: 'slow responses or long delays', relevance: 1, patterns: [
      { re: '\\bslow\\b', neg: true },
      { re: '\\btook \\d+ (?:business )?days?\\b' },
      { re: '\\bdelay(?:s|ed)?\\b', neg: true },
      { re: '\\bfor weeks\\b|\\bweeks later\\b|\\bmonths? later\\b' },
      { re: '\\bunresolved\\b' },
      { re: '\\bdid nothing\\b' },
      { re: '\\bstill (?:have )?not\\b' },
      { re: '\\bran over \\d+' },
    ],
  },
  {
    id: 'process', label: 'broken tools or a confusing process', relevance: 0.75, patterns: [
      { re: '\\berror(?:ed|ing|s)?(?: out)?\\b', neg: true },
      { re: '\\bstopped working\\b' },
      { re: "\\b(?:did|does) ?n[o']?t work\\b" },
      { re: '\\bconfus(?:ing|ed|ion)\\b', neg: true },
      { re: '\\bcancel(?:l?ed|ling|lation)?\\b', neg: true },
      { re: '\\bforgot\\b' },
    ],
  },
  {
    id: 'repairs', label: 'repairs or maintenance left undone', relevance: 0.5, patterns: [
      { re: '\\bbroken\\b', neg: true },
      { re: '\\b(?:leak|oven|ac|a/c|hvac|toilet|stove)\\b[^.]{0,40}\\b(?:days|weeks|waiting|no response)\\b' },
    ],
  },
  {
    id: 'service', label: 'poor service experience', relevance: 0.5, patterns: [
      { re: '\\brude\\b', neg: true },
      { re: '\\bno help\\b' },
      { re: '\\bfrustrat(?:ing|ed|ion)\\b', neg: true },
      { re: '\\b(?:got|with) an attitude\\b' },
      { re: '\\bdisappoint(?:ing|ed)\\b', neg: true },
    ],
  },
  {
    id: 'billing', label: 'fee or deposit disputes', relevance: 0.25, patterns: [
      { re: '\\bfabricated\\b' },
      { re: '\\bnickel and dime\\b' },
      { re: '\\bwithheld\\b' },
      { re: '\\bextra fees\\b' },
    ],
  },
];

/**
 * Sentences about a different company are ignored: a previous manager ("…until new management
 * showed up") or competitors used as a comparison ("most agencies would not get back to me").
 */
export const HISTORICAL_PATTERNS = [
  '\\b(?:until|before|prior to)\\b[^.]*\\b(?:new management|took over|taking over)\\b',
  '\\b(?:previous|prior|old|last|former) (?:management|company|manager|property manager|pm)\\b',
  '\\b(?:most|other|many) (?:agencies|companies|property managers|management companies|managers|landlords|pm companies)\\b',
];

const pmProfile: IndustryProfile = {
  id: 'property-management',
  calibrated: true,
  note: 'Calibrated from the owner’s PM Lead Scorer. Units managed, when verified, replaces the review-count proxy.',
  reviewBands: reviewBandsLegacy,
  sizeBands: {
    field: 'units_managed', label: 'units managed', bands: [
      { min: 30, max: 250, credit: 1, label: 'in the 30–250 unit target' },
      { min: 251, max: 600, credit: 0.65, label: 'above target (251–600 units)' },
      { min: 601, max: null, credit: 0.25, label: 'well above target (600+ units)' },
      { min: 0, max: 29, credit: 0.5, label: 'below target (under 30 units)' },
    ],
  },
  ratingBands: ratingBandsLegacy,
  pain: { pointsPerSignal: 8, cap: 26, themes: PAIN_THEMES },
};

/** Other industries reuse the PM bands until real outcomes justify their own. */
const genericProfile: IndustryProfile = {
  ...pmProfile,
  id: 'generic',
  calibrated: false,
  note: 'Uncalibrated: borrows the property-management bands as a starting point.',
  sizeBands: undefined,
};

export const ICP_CONFIG = {
  version: 'icp-2026.11-1',
  /** Spec suggested initial weights. Must total 100. */
  weights: { commercial_fit: 25, opportunity: 25, benefit: 20, reachability: 15, priority_match: 10, confidence: 5 } satisfies Record<ComponentId, number>,
  componentLabels: {
    commercial_fit: 'Commercial fit',
    opportunity: 'Verified opportunity',
    benefit: 'Likely to benefit',
    reachability: 'Reachability',
    priority_match: 'Industry & area priority',
    confidence: 'Data completeness & confidence',
  } satisfies Record<ComponentId, string>,
  /** Which components make up the separate ICP fit score. */
  fitComponents: ['commercial_fit', 'benefit', 'priority_match'] as ComponentId[],
  /** ICP fit shows "Not enough evidence" below this share of fit weight verified. */
  fitMinCoverage: 0.5,
  /** Research confidence: same labels and cut-offs as the Snapshot engine. */
  confidence: { minCoverage: 0.5, high: 0.7, medium: 0.45 },
  evidenceStrength: { snapshot: 1, public_observation: 1, listing_data: 1, review_sample: 0.5, owner_reported: 0.6, tracker_flag: 0.6 } satisfies Record<EvidenceKind, number>,
  /** Freshness multiplier by age of the evidence. Undated evidence counts as stale. */
  freshness: { freshDays: 90, agingDays: 180, aging: 0.8, stale: 0.6, undated: 0.6 },
  /**
   * Priority bands from the 100-point priority score (ignored when a gate applies).
   * P1 also needs a verified opportunity of at least `p1MinOpportunity`: size and rating
   * alone never put a business at the top of the call list (spec: verified problems first).
   */
  bands: { p1: 60, p2: 50, p1MinOpportunity: 30 },
  /** National franchises are deprioritised, not hidden: they top out at P2. */
  franchiseMaxBand: 'p2' as PriorityBand,
  ownershipCredit: { independent: 1, multi_location: 0.8, national_franchise: 0.2, corporate: 0 } satisfies Record<Ownership, number>,
  reachability: { phone: 0.4, email: 0.2, website: 0.2, decision_maker: 0.2 },
  industries: {
    primary: ['home-services', 'auto-detailing', 'property-management', 'recurring-services', 'remodeling', 'professional-services'] as Industry[],
    secondary: ['realtor'] as Industry[],
    credit: { primary: 1, secondary: 0.5, other: 0.25 },
  },
  geography: {
    /** Spec 1.3 primary markets plus the surrounding Phoenix metro. */
    primaryCities: ['phoenix', 'surprise', 'peoria', 'glendale', 'scottsdale', 'mesa', 'tempe', 'chandler', 'gilbert', 'goodyear', 'avondale', 'buckeye', 'el mirage', 'sun city', 'sun city west', 'litchfield park', 'tolleson', 'paradise valley', 'fountain hills', 'cave creek', 'queen creek', 'san tan valley', 'apache junction', 'laveen', 'anthem', 'waddell', 'youngtown'],
    homeState: 'AZ',
    expansionStates: ['CA', 'OR', 'WA'],
    credit: { primary: 1, homeState: 0.7, expansion: 0.5, other: 0.25 },
  },
  profiles: { 'property-management': pmProfile } as Partial<Record<Industry, IndustryProfile>>,
  genericProfile,
};

export type IcpConfig = typeof ICP_CONFIG;

export const profileFor = (industry: Industry | null, cfg: IcpConfig = ICP_CONFIG): IndustryProfile =>
  (industry && cfg.profiles[industry]) || cfg.genericProfile;
