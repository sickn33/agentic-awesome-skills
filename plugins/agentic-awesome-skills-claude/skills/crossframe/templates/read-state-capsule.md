# v5-read-state-capsule

本模板用于 `crossframe` 核心层在完成 v5 source modules、入口连读包、必须同读闭包和相邻候选选择后，生成一次性的源结构摘要。它不是文章正文，也不是完整原文摘录；它是传给专项 skill、`crossframe-essay` 和 `crossframe-review` 的读态记录。

## 使用位置

- `crossframe-suite` 只传入 `selection_state` 和 `workflow_state`，不生成胶囊。
- `crossframe` 在读取 `runtime-read-policy.md`、`read-routing-map.md`、`continuity-closure-map.md` 和必要包文件后生成胶囊；只有源锚点不足、高责任源审计或用户要求原文核验时，才定向读取 v5 source modules 的相关局部。
- `crossframe-essay`、公共/组织/辩论/读书等专项 skill、`crossframe-review` 默认复用胶囊；不得各自重新发明源路由。
- 只有胶囊缺少关键锚点、高责任审计需要复核、或 `source-anchor-integrity-check.md` 失败时，才按具体 source module、章节锚点或连读包定向补读。

## 胶囊字段

```text
v5-read-state-capsule
- selection_state：
  - output_mode：
  - role：
  - topic_sensitivity：
  - voice_mode：
  - user_closed_article_layer：
  - user_closed_review：
- workflow_state：
- user_task：
- v5_source_modules：
  - source_module_id / V5-H 锚点：
  - 源范围：
  - 触发理由：
  - 必读相邻模块：
  - 本次使用的模块摘要：
  - 降档边界：
  - 若无稳定 V5-H 锚点：锚点缺失原因 + 降档决定
- v5_continuity_bundles：
  - 入口包 ID：
  - 触发理由：
  - 源锚点 / 章节范围：
  - 本次使用的源结构摘要：
  - 不可单读风险：
  - 降档规则：
- required_closure：
  - 入口包 -> 直接闭包：
  - 递归新增闭包：
  - 闭包是否读完：
  - 未读包：
  - 未读完时的降档决定：
- adjacent_candidates：
  - 已追加的相邻候选包：
  - 未追加但需注意的相邻约束：
- source_grounding：
  - 中心命题可用源锚点：
  - 机制候选可用源锚点：
  - 高风险概念可用源锚点：
  - 行动 / 边界可用源锚点：
  - 文章类型转译可用源锚点：
  - 写作技法不能越过的源边界：
  - 需要标为“本文推断 / 表达转译 / 外部思想映射”的内容：
- post_body_risk_sweep：
  - 正文高风险概念短摘：
  - 是否已在 source_grounding 登记：
  - 对应源锚点 / 连读包：
  - 处理：保留 / 补读 / 删除 / 降档 / 标为表达转译
- downstream_read_policy：
  - 默认只读本胶囊和本 skill 协议：
  - 禁止重复整块读取的材料：
  - 允许定向补读的条件：
- integrity_risks：
```

## 写法要求

- 胶囊必须先列 `v5_source_modules`，再列 `v5_continuity_bundles`、`required_closure` 和 `adjacent_candidates`。
- `v5_source_modules` 不能只写文件名。每个承担判断作用的模块必须尽量写出 `source_module_id / V5-H 锚点 / 源范围`；若本次无法定位稳定锚点，必须写明原因并降档，不能用“已读取源脊柱”替代锚点。
- 每个 source module、连读包和闭包包只写本次相关摘要，不复制大段原文、完整索引或完整包说明。
- `required_closure` 不能只写“已读完”。必须按“入口包 -> 直接闭包 -> 递归新增闭包 -> 未读包与降档理由”记录，供 review 复核闭包是否真的展开。
- 每条承担判断作用的中心命题、机制候选、高风险概念、行动边界、文章类型转译和写作技法使用，至少关联一个源锚点、章节范围或连读包。
- 不能从源锚点推出的内容，必须标成“本文推断”“表达转译”或“外部思想映射”。
- 成文后必须执行 `post_body_risk_sweep`：抽取正文中承担判断作用的高风险概念和行动建议，反查是否已在 `source_grounding` 登记。未登记时只能补读、删除、降档或标为表达转译。
- 胶囊应尽量短；普通文章任务控制在 800-1500 中文字，高责任审计可更长。
- 胶囊可在结构洞察底稿中摘要显示；正文不得出现 `v5-read-state-capsule` 标题或流程说明。

## 定向补读条件

- 胶囊缺少本次中心命题、机制候选或行动边界需要的源锚点。
- 高责任、公开判断、现实处置、AI/过程性产物、无法退出主体、生命周期判断或用户要求审计源结构。
- `source-anchor-integrity-check.md` 发现漏读前置包、只读单卡、闭包不完整或源锚点不足。
- `crossframe-review` 需要定位连续性保真失败。

补读时只打开相关锚点、章节摘要或包文件，不整块吞入全量索引。
