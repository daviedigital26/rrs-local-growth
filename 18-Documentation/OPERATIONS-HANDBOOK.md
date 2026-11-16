# Operations Handbook

## Working from a phone (Claude Code cloud sessions)
1. Start a session with this repository selected (after GitHub is connected).
2. Say what you want: "Change the Local Visibility Jumpstart monthly price to $247", "Add a cleaning industry FAQ", "Start Phase 3 scorecards".
3. Claude edits the source files, runs `npm run verify`, commits to a feature branch and summarises the result. You review on GitHub mobile and merge when you're happy.

## Where to change things
| To change… | Edit | Then |
|---|---|---|
| Prices, offer scope, deliverables | `03-Offers-and-Pricing/offer-catalog.ts` | `npm run build` regenerates the pricing page, service pages, exports and schedules |
| Colours, spacing, type | `01-Brand-System/Design-Tokens/tokens.json` | `npm run build` (contrast tests must pass) |
| Logo | `01-Brand-System/Logos/concepts/mark.ts` | Header, favicon and OG images regenerate |
| Snapshot scoring | `04-Audits-and-Scorecards/snapshot/framework.ts` | Methodology page + tests update. Bump `FRAMEWORK_VERSION` |
| Service page copy | `02-Public-Website/src/content/services.ts` | — |
| Industry pages | `02-Public-Website/src/content/industries.ts` | Keep each page genuinely unique (doorway test) |
| Home FAQ, navigation | `02-Public-Website/src/content/site.ts` | — |
| Legal drafts | `02-Public-Website/src/content/legal.ts` | Legal review |
| Integrations | Environment variables (`.env.example`) | Owner approval |
| Deliverable status | `00-Project-Management/deliverables.ts` | `npm run register` |

## Commands
`npm run build` · `npm run serve` (http://localhost:4321) · `npm test` · `npm run test:e2e` · `npm run verify` (all). In offline sessions, run `npm run setup:offline` first.

## Lead handling (once forms are approved)
Snapshot request → n8n webhook → validate + dedupe → CRM record (source attribution + consent text stored) → research queue → Snapshot prepared using the framework → manual review → delivery email → follow-up task. Never send automated outreach without explicit authorisation and a compliance review.

## Rules that never change
- No fake reviews, testimonials, results, citations or locations.
- Missing evidence = Not verified.
- No guarantees of rankings, AI placement or revenue.
- No passwords in forms. Delegated access only.
- Human approval before publishing, outreach, ads, billing or production changes.
