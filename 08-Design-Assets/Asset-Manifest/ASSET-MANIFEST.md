# Visual Asset Manifest

No raster image generation was available in this session. Assets below are **code-rendered** (SVG, or SVG → PNG via sharp) or **HTML/CSS components**. Nothing is stock, and nothing depicts a real client.

| Asset ID | Title | Intended use | Dimensions | Ratio | Source | Final file | Format | Alt text | Brand compliance | Approval |
|---|---|---|---|---|---|---|---|---|---|---|
| VA-001 | Logo Concept A: mark (dark) | Header, icons | 64×64 vector | 1:1 | `mark.ts` | `01-Brand-System/Logos/concepts/rrs-mark-concept-a.svg` | SVG | Reale Revenue Systems mark (concept) | Palette ✓, Mint ≤5% ✓ | **Pending** |
| VA-002 | Logo Concept A: mark (light) | Light backgrounds | 64×64 vector | 1:1 | `mark.ts` | `…/rrs-mark-concept-a-light.svg` | SVG | same | ✓ | Pending |
| VA-003 | Lockups (dark/light) | Documents | 400×72 vector | 50:9 | `mark.ts` | `…/rrs-lockup-concept-a-{dark,light}.svg` | SVG | Reale Revenue Systems (concept lockup) | ✓ | Pending |
| VA-004 | Concept review board | Approval | 1600×1000 | 8:5 | `build-assets.ts` | `…/concept-board.png` | PNG | Logo concept board | ✓ | Pending |
| VA-005 | Favicon / app icons | Browser, home screen | 32, 180, 192, 512 + SVG | 1:1 | `mark.ts` | `02-Public-Website/public/{favicon.svg,favicon-32.png,apple-touch-icon.png,icon-192.png,icon-512.png}` | SVG/PNG | — (decorative) | ✓ | Pending (follows logo) |
| VA-006 | Default Open Graph image | Social sharing | 1200×630 | 1.91:1 | `ogSvg()` | `02-Public-Website/public/og/og-default.png` | PNG | More Local Customers. Fewer Missed Opportunities. | ✓ | Pending |
| VA-007 | Snapshot Open Graph image | Snapshot page sharing | 1200×630 | 1.91:1 | `ogSvg()` | `…/og/og-snapshot.png` | PNG | Free Local Revenue Opportunity Snapshot | ✓ | Pending |
| VA-008 | OG template (editable) | New OG images | 1200×630 | 1.91:1 | `ogSvg()` | `08-Design-Assets/Hero-Graphics/og-template.svg` | SVG | — | ✓ | Pending |
| VA-009 | Five-stage customer journey (hero) | Homepage hero | Responsive | — | `JourneyVisual` component | `02-Public-Website/src/components/visuals.tsx` | HTML/CSS | Described via sr-only caption | ✓ Labelled fictional | Pending |
| VA-010 | Local Revenue System diagram | Home, Services | Responsive | — | `SystemDiagram` | same | HTML/CSS | Semantic list | ✓ | Pending |
| VA-011 | Snapshot score card | Home, Snapshot, report | Responsive | — | `ScoreCard` | same | HTML/SVG | Ring has aria-label | ✓ Labelled fictional | Pending |
| VA-012 | Before/after workflow | Home | Responsive | — | home.tsx | — | HTML/CSS | Text content | ✓ Labelled | Pending |
| VA-013 | Icon set (19 line icons) | Site-wide | 24×24 | 1:1 | `ui.tsx` ICONS | — | Inline SVG | aria-hidden | ✓ | Not required |

## Planned (spec Part 11), not yet rendered
Service illustrations, discovery/AI/reputation/lead-recovery/booking visualisations, reporting dashboard mockup, industry images, about images, CTA backgrounds, the 15 infographics, and social templates (square, 4:5, 9:16, banners, thumbnails, carousel, quote, checklist, promo, announcement, case-study). **Status: Planned (Phase 4).** They'll be built as SVG/HTML templates rendered to PNG/WebP where possible. Anything needing photo-real imagery gets a production prompt file in `08-Design-Assets/Image-Prompts/`, flagged *unrendered*.
