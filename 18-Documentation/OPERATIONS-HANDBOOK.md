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

## Producing a Snapshot (works today, no external services)
1. Save the website request as `lead.json`, or once n8n is live, take the lead record from the CRM.
2. Run `npm run snapshot:new -- lead.json`. It creates `05-Lead-Research/Research-Outputs/<business>-<date>.snapshot.json`, which is git-ignored because it holds personal details.
3. For each criterion you can verify, set `status: "scored"`, a `tier` (0/0.25/0.5/0.75/1) and `evidence` (type, note, source URL, date). Leave anything you can't observe as `not_verified`. Add competitors, quick wins and the owner's example numbers if you have them.
4. Run `npm run snapshot:export -- <file>`. This produces PDF, printable HTML, CSV (criteria + summary), JSON, a CRM record and a 9-slide deck in `19-Exports/snapshots/…`.
5. Review everything before sending. Nothing is sent automatically.

## Lead handling (once forms are approved)
Snapshot request → n8n webhook → validate + dedupe → CRM record (source attribution + consent text stored) → research queue → Snapshot prepared using the framework → manual review → delivery email → follow-up task. Never send automated outreach without explicit authorisation and a compliance review.

## Rules that never change
- No fake reviews, testimonials, results, citations or locations.
- Missing evidence = Not verified.
- No guarantees of rankings, AI placement or revenue.
- No passwords in forms. Delegated access only.
- Human approval before publishing, outreach, ads, billing or production changes.
