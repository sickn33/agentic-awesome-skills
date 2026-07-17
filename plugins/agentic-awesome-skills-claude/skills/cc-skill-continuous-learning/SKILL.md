---
name: cc-skill-continuous-learning
description: "Extract reusable project-specific lessons from completed coding sessions and turn approved patterns into concise learned skills. Use after repeated fixes, user corrections, or durable workflow discoveries."
risk: none
source: https://github.com/affaan-m/everything-claude-code
source_repo: affaan-m/everything-claude-code
source_type: community
date_added: "2026-02-27"
---

# Continuous Learning

Capture durable lessons from completed work without storing raw session noise.

## When to Use

- A fix or debugging technique is likely to recur.
- The user corrected a project convention that future work should preserve.
- A workflow produced a reusable sequence, check, or failure-recovery pattern.
- The user explicitly asks to turn a completed session into reusable guidance.

Do not use this skill for one-off facts, unverified guesses, secrets, personal data, or lessons that conflict with current repository instructions.

## Workflow

1. Identify one candidate lesson from evidence already present in the session or workspace.
2. Verify that the lesson succeeded and is not merely the last attempted approach.
3. Check existing project guidance and skills for overlap or contradiction.
4. Draft a compact pattern containing:
   - trigger and scope;
   - proven procedure;
   - verification step;
   - failure or stop condition;
   - known limitations.
5. Remove credentials, personal data, transient paths, and session-specific details.
6. Ask for approval before writing or updating durable skill or memory files unless the current task already authorizes that exact write.
7. Re-read the saved artifact and confirm that it preserves the verified lesson without broadening it.

## Output

Return the candidate lesson, supporting evidence, proposed destination, overlap check, and whether it was drafted or written. If no durable lesson is justified, say so instead of manufacturing one.

## Limitations

- A successful single attempt may not generalize; prefer repeated or independently verified evidence.
- Do not treat generated guidance as a substitute for repository tests or current upstream documentation.
- Learned guidance must yield to newer project instructions and explicit user decisions.
