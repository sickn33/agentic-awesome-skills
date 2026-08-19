# D2 Best Practices and Scalability

Practical guidelines for maintaining large diagrams, choosing layout engines, and optimizing visual clarity.

## 1. Choosing the Right Layout Engine

D2 supports three layout engines with distinct strengths:

### Dagre (Default)
- **Best For**: Standard hierarchical flowcharts, sequential processes, and moderate architecture diagrams.
- **Strengths**: Fast compilation, deterministic left-to-right or top-to-bottom flow.
- **Limitations**: Can produce long overlapping lines on densely interconnected graphs.

### ELK (Eclipse Layout Kernel)
- **Best For**: Enterprise architectures, nested containers, microservice meshes, and cloud network maps.
- **Strengths**: Superior container nesting support, intelligent edge routing, compact packing.
- **Usage**: Set via CLI `--layout elk` or via editor settings.

### TALA
- **Best For**: Organic relationship maps, mind maps, and entity dependency networks.
- **Strengths**: Physics-inspired placement, minimizes edge crossings for non-hierarchical topologies.

## 2. Managing Diagram Complexity at Scale

### The Rule of 40 Nodes
When a single diagram exceeds 40 nodes, visual clarity degrades. Consider these refactoring strategies:

1. **Subsystem Containerization**: Group tightly coupled nodes into containers. Connections to external systems should target the container or gateway rather than every internal node.
2. **Layered Views**: Split one monolithic architecture into three targeted boards:
   - High-Level Context View (Users, Gateways, Core Systems).
   - Service Interaction View (Synchronous API and RPC flows).
   - Data & Storage View (Databases, Replication, ETL pipelines).
3. **Multi-Board Composition**: Use D2 multi-board syntax (`boards`) or separate `.d2` files to show different abstraction layers.

## 3. Direction and Flow Management

- Set overall direction explicitly: `direction: right` (horizontal) or `direction: down` (vertical).
- Use local container directions to align subsystems:
```d2
direction: down

ingestion: Ingestion Pipeline {
  direction: right
  source -> transform -> buffer
}

storage: Persistent Storage {
  direction: right
  db_primary -> db_replica
}

ingestion.buffer -> storage.db_primary: Flush
```

## 4. Connection Clarity and Labeling

- Keep labels concise (2-4 words maximum).
- Avoid crossing lines by grouping related nodes adjacent in source code.
- Use explicit ports or directions if connection routing looks awkward.
- Differentiate sync vs async communication styles:
  - Solid arrows (`->`) for synchronous REST / gRPC calls.
  - Dashed arrows (`->` with `style.stroke-dash: 5`) for async events or background batches.

## 5. Export Recommendations

- **SVG**: Ideal for web documentation, Markdown repositories (GitHub / GitLab), and interactive zoom.
- **PNG**: Ideal for slide presentations, email summaries, and chat attachments.
- **PDF**: Ideal for formal technical specifications, white papers, and print distribution.
