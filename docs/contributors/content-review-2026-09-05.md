# Scoped content review — 2026-09-05

This review improves 20 priority skills, repairs two empty procedures and gives all
eight identical-body groups an explicit compatibility disposition. It does not
certify the whole catalog or demonstrate that a skill improves model performance.
The catalog still contains 2,111 callable IDs.

The [machine-readable record](content-review-2026-09-05.json) contains every reviewed
file's byte count, mode and SHA-256, a complete-tree fingerprint, the selection basis,
all remaining structural findings and the observed SDK probe results. The 39 content
trees and the accompanying maintainer-policy tree were inspected in full, including
their support files. This is a Codex source review with local verification. The
protected PR's actual Tessl result or exact-head maintainer attestation is separate.
Later edits make the affected fingerprints stale; this dated record is not a badge
that follows a skill indefinitely.

## Scope and changes

The priority cohort is the top 20 skills by occurrences in the repository's existing
workflow and focused-bundle references, with ties sorted by ID. This measures editorial
prominence, not downloads, community preference or usage.

| Skill | Concrete correction |
| --- | --- |
| auth-implementation-patterns | Explicit token claims and algorithm, session rotation, ownership checks and an atomic refresh-token contract. |
| frontend-design | Preserve the user's brand; identify the scoring rubric as subjective and show a concrete small-screen flow. |
| test-driven-development | Preserve existing work, characterize behavior and report the actual timing of a failing test. |
| ab-test-setup | Predeclare decisions and use a statistical sample-ratio check; remove universal rollout rules. |
| agent-evaluation | Handle Wilson interval boundaries and report failures honestly; remove unsupported leaderboard claims. |
| analytics-tracking | Distinguish observations from an unvalidated rubric; reconcile duplicate purchase events. |
| browser-automation | Use observed readiness and bounded retries; remove default stealth, sandbox disabling and invented success rates. |
| langfuse | Version-scoped SDK guidance, approved data export and explicit limits of masking. |
| mcp-builder | Version-scoped server examples, complete tool-result serialization, bounded evaluation and whole-batch tool allowlisting. |
| seo-audit | Separate field measurements, hypotheses and subjective prioritization; remove unsupported scoring claims. |
| stripe-integration | Stable operation idempotency, raw-body webhook verification and rejection of zero or invalid partial refunds. |
| systematic-debugging | Preserve user work and private data; bound the polluter helper and distinguish failed tests from a clean run. |
| api-security-best-practices | Replace incomplete snippets with explicit identity, tenant, validation, quota and sensitive-data boundaries. |
| content-creator | Use sourced claims and descriptive text diagnostics; remove invented ranking scores and platform-performance guarantees. |
| e2e-testing-patterns | Web-first assertions, independent fixtures, real sharding commands and honest integration prerequisites. |
| llm-app-patterns | Replace stale plan queues, require bounded tool loops and scope opt-in caches and experiment assignments. |
| observability-engineer | Define actionable denominators and data gaps; restrict log fields and metric cardinality. |
| ai-agents-architect | Exact tool names, application-owned permissions and public action summaries; no automatic delegation or memory writes. |
| analytics-product | Correct the weekly-active-customer SQL and handle invalid, sparse and zero-baseline experiment data. |
| api-patterns | Correct runtime-validation claims and label the file scanner as a bounded text heuristic. |

`cc-skill-continuous-learning` now documents a bounded, read-only transcript counter.
`cc-skill-strategic-compact` documents a stateless reminder using an explicit count.
Neither claims to learn automatically, compact context or write global memory.

The [compatibility mapping](content-aliases.json) retains 17 IDs across eight groups.
Each alias contains the full shared procedure and support bundle for offline use.
The four missing `internal-comms-community` examples are restored. Compatibility
notices identify the shared primary path without changing Core selection eligibility.
These are retained aliases, not 17 newly differentiated workflows; their duplicated
payload remains a distribution tradeoff. The alias-integrity test detects procedure
or support-file drift.

## Verification and limits

Reproduce the focused, synthetic behavior checks from the repository root:

```sh
node tools/scripts/tests/cc_skill_session_helpers.test.js
python3 tools/scripts/tests/test_priority_skill_examples.py
node tools/scripts/tests/priority_skill_js_examples.test.js
node tools/scripts/tests/content_alias_integrity.test.js
npm run validate
npm run validate:references
npm run security:docs
npm run audit:skills
```

The Python suite exercises ten cases, including the actual published SQL, replanning,
cache isolation and empty cache hits, refunds, text diagnostics, evaluation tool
batches, inventory pagination, telemetry failures and polluter exit behavior. The
JavaScript suite checks published interval, identifier, parsed-body and token-claim
definitions with synthetic adapters. These checks do not constitute JWT cryptographic
verification, a deployed authentication service or a real payment-provider call.

A separate local environment used MCP Python SDK 1.29.1, Anthropic SDK 0.125.0,
SciPy 1.18.1 and defusedxml 0.7.1. An actual stdio SDK connection initialized, listed
tools and called a synthetic server while preserving structured content and tool
errors. SciPy boundary cases passed; malformed, empty and entity-bearing XML fixtures
were rejected. No Anthropic model API was called. This is SDK compatibility evidence,
not a supported-client effectiveness result or production-service validation.

Many examples intentionally require an application adapter, installed SDK version,
authorization model or real dataset. Their limitations remain visible in the skills.
Provider integrations, deployment, statistical assumptions, brand decisions and
performance outcomes must be validated in the user's own context. Original source
metadata and license notices remain; modified licensed instructions are identified.

## Remaining corpus debt

| Structural observation | Before | After |
| --- | ---: | ---: |
| Skills scanned | 2,111 | 2,111 |
| Skills with warnings | 754 | 747 |
| Errors | 0 | 0 |
| Warnings | 814 | 806 |
| Missing examples | 466 | 460 |
| Long top-level skill files | 214 | 212 |
| Possibly truncated descriptions | 134 | 134 |

No new structural findings were introduced. The 806 remaining warnings are listed
individually in the JSON record, including warnings within the reviewed cohort.
Their existence is not hidden by generic filler sections or a blanket "validated"
label. These heuristics identify editorial work; they do not determine whether a
procedure is correct, safe in every environment or effective for a particular model.
