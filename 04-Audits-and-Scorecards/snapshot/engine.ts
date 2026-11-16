/**
 * Snapshot scoring engine. Pure functions, no I/O.
 * Rules: missing evidence → Not verified (excluded from denominator). Overrides keep the
 * original value and need a reason, reviewer and date. Overriding a Not verified item needs evidence.
 */
import type { OfferId } from '../../03-Offers-and-Pricing/types.ts';
import {
  categories, criterionById, EVIDENCE_WEIGHT, FRAMEWORK_VERSION, THRESHOLDS, TIERS,
  type CategoryId, type EvidenceType, type Tier,
} from './framework.ts';

export interface Evidence {
  type: EvidenceType;
  note: string;
  sourceUrl?: string;
  checkedAt: string; // YYYY-MM-DD
}

export interface Override {
  tier: Tier;
  reason: string;
  by: string;
  at: string; // YYYY-MM-DD
}

export interface CriterionResult {
  criterionId: string;
  status: 'scored' | 'not_verified' | 'not_applicable';
  tier?: Tier;
  evidence?: Evidence;
  override?: Override;
}

export interface SnapshotInput {
  business: { name: string; industry: string; area: string; fictional: boolean };
  reportDate: string; // YYYY-MM-DD
  results: CriterionResult[];
}

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface CategoryScore {
  id: CategoryId;
  name: string;
  /** Unrounded; format for display. */
  earned: number;
  verifiedPoints: number;
  applicablePoints: number;
  coverage: number;
  /** earned / verified, 0–1; null when coverage is below threshold. */
  ratio: number | null;
  /** Score out of 20 shown to customers; null → "Not verified". */
  display: number | null;
  confidence: Confidence;
  notVerified: string[];
  stale: string[];
}

export interface SnapshotResult {
  frameworkVersion: string;
  reportDate: string;
  business: SnapshotInput['business'];
  categories: CategoryScore[];
  overall: {
    earned: number;
    verifiedPoints: number;
    applicablePoints: number;
    coverage: number;
    /** Verified score out of 100 (earned/verified × 100); null when coverage is too low. */
    verifiedScore: number | null;
    confidence: Confidence;
  };
  recommendation: { offer: OfferId | null; reason: string; priorities: CategoryId[] };
  overrides: Array<{ criterionId: string; from: Tier | null; to: Tier; reason: string; by: string; at: string }>;
  warnings: string[];
}

export class SnapshotValidationError extends Error {}

const round1 = (n: number) => Math.round(n * 10) / 10;
const daysBetween = (a: string, b: string) => Math.abs((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function validate(input: SnapshotInput): void {
  const seen = new Set<string>();
  for (const r of input.results) {
    const c = criterionById(r.criterionId);
    if (!c) throw new SnapshotValidationError(`Unknown criterion ${r.criterionId}`);
    if (seen.has(r.criterionId)) throw new SnapshotValidationError(`Duplicate result for ${r.criterionId}`);
    seen.add(r.criterionId);
    if (r.status === 'scored') {
      if (r.tier === undefined || !TIERS.includes(r.tier)) throw new SnapshotValidationError(`${r.criterionId}: scored result needs a valid tier`);
      if (!r.evidence) throw new SnapshotValidationError(`${r.criterionId}: scored result needs evidence`);
    }
    if (r.evidence) {
      if (!c.allowedEvidence.includes(r.evidence.type)) throw new SnapshotValidationError(`${r.criterionId}: evidence type ${r.evidence.type} not allowed`);
      if (Number.isNaN(Date.parse(r.evidence.checkedAt))) throw new SnapshotValidationError(`${r.criterionId}: evidence needs a checkedAt date`);
    }
    if (r.override) {
      const o = r.override;
      if (!TIERS.includes(o.tier)) throw new SnapshotValidationError(`${r.criterionId}: override tier invalid`);
      if (!o.reason?.trim() || !o.by?.trim() || Number.isNaN(Date.parse(o.at))) throw new SnapshotValidationError(`${r.criterionId}: override needs reason, reviewer and date`);
      if (!r.evidence) throw new SnapshotValidationError(`${r.criterionId}: overriding requires attached evidence`);
    }
  }
}

function confidenceFrom(coverage: number, evidenceQuality: number, minCoverage: number): Confidence {
  if (coverage < minCoverage) return 'insufficient';
  const s = coverage * evidenceQuality;
  return s >= 0.7 ? 'high' : s >= 0.45 ? 'medium' : 'low';
}

export function scoreSnapshot(input: SnapshotInput): SnapshotResult {
  validate(input);
  const byId = new Map(input.results.map((r) => [r.criterionId, r]));
  const warnings: string[] = [];
  const overrides: SnapshotResult['overrides'] = [];
  let qualityNum = 0;
  let qualityDen = 0;

  const cats: CategoryScore[] = categories.map((cat) => {
    let earned = 0, verified = 0, applicable = 0, catQualNum = 0;
    const notVerified: string[] = [];
    const stale: string[] = [];
    for (const cr of cat.criteria) {
      const r = byId.get(cr.id);
      if (!r) {
        applicable += cr.points;
        notVerified.push(cr.label);
        warnings.push(`${cr.id} not checked; treated as Not verified`);
        continue;
      }
      if (r.status === 'not_applicable') continue;
      applicable += cr.points;
      const effectiveTier: Tier | undefined = r.override ? r.override.tier : r.tier;
      const isScored = r.status === 'scored' || (r.override && r.evidence);
      if (!isScored || effectiveTier === undefined || !r.evidence) {
        notVerified.push(cr.label);
        continue;
      }
      if (r.override) overrides.push({ criterionId: cr.id, from: r.tier ?? null, to: r.override.tier, reason: r.override.reason, by: r.override.by, at: r.override.at });
      verified += cr.points;
      earned += cr.points * effectiveTier;
      const isStale = daysBetween(r.evidence.checkedAt, input.reportDate) > cr.freshnessDays;
      if (isStale) stale.push(cr.label);
      const q = EVIDENCE_WEIGHT[r.evidence.type] * (isStale ? 0.5 : 1);
      catQualNum += q * cr.points;
    }
    const coverage = applicable ? verified / applicable : 0;
    const quality = verified ? catQualNum / verified : 0;
    qualityNum += catQualNum;
    qualityDen += verified;
    const shown = coverage >= THRESHOLDS.categoryMinCoverage && verified > 0;
    const ratio = shown ? earned / verified : null;
    return {
      id: cat.id, name: cat.name, earned, verifiedPoints: verified, applicablePoints: applicable,
      coverage, ratio, display: ratio === null ? null : round1(ratio * 20),
      confidence: confidenceFrom(coverage, quality, THRESHOLDS.categoryMinCoverage), notVerified, stale,
    };
  });

  const earned = cats.reduce((s, c) => s + c.earned, 0);
  const verifiedPoints = cats.reduce((s, c) => s + c.verifiedPoints, 0);
  const applicablePoints = cats.reduce((s, c) => s + c.applicablePoints, 0);
  const coverage = applicablePoints ? verifiedPoints / applicablePoints : 0;
  const overallQuality = qualityDen ? qualityNum / qualityDen : 0;
  const verifiedScore = coverage >= THRESHOLDS.overallMinCoverage && verifiedPoints > 0 ? Math.round((earned / verifiedPoints) * 100) : null;
  if (verifiedScore === null) warnings.push('Not enough verified evidence for an overall score.');

  return {
    frameworkVersion: FRAMEWORK_VERSION,
    reportDate: input.reportDate,
    business: input.business,
    categories: cats,
    overall: { earned: round1(earned), verifiedPoints, applicablePoints, coverage, verifiedScore, confidence: confidenceFrom(coverage, overallQuality, THRESHOLDS.overallMinCoverage) },
    recommendation: recommend(cats),
    overrides,
    warnings,
  };
}

/** Maps weakest verified categories to the offer catalog (PRICING-FRAMEWORK §3). */
export function recommend(cats: CategoryScore[]): SnapshotResult['recommendation'] {
  const weak = cats
    .filter((c) => c.ratio !== null && c.ratio < THRESHOLDS.weakCategory)
    .sort((a, b) => (a.ratio! - b.ratio!) || (b.verifiedPoints - b.earned) - (a.verifiedPoints - a.earned));
  const priorities = weak.map((c) => c.id);
  const verifiedCats = cats.filter((c) => c.ratio !== null);
  if (verifiedCats.length === 0) return { offer: null, reason: 'Not enough verified evidence. Start with a short discovery call to verify the basics.', priorities };
  if (weak.length >= THRESHOLDS.flagshipWeakCount) return { offer: 'local-revenue-dominator', reason: `${weak.length} categories show verified opportunities; one coordinated program avoids stacking smaller plans.`, priorities };
  if (weak.length === 0) return { offer: null, reason: 'No verified category is below the opportunity threshold. Consider monitoring (Competitor Intelligence Pulse) or verifying the items marked Not verified.', priorities };
  const first = weak[0]!;
  const cat = categories.find((c) => c.id === first.id)!;
  return { offer: cat.recommendedOffer, reason: `${cat.name} has the largest verified opportunity.`, priorities };
}

/**
 * HYPOTHETICAL impact scenarios. Inputs are assumptions supplied by the user or the owner.
 * Output is never "lost revenue"; it illustrates what a given improvement would mean.
 */
export function impactScenarios(input: { monthlyInquiries: number; closeRate: number; averageJobValue: number }, uplifts = [0.05, 0.1, 0.2]) {
  const baselineJobs = input.monthlyInquiries * input.closeRate;
  return uplifts.map((u) => {
    const extraJobs = baselineJobs * u;
    return {
      label: `If booked jobs rose ${Math.round(u * 100)}%`,
      assumption: `${input.monthlyInquiries} inquiries/mo × ${Math.round(input.closeRate * 100)}% close × $${input.averageJobValue} average job (hypothetical inputs)`,
      extraJobsPerMonth: Math.round(extraJobs * 10) / 10,
      extraRevenuePerMonth: Math.round(extraJobs * input.averageJobValue),
    };
  });
}

/** Score the public self-check (owner-reported follow-up answers). */
export function scoreOwnerAnswers(answers: Record<string, Tier | 'not_verified'>, date: string): CriterionResult[] {
  return Object.entries(answers).map(([criterionId, a]) =>
    a === 'not_verified'
      ? { criterionId, status: 'not_verified' as const }
      : { criterionId, status: 'scored' as const, tier: a, evidence: { type: 'owner_reported' as const, note: 'Self-reported on website', checkedAt: date } },
  );
}
