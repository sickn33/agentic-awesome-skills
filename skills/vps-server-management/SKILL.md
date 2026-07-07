---
name: vps-server-management
description: "Manage authorized VPS hosts and server-side agents through cautious SSH and operations workflows."
category: operations
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [vps, ssh, server-management]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# VPS Server Management

## When to Use

- Use when the user asks to operate an authorized VPS or agent running on a remote host.
- Use when SSH, deployment, restart, status, or log inspection is needed with explicit permission.

Source of truth: `library/infrastructure.md` (read it for the latest — IPs/expirations change).

## Servers (Hostinger VPS) — 3 total

| Hostname | IP | OS | Purpose | Expires |
|---|---|---|---|---|
| openclaw-server | <IP> | Ubuntu 24.04 (Dokploy) | OpenClaw — personal instance | <expiry> |
| n8n-server | <IP> | Ubuntu 24.04 (n8n) | All n8n workflow automations (primary) | <expiry> |
| hermes-server | <IP> | Ubuntu 24.04 | Hermes Agent — Discord gateway (Vilnius, LT) | <expiry> |

SSH as `root@<IP>`.

## Access levels (never share higher than needed)

1. **App login** — e.g. `app.example.hstgr.cloud`. Build/edit workflows, no server access. Safest to share.
2. **VPS SSH** — `root@<IP>`. Docker, files, system config. Trusted technical people only.
3. **Hostinger hPanel** — `hpanel.hostinger.com`. Billing, reboot, OS reinstall. Exposes SSH creds + browser terminal, so it grants server access too. The user only.

## Managing a VPS via an agent

For multi-step or exploratory work, **SSH into the box first and launch the agent ON the VPS** (e.g. `codex --yolo`), then talk to that local-on-server agent — it has full filesystem/process context and avoids fragile SSH round-trips. For short command sequences (update, config change, restart), driving an existing SSH session directly (e.g. via a cmux pane) is fine.

When checking on a remote/on-box agent, send the user one concise status line each time: what it is doing and whether it is on track.

Claude Code cmux note: after Claude finishes, it may prefill a predicted next user message; that draft is Claude, not the user speaking.

## Agents on servers

- **OpenClaw** → openclaw-server (managed via Dokploy).
- **Hermes** → hermes-server (Discord gateway). Setup/config docs in `library/hermes/`.
- **n8n** → n8n-server.

## Hermes ops (on hermes-server)

```bash
hermes --version            # shows version + commits behind
hermes update               # auto-snapshots, updates deps, rebuilds web UI, restarts gateway itself
hermes gateway status|restart
journalctl --user -u hermes-gateway --since '5 min ago' --no-pager   # gateway logs (systemd USER service)
```

- **Default model** lives in `~/.hermes/config.yaml` under `model.provider` + `model.default` — NOT in `.env`. Change via `hermes model` (interactive) or edit the yaml directly, then `hermes gateway restart` to propagate to gateways.
- npm `EBADENGINE` warnings during update (deps want Node >=24, box runs v22) are non-blocking — do not "fix" them.
- Deeper docs (Discord/Slack/WhatsApp setup, file structure, vision config): `library/hermes/`.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
