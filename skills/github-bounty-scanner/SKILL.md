---
name: github-bounty-scanner
description: "Batch GitHub bounty discovery and security scanner CLI & GitHub Action that scores open crypto/USD bounties for prompt-injection risk, honeypot signatures, and verifiable on-chain escrow."
---

# GitHub Bounty Scanner — Batch Bounty Discovery & Security Scoring Skill

Use this skill to scan multiple GitHub repositories or search queries for legitimate, verifiable open-source bounties while automatically filtering out fake-bounty honeypots and prompt-injection traps.

## Quickstart

```bash
git clone https://github.com/doomsday-network/github-bounty-scanner.git
python3 github-bounty-scanner/scan_bounties.py --repo doomsday-network/doomsday
```

## GitHub Action Integration

```yaml
- name: Audit Bounty Issue with GitHub Bounty Scanner
  uses: doomsday-network/github-bounty-scanner@main
  with:
    repo: ${{ github.repository }}
    issue_number: ${{ github.event.issue.number }}
```

## References

- **Repository:** https://github.com/doomsday-network/github-bounty-scanner
- **Companion Firewall:** https://github.com/doomsday-network/bounty-guard
