# Driving the app over MCP

`e2e mcp` serves a project's live app to a coding agent over MCP (stdio). The
coding agent drives the app the way the testing agent does, writes a test
as it walks the flow, and checks its locators and runs its lines before
writing them. `run_tests` runs a test file or the whole suite as
`npx e2e run` does and returns what it printed (topics `running` and
`debugging`); to fix one failing test, a session can run it and stop on the
screen where it failed.

## Contents

- Setup
- Tools
- Workflow
- Fixing a failing test
- Rules

## Setup

The server ships with the project's `e2e` dependency. The e2e plugin for
Claude Code, Codex, and Cursor registers it too, as `npx -y e2e@<version> mcp`, pinned to the plugin's release (it runs that release even when the project has another e2e version); with
the plugin installed there is nothing to add. Otherwise `e2e init` offers to register it for Claude Code,
Cursor, and Codex. Reuse an existing registration; when adding one, use the project's
config so it starts in the project it drives. Install dependencies and start
the MCP client in that directory so `npx` uses the installed e2e version. In a
Bun project, use `bunx` wherever this file says `npx`.

For an existing setup, `e2e init --yes --skills none --mcp .codex/config.toml` adds Codex.
Codex reads `.codex/config.toml` in a trusted project:

```toml
[mcp_servers.e2e]
command = "npx"
args = ["e2e", "mcp"]
```

`codex mcp list`, run in the project, shows the server. Start a new session
after registering it so the tools load. Claude Code can register it with:

```bash
claude mcp add --scope project e2e -- npx e2e mcp
```

Or declare it in the client's project config (`.mcp.json` for Claude Code,
`.cursor/mcp.json` for Cursor, `.vscode/mcp.json` for VS Code):

```json
{ "mcpServers": { "e2e": { "command": "npx", "args": ["e2e", "mcp"] } } }
```

Sessions run on the project's config (`e2e.config.ts`, `.mts`, `.js`, or `.mjs`).
In a directory without one, plain `open_session` fails with `CONFIG_NOT_FOUND`.
To look at an app there anyway, name the engine package:
`open_session {engine: "@e2e-dev/web", app: {url: "http://localhost:3000"}}`, or
`{engine: {package: "@e2e-dev/mobile", options: {platform: "ios"}}, app: {bundleId: "<app>"}}`.
`engine` is the factory call a config would write: a package name calls its
default export, and `{package, export?, options?}` names another export and
passes options. An option value of that same shape is called first, which
gives an engine a device or browser provider:
`options: {platform: "ios", device: {package: "@e2e-dev/limrun", export: "limrun"}}`
is `mobile({ platform: 'ios', device: limrun() })`. That session has one
target, no credentials, secrets, or project tools, and `engine` excludes
`target`, `config`, and `test`. `ENGINE_NOT_INSTALLED` names the command that installs the package
into `~/.e2e/engines`: run it, then open again. When you cannot run it, because
the sandbox has no network or cannot write there, ask the user to run it or to
allow it, and wait. `run_tests` and
`open_session {test}` still need a config, so set the project up before
writing tests (topic `setup`). No model is needed: without the optional `ai` package, sessions
open and the deterministic tools work. A test a session runs needs one only for
an agent step with no recording.

Flags: `--config <path>` names the default config file, `--target <name>`
fixes the target every session opens on, `--headed` shows the browser or
simulator when the engine supports it in sessions that do not set `headed`
(sessions are headless by default, as in `e2e run`), `--max-sessions <n>`
sets how many sessions may be open at once (default 4, 1 through 16; one on Bun).

## Tools

Five tools, all on the server registered as `e2e`; everything a session can
do is a catalog behind `call`. Clients show them with the server name, such
as `mcp__e2e__open_session` in Claude Code (`mcp__plugin_e2e_e2e__open_session`
from the plugin); when another MCP server offers a
tool with the same name, use the `e2e` server's.

| Tool | Does |
| --- | --- |
| `open_session` | Loads the config (`config` names another file; default the nearest `e2e.config.ts`), starts the declared app command if any, boots the engine, opens the app (its URL, or launches a device's pinned app; it installs no build, so a local device needs `app.bundleId`), and returns the session id, the catalog, and the first observation. Its summary names the app URL, a port assigned for `:0`, and the app command's readiness URL and `env` names; e2e starts nothing else, so a database the app uses runs outside it. The config reads the MCP server's environment, not your shell's. `target` is required when the config declares several. `headed: true` shows the browser or simulator when the user wants to watch; without it the session follows the server's `--headed`, headless by default. `test` runs one test first and leaves the session on the screen where it stopped (see Fixing a failing test). In a directory with no config, `engine` names the engine to open on, as a package name or `{package, export?, options?}`, with `app` for the app under test (Setup); it excludes `target`, `config`, and `test`. Each session has its own browser or device. |
| `tools` | The catalog: one line per tool with its argument names (`?` marks optional), the first sentence of its description, and `[read-only]` where it changes nothing. `tools {tool}` shows the full description and the JSON Schema of its arguments. |
| `call` | Runs one catalog tool: `call {tool: "tap", args: {target: "n42"}}`. Arguments are checked against the tool's schema first; a wrong one fails with `INVALID_ARGUMENT` naming the field. |
| `close_session` | Saves a recording still running, ends the attempt, disposes the engine, stops the app processes the session started once no other session uses them. |
| `run_tests` | Runs `e2e run` in its own process and returns its output: the command, the exit code, each test, the failure blocks, the summary. `files` takes `e2e run` positionals (`tests/checkout.e2e.ts:12`, a file, a directory, a glob); without it, every test runs. The other fields are `e2e run` flags in camelCase: `config`, `target`, `grep`, `grepInvert`, `tag`, `excludeTag`, `lastFailed`, `changedSince`, `headed`, `workers`, `retries`, `repeatEach`, `maxFailures`, `actionTimeout`, `noCache`, `updateSnapshots` (while fixing a test: `retries: 0, actionTimeout: 5000`). Needs no session. One run at a time (`RUNNER_BUSY`); cancelling the call interrupts the run. Exit 1 (a test failed) is a normal result; exit 2 and above is an error result. Output past 60,000 characters keeps its end; `.e2e/report.json` has every result. |

The catalog, per session:

| Catalog tool | Does |
| --- | --- |
| `observe` | A fresh observation: one node per line as `#id role "name" ...`, plus the current path. On the web engine a link's `href` is its path on the app URL's origin, else origin and path (`mailto:` and `tel:` keep their scheme, `blob:` its inner origin and path); `?…` and `#…` mark a dropped query or fragment, `data:…` and `javascript:…` an inline payload, a trailing `…` a target cut at 256 characters. |
| `tap`, `double_tap`, `long_press`, `right_click`, `hover`, `type`, `press`, `select`, `check`, `scroll`, `scroll_to`, `drag`, `upload`, `navigate`, `back`, `resize_viewport`, `switch_tab`, `close_tab`, `dismiss_keyboard` | The grammar verbs, as the testing agent gets them: `check` takes `checked`, `drag` a `to` node, `switch_tab` and `close_tab` a `tab` number counted from 1 in the order the tabs opened, `upload` project-relative `files` or `sample:` files (no test line for those); `dismiss_keyboard` comes with device engines. On an engine that declares `tapModifiers`, `tap`, `double_tap`, and `right_click` take an optional `modifiers` list (`Shift`, `Control`, `Alt`, `Meta`, `ControlOrMeta`) to hold keys for the click. Each reports what changed on screen and, after its lead, the test line that repeats it (`Test line: await screen.getByRole("button", "Save").tap();`) or `No test line:` and why; `observe` shows the whole screen. A verb the engine cannot honor is not listed and fails with `UNSUPPORTED_CAPABILITY`. |
| `type_secret` | Fills a configured secret by name: a credential's password into a password field, a `secrets` entry into any editable input; the plaintext never reaches the agent, and its test line names the credential or secret (`fill(credentials.user(name).password)`, `fill(secrets.get(name))`). Listed when the config declares `credentials` or `secrets` and the engine can fill secrets. |
| `locate` | Tries a semantic locator with exactly one of `role`, `text`, `label`, `placeholder`, `testId` (`name` only with `role`; `exact` optional; anything else is `INVALID_ARGUMENT`) and returns how many nodes match, which, and the `screen.*` call to write. |
| `run_code` | Runs test statements (`code`, as a test body writes them) on the session's `screen` and `app` with a test's waits, exactly-one rule, and matchers. Stops at the first failure and returns each statement's pass, failure (code and message), or read value, then what changed on screen. Each statement waits at most `timeout` ms (default 5000), but `timeout` doesn't stop a regex mid-match: avoid nested quantifiers such as `(\w+\s?)*`. The code is parsed, never evaluated as JavaScript: statements start with `screen`, `app`, or `expect(locator)`; arguments are literals, regexes, arrays, objects, locators, and `credentials.user(name).username`. A secret (`credentials.user(name).password`, `secrets.get(name)`) goes only into `fill`, under `type_secret`'s checks. Engine fixtures (`browser`, `device`), `app.screenshot`, and `toHaveScreenshot` are left out. Anything else is `INVALID_ARGUMENT` quoting the refused code with its line and column, and nothing runs. Reads and matchers see `<secret:name>` where a secret value is. When the config declares a secret or credential, a locator found by part of a text (a regex, an `exact` other than `true`, `hasText`) is `POLICY_DENIED` before anything runs: find it by its exact text. A matcher that expects `<secret:name>` is `INVALID_ARGUMENT`. The statements that pass, except reads, join `test_lines` as written. |
| `test_lines` | Every test line the session's actions printed and every statement `run_code` passed, in order, as a draft test body, starting with `await app.open();` for the session's own opening (after `open_session {test}`, the lines that continue that test, with no opening); an action without a line shows as a `//` comment. A line's locator matched the target alone on the live screen before the action (role and name first, test id last, narrowed to `{ visible: true }`, a container, or `.nth(i)` with a comment when twins share it); a fill names `credentials.user(name)` or `secrets.get(name)`, never a value; a navigation on the app's origin is written as its path. |
| `screenshot` | The masked pixels as an image. With `path` (a `.png` inside the project, relative to its root, not hidden or under a hidden directory), also saves a full-resolution masked capture there and returns its absolute path. |
| `tap_at` | Taps a point (`x`, `y` in the latest screenshot's pixels) where you aim. An engine without a bare-point tap taps the listed control under it by id instead, and fails on a point on nothing listed. Listed when the engine declares `tap` or a bare-point tap. |
| `hover_at` | Hovers a point the same way: the bare point, otherwise a listed control under it by id. Listed when the engine declares `hover` or a bare-point hover. |
| `drag_at` | Drags from one point (`x`, `y`) to another (`to_x`, `to_y`) where you aim. An engine without a bare-point drag drags by id instead when the points land on two different listed controls, and fails otherwise. Listed when the engine declares `dragTo` or a bare-point drag. |
| `type_at` | Types `value` into the field at a point: a listed input under it is filled by id; with a keyboard, anything else is tapped to focus it and typed into, at the caret unless `replace` is set. Without a keyboard a point on nothing listed fails. Listed when the engine declares `type` or a keyboard. |
| `press_at` | Sends one `key` (`Enter`, `Escape`, `Tab`) to the control at a point: a listed control gets it by id; with a keyboard, anything else is tapped to focus it and the key goes through the keyboard. Listed when the engine declares `press` or a keyboard. |
| `select_at` | Picks the option whose visible label is `value` in the select-like control at a point; the point must land on a listed select. Listed when the engine declares `select`. |
| `start_recording` | Starts a video of the app (`name` optional, for the file name). Listed when the engine records video. |
| `stop_recording` | Stops it and returns the absolute path of each video file, under `<output>/videos/<session>/` (`.e2e` by default), or the URL of a provider's own recording. |
| Project tools | Every `defineTool` in the agent's `tools` that applies to the target's platform, under its own name; an engine pack such as `mobileTools` adds `open_app`, `swipe`, `alert`. |

Project tools use their `toModelOutput` renderer for strings as well as
structured results. Its `error-text` and `error-json` outputs set the MCP
result's `isError: true`; treat them as failed calls.

`screenshot` masks secure fields only, after a secret fill too (topic
`writing-tests`). Before the session's first `screenshot`, a point tool
(`tap_at`, `hover_at`, `drag_at`, `type_at`, `press_at`, `select_at`) only
says to take one.

Resources: `e2e://guide` and `e2e://guide/<topic>` hold this skill.

## Workflow

1. Read topic `writing-tests` before you write or edit any test
   (`e2e://guide/writing-tests`, or `npx e2e guide writing-tests`); the
   server's instructions and every `open_session` result say so too. Then,
   before `open_session`, create `tests/<feature>.e2e.ts` (its "Structure"
   section) with its imports, the feature's `describe(...)`, a `test(...)`
   titled with the one behavior it verifies, and the call that opens the
   screen it covers, such as `app.open('/settings/members')`. A setup test
   (`test.setup`) goes top-level instead, outside any `describe`.
   Then `open_session`, which opens the app, and go to that screen: on the
   web, `call {tool: "navigate", args: {url: "<the path app.open names>"}}`;
   on a device, the shortest path from the launch screen. Actions that only
   got you there, such as a sign-in the test's saved session replaces, stay
   out of the test when its opening reaches that screen directly; otherwise
   they are its first steps. Node ids are valid only for the newest
   observation; an action reports what changed, so `observe` again before
   using new ids.
2. Walk the flow one screen at a time, and write each screen's steps into
   the file before you leave it. Do not walk the whole flow first and write
   the test from memory afterwards. Each step is one of two kinds:
   - An `agent.act` goal, the default for a path that varies: write the goal
     with the words on screen and its values in `params`, then walk its
     path in the session. Those actions stay out of the test, and so do the
     test lines they print.
   - A `screen` line, for an exact value or interaction: a sign-in form in a
     setup test, a field that must receive one specific string, an
     interaction that is the point of the test. Act on the control by node
     id, then copy the `Test line:` the action printed into the file. Its
     locator matched that control alone on the live screen. When the action
     prints `No test line:` instead, the reason says why; for a control no
     locator found alone, try one with `locate`, or write the line and run
     it with `run_code`.

   With several `screen` steps on one screen, take their actions, then add
   the lines they printed in one edit.
3. When the outcome shows, add its check to the test's assert block, after
   every step: an `agent.assert`, or an `expect` you ran first with
   `call {tool: "run_code", args: {code: "await expect(screen.getByRole('status')).toHaveText('Saved');"}}`.
   Build its locator from `observe`, or try it with
   `call {tool: "locate", args: {...}}`. One match: use the printed
   `screen.getByRole(...)` call. Zero or several: adjust before writing it;
   the same failure would hit the test as `LOCATOR_NOT_FOUND` or
   `LOCATOR_AMBIGUOUS`. A role query's `name` matches the accessible name
   only, while `observe` shows a `status`, `alert`, or `listitem` by its
   text: `status "Saved."` on an unlabelled status is its text, so match it
   with `getByRole('status').filter({ hasText: 'Saved.' })` or `getByText`.

   `run_code` runs statements as a test body writes them, in order, with a
   test's waits and matchers, and stops at the first failure. The
   statements that pass, except reads, join `test_lines` in the order they
   ran. When one fails, fix it from its code and message and the screen in
   the result, then run only the fixed statement and the ones after it:
   the app is where the passing statements left it, so starting over
   repeats their actions. Lines on an engine fixture
   (`expect(browser).toHaveURL(...)`) can't run there; write them from the
   screen, whose header names the current path. In a project with
   credentials or secrets, `run_code` refuses a locator found by part of a
   text, `filter({ hasText })` included: use the exact text instead,
   `getByText('Saved.')`, or `filter({ has: screen.getByText('Offer B') })`
   to pick a row. Raise `timeout` for a slow first `app.open`.

   When the walk ends, the test is written, every line you copied from a
   `Test line:` or ran with `run_code` has run once on the live app, and the
   first run checks the rest. If you missed a line, `test_lines` returns
   every line printed or passed so far, in order, the act goals' paths
   included, for the whole session rather than one test. A walk that goes
   on to a second behavior goes on into a second test in the same
   `describe`, with its own assert block: `navigate` back to the path its
   `app.open` names first, so its lines run from the state the test starts
   in. One walk, in order:

   ```text
   write   tests/members.e2e.ts: imports, describe('members'), test('invites a member as an editor'), app.open('/settings/members')
   call    open_session, then navigate {url: "/settings/members"}   its line is the app.open already written
   edit    + await agent.act('invite {email} as an editor', { params: { email: 'ada@example.test' } });
   call    tap, type, select, tap                   the goal's path; its test lines stay out
   call    run_code {code: "await expect(screen.getByRole('status')).toContainText('Invite sent');"}   passed
   edit    + that line, in the assert block
   write   + test('finds a member by name'), app.open('/settings/members')
   call    navigate {url: "/settings/members"}       the new test's fresh start
   call    type {target: "n40", value: "grace"}     prints the test line below
           Test line: await screen.getByRole("searchbox", "Search members").fill("grace");
   edit    + that line, as printed
   call    run_code {code: "await expect(screen.getByRole('listitem')).toHaveCount(1);"}   passed
   edit    + that line, in the assert block
   ```
4. Run only that test:
   `run_tests {files: ["tests/<feature>.e2e.ts:<line>"]}`, or
   `npx e2e run tests/<feature>.e2e.ts:<line>` from the shell (SKILL.md,
   "Rerunning a test while you fix it"). On a failure, fix from the run's failure block
   and the trace page (topic `debugging`), then rerun it the same way. To see a screen the evidence leaves out, go
   straight to it instead of walking the flow again from the start:
   `open_session {test}` stops on the failure screen (Fixing a failing
   test); otherwise, on the web, `navigate` to its path; on a device, the
   shortest path from the launch screen. Then `observe` and `locate`, or
   run the fixed line with `run_code`.
5. Leave the session open through those runs, on the screen under test,
   wherever Rules lets a run go beside it, so step 4's live look needs no
   new session. `observe` does not reload: `navigate` even to the screen
   the session is on when the run or a fix may have changed what it shows.
   A live look's actions print test lines too: copy a fixed line from its
   action, since `test_lines` also lists the looks after the first walk.
   `close_session` once the test passes; an idle session closes on its own
   after 30 minutes and never outlives 4 hours. When the client exits, every
   session closes and the app commands stop. To look at another project or
   config, `open_session {config: "path/to/e2e.config.ts"}` (absolute, or
   relative to the server's working directory); no restart needed.

## Fixing a failing test

When a run's evidence leaves out a screen the fix needs (topic
`debugging`), don't walk the flow again from the start over `call`. A
session runs the test and stops where it failed:

1. `open_session {test: "tests/<feature>.e2e.ts:<line>"}`, where `<line>` is
   the line of the test's `test(` call, not the failing line inside it. A
   file that holds one test needs no line. The test
   runs the way `e2e run` runs it: `beforeAll` and `beforeEach` hooks,
   `test.extend` fixtures, and the body, with the same locators, `expect`,
   and timeouts.
2. Read the text above the session summary: the outcome, the error code and
   message, the failing line with the code around it, the URL, the nodes on
   screen nearest a locator that matched nothing, and the steps that ran.
   The screen below it is the live screen where the test stopped.
3. `observe` and `locate` on that screen to find the right name or the
   missing step. Then carry on from there: act out the test's next lines
   with `call`, so the rerun finds no second mistake. Each action prints the
   `Test line:` that repeats it; where it differs from the test's line, use
   the printed one. Edit the test file. `test_lines` returns the session's lines,
   which start after the test's own.
4. To rerun, `close_session`, then `open_session {test}` again. The session
   loads the config and the test files fresh, so it runs the edited test
   from the start and stops on the next failure, or on the final screen.
5. `close_session`, then confirm once with
   `run_tests {files: ["tests/<feature>.e2e.ts:<line>"]}`.

- `afterEach` hooks and fixture teardown wait for `close_session`; a failure
  there shows as a `Cleanup (afterEach)` line in its result.
- The replay cache treats the test as a run's first attempt: an `agent.act`
  step recorded by `e2e run` or an earlier session replays, and a new one is
  recorded once a later check passes.
- The name follows `e2e run`'s positional rules and must select one test on
  the session's target. Several fail with `TEST_AMBIGUOUS`, which lists them
  as `file:line`; none fails with `NO_TESTS`.
- `SESSION_TEST_UNSUPPORTED`: a test in a serial group, a test that starts
  from a setup test's `session`, and a test that runs as several agents
  can't run alone in a session. Fix those with `run_tests`.

## Rules

- Record a demo or a bug for a pull request with `start_recording` once the
  screen is set up, and `stop_recording` when the part worth watching is
  over; `close_session` saves one still running. Videos are not masked:
  keep secrets off screen while recording.
- A failed action is an error result that leads with the tool, its target,
  and the code (`tap #n9 failed: LOCATOR_NOT_FOUND: ...`) and still shows
  the screen it re-observed: re-aim from that screen.
- Nothing a session does is recorded as a test, and only a test it runs
  (`open_session {test}`) reads or writes the replay cache. A session is for
  looking and trying; the test is the file you write as you walk.
- On the web, a session can stay open while `run_tests` or `e2e run` runs, unless the two
  collide over the app. Read the target's `app`:
  - No `command` (the app runs elsewhere): both use that app.
  - A `url` on port `0`: the session and each run start their own copy of
    the app. A dev server that allows one copy per directory, such as
    `next dev` in Next.js 16, fails the run with `APP_UNREACHABLE`; close
    the session before each run there.
  - A `command` on a fixed port with `reuseExisting: true`: a run uses the
    app the session started, and its data. Whichever started the app stops
    it: if the session closes during a run (`close_session`, 30 idle minutes
    or the 4-hour limit, since a run is not session activity), the app stops
    under the run. Its next navigation fails with `APP_UNREACHABLE`; a step
    already on the page fails with whatever the dead server breaks. Before a
    long run, `observe` once to reset the idle clock. With `CI` set, as in
    many agent sandboxes, `reuseExisting` is ignored: prefix the run with
    `CI=` to unset it, which also drops the other CI defaults (topic
    `running`), or close the session before each run.
  - A `command` on a fixed port without it: a run beside the session fails
    with `APP_ALREADY_RUNNING`. Offer the user `reuseExisting: true` (CI
    ignores it); never add it unasked. Until then, close the session before
    each run.
- On mobile, close the session before each run: a session and a run on one
  device fight over it. It can stay open only on a target whose `device` no
  run uses, with each run passing `--target` for another; an `app.command`
  both start (Metro) follows the web rules above. Ask before adding a
  target to the user's config (topic `setup`).
- Parallel agents (subagents) share one server: each opens its own session
  and passes its session id to every `tools`, `call`, and `close_session`.
  A call may leave `session` out only while one session is open. Sessions
  open at once share one config. Sessions on the same app command share its
  process, which stops when the last of them closes. On mobile, two sessions
  on one simulator fight over it: one target per device (topic `setup`), each
  session on its own target.
- `TARGET_REQUIRED`: pass `target` to `open_session` or start with `--target`.
  `UNKNOWN_TARGET`: no target of that name; the message lists the declared
  ones. `NO_SESSION`: call `open_session` first, or the session named has
  ended (the message says why). `SESSION_REQUIRED`: several sessions are open;
  pass `session`. `SESSION_OPEN`: every session slot is taken (close one, or
  raise `--max-sessions`). `CONFIG_IN_USE`: open sessions use another config,
  or were opened with `engine` and this one names a config; open the same
  way, or close them first. `ENGINE_NOT_INSTALLED`: run the install command
  the message names, or ask the user to when you cannot, then `open_session` again. `ENGINE_IN_USE`: the target's engine
  comes from a package every session shares; create it in the config or a
  file it imports by path. `UNKNOWN_TOOL`: the name is not in this session's
  catalog; the message lists what is. `TEST_AMBIGUOUS` and
  `SESSION_TEST_UNSUPPORTED`: see Fixing a failing test. `RUNNER_BUSY`:
  `run_tests` is already running a suite; wait for its result.
