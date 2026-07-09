---
name: scale-benchmarks
description: Reference document for monopoly scale-benchmarks.
source: community
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
Storage per day    = requests_per_day × avg_payload_size
Storage per year   = storage_per_day × 365
With replication   = storage_per_year × replication_factor (3× typical)
With CDN/cache     = reduce by cache_hit_ratio (80% hit = 20% origin load)

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

## Known Scale Limits of Common Technologies

### Databases

| Technology | Single Node Writes | Reads (with replicas) | Recommended Shard/Cluster Trigger |
|------------|-------------------|----------------------|----------------------------------|
| PostgreSQL | ~5K–20K writes/s | ~50K–200K reads/s | >5TB data or >20K writes/s |
| MySQL | ~10K–25K writes/s | ~60K–250K reads/s | >5TB or >25K writes/s |
| MongoDB | ~20K–50K writes/s | ~50K–100K reads/s | >100GB or >50K writes/s |
| Cassandra | ~200K–1M writes/s | ~200K–500K reads/s | Almost never needs explicit sharding |
| DynamoDB | Unlimited (managed) | Unlimited (managed) | Use provisioned capacity mode |
| Redis | ~500K–1M ops/s | Same | >50GB data or cluster needed |
| Elasticsearch | ~10K–50K docs/s | ~1K–10K queries/s | >100M documents per index |

### Queues / Streams

| Technology | Max Throughput | Max Consumers | Retention |
|------------|----------------|---------------|-----------|
| Kafka | 1M+ msgs/s per cluster | Unlimited consumer groups | Configurable (days–forever) |
| RabbitMQ | ~50K–100K msgs/s | Limited by connections | Until consumed |
| SQS Standard | Unlimited (AWS-managed) | Unlimited | 14 days |
| SQS FIFO | 3K msgs/s per queue | Per group | 14 days |
| Redis Pub/Sub | ~1M msgs/s | Limited by subscribers | None (fire-and-forget) |

### Caching

| Technology | Max Memory (single) | Max Throughput | Latency |
|------------|--------------------|--------------|----|
| Redis | ~1TB RAM | ~1M ops/s | <1ms |
| Memcached | ~64GB RAM | ~1M ops/s | <1ms |
| In-process (Caffeine/Guava) | JVM heap | Unlimited (local) | <0.1ms |

---

## Capacity Planning by User Scale

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
| 99% | Basic | 7.2 hours/month |
| 99.9% (three nines) | Standard production | 43.8 minutes/month |
| 99.95% | Important services | 21.9 minutes/month |
| 99.99% (four nines) | Critical services | 4.38 minutes/month |
| 99.999% (five nines) | Telecom / payments | 26 seconds/month |

**Achieving four nines requires:** Multi-AZ deployment, automated failover, zero-downtime deploys, chaos engineering, 24/7 on-call.

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
