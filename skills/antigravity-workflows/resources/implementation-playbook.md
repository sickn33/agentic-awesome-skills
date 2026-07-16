# Antigravity Workflows Implementation Playbook

This document explains how an agent should execute workflow-based orchestration.

## Execution Contract

For every workflow:

1. Confirm objective and scope.
2. Select the best-matching workflow.
3. Execute workflow steps in order.
4. Produce one concrete artifact per step.
5. Validate before continuing.

## Step Artifact Examples

- Plan step -> scope document or milestone checklist.
- Build step -> code changes and implementation notes.
- Test step -> test results and failure triage.
- Release step -> rollout checklist and risk log.

## Safety Guardrails

- Never run destructive actions without explicit user approval.
- If a required skill is missing, state the gap and fallback to closest available skill.
- When security testing is involved, ensure authorization is explicit.

## Suggested Completion Format

At workflow completion, return:

1. Completed steps
2. Artifacts produced
3. Validation evidence
4. Open risks
5. Suggested next action
