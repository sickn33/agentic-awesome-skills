---
name: crossframe-debate
description: "Use when CrossFrame Suite routes explicit Chinese proposition testing, debate analysis, hidden-premise review, rebuttal design, or withdrawal condition checks."
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
  - debate
  - argument
  - proposition
---
# CrossFrame Debate



## When to Use This Skill

- Use when `crossframe-suite` routes an explicit CrossFrame task about propositions, debate, hidden premises, rebuttals, strongest opposing arguments, evidence requirements, or withdrawal conditions.
- Use to test claims before they become strong judgments.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果命题论证之后要写文章、公共评论、读书笔记或案例沉淀，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责命题拆解、正反结构、证据要求和撤回条件。

`crossframe-debate` 是 `crossframe` 的平行轻入口，用于把一个命题拆成可检验论证，而不是帮助某一方赢辩论。

中文为权威语义；英文只用于 skill id、文件名和接口说明。遇到中英文理解冲突时，以中文术语和中文判断为准。

## 轻入口规则

每次触发后，先读取 canonical skill 和路由图，不复制 CrossFrame 全文：

1. 读取 `../crossframe/SKILL.md`。
2. 读取 `../crossframe/references/read-routing-map.md`。
3. 如果命题触发高责任、公共制度、亲密关系、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，必须追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
4. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。
5. 读取本目录的 `protocols/debate-protocol.md`。
6. 读取 `templates/debate-analysis-output.md`。
7. 按需读取 `references/debate-quality-gates.md` 和 `references/debate-failure-patterns.md`。

按命题类型追加 canonical 路由：

- 公共议题、平台治理、政策、机构、真实人物或组织：按路由图进入公共制度、强判断、高责任、证据成本或命题验证材料；涉及最新事实时必须查源或降档。
- 关系、家庭、照护、边界、解释劳动：按路由图进入亲密关系、疗愈转移、责任链或爱/开放行动相关材料。
- 哲学、意义、第一因、虚无主义、价值命题：按路由图进入概念解释、开放断言和框架边界材料。
- 处分、名誉、权利、资格、资源、公开指控：必须进入命题验证和高责任路由；未完成验证只能作为开放断言或待核验命题。

## 默认任务

收到命题后，默认输出：

- 命题重写：把口号、情绪或价值表态改写为可检验命题。
- 正方结构：正方最好版本，不稻草人化。
- 反方结构：反方最好版本，不把反方写成愚蠢或恶意。
- 隐藏前提：事实前提、因果前提、价值前提、尺度前提、责任前提。
- 证据要求：当前证据、缺失证据、高成本证据、不可用证据。
- 最强反驳：每方必须面对的 strongest objection。
- 反向条件：哪些事实出现时，原命题要降档、改写或转向。
- 撤回条件：哪些证据足以撤回本判断。
- 更稳表达：把强硬结论改写为开放断言、条件判断或待核验命题。

## 工作流程

1. 界定命题对象：对象、尺度、时间窗口、影响对象、判断档位。
2. 判断命题类型：公共议题、关系命题、组织命题、哲学命题、强判断、表达修辞或混合命题。
3. 拆出待证内容：这个命题到底需要证明什么，哪些只是情绪、价值偏好或修辞。
4. 生成正反双方最好版本：先 steelman，再批评；不允许稻草人。
5. 列出隐藏前提：事实、因果、价值、尺度、责任链和可操作性前提。
6. 设定证据门槛：什么材料能支持、削弱、推翻、无法证明本命题。
7. 写反向条件和撤回条件：没有撤回条件的命题不能作为合格结论。
8. 输出更稳表达：让结论可检验、可降档、可被新事实修改。

## 硬规则

- 不把辩论写成动员、羞辱、阵营标签或人格审判。
- 不用最弱反方来证明己方正确。
- 不单边推进：即使用户指定立场，也要指出该立场最怕的证据和反驳。
- 不把愤怒、受伤、正义感、厌恶或共鸣当作论证本身。
- 不输出无撤回条件的强判断。
- 不用宏大尺度洗掉低尺度痛苦、责任链、证据缺口或行动边界。
- 不把 AI 报告、自评、机构声明、道歉稿、热度或漂亮表达当作高成本证据。
- 不把 CrossFrame 术语当作结论；术语只能帮助检查结构。

## 默认输出

默认使用 `templates/debate-analysis-output.md`。若用户只要短答，也必须保留最小结构：

- 命题档位
- 正反双方最好版本
- 最关键隐藏前提
- 最强反驳
- 撤回条件
- 更稳表达

## 合格自检

输出前检查：

1. 这个命题是否已经从口号变成可检验陈述？
2. 正反双方是否都被写成最好版本，而不是一方被丑化？
3. 是否区分了事实、价值、因果、尺度和责任前提？
4. 是否说明了需要什么证据，什么证据不够？
5. 是否给出反向条件和撤回条件？
6. 更稳表达是否还能保留原问题的锋芒，但不越过证据？
