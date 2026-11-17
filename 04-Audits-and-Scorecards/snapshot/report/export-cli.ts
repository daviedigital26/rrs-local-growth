/**
 * Snapshot export CLI.
 *   npm run snapshot:export -- <snapshot.json> [--out <dir>] [--formats html,pdf,csv,json,crm,pptx] [--stable]
 * Default output: 19-Exports/snapshots/<business>-snapshot-<date>/
 * --stable pins timestamps to the report date so re-running produces identical text outputs.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport, fileBase, type SnapshotDocument } from './model.ts';
import { exportAll, FORMATS, type Format } from './export.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const inputs = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--') && args[i - 1] !== '--stable'));
if (!inputs.length) { console.error('usage: snapshot:export <snapshot.json> [--out dir] [--formats list] [--stable]'); process.exit(2); }
const formats = (flag('--formats')?.split(',') ?? FORMATS) as Format[];
const bad = formats.filter((f) => !FORMATS.includes(f));
if (bad.length) { console.error(`unknown format(s): ${bad.join(', ')} (allowed: ${FORMATS.join(', ')})`); process.exit(2); }
const stable = args.includes('--stable');

for (const input of inputs) {
  const doc = JSON.parse(readFileSync(resolve(input), 'utf8')) as SnapshotDocument;
  const model = buildReport(doc, { generatedAt: stable ? `${doc.input.reportDate}T12:00:00.000Z` : undefined });
  const outDir = resolve(flag('--out') ?? join(root, '19-Exports/snapshots', fileBase(model)));
  mkdirSync(outDir, { recursive: true });
  const files = await exportAll(model, formats, { stable });
  const manifest: Array<{ file: string; format: string; bytes: number; sha256: string }> = [];
  for (const f of files) {
    writeFileSync(join(outDir, f.name), f.data);
    manifest.push({ file: f.name, format: f.format, bytes: f.data.length, sha256: createHash('sha256').update(f.data).digest('hex') });
  }
  writeFileSync(join(outDir, `${fileBase(model)}.manifest.json`), JSON.stringify({ business: model.business.name, fictional: model.fictional, reportDate: model.reportDate, generatedAt: model.generatedAt, files: manifest }, null, 2) + '\n');
  console.log(`snapshot: ${model.business.name}${model.fictional ? ' (fictional)' : ''} → ${relative(process.cwd(), outDir)}/ [${manifest.map((x) => x.format).join(', ')}]`);
}
