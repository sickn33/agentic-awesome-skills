# UX3 original diagram restoration — 2026-10-24

Issue: [#2092](https://github.com/sickn33/agentic-awesome-skills/issues/2092).
Protected source base: `d86e77d6c5cb8b57fe7058f46a79d358a0611f33`.

## Source completeness and provenance

Restored the two original regular, non-executable files from
`cis2042/ux3-product-design-harness` at
`48965c6b501f61ebbb8130c9c2e4f9af08922b9f`:

| Path within the skill | Original and restored Git blob |
| --- | --- |
| `resources/assets/decision-gate.svg` | `2c2ca8885ea4469737334d9f18fcf8716871c7af` |
| `resources/assets/harness-sequence.svg` | `2c2d2ca6126c44a9130efd4371eaae3645d5e00e` |

Both blobs also match the skill's declared source snapshot
`7f9f724c5e31813d1c35767f9f454fe9a1e96891`.
The canonical skill now retains all 91 upstream file paths, with no extra or
missing paths. Existing reviewed text/code adaptations remain. This is file-set
completeness, not a claim that every file equals upstream.

The unchanged MIT license is blob
`43eff4d76f3a65a94a2d4dfc71ab3b1dd56d3fba`; its copyright notice remains intact.
The handbook links the decision diagram and the coding-harness comparison links
the operating sequence. Both relative image links resolve to restored files.
No references to the three diagrams absent upstream were restored.

## Review and validation boundary

The previous complete individual review is recorded in
`individual-review-150-batch-17-2026-10-23.{md,json}`. All 89 existing files at
this protected base match that review's `afterSha256` entries; none was silently
replaced. The only subsequent changes within that tree are the two restored SVGs
and the two documentation image links, reviewed here as a supplemental delta.

Both complete SVG sources were inspected: static shapes, paths, groups and text
only; no scripts, event handlers, foreign objects, external references, embedded
resources, CSS URL fetches, DTDs or entity declarations. XML parsing, exact Git
blob identity, original MIT identity and both documentation targets were checked.
The diagrams summarize the existing process and do not create execution or
publication authority. Existing limitations on evidence, authenticated approval,
independent reviews and advisory heuristics remain applicable.

This owner-authored source repair uses exact-head maintainer review and existing
protected checks. It does not extend the fork extension allowlist or weaken
review policy. Required component preflight and exact-main CI/CodeQL results are
retained in the maintenance-cycle evidence and PR checks; a skipped Tessl job is
not represented as a passing review.

No release, npm publication, deployment or generated distribution refresh is
part of this repair. Source installations from the repaired commit include the
assets; existing published packages and plugin snapshots retain their last
release until a separately authorized publication. File inspection does not
certify a native-client installation or a host model's product judgments.
