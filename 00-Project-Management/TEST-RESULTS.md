# Test Results

**Run:** 2026-11-17 on `feature/phase-3-icp-scoring` (Node 22.23, Chromium via Playwright-core 1.63, offline dependency links). Command: `npm run verify`. Exit 0; the build regenerates only committed, deterministic files.

## Summary
| Suite | Command | Result |
|---|---|---|
| Build | `npm run build` | **Pass**: 26 pages; CSS 49 KB (≈10 KB gz); JS 15.6 KB (5.7 KB gz); n8n workflow generated (inactive) |
| Strict type-check | `npm run typecheck:core` | **Pass**: tokens, catalog, Snapshot engine, report model/CSV/CRM/PDF/PPTX, intake, ICP scoring, call queue + scripts (incl. the browser app), n8n builder, mock |
| Unit tests | `npm test` | **79/79 pass** |
| E2E, preview mode | `npm run test:e2e` | **801/801 pass** (~80 s) |
| E2E, connected + consent | `npm run test:e2e:connected` | **32/32 pass** (~51 s) |
| E2E, call queue | `npm run test:e2e:queue` | **46/46 pass** (~6 s) |

## Unit tests (79)
- **Tokens (4), catalog (9), engine (13), register (5):** unchanged since Phase 1, see `CHANGELOG.md`.
- **Report exports (9):**
  - model numbers match the engine; insufficient evidence gives no score
  - CSV escaping + **formula-injection guard**
  - a Not verified cell is blank, never 0
  - summary CSV; full JSON flags
  - **CRM record validates against `crm-record.schema.json`**, with ICP fit "Not enough evidence" + "Research first" for a Snapshot alone, "Inbound" for a website request, and no guessed phone
  - HTML is self-contained, with no external requests and HTML-injection escaped
  - **PDF**: real file, Letter size, 3–10 pages, `pdftotext` finds the key content
  - **PPTX**: 9 slides, native charts, no ZIP folder entries, fictional label on every slide; `--stable` pins dates, section ids and embedded chart workbooks (committed samples are byte-identical across runs)
- **Intake (8):**
  - valid request normalised (email, E.164 phone, domain, unknown fields stripped, bad concern/self-check values dropped)
  - 8 invalid cases rejected with specific errors
  - spam (honeypot, under 3 s) dropped; missing timing accepted but flagged
  - contact form path; normalisers and dedupe keys
  - lead → research draft (no assumed facts; a draft never shows a score)
  - n8n workflow is inactive, has no credentials, is wired correctly and uses env-var URLs
  - **the embedded n8n code runs standalone and matches the TypeScript validator**

- **Scorecard workbook (6):**
  - committed template matches the framework version and defaults to Not verified
  - **lossless round trip** (Snapshot → workbook → import) with identical scores
  - **LibreOffice recalc: Summary formulas equal the engine** for every category and overall (51/100, 93%), 0 formula errors (174 formulas); the blank workbook shows "Not enough evidence"
  - invalid rows refused with exact cell references: missing result, disallowed evidence type, bad date, override without reviewer, missing note, partial owner numbers
  - accepts real dates, US dates, reviewer overrides (flowing into the engine audit trail) and Not applicable
  - a website lead becomes a prefilled workbook

## E2E: preview mode (801)
Everything from Phase 1 still passes (26 pages × 3 viewports: overflow, fonts, demo labels, tap targets, SEO, headings, labels, links, prices, forms, spam, calculator, nav, no-JS), plus:
- **Downloads:** the sample report offers all 6 formats; each is served with the right type (PDF/PPTX magic bytes).
- **Contact channel rules:** choosing "Text" requires a phone number and SMS consent.
- **Mobile (15):**
  - sticky CTA: hidden at the top, appears after scrolling, ≥44 px and inside the viewport, steps aside at the footer and CTA bands, leads to the Snapshot form, absent on the Snapshot page and on desktop
  - keyboard hints present
  - next step scrolls the form into view
  - answers restored after a reload, on the same step
  - consent is never restored
  - Start over clears everything

## E2E: connected + consent (32)
- **Connected:** a site copy is built with `FORM_ENDPOINT` → a local mock running the same validator as n8n.
  - CSP allows only self + the intake origin
  - invalid input never sent
  - one request from the site origin (CORS)
  - **the server accepts the real browser payload**, with every field normalised: business, contact/consent text, self-check, interest, attribution, timing
  - analytics records "sent"
  - **endpoint failure** shows a retry message, keeps the answers and re-enables the button
  - **the retry succeeds with the same dedupe key** (no duplicate lead)
  - contact form accepted with its topic
- **Consent (GA4 build, Google intercepted):**
  - banner on first visit
  - zero Google requests before a choice
  - sticky CTA hidden while the banner is open
  - Decline is remembered and nothing loads
  - Cookie settings reopens the banner
  - Allow loads the tag and forwards site events
  - Allow is remembered
  - CSP widened only in the GA4 build

## Manual QA this round
- PDF pages and all 9 slides rendered and reviewed. Fixed: a stranded heading, wrapped dates, half-empty pages, title/tag collisions, rounded chart labels, inconsistent title alignment.
- The deck passed the OOXML validator after stripping ZIP folder entries (the validator warned those break opening in some cloud apps).
- Mobile screenshots reviewed: sticky CTA, restored-answers note, consent banner.

## Not yet tested (and why)
Live n8n import and run (not approved yet) · real submissions to a CRM · real-device iOS/Android (Chromium emulation only) · screen-reader/axe audit · Lighthouse on a deployed URL.

- **ICP scoring (14):**
  - config: spec weights total 100
  - **legacy port identical to the original tracker function**: on fixtures here, and on all **46/46** real seed leads (run locally against a verbatim copy of the original; the real data is git-ignored and not committed)
  - review signals: themes count once; negated praise, previous-company and comparison sentences ignored; negation stops at a comma ("not returned, delays…" still counts the delay)
  - **missing evidence is Not verified** (null, never 0); a checked clean sample is a real 0, labelled honestly
  - P1 needs a verified problem; franchise capped at P2; gates: do not contact > disqualified > declined > in progress > inbound > research first; no-calls → email first
  - freshness: fresh > undated > stale; units managed replace the review proxy; weights configurable
  - imports: item-cited errors, CSV header check, status + notes, JSON + CSV merge (dated facts win)
  - call list CSV: phone display format, formula-injection guard
  - drift guards: committed fictional call list and `ICP-METHODOLOGY.md` match a fresh run

## Real-data check (not committed)
The 46-lead seed from the owner's PM Lead Scorer, scored as of 2026-11-17 (pull date unknown, so undated): **P1 11 · P2 23 · P3 12**. The old tracker had 19 hot · 15 warm · 12 cold. All 11 P1 leads have a verified complaint theme. 8 of the 19 old "hot" leads had none: 7 scored exactly 60 on size + rating alone, and 1 scored 68 only because of a complaint about its *previous* manager. All 8 now sit in P2 with *"no problem verified yet"*. The other 11 old-hot leads are exactly the new P1 list.

- **Call queue (11):**
  - business days; local time per state (California an hour behind Arizona in winter); calling window
  - cadence 1/2/3/5 business days, parked after 5 unanswered; a conversation resets it
  - stages only move forward on outcomes; do-not-call is permanent; "not now" without permission = declined
  - queue order: due (overdue first) → new by priority, open-now-first by the business's local time; gated leads excluded
  - stats, pipeline/closed $, follow-up calendar
  - call log: JSON Schema, validation, idempotent merge, suppression list
  - **scripts honest by construction**: no prices, statistics, guarantees or client stories; only verified themes; "one review" never becomes "a couple"; opt-out on every email; address warning
  - scoring loop: declined → closed, do-not-call → do not contact, wrong number → no phone, booked → in progress
  - tracker v2 CSV (Audit/Build/Retainer stages, follow-up, value, last activity)
  - data embedded safely (`</script>` can't break out); outcomes report

## Call queue browser test (46)
Fictional sample at 375px and 1280px, light and dark, time frozen at Tue 17 Nov 2026 10:30 AM Phoenix:
- no script errors, no sideways scroll, ≥44px targets, fictional label
- Call link dials the right number; local time + window shown; opening angle quotes the verified phrase
- log / **undo** / **reload persists**; every outcome that needs details (audit date + value, callback date incl. refusing an empty date, do not call, wrong number) until the queue is clear
- pipeline: calendar, stage + $, research list, declined/DNC counts
- search; details sheet (4 scores, scripts, objection reply, alternative offer, timeline, Escape closes)
- settings persist into scripts
- call log downloads **schema-valid** with the do-not-contact list; pipeline CSV; import on a "second device" merges; a bad log is refused
- hosted layout (page + `leads.json` over HTTP) loads and says where it saves

## Hosted queue (owner's real leads), checked 2026-11-17
Published privately (read: owner). Database rules: `calls`, `settings`, `leads`, read and write owner only. Claude can read the database (empty `calls` listing). A probe write as owner succeeded; the same write at a lower role was refused; the probe was deleted. The in-page database calls can only run inside claude.ai (K-27).

