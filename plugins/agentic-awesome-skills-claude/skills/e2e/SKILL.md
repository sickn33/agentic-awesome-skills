---
name: e2e
description: "Write, run and debug e2e tests for web and iOS/Android apps that mix plain-language agent steps with exact assertions, replaying cached agent steps without model calls."
category: testing
risk: critical
source: https://github.com/e2e-inc/e2e/tree/e693cdcf0baee66dead26fa2e51a6693266b4b8f/skills/e2e
source_repo: e2e-inc/e2e
source_type: official
date_added: "2026-11-17"
author: e2e-inc
tags: [e2e, end-to-end-testing, mobile-testing, ios, android, playwright, agentic-testing]
license: Apache-2.0
license_source: https://github.com/e2e-inc/e2e/blob/e693cdcf0baee66dead26fa2e51a6693266b4b8f/LICENSE
---

# e2e: agentic end-to-end tests

AAS import of [e2e-inc/e2e](https://github.com/e2e-inc/e2e/tree/e693cdcf0baee66dead26fa2e51a6693266b4b8f/skills/e2e) at `e693cdcf0baee66dead26fa2e51a6693266b4b8f`. Copyright 2026 TesterArmy, Inc.; Apache-2.0 license retained in LICENSE and the upstream `NOTICE` in [references/NOTICE.md](references/NOTICE.md), unchanged. Eight topic guides are retained from upstream. AAS adds frontmatter, applicability, and authorization boundaries.

e2e runs UI tests that mix agent goals with exact steps. `agent.act` drives
one goal; `agent.assert`, `agent.waitFor`, and `agent.extract` judge the
screen; `screen`, `app`, `browser`, and `expect` act and check exactly. UI
targets use `@e2e-dev/web` for browsers or `@e2e-dev/mobile` for iOS
simulators, Android emulators, and connected phones.

## Authorization and test data

Use a project and test environment the user has authorized. Default to synthetic accounts and data. Obtain approval before installing dependencies, editing MCP or CI configuration, connecting a provider, or running against a shared or production environment.

A remote decision model can receive prompts, screen context and screenshots. Confirm the provider and the data it may receive before using it. For offline test runs use exact assertions or replay existing local fixtures without fresh model calls. Treat traces, screenshots and reports as sensitive and keep them local unless the user approves sharing.

## Start here: pick the reference for the job

Read the one reference that matches the request before doing anything else.
Each stands on its own; a reference names another topic only for a side
trip. `npx e2e guide <topic>` prints the installed package's version of a
reference; prefer it when it differs from this copy.
The Rules and Feedback sections below still apply.

| When you are | Topic | Read |
| --- | --- | --- |
| Adding e2e to a project, writing `e2e.config.ts`, starting the app from the config, signing in to a model, setting up mobile targets | `setup` | [references/setup.md](references/setup.md) |
| Looking at the running app, checking a UI change, taking a screenshot or video, trying a locator, running a test line, or walking a flow while you write its test, over `e2e mcp` | `mcp` | [references/mcp.md](references/mcp.md) |
| Writing or fixing a test: fixtures, locators, actions, matchers, sign-in sessions, the `browser` fixture, API-only tests | `writing-tests` | [references/writing-tests.md](references/writing-tests.md) |
| Adding `agent.*` steps, picking a model, cutting cost, budgets, the replay cache | `agent` | [references/agent.md](references/agent.md) |
| Running tests: CLI flags, CI, reporters, trace pages, `report.json` for scripts, exit codes | `running` | [references/running.md](references/running.md) |
| Handling a failed run: error codes and their fixes, `--headed`, `--debug`, `--ai-trace` | `debugging` | [references/debugging.md](references/debugging.md) |
| Exploring an app toward a goal without a test file: `e2e explore`, its budgets and verdict | `explore` | [references/explore.md](references/explore.md) |
| Asked to bug bash, QA, or hunt for bugs across an app or a branch | `bug-bash` | [references/bug-bash.md](references/bug-bash.md) |

For anything the references do not cover, the full documentation ships in
the `docs/` directory of the installed `e2e` package
(`node_modules/e2e/docs` in a single-package project); a link such as
`/reference/cli` is `docs/reference/cli.mdx`. Complete projects for Vite,
Next.js, Astro, Angular, Expo, SwiftUI, Jetpack Compose, Kotlin Multiplatform,
Flutter, and .NET MAUI are in https://github.com/e2e-inc/e2e/tree/main/examples.

## Quick start

A config with one web target and a model, and a test that drives one goal
and pins the outcome:

```ts
// e2e.config.ts
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:3000',
        command: { executable: 'pnpm', args: ['dev'], log: '.e2e/logs/app.log' },
      },
    },
  ],
  // The model behind every agent.* step: an AI SDK instance; gateway() from 'ai' reads AI_GATEWAY_API_KEY or a Vercel OIDC token.
  agents: {
    default: {
      model: gateway('openai/gpt-6-luna-fast'),
      system: 'You are a thorough QA agent. Verify every outcome on screen.',
    },
  },
} satisfies E2EConfig;
```

```ts
// tests/billing.e2e.ts
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('billing', () => {
  test('a member upgrades to Pro', async ({ app, agent, screen, browser }) => {
    await app.open('/settings/billing');

    await agent.act('upgrade the workspace to the Pro plan');

    await expect(screen.getByRole('status')).toContainText('Pro');
    await expect(browser).toHaveURL('/settings/billing');
  });
});
```

## Workflow: writing a test

1. Look at what exists: `e2e.config.ts`, `.mts`, `.js`, or `.mjs`, the `tests` glob
   (default `tests/**/*.e2e.ts`), `e2e` in `package.json`. Nothing there:
   follow `setup` when the user has requested e2e (see Rules).
2. With a connected `e2e mcp` server (topic `mcp`), write the test while
   you walk the flow, not from memory after the walk. A test written
   afterwards fails on each name or step you got wrong, one run at a time.
   Before `open_session`, create `tests/<feature>.e2e.ts`, opening on the
   screen it covers (step 3). Then add each step to the file as you take it
   in the session. An `act` goal goes in before you walk its path, and the
   path's actions stay out of the test. A `screen` line is the `Test line:`
   its action printed, copied as is. When the outcome shows, run its
   `expect` with `run_code` and add it once it passes; a passing statement
   also joins `test_lines`; checks go in the test's assert block at the end.
   The walk ends with the test written. Without a
   server, learn the accessible names the app renders from the components or
   a `--headed` run.
3. Shape the file before the steps (topic `writing-tests`, "Structure"):
   one top-level `describe` per feature, and in it one test per behavior,
   titled with the outcome it verifies. Each test runs arrange, act, assert,
   in that order: reach the starting state, do the one thing under test,
   then every `expect` or `agent.assert` at the end. A second outcome worth
   checking is a second test, so a failing title says what broke.
   A step is an `agent.act` goal or `screen` lines. Drive the flow with
   `agent.act`, one atomic goal per call; three goals make three calls.
   Start the test on the screen it covers, since every rerun pays
   for the steps before: in a browser a saved session instead of the
   sign-in form and `app.open` on that screen's path, on a device
   `device.openLink`, and data from the app's API (topic `writing-tests`).
   Exact values go through `screen`: a sign-in form in a setup test, a field
   that must receive one specific string, a count that must be one number.
4. Run only the test you are working on:
   `npx e2e run tests/<feature>.e2e.ts:<line>` (over MCP,
   `run_tests {files: ["tests/<feature>.e2e.ts:<line>"]}`, the flags as
   camelCase fields such as `retries: 0`), the line its `test(` opens on,
   with the flags in "Rerunning a test while you fix it" below. Agent
   steps need a model in the config and that provider's authentication (a
   saved subscription login, an API key); a local endpoint may need none.
   Tests without agent steps need no model.
5. When it fails, fix it from what the run recorded (next section).

## Workflow: fixing a failed test

The run already saw every screen up to the failure. Fix from what it
recorded; never walk the flow again from the start over MCP just to see a
screen.

1. Read the failure block in the terminal: the failing line with its code
   frame, the message (an assertion's `expected` and `observed`), where the
   screen was (`❯ at`: a URL on the web, the app and screen title on a
   device), and the nodes nearest a failed locator (`❯ on screen`). Then
   read the trace page it names (`❯ trace .e2e/results/<test>/trace.md`):
   every step with what it did, what the app logged, the agent's turns, and
   `## Screen at failure`, the screen one node per line (topic `debugging`).
2. Fix every line that evidence covers, not only the one that failed: the
   screen at failure shows the names the rest of that screen's lines need.
   Fix the locator, the expectation, or the app. Never add a sleep or a
   fixed delay (`setTimeout`, `waitForTimeout`): wait for the state you
   need with `agent.waitFor('<that state>')` instead (topic `agent`; it
   needs a model).
3. A test stops at its first failed step (an `expect.soft` lets it go on),
   and every wrong line after it costs another run. Before rerunning, check
   the lines after it as far as you can: against the screen at failure, the
   app source, or a live session.
4. For a screen the evidence and the source leave out, look live (topic
   `mcp`). `open_session {test: "tests/<feature>.e2e.ts"}` (with `:<line>`
   of its `test(` call when the file holds several) runs the test and stops
   on the live screen where it failed. Act out the lines after it there and
   put the `Test line:` each action prints in place of a wrong one, so the
   next rerun catches every mistake. Otherwise open or reuse a session, go
   straight to that screen, then `observe` and `locate`, or `run_code` for
   the fixed line and the ones after it. On the web, `navigate` to the path
   of the `❯ at` URL or the screen's route, and tap only to reach a state no
   URL opens. A device session starts on the app's launch screen: take the
   shortest path from there.
5. Rerun only that test, the way the next section says, or in a new
   session with `open_session {test}` (topic `mcp` says when a session
   must close first). Repeat with the next failure.

## Rerunning a test while you fix it

Every run of a failing test waits out its failure, and every `agent.act`
that runs live spends model calls. Keep each rerun to the one test and the
lines you changed:

- Run by `file:line`, not the file or the suite. After an edit above the
  test, look its `test(` line up again: a stale line runs another test, or
  fails with `NO_TESTS` listing the lines tests start at.
- Add `--action-timeout 5000`: a locator that matches nothing fails in 5 s
  instead of the default 30 s. It also bounds each action inside an agent
  step, so keep it longer than the slowest screen takes to load. A `screen`
  call's own `{ timeout }` still wins. An `expect` already gives up after
  5 s by default (`assertionTimeout`).
- Keep the replay cache on. A failed run keeps the recording of every goal
  a later check or wait confirmed (the wait closing the arrange block, topic
  `writing-tests`), and the next run replays those with no model call.
  New, changed, and failed goals run live, and so does a replay the trace
  page shows as handed off. `agent.assert`, `agent.waitFor`, and
  `agent.extract` always call the model. Leave `--no-cache` off: it sends every goal to the model
  again. Only a `read-write` cache records: the local default, but not with
  `CI` set and no cache mode in the config, nor in strict mode. A stopped
  run (Ctrl-C, a command your tool's timeout kills, `--max-duration`) saves
  nothing, so give the command a timeout longer than the test.
- Don't rename the test, its `describe`, or its file, and don't reword a
  goal, change its params, or change the agent's `context` or the test's
  `agentContext` once a goal passes. Each is part of a recording's key, so
  every goal it touches records again live. Fixing a locator or an
  expectation keeps the recordings.
- Add `--retries 0` when retries are on (`retries` in the config, or `CI`
  set, where the default is 1); a `retries` option on the test or its
  `describe` wins over the flag. Outside strict mode (`--strict-cache`, `cache.strict`), a
  retry never replays: it runs every goal live and waits out the failure
  again.
- Once the test passes, drop `--action-timeout` and run it one time with
  `--no-cache`: every goal runs live at the config's timeouts, which shows
  the agent still reaches it without its recordings.

## Rules

- In a project without e2e, set it up when the user requests it. Otherwise
  ask before adding a test framework, and name any existing framework.
- Live MCP tools need an `e2e mcp` server in the client: the e2e plugin's, or
  one registered in the project (topic `mcp`). In a directory with no e2e config, a live look still
  works: `open_session {engine: "@e2e-dev/web", app: {url: "http://localhost:3000"}}` opens a session
  on the engine's defaults. Tests need a config. Tests run with the CLI, or with the server's
  `run_tests`, the same run without a shell.
  Keep a session open across runs while you write or fix a web test; topic
  `mcp` says when a run can go beside it, and what to do on
  `APP_ALREADY_RUNNING`.
- Run the CLI as `npx e2e ...` (or `pnpm exec e2e ...`).
- The config is `export default { ... } satisfies E2EConfig` with
  `import type { E2EConfig } from 'e2e'`. `targets` is required; a UI target
  names an engine and declares the app beside it: `{ engine: web(), app: { url, command } }`.
  A tools-only target can omit the engine and set `platform`.
- Import `test`, `describe`, the hooks, `expect`, `credentials`, and
  `secrets` from `e2e`. A test that uses the `browser` fixture imports `test`,
  `describe`, and the hooks from `@e2e-dev/web`: the same runtime functions,
  typed with `browser`.
- Config and tests are ES modules whatever `package.json` sets as `type`.
- Locators resolve when used. Actions wait for readiness and `expect` retries
  assertions. Reads such as `textContent()` wait for one match until the
  action timeout, then answer the current value; `count()` and `isVisible()`
  answer from the current screen. Nothing waits for a value to change, so use
  a matcher when a value has to settle.
- A locator that matches two nodes fails with `LOCATOR_AMBIGUOUS`; narrow it
  (topic `writing-tests`).
- Secrets never appear in test code. Declare accounts under `credentials` and
  every other sensitive value under `secrets` in the config; resolve with
  `credentials.user(name).password` or `secrets.get(name)` (separate
  namespaces: `secrets.get` never returns a password), and hand the opaque
  `Secret` only to `fill()` or `agent.act` params.
- Tests: one top-level `describe` per feature, one behavior per test,
  arrange, act, assert with every assertion last (topic `writing-tests`).
  Bad: one test that adds a todo, checks it, marks it done, and checks
  again. Good: `'adds a todo to the list'` and `'marks a todo as done'`,
  the second adding its todo in its arrange block.
- Agent instructions: one goal per `act`, the wording on screen, real values
  in params. A goal is atomic: one outcome that one check confirms. Two
  outcomes are two goals in two `act` calls (topic `agent`), never `'add a
  todo and mark it done'`. Judge meaning, not phrasing: `toContain('Pro')`,
  not an exact sentence a model produced.
- End every test that runs an agent goal with a verifying check: a
  locator matcher (`expect(locator)`), an engine matcher
  (`expect(browser).toHaveURL`), or `agent.assert`. A passing one confirms
  every `act` before it, so they can be cached and replayed without model
  calls, and so do `locator.waitFor`, `browser.waitForURL`, and
  `agent.waitFor`. Reads, `expect.poll`, and plain-value `expect` confirm
  nothing (topic `agent`, "The replay cache").
- Shape the agent for this app: `context` for vocabulary the screens use,
  `system` for how it works, tools for a test API, named personas under
  `agents`. When a step fails, tighten the goal first, then the context, then
  the agent.
- `.e2e/` is output (`report.json`, `results/`, `cache/`, `logs/`; the
  config's `output` moves the report and artifacts, never `cache/` or the
  app's log). Read it, never edit it.

## Feedback

When e2e itself gets in your way, offer to tell the e2e team: a command or
API that broke (`bug`), docs or this skill that misled you (`docs`), or a
capability you needed and did not find (`feature`). Once per problem, after
you worked around it or gave up. Never report:

- failures of the app under test, or its own behavior;
- a problem you saw once and could not see again;
- anything on an outdated e2e: the command refuses it, so upgrade
  (`npx e2e@latest upgrade`) and check the problem still happens first.

Search [existing issues](https://github.com/e2e-inc/e2e/issues) first
(`gh issue list -R e2e-inc/e2e --search "<words>"`); comment on a match
instead of sending a new report.

A `bug` needs `--repro`, steps that reproduce it every time without app
content. Without such steps, or when the bug needs your app to show, omit
`--repro`: the command then prints a prefilled GitHub issue and sends
nothing; show the user the link and tell them to add a minimal reproduction
and submit it. Never file the issue yourself.

Run it with `--dry-run` first, show the user what would be sent, and send
it only when they agree.

```bash
npx e2e feedback --type bug -m "<one or two sentences>" \
  --repro "<steps that reproduce it every time>" --error-code LOCATOR_AMBIGUOUS \
  --task "<what you were doing>" --expected "<...>" --actual "<error message>" \
  --approach "<what you tried>" --command "<e2e command>" --agent "<agent / model>"
```

Describe e2e's behavior only, briefly: never paste app content, page text,
test files, URLs of private apps, or credentials. Secret-named environment
variables and common token shapes are redacted, but do not rely on it. After
sending, give the user the reference id it prints.

## When to Use

- Use when a project depends on e2e or has an `e2e.config.ts`, or the user asks for end-to-end, browser, mobile, or agentic UI tests written with e2e.
- Use to check a change in the running app over the e2e MCP server, to run a bug bash or QA pass with `e2e explore`, or when an e2e run fails.
- Use for iOS simulators, Android emulators and connected phones as well as browsers. For Playwright-only suites without e2e, `e2e-testing` or `e2e-testing-patterns` is more appropriate.

## Limitations and safety

- Requires Node.js and the `e2e` npm package in the project. Mobile targets also need a local iOS simulator, Android emulator or connected device and their platform tooling.
- `agent.*` steps send screen content (accessibility tree, screenshots) to the model provider configured in `e2e.config.ts` and spend that provider's tokens. Tests without agent steps, and goals replayed from the cache, make no model calls.
- The skill writes test files and config, installs packages during setup, and starts the app command from the config. Ask before adding a test framework to a project that does not already use e2e, and run tests only against development or test environments.
- Keep credentials in the config's `credentials` and `secrets`, never in test code or output.
- `npx e2e feedback` sends a report to the e2e team. Run it with `--dry-run` first and send it only after the user agrees; never include app content, URLs of private apps or credentials.
- API details follow the pinned upstream revision. Prefer `npx e2e guide <topic>` from the installed package when it differs from these references.
