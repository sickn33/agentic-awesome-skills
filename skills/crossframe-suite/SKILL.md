---
name: crossframe-suite
description: "Use when the user explicitly invokes CrossFrame Suite for Chinese structural diagnosis workflows across relationships, organizations, public issues, philosophy, research, or essay output."
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
  - workflow
  - multi-skill
  - structural-diagnosis
---
# CrossFrame Suite


## When to Use This Skill

- Use only when the user explicitly names CrossFrame Suite, `crossframe-suite`, `/crossframe-suite`, or `$crossframe-suite`.
- Use as the umbrella router when a CrossFrame task may need multiple sibling skills, such as diagnosis plus public analysis, essay output, and review.
- Do not load every sibling skill by default; follow the routed workflow and progressive-reading rules in the original body below.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

`crossframe-suite` 是总调度 skill，不替代任何专项 skill。它只做三件事：

1. 判断用户任务属于哪条工作流。
2. 安排连续读取顺序。
3. 输出一个简短的调度提纲，然后进入相应 skill。

它不复制 `crossframe`、`crossframe-essay` 或其它平行 skill 的正文。中文为权威语义；英文只作 skill id、文件名和对外传播名。

当任务触发 CrossFrame 主体时，suite 还要把 `../crossframe/references/runtime-read-policy.md` 与 `../crossframe/references/continuity-closure-map.md` 纳入调度判断：本次是否需要按 v5.0 原文连续板块联读，而不是只读单个概念卡。需要包说明或源锚点时，再由下游定向读取 `continuity-bundles.md` 或具体包文件。v3.0 与 v2.0 文件只作为历史基线；默认以 v5.0 源结构为准。

suite 入口的交互选择只确认两项：输出模式与角色。文章类型不在 suite 开头选择；若最终进入 `crossframe-essay` 且文章层未关闭，先完成问题拆解与结构洞察底稿，再由 `crossframe-essay/templates/article-type-selection-dialog.md` 在正文生成前单独确认。

## 显式调用后的总入口

只有用户显式调用 `crossframe-suite`、`$crossframe-suite`、`/crossframe-suite` 或明确要求使用 CrossFrame Suite 时，才从本 skill 进入。进入之后，优先由本 skill 调度；只有任务非常单一且用户点名了专项 skill 时，才直接使用对应专项 skill。

当用户通过本 skill 作为总入口提出任何 CrossFrame 内容任务时，默认最终都生成**5.0 混合长文**，输出档位为 `full-visible-v5-longform`：完整可见底稿 + 完整长文正文。专项产物可以先生成，但最后默认进入文章层。

```text
crossframe -> [needed sibling skills] -> crossframe-essay(full-visible-v5-longform) -> crossframe-review
```

这条默认不是为了把所有回答写长，而是因为文章更适合把结构判断、专项产物和 v5.0 保真检查交给普通读者：先完成必要的诊断/评审/案例/教学/辩论/备忘录，再形成底稿，再成文，最后过质量闸。

完整交互顺序固定为：`/crossframe-suite -> 模式/角色选择器(4+6) -> suite 路由与专项拆解 -> 结构洞察底稿 -> 文章类型选择器 -> 写作技法读取 -> 文章正文 -> 质量闸收束`。文章类型选择器必须发生在结构洞察底稿之后、文章正文之前。

这条默认不直接把固定声口传给 `crossframe-essay`。声口由 `references/output-mode-selector.md` 中的角色、输出模式与 `topic_sensitivity` 共同决定：学术专家/批判反思者默认中性分析体，大众传播/未来探索者可启用编辑底色；用户显式要求“亲切/编辑口吻/答复体”时覆盖。中性分析体不是冷淡体，`vulnerable` 主题仍要先接住人。

`full-visible-v5-longform` 的意思是：v5.0 连续联读包、源结构保真、概念风险和反向条件要在底稿中可见；但这些后台检查不能吞掉正文。正文仍必须写成完整文章，有标题、铺陈、概念上升、现实回落、边界和余味。

`crossframe-review` 是质量闸，不是默认成文链路的最终写作者。只要文章层未关闭，最终可见交付必须仍然包含 `# 结构洞察底稿` 和 `# 文章正文`；质量闸通过时只追加极短结论或内部通过，不得只输出评审报告。只有用户明确要求“只要评审/完整评审报告/不要文章”，或质量闸发现硬失败且必须阻断发布时，才允许把评审报告作为主输出。

只有在用户明确说“只要/不要文章/不要成文/短答/三句话/表格/清单/原始评审/原始案例库/原始备忘录/纯诊断/仅行动方案”时，才关闭默认文章层。此时应保留用户指定的交付物。

## 何时使用

当任务不是单一诊断，而可能需要多个 CrossFrame skill 连续协作时，优先使用本 skill：

- 用户希望使用 CrossFrame，但没有指定具体子 skill。
- 用户只说“分析一下/怎么看/讲讲/写一下”，且更像想看一段可读输出。
- 写文章、评论、思想文章、公共评论、组织复盘文章。
- 答读者问、编辑回信、咨询式回应，但问题背后有结构诊断。
- 把材料整理成案例，再写分析或沉淀概念。
- 读书、理论、文章研究笔记，需要比较与 CrossFrame 的关联和不同。
- 命题辩论后需要成文、给结论或写反驳。
- 先生成输出，再评审它是否真的推理。
- 用户说“这些 skill 应该一起用”“连续触发”“总规则”“总入口”“怎么组合调用”。

若任务非常单一，直接使用对应专项 skill，不要绕行：

- 只要结构诊断：`../crossframe/SKILL.md`
- 只要文章：`../crossframe-essay/SKILL.md`
- 只要评审：`../crossframe-review/SKILL.md`
- 只要短答复：`../crossframe-dialogue/SKILL.md`
- 只要案例库：`../crossframe-casebook/SKILL.md`
- 只要公共议题证据边界：`../crossframe-public/SKILL.md`
- 只要组织修复备忘录：`../crossframe-org/SKILL.md`
- 只要概念教学：`../crossframe-teach/SKILL.md`
- 只要命题论证：`../crossframe-debate/SKILL.md`
- 只要读书研究笔记：`../crossframe-notebook/SKILL.md`

## 必须读取

每次触发后读取：

1. `references/output-mode-selector.md`
2. `references/workflow-routing-map.md`
3. `protocols/suite-dispatch-protocol.md`
4. `templates/suite-reasoning-outline.md`

然后按路由读取对应 sibling skill。基础结构判断通常先读 `../crossframe/SKILL.md` 与 `../crossframe/references/read-routing-map.md`。

## 调度原则

- 基础先行：多数复杂任务先由 `crossframe` 建立事实边界、尺度窗口、机制候选和判断档位。
- 场景追加：只读取本次必要的专项 skill，不把全部 skill 一起触发。
- 成文后置：写文章前先有结构洞察底稿；公共、组织、辩论、读书等专项判断先完成，再进入 `crossframe-essay`。
- 默认成文：suite 被触发时，最终输出默认走 `crossframe-essay`，输出档位固定为 `full-visible-v5-longform`；专项产物先做，文章后置。
- 模式/角色先行：suite 开头只确认输出模式与角色；没有触发词时展示 `templates/mode-selection-dialog.md` 并等待回复，不直接开始。
- 文章类型后置：文章类型只在进入 `crossframe-essay` 后、结构洞察底稿生成后确认；它决定文章表达形态和写作技法读取，不改变 suite 的主路由。
- 胶囊归属：suite 只传入 `selection_state`、`workflow_state`、`voice_mode` 和文章层开关；不得读取 v5 源索引、不得展开连读包、不得生成 `v5-read-state-capsule`。胶囊由 `crossframe` 核心层在命中 source modules、入口包和必须同读闭包后生成。
- 声口由角色决定：suite 默认成文时，根据 `output-mode-selector.md` 将 `voice_mode` 和 `topic_sensitivity` 传给 `crossframe-essay`。用户显式要求“亲切/编辑口吻/答复体”时覆盖。
- 长文契约：任何从 suite 进入、且未显式关闭文章层的 CrossFrame 内容任务，默认不是短答，不得用项目符号诊断、摘要式回答或“如果只要一句话”替代完整正文。
- 成文边界：默认对所有 CrossFrame 内容任务成文；只有用户用“只要/不要文章/短答/表格/清单/纯诊断/仅行动方案”等词明确关闭时，才关闭文章层。
- 源连续性：高责任、公共制度、亲密关系、长期演化、深度分析、框架治理、AI 现实验证、弱信号/不透明、无法退出和文章输出，要在调度中列出本次触发的 v5.0 连续联读包；不要只列概念卡。
- 源锚点完整性：凡进入文章层、高责任、公共制度、AI/过程性产物、生命周期、无法退出主体或框架治理时，调度提纲要要求下游复用 `v5-read-state-capsule` 并执行源锚点完整性检查。
- 评审收束：重要输出默认最后用 `crossframe-review` 做质量闸；质量闸不得接管最终输出或吞掉底稿/正文。轻量短答复可只做内部自检。
- 查源克制：公共议题、真实机构、平台、政策、人物、公司和最新事实要查源；私人关系、哲学泛论、用户自给材料默认不查源。
- 人话优先：最终输出先给普通人能读懂的结果，术语只做必要映射。

## 默认连续链路

```text
结构诊断：
crossframe -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

开放式可读分析：
crossframe -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

普通洞察文章：
crossframe -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

公共评论文章：
crossframe -> crossframe-public -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

组织复盘/修复文章：
crossframe -> crossframe-org -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

答读者问/编辑回信：
crossframe -> crossframe-dialogue -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

案例沉淀：
crossframe -> crossframe-casebook -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

概念教学：
crossframe -> crossframe-teach -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

命题辩论：
crossframe -> crossframe-debate -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

辩论后成文：
crossframe -> crossframe-debate -> crossframe-essay -> crossframe-review

读书/理论研究：
crossframe -> crossframe-notebook -> crossframe-essay(full-visible-v5-longform) -> crossframe-review

读书后成文：
crossframe -> crossframe-notebook -> crossframe-essay -> crossframe-review
```

进入 `crossframe-essay` 后先生成结构洞察底稿，再执行文章类型选择规则：用户已显式指定文章类型时在底稿中记录并直接采用；用户未指定且文章层开启时，基于底稿展示 `../crossframe-essay/templates/article-type-selection-dialog.md`；用户回复“默认/自动/都行”时采用底稿推荐项；用户明确关闭文章层时不展示。

`crossframe-review-lite` 表示不必输出完整评审报告，但必须检查：是否跳过事实边界、是否人格审判、是否概念堆砌、是否越过证据档位。

## 输出方式

除非用户只问“该用哪个 skill”，否则最终输出先给一个短调度提纲：

```text
调度提纲
- 任务类型：
- 输出模式与角色：
- 工作流：
- 必读 skill：
- 按需读取：
- 连续联读包：
- 主题敏感度：
- 正文声口：
- 文章类型：
- 输出档位：
- 不读取：
- 质量闸：
```

然后进入对应 skill 的正常输出。不要把调度提纲写得比任务本身还长。

## 禁止

- 禁止为了显得完整而触发全部 skill。
- 禁止跳过 `crossframe` 的事实边界和判断档位直接写文章。
- 禁止公共议题不查源却做强判断。
- 禁止把 `crossframe-review` 当作形式收尾；它必须能否决坏输出。
- 禁止在 suite 默认成文链路中只输出质量闸、评审结论或修复建议，而隐藏 `结构洞察底稿` 和 `文章正文`。
- 禁止让调度规则取代专项 skill 的协议。
