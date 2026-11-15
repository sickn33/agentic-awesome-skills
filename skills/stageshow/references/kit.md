# The kit, piece by piece

The reference for every part in `kit/`. SKILL.md has the map; read the entries for the parts a demo uses.

The kit is four tiers, and they are not equal:

- **The stage** (`stage.tsx`, `cursors.tsx`): the canvas, the script, the cursor, measuring and playback. Every demo is built on it.
- **Frames** (`window.tsx`, `phone.tsx`, `ios.tsx`, `messages.tsx`): windows, devices and system surfaces drawn from real geometry. Never draw these by hand: no hand-built window, phone, bubble, notification, status bar or home indicator.
- **Motion** (`motion/`): behaviors that have to hold up frame by frame. They bring motion, not a look; style what's inside them as the product does.
- **Small parts** (`parts/`, `controls/`, `code.tsx`, `chart.tsx`): quiet starting points. Restyle them to the product, or build the product's own when they don't match it.

## Specimen sheets

Catalogs of how each part behaves, one per tile, not compositions to copy. Use the scenes in SKILL.md for composition ideas, and look at any reference at the intended width before borrowing from it.

- `examples/controls/`: Field, Segmented, Toggle, Tabs, Code, Chart, a card dragged between columns with `Slot`, `Scroll`, a `Camera` push-in, and the `arrow` cursor with ripple clicks.
- `examples/glass/`: the glass theme on a window, a chip and a popover.
- `examples/brand-marks/`: the bundled payment and app artwork on light and dark surfaces; sources and licenses are in `kit/brands/SOURCES.md`.
- `examples/kit-extras/`: Chip, Swap, Avatar rings, Meter tones, Menu hover, Expand, solid glyphs, BrandMark.
- `examples/parts/`: the newer parts (States, Check pending, Meter, Stream, Connector arrows, Popover and Menu, the satellite lock screen).
- `examples/looks/`: nine style studies: three invitation identities, then console, finance, canvas, conversation, research and a dimensional transfer receipt.
- `examples/chrome/` and `examples/phones/`: every window chrome and phone frame in the kit.

## The stage

### `Stage`

The canvas.

- **Size.** Design size and scale-to-fit. `compact`: a second design for narrow containers (the composition rule is in `framing.md`, Small formats and the page). A host wrapper marked `data-ss-wide` scales the wide design only for a slot sized by height, never for an ordinary tile, which draws 1:1.
- **Scene state** (`initial`), changed by the script's `Act` (below).
- **Children** are `(state, rect, layout) => JSX`. `rect(name)` measures any `data-target`, re-measured after transitions settle. `layout` is `'wide'` or `'compact'`: read it here, not with `useLook()`.
- **Playback.** `play`: `loop`, `once`, `hover`. Hover settles back with a glide when the pointer leaves. The stage stops and resets unfinished playback offscreen, restarts it on reentry, and preserves a completed once scene. Under reduced motion it shows `poster`.
- **The look.** `theme`, `palette`, `fidelity`; `tokens={{ ... }}` for one stage (see Look tokens); `accent`; `greys="cool"` swaps the warm canvas and well for cool ones, for macOS or a blue ground (light theme only).
- **`ground`**: what the scene sits on. `orbs` is a pale tile lit by a few soft color orbs, so glass has color to take; pass two or three colors to choose them. Leave it out for the plain ground.
- **`fill`**: grows past the design size to fill the container, up to 2×, for a hero or a docs plate; a host wrapper marked `data-ss-fill` does the same. `speed` plays the script faster (above 1) or slower.
- **`keys`**: where keycaps show: `bottom` (the default), `top`, `bottom-left` or `bottom-right`. Keep them clear of anything open, a menu reaching the bottom of a short stage included; film flags an overlap. Takes `{ wide, compact }` too.
- **`hover`**: targets for stills.
- **`specimen`** marks a sheet of parts (the kit's chrome, controls, phones sheets): film's composition checks (framing, voids, ladders, insets) stand down.
- **`unframed`**: for a developer who asks for no framing (`framing.md`, Small formats and the page). Leave out `ground` and keep the product whole with room for its shadow; film's bleed and floating checks stand down.
- **The cursor**: see below.

### `Act`

What a script gets.

- **Scene:** `set`, `put`, `snap(patch, scope?)` (no transitions, stage-wide or in one target), `wait`.
- **Pointer:** `move(to, { duration, path, onMove })` (`path` as drag's; `onMove(at, from, t)` gets each point, for a scrubbed readout), `click` (`{ double: true }`; `{ right: true }` for a context menu), `cursor`, `center`, `place` (at once, with no travel: only behind a cut), `enter(to)` (arrives from past the nearest frame edge, already moving).
- **`drag`**: dips, closes the open hand into `grab` at the bottom of the press and opens on release; over text or a canvas it selects and keeps its kind. `duration` sets its length. `{ cursor: 'preserve' }` retains the current kind through a product-specific drag such as arrow-based event creation or a resize edge. `{ path: (progress, from, to) => point }` supplies a constrained path in stage coordinates, with eased 0 to 1 progress and endpoints matching the current cursor and target.
- **Keys and text:** `type` (35ms per character by default); `key` (shows keycaps, resolves as the key comes up so the app can react).
- **Timing:** `stagger(items, fn, gap = 60)`; `mark(name)` for filming a beat. Start a move without awaiting it to run it alongside other beats.
- **Measuring:** `rect(name, { layout })`; `caret(name, at)` (the character a text selection reaches with the pointer at `at`; call it in a drag's `onMove` so the highlight tracks the I-beam).
- **Moves** travel in a shallow arc, timed by distance. Hovered targets and every target around them get `data-hover`; pressed get `data-pressed`. Targets can aim inside an element: `{ at: 'apply', x: 0.8, y: 0.6 }`.

### The cursor

`cursor={{ at, kind, style }}`; `at` can be `{ wide, compact }` when the compact design needs a different rest point.

- **Styles:** `real` (macOS cursors), `large` (1.5×), `circle` (the iPad's glass pointer), `touch` (a finger on a phone: a dot only where it taps or drags, nothing between), `arrow` (a solid rounded arrowhead, as illustrated demos draw it; an I-beam only over text). Never the macOS arrow on a phone.
- **Kinds** come from `data-cursor` on elements (`pointer`, `ibeam`, `crosshair`, `hand`, `open`, `grab`, `wait`, `resize-ns`, `resize-ew`, `resize-nwse`, `resize-nesw`), switching as the cursor crosses their edge.
- **`ripple: true`** sends a soft ring out from each click, for small stages or when clicks must read at a glance.
- **`idle`** (ms, 4000 by default, `false` to keep it on) fades a cursor that has rested that long after acting; `still: true` keeps it in the reduced-motion poster.
- Leave it out of stills unless pointing is the story.

## Frames

### `Window`

Chrome, chosen by props. See `examples/chrome/`.

- **Browser:** `url`, plus `nav` (back and forward), `tabs` and `urlShape="pill"`.
- **App:** `title`, centered in a plain bar. With a `toolbar` it moves left, 14px after the lights, as a unified toolbar; `lead` (the left toolbar slot) follows it and the toolbar sits on the right. `body` takes props for the content column.
- **Sidebar app:** `sidebar` runs full height and holds the traffic lights, the way Mail, Notes, Linear and Slack look. `sidebarWidth` sets its width (180 by default). Beside a `sidebar`, the title is the content column's heading at the column's 16px inset: pad the content 16px too, so the heading and the first row line up.
- **Grounds:** a plain or browser window's body is the canvas (a quiet gray); a sidebar window's content column is the surface (white, the sidebar on canvas). For a white page in a plain window, give its content `background: var(--ss-surface)`; keep one window's content one color.
- **The lights** sit in the same spot in every kind, as far from the left edge as their center is from the top, in every combination. `lights`: `color`, `grey` (glass's default) or `white` (glass, card or hairline over a strong color).
- **`chrome="glass"`**: a frosted browser for a colorful ground.
- **`chrome="terminal"`**: a dark terminal, one surface, `title` dim and centered (`northwind — zsh`). Fill it with `<Prompt path="~/app">command</Prompt>` lines, plain divs for output (classes `ok`, `err`, `dim` for status color, sparingly) and a `<Caret />` on the last prompt. Never hand-style a light window as a terminal. Its colors are tokens: `--ss-term-path`, `--ss-term-sigil`, `--ss-term-ok`, `--ss-term-err`, `--ss-term-dim` (and `--ss-term-bg`); set them on the window or the stage to match an accent.
- **`chrome="card"`**: one white card, pale dots, a wide pale address bar and a long soft shadow (a payments site's checkout browser).
- **`chrome="hairline"`**: a small quiet frame over a 1px rule with the address as bare text, for a window that is a detail, not the subject.
- **`receded`** fades it to 40% when something comes forward.
- **macOS 26 (Tahoe), each opt-in:** `sidebarStyle="floating"` (the sidebar as a rounded panel inset 8px, on a 24-radius window), `lightsSize="large"` (12px lights, 8px apart), `barSize="tall"` (a 64px icon-and-label toolbar: no fill or rule, 32px controls at the top with labels under them, lights and title level with them).
- **Several kinds passed:** a `chrome` other than the native one wins over everything (terminal, glass, card and hairline ignore `sidebar`, `tabs`, `nav` and `lead`); otherwise `sidebar` wins, then `tabs`; a `url` beside a `sidebar` puts the address in the content column's bar.

### `Phone`, `LockScreen`, `Notification`

A phone from real geometry at any `width`, its screen laid out in true points. The framing and sizing rules are in `framing.md`, Phones.

- **`frame`:** `photo` (optional caller-owned bezel through `--ss-phone-photo-light` / `--ss-phone-photo-dark`; no photograph ships; falls back to `pro` without one), `pro`, `silver`, `bezel`, `android`, `soft` (the pale, even-banded marketing-page phone, no island), `clay`, `outline`, `bare`.
- **Screen:** `wallpaper` (the screen is white by default, black with `dark`), `island`, `status`. `WALLPAPER` is the default lock screen ground, a soft blue to lilac gradient after the iPhone's own; pass it as the Phone's `wallpaper` with `dark`.
- **Size it for its text:** draw a phone that shows app text at 340 wide or more (about 0.85 of true size), and let it run off the stage rather than shrink it to fit. A bar on the screen sizes to its content with real padding under its last line, never a fixed height its text can overrun.
- **`LockScreen`** stacks notifications at the bottom as iOS does (iOS 16 and later). `size="satellite"` for a phone beside a window (no controls, notifications under the clock); `clock={false}` drops the date and clock.
- **`Notification`:** always true iOS size (only Live Activities differ) and, as a banner, native width (the screen minus 18pt each side); the phone is sized and cropped around it, never the other way (`framing.md`, Phones). Bodies wrap to three lines. On an unlocked phone (in an app, on the home screen) pass `banner` and it drops in at the top under the island, over the app.

### `Thread`, `Bubble`, `Stamp`, `Receipt`, `Keyboard`

Messages, from the kit only.

- **`Thread`** pins a conversation to its bottom, glides older messages up when one arrives and puts tails on the last bubble of each run. `app` is `imessage` (true iOS bubbles), `sms` or `chat` (AI apps: a quiet bubble for the person, plain text for the reply, pair it with `Stream`).
- **`Bubble from="me" | "them"`** rises in from its tail corner. `avatar` puts a small `Avatar` beside a received bubble for a group chat. With `source` (the composer text's selector or target) it forms out of the input as iMessage sends: clear the field in the same update. With `typing` it holds the dots and grows into the message when typing ends, one object, never a swap. `tapback={{ emoji, show }}` adds a reaction (its motion is in `motion.md`, Phones in motion).
- **`Receipt`** rolls Delivered to Read and folds away with `show={false}`; keep it mounted.
- **`Keyboard`**: the iOS 27 keyboard at true points, full width under the composer. Pass `typed` and it pops each key and follows auto-capitals; `suggestions`, `dark`. Leave it out by default: most message demos read better without it. Show it only when typing is the story.

## Motion parts

### `Collapse`, `Fly`, `Toast`, `Spinner`

- **`Collapse`**: a height that opens and closes so what follows moves with it. `reveal="drop"` for a card or message, which arrives whole instead of being uncovered by the edge; `from="below"` for a chat message landing at the foot of a feed; `solid` for a surface unlike the ground (a dark log panel on a light window), which would otherwise fade through gray. On close the content dims then dissolves across the whole of the height's travel, never an empty box.
- **`Fly`**: an element carried along a soft arc from the source element's own `rect()` to the landing element's own `rect()`, never a slot or wrapper around it (a slot's rect makes it snap size on landing). `.ss-fly[data-go]` styles it in flight, to settle into its resting look before it lands. It is hidden until `go`, so it never doubles what it leaves, unless `held` shows it waiting at `from` (the thing being carried, or a chip budding off a value).
- **The handoff:** hide the source in the set that turns `go` on; when it lands, show the real element and hide the flyer in one set (unmount it), then `snap({ go: false })` while it is hidden, ready for the next loop.
- **The value-chip recipe:** `from` is the value's own text rect; the chip's child is drawn transparent, its words exactly over the value's (same size and weight, green, with the + in the padding to its left), and the value fades under it. With `held` it buds in where it sits, then on `go` its surface fades in during the flight (a keyframe on `.ss-fly[data-go]`), and the check or the rolling total comes only after it leaves.
- **`Toast`**: a confirmation that rises in (`--ss-toast-rise` sets how far).
- **`Spinner`**: a pending arc.

## Parts

| Piece | Use it for |
|---|---|
| `Row` | One row of a list: `lead` (an `Avatar`, a tile), `title`, `subtitle`, `meta` (a time, a count), `preview` (placeholder lines under the subtitle, as bar widths), `unread` (a dot hanging in the margin left of the lead, so the row never moves; give the list a few px of padding for it. A product that reserves a dot column on every row, as Mail and Messages do, pads the whole list instead, and Gmail puts the dot by the time; follow the product, never pad only the unread rows), `selected`, `pad`. The anatomy is fixed: lead and dot centered on the title and subtitle, title 4 to 6px above its subtitle; children (a `Toggle`, a chevron, a badge) trail at the end of the title line, and extra preview lines go inside `subtitle`. A title with no subtitle is a one-line row: the title plus the row's padding, no second line reserved. A `Bar` in any slot keeps the line's pitch. Inside a `Phone` it takes iOS sizes (17pt name, 15pt lines, 10pt dot) on its own; never restyle its `.ss-row__*` parts. |
| `Pin` | A comment pin: one rounded square with a single square corner (`corner`: `bl`, `br`, `tl`, `tr`), face and rim the same shape, an initial or `src`, `tone` accent or ink, `selected` for the open one. Place its square corner on the thing the comment is about. Never a disc with a corner stuck on. |
| `Avatar`, `Check`, `Icon` | Initials avatars (`Facepile` overlaps several, each cut out of the next: `names`, `size`, `overlap`; `plain`, or no `name`, for a plain disc in any fidelity: filler assignees and faces behind the one that matters; a named avatar takes a muted opaque color of its own by default (`tone="person"`), as Mail and Messages draw monograms; `tone="ink"` for a gray disc, `accent` for the person the story is about, `ios` for the gray-blue gradient monogram with two initials that Contacts, Mail and Messages draw for a contact with no photo); a status check (`pending` turns an arc in the ring, `on` grows a solid disc and draws the tick: one mark from pending to done, never a spinner stacked over a check); a few line icons (including a card's `chip` and `contactless` arcs) and `Icon filled` system glyphs. Beyond these, the product's real icon pack or a set chosen on purpose, in one opaque color (`craft.md`, Icons and logos). Avatar `ring` marks a person's status, eased between states: `pending` (a quiet ring), `waiting` (the quiet ring with an accent arc going round: asked, not yet answered), `confirmed`, `declined`. |
| `Connector`, `Count`, `Roll`, `Meter` | Story pieces: a line that draws between two points and ends on a dot; a number whose changed digits roll from the old figure to the new one, last digit first (`duration`, `stagger`; it jumps inside a snap or offscreen); text that animates only the changed part; a usage bar that fills (`Meter tone` for its color). `Count` uses tabular digits but reserves no width for extra digits or punctuation: give it a stable slot when its neighbors must stay still. A unit the format writes after the figure (21°, 240ms, 12 min) sits in its own box, `.ss-count__unit`, a hair from the digits or a word space when the format has one; `--ss-count-unit-gap` widens the hair, and the class is where a smaller degree sign is styled. `Roll` measures and eases the changed span's width and moves what follows with it; `variant="fade"` for control labels. `delay` holds the old text before it rolls, so a total can change a beat after the edit that feeds it. When the whole control should keep its largest footprint, use `States` instead. |
| `Connector` extras | Endpoint dots default to a 3px radius, an accent fill (the line and dot both use `--ss-accent`), a 2px white rim and a subtle shadow: a starting treatment, so restyle them, or drop them with `dots="none"` (`both` puts one at each end), when something else explains the relationship better. `arrow` for direction (a request out, a response back), `label` for a word on the line ("POST", "200 OK") or a number for a step marker, `labelAt` (0 to 1 from `from`). Labels arrive after the line draws. `route="step"` (across, then down or up halfway, then across again) for several lines into one target: they merge into one level run before it. With `h` they would arrive from above and below and knot at its edge. Leave room between the columns, about 80px, so the bends and the merge don't crowd the target. `route="curve"` is the same level-out, level-in path as one soft S, for a looser diagram; labels and arrows follow the curve. |
| `States`, `Stream`, `Popover`, `Menu` | `States`: a control's states (label, spinner, done) stacked in one place and crossfaded, the box holding the largest (for an icon and label in a full-width button, stack each state's whole group in one cell and crossfade, so nothing slides sideways (`examples/form-error`); `Swap` is for a label whose box must resize in a line of text); `align` sets the alignment; each state keeps the line box a plain label would have, so a `Roll` or `Count` inside one shows whole, and a small line under a name sets its own line-height. `Stream`: text written word by word with every word already in its final place (no reflow), `mark` for changed words that join into runs. `Popover`: a floating surface that scales a touch from `origin` (a `PopoverOrigin`: `'top left'` by default, or a side such as `'bottom'` or `'right center'`), the side nearest its trigger, while its contents fade, never resizing as it opens; restyle it with `--ss-popover-bg` and `--ss-popover-shadow`, not `background` and `box-shadow`. It has 4px of padding by default (set your own on its class). Closing, it freezes its children and position as they were open until it has faded, so a reset never shows; the flip side is that a change made in the same set as `show: false` won't show either. To change what is inside before it closes (a row ticked, then the menu goes), make the change in one set, then close it in the next. `Menu`: its rows with a `value` highlight (the row's index), fixed `--ss-row` height; `targets` makes items highlight under the cursor. A filtering palette (rows that leave as you type) is not a Menu: build the list as rows in a `Collapse` each (`open` while it matches), so the rows below close up, and keep the highlight on the first match. |
| `Field`, `Segmented`, `Toggle`, `Tabs`, `Badge` | Form controls with their motion done: a text field (label, focus ring that never moves the text, placeholder that leaves on the first character, a caret solid while typing and blinking at rest, `password`, `status` valid or error, `chip` to commit the typed text as a filter chip where it was typed, with `remove` for its ×; put `data-target` on `box`), a segmented control and tabs whose highlight slides (`items`, `value` as the selected index, `targets` to name each item for the cursor), a switch, a status pill (`dot`, or `icon` for a glyph beside the label, like a tick on Matched). Use these rather than building inputs by hand. |
| `Code`, `Chart` | `Code`: real code lines with numbers, quiet syntax color and diff lines (`{ text, kind: 'add' \| 'del' }`); `count` streams lines in without reflow; long lines fade at the edge. `Chart`: a smooth line with a soft area and an end dot, or `kind="bars"`; it draws in on `show` and eases between datasets when `data` changes. `chartPoints(props)` gives where it draws each point (a bar's top center) from the same props, for a tooltip, marker or hairline on a point: never repeat the chart's maths. |
| `Slot` | A gap in a list that opens and closes (`open`, `height`, `gap`), for moving a card between lists or columns (the dashed mark is drawn at the slot's full height and only fades; never animate a dashed border's size): the source's slot closes as the card lifts, the destination's opens (`dashed`) as it travels, and the card lands in it. Aim the drop at where the card will sit once the slot is open (measure the column, not the opening slot). Columns must be fixed widths (`minmax(0, 1fr)`) or they shift as the card changes column. |
| `Scroll` | A scrolling area: `<Scroll name="list">` and `a.scroll('list', 'row-5')` (or a px offset). The cursor moves over the area first and holds still while the content moves; macOS's overlay scrollbar shows while it scrolls and fades after (`bar="always"` keeps it, `bar="none"` hides it); edges soften only once scrolled. Scrolling craft is in `motion.md`. |
| `Camera` | Pushes in on part of the scene and back out: wrap the scene, set `focus` to `a.rect(name, { layout: true })` or null. The view feathers its edges while zoomed. When and how to push in is in `motion.md`, Scrolling and the camera. |
| `Follow`, `cellOf` | `Follow` springs an overlay onto a rect and keeps momentum when retargeted (selection rings, highlights). `cellOf` gives sticky cell borders for drags (`motion.md`, Drags and selection). |
| `Tooltip` | A small dark label centered under (or over, `side="above"`) a target rect, `gap` from it, fading in with `show`. Pass `at={rect('archive')}`; restyle its corner and color to the product's. |
| `Chip`, `Swap`, `Expand` | `Chip`: a filter chip with a remove x (`remove` names it for the cursor) that opens and closes its own width, `gap` the row's gap. `Swap id={step}`: replaced text, keyed on what changed, that crossfades while its box eases to the new size, so lines around it move instead of snapping. `Expand`: the iOS card-to-screen open as one element, clipped from `from` (a measured rect); with `face` (what the tapped thing looked like, a notification or an icon) it's an app launch: the window takes the app's surface (`--ss-expand-bg`) as it grows, the face fades early and the app's content fades in with the growth. Works inside a Phone: closed, it still draws its face at `from`, so keep it in a layer hidden until the launch. Put that layer at z-index 1, under the status bar and island, and set the Phone's `dark` to false as the app covers the top, so the status bar reads over it. |
| `BrandMark` | A real product mark from the local registry via `brand` (Visa, Mastercard, PayPal, Notion, Gmail and other common integrations), or a custom `name` and `src`. `size` sets the height, wide payment marks keep a wider footprint, `tile={false}` removes the tile, and `surface` overrides the automatic light or dark artwork. See `brands.md` and `examples/brand-marks/`. |
| `Bar`, `Text` | A placeholder line (`tone` 1 to 5). A line (numeric `w` over three times `h`) gives way in a row too narrow for it and never runs past its container; where it fits it is exactly `w`. An icon slot or dot keeps its size; `shrink` overrides either way. `Text` is real text that becomes a placeholder line in minimal fidelity (its width estimated from the text and a numeric `style.fontSize`; set `w` to be exact). `Text filler` is the other way round: words that show only at realistic fidelity and are a bar at standard and minimal, so filler rows are written once and the stage's fidelity decides. |
| `inset`, `box`, `between`, `contains` | Rect helpers for placing overlays from measured targets. A `Rect` is `{ x, y, width, height }`, including values from `rect()`; use `width` and `height`, not `w` and `h`. |
| Look tokens | Shape (`--ss-radius-sm`, `-md`, `-lg`, `-window`, `-pill`) and density (`--ss-control`, `--ss-row`) beside the color and type tokens; every rounded part reads them. Set a look with a class over `.ss-stage` or `Stage tokens={{ ... }}`. See `references/looks.md`. |
| `stageshow.css` | Every style at once (each component also imports its own). All kit CSS is in `@layer stageshow`, so a demo's own unlayered CSS always wins: restyle a part with a plain class, never `!important`. A few unlayered guards keep host CSS out of a stage: host element rules roll back to browser defaults, and a universal reset (Tailwind preflight) is handed back to the kit. A host rule with a class (`.article p`) still reaches in; exclude stages with `:not(:where(.ss-stage *))`. Tokens (five inks, surfaces, lines, text, one accent plus `--ss-accent-2` for gradients, status colors with `-soft` fills and `-text` shades, the well, `--ss-raised`, window, hero, satellite, ground and lift shadows; `Stage greys="cool"` swaps the warm canvas and well for cool ones), the looks, edge fades (`.ss-fade-b`, `-r`, `-br` with `--ss-fade`), the cursor, chrome, phones and keycaps. |

## Layout and CSS scope

In render code use the third `layout` argument; in a script use `a.layout`.
Both are `'wide'` or `'compact'`. Do not infer layout from a child element's
measured width: that element can be narrow in either composition.

`<Stage className="demo">` puts the class on the outer `.ss-fit` wrapper.
The inner `.ss-stage` owns `data-layout` and the design dimensions:

```css
.demo .ss-stage { background: #f5f5f5; }
.demo .ss-stage[data-layout="compact"] .card { width: 300px; }
```

`.demo[data-layout="compact"]` matches nothing. Scope the scene's other
selectors under `.demo` too. Measure the host width before choosing the
compact design size; the example dimensions are not defaults.

## Explicit replay

`Stage` has no imperative replay handle. Put a real, accessible Replay button
in the host and remount the demo at that story boundary:

```tsx
const [run, setRun] = useState(0)
return <>
  <button onClick={() => setRun(n => n + 1)}>Replay</button>
  <InviteDemo key={run} />
</>
```

The click explains the return to the starting picture. Keep the wrapper's size
fixed; for a soft restart, hide the scene before changing the key and reveal
the fresh one after. A keyed replay is deliberate: never use changing keys for
ordinary state changes, text changes or variant switches, which should keep
the moving object's identity. Set `play="once"` for a scene that waits for
Replay after its payoff, with a meaningful `poster` so reduced motion shows
the same complete still.
