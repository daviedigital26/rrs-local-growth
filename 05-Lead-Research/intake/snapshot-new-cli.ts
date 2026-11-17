/**
 * Creates a Snapshot research draft from a lead (the JSON the website posts, or a
 * LeadRecord already accepted by intake).
 *   npm run snapshot:new -- <lead.json> [--date YYYY-MM-DD] [--out file]
 * Default output: 05-Lead-Research/Research-Outputs/<business>-<date>.snapshot.json
 * (git-ignored: it contains personal contact details).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '../../04-Audits-and-Scorecards/snapshot/report/model.ts';
import { processSubmission, type LeadRecord } from './lead-intake.ts';
import { snapshotDraftFromLead } from './lead-to-snapshot.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--')));
if (!file) { console.error('usage: snapshot:new <lead.json> [--date YYYY-MM-DD] [--out file]'); process.exit(2); }

const raw = JSON.parse(readFileSync(resolve(file), 'utf8'));
let lead: LeadRecord;
if (raw.schema === 'rrs.lead/1') lead = raw as LeadRecord;
else {
  const r = processSubmission(raw, new Date().toISOString());
  if (r.status !== 'accepted') { console.error(`lead not accepted (${r.status}): ${r.errors.join('; ')}`); process.exit(1); }
  lead = r.record!;
}
const date = flag('--date') ?? new Date().toISOString().slice(0, 10);
const draft = snapshotDraftFromLead(lead, date);
const out = resolve(flag('--out') ?? join(root, '05-Lead-Research/Research-Outputs', `${slugify(lead.business.name ?? 'lead')}-${date}.snapshot.json`));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(draft, null, 2) + '\n');
console.log(`snapshot draft: ${lead.business.name} → ${relative(process.cwd(), out)} (fill evidence, then npm run snapshot:export -- <file>)`);
