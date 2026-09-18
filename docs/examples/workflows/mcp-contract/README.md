# Recorded case: review an MCP search contract

This case develops the tool-boundary and verification steps of [Build an AI Agent System](../../../users/workflows.md#workflow-build-an-ai-agent-system). It reviews an existing implementation in AAS itself. It does not claim that the selection created the implementation, improved an LLM benchmark, or represents a user study.

## Input and scope

On 2026-09-05, Codex inspected the local repository and used the configured AAS 16.7.0 MCP to search candidates, read their prose, compose an exact selection and inspect the resulting manifest. The review input is source commit `ef9b6fdbf7b6c27b41c1a63e2e3d7f9379e9eae8` in `sickn33/agentic-awesome-skills`, especially `tools/lib/aas-v1/search.js`, `mcp/server.js`, `evidence.js`, and `tools/scripts/tests/aas_v1_search_filters.test.js`.

The task is local Node/MCP retrieval and evidence-contract review. User-facing browser behavior is outside this case, so the user-experience dimension is not applicable. The other nine dimensions are represented below. A separate browser case covers the Workbench.

## Exact selection and alternatives

The [recorded manifest](aas-stack.json) preserves this order and the published catalog digest:

| Selected skill | Responsibility | Comparison and boundary |
| --- | --- | --- |
| `mcp-builder` | Runtime and external MCP client interface | More specific to MCP than `agent-tool-builder`; no remote service or new evaluation harness is introduced. |
| `javascript-pro` | Node JavaScript behavior | More directly addresses runtime behavior than `modern-javascript-patterns`; repository CommonJS and built-in assertions remain in place. |
| `invariant-guard` | Retrieval invariants and edge cases | Search-engine integrations such as Algolia do not fit this offline lexical implementation. This is contract review, not a claim that every example in the skill is correct. |
| `cross-platform-contract-propagation-audit` | Search arguments through schema, MCP and evidence | Adds field-by-field propagation evidence beyond algorithm review. No ranking or eligibility policy is inferred. |
| `javascript-testing-patterns` | Positive and negative JavaScript tests | Compared with `vitest-skill`; Core tests use Node's runner, so framework-specific setup is not adopted. |
| `privacy-by-design` | Minimize project evidence and raw query exposure | Compared with `api-security-best-practices`; HTTP authentication is outside a local stdio catalog. No legal-compliance claim is made. |
| `antigravity-maintainer-batch-release` | Packaged-runtime verification and protected maintenance | More specific than `repo-maintainer` or generic deployment guidance. The procedure from the actual source base supersedes the older published prose. |

Searches included `builder`, `javascript`, `search` (all three pages), `schema`, `privacy`, `maintainer`, and `deployment`. Other candidates were inspected during the same product audit. These are agent judgments; Core checks catalog membership and preserves exact IDs.

## Reproduce the source checks

In a separate checkout of the public repository at the input commit, with Node 24 and the repository's Python prerequisites:

```bash
npm ci
npm run chain
node --test tools/scripts/tests/aas_v1_search_filters.test.js
```

Run `chain` first: the source-only merge intentionally precedes the protected canonical-sync commit, and the offline catalog refuses stale ontology bytes. This is an identity check, not a reason to disable validation.

Observed result: **5 tests passed** after regeneration. The checks cover any/all-term retrieval, required terms and category/tag filters, bounded inputs and inherited properties, complete-catalog reachability, and actual server-owned search/compose/inspect/evidence round trips. On this catalog, `postgres migration` produced 29 broad matches and one all-term match. The full source PR also passed the root suite, Core suite, web tests, packaged smoke and protected CI before merge.

## Review the recorded plan

The [immutable plan](plan.json) was generated with the actual published 16.7.0 runtime, resolved from npm and verified in an isolated temporary cache. `aas stack validate` returned `valid`; `aas stack plan` returned `planned` with seven install operations. The temporary target remained empty. No skill installation or experimental apply was performed.

The plan binds the exact manifest, catalog, runtime closure and original temporary target identity. A new target produces a different plan digest; never treat this recorded plan as approval to change another project. The Workbench's **Load recorded example** button loads these public artifacts through the same bounded validators as user imports, without persisting them.

## Inspect the selection evidence

The [recorded sidecar](aas-selection-evidence.json) comes from the real `codex-mcp-client` 0.153.1 session: 36 recorded search, read, compose and inspect calls. Its three-file project inventory covers `package.json` (runtime, tests and maintenance commands), `mcp/server.js` (protocol and evidence boundary), and `search.js` (retrieval). This is an explicit sample of review inputs, not a fingerprint of every repository file. Timings are observations outside the evidence digest; no model identity or effectiveness score is inferred.

The first six-file export request was 4,452 argument bytes and hit the published runtime's 4 KiB request limit. A smaller three-file ledger retained all nine applicable capabilities and exported successfully. This real-client finding motivated a bounded artifact-frame regression fix in source. Do not treat the published runtime as already patched, or a successful in-process server test as proof of stdio compatibility.

To validate all three recorded artifacts against their published catalog, run outside an AAS source checkout. npm may otherwise resolve the local package rather than the requested executable. Replace these paths with the example's absolute paths:

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@16.7.0 -- aas stack audit \
  --manifest /absolute/path/to/mcp-contract/aas-stack.json \
  --evidence /absolute/path/to/mcp-contract/aas-selection-evidence.json \
  --plan /absolute/path/to/mcp-contract/plan.json
```

Observed result from the published CLI: `status: "consistent"`, with matching evidence/plan manifest, catalog, target and skills. The command validates a historical example; it does not install the selected skills. Later catalogs have different identities and must not be silently substituted.

This proves reproducible structure, bindings and declared checks. It does not prove that these skills are the best possible selection, that their entire bundles were semantically certified, or that a production agent system is ready to deploy.
