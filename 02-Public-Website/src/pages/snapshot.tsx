import { offerById } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import { usd } from '../../../03-Offers-and-Pricing/format.ts';
import { impactScenarios } from '../../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { allCriteria, categories, EVIDENCE_LABEL, FRAMEWORK_VERSION, THRESHOLDS } from '../../../04-Audits-and-Scorecards/snapshot/framework.ts';
import { config } from '../../site.config.ts';
import { industries } from '../content/industries.ts';
import { CONSENT_CONTACT, CONSENT_SMS } from '../lib/lead-payload.ts';
import { faqSchema, serviceSchema, type PageMeta } from '../lib/seo.tsx';
import { sampleData, sampleDownloads, sampleReport, sampleResult } from '../lib/sample.ts';
import { CheckList, CtaBand, CtaLink, DemoLabel, Faq, Icon, PageHero, Section, SectionHead } from '../components/ui.tsx';
import { CategoryCards, ScoreCard } from '../components/visuals.tsx';

const base = [{ name: 'Home', path: '/' }, { name: 'Free Snapshot', path: '/free-snapshot/' }];

const snapshotFaq = [
  { q: 'Is it really free?', a: 'Yes. No credit card and no obligation. If a paid program would help, we’ll explain which one and why. If not, we’ll tell you.' },
  { q: 'Do I need to give you any logins?', a: 'No. The Snapshot uses publicly observable information plus anything you choose to tell us. We never ask for passwords.' },
  { q: 'Will you call my business pretending to be a customer?', a: 'No. We never send fake inquiries or “mystery shop” without written permission. Anything we can’t observe honestly is marked Not verified.' },
  { q: 'What if I don’t have a website?', a: 'That’s fine. Leave the website field blank and we’ll score what exists. A missing website isn’t a reason to skip the Snapshot.' },
  { q: 'How do you use my information?', a: 'Only to prepare your Snapshot and follow up about it. We don’t sell it. See our privacy policy for details.' },
];

export const snapshotMeta: PageMeta = {
  path: '/free-snapshot/',
  title: 'Free Local Revenue Opportunity Snapshot™',
  description: 'Get a free, evidence-labelled 100-point Snapshot of your Google Maps presence, AI discovery readiness, reviews, website conversion and lead follow-up.',
  ogImage: '/og/og-snapshot.png',
  breadcrumbs: base,
  schema: [serviceSchema('Free Local Revenue Opportunity Snapshot', 'A free, evidence-labelled assessment of local visibility, reputation, website conversion and lead follow-up.', '/free-snapshot/'), faqSchema(snapshotFaq)],
};

const cities = [...config.company.serviceArea, 'Other'];
const industryChoices = [...industries.map((i) => ({ value: i.slug, label: i.name })), { value: 'realtor', label: 'Realtor / real estate' }, { value: 'other', label: 'Other' }];
const concerns = ['Not showing up on Google Maps', 'Not enough reviews', 'Website doesn’t bring in calls', 'Missed calls or slow follow-up', 'Curious about AI search', 'Not sure, that’s why I’m here'];

function Chips({ name, options, type = 'radio', required = false, legendId }: { name: string; options: Array<{ value: string; label: string }>; type?: 'radio' | 'checkbox'; required?: boolean; legendId: string }) {
  return (
    <div className="chips" role={type === 'radio' ? 'radiogroup' : 'group'} aria-labelledby={legendId} aria-required={required || undefined} data-field={name}>
      {options.map((o) => (
        <label key={o.value} className="chip">
          <input type={type} name={name} value={o.value} required={type === 'radio' && required ? true : undefined} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function FieldError({ id }: { id: string }) {
  return <p className="field-error" id={`err-${id}`} hidden data-error-for={id} />;
}

const ownerCriteria = allCriteria.filter((c) => c.ownerQuestion);

function SnapshotForm() {
  return (
    <form className="snap-form" id="snapshot-form" method="post" action={config.formEndpoint || '#snapshot-form'} data-snapshot-form="" noValidate aria-labelledby="snap-form-title">
      <h2 id="snap-form-title" className="snap-form__title">Request your free Snapshot</h2>
      <ol className="snap-progress" aria-hidden="true">
        <li data-progress="1" className="is-current">Business</li>
        <li data-progress="2">Follow-up</li>
        <li data-progress="3">Contact</li>
      </ol>
      <p className="sr-only" aria-live="polite" data-step-status="" />
      <p className="restored-note" data-restored="" hidden>
        <span>We kept your answers from earlier.</span>
        <button type="button" className="linklike" data-start-over="">Start over</button>
      </p>

      <fieldset className="snap-step" data-step="1">
        <legend>Step 1 of 3 · Your business</legend>
        <div className="field">
          <label htmlFor="f-business">Business name <span className="req">required</span></label>
          <input id="f-business" name="business_name" type="text" required maxLength={120} autoComplete="organization" autoCapitalize="words" enterKeyHint="next" aria-describedby="err-business_name" />
          <FieldError id="business_name" />
        </div>
        <div className="field">
          <label htmlFor="f-website">Website <span className="opt">optional, no website is fine</span></label>
          <input id="f-website" name="website" type="url" inputMode="url" placeholder="https://" maxLength={200} autoComplete="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby="err-website" />
          <FieldError id="website" />
        </div>
        <div className="field">
          <p className="field__label" id="l-city">City <span className="req">required</span></p>
          <Chips name="city" legendId="l-city" required options={cities.map((c) => ({ value: c, label: c }))} />
          <input className="field__other" name="city_other" type="text" maxLength={80} placeholder="Your city" aria-label="Other city" autoCapitalize="words" autoComplete="address-level2" enterKeyHint="next" data-other-for="city" hidden />
          <FieldError id="city" />
        </div>
        <div className="field">
          <p className="field__label" id="l-industry">Industry <span className="req">required</span></p>
          <Chips name="industry" legendId="l-industry" required options={industryChoices} />
          <FieldError id="industry" />
        </div>
        <div className="field">
          <p className="field__label" id="l-concerns">What prompted this? <span className="opt">optional, pick any</span></p>
          <Chips name="concerns" legendId="l-concerns" type="checkbox" options={concerns.map((c) => ({ value: c, label: c }))} />
        </div>
        <div className="snap-nav"><button type="button" className="btn btn--primary" data-next="">Continue</button></div>
      </fieldset>

      <fieldset className="snap-step" data-step="2">
        <legend>Step 2 of 3 · Quick follow-up check <span className="opt">optional</span></legend>
        <p className="snap-help">These are the only things we can’t see from the outside. “Not sure” is a good answer: it’s marked <b>Not verified</b> and never counted against you.</p>
        {ownerCriteria.map((c) => (
          <div className="field" key={c.id}>
            <p className="field__label" id={`l-${c.id}`}>{c.ownerQuestion!.prompt}</p>
            <div className="chips" role="radiogroup" aria-labelledby={`l-${c.id}`} data-selfcheck={c.id} data-points={c.points}>
              {c.ownerQuestion!.options.map((o) => (
                <label key={o.label} className="chip">
                  <input type="radio" name={`self_${c.id}`} value={String(o.tier)} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="selfcheck-out" data-selfcheck-out="" aria-live="polite">Answer any of the questions to see your self-reported follow-up readiness.</p>
        <div className="snap-nav"><button type="button" className="btn btn--ghost-dark" data-back="">Back</button><button type="button" className="btn btn--primary" data-next="">Continue</button></div>
      </fieldset>

      <fieldset className="snap-step" data-step="3">
        <legend>Step 3 of 3 · Where should we send it?</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-name">Your name <span className="req">required</span></label>
            <input id="f-name" name="contact_name" type="text" required maxLength={80} autoComplete="name" autoCapitalize="words" enterKeyHint="next" aria-describedby="err-contact_name" />
            <FieldError id="contact_name" />
          </div>
          <div className="field">
            <label htmlFor="f-email">Email <span className="req">required</span></label>
            <input id="f-email" name="email" type="email" required maxLength={120} autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby="err-email" />
            <FieldError id="email" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-phone">Phone <span className="opt">optional</span></label>
          <input id="f-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" inputMode="tel" enterKeyHint="done" aria-describedby="err-phone" />
          <FieldError id="phone" />
        </div>
        <div className="field">
          <p className="field__label" id="l-channel">Best way to reach you</p>
          <Chips name="preferred_channel" legendId="l-channel" options={[{ value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone call' }, { value: 'text', label: 'Text' }]} />
        </div>
        <label className="consent" data-sms-consent="" hidden>
          <input type="checkbox" name="consent_sms" value="yes" aria-describedby="err-consent_sms" />
          <span>{CONSENT_SMS}</span>
        </label>
        <FieldError id="consent_sms" />
        <label className="consent">
          <input type="checkbox" name="consent_contact" value="yes" required aria-describedby="err-consent_contact" />
          <span>{CONSENT_CONTACT} See our <a href="/privacy/">privacy policy</a>.</span>
        </label>
        <FieldError id="consent_contact" />
        <div className="hp" aria-hidden="true">
          <label>Leave this field empty<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <input type="hidden" name="form" value="snapshot_request" />
        <input type="hidden" name="interest" value="" data-attr="interest" />
        <input type="hidden" name="form_started_at" value="" data-attr="form_started_at" />
        {['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landing_page', 'first_touch_at'].map((n) => <input key={n} type="hidden" name={n} value="" data-attr={n} />)}
        <div className="snap-nav"><button type="button" className="btn btn--ghost-dark" data-back="">Back</button><button type="submit" className="btn btn--primary">Send my Snapshot request</button></div>
        <p className="form-error" data-form-error="" role="alert" hidden />
      </fieldset>

      <div className="snap-done" data-done="" hidden tabIndex={-1}>
        <Icon name="check" size={28} />
        <h3 data-done-title="">Request received</h3>
        <p data-done-text="">{config.snapshotTurnaround}</p>
        <p className="snap-done__preview" data-preview-note="" hidden>Preview mode: this site isn’t connected to an inbox yet, so nothing was sent or stored.</p>
        <a className="link-arrow" href="/free-snapshot/sample-report/">While you wait, see a sample report <Icon name="arrow" size={16} /></a>
      </div>
    </form>
  );
}

export function SnapshotPage() {
  return (
    <>
      <section className="snap-hero" aria-labelledby="snap-title">
        <div className="container snap-hero__grid">
          <div className="snap-hero__copy">
            <nav className="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">Free Snapshot</span></li></ol></nav>
            <p className="eyebrow eyebrow--on-dark">Free · No obligation · No passwords</p>
            <h1 id="snap-title">Free Local Revenue Opportunity Snapshot™</h1>
            <p className="hero__sub">A 100-point, evidence-labelled look at where nearby customers may be slipping away, and the one fix worth making first.</p>
            <ul className="snap-gets">
              <li><Icon name="chart" size={20} /> Scores for five categories, with confidence levels</li>
              <li><Icon name="dash" size={20} /> What we verified, and what we couldn’t</li>
              <li><Icon name="users" size={20} /> Comparison with nearby competitors</li>
              <li><Icon name="check" size={20} /> Top opportunities and a recommended next step</li>
            </ul>
            <p className="snap-hero__note">{config.snapshotTurnaround}</p>
          </div>
          <SnapshotForm />
        </div>
      </section>
      <Section tone="canvas" labelledBy="snap-checks">
        <SectionHead id="snap-checks" eyebrow="What we check" title="Five categories. 26 criteria. 100 points." lede={<>Every criterion records its source and the date we checked. <a href="/free-snapshot/methodology/">Read the full methodology</a>.</>} />
        <CategoryCards />
      </Section>
      <Section tone="white" labelledBy="snap-never">
        <div className="split split--top">
          <SectionHead id="snap-never" eyebrow="Our rules" title="How we keep it honest" />
          <CheckList items={['Missing information is marked “Not verified”, never scored as a failure', 'We never send fake inquiries or pose as a customer', 'AI results are observations under recorded conditions, never rankings', 'Projections use your numbers and are labelled hypothetical', 'We never ask for passwords']} />
        </div>
      </Section>
      <Section tone="ink" labelledBy="snap-sample">
        <div className="split">
          <div>
            <SectionHead id="snap-sample" eyebrow="Sample" title="See a completed Snapshot" lede="A full report for a fictional HVAC company, scored by the same engine we’ll use for you." />
            <CtaLink href="/free-snapshot/sample-report/" variant="ghost" cta="sample-snapshot-page">Open the sample report</CtaLink>
          </div>
          <div><ScoreCard result={sampleResult} compact /><DemoLabel>Fictional example: not a real business</DemoLabel></div>
        </div>
      </Section>
      <Section tone="canvas" labelledBy="snap-faq">
        <div className="split split--top">
          <SectionHead id="snap-faq" eyebrow="FAQ" title="Snapshot questions" />
          <Faq items={snapshotFaq} idPrefix="snap-faq" />
        </div>
      </Section>
    </>
  );
}

// ── Methodology ──────────────────────────────────────────────────────────
export const methodologyMeta: PageMeta = {
  path: '/free-snapshot/methodology/',
  title: 'Snapshot Methodology: How We Score Local Revenue Opportunities',
  description: 'The transparent 100-point framework behind the Local Revenue Opportunity Snapshot: criteria, sources, evidence, missing-data rules and limitations.',
  breadcrumbs: [...base, { name: 'Methodology', path: '/free-snapshot/methodology/' }],
};

const tierPct = (t: string) => `${Math.round(Number(t) * 100)}%`;

export function MethodologyPage() {
  return (
    <>
      <PageHero crumbs={methodologyMeta.breadcrumbs} eyebrow={`Methodology · v${FRAMEWORK_VERSION}`} title="How we score, in full." lede="Five categories of 20 points. Each criterion is scored at 0, 25, 50, 75 or 100% of its points, and only when we have evidence." />
      <Section tone="canvas" labelledBy="rules">
        <SectionHead id="rules" title="The rules" />
        <ul className="rule-grid">
          <li><h3>Not verified ≠ zero</h3><p>If we can’t observe something honestly, it’s marked Not verified and removed from the calculation.</p></li>
          <li><h3>Verified score</h3><p>Points earned ÷ points we could verify × 100. Shown only when at least {Math.round(THRESHOLDS.overallMinCoverage * 100)}% of points were verifiable.</p></li>
          <li><h3>Confidence</h3><p>Combines coverage, evidence type and freshness. Owner-reported and sampled results count for less than direct observation.</p></li>
          <li><h3>Overrides</h3><p>A reviewer can adjust a result only with a written reason, their name and the date. The original value stays in the report.</p></li>
        </ul>
        <h3 className="h-sm">Evidence types</h3>
        <ul className="plain-list">{Object.values(EVIDENCE_LABEL).map((l) => <li key={l}>{l}</li>)}</ul>
      </Section>
      {categories.map((c, ci) => (
        <Section key={c.id} tone={ci % 2 ? 'canvas' : 'white'} labelledBy={`m-${c.id}`}>
          <SectionHead id={`m-${c.id}`} eyebrow={`${c.outcome} · 20 points`} title={c.name} lede={c.question} />
          <div className="crit-cards">
            {c.criteria.map((x) => (
              <article key={x.id} className="crit-card">
                <header><h3>{x.label}</h3><span className="badge badge--cobalt">{x.points} pts</span></header>
                <p>{x.measure}</p>
                <dl>
                  <dt>Scoring</dt>
                  <dd><ul>{Object.entries(x.tiers).sort((a, b) => Number(b[0]) - Number(a[0])).map(([t, d]) => <li key={t}><b>{tierPct(t)}</b> {d}</li>)}</ul></dd>
                  <dt>Sources</dt><dd>{x.sources.join('; ')}</dd>
                  <dt>Evidence kept</dt><dd>{x.evidence}</dd>
                  <dt>If we can’t verify it</dt><dd>{x.missingData}</dd>
                  <dt>Limitations</dt><dd>{x.limitations}</dd>
                </dl>
              </article>
            ))}
          </div>
          <p className="muted-note"><Icon name="shield" size={16} /> {c.limitations}</p>
        </Section>
      ))}
      <CtaBand location="methodology" title="Ready to see your own numbers?" text="Request your free Snapshot. It takes about two minutes." />
    </>
  );
}

// ── Sample report ────────────────────────────────────────────────────────
export const sampleReportMeta: PageMeta = {
  path: '/free-snapshot/sample-report/',
  title: 'Sample Local Revenue Snapshot Report (Fictional Business)',
  description: 'A complete sample Snapshot report for a clearly fictional HVAC company, showing scores, confidence, Not verified items, competitors and next steps.',
  breadcrumbs: [...base, { name: 'Sample report', path: '/free-snapshot/sample-report/' }],
};

export function SampleReportPage() {
  const r = sampleResult;
  const rec = r.recommendation.offer ? offerById(r.recommendation.offer)! : null;
  const catName = (id: string) => categories.find((c) => c.id === id)!.name;
  const scenarios = impactScenarios(sampleData.scenarioInputs);
  return (
    <>
      <div className="report-banner" role="note"><div className="container"><DemoLabel>Fictional sample report: {r.business.name} does not exist. All data is invented to show the format.</DemoLabel></div></div>
      <PageHero crumbs={sampleReportMeta.breadcrumbs} eyebrow="Local Revenue Opportunity Snapshot™ · Sample" title={r.business.name} lede={`${r.business.industry} · ${r.business.area} · Checked ${r.reportDate} · Framework v${r.frameworkVersion}`}>
        <div className="hero__ctas"><button type="button" className="btn btn--ghost" data-print="">Print or save as PDF</button></div>
      </PageHero>
      <Section tone="white" labelledBy="exec">
        <div className="split split--top">
          <div>
            <SectionHead id="exec" eyebrow="Executive summary" title="Overall verified assessment" />
            <p className="report-p">{sampleReport.summary}</p>
            <h3 className="h-sm" id="downloads">Download this sample</h3>
            <ul className="downloads" aria-labelledby="downloads">
              {sampleDownloads.map((d) => (
                <li key={d.href}><a href={d.href} download="" data-cta={`download-${d.kind}`}><Icon name="doc" size={18} /><span><b>{d.label}</b><small>{d.note} · {d.size}</small></span></a></li>
              ))}
            </ul>
            <p className="muted-note">Every Snapshot can be exported in these formats. All files for this sample are fictional and labelled as such.</p>
          </div>
          <ScoreCard result={r} />
        </div>
      </Section>
      <Section tone="canvas" labelledBy="cats">
        <SectionHead id="cats" eyebrow="Category detail" title="What we found" />
        <div className="report-cats">
          {r.categories.map((c) => {
            const results = sampleData.input.results.filter((x) => x.criterionId.startsWith(`${c.id}.`));
            return (
              <article key={c.id} className="report-cat">
                <header><h3>{c.name}</h3><span className="report-cat__score">{c.display === null ? 'Not verified' : `${Math.round(c.display * 10) / 10}/20`}</span></header>
                <ul>
                  {results.map((x) => {
                    const cr = allCriteria.find((a) => a.id === x.criterionId)!;
                    return (
                      <li key={x.criterionId} className={x.status === 'not_verified' ? 'is-nv' : undefined}>
                        <span className="report-cat__label">{cr.label}</span>
                        <span className="report-cat__val">{x.status === 'scored' ? `${Math.round((x.tier ?? 0) * cr.points * 100) / 100}/${cr.points}` : 'Not verified'}</span>
                        {x.evidence ? <small>{x.evidence.note} · {EVIDENCE_LABEL[x.evidence.type]} · {x.evidence.checkedAt}</small> : <small>Not publicly observable; not counted.</small>}
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </Section>
      <Section tone="white" labelledBy="comp">
        <SectionHead id="comp" eyebrow="Competitor comparison" title="Nearby competitors (fictional)" />
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th scope="col">Business</th><th scope="col">Google reviews</th><th scope="col">Rating</th><th scope="col">Structured data</th><th scope="col">Mobile tap-to-call</th></tr></thead>
            <tbody>
              <tr className="is-featured"><th scope="row">{r.business.name}</th><td>87</td><td>4.7</td><td>No</td><td>No</td></tr>
              {sampleData.competitors.map((c) => <tr key={c.name}><th scope="row">{c.name}</th><td>{c.reviews}</td><td>{c.rating}</td><td>{c.schema ? 'Yes' : 'No'}</td><td>{c.mobileCta ? 'Yes' : 'No'}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Section>
      <Section tone="canvas" labelledBy="opps">
        <div className="split split--top">
          <div>
            <SectionHead id="opps" eyebrow="Immediate opportunities" title="Quick wins we’d start with" />
            <ol className="opp-list">{sampleData.immediateOpportunities.map((o) => <li key={o.action}><span>{o.action}</span><span className="badge badge--neutral">{catName(o.category)} · {o.effort} effort</span></li>)}</ol>
          </div>
          <div>
            <h3 className="h-sm">Estimated business impact scenarios</h3>
            <p className="muted-note">Hypothetical, based on owner-supplied example inputs ({sampleData.scenarioInputs.monthlyInquiries} inquiries/mo, {Math.round(sampleData.scenarioInputs.closeRate * 100)}% close rate, {usd(sampleData.scenarioInputs.averageJobValue)} average job). Not verified lost revenue.</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th scope="col">Scenario</th><th scope="col">Extra jobs/mo</th><th scope="col">Extra revenue/mo</th></tr></thead>
                <tbody>{scenarios.map((s) => <tr key={s.label}><th scope="row">{s.label}</th><td>{s.extraJobsPerMonth}</td><td>{usd(s.extraRevenuePerMonth)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>
      <Section tone="ink" labelledBy="rec">
        <SectionHead id="rec" eyebrow="Recommended service" title={rec ? rec.name : 'No program recommended yet'} lede={r.recommendation.reason} />
        <p className="note-on-dark">Suggested implementation priority: {r.recommendation.priorities.map((p, i) => `${i + 1}. ${catName(p)}`).join('  ·  ')}</p>
        {rec ? <p className="note-on-dark">Proposed pricing: {usd(rec.price.setup)} setup + {usd(rec.price.monthly)}/mo.</p> : null}
        <div className="btn-row"><CtaLink href="/free-snapshot/" cta="sample-get-own" size="lg" arrow>Get My Free Local Revenue Snapshot</CtaLink></div>
      </Section>
    </>
  );
}

