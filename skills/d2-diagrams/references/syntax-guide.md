# D2 Syntax Reference Guide

A comprehensive reference for D2 syntax elements, shapes, connections, containers, scoping rules, and data formats (tested against D2 v0.6.8+).

## 1. Shapes and Objects

D2 supports various built-in shapes to represent distinct system components.

### Common Shapes

- `rectangle` (default): Standard boxes for services, tasks, or modules.
- `square`: Compact nodes or block elements.
- `circle`: Start/end points, states, or simple actors.
- `oval`: States or process terminators.
- `diamond`: Decision branches and conditional logic.
- `hexagon`: Gateways, adapters, or integration hubs.
- `cylinder`: Relational databases, storage buckets, or caches.
- `cloud`: External networks, third-party APIs, or SaaS providers.
- `queue`: Message brokers, Kafka topics, or asynchronous task queues.
- `package`: Code namespaces, libraries, or deployment bundles.
- `step`: Process milestones or sequential workflow steps.
- `callout`: Annotations, notes, or explanatory bubbles.
- `document`: Reports, log files, configuration specs, or artifacts.
- `person`: End users, administrators, or external actors.
- `page`: Web pages, user interface views, or templates.

### Shape Declaration Example

```d2
user: End User { shape: person }
api_gw: Gateway { shape: hexagon }
db: PostgreSQL { shape: cylinder }
broker: RabbitMQ { shape: queue }
worker: Task Runner { shape: step }
auth0: Auth Provider { shape: cloud }
memo: Notes { shape: callout }
```

## 2. Connections and Arrows

Connections establish relationships, data flows, and dependencies between nodes.

### Connection Syntax

- `A -> B`: Unidirectional arrow from A to B.
- `A <- B`: Unidirectional arrow from B to A.
- `A <-> B`: Bidirectional communication.
- `A -- B`: Undirected link or association.
- `A -> B: label`: Connection with explanatory text.

### Connection Styling

```d2
client -> server: HTTPS Request {
  style: {
    stroke: "#1a73e8"
    stroke-width: 2
    stroke-dash: 0
    font-size: 14
  }
}

server -> backup: Async Sync {
  style: {
    stroke-dash: 5
    stroke: "#ea4335"
  }
}
```

## 3. Containers and Scoping Rules

Containers group related elements inside clear visual boundaries.

### Nested Containers and Identifier Scoping

> [!IMPORTANT]
> **Container Scoping Rule:** In D2, when connecting nodes in different sibling sub-containers, you must use qualified identifiers (e.g. `public_subnet.alb -> private_subnet.app_1`). Unqualified identifiers (`alb -> app_1`) in an outer block will declare new duplicate nodes at that outer level rather than referencing existing nodes inside sub-containers.

```d2
aws: Amazon Web Services {
  style.fill: "#f6f8fa"

  vpc: Main VPC {
    direction: right

    public_subnet: Public Subnet {
      alb: Application Load Balancer
    }

    private_subnet: Private Subnet {
      app_1: App Instance 1
      app_2: App Instance 2
      redis: Cache Cluster { shape: cylinder }
    }

    # Connect across sibling subnets within the vpc container using qualified identifiers
    public_subnet.alb -> private_subnet.app_1: Route
    public_subnet.alb -> private_subnet.app_2: Route
    private_subnet.app_1 -> private_subnet.redis: Read/Write
  }
}

# Connect from external root context into nested container targets
client: Client Device
client -> aws.vpc.public_subnet.alb: Port 443
```

## 4. Special Diagram Shapes

### Sequence Diagrams

Use `shape: sequence_diagram` on a container to turn child connections into a chronological sequence timeline. Quote connection labels containing `$` to prevent accidental variable substitution.

```d2
checkout_flow: {
  shape: sequence_diagram

  buyer: Customer
  web: Web Storefront
  pay: Payment Processor
  bank: Card Issuer

  buyer -> web: 1. Click Checkout
  web -> pay: 2. Process Charge (USD 50)
  pay -> bank: 3. Authorize Transaction
  bank -> pay: 4. Approved (Auth Code)
  pay -> web: 5. Payment Confirmed
  web -> buyer: 6. Order Success Screen
}
```

### SQL Tables (ERD)

Use `shape: sql_table` on a container or node to declare structured schemas with typed fields and constraints.

```d2
users: {
  shape: sql_table
  id: int { constraint: primary_key }
  email: varchar(255) { constraint: unique }
  password_hash: varchar(255)
  created_at: timestamp
}

orders: {
  shape: sql_table
  id: int { constraint: primary_key }
  user_id: int { constraint: foreign_key }
  total_amount: decimal(10,2)
  status: varchar(50)
}

orders.user_id -> users.id: references
```

## 5. Rich Text and Block Strings

D2 supports Markdown and formatted code blocks using pipe delimiters (`|md ... |` and `|code ... |`). Always ensure blocks are properly terminated with closing `|`.

### Markdown Labels

```d2
readme_node: {
  shape: document
  content: |md
    # Architecture Overview
    - **Service Mesh**: Istio
    - **Observability**: Prometheus + Grafana
  |
}
```

### Code Snippets

```d2
config_snippet: {
  payload: |code
    {
      "service": "billing",
      "timeout_ms": 5000,
      "retries": 3
    }
  |
}
```

## 6. Variables and Substitution

Define variables at the top of your diagram for unified styling.

```d2
vars: {
  primary_color: "#1a73e8"
  accent_color: "#34a853"
  font_family: "Inter"
}

service_a: Service A {
  style.fill: ${primary_color}
}

service_b: Service B {
  style.fill: ${accent_color}
}
```
