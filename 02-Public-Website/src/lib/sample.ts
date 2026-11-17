/** Fictional sample Snapshot, scored by the real engine at build time. */
import sample from '../../../17-Sample-Clients/fictional-hvac-snapshot.json' with { type: 'json' };
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreSnapshot, type SnapshotInput } from '../../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { buildReport, type SnapshotDocument } from '../../../04-Audits-and-Scorecards/snapshot/report/model.ts';

export const sampleData = sample as unknown as {
  _notice: string;
  input: SnapshotInput;
  competitors: Array<{ name: string; reviews: number; rating: number; schema: boolean; mobileCta: boolean }>;
  immediateOpportunities: Array<{ category: string; action: string; effort: string }>;
  scenarioInputs: { monthlyInquiries: number; closeRate: number; averageJobValue: number };
};

if (!sampleData.input.business.fictional) throw new Error('Sample report must be marked fictional');

export const sampleResult = scoreSnapshot(sampleData.input);

/** Same report model the exporters use, so page text and downloads always agree. */
export const sampleReport = buildReport(sampleData as unknown as SnapshotDocument, { generatedAt: `${sampleData.input.reportDate}T12:00:00.000Z` });

/** Committed sample exports (17-Sample-Clients/exports), copied to /downloads/ at build. */
export const SAMPLE_EXPORT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../17-Sample-Clients/exports');
const KINDS: Array<{ ext: string; kind: string; label: string; note: string }> = [
  { ext: '.pdf', kind: 'pdf', label: 'PDF report', note: 'Print-ready, 6 pages' },
  { ext: '.pptx', kind: 'pptx', label: 'Customer presentation', note: 'PowerPoint / Google Slides' },
  { ext: '.html', kind: 'html', label: 'Printable web report', note: 'Opens offline in any browser' },
  { ext: '.criteria.csv', kind: 'csv', label: 'Criteria spreadsheet', note: 'CSV, one row per criterion' },
  { ext: '.crm.json', kind: 'crm', label: 'CRM record', note: 'JSON for import' },
  { ext: '.json', kind: 'json', label: 'Full data export', note: 'JSON' },
];
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const sampleDownloads = (() => {
  let files: string[] = [];
  try { files = readdirSync(SAMPLE_EXPORT_DIR); } catch { return []; }
  const used = new Set<string>();
  return KINDS.flatMap((k) => {
    const f = files.find((x) => x.endsWith(k.ext) && !used.has(x) && !x.endsWith('.manifest.json') && !(k.ext === '.json' && x.endsWith('.crm.json')));
    if (!f) return [];
    used.add(f);
    return [{ ...k, href: `/downloads/${f}`, size: kb(statSync(join(SAMPLE_EXPORT_DIR, f)).size) }];
  });
})();
