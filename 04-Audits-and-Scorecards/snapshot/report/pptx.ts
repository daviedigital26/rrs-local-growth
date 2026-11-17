/**
 * Customer presentation export (.pptx, editable in PowerPoint / Google Slides).
 * Built on named layouts with placeholders, native charts and brand colours.
 * Fonts: Arial everywhere, so it renders identically on client machines without Inter
 * (DECISIONS D-016).
 */
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { markPaths } from '../../../01-Brand-System/Logos/concepts/mark.ts';
import { usd } from '../../../03-Offers-and-Pricing/format.ts';
import { confidenceLabel, type ReportModel } from './model.ts';

const K = { ink: '081020', ink7: '121B3F', cobalt: '4F5DFF', cobalt3: '99A1FF', cobalt1: 'E6E8FF', cobalt7: '3A46BC', mint: '2DD4BF', mint1: 'DDF8F5', mint8: '165A5C', slate: '334155', slate7: '243042', slate4: '898F9C', slate2: 'E0DEDB', canvas: 'F7F4EE', canvas2: 'EFEDE8', white: 'FFFFFF', fog: 'C2C6CC' };
const FONT = 'Arial';
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

async function markPng(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 64 64">${markPaths('on-dark')}</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return `image/png;base64,${buf.toString('base64')}`;
}

/**
 * `stable: true` makes the file byte-identical across runs (fixed timestamps from the report
 * date, deterministic section ids) so committed samples don't change on every rebuild.
 */
export async function buildDeck(m: ReportModel, opts: { stable?: boolean } = {}): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9'; // 10 × 5.625 in
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.title = `${m.title}${m.fictional ? ' (fictional sample)' : ''}`;
  pres.author = m.preparedBy;
  pres.company = 'Reale Revenue Systems';
  pres.subject = 'Local Revenue Opportunity Snapshot';
  const logo = await markPng();
  const footer = `Reale Revenue Systems · Snapshot · ${m.business.name.replace(/&/g, 'and')}`;

  pres.defineSlideMaster({
    title: 'RRS_TITLE',
    background: { color: K.ink },
    objects: [
      { image: { x: 0.6, y: 0.5, w: 0.5, h: 0.5, data: logo } },
      { text: { text: 'Reale Revenue Systems', options: { x: 1.2, y: 0.55, w: 4, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: K.white, margin: 0 } } },
      { placeholder: { options: { name: 'kicker', type: 'body', x: 0.6, y: 1.75, w: 8.8, h: 0.4, fontFace: FONT, fontSize: 12, bold: true, color: K.cobalt3, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 2.15, w: 8.8, h: 1.3, fontFace: FONT, fontSize: 38, bold: true, color: K.white, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 3.5, w: 8.8, h: 0.5, fontFace: FONT, fontSize: 15, color: K.fog, margin: 0 }, text: '' } },
    ],
  });
  pres.defineSlideMaster({
    title: 'RRS_CONTENT',
    background: { color: K.white },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 9, h: 0.75, fontFace: FONT, fontSize: 26, bold: true, color: K.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { text: { text: footer, options: { x: 0.5, y: 5.2, w: 5.3, h: 0.3, fontFace: FONT, fontSize: 9, color: K.slate, margin: 0 } } },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: K.slate, align: 'right' },
  });
  pres.defineSlideMaster({
    title: 'RRS_DARK',
    background: { color: K.ink },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 9, h: 0.75, fontFace: FONT, fontSize: 26, bold: true, color: K.white, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { text: { text: footer, options: { x: 0.5, y: 5.2, w: 5.3, h: 0.3, fontFace: FONT, fontSize: 9, color: K.fog, margin: 0 } } },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: K.fog, align: 'right' },
  });

  const fictionalTag = (s: PptxGenJS.Slide, dark = false) => {
    if (!m.fictional) return;
    s.addText('Fictional sample: not a real business', { x: 6.0, y: 5.19, w: 2.75, h: 0.28, fontFace: FONT, fontSize: 10, bold: true, color: K.mint8, fill: { color: K.mint1 }, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'fictional-tag' });
  };
  const o = m.result.overall;

  // 1 · Title
  pres.addSection({ title: 'Overview' });
  let s = pres.addSlide({ masterName: 'RRS_TITLE', sectionTitle: 'Overview' });
  s.addText('LOCAL REVENUE OPPORTUNITY SNAPSHOT', { placeholder: 'kicker' });
  s.addText(m.business.name, { placeholder: 'title' });
  s.addText(`${m.business.industry} · ${m.business.area} · Checked ${m.reportDate}`, { placeholder: 'body' });
  fictionalTag(s, true);
  s.addNotes(`Purpose: walk ${m.business.name} through what we verified, what we couldn't, and the one place to start.${m.fictional ? ' This is a FICTIONAL sample.' : ''}`);

  // 2 · Verified score
  s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Overview' });
  s.addText(o.verifiedScore === null ? 'Not enough evidence for an overall score yet' : `Verified score: ${o.verifiedScore} out of 100`, { placeholder: 'title' });
  fictionalTag(s);
  if (o.verifiedScore !== null) {
    s.addChart(pres.ChartType.doughnut, [{ name: 'Score', labels: ['Earned', 'Not earned'], values: [o.verifiedScore, 100 - o.verifiedScore] }], { x: 0.5, y: 1.2, w: 3.4, h: 3.4, holeSize: 72, chartColors: [K.cobalt, K.canvas2], showLegend: false, showValue: false, showPercent: false, showLabel: false, dataBorder: { pt: 0.5, color: K.white }, objectName: 'score-doughnut' });
    s.addText([{ text: String(o.verifiedScore), options: { fontSize: 44, bold: true, color: K.ink, breakLine: true } }, { text: 'of 100', options: { fontSize: 12, color: K.slate } }], { x: 1.2, y: 2.35, w: 2, h: 1.1, fontFace: FONT, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'score-number' });
  }
  const stats: Array<[string, string]> = [[`${Math.round(o.coverage * 100)}%`, 'of points were verifiable'], [confidenceLabel[o.confidence], 'confidence in this result'], [String(m.notVerifiedCount), 'items not verified (not counted against you)']];
  stats.forEach(([big, small], i) => {
    const y = 1.2 + i * 1.12;
    s.addShape(pres.ShapeType.roundRect, { x: 4.4, y, w: 5.1, h: 0.95, fill: { color: K.canvas }, line: { color: K.slate2, width: 0.75 }, rectRadius: 0.08, objectName: `stat-card-${i + 1}` });
    s.addText([{ text: big, options: { fontSize: 22, bold: true, color: K.ink, breakLine: true } }, { text: small, options: { fontSize: 12, color: K.slate } }], { x: 4.65, y: y + 0.1, w: 4.7, h: 0.75, fontFace: FONT, valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addNotes(m.summary);

  // 3 · Category scores (native bar chart)
  pres.addSection({ title: 'Findings' });
  s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Findings' });
  s.addText('Where points were earned and missed', { placeholder: 'title' });
  fictionalTag(s);
  const cats = m.categoryCards;
  // Horizontal bar charts plot the first category at the bottom, so reverse to read top-down.
  const chartCats = [...cats].reverse();
  s.addChart(pres.ChartType.bar, [{ name: 'Score out of 20', labels: chartCats.map((c) => c.name), values: chartCats.map((c) => (c.display === null ? 0 : Math.round(c.display * 10) / 10)) }], {
    x: 0.5, y: 1.15, w: 5.6, h: 3.85, barDir: 'bar', chartColors: [K.cobalt], showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0', dataLabelFontSize: 11, dataLabelColor: K.ink, dataLabelFontFace: FONT,
    valAxisMinVal: 0, valAxisMaxVal: 20, valAxisMajorUnit: 5, valAxisLabelColor: K.slate, valAxisLabelFontSize: 10, valAxisLabelFontFace: FONT, catAxisLabelColor: K.ink, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT,
    valGridLine: { color: K.slate2, size: 0.5 }, catGridLine: { style: 'none' }, showLegend: false, showTitle: true, title: 'Score out of 20 per category', titleFontSize: 12, titleColor: K.slate, titleFontFace: FONT, objectName: 'category-chart',
  });
  s.addText(cats.map((c, i) => ({ text: `${c.name}: ${c.display === null ? 'Not verified' : `${fmt(c.display)}/20`} · ${confidenceLabel[c.confidence].toLowerCase()} confidence${c.notVerified.length ? ` · ${c.notVerified.length} not verified` : ''}`, options: { bullet: true, breakLine: i < cats.length - 1, paraSpaceAfter: 6 } })), { x: 6.35, y: 1.25, w: 3.15, h: 3.7, fontFace: FONT, fontSize: 12, color: K.slate7, valign: 'top', margin: 0, isTextBox: true, objectName: 'category-notes' });
  s.addNotes('Scores are earned points divided by the points we could verify, scaled to 20. Unverifiable items are excluded, never scored as zero.');

  // 4 · Not verified
  s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Findings' });
  const nv = m.rows.filter((r) => r.status !== 'scored');
  s.addText(nv.length ? `${nv.length} item${nv.length === 1 ? '' : 's'} we couldn’t verify from the outside` : 'Everything we checked was verifiable', { placeholder: 'title' });
  fictionalTag(s);
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.2, w: 3.3, h: 2.35, fill: { color: K.cobalt1 }, line: { color: K.cobalt1 }, rectRadius: 0.1, objectName: 'nv-explainer' });
  s.addText([{ text: 'Not verified ≠ a problem', options: { bold: true, fontSize: 16, color: K.ink, breakLine: true } }, { text: 'These items weren’t publicly observable, so they were left out of your score. We never assume a weakness we can’t see. A short conversation can verify them.', options: { fontSize: 13, color: K.slate7 } }], { x: 0.75, y: 1.4, w: 2.85, h: 2.0, fontFace: FONT, valign: 'top', margin: 0, isTextBox: true, paraSpaceAfter: 8 });
  const nvList = nv.length ? nv.slice(0, 8) : [];
  nvList.forEach((r, i) => {
    const y = 1.2 + i * 0.6;
    s.addShape(pres.ShapeType.ellipse, { x: 4.15, y: y + 0.12, w: 0.28, h: 0.28, fill: { color: K.white }, line: { color: K.slate4, width: 1.25, dashType: 'dash' }, objectName: `nv-icon-${i + 1}` });
    s.addText([{ text: r.label, options: { bold: true, fontSize: 13, color: K.ink, breakLine: true } }, { text: `${r.categoryName} · ${r.points} pts not counted`, options: { fontSize: 11, color: K.slate } }], { x: 4.6, y, w: 4.9, h: 0.55, fontFace: FONT, valign: 'middle', margin: 0, isTextBox: true });
  });
  if (!nv.length) s.addText('Every criterion had evidence, so the score covers all 100 points.', { x: 4.15, y: 1.3, w: 5.3, h: 0.6, fontFace: FONT, fontSize: 14, color: K.slate7, margin: 0, isTextBox: true });
  s.addNotes('Explain the difference between a verified weakness and something we simply could not observe.');

  // 5 · Competitors
  if (m.competitors.length) {
    s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Findings' });
    s.addText('How you compare with nearby competitors', { placeholder: 'title' });
    fictionalTag(s);
    const yn = (v?: boolean) => (v === undefined ? '—' : v ? 'Yes' : 'No');
    const head = ['Business', 'Google reviews', 'Rating', 'Structured data', 'Mobile tap-to-call'].map((t) => ({ text: t, options: { bold: true, color: K.slate, fill: { color: K.canvas }, fontSize: 11 } }));
    const rows = m.competitors.map((c) => [c.name, c.reviews === undefined ? '—' : String(c.reviews), c.rating === undefined ? '—' : String(c.rating), yn(c.schema), yn(c.mobileCta)].map((t) => ({ text: t, options: { fontSize: 12, color: K.ink } })));
    s.addTable([head, ...rows], { x: 0.5, y: 1.25, w: 9, colW: [3.2, 1.5, 1.1, 1.6, 1.6], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: K.slate2 }, rowH: 0.42, valign: 'middle', objectName: 'competitor-table' });
    s.addNotes('Competitor data is public and dated. Focus on the gaps that matter to customers, not on winning every column.');
  }

  // 6 · Opportunities
  if (m.opportunities.length) {
    pres.addSection({ title: 'Opportunities' });
    s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Opportunities' });
    s.addText('Quick wins we’d start with', { placeholder: 'title' });
    fictionalTag(s);
    m.opportunities.slice(0, 6).forEach((x, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const X = 0.5 + col * 4.6;
      const Y = 1.2 + row * 1.25;
      s.addShape(pres.ShapeType.roundRect, { x: X, y: Y, w: 4.4, h: 1.08, fill: { color: K.canvas }, line: { color: K.slate2, width: 0.75 }, rectRadius: 0.08, objectName: `opp-card-${i + 1}` });
      s.addShape(pres.ShapeType.ellipse, { x: X + 0.18, y: Y + 0.2, w: 0.42, h: 0.42, fill: { color: K.ink }, line: { color: K.ink }, objectName: `opp-num-${i + 1}` });
      s.addText(String(i + 1), { x: X + 0.18, y: Y + 0.2, w: 0.42, h: 0.42, fontFace: FONT, fontSize: 13, bold: true, color: K.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
      s.addText([{ text: x.action, options: { fontSize: 12.5, bold: true, color: K.ink, breakLine: true } }, { text: `${x.categoryName} · ${x.effort} effort`, options: { fontSize: 10.5, color: K.slate } }], { x: X + 0.75, y: Y + 0.1, w: 3.5, h: 0.9, fontFace: FONT, valign: 'middle', margin: 0, isTextBox: true });
    });
    s.addNotes('Start with the low-effort fixes. Each one maps to a criterion in the report.');
  }

  // 7 · Hypothetical scenarios
  if (m.scenarios.length && m.scenarioInputs) {
    s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Opportunities' });
    s.addText('What a small improvement could be worth', { placeholder: 'title' });
    fictionalTag(s);
    s.addText(`HYPOTHETICAL: based on example inputs of ${m.scenarioInputs.monthlyInquiries} inquiries/month, ${Math.round(m.scenarioInputs.closeRate * 100)}% close rate and ${usd(m.scenarioInputs.averageJobValue)} average job. Not verified lost revenue and not a forecast.`, { x: 0.5, y: 1.1, w: 9, h: 0.55, fontFace: FONT, fontSize: 12, color: K.slate7, margin: 0, isTextBox: true, objectName: 'hypothetical-note' });
    m.scenarios.forEach((sc, i) => {
      const X = 0.5 + i * 3.05;
      s.addShape(pres.ShapeType.roundRect, { x: X, y: 1.9, w: 2.85, h: 2.6, fill: { color: i === m.scenarios.length - 1 ? K.ink : K.canvas }, line: { color: i === m.scenarios.length - 1 ? K.ink : K.slate2, width: 0.75 }, rectRadius: 0.1, objectName: `scenario-${i + 1}` });
      const dark = i === m.scenarios.length - 1;
      s.addText([
        { text: sc.label.replace('If booked jobs rose ', '+') + ' booked jobs', options: { fontSize: 13, bold: true, color: dark ? K.cobalt3 : K.cobalt7, breakLine: true } },
        { text: usd(sc.extraRevenuePerMonth), options: { fontSize: 34, bold: true, color: dark ? K.white : K.ink, breakLine: true } },
        { text: `per month · ${sc.extraJobsPerMonth} extra jobs`, options: { fontSize: 12, color: dark ? K.fog : K.slate } },
      ], { x: X + 0.25, y: 2.1, w: 2.4, h: 2.2, fontFace: FONT, valign: 'middle', margin: 0, isTextBox: true, paraSpaceAfter: 6 });
    });
    s.addNotes('Use the owner’s own numbers. Never present these as losses or promises.');
  }

  // 8 · Recommendation
  pres.addSection({ title: 'Next step' });
  s = pres.addSlide({ masterName: 'RRS_DARK', sectionTitle: 'Next step' });
  s.addText('Recommended next step', { placeholder: 'title' });
  fictionalTag(s, true);
  s.addText([
    { text: m.recommendation.offerName ?? 'Verify the basics first', options: { fontSize: 28, bold: true, color: K.white, breakLine: true } },
    { text: m.recommendation.reason, options: { fontSize: 15, color: K.fog, breakLine: true } },
  ], { x: 0.5, y: 1.2, w: 9, h: 1.5, fontFace: FONT, valign: 'top', margin: 0, isTextBox: true, paraSpaceAfter: 8, objectName: 'recommendation' });
  if (m.priorities.length) {
    m.priorities.slice(0, 5).forEach((p, i) => {
      const X = 0.5 + i * 1.82;
      s.addShape(pres.ShapeType.roundRect, { x: X, y: 3.0, w: 1.7, h: 1.1, fill: { color: K.ink7 }, line: { color: '2A3570', width: 0.75 }, rectRadius: 0.08, objectName: `priority-${i + 1}` });
      s.addText([{ text: String(i + 1), options: { fontSize: 18, bold: true, color: K.mint, breakLine: true } }, { text: p.name, options: { fontSize: 11.5, color: K.white } }], { x: X + 0.15, y: 3.08, w: 1.45, h: 0.95, fontFace: FONT, valign: 'middle', margin: 0, isTextBox: true });
    });
  }
  if (m.recommendation.setup !== null) {
    s.addText(`Pricing: ${usd(m.recommendation.setup)} setup + ${usd(m.recommendation.monthly!)}/month${m.recommendation.priceStatus === 'proposed' ? ' (proposed launch pricing)' : ''}`, { x: 0.5, y: 4.35, w: 9, h: 0.4, fontFace: FONT, fontSize: 13, color: K.fog, margin: 0, isTextBox: true, objectName: 'pricing' });
  }
  s.addNotes('Recommend one plan, or say plainly that none is needed. No guarantees of rankings, AI placement or revenue.');

  // 9 · Method & limitations
  s = pres.addSlide({ masterName: 'RRS_CONTENT', sectionTitle: 'Next step' });
  s.addText('How to read this Snapshot', { placeholder: 'title' });
  fictionalTag(s);
  s.addText(m.disclaimers.map((d, i) => ({ text: d, options: { bullet: true, breakLine: i < m.disclaimers.length - 1, paraSpaceAfter: 8 } })), { x: 0.5, y: 1.2, w: 9, h: 3.8, fontFace: FONT, fontSize: 14, color: K.slate7, valign: 'top', margin: 0, isTextBox: true, objectName: 'disclaimers' });
  s.addNotes(`Framework v${m.result.frameworkVersion}. Full criteria are in the printable report and on the methodology page.`);

  const raw = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
  return repack(raw, opts.stable ? `${m.reportDate}T00:00:00Z` : null);
}

const ZIP_DATE = new Date('2026-01-01T00:00:00Z');
const guidFrom = (seed: string) => {
  const h = createHash('sha1').update(seed).digest('hex');
  return `{${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}}`;
};
const pinCoreDates = (xml: string, iso: string) => xml.replace(/(<dcterms:(?:created|modified)[^>]*>)[^<]*(<\/dcterms:(?:created|modified)>)/g, `$1${iso}$2`);

/**
 * pptxgenjs writes directory entries into the ZIP; some cloud viewers (incl. co-editing
 * services) refuse such files. Re-pack with file entries only, preserving order. With a
 * stable date, also pin document dates, section ids and the embedded chart workbooks.
 */
async function repack(buf: Buffer, stableIso: string | null): Promise<Buffer> {
  const src = await JSZip.loadAsync(buf);
  const dst = new JSZip();
  for (const [name, entry] of Object.entries(src.files)) {
    if (entry.dir) continue;
    let data: Buffer = await entry.async('nodebuffer');
    if (stableIso) {
      if (/docProps\/core\.xml$/.test(name)) data = Buffer.from(pinCoreDates(data.toString('utf8'), stableIso));
      else if (name === 'ppt/presentation.xml') data = Buffer.from(data.toString('utf8').replace(/(<p14:section name="([^"]*)" id=")\{[^}]+\}/g, (_m, pre: string, section: string) => `${pre}${guidFrom(`rrs-section:${section}`)}`));
      else if (/\.xlsx$/.test(name)) data = await repack(data, stableIso);
    }
    dst.file(name, data, { createFolders: false, date: ZIP_DATE });
  }
  return dst.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}
