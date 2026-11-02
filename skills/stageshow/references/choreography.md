# Choreography

Start with a readable still and a short account of the change. Name the frame that holds still, the state that starts things, the responses that depend on it, the destination and the hold. Pick timing only once those relationships are clear. A quiet frame gives the moving parts something to move against; moving every layer at once takes that away.

## A change passing through an interface

Keep the header, outer surface and action positions steady while the variable content changes inside them. A setting can lead its dependent amount, payment method and form. Start the dependent movements before the previous ones finish, with offsets that make the order legible. Keep the old and new content in tracks rather than replacing the whole screen.

Use a fixed, local soft mask where a track enters and leaves. Its settled text sits wholly inside the opaque part, and the control's border stays outside the mask. Don't soften the whole interface, blur every transition or use a mask to hide bad resting geometry. A row changing height needs something else: fade its content while its space opens or closes, so the moving edge never slices readable ink.

`examples/choreography/` shows a cursorless checkout changing market. Its frame and product stay put while the currency, price, method and address respond. The comparison beside it uses the same layout and movement with every start at once, so timing is the only variable. Read it as one possible sequence, not a required checkout style or timing preset.

## Timing has different jobs

| Job | Decision |
| --- | --- |
| Direct feedback | Start on the input; a presentation delay feels unresponsive. |
| Travel between stable positions | A departure, a stretch of clear travel and a soft arrival. Length alone does not make it fluid. |
| Related data updates | Recognition, transfer and the accumulated result can each take a different time. The result still follows its cause. |
| Introducing a composition | A small front-loaded movement can settle for longer than its busy part. Don't scale readable text much. |
| Replacing content | Keep the container, alignment and reading interval; mask only the moving slot. |
| Holding a result | Stop. A useful still needs no new pulse or repeated count. |

## Choose the curve for the movement

A slow departure, concentrated travel and soft arrival make a retained content track readable. A direct press needs quicker feedback. A number accumulating after a transfer may take longer than the transfer itself. Choose these together: one duration or easing applied everywhere flattens the hierarchy.

A small expressive icon may overshoot while its card and text settle without bounce; keep that accent local. Keep useful content through a form change, and give the final state time to read. In a code demo, use real syntax-highlighted code with sans-serif labels and copy: monospace belongs to the code, not the whole scene.

## Review the full change

Watch at normal speed, then step through the onset, the overlap, the masks, the final cleanup and the hold. Check text pixels as well as geometry: a stable rectangle can still hide glyph shimmer. Check the narrow host, reduced motion, pause, step, replay and the return from offscreen. A paused new scene must finish its first measurements without advancing the story. If pacing looks uneven, compare independent RAF samples with elapsed time; a smooth virtual-clock export says nothing about live playback.
