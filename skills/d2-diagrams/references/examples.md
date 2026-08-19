# Production D2 Diagram Examples

Tested, real-world examples demonstrating D2 patterns across multiple technical domains.

## Example 1: E-Commerce Microservices Architecture

```d2
direction: right

classes: {
  service: {
    style: {
      fill: "#e8f0fe"
      stroke: "#1a73e8"
      border-radius: 6
    }
  }
  database: {
    shape: cylinder
    style: {
      fill: "#e6f4ea"
      stroke: "#137333"
    }
  }
  queue: {
    shape: queue
    style: {
      fill: "#fef7e0"
      stroke: "#b06000"
    }
  }
}

users: End Users {
  shape: person
}

edge: Edge Layer {
  cloudflare: Cloudflare CDN & WAF { shape: cloud }
  kong: API Gateway { shape: hexagon }
}

services: Microservices Mesh {
  auth: Auth Service { class: service }
  orders: Order Service { class: service }
  payments: Payment Service { class: service }
  inventory: Inventory Service { class: service }
}

async_layer: Event Backbone {
  event_bus: Kafka Cluster { class: queue }
}

data_tier: Persistent Data {
  order_db: Orders DB (Postgres) { class: database }
  inventory_db: Inventory DB (Postgres) { class: database }
  redis_cache: Session Cache (Redis) { class: database }
}

users -> edge.cloudflare: HTTPS Traffic
edge.cloudflare -> edge.kong: Forward Verified Requests
edge.kong -> services.auth: Validate JWT
edge.kong -> services.orders: POST /orders
edge.kong -> services.inventory: GET /stock

services.auth -> data_tier.redis_cache: Token Lookup
services.orders -> data_tier.order_db: Save Order (PENDING)
services.orders -> services.payments: Call /charge (Sync)
services.orders -> async_layer.event_bus: Publish OrderPlaced
async_layer.event_bus -> services.inventory: Consume OrderPlaced
services.inventory -> data_tier.inventory_db: Decrement Stock
```

## Example 2: Real-Time Event-Driven Analytics Pipeline

```d2
direction: right

sources: Event Sources {
  iot: IoT Sensors { shape: rectangle }
  web_events: Clickstream Tracker { shape: page }
  mobile_sdk: Mobile App Telemetry { shape: page }
}

ingest: Ingestion Gateway {
  nlb: Network Load Balancer { shape: hexagon }
  kafka_in: Kafka Ingress Topic { shape: queue }
}

processing: Stream Processing Engine {
  flink: Apache Flink Jobs { shape: step }
  dead_letter: DLQ Error Topic { shape: queue; style.fill: "#fce8e6" }
}

storage: Analytical Warehouses {
  clickhouse: ClickHouse Realtime DB { shape: cylinder }
  s3_lake: S3 Parquet Lake { shape: cylinder }
}

dashboard: Analytics UI {
  superset: Apache Superset { shape: rectangle }
}

sources.iot -> ingest.nlb
sources.web_events -> ingest.nlb
sources.mobile_sdk -> ingest.nlb

ingest.nlb -> ingest.kafka_in: Stream
ingest.kafka_in -> processing.flink: Consume Partitions
processing.flink -> processing.dead_letter: On Validation Error
processing.flink -> storage.clickhouse: Hot Aggregations (1s window)
processing.flink -> storage.s3_lake: Cold Raw Storage (Parquet)

dashboard.superset -> storage.clickhouse: Live SQL Queries
```

## Example 3: User Authentication & Token Refresh Flow (Sequence)

```d2
auth_sequence: {
  shape: sequence_diagram

  user: Client App (SPA)
  api_gw: API Gateway
  auth_svc: Auth Service
  redis: Session Store

  user -> api_gw: 1. POST /login (User, Pass)
  api_gw -> auth_svc: 2. Authenticate Request
  auth_svc -> redis: 3. Verify User Hash & Create Session
  redis -> auth_svc: 4. Session Stored OK
  auth_svc -> api_gw: 5. Return Access Token (15m) + Refresh Token (7d)
  api_gw -> user: 6. 200 OK + Set-Cookie HTTPOnly

  user -> api_gw: 7. GET /api/v1/resource (Bearer Token)
  api_gw -> user: 8. 401 Unauthorized (Token Expired)

  user -> api_gw: 9. POST /refresh (Refresh Cookie)
  api_gw -> auth_svc: 10. Validate Refresh Token
  auth_svc -> redis: 11. Check Blacklist / Expiry
  redis -> auth_svc: 12. Token Active
  auth_svc -> api_gw: 13. Issue New Access Token
  api_gw -> user: 14. 200 OK (New Bearer Token)
}
```

## Example 4: SaaS Multi-Tenant Billing Database Schema (ERD)

```d2
tenants: {
  shape: sql_table
  id: uuid { constraint: primary_key }
  name: varchar(100)
  slug: varchar(50) { constraint: unique }
  created_at: timestamp
}

users: {
  shape: sql_table
  id: uuid { constraint: primary_key }
  tenant_id: uuid { constraint: foreign_key }
  email: varchar(255) { constraint: unique }
  role: varchar(30)
  status: varchar(20)
}

subscriptions: {
  shape: sql_table
  id: uuid { constraint: primary_key }
  tenant_id: uuid { constraint: foreign_key }
  stripe_customer_id: varchar(100)
  plan_tier: varchar(30)
  seat_count: int
  current_period_end: timestamp
}

invoices: {
  shape: sql_table
  id: uuid { constraint: primary_key }
  subscription_id: uuid { constraint: foreign_key }
  amount_cents: int
  status: varchar(30)
  invoice_pdf_url: text
  issued_at: timestamp
}

users.tenant_id -> tenants.id: belongs to
subscriptions.tenant_id -> tenants.id: billing for
invoices.subscription_id -> subscriptions.id: generated for
```
