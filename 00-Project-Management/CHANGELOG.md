# Changelog

## ICP scoring — 2026-11-17 (branch `feature/phase-3-icp-scoring`)
- **Four separate scores per business:** ICP fit, verified opportunity, research confidence, and outreach priority (the configurable 100-point score with spec weights 25/25/20/15/10/5, always shown with its six parts). Missing evidence is Not verified: it earns no points and is never shown as a zero.
- **Built on the owner's PM Lead Scorer:** its review-count size bands, rating band, pain scale and franchise rule carry over as ratios. An exact port of the old score is shown alongside (`old_tracker_score`); it matches the original on all 46 seed leads.
- **Fixes to the old logic:**
  - P1 needs a verified problem (size + rating alone used to score exactly 60 = hot)
  - complaint themes count once ("cancel" + "canceled" was 2 hits)
  - praise with a negation is ignored ("no voicemail runaround")
  - sentences about a previous manager or other companies are skipped
  - franchises are capped at P2
- **Gates:** do not contact, disqualified, declined, in progress, inbound (reply personally) and research first.
- **Imports:** tracker JSON batches, the tracker's CSV export (keeps Status + Notes, merged by business), website leads and Snapshots. Command: `leads:score` writes a phone-friendly call list (CSV) and full JSON, and refuses to write real lead data into committed folders.
- **CRM record:** `icp_fit` and `outreach_priority` are now filled. A Snapshot alone gives "Not enough evidence" / "Research first", never a guess.
- **Methodology:** `ICP-METHODOLOGY.md` is generated from the config (`icp:docs`), with a drift test.
- **Deterministic decks:** `--stable` deck exports pin dates, section ids and embedded chart workbooks, so committed samples no longer change on every rebuild.
- **Tests:** 14 new ICP tests plus a deck-stability check. Unit total 68.

## Scorecard workbook — 2026-11-17 (branch `feature/phase-2-completion`)
- **Local Revenue Opportunity Scorecard (XLSX)** generated from the framework:
  - per-row dropdowns (status; only the result levels each criterion defines; allowed evidence types)
  - live Summary formulas that match the engine
  - Start here guide with a legend and example row
  - Competitors, Quick wins and Owner numbers tabs
  - fit-to-width printing
- **Importer:** turns a filled workbook into a Snapshot. It validates every row and cites the exact cell to fix, accepts phone-style dates and reviewer overrides, and re-checks everything with the engine. With `--export` it produces all six report formats.
- **Commands:** `scorecard:new` (blank, or prefilled from a website lead incl. owner answers), `scorecard:import`, `scorecards`.
- **Committed:** blank template and filled fictional sample workbook.
- **Tests:** 6 new (lossless round trip, LibreOffice formula parity with 0 errors, cell-cited validation, phone-style input, lead prefill). Unit total 54.

## Phase 2 completion — 2026-11-17 (branch `feature/phase-2-completion`)
- **Baseline fixes:** the catalog export is deterministic (content hash, not a date), and the e2e run log is untracked, so `verify` leaves a clean tree.
- **Exportable Snapshot reports:** one report model feeds printable HTML, PDF (Chromium, page-numbered, pinned metadata), criteria + summary CSV (formula-injection guard), full JSON, CRM record + JSON Schema, and a 9-slide editable deck with native charts. CLI: `snapshot:export`, `samples`. Fictional sample exports are downloadable on the site.
- **Lead capture pipeline:** a server-side validator shared by n8n, tests and the mock; lead → research draft (`snapshot:new`); n8n intake workflow (inactive, no credentials, env-var URLs). The client enforces phone + SMS consent for phone/text and sends spam signals. Connected-mode e2e runs against a mock intake, including failure and retry dedupe. Research outputs are git-ignored.
- **Mobile + consent:** sticky mobile Snapshot CTA, saved form progress (never consent), step scroll, keyboard hints, GA4 consent banner with consent-gated loading.
- **Tests:** 48 unit tests, 801 preview e2e checks, 32 connected + consent checks.

---

Phase 0–2 foundation, 2026-11-16 (branch `feature/phase-1-foundation`):

## Phase 2 — Website & lead magnet
- 26-page static site (React 19 SSR + TypeScript), mobile-first, with a self-hosted Inter font.
- Home with all 13 spec sections, an original customer-journey hero, the system diagram, a score-card preview and a hypothetical calculator.
- Service template (×5), industry template (×6), pricing, about, contact, case studies, resources, legal drafts, 404.
- Free Snapshot: 3-step chip form, owner self-check, validation, honeypot + timing checks, UTM attribution, SMS consent, preview mode.
- Methodology page and fictional sample report, both generated from the framework and engine.
- SEO: metadata, canonical, OG, JSON-LD, sitemap, robots (noindex while in preview), `_headers` with CSP.
- QA: Playwright e2e (776 checks). Fixed: mobile overflow on the sample report, the mobile nav clipped by `backdrop-filter`, meta description lengths, and a shared CTA paragraph on industry pages.

## Phase 2.4a — Snapshot engine
- 100-point framework (5 × 20, 26 criteria), the engine (Not verified excluded, coverage/confidence, staleness, audited overrides, recommendations, hypothetical scenarios), a fictional HVAC sample, METHODOLOGY.md and framework.json.

## Phase 1 — Business & offer foundation
- Typed offer catalog (6 offers × 14 artefacts + 8 add-ons) with JSON/Markdown exports, pricing sheet, cost model and agreement schedules (drafts).
- Pricing framework, positioning & audience segmentation, proposal template, website architecture.
- Brand system: tokens.json → CSS/TS, contrast tests, Inter WOFF subsets, Logo Concept A (pending), favicons, OG images, guidelines.

## Phase 0 — Audit
- Environment audit, preservation plan, implementation plan, decisions log, data-driven deliverables register with tests, spec copy committed.
