# Local Revenue Opportunity Snapshot™ — Methodology (v1.0.0)

> Generated from `framework.ts`. Edit the framework, not this file.

## How scoring works
- 100 points across five categories of 20 points each. Each criterion is scored at 0 / 25 / 50 / 75 / 100% of its points.
- **Not verified ≠ zero.** If something cannot be observed, it is marked *Not verified* and removed from the denominator. We never treat missing evidence as a confirmed problem.
- **Verified score** = points earned ÷ points we could verify × 100. It is shown only when at least 50% of points were verifiable. A category shows a number only when at least 25% of its points were verifiable.
- **Coverage** = verified points ÷ applicable points. **Confidence** combines coverage, evidence type and freshness (stale evidence counts half).
- A verified category below 60% is an opportunity. 3+ opportunity categories → the coordinated flagship program is recommended.
- **Manual overrides** need a reason, reviewer and date; the original value is kept and listed in the report. Overriding a Not verified item requires attaching evidence.
- **Impact scenarios** use hypothetical inputs supplied by the owner and are never presented as verified lost revenue.

## Evidence types
| Type | Confidence weight |
|---|---|
| Public observation | 1 |
| Documented API data | 1 |
| Sampled test (recorded conditions) | 0.6 |
| Owner-reported | 0.6 |
| Authorised test | 1 |

## Google Maps presence (20 pts) · Get Discovered
*Can nearby customers find an accurate, complete profile when they search on Google Maps?*

**Limitations:** Local results vary by searcher location, device and time. Sampled positions are observations, not rankings. Private profile data (e.g. Insights) is only available with the owner’s delegated access.

| Criterion | Pts | Measure | Tiers | Sources | Evidence required | If missing | Fresh for |
|---|---|---|---|---|---|---|---|
| Profile found and matches the business | 4 | A Google Business Profile exists for the business name, phone and area. | 100%: Found; name, phone and area match<br>50%: Found, but details conflict or an apparent duplicate exists<br>0%: No profile found after a documented search using name, phone and address variants | Google Maps public listing; Google Places API (approved key) | Profile URL, search queries used, date checked | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Primary category and services fit | 4 | Primary category matches the core service; services are listed. | 100%: Primary category correct and services listed<br>50%: Category acceptable but services missing, or category too broad<br>0%: Primary category clearly mismatched | Google Maps public listing | Screenshot or noted category + services, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Profile completeness | 4 | Count of: hours, website link, phone, address/service area, business description. | 100%: 5 of 5 present<br>75%: 4 of 5<br>50%: 3 of 5<br>25%: 2 of 5<br>0%: 0–1 of 5 | Google Maps public listing; Google Places API | Checklist of the five fields with date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Recent photos or updates | 3 | Owner-added photos or updates visible within the last 90 days. | 100%: Within 30 days<br>50%: Within 90 days<br>0%: None visible in 90 days | Google Maps public listing | Date of most recent owner photo/update | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Visible in sampled local results | 5 | Position in local results for "<core service> <city>" in a sampled search with recorded conditions. | 100%: Top 3<br>75%: Positions 4–5<br>50%: Positions 6–10<br>25%: Positions 11–20<br>0%: Not in top 20 | Approved search API or manual sample with recorded location, device, date | Query, location, device, date, observed position | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |

## AI discovery readiness (20 pts) · Get Discovered
*Is the information AI assistants rely on consistent, structured and worth citing?*

**Limitations:** AI assistant answers vary by assistant, version, date, location and conversation context. Results are observations under recorded conditions and never a stable ranking.

| Criterion | Pts | Measure | Tiers | Sources | Evidence required | If missing | Fresh for |
|---|---|---|---|---|---|---|---|
| Business facts consistent across sources | 5 | Name, address/service area and phone match across website, Google profile and the top 3 directories for the industry. | 100%: All consistent<br>50%: One mismatch<br>0%: Two or more mismatches | Business website; Google Business Profile; Top industry directories | Table of values per source with URLs and date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Local business structured data | 4 | Valid LocalBusiness (or subtype) structured data with name, phone and area on the website. | 100%: Present and valid<br>50%: Present with errors or missing key fields<br>0%: Absent | Website HTML; Schema validator | Validator result/screenshot and date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Answer-focused service content | 4 | Service pages directly answer common customer questions (what’s included, process, pricing factors, area served). | 100%: Most core services answered clearly<br>50%: Some services, thin answers<br>0%: No answer-focused content | Business website | URLs reviewed and notes, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Reputable third-party mentions | 3 | Business appears on reputable third-party sources (associations, local media, quality directories). | 100%: 3+ reputable sources<br>50%: 1–2 sources<br>0%: None found after documented search | Public web search via approved service; Industry association directories | Source URLs and date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Mentioned in sampled AI answers | 4 | Across a recorded prompt set on named assistants, the business is mentioned and described accurately. | 100%: Mentioned accurately in at least half of prompts<br>50%: Mentioned in some prompts or with inaccuracies<br>0%: Not mentioned in any sampled prompt | Named AI assistants, used within their terms | Prompt text, assistant + version if shown, date, location context, raw answers saved | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |

## Reviews & trust (20 pts) · Get Chosen
*When customers compare you, does your reputation make you the obvious choice?*

**Limitations:** Only public review data is used. Competitor set (3–5 nearby, same category) is recorded with the result.

| Criterion | Pts | Measure | Tiers | Sources | Evidence required | If missing | Fresh for |
|---|---|---|---|---|---|---|---|
| Review volume vs. local competitors | 5 | Google review count compared with the median of 3–5 nearby competitors. | 100%: At or above median<br>75%: 75–99% of median<br>50%: 50–74%<br>25%: 25–49%<br>0%: Below 25% | Google Maps public listings; Google Places API | Counts for business and named competitors, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Average rating | 4 | Google average star rating. | 100%: 4.7 or higher<br>75%: 4.5–4.6<br>50%: 4.2–4.4<br>25%: 3.8–4.1<br>0%: Below 3.8 | Google Maps public listing | Rating and count, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Review recency | 4 | Age of the most recent Google review. | 100%: 14 days or less<br>75%: 15–30 days<br>50%: 31–60 days<br>25%: 61–90 days<br>0%: Over 90 days | Google Maps public listing | Date of latest review | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 14 d |
| Owner responses | 4 | Share of the 10 most recent reviews with an owner response. | 100%: 80% or more<br>50%: 50–79%<br>25%: 1–49%<br>0%: None | Google Maps public listing | Count of responses in last 10, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Trust proof on website | 3 | Count of: licence/insurance info where applicable, real team or job photos, stated warranty/guarantee terms, link to public reviews. | 100%: 4 of 4<br>75%: 3 of 4<br>50%: 2 of 4<br>25%: 1 of 4<br>0%: None | Business website | URLs and checklist, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |

## Website conversion (20 pts) · Get Chosen
*Does the website make it easy to understand, trust and contact you, especially on a phone?*

**Limitations:** We observe the site as a visitor would and never submit fake inquiries. Speed uses lab data, which differs from real-user data.

| Criterion | Pts | Measure | Tiers | Sources | Evidence required | If missing | Fresh for |
|---|---|---|---|---|---|---|---|
| Call/CTA visible on mobile | 5 | On a ~390px-wide screen, tap-to-call or the primary CTA is visible without scrolling. | 100%: Visible and tappable<br>50%: Present but below the fold or not tappable<br>0%: No phone/CTA found on the homepage | Business website at mobile viewport | Mobile screenshot, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Clear offer above the fold | 4 | First screen states the service, the area served and a reason to choose them. | 100%: All three<br>50%: Two of three<br>0%: One or none | Business website | Screenshot + checklist, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Mobile page speed | 4 | Google PageSpeed Insights mobile performance score for the homepage. | 100%: 90–100<br>75%: 75–89<br>50%: 50–74<br>25%: 25–49<br>0%: Below 25 | PageSpeed Insights API (free key) | Score, report URL or JSON, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 30 d |
| Low-friction inquiry form | 4 | A quote/contact form exists, needs 5 or fewer required fields and is usable on mobile. | 100%: Exists, ≤5 required fields, mobile-friendly<br>50%: Exists but long or awkward on mobile<br>0%: No form found | Business website | Form URL, field count, date (not submitted) | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Technical basics | 3 | Valid HTTPS, no security warnings, primary navigation links work. | 100%: All pass<br>50%: One issue<br>0%: Two or more issues | Business website | Checklist, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |

## Lead follow-up (20 pts) · Get Booked
*When someone reaches out, how reliably do they hear back and get booked?*

**Limitations:** Internal follow-up processes are usually not public. They are Not verified unless the owner reports them or authorises a test. We never send fake inquiries.

| Criterion | Pts | Measure | Tiers | Sources | Evidence required | If missing | Fresh for |
|---|---|---|---|---|---|---|---|
| Ways to reach the business | 4 | Count of public inquiry paths: phone, form, text/SMS, online booking. | 100%: 4 paths<br>75%: 3 paths<br>50%: 2 paths<br>25%: 1 path<br>0%: None found | Business website; Google Business Profile | Checklist with URLs, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| After-hours capture | 3 | A visible way to start an inquiry outside business hours (booking, form with response promise, chat). | 100%: Clear after-hours option with response expectation<br>50%: Form only, no expectation set<br>0%: None visible | Business website | Screenshot/notes, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Online booking or quote request | 3 | Customers can book or request a quote online. | 100%: Self-serve booking or instant quote<br>50%: Quote request form only<br>0%: Neither | Business website; Google Business Profile booking link | URL, date | If this cannot be checked (page or profile unavailable, access restricted, search not completed) mark Not verified. Do not score 0. | 60 d |
| Speed to first response | 4 | Typical time to first response for a new inquiry. | 100%: Within 5 minutes<br>75%: Within an hour<br>50%: Same day<br>25%: Next day<br>0%: Longer or inconsistent | Owner report; Authorised test agreed in writing | Owner answer with date, or authorised test log | Not publicly observable. Mark Not verified unless owner-reported or tested with written authorisation. Never assume a slow response. | 90 d |
| Missed-call recovery | 3 | What happens after a missed call. | 100%: Text or call back within 15 minutes<br>50%: Called back same day<br>25%: Voicemail only<br>0%: Nothing consistent | Owner report; Authorised test | Owner answer with date, or authorised test log | Not publicly observable. Mark Not verified unless owner-reported or tested with written authorisation. | 90 d |
| Quote follow-up | 3 | Unaccepted quotes receive structured follow-up. | 100%: Set schedule, 2+ touches<br>50%: Usually one follow-up<br>0%: Only if the customer calls back | Owner report | Owner answer with date | Not publicly observable. Mark Not verified unless owner-reported. | 90 d |
