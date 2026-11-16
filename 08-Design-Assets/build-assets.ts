/**
 * Renders brand-derived raster/vector assets with sharp (librsvg + fontconfig Inter).
 * Outputs: logo concept SVGs + review board, favicon set, web manifest, default OG image.
 * Run: npm run assets
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { appIconSvg, CONCEPT_LABEL, lockupSvg, markPaths, markSvg } from '../01-Brand-System/Logos/concepts/mark.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const concepts = join(root, '01-Brand-System/Logos/concepts');
const pub = join(root, '02-Public-Website/public');
const og = join(pub, 'og');
const hero = join(root, '08-Design-Assets/Hero-Graphics');
for (const d of [concepts, pub, og, hero]) mkdirSync(d, { recursive: true });

/** Render at high density for crisp edges, then downsample to the exact target width. */
const png = (svg: string, out: string, w: number, palette = false) =>
  sharp(Buffer.from(svg), { density: 216 }).resize({ width: w }).png({ compressionLevel: 9, palette, quality: 92 }).toFile(out);

// ── Logo concepts ──────────────────────────────────────────────────────────
writeFileSync(join(concepts, 'rrs-mark-concept-a.svg'), markSvg('on-dark'));
writeFileSync(join(concepts, 'rrs-mark-concept-a-light.svg'), markSvg('on-light'));
writeFileSync(join(concepts, 'rrs-lockup-concept-a-dark.svg'), lockupSvg('on-dark'));
writeFileSync(join(concepts, 'rrs-lockup-concept-a-light.svg'), lockupSvg('on-light'));

const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#F7F4EE"/>
  <rect x="0" y="0" width="1600" height="84" fill="#2DD4BF"/>
  <text x="48" y="54" font-family="Inter" font-weight="700" font-size="28" fill="#081020">${CONCEPT_LABEL.toUpperCase()}</text>
  <rect x="48" y="132" width="740" height="560" rx="28" fill="#081020"/>
  <g transform="translate(258 222) scale(5)">${markPaths('on-dark')}</g>
  <rect x="812" y="132" width="740" height="560" rx="28" fill="#FFFFFF" stroke="#E0DEDB"/>
  <g transform="translate(1022 222) scale(5)">${markPaths('on-light')}</g>
  <g transform="translate(48 730)">${lockupSvg('on-light').replace(/<\/?svg[^>]*>/g, '')}</g>
  <g transform="translate(48 820)"><rect width="740" height="120" rx="20" fill="#081020"/><g transform="translate(24 24)">${lockupSvg('on-dark').replace(/<\/?svg[^>]*>/g, '')}</g></g>
  ${[16, 32, 48, 64, 96].map((s, i) => `<g transform="translate(${900 + i * 120} ${880 - s})"><svg width="${s}" height="${s}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#081020"/><g transform="translate(1 0)">${markPaths('on-dark')}</g></svg></g>`).join('')}
  <text x="900" y="930" font-family="Inter" font-size="18" fill="#334155">App icon at 16 / 32 / 48 / 64 / 96 px</text>
  <text x="900" y="740" font-family="Inter" font-weight="600" font-size="19" fill="#081020">Stem = authority · Bowl = process · Leg = recovered opportunity</text>
  <text x="900" y="770" font-family="Inter" font-size="17" fill="#334155">Swap in the approved official mark in mark.ts, then npm run build</text>
</svg>`;
await png(board, join(concepts, 'concept-board.png'), 1600, true);

// ── Favicons + manifest ────────────────────────────────────────────────────
writeFileSync(join(pub, 'favicon.svg'), appIconSvg());
await png(appIconSvg(), join(pub, 'apple-touch-icon.png'), 180);
await png(appIconSvg(), join(pub, 'icon-192.png'), 192);
await png(appIconSvg(), join(pub, 'icon-512.png'), 512);
await png(appIconSvg(), join(pub, 'favicon-32.png'), 32);
writeFileSync(
  join(pub, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'Reale Revenue Systems',
      short_name: 'RRS',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#081020',
      background_color: '#081020',
      display: 'standalone',
    },
    null,
    2,
  ),
);

// ── Open Graph template ────────────────────────────────────────────────────
export function ogSvg(title: string, kicker: string): string {
  const words = title.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 26) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const steps = ['Search', 'Selection', 'Inquiry', 'Follow-up', 'Booked'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="0.85" cy="0.1" r="0.8"><stop offset="0" stop-color="#4F5DFF" stop-opacity="0.45"/><stop offset="1" stop-color="#081020" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#FFFFFF" stroke-opacity="0.045"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="#081020"/><rect width="1200" height="630" fill="url(#grid)"/><rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(64 56) scale(0.9)">${markPaths('on-dark')}</g>
  <text x="132" y="98" font-family="Inter Display, Inter" font-weight="700" font-size="26" fill="#FFFFFF">Reale Revenue Systems</text>
  <text x="64" y="188" font-family="Inter" font-weight="600" font-size="22" letter-spacing="3" fill="#99A1FF">${kicker.toUpperCase()}</text>
  ${lines.map((l, i) => `<text x="64" y="${268 + i * 74}" font-family="Inter Display, Inter" font-weight="700" font-size="66" letter-spacing="-1.5" fill="#FFFFFF">${l}</text>`).join('')}
  ${steps.map((s, i) => { const x = 64 + i * 214; const last = i === steps.length - 1; return `<g transform="translate(${x} 520)"><rect width="196" height="54" rx="27" fill="${last ? '#2DD4BF' : '#121B3F'}" stroke="${last ? '#2DD4BF' : '#2A3570'}"/><text x="98" y="35" text-anchor="middle" font-family="Inter" font-weight="600" font-size="21" fill="${last ? '#081020' : '#FFFFFF'}">${s}</text></g>`; }).join('')}
</svg>`;
}
await png(ogSvg('More Local Customers. Fewer Missed Opportunities.', 'Get Discovered · Get Chosen · Get Booked'), join(og, 'og-default.png'), 1200);
await png(ogSvg('Free Local Revenue Opportunity Snapshot', 'Five categories · 100 points · evidence-labelled'), join(og, 'og-snapshot.png'), 1200);
writeFileSync(join(hero, 'og-template.svg'), ogSvg('More Local Customers. Fewer Missed Opportunities.', 'Get Discovered · Get Chosen · Get Booked'));

console.log('assets: logo concepts, board, favicons, manifest, OG images written');
