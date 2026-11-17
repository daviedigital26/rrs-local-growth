# ICP scoring methodology

<!-- Generated from 05-Lead-Research/Scoring/icp-config.ts by `npm run icp:docs`. Do not edit by hand. -->

Config version: `icp-2026.11-1`

Every business gets **four separate results**. They are never merged into one unexplained number (spec Part 6).

| Result | What it answers | Scale |
| --- | --- | --- |
| **ICP fit** | Is this the kind of business we serve? (commercial fit, likely to benefit, industry & area priority) | 0–100, or *Not enough evidence* when under 50% of fit evidence is verified |
| **Opportunity** | Is there a *verified* problem we can fix? (Snapshot, observations, review text) | 0–100, or *Not verified* |
| **Research confidence** | How much can we trust the above? (coverage × evidence strength × freshness) | high / medium / low / insufficient |
| **Outreach priority** | Who to contact first? | P1 / P2 / P3, or a gate (see below), with the 100-point score and all six parts shown |

## The 100-point priority score

The spec's suggested initial weights. A part that is **Not verified earns no points and is labelled Not verified**; it is never shown as the business scoring zero.

| Part | Weight | Evidence used |
| --- | ---: | --- |
| Commercial fit | 25 | Size: units managed when verified, otherwise review count as a proxy |
| Verified opportunity | 25 | Snapshot score (strongest), recorded observations, complaint themes in review text |
| Likely to benefit | 20 | Rating band (room to improve, not in crisis) and ownership (franchises less likely to buy) |
| Reachability | 15 | Contacts on file: phone 40%, email 20%, website 20%, decision-maker 20%; inbound requests 100% |
| Industry & area priority | 10 | Industry tier and market (Phoenix area 100%, other Arizona 70%, expansion states CA/OR/WA 50%, elsewhere 25%) |
| Data completeness & confidence | 5 | Research confidence × 5 |

## Bands and gates

Gates are checked in this order and override the score:

1. **Do not contact**: on the suppression list.
2. **Disqualified**: business marked closed.
3. **Closed (declined)**: they said no; no further outreach unless they reach out.
4. **In progress**: audit booked or existing customer.
5. **Inbound: reply**: they contacted us. Answer personally; never cold-sequence.
6. **Research first**: research confidence is *insufficient* (under 50% of the score's evidence verified).

Otherwise: **P1** at 60+ points **and** a verified opportunity of at least 30; **P2** at 50+; **P3** below.
Size and rating alone never reach P1. National franchises top out at **P2** (deprioritised, not hidden).

## Research confidence

Coverage = share of the five scored parts' weight that is verified. Quality = weighted evidence strength × freshness.
Coverage under 50% = *insufficient*; otherwise coverage × quality ≥ 0.7 = high, ≥ 0.45 = medium, else low (same cut-offs as the Snapshot).

| Evidence | Strength |
| --- | ---: |
| snapshot | 1 |
| public observation | 1 |
| listing data | 1 |
| review sample | 0.5 |
| owner reported | 0.6 |
| tracker flag | 0.6 |

Freshness: up to 90 days 100%, up to 180 days 80%, older 60%, **undated 60%**. Pass `--checked YYYY-MM-DD` when importing a batch so its facts are dated.

## Property-management profile (calibrated from the PM Lead Scorer)

Calibrated from the owner’s PM Lead Scorer. Units managed, when verified, replaces the review-count proxy.

**Size (review count proxy)**

| Band | Credit |
| --- | ---: |
| established but not oversized (50–600 reviews) | 100% |
| large (601–1,200 reviews) | 65% |
| very large, likely corporate systems (1,200+ reviews) | 25% |
| small or new (under 50 reviews) | 50% |

**Size (units managed, preferred when verified)**

| Band | Credit |
| --- | ---: |
| in the 30–250 unit target | 100% |
| above target (251–600 units) | 65% |
| well above target (600+ units) | 25% |
| below target (under 30 units) | 50% |

**Rating**

| Band | Credit |
| --- | ---: |
| solid with room to improve (3.8–4.6) | 100% |
| near-perfect, less visible pain (above 4.6) | 60% |
| struggling reputation (below 3.8) | 50% |

**Ownership credit:** independent 100%, multi location 80%, national franchise 20%, corporate 0%.

**Review complaint themes.** Each theme counts once per business at 8 points × relevance, capped at 26 (the tracker's own scale).

| Theme | Relevance to our services |
| --- | ---: |
| calls or messages go unanswered | 100% |
| slow responses or long delays | 100% |
| broken tools or a confusing process | 75% |
| repairs or maintenance left undone | 50% |
| poor service experience | 50% |
| fee or deposit disputes | 25% |

Ignored on purpose: praise with a negation in the same clause ("no voicemail runaround", "never had a delay"); sentences about a previous manager ("…until new management showed up"); and comparisons with other companies ("most agencies would not get back to me").

Other industries use the same bands, marked **uncalibrated**, until real call outcomes justify their own.

## Differences from the PM Lead Scorer

The old score is still shown beside the new results (`old_tracker_score`, an exact port). The new model differs where the old one could mislead:

| Old tracker | New model |
| --- | --- |
| Right size + rating scored exactly 60 = **hot**, even with no complaint found | P1 needs a verified problem; size + rating alone tops out at P2 |
| Each keyword counted separately ("cancel" + "canceled" = 2 hits) | Each complaint theme counts once |
| Praise counted as pain ("no voicemail runaround") | Negated phrases ignored and listed for review |
| Complaints about a *previous* manager counted | Skipped |
| Missing rating / review count scored low | Not verified: no points, lower confidence, *Research first* when too little is known |
| Max reachable score 86 | Full 0–100 range, with each part shown |
| Franchise penalty −16 points | Ownership credit plus a P2 cap |

## Limits

- Review excerpts are a small sample (often 2–5). Treat review signals as an opening angle to verify on the call, not as proof.
- Review count is only a proxy for size. A verified unit count replaces it.
- Every default except the spec weights and the PM profile is a starting assumption. Tune with real outcomes; change `icp-config.ts` and bump `version`.
- Collect review text only through approved sources and within their terms. Never scrape.
