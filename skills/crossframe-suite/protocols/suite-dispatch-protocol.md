# Suite Dispatch Protocol

本协议把用户请求转成连续 skill 工作流。它只做调度，不替代专项判断。

## 0. 模式与角色判定

读取 `../references/output-mode-selector.md`，根据用户触发词自动判定本次的 `analysis_mode`（保守/客观/激进/批判）、`role`（学术专家/实践工匠/战略决策者/大众传播/批判反思者/未来探索者）和 `topic_sensitivity`（low/normal/vulnerable/high-stakes）。

若用户在本次对话中未使用任何模式或角色触发关键词，也没有给出 `2+1` 这类数字组合，AI 必须完整渲染 `../templates/mode-selection-dialog.md` 的 4 个输出模式和 6 个角色选项，并在此处停止等待用户回复后再继续；不得只写“请选择模式/角色”或省略默认推荐。默认值（客观 + 学术专家）仅在用户明确回复“默认”“直接开始”“随便”“都行”“不用选”等放弃选择的措辞时生效。

本步骤只选择输出模式和角色，不选择文章类型。文章类型只在确认最终进入 `crossframe-essay` 且文章层未关闭后处理，并且必须晚于结构洞察底稿、早于文章正文。

## 1. 判断任务主目标

先选一个主目标：

- `diagnose`：只要结构诊断、推演、开放断言或低条件行动。
- `essay`：要文章、评论、思想文章、长文、报刊答复体文章。
- `dialogue`：要短答复、编辑回信、咨询式回应。
- `casebook`：要把材料沉淀成案例。
- `public`：公共议题、制度、平台、政策、机构合规、公共承诺。
- `org`：团队、项目、组织修复、复盘改造、反馈写回。
- `teach`：解释 CrossFrame 概念、讲给普通人、出练习。
- `debate`：命题辩论、正反双方、隐藏前提、反驳。
- `notebook`：读书、理论、文章研究笔记。
- `review`：审查一个已有输出。

如果用户同时要求多个目标，确定一个最终交付物，再安排前置 skill。例如“分析公共议题并写文章”的最终交付物是文章，但前置需要 `public`。

只要用户通过 `crossframe-suite` 进入 CrossFrame 内容任务，默认最终交付物都定为 `essay`。如果任务还需要评审、案例库、组织修复、命题辩论、概念教学、读书研究或短答复，先完成对应专项产物，再进入 `crossframe-essay`。默认把 `output_mode` 设为 `full-visible-v5-longform`。`voice_mode` 不再固定为 `editorial-base`，而是由第 0 节判定的角色和 `topic_sensitivity` 决定。

只有用户明确要求“只要/不要文章/不要成文/短答/三句话/表格/清单/原始评审/原始案例库/原始备忘录/纯诊断/仅行动方案”时，才不要默认成文。此时评审报告、案例库、组织修复备忘录、反馈写回方案、命题辩论表、概念教学练习、来源台账、表格、清单、一句话结论、低条件行动方案和纯诊断保持原形态。

## 2. 先定基础 skill

除以下情况外，复杂任务都先读取 `../../crossframe/SKILL.md`：

- 用户只要求评审某段输出：先读 `../../crossframe-review/SKILL.md`。
- 用户只要求安装、解释 skill 触发方式或仓库维护：不进入诊断链。
- 用户只要求改写一句话、翻译或格式化：不使用 CrossFrame Suite。

读取 `crossframe` 后，必须带出最小内部产物：

- 对象
- 事实边界
- 尺度窗口
- 至少两个机制候选，或说明为何只有一个
- 判断档位
- 本次连续联读包；深度、审计、高责任、公共制度、亲密关系、长期演化和文章输出场景必须先从 `../../crossframe/references/continuity-closure-map.md` 中选择入口包并展开对应“必须同读闭包”；需要包说明或源锚点时再定向读取 `../../crossframe/references/continuity-bundles.md` 或具体包文件
- `v5-read-state-capsule`；由 `crossframe` 核心层生成，至少写明 source modules、入口包、必须同读闭包、相邻候选、源锚点和降档边界
- 需要追加的专项 skill

## 3. 加专项 skill

按任务信号追加，不要全量读取：

- 写成文章：追加 `../../crossframe-essay/SKILL.md`。
- 公共议题：追加 `../../crossframe-public/SKILL.md`。
- 组织修复：追加 `../../crossframe-org/SKILL.md`。
- 短答复/回信：追加 `../../crossframe-dialogue/SKILL.md`。
- 案例沉淀：追加 `../../crossframe-casebook/SKILL.md`。
- 概念教学：追加 `../../crossframe-teach/SKILL.md`。
- 命题论证：追加 `../../crossframe-debate/SKILL.md`。
- 读书研究：追加 `../../crossframe-notebook/SKILL.md`。
- 质量验收：追加 `../../crossframe-review/SKILL.md`。

## 4. 排序规则

默认顺序：

1. 结构事实层：`crossframe`
2. 场景专项层：`public` / `org` / `debate` / `notebook` / `casebook` / `teach` / `dialogue`
3. 源连续性层：确认是否已读取 `runtime-read-policy.md`、`continuity-closure-map.md` 和 `source-continuity-check.md`；只有源锚点不足、高责任源审计或用户要求源核验时，才定向读取 `continuity-bundles.md`、`v5-source-spine.md`、`v5-section-digest-index.md`、`v5-material-selection-map.md` 或 `v5-term-fidelity.md` 的相关局部
4. 读态胶囊层：`crossframe` 生成 `templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`
5. 源锚点层：用 `source-anchor-integrity-check.md` 确认中心命题、机制候选、高风险概念和行动边界能回指胶囊
6. 底稿层：`crossframe-essay` 先生成 `结构洞察底稿`
7. 文章类型层：在底稿之后展示文章类型选择器，用户选择或采用推荐项
8. 表达生成层：按文章类型读取写作技法，再生成 `文章正文`
9. 质量闸：`review`

suite 默认文章工作流必须按：`模式/角色选择器 -> suite 路由与专项拆解 -> v5-read-state-capsule -> 源锚点完整性检查 -> 结构洞察底稿 -> 文章类型选择器 -> 写作技法读取 -> 文章正文 -> 质量闸`。压缩写法可写为：`结构洞察底稿 -> 文章类型选择器 -> 写作技法读取 -> 文章正文 -> 质量闸`，但执行顺序不能颠倒。

例外：

- 只评审：`review` 单独启动。
- 已有完整诊断结果，用户只要成文：`essay -> review`，但需要在底稿中标明诊断来源。
- suite 默认：`crossframe -> needed sibling skills -> essay -> review`，默认输出 `full-visible-v5-longform`，也就是完整可见底稿 + 完整长文正文。
- 已有文章，用户只要评审：`review`，必要时读取 `essay` 规则。
- 公共评论必须在 `essay` 前完成 `public` 证据边界。
- 组织修复文章必须在 `essay` 前完成 `org` 责任/授权/回流判断。
- 读书后成文必须在 `essay` 前完成 `notebook` 的关联、不同、可吸收处和冲突处。
- 任何成文任务必须在 `essay` 前完成源结构连续性检查、生成 `v5-read-state-capsule` 并执行源锚点完整性检查；如果只读了孤立概念卡、闭包不完整或源锚点不足，先补读或在底稿中降档。

## 4.1 声口传递规则

只要 suite 没有被用户显式关闭文章层，就把 `voice_mode` 和 `topic_sensitivity` 一起传给 `crossframe-essay`：

- `neutral-analysis`：学术专家/批判反思者默认使用。允许清楚、平实、有正常温度；不启用现代编辑底色。
- `neutral-decisive`：实践工匠/战略决策者默认使用。可以给出优先级、步骤和止损条件。
- `editorial-reply`：大众传播或用户显式要求亲切/编辑口吻时，用于读者提问、关系困惑、组织困惑、怎么办/怎么看/为什么会这样。
- `editorial-commentary`：大众传播/未来探索者或用户显式要求时，用于公共评论、思想文章、制度评论、概念文章。

声口只改变前台表达，不改变事实边界、概念保真、连续联读包和判断档位。若未启用编辑底色的角色因为 `topic_sensitivity=vulnerable` 需要明显共情承接，或因为论证需要拆题/改良版选项，必须在底稿中声明原因和边界。`topic_sensitivity=high-stakes` 默认优先审计型底稿，不用文章温度覆盖判断责任。

## 4.2 输出档位规则

只要 suite 没有被用户显式关闭文章层，就把 `output_mode=full-visible-v5-longform` 传给 `crossframe-essay`。

该档位要求：

- 底稿完整可见，不把 v5.0 源连续性、联读包、概念风险和反向条件藏掉。
- 正文默认 1200-2200 中文字，写成文章而不是项目符号答复。
- 哲学概念、思想文章、关系/组织/公共评论默认必须有标题、铺陈、概念上升、现实回落、边界段和余味结尾。
- 禁止用“如果只要一句话”“换成人话说”作为正文开篇来替代完整文章。

只有用户明确要短答、只要一句话、三句话、表格、备忘录、清单、行动方案、纯诊断、学术摘要或不要文章时，才把 `output_mode` 改为对应专项交付物。

## 4.3 文章类型选择规则

文章类型只在结构洞察底稿之后、文章正文之前确认，不参与 suite 开头的模式/角色选择，也不参与前置问题拆解。

只要 suite 没有被用户显式关闭文章层，就把 `article_type` 状态传给 `crossframe-essay`：

- 用户显式指定文章类型：直接采用，不展示文章类型选择器。
- 用户未指定文章类型：先让 `crossframe-essay` 生成结构洞察底稿，并在底稿中写出“文章类型推荐与待选择”；然后完整渲染 `../../crossframe-essay/templates/article-type-selection-dialog.md` 的九个选项，填入推荐项和推荐理由，并停止等待用户回复；不得只写“已展示文章类型选择器（1-9）”。
- 用户回复“默认/自动/都行”：采用底稿和选择器中的推荐项；推荐项由 suite 路由、底稿结构和题材共同决定，无法判断时推荐 `9. 中性分析长文`。
- 用户明确要求短答、只要诊断、表格、清单、备忘录、不要文章：不展示文章类型选择器。

文章类型只决定成文形态和写作技法读取，不改变事实边界、判断档位、连续联读包、证据责任、查源规则和质量闸。

## 5. 质量闸

默认最后加入 `crossframe-review`，但有两档：

- 完整评审：文章、公共议题、组织修复、案例库、辩论结论、读书研究、强判断。
- 轻量自检：短答复、教学解释、低风险概念说明。

质量闸不接管最终输出。它审查已经形成的底稿和正文，不替代 `crossframe-essay` 生成可见交付。

默认 suite 成文链路的处理规则：

- 若质量闸判为 A/B 或只有可直接修正的小问题，先修正底稿/正文，再输出 `full-visible-v5-longform` 的可见交付；不要只输出质量闸。
- 若质量闸发现硬失败，返回上游补底稿、补证据边界或重写正文；修好后再输出底稿和正文。除非用户只要评审，否则不要用单独评审报告替代修复后的文章。
- 只有用户明确要求“完整评审报告/只要评审/不要文章”，或质量闸硬失败导致本轮必须阻断发布时，完整评审报告才作为主输出。
- 轻量自检只需要在内部检查，不必打扰用户，除非发现硬失败。

最终可见交付在文章层开启时必须至少包含：

```text
# 结构洞察底稿

# 文章正文
```

可选追加极短质量闸摘要，例如“质量闸：通过 / 条件通过，已修正 X”。不得把 `templates/review-report.md` 作为 suite 默认成文链路的唯一最终输出。

## 6. 输出收束

调度提纲必须短。它的目的不是展示复杂，而是让用户看见 AI 为什么按这个顺序工作。

如果用户要求“只给最终结果”，可以压缩为一行：

```text
本次按 crossframe -> crossframe-public -> crossframe-essay -> crossframe-review 处理。
```

然后直接输出结果。若文章层开启，结果必须是完整可见底稿 + 完整文章正文；质量闸只能作为内部门禁或正文后的短摘要，不能成为唯一输出。
