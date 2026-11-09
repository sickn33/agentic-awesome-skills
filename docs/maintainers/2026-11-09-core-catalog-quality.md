# Core, catalog and editorial review — 2026-11-09

Source baseline: `9ffb3aafc57fb29951e3da281de6556c31570800` (20.7.0).
This is source maintenance without publication. Generated indexes and plugin mirrors
remain release-owned; no runtime version, npm package or live site is changed here.

## Reproduced runtime defects

- **Installer recovery:** when publishing a staged entry and restoring the previous
  entry both failed, the unconditional staging cleanup deleted the previous content.
  Preserve that backup and report its recovery path. Do not overwrite an observed
  concurrent replacement, including a dangling symlink. Fault-injection fixtures
  cover success, successful rollback, failed rollback and both concurrent cases.
- **Cache reads:** a file that grew after its size check could be read beyond the
  configured limit before rejection. A same-size modification was accepted by the
  scanner. Read only the validated size, handle short reads, and compare file
  metadata before/after. Fixtures cover growth, truncation, same-size modification
  and unchanged digest with short reads. This is not a claim of an atomic snapshot
  against a hostile filesystem; catalog digest verification remains required.
- **Literal search:** technical names inside prose lost punctuation when indexed.
  `Next.js`, `Node.js`, `CI/CD` and `.NET` failed literal matching despite appearing
  in descriptions. Preserve technical tokens in Core and the web catalog while
  retaining component tokens, aliases, explicit matching modes and catalog order.
  Regressions also cover `C++`, `C#`, punctuation and required terms.

The review also inspected Core skill-file containment, archive validation, strict
JSON parsing and MCP stdio bounds. No new finding is claimed for those surfaces;
existing protocol and boundary regressions remain in the full validation plan.

## Catalog interaction changes

Show removable active filters outside the advanced panel, with a clear-all action
that preserves the shortlist. Announce settled result counts and loading/search
states, expose mobile category selection, and make the search keyboard shortcut
return from Workflows or My collections before focusing the search field. Unit
regressions retain URL back/forward behavior and cover the new interactions.
Browser testing also reproduced a pending-navigation race: an immediate shortcut
returned to Skills while the URL still said Workflows. Compare a new filter/view
state with the pending URL target, not only the last committed router snapshot;
a deterministic delayed-router regression covers this case.

## Editorial inventory and review

The baseline index contains 2,955 records and 14 pairs with identical descriptions
after case/punctuation normalization. This is a triage signal, not a quality score
or a reason to delete IDs: existing compatibility aliases intentionally overlap.
The complete trees of these six skills were read (nine tracked Markdown files;
identical documentation playbooks were compared byte-for-byte):

| Skill IDs | Correction |
| --- | --- |
| `documentation-generation-doc-generate`, `code-documentation-doc-generate` | Distinguish primary/compatibility entry in discovery descriptions. Limit output to the requested artifacts and checked source revision. Add concrete cursor-pagination acceptance criteria and label unverified examples. Keep both local playbooks aligned for offline callers. |
| `core-components`, `code-showcase-core-components` | Distinguish general adaptation from upstream-specific conventions. Remove universal token/native-component rules, add a settings-form example and replace the nonexistent `storybook` skill implication with conditional use of project tooling. |
| `debugger` | Replace the generic invocation example with an empty-result reproduction, competing contract hypotheses and an evidence-based deliverable. |
| `code-review-excellence` | Identify exact-diff review, distinguish findings from hypotheses, add a retry/idempotency example and preserve the boundary between drafting and posting/approval. |

Existing source attribution, licenses, callable IDs and declared risk are retained.
The showcase entry's `license_source` pointed to an absent `LICENSE` file (404;
GitHub contents/history also returned no such file). It now points to the upstream
[README license declaration](https://github.com/ChrisWiles/claude-code-showcase/blob/main/README.md#license),
which states MIT; no new upstream content was imported or repinned.

This is an inventory of the whole catalog plus semantic review of the six named
skill trees, not a claim that all 2,955 skills were individually evaluated. Examples
were inspected as documentation; no paid service, live production mutation or
execution of embedded snippets was used to infer effectiveness. Structural checks
are reported separately from this manual semantic review and from any Tessl result.
