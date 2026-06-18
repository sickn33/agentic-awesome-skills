> ⚠️ **v3.1**: 本文件已被 `references/integrity-check.md` 取代，保留作为历史详参。
> 日常使用请优先读取 integrity-check.md。本文件在以下场景仍可查阅：
> - 需要追踪 v3.0 到 v3.1 的概念演化
> - 需要完整的源结构脊柱对照
> - 需要逐节摘要的详细版本
> - 需要详细的连续性检查或概念保真检查工作表示例

# 源结构连续性检查表

本工作表用于输出前自检：本次是否只读了孤立概念卡，是否漏掉 v5.0 原文连续板块，是否需要补读或降档。它是后台工作表，默认不完整展示给用户；推理提纲只需显示触发了哪些连续联读包。

v5.0 是当前权威源；v3.0 与 v2.0 文件只作为历史基线和演化对照。若判断涉及框架治理、证伪、弱信号、AI 过程性产物、无法退出、隐喻漂移、工具化、开放断言退场、强判断八件套、局部状态坐标，必须优先读取 v5.0 运行时路由、闭包图和相关包。大 source module 只在需要具体源锚点时定向读取局部。

## 1. 本次依赖的 v5.0 连续板块

| 项目 | 填写 |
| --- | --- |
| 用户任务类型 | 诊断 / 推演 / 开放断言 / 强判断 / 亲密关系 / 公共制度 / 长期演化 / 文章 / 其它 |
| 本次核心判断依赖的源章节 | 写 `v5-source-spine.md` 中的 ID 或章节名；需要历史对照时再写 v3/v2 ID |
| 本次触发的入口联读包 | 从 `continuity-closure-map.md` 选择；需要语义说明时再读 `continuity-bundles.md` 与 `continuity-bundles/v5/` |
| 本次必须同读闭包 | 写出入口包递归展开后的硬依赖包 |
| 本次相邻候选包 | 只在闭包读完后按题材追加 |
| v5-read-state-capsule | 是否已生成；若未生成，先按 `templates/read-state-capsule.md` 补齐 |
| 是否需要定向读取 `v5-source-spine.md` 或 `v5-section-digest-index.md` | 不需要 / 已定向读取 V5-H 或标题局部 / 需要但未读并已降档 |
| 是否触发 v5.0 保护模块 | 七闸 / 强判断八件套 / 低权力主体保护 / AI 过程性产物 / 证据降级 / 状态坐标 / 框架证伪 / 工具化可及性 |

## 2. 孤立概念风险

| 高风险概念 | 是否只读了单卡 | 必须联读包 | 处理 |
| --- | --- | --- | --- |
| 承接 / 回流 / 核心概念 |  | `v5-core-concept-integrity-pack` + `v5-anchor-dynamics-structure-process-pack` | 补读 / 降档 |
| 开放断言 / 命题验证 |  | `v5-open-assertion-proposition-pack` + `v5-evidence-downgrade-action-ceiling-pack` | 补读 / 降档 |
| 强判断 / 公开发布 |  | `v5-strong-judgment-eight-pack` + `v5-low-power-protection-pack` | 补读 / 降档 |
| 尺度转移 / 语境转译 |  | `v5-cross-scale-context-translation-pack` | 补读 / 降档 |
| 爱 / 无法退出 / 复杂创伤 |  | `v5-love-trapped-trauma-pack` + `v5-low-power-protection-pack` | 补读 / 降档 |
| 权力封闭 / 反俘获 / 公共制度 |  | `v5-public-power-institution-pack` + `v5-evidence-downgrade-action-ceiling-pack` | 补读 / 降档 |
| 生命周期 / 阶段 / 状态坐标 |  | `v5-state-coordinate-lifecycle-pack` | 补读 / 降档 |
| 递进 / 势场 / 长期演化 |  | `v5-long-evolution-progression-field-pack` + `v5-governance-continuity-multicenter-pack` | 补读 / 降档 |
| AI 诊断 / 合规材料 |  | `v5-ai-process-artifact-boundary-pack` + `v5-source-evidence-separation-pack` | 补读 / 降档 |
| 弱信号 / 不透明 / 缺席 |  | `v5-low-power-protection-pack` + `v5-source-evidence-separation-pack` | 补读 / 降档 |
| 隐喻 / 来源透明 / 规范性前提 |  | `v5-domain-translation-normative-source-pack` | 补读 / 降档 |
| 框架证伪 / 良性消亡 |  | `v5-framework-self-diagnosis-falsification-pack` | 补读 / 降档 |
| 工具化 / 商业化 / 可及性 |  | `v5-toolization-accessibility-release-pack` | 补读 / 降档 |

## 3. 相邻章节约束

回答以下问题：

1. 本次判断是否依赖某个源章节的上下文，而不只是一个概念名？
2. 该章节在包文件、闭包图或已定位的 `v5-source-spine.md` 局部中前后相邻的章节是什么？
3. 如果只读当前章节，会漏掉哪些约束：证据要求、责任边界、降档条件、反俘获、低权力保护、表达闸、不可前台化？
4. 是否需要定向补读 `v5-section-digest-index.md` 中的相邻摘要？
5. 若本次判断依赖历史基线，v5.0 是否已经新增了更严格的保护条件？

## 4. 降档与补读决定

| 判断 | 条件 |
| --- | --- |
| 可以维持当前档位 | 已读取对应联读包，且没有关键相邻约束缺口 |
| 降为开放断言 | 证据不足或必须同读闭包不完整，但仍有明确判断靶点 |
| 降为轻量观察 | 只有局部概念或材料，不能形成机制竞争 |
| 改为低条件行动 | 证据不足但风险紧急，只能做低风险、可撤回动作 |
| 暂停强判断 | 影响权利、名誉、资源、处罚、公共记忆，但未完成强判断八件套 |
| 退场或转接 | 开放断言被权力捕获，或框架自身在此场景中需要降级、转接、退场 |

完成本表后继续执行 `source-anchor-integrity-check.md`：本表确认“读了哪些连续材料”，源锚点表确认“最终判断能否回指这些材料”。

## 5. 推理提纲显示

最终推理提纲中只显示短行：

```text
- 本次 v5 连续联读包：v5-seven-gates-diagnosis-pack / v5-source-evidence-separation-pack / v5-evidence-downgrade-action-ceiling-pack
```

不要把本工作表完整贴给普通用户，除非用户要求审计或完整工作表。
