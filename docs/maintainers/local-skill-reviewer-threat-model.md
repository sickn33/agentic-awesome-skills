# Local skill reviewer threat model

## Assets and trust boundaries

Protected assets are repository contents, credentials, local configuration, network authority, review integrity, and truthful completion state. Trusted code is limited to deterministic discovery, validation, local level assignment, scoring, triage, packet construction, schemas, and atomic state/output machinery. Skill files, bundles, Codex judgments, cached data, YAML, Markdown, URLs, candidates, and patches are untrusted.

The local `manual-review-required` status is namespaced to `source: local-skill-reviewer`. It is a triage escalation, not a Tessl result, CI fallback attestation, exact-head approval, or merge authorization.

## Primary threats and controls

| Threat | Control | Failure behavior |
| --- | --- | --- |
| Prompt injection or fabricated scores | Production triage executes no model; semantic packets place a trusted hostile-input instruction outside source data; imported judgments bind exact evidence and all anchor comparisons | Reject malformed, unbound, stale, or out-of-range judgment |
| Tool, shell, MCP, browser, URL, Tessl, or Codex CLI execution | Runtime analyzer has no tool or service adapter and never follows content-derived links or commands | Abort review; offline sentinel tests fail on invocation |
| Credential exfiltration | Likely credential values are redacted from heuristic evidence; semantic packets include only tracked, bounded Git blobs under the allowed bundle roots | Reject sensitive identifiers or malformed imports; repository secret scanning remains a separate gate |
| Path traversal or symlink escape | Git mode/object allowlist, frozen-index reads, POSIX-relative normalization, bounded descriptor reads, physical containment, and symlink-safe output parents | Structured input/output failure |
| YAML expansion or unsafe tags | Frontmatter byte, node, and depth caps; strict parser; aliases, anchors, and tags forbidden | Validation failure and manual escalation |
| Oversized or binary bundle | Per-file, bundle, and count caps; primary Markdown requires UTF-8; binary bytes are hash-only; semantic packets omit rather than invisibly truncate supplemental text | Cap stop or explicit metadata-only/omitted source |
| Cache poisoning or stale evidence | Whole-bundle hashes plus rubric, schema, validator, analyzer, runtime, threshold, and reviewer identity | Cache miss and safe recomputation |
| Crash misreported as completion | Atomic writes and explicit pending/running/completed/failed state; semantic artifact sets require final hash-bound markers | Resume or reject incomplete output |
| False Tessl equivalence | Output calls itself `local-triage-only`, uses `local_quality_score`, and includes a non-equivalence disclaimer; documentation preserves separate validation, blind, and Tessl-repeat figures | Claim is rejected in review; no Tessl-pass prediction is emitted |
| Cost or retry storm | Production runtime has no Tessl dependency; future Tessl use is a separate sample audit only | No paid-service call from triage |
| Unreviewed repository mutation | Reviewer output is outside the repo and the production CLI has no apply path; Codex correction requires normal authorization, diff inspection, references, validation, security, and tests | Correction cannot be called complete until gates rerun |
| Merge bypass | `--merge-gate` always emits P0 and records that exact-head attestation is still required | Maintainer workflow remains blocking |

## Residual risk

Deterministic rules cannot fully understand semantics and can produce false positives or negatives. Codex can still be influenced by hostile text; exact evidence and schema validation prove provenance, not model invulnerability. The accepted 74.5% measurement is Codex-assisted validation performance, not deterministic or blind accuracy. Blind equivalence and stability were not demonstrated. Independent security, repository, and exact-head merge review remain necessary.
