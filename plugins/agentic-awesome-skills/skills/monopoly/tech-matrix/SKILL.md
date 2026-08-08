---
name: tech-matrix
description: Reference document for monopoly tech-matrix.
source: community
risk: safe
reports-to: monopoly
---

# MONOPOLY — Technology Decision Matrix

## When to Use
- Use this skill when the task matches this description: Reference document for monopoly tech-matrix.

## Table of Contents
1. Database Selection
2. Cache Selection
3. Message Queue / Event Streaming
4. API Protocol
5. Search Engine
6. Object Storage
7. Container Orchestration
8. Load Balancer
9. Observability Stack
10. CDN

---

## 1. Database Selection

### Relational (SQL)

| Database | Best For | Avoid When | Scale Ceiling |
|----------|----------|------------|---------------|
| **PostgreSQL** | Complex queries, JSONB, GIS, strong consistency, most default use cases | Ultra-high write throughput (>100K writes/s) | ~10TB single node; use Citus for horizontal |
| **MySQL / MariaDB** | Read-heavy apps, legacy systems, WordPress/Drupal ecosystem | Complex queries, full ACID at scale | ~10TB; use Vitess for sharding |
| **CockroachDB** | Global distributed SQL, geo-partitioning, multi-region | Simple single-region apps (overkill) | Petabyte-scale |
| **PlanetScale** | MySQL-compatible, serverless, branch-based workflow | Complex JOINs (foreign keys removed by design) | Very high — Vitess based |
| **Amazon Aurora** | AWS-native apps, managed PostgreSQL/MySQL, high availability | Non-AWS environments | Up to 128TB, 15 replicas |

### NoSQL

| Database | Best For | Avoid When | Scale Ceiling |
|----------|----------|------------|---------------|
| **MongoDB** | Flexible schema, document model, prototyping | Financial transactions requiring ACID | Petabyte-scale with sharding |
| **DynamoDB** | Key-value at massive scale, AWS-native, serverless, predictable latency | Complex queries, ad-hoc analytics, JOINs | Unlimited (AWS-managed) |
| **Cassandra** | Write-heavy, time-series, wide-column, geographically distributed | Read-heavy with complex queries | Petabyte-scale; used at Apple, Netflix |
| **Redis** | Cache, sessions, leaderboards, pub/sub, rate limiting | Primary data store for complex models | ~1TB per node; cluster for more |
| **Elasticsearch** | Full-text search, log aggregation, analytics | Primary database (durability risk) | Petabyte-scale with clusters |
| **InfluxDB** | Time-series metrics, IoT, monitoring data | General-purpose data | Very high write throughput |
| **Neo4j** | Graph data, social networks, recommendation engines, fraud detection | Non-graph data (overhead not worth it) | Billions of nodes |

### Decision Framework

```
Is your data relational (joins, foreign keys, transactions)?
  YES → Start with PostgreSQL
  NO  → Continue below

Is your primary access pattern key-value?
  YES, need extreme scale → DynamoDB or Cassandra
  YES, need speed/cache → Redis

Is your data document-shaped (nested, flexible schema)?
  YES → MongoDB

Is it time-series (metrics, logs, IoT)?
  YES → InfluxDB or TimescaleDB

Is it graph (relationships are the data)?
  YES → Neo4j

Is it search?
  YES → Elasticsearch / OpenSearch
```

---

## 2. Cache Selection

| Technology | Best For | Max Single Node | Cluster Support |
|------------|----------|----------------|----------------|
| **Redis** | Sessions, leaderboards, pub/sub, complex data structures, Lua scripting | ~1TB RAM | Yes (Redis Cluster, Redis Sentinel) |
| **Memcached** | Simple key-value, multi-threaded, large object cache | ~64GB RAM | Yes (client-side sharding) |
| **Varnish** | HTTP reverse proxy cache, full-page caching | RAM bound | Limited |
| **CloudFront / CDN** | Static assets, edge caching globally | N/A (distributed) | Built-in global distribution |

**Default recommendation: Redis** — more features, better ecosystem, active development.

Use **Memcached** only when: you need multi-threading for CPU-bound caching workloads and don't need data structures beyond string.

---

## 3. Message Queue / Event Streaming

| Technology | Model | Best For | Throughput | Retention |
|------------|-------|----------|------------|-----------|
| **Apache Kafka** | Log-based streaming | Event sourcing, high-throughput pipelines, replay, audit | Millions msg/s | Days to forever |
| **RabbitMQ** | AMQP message broker | Task queues, RPC, routing, fanout | 50K–100K msg/s | Until consumed |
| **AWS SQS** | Managed queue | AWS-native, simple task queue, serverless | Very high (managed) | Up to 14 days |
| **AWS SNS** | Pub/sub notification | Fan-out to many subscribers (email, SMS, Lambda, SQS) | Very high (managed) | No retention |
| **Google Pub/Sub** | Managed streaming | GCP-native, global, serverless | Very high (managed) | Up to 7 days |
| **Redis Pub/Sub** | In-memory pub/sub | Real-time notifications, low latency, fire-and-forget | Very high | None (no retention) |
| **NATS** | Lightweight messaging | IoT, microservices, low latency | Very high | JetStream adds retention |

### Decision Matrix

```
Need event replay / audit trail?
  YES → Kafka or Kinesis

Need simple task queue with retries and DLQ?
  AWS shop → SQS
  Self-hosted → RabbitMQ

Need real-time pub/sub with no persistence?
  Redis Pub/Sub or NATS

Need fan-out to multiple consumers?
  Kafka (consumer groups) or SNS → SQS fan-out

Need < 5 minutes guaranteed delivery, AWS-native, zero ops?
  SQS

Volume > 1 million messages/second?
  Kafka (self-hosted) or Kinesis (managed)
```

---

## 4. API Protocol

| Protocol | Best For | Avoid When |
|----------|----------|------------|
| **REST (HTTP/JSON)** | Public APIs, CRUD, browser clients, simplicity | Strict typing required; high-performance internal services |
| **GraphQL** | Complex client data requirements, mobile (reduce over-fetching), BFF pattern | Simple CRUD; not worth the complexity |
| **gRPC (HTTP/2 + Protobuf)** | Internal microservice communication, low latency, strict contracts, streaming | Public browser APIs (needs gRPC-web) |
| **WebSocket** | Real-time bidirectional (chat, live dashboards, multiplayer games) | One-way server push (use SSE instead) |
| **SSE (Server-Sent Events)** | Server → client push (notifications, live feeds) | Bidirectional communication |
| **GraphQL Subscriptions** | Real-time with GraphQL schema consistency | Simple push scenarios |

**Default recommendation:**
- External / public: **REST**
- Internal service-to-service: **gRPC**
- Real-time features: **WebSocket** or **SSE**

---

## 5. Search Engine

| Technology | Best For | Avoid When |
|------------|----------|------------|
| **Elasticsearch** | Full-text search, log analytics (ELK), complex aggregations | Simple lookups; operational overhead is high |
| **OpenSearch** | AWS-native Elasticsearch alternative | Non-AWS preferred setups |
| **Typesense** | Simple, fast full-text search, typo tolerance, easy ops | Complex aggregations at massive scale |
| **Algolia** | Managed search-as-a-service, fast setup, great UI | High volume (expensive); self-hosted preference |
| **Meilisearch** | Self-hosted, developer-friendly, fast relevancy | Enterprise-scale analytics |
| **PostgreSQL FTS** | Basic full-text search, already using PostgreSQL | High relevancy requirements or large datasets |

**Rule of thumb:** Use PostgreSQL FTS under 1M documents. Move to Typesense or Elasticsearch above that.

---

## 6. Object Storage

| Service | Best For | Egress Cost |
|---------|----------|------------|
| **AWS S3** | AWS-native apps, de facto standard, massive ecosystem | $0.09/GB (expensive) |
| **Cloudflare R2** | S3-compatible, **zero egress cost**, global | $0.00 egress |
| **GCS** | GCP-native | $0.12/GB |
| **Azure Blob** | Azure-native | $0.087/GB |
| **Backblaze B2** | Cost-sensitive, S3-compatible | Free with Cloudflare |
| **MinIO** | Self-hosted S3-compatible | Self-managed |

**Cost optimization tip:** Use **Cloudflare R2** for user-facing media delivery (zero egress). Use **S3** for internal/AWS-integrated storage.

---

## 7. Container Orchestration

| Technology | Best For | Avoid When |
|------------|----------|------------|
| **Kubernetes (K8s)** | Large teams, complex deployments, multi-cloud, full control | Small teams (ops overhead is very high) |
| **AWS ECS + Fargate** | AWS-native, serverless containers, simpler than K8s | Multi-cloud or K8s ecosystem tools needed |
| **AWS EKS** | Managed K8s on AWS, best of both | Small teams; Fargate may be enough |
| **GKE (Google)** | Best managed K8s, GCP-native, Autopilot mode | Non-GCP environments |
| **Docker Compose** | Local dev, small single-server deployments | Production at any meaningful scale |
| **Nomad** | HashiCorp ecosystem, simpler than K8s, multi-workload | K8s ecosystem tools required |

**Startup default:** ECS + Fargate (zero cluster management).
**Scale default:** EKS or GKE once team > 5 engineers or services > 10.

---

## 8. Load Balancer

| Technology | Layer | Best For |
|------------|-------|----------|
| **AWS ALB** | L7 (HTTP/HTTPS) | AWS apps, path-based routing, WebSocket, HTTP/2 |
| **AWS NLB** | L4 (TCP/UDP) | Ultra-low latency, static IP, non-HTTP protocols |
| **GCP GLB** | L7 global | GCP apps, global anycast, single IP worldwide |
| **Nginx** | L4/L7 | Self-hosted, reverse proxy, flexible config |
| **HAProxy** | L4/L7 | High performance self-hosted, advanced routing |
| **Cloudflare** | L7 global + DDoS | DDoS protection + CDN + load balancing combined |
| **Traefik** | L7 | Kubernetes-native, automatic SSL, service discovery |

---

## 9. Observability Stack

### Metrics
| Tool | Best For |
|------|----------|
| **Prometheus + Grafana** | Self-hosted, open-source, Kubernetes-native |
| **Datadog** | Managed, APM + infra + logs unified, expensive |
| **CloudWatch** | AWS-native, zero setup, integrated with AWS services |
| **New Relic** | APM-focused, good for application-level insights |

### Logging
| Tool | Best For |
|------|----------|
| **ELK Stack** (Elasticsearch + Logstash + Kibana) | Self-hosted, powerful, high volume |
| **Loki + Grafana** | Lightweight, Kubernetes-native, cheap |
| **Splunk** | Enterprise, compliance, expensive |
| **AWS CloudWatch Logs** | AWS-native, zero setup |
| **Datadog Logs** | Unified with metrics, expensive |

### Distributed Tracing
| Tool | Best For |
|------|----------|
| **Jaeger** | Open-source, Kubernetes-native, OpenTelemetry |
| **Zipkin** | Simple, lightweight, good integrations |
| **AWS X-Ray** | AWS-native, integrates with Lambda, ECS |
| **Datadog APM** | Managed, unified with metrics and logs |
| **Honeycomb** | High-cardinality event-based observability |

**Recommended open-source stack:** Prometheus + Grafana + Loki + Jaeger (all integrate via OpenTelemetry)
**Recommended managed stack:** Datadog (expensive but unified) or Grafana Cloud

---

## 10. CDN

| Technology | Best For | Edge Locations |
|------------|----------|----------------|
| **Cloudflare** | DDoS protection + CDN + DNS, best free tier, edge workers | 300+ |
| **AWS CloudFront** | AWS-native, deep S3 and API GW integration | 450+ |
| **Akamai** | Enterprise, highest performance, expensive | 4000+ |
| **Fastly** | Real-time purging, streaming, VCL customization | 90+ |
| **Vercel Edge / Netlify** | Jamstack, frontend-first, zero config | 100+ |

**Default recommendation:** Cloudflare for most use cases (best value, DDoS included, free SSL, Workers for edge compute).

---

## Scale Benchmarks Quick Reference

| Technology | Write Throughput | Read Throughput | Notes |
|------------|-----------------|----------------|-------|
| PostgreSQL (single) | ~10K writes/s | ~50K reads/s | With connection pooling |
| PostgreSQL (replicas) | ~10K writes/s | ~200K reads/s | 4 replicas |
| MySQL (single) | ~15K writes/s | ~60K reads/s | |
| Cassandra | ~1M writes/s | ~500K reads/s | 10-node cluster |
| Redis | ~1M ops/s | ~1M ops/s | Single node in-memory |
| Kafka | ~1M msgs/s | ~1M msgs/s | Per partition |
| Elasticsearch | ~50K docs/s | ~10K queries/s | Per node |
| MongoDB | ~50K writes/s | ~100K reads/s | Per replica set |

*All benchmarks are approximate and depend heavily on hardware, payload size, and query complexity.*


## Limitations
- This is a reference document and may not cover all edge cases. Always verify architectures before production.
