# Implementation Plan — RRS Local Growth Operating System

Source of truth: `source/MASTER-BUILD-PROMPT.pdf`. Phases follow spec Part 19 and are ordered by **dependency first, then business value**. Each milestone ends in a commit and leaves the system usable.

**Business-value logic:** the shortest path to revenue is a credible website, a free Snapshot that captures leads, and clear offers to sell. Research automation, the portal and n8n come after there are prospects and clients to use them on.

## Dependency map

```
Brand tokens ─┬─> Website components ─> Pages ─> Snapshot page ─> (n8n intake, Phase 6)
Offer catalog ┤                                   │
Snapshot      ┴─> Sample report ──────────────────┘
framework ─────> Phase 3 scorecards / research engine ─> Phase 4 outreach drafts
Reale OS repo (EXTERNAL) ─> Phase 3 data model ─> Phase 5 portal ─> Phase 6 automations
```

## Phase 0 — Environment & asset audit ✅ (this session)
- [x] Inspect environment, repos, assets → `PHASE-0-AUDIT.md`
- [x] Preservation & integration plan (audit §6)
- [x] Deliverables register (data-driven, test-enforced)

## Phase 1 — Business & offer foundation (this session)
| # | Milestone | Output |
|---|---|---|
| 1.1 | Brand system | `01-Brand-System/` tokens.json → CSS/TS, typography, logo concepts, contrast tests |
| 1.2 | Offer catalog | `03-Offers-and-Pricing/offer-catalog.ts`. All 6 offers × 14 required fields, plus add-ons. JSON + Markdown exports, pricing sheet, per-offer agreement schedules (drafts) |
| 1.3 | Pricing framework | `PRICING-FRAMEWORK.md` + cost/margin model with flagged assumptions |
| 1.4 | Positioning & segmentation | `18-Documentation/POSITIONING-AND-AUDIENCE.md` |
| 1.5 | Proposal template | `06-Sales/Proposals/PROPOSAL-TEMPLATE.md` (draft) |
| 1.6 | Website architecture | `02-Public-Website/ARCHITECTURE.md` |

## Phase 2 — Website & lead magnet (started this session)
| # | Milestone | Output |
|---|---|---|
| 2.1 | Build system + SEO plumbing | Static React build, metadata, canonical, OG, JSON-LD, sitemap, robots |
| 2.2 | Component library | Header/nav, footer, buttons/CTAs, sections, cards, pricing, FAQ, breadcrumbs, journey visual |
| 2.3 | Core pages | Home (13 sections), Services hub + 5 service pages, Industries hub + industry pages, Pricing, About, Contact, Case Studies, Resources, Privacy/Terms/Accessibility (drafts) |
| 2.4 | Snapshot lead magnet | Scoring framework + engine + tests, request flow with chips, follow-up self-check, sample report (fictional) |
| 2.5 | Forms | Validation, honeypot + timing spam checks, UTM/referrer attribution, consent, preview mode |
| 2.6 | QA | Unit tests, Playwright at 375/768/1280, overflow, link, SEO, label checks |
| 2.7 | *Needs approval* | Domain, hosting, n8n endpoint, analytics, Cal.com, Search Console. Guidance docs only until approved |

## Phase 3 — Audit & research engine (next)
Blocked in part by: Reale OS repo access (data model), and Google API keys (approval + usage costs).
- 25 scorecards from spec Part 5 as XLSX (openpyxl) + CSV/JSON templates. Start with #1 Local Revenue Opportunity Scorecard, generated from the same framework as the Snapshot.
- Evidence model (source URL, timestamp, confidence, verified-vs-assumed).
- ICP score with 4 separated outputs (fit / opportunity / confidence / priority). Seed it from the existing PM scorer.
- Research pipeline (20 steps from spec Part 6), written against documented APIs only. No Maps scraping.
- Snapshot exports: PDF, printable HTML, CSV, JSON, CRM record, presentation.

## Phase 4 — Sales & marketing system
Scripts using the five gears, the 12 objections, outreach templates per service × industry, compliance controls (DNC/TCPA/CAN-SPAM, suppression list), sales documents (deck, one-pagers, SOW, agreement draft), 90-day content calendar, ad packages, visual asset library (SVG/PNG/WebP + prompt files for anything that isn't rendered).

## Phase 5 — Onboarding & delivery
Per-service onboarding flows (no irrelevant questions), delegated-access instructions (no passwords), SOP library (trigger/owner/inputs/procedure/QC/output/escalation/done), deliverables tracker, approvals, client dashboard. **Triggers the Next.js + Supabase RLS migration (D-002).**

## Phase 6 — Automation & integration
The 30 n8n workflows from spec Part 15 as importable JSON. Env-var secrets, retries, rate limits, dedupe, approval gates, error alerts. **Needs an n8n instance + approval.**

## Phase 7 — Launch readiness
End-to-end test from discovery through renewal with fictional data. Fix critical failures. Owner sign-off on `LAUNCH-CHECKLIST.md`.

## Approval gates (never crossed without the owner)
Publishing/deploying · buying domains/services · activating paid APIs · sending any outreach · launching ads · billing · changing production systems · final prices · legal documents · logo/brand changes.
