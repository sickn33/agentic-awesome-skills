---
name: crossframe-notebook
description: "Use when CrossFrame Suite routes explicit Chinese notes for books, theories, articles, excerpts, bidirectional reading, absorption, or conflict mapping."
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
  - notebook
  - research
  - reading
---
# CrossFrame Notebook



## When to Use This Skill

- Use when `crossframe-suite` routes explicit CrossFrame work into notes for books, theories, articles, excerpts, bidirectional reading, absorption, or conflict mapping.
- Use when original text and CrossFrame concepts must be kept distinct.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果读书研究之后要成文、教学、辩论或评审，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责读书/理论/文章研究笔记。

本 skill 是 `crossframe` 的平行研究笔记入口，不替代 `crossframe` 做现实诊断，也不替代 `crossframe-essay` 写文章。中文为权威语义；英文只用于 skill id、文件名、接口和必要对外说明。

## 轻入口读取

每次触发后先读取相邻 canonical 资料，而不是复制它们的正文：

1. `../crossframe/SKILL.md`
2. `../crossframe/references/read-routing-map.md`
3. 若阅读对象触发高责任、公共制度、亲密关系、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
4. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。
5. 本目录 `protocols/notebook-reading-protocol.md`
6. 本目录 `protocols/bidirectional-reading-protocol.md`
7. 本目录 `protocols/source-integrity-protocol.md`
8. 按任务读取 `templates/`、`references/` 和 `examples/`

不要把 canonical 全文搬进本 skill 输出。只引用必要规则名、概念名和相对路径。

## 核心定位

CrossFrame Notebook 做的是双向阅读：

- 先把原文本或理论按它自己的问题意识、概念和论证还原出来。
- 再问它与 CrossFrame 的关联、不同、冲突、可吸收处和不可吸收处。
- 最后把文本对 CrossFrame 的反向压力写成可继续研究的问题。

它不是“读书摘要器”，也不是“拿 CrossFrame 套文本”。如果用户只给了标题或模糊记忆，必须标明来源边界；不能伪造页码、原句、出处或作者观点。

## 必须输出的最小结构

一次合格笔记至少包含：

- 阅读对象与来源边界
- 原文本自己的中心问题
- 原文本自己的关键概念或论证链
- 与 CrossFrame 的关联
- 与 CrossFrame 的不同
- 与 CrossFrame 的冲突或张力
- 可吸收处
- 不可吸收处
- 反馈给 CrossFrame 的问题
- 引用与核验边界

用户要求极简时，也必须保留“关联 / 不同 / 可吸收 / 不可吸收 / 反馈问题”的最小骨架。

## 硬失败

以下情况一旦出现，要主动纠偏或判定当前输出不合格：

- 只做读书摘要，没有 CrossFrame 对照和反馈问题。
- 只拿 CrossFrame 套文本，原文本自己的问题意识消失。
- 伪造引用、页码、版本、原句或作者观点。
- 没有同时写出关联与不同。
- 把“可吸收处”写成全盘收编，或把“不可吸收处”写成贬低原文本。
- 把理论比较变成现实诊断、人格审判、意识形态定性或专业替代。
- 用搜索摘要、二手介绍或模型记忆冒充已读原文。

## 默认输出

默认使用 `templates/research-notebook.md`。需要记录来源时追加 `templates/source-ledger.md`。

输出语气要像研究笔记：清楚、克制、可复查。可以有判断，但判断必须绑定文本证据、来源边界和可撤回条件。

## 资源索引

- `protocols/notebook-reading-protocol.md`：读书/理论/摘录笔记流程。
- `protocols/bidirectional-reading-protocol.md`：双向互读协议。
- `protocols/source-integrity-protocol.md`：引用、页码、版本和来源边界。
- `references/absorption-taxonomy.md`：关联、不同、冲突、吸收、不可吸收、反馈问题分类。
- `references/notebook-quality-gates.md`：合格笔记质量闸。
- `references/source-boundary-rules.md`：来源可信度和不可伪造规则。
- `templates/research-notebook.md`：默认研究笔记模板。
- `templates/source-ledger.md`：来源台账模板。
- `examples/`：书籍理论、文章摘录、公共理论和失败样例。
- `evals/crossframe-notebook-smoke-tests.md`：smoke tests。
