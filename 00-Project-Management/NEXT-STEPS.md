# Next Steps

## A. Owner actions (in priority order)
| # | Action | Why | Type |
|---|---|---|---|
| 1 | Review and merge `feature/phase-3-icp-scoring` into `main` (it contains Phase 1 and Phase 2 too) | New Claude Code sessions start from `main` | GitHub |
| 2 | Approve or adjust the six launch prices and terms | Pricing page, proposals, exports | Approval |
| 3 | Official logo files, or approve Concept A (it now also appears on PDF/deck headers) | Brand | Approval |
| 4 | Approve **n8n** (n8n Cloud or self-hosted) and give the CRM destination (Reale OS/Supabase endpoint or another webhook) | Turns on lead capture; the workflow is ready to import | Paid service + approval |
| 5 | Choose **analytics**: Plausible (no banner) or GA4 (consent banner already built) | Conversion tracking | Decision |
| 6 | Choose a domain + hosting | Publishing, Search Console | Purchase + approval |
| 7 | Content sign-off: founder bio, Snapshot turnaround line | Accuracy | Approval |
| 8 | Attorney review of the legal drafts | Required before publishing | Review |
| 9 | Share the Reale OS repo + legacy assets (Profit Leak Audit XLSX, playbooks) | Phase 3 without duplication | Access |
| 10 | Export the PM Lead Scorer CSV (Export CSV button) and attach it with any JSON batches you still have, plus the date each was pulled | Re-scores your whole list with call statuses and notes kept | File |

## B. Recommended next implementation steps (no external services needed)
1. ~~Scorecard workbook + importer~~ **Done 2026-11-17.** Try it: ask a Claude Code session for the sample scorecard, open it on your phone, change a result, and send it back for import.
2. ~~ICP scoring~~ **Done 2026-11-17.** `npm run leads:score -- batch.json tracker.csv --checked YYYY-MM-DD`.
3. **Phone call list + outcome logging:** a mobile call-queue page (tap to call, one-tap outcome chips) built on the scored list, so outcomes can recalibrate the weights.
4. **Evidence + lead data model** as SQL migration drafts (Supabase), for review against Reale OS before anything is applied.
5. **Ad/landing pages** for the message tests (M1–M4), noindex, for later campaigns.

## C. After approvals
Import the n8n workflow → set env vars + Allowed Origins → test submission from a password-protected preview deploy → set `FORM_ENDPOINT` → real-device QA → `LAUNCH-CHECKLIST.md` → go-live approval.
