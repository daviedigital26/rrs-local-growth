import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deliverables, type Flag } from './deliverables.ts';

const here = dirname(fileURLToPath(import.meta.url));

const flagLabel: Record<Flag, string> = {
  working: 'Working',
  mock: 'Mock',
  placeholder: 'Placeholder',
  draft: 'Draft',
  'production-ready': 'Production-ready',
  'needs-credentials': 'Needs credentials',
  'needs-approval': 'Needs approval',
};

const esc = (s: string) => s.replace(/\|/g, '\\|');
const counts = deliverables.reduce<Record<string, number>>((acc, d) => {
  acc[d.status] = (acc[d.status] ?? 0) + 1;
  return acc;
}, {});

const lines: string[] = [
  '# Deliverables Register',
  '',
  '> Generated from `deliverables.ts` by `npm run register`. Edit the data file, not this table.',
  '> Rule: nothing is marked Created/Tested/Approved unless the file exists (enforced by `register.test.ts`).',
  '',
  `**Totals:** ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
  '',
  '| ID | Name | Description | File location | Status | Dependencies | Validation | Approval | Classification | Last modified |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...deliverables.map((d) =>
    `| ${d.id} | ${esc(d.name)} | ${esc(d.description)} | ${d.paths.length ? d.paths.map((p) => `\`${p}\``).join('<br>') : '—'} | **${d.status}** | ${d.dependencies.join(', ') || '—'} | ${esc(d.validation)} | ${d.approval} | ${d.flags.map((f) => flagLabel[f]).join(', ') || '—'} | ${d.lastModified} |`,
  ),
  '',
];

writeFileSync(join(here, 'DELIVERABLES-REGISTER.md'), lines.join('\n'));
console.log(`register: ${deliverables.length} deliverables written`);
