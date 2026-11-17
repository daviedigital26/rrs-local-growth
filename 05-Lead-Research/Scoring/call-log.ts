/**
 * Feeds a call log (`rrs.call-log/1`, exported from the call queue) back into prospect
 * records, so re-scoring respects what happened on the phone: declined and do-not-call
 * leave the call list, wrong numbers lose their phone (→ research first), booked audits
 * become "in progress", and follow-up dates and deal values carry over.
 */
import { STAGES, type Stage } from '../../06-Sales/Call-Queue/queue-config.ts';
import { reduceLead, validateCallLog, type CallLog, type QueueLead } from '../../06-Sales/Call-Queue/queue-logic.ts';
import type { OutreachStatus, ProspectRecord } from './prospect.ts';

const STAGE_TO_STATUS: Record<Stage, OutreachStatus> = {
  not_contacted: 'not_contacted', attempted: 'attempted', contacted: 'contacted', audit_booked: 'audit_booked', audit_delivered: 'audit_delivered',
  build_sold: 'build_sold', retainer_active: 'retainer_active', declined: 'declined', do_not_contact: 'declined',
};
const STATUS_TO_STAGE: Record<OutreachStatus, Stage> = {
  not_contacted: 'not_contacted', attempted: 'attempted', contacted: 'contacted', audit_booked: 'audit_booked', audit_delivered: 'audit_delivered',
  build_sold: 'build_sold', retainer_active: 'retainer_active', declined: 'declined', customer: 'build_sold',
};

export function startStage(p: ProspectRecord): Stage {
  return p.contact_restrictions.includes('do_not_contact') ? 'do_not_contact' : STATUS_TO_STAGE[p.outreach.status];
}

/** The minimum of a queue lead needed to replay events for one prospect. */
function replayLead(p: ProspectRecord): QueueLead {
  return {
    id: p.prospect_id, name: p.name, city: p.city, state: p.state, phone: p.phone, website: p.website, industry: p.industry,
    band: '', band_label: '', points: 0, fit: null, fit_label: '', opportunity: null, opportunity_label: '', confidence: '', confidence_pct: 0, next_action: '',
    themes: [], review_sample: { size: 0, with_complaints: 0 }, parts: [], ownership: null, franchise: false, rating: null, reviews: null, old_score: null, old_tier: null, last_verified: null, fictional: p.fictional,
    start: { stage: startStage(p), follow_up: p.outreach.follow_up, value: p.outreach.deal_value, notes: '', last_activity: null },
  };
}

export interface CallLogResult { prospects: ProspectRecord[]; applied: number; unmatched: string[]; errors: string[] }

export function applyCallLog(prospects: ProspectRecord[], log: unknown): CallLogResult {
  const errors = validateCallLog(log);
  if (errors.length) return { prospects, applied: 0, unmatched: [], errors };
  const events = (log as CallLog).events;
  const ids = new Set(prospects.map((p) => p.prospect_id));
  const unmatched = [...new Set(events.map((e) => e.lead).filter((id) => !ids.has(id)))];
  let applied = 0;
  const out = prospects.map((p) => {
    const mine = events.filter((e) => e.lead === p.prospect_id);
    if (!mine.length) return p;
    applied += mine.length;
    const s = reduceLead(replayLead(p), mine);
    const q = structuredClone(p);
    q.outreach.status = STAGE_TO_STATUS[s.stage];
    q.outreach.follow_up = s.follow_up;
    q.outreach.deal_value = s.value;
    q.outreach.last_contact = s.last_at ? s.last_at.slice(0, 10) : q.outreach.last_contact;
    const notes = [...s.notes];
    if (s.bad_number) { q.phone = null; notes.push(`Wrong number logged ${s.last_at?.slice(0, 10) ?? ''}`.trim()); }
    if (s.parked) notes.push(`Parked after ${s.unreached} unanswered calls`);
    q.outreach.notes = [...new Set([q.outreach.notes, ...notes].filter(Boolean))].join(' | ');
    if (s.stage === 'do_not_contact' && !q.contact_restrictions.includes('do_not_contact')) q.contact_restrictions.push('do_not_contact');
    return q;
  });
  return { prospects: out, applied, unmatched, errors: [] };
}

export const stageLabelFor = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
