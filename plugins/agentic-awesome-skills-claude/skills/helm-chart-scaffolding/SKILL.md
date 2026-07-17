---
name: helm-chart-scaffolding
description: "Comprehensive guidance for creating, organizing, and managing Helm charts for packaging and deploying Kubernetes applications."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Helm Chart Scaffolding

Comprehensive guidance for creating, organizing, and managing Helm charts for packaging and deploying Kubernetes applications.

## Use this skill when

Use this skill when you need to:
- Create new Helm charts from scratch
- Package Kubernetes applications for distribution
- Manage multi-environment deployments with Helm
- Implement templating for reusable Kubernetes manifests
- Set up Helm chart repositories
- Follow Helm best practices and conventions

## Do not use this skill when

- The task is unrelated to helm chart scaffolding
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

### Safe validation and live changes

- Treat rendering and linting as local preflight. Use client-side dry runs and hide Secret manifests from output and logs.
- Before any cluster read or change, identify and record the exact kube context, namespace, release, chart revision, and values files. Stop if any target is ambiguous.
- Render and lint locally, then review a redacted diff against the named live release. Do not expose Secret values in the diff or transcript.
- Obtain immediate, explicit approval for the exact live action, context, namespace, release, chart revision, values, reviewed diff, and rollback plan. Approval to scaffold or validate a chart is not approval to install or upgrade it.
- Record the current release revision and backup any required application data before mutation. Define health checks, abort thresholds, and the rollback command in advance; verify health after the change and roll back on a breached threshold.
- Never run install, upgrade, rollback, uninstall, hook, or test commands against a cluster without that exact approval.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
