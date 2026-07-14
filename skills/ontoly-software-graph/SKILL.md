---
name: ontoly-software-graph
description: "Use Ontoly's deterministic Software Graph, MCP server, and agent skills for architecture review, request tracing, impact analysis, and dependency analysis."
category: development
risk: safe
source: community
source_repo: 0xsarwagya/ontoly
source_type: community
date_added: "2026-07-14"
author: 0xsarwagya
tags: [software-graph, codebase-analysis, mcp, typescript, architecture, impact-analysis]
tools: [claude, cursor, gemini, codex, antigravity]
license: MIT
license_source: "https://github.com/0xsarwagya/ontoly/blob/main/LICENSE"
---

# Ontoly Software Graph

## Overview

Ontoly builds a deterministic Software Graph from a TypeScript repository and exposes it through CLI queries, MCP capabilities, and agent skills. Use this skill when a coding agent needs evidence-backed codebase understanding before searching files directly.

This skill is an operating guide for the public Ontoly project. It does not contain compiler logic; all software understanding should come from Ontoly's generated graph, semantic model, query engine, and MCP server.

## When to Use This Skill

- Use when the user asks for repository architecture, module ownership, or onboarding help.
- Use when tracing a request, route, controller, service, provider, dependency, or call chain.
- Use when estimating impact for removing, renaming, or refactoring a symbol, module, package, route, or service.
- Use when reviewing dependency topology, circular imports, dead code, configuration usage, or environment variables.
- Use when the user explicitly wants Ontoly, Software Graph, MCP, graph validation, semantic coverage, or agent skills.

## How It Works

### Step 1: Verify Ontoly Is Available

Check whether the repository already has Ontoly outputs such as `.ontoly/`, `SoftwareGraph.json`, validation reports, or documented Ontoly scripts. If the `ontoly` command is unavailable, ask the user whether to install or use the repository's documented package manager command.

Recommended local checks:

```bash
ontoly --help
find . -maxdepth 3 \( -name "SoftwareGraph.json" -o -name ".ontoly" \) -print
```

### Step 2: Build or Refresh the Graph

Only run a graph build in the repository the user asked about. Tell the user that graph generation may create local Ontoly artifacts before running it.

```bash
ontoly build .
```

If the project documents a different command, prefer the documented command over guessing.

### Step 3: Check Trust, Diagnostics, and Coverage

Before answering architectural questions, inspect Ontoly diagnostics, graph statistics, trust, and semantic coverage. Treat unresolved imports, low trust, missing framework detection, or graph validation failures as answer constraints.

Use the CLI or MCP capabilities exposed by the installed Ontoly version. Prefer structured graph queries over text search.

### Step 4: Use Ontoly MCP Capabilities

Start or connect to the Ontoly MCP server when the host supports MCP:

```bash
ontoly mcp
```

Use capabilities such as architecture summaries, dependency analysis, request tracing, impact analysis, configuration lookup, framework reports, dead-code analysis, and graph validation when available.

### Step 5: Answer With Evidence

Every answer should include:

- The Ontoly capability or query used.
- The node, edge, route, package, or diagnostic evidence that supports the answer.
- A confidence statement derived from graph evidence.
- Any known limitations caused by missing graph regions or diagnostics.

### Step 6: Fall Back Gracefully

Only inspect repository files directly when Ontoly cannot answer, the graph is missing, diagnostics make the graph untrustworthy for the question, or the user asks for source-level verification. When falling back, explain which graph evidence was insufficient.

## Examples

### Architecture Review

User asks: "Explain this repository."

Workflow:

1. Verify or build the Ontoly graph.
2. Check graph trust, diagnostics, detected frameworks, packages, modules, services, routes, and largest dependency hubs.
3. Use Ontoly's architecture summary or equivalent query.
4. Report the architecture with graph evidence and confidence.

### Request Tracing

User asks: "Trace the login flow."

Workflow:

1. Search graph nodes for authentication routes and controllers.
2. Trace route-to-controller-to-service-to-repository relationships.
3. Include unresolved edges or missing relationships as limitations.
4. Avoid opening source files unless the graph cannot identify the flow.

### Impact Analysis

User asks: "What breaks if I remove UserRepository?"

Workflow:

1. Locate the graph node for `UserRepository`.
2. Query callers, consumers, dependency injection edges, modules, routes, and packages that reference it.
3. Separate direct dependents from transitive impact.
4. Include confidence based on explicit graph relationships.

## Best Practices

- Prefer Ontoly graph queries before grep, AST parsing, or broad file search.
- Keep graph evidence separate from inference.
- Treat diagnostics as part of the answer, not as noise.
- Use exact node IDs, route paths, package names, and relationship names when available.
- Rebuild the graph after large user changes before making claims about current architecture.
- Keep fallbacks narrow and explain why they were needed.

## Limitations

- Ontoly does not replace compiler, test, or runtime validation.
- Graph quality depends on the Ontoly version, supported language frontend, repository setup, and diagnostics.
- Missing or partial framework detection lowers confidence for framework-specific answers.
- Do not claim a relationship exists unless it is present in the graph or clearly labeled as an inference.
- Stop and ask for clarification if the repository path, target graph, or requested analysis scope is ambiguous.

## Security & Safety Notes

- Run Ontoly only on repositories the user is authorized to analyze.
- Do not send graph files, source code, environment variables, diagnostics, or repository metadata to external services unless the user explicitly requests it.
- Treat environment-variable nodes, configuration nodes, and diagnostics as potentially sensitive.
- Graph generation is local analysis but may write local artifacts such as graph output, diagnostics, indexes, or cache files.
- Do not execute project build scripts, package installation, or network commands unless they are documented by the repository or approved by the user.

## Common Pitfalls

- **Problem:** Answering from file search even though the graph already contains the relationship.
  **Solution:** Query Ontoly first and use file inspection only as a fallback.

- **Problem:** Reporting low-confidence inference as a graph fact.
  **Solution:** Label the claim as inferred and cite the supporting graph evidence separately.

- **Problem:** Ignoring diagnostics.
  **Solution:** Include graph validation and compiler diagnostics when they affect confidence.

## Related Skills

- `@developer-onboarding` - Use for broad onboarding when Ontoly is unavailable.
- `@sdk-dx` - Use for SDK design and developer experience reviews after Ontoly identifies public APIs.
- `@api-onboarding` - Use for API-specific onboarding when route and operation evidence is available.
