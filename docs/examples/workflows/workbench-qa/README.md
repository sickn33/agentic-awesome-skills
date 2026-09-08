# Recorded case: review Workbench imports

This case develops the component and error-state checks of
[QA and Browser Automation](../../../users/workflows.md#workflow-qa-and-browser-automation)
against AAS's existing Workbench. It records a real selection and executed checks;
it does not claim that the selected skills created this implementation or improved
an agent benchmark.

## Input and exact selection

The input is public source commit `251eefb9a58e36d41902dbc4a4fadc4eab72ab66`
in `sickn33/agentic-awesome-skills`. The three-file evidence sample covers
`apps/web-app/package.json`, `src/pages/Workbench.tsx` and
`src/utils/workbenchReview.ts` under that app. The actual test files and lockfile
were also checked against that commit before execution. This is a bounded review
sample, not a fingerprint of every file in the repository.

On 2026-09-05, the configured AAS 16.7.0 MCP served the candidate searches and
reads. Codex chose the seven IDs in [aas-stack.json](aas-stack.json):

| Skill | Review responsibility | Comparison and limit |
| --- | --- | --- |
| `react-patterns` | Component state, effects and async replacement | Compared with `react-ui-patterns` and `frontend-architecture`; preserve this Vite app's local state and existing layout, without adding server components or another store. |
| `typescript-pro` | Typed import states and compiler boundaries | Compared with `typescript`; runtime JSON still requires parsing, so static types alone are insufficient. |
| `invariant-guard` | Bounded traversal and cross-artifact bindings | Compared with `frontend-data-contracts`, whose network-client prescription does not fit local files. State the digest, uniqueness and termination requirements explicitly. |
| `vitest-skill` | The existing Vite/Vitest component and boundary tests | Compared with `javascript-testing-patterns`; use the repository's actual Vitest configuration. Its advertised `reference/playbook.md` is absent from this catalog, so only the available core procedure was used. |
| `privacy-by-design` | In-memory artifact handling and minimal disclosure | Compared with `privacy-mask`, which concerns image redaction. No legal-compliance conclusion is inferred. |
| `fixing-accessibility` | Control names, error associations and native semantics | Compared with `ui-a11y`, which assumes StyleSeed conventions absent here. Static and jsdom checks do not establish complete accessibility. |
| `antigravity-maintainer-batch-release` | Existing build/check commands and protected maintenance | Compared with generic GitHub Actions templates; the exact source-base procedure takes precedence over older packaged prose. |

All ten capability dimensions are declared in the evidence. External service
integrations are not applicable to this local artifact-import scope; browser File
and Web Crypto APIs are part of its runtime. There is no backend account or remote
upload flow to test. Data storage, privacy, UX, build and maintenance are explicitly
covered rather than omitted.

## Executed checks

In a separate checkout at the input commit, use Node 24 and run from the app
directory so Vitest loads the actual jsdom setup:

```bash
cd apps/web-app
npm ci
npm exec -- vitest run \
  src/pages/__tests__/Workbench.test.tsx \
  src/utils/__tests__/workbenchReview.test.ts
```

Observed result: **23 tests passed in two files**, using Node 24.19.0 and
Vitest 4.1.9. The tests cover the recorded example, evidence tampering, stale
consistency results, skill mismatches, hostile strings rendered as text, explicit
file selection, memory clearing, UTF-8 byte limits, JSON depth and forbidden keys.
The initial command from the repository root missed the app configuration and
failed with a missing DOM environment; rerunning from the directory above passed.
No test assertion or environment requirement was weakened.

The import contract is: accept bounded, correctly shaped artifacts; verify their
canonical digests and declared references; compare manifest/catalog/selection
bindings; surface errors without executing content or writing project files.
The JSON-depth walk visits a finite parsed tree and rejects depth above 24;
the input is limited to 256 KiB. Matching digests establish consistency, not
authorship, catalog authenticity or semantic suitability.

## Real client and plan evidence

[aas-selection-evidence.json](aas-selection-evidence.json) was exported by the real
`codex-mcp-client` 0.153.1 session. Calls **37–76** belong to this selection; the
76-call sidecar preserves the prior MCP case's calls as session history. It includes
the rejected `limit: 100` search and the successful bounded refinements, rather
than presenting an edited success-only trace. The 3,709-byte export request fit
the published runtime's ordinary request limit. Timings are outside the evidence
digest and are not a benchmark.

The published 16.7.0 CLI validated the manifest and produced the real
[plan.json](plan.json) with seven install operations. Planning left the isolated
target directory empty. `stack audit` returned `consistent` for all three artifacts.
The original target identity is historical; create and review a new plan for a new
destination. No installation, experimental apply, deployment or private host
configuration change was performed in this case.

To audit the saved artifacts, run from a directory outside an AAS source checkout
(npm may otherwise resolve the local package rather than the requested executable):

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@16.7.0 -- aas stack audit \
  --manifest /absolute/path/to/workbench-qa/aas-stack.json \
  --evidence /absolute/path/to/workbench-qa/aas-selection-evidence.json \
  --plan /absolute/path/to/workbench-qa/plan.json
```

Replace the paths with this example's absolute paths. This validates historical
bindings and performs no skill installation. For a fresh plan, supply an existing
target directory and the approved runtime's integrity/cache as described in the
[Core guide](../../../users/aas-core.md).

## Limits

The recorded result is a component and parser review. The final desktop/mobile
browser pass was blocked by the locked local session at the time of this record;
it is not represented as complete here. Screen-reader interaction, color contrast
and all supported browser engines were not established by these tests. The broad
MCP searches also returned irrelevant candidates, requiring narrower queries and
pagination. Neither metadata risk labels nor a passing artifact audit chose or
certified the selection.
