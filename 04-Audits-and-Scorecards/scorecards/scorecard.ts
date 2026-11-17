/**
 * Local Revenue Opportunity Scorecard (XLSX). TypeScript side.
 * Builds workbooks via scorecard_xlsx.py (openpyxl) from framework.json, and imports
 * filled workbooks back into a SnapshotDocument validated by the Snapshot engine itself.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapshotValidationError, validate } from '../snapshot/engine.ts';
import type { SnapshotDocument } from '../snapshot/report/model.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '../..');
export const SCORECARD_PY = join(here, 'scorecard_xlsx.py');
export const FRAMEWORK_JSON = join(ROOT, '04-Audits-and-Scorecards/snapshot/framework.json');
export const TEMPLATE_PATH = join(here, 'Local-Revenue-Opportunity-Scorecard.xlsx');
export const SAMPLE_PATH = join(ROOT, '17-Sample-Clients/fictional-hvac-scorecard.xlsx');

function python(args: string[]): string {
  if (!existsSync(FRAMEWORK_JSON)) throw new Error('framework.json missing: run `npm run framework` first');
  const r = spawnSync('python3', ['-I', SCORECARD_PY, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error) throw new Error(`python3 not available: ${r.error.message} (needs Python 3 + openpyxl)`);
  if (r.status !== 0) throw new Error(`scorecard_xlsx.py failed: ${r.stderr.trim().split('\n').slice(-3).join(' ')}`);
  return r.stdout;
}

/** Write a Scorecard workbook. With a document, its business details, lead and results are prefilled. */
export function buildScorecard(out: string, prefill?: SnapshotDocument): void {
  const args = ['build', '--framework', FRAMEWORK_JSON, '--out', out];
  let tmp: string | undefined;
  if (prefill) {
    tmp = mkdtempSync(join(tmpdir(), 'rrs-sc-'));
    writeFileSync(join(tmp, 'prefill.json'), JSON.stringify(prefill));
    args.push('--prefill', join(tmp, 'prefill.json'));
  }
  try {
    python(args);
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

export interface ImportResult {
  document: SnapshotDocument | null;
  errors: string[];
  warnings: string[];
  /** criterionId → row number on the Scorecard sheet (for error messages). */
  rows: Record<string, number>;
}

/** Read a filled workbook. Errors cite sheet + cell; the engine re-validates everything. */
export function importScorecard(file: string): ImportResult {
  const res = JSON.parse(python(['read', '--framework', FRAMEWORK_JSON, '--in', file])) as ImportResult;
  if (res.document && res.errors.length === 0) {
    try {
      validate(res.document.input);
    } catch (e) {
      if (!(e instanceof SnapshotValidationError)) throw e;
      const id = /^([a-z]+\.[a-z_]+)/.exec(e.message)?.[1];
      res.errors.push(`${id && res.rows[id] ? `'Scorecard' row ${res.rows[id]} (${id})` : 'Scorecard'}: ${e.message}`);
    }
  }
  return res;
}

/**
 * Recalculate a workbook's formulas with LibreOffice (headless) into outDir.
 * Returns the recalculated copy, or null when LibreOffice isn't installed.
 */
export function recalcWithLibreOffice(file: string, outDir: string): string | null {
  const probe = spawnSync('soffice', ['--version'], { encoding: 'utf8' });
  if (probe.error) return null;
  const profile = mkdtempSync(join(tmpdir(), 'rrs-lo-'));
  try {
    const r = spawnSync('soffice', [`-env:UserInstallation=file://${profile}`, '--headless', '--norestore', '--calc', '--convert-to', 'xlsx', '--outdir', outDir, file], { encoding: 'utf8', env: { ...process.env, SAL_USE_VCLPLUGIN: 'svp' }, timeout: 120_000 });
    const out = join(outDir, basename(file).replace(/\.xlsx$/i, '') + '.xlsx');
    if (r.status !== 0 || !existsSync(out)) throw new Error(`LibreOffice recalculation failed: ${r.stderr || r.stdout}`);
    return out;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

/** Read cached cell values (after recalculation) of one sheet as a row-major grid. */
export function readValues(file: string, sheet: string): unknown[][] {
  const code = `import json,sys\nfrom openpyxl import load_workbook\nws=load_workbook(sys.argv[1],data_only=True)[sys.argv[2]]\nprint(json.dumps([[c.value for c in row] for row in ws.iter_rows()],default=str))`;
  const r = spawnSync('python3', ['-I', '-c', code, file, sheet], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

export const readJson = <T>(p: string) => JSON.parse(readFileSync(p, 'utf8')) as T;
