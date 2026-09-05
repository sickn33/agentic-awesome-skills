# Specialized Plugins: scope and review

The repository currently defines **21 specialized plugins**, each with 5–10 skills. These are curated instruction bundles for concrete jobs. They do not install service accounts, browsers, cloud infrastructure or authenticated connectors, and they do not require every included framework to be used on every task.

## Canonical definitions

- `data/specialized-plugin-candidates.json` selects specialized plugin membership and records the editorial shortlist.
- `data/editorial-bundles.json` owns installable skill lists, descriptions, audience, limitations and starter prompts.
- Canonical skill IDs and compatibility are checked against `skills_index.json`.
- `npm run bundles:sync` generates plugin folders, both host marketplaces, portable manifests and bundle documentation. Generated changes belong to the protected canonical-sync PR.
- The web page reads these source definitions. Its count, prerendered metadata and live verifier must agree; do not keep a separate handwritten web list.

The source definitions, generated plugin manifests and published release are separate states. Updating this shortlist does not publish a release or update installed copies. See the [plugin installation guide](plugins.md).

## Reviewed product scope — 2026-09-05

This pass checked the 21 compositions against the current 2,113-entry catalog and sharpened their descriptions, starter briefs and adjacent-product boundaries. It is an editorial and packaging review, not proof that every included procedure has been executed successfully in every environment. The internal tier labels are historical prioritization, not reliability grades.

| Plugin | Skills | Intended result |
| --- | ---: | --- |
| AAS Web App Builder | 10 | Implement a React/Next.js user journey with responsive UI, accessibility checks and browser verification. |
| AAS Product Design Studio | 10 | Turn a product brief into a coherent visual direction, responsive interface and actionable design review. |
| AAS Security Engineer | 10 | Assess explicitly authorized targets and produce reproducible findings, remediation priorities and retest steps. |
| AAS Secure App Builder | 9 | Implement authentication, access control and data protection with negative tests and a focused security review. |
| AAS Documents & Presentations | 9 | Produce editable office files and PDFs, with content checks and rendered output review. |
| AAS Data Analytics | 10 | Validate source data, write analytical queries and produce a dashboard or experiment readout with traceable definitions. |
| AAS Agent & MCP Builder | 10 | Build a bounded agent or MCP tool with explicit interfaces, failure handling and behavioral evaluation. |
| AAS QA & Test Automation | 10 | Reproduce failures, add meaningful regression coverage and stabilize browser or service tests. |
| AAS DevOps & Cloud | 10 | Prepare infrastructure and delivery changes with validation, rollback steps and explicit deployment boundaries. |
| AAS Marketing, SEO & Growth | 10 | Create an acquisition plan and channel assets grounded in the supplied audience, product and search evidence. |
| AAS Automation Builder | 10 | Design an automation with explicit triggers, mappings, retries and a reviewable test run. |
| AAS Observability IR | 10 | Connect logs, metrics and traces to incident diagnosis, recovery checks and a documented follow-up. |
| AAS Python API Builder | 10 | Implement Python service endpoints with schema validation, async boundaries and automated tests. |
| AAS Mobile App Builder | 10 | Implement a mobile feature in the chosen stack and prepare platform-specific build and release checks. |
| AAS Accessibility & Inclusive UX | 8 | Find and fix accessibility barriers with keyboard, automated and screen-reader checks appropriate to the interface. |
| AAS API Platform Builder | 10 | Define and implement API contracts, authorization, documentation and service verification across languages. |
| AAS SaaS Launch & Revenue | 10 | Connect MVP scope, pricing, payments and launch assets into a concrete launch-readiness review. |
| AAS AI Product & Evaluation Ops | 10 | Define AI feature success criteria, representative evaluation cases and a decision-ready error analysis. |
| AAS Data Engineering Platform | 10 | Build ingestion and transformation pipelines with data contracts, quality checks and recovery planning. |
| AAS Privacy & Compliance Engineering | 5 | Map data flows to engineering controls and evidence gaps for a scoped privacy or compliance review. |
| AAS Localization & International Growth | 10 | Prepare locale-aware interfaces and content with language, routing and international SEO checks. |

## Composition changes

- **Web App Builder:** replace `nextjs-best-practices` with `browser-automation`. React performance and App Router guidance remain; the bundle now includes verification of the implemented user journey.
- **Data Analytics:** replace `database-architect` with `data-quality-frameworks`. Database platform architecture remains in Data Engineering Platform; analytical users get checks for data assumptions, contracts and transformations.
- **Privacy & Compliance Engineering:** remove the broad `security-audit` testing workflow. The five remaining skills cover privacy-by-design, data handling, scoped compliance and defensive review. Formal certification and legal advice remain outside its scope.
- **Secure App Builder:** remove `security-and-hardening` from this curated set because its two references to `references/security-checklist.md` have no bundled target. The remaining nine skills retain API, backend/frontend, auth, SAST, secrets and access-review coverage. The canonical skill remains available; repairing its missing reference is separate content debt.
- All 21 plugin IDs stay stable. Removed bundle members remain canonical skills and can still be selected separately.

## Choosing between related plugins

| Decision | Choose |
| --- | --- |
| Implement a web user journey / develop visual direction | Web App Builder / Product Design Studio |
| Implement defensive controls / conduct an authorized security assessment | Secure App Builder / Security Engineer |
| Interpret business data / build production ingestion and transformations | Data Analytics / Data Engineering Platform |
| Build an agent or MCP tool / decide how to evaluate an AI feature | Agent & MCP Builder / AI Product & Evaluation Ops |
| Implement a Python service / design framework-neutral API contracts | Python API Builder / API Platform Builder |
| Prepare deployments / diagnose an operational incident | DevOps & Cloud / Observability IR |
| Prepare pricing, payment and launch readiness / produce acquisition assets | SaaS Launch & Revenue / Marketing, SEO & Growth |

## Use and verification

Open the complete included-skill list before installation. The first starter prompt specifies an input and deliverable; adapt it to the actual project and available tools. For multi-framework plugins, use the existing project stack rather than installing all alternatives. For Google Workspace, Composio-backed automations, cloud tooling and model providers, configure the separately required access before live operations.

Review scope, actual checks and omissions in the result. Browser checks do not prove all accessibility requirements, an evaluation plan is not a completed evaluation, and a control checklist is not legal certification. Publishing, sending messages, active security testing and production changes need the authorization applicable to the task.

## Maintainer verification

Run skill validation, reference validation, docs security, the specialized-plugin source/packaging regression, bundle generation/checks, and the web tests/build. Verify complete web membership, expanded skill links, scope/brief visibility, filtering and release-bound links. Reject stale counts in the live-verifier fixture and inspect the built `/plugins/` title and JSON-LD before any separately approved deployment.

## Resolved skill-content findings — follow-up

A scan of explicit local `references/` and `resources/` links in the selected skill entrypoints found 30 distinct missing targets across 23 skills. These were existing content defects, not missing files introduced by bundle generation. The follow-up supplies all 30 targets and the formerly selected hardening checklist. It also replaces unsupported template/script promises with actual inline procedures or available-integration workflows. The regression now checks prose-declared resources, references, assets and scripts across every selected entrypoint and verifies resource bytes in specialized distributions. Fenced application paths are excluded because they may belong to the target project; this is not a claim that every example has been run against live services.

| Skill | Missing targets |
| --- | --- |
| `backend-security-coder` | `resources/implementation-playbook.md` |
| `business-analyst` | `resources/implementation-playbook.md` |
| `devops-troubleshooter` | `resources/implementation-playbook.md` |
| `distributed-tracing` | `references/jaeger-setup.md`, `resources/implementation-playbook.md`, `references/instrumentation.md` |
| `django-pro` | `resources/implementation-playbook.md` |
| `embedding-strategies` | `resources/implementation-playbook.md` |
| `fastapi-pro` | `resources/implementation-playbook.md` |
| `frontend-security-coder` | `resources/implementation-playbook.md` |
| `github-actions-templates` | `references/common-workflows.md`, `resources/implementation-playbook.md` |
| `grafana-dashboards` | `references/dashboard-design.md`, `resources/implementation-playbook.md` |
| `incident-responder` | `resources/implementation-playbook.md` |
| `ios-developer` | `resources/implementation-playbook.md` |
| `kpi-dashboard-design` | `resources/implementation-playbook.md` |
| `mobile-developer` | `resources/implementation-playbook.md` |
| `multi-platform-apps-multi-platform` | `resources/implementation-playbook.md` |
| `observability-and-instrumentation` | `references/observability-checklist.md` |
| `pci-compliance` | `resources/implementation-playbook.md` |
| `postmortem-writing` | `resources/implementation-playbook.md` |
| `secrets-management` | `references/github-secrets.md`, `references/vault-setup.md` |
| `seo-content-planner` | `resources/implementation-playbook.md` |
| `seo-content-writer` | `resources/implementation-playbook.md` |
| `slo-implementation` | `references/slo-definitions.md`, `resources/implementation-playbook.md`, `references/error-budget.md` |
| `vector-database-engineer` | `resources/implementation-playbook.md` |

### Follow-up verification scope

Expanding the same scan to prose-declared assets and scripts found 51 missing targets across 28 skill entrypoints, including the original 30. All are now supplied or replaced with an actual inline/available-tool workflow. Added companion documents are locally authored procedures, not claimed recoveries of upstream files.

- Added 21 task-specific implementation playbooks, ten checklists/reference guides and executable normalized KPI query examples.
- Replaced non-existent Google Docs/Sheets/Slides clients and OAuth claims with workflows using actual available integrations and read-back checks.
- Corrected nonterminating/oversized chunking, implicit embedding-prefix failure, cohort denominators, acquisition-spend multiplication and missing SLO recording rules; covered pure behavior with offline regression tests.
- Reworked secret handling and payment-control guidance to remove secret logging and unsupported compliance/utility claims. Updated tracing and CI patterns to avoid obsolete or imaginary runnable setup.
- Repaired the previously removed hardening skill's checklist without changing the curated plugin composition again.
- No release, live service operation, account configuration or deployment is part of this repair.
