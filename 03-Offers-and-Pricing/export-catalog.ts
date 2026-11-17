/** Generates catalog exports. Run: npm run catalog */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABOR_COST_PER_HOUR, TARGET_GROSS_MARGIN, addOnById, addOns, offerById, offers } from './offer-catalog.ts';
import { flagshipComparison, margins } from './cost-model.ts';
import { addOnPrice, usd } from './format.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'exports');
mkdirSync(join(out, 'schedules'), { recursive: true });

const list = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n');
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const nameOf = (id: string) => offerById(id)?.name ?? addOnById(id)?.name ?? id;
const stamp = 'Generated from `offer-catalog.ts` by `npm run catalog`. Edit the source, not this file.';

// JSON ────────────────────────────────────────────────────────────────────
writeFileSync(
  join(out, 'offer-catalog.json'),
  JSON.stringify({ meta: { contentHash: createHash('sha256').update(JSON.stringify({ offers, addOns })).digest('hex').slice(0, 12), priceStatus: 'Prices are proposed launch prices pending owner approval', laborCostPerHourAssumption: LABOR_COST_PER_HOUR }, offers, addOns }, null, 2),
);

// Catalog (all 14 artefacts per offer) ────────────────────────────────────
const catalog = [`# Offer Catalog`, '', `> ${stamp}`, '> **Status:** proposed launch prices, pending owner approval. Hours and costs are assumptions.', ''];
for (const o of offers) {
  const m = margins(o);
  catalog.push(
    `## ${o.code}. ${o.name}`,
    `*${o.tagline}* · Stage: **${o.stage}** · Setup **${usd(o.price.setup)}** · Monthly **${usd(o.price.monthly)}** (${o.price.status})`,
    '',
    `### 1. Customer-facing explanation`, `**${o.customer.headline}**`, '', o.customer.summary, '', list(o.customer.whatYouGet), '', `Best for: ${o.customer.bestFor}`, '',
    `### 2. Internal fulfillment specification`, '**Setup**', list(o.fulfillment.setup), '', '**Monthly**', list(o.fulfillment.monthly), '',
    `### 3. Eligibility criteria`, '**Good fit**', list(o.eligibility.goodFit), '', '**Not a fit**', list(o.eligibility.notAFit), '',
    `### 4. Pricing sheet`, `| Setup | Monthly | Status |`, `|---|---|---|`, `| ${usd(o.price.setup)} | ${usd(o.price.monthly)} | ${o.price.status} |`, o.cost.passThrough ? `\nUsage-based: ${o.cost.passThrough}` : '', '',
    `### 5. Cost model (assumptions)`, `Tools ≈ ${usd(o.cost.toolCostMonthly)}/mo · labour at ${usd(LABOR_COST_PER_HOUR)}/h · setup margin ${pct(m.setupMargin)} · monthly margin ${pct(m.monthlyMargin)}${m.flags.length ? ` · ⚠ ${m.flags.join('; ')}` : ''}`, list(o.cost.notes), '',
    `### 6. Expected delivery hours`, `Setup ${o.hours.setup.min}–${o.hours.setup.max} h · Monthly ${o.hours.monthly.min}–${o.hours.monthly.max} h`, '',
    `### 7. Scope limits`, list(o.scopeLimits), '',
    `### 8. Exclusions`, list(o.exclusions), '',
    `### 9. Required customer inputs`, list(o.requiredInputs), '',
    `### 10. Onboarding checklist`, o.onboarding.map((x) => `- [ ] ${x}`).join('\n'), '',
    `### 11. Service agreement schedule`, `See \`schedules/${o.id}.md\` (DRAFT, needs qualified legal review).`, '',
    `### 12. Monthly reporting requirements`, list(o.reporting), '',
    `### 13. Upgrade recommendations`, list(o.upgrades.map((u) => `**${nameOf(u.to)}**: ${u.when}`)), '',
    `### 14. Cancellation and offboarding`, o.offboarding.map((x, i) => `${i + 1}. ${x}`).join('\n'), '',
    `### Compliance rules`, list(o.compliance), '', '---', '',
  );
}
catalog.push('## Add-on catalog', '', '| Add-on | Price | Status | Summary | Eligibility | Limits |', '|---|---|---|---|---|---|');
for (const a of addOns) catalog.push(`| ${a.name} | ${addOnPrice(a)} | ${a.priceStatus} | ${a.summary} | ${a.eligibility} | ${a.limits.join('; ')} |`);
writeFileSync(join(out, 'OFFER-CATALOG.md'), catalog.join('\n') + '\n');

// Pricing sheet ───────────────────────────────────────────────────────────
const fc = flagshipComparison();
writeFileSync(
  join(out, 'PRICING-SHEET.md'),
  [
    '# Pricing Sheet — proposed launch prices', '', `> ${stamp}`, '> Not market benchmarks. Pending owner approval (spec Part 2).', '',
    '| Code | Offer | Stage | Setup | Monthly |', '|---|---|---|---|---|',
    ...offers.map((o) => `| ${o.code} | ${o.name} | ${o.stage} | ${usd(o.price.setup)} | ${usd(o.price.monthly)} |`),
    '', `**Flagship note:** programs A–E add up to ${usd(fc.setupSum)} setup + ${usd(fc.monthlySum)}/mo. Local Revenue Dominator™ is ${usd(fc.flagshipSetup)} + ${usd(fc.flagshipMonthly)}/mo and replaces overlapping smaller retainers when a client upgrades.`,
    '', '**Usage-based costs:** messaging, calling minutes, phone numbers and carrier registration are billed at cost and disclosed before go-live.',
    '', '## Add-ons', '', '| Add-on | Price | Status |', '|---|---|---|', ...addOns.map((a) => `| ${a.name} | ${addOnPrice(a)} | ${a.priceStatus} |`), '',
  ].join('\n'),
);

// Cost model ──────────────────────────────────────────────────────────────
writeFileSync(
  join(out, 'COST-MODEL.md'),
  [
    '# Cost & Margin Model (illustrative)', '', `> ${stamp}`,
    `> Assumptions: labour ${usd(LABOR_COST_PER_HOUR)}/h loaded cost; hours at range midpoints; tool costs are estimates to verify against current vendor pricing. Target gross margin ${pct(TARGET_GROSS_MARGIN)}.`, '',
    '| Offer | Setup price | Setup cost | Setup margin | $/h setup | Monthly price | Monthly cost | Monthly margin | $/h monthly | Flags |', '|---|---|---|---|---|---|---|---|---|---|',
    ...offers.map((o) => { const m = margins(o); return `| ${o.code}. ${o.shortName} | ${usd(o.price.setup)} | ${usd(Math.round(m.setupCost))} | ${pct(m.setupMargin)} | ${usd(Math.round(m.setupRevenuePerHour))} | ${usd(o.price.monthly)} | ${usd(Math.round(m.monthlyCost))} | ${pct(m.monthlyMargin)} | ${usd(Math.round(m.monthlyRevenuePerHour))} | ${m.flags.join('; ') || '—'} |`; }),
    '', 'Flags mean an offer needs a pricing review, hour reduction (templates/automation) or scope tightening before approval. They do not mean the price is wrong; the inputs are unvalidated assumptions.', '',
  ].join('\n'),
);

// Agreement schedules ─────────────────────────────────────────────────────
for (const o of offers) {
  writeFileSync(
    join(out, 'schedules', `${o.id}.md`),
    [
      `# Schedule A — ${o.name}`, '', '> **DRAFT — requires review by a qualified attorney before client use.** Generated from the offer catalog.', '',
      '## A1. Services', list(o.services), '', '## A2. Fees', `- One-time setup fee: ${usd(o.price.setup)}`, `- Monthly service fee: ${usd(o.price.monthly)}`, o.cost.passThrough ? `- Usage-based costs: ${o.cost.passThrough}` : '- No usage-based pass-through costs expected.', '- Payment terms, minimum term and notice period: [OPEN — owner decision]', '',
      '## A3. Scope limits', list(o.scopeLimits), '', '## A4. Exclusions', list(o.exclusions), '',
      '## A5. Client responsibilities', list(o.requiredInputs), '- Grant access through delegated/user accounts. RRS will never ask for passwords in forms or email.', '',
      '## A6. Reporting', list(o.reporting), '', '## A7. Compliance commitments', list(o.compliance), '',
      '## A8. No guarantees', 'RRS does not guarantee search rankings, placement in AI-generated answers, review volumes, lead volumes or revenue. Reports describe observations and documented results only.', '',
      '## A9. Cancellation and offboarding', o.offboarding.map((x, i) => `${i + 1}. ${x}`).join('\n'), '',
    ].join('\n'),
  );
}

console.log(`catalog: ${offers.length} offers, ${addOns.length} add-ons → exports/`);
