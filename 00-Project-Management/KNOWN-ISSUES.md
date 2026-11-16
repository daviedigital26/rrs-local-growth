# Known Issues & Limitations

| # | Severity | Issue | Impact | Fix / owner |
|---|---|---|---|---|
| K-01 | **High** | GitHub not connected. Commits live only in the cloud session. | Work could be lost if the session ends | Owner: connect GitHub. Agent: push the branch. A git bundle backup was sent in chat. |
| K-02 | Medium | Forms run in **preview mode** (no `FORM_ENDPOINT`). | Leads aren't captured yet | Approve n8n → build the intake workflow (Phase 2.7/6). |
| K-03 | Medium | Server-side validation, dedupe and rate-limiting don't exist yet. | When forms go live, n8n must re-validate everything | Specified in `INTEGRATIONS-GUIDE.md` |
| K-04 | Medium | `.tsx` files aren't type-checked by `tsc` offline (`@types/react` unavailable). The build and 776 e2e checks exercise them. | A type error could slip through | Run `npm install && npm run typecheck` in a networked session. |
| K-05 | Medium | Logo is **Concept A**, not the official mark. | Brand approval needed | Owner supplies official files, or approves the concept. |
| K-06 | Medium | Legal pages and agreement schedules are **drafts**. | Can't publish as-is | Qualified legal review |
| K-07 | Medium | Every offer is below the 50% target margin under *assumed* hours/costs. | Pricing risk | Owner decision. Validate with real time data. |
| K-08 | Low | GA4 path needs a consent banner (not built). Only the Plausible path is wired. | GA4 can't be enabled yet | Build the consent banner if GA4 is chosen. |
| K-09 | Low | No automated axe-core audit (not installed offline). Custom checks cover labels, headings, skip link, focus, contrast and tap targets. | Possible minor a11y gaps | Add axe in a networked session, plus manual screen-reader testing. |
| K-10 | Low | Fonts are WOFF, not WOFF2 (Brotli unavailable). About 30 KB per weight. | ~30% larger font payload | Regenerate with `brotli` installed. |
| K-11 | Low | Without JS and without an endpoint, form POSTs go to `#…` and static hosts may answer 405. | Preview-only edge case | Disappears once `FORM_ENDPOINT` is set. |
| K-12 | Low | Specialist offers (Realtor Pipeline Recovery™, Profit Leak Audit, Detailer Booking Recovery) link to Contact with a topic. They have no dedicated pages. | Fewer entry points | Import existing landing pages (Phase 4). |
| K-13 | Low | Some SEO titles are longer than ~60 characters and may be truncated in results. | Cosmetic | Tighten after keyword research. |
| K-14 | Info | Fictional names ("Mesquite Ridge Comfort Co.", "Competitor A/B/C") weren't checked against real Arizona businesses (no web access in the build session). They're always labelled fictional. | Low confusion risk | Owner sanity-check. Rename if a real business matches. |
| K-15 | Info | Manrope isn't used (not available offline). Inter covers the spec. | None | Optional |
| K-16 | Info | Automated AI-assistant sampling (Snapshot criterion `ai.assistant_sample`) needs a terms-of-use review per assistant before it's automated. | Phase 3 | Review before building |
