import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import JSZip from 'jszip';
import { allCriteria } from '../framework.ts';
import { buildReport, fileBase, type SnapshotDocument } from './model.ts';
import { crmRecord, criteriaCsv, csvCell, reportJson, summaryCsv } from './formats.ts';
import { renderReportHtml } from './html.tsx';
import { exportAll } from './export.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const sample = JSON.parse(readFileSync(join(root, '17-Sample-Clients/fictional-hvac-snapshot.json'), 'utf8')) as SnapshotDocument;
const model = buildReport(sample, { generatedAt: '2026-11-10T12:00:00.000Z' });

/** Minimal RFC 4180 parser for assertions. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  return rows;
}

test('model: summary, priorities and Not verified count match the engine', () => {
  assert.equal(model.result.overall.verifiedScore, 51);
  assert.equal(model.notVerifiedCount, 2);
  assert.match(model.summary, /51\/100/);
  assert.match(model.summary, /2 items couldn’t be verified/);
  assert.deepEqual(model.priorities.map((p) => p.id), ['ai', 'followup', 'website', 'maps']);
  assert.equal(model.recommendation.offerId, 'local-revenue-dominator');
  assert.equal(model.rows.length, allCriteria.length);
  assert.ok(model.fictional && model.fictionalNotice?.startsWith('FICTIONAL SAMPLE'));
});

test('model: insufficient evidence produces no score and says so', () => {
  const thin: SnapshotDocument = { input: { ...sample.input, business: { ...sample.input.business }, results: [] } };
  const m = buildReport(thin);
  assert.equal(m.result.overall.verifiedScore, null);
  assert.match(m.summary, /isn't enough for a fair overall score/);
  assert.equal(m.recommendation.offerId, null);
});

test('csv: cell escaping and spreadsheet formula-injection guard', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1 555'), "'+1 555");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell(-3), '-3');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(true), 'TRUE');
});

test('csv: criteria file has one row per criterion and keeps Not verified distinct from zero', () => {
  const rows = parseCsv(criteriaCsv(model));
  const [header, ...body] = rows;
  assert.equal(body.length, allCriteria.length);
  const idx = (k: string) => header!.indexOf(k);
  const speed = body.find((r) => r[idx('criterion_id')] === 'followup.speed')!;
  assert.equal(speed[idx('status')], 'Not verified');
  assert.equal(speed[idx('points_earned')], '', 'Not verified must be blank, never 0');
  const activity = body.find((r) => r[idx('criterion_id')] === 'maps.activity')!;
  assert.equal(activity[idx('points_earned')], '0', 'a verified zero stays 0');
  assert.ok(body.every((r) => r[idx('fictional')] === 'TRUE'));
});

test('csv: summary has overall + five categories', () => {
  const rows = parseCsv(summaryCsv(model));
  assert.equal(rows.length, 7);
  assert.equal(rows[1]![4], '100');
  assert.equal(rows[1]![5], '51');
});

test('json: full report export carries hypothetical flag, disclaimers and versions', () => {
  const j = JSON.parse(reportJson(model));
  assert.equal(j.format, 'rrs.snapshot.report');
  assert.equal(j.impactScenarios.hypothetical, true);
  assert.equal(j.criteria.length, allCriteria.length);
  assert.ok(j.disclaimers.some((d: string) => /does not guarantee/.test(d)));
  assert.equal(j.fictional, true);
});

test('crm: record validates against the published schema and keeps scores separate', () => {
  const schema = JSON.parse(readFileSync(join(here, 'crm-record.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  const rec = crmRecord(model);
  const ok = ajv.validate(schema, rec);
  assert.ok(ok, JSON.stringify(ajv.errors));
  assert.equal(rec.scores.icp_fit, null, 'ICP fit is Phase 3: never guessed');
  assert.equal(rec.scores.outreach_priority, null);
  assert.equal(rec.public_business_phone, null, 'phone only from verified research');
  assert.equal(rec.outreach_status, 'not_contacted');
  assert.match(rec.dedupe_key, /^name:mesquite ridge comfort/);
  const withSite = crmRecord(buildReport({ ...sample, lead: { website: 'https://www.Example.com/contact' } }));
  assert.equal(withSite.dedupe_key, 'domain:example.com');
});

test('html: self-contained (no external requests), fictional banner, escaped content', () => {
  const html = renderReportHtml(model);
  assert.doesNotMatch(html, /(src|href)=["']https?:/i, 'no external assets');
  assert.doesNotMatch(html, /@import|url\(https?:/i);
  assert.match(html, /data-fictional/);
  assert.match(html, /Not verified/);
  assert.match(html, /Hypothetical\./);
  const evil = buildReport({ ...sample, input: { ...sample.input, business: { ...sample.input.business, name: '<script>alert(1)</script> Co' } } });
  const h2 = renderReportHtml(evil, { embedFonts: false });
  assert.doesNotMatch(h2, /<script>alert/);
});

test('exports: PDF and PPTX are real, readable files with the right content', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-export-'));
  const files = await exportAll(model, ['pdf', 'pptx'], { stable: true });
  const pdf = files.find((f) => f.format === 'pdf')!;
  const pptx = files.find((f) => f.format === 'pptx')!;
  assert.equal(pdf.name, `${fileBase(model)}.pdf`);
  writeFileSync(join(dir, pdf.name), pdf.data);
  assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
  const info = execFileSync('pdfinfo', [join(dir, pdf.name)]).toString();
  const pages = Number(/Pages:\s+(\d+)/.exec(info)![1]);
  assert.ok(pages >= 3 && pages <= 10, `pages=${pages}`);
  assert.match(info, /letter/);
  const text = execFileSync('pdftotext', ['-layout', join(dir, pdf.name), '-']).toString();
  for (const s of ['Mesquite Ridge Comfort Co.', 'FICTIONAL SAMPLE', 'Not verified', 'Hypothetical', '51/100']) assert.ok(text.includes(s), `PDF missing "${s}"`);

  const zip = await JSZip.loadAsync(pptx.data);
  const names = Object.keys(zip.files);
  assert.ok(names.every((n) => !zip.files[n]!.dir), 'no folder entries (cloud viewers reject them)');
  const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.equal(slides.length, 9);
  const all = (await Promise.all(slides.map((n) => zip.file(n)!.async('string')))).join('\n');
  for (const s of ['Mesquite Ridge Comfort Co.', 'Fictional sample: not a real business', 'HYPOTHETICAL', 'Local Revenue Dominator']) assert.ok(all.includes(s), `PPTX missing "${s}"`);
  assert.ok(names.some((n) => n.startsWith('ppt/charts/')), 'native charts present');
});
