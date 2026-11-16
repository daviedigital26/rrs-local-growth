# Integrations Guide

**Nothing here is active.** Each integration needs an account and owner approval. Costs are indicative. Check current vendor pricing before you approve anything.

| Integration | Purpose | Cost type | Env var | Status |
|---|---|---|---|---|
| Domain + DNS | Canonical URL, email, verification | Annual fee | `SITE_URL` | Needs purchase |
| Static hosting (Netlify / Cloudflare Pages / Vercel) | Publish `dist/` | Free tiers exist | in host settings | Needs approval |
| n8n | Form intake → CRM, notifications | n8n Cloud subscription, or server cost if self-hosted | `FORM_ENDPOINT` | Needs approval |
| Cal.com | Booking | Free tier exists | `BOOKING_URL` | Optional |
| Plausible **or** GA4 | Conversion analytics | Plausible paid / GA4 free | `ANALYTICS_PROVIDER`, `ANALYTICS_ID` | Decision needed |
| Error monitoring (Sentry or n8n webhook) | JS error alerts | Free tier exists | `ERROR_ENDPOINT` | Optional |
| Cloudflare Turnstile | Stronger spam protection | Free | (future) | Optional |
| Google Search Console | Index monitoring | Free | — | Needs a verified domain |

## Hosting setup (after approval)
- **Build command:** `npm ci && npm run build`. **Publish directory:** `02-Public-Website/dist`. **Node:** 20+.
- Set the env vars in the host dashboard. `dist/_headers` applies security headers and CSP on Netlify and Cloudflare Pages. On Vercel, port it to `vercel.json`.
- Protect preview deployments with a password until go-live.

## n8n Snapshot intake workflow (spec for Phase 6)
1. **Webhook (POST, JSON).** CORS allows only the site origin. Respond within 2 s.
2. **Validate server-side:** required fields, email format, length limits; reject if the honeypot `company_website` is present. Rate-limit by IP and email.
3. **Normalise:** business name, domain from website, phone digits.
4. **Dedupe:** match on normalised name + domain, or phone. On a match, update the record instead of creating a new one.
5. **Create/update CRM record:** store attribution and `consent_text` verbatim, plus `consent_sms` (true only if ticked).
6. **Notify the owner** (email/Slack) and create the research task.
7. **Auto-reply email:** request received. No sales content until a human reviews it.
8. **Log** every step. On error, alert the owner and keep the payload for retry.
The payload contract is in `02-Public-Website/src/lib/lead-payload.ts`.

## Search Console
Verify the domain property with a DNS TXT record, then submit `https://<domain>/sitemap.xml`. Watch Coverage and Enhancements (FAQ, Breadcrumbs). Setting `SITE_URL` to the real domain automatically removes the preview `noindex` and opens robots.txt.

## Analytics & consent
- **Plausible:** cookieless, so a consent banner usually isn't needed. Confirm with counsel. Events already flow through `window.dataLayer`.
- **GA4:** needs a consent banner (not built yet; KNOWN-ISSUES K-08) before the script loads.
- Event names are in `02-Public-Website/ARCHITECTURE.md`.
