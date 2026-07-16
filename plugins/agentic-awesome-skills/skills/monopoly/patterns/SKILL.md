---
name: patterns
description: Reference document for monopoly patterns.
source: community
risk: safe
reports-to: monopoly
---

# MONOPOLY — Design Patterns Deep Dive

## When to Use
- Use this skill when the task matches this description: Reference document for monopoly patterns.

## Table of Contents
1. CQRS
2. Event Sourcing
3. Saga Pattern
4. Circuit Breaker
5. Bulkhead
6. Strangler Fig
7. Sidecar / Service Mesh
8. Outbox Pattern
9. Consistent Hashing
10. Backpressure
11. Leader Election
12. Two-Phase Commit

---

## 1. CQRS (Command Query Responsibility Segregation)

**What it is:** Separate the read model (Query) from the write model (Command) into distinct services, databases, or code paths.

**When to use:**
- Read load is 10×+ write load (most web apps)
- Read queries are complex aggregations over write data
- Need to optimize read and write paths independently
- Domain model is complex (DDD contexts)

**Implementation:**
```
Write Path:  Client → Command API → Write DB (normalized, PostgreSQL)
Read Path:   Client → Query API  → Read DB (denormalized, Redis / Elasticsearch)
Sync:        Write DB → CDC (Debezium) → Message Queue → Read DB updater
```

**Trade-offs:**
- ✅ Independent scaling of read and write
- ✅ Optimized schemas for each operation type
- ❌ Eventual consistency between write and read models
- ❌ Increased complexity; two models to maintain

**Real-world users:** Amazon (order service), LinkedIn (feed)

---

## 2. Event Sourcing

**What it is:** Store state as a sequence of immutable events rather than current state. Rebuild current state by replaying events.

**When to use:**
- Full audit trail is a regulatory requirement (fintech, healthcare)
- Need to replay history for debugging or analytics
- Complex domain with many state transitions
- Need to derive multiple read projections from same data

**Implementation:**
```
Event Store: append-only log (Kafka, EventStoreDB)
Snapshots:   periodic snapshots to speed up state rebuild
Projections: consumers build read models from events
```

**Trade-offs:**
- ✅ Complete audit history; perfect for compliance
- ✅ Replay and time-travel debugging
- ❌ Querying current state requires projection maintenance
- ❌ Event schema evolution is hard
- ❌ High storage overhead over time

---

## 3. Saga Pattern

**What it is:** Manage distributed transactions across microservices via a sequence of local transactions, each publishing an event. If a step fails, compensating transactions undo previous steps.

**Two variants:**
- **Choreography:** Services react to events autonomously (decentralized)
- **Orchestration:** A central Saga Orchestrator coordinates steps (centralized)

**When to use:**
- Multi-service workflows where ACID across services is impossible
- Long-running business transactions (order → payment → inventory → shipping)
- Need rollback across service boundaries

**Choreography Example:**
```
OrderService creates order →
  [event: OrderCreated] →
    PaymentService charges card →
      [event: PaymentProcessed] →
        InventoryService reserves stock →
          [event: StockReserved] →
            ShippingService books courier
```

**Compensating Transactions (on failure):**
```
ShippingService fails →
  [event: ShippingFailed] →
    InventoryService releases stock →
      PaymentService refunds card →
        OrderService marks order failed
```

**Trade-offs:**
- ✅ No distributed locking; high availability
- ✅ Scales well across services
- ❌ Hard to debug; distributed trace required
- ❌ Compensating transactions are complex to implement correctly

---

## 4. Circuit Breaker

**What it is:** A proxy that monitors calls to a service. If failure rate exceeds threshold, the circuit "opens" and calls fail fast instead of waiting for timeout.

**States:**
```
CLOSED  → calls pass through; monitor failure rate
OPEN    → calls fail immediately; no calls to downstream
HALF-OPEN → let a probe call through; if success, close; if fail, stay open
```

**When to use:**
- Calling any external service (payment gateway, SMS, email)
- Microservices calling each other
- Preventing timeout cascade when downstream is slow

**Implementation tools:** Hystrix (deprecated), Resilience4j, Polly (.NET), Envoy proxy

**Thresholds (starting point):**
- Open after 50% failure rate over 10 requests
- Stay open for 30 seconds
- Half-open: allow 1 probe request

**Trade-offs:**
- ✅ Prevents cascade failures
- ✅ Gives downstream time to recover
- ❌ Adds latency overhead for monitoring
- ❌ Requires fallback behavior when circuit is open

---

## 5. Bulkhead

**What it is:** Isolate components so a failure in one doesn't consume resources of others. Named after the watertight compartments in ship hulls.

**Types:**
- **Thread Pool Bulkhead:** Separate thread pools per service call
- **Semaphore Bulkhead:** Limit concurrent calls per service
- **Process Bulkhead:** Separate processes/containers per service type

**When to use:**
- Multiple tenants sharing infrastructure (SaaS)
- One slow service consuming all connection pool slots
- Protecting critical services from being starved by non-critical ones

**Example:**
```
Without bulkhead:
  [Recommendation Service hangs] → fills shared thread pool → [Payment Service starves]

With bulkhead:
  [Recommendation Service hangs] → fills its own thread pool (10 threads) → [Payment Service unaffected, has its own 50 threads]
```

---

## 6. Strangler Fig Pattern

**What it is:** Incrementally replace a legacy monolith by routing new functionality to new microservices, while keeping the monolith alive for unchanged features.

**Migration steps:**
```
Phase 1: Deploy proxy in front of monolith (no user impact)
Phase 2: Route one feature to new microservice
Phase 3: Verify; deprecate that feature in monolith
Phase 4: Repeat for each feature
Phase 5: Monolith is empty; decommission
```

**When to use:**
- Migrating legacy monolith to microservices
- Can't do a big-bang rewrite (too risky)
- Need to ship new features during migration

**Trade-offs:**
- ✅ Zero downtime migration
- ✅ Incremental risk
- ❌ Dual maintenance burden during migration (monolith + new services)
- ❌ Proxy adds latency; must be managed carefully

---

## 7. Outbox Pattern

**What it is:** Solve the dual-write problem (write to DB AND publish to queue atomically) by writing the event to an "outbox" table in the same DB transaction, then having a separate process relay it to the queue.

**Problem it solves:**
```
❌ WRONG (dual-write race):
  BEGIN;
  UPDATE orders SET status='paid';
  COMMIT;
  // Crash here → event never published, DB and queue are inconsistent
  publish(PaymentProcessed);
```

```
✅ CORRECT (outbox):
  BEGIN;
  UPDATE orders SET status='paid';
  INSERT INTO outbox (event_type, payload) VALUES ('PaymentProcessed', {...});
  COMMIT;
  // Relay process reads outbox and publishes to Kafka
  // At-least-once delivery guaranteed; make consumers idempotent
```

**Relay options:** Debezium (CDC), polling relay, transaction log tailing

---

## 8. Consistent Hashing

**What it is:** A hashing scheme where adding or removing nodes requires only K/N keys to be remapped (K = keys, N = nodes), instead of remapping all keys.

**When to use:**
- Distributing cache keys across Redis cluster nodes
- Routing requests to servers in a distributed system
- Partitioning data across database nodes

**Virtual nodes:** Assign multiple positions per physical node on the hash ring to ensure even distribution even with few nodes.

---

## 9. Backpressure

**What it is:** A mechanism for consumers to signal producers to slow down when they can't keep up, preventing memory exhaustion and cascade failures.

**Strategies:**
- **Drop:** Discard overflow messages (acceptable for metrics, logs)
- **Buffer:** Queue up to a limit, then block or drop
- **Block:** Producer waits until consumer catches up (simplest, may cause timeout)
- **Rate Limit:** Throttle producers at ingestion point

**When to use:**
- Message queue consumers are slower than producers
- Real-time data pipeline ingestion spikes
- API rate limiting for upstream clients

---

## 10. Leader Election

**What it is:** In a distributed system, elect a single node to perform a privileged task (e.g., writing to DB, sending scheduled jobs, coordinating work).

**Algorithms:**
- **Raft:** Used by etcd, CockroachDB, Consul. Practical and well-understood.
- **ZooKeeper (ZAB):** Used by Kafka, HBase. Mature but operationally heavy.
- **Bully Algorithm:** Simple; highest ID wins. Not fault-tolerant.

**When to use:**
- Scheduled jobs that should only run once (cron replacement)
- Primary/replica database failover coordination
- Distributed lock management

**Tools:** etcd, ZooKeeper, Consul, Redis (Redlock — use with caution)

---

## 11. Two-Phase Commit (2PC)

**What it is:** A distributed algorithm that ensures all participants in a transaction either all commit or all abort.

**Phases:**
```
Phase 1 (Prepare): Coordinator asks all participants "can you commit?"
  All say YES → proceed to Phase 2
  Any says NO → abort

Phase 2 (Commit): Coordinator tells all participants to commit
```

**When to use (sparingly):**
- Strong consistency is an absolute requirement across services
- Data loss is catastrophic (financial settlements)

**Why to avoid:**
- Coordinator is a SPOF
- Blocks on participant failure
- Very low throughput under contention
- Prefer Saga Pattern in most microservice architectures

---

## 12. Read-Through / Write-Through / Write-Behind Cache

**Read-Through:**
```
Client → Cache (miss) → Cache fetches from DB → Returns to client
```
Cache is always populated on miss. Simple for clients. Risk: cold start.

**Write-Through:**
```
Client → Cache → Cache writes to DB synchronously → Confirms
```
Strong consistency. Higher write latency. Good for read-heavy with consistency need.

**Write-Behind (Write-Back):**
```
Client → Cache → Confirms immediately → Async flush to DB
```
Very low write latency. Risk of data loss if cache fails before flush. Good for high-throughput counters, analytics.

**Cache-Aside (Lazy Loading):**
```
Client → Cache (miss) → Client fetches from DB → Client writes to Cache
```
Most common. Application owns cache logic. Risk: thundering herd on cold start.


## Limitations
- This is a reference document and may not cover all edge cases. Always verify architectures before production.
