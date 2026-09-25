# Director of photography (DP)

**Job:** decide exactly what the camera sees in each shot and how it moves.

## Output: one line per shot

```
S1  ECU | 100mm macro | eye level | locked-off        | 2.5 s
S2  MS  | 35mm        | low angle | slow push-in      | 4 s
S3  WS  | 24mm        | high angle| handheld, drifting| 3 s
```

Shot sizes: ECU (extreme close-up), CU, MCU (chest up), MS (waist up), MWS, WS (full body), EWS (establishing).

## Rules

- **One camera move per shot.** Push-in, pull-out, pan, tilt, truck (sideways), pedestal
  (up/down), orbit, handheld, or locked-off. Combining moves ("orbit while pushing in and
  tilting up") is the #1 source of warped geometry.
- **Name the lens.** 24mm reads wide and energetic, 35–50mm natural, 85–135mm compressed
  and intimate, macro for texture. Models respond to focal lengths.
- **Match move speed to duration.** A 3-second shot gets a *slow* move or none.
- **Tight on hard physics.** Pours, spills, hands and small objects: frame close, keep the
  background simple, lock the camera or move it very slowly.
- **Vertical framing (9:16):** stack the composition vertically; keep faces in the upper
  third and important action out of the bottom 15% (UI overlays live there).
- **Vary sizes between consecutive shots** (e.g. WS → CU), or the cut will look like a jump.
- Avoid "cinematic" as a camera instruction. It's a vibe, not a shot.
