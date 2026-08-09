---
name: unified-ai-gateway
description: Operate and evaluate Unified AI System through nine governed MCP tools, including provider-free prompt enhancement, while preserving fake-provider, authorization, and evidence boundaries.
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

## Version Note

The current public project release is `v0.4.3`. The inspection procedure below
intentionally pins the reviewed, immutable `v0.4.0` image and its recorded
digests; those values are a historical security baseline and must not be
silently replaced with a mutable tag. For a normal provider-free demo, use the
current `v0.4.3` command in the [project README](https://github.com/happy520ai/unified-ai-system#try-it-in-60-seconds).
A new content review is required before changing this pinned procedure.

## Prerequisites And Setup

1. Confirm that Codex CLI and Docker are installed and Docker is running.
2. If the nine tools are already visible, skip setup and do not register a
   duplicate server.
3. Explain the first stage: it downloads one reviewed platform from the
   immutable `0.4.0` multi-platform index into Docker's cache, inspects its
   metadata and layer history, creates but never starts a temporary container,
   exports its root filesystem, removes that temporary container, and writes an
   inspection inventory to a temporary directory. The reviewed platforms are
   linux/amd64 and linux/arm64. Obtain explicit user approval for those download
   and inspection changes only.
4. After that first approval, pull the reviewed platform manifest and complete
   the inspection. Do not execute the image or register it yet:

```bash
IMAGE='ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:c185d124d1f672b5cf210a7b7d4c7dbdc907b81a5f7b62fe312a0dc18839e045'
PLATFORM='linux/amd64' # Use linux/arm64 only on a reviewed ARM64 engine.
REVIEW_DIR="$(mktemp -d)"

docker pull --platform "$PLATFORM" "$IMAGE"
docker image inspect "$IMAGE" --format 'Id={{.Id}} OS={{.Os}} Architecture={{.Architecture}} User={{json .Config.User}} Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}} Labels={{json .Config.Labels}}'
docker image history --no-trunc "$IMAGE" > "$REVIEW_DIR/image-history.txt"

REVIEW_CONTAINER="$(docker create --platform "$PLATFORM" --pull never --entrypoint /bin/true "$IMAGE")"
docker export --output "$REVIEW_DIR/rootfs.tar" "$REVIEW_CONTAINER"
docker rm "$REVIEW_CONTAINER"

tar -tf "$REVIEW_DIR/rootfs.tar" > "$REVIEW_DIR/rootfs-files.txt"
mkdir -p "$REVIEW_DIR/rootfs"
tar --same-permissions -xf "$REVIEW_DIR/rootfs.tar" -C "$REVIEW_DIR/rootfs"
find "$REVIEW_DIR/rootfs/app" -type f -print > "$REVIEW_DIR/app-files.txt"
: > "$REVIEW_DIR/app-links.txt"
while IFS= read -r -d '' APP_LINK; do
  ls -ld -- "$APP_LINK" >> "$REVIEW_DIR/app-links.txt"
done < <(find "$REVIEW_DIR/rootfs/app" \( -type l -o -type f -links +1 \) -print0)
: > "$REVIEW_DIR/native-binaries.sha256"
while IFS= read -r -d '' NATIVE_BINARY; do
  sha256sum -- "$NATIVE_BINARY" >> "$REVIEW_DIR/native-binaries.sha256"
done < <(find "$REVIEW_DIR/rootfs/app" -type f -name '*.node' -print0)
find "$REVIEW_DIR/rootfs" -type f \( -perm -0100 -o -perm -0010 -o -perm -0001 \) -print > "$REVIEW_DIR/executable-files.txt"
find "$REVIEW_DIR/rootfs" -type f \( -perm -4000 -o -perm -2000 \) -print > "$REVIEW_DIR/suid-sgid-files.txt"
find "$REVIEW_DIR/rootfs/app" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o -path '*/.ssh/id_*' \) -print > "$REVIEW_DIR/credential-like-files.txt"
find "$REVIEW_DIR/rootfs/app" -type f -name 'package.json' \
  -exec grep -nHE '"(preinstall|install|postinstall|prepare|prepack|postpack)"' -- {} + \
  > "$REVIEW_DIR/lifecycle-hooks.txt"
find \
  "$REVIEW_DIR/rootfs/app/packages/mcp-server/src" \
  "$REVIEW_DIR/rootfs/app/packages/shared-sdk/src" \
  -type f \
  -exec grep -nHE 'child_process|spawn\(|fetch\(|AI_GATEWAY_MCP_URL|process\.env|writeFile|appendFile|unlink|rm\(' -- {} + \
  > "$REVIEW_DIR/runtime-sensitive-code.txt"
```

If `sha256sum` is unavailable, use the platform's SHA-256 utility and preserve
the same report. Keep the review directory until the report is accepted; its
deletion is another filesystem change and requires approval for the exact path.

5. Read every generated inventory and report the inspection before proceeding.
   Compare it with the versioned
   [image content review](https://github.com/happy520ai/unified-ai-system/blob/4bbc5e81d1f372a5c80ba5597973f3284965adf6/docs/security/mcp-image-review-0.4.0.md).
   Require OCI index digest
   `sha256:c185d124d1f672b5cf210a7b7d4c7dbdc907b81a5f7b62fe312a0dc18839e045`.
   For linux/amd64, require manifest digest
   `sha256:bb3ba00366a924d511c776986f890d62196ecc380034daf9c42f54000dcc7f2d`
   and config digest
   `sha256:3224ec32c8a1407ba704febf897157866f6cabf86fb515d760b0466fe64c9df1`.
   For linux/arm64, require manifest digest
   `sha256:2a58da07d11de97a4b4051f4a82ac444e7fefb5235556d7997080c96db2da6ae`
   and config digest
   `sha256:1e480c2b6711283f9571079d96c73f5dfc423a30d86c22d05c0dfd052113a9b7`.
   Require source `https://github.com/happy520ai/unified-ai-system`, revision
   `9f606b0b4189ef9759bdc01857919c254209e4be`, version `0.4.0`, license
   `Apache-2.0`, entrypoint `docker-entrypoint.sh`, and command
   `node packages/mcp-server/src/index.js`.

   Report these reviewed risks explicitly: the image uses the default root
   user; includes Debian shell/package utilities and 11 base-image SUID/SGID
   files; contains 519 internal pnpm links, two native Node binaries, and eight
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
IMAGE='ghcr.io/happy520ai/unified-ai-system/mcp-server@sha256:c185d124d1f672b5cf210a7b7d4c7dbdc907b81a5f7b62fe312a0dc18839e045'
PLATFORM='linux/amd64' # Match the reviewed platform inspected above.
codex mcp add unified-ai-system -- docker run --rm -i --pull never --platform "$PLATFORM" --network none --cap-drop ALL --security-opt no-new-privileges "$IMAGE"
codex mcp get unified-ai-system --json
```

8. Restart Codex or open a new task, then use `/mcp verbose` to confirm that all
   nine tools are available. Remove the registration when it is no longer
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
- `gateway_prompt_enhance`: local prompt structuring without a provider call
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
- Never substitute a mutable tag, a different OCI index, or an unreviewed
  platform manifest for the reviewed `0.4.0` identities. Keep download and
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
- The reviewed `0.4.0` path covers linux/amd64 and linux/arm64. Do not activate
  another platform image without a separate content review.
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
- [MCP image content review](https://github.com/happy520ai/unified-ai-system/blob/4bbc5e81d1f372a5c80ba5597973f3284965adf6/docs/security/mcp-image-review-0.4.0.md)
