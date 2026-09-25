# Reroll review: change one thing, then reroll

AI video is probabilistic. Some rerolls are just the dice. Many are the prompt. The job
here is to tell those apart and change **one** thing at a time, so each reroll teaches you
something.

## 1. Classify the failure

| Class | Looks like | Most likely fix |
|---|---|---|
| **Dice** | The prompt is followed, the clip is just weaker than the last one | Reroll unchanged (new seed). Nothing to fix. |
| **Ignored action** | The key event doesn't happen (the cup never spills) | Make the action the *first* clause; describe its start and end; cut everything else in the shot |
| **Two things fighting** | Half an action, half another | Split into two shots |
| **Physics break** | Liquid behaves like jelly, objects pass through each other | Frame tighter, slow the action, simplify the background, lock the camera |
| **Identity drift** | Character looks different from other shots | Paste the continuity descriptors verbatim, or switch to image-to-video from one reference |
| **Camera chaos** | Warped geometry, swimming background | One move only, slower, or locked-off |
| **Look drift** | Color/light changes between shots | Paste the gaffer's line verbatim; name the source and color temperature |
| **Artifacting** | Extra fingers, melting faces, flicker | Tighter framing, fewer subjects, add the negative prompt if supported |
| **Text garbage** | Nonsense letters | Remove readable text from the shot |

## 2. Decide

- Same failure twice in a row → it's the prompt, not the dice. Apply the fix.
- Different failures each time → the shot is too ambitious. Simplify it (split, tighten, slow down).
- 3+ rerolls with no improvement → go back to the DP and director: re-block the shot.

## 3. Report format

```
CLASS: Ignored action
EVIDENCE: in 4/4 clips the cup lands upright; no liquid leaves it
CHANGE (one): lead with the action — "Black coffee sloshes out of a tipping paper cup…" —
              and cut the barista from the frame
KEEP: lens, light, seed policy
```

## A worked example

The upstream [ai-film-crew repository](https://github.com/HEOJUNFO/ai-film-crew) shows ten generations of one prompt in its `assets/ten-rerolls.png`:
*"A barista bumps a customer's elbow and a paper coffee cup slips and spills onto the café
floor next to white sneakers, slow motion, handheld close-up, warm morning light."*

Across ten rerolls the cup falls, rolls, or lands upright. The spill (the whole point)
barely happens. Diagnosis: **two things fighting** (the bump and the spill share one shot)
plus **ignored action** (the spill is the last clause). The crew fix is in the upstream repository's
`examples/coffee-spill-15s/SHOT_LIST.md`.
