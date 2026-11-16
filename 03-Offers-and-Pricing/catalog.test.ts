import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addOnById, addOns, offerById, offers } from './offer-catalog.ts';
import { flagshipComparison, margins } from './cost-model.ts';

test('six offers A–F with the spec’s proposed launch prices', () => {
  const expected: Record<string, [number, number]> = { A: [497, 197], B: [997, 397], C: [397, 247], D: [750, 397], E: [1497, 297], F: [2500, 997] };
  assert.equal(offers.length, 6);
  for (const o of offers) assert.deepEqual([o.price.setup, o.price.monthly], expected[o.code], o.name);
});

test('spec service lists are complete', () => {
  const counts: Record<string, number> = { A: 6, B: 8, C: 6, D: 7, E: 7, F: 8 };
  for (const o of offers) assert.equal(o.services.length, counts[o.code], o.name);
});

test('prices are proposed until the owner approves (with who/when recorded)', () => {
  for (const o of offers) {
    assert.ok(['proposed', 'approved'].includes(o.price.status));
    if (o.price.status === 'approved') assert.ok(o.price.approvedBy && o.price.approvedOn, `${o.id} approved without record`);
  }
});

test('every offer has all 14 required artefacts populated', () => {
  for (const o of offers) {
    const required: unknown[][] = [
      o.customer.whatYouGet, o.fulfillment.setup, o.fulfillment.monthly, o.eligibility.goodFit, o.eligibility.notAFit,
      o.cost.notes, o.scopeLimits, o.exclusions, o.requiredInputs, o.onboarding, o.reporting, o.upgrades, o.offboarding, o.compliance,
    ];
    required.forEach((arr, i) => assert.ok(arr.length > 0, `${o.id} field #${i} empty`));
    assert.ok(o.customer.headline && o.customer.summary && o.customer.bestFor);
    assert.ok(o.hours.setup.min <= o.hours.setup.max && o.hours.monthly.min <= o.hours.monthly.max);
  }
});

test('add-on prices match the spec', () => {
  assert.deepEqual(addOnById('revenue-reactivation-sprint')?.pricing, { kind: 'project-range', min: 497, max: 997 });
  assert.deepEqual(addOnById('competitor-intelligence-pulse')?.pricing, { kind: 'monthly', amount: 149 });
  assert.deepEqual(addOnById('local-authority-content-studio')?.pricing, { kind: 'monthly-range', min: 397, max: 697 });
  assert.equal(addOns.length, 8);
});

test('upgrade paths point at real offers or add-ons', () => {
  for (const o of offers) for (const u of o.upgrades) assert.ok(offerById(u.to) || addOnById(u.to), `${o.id} → ${u.to}`);
});

test('customer-facing copy makes no guarantee or hype claims', () => {
  const banned = /guarantee|#1|number one|10x|dominate (google|ai)|rank first|instant results/i;
  for (const o of offers) {
    for (const s of [o.tagline, o.customer.headline, o.customer.summary, o.customer.bestFor, ...o.customer.whatYouGet]) assert.doesNotMatch(s, banned, `${o.id}: "${s}"`);
  }
});

test('AI offer forbids placement guarantees; reputation offer forbids gating/incentives; lead offer discloses usage costs', () => {
  assert.ok(offerById('ai-discovery-accelerator')!.compliance.some((c) => /never guarantee placement/i.test(c)));
  const rep = offerById('reputation-revenue-engine')!.compliance.join(' ');
  assert.match(rep, /incentivise/i);
  assert.match(rep, /selectively/i);
  assert.match(rep, /suppress negative/i);
  assert.ok(offerById('lead-rescue-booking-engine')!.cost.passThrough);
});

test('cost model computes margins and the flagship replaces a higher combined price', () => {
  const m = margins(offerById('local-visibility-jumpstart')!, 45);
  assert.ok(m.monthlyMargin > 0 && m.monthlyMargin < 1);
  const fc = flagshipComparison();
  assert.equal(fc.monthlySum, 197 + 397 + 247 + 397 + 297);
  assert.ok(fc.flagshipMonthly < fc.monthlySum);
});
