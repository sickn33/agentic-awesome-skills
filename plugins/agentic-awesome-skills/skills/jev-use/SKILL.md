---
name: jev-use
description: "Route enumerable judgment steps - did it work, which option, how risky, is this safe to run - to the Jev judgment model through the jev_judge and jev_gate MCP tools, batched into one call per state."
category: agent-orchestration
risk: safe
source: community
source_repo: shitianfang/jev-use
source_type: community
date_added: "2026-09-19"
author: shitianfang
tags: [agent-orchestration, mcp, routing, judgment, escalation]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/shitianfang/jev-use/blob/main/LICENSE"
---

# Jev Use

## Overview

Splits an agent loop by whether a step must produce text. Steps that only produce a decision - is the build done, which of these 30 elements to click, is this shell command safe, keep or drop this message - are handed to Jev, TypeSafe's judgment model, which answers typed yes/no, pick-one and score questions about a state in one forward pass instead of generating tokens. The agent stays the planner and the writer; Jev takes the quick calls.

Everything Jev should not decide comes back under a typed escalation contract, so the handoff is explicit in both directions rather than a guess.

## When to Use This Skill

- Use when the next step is a judgment over context you already have ("did X succeed?", "which option?", "how bad is this?") rather than something to write.
- Use when you are about to check the same state several times in a row, so the questions can be batched into one call.
- Use when you want a risk check on a proposed tool call before running it.
- Do not use when the step must produce new content - text, code, free-form tool arguments - or when the options cannot be enumerated. Those are structurally the model's own work.

## How It Works

### Step 1: Install and wire the server

```bash
npx -y jev-use install
```

`install` wires the stdio MCP server into Claude Code, Codex and pi through each harness's own CLI - whichever it finds - and `npx -y jev-use doctor` verifies backend resolution with one live round trip. Set a provider credential in the environment the agent runs in (`TYPESAFE_API_KEY`, `OPENROUTER_API_KEY` or `AI_GATEWAY_API_KEY`, auto-detected in that order), or set `JEV_BACKEND=mock` to run keyless with no network calls.

### Step 2: Route each step before working on it

| The step is...                                              | Route                |
| ----------------------------------------------------------- | -------------------- |
| Producing new content: text, code, free-form tool args       | You                  |
| A judgment, but the options can't be enumerated              | You                  |
| A yes/no or "did it work?" over context you already have     | `jev_judge` (`noul`)   |
| Picking the next action from options you can list            | `jev_judge` (`choice`) |
| Rating quality/severity/urgency on levels you can describe   | `jev_judge` (`score`)  |
| "Is this action safe to run?" before something risky         | `jev_gate`           |

### Step 3: Batch every question about one state into one call

`jev_judge` takes a single `state` string plus a `questions[]` array. Latency is flat in question count, and the cost of the shared state amortizes across the batch, so 13 batched questions cost far less than 13 separate calls. Never call it once per question.

### Step 4: Honor the escalation contract

Each verdict carries `{id, type, answer, confidence, escalate}`, plus `reason` and `hint` exactly when `escalate` is true. An escalated verdict is handed back to you - it is a normal verdict with a hint, never an exception:

| `reason`      | When      | What it means for you                                            |
| ------------- | --------- | ---------------------------------------------------------------- |
| `writing`     | pre-call  | The step must produce new text or code - structurally yours.      |
| `open_ended`  | pre-call  | Not expressible as `noul`/`choice`/`score`; nothing to enumerate. |
| `oversized`   | pre-call  | The state exceeds the size limit - shrink it or take the questions over. |
| `unsure`      | post-call | The answer is too flat to act on; it stays in `answer` as a prior. |
| `unreachable` | on failure| Jev could not be reached - proceed as if it did not exist.        |

The two pre-call reasons come from a deterministic router, so a step that was never Jev's does not spend a request.

## Examples

### Example 1: One state, three questions, one call

```jsonc
// jev_judge input
{
  "state": "CI run #142: build ok, 214 tests passed, 0 failed; 1 test quarantined as flaky last week",
  "questions": [
    { "id": "passed", "type": "noul",   "question": "Did the run fully succeed?" },
    { "id": "next",   "type": "choice", "question": "Next action?",
      "options": { "merge": "everything green", "rerun": "looks flaky", "hold": "needs attention" } },
    { "id": "risk",   "type": "score",  "question": "How risky is merging now?",
      "levels": ["routine", "worth a look", "incident"] }
  ]
}
```

```jsonc
// result (shape exact, values illustrative)
{
  "verdicts": [
    { "id": "passed", "type": "noul",   "answer": 0.97, "confidence": 0.94, "escalate": false },
    { "id": "next",   "type": "choice", "answer": "merge", "confidence": 0.34, "escalate": true,
      "reason": "unsure",
      "hint": "Treat the answer as a prior, not a decision - reason it out yourself." },
    { "id": "risk",   "type": "score",  "answer": 0.8, "confidence": 0.81, "escalate": false,
      "legend": { "0": "routine", "1": "worth a look", "2": "incident" } }
  ],
  "escalated": true
}
```

Two verdicts are usable immediately. The third came back escalated with `reason: "unsure"`, so that one question - and only that one - returns to you, with Jev's answer kept as a hint.

A `score` answer is the expected position on your own levels: `0.8` means "between *routine* and *worth a look*, closer to the latter", and `legend` maps the indices back to your words.

### Example 2: Risk check before a tool call

```jsonc
// jev_gate input
{
  "state": "Cleaning up build output in the project checkout after a failed release build",
  "tool": "Bash",
  "input": { "command": "rm -rf ./dist" }
}
```

```jsonc
// result
{ "decision": "deny", "confidence": 0.88, "hint": "..." }
```

`jev_gate` returns `allow`, `deny` or `escalate` for one proposed action. `allow` is silence: it falls through to the harness's normal permission flow, so the gate can never grant anything - it can only deny or ask. If Jev is unreachable the gate steps aside rather than granting.

## Best Practices

- ✅ **Do:** Collect every question you have about one state and send them in a single `jev_judge` call.
- ✅ **Do:** Put the relevant facts - tool output, file excerpts, task intent - into `state`. Jev sees nothing else about your session.
- ✅ **Do:** Read `escalate` on every verdict before acting on `answer`.
- ✅ **Do:** Describe `options` and `levels` in your own words; a `label -> meaning` map sharpens a `choice`.
- ❌ **Don't:** Call `jev_judge` once per question.
- ❌ **Don't:** Route trivia. If you already know the answer, just act - a call you did not need is still a call.
- ❌ **Don't:** Treat an `unsure` answer as a decision, or treat `allow` from `jev_gate` as authorization.

## Limitations

- Jev judges only what is in `state`; it has no view of your conversation, repository or tool history, so a thin `state` produces a thin judgment.
- State has a size ceiling (roughly 30k tokens). Beyond it the request escalates as `oversized` instead of being judged.
- Confidence is not uniform across backends: the default escalation threshold is `0.75`, but through the Vercel gateway no confidence field is returned and a top-minus-runner-up margin is used instead, with a default threshold of `0.4`.
- The advantage is narrower than an unconfigured comparison suggests. The project publishes its losing runs in [bench/RESULTS.md](https://github.com/shitianfang/jev-use/blob/main/bench/RESULTS.md): against enum-constrained baselines the latency lead is about 3x, not the 14x an unconstrained comparison shows. The benchmarks in [bench/examples/](https://github.com/shitianfang/jev-use/tree/main/bench/examples) are re-runnable scripts, so check the claim on your own workload.
- This skill does not replace environment-specific validation, testing, or expert review.

## Security & Safety Notes

- **Data egress:** whatever you put in `state` is sent to the provider you configure. Keep secrets, credentials and customer data out of it, or set `JEV_BACKEND=mock`, which judges locally with no key and no network call.
- **Credentials:** the provider key is read from the environment (`TYPESAFE_API_KEY`, `OPENROUTER_API_KEY`, `AI_GATEWAY_API_KEY`). Never paste a key into a `state` string, a prompt, or a committed file.
- **`jev_gate` is not a permission system.** It can deny or ask; it cannot grant. Keep your harness's own approval rules in place, and expect the gate to step aside if the backend is down.
- `npx -y jev-use install` edits local harness configuration through each harness's own CLI. Run it on a machine you control and re-run `npx -y jev-use doctor` afterwards to see what resolved.

## Common Pitfalls

- **Problem:** Verdicts come back consistently `unsure`.
  **Solution:** The state is usually missing the fact the question depends on. Put the concrete tool output or file excerpt into `state` instead of a summary of it, and give `options`/`levels` distinguishable meanings.
- **Problem:** The call escalates with `reason: "oversized"`.
  **Solution:** Trim `state` to the evidence the questions actually need, or split one oversized state into two smaller judged states.
- **Problem:** The step never reaches Jev and returns `writing` or `open_ended`.
  **Solution:** That is the router working. The step was structurally yours; do it yourself rather than rephrasing it to get past the check.
