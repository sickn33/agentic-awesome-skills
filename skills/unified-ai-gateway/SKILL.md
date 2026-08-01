---
name: unified-ai-gateway
description: Operate and evaluate Unified AI System through eight governed MCP tools while preserving fake-provider, authorization, and evidence boundaries.
category: ai-ml
risk: safe
source: https://github.com/happy520ai/unified-ai-system/tree/master/skills/unified-ai-gateway
source_repo: happy520ai/unified-ai-system
source_type: official
date_added: "2026-08-01"
author: happy520ai
tags: [ai-gateway, codex, mcp, self-hosted, governance]
tools: [codex]
license: Apache-2.0
license_source: https://github.com/happy520ai/unified-ai-system/blob/master/LICENSE
---

# Unified AI Gateway

## Overview

Use the bundled `unified-ai-system` MCP server to inspect and exercise a local
AI gateway without provider credentials. The published integration starts an
isolated gateway in Docker, keeps the deterministic fake provider enabled, and
removes the gateway when the MCP session ends.

## When to Use This Skill

- Use when a user asks whether Unified AI System is healthy or ready.
- Use when a user wants a credential-free gateway chat proof.
- Use when a user asks about the gateway's knowledge, workflow, or workforce
  surfaces.
- Use when a user wants evidence from the bundled MCP tools rather than a claim
  inferred from documentation or process exit codes.

Do not use this skill for generic model comparisons, unrelated MCP servers, or
deploying a production gateway.

## Workflow

1. Confirm that the `unified-ai-system` MCP tools are available in the current
   task.
2. Call `gateway_health`, then `gateway_readiness`, before attempting chat.
3. Select the narrowest additional tool that answers the request.
4. Report returned provider, execution mode, readiness, and blockers exactly.
5. Separate transport success from product, production-readiness, autonomy, or
   AGI claims.

## Tool Map

- `gateway_health`: managed gateway status and provider mode
- `gateway_readiness`: chat-path readiness and blockers
- `gateway_chat`: deterministic credential-free chat proof
- `knowledge_readiness`: knowledge subsystem readiness
- `workflow_health`: workflow subsystem status
- `workflow_actions`: available workflow actions
- `workforce_health`: workforce subsystem status
- `workforce_agents`: available workforce agents

## Example

```text
User: Check whether the local gateway is ready, then prove chat works safely.

Agent:
1. Call gateway_health.
2. Call gateway_readiness.
3. Call gateway_chat only if both results prove fake-provider mode.
4. Report provider, model, execution mode, response, and every blocker.
```

## Safety Boundaries

- Keep the credential-free local fake provider as the default.
- Never request, read, or transmit provider credentials through this skill.
- Do not enable or call a real provider without explicit scoped authorization.
- Do not claim production readiness, L5 autonomy, or AGI from a healthy handshake.
- Treat a zero exit code as transport evidence, not proof that readiness gates
  passed.

## Limitations

- This skill operates the bundled MCP surface; it does not deploy, benchmark,
  or certify the gateway for production use.
- The credential-free chat tool proves only the deterministic local fake path.
- It does not configure real providers or handle provider credentials.
- The published MCP image requires Docker.
- Existing Codex tasks may not hot-load a newly installed MCP configuration.

## Troubleshooting

- If the tools are missing after installation, reload Codex or start a new task.
- If readiness is blocked, report the returned blocker instead of retrying chat
  blindly.
- If the runtime might use a real provider, stop before chat and keep the
  session read-only.

## Additional Resources

- [Unified AI System](https://github.com/happy520ai/unified-ai-system)
- [60-second Codex MCP quickstart](https://github.com/happy520ai/unified-ai-system/blob/master/docs/codex-mcp-quickstart.md)
- [MCP server guide](https://github.com/happy520ai/unified-ai-system/blob/master/packages/mcp-server/README.md)
