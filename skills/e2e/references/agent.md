# Agent steps

`agent` is a fixture like `screen` and the main way a test drives the app.
Each call is one bounded invocation: fresh redacted observation, deadline,
model-call budget, no shared transcript. No agent step, no model calls.

## Contents

- Configure a model
- act: one goal
- assert, waitFor, extract: one question
- Write instructions the model can execute
- What the model sees
- Budgets and cost
- The replay cache
- Inspect what the model did
- Make the agent yours
- Beyond the built-in agent
- In CI

## Configure a model

Put an AI SDK model under `agents.default`. You can use all AI SDK providers
that support tool calls and the language model specification v2 or later
(https://ai-sdk.dev/providers). Examples: `@ai-sdk/openai`,
`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/amazon-bedrock`,
`@openrouter/ai-sdk-provider`, `ollama-ai-provider-v2`. For a server with
`/v1/chat/completions`, use `@ai-sdk/openai-compatible`. Vercel AI Gateway
reads `AI_GATEWAY_API_KEY` or, without it, a Vercel OIDC token:

```ts
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';

export default {
  targets: [{ engine: web(), app: { url: 'http://127.0.0.1:3000' } }],
  agents: { default: { model: gateway('openai/gpt-6-luna-fast') } },
} satisfies E2EConfig;
```

Subscription logins and local models: topic `setup`, section "Subscriptions
and API keys". Keep `ai@^7` installed with any provider.

Decision models pick actions from choices the executor builds: install
`@e2e-dev/decision` and put `decisionExecutor({ model:
typeSafeAi.decisionModel('jev-latest'), textModel: openrouter('inception/mercury-2.5') })`
under `executor`. `openai.decisionModel('gpt-6-luna')` from `@ai-sdk/openai`
4.0.90 or later works too and takes the `vision: true` screenshot.
Tests stay plain language with no params. The text model writes field values
and upload paths. See the shipped `docs/decision-models.mdx` or
[the online guide](https://e2e.com/docs/decision-models) for setup,
gates, and limits.

A coding agent the user already signs in to runs agent steps over the Agent Client Protocol:
install `@e2e-dev/acp` and its adapter, and put
`claudeCode({ model: 'sonnet' })` or `codex()` under
`executor`; no model provider is needed. See the shipped `docs/subscriptions.mdx` or
[the online guide](https://e2e.com/docs/subscriptions#use-your-coding-agent).

- Pass a model instance, not a string (`INVALID_CONFIG`).
- An agents entry is one plain object of `model`, `judge`, `system`,
  `context`, `tools`, `maxSteps`, `maxModelCalls`, `judgmentTimeout`,
  `maxObservationBytes`, `maxInputTokens`, `providerOptions`, or `executor`
  for a custom brain; none inherits `model` or `context` from `default`.
- `model` drives `agent.act`. Judgments use `judge` when set, else `model`.
- A missing model for the built-in agent raises one run-level
  `MODEL_UNAVAILABLE` when the first test acquires `agent`, exit 2, and so
  does a model GitHub Copilot does not serve to the account, at the first
  call; auth failures surface on the first model call as
  `MODEL_PROVIDER_FAILED`, or as `CONFIG_LOAD_FAILED` for a provider that
  reads its key when the config loads.
- `context` is what the app calls things, sent to every model call, judges
  included; `system` is how the acting agent works, read only by the act
  loop. Both live on the agents entry; `agentContext` on a test or group
  adds more. Under `e2e run`, every prompt carries the test's title path
  (`Test: billing > upgrades the tier`), judges included, so name a test
  for what it covers, not for the verdict it expects.

### Choose an agent

Tests use `agents.default` unless selected otherwise:

- `e2e run --agent buyer` picks another configured agent.
- `{ agent: 'buyer' }` on a test or group pins that agent; a list such as
  `{ agent: ['buyer', 'admin'] }` runs each test once per agent.
- `--agent buyer,admin` runs unpinned tests for both, narrows a pinned list
  to matching names, never replacing a pin it does not name.
- `{ agent: 'name' }` on an `agent.*` call overrides the test's choice.

For signed-in personas, pair an agent with a `session` in a describe block
repeated per persona; the cache keys every entry by the agent and its
context, so each persona records and replays its own steps.

## act: one goal

```ts
import { credentials } from 'e2e';

await agent.act('add a todo named "Buy milk"');
await agent.act('invite {email} as an editor', { params: { email: 'ada@example.test' } });

const member = credentials.user('member');
await agent.act('sign in with the given credentials', {
  params: {
    username: member.username,
    password: member.password, // a Secret: the model sees its name, the runner fills the field
  },
});
```

`act(instruction, options?)` runs a multi-action flow to a verdict. Passed
resolves with `summary`, `modelCalls`, `actions`, and `cache` (the replay
cache's part). Failed or blocked throws an `AgentError` whose `code` says
why: `ACTION_FAILED` (product failure); `STEP_BUDGET_EXHAUSTED`,
`STEP_TIMEOUT`, `CONTEXT_OVERFLOW` (out of room);
`AUTH_CREDENTIAL_UNAVAILABLE`, `AUTH_CREDENTIAL_INVALID`,
`SECRET_UNAVAILABLE`, `ENVIRONMENT_UNAVAILABLE`, `SEED_DATA_MISSING`,
`TEST_SETUP_FAILED`, `AUTOMATION_UNSUPPORTED`, `POLICY_DENIED` (blocked
from outside);
`MODEL_OUTPUT_INVALID` (unusable answer), `MODEL_REFUSED` (the model refused
the prompt). Full list: topic debugging.

Options:

- `params`: values the instruction names; the runner fills a `Secret`,
  and a run-unique `unique(\`E2E ${Date.now()}\`)` keeps the cache working
  across runs.
- `timeout`: the config `timeout`.
- `maxSteps` (default 25 actions), `maxModelCalls` (default 25): may only
  lower the agent's limits, else `INVALID_ARGUMENT`.
- No `schema` (use `extract({ schema })`) and no `vision`: the model decides
  when it needs pixels.

The tools, one per engine action. Name the target as the screen names it
(files in `params`); the agent picks the verb:

- `observe`: re-read the screen after waiting on work in progress.
- `tap`: button, link, menu item, tab, checkbox, row, field.
- `double_tap`/`long_press`/`right_click`: second-click item, long-press
  menu, context menu only.
- `hover`: menus, flyouts, tooltips that open on the pointer.
- `type`: one input; on browser/device no target means focus; `replace` clears.
- `press`: one key to a node or, on browser/device, to focus; `times` up to 20.
- `select`: one option by visible label.
- `check`: set a checkbox, switch, or radio to a state, not flip it.
- `scroll`: viewport or one scrollable node, a screen or a few.
- `scroll_to`: a listed node into view, or by `text` page a list to a row.
- `drag`: one node onto another.
- `upload`: project-root files, or e2e's samples (`sample:photo.png`,
  `sample:document.pdf`, and the rest) when the step names none, to a file
  input or a visible control that opens a native file chooser; outside the
  root or hidden (`.env`) is `POLICY_DENIED`.
- `navigate`: a URL or app-relative path.
- `back`: browser history or in-app back.
- `resize_viewport`: set the viewport size (200 to 4096 CSS px) to check a
  layout at phone, tablet, or desktop width. Engines with `session.resize`,
  such as web.
- `switch_tab`: show another open tab by its number (from 1, in opening
  order). A tab the app opens stays in the background: the action's result
  says so, and the screen header says `tab 1 of 2`. Engines with
  `session.switchTab`, such as web.
- `close_tab`: close an open tab by the same number. Closing the tab on
  screen returns the screen to its opener, or to the tab shown most
  recently when the opener is closed too. The last open tab stays open.
  Engines with `session.closeTab`, such as web.
- `type_secret`: a declared secret by name; plaintext never reaches the model.
  Offered whenever the engine can fill secrets; the step's opening message
  lists the ones it declares, and an undeclared name fills nothing.
- `screenshot`: attach viewport pixels; every later result then carries one.
- `tap_at`/`hover_at`/`press_at`/`select_at`/`type_at`: a screenshot point.
- `drag_at`: from one screenshot point to another (`to_x`, `to_y`).
- `dismiss_keyboard` (device): hide the on-screen keyboard.

The focused field's selected text is listed as `selection="..."` (never for
a secret), so a repeated `Shift+ArrowLeft` selects one word with visible
feedback. Point tools serve a canvas shape, map pin, image region, or system
sheet control. `tap_at`, `hover_at`, and `drag_at` act at the point
(`drag_at` by id between two different listed controls on an engine without
a bare-point drag); `press_at`, `select_at`, and `type_at` hit-test the
tree first so a listed control underneath is acted on by id, and `type_at`
on nothing listed taps, then types. A screen with
nothing to tap by id opens with a screenshot attached. A device has no
`right_click`, `select`, `upload`, or `scroll_to` by node id. Pixels mask
secure fields only (topic writing-tests). A result says when an action
closed an on-screen keyboard; on a touch screen that tap was often spent
closing it, so act again.

## assert, waitFor, extract: one question

```ts
import { z } from 'zod';

await agent.assert('the dashboard shows a trial badge'); // one look, one judgment

await agent.waitFor('the export finished and a download link appeared', { // polls
  interval: 500,
  timeout: 120_000,
});

const data = await agent.extract('every todo title and how many remain', { // structured output
  schema: z.object({ titles: z.array(z.string()), remaining: z.number().int() }),
});
expect(data.titles).toContain('Buy milk');
```

- `assert` does not poll. False is `ASSERTION_FAILED` with the model's
  explanation and a screenshot in the report; too little on screen to
  decide is `ASSERTION_INCONCLUSIVE`, also a failure, so reach the right
  screen first and ask about what is visible. Judged from the tree alone,
  it adds `pass vision: true when the answer is in pixels`, as does
  `waitFor`'s timeout after an inconclusive round.
- Judgments see the assertion, its params, the agent's context, the test
  title, and the current screen with its location, never prior steps or the act loop's
  summaries; malformed output gets one repair round, then
  `MODEL_OUTPUT_INVALID`.
- `assert` and `waitFor` take `params` like `act`:
  `assert('the table lists {name}', { params: { name } })`. The judge sees a
  `Secret` by name only; check a secret's value with a locator assertion.
- A value shown in more than one place (a total in the summary and on the
  pay button) must agree everywhere, or the judgment fails. Name the one
  you mean (`'the order summary total is $42.00'`) when only it matters.
- `waitFor` observes every 500 ms, judges only when the screen or its
  location changed, and is `STEP_TIMEOUT` after `timeout` (default 30 s). A
  change after a still screen is judged at once; while the screen keeps
  changing, at most once per `interval` (default 3 s).
- Never sleep for a fixed time to let the app settle. A sleep is too short
  on a slow run and wasted time on a fast one; `waitFor` returns as soon as
  the state appears:

```ts
// BAD: guesses how long the export takes.
await new Promise((resolve) => setTimeout(resolve, 10_000));

// GOOD: waits for the state, up to the timeout.
await agent.waitFor('the export finished and a download link appeared', { timeout: 60_000 });
```

- `waitFor` needs a model even under a custom executor and is never cached,
  so each run spends judgments on it. It judges again on every screen
  change, and on every location change except under `vision: 'only'`, up
  to `maxModelCalls` (25): for a long wait on a screen that keeps
  changing (a progress counter), raise `interval`. The test timeout still
  caps its `timeout`.

- `extract` takes any Standard Schema validator (zod works); the model sees
  the schema's shape, never its value rules (`min`, `max`, lengths,
  patterns), which check what it read. Data the screen does not show is
  `ASSERTION_INCONCLUSIVE` naming what was missing, never `""` or `0`; to
  accept absence, ask for it (`'the phone, or null when none is shown'`
  with `.nullable()`).

For a debug view that pairs each action with the screen it started on, give
`agent.act` an `onBeforeAction` hook that calls `app.screenshot`, and match
each capture to `onAction` by `index`, which restarts at 1 in each `act` call.
It runs before replayed actions too, does not wait for the screen to settle,
and a failed action gets a capture but no `onAction`.
Narrow `onAction`'s event on `action` for coordinates, replay included:
`point` for `tapAt`/`hoverAt`, `from`/`to` for `dragAt`. They are in the
same space as `screen.tapAt` and `boundingBox()`, rounded and clamped to the
viewport. Mobile engines have no `hoverAt` or `dragAt`.

`vision` on a judgment picks the evidence: `false` (default) the tree;
`true` the tree plus a masked screenshot; `'only'` the screenshot alone, for
what the screen presents (an overlay, a broken layout, a chart) where the
tree would answer first. `'only'` never falls back to the tree: unprovably
masked pixels fail with `POLICY_DENIED`.

### Viewport exploration

With `explore: true`, `agent.assert` can scroll the current screen and combine
evidence from several viewports. This helps when a list fits on a tablet but
needs scrolling on a phone.

```ts
await agent.assert('Settings lists HOS Settings, Account, Language and Theme', {
  explore: true,
  maxSteps: 10,
  maxModelCalls: 6,
});
```

Exploration offers `observe`, `scroll`, `scroll_to`, and project tools declared
`mutates: false`. The built-in executor also offers `screenshot` when `vision`
is `true` or `'only'`; the default is tree-only. Other actions are rejected. The viewport stays
where exploration ends.

Defaults are 10 scroll actions and 6 model calls, each capped at the selected
agent's configured limit. Overrides may exceed the 10/6 defaults, up to the
configured limits. The deadline
defaults to `judgmentTimeout`. `maxSteps` or `maxModelCalls` without
`explore: true` throws `INVALID_ARGUMENT`. The built-in executor uses
`agents.<name>.model`, even when `judge` is configured.

A contradiction is `ASSERTION_FAILED`; insufficient evidence within the time
or action/model budget is `ASSERTION_INCONCLUSIVE`.

Use `waitFor` for a condition that changes over time, and `explore` for content
elsewhere on the current screen.

## Write instructions the model can execute

- One goal per `act`; goal order is the test's, the path the model's.
- Keep each goal atomic: one outcome that one check confirms. When two
  parts of an instruction each leave a state worth checking, they are two
  goals, each its own `act`. Steps toward a single outcome
  are the path, not more goals: scrolling to a control, closing a banner,
  opening the menu that holds it, filling the fields of one form.
- A split flow fails at the goal that broke. Each goal replays from its own
  recording and gets its own `maxSteps` and `maxModelCalls`; the test
  timeout still caps them all.

```ts
// BAD: three goals in one instruction, one recording.
await agent.act('open the Pro plan, set the seats to {seats}, and check out', { params: { seats: 3 } });

// GOOD: arrange with two atomic goals, act with the one under test, assert last.
test('checks out the Pro plan', async ({ app, agent, screen }) => {
  await app.open('/plans');
  await agent.act('open the Pro plan');
  await agent.act('set the seats to {seats}', { params: { seats: 3 } });
  await agent.waitFor('the cart shows the Pro plan with 3 seats');

  await agent.act('check out');

  await expect(screen.getByText('Order confirmed')).toBeVisible();
  await expect(screen.getByText('Pro plan, 3 seats')).toBeVisible();
});
```

Choosing the seats is its own behavior, so it gets its own test that ends
after `set the seats` and asserts the seat count. Tests follow arrange, act,
assert, one behavior each (topic `writing-tests`, "Structure").

- Use the words on screen: `'open the Billing tab'`, not `'upgrade'`.
- Values go in `params`, never expanded: `act('rename to {name}', { params })`.
- Do not describe mechanics the runner handles: waiting, scrolling, retries.
- End the test with a check of the outcome. A passing locator or engine
  matcher, `agent.assert`, or wait confirms every `act` before it, which
  lets the cache record them; close an arrange block of `act` goals with a
  wait for its state, so a failure later in the test keeps them recorded:

```ts
await agent.act('create a workspace named "Atlas" on the Pro plan');

await expect(screen.getByRole('status')).toHaveText('Created "Atlas" on the Pro plan');
```

The model gets the instruction verbatim plus the params as a separate
block; the check also makes the test model-portable. Off-screen state (a
database row) can land after `act` returns; `expect.poll` the read instead
of sleeping.

## What the model sees

A redacted snapshot of the screen (roles, names, text, states), prior-step
summaries, and your context; never raw HTML, cookies, headers, environment
values, or a `Secret`'s value; password fields masked. The first
screen of a step arrives whole; later action results report what changed,
keyed by node ids stable while an element exists, or the whole screen when
most changed. Pixels arrive through `vision` on a judgment or the act loop's
`screenshot` and point tools, with secure fields masked. When
the browser engine's tree capture times out, the model gets a screenshot and
a warning, a judgment needs `vision: true`, and no control may be inferred
absent nor old node ids reused. The browser engine's tree shows a frame
from another site (a hosted card field) as its `iframe` node with none of
its content, so the agent reaches it only through pixels: script steps
there with `browser.frameLocator`, and judge it with `vision`. Nothing the
model returns runs as code or
selectors: the runner validates and authorizes every tool call first.

Project tool results and tool or engine errors are secret-redacted before the
model reads them. Text is redacted before it is cut to the output limit.

## Budgets and cost

| Call | Model calls | Default timeout |
| --- | ---: | --- |
| `act` | up to `agents.<name>.maxModelCalls` (25) | the config `timeout`, 120 s |
| `assert` | 2 | 30 s |
| `extract` | 2 | 30 s |
| `waitFor` | up to `agents.<name>.maxModelCalls` (25) | 30 s |

- Slow model calls: raise the step or test `timeout` for `act`, the agent's
  `judgmentTimeout` for judgments, `actionTimeout` for slow UI.
  `STEP_TIMEOUT` and `STEP_BUDGET_EXHAUSTED` fail the test; smaller goals
  help.
- `--debug` prints phase timings and a per-step table (duration, model
  calls, tokens, cache share, cost) to stderr and saves step transcripts as
  artifacts.

## The replay cache

Replay reports expose the original model as `step.cache.recordedBy` when
available; older recordings omit it. Use `--no-cache` to evaluate a new model.

A passing `agent.act` saves its actions once a later check verifies the
outcome; the next run replays them without model calls, and the live agent
continues from the current screen when the app or final state no longer
matches. Misses and hand-offs use the model; `agent.assert`,
`agent.waitFor`, and `agent.extract` are never cached.

- On by default (`read-write`), `read-only` in CI, off via `cache: 'off'`
  or `--no-cache`. Entries live in `.e2e/cache/`; deleting the directory
  only slows the next run.
- An entry is written only after a later verification passes (a locator or
  engine `expect` matcher, `locator.waitFor`, `browser.waitForURL`,
  `agent.assert`, `agent.waitFor`), so an unchecked `act` never replays; a
  plain-value `expect`, `expect.poll`, `agent.extract`, another `act`, or
  the attempt passing confirms nothing.
- A replay needs the app on the recorded route (origin, path, and query,
  ids and tokens aside; unless the recording opens with a navigation),
  re-finds each control by role, name, test id, placeholder, input purpose,
  and its named row (an unnamed control with twins and no named container
  hands off, and so does one known only by a generated test id once that id
  is gone), and passes alone only when the recorded end route is back,
  every control that appeared (with its checked or selected state) is
  there, every one that went away is gone, at least one of those changed
  during the replay, and no new alert showed; otherwise the agent takes
  over mid-step. The web engine does not observe Next.js App Router's route
  announcer, so its title echo never counts. An entry's key holds the test
  file and title path, the target, the instruction and params, the agent,
  its `context`, and the test's `agentContext`, so renaming the test or its
  file records every goal in it again, and rewording a goal records that
  goal again. `step.cache.reason` says why: `no-entry`,
  `wrong-context`, `target-not-found`, `target-ambiguous`, `end-mismatch`,
  and so on.
- A step changing nothing on screen or in the route creates no entry
  (`step.cache.write`: `no-change`) and runs live every run, strict
  included; a change only inside a frame from another site counts as
  nothing, since the tree leaves it out. A step recording no actions
  creates no entry either. A step whose
  `unique()` value equals, is spelled inside, or is the encoded form of
  another param's value is not recorded either (`step.cache.notRecorded`:
  `param-collision`).
- `e2e init` gitignores `.e2e/cache/`; remove that line to commit entries
  and share replays with CI and teammates (CI stays `read-only` unless
  `cache: 'read-write'` is set).
- A failing run keeps the entries a check confirmed before the failure. It
  evicts a replay that ran into the failure and any recording no check
  confirmed. A cancelled run and a failure where no model answered
  (`MODEL_PROVIDER_FAILED`, `MODEL_UNAVAILABLE`) implicate nothing and evict
  nothing.
- While you fix a test, keep the cache on: each rerun replays the goals
  whose check passed instead of calling the model for them (SKILL.md,
  "Rerunning a test while you fix it"). `--no-cache` is for ruling out a
  stale replay (topic debugging, "Tools"), and for one live run once the
  test passes.
- With committed recordings, `--strict-cache` in CI fails a recording that
  no longer replays with `REPLAY_STALE` instead of quietly spending model
  calls every run; re-record with a `read-write` run without the flag and
  with `cache.strict` off, then commit. Unrecorded steps still run live;
  retries replay too, and a strict run never writes the cache.

## Inspect what the model did

```bash
npx e2e run tests/checkout.e2e.ts --debug      # step table, transcripts as artifacts
npx e2e run tests/checkout.e2e.ts --ai-trace   # writes <output>/ai-trace.json (.e2e/ai-trace.json by default)
npx unbox-ai runs .e2e/ai-trace.json                        # one line per agent step
npx unbox-ai summary .e2e/ai-trace.json --run 0             # turns, tokens, tool calls of one step
```

Never read the trace directly: megabytes of resent context, images replaced
by byte counts. `--no-cache` traces the whole flow, since replayed steps
make no model calls. The recorder redacts serialized tool results and errors
before writing the AI trace.

## Make the agent yours

1. **The goal.** A failed step usually named something the screen does not;
   reword it with on-screen labels, and `--debug` shows what the model saw
   and tried.
2. **`context`.** Vocabulary every step needs (plan names, what a
   "workspace" is, which tab holds billing), once on `agents.<name>.context`
   or per test via `agentContext`.
3. **`system` on the agent.** How carefully it verifies, what it never
   does, how it treats a modal; a UX reviewer, a cautious QA persona, and a
   fast smoke agent are three `system` prompts on one model.
4. **Tools.** A test API the agent may call mid-flow (seed a cart, mint a
   coupon) via `tools`; see below.
5. **The model and its options.** `providerOptions` for reasoning effort,
   or another model for one persona. `--agent <name>` runs the suite as any
   configured agent, comparing candidates on the same tests; every result
   records which agent ran it.

## Beyond the built-in agent

- `tools: { seedCart }` on an agents entry adds AI SDK tools wrapped with
  `defineTool(tool({ ... }), { mutates: true })` from `e2e/agent` for a
  test API a flow calls mid-step.
- A `mutates: false` tool can call `getToolContext(options).read({ id },
  { style: ['color', 'font-weight'] })` for a node in its newest observation.
  Web reads return redacted `{ style }` under the step deadline, use no action
  slot, and never relocate stale IDs. Use `requires: ['computed-style']` to
  skip engines without support. Allowed properties and errors:
  https://e2e.com/docs/tools#read-a-nodes-computed-style.
- `createToolLoopExecutor` keeps the loop and replaces prompt and tool
  vocabulary; spread `createGrammarTools(ctx, { guard })` into its tools and
  start its `system` with `BASE_RULES` to keep the built-in actions.
- Any `StepExecutor` (`{ name, version?, cache?, runStep(ctx) }`) goes under
  `executor`; the runner still owns observations, actions, budgets, and the
  report, and `system` or `tools` beside `executor` is `INVALID_CONFIG`.

Reference: https://e2e.com/docs/agents

## In CI

Run the suite, agent steps included, on every pull request, passing the key
the config's model reads (`env: { AI_GATEWAY_API_KEY }` for `gateway()`)
from secrets. Sharing `.e2e/cache/` lets CI replay verified action steps
without model calls; CI defaults (`read-only` cache, retries): topic running.
