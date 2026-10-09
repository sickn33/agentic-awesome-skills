# Craft floor

Adapted from the craft floor in impeccable by Paul Bakaus (Apache-2.0, see THIRD_PARTY_NOTICES.md) and the layout rules in taste-skill (MIT), rewritten and merged. Load it right before the first UI edit. The brief's own words can earn back anything under "Refuse"; your habit cannot.

Rules marked **[gate]** are checked by `scripts/gate.py` on the rendered page. The rest are yours to check in the screenshots.

## Verify on the built page

- **Contrast [gate]:** body and placeholder text 4.5:1 or better, large text (24px, or 18.7px bold) 3:1. Secondary text on a colored surface is tinted from that surface, not gray.
- **No sideways scroll [gate]:** at 390px nothing is wider than the screen. Long words, code, tables and images get a wrap or a scroll container.
- **No text over text [gate]:** no heading under a sticky nav, no badge on a label, no line of copy running into another at any width.
- **Tap targets [gate]:** buttons and controls at least 44px tall on phones; inline links at least 24px.
- **Readable size [gate]:** no visible text under 12px on phones.
- **Hero [gate]:** the H1 and the first call to action are both inside the first desktop screen.
- **Images [gate]:** every image loads and has alt text (empty alt for decoration).
- **Type:** body measure 60-75 characters, display no bigger than about 6rem, tracking no tighter than -0.04em, balanced headings (`text-wrap: balance`), obvious steps in size and weight.
- **Spacing:** tight inside a group, generous between groups, more space above a heading than below it.
- **Depth:** shadows have an offset and a soft blur and take their tint from the background. A zero-offset colored glow is decoration.
- **Motion:** one authored moment, eased out, from a visible default state. Scattered fades on every section are not motion design. `prefers-reduced-motion` turns it off.
- **States:** hover, focus-visible, active, disabled, loading, empty, error. Forms: label above input, error below, no placeholder as label.
- **Browser surfaces:** text selection, focus ring, caret, scrollbar, link underline offset, tabular numerals in data. Theme them; they are the cheapest sign a page was built rather than assembled.
- **Copy:** the product's own words. Buttons say what they do. One label per intent on the whole page ("Get started" everywhere, not also "Try free" and "Sign up").
- **Nav:** one line on desktop, 64-80px tall.
- **Coverage:** every requirement in the brief is on the page and easy to find.

## Refuse (the defaults that make a page look generated)

Page scaffolds:

- **[gate] Three or more same-size cards of icon, heading and text** as the page structure. Cards are for real elevation; group with space and dividers otherwise. Never nest cards.
- **[gate] An eyebrow label** (small uppercase letter-spaced text) above headings. At most one per three sections, and usually none: the heading can speak.
- The hero-metric template: giant number, small label, three supporting stats.
- Section numbers (01 / 02 / 03) unless the order carries meaning.
- A split header (big heading left, small paragraph right) with nothing else in the right column.
- A logo wall or tagline stuffed inside the hero.
- A modal for a task that does not need to interrupt.

Surface habits:

- **[gate] Purple, violet or indigo gradients** as the default accent (the "AI glow").
- **[gate] Gradient text.** Emphasis comes from weight, size or the accent color.
- **[gate] Emoji or unicode glyphs as icons.** Use one SVG icon set in one stroke weight.
- **[gate] The system or a stock font as the display voice** (Inter, Roboto, Arial, Helvetica, system-ui) unless the brief asked for neutral.
- **[gate] Placeholder copy:** lorem ipsum, Acme, John or Jane Doe, example.com, "Unlock the power of".
- **[gate] Em dashes in body copy.** Use a comma, a colon or a period.
- Glass and blur as decoration rather than a specific effect.
- A thick colored border on one side of cards, callouts or list items.
- Hard offset block shadows outside a page that is actually neo-brutalist.
- Monospace as a costume for "technical" rather than for code or data.
- Geometric masks faking an organic cut-out of a photo.
- Mixed corner radii with no rule. Pick sharp, soft or pill and keep it.

The floor holds the mechanics. It never picks the direction. With every check green, spend the page on the signature detail you chose in step 1.
