---
name: accint-frames
description: Drain acc's deliberation queue — open/waiting brain_frames checkpointed by headless runs — via acc_act(runtime="continue").
risk: unknown
source: https://github.com/maxbaluev/accreted-intelligence/tree/main/plugins/claude/skills/frames
source_repo: maxbaluev/accreted-intelligence
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/maxbaluev/accreted-intelligence/blob/main/LICENSE
---

# frames
## When to Use

Use this skill when you need drain acc's deliberation queue — open/waiting brain_frames checkpointed by headless runs — via acc_act(runtime="continue").


Routing sugar over the two MCP verbs — no logic lives here.

1. List the queue: `acc frames` (CLI, read-only observation).
2. For each open/waiting frame: read its typed hole + retrieved context, deliberate,
   then submit via
   `acc_act(runtime="continue", input={"frame_id": ..., "submit_token": ..., "proposal_text": ...})`.
3. End `proposal_text` with `PREDICT: <0.00-1.00> <why>`; acc strips that line before
   the owner sees it and uses it to calibrate the Work Model against later outcomes.
4. An identical duplicate submit replays the cached result — resubmitting is safe.
5. Surface each resolution's `commitment` id and cited `[ids]`; drain the queue fully
   before taking new work — checkpointed frames are work headless runs saved for you.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
