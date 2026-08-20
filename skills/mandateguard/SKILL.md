---
name: mandateguard
description: "Deterministic, auditable payment policy for autonomous AI agents. Enforces budgets, allowlists, denylists, rate limits, and signed mandates before any money-moving tool executes - no LLM in the decision path."
category: security
risk: critical
source: community
source_repo: ezequiellich44-cmd/MandateGuard
source_type: community
date_added: "2026-08-19"
author: ezequiellich44-cmd
tags: [security, payments, agentic-commerce, policy, mcp, guardrails, wallet, x402, ap2, erc-8004]
tools: [claude, cursor, gemini, codex, copilot]
license: "MIT"
license_source: "https://github.com/ezequiellich44-cmd/MandateGuard/blob/main/LICENSE"
---

# MandateGuard Skill

## Overview

MandateGuard is a pre-action enforcement layer that wraps an AI agent's
payment tools. Every tool call that moves money is evaluated by a pure,
deterministic engine - budgets, allowlists, denylists, rate limits, and
signed mandates - before anything executes. No LLM is ever in the decision
path, so every verdict is reproducible and every ledger entry is verifiable.

It ships with an MCP server, so Claude, Cursor, or your own harness can mount
it as a guardrail in minutes. It targets OWASP LLM08 (Excessive Agency) and
implements the enforcement layer behind payment mandates like Google AP2,
Coinbase x402, and ERC-8004.

## When to Use This Skill

- Use when an agent has access to a wallet, payment tool, or any tool that
  moves value, and you want to constrain it.
- Use when you want deterministic, replayable authorization decisions
  (same inputs + same policy state = same verdict) instead of LLM-judged approval.
- Use when you need an audit trail for every money-moving tool call.
- Use when you need signed, short-lived, nonce-bound mandates so an agent
  cannot widen its own scope.

## How It Works

### Step 1: Define the Policy

```python
from mandateguard import Intent, Policy, PolicyEngine, Scope

policy = Policy(
    scopes={
        "wallet-agent": Scope(
            tools=("pay",),
            destinations=("0xGOOD",),
            max_amount=1000,          # per call
            currency="usd",
            max_calls_per_window=5,
        )
    },
    global_max_amount=2000,           # per actor
    allowlist=("0xGOOD",),
    denylist=("0xSCAM",),
)
engine = PolicyEngine(policy)
```

### Step 2: Authorize Every Intent

```python
decision = engine.authorize(
    Intent(tool="pay", destination="0xGOOD", amount=800, actor="wallet-agent")
)
print(decision.status)   # DecisionStatus.APPROVED
```

Denied calls are blocked with structured reasons. State (spend/rate) commits
only on approval, so replays of the same intent under the same policy state
are deterministic.

### Step 3: Mount as an MCP Guardrail (Wraps Payment Tools)

MandateGuard wraps/proxies the agent's payment tools. The agent calls the
guarded `pay` tool, which evaluates policy before any money-moving tool executes.

```bash
# Install the package from the published source
python -m pip install -e "git+https://github.com/ezequiellich44-cmd/MandateGuard.git#egg=mandateguard[mcp]"

# Run the MCP server (stdio)
mandateguard-mcp
```

For Claude Code, add the MCP server:

```bash
claude mcp add mandateguard -- mandateguard-mcp
```

MandateGuard is published on the official MCP Registry
(`io.github.ezequiellich44-cmd/mandateguard`), so MCP-aware clients can
install it directly without any Python step.

## Examples

### Example 1: Block an Out-of-Policy Payment

```python
denied = engine.authorize(
    Intent(tool="pay", destination="0xSCAM", amount=9999, actor="wallet-agent")
)
assert denied.status == DecisionStatus.DENIED  # denylist hit
```

### Example 2: Issue a Signed Mandate (Short-Lived)

```python
from mandateguard import Mandate, MandateSigner, verify_mandate
from datetime import datetime, timedelta, timezone

issuer = MandateSigner()
now = datetime.now(timezone.utc)
m = Mandate(
    actor="wallet-agent",
    max_amount=500,
    currency="usd",
    tools=("pay",),
    destinations=("0xGOOD",),
    not_before=now,
    not_after=now + timedelta(hours=1),  # short-lived: 1 hour
    nonce="abc",
    issuer="you"
)
sig = issuer.sign(m)
verify_mandate(issuer.public_key_bytes, m, sig)   # True
```

## Best Practices

- Define per-actor scopes with the smallest `tools`, `destinations`, and
  `max_amount` that the task requires.
- Keep a global budget cap as a backstop beyond per-call limits.
- Use signed mandates for short-lived authorizations; never let the agent
  widen its own scope.
- Treat the append-only SHA-256 ledger as the audit source of truth and run
  linear scans to detect tampering.
- Mount MandateGuard as an MCP guardrail so every money-moving tool call goes
  through the policy engine.

## Limitations

- MandateGuard enforces the policy you define; it does not decide what the
  policy should be. Scope and limits must be set by the operator.
- It cannot detect an intent that is mis-described by the agent. Pair it with
  tool-level destination validation and human review for high-value calls.
- The core rules use the stdlib only; `cryptography` is required only for
  signed mandate issuance and verification.
- Replay determinism holds only when the same intent is evaluated against the
  same policy state (budgets, rate windows, ledger). If policy state changes
  (budgets consumed, rate windows shifted), the same intent may yield a different decision.

## Security & Safety Notes

- Only operator-defined actors, destinations, and amounts are authorized;
  anything outside scope is denied with a structured reason.
- This skill includes shell commands for installing the package and adding
  the MCP server. Review any token or wallet destinations before use and only
  run in environments where you control the policy.
- For deliberate high-risk examples (crypto destinations, large amounts),
  validate destinations independently before authorizing real value movement.

## Common Pitfalls

- **Problem:** Agent widens its own budget by editing the policy at runtime.
  **Solution:** Gate policy mutation behind operator-only MCP tools and use
  signed, nonce-bound mandates so the agent cannot escalate its own scope.
- **Problem:** Replay of a call produces a different decision after policy state changes.
  **Solution:** State commits only on approval; keep `authorize` calls
  idempotent by policy so replays are deterministic under the same state.
- **Problem:** Believing the agent cannot misdescribe intent.
  **Solution:** Treat MandateGuard as an enforcement backstop, not a
  substitute for tool-level validation and human approval on high-value calls.

## Related Skills

- `security-and-hardening` - General hardening for agent code and integrations.
- `secrets-management` - Secure handling of API keys and credentials around
  agent tools and wallets.
- `tool-use-guardian` - Reliability wrapper that pairs well with a policy
  enforcement layer.