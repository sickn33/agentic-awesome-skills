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

## Product verifier

The product verifier accepts one `npm pack --ignore-scripts` tarball and runs
from a checkout controlled by the verifier owner. It installs the candidate
outside that checkout and exercises only the three published binaries or
driver subprocesses that import the packed production core. Test-mode hooks
are forbidden.

The protected acceptance workflow has six mandatory jobs: Node 22 and 24 on
Linux, macOS Intel, and Windows. Every job emits one canonical, immutable
receipt for the exact nine-suite set. The aggregator rejects missing or
duplicate jobs, candidate/verifier digest drift, reduced 100,000-property or
50,000-fuzz denominators, non-identical canonical payloads, missing hostile or
legacy cases, and incomplete fault/race coverage.

Two workflow surfaces are intentionally distinct:

- `aas-v1-verifier-harness.yml` validates this verifier, schemas, freeze and
  the native observer sentinel on all six runtimes. It makes no product claim.
- `aas-v1-product-verifier.yml` runs only for product-affecting changes or an
  explicit dispatch. Product acceptance additionally requires an external,
  production-binary transaction report. A missing report fails closed with
  `AAS_VERIFIER_TRANSACTION_EVIDENCE_MISSING`; static or test-mode evidence is
  rejected. The workflow is not allowed to turn that missing controller into
  a skipped or allowed-failure job.

Example acceptance entrypoint:

```sh
node verification/aas-v1/verifier/bin/verify-product.mjs \
  --tarball /absolute/agentic-awesome-skills.tgz \
  --candidate-commit 0123456789012345678901234567890123456789 \
  --verifier-commit 0123456789012345678901234567890123456789 \
  --job-id linux-node-22 \
  --transaction-evidence /absolute/transaction-evidence.json \
  --work-root /absolute/isolated-work \
  --out /absolute/job-receipt.json
```

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
