# Published Loop Library catalog

Generated from `scripts/loop-data.mjs` (catalog updated 2026-06-19).
Live catalog: https://signals.forwardfuture.ai/loop-library/catalog.md
Machine-readable catalog: https://signals.forwardfuture.ai/loop-library/catalog.json

Search by outcome, trigger, artifact, evidence, category, or keyword. Treat
adaptations and new designs as unpublished unless they appear at the live catalog
URL above.

## 001 — [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/)

- Category: Engineering
- Use when: Use this whenever implementation changes may have left READMEs, setup guides, API references, examples, or runbooks behind.
- Prompt: Whenever a documentation pass is needed, review the codebase in full and make sure all documentation reflects the current implementation. Update stale documentation, verify the changes, then open a pull request.
- Verify: Documentation matches the current implementation. Finish with a reviewable pull request.
- Keywords: AI coding agent, documentation audit, documentation drift, documentation maintenance, pull request workflow
- Related: [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/), [The architecture satisfaction loop](https://signals.forwardfuture.ai/loop-library/loops/architecture-satisfaction-loop/)

## 002 — [The architecture satisfaction loop](https://signals.forwardfuture.ai/loop-library/loops/architecture-satisfaction-loop/)

- Category: Engineering
- Use when: Use this for a deliberate architectural refactor where the destination can be stated in concrete terms and the current system can be tested after each meaningful change.
- Prompt: Refactor until you are happy with the architecture. After each significant step, live-test the system, run autoreview, and commit. Track progress in /tmp/refactor-{projectname}.md.
- Verify: The architecture is satisfactory and checks pass. Live-test, autoreview, and commit each significant step.
- Keywords: AI coding agent, architecture refactor, autoreview, incremental refactoring, coding agent workflow
- Related: [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/), [The sub-50 ms page-load loop](https://signals.forwardfuture.ai/loop-library/loops/sub-50ms-page-load-loop/)

## 003 — [The sub-50 ms page-load loop](https://signals.forwardfuture.ai/loop-library/loops/sub-50ms-page-load-loop/)

- Category: Engineering
- Use when: Use this when a product has a defined set of routes, a stable performance harness, and a 50 ms target that maps to a specific metric and environment.
- Prompt: Continue optimizing the code for speed. After each significant change, measure page-load performance across every page under the same repeatable test conditions. Continue until every page loads in under 50 ms.
- Verify: Every page loads in under 50 ms. Use the same benchmark and confirm there are no regressions.
- Keywords: AI coding agent, page load optimization, performance benchmark, web performance workflow, 50 ms page load
- Related: [The architecture satisfaction loop](https://signals.forwardfuture.ai/loop-library/loops/architecture-satisfaction-loop/), [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/)

## 004 — [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/)

- Category: Engineering
- Use when: Use this as a scheduled reliability pass when an agent can read production telemetry, trace failures into the repository, run the relevant tests, and prepare a reviewable fix.
- Prompt: Review our production logs for errors. If you find an actionable issue, trace it to its root cause, fix it, verify the fix, and open a pull request. If no actionable errors are present, stop without making changes.
- Verify: Actionable production errors are fixed and verified. Finish with a pull request, or stop when no actionable errors are present.
- Keywords: AI coding agent, production log review, error triage, root cause analysis, reliability workflow
- Related: [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/), [The sub-50 ms page-load loop](https://signals.forwardfuture.ai/loop-library/loops/sub-50ms-page-load-loop/)

## 005 — [The 100% test coverage loop](https://signals.forwardfuture.ai/loop-library/loops/100-percent-test-coverage-loop/)

- Category: Engineering
- Use when: Use this when 100% coverage is an explicit project requirement and the repository has a trustworthy coverage command, clear exclusions, and a test suite that can be run repeatedly.
- Prompt: Add tests until we have 100% test coverage.
- Verify: The full test suite passes at 100% coverage. Use the project's coverage report as the source of truth.
- Keywords: AI coding agent, 100 percent test coverage, test coverage workflow, automated testing, coding agent prompt
- Related: [The architecture satisfaction loop](https://signals.forwardfuture.ai/loop-library/loops/architecture-satisfaction-loop/), [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/)

## 006 — [The SEO/GEO visibility loop](https://signals.forwardfuture.ai/loop-library/loops/seo-geo-visibility-loop/)

- Category: Content
- Use when: Use this when a site has a defined set of priority pages and target questions, and you can rerun the same technical crawl and search visibility checks after each change.
- Prompt: Run an SEO/GEO audit across crawlability, indexation, page intent, titles, internal links, structured data, source citations, and answer-first content. Rank the gaps by expected impact, fix the highest-leverage issue, then rerun the same crawl and target-query benchmark across search engines and AI answer engines. Repeat until no critical technical issues remain, every priority query maps to a clear answer-ready page, and the benchmark shows no high-impact gap left to fix.
- Verify: Priority pages are indexable, answer-ready, and technically sound. The repeatable crawl and query benchmark finds no remaining high-impact gaps.
- Keywords: SEO audit, generative engine optimization, GEO workflow, AI search visibility, answer engine optimization
- Related: [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/), [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/)

## 007 — [The logging coverage loop](https://signals.forwardfuture.ai/loop-library/loops/exhaustive-logging-coverage-loop/)

- Category: Engineering
- Use when: Use this when important user flows, service boundaries, background jobs, or failure paths are difficult to trace because the system's logging is incomplete or inconsistent.
- Prompt: Review the system's logging and add missing coverage until every important path produces useful, tested logs.
- Verify: Every important path emits useful, tested logs. Representative success and failure tests prove coverage without exposing sensitive data.
- Keywords: AI coding agent, structured logging, observability coverage, logging tests, production diagnostics
- Related: [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/), [The 100% test coverage loop](https://signals.forwardfuture.ai/loop-library/loops/100-percent-test-coverage-loop/)

## 008 — [The nightly changelog loop](https://signals.forwardfuture.ai/loop-library/loops/nightly-changelog-sweep/)

- Category: Engineering
- Use when: Use this when a project changes frequently enough that user-facing release notes can drift from merged pull requests, commits, deployments, and product changes.
- Prompt: Each night, review changes from the previous day and update the changelog with anything users should know.
- Verify: Every user-relevant change from the previous day is accounted for. The changelog is updated and validated, or the no-change result is recorded.
- Keywords: AI coding agent, nightly changelog, release notes workflow, changelog automation, daily repository review
- Related: [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/), [The repository cleanup loop](https://signals.forwardfuture.ai/loop-library/loops/repository-cleanup-loop/)

## 009 — [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/)

- Category: Evaluation
- Use when: Use this when product quality needs a strict consecutive-success bar and failures should permanently improve the test and benchmark suite.
- Prompt: Test realistic scenarios. When one fails, document it, add regression and benchmark coverage, fix it, and restart the streak. Stop after [N] successful cases in a row.
- Verify: The latest [N] realistic cases pass in a row. Every earlier failure is documented, fixed, and protected by regression and benchmark coverage.
- Keywords: AI product evaluation, quality streak, regression testing, benchmark coverage, realistic scenarios
- Related: [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/), [The 100% test coverage loop](https://signals.forwardfuture.ai/loop-library/loops/100-percent-test-coverage-loop/)

## 010 — [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/)

- Category: Evaluation
- Use when: Use this for an end-to-end product evaluation when quality must be measured across the full feature set rather than a narrow regression or a few hand-picked examples.
- Prompt: Create [N] realistic scenarios covering every major capability. Before testing, define clear success criteria and choose a consistent evaluation method, such as pass/fail checks or a scoring rubric. Run every scenario under the same conditions and record evidence for each outcome. Fix the underlying cause of anything that does not meet the criteria, rerun the affected scenarios, and then rerun the complete set. Continue until every scenario meets the original quality bar.
- Verify: Every one of the [N] scenarios meets the defined quality bar. The final evaluated run covers every major capability under the original conditions.
- Keywords: AI product evaluation, full product testing, response scoring, quality benchmark, feature coverage
- Related: [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/), [The production data cleanup loop](https://signals.forwardfuture.ai/loop-library/loops/production-data-cleanup-loop/)

## 011 — [The test-suite speed loop](https://signals.forwardfuture.ai/loop-library/loops/test-suite-speed-loop/)

- Category: Engineering
- Use when: Use this when slow tests are delaying local feedback or continuous integration and the project has stable commands for measuring runtime and coverage.
- Prompt: Optimize the test suite to run as quickly as possible without reducing coverage or changing behavior.
- Verify: The suite is faster with no coverage or behavior regression. Repeatable timing, the full passing suite, and the original coverage report prove the result.
- Keywords: AI coding agent, test suite performance, faster CI, test optimization, coverage preservation
- Related: [The 100% test coverage loop](https://signals.forwardfuture.ai/loop-library/loops/100-percent-test-coverage-loop/), [The sub-50 ms page-load loop](https://signals.forwardfuture.ai/loop-library/loops/sub-50ms-page-load-loop/)

## 012 — [The repository cleanup loop](https://signals.forwardfuture.ai/loop-library/loops/repository-cleanup-loop/)

- Category: Engineering
- Use when: Use this when abandoned branches, old worktrees, unclear pull requests, or unmerged commits make it difficult to know which repository state still matters.
- Prompt: Inspect local and remote branches, pull requests, commits, and worktrees. Recover valuable work and clean everything stale until the repository is current and organized.
- Verify: Valuable work is recovered and remaining repository state is intentional. Branches, pull requests, commits, and worktrees are current, owned, or safely removed with evidence.
- Keywords: AI coding agent, repository cleanup, git worktree audit, branch hygiene, pull request triage
- Related: [The stale-safe batch release loop](https://signals.forwardfuture.ai/loop-library/loops/stale-safe-batch-release-loop/), [The nightly changelog loop](https://signals.forwardfuture.ai/loop-library/loops/nightly-changelog-sweep/)

## 013 — [The stale-safe batch release loop](https://signals.forwardfuture.ai/loop-library/loops/stale-safe-batch-release-loop/)

- Category: Operations
- Use when: Use this when several branches or pull requests may be ready at once and the release must avoid stale worktrees, partial overlays, and incomplete changes.
- Prompt: Review pending changes and pull requests, exclude stale or unfinished work, combine the valid changes, and release them together.
- Verify: Only current, complete changes ship in the combined release. The released revision is the latest integrated main that contains every selected change.
- Keywords: AI release operations, batch release, stale code prevention, pull request coordination, deployment safety
- Related: [The repository cleanup loop](https://signals.forwardfuture.ai/loop-library/loops/repository-cleanup-loop/), [The post-release baseline loop](https://signals.forwardfuture.ai/loop-library/loops/post-release-baseline-loop/)

## 014 — [The production data cleanup loop](https://signals.forwardfuture.ai/loop-library/loops/production-data-cleanup-loop/)

- Category: Operations
- Use when: Use this when a production dataset contains records that no longer match a product, policy, taxonomy, or quality definition and the classifier allowed them through.
- Prompt: Review production records, remove anything that does not meet the allowed definition, improve the classification logic, and verify the remaining data.
- Verify: Every remaining record meets the allowed definition. Representative classification tests and a post-cleanup audit prove the retained data is valid.
- Keywords: AI data operations, production data cleanup, classification logic, data quality audit, regression examples
- Related: [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/), [The logging coverage loop](https://signals.forwardfuture.ai/loop-library/loops/exhaustive-logging-coverage-loop/)

## 015 — [The post-release baseline loop](https://signals.forwardfuture.ai/loop-library/loops/post-release-baseline-loop/)

- Category: Operations
- Use when: Use this immediately after a release when future regressions or improvements need to be measured against the exact version now in production.
- Prompt: After current releases finish, run the standard benchmarks and record the results as the new baseline.
- Verify: The new baseline belongs to the completed release. Revision, environment, benchmark version, conditions, and results are recorded together.
- Keywords: AI release operations, post-release benchmark, performance baseline, release verification, benchmark history
- Related: [The stale-safe batch release loop](https://signals.forwardfuture.ai/loop-library/loops/stale-safe-batch-release-loop/), [The test-suite speed loop](https://signals.forwardfuture.ai/loop-library/loops/test-suite-speed-loop/)

## 016 — [The ticket-to-PR-ready loop](https://signals.forwardfuture.ai/loop-library/loops/ticket-to-pr-ready-loop/)

- Category: Engineering
- Use when: Use this when a real but loosely written ticket, bug report, or customer complaint needs to become a bounded engineering change with enough proof for a fast review.
- Prompt: Take a ticket, bug report, failing behavior, or customer complaint and turn it into a review-ready patch. Reproduce the failure in the smallest representative environment, prove the root cause, make the smallest credible fix, and rerun the original reproduction plus relevant regression tests. If the issue cannot be reproduced after two serious attempts, say so. Do not fold unrelated refactors into the patch. Finish with the cause, changed files, before-and-after proof, risks, and pull-request summary.
- Verify: The failure is fixed, verified, and ready for review. The issue reproduces before the fix, no longer reproduces afterward, and relevant regression checks pass.
- Keywords: AI coding agent, ticket to pull request, bug reproduction, root cause analysis, review-ready patch
- Related: [The production error sweep](https://signals.forwardfuture.ai/loop-library/loops/production-error-sweep/), [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/)

## 017 — [The customer AI deployment loop](https://signals.forwardfuture.ai/loop-library/loops/customer-ai-deployment-loop/)

- Category: Operations
- Use when: Use this when an AI workflow must live inside a real customer process and needs validation, approval, gradual rollout, monitoring, and a clear business outcome.
- Prompt: Run this when a customer requests an AI workflow, reports a failure, or reaches an operations review. Choose one priority, such as enriching leads, drafting emails, summarizing meetings, or updating a CRM. Define the owner, inputs, approvals, success metric, and ROI hypothesis. Dry-run it on realistic customer data, fix the smallest verified problem, then release through approved stages and monitor production. Finish with the outcome, evidence, customer update, lessons saved, and next review.
- Verify: One customer priority reaches a proven terminal state. The workflow reaches its agreed rollout stage, a production issue is fixed, or a blocker is escalated with an owner and next step.
- Keywords: customer AI deployment, AI workflow rollout, approval gates, production monitoring, AI ROI
- Related: [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/), [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/)

## 018 — [The product update podcast loop](https://signals.forwardfuture.ai/loop-library/loops/product-update-podcast-loop/)

- Category: Content
- Use when: Use this when a product ships frequently enough that users would benefit from a short recurring audio explanation of what changed and how to use it.
- Prompt: Each night, review publicly released product changes and select only those users need to know. Verify each against the product, docs, or release notes. Use the Jellypod MCP to turn the approved changes into a three-to-five-minute podcast explaining what changed, why it matters, and how to try it. Check the script and audio for accuracy, clarity, and pronunciation. If nothing meaningful shipped, make no episode. Ask before publishing. Finish with the draft episode, sources, and review result.
- Verify: The episode accurately covers every meaningful public update. Finish with a review-ready three-to-five-minute episode, or a confirmed no-episode result when nothing meaningful shipped.
- Keywords: AI podcast workflow, product update podcast, Jellypod MCP, release communication, editorial automation
- Related: [The nightly changelog loop](https://signals.forwardfuture.ai/loop-library/loops/nightly-changelog-sweep/), [The post-release baseline loop](https://signals.forwardfuture.ai/loop-library/loops/post-release-baseline-loop/)

## 019 — [The Clodex adversarial-review loop](https://signals.forwardfuture.ai/loop-library/loops/clodex-adversarial-review-loop/)

- Category: Engineering
- Use when: Use Clodex when Claude is building a meaningful code change and Codex should independently review each repair round.
- Prompt: Run /clodex [task] think hard --max-iter 5 --threshold medium. Claude plans the task, implements it, opens a pull request, asks Codex for an adversarial review, fixes findings above the accepted severity, and repeats. Keep the branch, PR, findings, verdict, and iteration state resumable. Stop when Codex approves, only accepted findings remain, progress stalls, or the iteration cap is reached. Never describe an errored or exhausted run as approved. Finish with the PR, checks, verdict, and remaining findings.
- Verify: The pull request reaches the configured review bar. Codex approves it or only explicitly accepted findings remain; errors, stalls, and exhausted limits are reported as such.
- Keywords: Clodex, Codex adversarial review, Claude Code plugin, review fix loop, pull request automation
- Related: [The architecture satisfaction loop](https://signals.forwardfuture.ai/loop-library/loops/architecture-satisfaction-loop/), [The stale-safe batch release loop](https://signals.forwardfuture.ai/loop-library/loops/stale-safe-batch-release-loop/)

## 020 — [The Loop Harness verification loop](https://signals.forwardfuture.ai/loop-library/loops/loop-harness-verification-loop/)

- Category: Engineering
- Use when: Use this when a recurring repository task should run unattended but one agent must not be allowed to generate and approve the same output.
- Prompt: Use Loop Harness for scheduled repository work such as CI triage, issue grooming, dependency updates, or docs sync. Set [retry limit], then start an isolated git worktree. Let one Claude session stage a patch or outbox message and a second Claude session verify it against explicit criteria. Ship only after a pass; otherwise preserve the findings and retry only within the limit. Finish with the source revision, staged output, verifier result, delivery status, and next run.
- Verify: Only independently verified output ships. A second-agent pass releases the configured output; a failed verification preserves evidence and produces no external change.
- Keywords: Loop Harness, scheduled coding agent, git worktree isolation, second-agent verification, autonomous agent workflow
- Related: [The Clodex adversarial-review loop](https://signals.forwardfuture.ai/loop-library/loops/clodex-adversarial-review-loop/), [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/)

## 021 — [The Boeing 747 benchmark](https://signals.forwardfuture.ai/loop-library/loops/boeing-747-benchmark/)

- Category: Design
- Use when: Use this as a concrete Three.js vision benchmark, or adapt the same capture-and-critic pattern to another rendered subject.
- Prompt: Before building, choose reference images, a scoring rubric, [visual threshold], and [budget]. Build the most realistic Boeing 747 you can from Three.js primitives, then create a rig that screenshots nine repeatable angles. After each change, render and score the same views, have a critic identify the weakest feature, and fix it without regressing stronger views. Keep the best version. Stop at the threshold, stalled progress, or budget. Finish with the model, nine renders, scores, remaining gaps, and run summary.
- Verify: The Boeing 747 meets the visual bar from all nine angles. The same camera rig and rubric show every required view meeting the preset threshold, or the run reports stagnation, budget exhaustion, and remaining gaps.
- Keywords: Boeing 747 benchmark, Three.js agent workflow, vision self-verification, 3D reconstruction loop, camera inspection system
- Related: [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/), [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/)

## 022 — [War Loops: frontend reconstruction](https://signals.forwardfuture.ai/loop-library/loops/war-loops-frontend-designer/)

- Category: Design
- Use when: Use War Loops when an authorized interface must be rebuilt from a URL or image and judged on appearance, motion, and responsive behavior.
- Prompt: Point War Loops at an authorized URL or image. Capture it with a genuine browser and record the layout, styles, content, motion, and responsive behavior. Build a static Pencil mirror and a moving Forge version. Compare both with the source at desktop, tablet, and mobile sizes; repair only the weakest fidelity signals. Stop when every gate passes, progress stalls, or capture is blocked. Finish with the builds, spec, renders, scores, and remaining gaps.
- Verify: The builds match the source across all three fidelity axes. Static appearance, experiential motion, and responsive reflow pass their gates, or the run reports stagnation or a blocked capture.
- Keywords: War Loops, autonomous frontend designer, frontend fidelity, visual evaluation loop, responsive motion matching
- Related: [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/), [The sub-50 ms page-load loop](https://signals.forwardfuture.ai/loop-library/loops/sub-50ms-page-load-loop/)

## 023 — [The self-improving champion loop](https://signals.forwardfuture.ai/loop-library/loops/self-improving-champion-loop/)

- Category: Evaluation
- Use when: Use this to tune a prompt, policy, or configuration when cheap iteration is useful but final acceptance must use fresh examples.
- Prompt: Improve a prompt, policy, or configuration. A support assistant's system prompt is one example. Save the champion, its score, a working set, untouched holdout cases, must-pass checks, and [budget]. Each round, change one thing based on a recorded failure. Promote the challenger only if it beats the champion on holdouts by [margin] without weakening a must-pass check; otherwise keep the champion. Stop at the target, budget limit, or no progress. Return the winner, scores, experiment log, and remaining failures.
- Verify: The best holdout-tested champion is returned. Every challenger is logged, and accepted changes beat the previous champion on untouched cases without weakening a must-pass check.
- Keywords: self-improving loop, champion challenger evaluation, Goodhart prevention, independent evaluation gate, bounded optimization workflow
- Related: [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/), [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/)

## 024 — [The devil's-advocate loop](https://signals.forwardfuture.ai/loop-library/loops/devils-advocate-design-loop/)

- Category: Evaluation
- Use when: Use this before committing to an architecture, interface, rollout plan, or other consequential design that benefits from structured adversarial review.
- Prompt: Before committing to an architecture, interface, or rollout plan, have a critic argue that it is wrong. Record each objection, impact, and status in a repository-local log at .agent-reviews/redteam.md. The builder must fix and verify each high-impact weakness or document why it is accepted; the critic may reopen unsupported answers. Stop when no high-impact objection remains or the same issues repeat for two rounds without new evidence. Finish with the decision, resolved and accepted objections, evidence, and any stalemate.
- Verify: No high-impact objection remains open. Every logged objection is verified as resolved or explicitly accepted with evidence, or the final report truthfully records a two-round stalemate.
- Keywords: devil's advocate loop, adversarial design review, critic builder workflow, architecture objection log, red team design process
- Related: [The architecture satisfaction loop](https://signals.forwardfuture.ai/loop-library/loops/architecture-satisfaction-loop/), [The Clodex adversarial-review loop](https://signals.forwardfuture.ai/loop-library/loops/clodex-adversarial-review-loop/)

## 025 — [The fresh-clone loop](https://signals.forwardfuture.ai/loop-library/loops/fresh-clone-loop/)

- Category: Engineering
- Use when: Use this to test whether a repository's onboarding instructions work in a clean environment without undocumented help.
- Prompt: Clone [repository] into a disposable environment and follow only its README to the documented ready state, such as running the app or building the package. When a step fails or assumes missing knowledge, record the gap, fix the setup or documentation issue, discard the environment, and start again. Carry no dependencies, configuration, credentials, or repairs between attempts. Stop when one uninterrupted fresh clone reaches that state, progress stalls, or [budget] ends. Return exact commands, gaps closed, and remaining blockers.
- Verify: A clean environment reaches the documented ready state using only the README. The final run uses only the onboarding guide and needs no unstated dependency, configuration, or manual repair.
- Keywords: fresh clone loop, README verification, developer onboarding test, clean environment setup, repository documentation workflow
- Related: [The docs sweep](https://signals.forwardfuture.ai/loop-library/loops/overnight-docs-sweep/), [The repository cleanup loop](https://signals.forwardfuture.ai/loop-library/loops/repository-cleanup-loop/)

## 026 — [The Infinite Clickbait thumbnail loop](https://signals.forwardfuture.ai/loop-library/loops/infinite-clickbait-loop/)

- Category: Design
- Use when: Use this when a video topic and asset set are ready but the thumbnail needs several structured ideation and critique rounds before production.
- Prompt: For [video], use [approved assets] to make ten thumbnail concepts. Score each at real YouTube sizes against [inspiration channel] for clarity, curiosity, emotional pull, contrast, and accuracy. Take the top three, improve each one's weakest dimension, and rescore them under the same rubric. Keep iterating the strongest concept until it clears [quality threshold] or [budget] ends. Reject anything the video cannot deliver. Return the winner, two runners-up, previews, final scores, and rationale.
- Verify: One accurate thumbnail clears the fixed quality threshold. The winner outscores the alternatives under the same conditions, remains legible at realistic sizes, and represents the video accurately.
- Keywords: Infinite Clickbait, YouTube thumbnail loop, thumbnail iteration workflow, clickbait scoring rubric, AI visual design
- Related: [The Boeing 747 benchmark](https://signals.forwardfuture.ai/loop-library/loops/boeing-747-benchmark/), [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/)

## 027 — [The autonomy-loop builder-reviewer loop](https://signals.forwardfuture.ai/loop-library/loops/autonomy-loop/)

- Category: Engineering
- Use when: Use autonomy-loop when a repository has deterministic test, build, and lint gates plus a task suited to repeated builder-reviewer handoffs.
- Prompt: Use autonomy-loop for [repository task] after the test, build, and lint gates pass. Run /autonomy-loop:autonomy-init, then start builder and reviewer in separate worktrees. The builder reads LOOP-STATE.md, makes one bounded change, and adds a red-before, green-after test. The reviewer reruns the gates and proves the test by reverting or mutating the fix. Accept only on both passes; park protected or repeated-failure work for a human. Finish with the commit, gate evidence, test proof, trust tier, and risks.
- Verify: Every accepted wave passes autonomy-loop's proof-of-test gate. The new test fails without the change, passes with it, every configured gate passes, and protected production changes remain human-gated.
- Keywords: autonomy-loop, adversarial code review, mutation testing, builder reviewer workflow, Claude Code loop
- Related: [The Clodex adversarial-review loop](https://signals.forwardfuture.ai/loop-library/loops/clodex-adversarial-review-loop/), [The Loop Harness verification loop](https://signals.forwardfuture.ai/loop-library/loops/loop-harness-verification-loop/)

## 028 — [The Codex completion-contract loop](https://signals.forwardfuture.ai/loop-library/loops/codex-completion-contract-loop/)

- Category: Engineering
- Use when: Use this for long-running Codex work, pull requests, runtime checks, or user-visible artifacts where a plausible partial result could be mistaken for completion.
- Prompt: Run $goal-planner-codex [task] for long-running Codex work where partial work could be mistaken for done. Landing a PR and verifying production is one example. Before acting, define every required outcome and its evidence. After each bounded action, mark requirements proved, weak, missing, or contradicted. Complete the Goal only when all are proved; otherwise stop as blocked, stalled, or exhausted. Ask before creating Goal state. Finish with the requirement-to-evidence table, status, owner, and next action.
- Verify: Every Codex Goal requirement has current, adequate proof. The final audit contains no weak, missing, or contradicted required item; otherwise the work remains open, blocked, or exhausted.
- Keywords: Codex Goal, completion contract, evidence audit, definition of done, false completion prevention
- Related: [The ticket-to-PR-ready loop](https://signals.forwardfuture.ai/loop-library/loops/ticket-to-pr-ready-loop/), [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/)

## 029 — [The Revolve versioned-experiment loop](https://signals.forwardfuture.ai/loop-library/loops/revolve-self-improvement-loop/)

- Category: Evaluation
- Use when: Use Revolve to improve a prompt, policy, workflow, model configuration, code path, or dataset when experiments must remain comparable and resumable across sessions.
- Prompt: Use Revolve to improve a support prompt, code path, or testable subject. In revolve/, define the goal and [budget], freeze the tests and scoring, checkpoint the current version, and record a baseline. Each round, test one hypothesis; keep only a clear, regression-free win. If the evaluation changes, open a new revision and rerun the baseline. Ask before changing live files. Stop on success, no progress, a blocker, or exhausted budget. Return the best checkpoint, comparisons, rollback, and next action.
- Verify: The best Revolve checkpoint wins within one evaluation revision. The incumbent and candidates have comparable recorded runs, accepted changes pass every guard, rollback is available, and live promotion has approval.
- Keywords: Revolve, agent self improvement, checkpoint evaluation, revisioned experiments, evidence based promotion
- Related: [The self-improving champion loop](https://signals.forwardfuture.ai/loop-library/loops/self-improving-champion-loop/), [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/)
