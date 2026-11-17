/**
 * PDF export: renders the printable HTML in headless Chromium (Playwright), then stamps
 * document metadata with pdf-lib. Production note: needs a Chromium binary wherever it
 * runs (a worker or CI job, not inside n8n's Code node).
 */
import { PDFDocument } from 'pdf-lib';
import type { Browser } from 'playwright-core';
import type { ReportModel } from './model.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function renderPdf(browser: Browser, html: string, m: ReportModel, opts: { stableDate?: boolean } = {}): Promise<Uint8Array> {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const footer = `<div style="font:8px Arial,sans-serif;color:#334155;width:100%;padding:0 12mm;display:flex;justify-content:space-between"><span>${esc(m.business.name)} · Local Revenue Opportunity Snapshot · ${esc(m.reportDate)}${m.fictional ? ' · FICTIONAL SAMPLE' : ''}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
    const raw = await page.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer, margin: { top: '12mm', bottom: '16mm', left: '0', right: '0' } });
    const doc = await PDFDocument.load(raw);
    doc.setTitle(`${m.title}${m.fictional ? ' (fictional sample)' : ''}`);
    doc.setAuthor(m.preparedBy);
    doc.setSubject('Local Revenue Opportunity Snapshot');
    doc.setKeywords(['Reale Revenue Systems', 'Snapshot', m.business.industry, ...(m.fictional ? ['fictional sample'] : [])]);
    doc.setProducer('RRS Snapshot exporter');
    doc.setCreator('Reale Revenue Systems');
    const when = opts.stableDate ? new Date(`${m.reportDate}T12:00:00Z`) : new Date();
    doc.setCreationDate(when);
    doc.setModificationDate(when);
    return await doc.save({ useObjectStreams: true });
  } finally {
    await page.close();
  }
}
