# Writing tests

Follow the [authorization and test data boundaries](../SKILL.md#authorization-and-test-data) before setup, live testing, or sharing results.

## Contents

- A complete file
- Structure: one describe, arrange-act-assert, one behavior
- Registration
- Fixtures
- Locators
- expect
- Sign-in sessions
- Start near the screen under test
- The browser fixture (browser only)
- Habits

## A complete file

```ts
// tests/todos.e2e.ts
import { beforeEach, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('todos', { tags: ['todos'] }, () => {
  beforeEach(async ({ app }) => {
    await app.open('/todos');
  });

  test('adds a todo to the list', async ({ agent, screen }) => {
    await agent.act('add a todo named {title}', { params: { title: 'Write the release notes' } });

    await expect(screen.getByRole('listitem')).toHaveCount(1);
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('1 remaining');
  });

  test('marks a todo as done', async ({ agent, screen, browser }) => {
    await agent.act('add a todo named {title}', { params: { title: 'Write the release notes' } });
    await screen.getByRole('checkbox', 'Write the release notes').waitFor();

    await agent.act('mark the todo as done');

    await expect(screen.getByRole('status', 'Remaining')).toHaveText('0 remaining');
    await expect(browser).toHaveURL('/todos');
  });

  test('ignores an empty submission', async ({ screen }) => {
    // An exact interaction: the empty submit is the point of the test.
    await screen.getByRole('button', 'Add').tap();

    await expect(screen.getByRole('listitem')).toHaveCount(0);
  });
});
```

The agent does the flow; `expect` pins what must be true at the end, and
that check lets the replay cache rerun every goal before it later. `screen`
actions are for exact interactions and values. Files match the config
`tests` glob, default `tests/**/*.e2e.ts`. In a browser every test starts
from a fresh context with no page open, so it calls `app.open()` first; on a
device a test that skips `app.open()` starts where the previous test left
the app.

## Structure: one describe, arrange-act-assert, one behavior

Write every test in this shape. When a test fails, its title alone should
say what broke, with no debugging needed, unless the arrange or act steps
themselves failed or the app changed under them.

- **One top-level `describe` per unit or feature.** Name it after the
  feature (`describe('todos')`, `describe('checkout')`) and put every test
  for it inside, with the hooks those tests share. A file holds one feature.
  Nest a `describe` only to share a hook or an option (a `session`,
  `agentContext`, `tags`) with some of its tests. Setup tests are the
  exception: `test.setup` must be top-level, outside any `describe`.
- **Arrange, act, assert, in that order**, with a blank line between the
  three blocks:
  - Arrange reaches the state the behavior starts from: `session`,
    `app.open` on the screen's path, data from a fixture, and a shared
    `beforeEach`. When the app offers no shorter way, an `agent.act` or
    `screen` lines can arrange too, as in `marks a todo as done` above.
    End such an arrange block with a wait for the state it reached
    (`locator.waitFor()`, `agent.waitFor`). A setup goal that passed
    without doing its job then fails there, not at the outcome check, and
    the wait confirms the setup goals for the replay cache.
  - Act does the one thing under test: one `agent.act` goal, or the
    `screen` lines of one interaction. A wait for the state the action
    triggers (`agent.waitFor`, `locator.waitFor`) closes the act block.
  - Assert holds every `expect`, `expect.poll`, and `agent.assert`, and
    nothing after them. No check sits between arrange and act steps. A
    setup test's `session.save` is bookkeeping and comes after its check.
- **One behavior per test.** A test verifies one outcome, and its title
  names it: `'marks a todo as done'`, not `'todos work'` or `'adds and
  completes a todo'`. An "and" in a title usually means two tests. Several
  assertions are fine when they all check that one outcome (the count and
  the remaining label after an add). A second behavior is a second test.
  When it starts from the first one's result, its arrange block repeats the
  first one's act (or seeds the result through the API) rather than
  chaining both into one test.

For the replay cache (topic `agent`), a passing locator or engine matcher,
`locator.waitFor`, `agent.assert`, or `agent.waitFor` confirms every
`agent.act` before it; `expect.poll` and a plain-value `expect` confirm
nothing, so end with a locator check too. When the test fails, every goal
after the last passing confirmation runs live again on the next run: the
arrange block's closing wait keeps the setup goals cached while you fix the
act or the assertions.

## Registration

`test` registers everything, and `describe`, `beforeEach`, `afterEach`,
`beforeAll`, and `afterAll` are also top-level imports of the same functions
(`import { describe, beforeEach } from 'e2e'`; `@e2e-dev/web` and
`@e2e-dev/mobile` export `test`, `describe`, and the hooks typed with their fixture; a
`test.extend()` chain registers hooks that see its fixtures through
`test.beforeEach`). Everything registers at import, so a `describe` body is
synchronous (`async` is a `COLLECTION_ERROR`).

```ts
test('title', async ({ app, screen }) => {});
test('title', { tags: ['smoke'], retries: 2, timeout: 60_000 }, async ({ app }) => {});
describe('group', { tags: ['billing'] }, () => { /* tests and hooks */ });
describe('checkout flow', { serial: true }, () => { /* ordered, shared app state */ });
beforeEach(async ({ app }) => {});     // per attempt, with test fixtures
afterEach(async ({ screen }) => {});   // runs after failures too, with its own cleanup budget
beforeAll(async ({ platform }) => {}); // per suite realm, no app fixtures
afterAll(async () => {});
test.skip('later', async () => {});
test.only('focus', async () => {});         // local only: CI fails with ONLY_IN_CI
test.skipIf(process.platform === 'win32')('watcher', async () => {}); // condition read at collection: truthy registers it skipped, as { skip: true }
test.runIf(process.env.CI)('ci only', { tags: ['ci'] }, async () => {}); // test.skipIf(!condition)
test('conditional', async () => { test.skip(await onlyOneOrg(), 'nothing to switch to'); }); // throws: the body stops here, reported skipped; call it before the first step
test('later', async () => { test.skip('waiting on the API'); }); // bare skip from the body
test.fail('known gap', async () => {}); // expected to fail: a test failure passes it, a pass fails it with UNEXPECTED_PASS
test('gap on web', async ({ platform }) => { test.fail(platform === 'web', 'known gap'); }); // marks, does not throw; the body runs on
test.setup('sign in', { sessions: ['admin'] }, async ({ app, screen, session }) => {}); // see Sign-in sessions
const wsTest = test.extend<{ ws: Ws }>({ ws: async ({ browser }, use) => { await use(await seed()); await drop(); } });
wsTest('uses the workspace', async ({ ws }) => {}); // code after use() is teardown, runs after failures too
```

A setup test cannot skip from its body (`INVALID_ARGUMENT`), and neither a
setup test nor a serial member can call `test.fail`. `test.fail` covers test
failures and timeouts only: an infrastructure error such as `ENGINE_FAILURE`
or a blocked agent verdict still fails the test.

| Option | Default | Notes |
| --- | --- | --- |
| `timeout` | `config.timeout`, 120 s | Covers `beforeEach` and the body. |
| `retries` | `config.retries` | 0 to 10; a serial group's value applies to its members. |
| `tags` | `[]` | Distinct, non-blank, no comma or edge whitespace (`'Login Form'` is fine); union across layers. `--tag smoke` selects, `--tag-mode all` requires every tag. |
| `skip` | unset | `true` or a reason string. |
| `fail` | unset | `true` or a reason string: expected to fail, as `test.fail`. Tests only, not groups or setup tests. |
| `platforms` | unset | Only targets with these platforms, e.g. `['ios']`. |
| `requires` | `[]` | Engine capabilities, e.g. `['browser']`; missing ones skip the test at selection rather than failing it with `UNSUPPORTED_CAPABILITY`. |
| `session` | unset | Restore state saved by a setup test. |
| `agentContext` | unset | Extra context for `agent.*` calls in this test or group. |
| `agent` | the run's agent | A configured name (`agents.<name>`) or a list run once per agent; `--agent` narrows the list, a setup test takes one name. Innermost wins; `agent.act(..., { agent })` names another for one call. |
| `trace`, `video` | the target's | `'off'`, `'on'`, `'retain-on-failure'`, `'on-first-retry'`, `'on-all-retries'`: whether the test keeps a trace page, which attempts record video. Innermost wins over `--trace` / `--video`, the target, and the config; video where the engine cannot record is `UNSUPPORTED_ARTIFACT` for the run. |
| `serial` | `false` | Groups only. Members share app state, run in order on one worker, retry as a whole, and take the group's `trace` and `video`. |

Serial members cannot set `retries`, `trace`, `video`, `session`,
`platforms`, `requires`, `skip`, `fail`, or `only`, nor can a nested `describe` set
`trace` or `video`; nesting serial groups is a `COLLECTION_ERROR`.

Hooks nest: outer `beforeEach` first, inner `afterEach` first. `beforeAll`
reruns per retry and per serial group (each a fresh module realm) on the
test timeout; `afterAll` runs on `config.cleanupTimeout`. A failing
`beforeAll` is a `HOOK_FAILED` run error skipping every test in its scope.

## Fixtures

Built-in fixtures are lazy; destructure them. Your own `test.extend`
fixtures set up for every test registered through that `test`, destructured
or not, so a state-changing fixture belongs on its own `test`.

`app` (`App`) and `screen` (`Screen`): always. `agent` (`Agent`): needs a
configured model, else `MODEL_UNAVAILABLE` (topic `agent`). `platform`
(`string`): always, hooks included; `web`, `ios`, `android`, or an engine's
label. `browser` (`Browser`): browser targets, import `test` from `@e2e-dev/web`.
`device` (`Device`): device targets, import `test` from `@e2e-dev/mobile`.
`session` (`SetupSession`): only in `test.setup`.

### app

- `baseUrl` (`string | undefined`): the target's app URL with the run's
  port and no trailing slash (`${app.baseUrl}/api/users`); `undefined` when
  the target declares no `app.url`. `string` with `test` from `@e2e-dev/web`.
- `open(path?)`: opens the target's `app.url`, a relative path, or an absolute
  http(s) URL. On a device it relaunches the pinned app, and a path opens as
  a link in it only when the target declares `app.linkBase`.
- `back()`: one history step back.
- `restart()`: recreates the context keeping persisted state (a restored
  session included), then reopens the base URL.
- `clearState()`: clears cookies and storage, recreates the context, reopens
  the base URL.
- `screenshot(label?)`: saves a redacted screenshot artifact and returns its
  absolute path; the `list` summary names the first 10 under `Screenshots`. It masks
  secure fields only (see Sign-in sessions).
- `startRecording({ name? })`, then `stopRecording()`: records one span and
  returns its videos (`path` or hosted `url`). Fails while the test's
  `video` records: set `{ video: 'off' }` on the test.

`clearState()` is `UNSUPPORTED_CAPABILITY` with `connect.reconnectEndpoint`
or an attempt-scoped browser provider; on a device with no pinned `app`, both
methods are.

## Locators

`screen.getBy*` builds a lazy query, resolved only by an action, read, or
assertion. Every query also exists on a locator, scoped to its subtree.

| Query | Matches |
| --- | --- |
| `getByRole(role, name?, { exact?, checked?, disabled?, selected?, expanded?, pressed?, level?, visible? })` | Semantic role, optionally by accessible name (`getByRole('button', 'Save')`; the object form `{ name }` works too) and state (`level`: heading level 1 to 6). First choice. |
| `getByLabel(text, { exact?, visible? })` | Form controls by label. |
| `getByPlaceholder(text, { exact?, visible? })` | Inputs by placeholder. |
| `getByText(text, { exact?, visible? })` | Visible text. |
| `getByDisplayValue(value, { exact?, visible? })` | Inputs by current value; on the web it cannot scope child queries or be a `filter({ has })` or `filter({ hasNot })` target. |
| `getByTestId(id, { visible? })` | `data-testid` on the web (or `web({ testIdAttribute })`), accessibility identifier or resource id on a device (React Native `testID`, SwiftUI `.accessibilityIdentifier`, Compose `testTag` with `testTagsAsResourceId` on Android, Flutter `Semantics(identifier:)`, .NET MAUI `AutomationId`, NativeScript `testID`); a string matches the whole id, a RegExp tests it; on Android the `<package>:id/` prefix may be left off. Last resort. |

Roles: `button`, `link`, `textbox`, `searchbox`, `combobox`, `listbox`,
`option`, `checkbox`, `radio`, `radiogroup`, `switch`, `slider`, `spinbutton`,
`progressbar`, `meter`, `image`, `heading`, `tab`, `tablist`, `tabpanel`,
`menu`, `menubar`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `toolbar`,
`tooltip`, `tree`, `treeitem`, `list`, `listitem`, `table`, `grid`, `row`,
`rowgroup`, `rowheader`, `cell`, `gridcell`, `columnheader`, `separator`,
`group`, `article`, `figure`, `form`, `status`, `alert`, `dialog`,
`alertdialog`, `main`, `navigation`, `banner`, `contentinfo`, `complementary`,
`region`. The union is closed (anything else is a type error); `img` aliases
`image`; a role the platform lacks (`tooltip` on a phone) matches nothing.
On the web a `contenteditable` host is a `textbox` for the agent and takes
`fill`; from a test use `getByLabel`, `getByTestId`, or `role="textbox"` on
the host.

Text matching is exact after whitespace normalization (whole string,
case-sensitive) for a `getByRole` name, `getByLabel`, `getByPlaceholder`, and
`getByText`: `name: 'Save'` misses `Save changes` (unlike Playwright). A
missed query makes a negated assertion pass, so check it positively.
`getByText` and `getByLabel` return the innermost match, so a container
echoing its child does not count twice. `exact: false` is a case-insensitive
substring; a `RegExp` matches as written.

- Exactly one match per action, read, or assertion. Two fail at once with
  `LOCATOR_AMBIGUOUS`; at zero, actions and reads poll until the action
  timeout then `LOCATOR_NOT_FOUND`, assertions until the assertion timeout
  then `ASSERTION_FAILED`. Exceptions:
  `toHaveCount`, `toBeVisible`, `toBeHidden`, `toBeAttached`, list-form
  `toHaveText` and `toContainText`, `isVisible()` (false at zero),
  `isHidden()` (true), `count()`, `all()`, `allTextContents()`.
- Narrow with `filter({ hasText })` (a case-insensitive substring, unlike a
  query), `filter({ hasNotText })` to exclude matching subtree text,
  `filter({ has: locator })`, `filter({ hasNot: locator })`, `first()`,
  `last()`, `nth(i)`, or scoping under another locator. Any other `filter`
  key (`visible`) or an empty `filter({})` is `INVALID_LOCATOR`. `a.or(b)`
  matches either, still strict: add `first()` when both may match. Both
  locators must come from the same screen and attempt. Web branches need
  identical literal frame-selector chains; display-value branches cannot be
  composed.
- `visible: true` drops nodes the page hides (a closed drawer) before the
  exactly-one rule. Visibility is what renders, as `toBeVisible()` reads it:
  an `aria-hidden` spinner that paints is visible, so `toBeHidden()` waits
  for it to go.
- On the web, queries reach open shadow roots and closed roots attached with
  `attachShadow`, not declarative closed roots. `browser.locator(css)`,
  `frameLocator`, and `filter({ hasText })` stop at a closed root; query the
  text inside or filter with `has`.
- `screen.scrollUntilVisible(locator, { direction?, momentum?, timeout? })`
  scrolls the viewport (`down`, `slow` by default) until the locator resolves
  visibly, else `LOCATOR_NOT_FOUND`; on a locator it scrolls that node.

### Actions

Each action resolves one node, waits up to `config.actionTimeout` (30 s, or
`{ timeout }`) for it to be actionable, and does one thing: `tap()` (alias
`click()`), `doubleTap()` (alias `dblclick()`), `secondaryTap()` (each takes
`{ modifiers: ['Shift'] }`), `longPress({ duration? })`
(100 to 10000 ms; default 500 on the web, 1000 on a device),
`fill(value | Secret)`, `pressSequentially(text, { delay? })`, `clear()`,
`press(key)`, `check()`, `uncheck()`,
`selectOption(label | { label } | { value } | { index })` (one option; an
array is `INVALID_ARGUMENT`), `focus()`, `hover()`, `setInputFiles(paths)`
(relative to the project root; `[]` clears), `dragTo(locator)`, `scrollIntoView()`,
`swipe({ direction, momentum? })`. Web only, `UNSUPPORTED_CAPABILITY` on a
device: `secondaryTap`, `selectOption`, `setInputFiles`, `scrollIntoView`,
and `modifiers`.

`fill` sets the value with no key events; when the app reacts to keystrokes
(autocomplete, a masked input) use `pressSequentially`, which focuses the
field and types one character per `delay`, plain string only (a `Secret` is
`INVALID_ARGUMENT` and goes through `fill`).

Coordinates are CSS pixels, for what the tree does not list: `tap({ position:
{ x, y } })` offsets from the node's top-left corner inside its border (with `modifiers` it is
`INVALID_ARGUMENT`), `screen.tapAt({ x, y })` taps a viewport point,
`screen.doubleTapAt({ x, y })` double-taps a viewport point,
`screen.swipe({ from, to, duration? })` swipes along a path,
`screen.swipe({ direction, momentum? })` swipes the viewport. Prefer a
locator; a point moves with the layout.

### Reads

`textContent()`, `inputValue()`, `getAttribute(name)`, `isEnabled()`,
`isDisabled()`, `isChecked()`, and `boundingBox()` wait for one match until
the action timeout, then read once with no retry for a value. `isVisible()`,
`isHidden()`, and `count()` answer at once. `all()` gives one
`nth(i)` locator per current match and `allTextContents()` every match's
text, both `[]` at zero. Text is the rendered text, whitespace collapsed: on
the web what `innerText` reads (`text-transform` applies, `display: none`
drops out, `<br>` is a space); `toHaveText` reads the same. `isChecked()` on a
node that cannot be checked (a button), and `inputValue()` on one that holds
no value (a heading), throw `ACTION_FAILED`. `waitFor({ state?: 'attached' | 'detached' | 'visible' | 'hidden', timeout? })` waits
within `actionTimeout`, else `LOCATOR_NOT_FOUND`. For a value that has to
settle use `expect`, not a read. Reading a password field's value or
attributes is `POLICY_DENIED`, as is `toHaveAttribute` on one, negated too.

`screen.tree()` returns the whole screen as the agent reads it (one node
per line, secrets redacted) and `screen.debug()` prints it to the test's
output. Both read once without waiting. A locator does not have them, and
a frame throws `INVALID_ARGUMENT`.

## expect

`expect(locator)` polls up to `config.assertionTimeout` (5 s) or
`{ timeout }`; `.not` inverts and passes once the negation has held 1 s
continuously, or for the whole `timeout` when that is shorter, so it never
returns sooner. `expect(value,
message?)` is synchronous.
`expect.poll(read, { timeout?, interval?, message? })` re-reads until a value
matcher passes (`assertionTimeout` and 100 ms by default, stopping with the
attempt); a throwing read keeps polling, and it is not a report step. A
poll that the body or a hook returns without awaiting is cancelled and fails
that phase with `STEP_NOT_AWAITED`.
`timeout: 0` on a locator or fixture action, `waitFor`, a matcher, or
`expect.poll` sets no deadline of its own: the test timeout
(`cleanupTimeout` in `afterEach`) still bounds it, and `expect.poll` with 0
outside a test is `INVALID_CONFIG`. A negative or non-finite `timeout` is
`INVALID_ARGUMENT` (`INVALID_CONFIG` from `expect.poll`); `agent.*` calls
take a positive `timeout` only.
`expect.soft(x)` keeps a failure instead of throwing; the attempt fails
after the body with every soft failure listed. If the body then calls
`test.skip`, the attempt still fails, with the skip reason in its `skip`.
A retry that skips after an earlier failed attempt stays skipped; the CLI shows
it under `Skipped After Failure`, and `failOnSkippedFailure: true` in the
config fails the run with exit code 1. The default is `false`.
`expect.any(Class)`, `expect.anything()`, `expect.objectContaining(obj)`,
`expect.arrayContaining(arr)`, `expect.stringContaining(s)`, and
`expect.stringMatching(s | RegExp)` stand in for values inside `toEqual`,
`toMatchObject`, `toContain`, and `toHaveProperty`.

```ts
await expect(screen.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
await expect(browser).toHaveURL('/dashboard');   // relative to the base URL, or a RegExp
expect(order).toMatchObject({ id: expect.any(Number), lines: [{ sku: 'a' }] });
expect.soft(await screen.getByTestId('tax').textContent()).toBe('$8.00');  // kept, body runs on
const users = expect(await response.json()).toMatchSchema(z.array(User)); // any Standard Schema; typed output
```

`toMatchSchema(schema)` takes a synchronous Standard Schema (Zod, Valibot,
ArkType), fails listing every issue by path, and returns the parsed value
typed; prefer it when the app already has a schema for the response.

| Locator matchers | Browser matchers | Value matchers |
| --- | --- | --- |
| `toBeVisible`, `toBeHidden`, `toBeAttached`, `toBeEnabled`, `toBeDisabled`, `toBeChecked`, `toBeSelected`, `toBeExpanded`, `toBeFocused`, `toHaveText`, `toContainText`, `toHaveValue`, `toHaveAttribute`, `toHaveCount`, `toHaveAccessibleName`, `toHaveRole`, `toHaveScreenshot` (also on `screen`) | `toHaveURL`, `toHaveTitle`, `toHaveClass(locator, expected)` | `toBe`, `toEqual`, `toMatchObject`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toHaveLength`, `toHaveProperty`, `toContain`, `toMatch`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toBeCloseTo`, `toMatchSchema` |

`toHaveText` compares the whole normalized text, `toContainText` a substring
or RegExp, `toHaveValue` a form control's value as is, whitespace included
(it fails on a node with none); on a password field all three are
`POLICY_DENIED`, never a comparison against `''`. List forms:
`toHaveText(['Alpha', /^Beta/])` needs exactly two matches with those texts
in order; `toContainText(['Alpha', 'Beta'])` needs each entry in a distinct
match, in order, extra matches allowed. `toHaveAttribute(name)` checks
presence, `toHaveAttribute(name, value)` the value; `toBeAttached` waits for
a match, hidden or not; `toHaveClass` compares the whole normalized class
list or tests a RegExp. A failed matcher is `ASSERTION_FAILED`, exit code 1.

Playwright's `{ checked: false }`, `{ enabled: false }`, `{ visible: false }`,
and `{ attached: false }` flip their matchers, and `{ ignoreCase: true }`
works on `toHaveText`, `toContainText`, `toHaveAccessibleName`,
`toHaveAttribute(name, value)`, and `expect(browser).toHaveURL`. Any other option, `indeterminate` or
`useInnerText` included, is `INVALID_ARGUMENT`, in JavaScript too.

Screenshots: `await expect(screen).toHaveScreenshot('home.png')` compares the
screen, `expect(locator).toHaveScreenshot()` one element's box, against
`<test file>-snapshots/<name>-<target>-<os>.png`, on web, iOS, and Android
alike. Commit the files. The first run writes the file and fails: look at it,
commit it, rerun. A CI run writes nothing into the project and attaches a
missing one at `snapshots/<path>` in the test's results. `--update-snapshots`
(`-u`) writes missing and different files and passes, after an intended UI
change. Options: `threshold`, `maxDiffPixels`, `maxDiffPixelRatio`, `mask`
(locators painted over, for clocks and other changing content), `maskColor`,
`timeout`. A failure attaches `-expected`, `-actual`, and `-diff` images to the
step. Files are per target and OS (`-web-linux.png`): screenshots written on a
Mac never serve Linux CI, so write CI's from a CI job with `-u`.

## Sign-in sessions

Sign in once in a setup test, save the state under a name, and let other
tests declare it. Selecting a dependent test alone still runs its setup.

```ts
// tests/auth.setup.e2e.ts
import { test } from '@e2e-dev/web';
import { expect, credentials } from 'e2e';

test.setup('authenticate as admin', { sessions: ['admin'] }, async ({ app, screen, session, browser }) => {
  const admin = credentials.user('admin');
  await app.open('/login');
  await screen.getByLabel('Email').fill(admin.username);
  await screen.getByLabel('Password').fill(admin.password);
  await screen.getByRole('button', 'Sign in').tap();
  await expect(browser).toHaveURL('/dashboard'); // prove the sign-in worked before saving
  await session.save('admin');
});
```

```ts
// tests/dashboard.e2e.ts
import { describe, test, expect } from 'e2e';

describe('dashboard', { session: 'admin' }, () => {
  test('opens directly when signed in', async ({ app, screen }) => {
    await app.open('/dashboard');

    await expect(screen.getByRole('heading', 'Dashboard')).toBeVisible();
  });
});
```

- Setup tests are top-level, outside any `describe`; exactly one setup saves a given name and the
  body saves every declared name once (`SESSION_CONTRACT` otherwise). Names
  match `[A-Za-z0-9_.-]{1,128}`.
- A session holds cookies, local storage, and IndexedDB for one run,
  encrypted and deleted at cleanup; server state is not part of it.
- Screenshots, the model's and the artifacts', mask secure fields only,
  after a secret fill too. A generic secret in a plain input, or a value the
  app shows anywhere else (a show-password toggle, a toast), is in the image
  and reaches the model provider: use test credentials.
- Credentials live in the config, values in the environment:

```ts
credentials: {
  admin: { username: 'admin@example.test', password: process.env.ADMIN_PASSWORD ?? '' },
},
```

- A static password or secret needs 6 or more code points, else
  `INVALID_CONFIG` at config load, so an unset variable fails every command.
  A function `password` is read at fill time and redacted only from that fill
  on; `username` is always a string.
- `E2E_USER_<NAME>_USERNAME` and `E2E_USER_<NAME>_PASSWORD` override either
  field per run, even over a function; `<NAME>` is the credential name
  uppercased, every character outside `[A-Z0-9]` as `_`. Two credentials (or
  two secrets) mapping to one variable, `svc-a` and `svc_a`, are
  `INVALID_CONFIG`.
- `credentials.user('admin').password` is a `Secret` with no plaintext
  accessor, named `admin.password` to the agent and in reports; `secrets.get()`
  never returns it (separate namespaces). Only `fill()` and `agent.act` params accept it, stringifying it
  is `INVALID_CONFIG`, and `credentials.user()` outside a run throws
  `AUTH_CREDENTIAL_UNAVAILABLE`.
- Any other sensitive value (an API key) is a `secrets` entry,
  `secrets: { 'stripe-key': process.env.STRIPE_KEY ?? '' }`, overridable with
  `E2E_SECRET_STRIPE_KEY`; `secrets.get('stripe-key')` is the same kind of
  handle, fills any editable input, and is redacted by name everywhere the
  runner writes.
- A registered value passed as a plain string (`process.env.STRIPE_KEY` in a
  title, a URL, a locator, an `agent.act` instruction or param) is redacted
  too: reports, step labels, the executor, and the model see
  `<secret:stripe-key>` (and so does the test id, for a value in a title),
  so the agent cannot type it. Pass the handle.

## Start near the screen under test

A test pays for every step before the screen it checks, on every run and on
every rerun while you fix it. A wrong locator at the end of a long flow
reruns the whole flow, then waits out the 30 s action timeout. Begin each
test as close to its screen as the app allows:

- Sign in once in a setup test and declare `session` on the test (Sign-in
  sessions). Only the setup fills the sign-in form. A session lasts one run,
  so the setup still runs on every run, once per target for all the selected
  tests that declare its session.
- Open the screen by its path, `app.open('/projects/42/settings')`, not the
  home page and three taps. `observe` over MCP prints the path of the screen
  you reached.
- Create the data the screen needs through the app's API in a `test.extend`
  fixture. Click through a creation flow only in the test that covers it.
  A declared session is restored before fixtures run, so when the app signs
  in with a cookie, `browser.cookies()` signs the fixture's requests in.
  Check the response in the fixture: a
  failed seed then fails there, not 30 s later on a locator. While exploring
  over MCP, a project tool that seeds data (topic `agent`) gets there in one
  `call`.

```ts
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { z } from 'zod';

const projectTest = test.extend<{ project: { id: string } }>({
  project: async ({ app, browser }, use) => {
    const cookie = (await browser.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const api = (path: string, init: RequestInit = {}) =>
      fetch(`${app.baseUrl}${path}`, { ...init, headers: { cookie, 'content-type': 'application/json' } });
    const created = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name: `Project ${Date.now()}` }) });
    const project = expect(await created.json()).toMatchSchema(z.object({ id: z.string() }));
    await use(project);
    await api(`/api/projects/${project.id}`, { method: 'DELETE' }); // runs after a failure too
  },
});

describe('project settings', { session: 'admin' }, () => {
  projectTest('renames a project', async ({ app, screen, project }) => {
    await app.open(`/projects/${project.id}/settings`); // straight to the screen under test

    await screen.getByLabel('Name').fill('Atlas');
    await screen.getByRole('button', 'Save').tap();

    await expect(screen.getByRole('status')).toHaveText('Saved');
  });
});
```

On a device there are no sessions. `app.open()` takes a path only on a target
with `app.linkBase` (`linkBase: 'myapp://'` makes `app.open('/projects/42')`
open `myapp://projects/42`); otherwise `device.openLink('myapp://projects/42')`
opens a route, or a sign-in link, in the app.

Grow a test that spans several screens one screen at a time when you have
not checked its steps live: write up to the next screen you have not seen
pass, end it with a temporary check of that screen, run it, then replace
the check with the next part. The finished test keeps only its outcome
checks, in the assert block. A passing locator step takes milliseconds,
and an `agent.act` that a later check confirmed replays from the cache with
no model call. The cache keeps those entries when a later line fails, so
each run pays model calls only for its new part. That holds for a first
attempt with a read-write cache: a retry never replays, and with `CI` set
the cache records nothing by default, so grow the test outside `CI` and
pass `--retries 0` when the config retries. Keep the title and the
goals already written as they are while the test grows: a cache entry
belongs to the test's file and title path and the goal's instruction and
params. A fixture's run-unique value in a goal's params goes in as
`unique(value)` (topic `agent`), or every run misses.

## The browser fixture (browser only)

Prefer `app` and `screen`; `browser` is for what only a browser has, and a
portable suite declares `requires: ['browser']`. Page methods act on the one
active tab; cookies, routes, and `onDialog` cover the whole browser. A tab
the app opens (`target="_blank"`, `window.open`) opens in the background:
the active tab stays where it was. `waitForPopup(() => trigger)` makes the
tab the trigger opens active and resolves with it. When the active tab
closes, its opener is active again, or the tab active most recently when
the opener is gone. `tabs()`, `newTab()`, `tab.activate()`, and
`tab.close()` move between tabs.

- `goto(url, { waitUntil?, timeout? })`, `reload({ timeout? })`,
  `back({ timeout? })`, `forward({ timeout? })`: navigation on the test
  timeout by default; `goto` takes a base-relative path.
- `url()`, `title()`, `waitForURL(url | RegExp, { timeout? })`: reads and a
  URL wait; `waitForURL` matches like `toHaveURL`.
- `locator(css)`: raw CSS or XPath; not portable, a last resort.
- `frameLocator(css)`: a `Screen` scoped to one iframe
  (`browser.frameLocator('#payment').getByLabel('Card number')`); keeps
  `locator(css)` and `frameLocator(css)` for nesting. The agent's tree
  leaves out a frame from another site, so script steps there with it.
- `evaluate(fn | source, arg?)`: runs a function or source string in the
  page, JSON in and out, no closures; a throw in the page is
  `EVALUATE_FAILED`.
- `addInitScript(source | { path } | fn)`, `addInitScript(fn, arg)`: runs
  before the page's own scripts; call it before `app.open`. `arg` is JSON.
- `route(pattern, handler)`, `unroute(pattern)`: intercept requests, newest
  route first; `route.request` has `url`, `method`, `headers`, `postData`.
  `route.fetch()` reads upstream without deciding the route and returns
  `{ url, status, headers, body(), text(), json() }`; redirects are not followed.
  Hand binary bodies on with `body()`, never `text()`.
  The handler calls exactly one of
  `fulfill({ status?, headers?, contentType?, json | body | path })` (`body`
  a string or bytes; several cookies as one `\n`-joined `set-cookie`),
  `continue({ url?, method?, headers?, postData? })` (straight to the
  network; a header set to `undefined` is dropped, the configured `headers`
  still added on an allowed origin), `fallback()` (the route registered
  before it), or `abort()`;
  none or two fails the next step with `ACTION_FAILED`, an unsupported
  option with `INVALID_ARGUMENT`.
- `unrouteAll()` removes every route; configured headers stay.
- `waitForResponse(pattern, { timeout? })`: resolves once the headers
  arrive, with `{ url, status, headers, body(), json(), text() }`; the body
  readers wait for the body (up to the action timeout) and reject with
  `ACTION_FAILED` when it could not be read. Start the wait before the
  request, including the first `browser.goto` or `app.open`.
- `cookies()`, `setCookies([...])`: a target is an http(s) URL or a domain.
- `clearCookies({ name?, domain?, path? })`: remove cookies matching every
  string or RegExp filter; no options removes all cookies, other storage stays.
- `setViewport({ width, height })`: resize.
- `emulateMedia({ colorScheme?, reducedMotion? })`: what the page's `@media`
  rules and `matchMedia` read, for the rest of the test. Call it before
  `app.open` to load the page with it; a feature left out keeps its value.
- `onDialog('accept' | 'dismiss' | handler)`: awaited; resolves to an async
  unsubscribe. Register it before the tap that opens the dialog. A handler
  gets `{ type, message, accept(text?), dismiss() }`, where `type` is
  `alert`, `confirm`, `prompt`, or `beforeunload`, `accept` taking the prompt
  text; no handler, or one that neither accepts nor dismisses, fails the
  next step with `INVALID_STATE`. A throwing handler's unanswered dialog is
  dismissed too, and its error fails the next step.
- `waitForDownload(() => trigger, { timeout? })`: returns
  `{ path, absolutePath, suggestedFilename }`; `absolutePath` names the saved
  runner-side file for reading its contents, including with a hosted browser.
- `waitForDownloads(() => trigger, { count, timeout? })`: calls the trigger
  once and returns `count` of those results in start order.
- `keyboard.press(key)`, `keyboard.type(text)`, `keyboard.down(key)`,
  `keyboard.up(key)`, `mouse.*`: unfocused input. Only `down(key)` holds a
  key or modifier until `up(key)`. `press(key)` presses and releases within
  the call. Prefer `locator.press` and `locator.fill`.

A `route`, `unroute`, or `waitForResponse` pattern is a glob string or
`RegExp` matched against the full URL (`*` stays within one path segment,
`**` crosses `/`, `?` is one character); a predicate function is
`INVALID_ARGUMENT`.

## Habits

- Selectors come from the source (labels, roles, text); add an `aria-label`
  or heading where the app has no accessible name rather than fall back to
  `browser.locator('.btn-primary')`.
- Test data gets a run-unique name (`Invoice ${Date.now()}`) and `afterEach`
  cleanup, so replays and retries never trip over leftovers.
- APIs live in the same suite: ``fetch(`${app.baseUrl}/api/users`)``
  plus value matchers, in a `test.extend` fixture that reads `browser.cookies()`
  when the API needs the session.
- No sleeps, fixed delays, or polling loops. Wait for the state, not a
  duration: `agent.waitFor('the import finished')` with a `timeout` long
  enough for the slowest case (topic `agent` lists its model and budget
  limits), or a matcher with a longer `timeout` when a locator names the
  state exactly.
- `await` every step call and `expect.poll`, else `STEP_NOT_AWAITED` at the line of the call.
- Assert the fact a model produced with `toContain`, not its exact sentence.
