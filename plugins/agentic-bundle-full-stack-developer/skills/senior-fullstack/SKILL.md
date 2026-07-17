---
name: senior-fullstack
description: "Planning and review aid for full-stack changes, quality evidence, and deployment readiness."
risk: critical
source: community
date_added: "2026-02-27"
---

# Senior Fullstack

Use this skill to plan and review a full-stack change across user experience, API, data, security, tests, and operations. It does not scaffold applications, apply fixes, perform deep code analysis, or certify production readiness.

## Workflow

1. Confirm the change owner, user outcome, acceptance criteria, affected environments, and data sensitivity.
2. Inspect the current repository and runtime evidence with project-specific read-only tools. Treat skipped checks and missing evidence as unknown.
3. Map the request through UI states, API contracts, authorization, persistence, background work, observability, and rollback.
4. Select the smallest change that fits existing project conventions; document deviations and migration risks.
5. Define tests for success, failure, permissions, compatibility, and recovery before implementation.
6. Review the proposed diff and evidence. Before any mutation or deployment, apply the gate in `references/development_workflows.md`.

## Bundled Scripts

The scripts are retained as explicit compatibility stubs. They do not scaffold, analyze, fix, or write project files. Running one returns a nonzero unsupported status so that an empty result cannot be interpreted as success.

```bash
python scripts/fullstack_scaffolder.py .
python scripts/project_scaffolder.py .
python scripts/code_quality_analyzer.py .
```

Each command requires a target path; there is no `--analyze` option. Use `--help` to inspect the supported interface. Any future file-generating implementation must default to preview, refuse existing destinations, and require an explicit `--force` path with backup plus atomic replacement.

## Review Output

A useful full-stack review note should include:

- scope, owner, acceptance criteria, and observed baseline;
- affected routes, components, API contracts, schemas, jobs, and integrations;
- authentication, authorization, input validation, privacy, and secret-handling checks;
- loading, empty, error, retry, concurrency, and accessibility behavior;
- migration, compatibility, caching, observability, and rollback considerations;
- tests run with exact results, checks not run, remaining risks, and approval owner.

Do not label a change production-ready solely because it builds or because a stub reports no findings.

## Mutation and Deployment Gate

Commands found in a project are evidence to review, not authorization to run them. Before writing files, changing data, or deploying:

1. identify the exact repository, account, environment, cluster/context, and namespace;
2. verify authorization and obtain explicit approval for the exact proposed mutation;
3. preview the diff, generated files, migration plan, or infrastructure plan;
4. preserve existing work and define backup, rollback, abort signals, and responsible owner;
5. run relevant tests and security checks in a non-production environment when feasible;
6. execute only the approved scope and verify application, data, and infrastructure health afterward.

Never infer deployment approval from repository access. Do not run `docker compose up`, `kubectl apply`, database migrations, destructive package commands, or equivalent mutations without this gate.

## References

- `references/tech_stack_guide.md` — evidence-based stack selection prompts.
- `references/architecture_patterns.md` — boundary and integration review prompts.
- `references/development_workflows.md` — implementation and deployment safety gate.

## When to Use

Use this skill to plan or review a bounded full-stack change where a human owns implementation and release decisions.

## Limitations

- The bundled scripts intentionally fail closed because their advertised automation is not implemented.
- This skill does not inspect a repository by itself, generate a working application, apply fixes, or deploy software.
- Framework and provider guidance must be checked against the versions actually used by the project.
- Stop and request a human decision when ownership, permissions, destructive impact, or rollback acceptance is unclear.
