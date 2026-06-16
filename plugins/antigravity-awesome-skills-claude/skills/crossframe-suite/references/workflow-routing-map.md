# Workflow Routing Map

本文件规定 CrossFrame skill family 的连续触发规则。

## 核心链路

| 用户目标 | 默认工作流 | 说明 |
|---|---|---|
| 结构诊断 | `crossframe -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 先诊断，再默认成文；只有用户说“只要纯诊断/不要文章”才停在诊断。 |
| 开放式可读分析 | `crossframe -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 用户只说分析、怎么看、讲讲、写一下且未指定格式时，默认输出完整可见底稿 + 完整长文正文。 |
| 普通洞察文章 | `crossframe -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 先诊断，再完整底稿，再长文正文，再评审；默认不是短答或冷诊断腔。 |
| 公共评论文章 | `crossframe -> crossframe-public -> crossframe-essay -> crossframe-review` | 公共事实和证据边界必须在成文前完成。 |
| 组织复盘文章 | `crossframe -> crossframe-org -> crossframe-essay -> crossframe-review` | 先看责任链、授权链、反馈写回，再成文。 |
| 答读者问 | `crossframe -> crossframe-dialogue -> crossframe-essay(full-visible-v5-longform, editorial-reply) -> crossframe-review` | 先短答复接住问题，再默认扩成文章；只有明确要短答才停在 dialogue。 |
| 编辑同志口吻长答 | `crossframe -> crossframe-dialogue -> crossframe-essay -> crossframe-review` | 先回信式判断，再扩成长文。 |
| 案例沉淀 | `crossframe -> crossframe-casebook -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 先沉淀案例，再默认成文。 |
| 案例后成文 | `crossframe -> crossframe-casebook -> crossframe-essay -> crossframe-review` | 案例是文章材料，不替代文章判断。 |
| 概念教学 | `crossframe -> crossframe-teach -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 先教学解释，再默认成文。 |
| 命题辩论 | `crossframe -> crossframe-debate -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 先拆命题和证据要求，再默认成文。 |
| 辩论后成文 | `crossframe -> crossframe-debate -> crossframe-essay -> crossframe-review` | 论证完成后再写文章。 |
| 读书研究 | `crossframe -> crossframe-notebook -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review` | 先输出关联、不同、可吸收处、冲突处，再默认成文。 |
| 读书后成文 | `crossframe -> crossframe-notebook -> crossframe-essay -> crossframe-review` | 研究笔记先于文章。 |
| 评审已有输出 | `crossframe-review -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review-lite` | 先给评审结论，再默认写成可读文章；只有“只要评审/不要文章”才停在 review。 |

## 默认成文规则

当 `crossframe-suite` 被触发时，默认把最终输出做成 `full-visible-v5-longform`：5.0 混合长文，包含完整可见底稿和完整长文正文。任何专项产物都先完成，再默认转成文章。典型信号：

- “分析一下这个问题”
- “你怎么看”
- “讲讲这个现象”
- “写一下这个主题”
- “给我一个有洞察力的回答”
- “我想看一个能给别人读的输出”
- “评审这个输出”
- “整理成案例”
- “讲这个概念”
- “给组织修复建议”
- “做命题辩论”

此时默认链路是：

```text
crossframe -> source-continuity-check -> v5-read-state-capsule -> source-anchor-integrity-check -> crossframe-essay(full-visible-v5-longform, editorial-base) -> crossframe-review
```

`source-continuity-check`、`v5-read-state-capsule` 和 `source-anchor-integrity-check` 都不是独立 skill，而是 `crossframe` 内部的源结构状态链：先确认是否读对连续联读包，再生成读态胶囊，最后检查中心命题、机制候选、高风险概念和行动边界是否能回指胶囊源锚点。v3/v2 文件只在需要历史版本对照时读取。

`editorial-base` 表示自动成文默认启用 `crossframe-essay` 的现代编辑底色：先接住问题，再共同分析结构，必要时严厉批评不当做法，最后给出清醒、有分寸的意见。问题型主题用答复体；公共评论、思想文章、概念文章用评论体。只有用户明确要求中性报告、备忘录、表格、清单、纯诊断或学术摘要时，才关闭这一声口。

`full-visible-v5-longform` 表示底稿完整可见，至少展示对象、事实边界、尺度窗口、机制候选、v5 连续联读包、源结构保真、概念风险、反向条件、声口方案和文章转译方案；正文默认 1200-2200 中文字，有标题、铺陈、概念上升、经典/理论参照或思想映射、现实回落、边界段和余味结尾。

关闭默认文章层的信号：

- “只要评审/只要原始评审/不要文章”
- “只要案例库/只要来源台账/只要脱敏材料”
- “只要组织修复备忘录/只要反馈写回方案/只要低风险试点”
- “只列正反方/只要命题论证表/只要隐藏前提”
- “只讲概念并出练习”
- “只要一句话/只要表格/只要清单/只要下一步行动/短答”

这些信号表示用户显式关闭文章层，输出停在指定交付物。没有“只要/不要文章”等显式关闭词时，仍默认追加文章层。

## 触发信号

### 追加 `crossframe-public`

- 平台、政策、公共制度、公共承诺、申诉、封禁、处罚、合规、机构声明。
- 最新事实、真实人物、真实公司、真实组织、公共争议。
- 需要查源、证据边界、弱信号保护或反俘获。
- 涉及 AI 合规文本、机构自评、恶意合规、可见性偏误或开放断言被处置化时，必须追加 `v5-ai-process-artifact-boundary-pack`、`v5-source-evidence-separation-pack` 和 `v5-evidence-downgrade-action-ceiling-pack`。

### 追加 `crossframe-org`

- 团队、项目、复盘、流程、绩效、授权、责任、管理层、中层耗竭。
- 用户要备忘录、修复方案、反馈写回方案、低风险试点。

### 追加 `crossframe-debate`

- 用户说“辩论、反驳、论证、命题、正反方、隐藏前提、最强反方”。
- 文章中心命题争议较强，需要先压测。

### 追加 `crossframe-notebook`

- 读书、论文、理论、文章、摘录、文献、思想家、经典、关联与不同。
- 需要从外部文本中吸收或反证 CrossFrame。

### 追加 `crossframe-casebook`

- 聊天记录、项目材料、复盘材料、事件链、案例库、可复用案例。

### 追加 v5.0 源连续性保护

- 框架是否失效、是否应降级/转接/退场：触发 `v5-framework-self-diagnosis-falsification-pack`。
- 共识程序、强判断、开放断言被长期引用：触发 `v5-open-assertion-proposition-pack`、`v5-strong-judgment-eight-pack`。
- 沉默、缺席、不透明、弱信号、AI 缺失材料：触发 `v5-low-power-protection-pack`、`v5-source-evidence-separation-pack`、`v5-ai-process-artifact-boundary-pack`。
- 家庭、小团队、非正式关系中没有制度却风险持续：触发 `v5-diagnosis-admission-downgrade-exit-pack`、`v5-low-power-protection-pack`。
- 无法退出、复杂创伤、无健康基准：触发 `v5-love-trapped-trauma-pack`。
- 引经据典、隐喻、知识谱系、规范性前提：触发 `v5-domain-translation-normative-source-pack`。
- 课程、咨询、AI 工具、认证、商业化：触发 `v5-toolization-accessibility-release-pack`。
- 高反身追踪、阶段 6、熵增、必须停止观察：触发 `v5-observation-reflexivity-release-pack`、`v5-state-coordinate-lifecycle-pack`。
- 用户要沉淀，而不是只要一次性答案。

### 追加 `crossframe-dialogue`

- 读者来信、编辑回信、短答复、咨询式回应、我该怎么看/怎么办。
- 用户明确要亲切、耐心、有意见但不长篇。

### 追加 `crossframe-teach`

- 教概念、讲给普通人、解释术语、做练习、误读纠偏。
- 用户问“这个概念到底什么意思”。

### 追加 `crossframe-essay`

- 写文章、长文、评论、随笔、思想文章、洞察文章、报刊答复体。
- 用户要求概念上升、引经据典、现代编辑同志口吻。
- suite 默认对任何 CrossFrame 内容任务都追加，并默认传入 `editorial-base` 声口要求；不要等用户再次说“请写成文章”。
- suite 默认成文必须同时传入 `full-visible-v5-longform` 输出档位；不要把任何未显式关闭文章层的内容任务压缩成短答。

### 追加 `crossframe-review`

- 任何正式交付、长文、公共议题、强判断、组织修复、案例沉淀、命题结论。
- 用户要求审查、打分、验收、是否合格。

### 追加连续联读包

- 文章、评论、思想文章：至少触发 `v5-seven-gates-diagnosis-pack` 与 `v5-domain-translation-normative-source-pack`。
- 开放断言、强判断、高责任：触发 `v5-open-assertion-proposition-pack`、`v5-strong-judgment-eight-pack`、`v5-evidence-downgrade-action-ceiling-pack`。
- 公共议题、平台治理、合规材料：触发 `v5-public-power-institution-pack`，并视情况触发 `v5-ai-process-artifact-boundary-pack`。
- 亲密关系、解释劳动、爱、照护、疗愈：触发 `v5-love-trapped-trauma-pack`、`v5-action-healing-transfer-pack`。
- 生命周期、递进、势场、自主解离、治理连续性、文明尺度：触发 `v5-state-coordinate-lifecycle-pack`、`v5-long-evolution-progression-field-pack`、`v5-governance-continuity-multicenter-pack`。
- 框架边界、专业替代、AI 合规剧场、概念武器化：触发 `v5-use-boundary-governance-pack`、`v5-concept-weaponization-dogma-pack`。

## 不读取规则

- 不要因为出现“公共”一词就读取全部公共协议；先判断是否涉及真实公共事实或制度责任。
- 不要因为文章需要漂亮就读取 `notebook`；只有需要外部文本、理论参照或读书比较时才读。
- 不要因为短答复要有温度就跳过 `dialogue`；但若用户没有明确要求“只要短答”，`dialogue` 后仍默认追加 `essay`。
- 不要把 `review` 输出给用户，除非用户要求评审报告或发现硬失败。
- 不要把所有 sibling skill 都列进“本次读取”，未读取的要写在“不读取”里。

## 工作流改写

用户已有部分产物时，可以跳过已完成环节，但必须声明来源：

- 用户给了完整诊断底稿：可从 `essay` 开始，但要做事实边界复核。
- 用户给了文章：先 `review`，若未明确“只要评审”，再默认进入 `essay` 做文章式综合。
- 用户给了证据材料：先 `public` 或 `casebook`，再决定是否 `essay`。
- 用户给了书摘：先 `notebook`，再决定是否 `essay` 或 `teach`。
