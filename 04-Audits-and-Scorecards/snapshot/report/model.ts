/**
 * Snapshot report model: the single, pure source every export renders from
 * (printable HTML, PDF, CSV, JSON, CRM record, customer presentation).
 * Rules carried through every format: Not verified ≠ 0; projections are hypothetical;
 * fictional samples are labelled; no guarantees.
 */
import { offerById } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import type { OfferId } from '../../../03-Offers-and-Pricing/types.ts';
import { impactScenarios, scoreSnapshot, type CategoryScore, type Confidence, type CriterionResult, type SnapshotInput, type SnapshotResult } from '../engine.ts';
import { allCriteria, categories, EVIDENCE_LABEL, type CategoryId, type EvidenceType } from '../framework.ts';

export const REPORT_FORMAT_VERSION = '1.0.0';

export interface Competitor { name: string; reviews?: number; rating?: number; schema?: boolean; mobileCta?: boolean }
export interface Opportunity { category: CategoryId; action: string; effort: 'Low' | 'Medium' | 'High' | string }
export interface ScenarioInputs { monthlyInquiries: number; closeRate: number; averageJobValue: number }

/** Everything a researcher saves for one Snapshot (the sample JSON uses this shape). */
export interface SnapshotDocument {
  _notice?: string;
  input: SnapshotInput;
  competitors?: Competitor[];
  immediateOpportunities?: Opportunity[];
  /** Owner-supplied example inputs. Always presented as hypothetical. */
  scenarioInputs?: ScenarioInputs;
  preparedBy?: string;
  /** Optional lead/contact context (from the website request). Never invented. */
  lead?: { contactName?: string; email?: string; phone?: string; website?: string; source?: string; leadId?: string };
}

export interface CriterionRow {
  category: CategoryId;
  categoryName: string;
  criterionId: string;
  label: string;
  points: number;
  status: CriterionResult['status'] | 'not_checked';
  tier: number | null;
  earned: number | null;
  evidenceType: EvidenceType | null;
  evidenceLabel: string;
  sourceUrl: string;
  checkedAt: string;
  note: string;
  overridden: boolean;
  overrideReason: string;
  overrideBy: string;
}

export interface ReportModel {
  formatVersion: string;
  generatedAt: string;
  title: string;
  fictional: boolean;
  fictionalNotice: string | null;
  business: SnapshotInput['business'];
  reportDate: string;
  preparedBy: string;
  result: SnapshotResult;
  summary: string;
  strongest: { id: CategoryId; name: string } | null;
  priorities: Array<{ id: CategoryId; name: string }>;
  notVerifiedCount: number;
  rows: CriterionRow[];
  categoryCards: Array<CategoryScore & { question: string; limitations: string; offerName: string }>;
  recommendation: { offerId: OfferId | null; offerName: string | null; reason: string; setup: number | null; monthly: number | null; priceStatus: string | null };
  competitors: Competitor[];
  opportunities: Array<Opportunity & { categoryName: string }>;
  scenarios: ReturnType<typeof impactScenarios>;
  scenarioInputs: ScenarioInputs | null;
  lead: SnapshotDocument['lead'] | null;
  disclaimers: string[];
}

const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
const round1 = (n: number) => Math.round(n * 10) / 10;
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'snapshot';

export const confidenceLabel: Record<Confidence, string> = { high: 'High', medium: 'Medium', low: 'Low', insufficient: 'Insufficient evidence' };

export function buildReport(doc: SnapshotDocument, opts: { generatedAt?: string } = {}): ReportModel {
  const result = scoreSnapshot(doc.input);
  const byId = new Map(doc.input.results.map((r) => [r.criterionId, r]));
  const fictional = doc.input.business.fictional === true;

  const rows: CriterionRow[] = allCriteria.map((c) => {
    const r = byId.get(c.id);
    const tier = r?.override ? r.override.tier : r?.tier ?? null;
    const scored = !!r && r.status !== 'not_applicable' && r.status !== 'not_verified' || !!(r?.override && r.evidence);
    return {
      category: c.category,
      categoryName: catName(c.category),
      criterionId: c.id,
      label: c.label,
      points: c.points,
      status: r ? (r.override && r.evidence ? 'scored' : r.status) : 'not_checked',
      tier: scored ? tier : null,
      earned: scored && tier !== null ? round1(tier * c.points) : null,
      evidenceType: r?.evidence?.type ?? null,
      evidenceLabel: r?.evidence ? EVIDENCE_LABEL[r.evidence.type] : '',
      sourceUrl: r?.evidence?.sourceUrl ?? '',
      checkedAt: r?.evidence?.checkedAt ?? '',
      note: r?.evidence?.note ?? (r?.status === 'not_applicable' ? 'Not applicable to this business' : 'Not publicly observable or not checked; not counted'),
      overridden: !!r?.override,
      overrideReason: r?.override?.reason ?? '',
      overrideBy: r?.override?.by ?? '',
    };
  });

  const verifiedCats = result.categories.filter((c) => c.ratio !== null);
  const strongestCat = [...verifiedCats].sort((a, b) => (b.ratio! - a.ratio!))[0];
  const priorities = result.recommendation.priorities.map((id) => ({ id, name: catName(id) }));
  const notVerifiedCount = result.categories.reduce((s, c) => s + c.notVerified.length, 0);
  const offer = result.recommendation.offer ? offerById(result.recommendation.offer) : undefined;
  const o = result.overall;

  const summary = o.verifiedScore === null
    ? `We could verify only ${Math.round(o.coverage * 100)}% of the points for ${doc.input.business.name}, which isn't enough for a fair overall score. ${notVerifiedCount} items weren’t publicly observable and were not counted against the business. A short discovery call would let us verify the rest.`
    : `${doc.input.business.name} earned ${round1(o.earned)} of ${o.verifiedPoints} verifiable points, a verified score of ${o.verifiedScore}/100 (${Math.round(o.coverage * 100)}% of points verifiable, ${confidenceLabel[o.confidence].toLowerCase()} confidence).`
      + (strongestCat ? ` The strongest category is ${strongestCat.name}.` : '')
      + (priorities.length ? ` The largest verified opportunities are in ${priorities.map((p) => p.name).join(', ')}.` : ' No verified category fell below the opportunity threshold.')
      + (notVerifiedCount ? ` ${notVerifiedCount} item${notVerifiedCount === 1 ? '' : 's'} couldn’t be verified from public information and ${notVerifiedCount === 1 ? 'wasn’t' : 'weren’t'} counted.` : '');

  const scenarioInputs = doc.scenarioInputs ?? null;
  return {
    formatVersion: REPORT_FORMAT_VERSION,
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    title: `Local Revenue Opportunity Snapshot: ${doc.input.business.name}`,
    fictional,
    fictionalNotice: fictional ? `FICTIONAL SAMPLE: ${doc.input.business.name} is not a real business. All data is invented to demonstrate the report format.` : null,
    business: doc.input.business,
    reportDate: doc.input.reportDate,
    preparedBy: doc.preparedBy ?? 'Reale Revenue Systems',
    result,
    summary,
    strongest: strongestCat ? { id: strongestCat.id, name: strongestCat.name } : null,
    priorities,
    notVerifiedCount,
    rows,
    categoryCards: result.categories.map((c) => {
      const def = categories.find((x) => x.id === c.id)!;
      return { ...c, question: def.question, limitations: def.limitations, offerName: offerById(def.recommendedOffer)?.name ?? '' };
    }),
    recommendation: {
      offerId: result.recommendation.offer,
      offerName: offer?.name ?? null,
      reason: result.recommendation.reason,
      setup: offer?.price.setup ?? null,
      monthly: offer?.price.monthly ?? null,
      priceStatus: offer ? offer.price.status : null,
    },
    competitors: doc.competitors ?? [],
    opportunities: (doc.immediateOpportunities ?? []).map((x) => ({ ...x, categoryName: catName(x.category) })),
    scenarios: scenarioInputs ? impactScenarios(scenarioInputs) : [],
    scenarioInputs,
    lead: doc.lead ?? null,
    disclaimers: [
      'Scores reflect publicly observable information and anything the owner reported, checked on the dates shown.',
      'Items marked “Not verified” were not observable and are excluded from the score. They are not assumed to be problems.',
      'AI assistant and local search results vary by person, place and time. They are observations under recorded conditions, not rankings.',
      'Impact scenarios use hypothetical inputs and are not verified lost revenue or a forecast.',
      'Reale Revenue Systems does not guarantee rankings, AI placement, reviews, leads or revenue.',
    ],
  };
}

export const fileBase = (m: ReportModel) => `${slugify(m.business.name)}-snapshot-${m.reportDate}`;
