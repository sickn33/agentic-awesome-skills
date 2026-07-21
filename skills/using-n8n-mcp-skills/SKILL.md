---
name: using-n8n-mcp-skills
description: Route n8n MCP workflow design, editing, validation, testing, deployment, credential, execution, and debugging tasks to specialist guidance.
risk: critical
source: https://github.com/czlonkowski/n8n-skills/tree/main/skills/using-n8n-mcp-skills
source_repo: czlonkowski/n8n-skills
source_type: community
date_added: "2026-07-21"
author: Romuald Czlonkowski
license: MIT
license_source: https://github.com/czlonkowski/n8n-skills/blob/main/LICENSE
---

# Using the n8n-mcp Skills

## When to Use

Use this router at the start of any n8n MCP workflow design, inspection, edit, validation, test, deployment, credential, execution, or troubleshooting task so the relevant specialist guidance is loaded first.

Begin with read-only discovery and live schema inspection. Never copy secrets into prompts or workflow fields, never infer the target instance, and obtain approval before tests with side effects, activation, deletion, credential mutation, or other externally visible changes.

This is a **router**, not a reference. It tells you which skill owns the rules for what
you're about to do. The skill bodies hold the actual guidance — invoke them with the
Skill tool. When in doubt, load more skills rather than fewer.

The community **n8n-mcp** server and n8n itself move faster than any model's training
cutoff. Tool names, parameters, node `typeVersion`s, and default behaviors drift between
releases. When you spot drift — a tool a skill names doesn't exist, a parameter shape
doesn't match what `get_node` returns, behavior differs from what a skill describes —
trust the **live tool**, tell the user, and suggest updating the pack and the instance.

## Non-negotiables

Three rules with no exceptions. Each one prevents a class of workflow that looks correct
but breaks in production.

1. **Invoke the relevant skill before any n8n action** — not just before MCP calls.
   Before writing an expression, configuring a node, designing a workflow, wiring a
   connection, or writing Code, invoke the matching skill. The PreToolUse hooks remind
   you on the highest-impact tool calls *only when the plugin bundle is installed*; on
   Claude.ai (plain skill uploads, no hooks) the responsibility is entirely yours.
2. **Validate AND verify before activating.** Run `validate_workflow` (or
   `n8n_validate_workflow` by id) before you activate, and call `n8n_get_workflow` after
   every create or update to inspect the `connections` object. Validation alone misses
   silently dropped wires, Merge index off-by-one, and error outputs that were never
   wired. Validation passing means the JSON is well-formed — not that the workflow is
   correct.
3. **Secrets never go in text fields.** Tokens, API keys, and passwords always go through
   the n8n credential system. If no native node exists, use the HTTP Request node with
   the official credential type. A Set node holding a token referenced via `{{ $json.token }}`
   is a leak with extra steps. See `n8n-mcp-tools-expert`.

## Lean on skills, not training data

n8n changes constantly. "Remembered" parameter names are often silently wrong — they
validate as plain strings and then do nothing at runtime. Trust the skills and the live
tools (`get_node`, `search_nodes`, `tools_documentation`) over recollection. If a skill
contradicts your memory, trust the skill. If `get_node` contradicts a skill, trust the
tool and flag the drift.

## Strong defaults

Each skill owns its own exceptions; these are the defaults.

- **The Code node is a last resort.** Expression first, then an arrow function inside Edit
  Fields, then a Code node only when neither can do the job. See `n8n-code-javascript`.
- **A Set node feeding 0–1 consumers is almost always wrong.** Inline the expression at
  the consumer instead. See `n8n-expression-syntax`.
- **Per-item iteration is automatic.** Don't add a Loop Over Items node to "make it loop"
  when default per-item execution already handles the case.
- **Configure from the live schema, never from memory.** `get_node` before you set
  parameters. See `n8n-node-configuration`.

## Red flags: "about to ___" → invoke ___

If you catch yourself thinking any of these, stop and invoke the named skill first.

| Thought | Invoke |
|---|---|
| "This workflow is simple, I'll just build it" | `n8n-workflow-patterns` — most "simple" flows ship at 10+ nodes |
| "I'll add a Set node to map these fields" | `n8n-expression-syntax` — Set feeding ≤1 consumer is the #1 antipattern |
| "I'll just use a Code node, it's easier" | `n8n-code-javascript` — the bar is high; most reaches are expressions or Edit Fields |
| "The user mentioned data, I'll write Python" | `n8n-code-javascript` — default JS; Python (`n8n-code-python`) only on explicit ask |
| "I'm writing code an AI agent will call" | `n8n-code-tool` — a different runtime contract from the Code node |
| "Date math — I'll drop in a DateTime node" | `n8n-expression-syntax` — Luxon inline is almost always right |
| "I'll wire a Merge with 3 sources" | `n8n-node-configuration` — Merge defaults to 2 inputs; the 3rd silently drops |
| "Validation passed, I'm ready to activate" | `n8n-validation-expert` + `n8n-workflow-patterns` — run the antipattern scan |
| "Validation threw an error I don't understand" | `n8n-validation-expert` — what each error and warning means, and which are must-fix vs. best-practice advice |
| "I'll reference `$json.x` here" | `n8n-expression-syntax` — prefer `$('Node').item.json.x` in branchy workflows |
| "This webhook/scheduled flow is happy-path only" | `n8n-error-handling` — wire an error branch on every fallible node; 4xx caller faults, 5xx yours |
| "I'll pass this file/image through as JSON" | `n8n-binary-and-data` — file contents live in `$binary`, and can't cross the agent-tool boundary |
| "I'll wire up an AI agent and give the model some tools" | `n8n-agents` — tool names & descriptions ARE the prompt; memory, structured output, and topology have traps |
| "I'll copy this logic into another workflow" / "this is getting big" | `n8n-subworkflows` — extract a reusable sub-workflow; search before building |
| "I'll create that credential / open that workflow" (account has >1 instance) | `n8n-multi-instance` — every call hits the currently-targeted instance; reads misroute silently, and an ambiguous credential write fails closed with `INSTANCE_AMBIGUOUS` |

## Skill index

| Skill | Reach for it when |
|---|---|
| `using-n8n-mcp-skills` | This router (auto-loaded). Names the skill that owns your task. |
| `n8n-mcp-tools-expert` | Choosing or calling any n8n-mcp tool; node discovery; credentials; data tables; security audit; templates |
| `n8n-workflow-patterns` | Designing or building a workflow; picking an architecture (webhook / HTTP API / database / AI agent / scheduled / batch) |
| `n8n-node-configuration` | Configuring any node; operation-aware required fields; property dependencies; surgical field edits |
| `n8n-expression-syntax` | Writing `{{ }}`, `$json`/`$node`/`$now`; mapping data between nodes; the transform gatekeeper; Set-node discipline |
| `n8n-validation-expert` | Interpreting validation errors/warnings; false positives; the validation loop; auto-fix; reviewing an existing workflow |
| `n8n-code-javascript` | Any Code node in JavaScript; data access; `this.helpers`; DateTime; SplitInBatches loop patterns |
| `n8n-code-python` | A Code node specifically requested in Python; standard-library limits |
| `n8n-code-tool` | The AI-agent-callable Custom Code Tool (`toolCode`) — returns a string, no `$fromAI`/`$input` |
| `n8n-error-handling` | Webhook/API or unattended workflows; wiring error outputs; retries; 4xx/5xx response shapes; silent failures |
| `n8n-binary-and-data` | Files, images, PDFs, attachments, uploads/downloads, vision; passing a file to/from an agent tool |
| `n8n-subworkflows` | Reusable / multi-step builds; Execute Workflow; extracting shared logic; Define-Below inputs; all-vs-each; exposing a workflow as an agent tool |
| `n8n-agents` | AI Agent / LLM-with-tools / Text Classifier; tool design & `$fromAI`; system prompts; structured output; memory; RAG; human review; chat bots |
| `n8n-multi-instance` | Accounts with multiple instances (the `n8n_instances` tool is present); switching the target instance; verifying before credential writes; recovering from an unexpected `NOT_FOUND`, wrong/empty reads, or an `INSTANCE_AMBIGUOUS` credential-write fail-close |

## n8n-mcp tools — working knowledge from turn one

Qualified names look like `mcp__<server>__<tool>` (`<server>` is usually `n8n-mcp`). This
closes the gap where a tool's full description isn't loaded until first use.

**Discovery & docs**
- `tools_documentation` — meta-docs for every tool; `{topic:"ai_agents_guide", depth:"full"}` for the agent guide.
- `search_nodes` — find nodes by keyword.
- `get_node` — node info. Takes a single **SHORT-form** `nodeType` (`nodes-base.httpRequest`, `nodes-langchain.agent`), plus `detail` (minimal/standard/full) and `mode` (info/docs/search_properties/versions).
- `validate_node` — validate one node's config in isolation (profiles: minimal/runtime/ai-friendly/strict).
- `search_templates` / `get_template` — the template library (by keyword, nodes, task, metadata).

**Build & edit**
- `n8n_create_workflow` — create from full workflow JSON.
- `n8n_update_partial_workflow` — incremental diff ops (`{id, operations:[…]}`): addNode, updateNode, patchNodeField, addConnection, activateWorkflow, etc. Preferred for edits.
- `n8n_update_full_workflow` — full replacement.
- `n8n_autofix_workflow` — auto-fix common issues.
- `n8n_deploy_template` — deploy a template to the instance.

**Validate** (necessary, not sufficient — always pair with the antipattern scan)
- `validate_workflow` — full JSON in, errors/warnings/fixes out. Node types here are **LONG form** (`n8n-nodes-base.set`).
- `n8n_validate_workflow` — validate a deployed workflow by `{id}` (no node JSON to inspect).

**Inspect & lifecycle**
- `n8n_get_workflow` — fetch a workflow (full / structure / active / filtered / minimal). Use it to verify `connections` after edits; `mode="filtered"` + `nodeNames` reads one heavy node (e.g. long Code source) without pulling the whole workflow, which can truncate client-side.
- `n8n_list_workflows` — list/filter (search before duplicating logic).
- `n8n_delete_workflow`, `n8n_workflow_versions` (history/rollback), `n8n_instances` (multi-instance accounts only: list/switch the target instance — see `n8n-multi-instance`), `n8n_health_check` (returns the resolved `instanceName`).

**Test & run**
- `n8n_test_workflow` — runs real nodes (Code, HTTP, DB writes, sends all fire). Ask the user before running when side effects exist.
- `n8n_executions` — list/inspect executions. **There is no `execute_workflow` tool.**
- `n8n_evaluations` — read evaluation test runs (n8n ≥ 2.30): list runs, aggregated metrics, per-case results. Read-only — runs are started from the n8n editor, not the API; a 403 usually means the API key predates 2.30 (re-create it for the testRun scopes).

**Data, credentials, audit**
- `n8n_manage_datatable` — Data Table CRUD, filtering, dry-run.
- `n8n_manage_credentials` — credential CRUD + `getSchema` discovery.
- `n8n_audit_instance` — security audit (hardcoded secrets, unauthenticated webhooks, error-handling gaps).

> **Node-type form trap:** `get_node` / `validate_node` take SHORT form (`nodes-base.set`);
> workflow JSON inside `validate_workflow` / `n8n_create_workflow` uses LONG form
> (`n8n-nodes-base.set`). Mixing them is a common, silent mistake — see `n8n-mcp-tools-expert`.

## The protocol, in order

1. Recognize the matching skill from the index and **invoke it before the first MCP call**.
2. Skim `tools_documentation` once per session to refresh the tool surface if you're unsure.
3. `get_node` before configuring any node — read the live schema, don't assume.
4. Build / edit, then **`validate_workflow` before activating** and **`n8n_get_workflow` after** to check `connections`.
5. Surface any drift you notice (missing tool, changed parameter, diverging behavior).

## When in doubt

- **Can't find a workflow the user built in the UI?** The most common cause is per-workflow
  MCP access being off. Ask them to open it in n8n, go to Settings, and enable MCP access.
- **User says it's broken?** Believe them. Re-check parameters against `get_node`, trace
  data references, inspect the execution. See `n8n-validation-expert`.
- **No skill fits and the task is non-trivial?** Ask before guessing.

These are opinionated best practices, not laws. Disagree with a call? It's all markdown —
edit the skill.

## Example

```yaml
request: Build a webhook that validates input, calls an API, and returns structured errors.
specialists: [n8n-workflow-patterns, n8n-node-configuration, n8n-error-handling]
sequence:
  - inspect the target instance and live node schemas
  - build and validate the graph
  - preview side effects and obtain approval
  - write changes, fetch the saved workflow with n8n_get_workflow, and revalidate
  - activate and test only after approval
```

## Limitations

- The router describes a moving n8n MCP surface; live tool schemas and the target instance override stale examples.
- Availability of lifecycle, credential, evaluation, and multi-instance tools depends on server version and permissions.
- Routing to a specialist skill does not authorize mutations, executions, activation, deletion, or credential changes.
