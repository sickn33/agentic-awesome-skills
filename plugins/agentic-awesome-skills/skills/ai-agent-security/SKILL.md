---
name: ai-agent-security
description: Secure AI agents against prompt injection, tool abuse, and data exfiltration
  with defense-in-depth controls.
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
  version: '2.0'
---

# AI Agent Security

Protect agentic AI systems from adversarial input, unsafe tool execution, data leakage, and privilege abuse with layered security controls.

## Prerequisites

- Python 3.10+ for guardrail code examples
- Docker or Podman for sandbox execution
- OpenTelemetry collector for audit logging
- Familiarity with your agent framework (LangChain, CrewAI, Autogen, custom)
- Access to policy engine (OPA/Cedar) for permission boundaries

## Threat Model — STRIDE for AI Agents

AI agents introduce a unique threat surface. Apply STRIDE specifically to agentic components:

| Threat | Agent-Specific Example | Control |
|--------|----------------------|---------|
| **Spoofing** | Attacker crafts input that mimics a trusted internal tool response | Signed tool responses, HMAC verification |
| **Tampering** | Prompt injection modifies agent reasoning mid-chain | Input validation, prompt armoring |
| **Repudiation** | Agent takes destructive action with no audit trail | Immutable structured logging |
| **Information Disclosure** | Agent leaks PII, secrets, or internal architecture in responses | Output filtering, content classifiers |
| **Denial of Service** | Adversarial prompt causes infinite tool loops or token exhaustion | Rate limits, token budgets, circuit breakers |
| **Elevation of Privilege** | Agent escalates from read-only to write via chained tool calls | RBAC per tool, least-privilege scoping |

### Key Threat Categories

**Prompt Injection** — Untrusted content (user input, web scrapes, document contents) manipulates the agent's system prompt or reasoning chain to execute unintended actions.

**Tool Abuse** — The agent calls tools in sequences or with parameters the designer did not anticipate, achieving effects beyond its intended scope.

**Data Exfiltration** — The agent encodes sensitive data (credentials, PII, internal IPs) into its responses, tool calls, or outbound HTTP requests.

**Cross-Tenant Leakage** — In multi-tenant deployments, context from one tenant's session bleeds into another through shared memory, vector stores, or cache.

**Privilege Escalation** — The agent chains low-privilege tool calls to achieve high-privilege outcomes (e.g., read config -> extract credentials -> call admin API).

## Input Validation

Every input to an agent must be sanitized before it reaches the model or any tool. This includes user messages, tool outputs being fed back, and retrieved documents.

### Prompt Injection Detection

```python
import re
from dataclasses import dataclass
from enum import Enum

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ValidationResult:
    is_safe: bool
    risk_level: RiskLevel
    matched_rules: list[str]
    sanitized_input: str

INJECTION_PATTERNS = [
    (r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)", "instruction_override"),
    (r"you\s+are\s+now\s+(a|an|the)\s+", "role_hijack"),
    (r"system\s*:\s*", "system_prompt_inject"),
    (r"<\|?(system|im_start|endoftext)\|?>", "control_token_inject"),
    (r"\[INST\]|\[\/INST\]|<<SYS>>", "template_inject"),
    (r"(?:execute|run|eval)\s*\(", "code_execution_attempt"),
    (r"(?:curl|wget|nc|ncat)\s+", "network_command_inject"),
    (r"(?:rm\s+-rf|mkfs|dd\s+if=|chmod\s+777)", "destructive_command"),
    (r"(?:\/etc\/passwd|\/etc\/shadow|\.env\b|\.ssh\/)", "path_traversal"),
    (r"(?:BEGIN\s+(?:RSA|DSA|EC)\s+PRIVATE\s+KEY)", "secret_exfil_attempt"),
]

def validate_agent_input(user_input: str, max_length: int = 4096) -> ValidationResult:
    """Validate and sanitize input before passing to agent."""
    matched = []
    risk = RiskLevel.LOW

    # Length check
    if len(user_input) > max_length:
        matched.append("input_too_long")
        risk = RiskLevel.MEDIUM

    # Null byte and control character removal
    sanitized = user_input.replace("\x00", "")
    sanitized = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f]", "", sanitized)

    # Pattern matching
    for pattern, rule_name in INJECTION_PATTERNS:
        if re.search(pattern, sanitized, re.IGNORECASE):
            matched.append(rule_name)
            risk = RiskLevel.HIGH

    # Stacked injection detection (multiple suspicious patterns)
    if len(matched) >= 3:
        risk = RiskLevel.CRITICAL

    is_safe = risk in (RiskLevel.LOW, RiskLevel.MEDIUM)

    return ValidationResult(
        is_safe=is_safe,
        risk_level=risk,
        matched_rules=matched,
        sanitized_input=sanitized[:max_length] if is_safe else "",
    )
```

### Content Classification Middleware

Use a lightweight classifier as middleware before the agent processes any input:

```python
from functools import wraps
from typing import Callable

def input_guard(validator: Callable = validate_agent_input):
    """Decorator that guards agent entry points against unsafe input."""
    def decorator(func):
        @wraps(func)
        async def wrapper(user_input: str, *args, **kwargs):
            result = validator(user_input)

            if result.risk_level == RiskLevel.CRITICAL:
                await log_security_event(
                    event="input_blocked",
                    risk=result.risk_level.value,
                    rules=result.matched_rules,
                    input_hash=hashlib.sha256(user_input.encode()).hexdigest(),
                )
                raise InputRejectedError(
                    f"Input blocked: matched {result.matched_rules}"
                )

            if result.risk_level == RiskLevel.HIGH:
                await log_security_event(
                    event="input_flagged",
                    risk=result.risk_level.value,
                    rules=result.matched_rules,
                )
                # Allow through but flag for review
                kwargs["_security_flags"] = result.matched_rules

            return await func(result.sanitized_input, *args, **kwargs)
        return wrapper
    return decorator

# Usage
@input_guard()
async def handle_user_message(message: str, session_id: str, **kwargs):
    """Process a validated user message through the agent."""
    flags = kwargs.get("_security_flags", [])
    if flags:
        # Route to sandboxed execution path
        return await agent.run_sandboxed(message, session_id)
    return await agent.run(message, session_id)
```

## Tool Execution Sandboxing

Never let an agent execute tools directly on the host. Isolate every tool invocation inside a sandbox.

### Docker Sandbox Configuration

```yaml
# docker-compose.agent-sandbox.yml
version: "3.8"

services:
  agent-sandbox:
    image: agent-tools:latest
    read_only: true
    security_opt:
      - no-new-privileges:true
      - seccomp:seccomp-profile.json
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE   # Only if tool needs network
    tmpfs:
      - /tmp:size=64M,noexec,nosuid
    mem_limit: 512m
    cpus: "0.5"
    pids_limit: 64
    networks:
      - sandbox-net
    environment:
      - TOOL_TIMEOUT=30
      - MAX_OUTPUT_BYTES=65536
    volumes:
      - type: bind
        source: ./tool-workspace
        target: /workspace
        read_only: false
    dns:
      - 127.0.0.1           # Block external DNS by default

networks:
  sandbox-net:
    driver: bridge
    internal: true           # No external network access
```

### gVisor Runtime for Stronger Isolation

```bash
# Install gVisor runsc runtime
curl -fsSL https://gvisor.dev/archive.key | sudo gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | \
  sudo tee /etc/apt/sources.list.d/gvisor.list
sudo apt-get update && sudo apt-get install -y runsc

# Configure Docker to use gVisor
cat <<'EOF' | sudo tee /etc/docker/daemon.json
{
  "runtimes": {
    "runsc": {
      "path": "/usr/bin/runsc",
      "runtimeArgs": [
        "--network=none",
        "--directfs=false"
      ]
    }
  }
}
EOF
sudo systemctl restart docker

# Run agent sandbox with gVisor
docker run --runtime=runsc --rm \
  --read-only \
  --memory=512m \
  --cpus=0.5 \
  --pids-limit=64 \
  agent-tools:latest \
  python /tools/execute.py --tool="$TOOL_NAME" --args="$TOOL_ARGS"
```

### Tool Allowlist Enforcement

```python
from dataclasses import dataclass, field

@dataclass
class ToolPolicy:
    name: str
    allowed_args: dict[str, type]     # parameter name -> expected type
    max_calls_per_session: int = 10
    requires_approval: bool = False
    allowed_patterns: list[str] = field(default_factory=list)
    blocked_patterns: list[str] = field(default_factory=list)

TOOL_ALLOWLIST: dict[str, ToolPolicy] = {
    "read_file": ToolPolicy(
        name="read_file",
        allowed_args={"path": str},
        max_calls_per_session=20,
        allowed_patterns=[r"^/workspace/", r"^/data/public/"],
        blocked_patterns=[r"\.env$", r"\.key$", r"\.pem$", r"/etc/", r"/proc/"],
    ),
    "run_query": ToolPolicy(
        name="run_query",
        allowed_args={"sql": str, "database": str},
        max_calls_per_session=5,
        allowed_patterns=[r"^SELECT\s", r"^EXPLAIN\s"],
        blocked_patterns=[r"\bDROP\b", r"\bDELETE\b", r"\bUPDATE\b", r"\bINSERT\b", r"\bALTER\b"],
    ),
    "http_request": ToolPolicy(
        name="http_request",
        allowed_args={"url": str, "method": str},
        max_calls_per_session=10,
        requires_approval=True,
        allowed_patterns=[r"^https://api\.internal\."],
        blocked_patterns=[r"^https?://169\.254\.", r"^https?://metadata\.google\."],
    ),
    "execute_code": ToolPolicy(
        name="execute_code",
        allowed_args={"code": str, "language": str},
        max_calls_per_session=3,
        requires_approval=True,
        blocked_patterns=[r"import\s+subprocess", r"import\s+os", r"__import__", r"eval\(", r"exec\("],
    ),
}

class ToolGatekeeper:
    def __init__(self, allowlist: dict[str, ToolPolicy]):
        self.allowlist = allowlist
        self.call_counts: dict[str, int] = {}

    async def authorize(self, tool_name: str, args: dict) -> bool:
        if tool_name not in self.allowlist:
            await log_security_event(
                event="tool_denied_not_in_allowlist",
                tool=tool_name,
            )
            return False

        policy = self.allowlist[tool_name]

        # Check call count
        count = self.call_counts.get(tool_name, 0)
        if count >= policy.max_calls_per_session:
            await log_security_event(
                event="tool_denied_rate_limit",
                tool=tool_name,
                count=count,
            )
            return False

        # Validate argument types
        for arg_name, expected_type in policy.allowed_args.items():
            if arg_name in args and not isinstance(args[arg_name], expected_type):
                return False

        # Check patterns against all string arguments
        for arg_value in args.values():
            if not isinstance(arg_value, str):
                continue
            # Must match at least one allowed pattern (if any defined)
            if policy.allowed_patterns:
                if not any(re.search(p, arg_value, re.IGNORECASE) for p in policy.allowed_patterns):
                    return False
            # Must not match any blocked pattern
            if any(re.search(p, arg_value, re.IGNORECASE) for p in policy.blocked_patterns):
                await log_security_event(
                    event="tool_denied_blocked_pattern",
                    tool=tool_name,
                    arg_value_hash=hashlib.sha256(arg_value.encode()).hexdigest(),
                )
                return False

        self.call_counts[tool_name] = count + 1
        return True
```


## Contents

- [Permission Boundaries](references/details.md)
- [Output Filtering](references/details.md)
- [Audit Logging](references/details.md)
- [Rate Limiting and Abuse Prevention](references/details.md)
- [Kill Switches and Circuit Breakers](references/details.md)
- [Red Team Checklist](references/details.md)
- [Incident Response Playbook](references/details.md)
- [Troubleshooting](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Building AI agents that invoke tools, APIs, or shell commands
- Deploying agents with access to production databases, cloud accounts, or internal services
- Hardening multi-tenant agent platforms against cross-tenant data leakage
- Adding guardrails to autonomous coding agents or SRE bots
- Designing approval workflows for high-risk agent actions
- Conducting red-team exercises against agentic systems
- Responding to incidents involving compromised or misbehaving agents

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
