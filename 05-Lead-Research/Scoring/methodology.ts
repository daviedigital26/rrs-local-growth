/**
 * Generates ICP-METHODOLOGY.md from ICP_CONFIG so the published numbers can never drift
 * from the code. `npm run icp:docs` writes it; icp.test.ts fails if it is out of date.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICP_CONFIG, type Band } from './icp-config.ts';
import { LEGACY_MAX_SCORE } from './legacy-pm.ts';

export const METHODOLOGY_PATH = join(dirname(fileURLToPath(import.meta.url)), 'ICP-METHODOLOGY.md');

const pct = (n: number) => `${Math.round(n * 100)}%`;
const bandRows = (bands: Band[]) => bands.map((b) => `| ${b.label} | ${pct(b.credit)} |`).join('\n');

export function icpMethodologyMarkdown(cfg = ICP_CONFIG): string {
  const w = cfg.weights;
  const L = cfg.componentLabels;
  const pmp = cfg.profiles['property-management']!;
  const f = cfg.freshness;
  return `# ICP scoring methodology

<!-- Generated from 05-Lead-Research/Scoring/icp-config.ts by \`npm run icp:docs\`. Do not edit by hand. -->

Config version: \`${cfg.version}\`

Every business gets **four separate results**. They are never merged into one unexplained number (spec Part 6).

| Result | What it answers | Scale |
| --- | --- | --- |
| **ICP fit** | Is this the kind of business we serve? (${cfg.fitComponents.map((c) => L[c].toLowerCase()).join(', ')}) | 0–100, or *Not enough evidence* when under ${pct(cfg.fitMinCoverage)} of fit evidence is verified |
| **Opportunity** | Is there a *verified* problem we can fix? (Snapshot, observations, review text) | 0–100, or *Not verified* |
| **Research confidence** | How much can we trust the above? (coverage × evidence strength × freshness) | high / medium / low / insufficient |
| **Outreach priority** | Who to contact first? | P1 / P2 / P3, or a gate (see below), with the 100-point score and all six parts shown |

## The 100-point priority score

The spec's suggested initial weights. A part that is **Not verified earns no points and is labelled Not verified**; it is never shown as the business scoring zero.

| Part | Weight | Evidence used |
| --- | ---: | --- |
| ${L.commercial_fit} | ${w.commercial_fit} | Size: units managed when verified, otherwise review count as a proxy |
| ${L.opportunity} | ${w.opportunity} | Snapshot score (strongest), recorded observations, complaint themes in review text |
| ${L.benefit} | ${w.benefit} | Rating band (room to improve, not in crisis) and ownership (franchises less likely to buy) |
| ${L.reachability} | ${w.reachability} | Contacts on file: phone ${pct(cfg.reachability.phone)}, email ${pct(cfg.reachability.email)}, website ${pct(cfg.reachability.website)}, decision-maker ${pct(cfg.reachability.decision_maker)}; inbound requests 100% |
| ${L.priority_match} | ${w.priority_match} | Industry tier and market (Phoenix area 100%, other Arizona ${pct(cfg.geography.credit.homeState)}, expansion states ${cfg.geography.expansionStates.join('/')} ${pct(cfg.geography.credit.expansion)}, elsewhere ${pct(cfg.geography.credit.other)}) |
| ${L.confidence} | ${w.confidence} | Research confidence × ${w.confidence} |

## Bands and gates

Gates are checked in this order and override the score:

1. **Do not contact**: on the suppression list.
2. **Disqualified**: business marked closed.
3. **Closed (declined)**: they said no; no further outreach unless they reach out.
4. **In progress**: audit booked or existing customer.
5. **Inbound: reply**: they contacted us. Answer personally; never cold-sequence.
6. **Research first**: research confidence is *insufficient* (under ${pct(cfg.confidence.minCoverage)} of the score's evidence verified).

Otherwise: **P1** at ${cfg.bands.p1}+ points **and** a verified opportunity of at least ${cfg.bands.p1MinOpportunity}; **P2** at ${cfg.bands.p2}+; **P3** below.
Size and rating alone never reach P1. National franchises top out at **P2** (deprioritised, not hidden).

## Research confidence

Coverage = share of the five scored parts' weight that is verified. Quality = weighted evidence strength × freshness.
Coverage under ${pct(cfg.confidence.minCoverage)} = *insufficient*; otherwise coverage × quality ≥ ${cfg.confidence.high} = high, ≥ ${cfg.confidence.medium} = medium, else low (same cut-offs as the Snapshot).

| Evidence | Strength |
| --- | ---: |
${Object.entries(cfg.evidenceStrength).map(([k, v]) => `| ${k.replace(/_/g, ' ')} | ${v} |`).join('\n')}

Freshness: up to ${f.freshDays} days 100%, up to ${f.agingDays} days ${pct(f.aging)}, older ${pct(f.stale)}, **undated ${pct(f.undated)}**. Pass \`--checked YYYY-MM-DD\` when importing a batch so its facts are dated.

## Property-management profile (calibrated from the PM Lead Scorer)

${pmp.note}

**Size (review count proxy)**

| Band | Credit |
| --- | ---: |
${bandRows(pmp.reviewBands)}

**Size (units managed, preferred when verified)**

| Band | Credit |
| --- | ---: |
${bandRows(pmp.sizeBands!.bands)}

**Rating**

| Band | Credit |
| --- | ---: |
${bandRows(pmp.ratingBands)}

**Ownership credit:** ${Object.entries(cfg.ownershipCredit).map(([k, v]) => `${k.replace(/_/g, ' ')} ${pct(v)}`).join(', ')}.

**Review complaint themes.** Each theme counts once per business at ${pmp.pain.pointsPerSignal} points × relevance, capped at ${pmp.pain.cap} (the tracker's own scale).

| Theme | Relevance to our services |
| --- | ---: |
${pmp.pain.themes.map((t) => `| ${t.label} | ${pct(t.relevance)} |`).join('\n')}

Ignored on purpose: praise with a negation in the same clause ("no voicemail runaround", "never had a delay"); sentences about a previous manager ("…until new management showed up"); and comparisons with other companies ("most agencies would not get back to me").

Other industries use the same bands, marked **uncalibrated**, until real call outcomes justify their own.

## Differences from the PM Lead Scorer

The old score is still shown beside the new results (\`old_tracker_score\`, an exact port). The new model differs where the old one could mislead:

| Old tracker | New model |
| --- | --- |
| Right size + rating scored exactly 60 = **hot**, even with no complaint found | P1 needs a verified problem; size + rating alone tops out at P2 |
| Each keyword counted separately ("cancel" + "canceled" = 2 hits) | Each complaint theme counts once |
| Praise counted as pain ("no voicemail runaround") | Negated phrases ignored and listed for review |
| Complaints about a *previous* manager counted | Skipped |
| Missing rating / review count scored low | Not verified: no points, lower confidence, *Research first* when too little is known |
| Max reachable score ${LEGACY_MAX_SCORE} | Full 0–100 range, with each part shown |
| Franchise penalty −16 points | Ownership credit plus a P2 cap |

## Limits

- Review excerpts are a small sample (often 2–5). Treat review signals as an opening angle to verify on the call, not as proof.
- Review count is only a proxy for size. A verified unit count replaces it.
- Every default except the spec weights and the PM profile is a starting assumption. Tune with real outcomes; change \`icp-config.ts\` and bump \`version\`.
- Collect review text only through approved sources and within their terms. Never scrape.
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(METHODOLOGY_PATH, icpMethodologyMarkdown());
  console.log(`Wrote ${METHODOLOGY_PATH}`);
}
