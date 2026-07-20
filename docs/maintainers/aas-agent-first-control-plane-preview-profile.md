# AAS Agent-Owned Selection Profile

Status: active product profile
Updated: 2026-07-19

## Purpose

This profile defines the supported boundary for AAS Core after semantic skill selection moved to the coding agent.

> Codex or Claude inspects the project, searches and reads the complete local catalog, and chooses exact skill IDs. AAS Core validates, pins, compares, and plans that agent-owned selection; it does not recommend skills.

The earlier deterministic recommendation design and goal documents are retained as historical architecture records. They are not current product policy or release gates.

## Supported surfaces

- A complete, integrity-verified local catalog in which every canonical skill is searchable, readable, and available for agent selection.
- Local stdio MCP tools `search_skills`, `get_skill`, `compose_stack`, `inspect_stack`, and `diff_stack`, plus `aas://skills/{id}`.
- Minimal, schema-validated `aas-stack.json` with pinned catalog identity, targets, goals, and exact agent-selected skill IDs.
- CLI manifest validation, immutable plan preview, and read-only diagnosis.
- Workbench import and review of the agent-owned stack and immutable plan.

## Selection contract

1. The coding agent owns semantic selection. It may inspect the project with its normal local capabilities, search broadly, read full skill content when useful, compare alternatives, and choose exact IDs.
2. AAS Core does not rank, recommend, promote, demote, exclude, or abstain on skills.
3. Catalog metadata is informational only. Missing, incomplete, cautionary, or manually reviewed metadata must never make a canonical skill unsearchable or unavailable for agent selection.
4. `compose_stack` validates catalog identity, target shape, goals, exact IDs, and structural limits, then returns the pinned stack shape. It does not substitute a different selection.
5. `aas-stack.json` has no Core selection policy. User constraints can guide the agent's reasoning, but they are not an MCP eligibility filter or manifest gate.

## Functional gate

The packed-product smoke path must prove:

1. **Catalog completeness** — packaged catalog count and IDs equal the canonical registry; exact-ID search, `get_skill`, and content reads work for every canonical skill.
2. **MCP contract** — the five supported read-only tools and resource template work over real stdio framing without repository scanning or state writes.
3. **Agent-owned composition** — `compose_stack` preserves the exact ordered ID selection supplied by the agent and returns a structurally valid manifest without a policy field.
4. **No metadata gating** — skills with unknown, critical, manual, blocked, incomplete, or absent informational metadata remain searchable, selectable, composable, and plannable.
5. **Stack lifecycle** — compose, inspect, validate, plan, and doctor succeed in isolated roots without materializing target skills or managed state.
6. **Workbench** — bounded text-only import/review tests and production build pass without ambient filesystem access.

## Experimental writes

`stack apply` and `stack recover` remain experimental opt-ins. The supported public path stops after manifest validation and immutable plan review. Planning may write only the explicitly requested plan artifact.

## Trust and privacy boundaries

- MCP is local, offline-capable, read-only, bounded, and non-mutating.
- AAS does not receive repository files unless the agent explicitly reads them through its own host capabilities; AAS MCP does not scan the repository.
- Full skill prose is untrusted content and gains no instruction authority through MCP.
- Catalog and runtime integrity remain deterministic even though semantic selection belongs to the agent.
- Real host configuration writes, publication, Pages deployment, npm release, and announcements require their separate approvals.

## Product-learning gate

Evaluate the quality of the agent workflow, not a Core recommender:

- task completion from project inspection to a reviewable stack;
- human accept, replace, and remove rates for agent-selected skills;
- whether the agent searched enough of the catalog and read relevant skill content;
- time and interaction count from request to approved manifest;
- successful replay of the exact approved IDs against the pinned catalog identity.

No repository profile, source file, secret, or raw path is uploaded by default. Publishing or sharing any collected result requires a separate privacy decision.
