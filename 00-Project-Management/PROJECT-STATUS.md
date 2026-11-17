# Project Status

**Updated:** 2026-11-17 · **Branch:** `feature/phase-3-icp-scoring` (builds on `feature/phase-2-completion` → `feature/phase-1-foundation`) · **GitHub:** `daviedigital26/rrs-local-growth` · **Deployed:** nothing

## Phase summary
| Phase | Status | Notes |
|---|---|---|
| 0 · Audit | ✅ Done | `PHASE-0-AUDIT.md` |
| 1 · Business & offer foundation | ✅ Built, **awaiting approval** | Prices, logo concept, positioning, proposal template |
| 2 · Website & lead magnet | ✅ **Feature-complete, not connected** | Site, Snapshot capture, exports, intake workflow, mobile pass, consent. Going live needs approvals + accounts |
| 3 · Audit & research engine | 🟡 In progress | Exports, **scorecard workbook + importer**, **ICP scoring** done. Data model, research engine and the other 24 scorecards next |
| 4 · Sales enablement | 🟡 Started | **Call queue** + outcomes loop done; script library drafted (needs owner review) |
| 4–7 | ⏳ Planned | `IMPLEMENTATION-PLAN.md` |

## What is working (verified 2026-11-17)
- **Website:** 26 pages at 375/768/1280. 801/801 automated checks.
- **Free Snapshot capture, end to end:**
  - browser validation → server-side validator → lead record with dedupe key
  - research draft (`npm run snapshot:new`)
  - all six report formats (`npm run snapshot:export`)
  - proven against a local stand-in endpoint: 22 connected checks, including failure and retry
- **Scorecard workbook:** generate (blank or from a lead) → fill on a phone in Google Sheets/Excel → import with cell-cited checks → six report formats. Formulas match the engine.
- **Call queue (phone):** the scored list as a call queue: tap-to-call, one-tap outcomes with automatic follow-ups, follow-up calendar, pipeline $, scripts and objections, results by priority. Hosted privately for the owner; outcomes flow back into scoring.
- **ICP scoring:** lead batches (tracker JSON + CSV with statuses, website leads, Snapshots) → four separate scores with reasons → ranked call list (CSV + JSON). The CRM record now carries ICP fit and outreach priority.
- **Exportable Snapshot reports:** printable HTML, PDF, criteria/summary CSV, full JSON, CRM record (JSON Schema), editable 9-slide deck. Fictional samples are downloadable on the site.
- **Mobile:** sticky Snapshot button, saved progress, step scrolling, keyboard hints.
- **Consent:** GA4 loads only after "Allow". 10 checks with Google requests intercepted.
- **Tests:** 79 unit tests, 46 call-queue browser checks, strict type-check of all framework-free modules. A fresh clone passes `npm run verify`.

## Built but not live (needs approval / accounts)
| Item | What's missing |
|---|---|
| n8n intake workflow (`12-Automations/n8n/rrs-intake.workflow.json`) | n8n instance; import + test there; `RRS_CRM_WEBHOOK_URL`, `RRS_NOTIFY_WEBHOOK_URL` |
| Form submissions | `FORM_ENDPOINT` set to the approved webhook |
| Analytics | Choice of Plausible or GA4, plus the account ID |
| Publishing | Domain, hosting, go-live approval |
| PDF export in production | A place to run Chromium (local machine, CI job or small worker) |

## Mock / placeholder / draft
- **Mock:** fictional sample business and its exports; fictional PM lead batch and call list.
- **Placeholder:** Resources, Case studies, public phone/email, domain.
- **Draft:** legal pages, agreement schedules, proposal template, logo concept, founder bio.

## Blockers
1. Owner approvals (`NEXT-STEPS.md`).
2. Reale OS repository access before the Phase 3 data model.
