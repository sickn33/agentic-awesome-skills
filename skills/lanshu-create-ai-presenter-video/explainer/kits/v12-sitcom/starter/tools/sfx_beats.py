"""Topic sounds — the sound twin of beats.js. tools/sfx.py imports this after placing the starter's chrome sounds.

PLACEHOLDERS  which narration lines still use api.placeholder() in beats.js: their draft sounds (bubble pop, 待演绎 tick,
              shuffle, the listener's hop) are kept. None = every line (the fresh starter); [] once every line is performed.
END_STAGE     False when beats.js switches the default end set off (api.endStage.on = false): its chalk / hop sounds go.
place(bed, T) add the performed beats' sounds. T carries:
              T.story (dict), T.at(line, unit, nth=1), T.ph(line, text), T.line(i) (dict with start / end / words),
              T.spoken(L) (units without punctuation), T.SS (sitcom_sfx: ding door_bell step steps shuffle truck boing bloop
              pop2 scribble flip stamp printer curtain applause), T.S (sfxlib), T.G (base gain, dB).
Use the same story calls and offsets as beats.js, e.g.
              bed.place(T.SS.pop2(700), T.ph(2, "手太慢") - 0.1, T.G - 4, pan=0.3)
"""

PLACEHOLDERS = None
END_STAGE = True


def place(bed, T):
    pass
