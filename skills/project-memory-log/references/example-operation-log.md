# Project Operation Log

> Sanitized, shortened historical excerpt. See [example-notes.md](example-notes.md) for its provenance and verification limits.

## Operations

### 2026-07-25: Add a single document catalog and document-reuse policy

#### Goal

- Read the project's important existing documents when starting work.
- Keep an initial project understanding and a maintained document catalog.
- Track durable AI-created or materially edited documents so they remain findable as the project grows.

#### Actions and changed files

- `skills/project-memory-log/SKILL.md`: expanded the existing operation-log workflow with project startup, document reuse, catalog maintenance, and task closure.
- `skills/project-memory-log/agents/openai.yaml`: updated the skill's display information and default prompt.
- `DOCUMENT_CATALOG.md`: initialized the project understanding and durable-document register.
- `manifests/skills.lock.json`: recorded the changed skill fingerprint.
- `CHANGELOG.md`: described the workflow extension.

#### Findings and decisions

- The earlier workflow recorded operations but did not provide a project-wide document view or a check for an existing canonical document before creating another.
- Store the initial project understanding inside the catalog instead of creating a third summary document.
- Keep one catalog row per normalized path; preserve superseded, archived, and missing states.

#### Verified

- The historical record reports a successful skill-metadata validation and records a content fingerprint.
- The revised source contained startup, document-reuse, logging, and closure instructions.

#### Not verified

- At the time of this entry, first initialization in a separate new project had not been exercised.
- This excerpt does not assert a measured reduction in tokens, elapsed time, or duplicate documents.

#### Risks and next step

- The catalog can become stale if the workflow is not invoked or closure maintenance is skipped.
- In the next new project, check that existing key documents are read first, only one catalog is created, and new durable documents are registered in the same task.

#### Revision

- The original record identified the skill by its content fingerprint. A Git commit for this specific change was not supplied in the excerpt.
