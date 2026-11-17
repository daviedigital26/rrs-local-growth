/**
 * Review-text pain signals, grouped into themes.
 * Each theme counts once per lead, praise phrased with a negation ("no voicemail runaround",
 * "never slow") is ignored, and sentences about a previous company are skipped.
 */
import { HISTORICAL_PATTERNS, type IndustryProfile, type PainTheme } from './icp-config.ts';

export interface PainMatch { theme: string; label: string; relevance: number; phrase: string; review: number }
export interface PainSignals {
  sampleSize: number;
  reviewsWithComplaints: number;
  themes: PainMatch[];
  /** Matches skipped because a negation preceded them (shown for transparency). */
  negated: string[];
  /** Sentences skipped because they describe a previous company. */
  historical: number;
  /** 0–1 share of the profile's pain scale. */
  ratio: number;
}

const NEGATORS = /\b(?:no|not|never|without|zero|any|nothing)\b/;
const historical = HISTORICAL_PATTERNS.map((p) => new RegExp(p, 'i'));

const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\s+[—–-]\s+|;\s*/).map((s) => s.trim()).filter(Boolean);

/** The matched words plus up to three words either side, so the reason reads naturally. */
function snippet(sentence: string, index: number, length: number): string {
  let end = Math.min(index + length, index + 48);
  while (end < sentence.length && /[\w']/.test(sentence[end] ?? '')) end++;
  const before = sentence.slice(0, index).split(/\s+/).filter(Boolean);
  const after = sentence.slice(end).split(/\s+/).filter(Boolean);
  const words = [...before.slice(-3), sentence.slice(index, end), ...after.slice(0, 3)].join(' ').replace(/\s+([,.;!?])/g, '$1');
  return `${before.length > 3 ? '…' : ''}${words.replace(/[,.;!?]+$/, '')}${after.length > 3 ? '…' : ''}`;
}

function matchTheme(theme: PainTheme, sentence: string, negated: string[]): { phrase: string } | null {
  const lower = sentence.toLowerCase();
  for (const p of theme.patterns) {
    for (const m of lower.matchAll(new RegExp(p.re, 'g'))) {
      // Look back at most three words, and never past a comma or clause break.
      const clause = lower.slice(0, m.index).split(/[,;:(]|\bbut\b|\bthen\b/).at(-1) ?? '';
      const before = clause.trim().split(/\s+/).slice(-3).join(' ');
      if (p.neg && NEGATORS.test(before)) { negated.push(snippet(sentence, m.index ?? 0, m[0].length)); continue; }
      return { phrase: snippet(sentence, m.index ?? 0, m[0].length) };
    }
  }
  return null;
}

export function painSignals(reviews: string[], profile: IndustryProfile): PainSignals {
  const found = new Map<string, PainMatch>();
  const negated: string[] = [];
  const complaining = new Set<number>();
  let skipped = 0;
  reviews.forEach((review, ri) => {
    for (const s of sentences(review)) {
      if (historical.some((h) => h.test(s))) { skipped++; continue; }
      for (const theme of profile.pain.themes) {
        const hit = matchTheme(theme, s, negated);
        if (!hit) continue;
        complaining.add(ri);
        if (!found.has(theme.id)) found.set(theme.id, { theme: theme.id, label: theme.label, relevance: theme.relevance, phrase: hit.phrase, review: ri });
      }
    }
  });
  const themes = [...found.values()].sort((a, b) => b.relevance - a.relevance || a.review - b.review);
  const points = themes.reduce((sum, t) => sum + profile.pain.pointsPerSignal * t.relevance, 0);
  return {
    sampleSize: reviews.length,
    reviewsWithComplaints: complaining.size,
    themes,
    negated,
    historical: skipped,
    ratio: Math.min(points, profile.pain.cap) / profile.pain.cap,
  };
}
