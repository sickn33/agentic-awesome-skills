# Section Definitions

This file defines the rule categories for DBOS Go best practices. Rules are automatically assigned to sections based on their filename prefix.

---

## 1. Lifecycle (lifecycle)
**Impact:** CRITICAL
**Description:** DBOS configuration, initialization, and launch patterns. Foundation for all DBOS applications.

## 2. Workflow (workflow)
**Impact:** CRITICAL
**Description:** Workflow creation, determinism requirements, background execution, and workflow IDs.

## 3. Step (step)
**Impact:** HIGH
**Description:** Step creation, retries, concurrent steps with Go/Select, and when to use steps vs workflows.

## 4. Queue (queue)
**Impact:** HIGH
**Description:** Queue creation, concurrency limits, rate limiting, partitioning, and priority.

## 5. Communication (comm)
**Impact:** MEDIUM
**Description:** Workflow events, messages, and streaming for inter-workflow communication.

## 6. Pattern (pattern)
**Impact:** MEDIUM
**Description:** Common patterns including idempotency, scheduled workflows, debouncing, and durable sleep.

## 7. Testing (test)
**Impact:** LOW-MEDIUM
**Description:** Testing DBOS applications with Go's testing package, mocks, and integration test setup.

## 8. Client (client)
**Impact:** MEDIUM
**Description:** DBOS Client for interacting with DBOS from external applications.

## 9. Advanced (advanced)
**Impact:** LOW
**Description:** Workflow versioning, patching, and safe code upgrades.
