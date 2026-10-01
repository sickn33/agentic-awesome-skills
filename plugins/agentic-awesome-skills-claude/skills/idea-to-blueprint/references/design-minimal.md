# Design direction, flows and screens — minimal by default

Contents: 1 Reference vs chosen direction · 2 Minimal pattern catalog (do / don't) · 3 User flow format · 4 Screen inventory format · 5 Design tokens format · 6 RTL rules · 7 Accessibility baseline · 8 Persona-driven design decisions

## 1. Reference vs chosen direction

**User gave a reference** (Figma, screenshots, a product, a brand kit): extract and document — colours, type, spacing rhythm, component shapes, navigation model, tone of imagery. Keep what serves the personas; note every deviation you make and why (usually usability, RTL, contrast, or minimalism). The build sessions need the tokens, not a link to a Figma they cannot open.

**No reference**: choose, don't defer. Default direction unless research says otherwise:
- Mobile-first, single-column, generous spacing, one primary action per screen.
- Standard components from a well-documented, actively maintained design system verified this session (RTL support and accessibility documented), themed lightly — no custom component library in v1.
- Neutral palette with one accent for primary actions and semantic colours for states; high contrast; no gradients or decorative illustration in v1 unless the category demands warmth (then one illustration style, used sparingly).
- Typography: one Persian/Latin-capable font family, 4–5 sizes, two weights.
- Motion: functional only (state transitions ≤ 200 ms), respects reduced-motion.
State the chosen direction in the Decision brief in one line so the user can object once.

## 2. Minimal pattern catalog

Do (default choices):
- **List → detail** for any collection; no dashboards in v1 unless the persona's job *is* monitoring.
- **One primary action per screen**, sticky at the bottom on mobile; secondary actions as text buttons or in an overflow menu.
- **Progressive disclosure**: show the 3–5 fields most people need; "advanced" behind one toggle.
- **Forms**: single column; labels above fields; inline validation on blur and on submit; the submit button disabled only for *impossible* states, otherwise enabled and showing errors; numeric keyboards for numeric fields; phone-first auth where the market expects it.
- **Wizard only when a form exceeds ~7 fields or has dependent steps**; show progress; allow back without loss.
- **Optimistic UI + Undo** for reversible actions; **consequence-stating dialog** for irreversible ones.
- **Empty, loading, error, offline states designed for every list and screen** — they are screens, not afterthoughts.
- **Search + 1–2 filters** rather than complex filter panels; recent items where it saves a search.
- **Bottom sheet** on mobile for pickers and short actions; full screen for anything that needs more than one decision.
- **Tabs ≤ 4**, otherwise a list.
- **Onboarding = do the first real task**, with inline guidance; no multi-screen tour; ask for permissions (notifications, location) at the moment they are needed, with the reason.
- **Skeletons** for < 1 s loads; text status for longer.
- **Consistent destructive colour and placement**; destructive actions never the default focus.

Don't (in v1 unless a persona demands it): carousels for content that matters, hover-only affordances, custom gestures, infinite settings screens, modal-on-modal, disabled buttons without explanation, icons without labels for primary actions, confirmations for reversible actions, sign-up before showing value, dark patterns of any kind (pre-checked upsells, hidden cancel).

## 3. User flow format

```
### F-03 — <Flow name> (P1)
**Job** — what the persona is trying to get done, in one line.
**Trigger** — how they arrive (deep link from SMS, home screen, notification).
**Preconditions** — logged in? has data? feature flag?
**Steps**
| # | Screen | User does | System responds | Copy | Notes |
|---|---|---|---|---|---|
| 1 | SCR-03 | enters phone | validates, sends code | CP-SCR03-1,4 | ≤ 11 digits |
| 2 | … | | | | |
**Decision points** — at step n: if <condition> → branch A (steps …) else → branch B.
**Failure branches** — for each step: what can fail (from edge cases), what the user sees (copy IDs), how they recover, what is persisted.
**Exit** — where the flow ends and what state the system is in.
**Success metric** — M-x.y; time-to-complete target `[ASSUMED]` if hypothetical.
**Benchmark note** — which best-in-class behaviour this adopts (S-nn) and what we do differently.
```

Flows to include for most products: first run / onboarding, sign-in and re-authentication, the core loop (per persona), money flows (pay, refund, receipt), recovery flows (forgot/lost access, offline, session expired), notifications and their deep links, account settings and deletion, admin/back-office core tasks, error and empty first-use states as flows where they are non-trivial.

Keep flows to the **minimum number of steps** that still respects the persona's decision points; count steps and taps and state them — that number becomes an acceptance criterion.

## 4. Screen inventory format

```
| ID | Screen | Purpose (one line) | Personas | Entry points | Primary action | States covered | Copy IDs | Edge cases |
```
Then one paragraph per screen: layout summary (what is above the fold on a 360-px-wide phone), components used (from the design system by name), the single primary action, secondary actions, what changes per persona/role, and what the screen looks like in each state (empty / loading / error / offline / success / permission-denied where relevant).

Screens are counted: a product with 40 screens in v1 has a scope problem — revisit section 2 before writing copy for all of them.

## 5. Design tokens format

```
Colour: bg, surface, text-primary, text-secondary, accent, accent-text, success, warning, danger, border, focus-ring — as hex, with contrast ratios noted against their usual backgrounds.
Type: font families (Persian, Latin, mono) with self-hosted files and license; scale (display, h1, h2, body, small, caption) with size/line-height/weight; Persian line-height factor.
Spacing: base unit and scale (4/8/12/16/24/32/48).
Radius, elevation/shadow levels, border widths.
Breakpoints: mobile ≤ 600, tablet ≤ 1024, desktop.
Component list: from the design system, with the props/variants allowed in v1 (e.g., Button: primary/secondary/text/danger; sizes md/lg).
Iconography: set name and license; which icons flip in RTL (arrows, back, send) and which do not (clock, search, play).
Motion: durations, easing, reduced-motion behaviour.
```

## 6. RTL rules (when the product language is RTL)

- The document direction is `rtl` at the root; layout mirrors via logical properties (start/end), never left/right.
- Directional icons flip; symmetric and semantic icons do not; media controls follow platform norms (verify).
- Numbers and Latin tokens are isolated (bidi) inside RTL text; phone numbers and codes render LTR as a unit.
- Progress and sliders fill from the start (right) side; back buttons point right; carousels (if any) advance to the left.
- Test every screen with long Persian strings (Persian runs ~20–30 % longer than English in many labels) and with mixed content.
- Fonts: confirm the chosen font covers Persian digits and the ZWNJ renders as zero width in the target browsers.

## 7. Accessibility baseline

Reference the current accessibility standard and level after verifying its version this session. Non-negotiables for every UI story's AC-7: text contrast ≥ 4.5:1 (3:1 for large text and UI components), touch targets ≥ 44×44 px, visible focus ring, full keyboard operability on web, labels for every input and icon button, live regions for async errors/success, no information by colour alone, `prefers-reduced-motion` respected, text resizable to 200 % without loss, meaningful page titles and headings order, form errors associated to fields. Screen-reader language attribute set to the product language so pronunciation is right.

## 8. Persona-driven design decisions

For each persona sheet trait, write the design consequence in section 9 (the same way §2 of the UX writing guide does for copy): low-end device → lightweight pages, no heavy media, offline tolerance for reads; poor network → optimistic UI, retry with backoff, small payloads; busy shop floor → large targets, high contrast, two-tap core action; older or low-vision users → larger base font, simpler navigation; admin power user → dense tables, keyboard shortcuts, bulk actions. These consequences become acceptance criteria (performance budgets, tap counts, target sizes) rather than adjectives.
