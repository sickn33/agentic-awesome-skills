---
name: antigravity-workflows
description: "Use when asked to ship a SaaS MVP, audit application security, build an AI agent, run browser QA, or design a domain model with multiple skills and verified checkpoints."
risk: none
source: self
date_added: "2026-02-27"
---

# Antigravity Workflows

Use this skill to turn a complex objective into a guided sequence of skill invocations.

## When to Use This Skill

Use this skill when:
- The user wants to combine several skills without manually selecting each one.
- The goal is multi-phase (for example: plan, build, test, ship).
- The user asks for best-practice execution for common scenarios like:
  - Shipping a SaaS MVP
  - Running a web security audit
  - Building an AI agent system
  - Implementing browser automation and E2E QA

## Workflow Source of Truth

Read workflows in this order:
1. `docs/users/workflows.md` for human-readable playbooks and recorded cases.
2. `data/workflows.json` for machine-readable workflow metadata.

Those paths belong to the AAS repository, not necessarily the user's project.
When they are absent from a standalone installation, use the bundled
[workflow cards](references/workflow-cards.md). Do not invent missing files,
fetch a moving replacement silently, or create AAS documentation in the project.

## How to Run This Skill

1. Identify the user's concrete outcome.
2. Propose the 1-2 best matching workflows.
3. Follow an already specified workflow; ask only when the choice materially changes scope.
4. Execute step-by-step:
   - Announce current step and expected artifact.
   - Invoke recommended skills for that step.
   - Verify completion criteria before moving to next step.
   - If a check fails, retain the failure, fix the relevant input or implementation,
     rerun that check, and continue only after it passes. If a prerequisite is
     unavailable, report that exact blocked step and continue independent work.
   - Review the exact skill IDs and their support files before installation. Use the
     supported direct installer's `--dry-run` with the selected IDs and destination;
     install only within the user's authorization. Core composition and immutable
     plans remain review artifacts and do not install the skills.
     If preview fails, correct the ID, release, prerequisite or destination and
     preview again. A failed preview never authorizes installation.
5. At the end, provide:
   - Completed artifacts
   - Validation evidence
   - Remaining risks and next actions

## Default Workflow Routing

- Product delivery request -> `ship-saas-mvp`
- Security review request -> `security-audit-web-app`
- Agent/LLM product request -> `build-ai-agent-system`
- E2E/browser testing request -> `qa-browser-automation`
- Domain-driven design request -> `design-ddd-core-domain`

For a concrete selection and installer command, see the
[reviewed-selection handoff](references/workflow-cards.md#reviewed-selection-handoff).

## Copy-Paste Prompts

```text
Use @antigravity-workflows to run the "Ship a SaaS MVP" workflow for my project idea.
```

```text
Use @antigravity-workflows and execute a full "Security Audit for a Web App" workflow.
```

```text
Use @antigravity-workflows to guide me through "Build an AI Agent System" with checkpoints.
```

```text
Use @antigravity-workflows to execute the "QA and Browser Automation" workflow and stabilize flaky tests.
```

```text
Use @antigravity-workflows to execute the "Design a DDD Core Domain" workflow for my new service.
```

## Limitations

- This skill orchestrates; it does not replace specialized skills.
- It depends on the local availability of referenced skills.
- It does not guarantee success without environment access, credentials, or required infrastructure.
- For stack-specific browser automation in Go, `go-playwright` may require the corresponding skill to be present in your local skills repository.

## Related Skills

- `concise-planning`
- `brainstorming`
- `workflow-automation`
- `verification-before-completion`
