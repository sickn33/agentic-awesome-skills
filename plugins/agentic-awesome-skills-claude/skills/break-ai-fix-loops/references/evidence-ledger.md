# Repair evidence ledger

Copy this template to a task-owned path. Do not commit runtime evidence unless the project requires it. Preserve full raw output separately and keep this ledger free of secrets and personal data.

```markdown
# Repair ledger

## Contract
- Acceptance claim:
- Defect-disproving behavior:
- Baseline revision:
- Baseline configuration:
- Baseline input and digest:
- Baseline command:
- Baseline literal output/result:
- Baseline exit status:
- Real execution path:
- Primary verification command:
- Rollback command:
- Expected restored behavior/status:

## Attempts
| # | Hypothesis | Discriminating prediction | Changed paths / patch hash | Focused result + exit | Real-path result + exit | Symptom fingerprint | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

## Root-cause shifts
### Shift after attempt <n>
- Repeated fingerprint or unchanged state:
- Mechanisms already attempted:
- Evidence against each mechanism:
- Next unobserved owner boundary:
- New observation:
- Replacement hypothesis:
- Different predicted observation:

## Modified proof
- Revision:
- Exact command:
- Input/configuration:
- Literal output/result:
- Exit status:
- Real-path observation:

## Negative control on disposable copy
- Copy path or worktree:
- Known-bad mutation/input:
- Exact primary verification command:
- Literal output/result:
- Exit status (must be non-zero):
- Intended failure classification:
- Untouched modified tree rerun result:
- Untouched modified tree rerun exit status:

## Rollback on another copy
- Copy path or worktree:
- Exact rollback command:
- Literal rollback output/result:
- Rollback exit status:
- Baseline hash comparison:
- Restored behavior/status:
- Baseline command rerun exit status:
- Primary modified tree status:

## Decision
- Status: PROVEN | INCONCLUSIVE | BLOCKED
- Attempts consumed: <0-3>
- Decisive evidence:
- Remaining gap or next discriminating observation:
```

## Fingerprint record

Create one sanitized JSON record for every observed symptom:

```json
{
  "schema_version": 1,
  "command": "npm test -- --runInBand path/to/regression.test.js",
  "input_digest": "sha256:replace-with-real-input-digest",
  "exit_code": 1,
  "failure_class": "assertion-mismatch",
  "stable_excerpt": "expected enabled; observed disabled",
  "real_path_state": "settings page still shows disabled after reload"
}
```

Keep the primary verification command unchanged across attempts unless the contract was wrong. If it changes, record why and preserve results from both commands; otherwise a changed verifier can hide an unchanged defect.
