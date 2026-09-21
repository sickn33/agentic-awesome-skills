# Ontoly Agent Skill Standard Workflow

Every Ontoly skill follows this workflow. Skills teach orchestration only; Ontoly provides the software understanding.

LLM Enhancement is mandatory every time Ontoly is used by an LLM. An LLM-facing workflow must use an Ontoly skill or equivalent installed workflow that declares `ontoly.enhancement: "LLM Enhancement"` and preserves graph-first evidence, confidence, and fallback rules.

1. Verify that an Ontoly graph exists at `.ontoly/SoftwareGraph.json`.
2. If the graph is missing or stale, run `ontoly build .`.
3. Check graph trust with `ontoly coverage .` or `ontoly stats . --json`.
4. Prefer Ontoly MCP by starting or connecting to `ontoly mcp`.
5. Query `EvidencePack` first for compact graph context, then the capability that matches the task before reading files.
6. Inspect repository files only when Ontoly cannot answer, confidence is low, or source snippets are needed for confirmation.
7. Always cite evidence: node ids, edge ids or relationship types, source spans, graph hash, capability name, and confidence.

When evidence is incomplete, say what Ontoly proved, what remains unknown, and which fallback check was used.
