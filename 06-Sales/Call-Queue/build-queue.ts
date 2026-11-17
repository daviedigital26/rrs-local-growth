/**
 * Builds the call queue page: app.ts + its logic bundled by esbuild into one self-contained
 * HTML document (inline CSS + JS, no network needed except the optional Inter webfont).
 *
 *  - with a dataset: standalone page with the leads embedded, outcomes saved in the browser
 *  - without: the artifact page, which loads leads and saves outcomes in the artifact database
 */
import { buildSync } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CallEvent, QueueDataset } from './queue-logic.ts';

const here = dirname(fileURLToPath(import.meta.url));

export function bundleApp(): string {
  const out = buildSync({ entryPoints: [join(here, 'app.ts')], bundle: true, format: 'iife', platform: 'browser', target: 'es2020', minify: true, write: false, legalComments: 'none', charset: 'utf8' });
  return out.outputFiles[0]!.text;
}

/** JSON safe to place inside <script>: no "</script>" or HTML comment openers can escape. */
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
export const scriptSafeJson = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');

export function buildQueuePage(opts: { dataset?: QueueDataset; events?: CallEvent[]; title?: string } = {}): string {
  const css = readFileSync(join(here, 'queue.css'), 'utf8');
  const js = bundleApp().replace(/<\/script/gi, '<\\/script');
  const title = opts.title ?? (opts.dataset?.fictional ? 'Call Queue (sample)' : 'Call Queue');
  const data = opts.dataset ? `<script type="application/json" id="rrs-queue-data">${scriptSafeJson({ ...opts.dataset, events: opts.events ?? [] })}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<style>
${css}</style>
</head>
<body>
<div id="app"><p class="boot">Loading your call queue…</p></div>
${data}
<script>${js}</script>
</body>
</html>
`;
}
