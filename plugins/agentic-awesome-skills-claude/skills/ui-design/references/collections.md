# The design skill collections

Six collections, each with a stage where it leads (`SKILL.md § Which collection leads, stage by stage`). For each, this file gives:
- what it is;
- what to take from it, distilled so the checklist works without installing it;
- what to keep out;
- how to get it.

**Over all of them: the kit binds and the collections advise.** A suggestion reaches code only as a token or a primitive in the kit, recorded in the kit README. Where a collection disagrees with `method.md`, the method wins. Where two collections disagree, § Where they disagree says which side this skill takes.

The collections were rechecked at their source on `2026-11-05`: Taste 2.5.0, Impeccable `c8891a9a`, UI/UX Pro Max `b7d5353`, and the installed official `frontend-design` plugin. Taste's app-screen checklist below preserves its last app chapter at `939b564`; the current release removed that run. Paths in brackets are inside each repository, so a claim can be checked. They change often, so re-read one before relying on a detail that matters.

## `frontend-design` (Anthropic): direction, always on

**What it is.** A design lead's brief: make choices specific to this subject, not the defaults any similar page would get. ([anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design).) Enable it in the product's committed settings so every checkout has it (§ How a product gets them).

**It leads when there is no look yet, or the look is the problem.** That means the first directions put to the owner before any screen is built, a public page whose job is to persuade (the front door, pricing), and a surface someone has called generic or templated. Once a direction is picked it stops leading: a new screen composes the kit rather than getting a direction of its own.

**Take:**
- **Ground it in the subject.**
  - Name the subject, the audience and the design's one job.
  - Distinctive choices come from the subject's own world: its materials, its vernacular, its real units.
- **Plan, review the plan, then build.**
  - The plan: a palette of 4–6 named values, the typefaces and their roles, a layout concept (wireframes to compare), and the principles.
  - Before building, revise any part that reads like the default you would produce for any similar page, and say what changed.
- **The tells of generated design.** These are defaults, not choices; don't spend free choices on them:
  - warm cream with a serif display and a terracotta accent;
  - near-black with one acid accent;
  - broadsheet hairlines with zero radius;
  - the SaaS card kit: identical rounded cards with one radius and one soft shadow, and gradient washes;
  - template chrome: tracked all-caps eyebrows above every heading, meta strings joined with middle dots, "WORD — fragment" labels, tinted near-black standing in for black, mono for small data labels, a `→` appended to links.
- **Type.**
  - One family or two, and if two, clearly distinct. A set scale.
  - Lines under 80 characters.
  - No single accented word in a headline, no all-caps labels, no labels nobody needed above content.
- **Structure encodes information.** Number things only when they are a real sequence.
- **Motion is rare.**
  - One orchestrated moment beats an entrance on every section.
  - Motion that answers a person's action (opening, expanding, confirming) is welcome.
  - Reduced motion is respected.
- **Restraint.** Spend boldness in one place, and remove one accessory before calling it done.
- **Words.**
  - Name things in the person's terms, not the system's.
  - Legible to new users beats clever.
  - Use active voice, and make a button say what happens.
  - An action keeps its name through the flow ("Publish" → "Published").
  - An error says what happened and how to fix it, and never apologises.
  - An empty screen is an invitation to act.
  - Sentence case.

**Keep out.** Nothing to strip, but its boldness is for direction. On a screen people work in, Taste and the method lead.

## UI/UX Pro Max: candidates for a "which one"

**What it is.** A searchable local catalogue, rather than a point of view. It has:
- 79 styles;
- 192 product profiles with palettes and font pairings;
- chart types;
- about 120 UX rules;
- rules for 22 stacks.

A Python script queries it and can also generate a whole design system. ([nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), MIT.)

**It leads when a decision needs options to choose between.** Examples: a palette for a second direction, a chart for a kind of data, or a stack's form-validation convention. Take the pick into the kit by hand. For web work, use `references/quick-reference.md` §1 Accessibility, §2 Touch & Interaction, §3 Performance, §8 Forms & Feedback and §9 Navigation Patterns before Impeccable's audit. Its pre-delivery checklist in `references/pro-rules.md` is native/mobile only (read `2026-11-05`).

**Take** (its `references/quick-reference.md`, `data/ux-guidelines.csv`, `data/stacks/html-tailwind.csv`):
- **Contrast and touch.**
  - Text 4.5:1, large text 3:1.
  - Meaningful icons and control boundaries 3:1.
  - Focus rings 2–4px, at 3:1 against their surroundings.
  - Sticky bars and overlays never hide the focused control.
  - Targets: the method's 44px (WCAG 2.2's floor is 24 × 24), with 8px between touch targets.
  - Every drag has a single-pointer and a keyboard alternative.
  - Sign-in allows password managers and paste.
  - A changed count is announced as a whole phrase (`<span role="status" aria-atomic="true">3 items in cart</span>`), never a bare number.
- **Forms.**
  - Every field has a visible label; a placeholder is not one.
  - An error sits below its field, linked with `aria-describedby`.
  - After a failed submit, focus goes to a linked error summary while the inline errors stay.
  - Validate on blur, not on every keystroke.
  - Helper text explains a field before an error is made.
  - Multi-step forms show progress and a way back or out; keep what was entered so nobody enters it twice (WCAG 2.2 A, redundant entry).
  - Autosave long forms and restore drafts after interruption.
  - An error names the cause and the fix.
  - Read-only looks different from disabled.
  - Bulk deletes can be undone.
  - Closing a sheet with unsaved changes asks first.
  - Toasts are `aria-live="polite"` and never take focus.
- **Layout.**
  - Never disable zoom.
  - `min-h-dvh`, not `100vh`.
  - One z-index scale, never `z-[9999]`.
  - Body text 16px or more on phones.
  - Tabular figures for data, prices and timers.
- **Navigation.**
  - The current item is visibly marked: neutral, per the method.
  - Breadcrumbs from three levels deep.
  - Back restores scroll, filters and input.
  - After a route change, focus moves to the main content.
  - Destructive items sit apart from the rest.
  - An unavailable destination says why instead of disappearing.
  - Onboarding is skippable (`data/ux-guidelines.csv`, row 88).
- **Charts.**
  - A table alternative.
  - No pie above five categories.
  - Marks 3:1 against the background, labels 4.5:1.
  - Empty, loading and error states.
  - Locale-aware numbers, and the time granularity labelled.
  - Sortable tables expose `aria-sort`.
- **Tailwind and Next.js.**
  - Complete class names, never interpolated ones (`` `bg-${c}-500` ``).
  - Colours declared in the theme and used by role (`bg-primary`), not by arbitrary value.
  - `text-balance` on headings, never a hand-placed `<br>`.
- **Retheming an existing product.**
  1. Audit the hard-coded values.
  2. Map each to a semantic role: background, surface, foreground, primary, border, ring.
  3. Migrate in small batches.
  4. After each batch, check contrast, states and both themes.

  In its words: "add missing tokens rather than creating a parallel theme system."

**Keep out:**
- **A second design system.** `--persist` writes `design-system/<project>/MASTER.md` and per-page overrides. The `uipro init` CLI copies its files into the repository.
- **The plugin installs every skill in its repository** (`.claude-plugin/plugin.json` points at the whole `.claude/skills/`), not only this one:
  - `brand`, which writes brand docs and design-token files;
  - `design-system`, which downloads stock images;
  - `design`, which generates logos through external image APIs and tells the agent to fix failing scripts itself;
  - `ui-styling`, which ships shadcn scripts and fonts;
  - `banner-design` and `slides`, which are outside app-screen work.

  Use only `ui-ux-pro-max`.
- **Its generated palettes are raw hex** and its product profiles are generic. For example, "SaaS" maps to glassmorphism, which the other two collections ban; AI/Chatbot defaults to a violet primary (`#7C3AED`, read `2026-11-05`), not a choice for this product. Treat a palette as a candidate to measure with `scripts/color.py`, never a decision.
- **`stack/.mcp.json` starts three MCP servers at `@latest`**: `@playwright/mcp`, `chrome-devtools-mcp` and `shadcn` (read `2026-11-05`). A catalogue lookup needs none of them; do not import its stack configuration.
- **Its truncation rules:** ellipsis with a tooltip, `truncate`, `line-clamp`. The method refuses them; keep its wrapping rules, which match ours.
- **`references/pro-rules.md`** is scoped to native mobile apps by its own notice.

**Get it.** In Claude Code:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

It needs Python 3 (standard library only), and the search makes no network calls.

## Taste: the app-screen checklist

**What it is.** This checklist distils Taste's last [app-screen chapter at `939b564`](https://github.com/Leonxlnx/taste-skill/blob/939b564/skills/taste-skill/references/app-screens.md) (`2026-10-31`, MIT), drawn from 23 measured product screens. Taste 2.5.0 and later is a page system for company websites; 2.5.0 removed the chapter and the old draw, assets, lint, inspect and scenes pipeline (read `2026-11-05`). Its current run and its `motion.md`, `icons.md` and `system.md` are page rules, not app-screen guidance.

**This checklist leads on screens people work in:** dashboards, admin, tables and lists, settings. Run it here; it needs no Taste install or scripts. With a kit in place, the kit is the style. (`2026-11-03`, an evals product: this distillation had kept the restraint and dropped the counterweights; its owner called the result "like a database".)

**Take** (the preserved app chapter unless named):
- **Quiet is the starting point, not the goal.** Show the product's people, objects, numbers and the one thing to do next.
- **Give the product a face.** Choose it before building and check it on the first screenshot: its mark and name in the shell, one element only this product has, its chart hue on the main data element, its people and objects as themselves, and words of the trade rather than "Items", "Records" or "Status".
- **The screen's one question.**
  - Write it in one line. The biggest block answers it, and the largest figure answers the title row's sentence.
  - The screen's one finding goes under the title.
  - The most frequent job is one click from the first screen.
  - At 1440 × 900, every block shows its header and first rows. Cap lists at 4–6 rows, with "View all".
- **Data that tells the truth.**
  - Totals are computed from the rows.
  - A change is the difference of the two values as displayed.
  - Every relative figure names its baseline ("vs prior 30 days").
  - A fact shown twice is one variable (the method's *one function per state summary*).
  - Show the evidence beside the answer: a figure with one line on the event behind it.
  - No lorem, "Acme" or vanity totals.
- **Shell.**
  - Product mark and name at the top, with the workspace as a switcher.
  - A sidebar about 230px wide.
  - The current item is a neutral grey pill on light screens, brighter text on dark.
  - Group labels in sentence case, never uppercase.
  - Counts only on queues that need action.
  - Never a dark or saturated sidebar on a light screen.
- **Canvas.**
  - One gutter value both ways, and one left edge from header to last row.
  - Cards in a row share a bottom edge.
  - Column count follows item count: no orphan cells, no stretched empty cards.
  - Narrow tables (five columns or fewer) run about 760px wide, not the full canvas.
  - One h1, a noun rather than a greeting.
  - Choose a density band: sparse 6–25 data points, medium 25–50, dense about 120. Row pitch, padding and type size move together.
- **Counts and KPIs.**
  - One container split by 1px dividers beats separate tiles. No icon circles.
  - The answer figure is at least 1.3× its siblings.
  - A delta names its window in words.
  - Colour means good or bad, not up or down: rising latency is red.
  - A zero or undefined change is grey; a change from zero reads "+4 (new)".
- **Charts** (with `dataviz` leading).
  - One series per chart, three at most.
  - Faint gridlines and no y-axis line.
  - Round ticks, with the top tick above the maximum.
  - x-labels never rotated.
  - No smoothing.
  - Annotate a spike about 3× the usual change.
  - Forecasts dashed.
  - One subject keeps one hue.
- **Tables.**
  - Rows 36–53px; headers grey and sentence case.
  - No zebra stripes, no header band.
  - Numbers right-aligned in tabular figures, with fixed decimals per metric.
  - A sign on every change.
  - A missing value is a grey dash; a real zero is printed.
  - A full list states its total ("1–50 of 1,284").
  - A status pill is a pale tint with dark text of the same hue, and it never wraps.
- **Forms and settings.**
  - Label above the field; no floating labels.
  - One control height per context.
  - A disabled control stays legible and says why.
  - Destructive actions go last, in their own section, naming the object.
  - One save model per view.
  - Show what a setting produces beside its control: the invite email or the notification as it will arrive.
- **Type and colour.**
  - Check that `tabular-nums` really changes the face's digit widths.
  - Every text tier, placeholders included, reaches 4.5:1.
  - Radii either tight (4–8px) or soft (16–24px), and nested radii step down.
  - Roughly 3% of pixels coloured: the accent on data plus at most one control.
- **States.**
  - Loading is the final layout, with flat placeholders at their real size and no layout shift.
  - An error stays inside the block that failed, says when the data was last good, and offers Retry.
  - An empty block keeps its frame and header, with one sentence across it.
  - First run keeps the frame and title, puts the first action where the data will appear, and shows a setup progress strip at its true percentage when there are steps.
  - An empty side card fills with reference data, such as last week's figures under "nothing yet today".
- **Phone.**
  - A sidebar wider than 30% of the phone fails. Navigation folds into a top bar with a sheet, or a bottom bar of 4–5 items.
  - Below about 640px, a table becomes two-line rows: fields move to line 2 and are never dropped. Or it scrolls inside its own frame with the first column fixed.
- **Its screenshot critique**, the per-screen pass:
  1. Capture at 1440, 768 and 390.
  2. Answer in writing:
     - Is the biggest thing the answer?
     - Do the edges line up?
     - Is colour only on data, status and the one primary action? Does the face you chose show on the first screen?
     - Do the numbers add up and align?
     - Do zeros and dashes read right?
     - Do legend swatches match their marks?
     - Does the phone layout fold correctly?
  3. Fix the worst three, then look again.

  Three rounds at most. "If a problem shows in a screenshot, it is real, whatever the code says."

**Keep out:**
- **Its current company-page run**, including its motion, icons and system chapters. It does not replace this app checklist.
- **Its files and tokens.** Do not copy a second token vocabulary or working files into the product; take a useful choice into its kit.
- **The old chapter's truncation** (§7.4: ellipsis on one line, IDs cut to about 8 characters). The method refuses it.
- **The old run's bans labelled taste, not evidence** ("Why these, honestly"): violet and indigo, monospace, hairlines, index numbers. The method has its own rules for mono and numbering; the rest is the product's call.
- **"A border or a shadow, never both."** That's taste. The owner approved a faint resting shadow under bordered panels for a monitoring product (`2026-10-22`), as Supabase does.
- **"Toggle on is green or near-black."** On a product whose job is to report health, green is a state, so a toggle is never green there (the method: action and state never share a colour).

**Get it.** For app screens, use the checklist above and its pinned source; a fresh install no longer supplies the app run. For company websites, follow [Taste's current README](https://github.com/Leonxlnx/taste-skill) (read `2026-11-05`).

## Impeccable: audit and harden before it ships

**What it is.** One skill with commands, backed by a deterministic detector with several dozen rules that also runs as an edit hook (registry read `2026-11-05`). ([pbakaus/impeccable](https://github.com/pbakaus/impeccable), Apache-2.0.)

**It leads on a screen that works, before the release.** Run its audit, then harden, then polish, and fix what it finds inside the kit.

**Take** (paths under its `skill/` folder):
- **The audit** (`reference/audit.md`).
  - Five dimensions, each scored 0–4:
    - accessibility;
    - performance;
    - theming: hard-coded colours, broken dark mode, values that don't follow the theme;
    - responsive: fixed widths, small targets, sideways scroll, text scaling;
    - implementation integrity.
  - Bands out of 20: 18+ excellent, 14+ good, 10+ acceptable, 6+ poor, below 6 critical.
  - Every finding names its severity, its location (`file:line`), its impact, the standard it breaks and the fix.
  - Never report a finding you haven't verified.
  - Run it before the phase review series and before release for new or materially changed journeys or kit changes, and whenever the owner asks (`SKILL.md`). Record the scores, fix P0 and P1, and rescore.
- **Severity for design findings.**
  - **P0** blocks the task: fix now.
  - **P1** causes significant difficulty or breaks WCAG AA: fix before what the audit ran for: the phase's review series, or the release.
  - **P2** is an annoyance with a workaround: fix next pass.
  - **P3** is polish.

  Tie-break: *would a person contact support about this?* If yes, it's at least P1. (Code findings keep the independent review's own scale.)
- **The critique** (`reference/critique.md`).
  - Nielsen's ten heuristics, each 0–4. Most real interfaces score 20–32 of 40.
  - At most four visible options at a decision point.
  - Pick personas from its table: dashboards/admin → Alex (power user), Sam (accessibility); onboarding → Jordan (first-timer), Casey (distracted mobile user); forms/wizards → Jordan, Sam, Casey. Walk the primary action as each, naming the controls that fail them.
  - Cognitive load: check single focus, chunks of at most four, related items grouped, clear hierarchy, one decision at a time, at most four visible options, no recall from a previous screen, and complexity revealed when needed. Count failures: 0–1 low, 2–3 moderate, 4+ critical.
  - The critique is written before any detector output is read, the same unsteered principle as the code review.
- **Harden** (`reference/harden.md`).
  - Test inputs:
    - 100+ character names;
    - empty and one-character text;
    - emoji, right-to-left, CJK and accented text;
    - millions and billions;
    - 1,000+ items, and 50+ options.
  - Each API failure has its own state: 400 shows validation, 401 goes to sign-in, 403 is a permission state, 404 a not-found, 429 a rate limit, 500 a generic error with a way to get help.
  - Leave 30–40% room for translated text.
  - Use CSS logical properties, `Intl` number and date formats, and plurals from a library, never `count !== 1`.
  - Click submit ten times fast.
  - Keep what the person typed when an error occurs.
  - One failed component never blocks the whole screen.
  - Zoom to 200%.
  - An interrupted gesture clears its drag state.
- **Polish** (`reference/polish.md`).
  - First, classify each drift: a missing token, a one-off, a conceptual mismatch, or a local defect.
  - Then fix in order:
    1. broken tasks and inaccessible paths;
    2. missing states;
    3. flow, responsive and kit drift;
    4. visual and motion inconsistencies;
    5. code cleanup.
  - Every control has default, hover, focus, active, disabled, loading, error and success behaviour.
  - "Promote genuinely reusable values to tokens; do not create a system abstraction for one local exception."
  - End by reading your own diff for churn and leftovers.
- **The craft floor** (`reference/craft-floor.md`).
  - Real illustration or none.
  - Body and placeholder text at 4.5:1.
  - On a coloured surface, tint secondary text from the surface's hue, never plain grey.
  - More space above a heading than below it.
  - Theme the browser's own surfaces: text selection, caret, scrollbars, focus ring, underline offset.
  - Refuse:
    - nested cards;
    - eyebrow labels;
    - gradient text;
    - a coloured side border over 1px on a card;
    - decorative glass;
    - sparklines standing in for content;
    - emoji or glyphs as icons;
    - monospace worn as a "technical" costume rather than for code, data or measurement (the method is stricter: mono is for code);
    - a modal for a task that needs neither interruption nor protected focus.
- **App screens** (`reference/operate.md`).
  - A fixed rem type scale, not a fluid `clamp()`.
  - Transitions of 150–250ms, and no page-load choreography.
  - Placeholders at real size, not spinners in the middle of content.
  - Overlays escape `overflow` (native `<dialog>` or popover).
  - "If the 'save' button looks different in two places, one is wrong."
- **Words** (`reference/clarify.md`).
  - An error says what failed, why when known, and how to recover. No internal codes as the message.
  - A confirmation names its action, never Yes, OK or Submit; prefer undo where recovery is safe.
  - Empty states tell apart first use, no results, filtered out, no permission and failure.
- **Onboarding** (`reference/onboard.md`).
  - Teach at the point of use, let experienced users skip, and make empty states teach the first action.
  - Use an inline sentence or native `<details>` in place of its tooltips; the method refuses tooltips.
- **Detector rules worth checking by hand:**
  - side tabs;
  - nested cards;
  - grey text on colour;
  - lines over about 80 characters;
  - body text closer than 16px to the viewport edge;
  - leading under 1.3;
  - skipped heading levels;
  - text under 12px;
  - tracking over 0.05em on body text;
  - the same literal text three or more times inside one card or panel (`repeated-container-text`).

**Keep out:**
- **Its hooks.** `npx impeccable install` adds edit and stop hooks to `.claude/settings.local.json`, `.codex/hooks.json` and other harnesses' files. Its README warns that Claude Code hooks "run independently of model-tool approval". Its launcher fetches a pinned binary into `~/.impeccable/bin/` on first use.
- **Its second design system.** `init`, `document` and `extract` write `PRODUCT.md`, a root `DESIGN.md` and `.impeccable/`, and some detector rules enforce `DESIGN.md`, not the kit. Don't redesign through it either.
- **Network and telemetry.** Starting a new design always asks its roll API at impeccable.style. Telemetry is on unless you opt out: `DO_NOT_TRACK=1`, `IMPECCABLE_NO_TELEMETRY=1`, or `"telemetry": false` in `.impeccable/config.json`.
- **Live mode,** which runs a `package.json` script in a shell.
- **Its truncation recipes** (`.truncate`, `-webkit-line-clamp`, the first in `harden.md`). The method refuses them: text a person typed wraps.
- **Its allowance for "a coloured rail or header"** (`reference/mode-operate.md`, read `2026-11-05`). The method keeps chrome neutral and the accent on actions. A tinted ground is allowed when it carries neither action nor state colour.

**Get it.** Its install adds the hooks above, which is the owner's call on each machine. Without it, the checklists above are the audit: read its `skill/reference/` files for the full text.

## `dataviz` (built into Claude Code): charts

**What it is.** A method for charts with a runnable palette validator, built into Claude Code.

**It leads whenever a chart, a stat tile or a KPI row is drawn.**

**Take.** Its procedure, in order:
1. Pick the form first: sometimes the answer is a stat, not a chart.
2. Assign colour by its job: categorical, sequential, diverging or status.
3. Run the validator, never eyeball it.
4. Apply the mark specs.
5. Add hover by default.
6. Do the accessibility pass.
7. Look at the render.

Its non-negotiables:
- categorical hues in a fixed order, never cycled;
- one axis, never two;
- colour follows the entity, not its rank;
- status colours reserved for status;
- text in text tokens, never the series colour;
- a legend for two or more series.

**Keep out.** Nothing, but a builder outside Claude Code never sees it. When a product has charts, write the chart rules it needs into the kit README.

## `artifact-design` (built into Claude Code): pages published as claude.ai artifacts

**It leads only for a page published as an artifact**, such as a review's specimens or a report for the owner. An artifact that mocks a product screen loads and composes the product's kit and satisfies the method (`SKILL.md § What binds`).

## Where they disagree, and the side this skill takes

### Which collection leads, stage by stage

The pre-ship row gives the full checks. Apply the scope in `SKILL.md` § Complete phase visual checks before its review series and owner preview for routine edits.

| Stage | Leads | Take | Keep out |
|---|---|---|---|
| The jobs. Before any screen | this skill, § Before any screen | the jobs map; the data rules kept out of the copy | a screen per table |
| Direction. No look yet; the look is the problem; a public page whose job is to persuade | `frontend-design` (always on) | a direction grounded in the product's subject; a plan (palette, type, layout, principles) checked against the generic defaults before anything is built; keeping brand colours still runs the kit stage | a new direction per screen. Once one is picked, it stops leading |
| A choice between options. A palette, a font pairing, a chart type, a stack's convention | UI/UX Pro Max | candidates to choose from. The pick goes into the kit by hand | its persisted design-system files and its installer: a second design system beside the kit |
| The kit | the method, with `frontend-design`'s plan | tokens and primitives that satisfy every rule in `method.md`, each held by a test where one can be written | anything a collection proposes that the method forbids |
| Screens people work in. Dashboards, admin, tables, settings | the app-screen checklist in `references/collections.md § Taste`, distilled from its last upstream app chapter | the screen's one question and face; every block's empty, zero, loading and error state; colour only on data, status and the one primary action; its screenshot critique, three rounds at most | Taste's current company-page system, and its palette and type when a kit exists |
| Charts | `dataviz` (built in) | form first, colour last; its palette validator; one axis; hover by default | state colours reused as series colours |
| What a screen says | `references/screens.md § What a screen may claim`, and `frontend-design`'s section on writing | sentences only as true as what the renderer is handed; one function for every summary of a state | — |
| Before it ships | `references/screens.md § What to verify visually`, then Impeccable | every width, state, theme and role; Pro Max's web checks (`quick-reference.md` §1–3, §8, §9, inside the UI/UX Pro Max skill; without it, its distilled list in `collections.md`) as a quick pass; Impeccable's audit, hardening and polish | Pro Max's native/mobile pre-delivery checklist for web work; Impeccable's commands that write their own design documents, and any redesign through it; ellipsis for text a person typed |
| The owner judges the look | `references/review.md` | measured claims, before/after specimens in the real tokens, fixes split from the owner's calls | opinions without numbers |
| A page published as a claude.ai artifact | `artifact-design` (built in) | its page contract and both themes | — |

| Question | They say | This skill |
|---|---|---|
| Glass | Pro Max recommends it for SaaS; Taste and Impeccable ban it | no |
| Colour in the chrome | Taste: on data and status, never a saturated sidebar; Impeccable's app mode allows a coloured rail | neutral chrome; the accent acts (method) |
| Truncation | all three offer ellipsis or line-clamp | refused: text a person typed wraps, and the kit test refuses truncation (method) |
| Dark neutrals | Taste: true neutral; Impeccable: always tinted | the kit decides, measured with `scripts/color.py`, recorded in the kit README |
| Fonts | Impeccable flags Inter, Roboto and Geist; Taste defaults to Inter | the kit decides; `frontend-design`'s *choose deliberately* applies |
| Illustration | Impeccable wants it in empty states; the preserved Taste app chapter bans it | the owner decides from specimens in the kit; real illustration or none |
| Step numbers | the preserved Taste app chapter bans index numbers | allowed for a real sequence or rank, never decoration (method) |
| Loading | Pro Max allows shimmer; Taste doesn't | placeholders at real size with no layout shift (all three agree); shimmer is taste, and honours reduced motion if used |
| Widths | Pro Max 375/768/1024/1440; Taste 390/768/1440; Impeccable 640/768/1024 | the product's capture and assertion widths (`screens.md § What to verify visually`); theirs are advice |
| Severity | three different scales | Impeccable's P0–P3 for design findings; code keeps the review's own |
| Weight as emphasis | Taste and Pro Max use weight for hierarchy | hierarchy yes, but never as a second signal for state (owner's preference, `SKILL.md`) |

## How a product gets them

- **`frontend-design`**: enable it in the product's committed `.claude/settings.json` as `frontend-design@claude-plugins-official`. Anthropic's own marketplace, which Claude Code adds by itself in an interactive session, lists it by a relative path, so a fresh checkout loads it once the folder is trusted, with no install step. A machine that also has it at user scope from another source (`@anthropic-plugin-directory`, `@synced`) may list it twice; uninstall that one.
- **This skill** comes from the `app-stack` pack, installed in every agent that builds screens; the product keeps no copy of it (`SKILL.md § Where the method lives`).
- **`dataviz` and `artifact-design`** ship with Claude Code.
- **The three third-party collections** are linked above, installed per machine from their own READMEs, and used when present. Don't vendor or enable them in the product's repository: registering a third-party marketplace for every checkout, and a plugin whose launcher downloads a binary and installs hooks, is the owner's call on each machine. Without them, design from the method, `frontend-design` and the checklists in this file.
