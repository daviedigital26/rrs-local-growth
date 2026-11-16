# Test Results

**Run:** 2026-11-16, Claude Code cloud session (Node 22.23, Chromium via Playwright-core 1.63). Re-run everything with `npm run verify`.

## Summary
| Suite | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **31/31 pass** |
| Strict type-check (framework-free modules) | `npm run typecheck:core` | **Pass** |
| Build | `npm run build` | **Pass**: 26 pages, 489 KB HTML total (home 52 KB / 11 KB gz), CSS 47 KB (9.6 KB gz), JS 11.7 KB (4.3 KB gz) |
| End-to-end | `npm run test:e2e` | **776/776 pass** in ~72 s (`15-Quality-Assurance/e2e/last-run.json`) |

## Unit tests
- **Tokens (4):** palette equals spec; 23 WCAG contrast pairs meet their minimums; known-failing pairs stay unapproved; derived colours are valid.
- **Offer catalog (9):** spec prices A–F; spec service lists complete; approval recorded before `approved`; all 14 artefacts populated; add-on prices; upgrade paths valid; no guarantee/hype language in customer copy; compliance rules present (AI placement, review gating/incentives, usage costs); cost model maths.
- **Snapshot engine (13):** framework integrity (5×20, unique IDs, complete criteria, "not sure" options); **missing evidence never scored 0**; all-Not-verified → no score/offer; unchecked → Not verified + warning; minimum coverage hides numbers; not-applicable leaves the denominator; overrides keep the original and require reason + evidence; stale evidence lowers confidence; validation rejects bad input; recommendation mapping incl. flagship; fictional sample = 51/100 at 93% coverage; hypothetical scenarios; owner self-check.
- **Register (5):** unique IDs; Created/Tested files exist; Tested items have a validation note; dependencies valid; nothing Approved without owner approval.

## End-to-end coverage (per page × 375/768/1280 unless noted)
HTTP 200 · no console errors · **no horizontal overflow** · webfonts loaded · demos labelled fictional · tap targets ≥ 40 px (mobile) · one h1 · unique titles · description length · canonical · OG image · valid JSON-LD · all inputs labelled · skip link · no skipped heading levels · industry pages have unique copy (doorway guard) · every internal link and anchor resolves · sitemap/robots/manifest/OG/`_headers` served · CSP present · robots disallows indexing in preview · pricing page shows every catalog price.

**Flows:** Snapshot step validation, "Other" city, invalid website/email, SMS consent toggle, self-check scoring with Not verified, successful preview submission, analytics events, first-touch UTM capture, honeypot silently dropped, sub-3-second submissions treated as spam, contact form validation and success, link prefill (`?industry=`, `?topic=`), calculator maths, mobile nav open/close/Escape **and the panel filling the screen (scrolled and unscrolled)**, first Tab focuses the skip link, no-JS fallback shows all steps and the nav.

## Issues found and fixed during testing
1. Sample report overflowed 165 px on mobile (grid min-content from a wide table) → `min-width: 0` on grid children.
2. The mobile nav panel was clipped to the header when opened on a scrolled page (`backdrop-filter` creates a containing block) → removed the filter while open, plus a computed top offset. Regression test added.
3. Home description too long (188) and accessibility description too short (67) → rewritten.
4. Industry pages shared an identical CTA paragraph → made industry-specific, and the doorway check ignores CTA bands.

## Not yet tested (and why)
- Real submissions to n8n/CRM (no endpoint approved).
- Real-device testing on iOS Safari / Android Chrome (cloud session). Chromium emulation only.
- Screen-reader walkthrough and axe-core audit (K-09).
- Lighthouse/PageSpeed scores (needs a deployed URL).
