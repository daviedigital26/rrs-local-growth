/**
 * Call-list exports: a phone-friendly CSV (opens in Google Sheets / Excel, formula-injection
 * safe) and a full JSON with every component and reason.
 */
import { csvRow } from '../../04-Audits-and-Scorecards/snapshot/report/formats.ts';
import type { IcpResult } from './icp-engine.ts';
import type { ProspectRecord } from './prospect.ts';

/** "+14805551234" → "(480) 555-1234" so spreadsheets don't read it as a formula or number. */
export function displayPhone(e164: string | null): string {
  if (!e164) return '';
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164.replace(/^\+/, '00');
}

const STATUS_LABEL: Record<ProspectRecord['outreach']['status'], string> = {
  not_contacted: 'Not contacted', attempted: 'Attempted', contacted: 'Contacted', audit_booked: 'Audit booked', declined: 'Declined', customer: 'Customer',
};

export const CALL_LIST_COLUMNS = [
  'rank', 'priority', 'priority_points', 'company', 'city', 'phone', 'website', 'next_action',
  'icp_fit', 'fit_label', 'opportunity', 'opportunity_label', 'research_confidence', 'confidence_pct',
  'why', 'review_signals', 'ownership', 'rating', 'reviews', 'outreach_status', 'notes',
  'old_tracker_score', 'old_tracker_tier', 'last_verified', 'fictional', 'prospect_id',
] as const;

export function callListCsv(ranked: Array<{ result: IcpResult; prospect: ProspectRecord }>): string {
  const lines = ranked.map(({ result: r, prospect: p }, i) => {
    const why = r.components.filter((c) => c.id !== 'confidence').map((c) => `${c.label} ${c.status === 'scored' ? `${Math.round(c.points)}/${c.weight}` : 'not verified'}`).join(' · ');
    return csvRow([
      i + 1, r.priority.label, r.priority.points, p.name, p.city, displayPhone(p.phone), p.website, r.priority.next_action,
      r.fit.score, r.fit.label, r.opportunity.score, r.opportunity.label, r.confidence.label, r.confidence.pct,
      why, r.pain?.themes.map((t) => `${t.label}: “${t.phrase}”`).join(' | ') ?? '', p.ownership ? `${p.ownership.value.replace('_', ' ')}${p.ownership_label ? ` (${p.ownership_label})` : ''}` : 'not verified',
      p.rating?.value ?? '', p.review_count?.value ?? '', STATUS_LABEL[p.outreach.status], p.outreach.notes,
      r.legacy?.score ?? '', r.legacy?.tier ?? '', r.last_verified ?? 'undated', p.fictional, p.prospect_id,
    ]);
  });
  return [csvRow([...CALL_LIST_COLUMNS]), ...lines].join('\r\n') + '\r\n';
}

export function resultsJson(ranked: Array<{ result: IcpResult; prospect: ProspectRecord }>, meta: Record<string, unknown>): string {
  return JSON.stringify({ schema: 'rrs.icp-batch/1', ...meta, count: ranked.length, results: ranked.map(({ result, prospect }, i) => ({ rank: i + 1, ...result, prospect })) }, null, 2) + '\n';
}
