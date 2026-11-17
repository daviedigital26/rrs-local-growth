import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { processSubmission } from '../intake/lead-intake.ts';
import { ICP_CONFIG, profileFor } from './icp-config.ts';
import { freshnessFactor, scoreAll, scoreProspect, type IcpResult } from './icp-engine.ts';
import { LEGACY_MAX_SCORE, legacyPmScore } from './legacy-pm.ts';
import { callListCsv, CALL_LIST_COLUMNS, displayPhone } from './outputs.ts';
import { fromLegacyBatch, fromLegacyCsv, fromWebLead, mergeProspects, parseCsv, type ProspectRecord } from './prospect.ts';
import { painSignals } from './review-signals.ts';
import { icpMethodologyMarkdown, METHODOLOGY_PATH } from './methodology.ts';
import { loadInput, RESEARCH_OUTPUTS, unsafeOutputDir } from './score-cli.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const BATCH = join(root, '17-Sample-Clients/fictional-pm-lead-batch.json');
const EXPORT_CSV = join(root, '17-Sample-Clients/fictional-pm-tracker-export.csv');
const SAMPLE_OUT = join(root, '17-Sample-Clients/lead-scoring/fictional-pm-call-list.csv');
const AS_OF = '2026-11-17';
const CHECKED = '2026-11-10';

const batch = () => JSON.parse(readFileSync(BATCH, 'utf8')) as Array<Record<string, unknown>>;
const one = (over: Record<string, unknown>, checkedAt: string | null = CHECKED): ProspectRecord => {
  const r = fromLegacyBatch([{ name: 'Test Homes (fictional)', city: 'Phoenix, AZ', phone: '+1 602-555-0199', rating: 4.3, reviewCount: 200, chain: null, reviews: ['Great team.', 'Fine.'], ...over }], { checkedAt });
  assert.deepEqual(r.errors, []);
  return r.prospects[0]!;
};
const score = (p: ProspectRecord, asOf = AS_OF) => scoreProspect(p, { asOf });
const comp = (r: IcpResult, id: string) => r.components.find((c) => c.id === id)!;
const pm = profileFor('property-management');

test('config: spec weights total 100 and every component is labelled', () => {
  const w = ICP_CONFIG.weights;
  assert.equal(Object.values(w).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(w, { commercial_fit: 25, opportunity: 25, benefit: 20, reachability: 15, priority_match: 10, confidence: 5 });
  for (const id of Object.keys(w)) assert.ok(ICP_CONFIG.componentLabels[id as keyof typeof w]);
  assert.ok(ICP_CONFIG.bands.p1 > ICP_CONFIG.bands.p2);
});

test('legacy: exact port reproduces the tracker scores, quirks included', () => {
  const expected: Record<string, [number, string]> = {
    'Saguaro Lane Property Co. (fictional)': [76, 'hot'], 'Copper Mesa Rentals (fictional)': [68, 'hot'],
    'Desert Key Homes Franchise Office (fictional)': [52, 'warm'], 'Ironwood Residential (fictional)': [38, 'warm'],
    'Palo Verde Property Care (fictional)': [68, 'hot'], 'Ocotillo Management Group (fictional)': [30, 'cold'],
    'Sunbelt Leasing Partners (fictional)': [68, 'hot'],
  };
  for (const lead of batch()) {
    const r = legacyPmScore(lead as never);
    assert.deepEqual([r.score, r.tier], expected[lead.name as string], lead.name as string);
  }
  // Quirks kept on purpose: praise counts as pain, and one word can hit twice.
  assert.equal(legacyPmScore({ reviewCount: 100, rating: 4.9, reviews: ['No voicemail runaround here.'], chain: null }).painHits, 1);
  assert.equal(legacyPmScore({ reviewCount: 100, rating: 4.2, reviews: ['They canceled twice.'], chain: null }).painHits, 2);
  assert.equal(legacyPmScore({ reviewCount: 100, rating: 4.2, reviews: ['slow voicemail delay weeks'], chain: null }).score, LEGACY_MAX_SCORE);
});

test('review signals: themes count once, praise and other companies are ignored', () => {
  const praise = painSignals(['Never had a delay, no voicemail runaround, and the team is not slow.'], pm);
  assert.equal(praise.themes.length, 0, JSON.stringify(praise.themes));
  assert.equal(praise.negated.length, 3);
  const twice = painSignals(['They canceled the tour, then cancelled again.'], pm);
  assert.deepEqual(twice.themes.map((t) => t.theme), ['process']);
  const history = painSignals(['I paid rent with a broken stove for years until new management showed up.'], pm);
  assert.equal(history.themes.length, 0);
  assert.equal(history.historical, 1);
  const comparison = painSignals(['Most agencies would not get back to me or would cancel showings.'], pm);
  assert.equal(comparison.themes.length, 0);
  const real = painSignals(['Calls and emails not returned, delays on maintenance.', 'Lovely staff.'], pm);
  assert.deepEqual(real.themes.map((t) => t.theme), ['unanswered', 'slow']);
  assert.equal(real.reviewsWithComplaints, 1);
  assert.equal(real.sampleSize, 2);
  assert.match(real.themes[0]!.phrase, /not returned/);
  assert.ok(Math.abs(real.ratio - 16 / 26) < 1e-9, 'two full-relevance themes = 16 of 26 points (legacy scale)');
});

test('four separate scores; missing evidence is Not verified, never a failing score', () => {
  const r = score(one({ rating: undefined, reviewCount: undefined, reviews: undefined, phone: undefined, city: undefined }));
  assert.equal(r.fit.score, null);
  assert.equal(r.fit.label, 'Not enough evidence');
  assert.equal(r.opportunity.score, null);
  assert.equal(r.opportunity.label, 'Not verified');
  assert.equal(r.confidence.label, 'insufficient');
  assert.equal(r.priority.band, 'research_first');
  assert.match(r.priority.next_action, /^Research first: verify commercial fit/);
  for (const id of ['commercial_fit', 'opportunity', 'benefit', 'reachability']) {
    assert.equal(comp(r, id).status, 'not_verified', id);
    assert.equal(comp(r, id).ratio, null, `${id} has no ratio, not 0`);
  }
  // A checked sample with no complaints IS evidence: scored 0, labelled honestly.
  const clean = score(one({}));
  assert.equal(clean.opportunity.score, 0);
  assert.equal(clean.opportunity.label, 'No problem found in the evidence checked');
  assert.equal(comp(clean, 'opportunity').status, 'scored');
});

test('priority: size and rating alone never reach P1; a verified problem does', () => {
  const clean = score(one({}));
  assert.ok(clean.priority.points >= ICP_CONFIG.bands.p1, `points ${clean.priority.points}`);
  assert.equal(clean.priority.band, 'p2');
  assert.match(clean.priority.next_action, /no problem verified yet/);
  const pained = score(one({ reviews: ['Left voicemails and got no call back, it took 5 days to send anyone.', 'Nice portal.'] }));
  assert.equal(pained.priority.band, 'p1');
  assert.match(pained.priority.next_action, /^Call first; opening angle: reviews mention calls or messages go unanswered/);
  assert.ok(pained.opportunity.score! >= ICP_CONFIG.bands.p1MinOpportunity);
});

test('priority gates: franchise cap, do-not-contact, declined, booked, closed, inbound', () => {
  const franchise = score(one({ chain: 'Example Home Partners (national franchise)', reviews: ['Radio silence after move-in, and it took 9 days to fix the AC.'] }));
  assert.equal(franchise.priority.band, 'p2');
  assert.equal(franchise.priority.gate, 'Capped at P2: national franchise');
  assert.match(franchise.priority.next_action, /franchise, so confirm who chooses their tools/);

  const base = one({ reviews: ['No call back for a week.'] });
  const gated = (patch: Partial<ProspectRecord>) => score({ ...structuredClone(base), ...patch }).priority.band;
  assert.equal(gated({ contact_restrictions: ['do_not_contact'], outreach: { status: 'audit_booked', notes: '', last_contact: null, follow_up: null, deal_value: null } }), 'do_not_contact');
  assert.equal(gated({ outreach: { status: 'declined', notes: '', last_contact: null, follow_up: null, deal_value: null } }), 'closed');
  assert.equal(gated({ outreach: { status: 'audit_booked', notes: '', last_contact: null, follow_up: null, deal_value: null } }), 'in_progress');
  assert.equal(gated({ operating_status: { value: 'closed', kind: 'public_observation', checked_at: CHECKED } }), 'disqualified');
  assert.match(score({ ...structuredClone(base), contact_restrictions: ['no_calls'] }).priority.next_action, /^Email first/);

  const NOW = '2026-11-17T18:00:00.000Z';
  const lead = processSubmission({
    form: 'snapshot_request', submitted_at: '2026-11-17T17:59:30.000Z', form_started_at: '2026-11-17T17:58:00.000Z', company_website: '',
    business_name: 'Sample Rentals (fictional)', website: 'example.com', city: 'Peoria, AZ', industry: 'property-management',
    concerns: ['Missed calls or slow follow-up'], contact_name: 'Pat Owner', email: 'pat@example.com', phone: '(602) 555-0147',
    preferred_channel: 'email', consent_contact: true, consent_sms: false, consent_text: 'I agree…',
  }, NOW);
  assert.equal(lead.status, 'accepted', lead.errors.join('; '));
  const p = fromWebLead(lead.record!);
  assert.equal(p.origin, 'inbound');
  assert.deepEqual(p.contact_restrictions, ['no_sms']);
  assert.equal(p.observations[0]!.kind, 'owner_reported');
  const r = score(p);
  assert.equal(r.priority.band, 'inbound');
  assert.equal(comp(r, 'reachability').ratio, 1);
  assert.deepEqual(r.opportunity.sources, ['owner_reported']);
});

test('confidence: fresh dated evidence beats undated or stale evidence', () => {
  assert.equal(freshnessFactor('2026-11-01', AS_OF), 1);
  assert.equal(freshnessFactor('2026-07-01', AS_OF), ICP_CONFIG.freshness.aging);
  assert.equal(freshnessFactor('2026-01-01', AS_OF), ICP_CONFIG.freshness.stale);
  assert.equal(freshnessFactor(null, AS_OF), ICP_CONFIG.freshness.undated);
  const fresh = score(one({}, CHECKED));
  const undated = score(one({}, null));
  assert.ok(fresh.confidence.pct > undated.confidence.pct);
  assert.equal(fresh.confidence.label, 'high');
  assert.ok(undated.confidence.notes.some((n) => /no check date/.test(n)));
  const old = score(one({}, '2026-03-01'));
  assert.ok(old.confidence.notes.some((n) => /days old; re-check/.test(n)));
});

test('units managed (when known) replace the review-count size proxy', () => {
  const big = one({ reviewCount: 120 });
  assert.equal(comp(score(big), 'commercial_fit').ratio, 1);
  const withUnits = { ...structuredClone(big), units_managed: { value: 900, kind: 'owner_reported' as const, checked_at: CHECKED } };
  const r = score(withUnits);
  assert.equal(comp(r, 'commercial_fit').ratio, 0.25);
  assert.match(comp(r, 'commercial_fit').reasons[0]!, /900 units managed, well above target/);
});

test('weights are configurable without code changes', () => {
  const p = one({ reviews: ['No call back for a week.'] });
  const cfg = { ...ICP_CONFIG, weights: { ...ICP_CONFIG.weights, opportunity: 45, commercial_fit: 5 } };
  const a = scoreProspect(p, { asOf: AS_OF });
  const b = scoreProspect(p, { asOf: AS_OF, config: cfg });
  assert.equal(comp(b, 'opportunity').weight, 45);
  assert.notEqual(a.priority.points, b.priority.points);
  assert.equal(a.opportunity.score, b.opportunity.score, 'the separate opportunity score does not depend on weights');
});

test('import: tracker batch validation errors name the item; CSV keeps status and notes', () => {
  assert.equal(fromLegacyBatch({}).errors[0]!.message, 'expected a JSON array of leads');
  const bad = fromLegacyBatch([{ name: 'A (fictional)', rating: 7 }, { city: 'Mesa, AZ' }, { name: 'B (fictional)', reviewCount: 2.5, reviews: 'text' }], { checkedAt: '11/10/2026' });
  assert.deepEqual(bad.errors.map((e) => `${e.where}: ${e.message}`), [
    'options: checked date must be YYYY-MM-DD, got "11/10/2026"',
    'item 1 (A (fictional)): rating must be a number from 0 to 5',
    'item 2: name is required',
    'item 3 (B (fictional)): reviewCount must be a whole number',
    'item 3 (B (fictional)): reviews must be a list of text excerpts',
  ]);
  assert.match(fromLegacyBatch([{ name: 'x' }]).warnings[0]!.message, /no pull date/);
  assert.match(fromLegacyCsv('Name,City\nA,B\n').errors[0]!.message, /missing column "phone"/);

  const csv = fromLegacyCsv(readFileSync(EXPORT_CSV, 'utf8'));
  assert.deepEqual(csv.errors, []);
  assert.deepEqual(csv.prospects.map((p) => p.outreach.status), ['attempted', 'declined', 'audit_booked']);
  assert.equal(csv.prospects[0]!.outreach.notes, 'Left voicemail, try mornings (fictional note)');
  assert.deepEqual(parseCsv('a,"b ""q"", c"\r\n\r\n1,2\n'), [['a', 'b "q", c'], ['1', '2']]);

  const merged = mergeProspects([...fromLegacyBatch(batch(), { checkedAt: CHECKED }).prospects, ...csv.prospects]);
  assert.equal(merged.merged, 3);
  assert.equal(merged.prospects.length, 7);
  const saguaro = merged.prospects.find((p) => p.name.startsWith('Saguaro'))!;
  assert.equal(saguaro.outreach.status, 'attempted');
  assert.ok(saguaro.review_excerpts, 'reviews from the batch survive the merge');
  assert.equal(saguaro.rating?.checked_at, CHECKED, 'the dated fact wins over the undated CSV copy');
  assert.ok(merged.prospects.every((p) => p.fictional));
});

test('outputs: call list CSV is phone-friendly and formula-injection safe', () => {
  assert.equal(displayPhone('+16235550101'), '(623) 555-0101');
  assert.equal(displayPhone(null), '');
  const p = one({ name: '=HYPERLINK("http://x") (fictional)' });
  const csv = callListCsv(scoreAll([p], { asOf: AS_OF }));
  const rows = parseCsv(csv);
  assert.deepEqual(rows[0], [...CALL_LIST_COLUMNS]);
  assert.equal(rows[1]![3], `'=HYPERLINK("http://x") (fictional)`);
  assert.equal(rows[1]![5], '(602) 555-0199');
});

test('sample: committed fictional call list matches a fresh run', () => {
  const inputs = [BATCH, EXPORT_CSV].flatMap((f) => loadInput(f, { checkedAt: CHECKED }).prospects);
  const ranked = scoreAll(mergeProspects(inputs).prospects, { asOf: AS_OF });
  assert.equal(readFileSync(SAMPLE_OUT, 'utf8'), callListCsv(ranked), 'run `npm run leads:sample` and commit the result');
  assert.deepEqual(ranked.map((x) => x.result.priority.band), ['p1', 'p1', 'p2', 'p2', 'research_first', 'in_progress', 'closed']);
  const palo = ranked.find((x) => x.prospect.name.startsWith('Palo Verde'))!.result;
  assert.equal(palo.opportunity.score, 0, 'praise comparing other agencies is not a complaint');
});

test('cli: real data can only be written to Research-Outputs or outside the repo', () => {
  assert.equal(unsafeOutputDir(RESEARCH_OUTPUTS), false);
  assert.equal(unsafeOutputDir(join(RESEARCH_OUTPUTS, 'nov')), false);
  assert.equal(unsafeOutputDir(join(root, '17-Sample-Clients')), true);
  assert.equal(unsafeOutputDir(root), true);
  assert.equal(unsafeOutputDir('/tmp/rrs-out'), false);
  const snap = loadInput(join(root, '17-Sample-Clients/fictional-hvac-snapshot.json'), {});
  assert.deepEqual(snap.errors, []);
  assert.equal(snap.prospects[0]!.industry, 'home-services');
  assert.equal(snap.prospects[0]!.snapshot?.verified_score, 51);
});

test('docs: ICP-METHODOLOGY.md is generated from the config and up to date', () => {
  const doc = readFileSync(METHODOLOGY_PATH, 'utf8');
  assert.equal(doc, icpMethodologyMarkdown(), 'run `npm run icp:docs` and commit the result');
  assert.match(doc, /\| Commercial fit \| 25 \|/);
  assert.match(doc, /P1\*\* at 60\+ points \*\*and\*\* a verified opportunity of at least 30/);
});
