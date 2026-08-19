# D2 Diagram Types and Patterns

Standard patterns and templates for common technical, architectural, and process diagrams in D2.

## 1. Flowcharts and Decision Trees

Used for business logic, error handling, algorithm workflows, and branching processes.

### Key Rules
- Use `diamond` shapes for conditions.
- Label both branches clearly (`yes` / `no`, `success` / `failure`).
- Use `oval` or `circle` for start/end terminals.

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

## 2. Microservices and System Architecture

Used for multi-tier applications, cloud topologies, and service interactions.

### Key Rules
- Group by architectural layers (Client, Gateway, Services, Data Stores).
- Use `cylinder` for databases, `queue` for message buses, and `hexagon` for gateways.
- Keep data store calls distinct from inter-service RPC calls.

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

Used for temporal interaction, protocol handshakes, and API communication flows.

### Key Rules
- Declare `shape: sequence_diagram` at container level.
- Order of connection definitions determines vertical sequence timeline.

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

## 4. Entity-Relationship Diagrams (ERD)

Used for database schema design and data modeling.

### Key Rules
- Use `shape: sql_table`.
- Specify column types and key constraints (`primary_key`, `foreign_key`, `unique`).
- Connect foreign key fields directly to referenced primary key fields.

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

## 5. CI/CD and DevOps Pipelines

Used for build, test, scan, and deployment pipelines.

### Key Rules
- Use `direction: right` for sequential workflows.
- Use `step` shape for build stages.
- Distinguish manual vs automated deployment gates.

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
- Explicitly mark initial and terminal states.
- Label every transition with the triggering event or condition.

### Template

```d2
direction: down

initial: [*] { shape: circle }
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
