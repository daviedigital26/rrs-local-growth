/**
 * Turns an accepted Snapshot request (LeadRecord) into a research draft: a
 * SnapshotDocument with the business details, the owner's self-check answers as
 * owner-reported evidence, and every other criterion explicitly Not verified until
 * a researcher records evidence. Never invents facts.
 */
import { allCriteria } from '../../04-Audits-and-Scorecards/snapshot/framework.ts';
import type { CriterionResult } from '../../04-Audits-and-Scorecards/snapshot/engine.ts';
import type { SnapshotDocument } from '../../04-Audits-and-Scorecards/snapshot/report/model.ts';
import type { LeadRecord } from './lead-intake.ts';

const INDUSTRY_LABEL: Record<string, string> = {
  'home-services': 'Home services', 'auto-detailing': 'Auto detailing & tint', 'property-management': 'Property management',
  'recurring-services': 'Recurring services', remodeling: 'Remodeling & home improvement', 'professional-services': 'Professional services',
  realtor: 'Real estate', other: 'Other',
};

export function snapshotDraftFromLead(lead: LeadRecord, reportDate: string): SnapshotDocument {
  if (lead.form !== 'snapshot_request') throw new Error('Only snapshot_request leads become Snapshot drafts');
  const results: CriterionResult[] = allCriteria.map((c) => {
    const answer = lead.self_check[c.id];
    if (answer !== undefined && answer !== 'not_verified') {
      return { criterionId: c.id, status: 'scored', tier: answer as CriterionResult['tier'], evidence: { type: 'owner_reported', note: 'Self-reported on the website Snapshot request', checkedAt: lead.submitted_at.slice(0, 10) } };
    }
    return { criterionId: c.id, status: 'not_verified' };
  });
  return {
    _notice: 'RESEARCH DRAFT: every criterion stays Not verified until evidence (source, date, type) is recorded. Owner-reported answers came from the website form.',
    input: {
      business: { name: lead.business.name ?? 'Unknown business', industry: INDUSTRY_LABEL[lead.business.industry ?? 'other'] ?? 'Other', area: lead.business.city ?? 'Unknown' /* as entered; never assume a state */, fictional: false },
      reportDate,
      results,
    },
    competitors: [],
    immediateOpportunities: [],
    lead: { contactName: lead.contact.name, email: lead.contact.email, phone: lead.contact.phone ?? undefined, website: lead.business.website ?? undefined, source: lead.attribution.utm_source ?? (lead.attribution.referrer ? 'referral' : 'website'), leadId: lead.lead_id },
  };
}
