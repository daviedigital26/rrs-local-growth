/**
 * Exact port of the owner's PM Lead Scorer `scoreLead()` (2026), kept so the familiar
 * hot/warm/cold call order can be shown beside the new four-score model.
 *
 * Deliberately unchanged, including its known quirks (documented in ICP-METHODOLOGY.md):
 * keywords are counted individually ("cancel" and "canceled" both hit), praise can count as
 * pain ("no voicemail runaround"), missing data scores low instead of Not verified, and the
 * maximum reachable score is 86. The only change: missing `reviews` is treated as [] instead
 * of throwing.
 */
export interface LegacyLead {
  name: string;
  city: string;
  phone: string;
  rating: number;
  reviewCount: number;
  reviews: string[];
  chain: string | null;
}

export interface LegacyScore { score: number; tier: 'hot' | 'warm' | 'cold'; painHits: number; chainPenalty: boolean }

export const LEGACY_PAIN_KEYWORDS = ['slow', 'never respond', 'unresponsive', 'took \\d+ day', 'voicemail', 'no response', 'did not respond', 'delay', 'stopped working', 'never received', 'weeks', 'ignored', 'frustrat', 'unresolved', 'radio silence', 'did nothing', 'rarely returned', 'no help', 'rude', 'not respond', 'fabricated', 'broken', 'canceled', 'cancel', 'error', 'confus'];
export const LEGACY_CHAIN_KEYWORDS = ['national franchise', 'franchise'];
export const LEGACY_MAX_SCORE = 86;

export function legacyPmScore(lead: Partial<LegacyLead>): LegacyScore {
  let score = 0;
  const rc = lead.reviewCount as number;
  let sizeScore: number;
  if (rc >= 50 && rc <= 600) sizeScore = 40;
  else if (rc > 600 && rc <= 1200) sizeScore = 26;
  else if (rc > 1200) sizeScore = 10;
  else sizeScore = 20;
  score += sizeScore;

  const rating = lead.rating as number;
  let repScore: number;
  if (rating >= 3.8 && rating <= 4.6) repScore = 20;
  else if (rating > 4.6) repScore = 12;
  else repScore = 10;
  score += repScore;

  const text = (lead.reviews ?? []).join(' ').toLowerCase();
  let painHits = 0;
  LEGACY_PAIN_KEYWORDS.forEach((k) => { if (new RegExp(k).test(text)) painHits++; });
  score += Math.min(painHits * 8, 26);

  let chainPenalty = 0;
  if (lead.chain && LEGACY_CHAIN_KEYWORDS.some((k) => (lead.chain as string).toLowerCase().includes(k))) chainPenalty = 16;
  score -= chainPenalty;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 60 ? 'hot' : score >= 38 ? 'warm' : 'cold';
  return { score, tier, painHits, chainPenalty: chainPenalty > 0 };
}
