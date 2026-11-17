import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { applyCallLog } from '../../05-Lead-Research/Scoring/call-log.ts';
import { scoreAll, scoreProspect } from '../../05-Lead-Research/Scoring/icp-engine.ts';
import { fromLegacyCsv, mergeProspects } from '../../05-Lead-Research/Scoring/prospect.ts';
import { loadInput } from '../../05-Lead-Research/Scoring/score-cli.ts';
import { DEFAULT_SETTINGS, alternativeFor, scriptText, scriptsFor } from '../Call-Scripts/call-scripts.ts';
import { OBJECTION_REPLIES } from '../Objections/objections.ts';
import { buildQueuePage, scriptSafeJson } from './build-queue.ts';
import { toQueueDataset } from './dataset.ts';
import { OBJECTIONS, OUTCOMES, QUEUE_CONFIG } from './queue-config.ts';
import { buildFromInputs, outcomesMarkdown } from './queue-cli.ts';
import { addBusinessDays, buildQueue, calendar, localClock, mergeEvents, newEventId, outcomeStats, reduceLead, toCallLog, validateCallLog, type CallEvent, type QueueLead } from './queue-logic.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const BATCH = join(root, '17-Sample-Clients/fictional-pm-lead-batch.json');
const EXPORT_CSV = join(root, '17-Sample-Clients/fictional-pm-tracker-export.csv');
const SAMPLE_DATASET = join(root, '17-Sample-Clients/lead-scoring/fictional-call-queue.json');
const AS_OF = '2026-11-17';
// Tue 17 Nov 2026, 10:30 AM in Phoenix.
const NOW = '2026-11-17T17:30:00.000Z';

const dataset = () => buildFromInputs([BATCH, EXPORT_CSV], { checkedAt: '2026-11-10', asOf: AS_OF }).dataset;
const byName = (leads: QueueLead[], prefix: string) => leads.find((l) => l.name.startsWith(prefix))!;
let n = 0;
const ev = (lead: string, at: string, extra: Partial<CallEvent>): CallEvent => ({ id: `ev_test_${String(++n).padStart(4, '0')}`, lead, at, type: 'outcome', ...extra });

test('dates: business days skip weekends; local clock follows the business’s time zone', () => {
  assert.equal(addBusinessDays('2026-11-20', 1), '2026-11-23', 'Fri + 1 business day = Mon');
  assert.equal(addBusinessDays('2026-11-17', 5), '2026-11-24');
  const az = localClock('AZ', NOW);
  const ca = localClock('CA', NOW);
  assert.equal(az.time, '10:30 AM');
  assert.equal(ca.time, '9:30 AM', 'California is an hour behind Arizona in winter');
  assert.equal(az.status, 'open');
  assert.equal(localClock('AZ', '2026-11-17T13:00:00Z').status, 'early');
  assert.equal(localClock('AZ', '2026-11-18T01:00:00Z').status, 'late');
  assert.equal(localClock('AZ', '2026-11-21T18:00:00Z').status, 'weekend');
  assert.equal(localClock(null, NOW).tz, QUEUE_CONFIG.ownerTimeZone);
});

test('state: unanswered calls follow the cadence, then park; a conversation resets it', () => {
  const lead = byName(dataset().leads, 'Sunbelt');
  const days = ['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-25', '2026-12-02'];
  const evs: CallEvent[] = [];
  const expectNext = ['2026-11-18', '2026-11-20', '2026-11-25', '2026-12-02'];
  days.forEach((d, i) => {
    evs.push(ev(lead.id, `${d}T17:00:00Z`, { outcome: i % 2 ? 'voicemail' : 'no_answer' }));
    const s = reduceLead(lead, evs);
    if (i < 4) { assert.equal(s.follow_up, expectNext[i], `after try ${i + 1}`); assert.equal(s.parked, false); }
    else { assert.equal(s.parked, true); assert.equal(s.follow_up, null); assert.equal(s.unreached, QUEUE_CONFIG.maxAttempts); }
  });
  assert.equal(reduceLead(lead, evs).stage, 'attempted');
  const talked = reduceLead(lead, [...evs, ev(lead.id, '2026-12-03T17:00:00Z', { outcome: 'interested' })]);
  assert.equal(talked.parked, false);
  assert.equal(talked.stage, 'contacted');
  assert.equal(talked.follow_up, '2026-12-07', 'interested: follow up in 2 business days');
});

test('state: outcomes set stages and dates without dragging a deal backwards', () => {
  const lead = byName(dataset().leads, 'Sunbelt');
  const booked = [ev(lead.id, NOW, { outcome: 'audit_booked', date: '2026-11-20', value: 500 })];
  let s = reduceLead(lead, booked);
  assert.deepEqual([s.stage, s.follow_up, s.value], ['audit_booked', '2026-11-20', 500]);
  s = reduceLead(lead, [...booked, ev(lead.id, '2026-11-18T17:00:00Z', { outcome: 'no_answer' })]);
  assert.equal(s.stage, 'audit_booked', 'a missed call never undoes a booking');
  assert.equal(reduceLead(lead, [ev(lead.id, NOW, { outcome: 'callback', date: '2026-11-19' })]).follow_up, '2026-11-19');
  assert.equal(reduceLead(lead, [ev(lead.id, NOW, { outcome: 'not_now', permission: true })]).follow_up, '2027-02-15');
  const noPerm = reduceLead(lead, [ev(lead.id, NOW, { outcome: 'not_now', permission: false })]);
  assert.deepEqual([noPerm.stage, noPerm.follow_up], ['declined', null]);
  const no = reduceLead(lead, [ev(lead.id, NOW, { outcome: 'not_interested', objection: 'happy' })]);
  assert.deepEqual([no.stage, no.objection], ['declined', 'happy']);
  const back = reduceLead(lead, [ev(lead.id, NOW, { outcome: 'not_interested' }), ev(lead.id, '2026-12-01T17:00:00Z', { outcome: 'interested' })]);
  assert.equal(back.stage, 'contacted', 'they changed their mind: reopened');
  const dnc = reduceLead(lead, [ev(lead.id, NOW, { outcome: 'do_not_call' }), ev(lead.id, '2026-12-01T17:00:00Z', { outcome: 'interested' })]);
  assert.equal(dnc.stage, 'do_not_contact', 'do-not-call is never undone by a later outcome');
  assert.equal(reduceLead(lead, [ev(lead.id, NOW, { outcome: 'wrong_number' })]).bad_number, true);
  const won = reduceLead(lead, [ev(lead.id, NOW, { type: 'stage', stage: 'build_sold' }), ev(lead.id, NOW, { type: 'value', value: 2500 })]);
  assert.deepEqual([won.stage, won.value], ['build_sold', 2500]);
});

test('queue: due first, then new by priority; gated leads never appear', () => {
  const ds = dataset();
  const q = buildQueue(ds.leads, [], NOW);
  assert.deepEqual(q.due.map((i) => i.lead.name.split(' (')[0]), ['Saguaro Lane Property Co.', 'Copper Mesa Rentals']);
  assert.equal(q.due[0]!.reason, 'Called before: no follow-up date');
  assert.equal(q.due[1]!.reason, 'Audit booked: set the date');
  assert.deepEqual(q.fresh.map((i) => i.lead.band), ['p1', 'p2', 'p2']);
  assert.equal(q.next?.lead.name, 'Saguaro Lane Property Co. (fictional)');
  assert.deepEqual(q.research.map((i) => i.lead.name), ['Ocotillo Management Group (fictional)']);
  assert.deepEqual(q.closed.map((i) => i.reason), ['Declined']);
  // Businesses that are open right now go first; the rest keep priority order.
  const at = (utc: string) => buildQueue(ds.leads, [], `2026-11-17T${utc}:00Z`).fresh;
  const before = at('14:30'); // 7:30 AM Arizona, 6:30 AM San Diego: nobody open
  assert.equal(before[0]!.lead.name, 'Sunbelt Leasing Partners (fictional)');
  assert.ok(before.every((i) => i.clock.status === 'early'));
  const azOnly = at('15:30'); // 8:30 AM Arizona open, 7:30 AM San Diego not yet
  assert.deepEqual(azOnly.map((i) => i.lead.state), ['AZ', 'AZ', 'CA'], 'the California P1 waits until it opens');
  const all = at('16:30'); // everyone open: priority order again
  assert.equal(all[0]!.lead.band, 'p1');
});

test('queue: today’s calls, follow-ups, pipeline and closed value', () => {
  const ds = dataset();
  const sag = byName(ds.leads, 'Saguaro'), sun = byName(ds.leads, 'Sunbelt'), cop = byName(ds.leads, 'Copper');
  const evs = [
    ev(sag.id, NOW, { outcome: 'no_answer' }),
    ev(sun.id, NOW, { outcome: 'audit_booked', date: '2026-11-19', value: 750 }),
    ev(cop.id, '2026-11-17T18:00:00Z', { type: 'stage', stage: 'retainer_active' }),
    ev(cop.id, '2026-11-17T18:01:00Z', { type: 'value', value: 1200 }),
  ];
  const q = buildQueue(ds.leads, evs, NOW);
  assert.equal(q.stats.callsToday, 2);
  assert.equal(q.stats.reachedToday, 1);
  assert.equal(q.stats.bookedToday, 1);
  assert.equal(q.stats.pipelineValue, 750);
  assert.equal(q.stats.closedValue, 1200);
  assert.deepEqual(q.doneToday.map((i) => i.lead.id).sort(), [sag.id, sun.id].sort());
  assert.ok(!q.due.some((i) => i.lead.id === sag.id), 'called today: out of the queue until its follow-up');
  // Saguaro was already "Attempted" in the tracker, so this is its 2nd try: next one in 2 business days.
  assert.ok(q.later.some((i) => i.lead.id === sag.id && i.state.follow_up === '2026-11-19'));
  const cal = calendar(ds.leads, evs, NOW);
  assert.deepEqual(cal.map((d) => [d.date, d.items.length]), [['2026-11-19', 2]]);
  assert.ok(!buildQueue(ds.leads, evs, '2026-11-18T17:30:00Z').due.some((i) => i.lead.id === sag.id));
  const due = buildQueue(ds.leads, evs, '2026-11-19T17:30:00Z');
  assert.ok(due.due.some((i) => i.lead.id === sag.id && !i.overdue), 'follow-up due on its day');
  const later = buildQueue(ds.leads, evs, '2026-11-20T17:30:00Z');
  assert.ok(later.due.find((i) => i.lead.id === sag.id)?.overdue, 'missed follow-ups show as overdue');
});

test('call log: export, schema, validation, merge, suppression', () => {
  const ds = dataset();
  const sag = byName(ds.leads, 'Saguaro'), sun = byName(ds.leads, 'Sunbelt');
  const e1: CallEvent = { id: newEventId(NOW, () => 0.5), lead: sag.id, at: NOW, type: 'outcome', outcome: 'do_not_call' };
  const e2: CallEvent = { id: newEventId('2026-11-17T17:31:00.000Z', () => 0.25), lead: sun.id, at: '2026-11-17T17:31:00.000Z', type: 'outcome', outcome: 'callback', date: '2026-11-19', note: 'Ask for Pat (fictional)' };
  assert.match(e1.id, /^ev_20261117173000_[0-9a-z]{6}$/);
  const log = toCallLog(ds.leads, [e2, e1], NOW);
  assert.deepEqual(log.events.map((e) => e.id), [e1.id, e2.id], 'sorted by time');
  assert.deepEqual(log.suppression, [{ lead: sag.id, name: sag.name, phone: sag.phone }]);
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(JSON.parse(readFileSync(join(here, 'call-log.schema.json'), 'utf8')));
  assert.ok(validate(log), JSON.stringify(validate.errors));
  assert.deepEqual(validateCallLog(log), []);
  assert.deepEqual(validateCallLog({ schema: 'x' }), ['not a call log (schema rrs.call-log/1)']);
  assert.match(validateCallLog({ ...log, events: [{ ...e1, outcome: 'maybe' }] })[0]!, /unknown outcome "maybe"/);
  assert.equal(mergeEvents([e1], [e1, e2]).length, 2, 'merging is idempotent');
});

test('scripts: honest by construction', () => {
  const ds = dataset();
  const sag = byName(ds.leads, 'Saguaro');      // verified "unanswered" theme, 1 of 2 reviews
  const iron = byName(ds.leads, 'Ironwood');    // process theme
  const ocot = byName(ds.leads, 'Ocotillo');    // no review evidence
  const all = [sag, iron, ocot].flatMap((l) => scriptsFor(l, null, { ...DEFAULT_SETTINGS, callerName: 'Sam' }));
  for (const sc of all) {
    const text = scriptText(sc);
    assert.doesNotMatch(text, /\$\s?\d|\d+\s?%|guarantee|clients? (like|such as)|last (week|month) we/i, `${sc.id}: no prices, stats, guarantees or client stories`);
    assert.match(text, /Sam/);
    if (sc.kind === 'email') assert.match(text, /reply “no thanks” and I won’t contact you again/, `${sc.id} has an opt-out line`);
  }
  const opener = (l: QueueLead) => scriptText(scriptsFor(l, null, DEFAULT_SETTINGS)[0]!);
  assert.match(opener(sag), /One of your public reviews mentions calls or messages not getting returned/);
  assert.doesNotMatch(opener(ocot), /review/i, 'no evidence: ask, never claim');
  assert.match(opener(ocot), /couldn't tell how an after-hours maintenance call gets handled/);
  assert.match(opener(sag), /\(your name\)/, 'placeholder until the owner adds a name');
  const email = scriptsFor(sag, null, DEFAULT_SETTINGS).find((s) => s.id === 'email1')!;
  assert.ok(email.warnings.some((w) => /mailing address/.test(w)), 'warns when the postal address is missing');
  const withAddr = scriptsFor(sag, null, { ...DEFAULT_SETTINGS, callerName: 'Sam', mailingAddress: '123 Example St, Phoenix, AZ (fictional)' }).find((s) => s.id === 'email1')!;
  assert.deepEqual(withAddr.warnings, []);
  assert.match(scriptText(withAddr), /123 Example St/);
  assert.match(opener({ ...sag, review_sample: { size: 5, with_complaints: 3 } }), /A few of your public reviews mention/);
  // Billing-only complaints (low relevance) are never an opening line.
  assert.doesNotMatch(opener({ ...sag, themes: [{ id: 'billing', label: 'fee or deposit disputes', phrase: 'withheld', relevance: 0.25 }] }), /review/i);
  assert.match(scriptText(scriptsFor(sag, null, { ...DEFAULT_SETTINGS, ask: 'audit' })[0]!), /short paid audit/);
  assert.match(scriptText(scriptsFor(sag, null, DEFAULT_SETTINGS)[0]!), /free Local Revenue Opportunity Snapshot/);
  const alt = scriptText(alternativeFor('reviews', sag, DEFAULT_SETTINGS));
  assert.match(alt, /Reputation Revenue Engine™/);
  assert.match(alt, /You said it was fine for me to send this/, 'permission-based');
  assert.deepEqual(OBJECTION_REPLIES.map((o) => o.id).sort(), OBJECTIONS.map((o) => o.id).sort(), 'every objection chip has a reply');
  assert.equal(OUTCOMES.length, 10);
});

test('scoring loop: a call log changes priorities the right way', () => {
  const inputs = [BATCH, EXPORT_CSV].flatMap((f) => loadInput(f, { checkedAt: '2026-11-10' }).prospects);
  const { prospects } = mergeProspects(inputs);
  const id = (prefix: string) => prospects.find((p) => p.name.startsWith(prefix))!.prospect_id;
  const log = {
    schema: 'rrs.call-log/1', exported_at: NOW, queue_version: QUEUE_CONFIG.version, suppression: [], events: [
      { id: 'ev_1', lead: id('Sunbelt'), at: NOW, type: 'outcome', outcome: 'not_interested', objection: 'happy' },
      { id: 'ev_2', lead: id('Desert Key'), at: NOW, type: 'outcome', outcome: 'do_not_call' },
      { id: 'ev_3', lead: id('Ironwood'), at: NOW, type: 'outcome', outcome: 'wrong_number' },
      { id: 'ev_4', lead: id('Saguaro'), at: NOW, type: 'outcome', outcome: 'audit_booked', date: '2026-11-20', value: 450 },
      { id: 'ev_5', lead: 'prs_unknown', at: NOW, type: 'outcome', outcome: 'no_answer' },
    ],
  };
  const r = applyCallLog(prospects, log);
  assert.deepEqual(r.errors, []);
  assert.equal(r.applied, 4);
  assert.deepEqual(r.unmatched, ['prs_unknown']);
  const band = (prefix: string) => scoreProspect(r.prospects.find((p) => p.name.startsWith(prefix))!, { asOf: AS_OF }).priority;
  assert.equal(band('Sunbelt').band, 'closed');
  assert.equal(band('Desert Key').band, 'do_not_contact');
  assert.equal(band('Saguaro').band, 'in_progress');
  const iron = r.prospects.find((p) => p.name.startsWith('Ironwood'))!;
  assert.equal(iron.phone, null, 'wrong number removed');
  assert.match(iron.outreach.notes, /Wrong number logged 2026-11-17/);
  const sag = r.prospects.find((p) => p.name.startsWith('Saguaro'))!;
  assert.deepEqual([sag.outreach.follow_up, sag.outreach.deal_value], ['2026-11-20', 450]);
  assert.deepEqual(applyCallLog(prospects, { schema: 'nope' }).errors, ['not a call log (schema rrs.call-log/1)']);
});

test('tracker v2 CSV: Audit → Build → Retainer stages, follow-ups, deal values, last activity', () => {
  const csv = [
    'Name,City,Phone,Rating,Reviews,Score,Tier,Status,NextFollowUp,DealValue,LastActivity',
    '"A Homes (fictional)","Mesa, AZ","+1 480-555-0111",4.4,120,60,hot,"Audit Delivered","2026-11-20",397,"2026-11-12: Walked through findings"',
    '"B Rentals (fictional)","Tempe, AZ","+1 480-555-0112",4.1,80,68,hot,"Retainer Active","",1500,""',
    '"C Property (fictional)","Peoria, AZ","+1 623-555-0113",4.0,60,52,warm,"Audit Booked","11/20/2026",0,""',
  ].join('\n');
  const r = fromLegacyCsv(csv);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.prospects.map((p) => p.outreach.status), ['audit_delivered', 'retainer_active', 'audit_booked']);
  assert.deepEqual([r.prospects[0]!.outreach.follow_up, r.prospects[0]!.outreach.deal_value], ['2026-11-20', 397]);
  assert.equal(r.prospects[0]!.outreach.notes, 'Last activity: 2026-11-12: Walked through findings');
  assert.equal(r.prospects[2]!.outreach.deal_value, null, 'zero means no value');
  assert.match(r.warnings[0]!.message, /NextFollowUp "11\/20\/2026" is not YYYY-MM-DD/);
  const bands = scoreAll(r.prospects, { asOf: AS_OF }).map((x) => [x.prospect.name[0], x.result.priority.gate]);
  assert.deepEqual(bands.sort(), [['A', 'Audit delivered'], ['B', 'Customer (retainer)'], ['C', 'Audit booked']]);
});

test('dataset + page: sample dataset is current; page embeds data safely', () => {
  const ds = dataset();
  assert.equal(readFileSync(SAMPLE_DATASET, 'utf8'), JSON.stringify(ds, null, 2) + '\n', 'run `npm run leads:sample` and commit the result');
  assert.equal(ds.schema, 'rrs.call-queue/1');
  assert.equal(ds.fictional, true);
  const sag = byName(ds.leads, 'Saguaro');
  assert.equal(sag.start.stage, 'attempted');
  assert.deepEqual(sag.review_sample, { size: 2, with_complaints: 1 });
  assert.equal(byName(ds.leads, 'Palo').start.stage, 'declined');
  assert.equal(byName(ds.leads, 'Copper').start.stage, 'audit_booked');
  const evil = toQueueDataset([], AS_OF);
  evil.leads = [{ ...sag, name: '</script><script>alert(1)</script>' }];
  const html = buildQueuePage({ dataset: evil });
  assert.equal(html.match(/<\/script>/gi)!.length, 2, 'only the real closing tags: data cannot break out');
  assert.match(scriptSafeJson({ a: '</script>' }), /\\u003c\/script>/);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.doesNotMatch(buildQueuePage(), /id="rrs-queue-data"/, 'the hosted page carries no lead data');
});

test('outcomes report: grouped by priority, review signal and old tier', () => {
  const ds = dataset();
  const sag = byName(ds.leads, 'Saguaro');
  const md = outcomesMarkdown(ds, [ev(sag.id, NOW, { outcome: 'audit_booked', date: '2026-11-20' })]);
  assert.match(md, /Too few calls to retune/);
  assert.match(md, /\| P1: call first \| 2 \| 1 \| 1 \| 100% \| 1 \| 0 \|/);
  const rows = outcomeStats(ds.leads, [], 'old_tier');
  assert.ok(rows.some((r) => r.group === 'hot'));
});
