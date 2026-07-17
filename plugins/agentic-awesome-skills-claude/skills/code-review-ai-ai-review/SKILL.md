---
name: code-review-ai-ai-review
description: "Review exact code diffs with repository-native checks, optional static analysis, and evidence-bound semantic reasoning. Use for draft findings; verify every claim and require approval before publishing feedback or changing code."
risk: unknown
source: community
date_added: "2026-02-27"
---

# AI-Powered Code Review Specialist

Use static analysis and AI-assisted reasoning to review a change, but keep every finding traceable to the actual diff and repository evidence. Treat model output as a hypothesis until code, tests, or documentation confirm it.

## Use this skill when

- Reviewing a pull request or local diff for correctness, security, performance, maintainability, architecture, or missing tests.
- Combining repository-native checks with optional tools such as CodeQL or Semgrep.
- Preparing review comments for a human to approve.

## Do not use this skill when

- You cannot access the exact revision or diff being reviewed.
- The task requires a domain specialist, incident response, or a compliance certification.
- The user asked you to publish comments or change code but has not authorized that action.

## Inputs

Before reviewing, establish:

1. Base and head revisions, or the exact local diff.
2. Repository instructions and the checks the project considers authoritative.
3. Change intent, affected contracts, and risk-sensitive areas.
4. Whether the task is read-only, permits fixes, or permits publishing feedback.

If any of these materially changes the review, ask before proceeding.

## Review workflow

### 1. Bound the change

- Read repository instructions before tool output.
- Inspect the diff and the surrounding implementation, not isolated snippets.
- Identify public API, data-model, authorization, migration, concurrency, and deployment effects.
- For large changes, split review by subsystem. Do not substitute a shallow scan for a complete review.

### 2. Run repository-native checks

Use the project's documented formatter, type checker, tests, security checks, and build first. Do not invent commands. Record the command, revision, exit status, and relevant output. A passing check is evidence only for what that check covers.

### 3. Add focused static analysis

Run only tools that are installed or explicitly provisioned by the repository. Verify their configuration and language coverage. For example, a complete CodeQL CLI flow includes both database creation and analysis:

```bash
codeql database create codeql-db \
  --language=javascript-typescript \
  --source-root=.

codeql database analyze codeql-db \
  codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls \
  --format=sarif-latest \
  --output=codeql.sarif
```

Before running this example, verify the CodeQL CLI, query pack, build mode, and language identifier for the repository. Compiled languages may require an explicit build command. Never claim a SARIF result exists unless the analyze step completed successfully.

### 4. Perform semantic review

For each suspected issue:

1. Trace the relevant input and control flow.
2. Check callers, tests, schemas, configuration, and error paths.
3. Construct a concrete failure or abuse scenario.
4. Distinguish a defect from a preference or optional improvement.
5. Propose the smallest safe remediation and a verification method.

Review at least these dimensions when relevant:

- Correctness: boundary conditions, state transitions, errors, retries, and partial failure.
- Security: access control, authentication, injection, secrets, unsafe deserialization, request forgery, dependency risk, and security configuration.
- Data: migrations, transactions, idempotency, consistency, privacy, and retention.
- Performance: query count, allocation, blocking work, caching, pagination, and measured regressions.
- Interfaces: compatibility, validation, versioning, and downstream consumers.
- Operations: observability, rollout, rollback, configuration, and failure containment.
- Tests: changed behavior, negative cases, regression coverage, and test reliability.

Use current primary security guidance where useful, such as the live OWASP Top 10, OWASP ASVS, and CWE. Verify the current edition and map findings by behavior; do not assume a frozen category number or title remains current.

### 5. Validate AI-assisted findings

If an AI system is used, provide only the minimum necessary code and respect repository privacy rules. Require structured output containing file, line, severity, claim, evidence, remediation, and confidence. Then independently verify every proposed finding against the checked-out revision. Reject invented symbols, stale line numbers, unsupported severity, and generic advice.

Do not auto-apply model-generated fixes. Re-run the relevant checks after any authorized change.

## Finding format

Report confirmed findings first, ordered by impact:

```text
[severity] Short title
Location: path/to/file.ext:line
Evidence: what the code does and the reachable failure or abuse case
Impact: concrete consequence and affected scope
Remediation: smallest safe change
Verification: targeted test or command
```

Use severity consistently:

- Critical: credible catastrophic impact or immediate compromise.
- High: serious security, data-loss, availability, or correctness impact.
- Medium: material defect with bounded impact or prerequisites.
- Low: minor correctness or maintainability risk.

Label non-defects as optional improvements instead of inflating severity. If no findings remain, say so and list residual risks or checks you could not run.

## Approval and publishing boundary

Draft review comments locally first. Before posting comments, submitting a review, pushing fixes, changing pull-request state, or triggering a costly external service, obtain explicit user approval unless that external action was already clearly authorized. Never print a message that claims feedback was posted when no API operation occurred and was verified.

## Verification checklist

- [ ] Exact base/head or diff recorded.
- [ ] Repository instructions followed.
- [ ] Relevant native checks run and results captured.
- [ ] Optional analyzers verified and completed end to end.
- [ ] Every finding is tied to current code and a concrete impact.
- [ ] False positives and optional improvements are separated.
- [ ] Proposed fixes include targeted verification.
- [ ] Publishing or mutation occurred only with approval.

## Limitations

- Static analyzers and AI systems can miss defects and produce false positives.
- Review quality depends on accessible context, generated code, configuration, and realistic tests.
- A code review is not a penetration test, formal verification, production load test, or compliance certification.
- Tool installation, credentials, network access, and external service behavior must be verified in the local environment before use.
