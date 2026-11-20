# Components

What one canonical component per family has to carry before anything migrates onto it. Each rule exists because a migration found the gap one screen at a time.

## One per family

- Group the inventory into families (button, input, dialog, badge). Pick the implementation with the most real uses, the best accessibility and the fewest props that carry its job. Everything else in the family is a duplicate and gets an old-to-new map.
- A registry file lists every canonical component with its import path, status and what it replaces. `rule/unregistered-ui` and `rule/deprecated-import` read it.
- Keep a stock library component stock. Deprecate wrappers the app wrote, never the foundation's own. A file you customize goes on the drift list with its hash, and `rule/stock-edit` fails on any edit made after.
- Prefer composition (`asChild`, `render`) to a `variant` that changes the element.

## The census comes before the pilot

List every primitive the app renders, not only controls. Count call sites for text, small text (meta, caption), icon, badge tones, icon-button tones, link, divider. The text primitive and the small-text primitive ship in wave 1 with Button. A migration that starts without them reaches for raw `<p>` and `<span>` on every screen, and each one becomes a gap row later.

## Variants and states

- State order, strongest first: disabled, invalid, focus, pressed, hover, selected, rest. Hover never overrides focus or invalid. Hover skips disabled controls.
- The one pending fix. The idle label stays, a spinner sits inside the same box, `aria-busy` is set, and `aria-disabled` with an early return blocks a repeat while focus stays put. Never `disabled`, never a swapped label, never a changed width.
- Required is not drawn red on a disabled control.
- Every primitive has a default accessible name and a `label` override, stated in its doc. A size toggle that renders "S" "M" "L" needs "Small", "Medium" and "Large" underneath.
- State words are honest in states a fixture never reaches. Use `selected`, `queued`, `uploading`, `done`, and test the picked, pending and error-inside-a-collapsed-section states.
- Never make `title` or `children` required on a primitive. Legacy screens omit them, and each required prop became a gap row.
- A default that gates a destructive or typed action (a confirmation phrase match, a focus default) changes only with the owner's ruling and a caller list. Verify the riskiest callers before any sweep.

## Behaviour contract

For each interactive primitive write a table of what fires when, and make each row a test.

| Event | What happens | Test |
|---|---|---|
| Enter or Space right after a picker opens | Nothing is written. Selection needs an arrow key or a pointer | open, press, assert 0 writes |
| Escape in a dialog | Closes the top layer, focus returns to the opener | assert `document.activeElement` |
| Confirm success, confirm failure, opener removed | Focus lands on the opener, on the opener, on the next row or the list | assert each |
| Typed text the sanitizer would change | The keystroke is ignored, not committed as something else | type `2.5`, assert the box and the value |
| Text the control cannot parse | Submit is refused and the field shows why. The last good value is never sent | type `abc`, submit, assert 0 requests |

Every overlay and form primitive's PR carries its focus-return matrix.

## Layout

- Tables have a responsive plan, not only `hideBelow`: a primary flexible column, a minimum width and a stacked tier. Measure that row controls stay reachable inside the scroller at 390, 768, 1280 and 1920. A column newly hidden at 390 is always a gate.
- Templates expose a named width, a per-route column override (the deepest route wins) and an aside slot. A visible shift at 1280 came from two systems with different wide tokens and padding. Keep one page width per section and give reading content a measure inside it (`trap/text-measure`), rather than narrowing one page.
- A change to the shell or a page template is verified on one downstream route per layout family at three widths. Compare main `scrollHeight` with `clientHeight`, check centring on auth pages, and count `aria-current` per tablist.
- Removing or renaming a system API sweeps every caller in the same change, dirty files included, or keeps an alias for one wave. Typecheck the whole consumer set afterward.
- Docs that ship with a component run in this order: description, examples, variants, states, props, usage, accessibility, tokens, related. `design-how-component-docs` writes them.
