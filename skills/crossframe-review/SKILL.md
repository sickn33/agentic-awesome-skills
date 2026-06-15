---
name: crossframe-review
description: "Use when explicit CrossFrame output needs review for reasoning fidelity, evidence boundaries, source anchors, concept drift, article collapse, or repair steps."
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
  - review
  - quality-gate
  - evidence
---
# CrossFrame Review


## When to Use This Skill

- Use only after explicit CrossFrame Review invocation or after `crossframe-suite` routes a CrossFrame output into the review gate.
- Use to check reasoning fidelity, evidence boundaries, source anchors, concept drift, article-body collapse, and repair steps.
- Do not use as a generic code review, prose review, or ordinary critique skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

如果评审对象来自多个 CrossFrame skill 的连续工作流，先读取 `../crossframe-suite/SKILL.md` 还原应有调度链，再判断是否有漏触发、误触发或跳过质量闸。

本 skill 只做评审与修复建议，不替代 `crossframe` 生成诊断，也不替代 `crossframe-essay` 写文章。中文为权威语义；英文只作 skill id、文件名和接口说明。

## 轻入口规则

每次触发后，先读取 canonical skill，而不是复制它们的正文：

1. 读取 `../crossframe/SKILL.md`。
2. 读取 `../crossframe/references/read-routing-map.md`。
3. 读取 `../crossframe/references/runtime-read-policy.md` 与 `../crossframe/references/continuity-closure-map.md`，判断本应触发哪些 v5.0 连续联读包；只有需要包说明、源锚点或闭包细节时，再定向读取 `../crossframe/references/continuity-bundles.md` 或具体包文件。
4. 若评审对象是深度、审计、高责任、公共制度、亲密关系、长期演化或文章类输出，读取或检查 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule` 是否存在并被下游复用。
5. 按需读取 `../crossframe/worksheets/source-continuity-check.md` 与 `../crossframe/worksheets/source-anchor-integrity-check.md`，检查闭包是否完整、中心命题和行动边界是否能回指胶囊源锚点。
6. 若评审对象是文章、长文、评论、思想文章、报刊答复或“现代编辑同志口吻”输出，按需读取 `../crossframe-essay/SKILL.md`。
7. 读取本目录的 `protocols/review-protocol.md` 和 `templates/review-report.md`。
8. 若涉及文章底稿、引用、检索材料或声口，追加读取 `protocols/article-review-protocol.md`。
9. 若涉及公共事实、真实机构、平台、政策、人物、公司、最新事实、AI/过程性产物、批判文章或来源使用，读取 `../crossframe/references/source-ledger-workflow.md`，检查来源台账字段是否完整。
10. 按需读取本目录 `references/` 中的评分表、失败类型表和证据边界清单。

不要把 CrossFrame 主 skill、文章 skill、eval、examples 或完整案例复制到本 skill 输出中。评审时只引用必要规则名、触发点和证据位置。若 `v5-read-state-capsule` 已存在，下游默认复用胶囊，不得为了评审而重复整块读取源索引。

## 评审目标

判断一个输出是否真的完成了 CrossFrame 的最低推理链：

- 明确诊断或写作对象。
- 区分事实、解释、证据缺口和判断档位。
- 经过对象闸、证据闸、尺度闸、责任闸、观测闸。
- 至少形成两个机制候选，或说明为什么只能有一个。
- 对承担判断作用的高风险概念做保真检查，而不是把术语当结论。
- 对属于 v5.0 连续板块的高风险概念做源结构连续性检查，而不是只读单张概念卡。
- 对中心命题、机制候选、高风险概念、行动边界、文章类型转译和写作技法做源锚点完整性检查；不能回指胶囊的内容不得写成 CrossFrame v5 原义。
- 给出可撤回条件、下一步观察或低条件行动边界。
- 文章类输出必须先有结构洞察底稿，再写正文。

## 必抓失败

以下问题一旦出现，要在评审中明确定位；严重时直接判为不合格：

- 概念堆砌：只堆“承接、回流、尺度、反俘获”等词，没有落回事实和行为。
- 伪推理：先给结论，再用术语装饰；没有机制候选、反向条件或证据闸。
- 事实边界缺失：把传闻、AI 报告、自评、搜索摘要或解释当事实。
- 跳过底稿：文章类输出直接成文，没有结构洞察底稿或等价内部骨架。
- 人格审判：把结构诊断变成“这个人坏、懒、无能、病态”等定性。
- 伪造引用：编造原文、页码、出处、作者观点；不确定原句却写成直接引用。
- 查源接管命题：检索材料决定文章立场，CrossFrame 只变成资料拼贴外壳。
- 强判断越级：处分、名誉、权利、资源、公共记忆类判断没有命题验证和申诉/反证入口。
- 尺度洗白：用宏观叙事取消低尺度痛苦、责任链或具体失职。
- AI 合规剧场：把 AI 生成材料、漂亮报告或自评文本当作独立强证据。
- 连续性保真失败：本应触发 `continuity-bundles.md` 的联读包，却只读单个概念卡、单个 protocol 或单个摘录就下判断。
- 胶囊缺失：应由 `crossframe` 生成 `v5-read-state-capsule` 的任务没有胶囊，导致 essay/review 各自重读源索引或发明路由。
- 源锚点失败：中心命题、机制候选、高风险概念、行动边界或文章转译无法回指胶囊源锚点，却写成 CrossFrame v5 原义。
- 下游重复整块读源：已有胶囊时，essay 或 review 又整块读取 v5 源索引、完整连读包或材料选择图，造成源边界漂移。
- 选择器压缩失败：模式/角色或文章类型选择器没有完整渲染选项、推荐项和等待用户回复。
- 技法越界失败：写作技法新增事实、强判断、点睛句或隐喻证明，越过底稿和胶囊源边界。
- 来源用途越界失败：把热度、机构声明、PR 文案、AI 生成材料、自评文本或二手转述写成已核验事实。
- 来源台账缺失：公共、批判、文章或高责任输出涉及真实对象，却没有来源、时间、来源类型、支持命题、不能证明什么、证据档位、使用位置、降档理由和仍需补证处。
- v5 现实保护失败：涉及 AI 过程性产物、弱信号、不透明、无制度基础设施、无法退出、恶意合规、隐喻漂移、工具化或开放断言退场，却没有读取对应 v5 概念卡和联读包。

## 输出协议

默认使用 `templates/review-report.md`。最终评审必须包含：

- 评审对象
- 事实边界
- 触发规则
- 评分/等级
- 关键问题
- 证据定位
- 修复建议
- 是否合格

若用户只要一句话结论，也要保留“是否合格 + 主要失败点 + 下一步修复”的最小结构。

## Suite 调度可见性

当本 skill 经 `crossframe-suite` 作为默认质量闸调用，而用户没有明确要求“只要评审/完整评审报告/不要文章”时，评审不接管最终输出：

- 评审对象是已经形成的 `结构洞察底稿` 与 `文章正文`。
- A/B 或小修可过时，把问题反馈给上游修正，最终可见交付仍是 `# 结构洞察底稿` + `# 文章正文`，最多追加一行短质量闸摘要。
- C/D/F 或硬失败时，阻断发布并要求回到对应上游补底稿、补证据边界或重写正文；若用户没有要求只看评审，不得只输出评审报告来替代修复后的文章。
- `templates/review-report.md` 只在用户显式要求完整评审报告、只评审已有输出，或硬失败需要说明阻断原因时作为主输出。

## 合格判定

评分只是辅助，硬失败优先：

- A：90-100，合格。
- B：75-89，条件合格，小修后可用。
- C：60-74，不合格，需要大修。
- D：40-59，不合格，需要重做主要推理。
- F：0-39 或触发硬失败，高风险失败。

触发人格审判、伪造引用、跳过文章底稿、强判断越级、证据边界完全缺失、连续性保真失败时，即使文字流畅，也不能判为合格。

## 修复原则

评审输出优先给可执行修复，不默认重写全文。除非用户要求“直接改写”，否则只给：

- 应补的事实边界。
- 应读取或声明的路由。
- 应新增的机制候选。
- 应降档的判断。
- 应删除或改写的人格审判、伪引用和术语堆砌句。
- 文章应补的结构洞察底稿项目。
