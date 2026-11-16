# Next Steps

## A. Owner actions (in priority order)
| # | Action | Why | Type |
|---|---|---|---|
| 1 | **Connect GitHub** (claude.ai → Settings → Connectors), then tell Claude the repo name to push to (new or existing) | Work is currently only in the cloud session | Account |
| 2 | Approve or adjust the **six launch prices** and add-on prices, plus the open terms (minimum term, payment terms) | Pricing page + proposals | Approval |
| 3 | Supply the **official RRS logo** files, or approve Concept A | Brand | Approval |
| 4 | Review content flagged for you: founder bio (About), Snapshot turnaround line (`site.config.ts`), homepage headline vs alternatives (`POSITIONING-AND-AUDIENCE.md`) | Accuracy | Approval |
| 5 | Choose a **domain** | Canonical URLs, email, Search Console | Purchase |
| 6 | Choose **hosting** (Netlify / Cloudflare Pages / Vercel free tiers) | Publishing | Account + approval |
| 7 | Approve **n8n** (self-hosted or n8n Cloud) for form intake | Turns on lead capture | Paid service + approval |
| 8 | Choose **analytics**: Plausible (paid, no consent banner needed) or GA4 (free, needs a consent banner) | Conversion tracking | Decision |
| 9 | Optional: Cal.com booking link, public phone/email for the site | Contact options | Account |
| 10 | Send a qualified attorney the legal drafts (Privacy, Terms, Schedules) | Required before publishing | Review |
| 11 | Share or attach the **Reale OS** repo and existing assets (Profit Leak Audit XLSX, PM lead scorer + 44-company list, playbooks, Realtor offer materials) | Avoid duplication in Phase 3/4 | Access |

## B. Recommended next implementation step (Phase 3, part 1)
Things that need no external services:
1. **Local Revenue Opportunity Scorecard (XLSX + CSV/JSON)** generated from `framework.ts`. Dropdowns per tier, Not verified handling, evidence/date/source columns, owner/reviewer fields, an auto-calculated summary that matches the engine. Tested against the engine.
2. **Snapshot exports:** printable HTML (exists) + PDF, CSV, JSON, a CRM record shape, and a short customer presentation, for the fictional sample.
3. **Evidence + lead record data model** (TypeScript types + SQL migration drafts), shaped for review against Reale OS before anything is applied.
4. **ICP scoring** with four separated outputs (fit / opportunity / confidence / priority), ready to receive the existing PM scorer's data.

## C. After approvals
Connect the form endpoint → n8n intake workflow (validation, dedupe, CRM record, notification, research queue) → deploy a password-protected preview → real-device QA → go-live checklist.
