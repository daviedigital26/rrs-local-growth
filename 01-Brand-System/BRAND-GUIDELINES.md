# Reale Revenue Systems — Brand Guidelines (v1.0, pending approval)

**Master brand:** Reale Revenue Systems, a Reale Labs company. Products and offers stay subordinate to it: an offer name is never a competing logo.

**Positioning line:** Get Discovered. Get Chosen. Get Booked.

## 1. Colour

| Token | Hex | Role |
|---|---|---|
| Midnight Ink | `#081020` | Primary dark background. Authority. |
| Electric Cobalt | `#4F5DFF` | Primary action, process emphasis |
| Signal Mint | `#2DD4BF` | Recovered opportunity, positive signal, CTA accent **only** |
| Slate | `#334155` | Secondary text, rules, supporting UI |
| Warm Canvas | `#F7F4EE` | Primary light background |
| Pure White | `#FFFFFF` | High-contrast text on dark, cards |

**Ratio:** Ink + Canvas ≈ 80% · Cobalt ≈ 15% · Mint ≤ 5%.

**Gradients:** only within the palette (Ink → Ink/Cobalt glow). No palette-changing gradients, gold, generic real-estate red, or unrelated accents.

**Derived tints** are mixes of brand colours only (`tokens.json → color.derived`). That's how they stay on-palette.

### Accessible pairings (tested, WCAG 2.2)
- **On dark:** White (19:1), Fog `#C2C6CC` muted text (11:1), Cobalt-300 `#99A1FF` links (8:1), Mint accents (10:1).
- **On light:** Ink headings (17:1), Slate-700 body (12:1), Slate secondary (9.4:1), Cobalt-700 `#3A46BC` links (6.9:1), Mint-800 `#165A5C` positive text (7.9:1).
- **Buttons:** White on Cobalt (4.8:1). Hover goes to Cobalt-700 (7.6:1).
- **Never:** Mint text on light backgrounds (fails), or raw Cobalt body text on Canvas (4.4:1, fails AA).

## 2. Typography
- **Display:** Inter Display 600/700, tight tracking (−0.025em), for headlines.
- **Body/UI:** Inter 400/500/600, 17px base, 1.55 line height.
- **Numbers:** use tabular figures (`font-variant-numeric: tabular-nums`) for prices and scores.
- Self-hosted WOFF, Latin subset, OFL licence included. Manrope or Neue Haas Grotesk can replace display type through the `font.display` token (Neue Haas needs a commercial licence).

## 3. Logo
- The official geometric R mark + wordmark **was not supplied**. `Logos/concepts/` holds *Concept A*, which is labelled pending approval. Don't treat it as official.
- **Clear space:** the stem width on every side. **Minimum size:** 20px mark, 120px lockup.
- **On dark:** white stem. **On light:** ink stem. Bowl and leg colours never change.

## 4. Imagery
- Original diagrams, product-style UI illustrations and real photography only (with permission).
- **No:** generic AI robots, meaningless tech graphics, unlicensed stock, fake client logos, or "results" screenshots that aren't real.
- Every demonstration shows a visible **"Fictional example"** label.

## 5. Data visualisation
Cobalt = process/current state · Mint = recovered/positive · Slate = baseline/comparison · Fog/Slate-200 = not verified. Never encode meaning in colour alone: always add a label or icon.

## 6. Voice
Plain, direct, local, honest. Short sentences. Talk like an operator, not an agency.
- **Do:** "We'll show you what we checked and what we couldn't verify."
- **Don't:** "Guaranteed #1 rankings", "10x your leads", "dominate AI search", invented stats.
- AI answers vary, so we report *observations under recorded conditions*, never rankings.
