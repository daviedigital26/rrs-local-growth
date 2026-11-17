/** Orchestrates all Snapshot exports for one report model. */
import { chromium } from 'playwright-core';
import { crmRecord, criteriaCsv, reportJson, summaryCsv } from './formats.ts';
import { renderReportHtml } from './html.tsx';
import { fileBase, type ReportModel } from './model.ts';
import { renderPdf } from './pdf.ts';
import { buildDeck } from './pptx.ts';

export const FORMATS = ['html', 'pdf', 'csv', 'json', 'crm', 'pptx'] as const;
export type Format = (typeof FORMATS)[number];
export interface ExportFile { name: string; format: Format; data: Buffer }

export async function exportAll(m: ReportModel, formats: readonly Format[] = FORMATS, opts: { stable?: boolean } = {}): Promise<ExportFile[]> {
  const base = fileBase(m);
  const out: ExportFile[] = [];
  const html = renderReportHtml(m, { embedFonts: true });
  if (formats.includes('html')) out.push({ name: `${base}.html`, format: 'html', data: Buffer.from(html) });
  if (formats.includes('csv')) {
    out.push({ name: `${base}.criteria.csv`, format: 'csv', data: Buffer.from(criteriaCsv(m)) });
    out.push({ name: `${base}.summary.csv`, format: 'csv', data: Buffer.from(summaryCsv(m)) });
  }
  if (formats.includes('json')) out.push({ name: `${base}.json`, format: 'json', data: Buffer.from(reportJson(m)) });
  if (formats.includes('crm')) out.push({ name: `${base}.crm.json`, format: 'crm', data: Buffer.from(JSON.stringify(crmRecord(m), null, 2) + '\n') });
  if (formats.includes('pptx')) out.push({ name: `${base}.pptx`, format: 'pptx', data: await buildDeck(m, { stable: opts.stable }) });
  if (formats.includes('pdf')) {
    const browser = await chromium.launch();
    try {
      out.push({ name: `${base}.pdf`, format: 'pdf', data: Buffer.from(await renderPdf(browser, html, m, { stableDate: opts.stable })) });
    } finally {
      await browser.close();
    }
  }
  return out;
}
