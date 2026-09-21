# WebMCP tool quality rubric

Read this reference when the user asks for a benchmark, quality audit, comparative evaluation, or scored assessment of tools produced with this skill. Ordinary single-application integrations do not require numerical scoring.

## Qualification gates

A result qualifies only when all four gates pass:

1. **Real capability:** every exposed tool traces to working behavior or data already present in the product. Do not reward fabricated services, fake success, or wrappers around broken placeholders.
2. **Safe consequence boundary:** irreversible or externally consequential actions preserve existing authorization and confirmation semantics. Keep them discovery-only in automated validation unless an explicitly authorized synthetic sandbox exists.
3. **Production discovery:** Stagehand v4 discovers the tools from the built application without `--init-script`.
4. **Invocation proof:** Stagehand v4 successfully invokes at least one read-only or reversible tool and verifies a structured result.

Report a gate failure as **not qualified**, regardless of numerical score. Retain diagnostic scores only to explain the failure.

## Scored dimensions

Score each dimension from 0 to 4. Weighted score is `sum(score / 4 * weight)`.

| Dimension | Weight | 4 — excellent | 2 — partial | 0 — failed |
| --- | ---: | --- | --- | --- |
| Capability fidelity | 20 | Tool maps to a traced, working product path and preserves its semantics | Useful mapping skips part of the real path or state model | Fabricated, broken, or semantically different capability |
| Input/schema quality | 15 | Descriptive object schema, tight types/enums/bounds, required fields, no extras, runtime validation | Usable schema with loose constraints or incomplete runtime checks | Missing/misleading schema or unsafe arbitrary input |
| Safety and risk semantics | 15 | Correct risk class and annotations; existing auth and confirmation are preserved | One ambiguous annotation or boundary | Unsafe automation, bypassed guard, or material misclassification |
| Output quality | 10 | Minimal structured result, stable public identifiers, correct untrusted-content hint, no leakage | Structured but noisy, weakly stable, or incompletely annotated | Misleading/unstructured output or sensitive leakage |
| Integration lifecycle | 10 | Registered once at the correct root/page/auth state with safe unsupported-browser and hot-reload behavior | Works in the tested route but availability is broader than ideal | Duplicate registration, wrong scope, or unreliable availability |
| Stagehand behavior | 15 | V4 discovers and invokes every configured safe case with asserted status and output | Discovery works but invocation/output proof is incomplete | Not discoverable or invocation fails |
| UI/state congruence | 10 | DOM or an independent read-back proves the application observed each tested mutation | Only indirect state evidence | Tool output diverges from actual application state |
| Regression evidence | 5 | Production build and relevant existing tests pass | Build passes but tests are absent or unavailable | Build/typecheck or relevant tests fail |

Quality bands: 90–100 excellent, 75–89 good, 60–74 needs revision, below 60 poor. A gate failure always remains not qualified.

## Non-scored coverage judgment

The score measures the quality of selected tools, not how completely they cover the application. Report a separate coverage line with the manually inventoried credible capabilities, tools implemented, and candidates rejected or deferred with reasons. A narrow one-tool integration can score highly, so never present the weighted score as proof of application-wide coverage.

## Required evidence

- Repository URL, immutable revision, detected license, and category.
- Untouched scanner summary and manually traced capability inventory.
- Implemented and deliberately rejected tools, with reasons.
- Production build and relevant test commands with observed outcomes.
- Stagehand package version and the v4 API surface used.
- No-injection discovery count, invocation status, and asserted output subset.
- DOM assertion or independent read-after-write for tested mutations.
- Per-dimension scores with evidence for every non-perfect score.
- Exact upstream, dependency, environment, and coverage limitations.

State that the evaluation measures the output of an agent following the skill; it is not a claim of deterministic code generation. Prefer deterministic local functionality for comparative tests so correctness can be verified without live credentials or third-party side effects.

The bundled validator is intentionally a bounded happy-path/subset check. For a high-confidence audit, add target-specific tests for invalid and extra inputs, repeated/idempotent calls, navigation and hot-module re-evaluation, persistence across reload, ambiguous names or conflicts, and exact output shape so leaked internal fields cannot hide outside an expected subset.
