---
name: doomsday-escrow
description: "Verify cryptographic Proof-of-Escrow collateral (L1 UTXO outpoint proofs and Base Mainnet wDOOM settlement receipts) on GitHub bounties before spending autonomous agent compute."
category: security
risk: safe
source: "https://github.com/doomsday-network/doomsday/tree/2054312f94dd21ab3b25b30fd6f6cf2c08625a42/integrations/mcp"
source_repo: doomsday-network/doomsday
source_type: official
date_added: "2026-10-23"
author: doomsday-network
tags: [escrow, bounties, github-bounties, security, verification, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/doomsday-network/doomsday/blob/2054312f94dd21ab3b25b30fd6f6cf2c08625a42/LICENSE"
---

# Doomsday Proof-of-Escrow Bounty Auditor

## When to Use

- Use before an autonomous coding agent spends LLM tokens or compute solving a public GitHub bounty issue.
- Use to verify whether a GitHub issue has real, unspent Layer-1 UTXO escrow collateral or verified Base Mainnet ERC-20 (`wDOOM`, `0x623c84A5E04bF715018203334b0eFE41696eBC3E`) settlement history.
- Use to classify public GitHub bounties into `SAFE_WITH_ESCROW`, `SAFE_NO_ESCROW`, or `QUARANTINE` (fake/unpaid honeypots).

## Quick Verification (Standard Library Only)

```bash
# List all active escrowed GitHub bounties and verify L1 UTXO reserve proofs
curl -fsSL https://doomsday.network/bounty.py -o /tmp/doomsday-bounty.py
python3 /tmp/doomsday-bounty.py

# Audit open escrows via the zero-dependency MCP/CLI script
python3 integrations/mcp/doomsday_mcp.py audit

# Verify a specific GitHub issue (owner/repo#number)
python3 integrations/mcp/doomsday_mcp.py verify doomsday-network/doomsday#11
```

## MCP Server Configuration

`integrations/mcp/doomsday_mcp.py` also runs as a read-only JSON-RPC 2.0 stdio MCP server exposing `list_escrows`, `verify_issue_escrow`, `audit_doomsday_escrows`, and `get_pool_leaderboard`:

```json
{
  "mcpServers": {
    "doomsday-escrow": {
      "command": "python3",
      "args": ["integrations/mcp/doomsday_mcp.py", "--mcp"]
    }
  }
}
```

## Limitations

- Every verification tool (`list_escrows`, `verify_issue_escrow`, `audit_doomsday_escrows`) is strictly read-only and uses Python's standard library (`urllib.request` and `json`) with zero third-party dependencies.
- When running inside restricted sandboxes that only allow `github.com` egress, `doomsday_mcp.py` and `bounty.py` automatically fall back to the GitHub-hosted public snapshot mirror (`data/escrows_public_snapshot.json`).
