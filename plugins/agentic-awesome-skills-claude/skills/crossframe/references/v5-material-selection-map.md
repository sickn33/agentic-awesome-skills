# CrossFrame v5 Material Selection Map

本文件规定一次 CrossFrame 调用怎样从 v5 source modules 进入连读包、协议和输出模板。

## 默认顺序

1. 读 `references/runtime-read-policy.md` 和 `references/read-routing-map.md` 确认用户问题落在哪类 v5 source modules、协议和连读包。
2. 读 `references/continuity-closure-map.md`，先命中入口包，再展开“必须同读包”的闭包，最后才选择相邻候选包。
3. 读取入口包和必要闭包包对应的 `references/continuity-bundles/v5/<bundle-id>.md`；需要包索引说明时再读 `references/continuity-bundles.md`。
4. 只有源锚点不足、高责任源审计、用户要求原文核验或需要 V5-H 范围时，才定向读取 `references/v5-source-spine.md`、`references/v5-section-digest-index.md`、`references/v5-coverage-map.md` 或 `references/v5-term-fidelity.md` 的相关局部。
5. 生成 `templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，把 source modules、入口包、必须同读闭包、相邻候选和降档边界交给下游。
6. 进入 `references/read-routing-map.md` 指定的 protocol / worksheet / concept card / template。
7. 输出前用 `worksheets/seven-gates-worksheet.md`、`worksheets/source-continuity-check.md` 与 `worksheets/source-anchor-integrity-check.md` 降档检查。

## 闭包规则

- 连读包不是按需孤立检索；命中一个入口包后，必须递归展开其“必须同读包”。
- `3 个核心包 + 2 个辅助包` 只限制入口包和相邻候选包选择，不限制必须同读闭包。
- 如果上下文不足以读取闭包中的硬依赖，不得跳过依赖包维持原判断，只能降档、暂停强判断或改为待补读。
- 胶囊不是额外正文；它只记录本次读过什么、源锚点在哪里、哪些内容必须降档或标为本文推断。

## 场景路由

| 场景 | 必读材料 | 默认连读包 |
| --- | --- | --- |
| 快速诊断 | protocols/diagnosis-protocol.md; worksheets/intake-worksheet.md; worksheets/seven-gates-worksheet.md | `v5-diagnosis-admission-downgrade-exit-pack`, `v5-seven-gates-diagnosis-pack` |
| 完整诊断 / 审计 / 深度分析 | protocols/diagnosis-protocol.md; references/runtime-read-policy.md; references/continuity-closure-map.md; 必要时定向读取 v5 source module 局部 | `v5-seven-gates-diagnosis-pack`, `v5-source-evidence-separation-pack`, `v5-core-concept-integrity-pack` |
| 开放断言 / 命题验证 | protocols/open-assertion-protocol.md; protocols/proposition-verification-protocol.md | `v5-open-assertion-proposition-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| 公开强判断 / 资格名誉资源权利 | protocols/proposition-verification-protocol.md; protocols/anti-capture-protocol.md | `v5-strong-judgment-eight-pack`, `v5-low-power-protection-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| AI 报告 / 合规材料 / 自评 | references/concept-cards/malicious-compliance-ai-validation.md; references/concept-cards/evidence-cost.md | `v5-ai-process-artifact-boundary-pack`, `v5-source-evidence-separation-pack` |
| 生命周期 / 阶段判断 / 长期演化 | protocols/lifecycle-diagnosis-protocol.md; protocols/progression-protocol.md | `v5-state-coordinate-lifecycle-pack`, `v5-long-evolution-progression-field-pack` |
| 组织复盘 / 修复 | protocols/governance-continuity-protocol.md; protocols/healing-transfer-protocol.md | `v5-governance-continuity-multicenter-pack`, `v5-responsibility-intervention-separation-pack`, `v5-action-healing-transfer-pack` |
| 公共制度 / 平台治理 / 公共评论 | protocols/public-institution-protocol.md; protocols/anti-capture-protocol.md | `v5-public-power-institution-pack`, `v5-media-platform-crisis-pack`, `v5-low-power-protection-pack` |
| 亲密关系 / 无法退出 / 创伤 | protocols/intimate-relationship-protocol.md; protocols/healing-transfer-protocol.md | `v5-love-trapped-trauma-pack`, `v5-low-power-protection-pack`, `v5-action-healing-transfer-pack` |
| 文章 / 评论 / 可读输出 | ../crossframe-essay/SKILL.md; templates/user-facing-language.md | `v5-domain-translation-normative-source-pack`, `v5-seven-gates-diagnosis-pack` |
| 框架自诊 / 证伪 / 版本治理 | protocols/framework-boundary-protocol.md; references/framework-ontology-protection.md | `v5-framework-self-diagnosis-falsification-pack`, `v5-root-assumptions-meta-rules-pack` |
| 工具化 / 公开发布 / 技能封装 | references/framework-ontology-protection.md; worksheets/source-continuity-check.md | `v5-toolization-accessibility-release-pack`, `v5-use-boundary-governance-pack` |

## 强制追加规则

- 高责任文章、公共评论、组织处置、公开判断：追加 `v5-seven-gates-diagnosis-pack`、`v5-strong-judgment-eight-pack`、`v5-low-power-protection-pack`、`v5-evidence-downgrade-action-ceiling-pack`。
- AI 报告、合规材料、机构自评：追加 `v5-ai-process-artifact-boundary-pack`，并声明过程性产物不能证明现实已经被验证。
- 生命周期判断：追加 `v5-state-coordinate-lifecycle-pack`；必须写对象、层级、时间窗口、反向条件、暂停条件、撤回路径。
- 亲密关系、无法退出、复杂创伤：追加 `v5-love-trapped-trauma-pack` 与 `v5-low-power-protection-pack`，先保护安全和退出空间。
- 任何只读单张概念卡就要承担结论的情况：必须回到 `v5-core-concept-integrity-pack` 和相邻包。
