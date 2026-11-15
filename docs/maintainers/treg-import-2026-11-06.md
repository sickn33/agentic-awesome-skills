# Treg skill import — 6 November 2026

## Source and scope

Seven canonical Markdown-only skills from https://github.com/superdesigndev/treg, pinned to `cf3955032ef8f15dfeff90a84ae24e31583e93e8`. Each complete canonical source tree consists of one SKILL.md; each imported tree additionally retains the complete upstream root LICENSE. Plugin/server copies are mirrors, and `.agents` development skills are not the published canonical collection. No upstream code, installer or remote recipe was executed. Source inventory preceded the recorded maintenance cycle; full skill-content review followed cycle start.

## Licensing

The upstream license is **Apache 2.0 with Additional Terms**, represented as `LicenseRef-Treg`, not SPDX Apache-2.0 and not relicensed as MIT. The full notice, copyright and Additional Terms take precedence and remain byte-identical in all seven bundles. Upstream README permits hosted-API client use and distinguishes it from redistribution of a competing hosted registry. This import contains client workflow documentation only, not registry server code. The license itself restricts hosted/managed/embedded service use and commercial redistribution in the stated circumstances; downstream users must review the full retained terms before such use. This record is not a legal certification or a waiver. Source credit is retained in README and the editorial attribution ledger.

## Complete-tree review and local adaptations

| Skill | Distinct purpose | Review and retained adaptation |
| --- | --- | --- |
| treg | Task-oriented discovery, pricing, routed tool calls, async/idempotent outcomes and team credentials. | Removed global first-choice routing, automatic spend/top-up/feedback/reviews and edge-filter bypass advice. Replaced pipe-to-shell and inline-token setup; scoped credential scans, uploads, proxy/admin actions and external tool advice. |
| jev-memory | Explicitly requested Claude Code Jev preference-classifier mod. | Project scope and immutable remote mod checkout; consent for prompt disclosure, recurring costs and memory writes; review remote hooks before use; no Codex or global memory changes by catalog installation. |
| lead-signals | Public buyer-intent signals, qualification and business-account ranking. | Approved spend, professional contact scope, data minimization, no unsolicited outreach or unapproved recurrence/feedback. |
| make-ugc | Three approval checkpoints across hook research, original presenter, clips, demo, captions and billing. | Original/licensed presenter and consented voice; no moderation evasion; remote companion code not silently executed; public-upload consent and settled cost accounting. |
| rea-growth | Evidence-linked channel/content analysis and growth playbook. | Preserved observed/inferred separation, sample-size limits and correlation cautions; explicit setup/budget, public-only data and no automatic account setup. |
| recruit | Job-related candidate evidence, dedupe, filters, ranking and auditable run file. | Replaced private personal email/mobile discovery with optional authorized professional contacts; no protected-trait inference, automatic hiring or outreach. |
| web-access | Fallback public web/platform data when existing tools cannot cover the task. | Zero-cost cap on free-first examples; explicit paid fallback consent, no private URLs/cookies/access-control bypass, unapproved schedules or feedback. |

All skill frontmatter has bounded task descriptions, category/risk (`critical` for connected paid/credentialed operations), immutable upstream provenance, author and custom-license metadata. All bundles have When to Use, examples/operational steps, explicit scope and limitations. Provider IDs, prices and capabilities are historical upstream examples: discover live schema and cost before execution. External scripts and model/CLI accounts are operational dependencies, not silently vendored files or verified live integrations.

## Validation and boundaries

Required validation comprises `validate`, `validate:references`, `security:docs`, relevant repository tests and the complete committed-head `pr:preflight`. Exact-head results and final merge verification are recorded in PR #2296 and its private maintenance cycle; this source review does not substitute for those gates. Review is an actual content/source review, not a heuristic score or claimed Tessl pass. No paid API calls, personal-data enrichment, voice cloning, remote installer execution, plugin installation, memory activation or outbound feedback occurred during this import. Catalog distribution snapshots and plugin mirrors are release-owned and are excluded from this source PR.
