# AAS v1 independent verification baseline

This directory is the independently owned Phase-0 baseline for the AAS
agent-first control plane. It is deliberately separate from product and scorer
code. Product changes consume this baseline; they do not rewrite it.

## Current state

The Phase-0 candidate is fully authored and independently reviewed: 180
held-out cases, 60 tuning cases, 30 explicit abstention cases, two
content-addressed reviewer attestations, 32 hostile exploit/control classes,
the 41-case registry-14.6.0 legacy corpus, fixed seeds, and the six-job runtime
contract. It becomes immutable when the freeze manifest is generated and the
dedicated baseline PR lands on protected `main`.

The complete local gate is:

```sh
npm --prefix verification/aas-v1/verifier test
npm --prefix verification/aas-v1/verifier run check:schemas
npm --prefix verification/aas-v1/verifier run check:structure
npm --prefix verification/aas-v1/verifier run check:benchmark:frozen
npm --prefix verification/aas-v1/verifier run check:secondary:frozen
node verification/aas-v1/baseline/v1/hostile/verify-fixtures.mjs
node verification/aas-v1/baseline/v1/legacy/14.6.0/validate-snapshots.mjs
npm --prefix verification/aas-v1/verifier run check:freeze-ready
npm --prefix verification/aas-v1/verifier run freeze:check
```

A green gate proves internal consistency and byte identity of the frozen
baseline. Product acceptance still requires the separate black-box evidence
defined in the goal contract.

## Freeze protocol

1. Land this baseline through a dedicated PR before scorer implementation.
2. Independent reviewers author or approve real case inputs, coherent
   accepted-equivalent gold sets, abstention labels, seeds, hostile fixtures,
   legacy snapshots, and exact runner/observer identities.
3. Two named reviewers approve the complete baseline. At least one reviewer
   must not implement the scorer.
4. Protected `main` requires the `aas-v1-baseline` job from
   `.github/workflows/aas-v1-baseline-check.yml` on every PR.
5. The workflow produces a content-addressed freeze manifest. Any later change
   to a protected baseline path invalidates prior product evidence.

Candidate binaries receive normalized profiles, never case IDs, gold labels,
fixture filenames, or test-only environment markers. Crashes, timeouts, and
missing outputs are failures and remain in frozen denominators. No retries are
used to select a favorable result.

## Protected surfaces

The baseline, verifier, ownership contract, workflow, and CODEOWNERS entries
are one protection unit. This solo-maintainer repository records two
independent content-addressed agent reviews and enforces them through the
required status check; it does not misrepresent those reviews as approvals by
two separate GitHub collaborators.
