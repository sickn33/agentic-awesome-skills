# Diagram Patterns

Use these compact patterns when generating diagram source. Prefer adapting the pattern instead of inventing complex syntax.

## Mermaid flowchart

```mermaid
flowchart TD
  start([Start]) --> receive[Receive request]
  receive --> valid{Valid?}
  valid -- yes --> process[Process request]
  valid -- no --> fix[Ask for missing info]
  process --> finish([Finish])
```

## Mermaid swimlane-style flowchart

```mermaid
flowchart LR
  subgraph customer[Customer]
    c1[Submit order]
  end
  subgraph app[Application]
    a1[Validate order]
    a2[Create invoice]
  end
  subgraph ops[Operations]
    o1[Review exception]
  end
  c1 --> a1
  a1 -- valid --> a2
  a1 -- invalid --> o1
```

## Mermaid architecture

```mermaid
flowchart LR
  user[User] --> web[Web App]
  web --> api[API Service]
  api --> db[(Database)]
  api -. async .-> queue[[Queue]]
  queue --> worker[Worker]
  worker --> object_store[(Object Store)]
```

## Mermaid sequence diagram

```mermaid
sequenceDiagram
  actor User
  participant Web
  participant API
  database DB
  User->>Web: Submit request
  Web->>API: POST /request
  API->>DB: Save record
  DB-->>API: OK
  API-->>Web: 201 Created
  Web-->>User: Show confirmation
```

## Mermaid ER diagram

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : appears_in
  CUSTOMER {
    string id PK
    string email
  }
  ORDER {
    string id PK
    string customer_id FK
    datetime created_at
  }
```

## Mermaid state diagram

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted: submit
  Submitted --> Approved: approve
  Submitted --> Rejected: reject
  Approved --> [*]
  Rejected --> Draft: revise
```

## Mermaid class diagram

```mermaid
classDiagram
  class User {
    +string id
    +string email
    +login()
  }
  class Order {
    +string id
    +decimal total
    +submit()
  }
  User "1" --> "0..*" Order : places
```

## Mermaid gantt

```mermaid
gantt
  title Delivery Plan
  dateFormat  YYYY-MM-DD
  section Discovery
  Requirements        :a1, 2026-01-01, 5d
  Design              :after a1, 4d
  section Build
  Implementation      :2026-01-10, 10d
  QA                  :2026-01-22, 5d
```

## Mermaid mindmap

```mermaid
mindmap
  root((Product Launch))
    Research
      Customer interviews
      Market scan
    Build
      Prototype
      QA
    Go-to-market
      Pricing
      Campaign
```

## Mermaid user journey

```mermaid
journey
  title Trial Signup Journey
  section Discover
    Visit landing page: 4: User
    Compare pricing: 3: User
  section Activate
    Create account: 5: User
    Invite teammate: 4: User
```

## Graphviz dependency graph

```dot
digraph G {
  rankdir=LR;
  node [shape=box, style=rounded];
  app -> api;
  api -> auth;
  api -> db;
  worker -> queue;
  worker -> db;
}
```

## Graphviz clustered architecture

```dot
digraph G {
  rankdir=LR;
  compound=true;
  node [shape=box, style=rounded];

  subgraph cluster_client {
    label="Client";
    web;
    mobile;
  }

  subgraph cluster_platform {
    label="Platform";
    api;
    worker;
    queue [shape=cylinder];
    db [shape=cylinder];
  }

  web -> api;
  mobile -> api;
  api -> db;
  api -> queue;
  queue -> worker;
  worker -> db;
}
```

## PlantUML sequence

```plantuml
@startuml
actor User
participant Web
participant API
database DB
User -> Web: Submit request
Web -> API: POST /request
API -> DB: Save record
DB --> API: OK
API --> Web: 201 Created
Web --> User: Confirmation
@enduml
```

## PlantUML component architecture

```plantuml
@startuml
actor User
rectangle "Client" {
  [Web App]
}
rectangle "Backend" {
  [API Service]
  queue "Queue"
  [Worker]
  database "Database"
}
User --> [Web App]
[Web App] --> [API Service]
[API Service] --> Database
[API Service] --> Queue
Queue --> [Worker]
[Worker] --> Database
@enduml
```

## SVG fallback

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360" role="img">
  <title>Simple process diagram</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" />
    </marker>
  </defs>
  <rect x="40" y="120" width="160" height="70" rx="10" fill="white" stroke="black" />
  <text x="120" y="160" text-anchor="middle">Start</text>
  <line x1="200" y1="155" x2="320" y2="155" stroke="black" marker-end="url(#arrow)" />
  <rect x="320" y="120" width="180" height="70" rx="10" fill="white" stroke="black" />
  <text x="410" y="160" text-anchor="middle">Process</text>
</svg>
```
