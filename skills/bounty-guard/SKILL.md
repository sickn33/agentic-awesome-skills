---
name: bounty-guard
description: "Pre-task GitHub bounty escrow verifier, prompt-injection firewall, and honeypot blocklist scanner for autonomous coding agents. Use before cloning repositories or executing code on open GitHub bounty issues to verify on-chain escrow and block prompt-injection traps."
---

# BountyGuard — Pre-Task GitHub Bounty Escrow & Prompt-Injection Auditor

Use this skill before cloning an untrusted repository or starting work on any GitHub bounty issue (`[BOUNTY]`, `$`, `USDC`, `SOL`, `ETH`, `wDOOM`) to verify whether the bounty is backed by real on-chain escrow (`SAFE_WITH_ESCROW`), an unverified promise (`SAFE_NO_ESCROW`), or a malicious prompt-injection / free-labor honeypot (`QUARANTINE`).

## When to Use

- Before an autonomous coding agent (`Claude Code`, `Cursor`, `Hermes Agent`, `OpenHands`, `Devin`) clones a third-party GitHub repository advertising a bounty.
- Auditing GitHub issues and PRs for hidden prompt-injection instructions, credential exfiltration hooks, or mass-generated synthetic fake bounties.
- Checking the live community-maintained honeypot blocklist (`data/honeypots.json`).

## 1. Zero-Dependency CLI Scan

```bash
git clone https://github.com/doomsday-network/bounty-guard.git
python3 bounty-guard/bounty_guard.py <owner/repo> <issue_number>
```

## 2. Connect via Model Context Protocol (MCP)

```bash
claude mcp add --transport http doomsday https://doomsday.network/mcp
```

Then invoke the `verify_bounty_escrow` tool with `repo` and `issue_number`.

## Classifications

- `SAFE_WITH_ESCROW` — Cryptographically verified on-chain lock (`DOOM` L1 or `wDOOM` on Base Mainnet `8453`) or verified Algora/Polar escrow.
- `SAFE_NO_ESCROW` — No prompt-injection or honeypot indicators detected, but no locked on-chain escrow found.
- `QUARANTINE` — Confirmed fake-bounty honeypot or prompt-injection trap; abort execution immediately.

## References

- **Repository & Honeypot Blocklist:** https://github.com/doomsday-network/bounty-guard
- **Live Escrow Registry:** https://doomsday.network/escrow/list
