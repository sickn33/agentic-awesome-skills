---
name: senior-architect
description: "Plan and review system architecture using explicit requirements, tradeoffs and evidence; bundled scripts are incomplete stubs."
risk: critical
source: community
date_added: "2026-02-27"
---

# Senior Architect

## When to Use

Review or plan system boundaries, dependencies and deployment design for a concrete user task. Gather requirements before recommending technology. This is a manual design workflow; the three bundled Python files are compatibility stubs, not automated analyzers.

## Workflow

1. Read current repository instructions and actual service interfaces. Record users, key flows, data ownership and measured reliability/latency/capacity needs. Unknown constraints stay unknown.
2. Draw the current system from actual endpoints, producers/consumers and storage. Label inferred links and include trust boundaries. Never invent dependencies from filenames alone.
3. Compare at least the current/simple option with the proposed change. Explain costs, operational burden, failure domains, data consistency, tenant isolation and migration/rollback behavior.
4. Write a small decision record with accepted assumptions, rejected alternatives and a validation plan. Deliver a diagram only when it accurately reflects evidence; architecture formatting does not prove correctness.
5. Before implementing, confirm the requested scope; infrastructure provisioning, deployment, data movement and external calls need applicable user authority. Review dependencies before installation and keep credentials out of documents.

## References

- [Architecture patterns](references/architecture_patterns.md)
- [System design workflow](references/system_design_workflows.md)
- [Technology decision guide](references/tech_decision_guide.md)

## Bundled scripts

`architecture_diagram_generator.py`, `dependency_analyzer.py` and `project_architect.py` share an intentionally incomplete CLI. They do not inspect code, generate diagrams, detect dependencies, benchmark, recommend fixes or modify projects. A zero-finding success would be misleading, so valid invocations report `not_implemented` and exit2. Invalid targets/paths exit1.

After reading the source, an explicitly requested stub invocation from the intended workspace is:

```bash
python /path/to/this/skill/scripts/project_architect.py . --json
```

The skill path is supplied by the actual installation, not the project's scripts directory. The optional `--output` creates a new JSON file inside the current workspace only and refuses existing files; it does not make the analysis complete. No requirements.txt, .env.example, package configuration, deploy manifests or automatic fixes are bundled. Do not run generic install/deploy commands based on this skill.

## Example

For a slow checkout task, inspect the actual request path and latency breakdown. Compare a query/index fix with a queue or service split. Choose the smallest justified option, list its failure behavior and propose an observable load test with a bounded data/cost budget. Do not claim measurements or production readiness without executed evidence.

## Limitations

Manual design guidance is not an executable architecture validator or security certification. The installed host does not gain deployment, messaging, credential or data-transfer authority from this document. No analysis or benchmark is represented by a stub result.
