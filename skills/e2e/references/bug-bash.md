# Running a bug bash

A bug bash is many `e2e explore` runs at once, one charter each, then a
verification pass that turns every claimed bug into a repro test that fails
for the reason reported. Plan the charters, fan them out, merge the findings,
prove each bug. Report confirmed bugs only, each with its failing test.

## Contents

- 1. Prepare
- 2. Plan charters
- 3. Fan out
- 4. Merge
- 5. Triage
- 6. Verify
- 7. Report
- Rules

## 1. Prepare

- A config with a target and an agent that holds a model (topic `setup`),
  and authentication for its provider.
- The app must serve several explorers at once: start it once and set
  `reuseExisting: true` on the target's `app.command`, or declare the URL with
  port `0` so each run starts its own app on a free port. `reuseExisting` is
  ignored when `CI` is set, as in many agent sandboxes: use port `0` or
  unset `CI`. A fixed port that is not reused fails every run after the first.
- When the target's `app.command` brings up a stack of its own (a database
  it starts and removes on exit), the first explorer to finish removes the
  database under the rest. Start the stack once yourself with the config's
  command and environment, and explore with a bug-bash config that declares
  no command (below).
- Explore a production build when the project has one. A dev server that
  compiles a route on first visit reads to the explorer as a dead link.
- Seed one disposable workspace or user per charter with the project's own
  fixtures or seed scripts and declare each as a credential (`bb-<slug>`).
  Explorers that share an account report each other's edits as bugs.
- Start signed-in charters from a saved session: `e2e explore --session
  <name>` runs the setup test that saves it and explores signed in (topic
  `explore`). Each charter with its own account needs its own setup and
  session.
- Put what the local app cannot do in the agent's `context`: integrations
  without keys, what is seed data, what must never be clicked (paid runs,
  real accounts). Add the explorer's own blind spots from step 5's artifact
  bucket (the config below carries the sentence); without them those
  families dominate the findings.
- A bash against a deployed site others use is read-only: no signups,
  sign-ins, or submissions, nothing injection-shaped in URLs, no request
  loops. A WAF block is the firewall working, not a finding, and it can
  follow the runner's IP into every later charter.
- Each exploration step needs 40 or more `maxSteps` and `maxModelCalls` on
  the agent; a config tuned for test steps (`maxSteps: 15`) starves it. That
  is per step, separate from `--max-steps`, which counts a charter's steps.
- On a mobile target, declare one target per device and give each explorer
  and verifier its own (topic `setup`).
- Skip `--headed`. On an engine that records, `--video` gives each run a
  replay for any confirmed bug.

A bug-bash config, left untracked, spreads the project's config and
overrides what a bug bash needs. Typing the import as `E2EConfig` keeps
`shared.tests` and `shared.credentials` compiling when the base declares
neither:

```ts
// e2e.bugbash.config.ts
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';
import base from './e2e.config.ts';

const shared: E2EConfig = base;

// What the local app cannot do, plus the explorer's blind spots (step 5's artifact bucket).
const context =
  'Sign in with the credential the goal names. The local app sends no email and has no AI key. Never start a paid run or connect an integration. ' +
  'Not bugs: a link that opens a new tab leaves this one unchanged; accessible text splits around inline links, so judge copy by the rendered screen when a screenshot is available and never report split text alone as broken copy; an infinite-scroll "Loading more" sentinel loads when scrolled into view; images lazy-load, so scroll and wait before calling one blank.';
const persona = { model: gateway('openai/gpt-6-luna-fast'), maxSteps: 40, maxModelCalls: 40, context };

export default {
  ...shared,
  // The project's tests, so a repro can use its setup tests' sessions, plus the repro tests from step 6.
  tests: [
    ...[shared.tests ?? 'tests/**/*.e2e.ts'].flat().filter((glob) => !glob.startsWith('!tests/bugbash/')),
    'tests/bugbash/**/*.e2e.ts',
  ],
  // The app already runs: no command.
  targets: [{ name: 'web', engine: web(), app: { url: 'http://127.0.0.1:3000' } }],
  retries: 0,
  reporters: ['list'],
  credentials: {
    ...shared.credentials,
    // The seed script's password, from the environment rather than the file.
    'bb-cart': { username: 'bb-cart@example.test', password: process.env.BUGBASH_PASSWORD ?? '' },
    'bb-account': { username: 'bb-account@example.test', password: process.env.BUGBASH_PASSWORD ?? '' },
  },
  // The postures from step 2 as personas: same model and budgets, a different stance; each charter picks one with --agent (step 3).
  agents: {
    default: persona,
    skeptic: { ...persona, system: 'Distrust every number, date, count, and claim on screen; cross-check each against every other place it appears.' },
    fuzzer: { ...persona, system: "At every input, run the goal's input matrix before anything else, judging each entry before the next. Never take the happy path." },
  },
} satisfies E2EConfig;
```

Set `BUGBASH_PASSWORD` to 6 or more characters first, or the config fails to
load: a shorter password can't be redacted without rewriting ordinary text,
so an account the app seeds with one (`admin`/`admin`) needs a longer
password before it can be a credential. Pass `--config e2e.bugbash.config.ts`
to every command below, and `open_session {config: "e2e.bugbash.config.ts"}`
over MCP.

## 2. Plan charters

A charter is one `e2e explore` goal: one area, one posture, one sentence,
naming the start route and, when needed, the credential (`Sign in as
credential bb-cart. Starting at /cart, ...`). Read the routes, navigation,
and forms first; for a branch, `git diff --stat` against the base.

| Posture | Charter shape |
| --- | --- |
| First-time user | `Starting at /signup, sign up and complete onboarding like a first-time user; report anything confusing, broken, or inconsistent` |
| Numbers and copy | `Starting at /cart, change quantities and apply a coupon; check every price, total, and label against the rest of the page` |
| Edge input | `Starting at /settings/profile, submit each field empty, too long, with unicode and with leading spaces; report validation that is missing or wrong` |
| State | `Starting at /projects, create, rename, and delete a project, reloading and going back after each; report state that is lost or stale` |
| Error paths | `Starting at /login, try a wrong password, an unknown account, and a locked account; report errors that are missing, misleading, or leak detail` |

Aim for five to ten charters, each with its own slug. Overlap is fine;
duplicates merge in step 4. Give each posture its persona (config above),
picked per charter in step 3: a generic agent walks past a stat that
contradicts the same stat on another page, the skeptic catches it. An
edge-input charter names its exact matrix (empty, a 300-character string,
unicode, leading spaces, literal special characters) or it spends the whole
time budget before judging a single result.

## 3. Fan out

One `e2e explore` per charter with its own output directory:
`--output .e2e/bugbash/<slug>` writes `report.json` and `results/` there,
and `--reporter list,markdown` adds `summary.md`. `e2e init` gitignores
specific `.e2e/` paths, not `.e2e/bugbash/`: add it to `.gitignore` or
delete it when done, and delete it before a new bug bash. `charters.txt` and
the logs under it are yours; the rest is the runner's output, read only.

Run them as background shell jobs, four at a time, not as subagents. One
line per charter, `slug|target|agent|charter`, the agent naming its persona,
then (`xargs -0 -P` is a GNU and BSD extension, present on macOS and Linux):

```bash
mkdir -p .e2e/bugbash
cat > .e2e/bugbash/charters.txt <<'CHARTERS'
cart|web|skeptic|Starting at /cart, change quantities and apply a coupon; check every price, total, and label against the rest of the page
account|web|fuzzer|Starting at /settings/profile, submit each field empty, a 300-character value, unicode, and leading spaces; report validation that is missing or wrong
CHARTERS
while IFS='|' read -r slug target agent charter; do
  [ -n "$slug" ] && printf '%s\0%s\0%s\0%s\0' "$slug" "$target" "$agent" "$charter"
done < .e2e/bugbash/charters.txt | xargs -0 -n 4 -P 4 sh -c \
  'npx e2e explore "$4" --config e2e.bugbash.config.ts --target "$2" --agent "$3" --output ".e2e/bugbash/$1" --max-steps 15 --timeout 900000 --video --reporter list,markdown < /dev/null > ".e2e/bugbash/$1.log" 2>&1' _
```

`--timeout` ends a charter with its assessment whatever its step count, and
a step takes about a minute, so the flags above give each charter about
fifteen minutes. Under a time limit, size the first round to end by about a
third of it.

The log's summary prints `AI` (cost) and `Duration`. Exit code `1` means
issues were reported: read the log either way. Exit codes `2` and `3` are
setup and environment problems; fix them and rerun that charter alone.

## 4. Merge

Read each log's `Findings` section (topic `explore`); `summary.md` holds the
same, and `report.json` has the record under `run.explore`. The video is in
the attempt's `video/` directory under `.e2e/bugbash/<slug>/results/`.

Merge findings that describe one defect: same path, same broken behavior.
Keep the clearest reproduction and every charter that hit it. Keep warnings
in a separate list unless the user asked for polish.

A charter's video is not masked: check it for secrets before sharing (topic
`writing-tests`).

## 5. Triage

Sort every finding before writing any test. Read the source to sort them.

| Bucket | Sign | Outcome |
| --- | --- | --- |
| Explorer artifact | A "dead" `target="_blank"` link whose destination opens when clicked with popup capture or navigated to directly, a broken sentence the screenshot renders whole, a "Loading more" sentinel nothing scrolled to, a lazy-loading image or embed | Rejected with the check that settled it; settle this bucket first. A new-tab link whose destination never opens stays a candidate |
| Environment | Fails on a key, a service, or a limit only the local stack lacks (an email provider, an AI key, a billing plan) | Rejected, naming the variable or service; note separately when the app handles the failure badly in a way production users would see, such as showing the raw error |
| Design | The code, its tests, or its copy say the behavior is intended | Rejected, citing where |
| Fixture | The seed data lacks a field real records always have | Rejected, naming the field |
| Candidate | None of the above | Verify it (step 6) |

## 6. Verify

A finding is a model's claim; prove each candidate before reporting it. When
your client can start subagents (Claude Code's Agent or Task tool, for one),
start one per area with its three to five candidates as the log printed
them and these steps, up to four at a time (the `e2e mcp` server's default
session limit, which step 4 uses). Each reports back, per finding:
confirmed or rejected, the root cause as `file:line` when it may read the
source, the repro test path, and the failure it saw. Without subagents,
verify one area after another.

1. Read `actual` against the screenshot, or the video when there is none.
   A finding the evidence contradicts is rejected here. Settle the artifact
   bucket first: a "dead" link's destination must actually open (a valid
   href with a prevented default is still dead), a copy claim must show in
   the rendered screenshot.
2. Write a repro test from the finding: its reproduction as `agent.act`
   steps and its expected behavior as the closing `agent.assert`, so it
   fails today and passes once the bug is fixed. It needs no locators. Sign
   in as the charter did, with its credential as step parameters or a setup
   test's session. Assert only the defect: a count or a record another repro
   changes makes it fail for the wrong reason. Put it under `bugbash/`
   inside the directory the config's `tests` glob covers
   (`tests/bugbash/<slug>.e2e.ts` for the default): a file the glob does not
   match is never selected, whatever path you pass to `e2e run`. Tag it
   `{ tags: ['bugbash'] }`.

   ```ts
   // tests/bugbash/cart-line-quantity.e2e.ts
   import { describe, test } from '@e2e-dev/web';
   import { credentials } from 'e2e';

   describe('cart', { tags: ['bugbash'] }, () => {
     test('a cart line totals its quantity times the unit price', async ({ app, agent }) => {
       const shopper = credentials.user('bb-cart');
       await app.open('/');
       await agent.act('sign in with the given credentials', {
         params: { username: shopper.username, password: shopper.password },
       });
       await agent.act('add "Dune" to the cart');
       await agent.waitFor('you are signed in and the cart holds "Dune"');

       await agent.act('set the quantity of "Dune" in the cart to 2');

       await agent.assert('the cart line for "Dune" totals twice its unit price');
     });
   });
   ```

   Write it in the shape topic `writing-tests` describes: arrange, closed by
   a wait for the starting state, then the one action that shows the defect,
   then the assertions. The wait keeps a broken setup from passing as the
   defect, and keeps the setup goals cached across the failing runs.
3. Run your repros with the bug-bash config and an output directory of your
   own, `npx e2e run tests/bugbash/<slug>.e2e.ts --config
   e2e.bugbash.config.ts --output .e2e/bugbash/verify-<area>` (a run clears
   its output's results, and another subagent may be reading them), then one
   file alone while you fix it. Confirmed when it fails on the
   reported defect: `ASSERTION_FAILED` from the closing `assert`, or a
   failed `act` whose message names the defect. A failed `act` carries the
   code the model chose, so only its message and screenshot tell the defect
   apart from a failure short of it. A blocked `act`, a timeout, a setup
   error, a failed arrange wait, or a failure that names something else means the repro is wrong:
   sharpen the step and rerun. A passing test means the bug did not
   reproduce: reject the finding, say so, and move the test out of
   `tests/bugbash/` (to `.e2e/bugbash/extra-tests/`, or offer it as a
   regression test). Only failing repro tests stay there.
4. When the user wants a scripted regression test, harden a confirmed repro
   with `screen` actions and exact `expect` values (topic `writing-tests`):
   with the `e2e mcp` server registered, `open_session` with the bug-bash
   config, pass its session id to every call, walk the reproduction, and
   `locate` each locator before writing it (topic `mcp`). Close your session
   when done. A scripted step that opens a native dialog needs
   `browser.onDialog` first.

## 7. Report

Run every repro once, `npx e2e run --tag bugbash --config
e2e.bugbash.config.ts`, so each bug you report still fails. Lead with the confirmed bugs, most severe first. For each: title, path, one
line of expected against actual, root cause when known, steps, screenshot
and video paths, repro test, and the charters that found it. Then the
environment candidates that are production risks, marked unverified. Then
the rejected findings grouped by reason (environment, design, fixture, did
not reproduce), and the warnings. End with the charters run, their cost, and
the areas no charter reached.

The repro tests fail until the bugs are fixed: where the project's `tests`
glob covers `tests/bugbash/`, its gating run leaves them out
(`npx e2e run --exclude-tag bugbash`) or they stay uncommitted. Offer to fix
each bug: the repro test turning green is the proof, and it stays as the
regression test with its `bugbash` tag removed.

## Rules

- Never report an unverified finding as a bug. "The explorer reported" is
  not "confirmed".
- Under a time limit, spend it: once a round is verified, run charters for
  the areas and postures no charter reached, until about a tenth of the
  time is left. Report each bug as soon as its repro confirms it, so a bash
  cut off at the limit keeps it.
- One charter, one area. A charter that spans the whole app ends at its
  step budget having skimmed everything.
- Seeded data and test accounts the app ships for development are not
  bugs; say so in the agent's `context`.
- Leave the project's files as you found them: the bug-bash config, seed
  script, and repro tests stay untracked until the user asks otherwise, and
  stop the stack you started when the user is done.
