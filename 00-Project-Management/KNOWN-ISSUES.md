# Known Issues & Limitations

| # | Severity | Issue | Impact | Fix / owner |
|---|---|---|---|---|
| ~~K-01~~ | — | ~~GitHub not connected~~ | **Resolved 2026-11-16:** pushed to `daviedigital26/rrs-local-growth` | — |
| K-02 | Medium | Forms still in preview mode on the default build (no `FORM_ENDPOINT`). The pipeline is built and tested against a mock. | No live leads yet | Approve n8n → import the workflow → set `FORM_ENDPOINT` |
| ~~K-03~~ | — | ~~No server-side validation~~ | **Resolved 2026-11-17:** `lead-intake.ts`, bundled into the n8n workflow | — |
| K-04 | Medium | `.tsx` files aren't checked by `tsc` offline (no `@types/react`). All `.ts` logic is strict-checked. The `.tsx` code is exercised by 833 e2e checks. | A type slip in a component could pass unnoticed | `npm install && npm run typecheck` in a networked session |
| K-05 | Medium | Logo is Concept A (also used in the report and deck headers) | Brand approval | Owner |
| K-06 | Medium | Legal pages and agreement schedules are drafts | Can't publish | Attorney review |
| K-07 | Medium | Every offer is below the 50% margin target under assumed costs | Pricing risk | Owner decision |
| ~~K-08~~ | — | ~~GA4 consent banner missing~~ | **Resolved 2026-11-17** | — |
| K-09 | Low | No axe-core audit (not installed offline). Custom a11y checks only. | Possible minor gaps | Add axe + screen-reader pass |
| K-10 | Low | Fonts are WOFF, not WOFF2 | ~30% larger font payload | Rebuild with Brotli |
| K-11 | Low | Without JS and without an endpoint, a form POST to `#…` can get a 405 on static hosts | Preview-only | Goes away once `FORM_ENDPOINT` is set |
| K-12 | Low | Specialist offers link to Contact with a topic, not to their own pages | Fewer entry points | Import existing pages (Phase 4) |
| K-13 | Low | Some SEO titles are over ~60 characters | Cosmetic | Tighten |
| K-14 | Info | Fictional names weren't checked against real Arizona businesses | Low | Owner sanity check |
| K-16 | Info | Automated AI-assistant sampling needs a terms review per assistant | Phase 3 | Review first |
| K-17 | Medium | The n8n workflow is generated from the standard node formats but **hasn't been imported into a live n8n**. `allowedOrigins` holds a placeholder domain. | Could need small adjustments at import | Import, test, adjust (owner + agent) |
| K-18 | Low | PDF export needs Chromium wherever it runs (not inside n8n's Code node) | Production PDF needs a worker, CI job or local run | Decide where exports run (Phase 6) |
| K-19 | Low | Saved Snapshot progress uses `sessionStorage`, so it survives reloads and app switches but not a closed tab (by design: shared devices) | Minor | — |
| K-20 | Info | JS is 15.6 KB minified / 5.7 KB gzipped (budget raised to 20 KB) | None | — |
