---
name: helm-chart-scaffolding
description: "Comprehensive guidance for creating, organizing, and managing Helm charts for packaging and deploying Kubernetes applications."
risk: critical
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

## Scope and deployment limits

Pin Helm, Kubernetes, image and dependency versions; historical Bitnami versions below are examples, not supported/security-reviewed recommendations. The bundled values/Chart assets and snippets are not a complete chart. Helpers, manifests, schemas and required Secrets must be supplied and rendered consistently. Review dependencies and Chart.lock before downloads. Local lint/template cannot prove API admission or runtime health; server validation requires an authorized cluster/context, namespace and target version. Dry-run/debug output may expose Secrets. Apply/install/upgrade/test hooks and repository publication require explicit target authorization, backup/rollback planning and cost/impact review. Never package credential files in a chart.

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
