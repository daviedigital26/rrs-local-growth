/** Pure data exports: JSON, CSV (criteria + summary), CRM record. */
import { scoreProspect } from '../../../05-Lead-Research/Scoring/icp-engine.ts';
import type { PriorityBand } from '../../../05-Lead-Research/Scoring/icp-config.ts';
import { fromSnapshotModel } from '../../../05-Lead-Research/Scoring/prospect.ts';
import { confidenceLabel, type ReportModel } from './model.ts';

// ── CSV ──────────────────────────────────────────────────────────────────
/**
 * RFC 4180 cell with spreadsheet formula-injection protection: values that a
 * spreadsheet would evaluate (= + - @, tab, CR) are prefixed with an apostrophe.
 * Negative numbers are emitted as numbers, not strings, so they are unaffected.
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(',');

export function criteriaCsv(m: ReportModel): string {
  const header = ['business', 'fictional', 'report_date', 'category', 'criterion_id', 'criterion', 'points_possible', 'status', 'tier_pct', 'points_earned', 'evidence_type', 'source_url', 'checked_at', 'evidence_note', 'overridden', 'override_reason', 'override_by'];
  const lines = m.rows.map((r) => csvRow([
    m.business.name, m.fictional, m.reportDate, r.categoryName, r.criterionId, r.label, r.points,
    r.status === 'scored' ? 'Scored' : r.status === 'not_applicable' ? 'Not applicable' : 'Not verified',
    r.tier === null ? null : Math.round(r.tier * 100), r.earned, r.evidenceLabel, r.sourceUrl, r.checkedAt, r.note, r.overridden, r.overrideReason, r.overrideBy,
  ]));
  return [csvRow(header), ...lines].join('\r\n') + '\r\n';
}

export function summaryCsv(m: ReportModel): string {
  const o = m.result.overall;
  const header = ['business', 'fictional', 'report_date', 'scope', 'score_out_of', 'score', 'points_earned', 'points_verified', 'points_applicable', 'coverage_pct', 'confidence', 'not_verified_items'];
  const rows = [
    csvRow([m.business.name, m.fictional, m.reportDate, 'Overall (verified)', 100, o.verifiedScore, Math.round(o.earned * 10) / 10, o.verifiedPoints, o.applicablePoints, Math.round(o.coverage * 100), confidenceLabel[o.confidence], m.notVerifiedCount]),
    ...m.result.categories.map((c) => csvRow([m.business.name, m.fictional, m.reportDate, c.name, 20, c.display, Math.round(c.earned * 10) / 10, c.verifiedPoints, c.applicablePoints, Math.round(c.coverage * 100), confidenceLabel[c.confidence], c.notVerified.length])),
  ];
  return [csvRow(header), ...rows].join('\r\n') + '\r\n';
}

// ── JSON ─────────────────────────────────────────────────────────────────
export function reportJson(m: ReportModel): string {
  return JSON.stringify({
    format: 'rrs.snapshot.report',
    formatVersion: m.formatVersion,
    frameworkVersion: m.result.frameworkVersion,
    generatedAt: m.generatedAt,
    fictional: m.fictional,
    notice: m.fictionalNotice,
    business: m.business,
    reportDate: m.reportDate,
    preparedBy: m.preparedBy,
    summary: m.summary,
    overall: m.result.overall,
    categories: m.result.categories,
    criteria: m.rows,
    recommendation: m.recommendation,
    priorities: m.priorities,
    competitors: m.competitors,
    opportunities: m.opportunities,
    impactScenarios: { hypothetical: true, inputs: m.scenarioInputs, scenarios: m.scenarios },
    overrides: m.result.overrides,
    warnings: m.result.warnings,
    disclaimers: m.disclaimers,
  }, null, 2) + '\n';
}

// ── CRM record ───────────────────────────────────────────────────────────
/**
 * CRM-ready lead/audit record (spec Part 6 "Required Lead Record", Snapshot subset).
 * Scores are kept SEPARATE (spec: never collapse fit, opportunity, confidence and
 * priority into one opaque number). ICP fit and outreach priority come from the ICP
 * engine using only what the Snapshot records; with too little evidence ICP fit is
 * null ("Not enough evidence") and priority is "research first", never guessed.
 */
export interface CrmRecord {
  schema: 'rrs.crm.snapshot-record/1';
  record_type: 'snapshot_audit';
  fictional: boolean;
  company_name: string;
  business_category: string;
  service_area: string;
  website: string | null;
  public_business_phone: string | null;
  contact: { name: string | null; email: string | null; phone: string | null };
  dedupe_key: string;
  scores: {
    snapshot_verified_score: number | null;
    snapshot_coverage_pct: number;
    research_confidence: string;
    icp_fit: { score: number | null; label: string; coverage_pct: number; config_version: string };
    outreach_priority: { band: PriorityBand; label: string; points: number; next_action: string };
    categories: Record<string, { score_out_of_20: number | null; confidence: string; not_verified: number }>;
  };
  opportunity_categories: string[];
  proposed_service: string | null;
  proposed_service_id: string | null;
  estimated_deal_value: { setup: number; monthly: number; price_status: string } | null;
  evidence: { sources: number; not_verified_items: number; last_verified: string; overrides: number };
  research_notes: string;
  lead_source: string | null;
  outreach_status: 'not_contacted';
  next_action: string;
  report_date: string;
  framework_version: string;
}

const normDomain = (url?: string | null) => {
  if (!url) return '';
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};
const normName = (s: string) => s.toLowerCase().replace(/\(fictional\)/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\b(llc|inc|co|company|corp|ltd)\b/g, '').replace(/\s+/g, ' ').trim();

export function crmRecord(m: ReportModel): CrmRecord {
  const o = m.result.overall;
  const sources = m.rows.filter((r) => r.evidenceType !== null).length;
  const lastVerified = m.rows.map((r) => r.checkedAt).filter(Boolean).sort().at(-1) ?? m.reportDate;
  const domain = normDomain(m.lead?.website);
  const icp = scoreProspect(fromSnapshotModel(m), { asOf: m.reportDate });
  return {
    schema: 'rrs.crm.snapshot-record/1',
    record_type: 'snapshot_audit',
    fictional: m.fictional,
    company_name: m.business.name,
    business_category: m.business.industry,
    service_area: m.business.area,
    website: m.lead?.website ?? null,
    public_business_phone: null, // only filled from verified research, never guessed
    contact: { name: m.lead?.contactName ?? null, email: m.lead?.email ?? null, phone: m.lead?.phone ?? null },
    dedupe_key: domain ? `domain:${domain}` : `name:${normName(m.business.name)}|area:${normName(m.business.area)}`,
    scores: {
      snapshot_verified_score: o.verifiedScore,
      snapshot_coverage_pct: Math.round(o.coverage * 100),
      research_confidence: o.confidence,
      icp_fit: { score: icp.fit.score, label: icp.fit.label, coverage_pct: Math.round(icp.fit.coverage * 100), config_version: icp.config_version },
      outreach_priority: { band: icp.priority.band, label: icp.priority.label, points: icp.priority.points, next_action: icp.priority.next_action },
      categories: Object.fromEntries(m.result.categories.map((c) => [c.id, { score_out_of_20: c.display, confidence: c.confidence, not_verified: c.notVerified.length }])),
    },
    opportunity_categories: m.priorities.map((p) => p.id),
    proposed_service: m.recommendation.offerName,
    proposed_service_id: m.recommendation.offerId,
    estimated_deal_value: m.recommendation.setup !== null && m.recommendation.monthly !== null ? { setup: m.recommendation.setup, monthly: m.recommendation.monthly, price_status: m.recommendation.priceStatus ?? 'proposed' } : null,
    evidence: { sources, not_verified_items: m.notVerifiedCount, last_verified: lastVerified, overrides: m.result.overrides.length },
    research_notes: m.summary,
    lead_source: m.lead?.source ?? null,
    outreach_status: 'not_contacted',
    next_action: 'Manual review of Snapshot before any delivery or outreach',
    report_date: m.reportDate,
    framework_version: m.result.frameworkVersion,
  };
}
