---
name: case-review
description: "Quality-gate review of a reverse-engineering or assessment case package: scope readiness, Evidence-to-Finding-to-Path traceability, work-item coverage, timeline consistency, and artifact hashes."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# Evidence Graph Review
## When to Use

- Before delivering an analysis report, verify traceability and completeness.
- Auditing whether conclusions are backed by recorded evidence.


Use this skill when a reverse engineering, forensics, CTF, or authorized security case needs a defensible handoff. It audits the existing `work/<case>/` package without changing the case or touching a target.

## Scope

This skill covers:

- Scope metadata and target-activity readiness
- Evidence record structure and reproducibility fields
- References from work items and timeline entries to Evidence
- Structured Findings and Paths in report Markdown
- Optional SHA-256 verification for case-local artifacts
- A Markdown or JSON review result for a report handoff

It MUST NOT perform reconnaissance, exploitation, dynamic instrumentation, or target changes. Those actions belong to the routed analysis skill and require the case scope gate.

## Tool dependencies

| Tool | Required | Purpose | Auto-bootstrap |
|------|----------|---------|---------------|
| Python 3.9+ | Yes | Runs the read-only case review script | No, use the platform Python installation |

No network access or third-party package is required.

## Workflow

### Phase 1: Intake

Run the review against the existing case directory:

```bash
python3 skills/case-review/scripts/review_case.py work/<case> --format markdown
```

Confirm that `scope.md`, `timeline.md`, `workitems.md`, and `evidence/` are present. A non-strict review reports scope warnings while a strict review treats warnings as handoff blockers.

## 建议下一步（选一个编号）

1. 修复 scope.md 中的授权、范围或 network_profile 字段
2. 继续检查 Evidence 记录的可复现命令和来源
3. 导出当前 review 结果并附到阶段性报告
4. 换 JSON 输出接入 CI 或其他审查工具
5. 暂停，先确认审查范围

### Phase 2: Traceability

Review the checks for:

- Evidence IDs that do not exist
- Findings without `evidence_ids`
- Paths without an allowed `path_type` or Evidence reference
- Work items and timeline entries pointing to unknown Evidence
- Unlinked Evidence records
- Validated Findings with low confidence

An offline observation may use `repro_command: n/a` only when its `notes` field explicitly documents the offline limitation.

Use JSON when another tool needs stable fields:

```bash
python3 skills/case-review/scripts/review_case.py work/<case> --format json
```

## 建议下一步（选一个编号）

1. 补写缺失的 Evidence，并保留原始命令
2. 将候选 Finding 绑定到 Evidence 后重新审查
3. 为调用链或攻击链补充 P-id 和 Path 步骤
4. 生成 Markdown handoff summary
5. 换回 PRIMARY skill 继续分析

### Phase 3: Fixity verification

When an Evidence record contains both `content_hash` and `artifact_path`, verify the case-local artifact:

```bash
python3 skills/case-review/scripts/review_case.py work/<case> --verify-hashes --strict
```

The script accepts `sha256:<64 hex characters>` and checks that the artifact remains inside the case root. A hash mismatch is a hard failure.

The PowerShell Evidence helper can record a hash while appending a record:

```powershell
powershell -File skills/scripts/append-evidence.ps1 -CaseRoot work\<case> -Id E-001 -Title "Sample hash" -ReproCommand "sha256sum evidence/sample.bin" -ArtifactPath "evidence\sample.bin"
```

## 建议下一步（选一个编号）

1. 修复 hash mismatch 或替换已污染的工作副本
2. 为未固定的原始文件补充 SHA-256 和 artifact_path
3. 继续进入报告生成阶段
4. 导出 JSON 结果供 CI 保存
5. 暂停并请求人工复核

### Phase 4: Handoff

Use strict mode before a final report or specialist handoff:

```bash
python3 skills/case-review/scripts/review_case.py work/<case> --strict --format markdown > work/<case>/report/case-review.md
```

The command is read-only with respect to the case unless shell redirection is explicitly used to save its output. The review is not legal advice and does not replace organizational evidence handling procedures.

## 建议下一步（选一个编号）

1. 将通过的 review 结果交给 `docs-generator/` 生成正式报告
2. 回到 PRIMARY skill 补齐新的分析证据
3. 归档 Markdown 和 JSON review 结果
4. 暂停并请求人工复核

## Language behavior contract

- Internal reasoning, tool selection, and phase control: English.
- User-visible messages, section labels, reports, and next-step menus: Chinese unless the user requests another language.
- Default bilingual labels place Chinese first and English second, separated by `/`.

## Bootstrap boundary

This skill has no third-party dependency. If Python 3 is unavailable, the only allowed recovery action is the repository bootstrap path when a Python capability is registered for the current platform. If no such capability is registered, stop and report the missing runtime. Do not guess executable paths, download packages, or perform a manual install from inside this skill.

## Routing context

**Upstream entry**: any reverse, forensics, CTF, or authorized security skill that has produced a case package.

**Downstream exit**: `docs-generator/` for a formal report, or the original PRIMARY skill when the graph is incomplete.

**Related modules**: `ops/evidence-finding-path.md`, `ops/timeline-workitem.md`, `digital-forensics/`, `reverse-engineering/`, and `docs-generator/`.

## References

- [NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response](https://csrc.nist.gov/pubs/sp/800/86/final)
- [SWGDE Best Practices for Computer Forensic Acquisitions](https://www.swgde.org/documents/published-complete-listing/17-f-002-2-1/)
- [SWGDE Best Practices for Archiving Digital and Multimedia Evidence](https://www.swgde.org/documents/published-complete-listing/19-f-003-best-practices-for-archiving-digital-and-multimedia-evidence/)

## 任务完成自检

- [ ] 我是否审查了 scope.md、timeline.md、workitems.md 和 evidence/？
- [ ] 所有 Finding 是否引用了现存 Evidence？
- [ ] 所有 Path 是否包含合法 path_type 和 Evidence 引用？
- [ ] 是否执行了 hash verification，或记录了未执行原因？
- [ ] 是否以 strict 模式重新运行并保存了 review 结果？

## Limitations

- Expects a structured case layout (scope, evidence, findings); ad-hoc notes need pre-organization.
- Reviews documentation quality, not the technical correctness of findings.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
