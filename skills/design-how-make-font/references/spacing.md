# Spacing

Widths come from the fit. Spacing decides how the widths divide into ink and air. `space_font.py` runs on each
fitted style.

## Class sidebearings

An advance is ink plus two sides, so `fit_font.py` already sets the class sides inside its width loop, and the
widths it reports include them. `space_font.py` sets them again on the finished outlines, which moves them by a
unit or less, then does the rest.

Every side of a basic Latin letter is straight (S), curved (R) or other (O), in `fontlib.SIDES`. The targets give
the mean straight and curved side for each case. The script measures the same means on the fitted font and moves
every straight side by the straight difference and every curved side by the curved difference. Other sides
(diagonals, open terminals, the arms of T and the tail of Q) take the mean of the two, because a diagonal's
apparent space sits between a straight's and a curved's.

Accented letters and alternates move with their base letter. Composites move as a whole by their own letter's
move, whatever their components did. Mark anchors on moved glyphs move with them, so accents stay centred.
Figures, punctuation, symbols and small capitals keep the base's spacing: they have no class target.

With only a screenshot of ordinary text, there are no side targets. The rhythm (twice the straight side over the n
counter) still carries: the straight side is set to `rhythm x n counter / 2` of the fitted font, and curved sides
follow the base's own ratio.

## Track

`--track N` adds N units to both sides of every glyph with ink, marks excepted, and leaves the word space alone.
Use it after the class spacing when the whole texture should be tighter (display) or looser (small UI text).
Every advance moves by twice the track, so the width gates will show it: that is a choice, report it as one. A
display face set at 48 px and above usually wants -4 to -12. Text at 16 px wants 0.

## Kerning

The base's pair kerning comes through the fit, scaled with the em. Its values were drawn for the base's
spacing, which is close enough after a class move of a few units. `--kern-scale` multiplies every pair value,
for a font tracked far from its base. Kerning is never taken from a reference.

## Collision guard

After all moves, every pair of letters, figures and common punctuation, plus known traps (q j, g j, y j, f ),
f ], f ?, g y, r . and quotes before A), is shaped with HarfBuzz with kerning on. Each glyph's ink edge is read
in rows 4 units apart, and the smallest gap between the left glyph's right edge and the right glyph's left
edge is the pair's gap. A pair under `min_gap` (6 units for text, 4 for display, 8 for UI) gets a kerning value
that opens it to `min_gap`, in a new lookup added to the kern feature. The guard only opens, never closes.

f on the left is skipped unless `--guard-f`: its hood is meant to overhang the next letter, and the f ligatures
cover most of the pairs where that would touch.

The count is a health check. Twenty to eighty pairs is normal after tightening. Over 150 means the class moves
or the track are too aggressive: loosen and rerun rather than shipping 150 patches.

## Check by eye

Set `nnnonnnoonnoonnn`, `HHHOHHHOOHHOOHHH`, `nanbncndnenfngnhn...` and `HAHBHCHD...` at 48 px, and a paragraph at
16 px. Curved letters should sit as evenly between n as straight ones do. The font book's kerning page prints
these strings and the largest guard pair, before and after.
