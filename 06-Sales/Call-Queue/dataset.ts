/**
 * Scored leads → the call queue's dataset (`rrs.call-queue/1`). Node side only.
 * The dataset carries each lead's four scores, reasons and review evidence, plus the state
 * imported from the old tracker (stage, follow-up, deal value, notes) as its starting point.
 */
import { ICP_CONFIG } from '../../05-Lead-Research/Scoring/icp-config.ts';
import type { IcpResult } from '../../05-Lead-Research/Scoring/icp-engine.ts';
import { startStage } from '../../05-Lead-Research/Scoring/call-log.ts';
import type { ProspectRecord } from '../../05-Lead-Research/Scoring/prospect.ts';
import { QUEUE_CONFIG } from './queue-config.ts';
import type { QueueDataset, QueueLead } from './queue-logic.ts';

export function toQueueLead({ result: r, prospect: p }: { result: IcpResult; prospect: ProspectRecord }): QueueLead {
  return {
    id: p.prospect_id,
    name: p.name,
    city: p.city,
    state: p.state,
    phone: p.phone,
    website: p.website,
    industry: p.industry,
    band: r.priority.band,
    band_label: r.priority.label,
    points: r.priority.points,
    fit: r.fit.score,
    fit_label: r.fit.label,
    opportunity: r.opportunity.score,
    opportunity_label: r.opportunity.label,
    confidence: r.confidence.label,
    confidence_pct: r.confidence.pct,
    next_action: r.priority.next_action,
    themes: (r.pain?.themes ?? []).map((t) => ({ id: t.theme, label: t.label, phrase: t.phrase, relevance: t.relevance })),
    review_sample: { size: r.pain?.sampleSize ?? 0, with_complaints: r.pain?.reviewsWithComplaints ?? 0 },
    parts: r.components.map((c) => ({ label: c.label, points: c.status === 'scored' ? Math.round(c.points) : null, weight: c.weight, reasons: c.reasons })),
    ownership: p.ownership ? `${p.ownership.value.replace('_', ' ')}${p.ownership_label ? ` (${p.ownership_label})` : ''}` : null,
    franchise: p.ownership?.value === 'national_franchise',
    rating: p.rating?.value ?? null,
    reviews: p.review_count?.value ?? null,
    old_score: r.legacy?.score ?? null,
    old_tier: r.legacy?.tier ?? null,
    last_verified: r.last_verified,
    fictional: p.fictional,
    start: { stage: startStage(p), follow_up: p.outreach.follow_up, value: p.outreach.deal_value, notes: p.outreach.notes, last_activity: null },
  };
}

export function toQueueDataset(ranked: Array<{ result: IcpResult; prospect: ProspectRecord }>, asOf: string): QueueDataset {
  const leads = ranked.map(toQueueLead);
  return { schema: 'rrs.call-queue/1', as_of: asOf, icp_version: ICP_CONFIG.version, queue_version: QUEUE_CONFIG.version, fictional: leads.length > 0 && leads.every((l) => l.fictional), leads };
}
