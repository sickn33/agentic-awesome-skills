---
name: ai-security-hardening
description: Harden AI/LLM deployments against prompt injection, data exfiltration,
  model theft, and supply chain attacks.
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

# AI Security Hardening

Secure LLM and AI systems against prompt injection, jailbreaks, data leakage, and supply chain threats in production environments.

## When to Use This Skill

Use this skill when:
- Deploying an LLM-powered application handling sensitive user data
- Protecting against prompt injection attacks in AI agents
- Implementing output filtering and content moderation
- Securing model weights and API endpoints from theft
- Achieving SOC2 or ISO 27001 compliance for AI systems

## AI-Specific Threat Model

```
Threat                    Risk                          Control
─────────────────────────────────────────────────────────────────────
Prompt injection          System prompt override         Input sanitization, separate context
Data exfiltration         PII in model outputs           Output filtering, DLP scanning
Jailbreaking             Policy bypass                  Content moderation, guardrails
Model theft               Weight extraction via API      Rate limiting, access controls
Training data poisoning   Backdoored fine-tuned model    Dataset validation, provenance
Supply chain attack       Malicious model weights        Signature verification, scanning
Insecure output           XSS/SQLi from LLM response     Output encoding, parameterized queries
```

## Prompt Injection Defense

```python
import re
from typing import Optional

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"you\s+are\s+now\s+",
    r"new\s+instructions?:",
    r"system\s+prompt",
    r"forget\s+everything",
    r"act\s+as\s+",
    r"jailbreak",
    r"dan\s+mode",
    r"<\s*system\s*>",
    r"\[INST\]",
]

def detect_prompt_injection(user_input: str) -> tuple[bool, Optional[str]]:
    """Return (is_suspicious, matched_pattern)."""
    normalized = user_input.lower().strip()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return True, pattern
    return False, None

def sanitize_user_input(user_input: str, max_length: int = 4000) -> str:
    """Sanitize input before passing to LLM."""
    # Truncate
    user_input = user_input[:max_length]

    # Remove null bytes and control characters
    user_input = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', user_input)

    # Check for injection
    suspicious, pattern = detect_prompt_injection(user_input)
    if suspicious:
        raise ValueError(f"Potential prompt injection detected: {pattern}")

    return user_input
```

## Guardrails with NeMo Guardrails

```python
# guardrails.yaml
from nemoguardrails import RailsConfig, LLMRails

config = RailsConfig.from_path("./guardrails-config")
rails = LLMRails(config)

async def safe_llm_call(user_message: str) -> str:
    response = await rails.generate_async(
        messages=[{"role": "user", "content": user_message}]
    )
    return response["content"]
```

```yaml
# guardrails-config/config.yml
models:
  - type: main
    engine: openai
    model: gpt-4o-mini

rails:
  input:
    flows:
      - check jailbreak
      - check sensitive data
  output:
    flows:
      - check output for PII
      - check output for harmful content
```

## Output Filtering & PII Scrubbing

```python
import re
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

PII_ENTITIES = ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
                "US_SSN", "IBAN_CODE", "IP_ADDRESS", "LOCATION"]

def scrub_pii_from_output(text: str) -> str:
    """Remove PII from LLM output before returning to user."""
    results = analyzer.analyze(text=text, entities=PII_ENTITIES, language="en")
    if not results:
        return text
    anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
    return anonymized.text

def validate_output_safety(output: str) -> bool:
    """Check output doesn't contain prompt injection artifacts."""
    dangerous_patterns = [
        r"<\s*script\s*>",         # XSS
        r"javascript:",             # XSS
        r";\s*(DROP|DELETE|INSERT)",# SQLi
        r"\$\{.*\}",               # template injection
        r"`.*`",                   # command injection in some contexts
    ]
    for pattern in dangerous_patterns:
        if re.search(pattern, output, re.IGNORECASE):
            return False
    return True
```

## API Security for LLM Endpoints

```python
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import time
from collections import defaultdict

app = FastAPI()
security = HTTPBearer()

# Rate limiting (per API key)
request_counts = defaultdict(list)

def rate_limit(api_key: str, max_requests: int = 100, window_seconds: int = 60):
    now = time.time()
    requests = request_counts[api_key]
    # Remove old requests outside window
    request_counts[api_key] = [t for t in requests if now - t < window_seconds]
    if len(request_counts[api_key]) >= max_requests:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    request_counts[api_key].append(now)

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        rate_limit(payload["sub"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/v1/chat/completions")
async def chat(request: Request, token: dict = Depends(verify_token)):
    body = await request.json()

    # Input validation
    user_msg = body.get("messages", [{}])[-1].get("content", "")
    try:
        safe_input = sanitize_user_input(user_msg)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Call LLM and scrub output
    response = await call_llm(safe_input, token["scope"])
    response["choices"][0]["message"]["content"] = scrub_pii_from_output(
        response["choices"][0]["message"]["content"]
    )
    return response
```

## Model Weight Security

```bash
# Verify model weights with SHA-256 hash before loading
MODEL_DIR="./models/llama-3.1-8b"
EXPECTED_HASH="sha256:abc123..."

# Generate hash of downloaded model
actual_hash=$(find "$MODEL_DIR" -name "*.safetensors" | sort | xargs sha256sum | sha256sum)
echo "Model hash: $actual_hash"

# Compare (automate in CI/CD)
if [ "$actual_hash" != "$EXPECTED_HASH" ]; then
  echo "ERROR: Model hash mismatch — possible tampering!"
  exit 1
fi

# Scan model files for embedded malware (ModelScan)
pip install modelscan
modelscan scan -p "$MODEL_DIR"
```

## Network Isolation for AI Services

```yaml
# Kubernetes NetworkPolicy — isolate LLM API
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: llm-api-isolation
  namespace: ai-services
spec:
  podSelector:
    matchLabels:
      app: vllm
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: backend           # only backend can call LLM
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: monitoring        # metrics only
    ports:
    - protocol: TCP
      port: 9090
  # Block egress to internet — prevent data exfiltration
  # (allow only internal cluster traffic)
```

## Audit Logging

```python
import structlog
from datetime import datetime, timezone

audit_log = structlog.get_logger("ai.audit")

def log_llm_interaction(
    user_id: str,
    session_id: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    was_filtered: bool,
    injection_detected: bool,
):
    audit_log.info(
        "llm_interaction",
        timestamp=datetime.now(timezone.utc).isoformat(),
        user_id=user_id,
        session_id=session_id,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        was_filtered=was_filtered,
        injection_detected=injection_detected,
        # DO NOT log prompt/completion content — PII risk
    )
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| False positive injection blocks | Overly broad regex | Tune patterns; use ML-based classifier for high-traffic |
| PII in model outputs | Model trained on PII data | Add Presidio scrubbing to output layer |
| API key leakage | Keys in logs or responses | Mask keys in logging; use vault for key storage |
| Model weight tampering | Unverified downloads | Always verify SHA-256; use `modelscan` |
| Rate limit bypass | Per-IP not per-user | Rate limit on authenticated user ID, not IP |

## Best Practices

- Never log raw prompts or completions — they may contain PII or sensitive data.
- Treat LLM output as untrusted input — always encode before rendering in HTML.
- Use network policies to prevent LLM pods from making outbound internet calls.
- Rotate API keys quarterly; use short-lived JWT tokens for service-to-service auth.
- Run `modelscan` on any model downloaded from the internet before serving.

## Related Skills

- hashicorp-vault (`hashicorp-vault`) - Secrets management for API keys
- [network-security] (../../network/) - Network-level controls
- linux-hardening (`linux-hardening`) - Host hardening
- agent-observability (`agent-observability`) - AI audit logging
- llm-gateway (`llm-gateway`) - Centralized access control

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
