---
name: crossframe-dialogue
description: "Use when CrossFrame Suite routes explicit Chinese reader replies, editor responses, consultation-style short answers, or boundary-aware structural advice."
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
  - dialogue
  - reader-reply
  - consultation
---
# CrossFrame Dialogue



## When to Use This Skill

- Use when `crossframe-suite` routes an explicit CrossFrame task into a reader reply, editor response, consultation-style short answer, or boundary-aware advice.
- Use when the answer should first translate structural judgment into plain Chinese before optional term mapping.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果用户要把短答复扩成长文、公共评论、组织备忘录或案例沉淀，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责短答复、编辑回信和咨询式回应。

## 定位

`crossframe-dialogue` 是 `crossframe` 与 `crossframe-essay` 的平行短答复 skill。它不复制 CrossFrame 全文，不写长文，不把咨询式回应伪装成处方。默认输出短而有洞察的结构答复：接住问题、事实边界、结构判断、必要批评、稳妥建议、停止/升级条件。

中文是权威语义；`CrossFrame Dialogue` 只是传播名和 skill id。遇到中英文理解冲突时，以中文术语和中文判断为准。

## 必读

每次触发后先读取：

1. `../crossframe/SKILL.md`
2. `../crossframe/references/read-routing-map.md`
3. 若问题触发高责任、公共制度、亲密关系、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
4. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。
5. `protocols/dialogue-protocol.md`
6. `references/dialogue-quality-gates.md`

如果用户要求亲切、编辑、同志口吻、答读者问、报刊回信、耐心解答、给意见，或问题天然像读者来信，再按需读取：

- `../crossframe-essay/SKILL.md`
- `../crossframe-essay/protocols/editorial-comrade-voice-protocol.md`
- `../crossframe-essay/references/editorial-voice-principles.md`
- `references/voice-bridge.md`

如果涉及安全、法律、医疗心理、公开指控、处分、名誉、公共资源、强权力关系或紧急伤害风险，读取 `protocols/consultation-boundary-protocol.md`。

## 默认流程

1. 判断回应类型：答读者问、编辑回信、咨询式回应、公共问题短评、概念问答、行动边界建议。
2. 用 `../crossframe/references/read-routing-map.md` 选择必要 CrossFrame protocol、概念卡、模板或边界协议。
3. 做内部微型 intake：对象、事实边界、证据缺口、尺度窗口、机制候选、责任链/成本链、用户真正用途。
4. 至少比较两个机制候选；证据不足时降低判断档位，不硬判。
5. 把后台概念翻译成现实行为；术语只作为必要映射，不在前台堆叠。
6. 输出短答复；除非用户要求，不展示完整工作表、长文底稿或概念链。

## 默认输出

默认 4 到 8 个短段，或使用 `templates/default-short-answer.md`：

- 先接住问题：说明困惑为什么值得认真对待。
- 再划事实边界：哪些是已知，哪些只是推测。
- 给结构判断：现在更像哪类机制，而不是谁天生如何。
- 必要时批评：批评行为、流程、责任转嫁或伪修复，不做人格审判。
- 给稳妥建议：观察信号、低风险动作、修复条件、边界设置或退出转移。
- 写停止/升级条件：什么情况下不要再解释、需要求助、升级到专业/制度/安全路径，或撤回本判断。

## 硬规则

- 不输出“只安慰不判断”的答复。
- 不把结构诊断写成人格审判、道德宣判、命运预言或群体标签。
- 不用术语堆砌替代现实解释；第一段删掉术语后仍必须成立。
- 不把“爱”“理解”“修复”写成单方继续忍耐的义务。
- 不把 AI 报告、合规文本、道歉、复盘、声明或流程入口直接当作高成本证据。
- 不在证据不足时给强处分、公开指控、法律/医疗/心理处方或不可逆建议。
- 不用宏大尺度取消低尺度痛苦、责任、证据和行动边界。

## 失败自检

输出前快速检查：

1. 我有没有接住问题，但没有停在安慰？
2. 我有没有区分事实、解释、机制候选和判断档位？
3. 我有没有把批评指向行为/结构/责任链，而不是人格？
4. 我有没有给出可观察信号、低风险动作、停止条件或升级条件？
5. 删掉术语后，读者还能不能知道该看什么、别做什么？
