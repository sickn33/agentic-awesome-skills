# Record Formats

Use these templates only for a new setup. Reuse the project's chosen paths, language, and equivalent fields. Keep the two records in the project; the skill installation directory is not the project root.

## Operation log

```markdown
# Project Operation Log

## Operations

### YYYY-MM-DD: Task title

#### Goal
- What the user wanted to accomplish.

#### Actions and changed files
- `relative/path`: the change made and why.

#### Findings and decisions
- A conclusion supported by the inspected source or user decision.

#### Verified
- The check actually run, its result, and the version or scope checked.

#### Not verified
- The remaining check or unknown; use `Not applicable` when appropriate.

#### Risks and next step
- The next concrete action and any condition that must be satisfied first.

#### Revision
- A real commit/issue reference, or `uncommitted`.
```

Existing longer logs may keep separate sections for involved files, changes, failures, and next steps. Avoid expanding a small entry into empty repeated sections solely to match this example.

## Document catalog

```markdown
# Project Document Catalog

## Project understanding

- Goal: The project's purpose.
- Current state: What exists and what is still in progress.
- Constraints: The boundaries relevant to continued work.
- Open questions: Unresolved matters that affect the next task.

## Documents

| Name | Path | Source | Purpose | Status | Last material update |
|---|---|---|---|---|---|
| Project guide | `README.md` | existing | Scope and entry points. | current | YYYY-MM-DD |
```

Suggested sources: `existing`, `user-provided`, `AI-generated`, `external`.
Suggested statuses: `current`, `superseded`, `archived`, `missing-unconfirmed`.
Use the last material change date; opening a document does not make it freshly verified.

## Chinese records

Recognize and preserve `项目操作记录.md` and `项目文档目录.md` when already used. Equivalent Chinese labels include:

| English | Chinese |
|---|---|
| Goal | 用户目标 |
| Actions and changed files | 已执行操作 / 涉及文件 / 已修改 |
| Findings and decisions | 关键发现 |
| Verified | 已验证 |
| Not verified | 尚未验证 |
| Risks and next step | 问题与风险 / 下一步建议 |
| Project understanding | 项目初始认知 |
| Name / Path / Source / Purpose / Status / Last material update | 名称 / 存放地址 / 来源 / 大致内容 / 状态 / 最近更新 |
| current / superseded / archived / missing-unconfirmed | 当前 / 已取代 / 已归档 / 缺失待确认 |

Translation is optional. Preserve useful human wording and the established meaning of statuses.
