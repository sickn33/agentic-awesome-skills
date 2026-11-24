# ui-diff.config.json

Everything is optional; `ui-diff init` writes a starter file. Put it at the repo root, or next to
the app in a monorepo (`apps/web/ui-diff.config.json`). ui-diff uses the nearest config above the
current directory, or `--config <file>`. The config is read from your checkout and applied to both
base and head. A JSON Schema lives at `schema/ui-diff.config.schema.json` in the skill folder.

**Paths and globs** are relative to the config file. A leading `/` means "relative to the repo
root", and `..` is allowed (`../../packages/ui/**`). Use `/` as the separator; a Windows-style `\`
is read as `/` too. Globs support `**`, `*`, `?`, `{a,b}`,
`[abc]` and `!negation`.

## Minimal

```json
{
  "startCommand": "npm run dev -- --port {port}",
  "routes": ["/", "/pricing", "/settings/profile"]
}
```

## Complete example

```json
{
  "startCommand": "pnpm dev --port {port}",
  "baseUrl": "http://127.0.0.1:{port}",
  "install": "auto",
  "routes": [
    { "path": "/", "files": ["src/app/page.tsx", "src/components/Hero/**"], "waitFor": "[data-ready]" },
    { "path": "/pricing", "files": ["src/app/pricing/**"], "variants": { "param": "plan", "values": "1..3" },
      "motion": { "steps": [{ "hover": ".cta" }, { "wait": 500 }, { "click": "[data-tab=yearly]" }] } },
    { "path": "/settings", "actions": [{ "click": "#open-advanced" }], "mask": ["[data-testid=last-login]"] }
  ],
  "globalFiles": ["src/styles/**", "tailwind.config.*", "src/app/layout.tsx"],
  "viewports": [
    { "name": "desktop", "width": 1280, "height": 800 },
    { "name": "mobile", "width": 390, "height": 844, "deviceScaleFactor": 2, "isMobile": true, "hasTouch": true }
  ],
  "themes": [
    { "name": "light", "colorScheme": "light" },
    { "name": "dark", "colorScheme": "dark", "query": { "theme": "dark" } }
  ],
  "capture": { "mask": ["[data-ui-diff-mask]"], "hide": [".intercom-launcher"] },
  "freeze": { "time": "2026-01-15T09:30:00Z" },
  "tokens": { "enabled": true, "files": ["src/styles/tokens.css"] },
  "a11y": { "enabled": true },
  "motion": { "enabled": true }
}
```

## Running the app

| Key | Default | Notes |
|---|---|---|
| `startCommand` | — | Starts the app. `{port}` is replaced with a free port; `PORT` is also set. Required for local (worktree) runs. |
| `baseUrl` | `http://localhost:{port}` | Where the started app listens. For a loopback host (`localhost`, `127.0.0.1`, `[::1]`) the other loopback addresses are tried too, because dev servers bind differently (Vite often listens on IPv6 `::1` only). Keep `localhost` for Next.js: its dev server blocks its own resources for `127.0.0.1`, so pages would not hydrate. |
| `buildCommand` | — | Runs before `startCommand` (e.g. `npm run build` + `startCommand: "npm start"`). |
| `install` | `"auto"` | `"auto"`: if the lockfile matches your checkout, link your installed `node_modules` (caches such as `.vite`/`.cache` are not shared); otherwise run the lockfile's install once (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --frozen-lockfile`, `bun install`). Lockfiles are compared by content hash, ignoring line endings and trailing whitespace; when base and head share a lockfile that differs from your checkout, one side installs and the other links to it. Next.js apps never get symlinked `node_modules`, because Turbopack does not follow symlinks outside the project: instead each worktree gets a copy made of hard links (real directories, no download, almost no disk), from your checkout when the lockfile matches or from the other side's install when base and head share a lockfile, so dependencies are installed at most once per lockfile. A lockfile that lists no packages (for a `package.json` without dependencies) installs nothing, and without any lockfile ui-diff runs `npm install` in each worktree, which can give base and head different versions. A string runs that command; `false` skips. If the app exits or keeps answering 5xx with linked dependencies, ui-diff retries with a clean install after 30 s. |
| `cwd` | `"."` | Directory (relative to the config) where commands run. |
| `readyPath` | `"/"` | Polled until it answers with a status below 500. |
| `startTimeoutMs` | `120000` | How long to wait for `readyPath` to answer. |
| `env` | `{}` | Extra environment variables for install/build/start. |
| `copyFiles` | `.env`, `.env.local`, `.env.development.local` | Untracked files copied from your checkout into each worktree when present. |

**Browser.** Captures run in Playwright's Chromium, downloaded on first use. To use an installed
browser instead (on GitHub's Ubuntu runners Google Chrome is preinstalled, so nothing is
downloaded), set `"browser": { "channel": "chrome" }` or `UI_DIFF_BROWSER_CHANNEL=chrome` (the
variable wins); `UI_DIFF_CHROMIUM_PATH` points at any Chromium build. One browser is launched per
run, so base and head always share it, and the capture settings record which one (`chromium`,
the channel name, or `custom executable`; never the path).

Worktrees live in the system temp directory and are removed afterwards (`--keep-worktrees` keeps
them). Each server runs in its own process group; only those processes are stopped.

## Base cache

Base captures (screenshots, element maps, style snapshots and the base side of the report data)
are cached in `.ui-diff/cache/` (kept out of git through `.git/info/exclude`, like the rest of
`.ui-diff/`; add `.ui-diff/` to `.gitignore` if you prefer). The key is

```
base-<first 12 hex of the base commit>-<16 hex of sha256(base commit, capture config hash, browser and version, ui-diff version)>
```

where the capture config hash covers the capture plan (routes with their actions, masks, waits,
viewports, themes, a11y and focus-order flags, `focus` and `ignore`, flows with their steps, and components with their selectors and states), `capture`, `freeze`, the style
and token settings and how the app is built and started (`startCommand`, `buildCommand`,
`install`, `cwd`, `baseUrl`, `env` and the contents of `copyFiles`). When the key matches a complete
entry, base is not checked out, installed, built, started or captured: the timing line says `base:
cached` and the capture settings say `Base cache: reused`. Head is then frozen at the instant the
cached base was, so clocks match. Any mismatch, a failed base capture or a missing file means a
full recapture; an entry is never partly reused. A flow checkpoint base never reached (the flow
stopped before it) or a component base does not have is part of the entry, not a failure. A motion clip still needs the base app, so on a
hit it is started only when a clip is recorded. `--no-cache` captures base again (and stores the
result); `ui-diff cache-key` prints the key a run would use, which the example CI workflow passes
to `actions/cache`. The ten most recent entries are kept. Deployed previews (`--base-url`) are not
cached.

## Routes and detection

`routes` entries are a path string or an object:

| Key | Notes |
|---|---|
| `path` | Required, starts with `/`; may include a query string. |
| `name` | Used in file names and labels (defaults from the path). |
| `files` | Globs whose changes affect this route. Files matching them also count as entry points for the import graph. |
| `waitFor` | Selector that must be visible before capturing. |
| `actions` | Steps run before the static screenshot (same format as motion steps), e.g. open a menu. They run after the page settled (network idle, fonts, the lazy-load scroll), so they can target lazy-loaded elements. A step whose element does not appear within 3 s on one side (a control that is new on head) is skipped there and reported as a warning. |
| `mask` / `hide` | Per-route additions to `capture.mask` / `capture.hide`. |
| `fullPage` | Override `capture.fullPage`. |
| `viewports` / `themes` | Restrict this route to some viewports/themes. |
| `variants` | Variant compare, see `extras.md`. |
| `motion` | `true` or `{ steps, durationMs, viewport, theme, fromNavigation }`, see `extras.md`. |

`globalFiles`: globs whose changes affect every route (global CSS, theme, root layout).

**Focus and ignore regions.** `focus` and `ignore` are CSS selectors, at the top level for every
route and on a route for that route only (added to the top-level ones):

```json
{ "focus": [".pricing-table"], "ignore": [".ad-slot", "[data-testid=live-visitors]"],
  "routes": [{ "path": "/checkout", "focus": ["form.checkout"] }] }
```

`ignore` is painted over in the screenshots on both sides, like `capture.mask`, and left out of the
style diff. With `focus`, only the elements it matches (and what they contain) are compared: the
pixel diff counts changes inside their boxes only, a page that only grew elsewhere is unchanged,
and the style diff lists only those elements. Selectors are resolved on every capture from the
element map; one that matches nothing on a side is a warning in the report and the comment, never
an error, and when no focus selector matches at all the whole page is compared (and the warning
says so). The comment names the focused and ignored regions in one line.

Dependency changes are compared by declared range (`package.json`) and resolved version
(lockfiles). Other packages are listed in the comment as "not checked visually"; a changed
`bun.lockb` (binary) is listed as unreadable.

`detect`:

| Key | Default | Notes |
|---|---|---|
| `conventions` | `true` | File-system routing: Next.js (app and pages), SvelteKit, Nuxt, Astro, Remix/React Router, TanStack Router (`src/routes`), plain HTML. |
| `imports` | `true` | Follow imports from changed files to pages, route files and layouts (a component used only in `app/layout.tsx`, `__root.tsx` or `pages/_app.tsx` maps to every route that layout wraps). |
| `aliases` | `{}` | Extra import aliases, e.g. `{ "~/": "src/" }`. tsconfig/jsconfig `paths` are read automatically, including configs reached through `references` (Vite's `tsconfig.app.json`) and relative `extends`, and package.json `#` imports. |
| `maxRoutes` | `12` | Further routes are listed as "not captured". |
| `uiPackages` | frameworks, CSS tooling, UI/icon/font/animation libraries | Package names (`*` wildcards: `@radix-ui/*`, `postcss-*`) whose version changes may change the UI. When one changes in the app's `package.json` or a lockfile above it (npm, pnpm, yarn, `bun.lock`), every known route is captured. Setting it replaces the default list (see the JSON Schema), so add your design-system packages next to the defaults you keep. |
| `dependencyRoutes` | — | Routes to capture for a UI dependency change instead of every known route, e.g. `["/", "/pricing"]`. |
| `include` / `exclude` | UI-ish extensions / tests, stories, build output, lockfiles | Which changed files count as UI. |

## Viewports and themes

Viewport: `name`, `width`, `height`, `deviceScaleFactor`, `isMobile`, `hasTouch`, `userAgent`, or a
Playwright `device` name (`"iPhone 13"`). On the CLI: `--viewports desktop,tablet:820x1180@2`.

Theme: `name`, `colorScheme` (`light`/`dark`/`no-preference`, sets `prefers-color-scheme`), `query`
(added to every URL, e.g. `{ "theme": "dark" }` → `?theme=dark`) and `localStorage` (set before
the page loads, e.g. `{ "theme": "dark" }` for next-themes).

## Capture (determinism)

| Key | Default | Notes |
|---|---|---|
| `fullPage` | `true` | |
| `maxHeight` | `4000` | Taller pages are clipped (reported as truncated). |
| `disableAnimations` / `waitForFonts` / `stableRandom` | `true` | Older switches: `false` turns off `freeze.animations` / `freeze.fonts` / `freeze.random`. |
| `fixedTime` | `false` | Older form of `freeze.time`: an ISO timestamp or `"run-start"` sets it (unless `freeze.time` is given). `false` no longer means "let time run": use `freeze.clock: false`. |
| `mask` | `[]` | Selectors painted over with `maskColor` on both sides (timestamps, avatars, live counters). Give masked elements a stable size, e.g. `font-variant-numeric: tabular-nums`. |
| `maskColor` | `#A3A3A3` | |
| `hide` | `[]` | Selectors hidden with `visibility: hidden` (layout preserved). |
| `hideDevOverlays` | `true` | Hides Next.js/Vite/Astro dev overlays and the Vercel toolbar. |
| `scrollToLoad` | `true` | Scrolls through the page to trigger lazy content, then back to the top. |
| `stableShots` | `2` | Retake until this many consecutive screenshots are identical. When the page keeps changing (`requestAnimationFrame` or timer animations), its JavaScript timers are paused for the final shots and a "page did not settle" warning names the element to mask. |
| `settleMs` | `250` | Extra wait before capturing. |
| `waitUntil` | `"load"` | Plus a bounded wait for network idle (`networkIdleTimeoutMs`, 3000). |
| `locale` / `timezoneId` | `en-US` / `UTC` | |
| `timeoutMs` | `30000` | Per navigation/step. |
| `styleMaxElements` | `2500` | Most visible elements whose computed styles are recorded per capture (used by the token audit). A capture with more gets a warning. Replaces `tokens.maxElements`, which is still honoured when this is not set. |

Service workers are blocked and CSP is bypassed in the capture browser so cached or blocked
assets do not differ between sides.

## Freeze (inputs)

Before every still capture, on base and head alike, ui-diff freezes the inputs that make two
renders of the same code differ. Each is on by default and can be turned off:

```json
{ "freeze": { "clock": true, "time": "run-start", "random": true, "seed": 795556381, "animations": true, "fonts": true, "fontTimeoutMs": 8000 } }
```

| Key | Default | Notes |
|---|---|---|
| `clock` | `true` | `Date` is fixed at `time` through Playwright's clock API, so clocks, dates and relative times ("2 min ago") match on both sides. Timers and `requestAnimationFrame` keep running, so the page still renders. |
| `time` | `"run-start"` | The instant: `"run-start"` (when the run began, the same on both sides) or an ISO timestamp such as `"2026-01-15T09:30:00Z"`, which also keeps it the same across runs. |
| `random` / `seed` | `true` / `795556381` | `Math.random`, `crypto.getRandomValues` and `crypto.randomUUID` are seeded with `seed`. |
| `animations` | `true` | CSS animations and transitions are finished, Web Animations completed, the caret hidden and `prefers-reduced-motion: reduce` set. Motion clips are not affected: they always play animations with a running clock. |
| `fonts` | `true` | Waits for `document.fonts.ready` and then until no font face is loading on two checks in a row (a font added by a script a moment later is waited for too), up to `fontTimeoutMs`, plus image decoding. Each capture records which web fonts loaded, failed or were still loading. |

**Rotating content** (carousels, tickers, live counters, ads) changes by itself even with a frozen
clock, because it runs on timers or `requestAnimationFrame`. Mask it: the element is painted over
with `capture.maskColor` on both sides, so whatever it shows does not count, and the rest of the
page is still compared.

```json
{ "capture": { "mask": [".hero-carousel", "[data-testid=live-visitors]"] }, "routes": [{ "path": "/", "mask": [".ticker"] }] }
```

A "page did not settle" warning names the element that kept moving and the `mask` to add. Give
masked elements a stable size (for example `font-variant-numeric: tabular-nums` on counters) so
they do not push the rest of the page around.

## Style diff

Each capture records an element map right after its screenshot, from the same frozen page: every
visible element with a stable id (`data-testid`, `id`, `aria-label`, else its selector), a readable
name (`link 'Get started'`, `heading 'Pricing'`, the React or Vue component when there is one),
its parent, its box in CSS and device px and its computed styles (`styles/<side>/<capture>.json`,
at most `capture.styleMaxElements` elements; the report says when that cut it short). Base and
head elements are matched by stable attributes, then text and structure, then position, each pair
with a confidence and a reason; the rest are added or removed. Matched pairs are compared on box
(padding, margin, gap, size, position), type, color, shape, layout, text and image source, after
normalizing colors and rounding px to 0.5. Each changed pixel area is named after the smallest
element containing it. Before the comment is written each change is verified: it needs at least
`styleDiff.minConfidence` and a changed pixel area under its box, else it is listed as unverified
with the reason. The comment lists the verified changes grouped by route right after the verdict,
biggest first, and names what each still pair shows.

| Key | Default | Notes |
|---|---|---|
| `styleDiff.enabled` | `true` | `false` skips the element map and the style diff. |
| `styleDiff.maxChanges` | `50` | Most element changes kept per capture in `report.json`; the comment says how many were left out. |
| `styleDiff.minConfidence` | `medium` | Weakest match (`high`, `medium`, `low`) a measured change may have and still count as verified. |

## Hover and focus states

After the element map, each capture checks interactive elements (links, buttons, form fields,
`summary`, `[role=button]`, `[tabindex]` of 0 or more, and anything a `focus` selector matches)
in two more states on both sides: hovered with the real pointer, and reached with the Tab key so
`:focus-visible` applies. Only visible elements inside the first viewport are checked, at most
`states.maxElements` per page; the rest are counted as skipped. Each state records the element's
color, background, border colors, outline, box shadow, transform, opacity, text decoration and
cursor, and a crop around it. Base and head are paired through the element map, and a state
counts as changed only where its values differ between the sides in a way the default state does
not already explain. A page without state changes gets the same comment as before.

| Key | Default | Notes |
|---|---|---|
| `states.enabled` | `true` | `false` skips hover and focus states. |
| `states.hover` | `true` | Hover each element with the pointer. |
| `states.focus` | `true` | Tab through the page and record each element when it gets keyboard focus. |
| `states.maxElements` | `20` | Elements checked per page, in document order. |
| `states.padding` | `12` | CSS px around the element in its state crops. |

## Recorded flows

Some changes only show after someone uses the page: an open menu, a filled form, a dialog. A flow
is a short script replayed on base and head; at each named checkpoint the first viewport is
captured, mapped and diffed exactly like a still capture, at every viewport and theme of its route
(or the flow's own `viewports` / `themes`):

```json
{ "flows": [
  { "name": "mobile menu", "route": "/", "viewports": ["mobile"],
    "steps": [{ "click": "button[aria-label='Open menu']" }, { "wait": "nav#menu", "checkpoint": "open" }] },
  { "name": "checkout", "route": "/cart",
    "steps": [{ "type": "#email", "text": "ada@example.com" }, { "select": "#plan", "value": "yearly" },
              { "click": "button.pay" }, { "wait": ".receipt", "checkpoint": "paid" }] }
] }
```

| Step | Does |
|---|---|
| `{ "click": sel }`, `{ "hover": sel }`, `{ "focus": sel }` | Clicks, hovers with the pointer, or focuses the first element matching `sel`. |
| `{ "type": sel, "text": "…" }` | Replaces the field's value with `text`. |
| `{ "press": "Escape" }` | Presses a key on the focused element. |
| `{ "select": sel, "value": "…" }` | Picks the option with that value or label. |
| `{ "scroll": 400 }` / `{ "scroll": sel }` | Scrolls to a y position in px, or until the element is in view. |
| `{ "wait": 300 }` / `{ "wait": sel }` | Waits that many ms (at most 15000), or until the element is visible. |
| `{ "checkpoint": "name" }` | Captures without acting. |

Any step can carry `"checkpoint": "name"`: the page is captured after that step. A flow without
one is captured after its last step, as checkpoint `end`. A flow runs when its route is captured,
after the page settled as for a still capture (network idle, fonts, frozen clock, seed and
animations); before each checkpoint the page settles again. Route `actions` do not run first, and
hover and focus states are not recorded at checkpoints (they would move the pointer and focus the
flow set up).

Each checkpoint is a capture of its own, `<capture>__flow-<name>-<checkpoint>` (e.g.
`home__desktop__light__flow-mobile-menu-open`), with its images under that name in `compare/`, and
its base side in the base cache. The comment lists its changes under the flow and checkpoint
("`/` · flow 'mobile menu' · open"), without what the route's still capture already lists, and
only for elements inside the first viewport.

A step whose element does not appear within `flowLimits.stepTimeoutMs`, or whose action or wait
runs out of time, stops the flow there. When it stops on one side only, that is a finding counted
like a change: "flow 'checkout' stops at step 3 on head: button 'Pay' not found" (the element is
named from the side that found it). When it stops at the same step on both sides, the flow itself
is wrong: that is a warning, and the rest of the run is reported as usual.

| Key | Default | Notes |
|---|---|---|
| `flowLimits.maxFlows` | `5` | Flows run per run, in config order; the others are named in a warning. |
| `flowLimits.maxSteps` | `15` | A longer flow is not run (warning). |
| `flowLimits.stepTimeoutMs` | `5000` | How long a step waits for its element and its action. |

Each flow's time on each side is logged and kept in `report.json` (`flows[].base.ms`, `head.ms`);
the timing table has the total as `flows`.

## Components

A component entry diffs one part of a page on its own, without stories: a tight crop of it on
both sides, and only the measured changes of its root and what it contains, in a row of its own.

```json
{ "components": [
  { "name": "primary button", "route": "/", "selector": "[data-testid=hero-cta]", "states": ["default", "hover", "focus"] },
  { "name": "pricing card", "route": "/pricing", "selector": ".plan-card--pro", "viewports": ["desktop"] },
  { "name": "menu panel", "flow": "mobile menu", "checkpoint": "open", "selector": "nav#menu" }
] }
```

| Key | Notes |
|---|---|
| `name` | Letters, digits, spaces, `-` and `_`; unique. |
| `route` | Path the component is on. Give either `route` or `flow`. |
| `flow` / `checkpoint` | A flow (see above) whose checkpoint shows the component; `checkpoint` defaults to the flow's last one. The flow is replayed up to it, and the component is captured in the first viewport, like the checkpoint. |
| `selector` | CSS selector of the component's root. It must match exactly one visible element on each side. |
| `states` | Any of `default`, `hover` (the pointer on the root) and `focus` (keyboard focus on the root, or on the first focusable element inside it, so `:focus-visible` applies). Default `["default"]`. |
| `viewports` / `themes` | Default: those of the route (or the flow). |

Each component and state is captured on its own page load, settled and frozen like a still
capture (the same screenshot and element map code), and runs when its route is captured. The
crop is the component's box plus `componentLimits.padding`: when its size changed, both sides use
the larger box, each placed at its own root, so the blink and side-by-side line up; a component
that only moved on the page crops to the same pixels. The style diff lists only the root and
elements inside it (changes elsewhere on the page are the route's to report), and the comment
groups them under "component 'primary button'" with how the root's box changed on the page
("size 320×48 → 320×52px, moved 4px down"). A change the route's still capture lists too is shown
under the component as well but counted once. Route `focus` regions do not apply to a component
(it is its own focus); `ignore` and `capture.mask` still paint over what they match.

Its capture is `<capture>__component-<name>` (`-hover`, `-focus` for the other states), with its
images under that name in `compare/` and its base side in the base cache.

A selector that matches nothing (or a hidden element) on one side reports the component as
**removed** or **added**, with a crop of the side that has it; several matches, a flow that stops
before the checkpoint or a state that cannot be entered (nothing focusable) on one side report it
as **not compared**. Each is counted like a change (`check` exits 1). When neither side has it,
that is a warning about the entry, never a failed run.

| Key | Default | Notes |
|---|---|---|
| `componentLimits.maxComponents` | `10` | Components captured per run, in config order; the others are named in a warning. |
| `componentLimits.padding` | `8` | CSS px around the component in its crop. |

The root must appear within `flowLimits.stepTimeoutMs`. Each component's time on each side is
logged and kept in `report.json` (`components[].base.ms`, `head.ms`); the timing table has the
total as `components`.

## Fingerprint

Each capture records what each side was rendered with, measured in the page: the commit, viewport
size, `devicePixelRatio` and `isMobile`, the browser (`chromium`, a channel such as `chrome`, or
`custom executable`), its version and user agent, web fonts loaded,
failed or still loading, the freeze settings used (clock instant, seed, animations, font wait),
reduced motion, color scheme, locale and timezone, and the test data label. It never records
paths, host names, user names or environment variable values (font URLs are dropped; only family
names are kept). When base and head differ in anything but the commit, the comment warns next to
the diff that it may come from the capture environment and lists what differs.

| Key | Default | Notes |
|---|---|---|
| `fingerprint.dataLabel` | — | What data the app ran with (a fixture name, seed or dataset version). Shown as "not declared" when unset: ui-diff does not guess it. |

## Diff

| Key | Default | Notes |
|---|---|---|
| `threshold` | `0.1` | pixelmatch threshold (0–1, perceptual color distance). |
| `includeAA` | `false` | Count anti-aliasing differences. |
| `minChangedPixels` | `8` | Below this a capture counts as unchanged. |
| `maxFocusCrops` | `2` | Zoomed crops of the largest changed areas per capture. |
| `focusPadding` | `32` | CSS px around each crop. |
| `compositeMaxWidth` | `2400` | Composites wider than this are downscaled. |
| `highlightColor` | `#FF0080` | |
| `alignShifts` | `true` | Matches pixel rows that only moved up or down (a taller hero pushing sections down). Moved content is reported as `shifted` (CSS px, `dy` = after − before) and kept out of the changed percentage; a blue band on the diff's left edge marks it. |

## Publishing and the comment

| Key | Default | Notes |
|---|---|---|
| `publish.mode` | `"branch"` | `"branch"`: orphan assets branch in this repo. `"none"`: text-only comment. |
| `publish.branch` | `ui-diff-assets` | |
| `publish.remote` | `origin` | |
| `publish.keepRuns` | `1` | Runs kept per PR (older runs are removed from the branch). |
| `publish.allowPublicRepo` | `false` | Must be explicitly enabled to upload screenshots to a public repo. |
| `publish.linkBase` | derived | Override the image URL prefix (GitHub Enterprise, custom proxies). |
| `comment.id` | `default` | Separate sticky comments per app in a monorepo (`"web"`, `"docs"`). |
| `comment.title` | `UI diff` | |
| `comment.showUnchanged` | `true` | List unchanged captures in a collapsed section. |

`preview`, `auth`, `variants`, `motion`, `tokens` and `a11y` are described in `extras.md` and
`privacy.md`.
