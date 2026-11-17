# Decisions Log

Format: ID · date · decision · reason · reversible? · owner approval needed?

### D-001 · 2026-11-16 · Standalone, additive repository
Started a fresh repo (`rrs-local-growth`). No Reale OS code was available, and the owner chose "start fresh locally". Nothing here modifies another system. **Reversible:** yes. Can merge into the Reale OS monorepo later.

### D-002 · 2026-11-16 · Static React + TypeScript build now; Next.js-portable
The spec prefers Next.js + TypeScript + Supabase. This session can't install packages, and Next.js isn't preinstalled. Code that was never built or tested would break the spec's verification rule. So the website is built with **React 19 server rendering (`renderToStaticMarkup`) and a small TypeScript build script**. That produces plain static HTML/CSS with a tiny vanilla-JS layer.
- Components are pure, prop-driven React. They move into a Next.js App Router `app/` directory almost unchanged. Business logic (tokens, offers, scoring) is framework-free TypeScript.
- Static output is fast, cheap to host (free tiers), and has no server attack surface.
- **Revisit at Phase 5** (client portal needs auth + Supabase RLS). At that point, migrate to Next.js in a networked session. **Owner may override.**

### D-003 · 2026-11-16 · Palette = spec values
Midnight Ink `#081020`, Electric Cobalt `#4F5DFF`, Signal Mint `#2DD4BF`, Slate `#334155`, Warm Canvas `#F7F4EE`, White. An older board's `#0B1020` is superseded. Color ratio rule: Ink + Canvas ≈ 80%, Cobalt ≈ 15%, Mint ≤ 5% (accent only). Gradients stay *within* the palette (Ink → deep Ink-Cobalt). No gold, no real-estate red.

### D-004 · 2026-11-16 · Typography = Inter Display (headings) + Inter (body), self-hosted
Inter is in the spec and is OFL-licensed, so it can be self-hosted for speed and privacy. Manrope wasn't available offline. Neue Haas Grotesk needs a commercial licence. Both can be added later through the `font.display` token. Self-hosted WOFF (Latin subset). WOFF2 would be ~30% smaller but needs Brotli, which isn't installed (see KNOWN-ISSUES).

### D-005 · 2026-11-16 · Logo = labelled concepts, not a replacement
The official geometric R mark wasn't available. `01-Brand-System/Logos/concepts/` holds concept marks stamped "CONCEPT — PENDING APPROVAL". The site uses a text wordmark plus the concept mark through one component (`<Logo/>`), so the approved file swaps in at one place. **Owner approval needed.**

### D-006 · 2026-11-16 · Snapshot ≠ Profit Leak Audit
The free Local Revenue Opportunity Snapshot (5 categories, 100 pts, multi-industry) is the top-of-funnel product. The paid PM Profit Leak Audit stays a separate, deeper diagnostic. The Snapshot can recommend it for property-management firms.

### D-007 · 2026-11-16 · No city-swap pages
Phoenix-area cities appear as a service-area list, not as near-duplicate "{service} in {city}" pages. Those are doorway pages, which the spec (Part 17) and Google policy prohibit. City pages are only allowed later if each one has genuinely unique local content.

### D-008 · 2026-11-16 · Every demo is labelled, and tests enforce it
Sample reports, the hero journey illustration and the audit preview use fictional businesses. Each one shows a visible "Fictional example" label. An automated test fails the build if a demo component renders without its label. No testimonials, client logos, rankings or result numbers exist on the site.

### D-009 · 2026-11-16 · Forms default to preview mode
With `FORM_ENDPOINT` unset, forms validate and show a clear "preview — nothing was sent" message. Nothing is transmitted or stored. Turning submissions on requires an endpoint (n8n webhook) and **owner approval**.

### D-010 · 2026-11-16 · Prices shown are proposed launch prices
The catalog stores `status: "proposed"` and `approval: "pending"` for every price. The pricing page and the register carry that status. **Owner approval needed before publishing.**

### D-011 · 2026-11-16 · No statistics without a verified source
The site copy makes qualitative claims only. A statistic gets added only with a citation recorded in `content/sources.ts`.

### D-012 · 2026-11-16 · Snapshot scoring: 5 × 20 points, tiered, "Not verified" excluded
Each category is worth 20 points across 3–6 criteria. Criteria score at 0 / 25 / 50 / 75 / 100% tiers (the same tier logic as the Profit Leak Audit, for consistency).
- A criterion that couldn't be checked is **Not verified**. It's excluded from the denominator, never scored as 0.
- The report shows *earned / verified points*, *coverage %* and *confidence* separately.
- Below 25% coverage, a category shows "Not verified" instead of a number.

### D-013 · 2026-11-16 · Spec folder structure adopted, with code inside it
The numbered folders from spec Part 18 are used as-is, so the repo is easy to browse on a phone. Code lives with the deliverable it serves (e.g. `02-Public-Website/`, `04-Audits-and-Scorecards/snapshot/`), and there's one root `package.json`.

### D-014 · 2026-11-16 · CTA colours
Primary buttons are Electric Cobalt with white text (4.8:1 contrast). Signal Mint is only used for accents, "recovered/positive" markers, and the focus ring on dark backgrounds. It's never used for body text on light backgrounds (contrast fails there).

### D-015 · 2026-11-16 · Analytics through a provider-agnostic event layer
Pages emit named events (`cta_click`, `snapshot_step`, `snapshot_submit`, `contact_submit`) to `window.dataLayer`. The provider script (Plausible or GA4) only loads when it's configured *and* consent rules allow it.

### D-016 · 2026-11-17 · Customer decks use Arial
Generated `.pptx` decks use Arial throughout. Inter isn't installed with PowerPoint, so a client opening the deck would get substituted fonts with different widths, and text could overflow. Brand colours, layouts and the concept mark still apply. **Reversible:** change `FONT` in `pptx.ts`.

### D-017 · 2026-11-17 · One report model feeds every export
All six Snapshot formats, and the website's sample report text, render from `report/model.ts`, so numbers can't drift between formats. CSV cells that a spreadsheet would execute (`= + - @`) are prefixed with an apostrophe (formula-injection guard). PDF metadata dates are pinned to the report date when `--stable` is used, so committed samples only change when their content changes.

### D-018 · 2026-11-17 · Scorecard workbooks built with Python openpyxl, generated from framework.json
No Node XLSX library was available offline. openpyxl is mature and standard for writing data validation, conditional formatting and formulas. The builder reads `framework.json` (generated from `framework.ts`), so criteria are never retyped, and the importer re-validates through the TypeScript engine. Requires Python 3 + openpyxl (`requirements.txt`). Workbook formulas use only Excel-2007-era functions (SUMIFS, COUNTIFS, IFERROR, MID/FIND), so they calculate the same in Excel, Google Sheets and LibreOffice. Result levels use text labels like "Half (50%)" so phone apps can't silently convert them to numbers.

### D-019 · 2026-11-17 · Phone workflow goes through chat, not git
Filled scorecards and research drafts contain personal contact details, so they stay in git-ignored folders. From a phone, the flow is:
1. Claude generates the workbook in the session and sends it to you.
2. You fill it in Google Sheets or Excel.
3. You attach it back to the chat.
4. Claude imports it, exports the six formats, and sends back the PDF and deck.

### D-020 · 2026-11-17 · ICP priority: verified problems first; the old tracker score is kept for reference
The spec's 100-point weighted score is the **outreach priority** and is always shown with its six parts, next to three separate results: ICP fit, verified opportunity and research confidence. Two rules keep it honest:
1. **P1 needs a verified opportunity of at least 30.** In the PM Lead Scorer, any 50–600-review firm rated 3.8–4.6 scored exactly 60 (hot) with no complaint found.
2. **National franchises top out at P2.** This keeps the tracker's intent: deprioritised, not hidden.

The property-management bands are the tracker's own, converted to ratios. Everything else (other industries, geography credits, reachability split, freshness) is a labelled starting assumption to tune with call outcomes. The exact legacy score stays in every export, so the owner can compare call orders. **Reversible:** all values live in `icp-config.ts`.

### D-021 · 2026-11-17 · Store our observations, not third-party review text
Review excerpts are scanned for complaint themes at scoring time. The research engine (RRS-3-02) should store the source reference, the theme found and our own dated note, and should not keep copies of third-party review text. See K-23.

### D-022 · 2026-11-17 · Call queue: event log, hosted privately, owner-only data
Outcomes are an **append-only event log**. A lead's state is always recomputed from its imported start plus its events, so undo = delete one event, and the same log replays into scoring (`leads:score`) and results (`leads:outcomes`). One logic module runs in the page, the CLI and the tests.

The owner's working queue is a **private hosted page**:
- leads sit in `leads.json` beside the page (republished when lists change)
- outcomes and settings go in the page's database, with rules limiting read and write to the owner, so they follow him across devices and Claude can read the log back
- without the database, the page saves on the device and says so

The same page also builds as a standalone file for local use and tests.

**Outcome-driven stage moves only go forward.** A missed call never undoes a booking. Do-not-call is never undone by a later outcome; only an explicit stage change can.

The calling window (8 AM–5 PM local, weekdays) is a courtesy, not a legal rule (see K-26).

