/**
 * CONCEPT A — geometric "R" mark. PENDING OWNER APPROVAL. NOT the official logo.
 * The official RRS geometric R mark was not available in this workspace (see DECISIONS D-005).
 * Replace these paths with the approved artwork; every consumer (site header, favicon,
 * OG image, concept board) reads from here.
 *
 * Construction (64-unit grid): white/ink stem = authority, cobalt bowl = process,
 * mint leg = recovered opportunity moving forward (≈5% of the mark's area).
 */

export const CONCEPT_LABEL = 'Concept A — pending owner approval (not the official logo)';

export type MarkTone = 'on-dark' | 'on-light';

export function markPaths(tone: MarkTone): string {
  const stem = tone === 'on-dark' ? '#FFFFFF' : '#081020';
  return [
    `<rect x="14" y="12" width="9" height="40" rx="1.5" fill="${stem}"/>`,
    `<path d="M23 12h10a12 12 0 0 1 0 24H23z" fill="#4F5DFF"/>`,
    `<path d="M31 36h10l10 16H41z" fill="#2DD4BF"/>`,
  ].join('');
}

export function markSvg(tone: MarkTone, size = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Reale Revenue Systems mark (concept)">${markPaths(tone)}</svg>`;
}

/** App icon / favicon: mark on a Midnight Ink rounded square. */
export function appIconSvg(size = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#081020"/><g transform="translate(1 0)">${markPaths('on-dark')}</g></svg>`;
}

export function lockupSvg(tone: MarkTone): string {
  const text = tone === 'on-dark' ? '#FFFFFF' : '#081020';
  const sub = tone === 'on-dark' ? '#C2C6CC' : '#334155';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="72" viewBox="0 0 400 72" role="img" aria-label="Reale Revenue Systems (concept lockup)">
  <g transform="translate(0 4)">${markPaths(tone)}</g>
  <text x="74" y="36" font-family="Inter Display, Inter, sans-serif" font-weight="700" font-size="24" letter-spacing="-0.4" fill="${text}">Reale Revenue</text>
  <text x="74" y="58" font-family="Inter, sans-serif" font-weight="600" font-size="13" letter-spacing="3.2" fill="${sub}">SYSTEMS</text>
</svg>`;
}
