# Runtime Read Policy

本文件控制 CrossFrame 正常运行时的读取成本。默认目标是：保留 v5 连续性和审计能力，但不把完整源索引、eval、examples 或成功/失败长案例塞进每次上下文。

## 默认读取层级

正常 `/crossframe-suite`、`/crossframe`、`/crossframe-essay` 运行只读：

1. 当前入口 `SKILL.md`。
2. 本文件。
3. `references/read-routing-map.md`。
4. `references/continuity-closure-map.md`。
5. 被路由命中的 protocol / worksheet / template。
6. 被命中的 v5 连读包文件。
7. 若成文，`crossframe-essay` 的文章类型选择器、技法路由表和最多 5 张技法卡。

## 默认不读

以下文件默认不在正常产出路径读取：

- `evals/`
- `examples/`
- 完整成功案例和完整失败案例
- `v5-source-spine.md`
- `v5-section-digest-index.md`
- `v5-coverage-map.md`
- `v2-*`、`v3-*` 历史基线
- 全量 `writing-techniques/` 50 张卡

这些材料只在验证、调试、回退审计、源锚点失败、用户显式要求过程审计或需要原文/章节定位时读取。

## 大 source module 读取规则

`v5-source-spine.md` 和 `v5-section-digest-index.md` 是重资料，不全量打开。需要源锚点时：

1. 先在 `v5-material-selection-map.md`、`v5-term-fidelity.md` 或当前连读包中确定关键词、包名或 V5-H 范围。
2. 用搜索定位相关 V5-H 或标题。
3. 只读取命中的局部段落、相邻标题或必要范围。
4. 在 `v5-read-state-capsule` 写明 source module、V5-H/源范围和降档边界。

无法定位稳定锚点时，不补全大索引，不硬装权威；写“锚点缺失，降档”。

## eval / examples 使用规则

- `evals/` 只用于开发、压测、回归验证和 review-agent 审计，不进入用户正常答案。
- `examples/` 只用于风格对齐或调试，不作为默认上下文。
- 失败案例保留为短压力样例，不写成长篇历史叙述。
- 成功案例只保留最小合格片段；完整样稿放到 `work/` 或归档，不放入默认读取链。

## 输出层减负

后台可以执行完整检查，但前台只展示摘要：

- 胶囊摘要，不展开完整闭包表。
- 来源台账状态，不堆所有来源字段；高责任或用户要求时再展开。
- 技法落地摘要，不展示全部技法卡内容。
- 质量闸短摘要，不替代底稿和正文。

若触发高责任、公共发布、真实机构事故、名誉资源处分、AI 合规或用户要求审计过程，可展开相应表格。
