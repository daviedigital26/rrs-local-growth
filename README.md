# Reale Revenue Systems — Local Growth Operating System

**Get Discovered. Get Chosen. Get Booked.**

This is the build repo for Reale Revenue Systems (RRS), the client-facing company of Reale Labs. It holds the public website, the offer catalog, the free **Local Revenue Opportunity Snapshot™**, scoring frameworks, and, in later phases, the research engine, sales command center, onboarding portal and n8n workflows.

> **Status:** Phases 0–1 complete; Phase 2 (website, Snapshot capture, exports) feature-complete and tested, not connected. **Nothing is deployed.** See `00-Project-Management/PROJECT-STATUS.md`.

## Start here

| If you want to… | Open |
|---|---|
| See where things stand | `00-Project-Management/PROJECT-STATUS.md` |
| See every deliverable and its status | `00-Project-Management/DELIVERABLES-REGISTER.md` |
| Read the plan | `00-Project-Management/IMPLEMENTATION-PLAN.md` |
| Review decisions you may want to override | `00-Project-Management/DECISIONS.md` |
| Check what needs your approval or an account | `00-Project-Management/NEXT-STEPS.md` |
| Read the original spec | `00-Project-Management/source/MASTER-BUILD-PROMPT.pdf` |

## Run it

```bash
npm install          # normal environments
npm run setup:offline  # Claude Code cloud sessions without network (links preinstalled packages)

npm run build        # tokens → catalog exports → assets → website → register
npm run serve        # http://localhost:4321
npm test             # unit tests (scoring, catalog, tokens, register)
npm run test:e2e     # Playwright: 3 viewports, links, SEO, forms, mobile, screenshots
npm run test:e2e:connected  # forms against a local mock intake + GA4 consent build
npm run verify       # all of the above

npm run snapshot:new -- lead.json          # website request → research draft (git-ignored)
npm run snapshot:export -- draft.json      # → PDF, HTML, CSV, JSON, CRM record, PPTX
npm run samples                            # regenerate the fictional sample exports
npm run workflows                          # regenerate the n8n intake workflow (inactive)
```

The website builds to `02-Public-Website/dist/`, which is plain static files you can host anywhere. Configuration comes from environment variables (see `.env.example`). With nothing configured, forms run in **preview mode** and send nothing.

## Layout

```
00-Project-Management/   plan, status, register, decisions, spec copy
01-Brand-System/         design tokens (source of truth), guidelines, logo concepts
02-Public-Website/       static React + TypeScript site (Next.js-portable components)
03-Offers-and-Pricing/   typed offer catalog + generated pricing sheet, schedules, cost model
04-Audits-and-Scorecards/ Snapshot 100-point framework + scoring engine
05–17                    later phases (research, sales, marketing, assets, onboarding, portal, SOPs…)
18-Documentation/        positioning, integrations guide, operations handbook
19-Exports/              generated bundles (git-ignored)
```

## Ground rules (from the spec)

No fabricated testimonials, results, rankings or case studies. Demos are always labelled fictional. Nothing goes live without owner approval: publishing, outreach, ads, billing, paid APIs or production changes. No secrets go in git.
