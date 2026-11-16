/** Pure formatting helpers shared by exports and the website. */
import type { AddOn } from './types.ts';

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

export const addOnPrice = (a: AddOn): string =>
  a.pricing.kind === 'project-range' ? `${usd(a.pricing.min)}–${usd(a.pricing.max)} per project`
  : a.pricing.kind === 'monthly' ? `${usd(a.pricing.amount)}/month`
  : a.pricing.kind === 'monthly-range' ? `${usd(a.pricing.min)}–${usd(a.pricing.max)}/month`
  : a.pricing.note;
