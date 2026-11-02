# Annotations, guides and connecting lines

An annotation explains one relationship: what a chart point means, how big a selection is, where an event went, which object a note belongs to. The product stays visible. A line earns its place by removing ambiguity; it is not a reason to add a spotlight, another frame or a caption to every object.

Design the product before its annotations. A line that attaches perfectly cannot rescue faint text, weak hierarchy or generic nested cards. Give the table, invoice or record believable anatomy, readable type and one clear action, and save the stronger color for the relationship the line explains.

See `examples/annotations/`. Its picker mounts one of eight studies, so only the chosen story runs. The scenes use a native canvas width down to 288px instead of shrinking their labels, and each has a reduced-motion result.

| Study | Cause and result | Geometry owner |
|---|---|---|
| Usage into an invoice | Three usage sources connect, deliver their first combined result, then the feeds stay open. | Each source is measured; one white-rimmed junction joins the inputs before the solid delivery. |
| A payout and its detail | Select a payout; its linked settlement opens; a leader explains its arrival; clearing closes the detail. | A dotted record link and a separate solid leader meet measured surface edges. |
| A chart point | Select a point; its explanation appears; click away to clear it. | Point and label are measured with `rect()`; their edges go to `Connector`. |
| Selection and dimensions | Select a card, resize it by its handle, drag back, deselect. | Card, ring and guides share one changing box, which shows its real dimensions. |
| A request and its reply | Send an event; the request draws; the acknowledgement returns after delivery; the trace clears. | Measured source and destination edges. Solid outbound arrow, dashed return. |
| Following a layer | Select a photograph; Arrange moves and resizes it; Reset returns it; click away to clear. | `Follow` owns the object and its note together. |
| A shared processing graph | Store an asset, fan out to three jobs, then clear the completed result. | One measured trunk and one shared spine; each branch starts at its own junction. |
| An ongoing event stream | Connect a checkout source; events keep arriving in its activity table. | A static measured route under moving dots; the path never moves. |

## Choose a line for a relationship

Start with the product question, then choose the line. If the layout already makes the relationship obvious, leave the line out. More connections do not make a fuller explanation.

Give related surfaces different jobs and different weight: the invoice leads and a smaller usage table sits in front of its empty upper corner; the selected ledger row stays readable beside a smaller settlement detail. Overlap can tie a composition together, but it never covers record text or forces a line through useful content. At narrow widths, stack the relationship rather than shrinking its type.

- **A leader explains a visible object or value.** One selected point joined to one short note, usually with no arrow and no continuing motion. Keep the note out of useful content and remove it with the selection.
- **A leader is a fine line with two clear ends.** 1px (1.5px at hero scale) in a quiet ink, never a bar. It leaves the note's edge and lands 4 to 6px short of the object it explains, ending in a 4px dot or at the object's edge with a gap, never butting into or crossing a rounded border. It runs straight or with one bend; it does not pass behind or through another surface (`examples/annotations`).
- **A record link joins two views of the same thing.** One row opens its settlement, and a fine dotted link makes that explicit. The quieter solid leader below explains arrival. Different jobs, different weights.
- **A collection joins several inputs to one result.** Three meter rows gather into one invoice. One blue runs through the incoming paths, their junction and the shared output, because they are one relationship; the small junction is the aggregation. Draw each incoming route once, and start the delivery only after every input has arrived. Never add a junction to fill space.
- **Direction shows transfer.** A request, an acknowledgement or a posted result needs an unambiguous origin and destination. A request and its response start from different ends, so the return arrow starts at the recipient; a decorative two-headed line cannot say that. Reveal the route before confirming arrival, and change the status after the transfer, not before the line has landed. A stationary arrow can stay afterwards.
- **A moving phase shows ongoing work.** Dots move only while data is flowing: fine, slow enough to follow, on a fixed route with only the phase animated. Never on a finished one-off request. Stop or freeze them when the connection closes, pause them offscreen and with the host, and keep a static directional poster under reduced motion. A finished invoice update can sit beside an ongoing feed: its first values have landed while new usage still travels the retained routes.

A small white pill with a fine rim and a tight shadow makes a job or service read as a node. In the processing graph each pill holds the job name and, where there is room, its arriving check; the narrow layout keeps the text alone and marks completion through the pill's ink and rim instead of squeezing in an icon. The source stays a file row with its filename, metadata and action. A node is part of the system being explained; annotation text is the explanation attached to it. Don't turn every label and endpoint into the same pill, and measure the pill's visible edge when connecting to it.

Center the pill's visible content as one group. A hidden status icon reserves neither width nor gap: the name alone is centered before the result, then the slot and gap open while the label moves with them, so the group stays centered throughout. Reverse that on removal.

A short inline badge can name the line itself: `POST`, `200 OK`, a protocol, a step. A slightly heavier label and a small shadow keep it legible over the stroke. It arrives with the completed line and keeps its footprint small; it is neither an endpoint nor a product surface.

A saturated blue dotted line is a deliberate, legible treatment; purple or teal can suit another study. One relationship, one color, rather than a hue per joined input. Color need not be pale to be restrained. The kit's default endpoint is a small colored center matching the route, a white rim and a subtle shadow, which marks a port or junction against a crossing line. Size it to the stroke and the display scale, treat it as a specific node rather than a decoration for every endpoint, and let it appear on arrival with its center on the route. A plain cap, a small arrow or no marker may be clearer elsewhere.

Keep four things separate: the route's geometry, the stroke pattern, the reveal along the route, and any continuing phase. A reveal mask lets a dotted line draw progressively without stretching its dots, and the phase never moves the route or the attached content.

## Attach to what is drawn

`Connector` takes points in stage pixels. Derive them from named targets, never from positions guessed off a screenshot. Attach to the edge that faces the relationship, with room for the line and its label, and keep the label out of the main content and other connectors. Horizontal and vertical compositions may need different endpoints.

Check the direction of the final segment, not just where it ends. A line meeting a label's bottom edge approaches vertically; one meeting its side approaches horizontally. An endpoint on the right border is still wrong if the segment before it runs along that border, underlines the label or crosses its interior. In the chart study, `route="h"` travels across first, then rises to the measured bottom center.

`rect()` refreshes after state commits and when a CSS transition finishes; it does not track CSS motion every frame. When something moves continuously, either update the scene's state each frame or put the object and its annotation in the same moving coordinate space. The following-layer study does the latter: its leader, note and outline are children of the same `Follow` wrapper as the object. A separate line aimed at Follow's destination would jump ahead of the visible layer.

`Follow` suits a selection ring retargeting between objects: it keeps its velocity while the target rect changes. Don't give the label its own spring if it must stay attached. For a drag, keep the grip offset and use `a.drag`'s per-frame point to size or move the object; read the displayed dimension from that same geometry, not from a number chosen in advance.

## Show the cause, then hold the explanation

Start the line when selection or delivery begins. `Connector` draws on and fades off intact; its arrow and label arrive with the line. A callout can fade in without moving its measured anchor. Hold the result long enough to read, and clear it with an on-screen action.

Endpoint markers wait for the visible route to reach them; `Connector` ties them to the reveal. A branching graph propagates from its incoming junction outward, starting each branch as its junction is reached, and a sender confirms delivery after the acknowledgement returns. Crossfade discrete statuses in stable `States` slots, start-aligned beside their status dots; a measured dimension tracks its box directly, in tabular numerals.

Line styles mean different things: a solid request and a dashed acknowledgement separate direction and role. A shared trunk means one input fans out, so draw the shared segment once, or the overlapping paths darken and knot.

## Frame the whole relationship

Leave room for the guide, arrowhead and label outside the target, clear of the product frame's clip. On a narrow host, stack the surfaces and move the labels with their lines, at their normal size. Chart marks may compress horizontally; their label stays readable. An annotation is not permission to cover the result it explains.

If a detail really needs a camera, use `Camera` with a focus from `a.rect(name, { layout: true })`, keep the annotation in the same coordinate space as its target, and never feed an already transformed rect back into the focus. These studies read without one.

## Check attachment in motion

Film `?capture=annotations`, choosing a study with `annotation=collect`, `detail`, `chart`, `measure`, `flow`, `follow`, `branch` or `stream`:

```sh
node scripts/film.mjs '<url>/?capture=annotations&annotation=follow' --out shots/annotation-follow.png
node scripts/layout.mjs '<url>/?capture=annotations&annotation=measure' --select body
```

Watch the entry, the held result, the exit and the return. During a resize, compare the guide ends with the card's edges on every sampled frame; during a follow, compare the leader's end with the object's edge, since a clean start and end can hide separation between them. Check the narrow width, and the picker, focus and Replay too. A contact sheet cannot prove continuous attachment or steady text: the gaps between samples are unchecked.
