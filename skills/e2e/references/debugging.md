# Debugging a failing run

Paths below sit under the configured `output` directory; `.e2e` is the
default.

## Contents

- Read the failure
- Error codes
- Tools
- Flaky tests
- Is it the app?

## Read the failure

1. Every failure in the `list` output names the failing line with a code
   frame, where the screen was (`❯ at`: a URL on the web, the app and
   screen title on a device), the nodes nearest a failed locator
   (`❯ on screen`), and ends with `❯ trace
   .e2e/results/<test>/trace.md`. Open that trace page: `Look at:` (the line it unwound
   through), `Expected:` / `Observed:` (an `expect`), `Asked for:` and
   `Waited:` (a locator), whether every attempt failed alike (a bug, not a
   flake), then every step with what it did under it:
   - the node an action landed on (`tap button "Save" (12ms)`), or `✗` and
     its code;
   - what an assertion read while it waited (`expect gave up after 16 reads
     in 1.6s: text "0 remaining" (1 match) x16`); one value throughout
     points at a wrong expectation, a broken app, or one slower than the
     timeout, changing values at a race;
   - what the app logged meanwhile (`✗ network error: POST /api/save 500`,
     `✗ uncaught error: ...`, `⚠ console warning: ...`, `ℹ console: ...`);
     `❯ app 2 errors` in the terminal quotes the first 3 errors, and the page's
     `## App log` lists up to 50 with their step, errors and warnings
     first, counting the rest;
   - where the page went (`↪ navigated to /login`, a new tab the app
     opened, a frame that loaded);
   - how the screen changed since the step before (`screen: 2 changes since
     step 3` with the added, removed, and changed nodes); `unchanged` after
     an action means it had no visible effect;
   - the cache's decision for an agent step: replayed, handed off and where
     (`at action 2 of 3, tap button "Apply": ...`), what became of the
     recording, and the entry file;
   - the agent's last turns, loop-guard notes included, and under
     `## Screen at failure` the nodes closest to what a failed locator
     asked for and the screen, one node per line.
   `trace` (default `retain-on-failure`) chooses which tests keep a page;
   `--trace` keeps one for every test of a run.
2. Fix from that evidence, never by walking the flow again from the start
   over MCP: the run already saw every screen up to the failure.
   - Fix every line it covers, not only the failing one. `observed` is what
     the screen showed; a `❯ on screen` node is most likely what a failed
     locator meant; the screen at failure (also `screen-at-failure.txt`,
     item 5) holds the names the rest of that screen's lines need.
   - A test stops at its first failed step (an `expect.soft` lets it go
     on), and every wrong line after it costs another run. Before
     rerunning, check the lines after it as far as you can: against the
     screen at failure, the app source, or a live session.
   - For a screen the evidence and the source leave out, look live (topic
     `mcp`): open or reuse a session, go straight to that screen, then
     `observe` and `locate`, or `run_code` for the fixed line and the ones
     after it. On the web, `navigate` to the path of the `❯ at` URL or the
     screen's route, and tap only to reach a state no URL opens. A device
     session starts on the app's launch screen: take the shortest path from
     there.
   - Then rerun only that test by `file:line` (SKILL.md, "Rerunning a
     test while you fix it"; topic `mcp` says when a session must close
     first).
3. `.e2e/report.json` holds the same facts for scripts, not for reading:
   each step's `events` (`engine`, `poll`, `navigation`) and the attempt's
   `appLog` (each line's `step` is a step `index`) are what the page's step
   lines are rendered from, before it filters and caps them.
4. When a script needs them:

```bash
jq '.run | {status, exitCode, errors}' .e2e/report.json
jq '.run.results[] | select(.selected and .status != "passed") | {titlePath, file, status}' .e2e/report.json
jq '.run.results[] | select(.selected and .status != "passed") | .attempts[-1]
    | {status, error, failure, steps: [.steps[] | select(.status != "passed") | {api, label, source, status, error}], artifacts}' .e2e/report.json
```

   `error.details` holds the facts, `error.source` the line, `failure` the
   `url`, `screen` and `screenshot` artifact ids, and `candidates`; a
   failed agent step has `turns`; any agent step has
   `observationTruncated: true` when a semantic observation was incomplete;
   `selected` drops filtered-out tests
   (recorded as `skipped`).
5. Artifacts, under `.e2e/results/<test>/attempt-<n>/` (`rerun-<n>/attempt-<m>/`
   for a `--last-failed` rerun), beside the
   trace page: `screen-at-failure.txt`
   and the engine's screenshot per failed attempt; downloads; with
   `--video` the recording (`video/video.webm` in a local browser, each
   later page `video/video-part<n>.webm` with its own `startedAt`;
   `video/video.mp4` on a device; a provider's file or link); with
   `--debug` every agent step's transcript.

## Error codes

| Code | Usual cause | Fix |
| --- | --- | --- |
| `CONFIG_LOAD_FAILED` | The config throws while loading (a refused engine option is `INVALID_CONFIG` instead) or imports a missing package, subpath, or removed export such as `defineConfig` | Install the dependency, or fix the import or line quoted |
| `INVALID_CONFIG`, `INVALID_GLOB` | Unknown or foreign key (`app`, `webServer`, `use`, `projects`, `baseURL`), `json` with `list`; a `tests` glob with braces, classes, an absolute path, or no wildcard | The message names the key or glob to write; the app is declared in the target's `app` |
| `CONFIG_NOT_FOUND` | Wrong `--config` path, or an MCP `open_session` in a directory with no config | Fix the path; in a directory with no config, pass `engine` to `open_session` (topic `mcp`) |
| `CONFIG_AMBIGUOUS` | Both `.ts` and `.mts` present | Keep one |
| `ENGINE_NOT_INSTALLED` | An MCP `open_session {engine}` named a package that is not in the project, beside e2e, or in `~/.e2e/engines` | Run the install command the message names |
| `NO_TESTS` | The glob, a positional, or a filter matched nothing; the message names each empty positional and each undeclared `--tag` with the nearest declared one | Check the config `tests`, the file suffix (`.e2e.ts` by default), the tag names |
| `NO_LAST_RUN` | `--last-failed` found no `.e2e/report.json` | Run once without it |
| `INVALID_CHANGED_SINCE` | `--changed-since` names no commit in the checkout, shares no history with HEAD (a shallow clone, or unrelated histories), or git is missing | Run from a git checkout with git installed; check the ref; fetch it and more history (`git fetch --unshallow`, or `fetch-depth: 0` on `actions/checkout`); for unrelated histories, name a ref on HEAD's history |
| `COLLECTION_ERROR` | `async` describe body, `test.setup` inside `describe`, an option forbidden in a serial group, registration outside collection | Restructure per `writing-tests` |
| `HOOK_FAILED` | `beforeAll` or `afterAll` threw; its scope's tests skip | Fix the hook; the report carries its error |
| `UNSUPPORTED_ARTIFACT` | A test's or target's `video` on an engine that cannot record | Drop it there, or set it at the config root or CLI (such targets skip with a notice) |
| `BROWSER_INSTALL_FAILED`, `LAUNCH_TIMEOUT` | Browser download failed; engine init or attempt start exceeded `launchTimeout` | Run the quoted `npx @e2e-dev/web install <names>` or `pnpm exec e2e-web install <names>` (`--with-deps` on bare Linux); raise the root `launchTimeout` (60 s default) |
| `APP_UNREACHABLE` | The app failed readiness or its command exited. An exit after readiness stops only dependent targets with unfinished work. On a device, the message can identify a failed iOS automation runner | Read the exit details and any log excerpt. Set `app.command.log` if requested. Check `app.url`, the port, and the command settings. Runner: rerun, else `npx agent-device daemon stop` and reboot the simulator |
| `APP_ALREADY_RUNNING` | Something already serves `url` when `command` should start, such as the app an open `e2e mcp` session started | A session's app: `close_session` before the run (topic `mcp`). Otherwise stop it if you started it, else offer the user `reuseExisting: true` (CI ignores it) |
| `APP_URL_REQUIRED`, `APP_NOT_OPEN` | A navigation on a target without `app.url`; a `screen` call before `app.open()` | Add `app.url` to the target; open the app first |
| `INVALID_ARGUMENT`, `INVALID_LOCATOR` | A step argument failed validation; a locator got a bad option or filter key | Fix the call the code frame names |
| `LOCATOR_NOT_FOUND` | Wrong role or name, inexact text, element off screen or in an iframe, page not open | Read the markup for the accessible name; `exact: false` or a RegExp; `browser.frameLocator` for iframes; `app.open()` first; `--headed` |
| `LOCATOR_AMBIGUOUS` | Two matches (hidden duplicate, repeated label) | `{ name }`, a container scope, `filter`, `first()`, or `{ visible: true }` |
| `ASSERTION_FAILED` | Wrong expectation, or the state settles later than 5 s; for `agent.assert`, a false judgment (explained in the report) | Compare with the report's actual text or the screenshot; `{ timeout }` on the matcher; rewrite the question |
| `ASSERTION_INCONCLUSIVE` | `agent.assert` or `agent.extract` asked about what the screen does not show (another page, still loading, only in pixels, inside a frame from another site); a failure, never a pass | `app.open()` or `agent.waitFor` the right screen first; ask about what is shown; `vision: true` when the answer is in pixels (the message says so) |
| `MODEL_OUTPUT_INVALID` | An `extract` or `assert` answer failed the schema after one repair round | Simplify the schema or question; pick a stronger model |
| `ACTION_FAILED` | Element not actionable (covered, disabled, detached), or an operation timed out | `waitFor` the condition right before the action that failed; close overlays; check `actionTimeout` |
| `TEST_TIMEOUT` | The attempt exceeded `timeout` (120 s) | Split the test, or raise `timeout` |
| `STEP_NOT_AWAITED` | The body returned while a step or `expect.poll` still ran, or an `afterEach` hook or fixture teardown returned while an `expect.poll` still ran: a call without `await` | `await` the call the code frame names (every `app`, `agent`, `screen`, `expect`, `expect.poll` call) |
| `MODEL_UNAVAILABLE` | `agents.<name>.model` holds no AI SDK instance: reported once under `run.errors` at the first `agent` fixture; the run stops. A model-less custom executor fails only `waitFor` and `extract` this way. Also GitHub Copilot refusing the configured model to the account (`model_not_supported`, a plan or settings limit the listing cannot show): reported once at the first call, the run stops | Construct one, e.g. `gateway('openai/gpt-6-luna-fast')` from `ai`, and export its key (`AI_GATEWAY_API_KEY`); for Copilot, pick an id the plan serves |
| `MODEL_PROVIDER_FAILED` | Network, 5xx, rate limit, no credits, or no response in 120 s, after the transport retries | Check the credential (the key; for keyless `gateway()` the Vercel CLI login and `.vercel/project.json`) and quota; retry (exit 3) |
| `MODEL_REFUSED` | The model refused the prompt (finish reason `content-filter`). Exit 1 | Rephrase the prompt or instruction, or switch to a different model |
| `REPLAY_STALE` | `--strict-cache` or `cache.strict`, and a committed recording no longer replays; `step.cache.reason` says why | Rerun read-write with the knob the message names off; commit the changed entry under the directory it names (a custom `cache.store` is written by that run) |
| `AUTOMATION_UNSUPPORTED` | The step needs an interaction the engine's toolset lacks (a right-click on a device, say); blocked, exit 1 | Reach the result another way the engine supports (a long press, a menu button), or run the test on a target that supports it |
| `STEP_TIMEOUT`, `STEP_BUDGET_EXHAUSTED` | Goal too big or ambiguous, or a slow provider | Split the goal, use on-screen wording, add vocabulary via `agents.<name>.context` or `agentContext`; raise `maxSteps` or `maxModelCalls` (budget), the config `timeout` (`act`), `judgmentTimeout` (judgments); `--debug` |
| `CONTEXT_OVERFLOW` | Screen plus step history did not fit the model's context window (`act` after one shrink-and-retry; a judgment on the first overflow) | Lower `agents.<name>.maxObservationBytes`, split the step, or pick a larger-window model |
| `POLICY_DENIED` | A URL whose scheme is not `http:` or `https:` (`file:`, `view-source:`, `data:`); a password `Secret` into a non-password sink; reading a secure field, `toHaveValue`, `toHaveText`, `toContainText`, `toHaveAttribute` included; `vision: 'only'` with pixels withheld | http(s) or `about:blank` only; passwords into password inputs only; assert the outcome, not the value |
| `UNSUPPORTED_CAPABILITY` | A fixture the engine lacks (`browser` on a device), `schema` or `vision` on `act`, an action the surface lacks | Declare `requires: ['browser']`; drop the option or action |
| `SESSION_UNAVAILABLE`, `SESSION_CONTRACT` | `session: 'x'` with no setup saving `x`; a setup that skipped a declared name. `SESSION_MISMATCH`, `SESSION_EXPIRED`, `SESSION_INVALID`: the stored session is another run's or app's, expired, or corrupt | Add or fix the `test.setup`; rerun it |
| `ONLY_IN_CI` | `test.only` reached CI | Remove it |
| `AUTH_CREDENTIAL_UNAVAILABLE`, `AUTH_CREDENTIAL_INVALID` | `credentials.user('x')` for an undeclared name; the app rejected a configured credential | Add it to `config.credentials`; fix the stored value |
| `SECRET_UNAVAILABLE` | `secrets.get('x')` for an undeclared name | Add it to `config.secrets`; `E2E_SECRET_X` only overrides a declared one |

## Tools

| Do | When |
| --- | --- |
| `--headed` | Watch the failing step |
| `--step --headed` | A person steps through the test one key per step |
| `--step`, then `e2e run --step next` | An agent steps through the test: each command prints how the step it ran ended and returns at the next held step with the screen it waits on; `stop` ends the run |
| `--workers 1 --retries 0` | Take parallelism and retries out of the picture |
| `--action-timeout 5000` | While writing a test: a wrong locator fails in 5 s instead of 30 s (`--assertion-timeout` for `expect`). Keep it longer than the slowest screen takes to load |
| `--no-cache` | Rule out a stale `agent.act` replay; one run, not every rerun. A failed run already deletes the replay that ran into the failure, so rerun with the cache on first. When the failure repeats after a replay the trace page shows as kept and the `--no-cache` run passes, tighten the next check or wait after that goal (the arrange block's closing wait, or the assertions): the stale replay then fails it and is deleted |
| `--debug` | Each agent step's duration, model calls, cost, transcript |
| `--ai-trace`, then `npx unbox-ai runs .e2e/ai-trace.json` | What the model saw and called |
| `--video`, `--video=retain-on-failure` | Watch the failed attempt; `step.startedAt` minus the segment's `startedAt` is the step's offset into it |
| `command.log: '.e2e/logs/app.log'` | The app's output when it never gets ready or errors mid-test |
| `await app.screenshot('before-submit')` | Evidence at a point you choose; it masks secure fields only |
| `app.startRecording()`, then `await app.stopRecording()` | One transition as a video; fails while the test's `video` records |
| `CI=1 npx e2e run` | Reproduce CI-only behaviour (defaults: topic running) |

## Flaky tests

- A read (`textContent()`, `count()`) caught a value mid-update: use a
  matcher.
- Shared data: unique names per run, `afterEach` cleanup, or a `serial`
  group.
- App not ready: assert on the element you are about to use, not the
  previous page.
- An agent judgment asserts exact phrasing: judge the fact, add a
  deterministic `expect` beside it.
- Load timing: `retries` masks it; `--workers 1 --headed` shows it.
- Measure a fix: `npx e2e run <file> --repeat-each 10 --retries 0`
  (`--no-cache` for agent steps). `Repeats` reads `0 of 1 test passed all
  10 runs` over `3/10 passed · repeat 0 ASSERTION_FAILED · ...` (0-based)
  before, `1 of 1 test passed all 10 runs` after.

## Is it the app?

A deterministic step failing every run at the same place with the same code
is a product bug or a changed screen, not a flake: reproduce once with
`--headed`, then fix the app or update locator and expectation together. A
blocked agent step (`AUTH_CREDENTIAL_UNAVAILABLE`, `ENVIRONMENT_UNAVAILABLE`,
`SEED_DATA_MISSING`) exits 2 or 3 on purpose: fix the environment.
