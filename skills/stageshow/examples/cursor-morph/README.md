# Cursor morph

The cursor picks its own style: real, large, circle, arrow, then real again (the fifth, `touch`, is for phones).
Each silhouette is resampled to 72 perimeter points and morphed with the
same damped spring (damping ratio 0.62, angular frequency 15). Color and
stroke width are clamped while geometry can overshoot. Retargeting starts
from the current outline, and unmounting cancels the pending frame.

The portal rides the kit cursor for position and press feedback. State lives
in the Stage; the shape does not keep a second selected-style state. Reduced
motion settles directly. The compact layout uses a 318px control in a 358px
stage, preserving 14px labels.

Use this when a cursor changes *identity*. Ordinary pointer/hand/ibeam changes
should use the kit's cursor kinds.
