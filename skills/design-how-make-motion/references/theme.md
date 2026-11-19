# Theme

The video's look is one `VideoTheme` (`src/kit/theme.ts`). Scenes read roles, never literals: `theme.color.accent`, not
`#0a84ff`. design.how's look is the default; anyone's design system replaces it.

## Roles

- **color**: paper, ink, muted, faint, hair, well, accent, onAccent, and a `dark` set for ink scenes.
- **font**: display (captions, titles), text (UI in mockups, defaults to display), mono (commands).
- **type**: caption size, weight, leading, tracking, style (`kinetic` or `static`); display, body and meta sizes for
  mockups.
- **shape**: radii for panels, controls and devices; the hairline width; shadow (`none` by default).
- **motion**: the preset (`punchy` or `calm`) and its curves, frame counts, whip distance and blur samples.
- **sound**: the loudness target. The key, tempo and preset live in each video's `audio/cues.mjs` (`MUSIC`), beside its
  timing, and nowhere else.
- **frame**: width, height, fps, render scale.

## Sources

Use the first one the person has. Show the resolved theme to them in a few lines before building.

1. **A theme.json**, shaped like VideoTheme. Partial is fine.
2. **A CSS variables file.** Map variables to roles by what they do, not by their names (`--fg`, `--text-1` and
   `--color-text` are all ink). Write the mapping out for the person; never apply it silently. A framework's default
   palette is not the team's palette; ask.
3. **A design.how system**, by name: read its tokens.css and fonts.
4. **A site URL.** `npm run theme -- <url> --out src/<name>/theme.json` opens the site in Remotion's
   Chrome, light and dark, and reads its ground, text, muted text, first filled button, link colour, the colour
   variables on `:root`, and its heading, body and code fonts, each checked against Google Fonts' OFL list. It's a
   draft: a white button can come back as the accent, a font as its build name ("GeistSans"). Decide every role and
   say so. Some sites close a headless browser; then read the theme by hand from the site's CSS.

## Deriving missing roles

- `dark.paper` is ink darkened to OKLCH lightness 0.12; `dark.ink` is paper.
- muted, faint, hair and well come from paper and ink at design.how's steps: muted at about 45% of the way from ink to
  paper, faint 75%, hair 90%, well 96%.
- accent is the brand colour. If it is under 3:1 on paper, darken it until it passes for lines and text, and keep the
  raw brand only as a fill. Yellow brands are fills under ink, never text on paper.
- onAccent is ink or white, whichever passes 4.5:1, on each ground: set `dark.onAccent` too, because a bright
  accent on an ink scene often needs dark text. If neither passes, move the accent.
- A brand colour and a separate accent closer than 30° in hue collapse to the brand. One accent per video.

## Contrast must pass

Check every text role on every ground it sits on: paper, well, dark paper, dark well. Captions and body need 4.5:1,
display text over 40 px needs 3:1. A failure stops the build; fix the role, not the scene.

## Fonts

- Load from a local file (`src.file`: one variable font, or a list of static files with their weights) or from a
  Google Fonts CSS2 URL (`src.google`). Faces register under an alias, so a copy installed on the machine never
  stands in.
- Load every face before the first frame (`useThemeFonts` in `src/kit/fonts.tsx` holds the render until they have).
  Don't trust `document.fonts.check` alone: it returns true for a family nothing declares, so a font that never
  arrived passes and the video renders in the fallback. Ask whether a FontFace of that family loaded (`loaded()`).
  A face that fails to load fails the render.
- Ask the person whether they hold a licence to render their font into a public video. Commercial or unknown: warn,
  and offer the nearest Google Fonts face.
- Kinetic tracking was tuned on a compact grotesk. For a wide face, check the stills for words touching mid-spread
  and lower the spread.

## design.how's default

Paper #ffffff, ink #111111, muted #71706f, hair #ececeb, well #f6f6f6, one accent #0a84ff for measurements and
highlights only. Hairline panels, no shadows, no decorative rules, paper and ink scenes in turn. The display face is
Inter Tight 500 (OFL, Google Fonts); design.how's own videos swap in its brand face by theme.
