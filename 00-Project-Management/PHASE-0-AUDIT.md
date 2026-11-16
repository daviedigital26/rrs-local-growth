# Phase 0 — Environment and Existing Asset Audit

**Date:** 2026-11-16 · **Auditor:** Claude (Claude Code cloud session) · **Spec:** `source/MASTER-BUILD-PROMPT.pdf` (37 pages, read in full)

## 1. Environment inspected

| Check | Result |
|---|---|
| Repositories attached to session | **None.** No repo was selected when the session started. |
| GitHub account connection | **Not connected.** `list_repos` and `gh auth` both fail. Pushing is impossible until the owner connects GitHub in claude.ai → Settings → Connectors. |
| Local workspace | Empty apart from tool caches. No existing Reale OS, RRS website, or brand files. |
| Git working tree | None existed, so there were no uncommitted changes to preserve. New repo initialised at `rrs-local-growth/` (`main` + `feature/phase-1-foundation`). |
| Network | Package installs (npm/pip) are blocked in this session. Only preinstalled tools are available. |
| Preinstalled tooling used | Node 22, TypeScript 6.0, tsx 4.23, React/ReactDOM 19.2, Playwright-core 1.63 + Chromium, sharp 0.35, openpyxl 3.1, fontTools 4.67, Inter font (OFL). |
| Missing tooling | `@types/react` (full `.tsx` type-check deferred), Manrope font, Brotli (WOFF2 compression), axe-core (automated a11y audit). |

**Owner decision (2026-11-16):** "Start fresh locally." No existing Reale OS code needs protecting in this repo.

## 2. Known existing assets *outside* this workspace

These exist from earlier work, but none were available in this session. They are **not** recreated here. Import them before the phase that depends on them, so nothing is duplicated.

| Asset | What is known | Needed by | Action |
|---|---|---|---|
| **Reale OS** (internal ops/CRM/automation) | Named in spec Part 1.1. No code available. | Phase 3, 6, 7 (Command Center, data model, n8n) | Connect repo → inspect schema/auth before any data-model work. |
| **Outreach Command Center** | Named in spec Part 7. | Phase 3/4 | Same as above. Existing segments must be preserved. |
| **Property Management Profit Leak Audit** | Paid diagnostic ($297–$497). XLSX with 30 scored questions in 7 weighted categories (100 pts), 0/25/50/75/100 tier logic, 10 informational questions, live Score Summary. Blueprint-themed landing page. Launch playbook (cold-call script, 3-email sequence, LinkedIn pillars, objection handling). | Industry page (PM), Phase 3 scorecards, Phase 4 scripts | Keep it as a separate paid product. The free Snapshot can recommend it for PM firms. Import the files into `04-Audits-and-Scorecards/legacy/` and `06-Sales/legacy/`. |
| **PM lead-scoring tool** | Seeded with 44 Arizona property-management companies, scored 0–100 (review volume, pain signals, national-chain penalty). CSV export / JSON import. | Phase 3 ICP engine | Reuse its data and logic as an input. **Do not** merge its single 0–100 number. The spec requires four separate scores. |
| **Realtor Pipeline Recovery™** | Stages: Audit, Clean, Segment, Reactivate, Route & Learn. | Realtors industry page, Phase 4 | Preserved as its own offer. The site links to it; nothing redefines it. |
| **Price Drop Pro™** | Listing relaunch offer with a 72-hour follow-up plan. No guaranteed-sale claims. | Realtors page (mention) | Preserved. Not part of the six-offer catalog. |
| **Detailer Booking Recovery** | Named in spec Part 1.1. No materials found. | Auto detailing page | Referenced as a related service. Materials to be imported. |
| **Conversational Sales Engine** | Five gears: Curiosity, Story, Root Problem, Consequence/Desire, Commercial Bridge. | Phase 4 scripts | Methodology only. Import any existing scripts. |
| **Reale Concierge AI** | Voice + text concierge (Cal.com, n8n, Supabase, Stripe, Retell/Vapi). | "AI receptionist / chat" add-on | Reference it as the delivery vehicle for that add-on. Don't rebuild it. |
| **Official logo** | Geometric "R" mark + wordmark. File not available here. | Brand system, favicon, OG images | Per spec 1.2, this repo ships **clearly labelled concepts pending approval**, not a replacement. Drop the approved files into `01-Brand-System/Logos/approved/`. |

## 3. Duplicates and conflicts identified

1. **Snapshot vs. Profit Leak Audit.** These are different products. The Snapshot is free, covers 5 categories and is evidence-labelled. The Profit Leak Audit is paid and specific to property management. Decision: keep both. See DECISIONS D-006.
2. **ICP engine vs. existing PM scorer.** There's a risk of building a second scorer. Phase 3 will import and adapt the existing one.
3. **Palette drift.** An earlier Reale Labs board used Midnight Ink `#0B1020`. The spec, and the RRS master brand, use `#081020`. The spec wins (D-003).
4. **Past honesty issue.** An earlier landing page showed an illustrative scorecard labelled as real findings. Every demo in this repo now carries a visible "Fictional example" label, and tests enforce it (D-008).

## 4. Missing dependencies and external services

None of these are active. Each needs owner approval, and most need an account.

| Need | Purpose | Cost note | Status |
|---|---|---|---|
| GitHub connection | Push branch, PRs | Free | **Blocked: owner action** |
| Domain | Canonical URLs, email | ~$10–20/yr | Needs approval + purchase |
| Static hosting (Vercel / Netlify / Cloudflare Pages) | Publish site | Free tiers exist | Needs approval. Nothing deployed. |
| n8n (self-hosted or n8n Cloud) | Form intake, CRM routing, Snapshot workflow | Cloud is paid; self-host has server cost | Needs approval |
| CRM (Reale OS / Supabase) | Lead records | Supabase free tier exists | Needs Reale OS inspection |
| Cal.com | Booking | Free tier exists | Needs approval + account |
| Analytics (Plausible or GA4) | Conversion events | Plausible paid / GA4 free | Needs approval + consent choice |
| Error monitoring (Sentry) | Client error capture | Free tier exists | Optional |
| Cloudflare Turnstile | Stronger spam protection | Free | Optional, needs account |
| Google Places / PageSpeed APIs | Phase 3 research | Usage-based; PageSpeed free with key | Phase 3, needs approval + key |

## 5. Security review (current state)

- No secrets anywhere in the repo. `.env` is git-ignored; only `.env.example`, with empty values, is committed.
- Forms never ask for passwords. Phase 5 onboarding must use delegated access (spec Part 12).
- With no endpoint configured, forms don't transmit or store any PII. Preview mode is the default.
- No third-party scripts load unless they're configured, and analytics waits for consent.
- The site is static, with no server code in Phase 2, so the attack surface is minimal.

## 6. Preservation and integration plan

1. This repository is **standalone and additive**. It never edits Reale OS or the legacy assets. It defines shared building blocks (design tokens, offer catalog, scoring framework) as framework-free TypeScript plus JSON exports, so Reale OS can use them later without rewrites.
2. Website components are plain React server-renderable components. They move into a Next.js App Router project (the spec's preferred stack) with minimal change once dependencies can be installed (D-002).
3. Before Phase 3, connect the Reale OS repo. Map `05-Lead-Research` records onto its existing CRM tables with additive migrations only. Keep the existing segments (detailers, PMs, Realtors, agencies) as separate workspaces.
4. Import legacy assets into `legacy/` subfolders, read-only, with a provenance note. Adapt copies, never the originals.
