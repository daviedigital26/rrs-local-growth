import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { allCriteria } from '../../04-Audits-and-Scorecards/snapshot/framework.ts';
import { scoreSnapshot } from '../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { bundleIntake, intakeWorkflow } from '../../12-Automations/n8n/build-workflows.ts';
import { dedupeKey, normalizePhone, normalizeWebsite, processSubmission, shortHash } from './lead-intake.ts';
import { snapshotDraftFromLead } from './lead-to-snapshot.ts';

const NOW = '2026-11-17T18:00:00.000Z';
const valid = () => ({
  form: 'snapshot_request',
  submitted_at: '2026-11-17T17:59:30.000Z',
  form_started_at: '2026-11-17T17:58:00.000Z',
  company_website: '',
  business_name: '  Mesquite   Ridge Comfort Co. ',
  website: 'WWW.Example.com/',
  city: 'Surprise',
  industry: 'home-services',
  concerns: ['Not enough reviews', '<script>bad</script>'],
  self_check: { 'followup.speed': 0.75, 'followup.quotes': 'not_verified', 'followup.missed_calls': 0.3, 'maps.profile': 1 },
  contact_name: 'Pat Owner',
  email: 'Pat@Example.COM',
  phone: '(602) 555-0147',
  preferred_channel: 'text',
  consent_contact: true,
  consent_sms: true,
  consent_text: 'I agree that Reale Revenue Systems may contact me…',
  attribution: { utm_source: 'google', utm_campaign: 'launch', evil: 'x' },
  interest: 'lead-rescue-booking-engine',
  unexpected_field: 'dropped',
});

test('accepts a valid Snapshot request and normalises identity fields', () => {
  const r = processSubmission(valid(), NOW);
  assert.equal(r.status, 'accepted', r.errors.join('; '));
  const rec = r.record!;
  assert.equal(rec.business.name, 'Mesquite Ridge Comfort Co.');
  assert.equal(rec.business.domain, 'example.com');
  assert.equal(rec.business.website, 'https://www.example.com');
  assert.equal(rec.contact.email, 'pat@example.com');
  assert.equal(rec.contact.phone, '+16025550147');
  assert.deepEqual(rec.concerns, ['Not enough reviews'], 'unknown concern values dropped');
  assert.deepEqual(rec.self_check, { 'followup.speed': 0.75, 'followup.quotes': 'not_verified' }, 'invalid tiers and non-owner criteria dropped');
  assert.deepEqual(rec.attribution, { utm_source: 'google', utm_campaign: 'launch' });
  assert.equal(rec.dedupe_key, 'domain:example.com');
  assert.equal(rec.signals.fill_seconds, 90);
  assert.equal(rec.consent.sms, true);
  assert.ok(!('unexpected_field' in (rec as unknown as Record<string, unknown>)));
  assert.equal(rec.lead_id, processSubmission(valid(), NOW).record!.lead_id, 'lead_id is deterministic');
});

test('rejects invalid submissions with specific errors', () => {
  const cases: Array<[Record<string, unknown>, RegExp]> = [
    [{ business_name: '' }, /business_name is required/],
    [{ email: 'nope' }, /email is invalid/],
    [{ consent_contact: false }, /consent_contact must be true/],
    [{ consent_sms: false }, /requires consent_sms/],
    [{ phone: '', preferred_channel: 'phone' }, /requires a phone number/],
    [{ industry: 'casino' }, /industry is invalid/],
    [{ website: 'javascript:alert(1)' }, /website is invalid/],
    [{ phone: '123' }, /phone is invalid/],
  ];
  for (const [patch, re] of cases) {
    const r = processSubmission({ ...valid(), ...patch }, NOW);
    assert.equal(r.status, 'invalid', JSON.stringify(patch));
    assert.ok(r.errors.some((e) => re.test(e)), `${JSON.stringify(patch)} → ${r.errors}`);
  }
  assert.equal(processSubmission('not an object', NOW).status, 'invalid');
  assert.equal(processSubmission({ form: 'other' }, NOW).status, 'invalid');
});

test('spam: honeypot and too-fast fills are dropped; missing timing is accepted but flagged', () => {
  assert.equal(processSubmission({ ...valid(), company_website: 'http://spam' }, NOW).status, 'spam');
  assert.equal(processSubmission({ ...valid(), form_started_at: '2026-11-17T17:59:29.000Z' }, NOW).status, 'spam');
  const noTiming = processSubmission({ ...valid(), form_started_at: undefined }, NOW);
  assert.equal(noTiming.status, 'accepted');
  assert.equal(noTiming.record!.signals.no_timing, true);
});

test('contact form path', () => {
  const r = processSubmission({ form: 'contact', submitted_at: '2026-11-17T17:59:30Z', form_started_at: '2026-11-17T17:59:00Z', contact_name: 'Sam', email: 's@x.co', topic: 'profit-leak-audit', message: 'Hi there', consent_contact: 'yes', consent_text: 'I agree…' }, NOW);
  assert.equal(r.status, 'accepted', r.errors.join());
  assert.equal(r.record!.topic, 'profit-leak-audit');
  assert.equal(r.record!.dedupe_key, 'email:s@x.co');
  assert.equal(processSubmission({ form: 'contact', contact_name: 'Sam', email: 's@x.co', consent_contact: true, consent_text: 'x' }, NOW).status, 'invalid');
});

test('normalisers and dedupe keys', () => {
  assert.equal(normalizePhone('602.555.0147'), '+16025550147');
  assert.equal(normalizePhone('1 602 555 0147'), '+16025550147');
  assert.equal(normalizePhone('555-01'), null);
  assert.equal(normalizeWebsite('https://user:pw@example.com'), null);
  assert.equal(normalizeWebsite('localhost'), null);
  assert.equal(dedupeKey({ name: 'Mesquite Ridge Comfort Co.', city: 'Surprise' }), dedupeKey({ name: 'MESQUITE RIDGE COMFORT CO', city: 'surprise ' }));
  assert.match(shortHash('abc'), /^[0-9a-z]{7,}$/);
});

test('lead → Snapshot draft: owner answers become owner-reported evidence, everything else Not verified', () => {
  const lead = processSubmission(valid(), NOW).record!;
  const draft = snapshotDraftFromLead(lead, '2026-11-18');
  assert.equal(draft.input.results.length, allCriteria.length);
  const speed = draft.input.results.find((r) => r.criterionId === 'followup.speed')!;
  assert.equal(speed.status, 'scored');
  assert.equal(speed.evidence?.type, 'owner_reported');
  assert.equal(draft.input.results.filter((r) => r.status === 'not_verified').length, allCriteria.length - 1);
  assert.equal(draft.input.business.fictional, false);
  assert.equal(draft.input.business.area, 'Surprise', 'city as entered; no assumed state');
  assert.equal(draft.lead?.source, 'google');
  const scored = scoreSnapshot(draft.input);
  assert.equal(scored.overall.verifiedScore, null, 'a fresh draft never shows a score');
  assert.equal(scored.recommendation.offer, null);
});

test('n8n workflow: inactive, credential-free, wired correctly, env-var secrets', () => {
  const wf = intakeWorkflow(bundleIntake());
  assert.equal(wf.active, false);
  const json = JSON.stringify(wf);
  assert.ok(!/"credentials"/.test(json), 'no credentials embedded');
  assert.ok(!/(api[_-]?key|secret|password|bearer)\s*[:=]/i.test(json), 'no secrets');
  const names = new Set(wf.nodes.map((n) => n.name));
  assert.equal(names.size, wf.nodes.length, 'unique node names');
  for (const [from, c] of Object.entries(wf.connections)) {
    assert.ok(names.has(from), from);
    for (const branch of c.main) for (const t of branch) assert.ok(names.has(t.node), `${from} → ${t.node}`);
  }
  for (const n of wf.nodes) assert.ok(n.id && n.type.startsWith('n8n-nodes-base.') && n.typeVersion && n.position.length === 2, n.name);
  assert.match(json, /\$env\.RRS_CRM_WEBHOOK_URL/);
  const config = JSON.stringify(wf.nodes.map((n) => n.type === 'n8n-nodes-base.code' ? { ...n, parameters: {} } : n));
  const urls = config.match(/https?:\/\/[^"\\ ]+/g) ?? [];
  assert.ok(urls.every((u) => u.includes('example-rrs-domain.com')), `unexpected URLs: ${urls}`);
});

test('n8n Code node runs standalone and matches the TypeScript validator', () => {
  const wf = intakeWorkflow(bundleIntake());
  const code = (wf.nodes.find((n) => n.type === 'n8n-nodes-base.code')!.parameters as { jsCode: string }).jsCode;
  const run = (bodies: unknown[]) => runInNewContext(`(function(){ ${code} })()`, { $input: { all: () => bodies.map((b) => ({ json: { body: b } })) }, URL, Date, JSON, Math, Number, String, Array, Object }) as Array<{ json: { status: string; record: { dedupe_key: string } | null } }>;
  const now = new Date();
  const fresh = { ...valid(), submitted_at: now.toISOString(), form_started_at: new Date(now.getTime() - 60_000).toISOString() };
  const out = run([fresh, { ...fresh, company_website: 'x' }, { ...fresh, email: 'bad' }]);
  assert.deepEqual(out.map((o) => o.json.status), ['accepted', 'spam', 'invalid']);
  assert.equal(out[0]!.json.record!.dedupe_key, 'domain:example.com');
});
