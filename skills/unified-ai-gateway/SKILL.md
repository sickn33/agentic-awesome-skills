---
name: unified-ai-gateway
description: Operate and evaluate Unified AI System through eight governed MCP tools while preserving fake-provider, authorization, and evidence boundaries.
category: ai-ml
risk: critical
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

Use the official `unified-ai-system` MCP server to inspect and exercise a local
AI gateway without provider credentials. This skill file provides operating
guidance; it does not install the server or change Codex configuration by
itself. The official Codex plugin bundles the MCP definition, while skill-only
installations require the manual setup below.

## Prerequisites And Setup

1. Confirm that Codex CLI and Docker are installed and Docker is running.
2. If the eight tools are already visible, skip setup and do not register a
   duplicate server.
3. Explain the first stage: it downloads the reviewed immutable image into the
   Docker cache and inspects metadata without starting a container. Obtain
   explicit user approval for this download and inspection only.
4. After that first approval, pull and inspect the exact multi-platform digest:

```bash
docker pull ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:22efd2f6b04926a03a8d5b96d840192570da0b4557f5c754b3e9b7157ddbaa05
docker image inspect ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:22efd2f6b04926a03a8d5b96d840192570da0b4557f5c754b3e9b7157ddbaa05 --format 'Digests={{json .RepoDigests}} User={{json .Config.User}} Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}} Labels={{json .Config.Labels}}'
```

5. Report the inspection before proceeding. Require the exact digest above;
   source `https://github.com/happy520ai/unified-ai-system`; revision
   `541430d68fac6b35c512ea7d2df20fe45334e0a5`; version `0.3.2`; license
   `Apache-2.0`; entrypoint `docker-entrypoint.sh`; and command
   `node packages/mcp-server/src/index.js`. Also report `Config.User`;
   this release leaves it empty and therefore uses the image's default root
   user. Stop on any mismatch.
6. Explain the second stage: it persists a Codex MCP configuration and permits
   Codex to launch the inspected image in a later task. Obtain a separate
   explicit approval for registration and activation; the download approval
   does not carry over.
7. After that second approval, register the digest with network pulling
   disabled, then inspect the stored configuration:

```bash
codex mcp add unified-ai-system -- docker run --rm -i --pull never ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:22efd2f6b04926a03a8d5b96d840192570da0b4557f5c754b3e9b7157ddbaa05
codex mcp get unified-ai-system --json
```

8. Restart Codex or open a new task, then use `/mcp verbose` to confirm that all
   eight tools are available. Remove the registration when it is no longer
   wanted:

```bash
codex mcp remove unified-ai-system
```

Removing the registration does not remove the pulled image from Docker's
cache. Treat image-cache deletion as a separate host-state change and obtain
approval before doing it.

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
   task. If they are absent, follow the approved setup above and wait for a
   restarted or new task.
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
- Treat MCP registration, image pulls, container creation, networking, and
  teardown as host-state changes that require informed user approval.
- Never substitute a mutable tag for the reviewed digest. Keep download and
  inspection approval separate from registration and activation approval.
- Keep `--pull never` in the registered command. If the reviewed image is
  absent from the local cache, fail closed and return to the first approval
  stage.
- Do not claim production readiness, L5 autonomy, or AGI from a healthy handshake.
- Treat a zero exit code as transport evidence, not proof that readiness gates
  passed.

## Limitations

- This skill file does not bundle the MCP server, Docker image, or Codex
  configuration. It only operates tools supplied by the separately installed
  official integration.
- It does not deploy, benchmark, or certify the gateway for production use.
- The credential-free chat tool proves only the deterministic local fake path.
- It does not configure real providers or handle provider credentials.
- The published MCP image requires Docker.
- The reviewed `0.3.2` image runs as the container's default root user and
  remains in Docker's cache after the Codex registration is removed.
- Existing Codex tasks may not hot-load a newly installed MCP configuration.

## Troubleshooting

- If the tools are missing after approved registration, inspect
  `codex mcp get unified-ai-system --json`, then restart Codex or start a new
  task.
- If readiness is blocked, report the returned blocker instead of retrying chat
  blindly.
- If the runtime might use a real provider, stop before chat and keep the
  session read-only.

## Additional Resources

- [Unified AI System](https://github.com/happy520ai/unified-ai-system)
- [60-second Codex MCP quickstart](https://github.com/happy520ai/unified-ai-system/blob/master/docs/codex-mcp-quickstart.md)
- [MCP server guide](https://github.com/happy520ai/unified-ai-system/blob/master/packages/mcp-server/README.md)
