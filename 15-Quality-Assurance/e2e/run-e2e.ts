/**
 * End-to-end QA for the static site (Playwright + Chromium).
 * Run after `npm run build`:  npm run test:e2e
 * Writes 15-Quality-Assurance/e2e/last-run.json and screenshots to ../screenshots/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
import { offers } from '../../03-Offers-and-Pricing/offer-catalog.ts';
import { startServer } from '../../02-Public-Website/scripts/serve.ts';
import { routes } from '../../02-Public-Website/src/routes.tsx';

const qa = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(qa, 'screenshots');
mkdirSync(shots, { recursive: true });
const PORT = 4455;
const BASE = `http://localhost:${PORT}`;
const VIEWPORTS = [{ name: 'mobile', width: 375, height: 812 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'desktop', width: 1280, height: 900 }];
const SCREENSHOT_PAGES = new Set(['/', '/free-snapshot/', '/pricing/', '/services/lead-recovery/', '/industries/home-services/', '/free-snapshot/sample-report/']);

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
const check = (name: string, ok: boolean, detail?: string) => { results.push({ name, ok, detail }); if (!ok) console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); };
const slug = (p: string) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/[/.]/g, '_'));

const server = await startServer(PORT);
const browser = await chromium.launch();
const t0 = Date.now();

try {
  const pagePaths = routes.map((r) => r.meta.path);
  const internalLinks = new Set<string>();

  // ── Per-page, per-viewport checks ────────────────────────────────────────
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' });
    for (const path of pagePaths) {
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const tag = `[${vp.name}] ${path}`;
      check(`${tag} loads`, !!resp && resp.status() === 200, `status ${resp?.status()}`);
      check(`${tag} no console errors`, errors.length === 0, errors.join(' | '));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${tag} no horizontal overflow`, overflow <= 0, `${overflow}px`);
      const fontsOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Inter') && document.fonts.check('700 32px "Inter Display"'); });
      check(`${tag} webfonts loaded`, fontsOk);
      // Every demo component sits next to a visible DemoLabel (DECISIONS D-008)
      const unlabeled = await page.evaluate(() => Array.from(document.querySelectorAll('.journey, .scorecard, .calc, .ba')).filter((el) => {
        const scope = el.closest('section, figure, .report-banner ~ *') ?? document.body;
        const label = scope.querySelector('[data-demo-label]') ?? document.querySelector('.report-banner [data-demo-label]');
        return !label || (label as HTMLElement).offsetParent === null;
      }).map((el) => el.className));
      check(`${tag} demos labelled fictional`, unlabeled.length === 0, unlabeled.join(', '));
      // Tap targets for primary buttons on mobile
      if (vp.name === 'mobile') {
        const small = await page.evaluate(() => Array.from(document.querySelectorAll('.btn, .chip span, .menu-toggle')).filter((b) => { const r = (b as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).length);
        check(`${tag} tap targets ≥ 40px`, small === 0, `${small} small targets`);
      }
      if (vp.name === 'desktop') {
        const hrefs = await page.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href')!));
        hrefs.forEach((h) => internalLinks.add(h));
      }
      if (SCREENSHOT_PAGES.has(path)) await page.screenshot({ path: join(shots, `${slug(path)}-${vp.name}.png`), fullPage: true });
      await page.close();
    }
    await ctx.close();
  }

  // ── SEO / structure (desktop) ────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const titles = new Set<string>();
  await page.goto(`${BASE}/free-snapshot/sample-report/`);
  const dlCount = await page.$$eval('.downloads a[href^="/downloads/"]', (as) => as.length);
  check('[downloads] sample report offers all 6 export formats', dlCount === 6, `${dlCount}`);
  const industryParas: Record<string, string[]> = {};
  for (const r of routes) {
    await page.goto(BASE + r.meta.path, { waitUntil: 'domcontentloaded' });
    const seo = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
      og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      jsonld: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => { try { JSON.parse(s.textContent || ''); return true; } catch { return false; } }),
      unlabeledInputs: Array.from(document.querySelectorAll('input:not([type=hidden]), textarea, select')).filter((el) => {
        if (el.closest('.hp')) return false;
        const id = el.id;
        return !(el.closest('label') || (id && document.querySelector(`label[for="${id}"]`)) || el.getAttribute('aria-label'));
      }).length,
      skipLink: !!document.querySelector('a.skip-link[href="#main"]') && !!document.getElementById('main'),
      headingOrder: Array.from(document.querySelectorAll('main h1, main h2, main h3')).map((h) => Number(h.tagName[1])),
      paras: Array.from(document.querySelectorAll('main p:not(.cta-band p)')).map((p) => p.textContent?.trim() ?? '').filter((t) => t.length > 60),
    }));
    const tag = `[seo] ${r.meta.path}`;
    check(`${tag} exactly one h1`, seo.h1 === 1, `${seo.h1}`);
    check(`${tag} unique title`, !titles.has(seo.title), seo.title);
    titles.add(seo.title);
    const core = seo.title.replace(/ \| Reale Revenue Systems$/, '');
    check(`${tag} title length ≤ 90`, core.length <= 90, `${core.length}: ${core}`);
    if (!r.meta.noindex) check(`${tag} meta description 70–170 chars`, seo.desc.length >= 70 && seo.desc.length <= 170, `${seo.desc.length}`);
    check(`${tag} canonical matches path`, seo.canonical.endsWith(r.meta.path));
    check(`${tag} og:image`, seo.og.includes('/og/'));
    check(`${tag} JSON-LD valid`, seo.jsonld.length >= 2 && seo.jsonld.every(Boolean));
    check(`${tag} form inputs labelled`, seo.unlabeledInputs === 0, `${seo.unlabeledInputs}`);
    check(`${tag} skip link`, seo.skipLink);
    const skips = seo.headingOrder.some((lvl, i) => i > 0 && lvl - seo.headingOrder[i - 1]! > 1);
    check(`${tag} no skipped heading levels`, !skips, seo.headingOrder.join(','));
    if (r.meta.path.startsWith('/industries/') && r.meta.path !== '/industries/') industryParas[r.meta.path] = seo.paras;
  }
  // Doorway guard: industry pages must not share substantive paragraphs
  const seenP = new Map<string, string>();
  const dupes: string[] = [];
  for (const [p, paras] of Object.entries(industryParas)) for (const t of paras) {
    if (/Snapshot|starting points/.test(t)) continue; // shared CTA/disclaimer copy is fine
    if (seenP.has(t) && seenP.get(t) !== p) dupes.push(`${p} ≈ ${seenP.get(t)}: ${t.slice(0, 50)}`); else seenP.set(t, p);
  }
  check('[seo] industry pages have unique copy (no doorway pages)', dupes.length === 0, dupes.join(' | '));

  // ── Internal links + anchors ─────────────────────────────────────────────
  for (const href of internalLinks) {
    const [path, hash] = href.split('#');
    if (/\.(pdf|pptx|csv|json|html?)$/.test(path ?? '') && !(path ?? '').endsWith('index.html')) {
      const res = await ctx.request.get(BASE + path);
      const type = res.headers()['content-type'] ?? '';
      check(`[downloads] ${href} served`, res.status() === 200 && (await res.body()).length > 500, `status ${res.status()}`);
      if (path!.endsWith('.pdf')) check(`[downloads] ${href} is a PDF`, type.includes('application/pdf') && (await res.body()).subarray(0, 5).toString() === '%PDF-');
      if (path!.endsWith('.pptx')) check(`[downloads] ${href} is a PPTX (zip)`, type.includes('presentationml') && (await res.body()).subarray(0, 2).toString() === 'PK');
      continue;
    }
    const url = BASE + (path || '/');
    const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const is404 = (await page.title()).startsWith('Page not found');
    check(`[links] ${href} resolves`, !!res && res.status() === 200 && !is404, `status ${res?.status()}`);
    if (hash && !hash.startsWith('snapshot-form') && !hash.startsWith('contact-form')) {
      check(`[links] ${href} anchor exists`, await page.evaluate((h) => !!document.getElementById(h), hash));
    }
  }
  for (const f of ['sitemap.xml', 'robots.txt', 'favicon.svg', 'site.webmanifest', 'og/og-default.png', '_headers']) {
    const res = await ctx.request.get(`${BASE}/${f}`);
    check(`[files] /${f}`, res.status() === 200);
  }
  const robots = await (await ctx.request.get(`${BASE}/robots.txt`)).text();
  const headers = await (await ctx.request.get(`${BASE}/_headers`)).text();
  check('[security] CSP + security headers emitted', /Content-Security-Policy: default-src 'self'/.test(headers) && /X-Content-Type-Options: nosniff/.test(headers));
  check('[seo] preview build disallows indexing', /Disallow: \//.test(robots));

  // ── Pricing matches catalog ──────────────────────────────────────────────
  await page.goto(`${BASE}/pricing/`);
  const prices = await page.$$eval('[data-price]', (els) => els.map((e) => e.getAttribute('data-price')));
  for (const o of offers) check(`[pricing] ${o.code} ${o.price.setup}/${o.price.monthly} shown`, prices.includes(`${o.price.setup}/${o.price.monthly}`));
  await ctx.close();

  // ── Snapshot form flow (mobile) ──────────────────────────────────────────
  const m = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const sp = await m.newPage();
  await sp.goto(`${BASE}/free-snapshot/?industry=home-services&utm_source=e2e&utm_campaign=qa`, { waitUntil: 'networkidle' });
  check('[snapshot] only step 1 visible with JS', await sp.evaluate(() => Array.from(document.querySelectorAll('.snap-step')).filter((s) => (s as HTMLElement).offsetParent !== null).length === 1));
  check('[snapshot] industry prefilled from link', await sp.isChecked('input[name="industry"][value="home-services"]'));
  await sp.click('#f-business');
  await sp.click('[data-step="1"] [data-next]');
  check('[snapshot] empty step 1 shows errors', await sp.isVisible('[data-error-for="business_name"]') && (await sp.getAttribute('#f-business', 'aria-invalid')) === 'true');
  await sp.fill('#f-business', 'E2E Test HVAC (fictional)');
  await sp.fill('#f-website', 'not a url');
  await sp.click('label.chip:has(input[name="city"][value="Other"])');
  check('[snapshot] "Other" city reveals text field', await sp.isVisible('[data-other-for="city"]'));
  await sp.click('[data-step="1"] [data-next]');
  check('[snapshot] invalid website rejected', await sp.isVisible('[data-error-for="website"]'));
  check('[snapshot] missing other-city rejected', await sp.isVisible('[data-error-for="city"]'));
  await sp.fill('#f-website', 'example.com');
  await sp.fill('[data-other-for="city"]', 'Buckeye');
  await sp.click('[data-step="1"] [data-next]');
  check('[snapshot] advances to step 2', await sp.isVisible('[data-step="2"]'));
  await sp.click('label.chip:has(input[name="self_followup.speed"][value="0.75"])');
  await sp.click('label.chip:has(input[name="self_followup.quotes"][value="not_verified"])');
  const selfText = await sp.textContent('[data-selfcheck-out]');
  check('[snapshot] self-check scores answered + counts Not verified', /3 of 4 points/.test(selfText ?? '') && /1 marked Not verified/.test(selfText ?? ''), selfText ?? '');
  await sp.click('[data-step="2"] [data-next]');
  await sp.fill('#f-name', 'Test Owner');
  await sp.fill('#f-email', 'bad-email');
  await sp.click('label.chip:has(input[name="preferred_channel"][value="text"])');
  check('[snapshot] SMS consent appears only for text', await sp.isVisible('[data-sms-consent]'));
  await sp.click('button[type="submit"]');
  check('[snapshot] invalid email + missing consent blocked', await sp.isVisible('[data-error-for="email"]') && await sp.isVisible('[data-error-for="consent_contact"]'));
  check('[snapshot] text channel requires phone + SMS consent', await sp.isVisible('[data-error-for="phone"]') && await sp.isVisible('[data-error-for="consent_sms"]'));
  await sp.fill('#f-email', 'owner@example.com');
  await sp.fill('#f-phone', '602-555-0147');
  await sp.check('input[name="consent_sms"]');
  await sp.check('input[name="consent_contact"]');
  await sp.waitForTimeout(3100); // human-speed guard
  await sp.click('button[type="submit"]');
  await sp.waitForSelector('[data-done]:not([hidden])');
  check('[snapshot] preview success shown + preview note', await sp.isVisible('[data-preview-note]'));
  const dl = await sp.evaluate(() => (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer);
  check('[snapshot] analytics events emitted', ['snapshot_start', 'snapshot_step', 'snapshot_submit'].every((e) => dl.some((x) => x.event === e)), dl.map((x) => x.event).join(','));
  check('[snapshot] submit recorded as preview mode', dl.some((x) => x.event === 'snapshot_submit' && x.mode === 'preview'));
  const attr = await sp.evaluate(() => JSON.parse(localStorage.getItem('rrs_attr') || '{}'));
  check('[snapshot] first-touch attribution captured', attr.utm_source === 'e2e' && attr.utm_campaign === 'qa' && !!attr.first_touch_at);
  await sp.screenshot({ path: join(shots, 'snapshot-submitted-mobile.png'), fullPage: false });

  // Honeypot path: looks successful to bots, emits no submit event
  const hp = await m.newPage();
  await hp.goto(`${BASE}/free-snapshot/`, { waitUntil: 'networkidle' });
  await hp.evaluate(() => { localStorage.clear(); });
  await hp.click('#f-business'); await hp.fill('#f-business', 'Bot Co');
  await hp.click('label.chip:has(input[name="city"][value="Phoenix"])');
  await hp.click('label.chip:has(input[name="industry"][value="remodeling"])');
  await hp.click('[data-step="1"] [data-next]'); await hp.click('[data-step="2"] [data-next]');
  await hp.fill('#f-name', 'Bot'); await hp.fill('#f-email', 'bot@example.com'); await hp.check('input[name="consent_contact"]');
  await hp.evaluate(() => { (document.querySelector('[name="company_website"]') as HTMLInputElement).value = 'spam'; });
  await hp.waitForTimeout(3100);
  await hp.click('button[type="submit"]');
  await hp.waitForSelector('[data-done]:not([hidden])');
  const hpDl = await hp.evaluate(() => (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer);
  check('[snapshot] honeypot submission silently dropped', !hpDl.some((x) => x.event === 'snapshot_submit'));

  // Too-fast submission (bot timing)
  const fast = await m.newPage();
  await fast.goto(`${BASE}/contact/`, { waitUntil: 'networkidle' });
  await fast.fill('#c-name', 'Fast'); await fast.fill('#c-email', 'f@example.com'); await fast.fill('#c-msg', 'hi'); await fast.check('input[name="consent_contact"]');
  await fast.click('button[type="submit"]');
  const fastDl = await fast.evaluate(() => (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer);
  check('[contact] sub-3-second submission treated as spam', !fastDl.some((x) => x.event === 'contact_submit'));

  // Contact form happy path
  const cp = await m.newPage();
  await cp.goto(`${BASE}/contact/?topic=profit-leak-audit`, { waitUntil: 'networkidle' });
  check('[contact] topic prefilled from link', await cp.isChecked('input[name="topic"][value="profit-leak-audit"]'));
  await cp.click('#c-name');
  await cp.click('button[type="submit"]');
  check('[contact] required fields validated', await cp.isVisible('[data-error-for="contact_name"]'));
  await cp.fill('#c-name', 'Owner'); await cp.fill('#c-email', 'o@example.com'); await cp.fill('#c-msg', 'Question about the audit.'); await cp.check('input[name="consent_contact"]');
  await cp.waitForTimeout(3100);
  await cp.click('button[type="submit"]');
  await cp.waitForSelector('[data-done]:not([hidden])');
  check('[contact] preview success shown', await cp.isVisible('[data-preview-note]'));

  // Calculator
  const calc = await m.newPage();
  await calc.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await calc.fill('[data-calculator] [name="inquiries"]', '100');
  check('[calculator] +10% of 100 × 30% × $400 = 3 jobs / $1,200', (await calc.textContent('[data-row="1"] [data-jobs]')) === '3' && (await calc.textContent('[data-row="1"] [data-rev]')) === '$1,200');

  // Mobile nav
  check('[nav] menu toggle visible on mobile', await calc.isVisible('[data-menu-toggle]'));
  check('[nav] nav hidden until opened', !(await calc.isVisible('#site-nav')));
  await calc.click('[data-menu-toggle]');
  check('[nav] opens with aria-expanded', await calc.isVisible('#site-nav') && (await calc.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true');
  const navBox = await calc.evaluate(() => { const r = document.getElementById('site-nav')!.getBoundingClientRect(); const h = document.querySelector('[data-header]')!.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, headerBottom: h.bottom, vh: window.innerHeight }; });
  check('[nav] open panel fills the screen below the header (scrolled page)', navBox.bottom >= navBox.vh - 1 && Math.abs(navBox.top - navBox.headerBottom) <= 2, JSON.stringify(navBox));
  const topPage = await m.newPage();
  await topPage.goto(`${BASE}/pricing/`, { waitUntil: 'networkidle' });
  await topPage.click('[data-menu-toggle]');
  const topBox = await topPage.evaluate(() => { const r = document.getElementById('site-nav')!.getBoundingClientRect(); const h = document.querySelector('[data-header]')!.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, headerBottom: h.bottom, vh: window.innerHeight }; });
  check('[nav] open panel fills the screen below the header (top of page)', topBox.bottom >= topBox.vh - 1 && Math.abs(topBox.top - topBox.headerBottom) <= 2, JSON.stringify(topBox));
  await topPage.screenshot({ path: join(shots, 'nav-open-top-mobile.png') });
  await calc.screenshot({ path: join(shots, 'nav-open-mobile.png') });
  await calc.keyboard.press('Escape');
  check('[nav] Escape closes', !(await calc.isVisible('#site-nav')));
  await calc.keyboard.press('Tab');
  // Keyboard: first Tab from top lands on skip link
  const kb = await m.newPage();
  await kb.goto(`${BASE}/pricing/`);
  await kb.keyboard.press('Tab');
  check('[a11y] first Tab focuses skip link', await kb.evaluate(() => document.activeElement?.classList.contains('skip-link') ?? false));
  await m.close();

  // ── Mobile usability ─────────────────────────────────────────────────
  const mu = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  // Sticky CTA: hidden at top, shown after scrolling, never on the Snapshot page
  const st = await mu.newPage();
  await st.goto(`${BASE}/services/lead-recovery/`, { waitUntil: 'networkidle' });
  check('[mobile] sticky CTA hidden at top of page', !(await st.isVisible('[data-mobile-cta]')));
  await st.evaluate(() => window.scrollTo(0, 1400));
  await st.waitForTimeout(300);
  check('[mobile] sticky CTA appears after scrolling', await st.isVisible('[data-mobile-cta]'));
  const stBox = await st.evaluate(() => { const r = document.querySelector('[data-mobile-cta] .btn')!.getBoundingClientRect(); return { bottom: r.bottom, h: r.height, vh: window.innerHeight }; });
  check('[mobile] sticky CTA sits inside the viewport with a ≥44px target', stBox.bottom <= stBox.vh && stBox.h >= 44, JSON.stringify(stBox));
  await st.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await st.waitForTimeout(300);
  check('[mobile] sticky CTA steps aside at the footer/CTA band', !(await st.isVisible('[data-mobile-cta]')));
  await st.evaluate(() => window.scrollTo(0, 1400)); await st.waitForTimeout(300);
  await st.click('[data-mobile-cta] a');
  await st.waitForURL('**/free-snapshot/');
  check('[mobile] sticky CTA leads to the Snapshot form', st.url().endsWith('/free-snapshot/'));
  check('[mobile] no sticky CTA on the Snapshot page', (await st.$('[data-mobile-cta]')) === null);
  const desk = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desk.goto(`${BASE}/services/lead-recovery/`); await desk.evaluate(() => window.scrollTo(0, 1400)); await desk.waitForTimeout(200);
  check('[desktop] sticky CTA never shows on wide screens', !(await desk.isVisible('[data-mobile-cta]')));
  await desk.close();

  // Keyboard hints for phone keyboards
  const kh = await mu.newPage();
  await kh.goto(`${BASE}/free-snapshot/`, { waitUntil: 'networkidle' });
  const hints = await kh.evaluate(() => ({
    email: [document.querySelector('#f-email')!.getAttribute('inputmode'), document.querySelector('#f-email')!.getAttribute('autocapitalize'), document.querySelector('#f-email')!.getAttribute('spellcheck')],
    phone: document.querySelector('#f-phone')!.getAttribute('inputmode'),
    biz: document.querySelector('#f-business')!.getAttribute('autocapitalize'),
    enter: document.querySelector('#f-name')!.getAttribute('enterkeyhint'),
  }));
  check('[mobile] keyboard hints on Snapshot fields', hints.email.join() === 'email,none,false' && hints.phone === 'tel' && hints.biz === 'words' && hints.enter === 'next', JSON.stringify(hints));

  // Save progress: survives reload, never restores consent, clears on Start over
  await kh.click('#f-business'); await kh.fill('#f-business', 'Autosave Plumbing (fictional)');
  await kh.click('label.chip:has(input[name="city"][value="Other"])'); await kh.fill('[data-other-for="city"]', 'Goodyear');
  await kh.click('label.chip:has(input[name="industry"][value="home-services"])');
  await kh.click('[data-step="1"] [data-next]');
  const formTop = await kh.evaluate(() => document.querySelector('[data-snapshot-form]')!.getBoundingClientRect().top);
  check('[mobile] next step scrolls the form into view', formTop >= 0 && formTop < 200, `${formTop}`);
  await kh.click('[data-step="2"] [data-next]');
  await kh.fill('#f-email', 'save@example.com');
  await kh.check('input[name="consent_contact"]');
  await kh.reload({ waitUntil: 'networkidle' });
  const restored = { biz: await kh.inputValue('#f-business'), city: await kh.inputValue('[data-other-for="city"]'), cityShown: await kh.evaluate(() => !(document.querySelector('[data-other-for="city"]') as HTMLInputElement).hidden), industry: await kh.isChecked('input[name="industry"][value="home-services"]'), email: await kh.inputValue('#f-email') };
  check('[mobile] answers restored after reload', restored.biz === 'Autosave Plumbing (fictional)' && restored.city === 'Goodyear' && restored.cityShown && restored.industry && restored.email === 'save@example.com', JSON.stringify(restored));
  check('[mobile] restored on the step the visitor left', await kh.isVisible('[data-step="3"]'));
  check('[mobile] restored-answers note shown', await kh.isVisible('[data-restored]'));
  check('[mobile] consent is never restored (must be given fresh)', !(await kh.isChecked('input[name="consent_contact"]')));
  await kh.click('[data-start-over]');
  check('[mobile] Start over clears answers and returns to step 1', (await kh.inputValue('#f-business')) === '' && await kh.isVisible('[data-step="1"]') && !(await kh.isVisible('[data-restored]')));
  await kh.reload({ waitUntil: 'networkidle' });
  check('[mobile] nothing restored after Start over', !(await kh.isVisible('[data-restored]')));
  await mu.close();

  // No-JS fallback
  const nj = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const np = await nj.newPage();
  await np.goto(`${BASE}/free-snapshot/`);
  check('[no-js] all Snapshot steps visible', await np.evaluate(() => Array.from(document.querySelectorAll('.snap-step')).every((s) => (s as HTMLElement).offsetParent !== null)));
  check('[no-js] navigation still reachable', await np.isVisible('#site-nav a[href="/pricing/"]'));
  await nj.close();
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
const summary = { ranAt: new Date().toISOString(), durationMs: Date.now() - t0, total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed };
writeFileSync(join(qa, 'e2e', 'last-run.json'), JSON.stringify(summary, null, 2));
console.log(`e2e: ${summary.passed}/${summary.total} checks passed in ${(summary.durationMs / 1000).toFixed(1)} s`);
if (failed.length) process.exit(1);
