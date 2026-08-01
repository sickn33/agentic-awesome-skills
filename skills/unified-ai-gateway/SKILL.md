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
3. Explain the first stage: it downloads the reviewed immutable linux/amd64
   image into Docker's cache, inspects its metadata and layer history, creates
   but never starts a temporary container, exports its root filesystem, removes
   that temporary container, and writes an inspection inventory to a temporary
   directory. Obtain explicit user approval for those download and inspection
   changes only.
4. After that first approval, pull the reviewed platform manifest and complete
   the inspection. Do not execute the image or register it yet:

```bash
IMAGE='ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:cc17e923335f953631f59fb6a5ffcdce0e12e16c5abf362f1d28747452adadee'
PLATFORM='linux/amd64'
REVIEW_DIR="$(mktemp -d)"

docker pull --platform "$PLATFORM" "$IMAGE"
docker image inspect "$IMAGE" --format 'Id={{.Id}} OS={{.Os}} Architecture={{.Architecture}} User={{json .Config.User}} Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}} Labels={{json .Config.Labels}}'
docker image history --no-trunc "$IMAGE" > "$REVIEW_DIR/image-history.txt"

REVIEW_CONTAINER="$(docker create --platform "$PLATFORM" --pull never --entrypoint /bin/true "$IMAGE")"
docker export --output "$REVIEW_DIR/rootfs.tar" "$REVIEW_CONTAINER"
docker rm "$REVIEW_CONTAINER"

tar -tf "$REVIEW_DIR/rootfs.tar" > "$REVIEW_DIR/rootfs-files.txt"
mkdir -p "$REVIEW_DIR/rootfs"
tar -xf "$REVIEW_DIR/rootfs.tar" -C "$REVIEW_DIR/rootfs"
find "$REVIEW_DIR/rootfs/app" -type f -print > "$REVIEW_DIR/app-files.txt"
find "$REVIEW_DIR/rootfs/app" \( -type l -o -type f -links +1 \) -exec ls -ld {} + > "$REVIEW_DIR/app-links.txt"
find "$REVIEW_DIR/rootfs/app" -type f -name '*.node' -exec sha256sum {} + > "$REVIEW_DIR/native-binaries.sha256"
find "$REVIEW_DIR/rootfs" -type f -perm -111 -print > "$REVIEW_DIR/executable-files.txt"
find "$REVIEW_DIR/rootfs" -type f \( -perm -4000 -o -perm -2000 \) -print > "$REVIEW_DIR/suid-sgid-files.txt"
find "$REVIEW_DIR/rootfs/app" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o -name 'id_rsa*' \) -print > "$REVIEW_DIR/credential-like-files.txt"
find "$REVIEW_DIR/rootfs/app" -type f -name package.json -exec grep -nHE '"(preinstall|install|postinstall|prepare|prepack|postpack)"' {} + > "$REVIEW_DIR/lifecycle-hooks.txt"
grep -RInE 'child_process|spawn\(|fetch\(|AI_GATEWAY_MCP_URL|process\.env|writeFile|appendFile|unlink|rm\(' "$REVIEW_DIR/rootfs/app/packages/mcp-server/src" "$REVIEW_DIR/rootfs/app/packages/shared-sdk/src" > "$REVIEW_DIR/runtime-sensitive-code.txt"
```

If `sha256sum` is unavailable, use the platform's SHA-256 utility and preserve
the same report. Keep the review directory until the report is accepted; its
deletion is another filesystem change and requires approval for the exact path.

5. Read every generated inventory and report the inspection before proceeding.
   Compare it with the versioned
   [image content review](https://github.com/happy520ai/unified-ai-system/blob/e1646b5455f4ece87f15e7f85509d47fcd75b8e7/docs/security/mcp-image-review-0.3.2.md).
   Require linux/amd64 manifest digest
   `sha256:cc17e923335f953631f59fb6a5ffcdce0e12e16c5abf362f1d28747452adadee`,
   config digest
   `sha256:c28166511ca9d95ab6f4c0c8ac0cbc2acbbfdac20f971d074ff6744d39e0248f`,
   source `https://github.com/happy520ai/unified-ai-system`, revision
   `541430d68fac6b35c512ea7d2df20fe45334e0a5`, version `0.3.2`, license
   `Apache-2.0`, entrypoint `docker-entrypoint.sh`, and command
   `node packages/mcp-server/src/index.js`.

   Report these reviewed risks explicitly: the image uses the default root
   user; includes Debian shell/package utilities and 11 base-image SUID/SGID
   files; contains 549 internal pnpm links, two native Node binaries, and eight
   lifecycle-hook declarations; and starts a child gateway with loopback HTTP.
   The optional `AI_GATEWAY_MCP_URL` can make an HTTP or HTTPS connection only
   when explicitly passed. The registered command below passes no host files,
   environment variables, or ports and disables container networking. Stop on
   any mismatch, unexpected link, credential-like file, native binary, hook,
   privileged file, or sensitive-code behavior.
6. Explain the second stage: it persists a Codex MCP configuration and permits
   Codex to launch the inspected image in a later task. Obtain a separate
   explicit approval for registration and activation; the download approval
   does not carry over.
7. After that second approval, register the reviewed platform digest with
   pulling, container networking, Linux capabilities, and privilege escalation
   disabled, then inspect the stored configuration:

```bash
codex mcp add unified-ai-system -- docker run --rm -i --pull never --platform linux/amd64 --network none --cap-drop ALL --security-opt no-new-privileges ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:cc17e923335f953631f59fb6a5ffcdce0e12e16c5abf362f1d28747452adadee
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
- Never substitute a mutable tag, the multi-platform index, or an unreviewed
  platform manifest for the reviewed linux/amd64 digest. Keep download and
  inspection approval separate from registration and activation approval.
- Keep `--pull never` in the registered command. If the reviewed image is
  absent from the local cache, fail closed and return to the first approval
  stage.
- Keep `--network none`, `--cap-drop ALL`, and
  `--security-opt no-new-privileges` in the registered command.
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
- The reviewed `0.3.2` path is limited to linux/amd64. Do not activate an arm64
  or other platform image without a separate content review.
- The image runs as the container's default root user and bundles the gateway
  source, package-manager tooling, native dependencies, and base-image
  SUID/SGID files. The registered command drops capabilities, prevents new
  privileges, disables networking, and leaves the image in Docker's cache.
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
- [MCP image content review](https://github.com/happy520ai/unified-ai-system/blob/e1646b5455f4ece87f15e7f85509d47fcd75b8e7/docs/security/mcp-image-review-0.3.2.md)
