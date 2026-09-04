# Embodied AI Panorama Graph

Use this reference when the request is about field orientation, technical landscape
analysis, topic discovery, or graph traversal. Do not load it for a simple exact-entity
lookup.

## The graph layers

| Layer | Main question |
| --- | --- |
| Domain | Which major part of embodied AI does this concern? |
| Vertical topic | What bounded technical problem is being solved? |
| Task chain | What implementation steps, branches, or merges are involved? |
| Capability | What must the system be able to do? |
| Asset | What can implement, train, evaluate, or support that capability? |
| Dependency | What ordering, interface, or prerequisite connects the parts? |
| Evidence | What source supports or qualifies the technical choice? |

The public graph currently spans Foundation Models; Human-Robot Interaction; Learning
and Adaptation; Localization; Manipulation; Mapping and SLAM; Motion and Control;
Multi-Robot Systems; Navigation; Perception; Planning and Decision; Reasoning and
Agents; Safety and Trust; Simulation and Digital Twins; and System Infrastructure.

## Traversal patterns

### Field map

Use when the user asks for an overview of a direction.

1. Select the central domain and two to four adjacent domains.
2. Identify representative vertical topics within each.
3. Find capabilities reused across topics.
4. Group assets by role rather than popularity.
5. Trace major dependencies between groups.
6. Report evidence coverage and missing regions.

### Engineering path

Use when the user wants to build a system.

1. Translate requirements into one or more vertical topics.
2. Inspect candidate task chains and branch conditions.
3. Resolve required capabilities and prerequisites.
4. Connect capabilities to compatible assets.
5. Retrieve evidence for critical choices.
6. Expose unresolved interfaces and validation gates.

### Cross-domain dependency map

Use when failure or complexity lies between subsystems.

1. Identify the capability where the handoff occurs.
2. Trace upstream data, model, hardware, and runtime prerequisites.
3. Trace downstream consumers and evaluation requirements.
4. Separate explicit graph dependencies from inferred relationships.
5. Describe the smallest interface contract that connects the subsystems.

## Recommended outputs

A panorama answer should be selective rather than exhaustive. Include:

- central and adjacent domains;
- representative topics;
- shared or bottleneck capabilities;
- important task/dependency paths;
- asset categories and examples;
- available evidence and conflicts;
- blind spots and open questions.

Do not claim that graph size proves correctness or completeness. Counts describe the
artifact's scale; evidence resolvability, semantic quality, coverage, and freshness are
separate properties.
