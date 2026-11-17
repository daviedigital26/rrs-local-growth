/** Generates METHODOLOGY.md and framework.json from framework.ts. Run: npm run framework */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, EVIDENCE_LABEL, EVIDENCE_WEIGHT, FRAMEWORK_VERSION, THRESHOLDS } from './framework.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const md: string[] = [
  `# Local Revenue Opportunity Snapshot™ — Methodology (v${FRAMEWORK_VERSION})`, '',
  '> Generated from `framework.ts`. Edit the framework, not this file.', '',
  '## How scoring works',
  '- 100 points across five categories of 20 points each. Each criterion is scored at 0 / 25 / 50 / 75 / 100% of its points.',
  '- **Not verified ≠ zero.** If something cannot be observed, it is marked *Not verified* and removed from the denominator. We never treat missing evidence as a confirmed problem.',
  `- **Verified score** = points earned ÷ points we could verify × 100. It is shown only when at least ${pct(THRESHOLDS.overallMinCoverage)} of points were verifiable. A category shows a number only when at least ${pct(THRESHOLDS.categoryMinCoverage)} of its points were verifiable.`,
  '- **Coverage** = verified points ÷ applicable points. **Confidence** combines coverage, evidence type and freshness (stale evidence counts half).',
  `- A verified category below ${pct(THRESHOLDS.weakCategory)} is an opportunity. ${THRESHOLDS.flagshipWeakCount}+ opportunity categories → the coordinated flagship program is recommended.`,
  '- **Manual overrides** need a reason, reviewer and date; the original value is kept and listed in the report. Overriding a Not verified item requires attaching evidence.',
  '- **Impact scenarios** use hypothetical inputs supplied by the owner and are never presented as verified lost revenue.', '',
  '## Evidence types', '| Type | Confidence weight |', '|---|---|',
  ...Object.entries(EVIDENCE_LABEL).map(([k, v]) => `| ${v} | ${EVIDENCE_WEIGHT[k as keyof typeof EVIDENCE_WEIGHT]} |`), '',
];
for (const c of categories) {
  md.push(`## ${c.name} (20 pts) · ${c.outcome}`, `*${c.question}*`, '', `**Limitations:** ${c.limitations}`, '',
    '| Criterion | Pts | Measure | Tiers | Sources | Evidence required | If missing | Fresh for |', '|---|---|---|---|---|---|---|---|',
    ...c.criteria.map((x) => `| ${x.label} | ${x.points} | ${x.measure} | ${Object.entries(x.tiers).sort((a, b) => Number(b[0]) - Number(a[0])).map(([t, d]) => `${Math.round(Number(t) * 100)}%: ${d}`).join('<br>')} | ${x.sources.join('; ')} | ${x.evidence} | ${x.missingData} | ${x.freshnessDays} d |`), '');
}
writeFileSync(join(here, 'METHODOLOGY.md'), md.join('\n'));
writeFileSync(join(here, 'framework.json'), JSON.stringify({ version: FRAMEWORK_VERSION, thresholds: THRESHOLDS, evidenceWeights: EVIDENCE_WEIGHT, evidenceLabels: EVIDENCE_LABEL, categories }, null, 2));
console.log('framework: METHODOLOGY.md + framework.json written');
