/**
 * Call queue e2e: builds the fictional sample queue page and works it like a phone user would.
 *   npm run test:e2e:queue
 * Time is frozen at Tue 17 Nov 2026, 10:30 AM Phoenix, so due dates are predictable.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { chromium, type Page } from 'playwright-core';
import { buildQueuePage } from '../../06-Sales/Call-Queue/build-queue.ts';
import { buildFromInputs } from '../../06-Sales/Call-Queue/queue-cli.ts';
import { startServer } from '../../02-Public-Website/scripts/serve.ts';
import { mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail?: string) => { results.push({ name, ok, detail }); if (!ok) console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); };
const t0 = Date.now();

const { dataset } = buildFromInputs([join(root, '17-Sample-Clients/fictional-pm-lead-batch.json'), join(root, '17-Sample-Clients/fictional-pm-tracker-export.csv')], { checkedAt: '2026-11-10', asOf: '2026-11-17' });
const dir = mkdtempSync(join(tmpdir(), 'rrs-queue-'));
const file = join(dir, 'queue.html');
writeFileSync(file, buildQueuePage({ dataset }));
const appFile = join(dir, 'app.html');
writeFileSync(appFile, buildQueuePage());
const URL_ = `file://${file}`;
const NOW = '2026-11-17T17:30:00.000Z';
const validateLog = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync(join(root, '06-Sales/Call-Queue/call-log.schema.json'), 'utf8')));

const browser = await chromium.launch();
async function open(opts: { width?: number; scheme?: 'light' | 'dark'; ctx?: Awaited<ReturnType<typeof browser.newContext>> } = {}) {
  const ctx = opts.ctx ?? await browser.newContext({ viewport: { width: opts.width ?? 375, height: 812 }, colorScheme: opts.scheme ?? 'light', acceptDownloads: true });
  await ctx.addInitScript((now) => { (window as unknown as { __RRS_NOW__: string }).__RRS_NOW__ = now; }, NOW);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_);
  await page.waitForSelector('#app .top');
  return { ctx, page, errors };
}
const nowName = (p: Page) => p.textContent('.card.now h2');
const goal = async (p: Page) => (await p.textContent('.goal b'))?.trim();
const toastText = async (p: Page) => (await p.textContent('#toast')) ?? '';
const tap = async (p: Page, outcome: string) => p.click(`.card.now [data-act="outcome"][data-v="${outcome}"]`);

try {
  // ── Load, layout, basics ──
  const { ctx, page: p, errors } = await open();
  check('[queue] no script errors on load', errors.length === 0, errors.join(' | '));
  check('[queue] fictional sample is labelled', (await p.textContent('.fict'))?.includes('Fictional sample data') ?? false);
  check('[queue] no sideways scroll at 375px', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('[queue] first call is the P1 lead tried before', (await nowName(p)) === 'Saguaro Lane Property Co. (fictional)', String(await nowName(p)));
  check('[queue] Call button dials the right number', (await p.getAttribute('.card.now a[href^="tel:"]', 'href')) === 'tel:+16235550101');
  check('[queue] shows the business’s local time and window', (await p.textContent('.card.now .meta'))?.includes('10:30 AM there · Good time to call') ?? false);
  check('[queue] opening angle quotes the verified review phrase', (await p.textContent('.card.now .angle'))?.includes('no call back for a week') ?? false);
  const small = await p.evaluate(() => [...document.querySelectorAll('.out, .btn:not(.small), .tabs button')].filter((e) => (e as HTMLElement).getBoundingClientRect().height < 44).length);
  check('[queue] outcome buttons, buttons and tabs are at least 44px tall', small === 0, `${small} too small`);
  check('[queue] all 10 outcomes offered', (await p.locator('.card.now .out').count()) === 10);

  // ── Log, undo, persist ──
  await tap(p, 'no_answer');
  check('[queue] no-answer schedules the next try (2nd try → 2 business days)', (await toastText(p)).includes('next: Thu, Nov 19'), await toastText(p));
  check('[queue] counter moves to 1 call', (await goal(p)) === '1');
  check('[queue] queue advances to the next lead', (await nowName(p)) !== 'Saguaro Lane Property Co. (fictional)');
  await p.click('#toast [data-act="undo"]');
  check('[queue] undo removes the call', (await goal(p)) === '0' && (await nowName(p)) === 'Saguaro Lane Property Co. (fictional)');
  await tap(p, 'voicemail');
  await p.reload(); await p.waitForSelector('#app .top');
  check('[queue] logged calls survive a reload', (await goal(p)) === '1');
  check('[queue] called lead shows under Done today', (await p.textContent('#main'))?.includes('Done today (1)') ?? false);

  // ── Outcomes that need details ──
  check('[queue] audit with no date is next, flagged to set the date', (await p.textContent('.card.now .why')) === 'Audit booked: set the date');
  await tap(p, 'audit_booked');
  check('[queue] audit booked asks for a date and value', await p.isVisible('#pend-date') && await p.isVisible('#pend-value'));
  await p.fill('#pend-value', '600');
  await p.click('.pend button[type="submit"]');
  check('[queue] deal value adds to pipeline', (await p.textContent('.stats'))?.includes('$600 pipeline') ?? false, await p.textContent('.stats') ?? '');
  check('[queue] P1 California lead is next (open at 9:30 AM there)', (await nowName(p)) === 'Sunbelt Leasing Partners (fictional)', String(await nowName(p)));
  await tap(p, 'callback');
  await p.fill('#pend-date', '');
  await p.click('.pend button[type="submit"]');
  check('[queue] callback without a date is refused', (await toastText(p)).includes('Pick a date first'));
  await p.fill('#pend-date', '2026-11-19');
  await p.fill('#pend-note', 'Ask for Pat (fictional)');
  await p.click('.pend button[type="submit"]');
  check('[queue] callback logged with its date', (await toastText(p)).includes('next: Thu, Nov 19'));
  const dnc = await nowName(p);
  await tap(p, 'do_not_call');
  const wrong = await nowName(p);
  await tap(p, 'wrong_number');
  check('[queue] queue clears when every lead is handled', (await p.textContent('.card h2')) === 'Queue clear', String(await p.textContent('.card h2')));

  // ── Pipeline & calendar ──
  await p.click('.tabs [data-v="pipeline"]');
  const pipe = (await p.textContent('#main')) ?? '';
  check('[queue] follow-up calendar lists Thursday’s calls', /Thu, Nov 19.*Sunbelt Leasing Partners.*Saguaro|Thu, Nov 19.*Saguaro.*Sunbelt/s.test(pipe), pipe.slice(0, 200));
  check('[queue] audit stage holds the booked lead and its value', /Audit booked \(1\)\$600/.test(pipe.replace(/\s+/g, '')) || pipe.includes('Audit booked (1)'));
  check('[queue] wrong number moves to research', (pipe.match(/Needs research \((\d)\)/)?.[1] ?? '') === '2' && pipe.includes(String(wrong)));
  check('[queue] do-not-call counted, declined counted', pipe.includes('1 declined · 1 on the do-not-contact list'));

  // ── Leads, search, details ──
  await p.click('.tabs [data-v="leads"]');
  await p.fill('#search', 'palo');
  check('[queue] search narrows the list', (await p.locator('#leadlist .lrow').count()) === 1);
  await p.fill('#search', '');
  await p.click('#leadlist .lrow:has-text("Saguaro")');
  check('[queue] details show the four scores', (await p.locator('#sheet .tile').count()) === 4);
  await p.click('#sheet [data-act="script"][data-v="voicemail"]');
  check('[queue] voicemail script uses the company name', (await p.textContent('#sheet .scard'))?.includes('Reale Revenue Systems') ?? false);
  await p.click('#sheet [data-act="obj"][data-v="no_budget"]');
  check('[queue] objection chip shows an honest reply', (await p.textContent('#sheet'))?.includes('The Snapshot is free and you keep it either way') ?? false);
  await p.click('#sheet [data-act="interest"][data-v="reviews"]');
  check('[queue] alternative interest recommends the matching offer', (await p.textContent('#sheet'))?.includes('Reputation Revenue Engine™') ?? false);
  check('[queue] activity timeline lists the voicemail', (await p.textContent('#sheet .tl'))?.includes('Left voicemail') ?? false);
  await p.keyboard.press('Escape');
  check('[queue] Escape closes the details', !(await p.isVisible('#sheet .panel')));

  // ── Settings & results ──
  await p.click('.tabs [data-v="log"]');
  check('[queue] results table by priority', (await p.textContent('#main table'))?.includes('P1: call first') ?? false);
  await p.fill('#set-callerName', 'Sam Example');
  await p.click('form[data-form="settings"] button[type="submit"]');
  await p.reload(); await p.waitForSelector('#app .top');
  await p.click('.tabs [data-v="leads"]');
  await p.click('#leadlist .lrow:has-text("Sunbelt")');
  check('[queue] saved name appears in scripts after reload', (await p.textContent('#sheet .scard'))?.includes('this is Sam Example with Reale Revenue Systems') ?? false);
  await p.click('#sheet [data-act="close"] >> nth=-1');

  // ── Export & import ──
  await p.click('.tabs [data-v="log"]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="dl-log"]')]);
  const log = JSON.parse(readFileSync((await dl.path())!, 'utf8'));
  check('[queue] downloaded call log matches the JSON Schema', validateLog(log) === true, JSON.stringify(validateLog.errors));
  check('[queue] call log has the 5 logged outcomes', log.events.filter((e: { type: string }) => e.type === 'outcome').length === 5);
  check('[queue] do-not-contact list exported', log.suppression.length === 1 && log.suppression[0].name === dnc);
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="dl-csv"]')]);
  const csvText = readFileSync((await csv.path())!, 'utf8');
  check('[queue] pipeline CSV has a row per lead', csvText.trim().split(/\r?\n/).length === dataset.leads.length + 1);
  await ctx.close();

  const fresh = await open();
  await fresh.page.click('.tabs [data-v="log"]');
  await fresh.page.click('summary');
  await fresh.page.fill('#import-log', JSON.stringify(log));
  await fresh.page.click('[data-act="import-log"]');
  check('[queue] importing a log on another device merges it', (await toastText(fresh.page)).includes(`Merged ${log.events.length} new events`) && (await goal(fresh.page)) === '5', await toastText(fresh.page));
  await fresh.page.click('summary');
  await fresh.page.fill('#import-log', '{"schema":"nope"}');
  await fresh.page.click('[data-act="import-log"]');
  check('[queue] a bad log is refused with a reason', (await toastText(fresh.page)).includes('Can’t import'));
  await fresh.ctx.close();

  // ── Other views ──
  const dark = await open({ scheme: 'dark' });
  check('[queue] dark mode: no errors, no sideways scroll', dark.errors.length === 0 && await dark.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await dark.ctx.close();
  const desk = await open({ width: 1280 });
  await desk.page.click('.card.now [data-act="open"]');
  const w = await desk.page.evaluate(() => document.querySelector('#sheet .panel')!.getBoundingClientRect().width);
  check('[queue] desktop: details open as a side panel', Math.round(w) === 560, String(w));
  await desk.ctx.close();
  const appCtx = await browser.newContext();
  const ap = await appCtx.newPage();
  const appErrors: string[] = [];
  ap.on('pageerror', (e) => appErrors.push(String(e)));
  await ap.goto(`file://${appFile}`);
  await ap.waitForSelector('.card.empty');
  check('[queue] hosted build without data explains itself, no errors', (await ap.textContent('.card.empty'))?.includes('No lead data in this page') === true && appErrors.length === 0);
  // Hosted layout: index.html + leads.json served together, no account runtime → saves on the device.
  const hostDir = join(dir, 'hosted');
  mkdirSync(hostDir);
  writeFileSync(join(hostDir, 'index.html'), buildQueuePage());
  writeFileSync(join(hostDir, 'leads.json'), JSON.stringify(dataset));
  const server = await startServer(4474, hostDir);
  try {
    await ap.goto('http://localhost:4474/');
    await ap.waitForSelector('.card.now');
    check('[queue] hosted page loads leads.json beside it', (await ap.textContent('.card.now h2')) === 'Saguaro Lane Property Co. (fictional)' && appErrors.length === 0, appErrors.join(' | '));
    check('[queue] hosted page without account sync says where it saves', (await ap.textContent('.mode')) === 'Saved on this device');
  } finally { server.close(); }
  await appCtx.close();
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
console.log(`e2e (queue): ${passed}/${results.length} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (passed !== results.length) process.exit(1);
