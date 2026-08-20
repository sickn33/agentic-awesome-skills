---
name: d2-diagrams
description: "Generate production-quality D2 diagrams for system architecture, sequence flows, ERDs, and workflows with layout engines, styling classes, and syntax validation."
risk: safe
source: self
date_added: "2026-08-19"
---
# D2 Diagrams

Generate clear, maintainable, and production-quality D2 diagrams for any system, process, or visual model. Compatible with official D2 compiler **v0.6.8+**.

## When to Use

Use this skill when the user asks to:

- Create visual architecture diagrams for software, cloud, or distributed systems.
- Draw flowcharts, process flows, decision trees, or user journeys.
- Generate sequence diagrams showing message passing or API interactions over time.
- Model databases with Entity-Relationship Diagrams (ERDs) or SQL tables.
- Visualize DevOps pipelines (CI/CD), ETL data flows, or event streams.
- Design UML class, package, or component structures.
- Map out organizational hierarchies, state machines, or conceptual frameworks.

## Primary Documentation Sources

- **Official D2 Intro & Tour**: [https://d2lang.com/tour/intro](https://d2lang.com/tour/intro)
- **Container Scoping Specification**: [https://d2lang.com/tour/containers/](https://d2lang.com/tour/containers/)
- **D2 Language Cheat Sheet**: [https://d2lang.com/tour/cheat-sheet](https://d2lang.com/tour/cheat-sheet)
- **Official D2 Compiler Releases**: [https://github.com/terrastruct/d2/releases](https://github.com/terrastruct/d2/releases) (Target: `v0.6.8+`)

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
- Scope connections between containers using fully-qualified dotted identifiers (`container_a.node -> container_b.node`).
- Use Markdown labels (`|md ... |`) or code snippets (`|code ... |`) when detailed notes are needed.

### 5. Refine and Format

- Set overall layout flow (`direction: right` or `direction: down`).
- Apply semantic colors (blue for services, green for data, orange/yellow for queues, red for alerts).
- Keep connection labels concise (2-4 words).

### 6. Validate Output

- Ensure braces `{}` and quotes `""` are balanced.
- Ensure all multi-line block strings (`|md`, `|code`) have closing delimiters `|`.
- Verify cross-container connections target existing node paths rather than declaring accidental top-level duplicates.

## Layout Selection Guide

| Diagram Type | Recommended Engine | Direction | Notes |
| :--- | :--- | :--- | :--- |
| **Microservices / Architecture** | ELK / Dagre | `direction: right` | Group by tier or boundary |
| **Process Flow / Flowchart** | Dagre | `direction: down` | Use `diamond` for decisions |
| **Sequence Diagram** | Native (`shape: sequence_diagram`) | Top-to-bottom | Order dictates timeline |
| **Database Schema (ERD)** | ELK / Dagre | `direction: right` | Use `shape: sql_table` |
| **State Machine** | Dagre | `direction: down` | Use `circle`/`oval` for states |
| **CI/CD Pipeline** | Dagre | `direction: right` | Use `shape: step` |

## Styling Guidelines

Use reusable classes under the `classes` block for clean, consistent styling:

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

## Limitations

- **Compiler Binary Dependency**: Generating raster images (PNG) or rendered vector files (SVG/PDF) requires the official D2 CLI compiler (`d2` v0.6.8+) installed in the execution environment.
- **Layout Engine Licensing**: The default Dagre layout engine is open source and built-in; ELK is supported via plugin; TALA layout engine is proprietary and requires an official Terrastruct license.
- **Declarative Text Output**: D2 outputs declarative specification code (`.d2`), not direct pixel manipulation or manual drag-and-drop coordinates.
- **Sequence Diagram Lifelines**: D2 `shape: sequence_diagram` enforces linear actor lifelines and does not support arbitrary non-linear sub-container nestings inside active lifelines.
- **Static Linter Scope**: The bundled Python linter performs static structural and lexical checks (block strings, quote balancing, brace nesting); final visual rendering is governed by the D2 compiler engine.

## Reference Files

Consult bundled reference documents for deep implementation patterns:

- `references/syntax-guide.md`: Full syntax reference for shapes, arrows, tables, container scoping, and variables.
- `references/diagram-types.md`: Templates for microservices, sequence, ERD, and pipelines.
- `references/styling-guide.md`: Theme catalogs, custom palettes, and visual hierarchy.
- `references/best-practices.md`: Layout tuning, scalability, and modularization patterns.
- `references/examples.md`: Complete production-ready D2 templates tested against D2 v0.6.8+.

## Gotchas

- **Container Scoping**: Always use dotted qualified identifiers (e.g., `vpc.public_subnet.alb -> vpc.private_subnet.app`) when connecting nodes across containers. Writing `alb -> app` inside an outer block creates unintended duplicate nodes.
- **Reserved Words**: If an identifier clashes with keywords, wrap the key in quotes (e.g., `"class": Custom Class` or `"style": { ... }`).
- **Sequence Diagram Constraints**: Inside `shape: sequence_diagram`, connection order dictates the top-to-bottom timeline.
- **Layout Direction**: Control flow direction with `direction: right` or `direction: down` at top-level or within containers.
