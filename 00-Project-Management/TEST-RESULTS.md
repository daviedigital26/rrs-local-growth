# Test Results

**Run:** 2026-11-17, on a fresh clone of `feature/phase-2-completion` from GitHub (Node 22.23, Chromium via Playwright-core 1.63, offline dependency links). Command: `npm run verify`. Exit 0, working tree clean afterwards.

## Summary
| Suite | Command | Result |
|---|---|---|
| Build | `npm run build` | **Pass**: 26 pages; CSS 49 KB (≈10 KB gz); JS 15.6 KB (5.7 KB gz); n8n workflow generated (inactive) |
| Strict type-check | `npm run typecheck:core` | **Pass**: tokens, catalog, Snapshot engine, report model/CSV/CRM/PDF/PPTX, intake, n8n builder, mock |
| Unit tests | `npm test` | **54/54 pass** |
| E2E, preview mode | `npm run test:e2e` | **801/801 pass** (~77 s) |
| E2E, connected + consent | `npm run test:e2e:connected` | **32/32 pass** (~51 s) |

## Unit tests (54)
- **Tokens (4), catalog (9), engine (13), register (5):** unchanged since Phase 1, see `CHANGELOG.md`.
- **Report exports (9):**
  - model numbers match the engine; insufficient evidence gives no score
  - CSV escaping + **formula-injection guard**
  - a Not verified cell is blank, never 0
  - summary CSV; full JSON flags
  - **CRM record validates against `crm-record.schema.json`**, with ICP fit/priority null and no guessed phone
  - HTML is self-contained, with no external requests and HTML-injection escaped
  - **PDF**: real file, Letter size, 3–10 pages, `pdftotext` finds the key content
  - **PPTX**: 9 slides, native charts, no ZIP folder entries, fictional label on every slide
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
