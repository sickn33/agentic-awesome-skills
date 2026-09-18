# Entropy Box knowledge compiler

Use this reference when explaining the system, comparing it with RAG or conventional
knowledge graphs, or adapting the compilation model to another technical domain.

## Compilation model

Entropy Box follows this conceptual path:

```text
papers, repositories, documentation, APIs, models, datasets, and benchmarks
→ source acquisition and evidence records
→ entity normalization and disambiguation
→ topic-scoped research and typed assembly
→ task chains, capabilities, assets, relations, and provenance
→ bounded validation, deduplication, conflict handling, and admission
→ persistent graph and indexes
→ panorama exploration, retrieval, workflow assembly, and gap detection
→ new compilation targets from observed gaps
```

The important design decision is to persist reusable structure. A normal query-time
RAG system retrieves passages and generates an answer; Entropy Box front-loads part of
the reasoning into a typed artifact that later queries and agents can reuse.

## Main relation families

- domain or topic `contains` subtopics, chains, and entities;
- task steps use `next`, `branch`, and `merge` structure;
- steps `require` capabilities;
- capabilities use parent, child, and dependency relations;
- assets `implement` or are `used_by` capabilities and topics;
- records are `grounded_in` evidence and source documents.

Treat relation names as typed claims, not visual decoration. Preserve direction,
provenance, version, and confidence or validation status when available.

## What it is not

- Not only a web directory: assets are connected to capabilities and task contexts.
- Not only RAG: the persistent graph exists before the user's query.
- Not only a knowledge graph: the graph models engineering paths and reusable
  capability structure.
- Not a complete robot execution ontology: it does not fully represent live robot
  state, action semantics, object affordances, or safety control.
- Not autonomous truth: agents can create candidates, but admission, evidence,
  conflict handling, and validation determine what becomes persistent.

## Design principles

- **Truth over opinion:** preserve sources, uncertainty, and negative evidence.
- **Structure over collection:** connect knowledge into typed, usable relationships.
- **Composition over reinvention:** reuse capabilities and assets across topics.
- **Verification before intelligence:** do not treat generated structure as admitted
  knowledge without checks.
- **Evolution instead of replacement:** update the persistent artifact incrementally
  and retain version or conflict context.

When applying this model elsewhere, first define the domain's stable entities,
relations, task structures, evidence rules, and admission gates. Do not copy robotics
labels into a different domain without checking that they represent its real work.
