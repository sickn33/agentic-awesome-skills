---
name: ui-diff
description: "Compare UI screenshots between revisions, capture interactions, and draft a visual PR review. Use for visual regressions, component diffs or preview comparisons."
category: development
risk: critical
source: community
source_type: community
source_repo: imuratalpay/ui-diff
author: Murat Alpay
license: MIT
license_source: https://github.com/imuratalpay/ui-diff/blob/66454fbd858291ea678ac5230464210dce7c8f5f/LICENSE
date_added: "2026-11-24"
metadata:
  version: "2.1.0"
---

# ui-diff

Adapted from [imuratalpay/ui-diff](https://github.com/imuratalpay/ui-diff/tree/66454fbd858291ea678ac5230464210dce7c8f5f/skills/ui-diff) at `66454fbd858291ea678ac5230464210dce7c8f5f`. See [LICENSE](LICENSE).

## When to Use

Compare approved frontend changes across trusted local revisions or authorized deployed previews. Use the local report to review changed routes, interaction states and components before deciding whether to publish.

## Operational boundaries

Local capture can execute the checked-out app and its install, build and start scripts with the current process environment. Run only trusted revisions and review configuration and scripts on both sides. Use a disposable environment without credentials for local comparisons. Do not run a fork's code on a privileged runner or pass secrets to a fork. Review the locked dependency install before launching the wrapper, which can install dependencies, build the CLI and download Chromium.

Use demo data. Review screenshots, logs and reports for sensitive information before sharing. Preview credentials require explicit authorization, trusted HTTPS previews and reviewed redirect and cookie behavior. Use dedicated test accounts. Confirm the destination, audience and scope before publishing a comment, pushing assets or pruning old assets. Prefer local output when visibility or consent is uncertain.

## Limitations

Dynamic content, inconsistent browser environments and partial capture can make comparisons inconclusive. A screenshot delta or automated accessibility check is evidence about the captured states only. The output may include sensitive page content and stays sensitive even after pruning a published branch.

Renders the affected routes of a web app at the PR's **base** and **head**, diffs the
screenshots, and posts one PR comment that starts with the verdict, then the measured element
changes, still `base | head` pairs of each changed area and your UX summary.
The mechanics are scripted; your job is the judgment: which routes matter, what the changes
mean for users, and whether it is OK to post.

`$SKILL` is the directory containing this file. Run the CLI as:

```bash
node "$SKILL/bin/ui-diff.mjs" <command> [options]
```

The first run installs dependencies and builds (about a minute); the first capture downloads
Playwright's Chromium. Every command prints JSON on stdout and progress on stderr. Output goes
to `.ui-diff/` at the repo root, which is added to `.git/info/exclude` automatically.

## Privacy rules (always)

- Screenshots never go to public or third-party hosts (no imgur, gists, Slack, CDNs, pastebins).
  The only upload target is the repository's own `ui-diff-assets` branch.
- `publish` refuses public repositories unless the user explicitly passes `--allow-public-repo`.
  If it says the repo is public or its visibility is unknown, stop and ask the user.
- Never create Vercel share links, bypass URLs or URLs with tokens. Protected previews are
  reached with headers/cookies whose values come from environment variables (see `references/privacy.md`).
- Never print secret values or paste them into comments or summaries.

## 1. Context

```bash
gh pr view <n> --json number,url,baseRefName,headRefName,headRefOid   # or: gh pr view (current branch)
git status --short
```

- Look for `ui-diff.config.json` (repo root or the app's directory). If there is none, run
  `node "$SKILL/bin/ui-diff.mjs" init`, check the suggested `startCommand` and `routes`, and offer
  to commit the file. `doctor` checks git, gh, the browser, the config and repo visibility: FAIL
  blocks a run; WARN (no gh login, no remote) only matters for publishing or `--pr`.
- **Posting to a PR:** pass `--pr <n>` so head is the pushed commit. Mention uncommitted or unpushed
  work, because it will not appear.
- **Checking work in progress:** `node "$SKILL/bin/ui-diff.mjs" check` diffs the working tree
  (uncommitted changes included) against the merge base with the default branch (`--base <ref>`
  to change it), prints a short summary with the measured changes, writes `.ui-diff/out/` and
  posts nothing; exit 0 no visual changes, 1 changes, 2 errors (`--json` for JSON). `run` without
  `--head` does the same into `.ui-diff/` for a later `publish`.
- **Deployed previews:** pass `--base-url` / `--head-url` (or `preview` in the config). For
  protected previews configure `auth` once; see `references/privacy.md`.

## 2. Detect changed UI and choose routes

```bash
node "$SKILL/bin/ui-diff.mjs" detect --pr <n>
```

Its JSON starts with `status`: `capture` (routes to capture), `nothing-mapped` (UI files that match
no route) or `no-ui-changes`. It maps changed files to routes through `routes[].files` and `globalFiles` in the config, then
framework conventions (Next.js, SvelteKit, Nuxt, Astro, Remix, TanStack Router, plain HTML) and an import graph
(relative imports, tsconfig aliases, package.json `#` imports, workspace packages, CSS `@import`/`url()`, HTML `href`/`src`).
The JSON lists each route with `reasons` and `confidence`, plus:

- `unmatched`: UI files it could not place. Find their pages yourself (grep for imports) and pass
  them with `--routes`.
- If the user only cares about part of a page, or a part is noise (ads, live feeds), set `focus` or
  `ignore` selectors in the config; a selector that matches nothing is reported as a warning.
- `needsExample`: dynamic routes (`/blog/[slug]`). Find a real id and pass `--routes /blog/hello`.
- `notes`: e.g. routes beyond `detect.maxRoutes`.
- `dependencies`: changed packages from `package.json` and lockfiles. A `ui: true` one (React,
  Tailwind, a component library; `detect.uiPackages`) makes every route affected; mention the
  others as not checked visually.

If no UI file changed, say so and stop; do not produce an empty report. If UI files changed but
none maps to a route (`run` prints `"status": "nothing-mapped"` and a `notChecked` reason), nothing
was checked: resolve the routes yourself or tell the user; never report that as "no visual changes". Tell the user in one or
two lines which routes you will capture and why. Remember routes that are affected but not
captured (login walls, modals, limits): they go in the summary so "no change" is not read as
an all-clear.

## 3. Capture and diff

```bash
node "$SKILL/bin/ui-diff.mjs" run --pr <n> [--routes "/,/pricing"] [--viewports desktop,mobile] [--themes light,dark] \
  [--variants hero=1..4] [--motion | --motion-all] [--tokens path/to/tokens.json | auto] [--a11y]
```

In one go it creates git worktrees for base (the merge base) and head, links or installs
dependencies, starts each app on a free port in its own process group, captures every
route × viewport × theme, diffs with pixelmatch, writes per changed area a still `base | head`
pair with the changed boxes outlined, a blink GIF and a `before | after | diff` crop (plus the full
page), runs the enabled extras, and cleans up. Captures are
deterministic (`freeze`, on by default): `Date` frozen at run start, `Math.random` and `crypto`
seeded, animations, transitions and the caret stopped, web fonts and images awaited; plus hidden
scrollbars, scroll reset and masked selectors (`capture.mask`, for carousels and live counters), and
each screenshot is retaken until consecutive shots match (if something keeps moving, the page's
JavaScript timers are paused for the final shots).

The JSON result has `stats`, `changed` (with image paths), `flows`, `components`, `variants`, `motion`, `a11y`, `tokens`,
`timing` (one measured line: detect, prepare per side, capture, diff, extras; `timings` in
`report.json` has the numbers), `warnings`, `notCaptured` and `unmatchedFiles`. Add `--themes light,dark` when colors or tokens
changed. If it fails, the error names the step and the log in `.ui-diff/logs/` (common causes and
fixes: `references/troubleshooting.md`); fix the cause
(missing env var, wrong `startCommand`, auth) and rerun. Never post a one-sided result. A capture
whose page returns HTTP 4xx/5xx is reported as failed, not as "unchanged".
A failed run keeps the previous report in `.ui-diff/` (`render` and `publish` warn that it is from
an earlier run): do not publish until a rerun succeeds.

### Flows: changes that need someone to use the page

Still captures show pages as they load. When the change sits behind an interaction (a menu, a
dialog, a filled form, a tab), add a flow to `flows` in `ui-diff.config.json`: it is replayed on
base and head with the same frozen inputs, and at each checkpoint the first viewport is captured,
mapped and diffed like a still capture. To write one from a sentence such as "check the mobile
menu open state":

1. **Route and viewport**: the page the sentence names (`/` when none), plus `viewports` when it
   names one ("mobile" → `["mobile"]`, a name from the config's `viewports`).
2. **Steps**: read the component to find the trigger and what appears. Prefer stable selectors:
   `data-testid`, `id`, `aria-label` (`button[aria-label='Open menu']`), then a class; never a
   generated class. Steps are `click`, `hover`, `focus`, `type` (+ `text`), `press` (a key),
   `select` (+ `value`), `scroll` (px or selector) and `wait` (ms or selector).
3. **Checkpoint**: put `"checkpoint": "<state>"` on the step that reaches the state the user means;
   when that state appears asynchronously, end with a `wait` for it carrying the checkpoint.
   Without one, the end of the flow is captured as `end`.

```json
{ "flows": [{ "name": "mobile menu", "route": "/", "viewports": ["mobile"],
  "steps": [{ "click": "button[aria-label='Open menu']" }, { "wait": "nav#menu", "checkpoint": "open" }] }] }
```

Keep flows short (at most `flowLimits.maxSteps`, 15 steps; `flowLimits.maxFlows`, 5 flows, run).
A flow runs only when its route is captured; pass `--routes` to force it. Offer to commit the flow.
Changes at a checkpoint are listed under "`/` · flow 'mobile menu' · open" (what the still capture
already lists is not repeated), with images `compare/<capture>__flow-<name>-<checkpoint>.png` (and
its `__pair-*` crops) and `flows` in `report.json`. "flow 'checkout' stops at step 3 on head: button 'Pay' not found"
means users can no longer get through it: lead "worth a look" with it. A flow that stops at the
same step on both sides is a warning about the flow, not the PR: fix its selector and rerun.

### Components: one part of a page on its own

When the user cares about one component ("check the primary button", "diff the pricing card"),
add it to `components` in `ui-diff.config.json`: it gets a tight crop on both sides, only the
measured changes inside it, and its own row in the comment. To write one:

1. **Route**: the page the component is on (find where it renders; `/` when it is on the home
   page). When it only shows after an interaction (a menu, a dialog), point at a flow and its
   checkpoint instead: `"flow": "mobile menu", "checkpoint": "open"` (write the flow first).
2. **Selector**: one that matches exactly one element, the component's root: `data-testid`,
   `id` or `aria-label` first (`[data-testid=hero-cta]`, `section[aria-label='Pro plan']`), else
   a class unique on the page; never a generated class. If the name is ambiguous ("the button"),
   pick the one the PR touches and say which.
3. **States**: add `"hover"` and `"focus"` when the sentence or the change is about interaction
   (a button, a link, a field); otherwise leave the default.

```json
{ "components": [{ "name": "primary button", "route": "/", "selector": "[data-testid=hero-cta]", "states": ["default", "hover", "focus"] },
                 { "name": "pricing card", "route": "/pricing", "selector": ".plan-card--pro" }] }
```

At most `componentLimits.maxComponents` (10) run. Offer to commit the entry. The comment groups
changes under "component 'primary button'" with how its box changed ("size 320×48 → 320×52px"),
with images `compare/<capture>__component-<name>*.png`, and `components` in `report.json`.
"component 'primary button' removed on head: nothing matches …" means the selector found it on
base only: check whether the component was removed or only renamed, and say which. A component
missing on both sides is a warning about the selector: fix it and rerun.

## 4. Review and write the UX summary

Start from the measured changes: `captures[].styleDiff.changes` in `report.json` names each changed
element with exact before → after values (padding, color, radius, text, added, removed, reordered),
and `styleDiff.regions` says which element each changed area belongs to; quote those values
instead of estimating from pixels. A change with `verified: false` did not pass the check (weak
match, or no changed pixels under it): its `unverified` reasons say why; do not state it as fact
without the images. Open the images before writing (the still pairs `compare/*__pair-*.png` first,
then the `compare/*__focus-*.png` diff crops, the full composites, `variants/*__strip.png` and
`motion/*.gif`). Read `.ui-diff/report.json` for the measured data, and start from
`.ui-diff/summary.auto.md`. The comment's first line is the verdict and the measured changes follow
it, so the summary need not repeat them: say what they mean for users. Write `.ui-diff/summary.md` for a
designer or PM who will not read the code:

A change with a `state` (`hover` or `focus`) happened only while the element was hovered or had
keyboard focus; its crops are under `states/` and its pair in `compare/*__state-hover-*.png` or
`compare/*__state-focus-*.png`. A removed focus ring is an accessibility problem: name it in "worth a
look".

```markdown
**What changed**
- **Primary button**: padding 8×14 → 10×18px, corner radius 4 → 8px. The link beside it shifts right, and the page below moves down 4px.
- **Newsletter label**: "Work email" is now brand blue.

**Worth a look**
- The label is 3.45:1 in dark mode (`#2563eb` on `#0f172a`).
- Button padding `10px` / `18px` and the 17px action gap are not spacing tokens.

**Not checked:** `/settings` (needs login).
```

A capture whose base and head environments differed (fonts, device pixel ratio, browser; see
`fingerprint.differences` in `report.json`) gets a warning in the comment, and `notComparable` in
the report makes the verdict say the captures were not comparable: name it in "worth a look" and do
not describe that diff as a product change without checking the images.

Guidelines: lead "worth a look" with likely-unintended changes (a page changed without its files
changing, breakage at one viewport, new a11y issues, off-token values). Content that only moved
(a taller hero pushing sections down) is matched row by row and reported as "shifted down Npx"
(`diff.shifted` in `report.json`); it is not in the changed percentage, so mention the shift
without calling the moved sections changed. A "page did not settle" warning names an element that
kept moving by itself (carousel, ticker); when a capture says every difference is inside such an
area, do not describe it as a change: suggest the `capture.mask` the warning gives. Say "changed", not
"intentionally changed". Keep it proportional: a one-color tweak gets one bullet. If you cannot
view images, write from `report.json` and say the screenshots were not reviewed.

Preview the final comment locally:

```bash
node "$SKILL/bin/ui-diff.mjs" render     # writes .ui-diff/comment.preview.md
```

## 5. Publish one sticky comment

Posting writes to a shared PR and pushes a branch: show the user the summary and get a yes first,
unless the request already said to post.

```bash
node "$SKILL/bin/ui-diff.mjs" publish --pr <n> --dry-run   # lists uploads, writes .ui-diff/comment.md, pushes and posts nothing
node "$SKILL/bin/ui-diff.mjs" publish --pr <n>
```

- Read the dry run's `publishable` and `problems`: if it says the repository is public, its
  visibility is unknown or there is no GitHub remote, the real publish will stop there. Tell the
  user; do not add `--allow-public-repo` or `--assume-private` on your own.
- Images go to the orphan branch `ui-diff-assets` of the same repository (single commit, other PRs'
  files kept) and are linked as `https://github.com/<owner>/<repo>/raw/ui-diff-assets/…`, which
  renders only for people who can read the repo.
- The comment is found by a hidden marker (`<!-- ui-diff:sticky id=default -->`) and edited in place;
  reruns never stack comments, unchanged bodies are not re-sent, and ticked variant picks survive.
- Exit code 3 means git could not read or push the repository (no push access, e.g. a fork, or
  missing git credentials; the error says which): use `--no-upload` for a text-only comment, or
  `--no-comment` to upload and print the markdown without posting.
- When the report has no changed UI file, `publish` uploads nothing and creates no comment; an
  existing sticky comment gets "no UI files changed in <sha>" as its top line, with the last result
  that had UI changes kept below it, collapsed.
- No PR yet: use `render` (or `publish --dry-run`) to produce the comment and offer to post once
  the PR exists.

## 6. Wrap up

Report the comment link, the counts, the "worth a look" items and anything not captured. If you
worked out routes, masks or dynamic ids yourself, offer to save them in `ui-diff.config.json`.
After a PR closes, `node "$SKILL/bin/ui-diff.mjs" prune --closed` removes its images.

## Extras

| Feature | Enable | What you get |
|---|---|---|
| Variant compare | `--variants hero=1..4` or `routes[].variants` | Head captured once per `?hero=` value, shown side by side in one table with tick boxes reviewers use to pick. |
| Motion clips | `--motion` or `motion.enabled` + `routes[].motion.steps` | Short before/after GIF (and optional WebM) of a scripted hover/click/scroll, for transitions screenshots miss. Only routes whose changed files touch motion (transitions, keyframes, `:hover`, the elements the steps target; transition-only changes included) unless `--motion-all`; a single-frame clip is flagged "no motion detected". |
| Token audit | `--tokens tokens.json` or `tokens.enabled` | Computed colors, spacing, radii and type in changed areas that match no token (JSON, CSS variables or StyleX `*.stylex.ts`; `--tokens auto` finds them), with selectors and the nearest token. |
| Protected previews | `--base-url/--head-url` + `auth` | Captures behind Vercel Authentication and similar, with credentials from env vars sent only to the preview origin. |
| Accessibility delta | `--a11y` or `a11y.enabled` | axe-core on both sides; only new and fixed issues (contrast, labels, focus), plus tab-order changes. |

Details and examples: `references/extras.md`. All config options: `references/config.md`.
Hosting trade-offs and protected previews: `references/privacy.md`. Failures and flaky captures:
`references/troubleshooting.md`.
