# Project Document Catalog

> Sanitized excerpt from the same historical workflow as [example-operation-log.md](example-operation-log.md). The original project used Chinese record filenames; this excerpt uses English aliases.

## Project understanding

- Goal: Preserve a selected engineering-tool environment through source records, version locks, recovery instructions, and verification notes.
- Current state: Important resources and their recovery routes are recorded; a generated inventory provides a separate resource view.
- Constraints: Keep credentials, raw sessions, caches, virtual environments, and machine-specific runtime state outside the maintained source package.
- Open questions: Inspect resource drift individually before changing version locks.

## Documents

| Name | Path | Source | Purpose | Status | Last material update |
|---|---|---|---|---|---|
| Project guide | `README.md` | existing | Project scope and recovery entry points. | current | 2026-07-25 |
| Resource workflow | `docs/RESOURCE-WORKFLOW.md` | AI-generated | Record, verify, synchronize, and recover selected resources. | current | 2026-07-25 |
| Operation log | `PROJECT_LOG.md` | AI-generated | Goals, changes, checks, risks, and continuation points. | current | 2026-07-25 |
| Document catalog | `DOCUMENT_CATALOG.md` | AI-generated | Project understanding and canonical durable-document locations. | current | 2026-07-25 |
| Skill reference | `skills/project-memory-log/SKILL.md` | AI-generated | The project-record and document-reuse workflow. | current | 2026-07-25 |

Each entry points to a project-relative path. A later request for a resource-management summary should first inspect the existing workflow document and log rather than create an untracked competing summary.
