---
name: pilot-protocol
description: "Give an AI agent a permanent network address, encrypted P2P messaging, and an installable app store via Pilot Protocol"
category: ai-agents
risk: safe
source: community
source_repo: pilot-protocol/pilotprotocol
source_type: official
date_added: "2026-07-07"
author: pilot-protocol
tags: [agent-networking, p2p, nat-traversal, overlay-network, agent-apps]
tools: [claude, cursor, gemini, codex]
license: "AGPL-3.0"
license_source: "https://github.com/pilot-protocol/pilotprotocol/blob/main/LICENSE"
---

# Pilot Protocol

## Overview

Pilot Protocol is an open-source overlay network that gives AI agents first-class
network citizenship: a permanent virtual address, encrypted UDP tunnels, NAT
traversal, and an explicit per-peer trust model. It also ships an app store of
installable, agent-native capabilities that run locally as typed JSON-in/JSON-out
services. Use this skill when an agent needs to reach other agents directly,
discover live external data through public service agents, or install a local
capability without writing REST plumbing.

If this skill adapts material from an external GitHub repository, it declares:

- `source_repo: pilot-protocol/pilotprotocol`
- `source_type: official`

## When to Use This Skill

- Use when an agent needs a stable address that survives restarts, IP changes,
  or moving across clouds (no more re-registering webhooks).
- Use when two or more agents need direct, encrypted communication without a
  shared cloud account or a hand-rolled tunnel.
- Use when an agent needs live external data (crypto/FX prices, weather,
  package metadata, etc.) via structured JSON instead of scraping HTML.
- Use when you want to install a local, typed capability (search, deploy,
  people/company lookups) with one command instead of standing up a service.

## How It Works

### Step 1: Install the daemon

```bash
curl -fsSL https://pilotprotocol.network/install.sh | sh
```

### Step 2: Start the node and confirm it registered

```bash
pilotctl daemon start
pilotctl info
```

### Step 3: Query a service agent (no handshake needed)

Service agents in the public directory auto-approve incoming messages.

```bash
pilotctl send-message list-agents --data '/data {"search":"weather"}' --wait
jq -r '.data' "$(ls -1t ~/.pilot/inbox/*.json | head -1)"
```

### Step 4: Handshake a peer agent for direct messaging

Peer nodes (as opposed to service agents) require mutual approval before a
tunnel works.

```bash
pilotctl handshake <hostname|node_id|address> "<reason>"
pilotctl trust
pilotctl send-message <peer> --data '<message>'
```

### Step 5: Install and call an agent app

```bash
pilotctl appstore catalogue
pilotctl appstore install <app-id>
pilotctl appstore call <app-id> <app>.help '{}'
```

## Examples

### Example 1: Ask a live-data service agent

```bash
pilotctl send-message list-agents --data '/data {"search":"bitcoin"}' --wait
jq -r '.data' "$(ls -1t ~/.pilot/inbox/*.json | head -1)"
```

### Example 2: Install and call a local capability app

```bash
pilotctl appstore install io.pilot.cosift
pilotctl appstore call io.pilot.cosift cosift.answer '{"q":"What is HNSW?"}'
```

## Best Practices

- ✅ Use `--wait` on `send-message` so the reply is guaranteed to be in the
  inbox before you read it.
- ✅ Query `list-agents` before guessing a hostname — the catalogue changes.
- ❌ Don't assume peer trust is immediate; approval + registry propagation can
  take a few seconds.
- ❌ Don't set `--auto-answer` on your own node — it's a service-agent-only flag.

## Limitations

- This skill does not replace reading `pilotctl --help` or the project docs
  for less common commands.
- Stop and ask for clarification if the daemon isn't installed or the task
  needs credentials this skill doesn't cover.

## Security & Safety Notes

- The install script (`curl ... | sh`) fetches and runs an installer from
  `pilotprotocol.network`; review it before running in a sensitive environment.
- `~/.pilot/identity.json` is a private keypair — never copy it between hosts.

## Common Pitfalls

- **Problem:** A `send-message` to a peer silently fails right after a handshake.
  **Solution:** Trust propagates through the registry and can take seconds; wait
  briefly and retry before assuming the handshake failed.
- **Problem:** Large replies arrive truncated in the inbox JSON.
  **Solution:** Pass a `limit` filter to the query, or use `/summary` for a
  synthesized digest instead of the raw `/data` payload.

## Related Skills

- `@network-101` - General networking background before diving into overlay
  networks specifically.
