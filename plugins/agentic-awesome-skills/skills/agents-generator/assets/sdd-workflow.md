# SDD Workflow

Software Design Document — design before implementing.

## Preflight Defaults (cached, do not re-ask)

- **Pace**: {{SDD_PACE}}
- **Artifacts**: {{SDD_ARTIFACTS}}
- **Delivery strategy**: {{SDD_DELIVERY}}
- **Review budget**: {{SDD_REVIEW_BUDGET}} lines
- **Chain strategy**: {{SDD_CHAIN_STRATEGY}}

## Rules

- Sub-agents can make errors (duplicate blocks, wrong types) — always review their output.
- After each SDD phase: run the full verification cycle.
- On archive: verify all tasks marked done, delta specs synced to main specs.

## Post-Apply Verification (MANDATORY)

After `sdd-apply` completes and before advancing to `sdd-verify`, the orchestrator MUST run the verification cycle:

```
{{VERIFICATION_CYCLE}}
```

{{MONOREPO_POST_APPLY}}
{{DOCTOR_POST_APPLY}}

## Spec Verification

Project specs are located at:
{{SPECS_LOCATIONS}}

Consult these sources before making architectural changes or adding new features.

## Generation Rules

- **SDD_PACE**: "Interactive" by default. "Automatic" if the project uses auto in CI.
- **SDD_ARTIFACTS**: "both" if OpenSpec + Engram exist, "openspec" if only OpenSpec, "engram" if only Engram.
- **SDD_DELIVERY**: "ask-on-risk" by default. "exception-ok" if the project prefers large PRs.
- **SDD_REVIEW_BUDGET**: 400 by default. Adjust based on the project's typical PR size.
- **SDD_CHAIN_STRATEGY**: "stacked-to-main" if fast merge, "feature-branch-chain" if long feature branches.
- **MONOREPO_POST_APPLY**: If monorepo, add shared package rebuild steps before the cycle.
- **DOCTOR_POST_APPLY**: If react-doctor exists, add rule about new issues.
- **SPECS_LOCATIONS**: List docs/specs/, OpenSpec, relevant Engram topics.
