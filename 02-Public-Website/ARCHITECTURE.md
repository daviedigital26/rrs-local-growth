# Public Website Architecture

## Stack (DECISIONS D-002)
- **React 19 + TypeScript** components, rendered to static HTML at build time (`scripts/build.tsx`, `renderToStaticMarkup`).
- **One CSS file** (`src/styles/site.css`) built on generated design tokens. No CSS framework.
- **One small vanilla JS file** (`public/js/site.js`, ~10 KB) for the mobile nav, Snapshot steps, form validation, attribution, consent and analytics events. Pages work without JS. The Snapshot form falls back to a normal POST.
- **Output:** `dist/`, which is plain static files for Vercel, Netlify, Cloudflare Pages or any CDN. Nothing is deployed.
- **Migration path:** each `src/pages/*.tsx` maps to a Next.js `app/<route>/page.tsx`; `src/components` move unchanged; `site.config.ts` maps to `process.env`.

## Sitemap and URLs
```
/                                   Home (13 sections)
/services/                          Services hub
/services/local-seo/                → Offer A
/services/ai-search-visibility/     → Offer B
/services/reviews-reputation/       → Offer C
/services/lead-recovery/            → Offer D
/services/website-conversion/       → Offer E   (F is presented on Pricing + Home)
/industries/                        Industries hub (+ secondary industries, existing offers)
/industries/{home-services|auto-detailing|property-management|recurring-services|remodeling|professional-services}/
/pricing/                           Six offers, add-ons, usage-cost disclosure
/free-snapshot/                     Lead magnet (primary CTA destination)
/free-snapshot/methodology/         Transparent 100-point framework (generated from framework.ts)
/free-snapshot/sample-report/       Completed report, clearly fictional
/case-studies/                      Honest placeholder until real, permissioned results exist
/resources/                         Guides (placeholder list, Phase 4 content)
/about/  /contact/
/privacy/  /terms/  /accessibility/  (DRAFTS, legal review required)
/404.html
```
Lowercase, hyphenated, trailing slash, no query-string pages. No city-swap pages (D-007).

## Templates and components
| Template | Driven by | Used for |
|---|---|---|
| `ServicePage` | `content/services.ts` + offer catalog | 5 service pages |
| `IndustryPage` | `content/industries.ts` | 6 industry pages |
| `LegalPage` | `content/legal.ts` | 3 legal drafts |
| `Layout` | route meta | every page (header, footer, skip link, SEO head) |

Components: `Header`, `MobileNav`, `Footer`, `Logo`, `Button`/`CtaLink`, `Section`, `Eyebrow`, `Card`, `FeatureGrid`, `PricingCard`, `AddOnTable`, `Faq` (native `<details>`), `Breadcrumbs`, `JourneyVisual` (hero), `SystemDiagram`, `ScoreCard` (Snapshot results), `DemoLabel`, `CtaBand`, `Steps`.

## SEO
Every route defines `title`, `description`, `path`, optional `ogImage`, `schema[]` and `breadcrumbs[]`. The build emits:
- the `<title>`, meta description, canonical (`SITE_URL` + path), Open Graph/Twitter tags, `theme-color`
- JSON-LD: `Organization` + `WebSite` (all pages), `ProfessionalService` (home/about/contact, with `areaServed` cities and **no street address until approved**), `Service` + `Offer` (service and pricing pages), `FAQPage` (pages with FAQs), `BreadcrumbList`
- `sitemap.xml` (all indexable routes) and `robots.txt` (allows all and points to the sitemap; `Disallow: /` when `SITE_URL` is a placeholder, so preview builds can't get indexed by accident)

**Search Console:** see `18-Documentation/INTEGRATIONS-GUIDE.md`. It needs a verified domain, so it waits for approval.

## Analytics event plan (D-015)
| Event | Fired when | Properties |
|---|---|---|
| `cta_click` | Any `[data-cta]` link is clicked | `cta`, `location`, `href` |
| `snapshot_start` | First interaction with the Snapshot form | `source` |
| `snapshot_step` | Step advanced | `step` |
| `snapshot_submit` | Valid submission (or preview) | `industry`, `mode` |
| `contact_submit` | Contact form valid submission | `topic`, `mode` |
| `faq_open` | FAQ item opened | `question` |

Events go to `window.dataLayer`. A provider script loads only when `ANALYTICS_PROVIDER` is set and, for GA4, after consent.

## Lead capture data flow
```
Visitor → /free-snapshot/ form (chips, 3 steps)
        → client validation + honeypot + min-time check
        → hidden attribution: utm_*, referrer, landing page, first-touch timestamp
        → [FORM_ENDPOINT unset] preview message, nothing sent (default)
        → [FORM_ENDPOINT set + approved] POST JSON → n8n webhook
              → dedupe by normalised business name + domain → CRM record (Reale OS)
              → research queue (Phase 3) → Snapshot report → manual review → delivery email
```
Payload schema: `src/lib/lead-payload.ts`. No passwords are collected. Consent text is stored with each submission.

## Content workflow
1. Copy lives in typed files under `src/content/`. Offers come from the catalog, never retyped.
2. Edit on GitHub (works from the phone app), then open a PR to `main`.
3. CI (to add once GitHub is connected) runs `npm run verify`. The preview deploy needs approval.
4. Owner approves, then merges, then publishing (only after the go-live approval).
A headless CMS is optional later. The typed content files are designed to become CMS schemas.

## Performance budget
HTML < 60 KB per page, CSS < 50 KB minified (~9 KB gzipped), JS < 15 KB, fonts: 2 preloaded (~60 KB), no third-party requests by default, LCP element = hero text (no hero image dependency).
