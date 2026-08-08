# Task Queue Reference

Distributed task queue system, dead letter handling, and circuit breakers.

---

## Task Schema

```json
{
  "id": "uuid",
  "idempotencyKey": "hash-of-task-content",
  "type": "eng-backend|eng-frontend|ops-devops|...",
  "priority": 1-10,
  "dependencies": ["task-id-1", "task-id-2"],
  "payload": {
    "action": "implement|test|deploy|...",
    "target": "file/path or resource",
    "params": {},
    "goal": "What success looks like (high-level objective)",
    "constraints": ["No third-party deps", "Maintain backwards compat"],
    "context": {
      "relatedFiles": ["file1.ts", "file2.ts"],
      "architectureDecisions": ["ADR-001: Use JWT tokens"],
      "previousAttempts": "What was tried before, why it failed"
    }
  },
  "createdAt": "ISO",
  "claimedBy": null,
  "claimedAt": null,
  "timeout": 3600,
  "retries": 0,
  "maxRetries": 3,
  "backoffSeconds": 60,
  "lastError": null,
  "completedAt": null,
  "result": {
    "status": "success|failed",
    "output": "What was produced",
    "decisionReport": { ... }
  }
}
```

**Decision Report is REQUIRED for completed tasks.** Tasks without proper decision documentation will be marked as incomplete.

---

## Queue Files

```
.loki/queue/
+-- pending.json       # Tasks waiting to be claimed
+-- in-progress.json   # Currently executing tasks
+-- completed.json     # Finished tasks
+-- dead-letter.json   # Failed tasks for review
+-- cancelled.json     # Cancelled tasks
```

---

## Queue Operations

### Claim Task (with file locking)

```python
def claim_task(agent_id, agent_capabilities):
    with file_lock(".loki/state/locks/queue.lock", timeout=10):
        pending = read_json(".loki/queue/pending.json")

        # Find eligible task
        for task in sorted(pending.tasks, key=lambda t: -t.priority):
            if task.type not in agent_capabilities:
                continue
            if task.claimedBy and not claim_expired(task):
                continue
            if not all_dependencies_completed(task.dependencies):
                continue
            if circuit_breaker_open(task.type):
                continue

            # Claim it
            task.claimedBy = agent_id
            task.claimedAt = now()
            move_task(task, "pending", "in-progress")
            return task

        return None
```

### File Locking (Bash)

```bash
#!/bin/bash
# Atomic task claim using flock

QUEUE_FILE=".loki/queue/pending.json"
LOCK_FILE=".loki/state/locks/queue.lock"

(
  flock -x -w 10 200 || exit 1

  # Read, claim, write atomically
  TASK=$(jq -r '.tasks | map(select(.claimedBy == null)) | .[0]' "$QUEUE_FILE")
  if [ "$TASK" != "null" ]; then
    TASK_ID=$(echo "$TASK" | jq -r '.id')
    jq --arg id "$TASK_ID" --arg agent "$AGENT_ID" \
      '.tasks |= map(if .id == $id then .claimedBy = $agent | .claimedAt = now else . end)' \
      "$QUEUE_FILE" > "${QUEUE_FILE}.tmp" && mv "${QUEUE_FILE}.tmp" "$QUEUE_FILE"
    echo "$TASK_ID"
  fi

) 200>"$LOCK_FILE"
```

### Complete Task

```python
def complete_task(task_id, result, success=True):
    with file_lock(".loki/state/locks/queue.lock"):
        task = find_task(task_id, "in-progress")
        task.completedAt = now()
        task.result = result

        if success:
            move_task(task, "in-progress", "completed")
            reset_circuit_breaker(task.type)
            trigger_dependents(task_id)
        else:
            handle_failure(task)
```

---

## Failure Handling

### Exponential Backoff

```python
def handle_failure(task):
    task.retries += 1
    task.lastError = get_last_error()

    if task.retries >= task.maxRetries:
        # Move to dead letter queue
        move_task(task, "in-progress", "dead-letter")
        increment_circuit_breaker(task.type)
        alert_orchestrator(f"Task {task.id} moved to dead letter queue")
    else:
        # Exponential backoff: 60s, 120s, 240s, ...
        task.backoffSeconds = task.backoffSeconds * (2 ** (task.retries - 1))
        task.availableAt = now() + task.backoffSeconds
        move_task(task, "in-progress", "pending")
        log(f"Task {task.id} retry {task.retries}, backoff {task.backoffSeconds}s")
```

---

## Dead Letter Queue

Tasks in dead letter queue require manual review:

### Review Process

1. Read `.loki/queue/dead-letter.json`
2. For each task:
   - Analyze `lastError` and failure pattern
   - Determine if:
     - Task is invalid -> delete
     - Bug in agent -> fix agent, retry
     - External dependency down -> wait, retry
     - Requires human decision -> escalate
3. To retry: move task back to pending with reset retries
4. Log decision in `.loki/logs/decisions/dlq-review-{date}.md`

---

## Idempotency

```python
def enqueue_task(task):
    # Generate idempotency key from content
    task.idempotencyKey = hash(json.dumps(task.payload, sort_keys=True))

    # Check if already exists
    for queue in ["pending", "in-progress", "completed"]:
        existing = find_by_idempotency_key(task.idempotencyKey, queue)
        if existing:
            log(f"Duplicate task detected: {task.idempotencyKey}")
            return existing.id  # Return existing, don't create duplicate

    # Safe to create
    save_task(task, "pending")
    return task.id
```

---

## Task Cancellation

```python
def cancel_task(task_id, reason):
    with file_lock(".loki/state/locks/queue.lock"):
        for queue in ["pending", "in-progress"]:
            task = find_task(task_id, queue)
            if task:
                task.cancelledAt = now()
                task.cancelReason = reason
                move_task(task, queue, "cancelled")

                # Cancel dependent tasks too
                for dep_task in find_tasks_depending_on(task_id):
                    cancel_task(dep_task.id, f"Parent {task_id} cancelled")

                return True
        return False
```

---

## Circuit Breakers

### State Schema

```json
{
  "circuitBreakers": {
    "eng-backend": {
      "state": "closed",
      "failures": 0,
      "lastFailure": null,
      "openedAt": null,
      "halfOpenAt": null
    }
  }
}
```

### States

| State | Description | Behavior |
|-------|-------------|----------|
| **closed** | Normal operation | Tasks flow normally |
| **open** | Too many failures | Block all tasks of this type |
| **half-open** | Testing recovery | Allow 1 test task |

### Configuration

```yaml
# .loki/config/circuit-breakers.yaml
defaults:
  failureThreshold: 5
  cooldownSeconds: 300
  halfOpenAfter: 60

overrides:
  ops-security:
    failureThreshold: 3  # More sensitive for security
  biz-marketing:
    failureThreshold: 10  # More tolerant for non-critical
```

### Implementation

```python
def check_circuit_breaker(agent_type):
    cb = load_circuit_breaker(agent_type)

    if cb.state == "closed":
        return True  # Proceed

    if cb.state == "open":
        if now() > cb.openedAt + config.halfOpenAfter:
            cb.state = "half-open"
            save_circuit_breaker(cb)
            return True  # Allow test task
        return False  # Still blocking

    if cb.state == "half-open":
        return False  # Already testing, wait

def on_task_success(agent_type):
    cb = load_circuit_breaker(agent_type)
    if cb.state == "half-open":
        cb.state = "closed"
        cb.failures = 0
    save_circuit_breaker(cb)

def on_task_failure(agent_type):
    cb = load_circuit_breaker(agent_type)
    cb.failures += 1
    cb.lastFailure = now()

    if cb.state == "half-open" or cb.failures >= config.failureThreshold:
        cb.state = "open"
        cb.openedAt = now()
        alert_orchestrator(f"Circuit breaker OPEN for {agent_type}")

    save_circuit_breaker(cb)
```

---

## Rate Limit Handling

### Detection

```python
def detect_rate_limit(error):
    indicators = [
        "rate limit",
        "429",
        "too many requests",
        "quota exceeded",
        "retry-after"
    ]
    return any(ind in str(error).lower() for ind in indicators)
```

### Response Protocol

```python
def handle_rate_limit(agent_id, error):
    # 1. Save state checkpoint
    checkpoint_state(agent_id)

    # 2. Calculate backoff
    retry_after = parse_retry_after(error) or calculate_exponential_backoff()

    # 3. Log and wait
    log(f"Rate limit hit for {agent_id}, waiting {retry_after}s")

    # 4. Signal other agents to slow down
    broadcast_signal("SLOWDOWN", {"wait": retry_after / 2})

    # 5. Resume after backoff
    schedule_resume(agent_id, retry_after)
```

### Exponential Backoff

```python
def calculate_exponential_backoff(attempt=1, base=60, max_wait=3600):
    wait = min(base * (2 ** (attempt - 1)), max_wait)
    jitter = random.uniform(0, wait * 0.1)
    return wait + jitter
```

---

## Priority System

| Priority | Use Case | Example |
|----------|----------|---------|
| 10 | Critical blockers | Security vulnerability fix |
| 8-9 | High priority | Core feature implementation |
| 5-7 | Normal | Standard tasks |
| 3-4 | Low priority | Documentation, cleanup |
| 1-2 | Background | Nice-to-have improvements |

Tasks are always processed in priority order within their type.
