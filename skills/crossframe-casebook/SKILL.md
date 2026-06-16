---
name: crossframe-casebook
description: "Use when CrossFrame Suite routes explicit Chinese casebook work: turning materials into reusable cases, anonymized entries, mechanisms, and retrieval indexes."
category: content
risk: safe
source: community
source_repo: xi-kari/crossframe-skill
source_type: community
date_added: 2026-06-16
author: xi-kari
license: MIT
license_source: https://github.com/xi-kari/crossframe-skill/blob/main/LICENSE
tools:
  - "Agent Skills"
  - Codex
  - Claude
tags:
  - crossframe
  - chinese
  - casebook
  - case-study
  - knowledge-base
---
# CrossFrame Casebook



## When to Use This Skill

- Use when `crossframe-suite` routes explicit CrossFrame materials into reusable casebook entries, anonymized case records, mechanism extraction, or retrieval indexes.
- Use when the goal is future reuse rather than immediate advice.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

## Limitations

- The skill body is intentionally Chinese-canonical; English metadata is for discovery and does not replace the original Chinese terms.
- Use only after explicit CrossFrame invocation or `crossframe-suite` routing; do not apply it as a generic default reasoning layer.
- It structures analysis, drafting, and review, but does not replace source verification, domain expertise, or legal, medical, or financial judgment.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果案例沉淀之后还要成文、教学、辩论或公共/组织专项判断，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责案例库条目和可复用材料结构。

CrossFrame Casebook 是 `crossframe` 的平行案例库 skill，不替代 `crossframe`。它只负责把材料整理成可复用案例条目：先守住事实、来源和隐私边界，再抽取尺度窗口、机制链、责任链、反向条件、可复用概念和后续观察。

中文为权威语义。英文只用于 skill id、文件名、字段名或对外简介；遇到中英文冲突，以中文术语为准。

## 必须执行的顺序

1. 读取 `../crossframe/SKILL.md`，确认本次材料应遵守的 CrossFrame 基本闸门与表达边界。
2. 读取 `../crossframe/references/read-routing-map.md`，按材料主题选择需要对齐的 CrossFrame protocol、概念卡和判断档位。
3. 如果材料触发高责任、公共制度、亲密关系、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，必须追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
4. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。
5. 读取 `protocols/material-boundary-protocol.md`，先做来源、事实、推测、隐私和可公开性分层。
6. 读取 `protocols/casebook-build-protocol.md`，决定本次是新建案例、清洗旧案例、批量索引、比较案例，还是把复盘转成案例库。
7. 读取 `references/casebook-field-guide.md`，保证每个案例至少沉淀九项：案例摘要、事实边界、材料来源、尺度窗口、机制链、责任链、反向条件、可复用概念、后续观察。
8. 读取 `references/privacy-and-redaction-rules.md`，对个人、组织、地名、时间、聊天原文、截图、链接和可识别细节做脱敏。
9. 读取 `protocols/mechanism-extraction-protocol.md`，从故事叙述中抽出机制链与责任链，避免只写剧情或堆概念。
10. 按任务读取模板：单案例读 `templates/casebook-entry-template.md`；批量案例读 `templates/casebook-index-template.md`；需要来源审计读 `templates/redacted-source-ledger-template.md`。
11. 输出前做 smoke check：不得把猜测当事实、不得泄露隐私、不得只写故事不抽机制、不得概念堆砌。

## 输入处理

- 聊天记录：保留互动结构、角色关系、可观察行为和时间顺序；删除或泛化姓名、账号、联系方式、精确位置和无关私密细节。
- 组织材料：区分正式制度、口头惯例、会议纪要、项目记录、个人感受和二手转述。
- 项目复盘：区分结果事实、过程事实、解释、责任归因、补救动作和未验证假设。
- 公共争议：区分公开来源、当事人说法、媒体报道、平台规则、法律事实、舆论解释和模型推测；涉及最新事实或真实人物组织时必须查源。

## 默认输出

默认输出一个或多个 `案例库条目`。每个条目至少包含：

- 案例摘要
- 事实边界
- 材料来源
- 尺度窗口
- 机制链
- 责任链
- 反向条件
- 可复用概念
- 后续观察

如用户要求可维护案例库，再追加 `案例索引`、`标签`、`相似案例`、`复用场景` 和 `更新记录`。

## 硬规则

- 不准复制 `crossframe` 全文；只通过相对路径读取 canonical skill 与路由图。
- 不准把聊天原文或个人信息直接沉淀为案例资产，除非用户明确要求且已确认可公开范围。
- 不准把猜测、动机推断、二手评价写成事实。
- 不准只讲故事；每个案例必须抽出至少一条机制链和一条责任链。
- 不准用 CrossFrame 术语替代案例事实；概念必须服务于复用，而不是装饰输出。
- 不准把案例库写成人格审判、组织定罪、舆论宣判或合规背书。
- 不准用公共尺度抹掉个人伤害、组织失职、证据缺口或责任链。
- 证据不足但风险紧急时，只能给低风险、可撤回、可观察的后续观察项。

## 质量门

一次合格的 casebook 输出必须能回答：

- 这个案例可以复用来识别什么结构问题？
- 哪些材料是事实，哪些只是解释或猜测？
- 这个案例的来源是否可追溯、可脱敏、可公开？
- 当前使用的是哪一个尺度窗口，是否发生了不当尺度转移？
- 机制链如何从条件、行为、反馈走向结果？
- 责任链中谁有改变条件的权力，谁在承担成本？
- 什么反向条件会推翻或降档本案例判断？
- 哪些概念真正提高复用性，哪些只是术语堆砌？
- 下一次遇到相似材料时，应该观察什么信号？
