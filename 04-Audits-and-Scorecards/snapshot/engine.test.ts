import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allCriteria, categories, type EvidenceType } from './framework.ts';
import { impactScenarios, scoreOwnerAnswers, scoreSnapshot, SnapshotValidationError, type CriterionResult, type SnapshotInput } from './engine.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const base = (results: CriterionResult[], reportDate = '2026-11-10'): SnapshotInput => ({
  business: { name: 'Test Co (fictional)', industry: 'HVAC', area: 'Phoenix, AZ', fictional: true },
  reportDate,
  results,
});
const ev = (checkedAt = '2026-11-10', type: EvidenceType = 'public_observation') => ({ type, note: 't', checkedAt });
const allNV = (): CriterionResult[] => allCriteria.map((c) => ({ criterionId: c.id, status: 'not_verified' }));

test('framework: 5 categories × 20 points = 100, unique ids, complete criteria', () => {
  assert.equal(categories.length, 5);
  for (const c of categories) assert.equal(c.criteria.reduce((s, x) => s + x.points, 0), 20, c.id);
  const ids = allCriteria.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of allCriteria) {
    assert.ok(c.measure && c.evidence && c.missingData && c.limitations, c.id);
    assert.ok(c.sources.length && c.allowedEvidence.length, c.id);
    assert.ok(c.tiers['1'] && c.tiers['0'], c.id);
    assert.ok(c.freshnessDays > 0, c.id);
    if (c.ownerQuestion) assert.ok(c.allowedEvidence.includes('owner_reported'), `${c.id} asks owner but disallows owner evidence`);
    if (c.ownerQuestion) assert.ok(c.ownerQuestion.options.some((o) => o.tier === 'not_verified'), `${c.id} must offer a "not sure" option`);
  }
});

test('missing evidence is never scored as zero', () => {
  const results = allNV();
  results[0] = { criterionId: 'maps.profile', status: 'scored', tier: 1, evidence: ev() };
  results[1] = { criterionId: 'maps.category', status: 'scored', tier: 1, evidence: ev() };
  const r = scoreSnapshot(base(results));
  const maps = r.categories.find((c) => c.id === 'maps')!;
  assert.equal(maps.earned, 8);
  assert.equal(maps.verifiedPoints, 8);
  assert.equal(maps.ratio, 1, 'unverified criteria must not drag the score down');
  assert.equal(maps.display, 20);
  assert.equal(maps.notVerified.length, 3);
});

test('all Not verified → no overall score, insufficient confidence, no offer pushed', () => {
  const r = scoreSnapshot(base(allNV()));
  assert.equal(r.overall.verifiedScore, null);
  assert.equal(r.overall.confidence, 'insufficient');
  assert.equal(r.recommendation.offer, null);
  for (const c of r.categories) assert.equal(c.display, null);
});

test('unchecked criteria are treated as Not verified with a warning', () => {
  const r = scoreSnapshot(base([{ criterionId: 'maps.profile', status: 'scored', tier: 1, evidence: ev() }]));
  assert.ok(r.warnings.some((w) => w.includes('website.speed not checked')));
});

test('category below minimum coverage shows Not verified instead of a number', () => {
  const r = scoreSnapshot(base([{ criterionId: 'maps.activity', status: 'scored', tier: 1, evidence: ev() }])); // 3/20 = 15% < 25%
  assert.equal(r.categories.find((c) => c.id === 'maps')!.display, null);
});

test('not_applicable criteria leave the denominator', () => {
  const r = scoreSnapshot(base([
    { criterionId: 'reviews.site_trust', status: 'not_applicable' },
    { criterionId: 'reviews.volume', status: 'scored', tier: 1, evidence: ev() },
  ]));
  assert.equal(r.categories.find((c) => c.id === 'reviews')!.applicablePoints, 17);
});

test('manual override applies, keeps the original, and needs reason + evidence', () => {
  const r = scoreSnapshot(base([{ criterionId: 'website.speed', status: 'scored', tier: 0.25, evidence: ev('2026-11-10', 'api_data'), override: { tier: 0.5, reason: 'Median of 5 runs after CDN fix', by: 'DR', at: '2026-11-11' } }]));
  assert.deepEqual(r.overrides[0], { criterionId: 'website.speed', from: 0.25, to: 0.5, reason: 'Median of 5 runs after CDN fix', by: 'DR', at: '2026-11-11' });
  assert.equal(r.categories.find((c) => c.id === 'website')!.earned, 2);
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'followup.speed', status: 'not_verified', override: { tier: 1, reason: 'trust me', by: 'DR', at: '2026-11-11' } }])), SnapshotValidationError);
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'website.speed', status: 'scored', tier: 0.25, evidence: ev('2026-11-10', 'api_data'), override: { tier: 1, reason: ' ', by: 'DR', at: '2026-11-11' } }])), SnapshotValidationError);
});

test('stale evidence lowers confidence', () => {
  const mk = (date: string) => categories.find((c) => c.id === 'website')!.criteria.map((c) => ({ criterionId: c.id, status: 'scored' as const, tier: 1 as const, evidence: { ...ev(date, c.id === 'website.speed' ? 'api_data' : 'public_observation') } }));
  const fresh = scoreSnapshot(base(mk('2026-11-10'))).categories.find((c) => c.id === 'website')!;
  const old = scoreSnapshot(base(mk('2026-01-10'))).categories.find((c) => c.id === 'website')!;
  assert.equal(fresh.confidence, 'high');
  assert.notEqual(old.confidence, 'high');
  assert.equal(old.stale.length, 5);
});

test('validation rejects bad input', () => {
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'nope', status: 'not_verified' }])), /Unknown criterion/);
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'maps.profile', status: 'scored', tier: 0.3 as never, evidence: ev() }])), /valid tier/);
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'maps.profile', status: 'scored', tier: 1 }])), /needs evidence/);
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'maps.profile', status: 'scored', tier: 1, evidence: ev('2026-11-10', 'owner_reported') }])), /not allowed/);
  assert.throws(() => scoreSnapshot(base([{ criterionId: 'maps.profile', status: 'not_verified' }, { criterionId: 'maps.profile', status: 'not_verified' }])), /Duplicate/);
});

test('recommendation maps weakest verified category → offer; 3+ weak → flagship', () => {
  const only = (id: string, tier: 0 | 1) => categories.find((c) => c.id === id)!.criteria.map((c) => ({ criterionId: c.id, status: 'scored' as const, tier, evidence: ev('2026-11-10', c.allowedEvidence[0]!) }));
  const r1 = scoreSnapshot(base([...only('maps', 0), ...only('reviews', 1), ...only('website', 1)]));
  assert.equal(r1.recommendation.offer, 'local-visibility-jumpstart');
  const r2 = scoreSnapshot(base([...only('maps', 0), ...only('reviews', 0), ...only('website', 0)]));
  assert.equal(r2.recommendation.offer, 'local-revenue-dominator');
  const r3 = scoreSnapshot(base([...only('maps', 1), ...only('reviews', 1), ...only('website', 1)]));
  assert.equal(r3.recommendation.offer, null);
});

test('fictional sample report computes the documented result', () => {
  const sample = JSON.parse(readFileSync(join(root, '17-Sample-Clients/fictional-hvac-snapshot.json'), 'utf8'));
  assert.equal(sample.input.business.fictional, true);
  const r = scoreSnapshot(sample.input);
  assert.equal(r.overall.verifiedScore, 51);
  assert.equal(r.overall.verifiedPoints, 93);
  const fu = r.categories.find((c) => c.id === 'followup')!;
  assert.equal(fu.notVerified.length, 2, 'speed + quotes stay Not verified');
  assert.equal(r.recommendation.offer, 'local-revenue-dominator');
});

test('impact scenarios are labelled hypothetical and computed correctly', () => {
  const s = impactScenarios({ monthlyInquiries: 90, closeRate: 0.3, averageJobValue: 420 });
  assert.equal(s.length, 3);
  assert.equal(s[1]!.extraJobsPerMonth, 2.7);
  assert.equal(s[1]!.extraRevenuePerMonth, 1134);
  for (const x of s) assert.match(x.assumption, /hypothetical/);
});

test('owner self-check: "not sure" becomes Not verified, answers become owner-reported evidence', () => {
  const r = scoreOwnerAnswers({ 'followup.speed': 'not_verified', 'followup.quotes': 0.5 }, '2026-11-16');
  assert.deepEqual(r[0], { criterionId: 'followup.speed', status: 'not_verified' });
  assert.equal(r[1]!.evidence!.type, 'owner_reported');
});
