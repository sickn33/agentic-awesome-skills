# Direction: decide what the page is before building it

Adapted from taste-skill by Leonxlnx (MIT, see THIRD_PARTY_NOTICES.md), rewritten and cut down.

Most generated UI looks the same because the model skips this step and reaches for its default: a centered hero on a dark mesh, a purple-to-blue gradient, Inter on slate, three equal feature cards, an eyebrow label on every section. Every one of those is fine when chosen. None of them is fine as a reflex.

## 1. Read the signals

1. **Page kind:** SaaS landing, consumer product, agency, event, portfolio, docs, dashboard, settings, redesign.
2. **Vibe words the user used:** minimal, calm, editorial, Linear-like, Apple-like, playful, brutalist, premium, serious B2B, dark tech.
3. **References:** URLs, screenshots, named competitors. These beat your taste.
4. **Audience:** a procurement panel, a design-conscious consumer, a developer, a recruiter skimming, a patient. The audience picks the look.
5. **Assets that already exist:** logo, colors, type, photos. In a redesign they are starting material.
6. **Quiet constraints:** accessibility-first, public sector, regulated, kids, trust-first commerce. These override aesthetics.

Then write the one-line read from SKILL.md step 1. If two very different reads are plausible, ask one question. If not, proceed.

## 2. Set the dials

| Read | Variance | Motion | Density |
|---|---|---|---|
| Minimal, calm, editorial | 5-6 | 3-4 | 2-3 |
| Premium consumer | 7-8 | 5-7 | 3-4 |
| Playful, experimental, agency | 9-10 | 8-10 | 3-4 |
| Landing page (default) | 7 | 6 | 4 |
| Trust-first, regulated, public | 3-4 | 2-3 | 4-5 |
| Dashboard, admin, tool | 3-4 | 2-3 | 6-8 |
| Redesign that preserves | match | +1 | match |

- **Variance above 4:** avoid the centered hero. Use a split, left copy with a right asset, asymmetric space, or a pinned scroll section. A centered hero is right for a manifesto or launch note where the words are the design.
- **Motion:** 1-3 means hover and focus only. 4-6 means one entrance moment and scroll-linked reveals. 7+ means a real authored sequence, still with a reduced-motion path.
- **Density above 7:** no generic cards; numbers breathe in plain layout with dividers.

## 3. Pick the type

- Choose the display face for its character, then a text face that reads well at 16px.
- Sans display by default: Geist, Satoshi, Cabinet Grotesk, General Sans, PP Neue Montreal, Switzer, Space Grotesk, Manrope, Outfit. Rotate; do not reuse the same pairing on consecutive projects.
- A serif needs a reason you can say in one sentence (editorial, heritage, luxury publication). "It feels premium" is not a reason. The two LLM-favorite display serifs (Fraunces, Instrument Serif) are not defaults.
- Emphasis inside a headline is italic or bold of the same family, not a random second family.
- Italic display words with descenders (g, j, p, q, y) need line-height 1.1 or more so they do not clip.

## 4. Pick the palette

- One neutral family (zinc, stone, slate, sand, ink), one accent, saturation under 80%. Lock the accent for the whole page: no blue CTA in a warm page's footer.
- Families that are not the default: pure monochrome with one bright pop, cobalt and cream, forest with an amber accent, terracotta and slate, olive and brick, black and tan, cold silver and smoke.
- The premium-consumer default (cream background, brass or clay accent, espresso text) is a reflex. Use it only when the brand is really that.
- Light or dark comes from the use scene: who, where, under what light. Not from the category.

## 5. Pick the layout families

List the sections, then give each a different family: split, full-bleed media, bento with real visual variety, marquee, stacked statement, comparison table, timeline, quote, gallery, sticky stack, horizontal pan. The same family at most once. Never three image-and-text zigzags in a row.

## 6. Pick the signature detail

One thing a visitor will remember: an oversized numeral treatment, a material (paper grain, frosted glass used on purpose, machined metal), a product demo that actually moves, a cursor interaction, a custom illustration style. Spend the effort there. Everything else stays quiet and precise.

## Redesigns

First decide: evolve or replace. Evolve keeps the identity, copy and behavior and fixes the mechanics. Replace treats the old look as an anti-reference and picks a new world with the steps above. Never split the difference by polishing a look you have decided to throw away. Never change factual copy, prices or claims without asking.
