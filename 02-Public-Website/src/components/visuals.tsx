/** Original branded visuals and data components. Every demo renders a DemoLabel. */
import type { SnapshotResult } from '../../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { impactScenarios } from '../../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { categories } from '../../../04-Audits-and-Scorecards/snapshot/framework.ts';
import { DemoLabel, Icon, type IconName } from './ui.tsx';

/** Hero: realistic customer-journey visualisation (search → selection → inquiry → follow-up → booking). */
export function JourneyVisual() {
  const rail = ['Search', 'Choose', 'Inquire', 'Follow up', 'Booked'];
  return (
    <figure className="journey" aria-labelledby="journey-cap">
      <ol className="journey__rail" aria-hidden="true">
        {rail.map((r, i) => <li key={r} style={{ ['--i' as string]: i }}><span className="journey__dot" />{r}</li>)}
      </ol>
      <div className="journey__screen">
        <div className="jstep" style={{ ['--i' as string]: 0 }}>
          <p className="jstep__k"><Icon name="search" size={14} /> Search</p>
          <div className="jsearch"><span>ac repair near me</span><Icon name="search" size={16} /></div>
          <ul className="jresults">
            <li className="is-match"><Icon name="pin" size={16} /><span><b>Mesquite Ridge Comfort Co.</b><small>★ 4.7 · Open now · Surprise</small></span></li>
            <li><Icon name="pin" size={16} /><span><b>Nearby HVAC company</b><small>★ 4.4 · Closes 5 PM</small></span></li>
          </ul>
        </div>
        <div className="jstep" style={{ ['--i' as string]: 1 }}>
          <p className="jstep__k"><Icon name="star" size={14} /> Choose</p>
          <div className="jcard">
            <b>Mesquite Ridge Comfort Co.</b>
            <small>Licensed · 87 reviews · replies to reviews</small>
            <span className="jcard__actions"><span className="jchip jchip--primary"><Icon name="phone" size={14} />Call</span><span className="jchip">Website</span></span>
          </div>
        </div>
        <div className="jstep" style={{ ['--i' as string]: 2 }}>
          <p className="jstep__k"><Icon name="phone" size={14} /> Inquire <em>missed call · tech on a job</em></p>
          <p className="jbubble jbubble--in">Hi! Our AC is blowing warm air. Can someone come out today?</p>
        </div>
        <div className="jstep" style={{ ['--i' as string]: 3 }}>
          <p className="jstep__k"><Icon name="reply" size={14} /> Follow up <em>automated · within a minute</em></p>
          <p className="jbubble jbubble--out">Automated reply from Mesquite Ridge: sorry we missed you! We have an opening today 2:30–4:30. Reply 1 to book, or STOP to opt out.</p>
        </div>
        <div className="jstep jstep--booked" style={{ ['--i' as string]: 4 }}>
          <p className="jstep__k"><Icon name="calendar" size={14} /> Booked</p>
          <p className="jbooked"><Icon name="check" size={18} /><span><b>Today, 2:30–4:30 PM</b><small>Confirmed by text</small></span></p>
        </div>
      </div>
      <figcaption id="journey-cap">
        <DemoLabel>Illustration · fictional business</DemoLabel>
        <span className="sr-only">A customer searches for AC repair, chooses a business with strong reviews, calls while the team is busy, receives an automated reply offering a time, and books an appointment.</span>
      </figcaption>
    </figure>
  );
}

const PART_META: Record<string, { icon: IconName; label: string; href: string; text: string }> = {
  maps: { icon: 'pin', label: 'Maps & local search', href: '/services/local-seo/', text: 'An accurate, complete profile where nearby customers look first.' },
  ai: { icon: 'spark', label: 'AI discovery', href: '/services/ai-search-visibility/', text: 'Consistent facts and clear answers AI assistants can cite.' },
  reviews: { icon: 'star', label: 'Reputation', href: '/services/reviews-reputation/', text: 'A steady flow of honest reviews, each one answered.' },
  website: { icon: 'browser', label: 'Website conversion', href: '/services/website-conversion/', text: 'A site that makes calling, quoting and booking effortless.' },
  followup: { icon: 'reply', label: 'Lead follow-up', href: '/services/lead-recovery/', text: 'Every inquiry captured and followed up on time.' },
};

export function SystemDiagram() {
  const stages: Array<{ outcome: string; parts: string[] }> = [
    { outcome: 'Get Discovered', parts: ['maps', 'ai'] },
    { outcome: 'Get Chosen', parts: ['reviews', 'website'] },
    { outcome: 'Get Booked', parts: ['followup'] },
  ];
  let n = 0;
  return (
    <div className="system">
      <ol className="system__stages">
        {stages.map((s) => (
          <li key={s.outcome} className="system__stage">
            <p className="system__outcome">{s.outcome}</p>
            <ul>
              {s.parts.map((p) => {
                const m = PART_META[p]!;
                n += 1;
                return (
                  <li key={p} className="system__part">
                    <span className="system__n">{n}</span>
                    <Icon name={m.icon} size={22} />
                    <h3>{m.label}</h3>
                    <p>{m.text}</p>
                    <a href={m.href} className="link-arrow">Learn more<span className="sr-only"> about {m.label}</span> <Icon name="arrow" size={16} /></a>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      <p className="system__all"><Icon name="chart" size={18} /> <span><b>Local Revenue Dominator™</b> runs all five as one coordinated program.</span> <a href="/pricing/#local-revenue-dominator">See pricing</a></p>
    </div>
  );
}

function Ring({ value, label }: { value: number | null; label: string }) {
  const C = 2 * Math.PI * 42;
  const frac = value === null ? 0 : value / 100;
  return (
    <div className="ring" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" width="132" height="132" aria-hidden="true">
        <circle cx="50" cy="50" r="42" className="ring__track" />
        <circle cx="50" cy="50" r="42" className="ring__value" strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="ring__num">{value ?? '—'}<small>{value === null ? 'Not enough evidence' : '/100'}</small></span>
    </div>
  );
}

const confTone = { high: 'positive', medium: 'cobalt', low: 'warn', insufficient: 'muted' } as const;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** Snapshot results card. Used for the homepage preview and the sample report. */
export function ScoreCard({ result, title, compact = false }: { result: SnapshotResult; title?: string; compact?: boolean }) {
  const o = result.overall;
  return (
    <div className={`scorecard${compact ? ' scorecard--compact' : ''}`} data-scorecard="">
      <div className="scorecard__head">
        <Ring value={o.verifiedScore} label={o.verifiedScore === null ? 'Not enough verified evidence for an overall score' : `Verified score ${o.verifiedScore} out of 100`} />
        <div>
          <p className="scorecard__biz">{title ?? result.business.name}</p>
          <p className="scorecard__meta">{result.business.industry} · {result.business.area} · checked {result.reportDate}</p>
          <p className="scorecard__cov"><b>{Math.round(o.coverage * 100)}%</b> of points verifiable · confidence <span className={`badge badge--${confTone[o.confidence]}`}>{o.confidence}</span></p>
        </div>
      </div>
      <ul className="scorecard__cats">
        {result.categories.map((c) => (
          <li key={c.id} className="scat">
            <div className="scat__top">
              <span className="scat__name">{c.name}</span>
              <span className="scat__score">{c.display === null ? <span className="badge badge--muted">Not verified</span> : <>{fmt(c.display)}<small>/20</small></>}</span>
            </div>
            <div className={`scat__bar${c.display === null ? ' scat__bar--nv' : ''}`} aria-hidden="true"><span style={{ width: `${Math.round((c.ratio ?? 0) * 100)}%` }} /></div>
            <p className="scat__meta">
              <span className={`badge badge--${confTone[c.confidence]}`}>{c.confidence} confidence</span>
              {c.notVerified.length ? <span className="scat__nv"><Icon name="dash" size={13} /> {c.notVerified.length} not verified</span> : null}
              {!compact ? <span className="scat__pts">{fmt(c.earned)} of {c.verifiedPoints} verified pts</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ImpactCalculator({ defaults = { monthlyInquiries: 60, closeRate: 0.3, averageJobValue: 400 } }: { defaults?: { monthlyInquiries: number; closeRate: number; averageJobValue: number } }) {
  const rows = impactScenarios(defaults);
  return (
    <form className="calc" data-calculator="" aria-labelledby="calc-title" >
      <h3 id="calc-title">What would a small improvement be worth?</h3>
      <p className="calc__note">A hypothetical calculator using <b>your</b> numbers. These aren’t our results or a prediction.</p>
      <div className="calc__inputs">
        <label>Inquiries per month<input type="number" name="inquiries" min="1" max="100000" step="1" defaultValue={defaults.monthlyInquiries} inputMode="numeric" /></label>
        <label>Close rate (%)<input type="number" name="close" min="1" max="100" step="1" defaultValue={Math.round(defaults.closeRate * 100)} inputMode="numeric" /></label>
        <label>Average job ($)<input type="number" name="job" min="1" max="1000000" step="1" defaultValue={defaults.averageJobValue} inputMode="numeric" /></label>
      </div>
      <table className="calc__out">
        <caption className="sr-only">Hypothetical extra revenue per month</caption>
        <thead><tr><th scope="col">More booked jobs</th><th scope="col">Extra jobs/mo</th><th scope="col">Extra revenue/mo</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} data-row={i}>
              <th scope="row">{r.label.replace('If booked jobs rose ', '+')}</th>
              <td data-jobs="">{r.extraJobsPerMonth}</td>
              <td data-rev="">${r.extraRevenuePerMonth.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <DemoLabel>Hypothetical scenario: inputs are examples, not verified results</DemoLabel>
    </form>
  );
}

export function CategoryCards({ compact = false }: { compact?: boolean }) {
  return (
    <ul className="cat-cards">
      {categories.map((c) => {
        const m = PART_META[c.id]!;
        return (
          <li key={c.id} className="cat-card">
            <Icon name={m.icon} size={22} />
            <h3>{c.name}</h3>
            <p>{c.question}</p>
            {!compact ? <p className="cat-card__n">{c.criteria.length} criteria · 20 points</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export const partMeta = PART_META;
