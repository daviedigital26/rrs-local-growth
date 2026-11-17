import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scoreSnapshot } from '../snapshot/engine.ts';
import { allCriteria, categories, FRAMEWORK_VERSION } from '../snapshot/framework.ts';
import type { SnapshotDocument } from '../snapshot/report/model.ts';
import { processSubmission } from '../../05-Lead-Research/intake/lead-intake.ts';
import { snapshotDraftFromLead } from '../../05-Lead-Research/intake/lead-to-snapshot.ts';
import { buildScorecard, importScorecard, readJson, readValues, recalcWithLibreOffice, ROOT, SAMPLE_PATH, TEMPLATE_PATH } from './scorecard.ts';

const sample = readJson<SnapshotDocument>(join(ROOT, '17-Sample-Clients/fictional-hvac-snapshot.json'));
const tmp = () => mkdtempSync(join(tmpdir(), 'rrs-sc-test-'));

/** Edit cells of a workbook with openpyxl (keeps formulas and validation). */
function editCells(file: string, edits: Array<[sheet: string, findId: string | null, header: string | null, cell: string | null, value: unknown]>) {
  const dir = tmp();
  const script = join(dir, 'edit.py');
  writeFileSync(script, `
import json, sys, datetime
from openpyxl import load_workbook
path, edits = sys.argv[1], json.loads(sys.argv[2])
wb = load_workbook(path)
for sheet, find_id, header, cell, value in edits:
    ws = wb[sheet]
    if isinstance(value, str) and value.startswith('DATETIME:'):
        value = datetime.datetime.fromisoformat(value[9:])
    if cell:
        ws[cell] = value
        continue
    hdr = {str(ws.cell(row=4, column=c).value): c for c in range(1, ws.max_column + 1)}
    for r in range(5, ws.max_row + 1):
        if ws.cell(row=r, column=1).value == find_id:
            ws.cell(row=r, column=hdr[header]).value = value  # cell(value=None) would silently skip
wb.save(path)
`);
  const r = spawnSync('python3', ['-I', script, file, JSON.stringify(edits)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

const norm = (x: unknown) => JSON.parse(JSON.stringify(x));

test('committed template matches the current framework and is all Not verified', () => {
  const res = importScorecard(TEMPLATE_PATH);
  assert.deepEqual(res.errors, ["'Start here'!B5: Business name is required"], 'blank template only lacks business details');
  assert.equal(Object.keys(res.rows).length, allCriteria.length);
  assert.ok(res.document!.input.results.every((r) => r.status === 'not_verified'), 'default status is Not verified');
  const props = spawnSync('python3', ['-I', '-c', 'import sys\nfrom openpyxl import load_workbook\nprint(load_workbook(sys.argv[1]).properties.keywords)', TEMPLATE_PATH], { encoding: 'utf8' });
  assert.match(props.stdout, new RegExp(`framework-${FRAMEWORK_VERSION.replace(/\./g, '\\.')}`), 'template regenerated for this framework version (npm run scorecards)');
});

test('round trip: Snapshot JSON → workbook → import is lossless and scores identically', () => {
  const file = join(tmp(), 'rt.xlsx');
  buildScorecard(file, sample);
  const res = importScorecard(file);
  assert.deepEqual(res.errors, []);
  const doc = res.document!;
  assert.deepEqual(norm(doc.input.business), norm(sample.input.business));
  assert.equal(doc.input.reportDate, sample.input.reportDate);
  const byId = (d: SnapshotDocument) => Object.fromEntries(d.input.results.map((r) => [r.criterionId, r]));
  assert.deepEqual(norm(byId(doc)), norm(byId(sample)));
  assert.deepEqual(norm(doc.competitors), norm(sample.competitors));
  assert.deepEqual(norm(doc.immediateOpportunities), norm(sample.immediateOpportunities));
  assert.deepEqual(norm(doc.scenarioInputs), norm(sample.scenarioInputs));
  assert.equal(scoreSnapshot(doc.input).overall.verifiedScore, scoreSnapshot(sample.input).overall.verifiedScore);
});

test('spreadsheet formulas match the engine and contain no errors (LibreOffice recalc)', (t) => {
  const out = tmp();
  const calc = recalcWithLibreOffice(SAMPLE_PATH, out);
  if (!calc) return t.skip('LibreOffice not installed');
  const errorCells: string[] = [];
  for (const sheet of ['Start here', 'Scorecard', 'Summary']) {
    readValues(calc, sheet).forEach((row, r) => row.forEach((v, c) => { if (typeof v === 'string' && /^#(VALUE|NAME|DIV\/0|REF|N\/A|NUM)/.test(v)) errorCells.push(`${sheet}!R${r + 1}C${c + 1}=${v}`); }));
  }
  assert.deepEqual(errorCells, []);
  const summary = readValues(calc, 'Summary');
  const engine = scoreSnapshot(sample.input);
  categories.forEach((cat, i) => {
    const row = summary[6 + i]!;
    const eng = engine.categories.find((c) => c.id === cat.id)!;
    assert.equal(row[0], cat.name);
    assert.equal(row[6], eng.display === null ? 'Not verified' : eng.display, `${cat.name} score`);
    assert.equal(row[3], eng.verifiedPoints, `${cat.name} verified points`);
    assert.equal(row[7], eng.notVerified.length, `${cat.name} not verified count`);
  });
  const overall = summary[6 + categories.length]!;
  assert.equal(overall[6], engine.overall.verifiedScore);
  assert.equal(Math.round(Number(overall[5]) * 100), Math.round(engine.overall.coverage * 100));
  const blank = readValues(recalcWithLibreOffice(TEMPLATE_PATH, out)!, 'Summary');
  assert.equal(blank[6 + categories.length]![6], 'Not enough evidence', 'blank workbook never shows a score');
});

test('import rejects incomplete or invalid rows and cites the exact cell', () => {
  const file = join(tmp(), 'bad.xlsx');
  buildScorecard(file, sample);
  editCells(file, [
    ['Scorecard', 'maps.local_results', 'Result', null, null],
    ['Scorecard', 'maps.profile', 'Evidence type', null, 'Owner-reported'],
    ['Scorecard', 'website.speed', 'Date checked', null, 'yesterday'],
    ['Scorecard', 'ai.schema', 'Override result', null, 'Full (100%)'],
    ['Scorecard', 'reviews.rating', 'Result', null, 'Most (75%)'],
    ['Scorecard', 'reviews.recency', 'Evidence note', null, ''],
    ['Owner numbers', null, null, 'B5', null],
  ]);
  const res = importScorecard(file);
  const all = res.errors.join('\n');
  assert.match(all, /'Scorecard'!E\d+ \(maps\.local_results\): Scored rows need a Result/);
  assert.match(all, /\(maps\.profile\): 'Owner-reported' isn't allowed here/);
  assert.match(all, /\(website\.speed\): 'yesterday' isn't a date/);
  assert.match(all, /\(ai\.schema\): an override needs a reason and a reviewer name/);
  assert.doesNotMatch(all, /reviews\.rating/, '75% is a defined level for rating');
  assert.match(all, /\(reviews\.recency\): add an Evidence note/);
  assert.match(all, /fill all three owner numbers or leave all blank/);
});

test('import accepts phone-style entries: real dates, US dates, overrides with reviewer', () => {
  const file = join(tmp(), 'phone.xlsx');
  buildScorecard(file, sample);
  editCells(file, [
    ['Scorecard', 'maps.profile', 'Date checked', null, 'DATETIME:2026-11-09T00:00:00'],
    ['Scorecard', 'maps.category', 'Date checked', null, '11/8/2026'],
    ['Scorecard', 'website.speed', 'Override result', null, 'Half (50%)'],
    ['Scorecard', 'website.speed', 'Override reason', null, 'Median of 5 runs after CDN fix'],
    ['Scorecard', 'website.speed', 'Reviewer', null, 'DR'],
    ['Scorecard', 'followup.speed', 'Status', null, 'Not applicable'],
  ]);
  const res = importScorecard(file);
  assert.deepEqual(res.errors, []);
  const byId = Object.fromEntries(res.document!.input.results.map((r) => [r.criterionId, r]));
  assert.equal(byId['maps.profile']!.evidence!.checkedAt, '2026-11-09');
  assert.equal(byId['maps.category']!.evidence!.checkedAt, '2026-11-08');
  assert.deepEqual(byId['website.speed']!.override, { tier: 0.5, reason: 'Median of 5 runs after CDN fix', by: 'DR', at: '2026-11-10' });
  assert.equal(byId['followup.speed']!.status, 'not_applicable');
  const scored = scoreSnapshot(res.document!.input);
  assert.equal(scored.overrides.length, 1, 'override flows through to the engine audit trail');
});

test('website lead → prefilled workbook: business + lead details, owner answers as owner-reported', () => {
  const lead = processSubmission({
    form: 'snapshot_request', submitted_at: '2026-11-17T17:59:30Z', form_started_at: '2026-11-17T17:58:00Z', company_website: '',
    business_name: 'Desert Test Plumbing (fictional)', website: 'desert-test.example', city: 'Peoria', industry: 'home-services',
    concerns: [], self_check: { 'followup.speed': 0.75, 'followup.quotes': 'not_verified' }, contact_name: 'Pat', email: 'pat@desert-test.example',
    preferred_channel: 'email', consent_contact: true, consent_sms: false, consent_text: 'I agree…', attribution: { utm_source: 'google' },
  }, '2026-11-17T18:00:00Z').record!;
  const file = join(tmp(), 'lead.xlsx');
  buildScorecard(file, snapshotDraftFromLead(lead, '2026-11-18'));
  const res = importScorecard(file);
  assert.deepEqual(res.errors, []);
  const doc = res.document!;
  assert.equal(doc.input.business.name, 'Desert Test Plumbing (fictional)');
  assert.equal(doc.input.business.area, 'Peoria');
  assert.equal(doc.lead?.email, 'pat@desert-test.example');
  assert.equal(doc.lead?.source, 'google');
  const speed = doc.input.results.find((r) => r.criterionId === 'followup.speed')!;
  assert.equal(speed.status, 'scored');
  assert.equal(speed.tier, 0.75);
  assert.equal(speed.evidence?.type, 'owner_reported');
  assert.equal(doc.input.results.filter((r) => r.status === 'not_verified').length, allCriteria.length - 1);
});
