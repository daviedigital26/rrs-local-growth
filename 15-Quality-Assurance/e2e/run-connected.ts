/**
 * Connected-mode e2e: builds a copy of the site with FORM_ENDPOINT pointing at a local
 * mock intake (same validator as n8n), then submits real forms through the browser.
 * Proves the client → server contract end to end, including the failure path.
 *   npm run test:e2e:connected
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../../02-Public-Website/scripts/serve.ts';
import { startMockIntake } from '../mock-intake/server.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = 4471, MOCK = 4472;
const SITE_URL = `http://localhost:${SITE}`;
const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail?: string) => { results.push({ name, ok, detail }); if (!ok) console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); };

const build = spawnSync('npx', ['tsx', '02-Public-Website/scripts/build.tsx'], { cwd: root, env: { ...process.env, FORM_ENDPOINT: `http://localhost:${MOCK}/intake`, RRS_DIST_DIR: 'dist-connected' }, encoding: 'utf8' });
if (build.status !== 0) { console.error(build.stderr); process.exit(1); }
const distDir = join(root, '02-Public-Website/dist-connected');
const headers = readFileSync(join(distDir, '_headers'), 'utf8');
check('[connected] CSP connect-src allows only self + intake origin', /connect-src 'self' http:\/\/localhost:4472;/.test(headers));
check('[connected] CSP form-action allows intake origin', /form-action 'self' http:\/\/localhost:4472/.test(headers));

const site = await startServer(SITE, distDir);
const mock = await startMockIntake(MOCK, SITE_URL);
const browser = await chromium.launch();
const t0 = Date.now();
const setMode = (mode: 'ok' | 'fail') => fetch(`http://localhost:${MOCK}/__mode`, { method: 'POST', body: JSON.stringify({ mode }) });

try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  await p.goto(`${SITE_URL}/free-snapshot/?utm_source=connected&utm_medium=qa&interest=lead-rescue-booking-engine`, { waitUntil: 'networkidle' });
  check('[connected] preview bar no longer claims forms send nothing', !(await p.textContent('.preview-bar'))?.includes('send nothing'));
  await p.click('#f-business'); await p.fill('#f-business', 'Connected Test HVAC (fictional)');
  await p.fill('#f-website', 'connected-test.example');
  await p.click('label.chip:has(input[name="city"][value="Other"])'); await p.fill('[data-other-for="city"]', 'Buckeye');
  await p.click('label.chip:has(input[name="industry"][value="home-services"])');
  await p.click('label.chip:has(input[name="concerns"][value="Missed calls or slow follow-up"])');
  await p.click('[data-step="1"] [data-next]');
  await p.click('label.chip:has(input[name="self_followup.missed_calls"][value="0.25"])');
  await p.click('[data-step="2"] [data-next]');
  await p.fill('#f-name', 'Connected Owner'); await p.fill('#f-email', 'owner@connected-test.example');
  await p.click('label.chip:has(input[name="preferred_channel"][value="text"])');
  await p.check('input[name="consent_contact"]');
  await p.click('button[type="submit"]');
  check('[connected] text channel without phone is blocked client-side', await p.isVisible('[data-error-for="phone"]'));
  check('[connected] text channel without SMS consent is blocked client-side', await p.isVisible('[data-error-for="consent_sms"]'));
  check('[connected] nothing sent while invalid', mock.received.length === 0);
  await p.fill('#f-phone', '602-555-0147');
  await p.check('input[name="consent_sms"]');
  await p.waitForTimeout(3100);
  await p.click('button[type="submit"]');
  await p.waitForSelector('[data-done]:not([hidden])', { timeout: 10000 });
  check('[connected] success shown without preview note', !(await p.isVisible('[data-preview-note]')));
  check('[connected] exactly one submission received', mock.received.length === 1, `${mock.received.length}`);
  const got = mock.received[0];
  check('[connected] request came from the site origin (CORS)', got?.origin === SITE_URL, got?.origin);
  check('[connected] server validator accepted the browser payload', got?.result.status === 'accepted', JSON.stringify(got?.result.errors));
  const rec = got?.result.record;
  check('[connected] business fields normalised', rec?.business.name === 'Connected Test HVAC (fictional)' && rec?.business.city === 'Buckeye' && rec?.business.domain === 'connected-test.example' && rec?.business.industry === 'home-services');
  check('[connected] contact + consent recorded', rec?.contact.phone === '+16025550147' && rec?.contact.preferred_channel === 'text' && rec?.consent.sms === true && /I agree that Reale Revenue Systems may contact me/.test(rec?.consent.text ?? ''));
  check('[connected] self-check + concerns + interest captured', rec?.self_check['followup.missed_calls'] === 0.25 && rec?.concerns[0] === 'Missed calls or slow follow-up' && rec?.interest === 'lead-rescue-booking-engine');
  check('[connected] attribution captured', rec?.attribution.utm_source === 'connected' && rec?.attribution.utm_medium === 'qa' && !!rec?.attribution.first_touch_at);
  check('[connected] timing signal present (not flagged)', rec?.signals.no_timing === false && (rec?.signals.fill_seconds ?? 0) >= 3);
  const dl = await p.evaluate(() => (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer);
  check('[connected] snapshot_submit recorded as sent', dl.some((x) => x.event === 'snapshot_submit' && x.mode === 'sent'));

  // Failure path: endpoint down → clear message, button usable again, nothing lost
  await setMode('fail');
  const f = await ctx.newPage();
  await f.goto(`${SITE_URL}/free-snapshot/`, { waitUntil: 'networkidle' });
  await f.click('#f-business'); await f.fill('#f-business', 'Failure Path Co (fictional)');
  await f.click('label.chip:has(input[name="city"][value="Phoenix"])');
  await f.click('label.chip:has(input[name="industry"][value="remodeling"])');
  await f.click('[data-step="1"] [data-next]'); await f.click('[data-step="2"] [data-next]');
  await f.fill('#f-name', 'Owner'); await f.fill('#f-email', 'o@failure.example'); await f.check('input[name="consent_contact"]');
  await f.waitForTimeout(3100);
  await f.click('button[type="submit"]');
  await f.waitForSelector('[data-form-error]:not([hidden])', { timeout: 10000 });
  check('[connected] endpoint failure shows a retry message', /couldn’t send your request/.test((await f.textContent('[data-form-error]')) ?? ''));
  check('[connected] submit button re-enabled after failure', await f.isEnabled('button[type="submit"]') && (await f.textContent('button[type="submit"]')) === 'Send my Snapshot request');
  check('[connected] typed answers kept after failure', (await f.inputValue('#f-email')) === 'o@failure.example');
  await setMode('ok');
  await f.click('button[type="submit"]');
  await f.waitForSelector('[data-done]:not([hidden])', { timeout: 10000 });
  const [failedTry, retry] = mock.received.slice(-2);
  check('[connected] retry succeeds once endpoint recovers', retry?.result.status === 'accepted' && mock.received.length === 3, `${mock.received.length}`);
  check('[connected] retry carries the same dedupe key (CRM upserts, no duplicate lead)', !!retry?.result.record && retry.result.record.dedupe_key === failedTry?.result.record?.dedupe_key);

  // Contact form
  const c = await ctx.newPage();
  await c.goto(`${SITE_URL}/contact/?topic=detailer-booking-recovery`, { waitUntil: 'networkidle' });
  await c.click('#c-name'); await c.fill('#c-name', 'Detailer Dan'); await c.fill('#c-email', 'dan@detail.example'); await c.fill('#c-msg', 'Tell me about booking recovery.'); await c.check('input[name="consent_contact"]');
  await c.waitForTimeout(3100);
  await c.click('button[type="submit"]');
  await c.waitForSelector('[data-done]:not([hidden])', { timeout: 10000 });
  const last = mock.received.at(-1);
  check('[connected] contact form accepted with topic', last?.result.status === 'accepted' && last.result.record?.topic === 'detailer-booking-recovery' && last.result.record?.form === 'contact');
  await ctx.close();
} finally {
  await browser.close();
  site.close();
  mock.server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`e2e (connected): ${results.length - failed.length}/${results.length} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (failed.length) process.exit(1);
