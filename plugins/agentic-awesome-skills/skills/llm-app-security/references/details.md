# Details (moved from SKILL.md)

> Extended reference content for `llm-app-security`, kept under `references/` so the entrypoint stays within the audit budget.

## Secure RAG Pipeline

Retrieval-Augmented Generation introduces a document supply chain. Every stage -- ingestion, indexing, retrieval, and generation -- has its own attack surface.

### Document Ingestion Scanning

```python
import hashlib
import magic  # python-magic
import clamd

def scan_document(file_path: str, allowed_types: set = None) -> dict:
    """Scan an uploaded document before indexing."""
    if allowed_types is None:
        allowed_types = {
            "application/pdf", "text/plain", "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }

    mime = magic.from_file(file_path, mime=True)
    if mime not in allowed_types:
        return {"safe": False, "reason": f"disallowed_type: {mime}"}

    # ClamAV malware scan
    cd = clamd.ClamdUnixSocket()
    scan_result = cd.scan(file_path)
    if scan_result and scan_result[file_path][0] == "FOUND":
        return {"safe": False, "reason": f"malware: {scan_result[file_path][1]}"}

    # Compute content hash for provenance
    with open(file_path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    return {"safe": True, "sha256": sha256, "mime": mime}
```

### Secret Detection in Documents

```python
import re

SECRET_PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key"),
    (r"ghp_[A-Za-z0-9_]{36}", "GitHub PAT"),
    (r"sk-[A-Za-z0-9]{48}", "OpenAI API Key"),
    (r"-----BEGIN (RSA |EC )?PRIVATE KEY-----", "Private Key"),
    (r"xox[bpsar]-[A-Za-z0-9-]+", "Slack Token"),
]

def scan_for_secrets(text: str) -> list[dict]:
    findings = []
    for pattern, label in SECRET_PATTERNS:
        for match in re.finditer(pattern, text):
            findings.append({
                "type": label,
                "start": match.start(),
                "end": match.end(),
                "snippet": text[max(0, match.start()-10):match.end()+10],
            })
    return findings
```

### Access-Controlled Retrieval (Pinecone)

```python
from pinecone import Pinecone

pc = Pinecone(api_key="YOUR_KEY")
index = pc.Index("knowledge-base")

def retrieve_for_user(query_embedding: list[float], user: dict, top_k: int = 5):
    """Retrieve documents the user is authorized to see."""
    # Build a metadata filter that enforces tenant + role boundaries.
    filter_expr = {
        "$and": [
            {"tenant_id": {"$eq": user["tenant_id"]}},
            {
                "$or": [
                    {"access_level": {"$eq": "public"}},
                    {"access_roles": {"$in": user["roles"]}},
                ]
            },
        ]
    }

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        filter=filter_expr,
        include_metadata=True,
    )
    return results["matches"]
```

### Access-Controlled Retrieval (Weaviate)

```python
import weaviate

client = weaviate.connect_to_local()

def retrieve_weaviate(query: str, tenant_id: str, roles: list[str], limit: int = 5):
    collection = client.collections.get("Document")
    response = collection.query.near_text(
        query=query,
        limit=limit,
        filters=(
            weaviate.classes.query.Filter.by_property("tenant_id").equal(tenant_id)
            & (
                weaviate.classes.query.Filter.by_property("access_level").equal("public")
                | weaviate.classes.query.Filter.by_property("access_role").contains_any(roles)
            )
        ),
        return_metadata=weaviate.classes.query.MetadataQuery(distance=True),
    )
    return response.objects
```

### Provenance Tracking

```python
def attach_provenance(response_text: str, source_docs: list[dict]) -> dict:
    """Wrap the LLM response with source attribution."""
    citations = []
    for doc in source_docs:
        citations.append({
            "doc_id": doc["id"],
            "title": doc["metadata"].get("title", "Unknown"),
            "sha256": doc["metadata"].get("sha256"),
            "chunk_index": doc["metadata"].get("chunk_index"),
            "score": doc.get("score"),
        })
    return {
        "answer": response_text,
        "citations": citations,
        "citation_count": len(citations),
    }
```

---


## Tenant Isolation

In multi-tenant systems, one customer must never see another customer's data -- in prompts, retrieval results, conversation history, or logs.

### Namespace Isolation in Pinecone

```python
def get_tenant_index(tenant_id: str):
    """Each tenant gets its own namespace inside the shared index."""
    pc = Pinecone(api_key="YOUR_KEY")
    index = pc.Index("shared-knowledge-base")
    # All operations scoped to a namespace
    return index, tenant_id  # pass namespace= to every call

def upsert_tenant_docs(tenant_id: str, vectors: list[dict]):
    index, ns = get_tenant_index(tenant_id)
    index.upsert(vectors=vectors, namespace=ns)

def query_tenant(tenant_id: str, embedding: list[float], top_k: int = 5):
    index, ns = get_tenant_index(tenant_id)
    return index.query(vector=embedding, top_k=top_k, namespace=ns,
                       include_metadata=True)
```

### Session Boundary Enforcement (Redis)

```python
import redis
import json
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

SESSION_TTL = 3600  # 1 hour

def create_session(tenant_id: str, user_id: str) -> str:
    session_id = str(uuid.uuid4())
    key = f"session:{session_id}"
    r.hset(key, mapping={
        "tenant_id": tenant_id,
        "user_id": user_id,
        "messages": json.dumps([]),
    })
    r.expire(key, SESSION_TTL)
    return session_id

def append_message(session_id: str, tenant_id: str, role: str, content: str):
    key = f"session:{session_id}"
    session = r.hgetall(key)
    if not session:
        raise ValueError("session_expired")
    if session["tenant_id"] != tenant_id:
        raise PermissionError("tenant_mismatch")

    messages = json.loads(session["messages"])
    messages.append({"role": role, "content": content})
    r.hset(key, "messages", json.dumps(messages))
    r.expire(key, SESSION_TTL)  # refresh TTL

def get_history(session_id: str, tenant_id: str) -> list[dict]:
    key = f"session:{session_id}"
    session = r.hgetall(key)
    if not session:
        return []
    if session["tenant_id"] != tenant_id:
        raise PermissionError("tenant_mismatch")
    return json.loads(session["messages"])
```

### Conversation Memory Isolation (Node.js)

```javascript
const Redis = require("ioredis");
const redis = new Redis();

const SESSION_TTL = 3600;

async function createSession(tenantId, userId) {
  const sessionId = crypto.randomUUID();
  const key = `session:${sessionId}`;
  await redis.hmset(key, {
    tenant_id: tenantId,
    user_id: userId,
    messages: JSON.stringify([]),
  });
  await redis.expire(key, SESSION_TTL);
  return sessionId;
}

async function appendMessage(sessionId, tenantId, role, content) {
  const key = `session:${sessionId}`;
  const session = await redis.hgetall(key);
  if (!session || !session.tenant_id) throw new Error("session_expired");
  if (session.tenant_id !== tenantId) throw new Error("tenant_mismatch");

  const messages = JSON.parse(session.messages);
  messages.push({ role, content });
  await redis.hset(key, "messages", JSON.stringify(messages));
  await redis.expire(key, SESSION_TTL);
}
```

---


## Rate Limiting

LLM calls are expensive. Without rate limiting, a single abusive user can exhaust your budget or degrade service for everyone.

### Per-User Token Budget (Python + Redis)

```python
import time
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Budget: 100,000 tokens per user per hour
TOKEN_BUDGET = 100_000
WINDOW_SECONDS = 3600

def check_and_deduct(user_id: str, tokens_used: int) -> dict:
    key = f"token_budget:{user_id}"
    now = int(time.time())

    current = r.hgetall(key)
    if not current or int(current.get("window_start", 0)) < now - WINDOW_SECONDS:
        # New window
        r.hset(key, mapping={"used": tokens_used, "window_start": now})
        r.expire(key, WINDOW_SECONDS)
        return {"allowed": True, "remaining": TOKEN_BUDGET - tokens_used}

    used = int(current["used"]) + tokens_used
    if used > TOKEN_BUDGET:
        return {"allowed": False, "remaining": 0, "retry_after":
                WINDOW_SECONDS - (now - int(current["window_start"]))}

    r.hset(key, "used", used)
    return {"allowed": True, "remaining": TOKEN_BUDGET - used}
```

### Daily Cost Cap per Tenant

```python
DAILY_COST_CAP_USD = 50.0
COST_PER_1K_INPUT = 0.003   # adjust per model
COST_PER_1K_OUTPUT = 0.015

def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens / 1000 * COST_PER_1K_INPUT +
            output_tokens / 1000 * COST_PER_1K_OUTPUT)

def check_cost_cap(tenant_id: str, input_tokens: int, output_tokens: int) -> dict:
    key = f"daily_cost:{tenant_id}:{time.strftime('%Y-%m-%d')}"
    cost = estimate_cost(input_tokens, output_tokens)
    current = float(r.get(key) or 0)

    if current + cost > DAILY_COST_CAP_USD:
        return {"allowed": False, "spent": current, "cap": DAILY_COST_CAP_USD}

    r.incrbyfloat(key, cost)
    r.expire(key, 86400)
    return {"allowed": True, "spent": current + cost, "cap": DAILY_COST_CAP_USD}
```

### NGINX Rate Limiting for the LLM Endpoint

```nginx
# /etc/nginx/conf.d/llm-rate-limit.conf

# Define a rate limit zone keyed on the API key header
limit_req_zone $http_x_api_key zone=llm_api:10m rate=10r/s;

# Define a connection limit zone
limit_conn_zone $http_x_api_key zone=llm_conn:10m;

server {
    listen 443 ssl;
    server_name api.example.com;

    location /v1/chat {
        # Burst of 20 requests, then delay
        limit_req zone=llm_api burst=20 delay=10;
        # Max 5 concurrent connections per API key
        limit_conn llm_conn 5;

        # Return 429 instead of 503
        limit_req_status 429;
        limit_conn_status 429;

        proxy_pass http://llm-backend;
    }
}
```

### Kong API Gateway Rate Limiting

```yaml
# kong.yml - declarative config
plugins:
  - name: rate-limiting-advanced
    config:
      limit:
        - 100     # requests
      window_size:
        - 60      # per 60 seconds
      identifier: consumer
      strategy: redis
      redis:
        host: redis
        port: 6379
      retry_after_jitter_max: 1
    route: llm-chat-route

  - name: request-size-limiting
    config:
      allowed_payload_size: 64   # KB - prevents huge prompt payloads
    route: llm-chat-route
```

---


## Monitoring and Alerting

Detecting attacks in real time is as important as preventing them. Instrument every stage of the LLM pipeline.

### Structured Logging for LLM Requests

```python
import structlog
import time

logger = structlog.get_logger()

def log_llm_request(
    user_id: str,
    tenant_id: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: float,
    injection_detected: bool,
    pii_scrubbed: bool,
    model: str,
):
    logger.info(
        "llm_request",
        user_id=user_id,
        tenant_id=tenant_id,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=latency_ms,
        injection_detected=injection_detected,
        pii_scrubbed=pii_scrubbed,
        model=model,
        cost_usd=estimate_cost(input_tokens, output_tokens),
    )
```

### Prompt Injection Alert (Prometheus + Alertmanager)

```yaml
# prometheus/rules/llm-security.yml
groups:
  - name: llm-security
    rules:
      - alert: HighPromptInjectionRate
        expr: |
          sum(rate(llm_injection_detected_total[5m])) by (tenant_id)
          / sum(rate(llm_requests_total[5m])) by (tenant_id)
          > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Tenant {{ $labels.tenant_id }} has >5% prompt injection rate"
          runbook: "https://wiki.internal/runbooks/llm-injection"

      - alert: AnomalousCostSpike
        expr: |
          sum(increase(llm_cost_usd_total[1h])) by (tenant_id)
          > 2 * sum(avg_over_time(llm_cost_usd_total[7d:1h])) by (tenant_id)
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant_id }} cost is 2x the 7-day average"

      - alert: HighTokenUsageSingleUser
        expr: |
          sum(increase(llm_tokens_total[1h])) by (user_id)
          > 500000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "User {{ $labels.user_id }} consumed >500k tokens in 1 hour"
```

### Anomaly Detection in Usage Patterns

```python
from collections import defaultdict
import statistics

class UsageAnomalyDetector:
    """Simple z-score based anomaly detection for LLM usage."""

    def __init__(self, window_size: int = 100, z_threshold: float = 3.0):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.history = defaultdict(list)  # user_id -> list of token counts

    def record_and_check(self, user_id: str, token_count: int) -> dict:
        history = self.history[user_id]
        history.append(token_count)

        if len(history) > self.window_size:
            history.pop(0)

        if len(history) < 10:
            return {"anomaly": False, "reason": "insufficient_data"}

        mean = statistics.mean(history[:-1])
        stdev = statistics.stdev(history[:-1])
        if stdev == 0:
            return {"anomaly": False, "reason": "zero_variance"}

        z_score = (token_count - mean) / stdev
        is_anomaly = abs(z_score) > self.z_threshold

        return {
            "anomaly": is_anomaly,
            "z_score": round(z_score, 2),
            "mean": round(mean, 2),
            "current": token_count,
        }
```

### Grafana Dashboard Query (PromQL)

```promql
# Request rate by tenant
sum(rate(llm_requests_total[5m])) by (tenant_id)

# Injection detection rate
sum(rate(llm_injection_detected_total[5m])) / sum(rate(llm_requests_total[5m]))

# P95 latency
histogram_quantile(0.95, sum(rate(llm_request_duration_seconds_bucket[5m])) by (le))

# Hourly cost by model
sum(increase(llm_cost_usd_total[1h])) by (model)
```

---


## Compliance

LLM applications generate and process data that falls under GDPR, CCPA, SOC 2, and industry-specific regulations. Address data retention, right-to-forget, and audit trails.

### Data Retention Policy for LLM Logs

```python
import datetime
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

RETENTION_POLICIES = {
    "conversation_logs": 90,   # days
    "audit_events": 365,       # days
    "raw_prompts": 30,         # days - minimize exposure
    "embeddings": 180,         # days
}

def apply_retention_ttl(key: str, category: str):
    days = RETENTION_POLICIES.get(category, 30)
    r.expire(key, days * 86400)

def purge_expired_logs(db_conn, category: str):
    """Delete logs older than the retention period."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(
        days=RETENTION_POLICIES[category]
    )
    db_conn.execute(
        f"DELETE FROM {category} WHERE created_at < %s", (cutoff,)
    )
```

### GDPR Right-to-Forget for Embeddings

When a user requests deletion, you must remove their data from the vector store, conversation logs, and any derived embeddings.

```python
def delete_user_data(user_id: str, tenant_id: str, pc_index, redis_client):
    """GDPR Article 17 - Right to erasure."""
    results = []

    # 1. Delete from vector store (Pinecone)
    # Fetch all vector IDs belonging to this user
    query_response = pc_index.query(
        vector=[0.0] * 1536,  # dummy vector
        top_k=10000,
        namespace=tenant_id,
        filter={"user_id": {"$eq": user_id}},
        include_values=False,
    )
    vector_ids = [m["id"] for m in query_response["matches"]]
    if vector_ids:
        # Delete in batches of 1000
        for i in range(0, len(vector_ids), 1000):
            batch = vector_ids[i:i + 1000]
            pc_index.delete(ids=batch, namespace=tenant_id)
        results.append(f"deleted {len(vector_ids)} vectors")

    # 2. Delete conversation history from Redis
    pattern = f"session:*"
    cursor = 0
    deleted_sessions = 0
    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=100)
        for key in keys:
            session = redis_client.hgetall(key)
            if (session.get("user_id") == user_id and
                    session.get("tenant_id") == tenant_id):
                redis_client.delete(key)
                deleted_sessions += 1
        if cursor == 0:
            break
    results.append(f"deleted {deleted_sessions} sessions")

    # 3. Delete from relational DB
    # db.execute("DELETE FROM llm_logs WHERE user_id = %s AND tenant_id = %s",
    #            (user_id, tenant_id))

    return {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "actions": results,
        "status": "completed",
    }
```

### Audit Trail Schema

```sql
CREATE TABLE llm_audit_log (
    id            BIGSERIAL PRIMARY KEY,
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id     VARCHAR(64) NOT NULL,
    user_id       VARCHAR(64) NOT NULL,
    session_id    VARCHAR(64),
    action        VARCHAR(32) NOT NULL,  -- 'query', 'injection_blocked', 'pii_scrubbed', 'data_deleted'
    model         VARCHAR(64),
    input_tokens  INTEGER,
    output_tokens INTEGER,
    cost_usd      NUMERIC(10, 6),
    injection_detected BOOLEAN DEFAULT FALSE,
    pii_detected  BOOLEAN DEFAULT FALSE,
    metadata      JSONB,
    INDEX idx_tenant_time (tenant_id, timestamp),
    INDEX idx_user_time (user_id, timestamp),
    INDEX idx_action (action)
);

-- Partition by month for efficient retention
CREATE TABLE llm_audit_log_2026_03 PARTITION OF llm_audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

### Model Supply Chain Verification

```python
import hashlib

APPROVED_MODELS = {
    "gpt-4o-2024-08-06": {
        "provider": "openai",
        "approved_date": "2024-09-01",
        "risk_assessment": "RA-2024-087",
    },
    "claude-sonnet-4-20250514": {
        "provider": "anthropic",
        "approved_date": "2025-06-01",
        "risk_assessment": "RA-2025-012",
    },
}

def validate_model(model_id: str) -> dict:
    if model_id not in APPROVED_MODELS:
        return {"approved": False, "reason": f"model_not_in_allowlist: {model_id}"}
    return {"approved": True, **APPROVED_MODELS[model_id]}
```

---


## Baseline Security Checklist

Use this as a pre-launch gate. Every item should be verified before production.

- [ ] All user input passes structural validation, injection detection, and content moderation.
- [ ] System prompts are separated from user content via distinct message roles.
- [ ] System prompt contains explicit refusal instructions for override attempts.
- [ ] LLM output passes PII scrubbing and toxicity detection before reaching the user.
- [ ] RAG document ingestion includes malware scanning and secret detection.
- [ ] Retrieval queries are filtered by tenant ID and user access roles.
- [ ] Source citations are attached to every RAG-generated answer.
- [ ] Conversation history is isolated per tenant with enforced session boundaries.
- [ ] Per-user token budgets and per-tenant cost caps are enforced.
- [ ] API endpoints have NGINX or gateway-level rate limiting.
- [ ] Structured logs capture every LLM request with security metadata.
- [ ] Prometheus alerts fire on injection spikes, cost anomalies, and token abuse.
- [ ] Data retention policies are enforced with automated purge jobs.
- [ ] GDPR deletion workflow covers vector store, session store, and relational DB.
- [ ] Only approved models from the allowlist are callable in production.
- [ ] Audit log captures all security-relevant events with tenant and user context.

---


## Related Skills

- ai-agent-security (`ai-agent-security`) -- Agent-specific controls for autonomous tool-using systems.
- sast-scanning (`sast-scanning`) -- Static analysis to catch insecure coding patterns.

