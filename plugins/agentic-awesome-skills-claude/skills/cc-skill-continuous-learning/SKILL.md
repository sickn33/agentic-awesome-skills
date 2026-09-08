---
name: cc-skill-continuous-learning
description: "Turn a completed debugging session or repeated user correction into a small, evidence-backed procedure. Use for explicit requests to capture reusable lessons; does not automatically extract or save memories."
risk: none
source: community
date_added: "2026-02-27"
---

# Continuous Learning from a Completed Session

Capture one reusable lesson whose trigger, fix and verification can be explained without preserving a private conversation. The output is a reviewed procedure, not an automatic memory update.

## When to Use
Use after a resolved failure, a repeated project-specific correction, or an explicit request to save what was learned. Skip one-off typos, unresolved guesses, transient provider outages and lessons already covered by project documentation. A long session alone does not make a lesson reusable.

## Inputs and prerequisites

- An authorized session summary or transcript, affected code or configuration, and the command or observation that confirmed the fix.
- The scope of the lesson: this repository, this tool version, or a more general procedure.
- An existing authorized documentation destination. If saving was not requested, return a draft in the conversation; do not update user memory, install skills, or modify agent configuration automatically.
- The optional [session-length helper](evaluate-session.sh) requires Bash and Python 3. Its only setting is `min_session_length` in [config.json](config.json).

## Procedure

1. Identify the failed assumption and final observed behavior. Keep unsuccessful hypotheses separate from the verified cause.
2. Check the current source and test result. A remembered fix that was never exercised stays an open hypothesis.
3. State a narrow trigger and prerequisites. Include the runtime or tool version when the fix depends on it.
4. Write the smallest sequence that reproduces the diagnosis and verifies the repair. Include an expected result and a counterexample where the procedure should not be used.
5. Remove secrets, user names, absolute personal paths, private messages and unrelated repository details. Prefer a minimal synthetic example to copying a transcript.
6. Compare with existing instructions. Amend an existing project note when authorized instead of creating another overlapping skill. Preserve provenance and distinguish the original observation from later generalization.
7. Present the draft and its evidence. Save only within the scope already authorized by the user, then read back the saved result.

## Worked example

Illustrative input: a React test observed an old success message after the input changed, before new asynchronous validation completed. The fix associates each result with the exact current input; the regression changes the input and asserts that stale success disappears immediately.

```text
Trigger: asynchronous validation results can outlive the input they describe.
Prerequisites: the component stores input and an async validation result.
Procedure: bind the result to its input; display pending state until that binding
matches; ignore results from superseded requests.
Verify: change a valid input to an invalid one while validation is pending.
Expected: no previous success is displayed; the final error belongs to the new input.
Limit: this does not establish the semantic correctness of the validation itself.
```

Use actual project paths and test output when recording a real lesson. This is an illustrative pattern, not a claim that a particular user's test passed.

## Optional session-length reminder

```bash
bash skills/cc-skill-continuous-learning/evaluate-session.sh /absolute/path/to/session.jsonl
```

The helper counts JSONL objects whose top-level `type` equals `user`. It prints a count and review reminder to stderr after the configured threshold. It does not extract patterns, invoke a model, create directories, or save anything. `CLAUDE_TRANSCRIPT_PATH` is an optional caller-supplied fallback; no host is assumed to populate it. Automatic hook integration is not configured by this skill.

## Limitations
- Transcript formats differ across clients. Other message schemas need an explicit adapter; zero messages does not prove that no useful work occurred.
- The helper rejects links, non-regular files, invalid JSONL, files above 16 MiB and lines above 1 MiB. It never prints transcript contents.
- A successful length check is not a semantic review, privacy review or authorization to persist a lesson.
- Recheck version-specific lessons before reuse. Do not promote a project workaround into a universal instruction without additional evidence.
