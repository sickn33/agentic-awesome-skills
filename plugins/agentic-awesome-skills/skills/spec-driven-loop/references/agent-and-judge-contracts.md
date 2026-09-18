# Agent and Judge Contracts

Read this reference only after the specification and acceptance contract are frozen and the user has approved implementation. The main agent owns these contracts, integration, and final judgment.

## Subagent Task Contract

```markdown
Task ID:
Objective:
Related FR IDs:
Related AC IDs:

Inputs:
Dependencies and prerequisite state:
Frozen contracts/types/schemas:

Allowed files or directories:
Forbidden files or directories:

Required implementation outputs:
Required tests or documentation:
Checks that must be executed:
Evidence that must be returned:

Stop and report if:
- a requirement or acceptance condition must change;
- a frozen shared contract must change;
- an allowed path is insufficient;
- another task owns a required file;
- a dependency is missing or inconsistent;
- a security, data-loss, migration, or external-compatibility risk appears.

Completion authority: Report task results and evidence only. Do not declare overall acceptance.
```

## Subagent Completion Report

Require this exact field set so integration evidence is comparable:

```text
Status:
Acceptance IDs addressed:
Files changed:
Behavior implemented:
Checks executed:
Results:
Evidence:
Assumptions:
Risks:
Contract deviations:
```

`Status` describes the assigned task only. Any non-empty `Contract deviations` field is a main-agent review trigger, not an implicit approval.

## File Ownership Rules

1. Express ownership with explicit repository-relative paths or narrowly defined directory trees; never use phrases such as "related files" or "files as needed".
2. Freeze shared interfaces, schemas, generated clients, public types, and migration ordering before parallel work.
3. Give each writable file to one task at a time. Read access may overlap; write ownership may not.
4. If two tasks require the same file, order them serially or assign the shared edit to a separate prerequisite task.
5. A subagent must stop and request an ownership amendment before editing outside its allowed scope.
6. Only the main agent may approve an ownership amendment, recheck overlap, update `AGENT_PLAN.md`, and notify affected tasks.
7. Changes beyond the frozen scope return to specification approval; they are not ownership amendments.

## Main-Agent Integration Checklist

- Inspect actual diffs and changed files, not only reports.
- Compare changed paths with every task's ownership contract.
- Confirm shared contracts match the frozen version across modules.
- Integrate in dependency order and resolve conflicts centrally.
- Check that no task expanded requirements or weakened tests/acceptance.
- Run the highest feasible end-to-end path.
- Run applicable unit, integration, regression, migration, rollback, permission, invalid-input, idempotency, concurrency, failure, and recovery checks.
- Collect observable evidence for every blocking AC.
- Update the current `LOOP.md` attempt before reaching a judgment.

## Acceptance Matrix

```markdown
| Acceptance ID | Result | Evidence | Defect/Caveat |
|---|---|---|---|
| AC-001 | Pass | <test/log/API/DB/screenshot/metric/manual check> | None |
```

Use only `Pass`, `Fail`, or `Blocked` per row. A blocking row without adequate evidence cannot be `Pass`. After evaluating all rows, choose exactly one overall judgment:

- `ACCEPTED`: every blocking AC passes and the Definition of Done is met.
- `ACCEPTED_WITH_CAVEATS`: every blocking AC passes; documented non-blocking limitations remain.
- `CHANGES_REQUESTED`: one or more ACs fail and a bounded repair is feasible.
- `BLOCKED`: required validation or implementation cannot proceed because of an unresolved dependency or decision.

## Rework Task Contract

```markdown
Rework Task ID:
Source Loop ID:
Failed AC IDs:
Reproduction evidence:
Observed versus expected behavior:
Minimum repair scope:
Allowed files or directories:
Forbidden files or directories:
Required regression test:
Checks and evidence required:
Unchanged frozen contracts:
Stop and report if:
Attempt number for each failed AC:
```

Append rework as a new loop. Do not erase the failed attempt, broaden the repair beyond failed ACs, or lower an acceptance condition to produce a pass.

## Three-Consecutive-Failures Stop Rule

Track failure counts per AC, not per project. When the same AC fails main-agent judgment in three consecutive loops:

1. stop automatic rework for that AC;
2. set `LOOP.md` to `blocked` unless other independent work may safely continue;
3. present the three attempts and evidence to the user;
4. ask the user to choose redesign, scope change, acceptance of a documented limitation, or termination of that part;
5. obtain renewed specification approval before continuing after redesign or scope/acceptance changes.
