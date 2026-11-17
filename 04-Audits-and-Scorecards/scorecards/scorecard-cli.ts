/**
 * Scorecard CLI
 *   npm run scorecard:new -- [lead.json | draft.snapshot.json] [--out file.xlsx] [--date YYYY-MM-DD]
 *       Blank or prefilled workbook. Default output: 05-Lead-Research/Research-Outputs/ (git-ignored).
 *   npm run scorecard:import -- <filled.xlsx> [--out file.snapshot.json] [--export] [--stable]
 *       Validates every row (errors cite the cell), writes the Snapshot JSON and, with
 *       --export, all six report formats to 19-Exports/snapshots/<business>-snapshot-<date>/.
 *   npm run scorecards
 *       Regenerates the committed blank template and the fictional sample workbook.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { processSubmission, type LeadRecord } from '../../05-Lead-Research/intake/lead-intake.ts';
import { snapshotDraftFromLead } from '../../05-Lead-Research/intake/lead-to-snapshot.ts';
import { exportAll } from '../snapshot/report/export.ts';
import { buildReport, fileBase, slugify, type SnapshotDocument } from '../snapshot/report/model.ts';
import { buildScorecard, importScorecard, readJson, ROOT, SAMPLE_PATH, TEMPLATE_PATH } from './scorecard.ts';

const [cmd, ...args] = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--out', '--date'].includes(args[i - 1]!)));
const rel = (p: string) => relative(process.cwd(), p) || p;
const today = () => new Date().toISOString().slice(0, 10);

function docFromSource(file: string, date: string): SnapshotDocument {
  const raw = readJson<Record<string, unknown>>(resolve(file));
  if (raw.input) return raw as unknown as SnapshotDocument; // already a Snapshot document/draft
  let lead: LeadRecord;
  if (raw.schema === 'rrs.lead/1') lead = raw as unknown as LeadRecord;
  else {
    const r = processSubmission(raw, new Date().toISOString());
    if (r.status !== 'accepted') { console.error(`lead not accepted (${r.status}): ${r.errors.join('; ')}`); process.exit(1); }
    lead = r.record!;
  }
  return snapshotDraftFromLead(lead, date);
}

if (cmd === 'new') {
  const date = flag('--date') ?? today();
  const doc = positional[0] ? docFromSource(positional[0], date) : undefined;
  const name = doc?.input.business.name ?? 'blank';
  const out = resolve(flag('--out') ?? join(ROOT, '05-Lead-Research/Research-Outputs', `${slugify(name)}-${date}.scorecard.xlsx`));
  mkdirSync(dirname(out), { recursive: true });
  buildScorecard(out, doc);
  console.log(`scorecard: ${doc ? name : 'blank workbook'} → ${rel(out)}`);
} else if (cmd === 'import') {
  const file = positional[0];
  if (!file) { console.error('usage: scorecard:import <filled.xlsx> [--out file.snapshot.json] [--export] [--stable]'); process.exit(2); }
  const res = importScorecard(resolve(file));
  res.warnings.forEach((w) => console.warn(`warning: ${w}`));
  if (res.errors.length || !res.document) {
    console.error(`scorecard: ${res.errors.length} problem(s) to fix in ${file}:`);
    res.errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }
  const doc = res.document;
  const out = resolve(flag('--out') ?? resolve(file).replace(/(\.scorecard)?\.xlsx$/i, '.snapshot.json'));
  writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
  const model = buildReport(doc, { generatedAt: args.includes('--stable') ? `${doc.input.reportDate}T12:00:00.000Z` : undefined });
  const o = model.result.overall;
  console.log(`scorecard: ${doc.input.business.name} → ${rel(out)} · verified score ${o.verifiedScore ?? 'n/a'}${o.verifiedScore === null ? '' : '/100'} · ${Math.round(o.coverage * 100)}% verifiable · ${model.notVerifiedCount} not verified`);
  if (args.includes('--export')) {
    const dir = join(ROOT, '19-Exports/snapshots', fileBase(model));
    mkdirSync(dir, { recursive: true });
    const files = await exportAll(model, undefined, { stable: args.includes('--stable') });
    for (const f of files) writeFileSync(join(dir, f.name), f.data);
    writeFileSync(join(dir, `${fileBase(model)}.manifest.json`), JSON.stringify({ business: model.business.name, fictional: model.fictional, reportDate: model.reportDate, source: rel(resolve(file)), files: files.map((f) => ({ file: f.name, format: f.format, bytes: f.data.length, sha256: createHash('sha256').update(f.data).digest('hex') })) }, null, 2) + '\n');
    console.log(`exports: ${files.length} files → ${rel(dir)}/`);
  }
} else if (cmd === 'templates') {
  buildScorecard(TEMPLATE_PATH);
  const sample = readJson<SnapshotDocument>(join(ROOT, '17-Sample-Clients/fictional-hvac-snapshot.json'));
  buildScorecard(SAMPLE_PATH, sample);
  console.log(`scorecards: ${rel(TEMPLATE_PATH)}, ${rel(SAMPLE_PATH)}`);
} else {
  console.error('usage: scorecard-cli.ts <new|import|templates> …');
  process.exit(2);
}
