---
name: crossframe-public
description: "Use when CrossFrame Suite routes explicit Chinese analysis of public issues, platform governance, policy, institutional responsibility, appeals, or compliance evidence."
category: workflow
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
  - public-policy
  - governance
  - evidence
---
# CrossFrame Public



## When to Use This Skill

- Use when `crossframe-suite` routes an explicit CrossFrame task about public issues, platform governance, policy, institutional responsibility, public commitments, appeals, or compliance materials.
- Use when source ledgers, evidence downgrades, public responsibility boundaries, and low-power subject protection matter.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

## Limitations

- The skill body is intentionally Chinese-canonical; English metadata is for discovery and does not replace the original Chinese terms.
- Use only after explicit CrossFrame invocation or `crossframe-suite` routing; do not apply it as a generic default reasoning layer.
- It structures analysis, drafting, and review, but does not replace source verification, domain expertise, or legal, medical, or financial judgment.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果公共议题分析之后要写评论文章、组织建议、辩论论证或质量评审，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责公共事实、证据边界、程序与制度专项判断。

CrossFrame Public 是 `crossframe` 的公共议题/制度评论专项轻入口，不复制 canonical CrossFrame 全文。中文是权威语义；英文只作为 skill id、文件名或对外简介。

## 必须读取

每次触发后先读取：

1. `../crossframe/SKILL.md`
2. `../crossframe/references/read-routing-map.md`
3. 若公共判断触发高责任、公共制度、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
4. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。
5. `protocols/public-issue-protocol.md`
6. `references/source-and-evidence-rules.md`
7. `../crossframe/references/source-ledger-workflow.md`，用于统一记录来源、时间、来源类型、支持命题、不能证明什么、证据档位、使用位置、降档理由和仍需补证处。

公共评论、平台治理、机构合规、公共强判断默认触发 `v5-public-power-institution-pack`、`v5-low-power-protection-pack`、`v5-evidence-downgrade-action-ceiling-pack`；AI 报告或合规材料追加 `v5-ai-process-artifact-boundary-pack`。

按任务类型追加：

- 平台处罚、封禁、限流、删帖、账号申诉：读 `protocols/platform-appeal-protocol.md` 和 `templates/action-boundary.md`。
- 公共政策、制度评论、公共承诺兑现：读 `protocols/public-policy-protocol.md` 和 `templates/public-comment-draft.md`。
- 机构自查、整改报告、AI 合规材料、伦理/安全声明：读 `protocols/institutional-compliance-protocol.md` 和 `references/ai-compliance-performance.md`。
- 需要写成公共评论文章：再读 `../crossframe-essay/SKILL.md`，但事实边界和证据档位仍以本 skill 为入口。
- 只要求边界、不要求评论：使用 `templates/evidence-boundary-summary.md` 或 `templates/action-boundary.md`。

## 默认查源

真实公共议题默认需要查源，并按 `../crossframe/references/source-ledger-workflow.md` 建来源台账。优先找原始材料、官方文本、平台规则、政策原文、监管/司法/审计文件、当事方一手声明、可信媒体交叉报道和可复核数据。

如果用户明确禁止联网或当前无法查源：

- 不输出强判断。
- 不把热度、转述、截图、平台声明或机构自评当事实。
- 输出 `证据边界摘要` 或 `行动边界`，并标注“未查源，只能作为待核验框架”；若已有用户材料，也要写明这些材料能支持什么、不能证明什么。

## 核心检查

公共议题输出必须检查五组问题：

- 程序正义：规则是否事前公开、适用是否一致、证据是否可见、复核是否独立。
- 申诉有效性：申诉入口是否可达、理由是否可提交、回复是否具体、纠错是否真实改变结果。
- 弱信号保护：投诉、异常数据、少数证词、边缘群体受损是否被热度或机构话术淹没。
- 公共承诺偿付：道歉、整改、补偿、承诺是否转成可检验的资源、期限、责任人和反馈机制。
- AI 合规表演风险：漂亮报告、自评清单、模型生成材料、伦理口号是否替代了外部验证和真实约束。

## 证据档位

输出前把材料分为：

- 已核验事实：能被原文、记录、可复核数据或多源交叉支持。
- 高成本证据：会带来法律、组织、经济、声誉或操作成本的材料。
- 低成本声明：平台公告、机构自评、PR 文案、无细节道歉、AI 生成合规文本。
- 弱信号：尚未形成定论，但指向受损、失灵、压制或异常的早期信号。
- 热度信号：搜索量、转发、评论、话题排名；只能说明关注，不直接说明真伪。
- 解释/判断：基于事实和机制候选形成的开放断言或评论判断。

## 输出模式

按用户意图选择一个主输出：

- 公共制度诊断：说明制度对象、事实边界、程序/申诉/弱信号/承诺偿付/AI 合规风险和机制候选。
- 公共评论底稿：先给证据边界和中心命题，再写可发表的评论草稿。
- 证据边界摘要：列出已核验、未核验、低成本声明、热度信号、反向条件和下一步核验。
- 行动边界：给出低风险、可撤回、可记录、可复核的行动建议；不替代法律、医疗、安全或专业意见。

## 硬规则

- 不查源时不得装作已经查源；只能降档。
- 不得把热度当事实，不得把平台/机构声明当强证据。
- 不得省略来源台账中的“不能证明什么”和“降档理由”。
- 不得把公共议题写成人格审判、道德宣判、阵营标签或羞辱动员。
- 不得用 CrossFrame 术语替代证据核验、专业领域知识或法律判断。
- 不得把“合规材料存在”写成“合规已经发生”。
- 不得为了评论锋利而隐藏证据缺口、反向条件或可能撤回判断的材料。
- 涉及现实人物、组织、权利、处分、资格、公共记忆时，按 `../crossframe/references/read-routing-map.md` 进入高责任/命题验证/公共制度相关路由。

## 最低合格输出

一次合格输出至少回答：

- 这次讨论的公共对象是什么？
- 哪些事实已经核验，哪些只是声明、热度或解释？
- 程序正义和申诉有效性是否可见？
- 谁承担成本，谁拥有改变条件？
- 弱信号是否被保护，还是被热度/话术淹没？
- 公共承诺是否有偿付路径？
- 是否存在 AI 合规表演风险？
- 本次判断处于什么档位，什么证据会使它撤回或升级？
- 下一步应查什么、说什么、做什么，以及不能做什么？
