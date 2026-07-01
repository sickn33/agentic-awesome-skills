# Motion choreography — a generalizable animation guideline

When to animate, which transitions earn their keep, how long, and the craft that
separates intentional motion from jitter. **Framework-agnostic** — the rules hold for
plain CSS, the Web Animations API, the browser View Transition API, a JS motion library,
or React's `<ViewTransition>`. Load from design-system's Motion section when a UI has
state changes, navigation, list changes, or reveals worth animating.

> Adapted & generalized from the Web Interface Guidelines (`vercel-labs/web-interface-guidelines` @ `4e799d4`, 2026-04-06) and the React View Transitions skill (`vercel-labs/agent-skills` @ `f8a72b9`, 2026-06-10). Their API specifics are React/Next-bound; the *choreography* below is portable.

## 1. When to animate — earn every transition

Animate only when the motion **communicates** one of: a spatial relationship, continuity
("same thing, new place"), cause→effect, that data arrived, or deliberate delight.
**If you can't articulate in one sentence what a transition communicates, cut it.** Motion
with no message is noise that costs performance and attention.

- **Input-driven, never autoplay.** Animate in response to a user action or a state change
  they caused — not on a timer that plays at them.
- This is the motion-specific case of restraint-rule: the default is *no* animation; a clear
  communicative purpose is what forces a yes.

## 2. Which transitions earn their keep — priority order

When several kinds of change happen, implement every one that *applies* (not "pick one"),
in roughly this order of value:

1. **Shared element** — the same object persists across views (thumbnail → hero). Says "this
   is the same thing, going deeper." Highest value; most worth the effort.
2. **Reveal** — skeleton/loading → real content. Says "data loaded."
3. **List identity** — items keep identity as the set reorders/filters. Says "same items,
   new arrangement" (animate position, not a wholesale fade).
4. **State change** — something enters/exits (panel, toast, row). Says "this appeared/left."
5. **Route/section change** — moving to a new place.

Skip a level only when the UI has no such change. A background refresh / silent
revalidation should animate **nothing**.

## 3. Style by the *kind* of navigation — direction must be honest

The animation style must not imply a spatial relationship that isn't there:

| Navigation kind | Animation | Why |
|---|---|---|
| **Hierarchical** (list → detail, parent → child) | directional slide (in from the side, out the other) | direction encodes depth |
| **Ordered sequence** (prev/next photo, carousel, paginated) | directional slide; "next" from the right, "prev" from the left | direction encodes position |
| **Lateral / sibling** (tab ↔ tab, unordered) | **fade / cross-fade** — NOT a slide | there's no depth; a slide lies about it |
| **Reveal** (skeleton → content) | fade or short slide-up | content arriving |
| **Background refresh / revalidation** | none | nothing happened the user must track |

The single most common motion mistake is a directional slide on lateral navigation — it
falsely implies forward/back depth between peers.

## 4. Timing & easing (starting points, not law)

| Interaction | Duration |
|---|---|
| Direct toggle (expand/collapse, switch) | 100–200 ms |
| Route / section transition (slide) | 150–250 ms |
| Reveal (skeleton → content) | 200–400 ms |
| Shared-element morph | 300–500 ms |

- **Easing matches the change:** entrances `ease-out` (decelerate in), exits `ease-in`
  (accelerate away), positional moves `ease-in-out`. Choose by what's changing (size,
  distance, trigger) — bigger/further → a touch longer.
- A playful/toy direction (design-thinking) may stretch these and add spring/bounce; a
  restrained/professional one keeps them tight. Match the feel to the chosen direction
  rather than defaulting to the numbers.

## 5. Mechanics — what to animate, and how (any stack)

- **Compositor-friendly only:** animate `transform` and `opacity`. **Never** animate layout
  properties (`width`, `height`, `top`, `left`) — they trigger reflow and jank.
- **Never `transition: all`** — list the exact properties; `all` silently animates
  layout-affecting props and janks.
- **Correct `transform-origin`** — anchor motion where it "physically" starts (a menu from
  its trigger, not screen-center).
- **Interruptible** — a new user input cancels/redirects the in-flight animation; motion is
  never a modal wait.
- **SVG transforms** — apply to a `<g>` wrapper with `transform-box: fill-box;
  transform-origin: center;` (avoids Safari origin bugs).
- **Stack preference:** CSS > Web Animations API > JS library. Prefer the platform; reach for
  a library only when the platform can't express it.

## 6. Craft details that separate polished from amateur

- **Motion blur on morphs.** A shared-element morph reads as fast and physical with a brief
  blur at mid-transition (e.g. `filter: blur(3px)` around the 30% mark), clearing to sharp.
- **Don't raster-scale text.** A shared-element morph between different text sizes (`h3 → h1`)
  scales a *bitmap* of the small text up → a blurry ghost. Instead hold/cross-fade the text
  (show the new text at full resolution, hide the old snapshot) rather than scaling it.
- **Isolate persistent chrome.** Headers, navs, sidebars, sticky toolbars that stay on screen
  across a transition must NOT slide with the page content — give them their own transition
  identity (or exclude them) so they stay put while content moves beneath.
- **Reveal anti-flicker.** If you show a spinner/skeleton, add a short show-delay (~150–300 ms)
  and a minimum visible time (~300–500 ms) so a fast response doesn't flash the loader. (See
  design-ux interaction add-ons.)

## 7. Accessibility — reduced motion

Honor `prefers-reduced-motion` for **public / multi-user** builds: drop the tweens (keep the
end state / a 0s cross-fade), don't remove the information the motion conveyed. For
**personal/single-user** projects this repo deliberately overrides that flag — see
`motion-preference-rule`. Either way, avoid parallax, large viewport-spanning transforms, and
strobing regardless of the flag.

## The one-line test

Before adding a transition: *what does this communicate, and is the style honest about it?*
If you can't answer the first, cut it; if the style implies depth/position that isn't there
(a slide between peers), change the style.
