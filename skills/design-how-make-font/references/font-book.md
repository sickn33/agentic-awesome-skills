# The font book

A printed specimen in the font itself, 1600 x 1000 px pages, as HTML, page PNGs and one PDF. Every number on a
page is read from the font files or the logs when the book is written, never typed in.

## Pages

1. **Cover.** The family name at 300 px with the ascender, cap height, x-height, baseline and descender drawn
   as guide lines at the font's own values. Version, weights, glyph count, scripts, licence, date.
2. **How it was made** (with `--targets`). Four steps in plain words, then the targets against each weight's
   measured value, and the width classes with their letters.
3. **Vertical metrics.** Hxdop drawn from the outlines with every line labelled, advances under each glyph,
   and the hhea, typo and win values.
4. **Weights.** One column per weight: Rag at 330 px, the alphabet and a sentence.
5. **Waterfall.** 120 px down to 11 px, each line cut to fit.
6. **Text settings.** 20/30, 16/24 and 13/19 columns, headings in the second weight.
7. **Character set.** Every code point in the TTF's character map, grouped (basic, extended, other scripts,
   figures, punctuation, currency, maths, symbols, marks), as many pages as it needs.
8. **Figures and punctuation.** Every figure style the features allow, fractions, punctuation and currency.
9. **Kerning and spacing.** Eighteen common pairs with their values, the spacing strings, kerning off and on,
   and the guard's largest pair drawn without and with the guard.
10. **OpenType features.** Every GSUB and GPOS feature, off in grey and on in black. Stylistic sets show the
    characters their lookups change, with the set's own name from the name table.
11. **Languages.** Latin, Cyrillic and Greek languages whose letters are all in the character map.
12. **Licence and install.** The name table's copyright lines and OFL notice, files with sizes, the check
    summary, a CSS snippet and desktop install.

## Rules for the book's text

- No reference name, no base family name in prose. The copyright lines quoted on the licence page are the
  only place the base is named, because the OFL requires them.
- Plain sentences, sentence case, no puffery. The sample text describes the font's own mechanics.
- Typographic minus for negative numbers, real quotes and dashes in samples.

## Printing

`node scripts/render_book.mjs book/` loads the page in Chromium through Playwright, waits for the fonts, then:

- **Fallback check.** For every element set in the book face, the DevTools protocol lists which platform fonts
  drew its glyphs. Any system font means a glyph is missing from ours and a stand-in drew it. That fails.
- **Overflow check.** Any element past a page's margins fails.
- Writes `pages/NN-slug.png` at 2x and `fontbook.pdf`.

Then open the cover, the kerning page and one character-set page and look. The standard is a sheet a type
designer would send: aligned columns, one accent colour for guides only, nothing clipped, nothing overlapping.
