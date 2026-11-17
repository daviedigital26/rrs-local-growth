/**
 * npm run leads:score -- <file> [<file> …] [--checked YYYY-MM-DD] [--industry <id>]
 *                        [--as-of YYYY-MM-DD] [--out DIR] [--name BASENAME]
 *
 * Inputs (mix freely; records for the same business are merged):
 *   *.json array        PM Lead Scorer batch ({name, city, phone, rating, reviewCount, chain, reviews})
 *   *.csv               PM Lead Scorer "Export CSV" (keeps Status and Notes)
 *   *.json rrs.lead/1   website lead (inbound)
 *   *.json Snapshot     Snapshot document (verified opportunity)
 *   *.json call log     rrs.call-log/1 exported from the call queue (applied after merging)
 *
 * Writes <name>.csv (call list) and <name>.json (every score, component and reason).
 * Real lead data may only be written to 05-Lead-Research/Research-Outputs (git-ignored) or
 * outside the repository.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport, type SnapshotDocument } from '../../04-Audits-and-Scorecards/snapshot/report/model.ts';
import { INDUSTRY_VALUES, type LeadRecord } from '../intake/lead-intake.ts';
import { applyCallLog } from './call-log.ts';
import { ICP_CONFIG, type Industry } from './icp-config.ts';
import { BAND_ORDER, scoreAll } from './icp-engine.ts';
import { callListCsv, displayPhone, resultsJson } from './outputs.ts';
import { fromLegacyBatch, fromLegacyCsv, fromSnapshotModel, fromWebLead, isIsoDate, mergeProspects, type ImportIssue, type ProspectRecord } from './prospect.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RESEARCH_OUTPUTS = join(ROOT, '05-Lead-Research', 'Research-Outputs');

export interface LoadOptions { checkedAt?: string | null; industry?: Industry }

export interface LoadedInput { prospects: ProspectRecord[]; errors: ImportIssue[]; warnings: ImportIssue[]; callLog?: unknown }

export function loadInput(file: string, opts: LoadOptions): LoadedInput {
  const text = readFileSync(file, 'utf8');
  const tag = (list: ImportIssue[]) => list.map((e) => ({ ...e, where: `${basename(file)}: ${e.where}` }));
  if (/\.csv$/i.test(file)) {
    const r = fromLegacyCsv(text, opts);
    return { prospects: r.prospects, errors: tag(r.errors), warnings: tag(r.warnings) };
  }
  let data: unknown;
  try { data = JSON.parse(text); } catch (e) { return { prospects: [], errors: tag([{ where: 'file', message: `not valid JSON (${(e as Error).message})` }]), warnings: [] }; }
  if (Array.isArray(data)) {
    const r = fromLegacyBatch(data, opts);
    return { prospects: r.prospects, errors: tag(r.errors), warnings: tag(r.warnings) };
  }
  const o = data as Record<string, unknown>;
  if (o?.schema === 'rrs.call-log/1') return { prospects: [], errors: [], warnings: [], callLog: o };
  if (o?.schema === 'rrs.lead/1') return { prospects: [fromWebLead(o as unknown as LeadRecord)], errors: [], warnings: [] };
  if (o && typeof o.input === 'object' && Array.isArray((o.input as Record<string, unknown>).results)) {
    try {
      const m = buildReport(o as unknown as SnapshotDocument, { generatedAt: `${(o.input as { reportDate: string }).reportDate}T00:00:00Z` });
      return { prospects: [fromSnapshotModel(m)], errors: [], warnings: [] };
    } catch (e) { return { prospects: [], errors: tag([{ where: 'snapshot', message: (e as Error).message }]), warnings: [] }; }
  }
  return { prospects: [], errors: tag([{ where: 'file', message: 'unrecognised format (expected a lead batch array, tracker CSV, website lead, Snapshot or call log)' }]), warnings: [] };
}

/** True when writing here could put real lead data into a committed folder. */
export function unsafeOutputDir(dir: string): boolean {
  const abs = resolve(dir);
  const inRepo = abs === ROOT || abs.startsWith(ROOT + sep);
  const inOutputs = abs === RESEARCH_OUTPUTS || abs.startsWith(RESEARCH_OUTPUTS + sep);
  return inRepo && !inOutputs;
}

export function loadAll(files: string[], opts: LoadOptions) {
  const all: ProspectRecord[] = [];
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const callLogs: unknown[] = [];
  for (const f of files) {
    const r = loadInput(f, opts);
    all.push(...r.prospects); errors.push(...r.errors); warnings.push(...r.warnings);
    if (r.callLog) callLogs.push(r.callLog);
  }
  return { all, errors, warnings, callLogs };
}

export function arg(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(argv: string[]): number {
  const flags = new Set(['--checked', '--industry', '--as-of', '--out', '--name']);
  const files = argv.filter((a, i) => !a.startsWith('--') && !flags.has(argv[i - 1] ?? ''));
  if (!files.length) {
    console.error('Usage: npm run leads:score -- <batch.json|tracker.csv|lead.json|snapshot.json> … [--checked YYYY-MM-DD] [--industry property-management] [--as-of YYYY-MM-DD] [--out DIR]');
    return 2;
  }
  const checkedAt = arg(argv, '--checked') ?? null;
  const asOf = arg(argv, '--as-of') ?? new Date().toISOString().slice(0, 10);
  const industry = arg(argv, '--industry');
  const out = arg(argv, '--out') ?? RESEARCH_OUTPUTS;
  const problems: string[] = [];
  if (checkedAt && !isIsoDate(checkedAt)) problems.push(`--checked must be YYYY-MM-DD (got "${checkedAt}")`);
  if (!isIsoDate(asOf)) problems.push(`--as-of must be YYYY-MM-DD (got "${asOf}")`);
  if (industry && !(INDUSTRY_VALUES as readonly string[]).includes(industry)) problems.push(`--industry must be one of: ${INDUSTRY_VALUES.join(', ')}`);
  if (problems.length) { problems.forEach((p) => console.error(`✗ ${p}`)); return 2; }

  const { all, errors, warnings, callLogs } = loadAll(files, { checkedAt, industry: industry as Industry | undefined });
  for (const w of warnings) console.warn(`! ${w.where}: ${w.message}`);
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e.where}: ${e.message}`);
    console.error(`\n${errors.length} problem(s) found. Nothing was written; fix them and run again.`);
    return 1;
  }
  let { prospects, merged } = mergeProspects(all);
  for (const log of callLogs) {
    const r = applyCallLog(prospects, log);
    if (r.errors.length) { r.errors.forEach((e) => console.error(`✗ call log: ${e}`)); return 1; }
    prospects = r.prospects;
    console.log(`Applied ${r.applied} call-log event${r.applied === 1 ? '' : 's'}${r.unmatched.length ? ` (${r.unmatched.length} for leads not in these inputs, skipped)` : ''}`);
  }
  if (prospects.some((p) => !p.fictional) && unsafeOutputDir(out)) {
    console.error(`✗ --out ${relative(process.cwd(), resolve(out)) || '.'} is inside the repository. Real lead data must stay in 05-Lead-Research/Research-Outputs (git-ignored) or outside the repo.`);
    return 1;
  }
  const ranked = scoreAll(prospects, { asOf });
  const name = arg(argv, '--name') ?? `lead-scores-${asOf}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${name}.csv`), callListCsv(ranked));
  writeFileSync(join(out, `${name}.json`), resultsJson(ranked, { as_of: asOf, config_version: ICP_CONFIG.version, inputs: files.map((f) => basename(f)), merged_duplicates: merged }));

  const counts = BAND_ORDER.map((b) => [b, ranked.filter((x) => x.result.priority.band === b).length] as const).filter(([, n]) => n);
  console.log(`Scored ${ranked.length} business${ranked.length === 1 ? '' : 'es'} (${merged} duplicate record${merged === 1 ? '' : 's'} merged), as of ${asOf}, config ${ICP_CONFIG.version}`);
  console.log(counts.map(([b, n]) => `${b.toUpperCase()}: ${n}`).join('  '));
  console.log('\nTop of the list:');
  for (const [i, { result: r, prospect: p }] of ranked.slice(0, 10).entries()) {
    console.log(`${String(i + 1).padStart(2)}. ${r.priority.label.padEnd(18)} ${String(r.priority.points).padStart(3)} pts  fit ${String(r.fit.score ?? 'n/v').padStart(3)}  opp ${String(r.opportunity.score ?? 'n/v').padStart(3)}  ${r.confidence.label.padEnd(12)} ${p.name}${p.phone ? `  ${displayPhone(p.phone)}` : ''}`);
  }
  console.log(`\nWrote ${join(out, `${name}.csv`)}\n      ${join(out, `${name}.json`)}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
