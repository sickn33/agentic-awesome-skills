# Checks

`check_font.py` gates each style and exits 1 on any failure. Its tolerances come from `targets.json`, set by use:

| Gate | text | display | ui |
|-|-|-|-|
| n stem, units | 3 | 3 | 2 |
| class mean width | 1.5 % | 1.0 % | 1.5 % |
| shaped paragraph | 1.5 % | 1.0 % | 1.5 % |
| contrast | 0.05 | 0.04 | 0.05 |
| x-height, units | 6 | 4 | 5 |
| side means, units | 4 | 3 | 4 |
| smallest ink gap in a kerned pair | 6 | 4 | 8 |

Units are cap-normalised (cap 700). The width gates are the fit's own objective, so they pass nearly by
construction. The paragraph gate is the independent one: it has spaces, punctuation, figures and kerning, which
the fit never saw. Read it as the real test of width. It only runs when the targets came from a font file.

## The groups

- **metrics**: stem, x-height, contrast gated. Ascender, descender, bar, serif and overshoot printed for
  information, because the fit does not aim at them.
- **widths** and **spacing**: every class mean, the paragraph, the four side means.
- **kerning**: every pair of letters, figures and punctuation, shaped, f on the left skipped. Fails if any gap is
  more than a unit under `min_gap`.
- **coverage**: the characters each script needs (`COVERAGE` in the script: latin, latin-ext, vietnamese,
  cyrillic, greek). Add a list there before claiming a script that is not in it.
- **provenance**: glyph order and character map equal the base's. With `--fit-log`, every glyph is compared with
  the base glyph at the fit's y location, at the same cap height: its ink must be within 3 % as tall (all y
  coordinates come from there) and within 40 % as wide (x comes from the width classes). With `--reference`
  files, no outline of ours may share point structure with a reference outline and lie within 2 % of it in
  bounding-box-normalised shape. Shapes under nine points are left out, since a rectangle matches every
  rectangle. A CFF reference cannot match a TrueType outline by construction, and the gate says so. If the
  reference is itself built on the same open base, this gate fails by design: say so, it is not a copy.
- **validity**: a ttx dump-and-reload (dump, compile, dump, compare), win ascent and descent covering every glyph,
  no variation tables left, and `fontbakery check-universal` when it is installed. Not installed is reported as
  not run.
- **licence**: see `licensing.md`.

## Renders

With a reference font file, `overlay-<style>-text.png` and `-display.png` set the same words in both fonts at the
same cap height: reference red, ours blue, both black. Black shapes with thin coloured fringes mean a close match.
A coloured shadow along one side of every letter means a width or spacing drift. With a screenshot,
`stacked-<style>.png` puts the screenshot above our render of the same lines at the same cap height.

Look at every render yourself. A gate passes on numbers. A letter that reads wrong only shows in a render.

## Kill criteria

Stop and go back a step when:
- a class needs more than 10 % stretch: the base is wrong (step 4);
- the guard opens more than 150 pairs: the spacing is too tight (step 6);
- a curve kinks in the x and y mix: take both from one location (step 5);
- the paragraph is off by more than twice its tolerance while every class passes: a class is missing, or the
  space or punctuation is far off, so compare `space` and the figure class.
