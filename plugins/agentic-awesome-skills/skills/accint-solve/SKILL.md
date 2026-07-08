---
name: accint-solve
description: Route a goal through acc's scored-memory loop via acc_act(runtime="solve"); deliberate any returned brain_frame and submit via continue.
risk: unknown
source: https://github.com/maxbaluev/accreted-intelligence/tree/main/plugins/claude/skills/solve
source_repo: maxbaluev/accreted-intelligence
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/maxbaluev/accreted-intelligence/blob/main/LICENSE
---

# solve
## When to Use

Use this skill when you need route a goal through acc's scored-memory loop via acc_act(runtime="solve"); deliberate any returned brain_frame and submit via continue.


Routing sugar over the two MCP verbs — no logic lives here.

1. Call `acc_act(runtime="solve", input="<the goal>")`.
2. If the result is **final**: surface the answer, the `commitment` id, and the cited `[ids]`.
3. If the result is a **brain_frame**: it is YOUR deliberation turn — the frame is typed
   (which hole, what was retrieved, what is predicted). Reason over it, then submit via
   `acc_act(runtime="continue", input={"frame_id": ..., "submit_token": ..., "proposal_text": ...})`.
4. End `proposal_text` with `PREDICT: <0.00-1.00> <why>`; acc strips that line before
   the owner sees it and uses it to calibrate the Work Model against later outcomes.
5. Never leave a received frame unresolved; never solo-derive outside the loop.
6. Close the commitment honestly later with `acc_act(runtime="outcome", ...)`.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
