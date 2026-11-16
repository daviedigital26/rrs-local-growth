# Pricing Framework (draft, pending owner approval)

**Sources:** spec Part 2 · `offer-catalog.ts` · generated `exports/PRICING-SHEET.md` and `exports/COST-MODEL.md`.

## 1. Principles
1. **Setup + monthly.** Setup covers audit, configuration and the first wins. Monthly covers ongoing monitoring, improvement and reporting.
2. **Proposed, not benchmarked.** The six prices are proposed launch prices from the spec. They aren't market research. They stay `proposed` in the catalog until the owner approves them, and that approval records who approved and when.
3. **Transparent publishing.** The website shows prices, because the spec asks for transparent pricing. A "starting at / scope-dependent" note covers add-ons that are quoted.
4. **The flagship replaces, never stacks.** A client upgrading to Local Revenue Dominator™ ends the overlapping A–E retainers. A–E together cost $4,138 setup + $1,535/mo. F is $2,500 + $997/mo.
5. **Usage costs at cost.** SMS, calling minutes, phone numbers and carrier registration (e.g. A2P 10DLC) are billed at cost. They're estimated in writing before go-live (Offer D, F, and the AI receptionist add-on).
6. **No outcome pricing.** No guarantees and no pay-per-ranking. Results reporting stays evidence-based.

## 2. Free → paid ladder
`Free Local Revenue Opportunity Snapshot` → `focused program (A–E) matching the weakest verified category` → `Local Revenue Dominator™ when 3+ categories need work` → `add-ons`.

Industry-specific existing offers stay available as separate products. Property managers get the **Profit Leak Audit**, Realtors get **Realtor Pipeline Recovery™** and **Price Drop Pro™**, and detailers get **Detailer Booking Recovery**.

## 3. Snapshot → offer mapping (implemented in the Snapshot engine)
| Weakest verified category | Recommended offer |
|---|---|
| Google Maps presence | A. Local Visibility Jumpstart™ |
| AI discovery readiness | B. AI Discovery Accelerator™ |
| Reviews & trust | C. Reputation Revenue Engine™ |
| Website conversion | E. Website-to-Customer Conversion™ |
| Lead follow-up | D. Lead Rescue & Booking Engine™ |
| Three or more categories below threshold | F. Local Revenue Dominator™ |

## 4. Unit economics: review before approving
`exports/COST-MODEL.md` uses **assumed** inputs: $45/h loaded labour, range-midpoint hours, and estimated tool costs. At those assumptions:
- Every offer falls **below the 50% target gross margin**. That's mostly setup on A (28%) and E (25%), and monthly on F (24%).
- Revenue per delivery hour comes to roughly **$60–$99**.

**Levers, in order of preference:**
1. Cut delivery hours with templates and n8n automation (Phases 3 and 6).
2. Tighten scope limits.
3. Adjust prices after the first 3–5 engagements produce real time data.

The pricing doesn't need to change before launch. The flags are there so the decision is made knowingly.

## 5. Open decisions (owner)
- [ ] Approve or adjust the six launch prices and the add-on prices
- [ ] Minimum term (none / 3 / 6 months) and notice period
- [ ] Payment terms (setup due at signing? monthly in advance?) and payment processor
- [ ] Founding-client offer. The earlier founding-rate ramp, tied to completed engagements, could be carried over (Phase 4).
- [ ] Prices for the seasonal campaign, additional locations, extra pages and integrations
- [ ] Real labour cost assumption (your own time vs. contractor rate)
