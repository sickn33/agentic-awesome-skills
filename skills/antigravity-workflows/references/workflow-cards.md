# Standalone workflow cards

These cards work when the full AAS repository playbooks are absent. Start from the
user's actual project and its instructions. Each skill ID below is a candidate to
inspect, not a compulsory stack or an endorsement based on metadata. Preserve an
already chosen workflow and use the project's existing commands and conventions.

## Ship a SaaS MVP

Input: target user, one primary journey, current code, constraints and deployment
destination. Use `brainstorming` to resolve the primary outcome and `concise-planning`
to define observable acceptance. Compare `api-design-principles` and
`frontend-design` against the actual stack before implementation. Use
`e2e-testing-patterns` for the core journey and `deployment-procedures` only when
deployment is authorized. Exit with the implemented journey, its observed test,
and an explicit deployment status. A local build is not a deployed product.

## Security audit

Input: owned code or explicitly authorized targets and permitted test methods.
Use `threat-modeling-expert` to map assets and trust boundaries, then choose
`api-security-best-practices` or `frontend-security-coder` for the affected surface.
Inspect authentication only if it exists; do not invent endpoints or run exploit
commands outside the authorized scope. Use `verification-before-completion` to
connect each finding to a reproduction and a post-fix check. Exit with affected
paths, actual evidence, residual risks and unresolved blockers; do not infer a
security certification from a scanner result.

## Build an AI agent system

Input: task, tool permissions, data boundaries and a measurable output. Compare
`ai-agents-architect` and `llm-app-patterns` for the runtime; use `mcp-builder` when
the integration actually uses MCP. Before executing tools, define their allowed
effects and error behavior. Use `agent-evaluation` to choose observable task checks.
Exit with an actual tool interaction and its checked result, or identify exactly
which live interaction remains untested. Do not substitute an in-process fixture
for a claimed real client session.

## QA and browser automation

Input: existing route or journey, supported viewports and the actual test runner.
Compare `vitest-skill` and `javascript-testing-patterns` for component/unit checks;
compare `browser-automation` and `e2e-testing-patterns` for browser interactions.
Use `fixing-accessibility` for names, keyboard access and error associations.
Record initial, loading, success and failure states. Run the repository's test
command, repair a reproduced failure, and rerun it. Exit with observed checks and
browser evidence; mark screen-reader or device coverage untested when unavailable.

## Design a DDD core domain

Input: business vocabulary, representative scenarios and existing boundaries.
Use `domain-driven-design` to identify the core domain, `ddd-context-mapping` to
describe upstream/downstream relationships, and `ddd-tactical-patterns` only where
aggregates and invariants solve an actual problem. Validate a representative
scenario against those invariants. Exit with the model, boundary decisions and
worked scenario; do not introduce services or abstractions solely to fit DDD terms.

## Reviewed-selection handoff

After reading the selected instructions and bundled files, bind exact IDs, release
and destination. For example, from a Codex project where `brainstorming` and
`systematic-debugging` were actually selected:

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@16.7.0 -- \
  agentic-awesome-skills --release 16.7.0 --path .agents/skills \
  --skills brainstorming,systematic-debugging --dry-run
```

Replace these example IDs with the reviewed set. Confirm that this exact release
contains them and inspect its prerequisites. If preview reports an error, correct
the cause and rerun the preview. Only after a successful reviewed preview and
within existing user authorization, repeat the identical command without
`--dry-run`. Verify the resulting skill files and invoke the chosen skill on the
real task. The direct installer owns this preview; it does not apply a Core plan.

These are procedure cards, not completed case results. Keep actual output and
limitations separate from the expected exit condition.
