# Decisions Log

Format: ID · date · decision · reason · reversible? · owner approval needed?

### D-001 · 2026-11-16 · Standalone, additive repository
Started a fresh repo (`rrs-local-growth`). No Reale OS code was available, and the owner chose "start fresh locally". Nothing here modifies another system. **Reversible:** yes. Can merge into the Reale OS monorepo later.

### D-002 · 2026-11-16 · Static React + TypeScript build now; Next.js-portable
The spec prefers Next.js + TypeScript + Supabase. This session can't install packages, and Next.js isn't preinstalled. Code that was never built or tested would break the spec's verification rule. So the website is built with **React 19 server rendering (`renderToStaticMarkup`) and a small TypeScript build script**. That produces plain static HTML/CSS with a tiny vanilla-JS layer.
- Components are pure, prop-driven React. They move into a Next.js App Router `app/` directory almost unchanged. Business logic (tokens, offers, scoring) is framework-free TypeScript.
- Static output is fast, cheap to host (free tiers), and has no server attack surface.
- **Revisit at Phase 5** (client portal needs auth + Supabase RLS). At that point, migrate to Next.js in a networked session. **Owner may override.**

### D-003 · 2026-11-16 · Palette = spec values
Midnight Ink `#081020`, Electric Cobalt `#4F5DFF`, Signal Mint `#2DD4BF`, Slate `#334155`, Warm Canvas `#F7F4EE`, White. An older board's `#0B1020` is superseded. Color ratio rule: Ink + Canvas ≈ 80%, Cobalt ≈ 15%, Mint ≤ 5% (accent only). Gradients stay *within* the palette (Ink → deep Ink-Cobalt). No gold, no real-estate red.

### D-004 · 2026-11-16 · Typography = Inter Display (headings) + Inter (body), self-hosted
Inter is in the spec and is OFL-licensed, so it can be self-hosted for speed and privacy. Manrope wasn't available offline. Neue Haas Grotesk needs a commercial licence. Both can be added later through the `font.display` token. Self-hosted WOFF (Latin subset). WOFF2 would be ~30% smaller but needs Brotli, which isn't installed (see KNOWN-ISSUES).

### D-005 · 2026-11-16 · Logo = labelled concepts, not a replacement
The official geometric R mark wasn't available. `01-Brand-System/Logos/concepts/` holds concept marks stamped "CONCEPT — PENDING APPROVAL". The site uses a text wordmark plus the concept mark through one component (`<Logo/>`), so the approved file swaps in at one place. **Owner approval needed.**

### D-006 · 2026-11-16 · Snapshot ≠ Profit Leak Audit
The free Local Revenue Opportunity Snapshot (5 categories, 100 pts, multi-industry) is the top-of-funnel product. The paid PM Profit Leak Audit stays a separate, deeper diagnostic. The Snapshot can recommend it for property-management firms.

### D-007 · 2026-11-16 · No city-swap pages
Phoenix-area cities appear as a service-area list, not as near-duplicate "{service} in {city}" pages. Those are doorway pages, which the spec (Part 17) and Google policy prohibit. City pages are only allowed later if each one has genuinely unique local content.

### D-008 · 2026-11-16 · Every demo is labelled, and tests enforce it
Sample reports, the hero journey illustration and the audit preview use fictional businesses. Each one shows a visible "Fictional example" label. An automated test fails the build if a demo component renders without its label. No testimonials, client logos, rankings or result numbers exist on the site.

### D-009 · 2026-11-16 · Forms default to preview mode
With `FORM_ENDPOINT` unset, forms validate and show a clear "preview — nothing was sent" message. Nothing is transmitted or stored. Turning submissions on requires an endpoint (n8n webhook) and **owner approval**.

### D-010 · 2026-11-16 · Prices shown are proposed launch prices
The catalog stores `status: "proposed"` and `approval: "pending"` for every price. The pricing page and the register carry that status. **Owner approval needed before publishing.**

### D-011 · 2026-11-16 · No statistics without a verified source
The site copy makes qualitative claims only. A statistic gets added only with a citation recorded in `content/sources.ts`.

### D-012 · 2026-11-16 · Snapshot scoring: 5 × 20 points, tiered, "Not verified" excluded
Each category is worth 20 points across 3–6 criteria. Criteria score at 0 / 25 / 50 / 75 / 100% tiers (the same tier logic as the Profit Leak Audit, for consistency).
- A criterion that couldn't be checked is **Not verified**. It's excluded from the denominator, never scored as 0.
- The report shows *earned / verified points*, *coverage %* and *confidence* separately.
- Below 25% coverage, a category shows "Not verified" instead of a number.

### D-013 · 2026-11-16 · Spec folder structure adopted, with code inside it
The numbered folders from spec Part 18 are used as-is, so the repo is easy to browse on a phone. Code lives with the deliverable it serves (e.g. `02-Public-Website/`, `04-Audits-and-Scorecards/snapshot/`), and there's one root `package.json`.

### D-014 · 2026-11-16 · CTA colours
Primary buttons are Electric Cobalt with white text (4.8:1 contrast). Signal Mint is only used for accents, "recovered/positive" markers, and the focus ring on dark backgrounds. It's never used for body text on light backgrounds (contrast fails there).

### D-015 · 2026-11-16 · Analytics through a provider-agnostic event layer
Pages emit named events (`cta_click`, `snapshot_step`, `snapshot_submit`, `contact_submit`) to `window.dataLayer`. The provider script (Plausible or GA4) only loads when it's configured *and* consent rules allow it.
