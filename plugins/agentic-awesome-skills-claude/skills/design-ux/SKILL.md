---
name: design-ux
description: UX / usability audit — heuristic evaluation of INTERACTIVE UIs (not just visual polish). Load with design when a UI "feels off", "sucks to use", is hard to learn, needs an instruction wall, or before shipping an interactive tool/editor/app. Scores the RENDERED UI against Nielsen's 10 +...
risk: unknown
source: https://github.com/connerkward/ckw-design-skill/tree/main/deterministic-design/design-ux
source_repo: connerkward/ckw-design-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/connerkward/ckw-design-skill/blob/main/LICENSE
author: Conner K Ward
---

# design-ux — usability audit (heuristic evaluation)
## When to Use

Use this skill when you need uX / usability audit — heuristic evaluation of INTERACTIVE UIs (not just visual polish). Load with design when a UI "feels off", "sucks to use", is hard to learn, needs an instruction wall, or before shipping an interactive tool/editor/app. Scores the RENDERED UI against Nielsen's 10 +...


Usability ≠ aesthetics. design-system/design-spatial make it *look* right; this checks whether a first-timer can do the task **without being told how**. Use it whenever a UI "sucks to use," needs a paragraph of instructions, or before shipping anything interactive.

## Rule 0 — fresh eyes, on the rendered artifact (inherited from design-spatial §1)

**Never self-grade.** The builder rationalizes its own UI. Render the *live* UI in its **default first-load state** (not a hand-arranged screenshot), capture an **interaction trace** of the primary task, and have a **separate judge** (a subagent/VLM that did NOT build it) score it. A described list of changes is not an audit — the audit is a fresh judge hunting for what's *wrong* on the real screen.

## The procedure

1. **Name the primary task(s)** the UI exists for (e.g. "trim a clip and set its speed, then export"). The audit is relative to these, not to abstract prettiness.
2. **Render default state + trace the task.** Screenshot the first-load UI (wide AND narrow — overflow gate from design-spatial §2). Then actually perform the primary task and screenshot each step.
3. **Score every heuristic** (table below) on the artifact: pass / violation, **severity** (blocker / major / minor), a *specifically located* finding, and a concrete fix. Separate judge does this.
4. **Prioritize**: blockers → majors → minors; cluster fixes that touch the same surface.
5. **Fix, then RE-RENDER and RE-SCORE.** Do not claim fixed without re-auditing the new artifact (verify-outputs-rule).

## Heuristics — score each (Nielsen's 10, 1994) + interaction add-ons

| # | Heuristic (Nielsen) | What to check in THIS UI |
|---|---|---|
| 1 | **Visibility of system status** | Every action has visible feedback; current state/selection/mode always legible; progress for slow ops. |
| 2 | **Match the real world** | Known metaphors & conventions (e.g. NLE: clips, trim handles, playhead) — not bespoke gestures users must learn. |
| 3 | **User control & freedom** | Undo/redo, cancel, clear exits from any state; reversible by default. |
| 4 | **Consistency & standards** | Same thing looks/behaves the same; platform conventions (⌘Z, Delete, drag-to-move) honored. |
| 5 | **Error prevention** | Invalid states made impossible; destructive actions confirmed or trivially undoable. |
| 6 | **Recognition over recall** | Options/affordances **visible** — no memorizing. *An instruction wall is a failure of this heuristic: if you must explain scroll-to-zoom / drag-edge / double-click in prose, the affordance is missing.* |
| 7 | **Flexibility & efficiency** | Defaults carry novices; shortcuts/accelerators for experts; sensible first-run with nothing configured. |
| 8 | **Aesthetic & minimalist** | Signal over chrome; no irrelevant elements competing; the *primary surface* carries the most visual weight. |
| 9 | **Recognize/diagnose/recover from errors** | Plain-language errors (not raw stderr), and a path out. |
| 10 | **Help & documentation** | Rarely needed if 1–9 hold; task-oriented, in-context, not a top-of-page lecture. |

**Interaction add-ons (compose, don't restate):**
- **Don't-make-me-think (Krug):** affordances self-evident; the UI teaches itself. Instruction paragraph ⇒ affordance debt (ties to #6).
- **Fitts / transit time (design-spatial §3):** controls sit near where the task leaves the cursor. A selected object's properties belong **adjacent to the object** (dock/popover), not in a far panel — every edit shouldn't be a round-trip.
- **Discoverability of gestures:** any non-obvious gesture (wheel, edge-drag, dbl-click) needs a **visible affordance** (handle, hover cue, icon) or it doesn't exist for most users.
- **Visual-weight match (design-spatial):** the surface the user *operates* (timeline, canvas, editor) should be the visual hero — not a thin strip under a big passive preview.
- **Progressive disclosure (design-thinking UX):** essentials first; advanced on demand. But disclosure ≠ hiding the primary tool.
- **Tooltip timing:** delay the *first* tooltip in a group (~300–700ms hover-intent) so sweeping the cursor over controls doesn't flash tips; once one is open, **peers show instantly** (no per-tooltip re-delay) while the user scans the row. Fires-on-every-hover is noise; re-delays-on-each-neighbor is sluggish.
- **Scroll-position restore:** Back/Forward returns the user to where they were, not the top — losing place after a detail→back trip is a silent, repeated tax. Browsers do this by default; the bug is *breaking* it with manual scroll resets or client routing that forgets.
- **Idempotency on submit:** mutating actions carry an idempotency key so a double-click, retry, or flaky-network resend can't duplicate the effect (a second charge, a duplicate post). Pairs with "disable submit during the in-flight request + spinner" — the key is the server-side guarantee, the disable is the client-side courtesy.

*(Tooltip / scroll-restore / idempotency from the Web Interface Guidelines, `vercel-labs/web-interface-guidelines` @ `4e799d4`, 2026-04-06.)*

## Output format

A scored table — `Heuristic | Finding (located) | Severity | Fix` — then a prioritized fix list (blockers first). Severity: **blocker** = can't complete the task / actively misleading; **major** = slows or confuses; **minor** = polish.

## Relation to the rest of design

- **design-spatial** owns the render-then-critique mechanism + Fitts/transit + overflow gate; this skill applies that lens to *usability* specifically and adds the heuristic scorecard.
- **design-thinking** owns the UX *principles* (goals/tasks, IA, feedback, accessibility, progressive disclosure); this skill turns them into a *scored audit + fix loop*.
- Run a usability audit **before** declaring an interactive UI "done" — alongside the visual critique, not instead of it.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
