---
name: d2-diagrams
description: "Generate production-quality D2 diagrams for system architecture, sequence flows, ERDs, and workflows with layout engines, styling classes, and syntax validation."
risk: safe
source: self
date_added: "2026-08-19"
---
# D2 Diagrams

Generate clear, maintainable, and production-quality D2 diagrams for any system, process, or visual model.

## When to Use

Use this skill when the user asks to:

- Create visual architecture diagrams for software, cloud, or distributed systems.
- Draw flowcharts, process flows, decision trees, or user journeys.
- Generate sequence diagrams showing message passing or API interactions over time.
- Model databases with Entity-Relationship Diagrams (ERDs) or SQL tables.
- Visualize DevOps pipelines (CI/CD), ETL data flows, or event streams.
- Design UML class, package, or component structures.
- Map out organizational hierarchies, state machines, or conceptual frameworks.

## Universal Scope

D2 represents declarative diagrams across all domains:

- **Software Architecture**: Microservices, serverless, event-driven, monorepos, API gateways.
- **Data and Infrastructure**: SQL/NoSQL schemas, VPCs, Kubernetes clusters, network tiers.
- **Workflow and Logic**: State transitions, approval pipelines, business processes.
- **Technical Documentation**: Sequence flows, class hierarchies, dependency trees.

## Workflow and Strategy

Follow these six steps for every diagram:

### 1. Understand Requirements and Scale

- Identify the core entity types (services, databases, actors, queues).
- Determine relationships, directionality, and interaction semantics.
- Classify scale: Small (3-15 nodes), Medium (16-40 nodes), Large (40+ nodes).

### 2. Map Concepts to D2 Structures

- **Nodes**: Choose semantic shapes (`cylinder` for databases, `queue` for brokers, `person` for users).
- **Containers**: Group related components into logical namespaces or security zones.
- **Connections**: Use explicit labels, directions (`->`, `<->`), and line styles (`stroke-dash: 5`).
- **Special Types**: Use `shape: sequence_diagram` for time-ordered interactions, `shape: sql_table` for relational models, and `shape: class` for OOP.

### 3. Select the Layout Engine

- **Dagre (default)**: Standard directed hierarchical graphs and flowcharts.
- **ELK**: Dense architectures, nested container hierarchies, and complex multi-tier dependencies.
- **TALA**: Organic networks, conceptual maps, and large relationship graphs.

### 4. Construct D2 Code

- Define shared classes for consistent styling (`classes: { ... }`).
- Group components inside clear container blocks (`container_name: { ... }`).
- Define inter-service connections with unambiguous descriptions.
- Use Markdown labels (`|md ... |`) or code snippets (`|code ... |`) when detailed notes are needed.

### 5. Refine and Format

- Apply appropriate themes (`theme: 0` for default, `theme: 300` for terminal dark, or clean neutral palettes).
- Maintain proper indentation (2 spaces per nesting level).
- Avoid overlapping connection paths by grouping endpoints logically.

### 6. Present and Explain

- Provide the complete, copy-paste ready `.d2` snippet in a code block.
- Briefly summarize the architectural layout, key components, and data flow.
- Offer actionable options to customize, adjust layout engines, or export (SVG, PNG, PDF).

## D2 Core Principles

- **Declarative Representation**: Describe structural connections and relationships rather than hardcoded pixel positions.
- **Visual Hierarchy**: Use nested containers to represent subsystems, clusters, or boundaries.
- **Semantic Precision**: Match shapes and arrowheads to the underlying system component types.
- **Maintainability**: Define reusable styles in `classes` blocks and leverage variables for common attributes.

## Syntax Primer

### Basic Nodes and Connections

```d2
user: User {
  shape: person
}

gateway: API Gateway {
  shape: hexagon
}

db: Main Database {
  shape: cylinder
}

user -> gateway: HTTPS Request
gateway -> db: Query / Read
```

### Containers and Nesting

```d2
cloud: Cloud Environment {
  style.fill: "#f8f9fa"

  vpc: Private VPC {
    api: Backend API
    worker: Background Worker
    api -> worker: Task dispatch
  }
}
```

### Classes and Styling

```d2
classes: {
  service: {
    style: {
      fill: "#e8f0fe"
      stroke: "#1a73e8"
      border-radius: 6
    }
  }
}

auth_service.class: service
user_service.class: service
```

## Reference Files

Consult bundled reference documents for deep implementation patterns:

- `references/syntax-guide.md`: Full syntax reference for shapes, arrows, tables, and variables.
- `references/diagram-types.md`: Templates for microservices, sequence, ERD, and pipelines.
- `references/styling-guide.md`: Theme catalogs, custom palettes, and visual hierarchy.
- `references/best-practices.md`: Layout tuning, scalability, and modularization patterns.
- `references/examples.md`: Complete production-ready D2 templates.

## Gotchas

- **Nesting References**: To connect nested nodes across containers, use dotted paths (e.g., `vpc.api -> db_cluster.primary`).
- **Reserved Words**: If an identifier clashes with keywords, wrap the key in quotes or use custom labels (e.g., `style: "My Style"` or `"class": Custom Class`).
- **Sequence Diagram Constraints**: Inside `shape: sequence_diagram`, connection order dictates the top-to-bottom timeline. Do not nest arbitrary sub-containers inside sequence lifelines.
- **Layout Direction**: Control flow direction with `direction: right` or `direction: down` at top-level or within containers.
