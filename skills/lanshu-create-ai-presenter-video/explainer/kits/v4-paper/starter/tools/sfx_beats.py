"""Topic sounds — the sound twin of beats.js. tools/sfx.py imports this after placing the starter's chrome sounds.

PLACEHOLDERS  which narration lines still use api.placeholder() in beats.js: their draft-card sounds (fold + stamp tap)
              are kept. None = every line (the fresh starter); [] once every line is performed.
place(bed, T) add the performed beats' sounds. T carries:
              T.story (dict), T.at(line, unit, nth=1), T.ph(line, text), T.line(i) (dict with start / end / words),
              T.P (paper_sfx: fold flip slap tap rustle tape unroll string hang stamp page_up tick_train),
              T.S (sfxlib), T.G (base gain, dB: the paper transients peak ≈ 8–15 dB under the voice).
Use the same story calls and offsets as beats.js, e.g.
              bed.place(T.P.fold(1.4), T.ph(3, "存起来") - 0.05, T.G - 1, pan=0.3)
"""

PLACEHOLDERS = None


def place(bed, T):
    pass
