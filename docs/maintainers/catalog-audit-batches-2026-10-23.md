# Catalog audit batches — 2026-10-23

## Scope and status

This is a bounded review queue, not a completed audit or a new merge gate. Existing maintenance and exact-head review requirements remain authoritative. No public skill badges, effectiveness benchmarks or usage examples are introduced.

Inventory base: `8bda5fa7264cafe8259fc8212550d13bf690bfb0`. The first batch contains ten canonical trees with bundled executable-source files or npm lockfiles. Selection uses file inventory only; it is not a risk verdict. Generated plugin mirrors are excluded. Counts include nested support files and do not establish execution safety.

## First batch

| Skill | Bundled code files | Total files | Status |
| --- | ---: | ---: | --- |
| [loki-mode](../../skills/loki-mode/SKILL.md) | 355 | 1102 | Pending complete-tree review |
| [whatsapp-cloud-api](../../skills/whatsapp-cloud-api/SKILL.md) | 12 | 32 | Pending complete-tree review |
| [telegram](../../skills/telegram/SKILL.md) | 8 | 22 | Pending complete-tree review |
| [vercel-optimize](../../skills/vercel-optimize/SKILL.md) | 90 | 153 | Pending complete-tree review |
| [monte-carlo-push-ingestion](../../skills/monte-carlo-push-ingestion/SKILL.md) | 60 | 69 | Pending complete-tree review |
| [junta-leiloeiros](../../skills/junta-leiloeiros/SKILL.md) | 29 | 35 | Pending complete-tree review |
| [last30days](../../skills/last30days/SKILL.md) | 25 | 41 | Pending complete-tree review |
| [instagram](../../skills/instagram/SKILL.md) | 20 | 30 | Pending complete-tree review |
| [skill-sentinel](../../skills/skill-sentinel/SKILL.md) | 16 | 22 | Pending complete-tree review |
| [pptx](../../skills/pptx/SKILL.md) | 13 | 56 | Pending complete-tree review |

## Review sequence

1. Before review, resolve the current protected base and record each complete skill-tree Git object. Refresh inventory when content changes; never reuse stale results.
2. Read every tracked file, including nested skills, references, dependency manifests and licenses. Inspect credential handling, network access, external downloads and state-changing instructions as inert text. Do not run untrusted bundles to discover their behavior.
3. Record findings with file/line evidence, observed behavior, disposition and remediation PR. Distinguish confirmed defects, already-fixed findings and questions requiring upstream clarification.
4. Use existing deterministic checks and exact-head maintainer review for any repair PR. Follow the [maintenance contract](maintenance-contract.md); inventory counts and automated scans do not replace review.
5. Close a row only with reviewed tree identity, reviewer, date, evidence location and disposition. A blocked row stays blocked and does not prevent reviewing independent trees.

## Subsequent batches and progress

Keep batches at ten trees initially; reduce size for large bundles. After the first batch, inspect remaining external integrations and credential/network guidance, then other catalog content. Track canonical trees once and relate mirror findings to their source. Maintain pending, in-review, blocked and complete counts against the recorded inventory; report added or changed trees separately. No automatic imports, changes to skill eligibility or release authorization follow from this queue.

Initial progress: 10 pending, 0 in review, 0 blocked, 0 complete. The remainder of the catalog has not been assessed by this batch. Publish subsequent progress only from actual recorded review results.
