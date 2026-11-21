# codex-agents: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Confirm the build model and the review model with the user.

- `2026-11-18`, the owner: "there are two choices. Model for building. Model for reviewing. My preference and suggestion for both is newest available sol high or xhigh. Confirm with the user." And: "then user preference goes to user files."

## Keep product decisions, operational changes and stage-completion judgement with the session agent.

- `2026-11-14`, the owner allowed builders to run development tests and fix failures before handoff. Applied migrations still go through the session agent before dependent tests; deploys, pushes, provider settings, secrets, production credentials and final stage judgement remain with it.

## Keep resumable briefs in a persistent file and use `--read`.

- `2026-11-14`, an evals product's restarted session lost every scratchpad script and cited evidence file. Resumable build briefs need the same persistence as the status and evidence described by the `flight-deck` skill.

## Delegate only what is worth the hand-off; the test is size, not time.

- `2026-09-22`, a builder sat twelve minutes on a fifteen-line change with zero writes and a clean tree.

## Pass it on every build dispatch, not only the ones you think are new sessions.

- `2026-09-16`: a round meant to fix twelve failing tests resumed as a new session, ran read-only, and reported a decision with no diff behind it.

## Leave builds uncommitted when the session agent owns the commit.

- `2026-10-23`, a monitoring product: four worktree builds came back uncommitted, three of them quoting the `index.lock` error; other platforms not tested here.

## A test-running build runs without a sandbox, bounded by its instructions.

- `2026-11-14`, the owner chose builder-run tests with instructions as the boundary, rather than an enforced sandbox. Observed on macOS, Codex CLI 0.166.0 and Playwright 1.64.1: `workspace-write` denied Chromium's `mach-register` and DNS failed; `danger-full-access` started the browser and the network answered. Earlier sandboxed builders had handed test failures back to the session agent instead of fixing their own tests.

## Name `$app-stack:ui-design` in a build that adds or changes screens.

- `2026-11-03`, an evals product: Codex, with no pack installed, built screens without the method, and the owner's click-through found five layout bugs. Once the pack was installed, a headless `codex exec` loaded `$app-stack:ui-design`, codex-cli 0.166.0.

## A usage limit makes the builder unavailable, as a missing CLI does.

- `2026-10-22`: the reset was 90 minutes away, and the session agent built two stages with its own subagents rather than wait.

## A resume does not keep the session's model.

- `2026-10-01`: a resumed session came back on the config default, and nothing failed to say so.

## A resume does not keep the session's sandbox either.

- `2026-11-17`, a product's second build round: the wrapper resumed the session started with `--sandbox danger-full-access`, which then ran read-only, answered that it was blocked, changed no files and exited 0. Called directly with `-c sandbox_mode="danger-full-access"`, the same session built. A probe that day read the header's sandbox: `workspace-write` when new, `read-only` on a plain resume, `workspace-write` again with the override.

## Use the configured binary, installed CLI, then the extension bundle.

- `2026-10-22`: the extension's bundle was a 0.155 alpha without `codex-code-mode-host.exe`, and every tool call of a build round failed before it ran, with no file changed.

## Explicitly open required instruction sections beyond the entry-file context budget.

- `2026-11-16`, Codex CLI 0.169.0 on Windows: a 104,297-byte `AGENTS.md` exceeded the logged 32,768-byte budget and its role table did not load. Builder briefs must name needed sections beyond that budget for explicit opening.

## Name `$ai-shipping:test-harness` in builds that run tests or the gate.

- `2026-11-16`, a Windows builder had only `app-stack` and `agent-harness` installed and enabled. A prose skill name could not load the missing `ai-shipping` pack.

## Apply `independent-review` for round scope, brief, triage and stopping.

- `2026-11-16`, Codex CLI 0.169.0 on Windows: elevated sandbox mode ran for 60 minutes with zero commands before timeout; unelevated completed in about 15 minutes. The review wrapper now offers an explicit mode override, preserving config lookup when absent. The earlier isolation tool-count measurement was on macOS, not Windows.
