/**
 * Standalone, printable HTML report (no external requests): inline CSS, inline SVG,
 * optional embedded Inter fonts. Also the source for the PDF export.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { markPaths } from '../../../01-Brand-System/Logos/concepts/mark.ts';
import { resolveColors } from '../../../01-Brand-System/Design-Tokens/resolve.ts';
import { usd } from '../../../03-Offers-and-Pricing/format.ts';
import { confidenceLabel, type ReportModel } from './model.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const C = resolveColors();
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

function fontFaces(embed: boolean): string {
  if (!embed) return '';
  const f = (file: string) => readFileSync(join(root, '02-Public-Website/public/fonts', file)).toString('base64');
  return [
    `@font-face{font-family:'Inter';font-weight:400;src:url(data:font/woff;base64,${f('inter-400.woff')}) format('woff')}`,
    `@font-face{font-family:'Inter';font-weight:600 700;src:url(data:font/woff;base64,${f('inter-600.woff')}) format('woff')}`,
    `@font-face{font-family:'Inter Display';font-weight:700;src:url(data:font/woff;base64,${f('inter-display-700.woff')}) format('woff')}`,
  ].join('');
}

const css = (embedFonts: boolean) => `${fontFaces(embedFonts)}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:${C.canvas};color:${C['slate-700']};font:400 14px/1.55 Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
.page{max-width:860px;margin:0 auto;background:#fff}
h1,h2,h3{font-family:'Inter Display',Inter,Arial,sans-serif;color:${C.ink};letter-spacing:-0.02em;margin:0 0 .5em;line-height:1.2}
h2{font-size:21px;margin-top:4px}h3{font-size:15px}
p{margin:0 0 .8em}
.cover{background:${C.ink};color:${C.fog};padding:32px 40px 28px}
.brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:700;font-family:'Inter Display',Inter,Arial,sans-serif;font-size:15px;margin-bottom:22px}
.brand svg{width:30px;height:30px}
.kicker{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${C['cobalt-300']};margin:0 0 6px}
.cover h1{color:#fff;font-size:30px;margin:0 0 6px}
.meta{font-size:13px;margin:0}
.notice{background:${C['mint-100']};color:${C['mint-800']};font-weight:600;font-size:12.5px;padding:10px 40px;border-bottom:1px solid ${C['slate-200']}}
.sec{padding:26px 40px;border-bottom:1px solid ${C['slate-200']}}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}
.kpi{background:${C.canvas};border:1px solid ${C['slate-200']};border-radius:12px;padding:12px 14px}
.kpi b{display:block;font-family:'Inter Display',Inter,Arial,sans-serif;font-size:24px;color:${C.ink};line-height:1.1}
.kpi span{font-size:11.5px;color:${C.slate}}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid ${C['slate-200']};vertical-align:top;font-size:12.5px}
thead th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:${C.slate};background:${C.canvas};font-weight:600}
.bar{height:7px;border-radius:9px;background:${C['canvas-200']};overflow:hidden;min-width:90px}
.bar i{display:block;height:100%;background:${C.cobalt}}
.bar.nv{background:repeating-linear-gradient(90deg,${C['slate-200']} 0 5px,transparent 5px 9px)}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:600;white-space:nowrap}
.p-high{background:${C['mint-100']};color:${C['mint-800']}}.p-medium{background:${C['cobalt-100']};color:${C['cobalt-700']}}
.p-low{background:${C['canvas-200']};color:${C.ink};border:1px solid ${C['slate-400']}}.p-insufficient,.p-nv{border:1px dashed ${C['slate-400']};color:${C.slate}}
.rec{background:${C.ink};color:${C.fog};border-radius:14px;padding:18px 20px;margin-top:6px}
.rec h3{color:#fff;font-size:18px;margin-bottom:4px}.rec b{color:#fff}
.cat{break-inside:avoid;margin-bottom:18px}
.cat-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:2px solid ${C.ink};padding-bottom:4px;margin-bottom:2px}
.cat-h h3{margin:0}.score{font-family:'Inter Display',Inter,Arial,sans-serif;font-weight:700;color:${C.ink}}
.nvrow td{color:${C.slate}}.nvrow td:first-child{border-left:2px dashed ${C['slate-400']};padding-left:8px}
.small{font-size:11.5px;color:${C.slate}}
ol.opps{margin:0;padding-left:20px}ol.opps li{margin-bottom:6px}
.hyp{border:1px dashed ${C['slate-400']};border-radius:12px;padding:12px 14px}
ul.disc{margin:0;padding-left:18px;font-size:12.5px}
.foot{padding:16px 40px 28px;font-size:11px;color:${C.slate}}
.keep{break-inside:avoid}h2,h3,.cat-h{break-after:avoid}tr,.kpi,.rec,.hyp{break-inside:avoid}.nw{white-space:nowrap}
@media (max-width:640px){.cover,.sec,.notice,.foot{padding-left:18px;padding-right:18px}.kpis{grid-template-columns:repeat(2,1fr)}.tw{overflow-x:auto}}
@page{size:Letter;margin:14mm 0 16mm}
@media print{body{background:#fff}.page{max-width:none}.sec{padding:18px 36px}.cover{padding:26px 36px}}
`;

export function ReportDocument({ m }: { m: ReportModel }) {
  const o = m.result.overall;
  const catRows = (id: string) => m.rows.filter((r) => r.category === id);
  return (
    <div className="page">
      <header className="cover">
        <div className="brand"><svg viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markPaths('on-dark') }} />Reale Revenue Systems</div>
        <p className="kicker">Local Revenue Opportunity Snapshot™</p>
        <h1>{m.business.name}</h1>
        <p className="meta">{m.business.industry} · {m.business.area} · Checked {m.reportDate} · Framework v{m.result.frameworkVersion}</p>
      </header>
      {m.fictionalNotice ? <p className="notice" data-fictional="">{m.fictionalNotice}</p> : null}

      <section className="sec keep">
        <h2>Executive summary</h2>
        <p>{m.summary}</p>
        <div className="kpis">
          <div className="kpi"><b>{o.verifiedScore === null ? '—' : `${o.verifiedScore}/100`}</b><span>Verified score</span></div>
          <div className="kpi"><b>{Math.round(o.coverage * 100)}%</b><span>Points verifiable</span></div>
          <div className="kpi"><b>{confidenceLabel[o.confidence]}</b><span>Confidence</span></div>
          <div className="kpi"><b>{m.notVerifiedCount}</b><span>Items not verified (not counted)</span></div>
        </div>
      </section>

      <section className="sec keep">
        <h2>Category scores</h2>
        <div className="tw"><table>
          <thead><tr><th>Category</th><th>Score</th><th style={{ width: '28%' }}>Verified share</th><th>Confidence</th><th>Not verified</th></tr></thead>
          <tbody>
            {m.categoryCards.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td className="score">{c.display === null ? 'Not verified' : `${fmt(c.display)}/20`}</td>
                <td><div className={`bar${c.display === null ? ' nv' : ''}`}><i style={{ width: `${Math.round((c.ratio ?? 0) * 100)}%` }} /></div><span className="small">{fmt(c.earned)} of {c.verifiedPoints} verified pts</span></td>
                <td><span className={`pill p-${c.confidence}`}>{confidenceLabel[c.confidence]}</span></td>
                <td>{c.notVerified.length}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="sec keep">
        <h2>Recommended next step</h2>
        <div className="rec">
          <h3>{m.recommendation.offerName ?? 'No program recommended yet'}</h3>
          <p>{m.recommendation.reason}</p>
          {m.priorities.length ? <p><b>Suggested priority:</b> {m.priorities.map((p, i) => `${i + 1}. ${p.name}`).join('  ·  ')}</p> : null}
          {m.recommendation.setup !== null ? <p style={{ margin: 0 }}><b>Pricing:</b> {usd(m.recommendation.setup)} setup + {usd(m.recommendation.monthly!)}/month{m.recommendation.priceStatus === 'proposed' ? ' (proposed launch pricing)' : ''}</p> : null}
        </div>
      </section>

      <section className="sec">
        <h2>What we found</h2>
        <p className="small">Each result shows its evidence, type and date. “Not verified” items were not observable and are excluded from the score.</p>
        {m.categoryCards.map((c) => (
          <div className="cat" key={c.id}>
            <div className="cat-h"><h3>{c.name}</h3><span className="score">{c.display === null ? 'Not verified' : `${fmt(c.display)}/20`}</span></div>
            <div className="tw"><table>
              <thead><tr><th style={{ width: '28%' }}>Criterion</th><th>Result</th><th>Evidence</th><th style={{ width: '14%' }}>Type</th><th>Checked</th></tr></thead>
              <tbody>
                {catRows(c.id).map((r) => (
                  <tr key={r.criterionId} className={r.status === 'scored' ? undefined : 'nvrow'}>
                    <td>{r.label}{r.overridden ? <span className="small"> (reviewer override: {r.overrideReason})</span> : null}</td>
                    <td><b>{r.status === 'scored' ? `${fmt(r.earned ?? 0)}/${r.points}` : r.status === 'not_applicable' ? 'N/A' : 'Not verified'}</b></td>
                    <td>{r.note}{r.sourceUrl ? <><br /><span className="small">{r.sourceUrl}</span></> : null}</td>
                    <td className="small">{r.evidenceLabel || '—'}</td>
                    <td className="small nw">{r.checkedAt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        ))}
      </section>

      {m.competitors.length ? (
        <section className="sec keep">
          <h2>Competitor comparison</h2>
          <div className="tw"><table>
            <thead><tr><th>Business</th><th>Google reviews</th><th>Rating</th><th>Structured data</th><th>Mobile tap-to-call</th></tr></thead>
            <tbody>{m.competitors.map((c) => <tr key={c.name}><td>{c.name}</td><td>{c.reviews ?? '—'}</td><td>{c.rating ?? '—'}</td><td>{c.schema === undefined ? '—' : c.schema ? 'Yes' : 'No'}</td><td>{c.mobileCta === undefined ? '—' : c.mobileCta ? 'Yes' : 'No'}</td></tr>)}</tbody>
          </table></div>
        </section>
      ) : null}

      {m.opportunities.length ? (
        <section className="sec keep">
          <h2>Immediate opportunities</h2>
          <ol className="opps">{m.opportunities.map((x) => <li key={x.action}><b>{x.action}</b> <span className="small">({x.categoryName} · {x.effort} effort)</span></li>)}</ol>
        </section>
      ) : null}

      {m.scenarios.length && m.scenarioInputs ? (
        <section className="sec">
          <h2>Estimated business impact scenarios</h2>
          <div className="hyp">
            <p className="small"><b>Hypothetical.</b> Based on example inputs ({m.scenarioInputs.monthlyInquiries} inquiries/month, {Math.round(m.scenarioInputs.closeRate * 100)}% close rate, {usd(m.scenarioInputs.averageJobValue)} average job). Not verified lost revenue and not a forecast.</p>
            <table><thead><tr><th>Scenario</th><th>Extra jobs / month</th><th>Extra revenue / month</th></tr></thead>
              <tbody>{m.scenarios.map((s) => <tr key={s.label}><td>{s.label}</td><td>{s.extraJobsPerMonth}</td><td>{usd(s.extraRevenuePerMonth)}</td></tr>)}</tbody></table>
          </div>
        </section>
      ) : null}

      <section className="sec keep">
        <h2>Method and limitations</h2>
        <ul className="disc">{m.disclaimers.map((d) => <li key={d}>{d}</li>)}</ul>
      </section>
      <footer className="foot">Prepared by {m.preparedBy} · Report format v{m.formatVersion} · Generated {m.generatedAt.slice(0, 10)}{m.fictional ? ' · FICTIONAL SAMPLE' : ''}</footer>
    </div>
  );
}

export function renderReportHtml(m: ReportModel, opts: { embedFonts?: boolean } = {}): string {
  const body = renderToStaticMarkup(<ReportDocument m={m} />);
  return `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(m.title)}${m.fictional ? ' (fictional sample)' : ''}</title><style>${css(opts.embedFonts ?? true)}</style></head><body>${body}</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
