---
name: pypict-skill
description: "Design pairwise PICT-style test models, constraints, generated cases, and coverage checks. Use when combinations are too large for exhaustive tests; verify local generator syntax and add explicit expected results."
risk: safe
source: "https://github.com/omkamal/pypict-claude-skill/blob/main/SKILL.md"
date_added: "2026-02-27"
---

# Pypict Skill

Design pairwise test suites from requirements or code using PICT-style models. Produce a reviewable model, generate cases only through a locally verified tool or API, and attach explicit expected results.

## When to Use This Skill

Use this skill when a behavior depends on several parameters and exhaustive combinations are impractical, for example API options, form inputs, deployment configurations, permissions, or device/browser matrices.

Do not use pairwise coverage as the only test strategy for critical multi-step interactions, stateful workflows, or defects known to require three-way or higher-order combinations.

## Workflow

### 1. Derive the test model

Read the requirements and implementation. Identify:

- **Parameters:** independent inputs, environmental factors, modes, or preconditions.
- **Values:** meaningful equivalence classes and boundary representatives, not every raw value.
- **Constraints:** combinations forbidden or required by business or technical rules.
- **Expected outcomes:** observable behavior and the source that defines it.

Keep valid and invalid-path suites separate when that makes expected behavior clearer. Do not add a constraint merely to reduce the number of generated rows.

### 2. Write PICT-style syntax

Define one parameter per line, followed by comma-separated values:

```text
UserType: Guest, Registered, Premium
PaymentMethod: Card, Wallet, BankTransfer
ShippingMethod: Standard, Express
```

Reference parameter names in square brackets. Quote values when whitespace or punctuation makes parsing ambiguous. End constraints with a semicolon:

```text
# Guests cannot use bank transfer
IF [UserType] = "Guest" THEN [PaymentMethod] <> "BankTransfer";

# Express shipping is unavailable to guests
IF [ShippingMethod] = "Express" THEN [UserType] <> "Guest";
```

Common operators in PICT-style models include `=`, `<>`, `IN`, `NOT IN`, `AND`, `OR`, `IF`, `THEN`, and `ELSE`. Exact grammar and support vary by implementation, so verify every operator against the selected local tool or API before relying on it.

### 3. Verify the generator before use

Do not assume that a `pict` or `pypict` executable, Python package, helper script, or particular API is installed. Inspect the repository environment and the selected implementation's local help or documentation to establish:

1. executable or import name and version;
2. accepted model syntax and character encoding;
3. default interaction strength and how to request pairwise strength;
4. output format, randomization or seed behavior, and exit-status semantics;
5. constraint, alias, negative-testing, and sub-model support.

If no generator is available, return the model and say that cases were not generated. Ask before installing software or sending the model to an online service.

### 4. Generate and inspect cases

Run the verified local interface with pairwise interaction strength. Preserve the model, tool/version, invocation, exit status, and raw output so the suite can be reproduced.

Then validate the output:

- every row uses declared values;
- every row satisfies all constraints;
- each valid pair of values from different parameters appears in at least one row;
- required boundary and negative scenarios are present;
- duplicate rows and impossible combinations are absent.

Do not claim pairwise coverage solely because a tool exited successfully. For small models, independently enumerate valid pairs and compare them with generated rows. For large models, use a separate coverage checker or a focused audit sample.

### 5. Add test oracles

Pairwise generation selects inputs; it does not determine correct outcomes. For each row, derive an expected result from requirements, code, schema, or a named oracle. Use specific observations such as status code, state transition, persisted value, emitted event, or error type.

Flag rows whose outcome is ambiguous instead of inventing an expectation.

## Output Format

Return:

1. assumptions and unresolved requirement questions;
2. the complete model and constraints;
3. generator identity/version and reproducible invocation, or a clear `not generated` status;
4. a table with case ID, parameter values, expected result, and requirement reference;
5. validation evidence and uncovered risks.

Example table:

| Case | UserType | PaymentMethod | ShippingMethod | Expected result |
| --- | --- | --- | --- | --- |
| P01 | Guest | Card | Standard | Checkout accepts the supported combination |
| P02 | Premium | BankTransfer | Express | Checkout applies the documented premium shipping rule |

The rows above illustrate presentation only; they are not claimed generator output.

## Model Review Checklist

- [ ] Parameters correspond to independent behavior drivers.
- [ ] Values represent documented partitions and boundaries.
- [ ] Constraints reflect real rules and include rationale.
- [ ] Generator interface, version, and syntax were verified locally.
- [ ] Output rows satisfy constraints and valid pair coverage was checked.
- [ ] Expected results come from an explicit oracle.
- [ ] Higher-order, sequential, security, and performance risks have separate tests where needed.

## Source

Adapted from the workflow in [omkamal/pypict-claude-skill](https://github.com/omkamal/pypict-claude-skill/blob/main/SKILL.md). This local version narrows the guidance to implementation-agnostic, locally verified PICT-style generation.

## Limitations

- Pairwise coverage guarantees only the modeled valid two-way interactions; it does not prove correctness or complete path coverage.
- Missing parameters, values, or incorrect constraints invalidate the resulting suite.
- Constraints can silently remove important coverage and must be reviewed independently.
- Generated cases still require test data, setup, cleanup, assertions, and environment-specific validation.
- Tool installation, command names, Python APIs, and advanced syntax must be verified against the actual local implementation before use.
