# Mandatory contribution admission validation — 2026-10-28

Protected base: `b7f6ad814a903f912962ea3cccad8c02766f753b`. This source change makes the three PR evidence sections mandatory for canonical skill-tree changes in existing pr-policy and trusted merging. It adds local --body-file preview, description/draft attempt binding and new-import license notice checks. Required job names, strict protection, component plans and semantic review authority remain unchanged. No paid service or new dependency is introduced.

## Real open PR observations

Bodies and immutable heads were read without editing the contributions or executing their skill instructions:

| PR | Observed head | Admission preview | Changed-skill evidence |
| --- | --- | --- | --- |
| #2164 Cloudish | `d63983463d4b9767acbc900c70ec7b5ddd91d867` | Pass: all three evidence sections filled | Pass; complete contributor preflight also passed in a clean disposable worktree |
| #2166 Datacircle | `275c732811fabb81738fbed50f57cc808a602ff3` | Block: all three sections missing | No new claim about semantic readiness |
| #2167 Animated GitHub Profile | `ca11e80ff721baa7b30345ec4352c254f4f46b22` | Block: template contains comments, not author evidence | No live contributed workflow was approved or executed |
| #2168 UXKIN | `85e283c3ad04f15d245f2a52348b87ddfa48e378` | Block: all three sections missing | Block: root LICENSE absent in each of the three new external skill trees |

The Cloudish full preflight ran inert changed-skill evidence plus the existing catalog component checks: schema, warning budget, docs security, attribution, ephemeral preview, references and offline catalog integrity. It did not create a key, upload files to Cloudish, spend credits or deploy an application. A structural pass is not semantic approval of the skill's upload instructions.

## Regressions and limits

Tests exercise incomplete/placeholder-only bodies, headings inside code fences, duplicate headings, oversized/non-string input, brief legitimate evidence, explained unrun tests, non-skill documentation changes, support-file-only changes, source copy versus mutation, current-body merge validation, body/draft changes at unchanged head, and required CI triggers. License tests cover missing metadata, link-only imports, retained notices, notice deletion and unchanged legacy omissions.

Evidence presence is not proof of truth, correctness or redistribution permission. Authors remain responsible for substantive corrections; reviewers inspect the complete bundle. Drafts may receive feedback with failed checks. Body edits rerun existing CI, while the separate semantic workflow is not triggered merely by edits. The merge API cannot atomically bind a write to description text; live admission and tuple rechecks are point-in-time checks under strict protection.

This is a four-PR dry comparison, not a measured reduction in maintenance cost. Future cohort measurement remains in the contribution intake guide.
