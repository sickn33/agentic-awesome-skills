# Traps

Behaviour traps that hold in any app. Each has a stable ID that specs, reviews and checks cite, so a finding, a spec line and a failing check name one thing. Where `check-system.mjs` flags a trap it uses the same ID (`--explain <id>` prints the rule). A trap outranks the app's majority: when the app does it everywhere, the fix still wins and the conflict becomes a gate whose default is the fix. Add a trap only after it cost a real run. Every ID appears once.

A person describing a symptom rather than a component:

| They say | Look at |
|---|---|
| "laggy", "slow to respond" | `trap/press-delayed`, `trap/motion-input-lag`, `trap/motion-blocks-input` |
| "it jumps" | `trap/loading-layout-shift`, `trap/numbers-shift`, `trap/weight-shift` |
| "fine on my laptop, not my phone" | `trap/touch-hover-flash`, `trap/hover-unguarded`, `trap/touch-input-zoom`, `trap/viewport-height` |
| "I can't click it" | `trap/decor-pointer`, `trap/list-dead-gap`, `trap/exit-eats-input` |
| "the focus ring comes and goes" | `trap/hover-beats-focus`, `trap/open-trigger-unfocused`, `trap/disabled-drops-focus` |

## Actions and forms

| ID | Smell | Fix |
|---|---|---|
| `trap/button-div` | `onClick` on a `div` or `span` | Render `button`, or `a` when it navigates |
| `trap/role-button` | `role="button"` on anything but `<button>` | Same. Enter, Space and disabled must not be rebuilt by hand |
| `trap/native-control` | `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>` outside the ui folder when the system has the component | Use the system component |
| `trap/link-as-button` | An `<a>` with a background and padding, or a Button `variant` on a link | One element: a Button that renders as the link |
| `trap/link-wraps-button` | A link around a button, or the reverse | One element. Two tab stops for one action is the bug |
| `trap/button-clone` | Another element carrying the Button's classes | Render the Button |
| `trap/button-icon-name` | An icon-only button with no accessible name | Name it in every variant |
| `trap/button-type` | A button in a form with no `type` submits twice | Default `type="button"` |
| `trap/button-label-wrap` | A label wrapping to two lines at 390 px | `white-space: nowrap`, a shorter label or a full-width button |
| `trap/control-height` | Button, input and select side by side at different heights | One height token per size. Measure, never read source (more than 1 px apart fails) |
| `trap/submit-repeat` | A pending submit accepts a second click or Enter | `aria-disabled` and an early return, focus kept |
| `trap/loading-label-swap` | `{saving ? "Saving..." : "Save"}` | Keep the idle label, put a spinner inside the same box, set `aria-busy` |
| `trap/loading-layout-shift` | The box changes size between idle and pending | Measure idle and pending. Any change fails |
| `trap/disabled-drops-focus` | A focused control turns `disabled` while it runs and focus falls to `body` | `aria-disabled`, not `disabled`, while pending |
| `trap/disabled-still-hovers` | A disabled control still changes colour on hover | Hover styles skip `[disabled]` and `[aria-disabled]` |
| `trap/hover-beats-focus` | Hover removes a focus ring or border | State order is focus and invalid over hover |
| `trap/weight-shift` | Font weight changes on hover or selection | Show the state with colour, fill or an underline |
| `trap/focus-ring-shape` | The ring ignores the radius or is clipped by `overflow` on a parent | Draw it with an outline that follows the radius |
| `trap/field-label` | A placeholder is the only name | A visible label bound to the control |
| `trap/label-unbound` | `<label>` with no `htmlFor` and no control inside | Bind it. Clicking it must focus the control |
| `trap/field-input-type` | A field with no `type`, `autocomplete` or `inputmode` | Set all three per field kind |
| `trap/field-affix-focus` | An icon or prefix beside the input, not inside its box | Put it inside the hit area, or make it its own named button |
| `trap/field-form-enter` | Fields outside a `form`, so Enter does nothing | One `form`, one submit, native constraints passed through |
| `trap/field-error-link` | Error text near the field but not tied to it | `aria-invalid` plus `aria-describedby` |
| `trap/field-error-timing` | Errors on the first keystroke | First show on blur or submit, then live |
| `trap/date-local-midnight` | A date-only value passed through a midnight `Date` (`new Date("2025-03-15")`) and shown or sent in another zone | Keep it a `YYYY-MM-DD` string, or read and write it in UTC. Test west of UTC |
| `trap/field-keeps-input` | A failed request clears what was typed | Keep every entered value |
| `trap/required-everywhere` | A required marker on every field | Mark the rarer of required and optional |
| `trap/touch-input-zoom` | Input text under 16 px on a phone | 16 px at touch widths. Never disable pinch zoom |
| `trap/zoom-disabled` | `user-scalable=no` or `maximum-scale=1` | Remove it |
| `trap/touch-autofocus` | `autoFocus` on a page field | Drop it on touch unless typing is the only job |

## Choice, toggles, overlays, menus

| ID | Smell | Fix |
|---|---|---|
| `trap/select-value-lost` | A select drops its value when the form errors or options reload | The value outlives errors and refetches |
| `trap/select-empty-value` | No way back to "none" in an optional field | A clear control or an explicit empty option |
| `trap/select-async` | "No results" flashes while the search runs | Loading wins over empty |
| `trap/toggle-switch-submit` | A switch that only applies on Save | A switch acts at once. Otherwise it is a checkbox |
| `trap/toggle-indeterminate` | "Select all" with no mixed state | Three states, each defined |
| `trap/overlay-title` | A dialog with no title | A title part, visible or hidden |
| `trap/overlay-focus-return` | Focus lands on `body` after close | Return to the opener. If it is gone, to a named fallback |
| `trap/overlay-conditional-render` | `{open && <Dialog>}` | Keep it mounted and pass `open` |
| `trap/overlay-destructive` | A destructive confirm that closes on an outside click | Only Cancel and Escape dismiss it |
| `trap/overlay-pending-dismiss` | Cancel or Escape closes a dialog mid-submit | Block dismissal while pending |
| `trap/overlay-no-max-height` | A dialog taller than a 320 px screen with no scroll | `max-height: calc(100dvh - 2rem)` and `overflow-y: auto` |
| `trap/exit-eats-input` | A press during the exit animation reopens or is lost | The exiting layer takes no pointer input |
| `trap/escape-nested` | Escape closes the dialog behind an open menu | Escape closes the top layer only |
| `trap/open-trigger-unfocused` | An open menu's trigger looks like it does at rest | Show the focus look while open |
| `trap/menu-navigation` | Navigating items built as buttons | Links, so new-tab works |
| `trap/menu-only-path` | An action reachable only by right-click or hover | A visible second path |
| `trap/menu-diagonal` | A submenu closes on a diagonal pointer path | A short delay or a safe area |
| `trap/list-dead-gap` | Rows separated by margin, so the gaps do nothing | Padding, so hit areas touch |
| `trap/tooltip-essential` | Information only a tooltip holds | Put the text on the page. A tooltip repeats it |
| `trap/tooltip-disabled-trigger` | A tooltip explaining a disabled button | Visible text, or an `aria-disabled` button that stays focusable |
| `trap/tooltip-interactive` | A link inside a hover tooltip | Text only. Anything clickable is a popover |
| `trap/toast-errors` | An error that needs action shown only in a timed toast | Persist it until closed or acted on |
| `trap/toast-timer` | The timer keeps running under the pointer or in a hidden tab | Pause on hover, focus and hidden |
| `trap/live-region-double` | Two layers announce one message | One announcing layer |

## Navigation, data, layout

| ID | Smell | Fix |
|---|---|---|
| `trap/tabs-routes` | Tabs that change the URL built as a tablist | Links with `aria-current`, or panels, not both |
| `trap/current-unmarked` | The current item looks different and is not marked | `aria-current` or `aria-selected` |
| `trap/narrow-hidden-nav` | At 390 px nav links or columns sit past a clipped edge with no cue | A menu button, a wrap, or a fade at the edge. A gate lists each hidden item |
| `trap/link-cue` | A link in body copy with no underline and the text's colour | A resting cue. Changing it is a gate listing every surface |
| `trap/table-divs` | A table made of divs | A table, or the grid role with its keyboard model |
| `trap/chosen-text-truncated` | A name or other text the user chose to identify something, cut with an ellipsis | Wrap it. It never truncates |
| `trap/empty-value` | A blank cell, a typed dash here, "N/A" there | One primitive for empty values, announced as "None" |
| `trap/numbers-shift` | Changing numbers in proportional figures | `font-variant-numeric: tabular-nums` |
| `trap/color-only-status` | Status told by colour alone | Text or an icon carries it |
| `trap/text-measure` | Reading text over 75ch or under 30ch per line | `max-width` in `ch` on reading columns |
| `trap/overflow-scrollbar` | `overflow: auto` on a box 1 or 2 px short of its content | Leave room, or clip |
| `trap/viewport-height` | `100vh` or `h-screen` on a shell or sheet | `dvh`, or `svh` when it must not change while scrolling |
| `trap/safe-area` | Controls under the notch or home indicator | `env(safe-area-inset-*)` with `viewport-fit=cover` |
| `trap/scroll-chain` | Scrolling a panel to its end scrolls the page | `overscroll-behavior: contain`, and lock page scroll under a modal |
| `trap/decor-pointer` | A glow or gradient layer above content takes clicks | `pointer-events: none` on decoration |
| `trap/touch-hover-flash` | Hover styles apply on tap and stick | Put them in `@media (hover: hover)` |
| `trap/hover-unguarded` | A `:hover` rule outside that media query that reveals content | Guard it and give touch another path |
| `trap/touch-tap-highlight` | The tap highlight removed and no pressed style | A pressed state from pointer-down |
| `trap/press-delayed` | Press feedback waits for release or an animation | Feedback within 100 ms of pointer-down |
| `trap/surface-double-edge` | A border and a shadow on one surface, undecided | Border on resting surfaces, shadow on raised ones |
| `trap/weight-synthesized` | A weight token the loaded font files lack | Tokens only name weights that exist. `font-synthesis: none` shows the gap |
| `trap/illustration-announced` | An HTML illustration read out as fragments | `role="img"` with a label, or `aria-hidden` |
| `trap/loader-small-dots` | A dot loader under 20 px | A thin ring |
| `trap/gesture-drag` | A drag that drops when the pointer leaves or jumps on a second touch | Pointer capture, ignore extra touches, decide release on speed |
| `trap/gesture-axes` | The element and the page both move on one swipe | Set `touch-action` to the axis the element owns |

## Motion

| ID | Smell | Fix |
|---|---|---|
| `trap/motion-transition-all` | `transition: all`, `transition-all` | Name the properties, usually `transform` and `opacity` |
| `trap/motion-ease-in-enter` | An entrance with `ease-in` | Enters ease out |
| `trap/motion-exit-slower` | An exit longer than its enter | Exit shorter than enter |
| `trap/motion-overshoot` | A `cubic-bezier` with a value outside 0 to 1 on a routine change | Keep inside 0 to 1 |
| `trap/motion-linear` | Linear easing on anything but progress and loops | Ease out for enters, symmetric between two points |
| `trap/motion-frequent` | Entrance motion on nav, list rows or primary actions | None, or first open only |
| `trap/motion-input-lag` | An element that follows the pointer through a curve | Track the input each frame, carry release velocity |
| `trap/motion-blocks-input` | An entrance that ignores clicks until it ends | Take input at once |
| `trap/motion-origin` | A menu grows from its own centre | Grow from the trigger. Exit reverses entry. Dialogs stay centred |
| `trap/motion-restart` | A retrigger restarts from the start value | Continue from the current value |
| `trap/motion-layout-property` | Animating width, height, top, left or margin | `transform` and `opacity` only |
| `trap/reduced-motion-ignored` | Animation under `prefers-reduced-motion: reduce` | Drop movement, keep the fade that explains the state |
| `trap/loop-offscreen` | A loop that runs off screen or in a hidden tab | Pause out of view |
| `trap/theme-transition` | A theme switch fires every hover transition | Disable transitions for that frame |
| `trap/demo-on-timers` | A showcase demo stepping on `setTimeout` | Wait on `getAnimations()` and `finished` |
