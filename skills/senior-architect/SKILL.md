---
name: senior-architect
description: "Planning and review aid for architecture decisions, system boundaries, and deployment readiness."
risk: critical
source: community
date_added: "2026-02-27"
---

# Senior Architect

Use this skill to structure architecture discovery, compare options, record decisions, and review a proposed deployment. It does not perform deep automated analysis, modify a project, or certify production readiness.

## Workflow

1. Establish the decision owner, business outcome, constraints, data sensitivity, failure tolerance, and recovery objectives.
2. Inspect the repository and runtime evidence with read-only tools appropriate to the project. Treat missing evidence as unknown, not as a passing result.
3. Describe the current boundaries, dependencies, trust zones, and operational ownership.
4. Compare the smallest viable options using the prompts in `references/architecture_patterns.md` and `references/tech_decision_guide.md`.
5. Record the recommendation, rejected alternatives, assumptions, risks, and validation plan in an ADR or review note.
6. Before any mutation or deployment, use the gate in `references/system_design_workflows.md`.

## Bundled Scripts

The scripts are retained as explicit compatibility stubs. They do not analyze, scaffold, fix, or generate architecture artifacts. Running one returns a nonzero unsupported status so that automation cannot mistake an empty result for success.

```bash
python scripts/architecture_diagram_generator.py .
python scripts/project_architect.py .
python scripts/dependency_analyzer.py .
```

Each command requires a target path; there is no `--analyze` option. Use `--help` to inspect the supported interface. Create diagrams and reports through the reviewed planning workflow, not by relying on these stubs.

## Architecture Review Output

A useful review note should contain:

- scope, owner, audience, and decision deadline;
- observed facts separated from assumptions;
- context and component boundaries, data flows, trust zones, and external dependencies;
- capacity, latency, availability, recovery, privacy, and compliance constraints;
- at least one viable alternative and the reason it was rejected;
- migration stages, compatibility concerns, observability, rollback triggers, and validation evidence;
- unresolved questions and the person authorized to decide them.

Do not call a design production-ready until its project-specific tests, security review, operational checks, and rollback exercise have passed in the target environment.

## Mutation and Deployment Gate

Commands shown in project documentation are examples to review, not authorization to execute. Before any command that writes files, changes infrastructure, or deploys:

1. identify the exact repository, account, cluster/context, environment, and namespace;
2. confirm the operator is authorized and obtain explicit approval for the proposed change;
3. preview the exact diff or plan and verify that secrets and unrelated resources are excluded;
4. define backups or reversible migration steps, rollback commands, owners, and abort signals;
5. run project-specific validation in a non-production environment when feasible;
6. execute only the approved scope, then verify health and record the result.

Never infer approval from access to credentials. Never run `docker compose up`, `kubectl apply`, Terraform apply, database migrations, or equivalent mutating commands from this skill without the gate above.

## References

- `references/architecture_patterns.md` — option and boundary review prompts.
- `references/tech_decision_guide.md` — concise ADR evidence template.
- `references/system_design_workflows.md` — review and deployment safety gate.

## When to Use

Use this skill for architecture discovery, design review, ADR preparation, migration planning, or deployment-readiness review where a human remains accountable for the decision.

## Limitations

- The bundled scripts intentionally fail closed because their advertised automation is not implemented.
- This skill does not inspect a repository by itself, apply fixes, generate a complete diagram, choose a technology, or deploy infrastructure.
- Recommendations remain hypotheses until validated against current project and runtime evidence.
- Stop and request a human decision when ownership, risk tolerance, required permissions, or rollback acceptance is unclear.
