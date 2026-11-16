import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast } from './color.ts';
import { resolveColors, tokens } from './resolve.ts';

const colors = resolveColors();

test('brand palette matches the master spec exactly', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(tokens.color.brand).map(([k, v]) => [k, v.value.toUpperCase()])),
    { ink: '#081020', cobalt: '#4F5DFF', mint: '#2DD4BF', slate: '#334155', canvas: '#F7F4EE', white: '#FFFFFF' },
  );
});

test('every approved text/background pair meets its WCAG minimum', () => {
  const failures: string[] = [];
  for (const p of tokens.contrast.pairs) {
    const fg = colors[p.fg];
    const bg = colors[p.bg];
    assert.ok(fg && bg, `Unknown colour in pair ${p.fg} on ${p.bg}`);
    const ratio = contrast(fg, bg);
    if (ratio < p.min) failures.push(`${p.fg} on ${p.bg} = ${ratio.toFixed(2)} (needs ${p.min}) — ${p.use}`);
  }
  assert.deepEqual(failures, []);
});

test('known-failing pairs stay off the approved list (guards D-014)', () => {
  // Mint text on light backgrounds and raw cobalt text on canvas are below AA for body text.
  assert.ok(contrast(colors.mint!, colors.canvas!) < 4.5);
  assert.ok(contrast(colors.cobalt!, colors.canvas!) < 4.5);
  const approved = new Set(tokens.contrast.pairs.filter((p) => p.min >= 4.5).map((p) => `${p.fg}|${p.bg}`));
  assert.ok(!approved.has('mint|canvas'));
  assert.ok(!approved.has('cobalt|canvas'));
});

test('derived colours are valid hex', () => {
  for (const [k, v] of Object.entries(colors)) assert.match(v, /^#[0-9A-F]{6}$/, k);
});
