# Launch Checklist (website + Free Snapshot)

Nothing below is done unless ticked. **Go-live requires explicit owner approval.**

## Approvals
- [ ] Prices approved (catalog `status: 'approved'` with approver and date)
- [ ] Logo: official files supplied or concept approved
- [ ] Copy approved: home, services, industries, about (founder bio), Snapshot page
- [ ] Legal drafts reviewed by a qualified attorney and updated
- [ ] Snapshot turnaround wording approved

## Accounts & configuration (env vars in hosting, never in git)
- [ ] Domain purchased → `SITE_URL` set (this removes noindex and opens robots.txt)
- [ ] Hosting project created; build `npm run build`; publish dir `02-Public-Website/dist`
- [ ] n8n workflow imported, env vars set (`RRS_CRM_WEBHOOK_URL`, `RRS_NOTIFY_WEBHOOK_URL`), Allowed Origins set to the real domain
- [ ] `FORM_ENDPOINT` set; test submission received in CRM; retry does not duplicate
- [ ] Decide where PDF exports run (needs Chromium)
- [ ] Rate limiting on the webhook (n8n/hosting); validation, dedupe and spam checks are already in the workflow
- [ ] `PUBLIC_EMAIL` / `PUBLIC_PHONE` set (optional)
- [ ] `BOOKING_URL` set (optional)
- [ ] Analytics chosen; for GA4 confirm the consent banner text with counsel
- [ ] Error monitoring endpoint (optional)

## Quality
- [ ] `npm run verify` green on the release commit
- [ ] Real-device check: iPhone Safari, Android Chrome, desktop Chrome/Safari/Edge
- [ ] Screen-reader pass (VoiceOver / TalkBack) and axe audit
- [ ] Lighthouse mobile ≥ 90 for performance, accessibility, best practices, SEO on the preview URL
- [ ] Test submission received in CRM with correct attribution and consent text
- [ ] Opt-out and data-deletion requests have an owner and a process

## Search
- [ ] Search Console domain property verified (DNS TXT)
- [ ] Sitemap submitted
- [ ] Google Business Profile for RRS (if eligible) links to the site

## Go-live
- [ ] Owner approves the publish
- [ ] Deploy → smoke test (home, Snapshot submit, contact submit)
- [ ] Record release in CHANGELOG and register
