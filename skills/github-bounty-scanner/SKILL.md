---
name: github-bounty-scanner
description: "Scan open GitHub bounty issues and rank opportunities by Proof-of-Escrow collateral, maintainer responsiveness, and competition density."
category: security
risk: safe
source: "https://github.com/doomsday-network/github-bounty-scanner/tree/b12b1c8d64240043119a26aae5cbf5dcf60d7b1a"
source_repo: doomsday-network/github-bounty-scanner
source_type: official
date_added: "2026-10-24"
author: doomsday-network
tags: [github, bounties, scanner, escrow, mcp, security]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/doomsday-network/github-bounty-scanner/blob/b12b1c8d64240043119a26aae5cbf5dcf60d7b1a/LICENSE"
---

# GitHub Bounty Scanner and Escrow Verifier

Use this skill to discover open GitHub bounty issues and rank them by verifiable on-chain Proof-of-Escrow collateral, maintainer merge velocity, and competing pull request volume.

## When to Use

- Use when searching GitHub for open coding bounties backed by verifiable crypto or token escrow.
- Use when filtering out unbacked, abandoned, or heavily crowded bounty issues before investing agent compute.
- Use when generating a structured JSON or Markdown triage report of live GitHub bounties.

## Runtime prerequisite

The upstream scanner is MIT-licensed at commit `b12b1c8d64240043119a26aae5cbf5dcf60d7b1a`. It performs read-only queries against the GitHub REST API and public blockchain RPC endpoints. Always verify escrow contract balances independently before committing significant engineering or compute resources.

## Scan GitHub bounties (CLI)

```bash
pip install "git+https://github.com/doomsday-network/github-bounty-scanner.git@b12b1c8d64240043119a26aae5cbf5dcf60d7b1a"
bounty-scanner --query "label:bounty state:open" --verify-escrow
```

## Python SDK usage

```python
from bounty_scanner import scan_bounties

results = scan_bounties(limit=10, verify_escrow=True)
for item in results:
    print(item["repo"], item["issue_url"], item["escrow_status"])
```

## Examples

### Rank open bounties by escrow verification

Run a read-only search across open GitHub issues carrying bounty labels, inspect each issue for a verifiable on-chain escrow address or transaction hash, and prioritize issues with confirmed collateral and zero competing pull requests.

### Export a pre-flight triage table

Generate a Markdown table summarizing candidate issues, required languages, competing PR counts, and escrow verification states for human review before starting implementation.

## Limitations

- Unauthenticated GitHub API requests are subject to strict rate limits; pass a read-only `GITHUB_TOKEN` when scanning large result sets.
- Escrow verification confirms that funds exist at a referenced address or contract, but cannot guarantee subjective maintainer approval of a pull request.

## References

- [Pinned GitHub Bounty Scanner source](https://github.com/doomsday-network/github-bounty-scanner/tree/b12b1c8d64240043119a26aae5cbf5dcf60d7b1a)
- [MIT License](https://github.com/doomsday-network/github-bounty-scanner/blob/b12b1c8d64240043119a26aae5cbf5dcf60d7b1a/LICENSE)
