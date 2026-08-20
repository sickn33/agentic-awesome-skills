# D2 Diagram Types and Use Cases

Practical templates and architectural patterns for major diagram formats in D2 (compatible with D2 v0.6.8+).

## 1. System Architecture & Flowcharts

Used for microservices, user request routing, and conditional business logic.

### Key Rules
- Group components by logical tier (edge, services, data).
- Use `diamond` for decision gates.
- Explicitly label branch decisions (`Yes`, `No`, `Success`, `Error`).

### Template

```d2
direction: down

start: Start Process { shape: circle; style.fill: "#e6f4ea" }
input_check: Valid Input? { shape: diamond; style.fill: "#fef7e0" }
process: Execute Job { shape: rectangle; style.fill: "#e8f0fe" }
error_handler: Log Error & Alert { shape: rectangle; style.fill: "#fce8e6" }
finish: Complete { shape: circle; style.fill: "#e6f4ea" }

start -> input_check
input_check -> process: Yes
input_check -> error_handler: No
process -> finish: Success
error_handler -> finish: Handled
```

## 2. Cloud Infrastructure and Microservices

Used for VPC layouts, Kubernetes pods, and distributed services.

### Key Rules
- Use containers for boundary isolation (VPCs, namespaces, security zones).
- Use standard semantic shapes (`hexagon` for gateways, `cylinder` for databases, `queue` for message brokers).
- Always use dotted paths (`tier.service`) when connecting nodes across containers.

### Template

```d2
direction: right

clients: Client Layer {
  web: Web Application { shape: page }
  mobile: Mobile App { shape: page }
}

edge: Edge Layer {
  cdn: CDN { shape: cloud }
  gw: API Gateway { shape: hexagon }
}

services: Microservices {
  auth: Auth Service
  orders: Order Service
  inventory: Inventory Service
}

storage: Data Layer {
  order_db: Orders DB { shape: cylinder }
  inv_db: Inventory DB { shape: cylinder }
  kafka: Event Stream { shape: queue }
}

clients.web -> edge.cdn
clients.mobile -> edge.gw
edge.cdn -> edge.gw: Cache Miss
edge.gw -> services.auth: Validate Token
edge.gw -> services.orders: Place Order
services.orders -> storage.order_db: Persist
services.orders -> storage.kafka: Emit OrderCreated
storage.kafka -> services.inventory: Consume Event
services.inventory -> storage.inv_db: Update Stock
```

## 3. Sequence Diagrams

Used for API handshakes, authentication protocols, and distributed transactions.

### Key Rules
- Set `shape: sequence_diagram` on the enclosing container.
- Declare actors/participants at the top of the container.
- Connection sequence in the code defines the timeline from top to bottom.

### Template

```d2
oauth_flow: {
  shape: sequence_diagram

  user: User Browser
  app: Client App
  auth_server: OAuth Server
  api: Resource API

  user -> app: Click "Login with Google"
  app -> auth_server: Redirect to /authorize
  auth_server -> user: Present Login & Consent Screen
  user -> auth_server: Submit Credentials & Approve
  auth_server -> app: Callback with Auth Code
  app -> auth_server: POST /token (Code + Secret)
  auth_server -> app: Return Access & ID Tokens
  app -> api: GET /profile (Bearer Token)
  api -> app: Return User Profile Data
}
```

## 4. Entity-Relationship Diagrams (ERDs)

Used for relational databases, schema migrations, and domain models.

### Key Rules
- Set `shape: sql_table` on entity containers.
- List column names followed by types.
- Annotate keys with `{ constraint: primary_key }` or `{ constraint: foreign_key }`.

### Template

```d2
customers: {
  shape: sql_table
  id: int { constraint: primary_key }
  name: varchar(100)
  email: varchar(255) { constraint: unique }
  created_at: timestamp
}

subscriptions: {
  shape: sql_table
  id: int { constraint: primary_key }
  customer_id: int { constraint: foreign_key }
  plan_code: varchar(50)
  active: boolean
  renew_date: date
}

invoices: {
  shape: sql_table
  id: int { constraint: primary_key }
  subscription_id: int { constraint: foreign_key }
  amount_cents: int
  paid_at: timestamp
}

subscriptions.customer_id -> customers.id: belongs to
invoices.subscription_id -> subscriptions.id: generated for
```

## 5. CI/CD and Deployment Pipelines

Used for GitHub Actions workflows, build artifact flows, and deployment stages.

### Key Rules
- Use `direction: right` for left-to-right flow.
- Use `step` for pipeline tasks, `package` for artifacts, and `rectangle` for target clusters.

### Template

```d2
direction: right

developer: Engineer { shape: person }
git: GitHub Repo { shape: cloud }

pipeline: CI/CD Runner {
  build: Build Artifacts { shape: step }
  unit_test: Unit Tests { shape: step }
  security_scan: SAST Security Scan { shape: step }
  docker_build: Build Container Image { shape: step }
}

registry: Image Registry { shape: package }
staging: Staging Cluster { shape: rectangle }
prod: Production Cluster { shape: rectangle }

developer -> git: git push main
git -> pipeline.build: Trigger Webhook
pipeline.build -> pipeline.unit_test
pipeline.unit_test -> pipeline.security_scan
pipeline.security_scan -> pipeline.docker_build
pipeline.docker_build -> registry: Push Tagged Image
registry -> staging: Deploy Automatic
staging -> prod: Manual Approval Gate
```

## 6. State Machines and Lifecycle Diagrams

Used for entity states, order statuses, and protocol lifecycles.

### Key Rules
- Use `circle` or `oval` for states.
- Quote special labels like `"[*]"` to avoid conflicting with array syntax.
- Explicitly mark initial and terminal states.
- Label every transition with the triggering event or condition.

### Template

```d2
direction: down

initial: "[*]" { shape: circle }
pending: Pending Payment { shape: oval }
processing: Processing Order { shape: oval }
shipped: Shipped { shape: oval }
delivered: Delivered { shape: oval }
cancelled: Cancelled { shape: oval; style.fill: "#fce8e6" }

initial -> pending: Order Submitted
pending -> processing: Payment Captured
pending -> cancelled: Payment Failed / Timeout
processing -> shipped: Dispatch to Courier
processing -> cancelled: Out of Stock Refund
shipped -> delivered: Courier Confirms Receipt
```
