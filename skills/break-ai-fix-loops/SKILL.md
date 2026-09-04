---
name: break-ai-fix-loops
description: "Stop ineffective AI coding repair loops with stable failure fingerprints, a three-attempt budget, real-path proof, negative controls, and tested rollback."
category: code-quality
risk: critical
source: community
source_repo: twoicewoo/awesome-copilot
source_type: community
date_added: "2026-09-04"
author: twoicewoo
tags: [ai-agents, debugging, verification, negative-control, rollback]
tools: [claude-code, codex-cli, copilot, cursor, gemini-cli]
license: "MIT"
license_source: "https://github.com/twoicewoo/awesome-copilot/blob/886bf799bb05501bfd1afa7aae9cc5a77dedb03e/LICENSE"
---

# Break AI Fix Loops

Replace patch-and-retry behavior with a bounded, evidence-producing repair. Treat a changed patch as progress only when an observable state changes.

## When to Use This Skill

- Use when an AI coding agent cycles through similar patches without changing the observed failure.
- Use when a focused test passes but the installed, deployed, UI, API, persistence, or other real execution path still fails.
- Use when a repair claim needs a verifier that can reject a known-bad state and a rollback that has actually restored the baseline on a disposable copy.
- Do not use for a one-shot, already-understood edit whose acceptance check directly exercises the complete claimed behavior.

## Establish the repair contract

Before the first edit, record:

- the exact defect and the behavior that would disprove it;
- the revision, configuration, input, and execution path under test;
- the baseline command, literal result, and exit status;
- the strongest check that directly observes the claimed behavior;
- the rollback command and the state it must restore.

Save raw evidence before normalizing it. Redact credentials, tokens, cookies, personal data, and private URLs. Never put secrets into a fingerprint record or committed ledger.

If the defect cannot be reproduced, stop editing. Report `INCONCLUSIVE` with the missing observation instead of guessing at a fix.

## Use a three-attempt budget

Allow at most **three repair attempts for one acceptance claim**. An attempt begins when code, configuration, dependencies, generated artifacts, or test expectations change. Inspections and read-only probes do not consume an attempt.

Do not reset the budget because the agent restarts, opens a new session, rewrites the same patch, changes models, clears a cache, or renames the hypothesis. A newly exposed downstream failure still belongs to the same three-attempt budget unless it is a separately accepted task.

For every attempt, write these fields before the next edit:

| Field | Required evidence |
| --- | --- |
| Hypothesis | One causal mechanism, not a restatement of the symptom |
| Prediction | An observation that would distinguish this hypothesis from the previous one |
| Change | Exact changed paths and a patch or before/after hash |
| Focused check | Exact command, input, literal output, and exit status |
| Real-path check | Direct observation, or `NOT_RUN` with a reason |
| Symptom fingerprint | Stable fingerprint described below |
| Decision | `ADVANCE`, `SHIFT_CAUSE`, `PROVEN`, or `STOP` |

Use [the evidence ledger](references/evidence-ledger.md) as a copyable record.

## Fingerprint the observable failure

Fingerprint what the system did, not the agent's explanation. Build a canonical record from:

```json
{
  "schema_version": 1,
  "command": "the exact verification command",
  "input_digest": "digest or stable identifier of the tested input",
  "exit_code": 1,
  "failure_class": "stable-machine-readable-class",
  "stable_excerpt": "the smallest decisive output with volatile values removed",
  "real_path_state": "the directly observed state, or NOT_OBSERVED"
}
```

Keep the unedited output beside this sanitized record. Remove timestamps, run IDs, ANSI codes, random ports, and temporary paths from `stable_excerpt` only when they do not affect the defect. Do not normalize away values that could distinguish two causes.

Optionally compute the canonical SHA-256 fingerprint from this skill directory:

```bash
python3 scripts/fingerprint.py evidence/attempt-1.json
```

The helper validates the record, rejects unknown fields, and prints the fingerprint. It does not execute commands or redact evidence.

The helper uses only the Python 3.9+ standard library. When changing it, run its bundled regression tests:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts/test_fingerprint.py -v
```

The same fingerprint after a different patch means the observable failure did not move. A cosmetically different message with the same failure class, input, command, and real-path state also counts as a repeated failure when the changed text is only volatile data. Do not use a patch hash in the symptom fingerprint; record it separately so different edits cannot masquerade as different outcomes.

## Shift the root-cause strategy

Set the decision to `SHIFT_CAUSE` immediately when any of these occurs:

- a symptom fingerprint repeats;
- the patch changes but the decisive state does not;
- a focused test passes while the real path still fails;
- a retry produces no new discriminating evidence.

Then stop editing and perform this sequence:

1. List the attempted mechanisms and the observation that falsified or failed to distinguish each one.
2. Identify the next unobserved owner boundary along the live path: input, dispatch, configuration, dependency, generated artifact, process, persistence, network, or presentation.
3. Collect one new observation at that boundary with tracing, logging, inspection, or a minimal probe.
4. Form a replacement hypothesis that predicts a different observation and targets a different causal mechanism.
5. Resume only if the new evidence can discriminate the replacement hypothesis. Otherwise return `BLOCKED`.

Do not spend an attempt on the same mechanism with broader edits. Do not weaken the assertion, skip the failing path, add a silent fallback, or update expected output merely to obtain green tests.

## Prove the real execution path

Match proof to the claim. Bind every result to the exact revision, configuration, and input.

| Claim | Required direct observation |
| --- | --- |
| CLI behavior | Invoke the installed or built entry point as a user would |
| API or integration | Send a real request and observe response plus the responsible service boundary |
| UI behavior | Perform the real interaction and observe UI state plus relevant network or console evidence |
| Persistence | Write, reload in a new read path or process, and observe the stored value |
| Deployment | Exercise the deployed revision and prove which revision served the result |
| Agent or tool action | Observe the actual tool call and its external state change, not the agent's narration |

A unit test, mock, type check, build, open port, process liveness check, or model-written summary is supporting evidence only when the claim crosses a boundary it does not exercise.

## Make the verifier prove it can fail

After the modified path passes, run a negative control on a disposable copy:

1. Copy the verified modified state to a separate worktree or directory.
2. Reintroduce the original defect or substitute a known-bad input that violates the same acceptance claim.
3. Run the **same primary verification command** with the same relevant configuration.
4. Require a non-zero exit status caused by the intended assertion.
5. Record the exact command, input, literal output, exit status, and failure classification.

An unrelated crash, missing dependency, timeout, syntax error, or test-discovery failure is not a valid negative control. If the known-bad state exits zero, the verifier is false-green: return `INCONCLUSIVE`, repair the verifier, and do not claim the product fix is proven.

Return to the untouched modified tree and rerun the primary verification after the negative control.

## Test rollback on another copy

Never test rollback only by undoing the working repair. Instead:

1. Copy the verified modified state to another disposable worktree or directory.
2. Run the documented rollback command there.
3. Verify changed paths and hashes match the recorded baseline.
4. Run the baseline command and confirm the prior behavior or status is restored.
5. Leave the primary modified tree unchanged.

A rollback script that parses, prints help, or exits zero without restoring behavior has not been tested.

## Finish with an evidence status

Use exactly one status:

- `PROVEN`: baseline defect observed; responsible change identified; focused and real-path checks pass; the known-bad negative control exits non-zero for the intended reason; rollback succeeds on another copy; the primary tree remains modified and passing.
- `INCONCLUSIVE`: some useful evidence exists, but a decisive gate is missing, false-green, or ambiguous.
- `BLOCKED`: the three-attempt budget is exhausted, a repeated fingerprint has no new discriminator, or a named external condition prevents the next observation.

Report exact commands, inputs, literal results, exit statuses, fingerprints, changed paths, revision, and remaining gaps. A passing proxy check or the phrase "tests pass" is never a substitute for those fields.

## Examples

### Repeated patch with no state change

```text
Attempt 1: patch hash changed; focused test passed; real path still shows disabled.
Fingerprint: 08b4...; decision: SHIFT_CAUSE.
Next action: stop editing and observe the configuration-to-process boundary.
```

### Valid negative control

```text
Modified copy: primary verifier exits 0 and observes the expected UI state.
Known-bad disposable copy: the same verifier exits 1 on the intended assertion.
Rollback copy: baseline hashes match and the baseline command restores its prior result.
Decision: PROVEN.
```

## Limitations

- This workflow cannot prove a repair when the defect is not reproducible, the real execution path is inaccessible, or the primary verifier cannot observe the acceptance claim.
- A three-attempt budget exposes stagnation; it does not identify the correct architecture or replace domain expertise.
- A known-bad control demonstrates that one verifier catches one defect class. It does not prove complete test coverage.
- Rollback verification covers the recorded paths and baseline behavior only; external systems need their own provider-side readback.

## Security & Safety Notes

- This skill can guide changes to code, configuration, dependencies, generated artifacts, and files, so its risk is `critical`.
- Confirm the repository, target environment, accepted paths, and approval boundary before modifying state. Ask before destructive, irreversible, production, financial, credential, or external-message actions.
- Keep negative controls and rollback trials on disposable copies. Never inject a known defect into the primary working tree or a live environment.
- Keep raw evidence private when it may contain credentials, personal data, internal URLs, or customer content. Commit only sanitized records.
- `scripts/fingerprint.py` is a Python standard-library helper that reads one local JSON record and prints a digest; it does not run commands, access the network, redact data, or modify the record.

## Related Skills

- `systematic-debugging` focuses on root-cause investigation before a fix; use this skill when attempts must also be fingerprinted, bounded, falsified with a negative control, and made reversible.
- `verification-before-completion` gates success claims on fresh evidence; this skill adds repair-attempt accounting and rollback proof.
- `closed-loop-delivery` spans acceptance through delivery; this skill is the narrower anti-stagnation and verifier-falsification protocol for repair loops.
- `audit-agent-run-evidence` performs a read-only post-run audit; this skill governs the repair while it is happening.

