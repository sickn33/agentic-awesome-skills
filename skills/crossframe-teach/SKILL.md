---
name: crossframe-teach
description: "Use when CrossFrame Suite routes explicit Chinese teaching of CrossFrame concepts, misreading boundaries, plain-language examples, signals, or exercises."
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
  - teaching
  - concepts
  - plain-language
---
# CrossFrame Teach



## When to Use This Skill

- Use when `crossframe-suite` routes explicit CrossFrame work into concept teaching, misreading correction, plain-language examples, observable signals, or exercises.
- Use when the user wants to understand a CrossFrame concept without turning terms into slogans.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果概念教学要连接文章写作、案例沉淀、读书研究或输出评审，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责教学解释、误读边界和练习。

## 轻入口原则

中文是权威语义。`CrossFrame Teach` 只是教学入口，不重写、不替代、不压缩 canonical CrossFrame。

每次触发后先读取相邻 canonical 材料：

- `../crossframe/SKILL.md`
- `../crossframe/references/read-routing-map.md`
- 若概念教学触发高责任、公共制度、亲密关系、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
- 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。

不要把 canonical 全文复制进回答。只按本次概念需要读取 canonical 的协议、术语保真材料、概念卡或模板；教学表达使用本 skill 的轻量协议和模板。

## 必读资源

1. 读取 `protocols/teach-protocol.md`，确定本次是概念课、误读纠偏、现实信号训练，还是练习题生成。
2. 读取 `references/teaching-fidelity.md`，防止术语堆砌、解释过短失真、道德化和漏练习。
3. 需要成稿时使用 `templates/concept-lesson.md`；只生成练习时使用 `templates/micro-exercises.md`。
4. 需要对照样例时读取 `examples/` 中对应概念；需要自测时读取 `evals/smoke-tests.md`。

## 输出顺序

默认按这个顺序输出，不要把术语放在第一段当结论：

1. **先说人话**：用普通生活语言解释概念在说什么。
2. **概念映射**：把人话对应到 1-3 个 CrossFrame 结构问题。
3. **反例与误读边界**：写清不能误读成什么，给一个坏例或反例。
4. **现实观察**：列出现实里能看见的行为、资源、边界、反馈或责任变化。
5. **练习**：给 1-3 个小练习，帮助用户自己辨认概念边界。

如果用户要求极简，也至少保留一个极短自测问题，除非用户明确说不要练习。

## 教学边界

- 概念解释不是现实诊断；没有事实时，不给强判断。
- 不把 CrossFrame 概念当作道德要求、人格标签、命运预言或专业替代品。
- 不说“这是典型的 X，所以 Y”；先说事实模式，再给概念映射。
- 不把“爱/开放行动”讲成继续忍耐、继续牺牲或取消责任链。
- 不把“开放断言”讲成含糊、不负责或最终审判。
- 不把“承接/回流”讲成脾气好、会沟通、态度变好或单方负责。

## 最低合格标准

一次合格的教学回答必须能回答：

- 普通人第一段能不能听懂？
- 这个概念对应哪些现实行为或结构变化？
- 它最容易被误读成什么？
- 哪个反例能让用户知道边界在哪里？
- 用户可以观察什么信号？
- 用户可以做哪一个练习来验证自己是否理解？

## 资源索引

- `protocols/teach-protocol.md`：教学解释流程。
- `references/teaching-fidelity.md`：教学保真与反误用规则。
- `templates/concept-lesson.md`：完整概念课模板。
- `templates/micro-exercises.md`：练习题模板。
- `examples/chengjie-huiliu.md`：承接/回流教学样例。
- `examples/open-assertion.md`：开放断言教学样例。
- `examples/love-open-action.md`：爱/开放行动教学样例。
- `examples/failure-patterns.md`：失败样例。
- `evals/smoke-tests.md`：smoke tests。
