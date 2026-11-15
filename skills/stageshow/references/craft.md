# Craft

The rules for the still frame. Framing is in `framing.md`; everything that moves is in `motion.md`.

Index: [Restraint](#restraint), [Type](#type), [Spacing and alignment](#spacing-and-alignment), [Icons and logos](#icons-and-logos), [Color and looks](#color-and-looks), [Density](#density), [Chrome and devices](#chrome-and-devices), [A page of demos](#a-page-of-demos), [Recipes](#recipes).

## Restraint

- **Count the real strings:** the title, the thing acted on, what is typed, the result; usually 3 to 7. The rest is `Bar`.
- **A word budget is not an element budget.** A calendar needs a populated week, a search a collection, a filter enough rows.
- **Lists are made of `Row`;** hand-built rows are where lists go wrong (`examples/gmail`).
- **Bars are the product's filler; the subject is words.** Bars where the eye lands read unfinished (`examples/spotify`).
- **In a still the subject is real,** words and values; a sidebar or list of bars beside it is filler and fine.
- **Where the story touches a list,** two or three real rows and at most as many bars. Film flags `skeleton ladder` at realistic fidelity only.
- **In a small surface a row is one line:** in a popover, a card or a tile, avatar, name, value. No gray bar under a real name there; filler beside real words reads as noise.
- **Named avatars take their own color** (the kit default); gray discs are filler only.
- **Label and value match:** both words or both bars. A blank pill beside a real control is dead; leave it out.
- **Keep the domain's signature content:** album art, thumbnails, avatars; swapped for the feature's signal it is a generic list (`examples/dark-bento`).
- **When the output is the subject** (a log, a diff, a terminal), real lines are the content: short and few, the rest of the screen quiet.
- **A terminal is a character grid:** a spinner and a text tick share one `1ch` cell; each line owns its mark, swapped in place (a tick on its own line in `examples/ruled-bento`).
- **One number gets to be big;** the rest are lines (`examples/subscriptions`).
- **Placeholder widths vary** row to row (60, 45, 70, 52).
- **A date-range band runs week by week** with air between rows, fades where the range continues, and is capped only on the real start and end days, each a solid disc (a circle, not a rounded square) in the accent with the day in white.
- **Say it once.** One clear link for the feature, not its signal in header, satellite and every row; a second confirmation only when it differs (`examples/dark-bento`).
- **No masthead for a fictional name:** no monogram, logo, sidebar and nav in every crop; a real mark only when recognition needs it.
- **The product's name appears only when the brief leans on it** and the real product would show it there: a notification's app name, the app's own title bar. A brief that just names the product doesn't need it on screen; the page around the demo already says it.
- **Simplify before polishing:** the fewest surfaces and strings that explain the product, then borders and badges only where earned.
- **Simplification keeps the character.** Cut repeated framing before meaningful imagery; an empty white card is not the cure.
- **Judge the silhouette before the details.** At thumbnail size the subject, support and empty space make one picture.
- **Compose objects, not an inventory of cards:** hierarchy from proportion, space, material and ground, not more boxes (`examples/story`).
- **The heaviest marks sit on what the story is about;** never a 2px black underline under a gray bar.
- **Space follows the story.** The payoff gets the room; no empty band mid-window while the result is pushed into the crop. No gap above a card, no cream under a phone's last row, no void between a stat's label and its number.
- **Dots, halos, badges and focus rings sit fully inside the content edge.**
- **Check imagery at its smallest size and over every surface it crosses;** a pale thumbnail can look see-through.
- **A specimen still describes one plausible app:** title, toolbar, navigation and body agree.
- **Nothing outsized.** The hero element sits in proportion to a real screen.
- **Realism is the developer's call.** At `fidelity="realistic"` or when asked, plausible content everywhere, still with room to breathe (`examples/wikipedia`).
- **Character is real too.** A styled brief gets its colors, radii, mascot and motion in full, still a shippable product under these rules.

## Type

- **Fit the text before fixing the box.** A control's border-box holds content, padding and border; flex centering does not make it fit.
- **Small text gets a line height of at least 1.3** and insets on every side; check the text slot's own clearance.
- **Real sizes, then scale:** 11 to 15px UI text, scaled by the stage; never 7px type.
- **One family:** the product's or the system stack. Monospace only for code, identifiers and aligned numbers, never a technical product's labels (`examples/ruled-bento`).
- **Keep only the text needed** to recognize the product and follow the beat; extra logs and timestamps are noise.
- **Sentence case** unless the real product has caps; hierarchy from spacing and one weight step.
- **No real headings.** A faux app's title is a `div`, never `h1` to `h6`: the demo lives in someone's page outline.

## Spacing and alignment

- **A button keeps 8px or more from the field, line or card edge above it;** sitting on the field it reads as touching (film flags `tight control`).
- **Words keep a 12px inset** from the edge of a window, card, panel or hovered row; film flags `tight inset` under 8px. Bars may bleed, words do not.
- **Row padding is 12px,** 8px for a dense list; a one-line row three times taller than its words is a `fat row`.
- **A title over its subtitle reads as one item:** 4 to 6px of ink between the lines, a 1.3 line height plus a 2px gap. The air comes from the row's padding (`examples/gmail`).
- **Bars sit in the same line box as the text they replace,** so a skeleton row keeps the real row's pitch.
- **Bars keep their lines' white space, not line pitch:** 6 and 5px bars want 7px between; a trailing time sits on line one.
- **Text never touches a neighboring box:** a fixed `gap` of 8 to 12px, never leftover `space-between` (`touching`).
- **A placeholder bar follows the text rules:** it never touches or runs under an avatar, badge, icon or bar.
- **Center a label on its letters, not its line box.** Capitals sit low in a plain line box, so a label beside an icon (a check and "Sent" in a button), in a pill, or an initial in a disc reads low. Trim the label: `text-box: trim-both cap alphabetic` (the kit's `Badge` and `Avatar` already do).
- **Nested shapes pad evenly** (a pill inside a field, an icon inside a button: the same distance from every edge), and the outer radius equals the inner radius plus that padding.
- **Carry the inset round the bottom;** a comfortable top does not excuse a cramped action.
- **Content clears the bar above it:** a page's first heading sits at least the content's side inset below a toolbar or title bar's rule, never just under it.
- **Whitespace groups:** a title sits closer to its metadata than to the next record; never spread lines equally to fill a frame.
- **Align the reading edge, then the visible ink.** A small icon aligns with the title's first line; size each lane before nudging.
- **Center on the visible face.** Take tracking back with a negative `margin-right`; a pair centers as a pair.
- **Field text centers cap height to baseline** (`text-box: trim-both cap alphabetic`), as the kit's `Field` does (`examples/controls`).
- **A popup under a field draws its ring inset** so its sides line up with the field's.
- **A control hugs its content;** never `flex: 1` with its contents at one end (`lopsided`).
- **Fix overflow by fitting the content,** not by widening the container; re-measure padding after (`uneven`).
- **Columns line up:** every row shares one grid template with fixed tracks; optional content keeps its track empty; bars vary inside their track.
- **A dot, badge or ring is not a column:** in the gutter or on the avatar, 6px clear, inside the row's inset (`tight mark`, `examples/gmail`).
- **No near-tangents.** Edges 1 to 3px apart read as an accident: line them up exactly, or part them by at least the gutter and never under 8px.
- **Don't end just short of an edge:** real room, or move it down and crop it (`framing.md`, rule 11).
- **A centered amount centers its digits;** `$45` centered as one string sits right of center to the eye. The currency sign hangs off the left, outside the centering: the digits are the centered box and the sign is absolutely placed at `right: 100%` inside it. A rolling amount rolls only the digits.
- **Links have no hover surface;** a control gets a surface visible at rest.
- **Hover and selection fills are inset and rounded;** negative margins go on the list, not the row; copy a real product's square fills (`examples/wikipedia`).
- **Clone a real product's menu from its computed styles** (`examples/wikipedia`).
- **A trigger with its popover open keeps its pressed look:** `data-open`, styled like `[data-hover]` (`examples/hero-demo`).

## Icons and logos

- **Imagery earns its place:** real imagery or a good icon, never invented illustration; gray art only for empty states.
- **Icons come from a set, never from your hand.** The product's own pack first (its dependencies, icons folder, sprite or `Icon` component); otherwise a set chosen on purpose (below), used at one size and one stroke width throughout. A glyph drawn by hand is the first tell of generated UI: its weight never matches its neighbors (film flags `mixed icons`).
- **No hand-drawn marks** (pin, cursor, badge, ringed dot, chip, contactless arcs): from the kit or the product's assets, else leave them out.
- **A drawn mark gets a close-up beside the real thing,** seen as a stranger would.
- **Otherwise choose a set on purpose:** kit `Icon filled` for Apple, Material Symbols for Android, else Phosphor, Iconoir, Radix, Tabler or Heroicons; Lucide deliberately, never reflexively.
- **Apple chrome uses SF-style glyphs;** a Lucide glyph only where no system glyph exists, as `examples/finder` does.
- **One family, one stroke weight, one size** (14 to 16px) per scene; equal boxes can still hide a heavy fill beside a thin outline.
- **Even glyphs in even boxes;** an odd icon in an even box snaps when motion ends (`half-pixel glyph`).
- **Fixed boxes don't shrink:** an icon button or chip in a flex row gets `flex: none` (`squeezed`).
- **Small icons are filled.** At 14px and under, and in tinted tiles, use the filled style; thin outlines go wiry (`examples/kit-extras`).
- **Icons are one opaque color** (`--ss-icon`, `--ss-icon-faint`, opaque text tokens); fade with `opacity` on the svg; no duotone.
- **Emoji are content, never icons.** A playful look rounds the icons, it does not swap them for emoji (`emoji icon`).
- **Other products' logos come from `BrandMark`** or a project asset, in original proportions and colors; never a look-alike (`brands.md`).
- **Center glyphs by eye:** shift a play triangle toward its point by a sixth of its width.
- **AI features get no sparkle, wand or star, and no purple as the AI color.** Show what the AI does. The product's own icon is fine even when it is a sparkle (`examples/hero-demo` uses its product's `list-sparkle`); a sparkle as generic AI decoration is not.
- **No invented logo.** A letter or glyph in a colored square is not the product's mark (film flags `invented mark`). Use the product's real mark, or a plain text wordmark.

## Color and looks

- **One neutral family** for window, sidebar and cards; a colored ground or another material differs on purpose.
- **Five inks and one accent** to start; status colors mean status; an expressive product may need more, with a clear hierarchy.
- **No redundant tonal borders.** Try the fill alone; add the border for separation, state, or because the product draws it.
- **Quiet is not faint:** check text, actions and surface against the real ground.
- **A gradient or glow serves the story or goes.**
- **The hero isn't outlined to point at it.** An accent ring with a soft halo around the card the story is about reads as a focus state nobody gave it, and a dot beside its label is a mark with no meaning. Lift it the way the product would: its own surface, the raised shadow, a label in the accent. A ring is for a field that really has focus.
- **A filled button keeps its color under the pointer:** one step of its own color, never a gray swap; success is the one real change.
- **In mono, mark the thing acted on with a solid step** in surface and weight, never a translucent wash (`examples/dark-bento`).
- **Nothing translucent overlaps.** Overlapping avatars are `Facepile`; stacked chips or cards take opaque fills (`onion skin`, `examples/figma`).
- **On dark themes depth comes from a lighter surface,** not shadow; satellites go on `--ss-raised` (`examples/linear`).
- **A light document over a dark workspace stays a readable light document** with its own foreground and edge.
- **The light inks are tuned for white cards on gray canvas;** on white, step them up a tone.
- **Status color stays legible:** success, pending and disabled distinct, never passing through mud.
- **Contrast has a purpose.** A dark editor can be identity with a clear edge; a near-black strip for no reason is a hole.
- **Grounds support the subject;** a muddy halo standing in for foreground contrast does not (`backgrounds.md`).
- **Build once, check every look:** `theme` (light, dark, blueprint, glass), `palette` (accent, mono), `fidelity` (minimal, standard, realistic); `Text` for words, tokens for color.
- **A light pass does not prove dark.** Film every look the request names; `--dark` films the dark theme; `theme="dark"` is always dark.

## Density

- **Density follows the story.** Would a person do this here? No element quota; empty space can be hierarchy; enlarge content before adding anatomy.
- **Never under about 320 wide for a demo;** a bento tile or a satellite card may be smaller. Below that, keep the action and readable type, drop the desktop anatomy.

## Chrome and devices

- **A messaging app on an iPhone keeps Messages' conventions** unless the brief gives it a look: blue sent bubbles (`--ss-accent` as the kit sets it), gray received, the plus and the mic in the composer, reactions on the bubble. "Our messaging app" names the product, not a palette; inventing an accent and a composer makes it read as a fake (`examples/messages`).
- **Does the frame help?** Browser chrome only when the browser is part of the picture; a desktop app gets its real chrome (`examples/chrome`).
- **Chrome for the task:** a sharing panel needs a document, permissions and an action; a browser bar explains nothing.
- **Columns run the full height of their window** (`Window sidebar`); a column that stops short leaves a seam (`examples/finder`).
- **Window chrome is fixed at 38px;** `barSize="tall"` (64px) only for a real icon-and-label toolbar (`examples/finder-glass`).
- **Never draw platform chrome from memory;** open the real app or a screenshot first.
- **macOS 26 Finder:** solid white window, only the floating sidebar is glass, gray glyphs, selected row on a gray pill (`examples/finder-glass`).
- **Quiet browser windows** center their content and carry a rounded, centered URL pill (`examples/static-card`).
- **A document that is not the hero is content:** a ruled page with real margins, not another window.
- **Phones come from the kit** (the frames are in `kit.md`, Phone); `photo` falls back to `pro`, never an empty bezel (`examples/phones`).
- **System surfaces keep their real proportions.** Never shrink the iOS clock; the payoff wins by content, timing and crop (`examples/dynamic-island`).
- **A notification is one bold title over its message** with `Notification`'s geometry and a real app icon (`examples/phones`).
- **Nothing sits under the island;** a sheet or grabber starts below the status bar.
- **The status bar and home indicator come from the Phone,** true to iOS, never drawn by hand. A second indicator inside the app shows as a bar that scales into place and a sliver under the real one. An app that covers a dark screen turns the Phone's `dark` off as its surface arrives, and both fade to dark.
- **A phone is lit from its first frame:** never dimmed, blacked out or faded up.
- **A phone background has a job:** `LockScreen` for notification and island stories; never invented home-screen icons (`examples/dynamic-island`).
- **A phone may straddle a window but never covers the amount it explains.**
- **Several windows:** choose the active step; quieter contrast and shadow push the others back (`examples/hero-demo`).

## A page of demos

- **One figure language:** one ground, one gutter, one window shadow (`--ss-shadow-hero`), one radius set; a different shadow says something or is a mistake.
- **Fewer, stronger demos.** No little labeled containers or text tiles when the demo says it.
- **A comparison pair shows a different demo** from the one just above it.
- **A bad example is marked in the page's own annotation style,** never with crosses or scrawls.

## Recipes

- **Scope the CSS to the demo:** nest the stylesheet under its root class (`@keyframes` outside); a prefix is not enough. Hosts styling prose by class exclude stages with `:not(:where(.ss-stage *))`.
- **`compact`** is a second design for the phone column, not a squeeze (`framing.md`, Small formats and the page).
- **Check a fresh load at each width and a resize between:** targets, clips, overlays, poster.
- **A grid of cards** is planned with `bento.md`.
