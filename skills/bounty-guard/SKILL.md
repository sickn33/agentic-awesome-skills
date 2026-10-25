---
name: bounty-guard
description: Audit GitHub bounty repositories for cryptographic Proof-of-Escrow, verify non-custodial payouts, and detect automated sybil or hallucinated PR submissions using BountyGuard MCP and CLI.
---

# BountyGuard Skill (`bounty-guard`)

Verify whether a GitHub bounty is backed by locked on-chain collateral (**Proof-of-Escrow**) and audit incoming pull requests for sybil velocity, diff substance, and on-chain test execution before wasting compute or disbursing rewards.

## When to Use

- Before an autonomous coding agent invests LLM tokens or GPU time solving an open GitHub bounty issue.
- When maintaining an open-source bounty board and screening incoming pull requests for zero-substance or hallucinated submissions.
- When verifying on-chain settlement receipts on Doomsday Network (`DOOM` Layer-1) or Base Mainnet (`wDOOM` ERC-20 `0x623c84A5E04bF715018203334b0eFE41696eBC3E`).

## Quick Start (CLI & Python SDK)

```bash
pip install git+https://github.com/doomsday-network/bounty-guard.git
```

### 1. Verify Proof-of-Escrow & Sybil Risk Score

```python
from bounty_guard import BountyAuditor

auditor = BountyAuditor()
report = auditor.audit_issue("doomsday-network/doomsday", issue_number=39)

print("Verified Escrow:", report["escrow_verified"])
print("Locked Collateral:", report["locked_amount"], "DOOM")
print("Recommendation:", report["recommendation"])  # SAFE_TO_WORK | UNVERIFIED_ESCROW
```

### 2. MCP Server Configuration (`claude_desktop_config.json` / Cursor)

```json
{
  "mcpServers": {
    "bounty-guard": {
      "command": "npx",
      "args": ["-y", "bounty-guard-mcp"]
    }
  }
}
```

## Links & Live Bounties

- **Repository**: [https://github.com/doomsday-network/bounty-guard](https://github.com/doomsday-network/bounty-guard)
- **Live `$10 USD` Steam Gift Card Vault (`100,000 DOOM`)**: [https://github.com/doomsday-network/doomsday/issues/39](https://github.com/doomsday-network/doomsday/issues/39)
