import { mix } from './color.ts';
import raw from './tokens.json' with { type: 'json' };

type BrandEntry = { value: string; name: string; role: string };
type DerivedEntry = { mix: [string, string, number]; role: string };

export type TokenFile = typeof raw;

/** Resolve brand + derived colours into a flat name → hex map. */
export function resolveColors(file: TokenFile = raw): Record<string, string> {
  const out: Record<string, string> = {};
  const brand = file.color.brand as Record<string, BrandEntry>;
  for (const [k, v] of Object.entries(brand)) out[k] = v.value.toUpperCase();
  const derived = file.color.derived as unknown as Record<string, DerivedEntry>;
  for (const [k, v] of Object.entries(derived)) {
    const [a, b, w] = v.mix;
    const A = out[a];
    const B = out[b];
    if (!A || !B) throw new Error(`Derived colour ${k} references unknown colour ${!A ? a : b}`);
    out[k] = mix(A, B, w);
  }
  return out;
}

export const tokens = raw;
