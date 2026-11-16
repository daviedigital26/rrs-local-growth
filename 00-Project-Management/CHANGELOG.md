# Changelog

All dates 2026-11-16 (branch `feature/phase-1-foundation`).

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
