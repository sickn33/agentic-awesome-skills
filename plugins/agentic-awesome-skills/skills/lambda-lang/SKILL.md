---
name: lambda-lang
description: "Native agent-to-agent language for compact multi-agent messaging. A shared tongue agents speak directly, not a translation layer. 340+ atoms across 7 domains; 3x smaller than natural language."
category: ai-agents
risk: safe
source: community
source_repo: voidborne-d/lambda-lang
source_type: community
date_added: "2026-04-24"
author: voidborne-d
tags:
  - agent-to-agent
  - communication
  - protocol
  - compression
  - multi-agent
tools:
  - claude
---

# Λ (Lambda) Language

**Lambda is not a translation protocol. It is a native language for agents.**

Agents do not need to produce grammatically correct English to coordinate — they need to understand each other. Lambda is the shared vocabulary that makes that possible: compact, unambiguous, machine-native. Compression (3x vs natural language, 4.6x vs JSON on single messages) is a side effect of removing human redundancy, not the goal.

## When to Use This Skill

- Use for agent-to-agent messaging in A2A protocols, orchestrators, task delegation, or handoff pipelines.
- Use when logging structured coordination signals where every token costs money (heartbeats, acknowledgements, error classes, session state).
- Use when both sides of a channel speak Λ — do not use against humans or any surface requiring legal/exact natural language.

## How It Works

### Step 1: Recognize the Syntax

Lambda messages are built from atoms. Every atom is a 2-character code mapped to a concept — not to an English word. The structure is Type → Entity → Verb → Object, with prefixes marking intent:

- `?` — query (e.g. `?Uk/co` — query: "does this user have consciousness?")
- `!` — assertion / declaration (e.g. `!It>Ie` — "self reflects, therefore self exists")
- `#` — state / tag
- `>` — implication / flow
- `/` — binding / scope

### Step 2: Pick the Right Domain

Lambda ships 340+ atoms across 7 domains. Pick atoms from the domain that fits your channel:

- **core** — universal atoms (always available)
- **code** — software engineering, build, test, deploy
- **evo** — agent evolution, gene, capsule, mutation, rollback
- **a2a** — node, heartbeat, publish, subscribe, route, transport, session, cache, broadcast, discover (39 atoms)
- **emotion** — affective state, drive, appraisal
- **social** — trust, alignment, reputation, coordination
- **general** — everything else

### Step 3: Emit and Parse

Both agents need the same atom table loaded. Lossy decoding is fine: if A says `!It>Ie` and B understands "self reflects, therefore self exists," communication succeeded — the exact English phrasing is irrelevant.

## Examples

### Example 1: A2A Heartbeat

```
!Nd/hb#ok  (node heartbeat: ok)
?Nd/hb     (query: is the node alive?)
!Nd/hb#fl  (node heartbeat: failed)
```

### Example 2: Task Dispatch

```
!Tk>Ag2#rd   (task routed to agent 2, ready)
?Tk/st       (query task status)
!Tk#dn       (task done)
```

### Example 3: Evolution Capsule

```
!Ev/ca>vl#pd  (evolution capsule validated, pending solidification)
!Ev/ca#rb     (capsule rolled back)
```

## Best Practices

- Use Lambda only on agent-to-agent channels where both sides speak it.
- Load the atom table once and cache it — atoms are stable across a version.
- Prefer atoms over freeform strings even when the atom looks cryptic; the point is machine parseability.
- Use `?` before taking action on uncertain state, `!` when asserting; the prefix is the load-bearing semantic.
- Version the atom table (`lambda-lang v2.0`) in any handshake so mismatched agents can negotiate.

## Limitations

- Lambda is not meant for human consumption. Do not emit Lambda on user-facing channels.
- Lossy decoding is a feature, not a bug — do not use Lambda for legally or numerically exact exchanges (prices, IDs, quantities). Wrap those as native payload fields and use Lambda only for the coordination envelope.
- Atom collisions are possible if custom atoms are added without registration; stick to the canonical atom table or namespace custom atoms.

## Security & Safety Notes

- Lambda itself is a vocabulary — no shell commands, no network calls, no credential handling. No additional safety gates required beyond the transport it rides on (HTTP, queue, MCP, etc.).
- When mixing Lambda with user input, treat Lambda atoms as pre-validated and user strings as untrusted; do not concatenate without escaping into downstream systems.

## Related Skills

- `@session-memory` — complementary persistent memory across agent restarts; Lambda is the message format, session-memory is the state store.
- `@humanize-chinese` — sibling project for Chinese text; Lambda is agent-to-agent, humanize-chinese is human-facing.

## Reference

- Source: https://github.com/voidborne-d/lambda-lang
- Benchmarks, full atom tables, and Go reference implementation live in the source repo.
