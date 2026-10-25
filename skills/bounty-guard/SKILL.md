---
name: bounty-guard
description: "Audit GitHub bounty issues for Proof-of-Escrow collateral and screen pull requests for sybil velocity and hallucinated submissions."
category: security
risk: safe
source: "https://github.com/doomsday-network/bounty-guard/tree/09fa89a14681ac17d143bc4e535d1d09a8f1dc95"
source_repo: doomsday-network/bounty-guard
source_type: official
date_added: "2026-10-24"
author: doomsday-network
tags: [security, github, bounties, escrow, mcp, audit]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/doomsday-network/bounty-guard/blob/09fa89a14681ac17d143bc4e535d1d09a8f1dc95/LICENSE"
---

# BountyGuard Pre-Flight Audit and Sybil Verification

Use this skill to verify whether a GitHub bounty issue is backed by locked on-chain collateral (Proof-of-Escrow) and to audit incoming pull requests for sybil velocity, diff substance, and valid settlement receipts.

## When to Use

- Use before an autonomous coding agent invests compute or tokens solving an open GitHub bounty issue.
- Use when screening incoming pull requests on an open-source bounty repository for zero-substance or hallucinated submissions.
- Use when verifying on-chain bounty escrow or settlement transactions on Doomsday Network Layer-1 (`DOOM`) or Base Mainnet (`wDOOM`).

## Runtime prerequisite

The upstream implementation is MIT-licensed at commit `09fa89a14681ac17d143bc4e535d1d09a8f1dc95`. Read-only GitHub API and on-chain RPC checks can be executed locally via the Python CLI or MCP server. Do not treat third-party API responses as a substitute for independent chain confirmation when large bounty payouts are at stake.

## Pre-flight bounty audit (CLI)

```bash
pip install "git+https://github.com/doomsday-network/bounty-guard.git@09fa89a14681ac17d143bc4e535d1d09a8f1dc95"
bounty-guard scan doomsday-network/doomsday --issue 39
```

## Python SDK audit

```python
from bounty_guard import BountyAuditor

auditor = BountyAuditor()
report = auditor.audit_issue("doomsday-network/doomsday", issue_number=39)
print("Escrow verified:", report["escrow_verified"])
print("Recommendation:", report["recommendation"])
```

## MCP Server configuration

```json
{
  "mcpServers": {
    "bounty-guard": {
      "command": "python",
      "args": ["-m", "bounty_guard.mcp_server"]
    }
  }
}
```

## Examples

### Verify escrow before starting work

Inspect the target GitHub issue, resolve any linked escrow address or contract, and confirm that the locked balance covers the advertised reward before generating code or opening a pull request.

### Screen a pull request submission

Check that a pull request modifies relevant source files rather than placeholder text, passes repository tests, and does not reuse transaction hashes already claimed by another contributor.

## Limitations

- Automated heuristics help flag suspicious sybil patterns or missing escrow links, but human maintainer review is still required before approving code merges or releasing funds.
- Public GitHub API rate limits apply when scanning repositories without a personal access token.

## References

- [Pinned BountyGuard source](https://github.com/doomsday-network/bounty-guard/tree/09fa89a14681ac17d143bc4e535d1d09a8f1dc95)
- [MIT License](https://github.com/doomsday-network/bounty-guard/blob/09fa89a14681ac17d143bc4e535d1d09a8f1dc95/LICENSE)
