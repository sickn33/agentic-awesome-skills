---
name: ai-coding-agent-guardrails
description: Secure AI coding agents (Claude Code, Cursor, Codex, Copilot) with permission
  boundaries, secret protection, code review gates, and safe sandbox configurations
  for team environments.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# AI Coding Agent Guardrails

Secure the use of AI coding agents across engineering teams. This skill covers permission boundaries, secret protection, sandbox isolation, code review gates, and audit trails for Claude Code, Cursor, Copilot, and Codex.

---

## Permission Boundaries

### CLAUDE.md Configuration

Create a `CLAUDE.md` at the repository root to restrict Claude Code behavior:

```markdown
# CLAUDE.md

## Restrictions

- NEVER read or output contents of .env, .env.*, secrets.yaml, or any file matching *.pem, *.key
- NEVER execute `rm -rf`, `DROP TABLE`, `kubectl delete`, or `terraform destroy` commands
- NEVER push directly to main or master branches
- NEVER modify files in the infrastructure/, terraform/, or .github/workflows/ directories without explicit user approval
- NEVER install new dependencies without listing them first for review
- NEVER access or display API keys, tokens, passwords, or connection strings

## Allowed Operations

- Read and modify application source code in src/, lib/, and tests/
- Run test suites with `npm test`, `pytest`, `go test`
- Run linters with `eslint`, `ruff`, `golangci-lint`
- Create new branches with prefix `ai/` or `agent/`
- Create and modify files in docs/ directory

## Code Standards

- All new functions must include docstrings or JSDoc comments
- All new code must have corresponding unit tests
- Follow existing code style and patterns in the repository
- Maximum file length: 500 lines. Suggest splitting if exceeded.
```

### Command Allowlists

For agents that execute shell commands, define an explicit allowlist:

```yaml
# .agent-permissions.yaml
agent_permissions:
  allowed_commands:
    - "npm test"
    - "npm run lint"
    - "npm run build"
    - "pytest"
    - "ruff check"
    - "go test ./..."
    - "git status"
    - "git diff"
    - "git log"
    - "git checkout -b"
    - "git add"
    - "git commit"
    - "ls"
    - "cat"
    - "head"
    - "tail"

  blocked_commands:
    - "rm -rf"
    - "curl"
    - "wget"
    - "ssh"
    - "scp"
    - "kubectl"
    - "terraform"
    - "aws"
    - "gcloud"
    - "az"
    - "docker push"
    - "npm publish"

  blocked_paths:
    - ".env*"
    - "**/*.pem"
    - "**/*.key"
    - "**/secrets/**"
    - "infrastructure/**"
    - ".github/workflows/**"

  allowed_paths:
    - "src/**"
    - "lib/**"
    - "tests/**"
    - "docs/**"
    - "package.json"
    - "pyproject.toml"
```

### File System Access Controls

Use filesystem permissions to enforce boundaries at the OS level:

```bash
#!/bin/bash
# setup-agent-workspace.sh
# Create a restricted workspace for agent execution

AGENT_USER="ai-agent"
REPO_DIR="/workspace/repo"

# Create agent user with limited permissions
useradd --system --shell /bin/bash --no-create-home "$AGENT_USER"

# Set ownership: developers own everything, agent gets read on most
chown -R root:developers "$REPO_DIR"
chmod -R 750 "$REPO_DIR"

# Grant agent write access only to safe directories
setfacl -R -m u:${AGENT_USER}:rwx "${REPO_DIR}/src"
setfacl -R -m u:${AGENT_USER}:rwx "${REPO_DIR}/tests"
setfacl -R -m u:${AGENT_USER}:rwx "${REPO_DIR}/docs"

# Deny agent access to sensitive files
setfacl -m u:${AGENT_USER}:--- "${REPO_DIR}/.env"
setfacl -R -m u:${AGENT_USER}:--- "${REPO_DIR}/infrastructure"
setfacl -R -m u:${AGENT_USER}:--- "${REPO_DIR}/.github/workflows"

echo "Agent workspace permissions configured."
```

---

## Secret Protection

### Pre-commit Hooks with git-secrets

```bash
#!/bin/bash
# install-secret-scanning.sh

# Install git-secrets
git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets
cd /tmp/git-secrets && make install

# Initialize in repository
cd /path/to/repo
git secrets --install

# Register common secret patterns
git secrets --register-aws

# Add custom patterns for common credential formats
git secrets --add '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----'
git secrets --add 'AKIA[0-9A-Z]{16}'
git secrets --add 'ghp_[a-zA-Z0-9]{36}'
git secrets --add 'sk-[a-zA-Z0-9]{48}'
git secrets --add 'xox[baprs]-[0-9a-zA-Z-]{10,}'
git secrets --add 'password\s*[:=]\s*["\x27][^\s]{8,}'
git secrets --add 'api[_-]?key\s*[:=]\s*["\x27][^\s]{8,}'

# Add allowed patterns (false positive exclusions)
git secrets --add --allowed 'EXAMPLE_KEY'
git secrets --add --allowed 'your-api-key-here'
```

### Agent Output Scanning

Scan agent-generated output before it reaches version control:

```python
#!/usr/bin/env python3
"""scan_agent_output.py - Scan AI agent output for leaked secrets."""

import re
import sys
from pathlib import Path

SECRET_PATTERNS = [
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
    (r'(?i)aws_secret_access_key\s*[:=]\s*\S+', 'AWS Secret Key'),
    (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Personal Access Token'),
    (r'gho_[a-zA-Z0-9]{36}', 'GitHub OAuth Token'),
    (r'sk-[a-zA-Z0-9]{48,}', 'OpenAI/Anthropic API Key'),
    (r'xox[baprs]-[0-9a-zA-Z\-]{10,}', 'Slack Token'),
    (r'-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----', 'Private Key'),
    (r'(?i)(password|passwd|pwd)\s*[:=]\s*["\x27][^\s]{4,}', 'Hardcoded Password'),
    (r'(?i)(api[_-]?key|apikey)\s*[:=]\s*["\x27][^\s]{8,}', 'API Key'),
    (r'eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}', 'JWT Token'),
    (r'(?i)database_url\s*[:=]\s*\S+', 'Database Connection String'),
]


def scan_file(filepath: str) -> list[dict]:
    findings = []
    content = Path(filepath).read_text(errors="ignore")
    for line_num, line in enumerate(content.splitlines(), 1):
        for pattern, label in SECRET_PATTERNS:
            if re.search(pattern, line):
                findings.append({
                    "file": filepath,
                    "line": line_num,
                    "type": label,
                    "content": line.strip()[:120],
                })
    return findings


def main():
    files = sys.argv[1:]
    if not files:
        print("Usage: scan_agent_output.py <file1> [file2] ...")
        sys.exit(1)

    all_findings = []
    for f in files:
        all_findings.extend(scan_file(f))

    if all_findings:
        print(f"BLOCKED: {len(all_findings)} potential secret(s) detected:\n")
        for finding in all_findings:
            print(f"  [{finding['type']}] {finding['file']}:{finding['line']}")
            print(f"    {finding['content']}\n")
        sys.exit(1)

    print("OK: No secrets detected in agent output.")
    sys.exit(0)


if __name__ == "__main__":
    main()
```

### Git Pre-commit Hook Integration

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Block commits containing secrets from AI agents

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "Scanning staged files for secrets..."

# Run git-secrets
git secrets --pre_commit_hook -- "$@"
GIT_SECRETS_EXIT=$?

# Run custom scanner on staged files
python3 .tools/scan_agent_output.py $STAGED_FILES
SCANNER_EXIT=$?

if [ $GIT_SECRETS_EXIT -ne 0 ] || [ $SCANNER_EXIT -ne 0 ]; then
  echo ""
  echo "COMMIT BLOCKED: Secrets detected in staged files."
  echo "If this is a false positive, use: git commit"
  exit 1
fi
```

---

## Sandbox Configuration

### Docker Sandbox for Agent Execution

```dockerfile
# Dockerfile.agent-sandbox
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    git \
    nodejs \
    npm \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create non-root agent user
RUN useradd -m -s /bin/bash agent && \
    mkdir -p /workspace && \
    chown agent:agent /workspace

# Drop capabilities
USER agent
WORKDIR /workspace

# No network by default - override at runtime if needed
# No access to Docker socket
# No access to host filesystem beyond mounted volume
```

```bash
#!/bin/bash
# run-agent-sandbox.sh
# Launch an AI coding agent inside a locked-down container

REPO_DIR="$(pwd)"
CONTAINER_NAME="agent-sandbox-$$"

docker run \
  --name "$CONTAINER_NAME" \
  --rm \
  --network none \
  --read-only \
  --tmpfs /tmp:size=512m \
  --tmpfs /home/agent:size=256m \
  --memory 4g \
  --cpus 2 \
  --pids-limit 256 \
  --security-opt no-new-privileges:true \
  --security-opt seccomp=seccomp-agent.json \
  --cap-drop ALL \
  --cap-add DAC_OVERRIDE \
  -v "${REPO_DIR}/src:/workspace/src" \
  -v "${REPO_DIR}/tests:/workspace/tests:rw" \
  -v "${REPO_DIR}/docs:/workspace/docs:rw" \
  -v "${REPO_DIR}/package.json:/workspace/package.json:ro" \
  -e "NO_COLOR=1" \
  agent-sandbox:latest \
  "$@"
```

### Seccomp Profile for Agent Containers

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "comment": "seccomp-agent.json - Restrictive profile for AI coding agents",
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close", "stat", "fstat", "lstat",
        "poll", "lseek", "mmap", "mprotect", "munmap", "brk",
        "access", "pipe", "select", "sched_yield", "mremap",
        "dup", "dup2", "nanosleep", "getpid", "getuid", "getgid",
        "geteuid", "getegid", "getppid", "getpgrp", "setsid",
        "getgroups", "uname", "fcntl", "flock", "fsync",
        "getcwd", "chdir", "readlink", "chmod", "mkdir",
        "rmdir", "unlink", "rename", "symlink", "readlinkat",
        "openat", "mkdirat", "newfstatat", "unlinkat", "renameat",
        "faccessat", "pselect6", "ppoll", "set_robust_list",
        "get_robust_list", "epoll_create1", "epoll_ctl", "epoll_wait",
        "eventfd2", "pipe2", "dup3", "pread64", "pwrite64",
        "futex", "clock_gettime", "clock_getres", "exit_group",
        "wait4", "clone", "execve", "arch_prctl", "set_tid_address",
        "exit", "getdents64", "rt_sigaction", "rt_sigprocmask",
        "rt_sigreturn", "ioctl", "writev", "madvise", "getrandom"
      ],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": [
        "socket", "connect", "bind", "listen", "accept",
        "sendto", "recvfrom", "sendmsg", "recvmsg"
      ],
      "action": "SCMP_ACT_ERRNO",
      "comment": "Block all network syscalls"
    },
    {
      "names": ["ptrace", "process_vm_readv", "process_vm_writev"],
      "action": "SCMP_ACT_ERRNO",
      "comment": "Block debugging and process inspection"
    }
  ]
}
```

---


## Contents

- [Code Review Gates](references/details.md)
- [Repository Configuration](references/details.md)
- [Security Rules](references/details.md)
- [File Restrictions](references/details.md)
- [Code Quality](references/details.md)
- [Git Behavior](references/details.md)
- [Rules](references/details.md)
- [Network Controls](references/details.md)
- [Audit Trail](references/details.md)
- [Team Policies](references/details.md)
- [Testing Agent Output](references/details.md)
- [Quick Reference](references/details.md)

## When to Use

Apply these guardrails when:

- Onboarding AI coding agents into an engineering team for the first time
- Developers are using Claude Code, Cursor, Copilot, or Codex to generate production code
- Agents have access to repositories containing secrets, infrastructure configs, or sensitive business logic
- Your compliance framework (SOC 2, ISO 27001, FedRAMP) requires controls around automated code generation
- Autonomous or semi-autonomous agents are creating pull requests without direct human typing
- You need to enforce consistent security policies across multiple agents and team members

Signs you need tighter guardrails:

- Agents have committed secrets or credentials to version control
- Agent-generated code has introduced vulnerabilities caught late in the pipeline
- No clear audit trail distinguishes human-written from AI-generated code
- Developers are bypassing code review for "simple" agent changes
- Agents are executing arbitrary shell commands in production-connected environments

---

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
