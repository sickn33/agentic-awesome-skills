---
name: performance-testing-review-multi-agent-review
description: "Use when working with performance testing review multi agent review"
risk: critical
source: community
date_added: "2026-02-27"
---

## Compatibility and maintenance

Compatibility alias of `error-debugging-multi-agent-review`; use that ID for new references when no existing contract requires this one. The full instructions and support files remain local so existing installations
continue to work offline. This is one shared procedure, not an additional capability.
Preserve the callable ID when an existing manifest or client configuration uses it.
Modified in AAS on 2026-09-05; original metadata and license notices are retained.

# Coordinate a bounded code review

## When to Use
Review a defined diff or subsystem from several relevant perspectives, such as
correctness, authorization and performance. The skill describes a review procedure;
it does not install an orchestration engine or prove compliance.

## Inputs and execution scope
Pin repository/base/head, the changed paths, intended behavior and available tests.
Use independent agents only if the user authorizes delegation and the host supports
it. Otherwise conduct the perspectives sequentially. Do not spawn agents merely
because this callable ID contains “multi-agent”. Read-only review is the default;
fixes, external posts and deployment stay within the user's actual task authority.

## Review process
1. Read the complete diff and the directly affected call paths and tests.
2. Choose only perspectives relevant to the change. Give each authorized reviewer a
   bounded question, owned paths, time/effort limit and expected evidence format.
3. Record findings with exact locations, trigger, consequence and reproduction. Keep
   hypotheses separate from demonstrated failures; do not invent confidence scores.
4. Reproduce important findings centrally. Deduplicate by root cause, not wording.
5. Resolve disagreement through code or tests. Weighted votes and multiple agents
   repeating a claim are not evidence of correctness.
6. Return blockers first, then material improvements and untested areas. Preserve
   the original failing result; a rerun does not erase it.

## Example
For a tenant-scoped cache change, review key construction, authorization context and
invalidation. Reproduce two tenants requesting the same prompt and different prompt
versions within one tenant. Expected result: a finding only if an actual cross-scope
hit or stale result can occur, with the smallest case showing it. A general style
opinion must not be presented as a data-exposure defect.

## Limitations
No agent-routing code, compliance validator or quality-score calculator is bundled.
Parallel review adds cost and can duplicate blind spots. This procedure cannot prove
whole-repository safety from a diff, nor authorize production load tests or messages.
