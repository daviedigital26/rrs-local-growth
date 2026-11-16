# Notes for coding agents working in this repo

1. **Read first:** `00-Project-Management/PROJECT-STATUS.md`, `NEXT-STEPS.md`, `DECISIONS.md`. The spec is `00-Project-Management/source/MASTER-BUILD-PROMPT.txt`, and it is authoritative.
2. **Offline sessions:** if `npm install` is blocked, run `npm run setup:offline`. Then run `npm run verify` before every commit.
3. **Sources of truth (edit these, not the generated files):**
   - `01-Brand-System/Design-Tokens/tokens.json` → `tokens.css`, `tokens.ts`
   - `03-Offers-and-Pricing/offer-catalog.ts` → `exports/*`
   - `04-Audits-and-Scorecards/snapshot/framework.ts`
   - `00-Project-Management/deliverables.ts` → `DELIVERABLES-REGISTER.md`
4. **Never:** deploy, send outreach, activate paid services, or commit secrets without the owner's explicit approval. Never invent business facts, contacts, testimonials or results. Missing evidence is "Not verified", never a failing score.
5. **Every demo** must render through `<DemoLabel>` (enforced by e2e). Prices are `proposed` until the owner approves them.
6. Work on a feature branch. Make small commits. Update the register, CHANGELOG and TEST-RESULTS with each milestone.
