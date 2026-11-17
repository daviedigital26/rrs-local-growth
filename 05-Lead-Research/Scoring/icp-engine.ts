/**
 * ICP scoring engine. Produces four SEPARATE results per prospect (spec Part 6):
 *   1. ICP fit          — commercial fit + likely benefit + industry/area priority (0–100 or Not enough evidence)
 *   2. Opportunity      — verified problems only: Snapshot, observations, review signals (0–100 or Not verified)
 *   3. Research confidence — coverage × evidence strength × freshness (high/medium/low/insufficient)
 *   4. Outreach priority — the configurable 100-point weighted score, always shown with its six parts,
 *                          plus gates (do-not-contact, declined, inbound, research first).
 * Not verified components earn no priority points but are labelled Not verified, never scored as failing.
 */
import type { Confidence } from '../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { ICP_CONFIG, profileFor, type Band, type ComponentId, type EvidenceKind, type IcpConfig, type Ownership, type PriorityBand } from './icp-config.ts';
import { legacyPmScore, type LegacyScore } from './legacy-pm.ts';
import type { Fact, ProspectRecord } from './prospect.ts';
import { painSignals, type PainSignals } from './review-signals.ts';

export interface ComponentResult {
  id: ComponentId;
  label: string;
  weight: number;
  status: 'scored' | 'not_verified';
  /** 0–1 share of the component earned (null when Not verified). */
  ratio: number | null;
  points: number;
  /** Evidence strength × freshness of what was scored (null when Not verified). */
  quality: number | null;
  reasons: string[];
}

export interface IcpResult {
  schema: 'rrs.icp-result/1';
  config_version: string;
  as_of: string;
  prospect_id: string;
  name: string;
  fictional: boolean;
  profile: { id: string; calibrated: boolean };
  fit: { score: number | null; coverage: number; label: string };
  opportunity: { score: number | null; label: string; sources: string[] };
  confidence: { label: Confidence; pct: number; coverage: number; quality: number; notes: string[] };
  priority: { band: PriorityBand; label: string; points: number; gate: string | null; next_action: string };
  components: ComponentResult[];
  pain: PainSignals | null;
  legacy: LegacyScore | null;
  last_verified: string | null;
}

const round = (n: number) => Math.round(n);
const pct = (n: number) => `${round(n * 100)}%`;
const DAY = 86_400_000;

export function freshnessFactor(checkedAt: string | null, asOf: string, cfg: IcpConfig = ICP_CONFIG): number {
  if (!checkedAt) return cfg.freshness.undated;
  const age = (Date.parse(asOf) - Date.parse(checkedAt)) / DAY;
  if (age <= cfg.freshness.freshDays) return 1;
  if (age <= cfg.freshness.agingDays) return cfg.freshness.aging;
  return cfg.freshness.stale;
}

const factQuality = (f: Fact<unknown>, asOf: string, cfg: IcpConfig) => cfg.evidenceStrength[f.kind] * freshnessFactor(f.checked_at, asOf, cfg);
const pickBand = (bands: Band[], v: number) => bands.find((b) => v >= b.min && (b.max === null || v <= b.max)) ?? null;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function component(id: ComponentId, cfg: IcpConfig, ratio: number | null, quality: number | null, reasons: string[]): ComponentResult {
  const weight = cfg.weights[id];
  const scored = ratio !== null;
  return { id, label: cfg.componentLabels[id], weight, status: scored ? 'scored' : 'not_verified', ratio: scored ? Math.max(0, Math.min(1, ratio)) : null, points: scored ? weight * Math.max(0, Math.min(1, ratio)) : 0, quality: scored ? quality : null, reasons };
}

function commercialFit(p: ProspectRecord, asOf: string, cfg: IcpConfig): ComponentResult {
  const profile = profileFor(p.industry, cfg);
  const sized = profile.sizeBands;
  if (sized && p.units_managed) {
    const band = pickBand(sized.bands, p.units_managed.value);
    if (band) return component('commercial_fit', cfg, band.credit, factQuality(p.units_managed, asOf, cfg), [`Size: ${p.units_managed.value} ${sized.label}, ${band.label}`]);
  }
  if (p.review_count) {
    const band = pickBand(profile.reviewBands, p.review_count.value);
    if (band) return component('commercial_fit', cfg, band.credit, factQuality(p.review_count, asOf, cfg), [`Size (review count as proxy): ${p.review_count.value.toLocaleString('en-US')} reviews, ${band.label}`]);
  }
  return component('commercial_fit', cfg, null, null, ['Size not verified: no review count or unit count on file']);
}

const OWNERSHIP_TEXT: Record<Ownership, [string, string]> = {
  independent: ['independent local business', ''],
  multi_location: ['multi-location brand', ''],
  national_franchise: ['national franchise', '; likely already on corporate systems, so confirm the local owner chooses tools before pitching'],
  corporate: ['corporate-owned', ''],
};

function benefit(p: ProspectRecord, asOf: string, cfg: IcpConfig): ComponentResult {
  const profile = profileFor(p.industry, cfg);
  const ratios: number[] = [];
  const qualities: number[] = [];
  const reasons: string[] = [];
  if (p.rating) {
    const band = pickBand(profile.ratingBands, p.rating.value);
    if (band) { ratios.push(band.credit); qualities.push(factQuality(p.rating, asOf, cfg)); reasons.push(`Rating ${p.rating.value.toFixed(1)}: ${band.label}`); }
  } else reasons.push('Rating not verified');
  if (p.ownership) {
    ratios.push(cfg.ownershipCredit[p.ownership.value]);
    qualities.push(factQuality(p.ownership, asOf, cfg));
    const [kind, implication] = OWNERSHIP_TEXT[p.ownership.value];
    const label = p.ownership_label?.replace(/\s*\((?:national )?franchise\)/i, '').trim();
    reasons.push(`Ownership: ${kind}${label ? ` (${label})` : ''}${implication}`);
  } else reasons.push('Ownership not verified (no chain or franchise flag on file)');
  if (!ratios.length) return component('benefit', cfg, null, null, reasons);
  return component('benefit', cfg, mean(ratios), mean(qualities), reasons);
}

const SEVERITY = { high: 1, medium: 0.6, low: 0.3 } as const;
const SNAPSHOT_CONFIDENCE: Record<Confidence, number> = { high: 1, medium: 0.8, low: 0.6, insufficient: 0 };

function opportunity(p: ProspectRecord, asOf: string, cfg: IcpConfig): { result: ComponentResult; pain: PainSignals | null; sources: string[] } {
  const parts: Array<{ ratio: number; quality: number; source: string }> = [];
  const reasons: string[] = [];
  let pain: PainSignals | null = null;
  if (p.snapshot && p.snapshot.verified_score !== null) {
    const q = cfg.evidenceStrength.snapshot * SNAPSHOT_CONFIDENCE[p.snapshot.confidence] * freshnessFactor(p.snapshot.report_date, asOf, cfg);
    if (q > 0) {
      parts.push({ ratio: (100 - p.snapshot.verified_score) / 100, quality: q, source: 'snapshot' });
      reasons.push(`Snapshot ${p.snapshot.report_date}: ${p.snapshot.verified_score}/100 verified (${pct(p.snapshot.coverage)} coverage, ${p.snapshot.confidence} confidence)`);
    }
  }
  if (p.observations.length) {
    const sorted = [...p.observations].sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity]);
    const ratio = Math.min(1, SEVERITY[sorted[0]!.severity] + 0.1 * (sorted.length - 1));
    const kinds = sorted.map((o) => cfg.evidenceStrength[o.kind as EvidenceKind] * freshnessFactor(o.checked_at, asOf, cfg));
    parts.push({ ratio, quality: mean(kinds), source: sorted.every((o) => o.kind === 'owner_reported') ? 'owner_reported' : 'observations' });
    for (const o of sorted.slice(0, 3)) reasons.push(`${o.severity === 'high' ? 'Major' : o.severity === 'medium' ? 'Moderate' : 'Minor'} problem (${o.category}): ${o.note}`);
  }
  if (p.review_excerpts) {
    pain = painSignals(p.review_excerpts.value, profileFor(p.industry, cfg));
    const q = factQuality(p.review_excerpts, asOf, cfg);
    parts.push({ ratio: pain.ratio, quality: q, source: 'reviews' });
    const sample = `${pain.reviewsWithComplaints} of ${pain.sampleSize} sampled review${pain.sampleSize === 1 ? '' : 's'}`;
    if (pain.themes.length) reasons.push(`Reviews (${sample}): ${pain.themes.map((t) => `${t.label} (“${t.phrase}”)`).join('; ')}`);
    else reasons.push(`No complaint language in ${pain.sampleSize} sampled review${pain.sampleSize === 1 ? '' : 's'}`);
    if (pain.negated.length) reasons.push(`Ignored as praise: ${pain.negated.map((n) => `“${n}”`).join('; ')}`);
    if (pain.historical) reasons.push(`Ignored ${pain.historical} sentence${pain.historical === 1 ? '' : 's'} about a previous company`);
  }
  if (!parts.length) return { result: component('opportunity', cfg, null, null, ['No verified problems on file yet (no Snapshot, observations or review text)']), pain, sources: [] };
  const wsum = parts.reduce((s, x) => s + x.quality, 0);
  const ratio = wsum > 0 ? parts.reduce((s, x) => s + x.ratio * x.quality, 0) / wsum : mean(parts.map((x) => x.ratio));
  return { result: component('opportunity', cfg, ratio, Math.max(...parts.map((x) => x.quality)), reasons), pain, sources: parts.map((x) => x.source) };
}

function reachability(p: ProspectRecord, cfg: IcpConfig): ComponentResult {
  if (p.origin === 'inbound') return component('reachability', cfg, 1, 1, ['They contacted us through the website']);
  const r = cfg.reachability;
  const noCalls = p.contact_restrictions.includes('no_calls');
  const noEmail = p.contact_restrictions.includes('no_email');
  const have: string[] = [];
  let ratio = 0;
  if (p.phone && !noCalls) { ratio += r.phone; have.push('phone'); }
  if (p.email && !noEmail) { ratio += r.email; have.push('email'); }
  if (p.website) { ratio += r.website; have.push('website'); }
  if (p.decision_maker) { ratio += r.decision_maker; have.push(`decision-maker (${p.decision_maker.value})`); }
  const notes = [noCalls ? 'Calls not permitted' : '', noEmail ? 'Email not permitted' : ''].filter(Boolean);
  if (!have.length) return component('reachability', cfg, null, null, ['No public business contact on file yet', ...notes]);
  const missing = [!p.phone && 'phone', !p.email && 'email', !p.website && 'website', !p.decision_maker && 'decision-maker name'].filter(Boolean);
  return component('reachability', cfg, ratio, 1, [`On file: ${have.join(', ')}`, ...(missing.length ? [`Not on file: ${missing.join(', ')}`] : []), ...notes]);
}

function priorityMatch(p: ProspectRecord, cfg: IcpConfig): ComponentResult {
  const parts: number[] = [];
  const reasons: string[] = [];
  if (p.industry) {
    const tier = cfg.industries.primary.includes(p.industry) ? 'primary' : cfg.industries.secondary.includes(p.industry) ? 'secondary' : 'other';
    parts.push(cfg.industries.credit[tier]);
    reasons.push(`Industry: ${p.industry} (${tier} target)`);
  } else reasons.push('Industry not verified');
  if (p.city && p.state) {
    const city = p.city.replace(/,.*$/, '').trim().toLowerCase();
    const g = cfg.geography;
    const tier = p.state === g.homeState && g.primaryCities.includes(city) ? 'primary' : p.state === g.homeState ? 'homeState' : g.expansionStates.includes(p.state) ? 'expansion' : 'other';
    parts.push(g.credit[tier]);
    reasons.push(`Area: ${p.city} (${{ primary: 'primary Phoenix-area market', homeState: 'other Arizona market', expansion: 'expansion market', other: 'outside target markets' }[tier]})`);
  } else reasons.push(p.city ? `Area: "${p.city}" has no state, so it can't be placed` : 'Area not verified');
  if (!parts.length) return component('priority_match', cfg, null, null, reasons);
  return component('priority_match', cfg, mean(parts), 1, reasons);
}

function confidenceOf(parts: ComponentResult[], p: ProspectRecord, pain: PainSignals | null, asOf: string, cfg: IcpConfig) {
  const scoredWeight = parts.reduce((s, c) => s + c.weight, 0);
  const verified = parts.filter((c) => c.status === 'scored');
  const coverage = verified.reduce((s, c) => s + c.weight, 0) / scoredWeight;
  const quality = verified.length ? verified.reduce((s, c) => s + c.weight * (c.quality ?? 0), 0) / verified.reduce((s, c) => s + c.weight, 0) : 0;
  const s = coverage * quality;
  const label: Confidence = coverage < cfg.confidence.minCoverage ? 'insufficient' : s >= cfg.confidence.high ? 'high' : s >= cfg.confidence.medium ? 'medium' : 'low';
  const notes: string[] = [];
  const facts = [p.rating, p.review_count, p.review_excerpts, p.ownership, p.units_managed].filter((f): f is Fact<never> => f !== null);
  if (facts.some((f) => !f.checked_at)) notes.push('Some facts have no check date; treated as stale');
  const dated = facts.map((f) => f.checked_at).filter((d): d is string => !!d).sort();
  if (dated.length) {
    const age = round((Date.parse(asOf) - Date.parse(dated[0]!)) / DAY);
    if (age > cfg.freshness.freshDays) notes.push(`Oldest fact is ${age} days old; re-check before outreach`);
  }
  if (pain && pain.sampleSize < 5) notes.push(`Review signals come from only ${pain.sampleSize} excerpt${pain.sampleSize === 1 ? '' : 's'}`);
  const missing = parts.filter((c) => c.status === 'not_verified').map((c) => c.label.toLowerCase());
  if (missing.length) notes.push(`Not verified: ${missing.join(', ')}`);
  return { label, pct: round(s * 100), coverage, quality, notes, ratio: s };
}

const IN_PROGRESS: Partial<Record<ProspectRecord['outreach']['status'], string>> = {
  audit_booked: 'Audit booked', audit_delivered: 'Audit delivered', build_sold: 'Customer (build sold)', retainer_active: 'Customer (retainer)', customer: 'Customer',
};

const BAND_LABEL: Record<PriorityBand, string> = {
  inbound: 'Inbound: reply', p1: 'P1: call first', p2: 'P2: call next', p3: 'P3: low priority', research_first: 'Research first',
  in_progress: 'In progress', closed: 'Closed (declined)', do_not_contact: 'Do not contact', disqualified: 'Disqualified',
};
export const BAND_ORDER: PriorityBand[] = ['inbound', 'p1', 'p2', 'p3', 'research_first', 'in_progress', 'closed', 'do_not_contact', 'disqualified'];

function fitLabel(score: number | null) {
  if (score === null) return 'Not enough evidence';
  return score >= 75 ? 'Strong fit' : score >= 55 ? 'Good fit' : score >= 35 ? 'Partial fit' : 'Weak fit';
}
function opportunityLabel(score: number | null) {
  if (score === null) return 'Not verified';
  return score >= 60 ? 'Clear opportunity' : score >= 30 ? 'Some opportunity' : score > 0 ? 'Minor signals' : 'No problem found in the evidence checked';
}

export function scoreProspect(p: ProspectRecord, opts: { asOf: string; config?: IcpConfig }): IcpResult {
  const cfg = opts.config ?? ICP_CONFIG;
  const asOf = opts.asOf;
  const opp = opportunity(p, asOf, cfg);
  const parts = [commercialFit(p, asOf, cfg), opp.result, benefit(p, asOf, cfg), reachability(p, cfg), priorityMatch(p, cfg)];
  const conf = confidenceOf(parts, p, opp.pain, asOf, cfg);
  const components = [...parts, component('confidence', cfg, conf.ratio, conf.quality, [`${conf.label} research confidence (${conf.pct}%)`])];

  const fitParts = components.filter((c) => cfg.fitComponents.includes(c.id));
  const fitWeight = fitParts.reduce((s, c) => s + c.weight, 0);
  const fitVerified = fitParts.filter((c) => c.status === 'scored');
  const fitCoverage = fitVerified.reduce((s, c) => s + c.weight, 0) / fitWeight;
  const fitScore = fitCoverage >= cfg.fitMinCoverage ? round((100 * fitVerified.reduce((s, c) => s + c.points, 0)) / fitVerified.reduce((s, c) => s + c.weight, 0)) : null;
  const oppScore = opp.result.ratio === null ? null : round(opp.result.ratio * 100);
  const points = round(components.reduce((s, c) => s + c.points, 0));

  let band: PriorityBand;
  let gate: string | null = null;
  if (p.contact_restrictions.includes('do_not_contact')) { band = 'do_not_contact'; gate = 'On the do-not-contact list'; }
  else if (p.operating_status?.value === 'closed') { band = 'disqualified'; gate = 'Business marked closed'; }
  else if (p.outreach.status === 'declined') { band = 'closed'; gate = 'Declined'; }
  else if (IN_PROGRESS[p.outreach.status]) { band = 'in_progress'; gate = IN_PROGRESS[p.outreach.status]!; }
  else if (p.origin === 'inbound') { band = 'inbound'; gate = 'Inbound request'; }
  else if (conf.label === 'insufficient') { band = 'research_first'; gate = 'Not enough verified information'; }
  else if (points >= cfg.bands.p1 && (oppScore ?? 0) >= cfg.bands.p1MinOpportunity) band = 'p1';
  else band = points >= cfg.bands.p2 ? 'p2' : 'p3';
  if (band === 'p1' && p.ownership?.value === 'national_franchise' && cfg.franchiseMaxBand === 'p2') { band = 'p2'; gate = 'Capped at P2: national franchise'; }

  const dates = [p.rating, p.review_count, p.review_excerpts, p.ownership, p.units_managed, p.decision_maker].map((f) => f?.checked_at).concat(p.observations.map((o) => o.checked_at), [p.snapshot?.report_date ?? null]).filter((d): d is string => !!d).sort();

  return {
    schema: 'rrs.icp-result/1',
    config_version: cfg.version,
    as_of: asOf,
    prospect_id: p.prospect_id,
    name: p.name,
    fictional: p.fictional,
    profile: { id: profileFor(p.industry, cfg).id, calibrated: profileFor(p.industry, cfg).calibrated },
    fit: { score: fitScore, coverage: fitCoverage, label: fitLabel(fitScore) },
    opportunity: { score: oppScore, label: opportunityLabel(oppScore), sources: opp.sources },
    confidence: { label: conf.label, pct: conf.pct, coverage: conf.coverage, quality: conf.quality, notes: conf.notes },
    priority: { band, label: BAND_LABEL[band], points, gate, next_action: nextAction(band, p, components, opp.pain, conf.label) },
    components,
    pain: opp.pain,
    legacy: p.legacy ? legacyPmScore(p.legacy) : null,
    last_verified: dates.at(-1) ?? null,
  };
}

function nextAction(band: PriorityBand, p: ProspectRecord, parts: ComponentResult[], pain: PainSignals | null, conf: Confidence): string {
  switch (band) {
    case 'do_not_contact': return 'Do not contact (suppression list).';
    case 'disqualified': return 'Business marked closed; no outreach.';
    case 'closed': return 'Declined; no further outreach unless they reach out.';
    case 'in_progress': return /^(customer|build_sold|retainer_active)$/.test(p.outreach.status) ? 'Existing customer; handle through account management.' : p.outreach.status === 'audit_delivered' ? 'Audit delivered; follow up on the proposal.' : 'Audit booked; prepare the Snapshot.';
    case 'inbound': return 'Inbound request: review it and reply personally (no automated outreach).';
    case 'research_first': return `Research first: verify ${parts.filter((c) => c.status === 'not_verified').map((c) => c.label.toLowerCase()).join(', ')} before any outreach.`;
  }
  const steps: string[] = [];
  const noCalls = p.contact_restrictions.includes('no_calls') || !p.phone;
  steps.push(band === 'p1' ? (noCalls ? 'Email first' : 'Call first') : band === 'p2' ? (noCalls ? 'Email after P1 leads' : 'Call after P1 leads') : 'Low priority: nurture or skip for now');
  if (p.outreach.status === 'attempted') steps.push('already attempted, so follow up');
  if (conf === 'low') steps.push('re-check the listing before calling');
  const top = pain?.themes[0];
  if (top) steps.push(`opening angle: reviews mention ${top.label}`);
  else if (band !== 'p3' && !(parts.find((c) => c.id === 'opportunity')?.ratio)) steps.push('no problem verified yet, so check recent reviews or run a quick Snapshot first');
  if (p.ownership?.value === 'national_franchise') steps.push('franchise, so confirm who chooses their tools');
  return `${steps.join('; ')}.`.replace(/^./, (c) => c.toUpperCase());
}

export function compareResults(a: IcpResult, b: IcpResult): number {
  return BAND_ORDER.indexOf(a.priority.band) - BAND_ORDER.indexOf(b.priority.band)
    || b.priority.points - a.priority.points
    || b.confidence.pct - a.confidence.pct
    || a.name.localeCompare(b.name);
}

export const rankResults = (results: IcpResult[]): IcpResult[] => [...results].sort(compareResults);

/** Score and rank a batch, keeping each result next to the record it came from. */
export function scoreAll(prospects: ProspectRecord[], opts: { asOf: string; config?: IcpConfig }): Array<{ prospect: ProspectRecord; result: IcpResult }> {
  return prospects.map((prospect) => ({ prospect, result: scoreProspect(prospect, opts) })).sort((a, b) => compareResults(a.result, b.result));
}
