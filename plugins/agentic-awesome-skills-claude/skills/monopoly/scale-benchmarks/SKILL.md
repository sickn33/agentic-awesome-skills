---
name: scale-benchmarks
description: Reference document for monopoly scale-benchmarks.
source: community
date_added: "2026-06-14"
risk: safe
reports-to: monopoly
---

# MONOPOLY — Scale Benchmarks & Estimation Formulas

## When to Use
- Use this skill when the task matches this description: Reference document for monopoly scale-benchmarks.

## Quick Estimation Formulas

### User → RPS Conversion
```
Requests per second (avg) = DAU × avg_requests_per_user_per_day / 86400
Requests per second (peak) = avg_RPS × peak_multiplier

Peak multipliers by app type:
  Social media:      5–10×
  E-commerce:        3–5× (higher during sales)
  News / media:      10–20× (breaking news spike)
  B2B SaaS:          2–3× (business hours spike)
  Gaming:            5–15× (event-driven)
```

### Storage Estimation
```
Storage per day    = persisted_writes_per_day × stored_bytes_per_write
Storage per year   = storage_per_day × 365
With replication   = storage_per_year × replication_factor (3× typical)
Cache affects origin request load, not durable storage: estimate cache storage separately

Common payload sizes:
  Tweet / short text:    500B
  Social post with text: 2KB
  Profile data:          5KB
  Image (compressed):    200KB–2MB
  Video (per minute):    50MB (720p), 150MB (1080p)
  API JSON response:     1–20KB
```

### Bandwidth Estimation
```
Inbound bandwidth  = avg_request_size × RPS
Outbound bandwidth = avg_response_size × RPS

Convert: 1 Gbps = 125 MB/s
         10 Gbps = 1.25 GB/s
```

---

## Establishing capacity limits

There are no universal per-product throughput, memory or sharding limits without a tested workload. Record exact version/topology, hardware, record sizes, indexes, durability/replication, query mix, concurrency and p95/p99 latency/error targets. Increase load against representative data until a measured saturation constraint appears, then test a change and failover headroom.

Managed services still have account, partition, regional and API quotas. SQS retention is configurable up to 14 days; throughput varies by queue type, region, batching and high-throughput settings. Do not label managed databases or queues unlimited. Kafka throughput depends on partitions, brokers, payload and durability; consumers in a group are limited by assigned partitions. In-memory caches are bounded by available memory, item/object overhead, eviction, network and workload.

## Illustrative Capacity Scenarios

The following DAU/RPS/storage/server/cost ranges are unvalidated teaching assumptions, not benchmarks, quotes or required architectures. Recompute from requests per user, durable-write fraction, bytes/retention and dated regional pricing, including egress, support, backups and operations.

### 1K DAU
```
Avg RPS:       ~1–5 RPS
Peak RPS:      ~10–50 RPS
DB size/year:  ~10–50GB
Infra needed:  Single server, managed DB (RDS t3.medium), basic CDN
Monthly cost:  $50–200
```

### 10K DAU
```
Avg RPS:       ~10–50 RPS
Peak RPS:      ~100–500 RPS
DB size/year:  ~100–500GB
Infra needed:  2–4 app servers, RDS r5.large, Redis t3.medium, CDN
Monthly cost:  $300–800
```

### 100K DAU
```
Avg RPS:       ~100–500 RPS
Peak RPS:      ~1K–5K RPS
DB size/year:  ~1–5TB
Infra needed:  ASG (5–10 app servers), RDS r5.xlarge + 2 replicas, Redis cluster, CDN, ALB
Monthly cost:  $2K–8K
```

### 1M DAU
```
Avg RPS:       ~1K–5K RPS
Peak RPS:      ~10K–50K RPS
DB size/year:  ~10–50TB
Infra needed:  ASG (20–50 servers), DB sharding or Aurora, Redis cluster, Kafka, CDN, WAF
Monthly cost:  $20K–80K
```

### 10M DAU
```
Avg RPS:       ~10K–50K RPS
Peak RPS:      ~100K–500K RPS
DB size/year:  ~100–500TB
Infra needed:  Multi-region, microservices, distributed DB (Cassandra/CockroachDB), full CDN, dedicated SRE
Monthly cost:  $200K–2M+
```

---

## Common SLO Targets

| Tier | Availability | Monthly Downtime Allowed |
|------|-------------|--------------------------|
| 99% | Basic | 7.3 hours/month |
| 99.9% (three nines) | Standard production | 43.8 minutes/month |
| 99.95% | Important services | 21.9 minutes/month |
| 99.99% (four nines) | Critical services | 4.38 minutes/month |
| 99.999% (five nines) | Telecom / payments | 26 seconds/month |

**Possible reliability measures to evaluate against a defined SLI/window (not a guarantee or universal requirement):** Multi-AZ deployment, automated failover, zero-downtime deploys, chaos engineering, 24/7 on-call.

---

## Latency Budget Guidelines

```
User perceived latency targets:
  < 100ms  → Feels instant
  100–300ms → Acceptable for most interactions
  300ms–1s → Noticeable; optimize if possible
  > 1s     → Frustrating; unacceptable for critical paths

Network latency by distance (approximate):
  Same datacenter:    0.5ms
  Same region (AZ):   1–2ms
  Cross-region US:    30–60ms
  US to Europe:       80–120ms
  US to Asia:         150–250ms

Database query targets:
  Simple key-value:   < 1ms (cache)
  Simple DB query:    < 5ms
  Complex query:      < 50ms
  Reporting query:    < 500ms (async if > 1s)
```


## Limitations
- This is a reference document and may not cover all edge cases. Always verify architectures before production.
