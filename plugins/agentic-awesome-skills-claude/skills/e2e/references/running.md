# Running tests

Follow the [authorization and test data boundaries](../SKILL.md#authorization-and-test-data) before setup, live testing, or sharing results.

## Contents

- Commands
- The replay cache
- Output
- Exit codes
- Continuous integration

## Commands

```bash
npx e2e run [files...] [options]   # run tests
npx e2e explore [goal] [options]   # explore toward a goal without a test file (topic explore)
npx e2e list [files...] [options]  # print what run would select
npx e2e doctor [--check-model]     # can a run start: config, engine setup, models;
                                   # --json for a host, exit 2 on a failed check
npx e2e init [directory] [--yes]   # scaffold a project, refresh the agent skill
npx e2e guide [topic]              # print this skill; topics: setup, writing-tests, agent,
                                   # running, explore, debugging, mcp, bug-bash
npx e2e cache ls|clear|stats       # inspect or empty the replay cache
npx e2e login|logout|models [provider]  # e2e/oauth subscription logins: openai,
                                   # github-copilot, opencode-console, spacexai
npx e2e mcp [--target <name>]      # MCP server for a coding agent (topic mcp)
npx e2e upgrade [version|tag]      # e2e and its @e2e-dev packages to latest or a version;
                                   # alias update, --dry-run shows the plan; updates
                                   # this skill's copies too; an e2e without the
                                   # command: npx e2e@latest upgrade
npx e2e feedback -m <text> [opts]  # report a problem with e2e itself
npx e2e telemetry [disable|enable] # anonymous usage telemetry: status or switch
```

`run` flags:

| Flag | Effect |
| --- | --- |
| `[files...]` | Files, directories, quoted globs relative to the project root, or a bare name (`signup`, `signup.e2e.ts`, `agent/signup.e2e.ts` all select `tests/agent/signup.e2e.ts`); `file:line` is the test whose `test(` opens on that line. They narrow the config `tests` glob, never bypass it. |
| `--config <path>` | Config file; default `e2e.config.ts` or `.mts`, found upward. |
| `--target <ids>` | Target names, comma-separated or repeated; only these start their app commands. Unknown names fail before startup. |
| `--tag <tags>` | Any of the tags, comma-separated or repeated; all of them with `--tag-mode all`. An empty `--target`, `--tag`, or `--agent` value is a usage error, exit 2. |
| `--exclude-tag <tags>` | Drop tests carrying any of these tags, however selected. |
| `--grep <pattern>`, `--grep-invert <pattern>` | Keep, or drop, tests whose title (describe titles and test title joined by spaces, `checkout pays`; not file or tags) matches a regular expression. Bare pattern or `'/pattern/i'`; repeat for alternatives. |
| `--changed-since <ref>` | Run the configured `filters` on the change since the ref: every file that differs from the merge base of the ref and HEAD, uncommitted and untracked included (`--changed-since origin/main`). Each target starts the files of the tests the filters score likeliest first (`relevance`, see topic `setup`). Without it no filter runs. A ref git can't measure from is `INVALID_CHANGED_SINCE`, exit 2. |
| `--last-failed` | The tests the previous run (`<output>/report.json`) did not pass or never ran (`--max-failures` and `--max-duration` included), plus every test in a failed `beforeAll` or `afterAll` scope. A test another filter leaves out stays owed (`run.carried` in the report) until a rerun runs it. No report is `NO_LAST_RUN`, exit 2. |
| `--shard <index/total>` | One contiguous slice of the selected tests (`--shard 2/3`), cut after every other flag; serial groups stay whole, each shard brings its own setup tests. |
| `--headed` | Visible browser or simulator when the engine supports it. |
| `--agent <names>` | Run unpinned tests as these `agents.<name>` entries (default `agents.default`), comma-separated or repeated; several names run each such test once per agent. |
| `--workers <n>`, `--retries <n>` | Override the resolved values; retries 0-10, workers 1-1024. A retry replays the cache only in strict mode (`--strict-cache`, `cache.strict`); otherwise it runs every agent step live. |
| `--action-timeout <ms>`, `--assertion-timeout <ms>` | Override config `actionTimeout` (default 30000) and `assertionTimeout` (default 5000) for this run; a call's own `{ timeout }` still wins. |
| `--max-failures <n>` | Stop after n failures: the rest skip (cause `failure-limit`), running tests end `interrupted`; exit 1. |
| `--max-duration <ms>` | Stop after ms of running tests, over config `maxDuration`: the rest skip (cause `time-limit`), running tests end `interrupted`, `RUN_TIMEOUT`; exit 1. |
| `--repeat-each <n>` | Run every selected test n times, each run its own result (`repeat` 0 through n-1); add `--no-cache` or later runs replay the first's recording. The `Repeats` summary row names each unstable test's failed runs. |
| `--reporter <ids>` | `list`, `json`, `junit`, `markdown`, comma-separated; `json` cannot combine with `list`. An empty value is a usage error, exit 2. |
| `--output <dir>` | Results directory, over the config's `output` (default `.e2e`). Must be inside the project root, not the root itself (`INVALID_CONFIG`); to keep reports elsewhere, copy them after the run. |
| `--no-cache` | Replay cache off for this run. |
| `--strict-cache` | Fail a step whose committed recording no longer replays (`REPLAY_STALE`, exit 2) instead of handing it to the agent; retries replay too, and the run never writes the cache. |
| `-u`, `--update-snapshots` | Write the stored screenshots `toHaveScreenshot` finds missing or different, and pass. |
| `-w`, `--watch` | Run, then run again when a test file, a source file beside the tests, or the config is saved, or a key asks: `a` or enter all, `r` the current filters, `f` failed, `u` update snapshots, `p` and `t` filter by file and title, `q` quit; a key during a run cancels it. Refused in CI and with `--reporter json`. |
| `--pass-with-no-tests` | Exit 0, not `NO_TESTS`, when nothing matches; a run with nothing to run starts no engine or app. |
| `--step` | Run the first step, then hold each later one until a key at its prompt: Enter runs it, `n` the rest of the test, `a` the rest of the run, `h` lists the keys, `q` stops (exit 130). Without a terminal (an agent's shell) the run goes on in the background and each command returns at the next held step with the screen it waits on: then `e2e run --step next` runs that step, `rest` the rest, `stop` ends the run; run them from the same directory. A shell with a terminal gets the key prompt instead: redirect stdin from the null device (`< /dev/null`, or `< NUL` in Windows `cmd`). Refused in CI, with `--watch`, `--workers` above 1, and the json reporter. |
| `--debug` | Phase timings and an agent step table on stderr; transcripts as artifacts. |
| `--ai-trace` | Every model call except a test filter's, to `<output>/ai-trace.json`. |
| `--timings <file>` | The timings history to update, over `<output>/timings.json`. With more than one worker, files with no recorded time start first, then the rest longest first. |
| `--trace [mode]`, `--video [mode]` | Which tests keep a trace page (`<output>/results/<test>/trace.md`), or which attempts record a video (WebM on browsers, MP4 on devices), over the config and every target: bare is `on` (`--trace` then pages every test, passing ones too); `--trace off` writes none; `retain-on-failure` keeps only failures; `on-first-retry` keeps first retries, `on-all-retries` every retry. A test's own `trace` or `video` still wins; targets whose engine cannot record video are skipped with a notice. Both are greedy: write `--video=<mode>` or put test files first. The failure recap names the trace page and the video. |

```bash
npx e2e run tests/signup.e2e.ts
npx e2e run signup.e2e.ts:12   # by bare name, the test declared at line 12
npx e2e run tests/agent --tag smoke --exclude-tag slow --grep checkout
npx e2e run --last-failed   # the loop after a red run
npx e2e run --changed-since origin/main   # the configured filters judge the change
npx e2e run --shard 2/3     # one CI job of three
npx e2e run 'tests/**/*.smoke.e2e.ts' --target chromium --workers 1 --retries 0
CI=1 npx e2e run            # the CI defaults, locally
```

`list` takes the same files and selection flags (`--config`, `--target`,
`--tag`, `--tag-mode`, `--exclude-tag`, `--grep`, `--grep-invert`,
`--changed-since`, `--last-failed`, `--shard`, `--pass-with-no-tests`),
prints one line per test-target pair, `file › title [target] #tag`, skipped
pairs ending in ` (skipped: <reason>)`, and starts no app, engine, or
worker. With `--changed-since`, the configured filters run as for `run`; a
pair one left out ends in ` (left out by <filter>: <reason>)`. `--reporter json` prints
`{ "pairs": [...] }`, naming a skip or left-out reason `reason` and the
filter that left a pair out `filter`.

`import { list } from 'e2e/runner'` returns that selection plus the pairs a
filter removed, positional arguments that matched no file, and the selected
target names.

```bash
npx e2e list tests/signup.e2e.ts --tag smoke --reporter json
```

`import { run } from 'e2e/runner'` executes the suite and returns its report
without exiting the caller. Pass `cwd`, `config`, and `files` to select the
project and tests, and `changedSince` to run the configured test filters on
the change since that ref;
`onEvent` receives progress and `interruptSignal` cancels
with teardown. A runtime config uses one in-process worker. Await each run
before starting the next and close every host first; overlaps reject with
`RUNNER_BUSY`.

`import { explore } from 'e2e/runner'` runs one exploration the same way:
`cwd`, `config`, `goal`, `target`, `agent`, `session`, `maxSteps`, and
`timeoutMs` as `e2e explore` takes them, plus `onEvent` and
`interruptSignal`. It resolves with the run's result and `explore`, the
record of the steps, findings, and why it ended. A goal or budget out of
range, an unknown target or agent, or an agent with no model rejects before
it starts (`INVALID_CONFIG`, `UNKNOWN_TARGET`, `MODEL_UNAVAILABLE`); branch
on `isE2EError(error)` and `error.code`. It shares `run`'s reservation.

With a `package.json` script `"test:e2e": "e2e run"`, pnpm forwards `--`
literally: `pnpm test:e2e -- --headed` reaches e2e as `run -- --headed` and
exits 2. Write `pnpm test:e2e --headed` or `pnpm exec e2e run --headed`.
With npm, use `npm exec -- e2e run --headed` to pass flags to e2e.

## The replay cache

Entries live under `.e2e/cache/`, one file per key, named by key digest.
`E2E_CACHE_DIR` or `--cache-dir <dir>` (on `run` and `cache`) replaces
`cache.dir` (file store only), so worktrees can share one directory; the mode
stays as configured.
`cache` commands read the same config as `run` (`--config`, `cache.dir`);
with a custom `cache.store` they refuse (exit 2), inspect that store with
its own tools.

| Command | Prints |
| --- | --- |
| `e2e cache ls` | One row per entry: test, target, instruction digest, age, action count. |
| `e2e cache stats` | Directory, entry count, total size. |
| `e2e cache clear` | Deletes the entries and the directory; files the runner never wrote stay. |

## Output

`<output>` (`.e2e` by default) holds `report.json`, `junit.xml`,
`summary.md`, `ai-trace.json`, `timings.json` (how long each file took; with more than one worker the next run starts the longest known files first, after any with no time), `sessions/`, and `results/`, one directory
per test with its `trace.md` and an `attempt-<n>/` per attempt
(screenshots, videos, `--debug` transcripts, downloads).
`results/` is cleared once a run's tests start; a run stopping before
leaves the last run's files, and a `--last-failed` rerun keeps the files
the report it reruns names and writes its own under each test's `rerun-<n>/`. The report records every artifact path, a
hosted service's video by URL.

- `list` (default): setup steps, one line per file and target (when stdout
  is not a terminal, each test also prints as it finishes), a `Failed
  Tests` section (error, code, failing line, code frame), then the
  summary rows `Test Files`, `Tests`, `AI`, `Cache` (when the replay cache
  ran), `Repeats` (with `--repeat-each`), `Errors`, `Start at`, `Duration`,
  `Traces` (when a page was written), `Screenshots` (the first 10
  `app.screenshot` files, then a count), `AI trace` (with `--ai-trace`), and
  last `Failed`, one entry per failed test (file and line, error's first
  line, trace page when written), so `| tail` keeps it. Past a minute `Duration`
  repeats as minutes and seconds, setup time split out as `startup` in the
  same parenthetical (`682.97s (11m 23s, startup 43.00s)`).
- `report.json`, for scripts rather than reading (`jq`, CI tools; a reader
  takes the terminal and the trace pages), the one record of every result,
  passing ones included, written whatever the reporters, holds `run.status`,
  `run.exitCode`, `run.errors[]` (run-level, such as `APP_UNREACHABLE`),
  and `run.results[]`, one per test and target: `titlePath`, `file`,
  `source`, `tags` (`[]` when none), `agent`, `repeat` (0 unless
  `--repeat-each`), `selected`, `status`, `attempts[]` of `steps[]`,
  `artifacts[]`, `error`. `run.summary` counts the selected results:
  `passed`, `failed` (timed out included), `interrupted` (stopped by the
  run: a signal, `--max-failures`, `--max-duration`, a run-level error; not a failure), `flaky`, and `skipped` add up
  to `selected`; `discovered - selected` were left out.
- `junit`: `junit.xml` for CI summaries; `--reporter list,junit` keeps the
  terminal output. A case with a failure screenshot links it as
  `<system-out>[[ATTACHMENT|<path>]]</system-out>`, relative to
  `$CI_PROJECT_DIR` (else the project root), which GitLab shows in the
  test report.
- Every run that reaches its tests also writes a trace page per failed,
  timed-out, interrupted, or flaky test, `results/<test>/trace.md` (the
  `trace` mode, default `retain-on-failure`): every step with what
  it did, the cache's decisions, what the app logged, the last model turns,
  and the screen at failure. The `list` output names it under each failure
  (`❯ trace <path>`). Read it first.
- `markdown` (`--reporter list,markdown`): `summary.md` with counts and
  spend, a block per failed test linked to its page, the flaky tests folded
  alike, and every test as one folded table (or an exploration's findings
  and assessment). Paste it into a pull request or handoff.
- `json`: the report on stdout.
- Custom reporters get step progress with `identity` (`attemptId`,
  `attemptIndex`, `stepId`, `stepIndex`: report IDs, zero-based indexes;
  retries change the attempt, serial members share the group's attempt with
  distinct step IDs) and an `end` phase carrying the redacted error and the
  `blocked` and `cancelled` statuses. Older streams may lack `identity`.
- `github()` from `@e2e-dev/github`: on GitHub Actions, one pull request
  comment per run (edited on rerun) plus the job summary; needs
  `pull-requests: write` and `GITHUB_TOKEN` (or `GH_TOKEN`) in the step's
  env.
- `htmlReporter()` from `@e2e-dev/html-reporter`: `<output>/report.html`
  (`.e2e/` by default), one page that opens from disk, with each test's
  steps, screenshots, and video. It links media from `<output>/results/`;
  `media: 'embed'` puts it in the page, one file to share, except downloads
  the runner could not scan for secrets, and `media: 'none'` leaves it out.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | Every selected test passed, was flaky, or was skipped |
| 1 | A test or setup test failed or timed out |
| 2 | CLI, config, collection, credential, model-config, or policy error |
| 3 | Engine, app process, model provider, artifact, or cleanup failure |
| 4 | Internal runner error |
| 130 | Interrupted by an external signal |

The highest code present wins (`130 > 4 > 3 > 2 > 1 > 0`). 130 needs an
external signal: a `--max-failures` or `--max-duration` stop or a run-level error that
interrupted workers keeps the failures' or the error's code. Exit 2 is
deterministic, never retry it; only exit 3 is worth a job-level retry.

The first SIGINT or SIGTERM interrupts and writes the report if any test
had started; the second forces engine teardown and still writes the
report, plus `junit.xml` and `summary.md` when those reporters are on; the
third kills the app process groups and exits 130 at once.

## Continuous integration

CI mode is on when `CI` is set (not `0` or `false`): `retries` 1,
`workers` 1, `test.only` rejected with
`ONLY_IN_CI`, the replay cache `read-only` unless the config sets a mode explicitly
(`cache: 'read-write'` or `cache.mode`), `reuseExisting` ignored.

`npx e2e init --yes --ci github-actions` writes a workflow like this one with
a job per platform the config's targets run on (web, iOS, Android), for the
project's package manager and model key; `--ci gitlab` writes the same jobs as
`.gitlab-ci.yml` (or `.gitlab/e2e.gitlab-ci.yml` to include beside an existing
one), its mobile jobs on self-managed runners. The mobile jobs build an Expo or
bare React Native app; for any other app, replace the failing build step. It
leaves existing pipeline files alone. Set `app.command` in the config so the
runner starts the app.

```yaml
# .github/workflows/e2e.yml
# Omits the github() reporter: it needs pull-requests: write and
# GITHUB_TOKEN in the run step's env.
name: e2e
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@9fd676a19091d4595eefd76e4bd31c97133911f1 # v4.2.0
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 26 # Node >= 24.8, or >= 22.22.3 on 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm exec e2e-web install chromium --with-deps
      - run: npx e2e run --reporter list,junit
        env:
          AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}
          E2E_USER_ADMIN_USERNAME: ${{ secrets.E2E_USER_ADMIN_USERNAME }}
          E2E_USER_ADMIN_PASSWORD: ${{ secrets.E2E_USER_ADMIN_PASSWORD }}
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: e2e-report
          path: |
            .e2e/report.json
            .e2e/junit.xml
          if-no-files-found: warn
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: e2e-artifacts
          path: .e2e/results
          if-no-files-found: warn
          retention-days: 7
```

- Install browsers as their own step so the download stays out of the
  launch timeout.
- Upload artifacts unless cancelled, so a test that failed then passed on
  retry keeps its evidence.
- Start the app through the target's `app.command`; the runner tears it down
  on every exit path.
- Agent steps run in the same job: pass the key the config's model reads
  (`AI_GATEWAY_API_KEY` for `gateway()` from `ai`) as a secret in the run
  step's `env`, and commit `.e2e/cache/` so recorded steps replay with no
  model call.
- To run only the tests a pull request can affect, install
  `@e2e-dev/decision ai`, add
  `filters: [decisionFilter({ model: gateway.decisionModel('typesafe-ai/jev') })]`
  with `decisionFilter` from `@e2e-dev/decision` and `gateway` from `ai`,
  pass `AI_GATEWAY_API_KEY` in the run step's `env`, give
  `actions/checkout` `fetch-depth: 0`, and run
  `npx e2e run ${{ github.event_name == 'pull_request' && format('--changed-since origin/{0}', github.base_ref) || '' }}`.
  Filters run only with `--changed-since <ref>`, which that expression
  passes on `pull_request` alone; never pass it on `pull_request_target`.
  Every test runs without it and on a `--last-failed` rerun. The decision
  filter also runs every test on a lockfile or `e2e.config` change, and the
  tests whose test file, setup file, or stored screenshots changed. It scores
  each test, and each target starts the likeliest files first. With one worker
  (the CI default) only the relevance bands order files and collection order
  breaks ties, since the timings history matters only above one worker. On GitLab, pass `--changed-since ${CI_MERGE_REQUEST_TARGET_BRANCH_SHA:-$CI_MERGE_REQUEST_DIFF_BASE_SHA}`
  on merge request pipelines, not merge trains, with `GIT_DEPTH: 0`. Preview
  with `npx e2e list --changed-since origin/main`, after committing: the
  decision filter reads what the commits change, and a file only the
  working tree changes by name alone.
  Reference: https://e2e.com/docs/filters
