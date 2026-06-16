# 读取路由图

本文件决定一次 CrossFrame 调用应该读取哪些材料。默认先读最少必要内容；当概念承担判断作用时，再加载完整概念卡、必要的 v5 source module 局部和必要的连续联读包。

当前权威源为 `v5.0`。`v3.0` 与 `v2.0` 文件只作为历史基线；默认运行先读取 `runtime-read-policy.md`、本文件和 `continuity-closure-map.md`。`v5-source-spine.md`、`v5-section-digest-index.md`、`v5-coverage-map.md` 与 `v5-term-fidelity.md` 只在源锚点不足、高责任源审计、用户要求版本/原文核验或需要具体 V5-H 范围时定向读取相关局部。

## v5 source modules

- `v5-source-spine.md`：v5 原文标题顺序、段落范围、相邻关系、表格索引和默认连读包。
- `v5-section-digest-index.md`：逐标题节点研究摘要、不可误读边界和相邻联读提醒。
- `v5-coverage-map.md`：标题节点、连读包、协议、工作表和 skill 的覆盖关系。
- `v5-term-fidelity.md`：v5 术语保真表。
- `v5-material-selection-map.md`：从用户请求进入 v5 包、协议和模板的选择图。
- `continuity-closure-map.md`：运行时轻量闭包图，默认用于递归展开必须同读包。

## v5 连读包索引

| 连读包 | 中文名 | 触发场景 | 必须同读闭包 |
| --- | --- | --- | --- |
| `v5-use-boundary-governance-pack` | 使用边界与治理总闸包 | 用户要求 CrossFrame 直接定性、公开发布、替代专业判断、跨域迁移或把框架作为权威背书。 | `v5-diagnosis-admission-downgrade-exit-pack`, `v5-concept-weaponization-dogma-pack`, `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-core-concept-integrity-pack`, `v5-source-evidence-separation-pack`, `v5-anchor-dynamics-structure-process-pack` |
| `v5-diagnosis-admission-downgrade-exit-pack` | 诊断准入、降级与退出包 | 材料不足、风险紧急、用户要求快速判断、关系或组织没有正式复核条件。 | `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-source-evidence-separation-pack` |
| `v5-low-power-protection-pack` | 低权力主体保护包 | 亲密关系、家庭、小团队、平台治理、公共制度、投诉申诉、无法退出主体。 | `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-concept-weaponization-dogma-pack` | 概念武器化与教条化包 | 用户要求贴标签、定性人品、用概念替代证据或把术语直接写成结论。 | `v5-core-concept-integrity-pack`, `v5-use-boundary-governance-pack`, `v5-anchor-dynamics-structure-process-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-source-evidence-separation-pack` |
| `v5-cross-scale-context-translation-pack` | 跨尺度与语境转译包 | 问题涉及升维解释、跨域类比、制度化语言、技术治理或普通人表达。 | `v5-domain-translation-normative-source-pack`, `v5-use-boundary-governance-pack`, `v5-concept-weaponization-dogma-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-core-concept-integrity-pack`, `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-anchor-dynamics-structure-process-pack`, `v5-source-evidence-separation-pack` |
| `v5-seven-gates-diagnosis-pack` | 七闸诊断包 | 所有完整诊断、深度分析、高责任判断、公共制度、组织修复和文章底稿。 | `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-source-evidence-separation-pack` | 来源、证据与判断分离包 | 有报告、自评、聊天记录、媒体材料、AI 生成材料、申诉材料或不完整证据。 | `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-evidence-downgrade-action-ceiling-pack` | 证据降级与行动上限包 | 任何涉及名誉、资源、处分、组织处置、公共记忆、公开评论或关系退出的判断。 | 无 |
| `v5-observation-reflexivity-release-pack` | 观测反身性与收束包 | 对象会表演、反制、改证据、改边界，或用户要求持续追踪反应。 | `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-ai-process-artifact-boundary-pack` | AI 过程性产物边界包 | AI 报告、合规材料、机构自评、审计稿、流程图、自动生成证据或模型诊断。 | `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-concept-weaponization-dogma-pack`, `v5-core-concept-integrity-pack`, `v5-use-boundary-governance-pack`, `v5-anchor-dynamics-structure-process-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-seven-gates-diagnosis-pack` |
| `v5-strong-judgment-eight-pack` | 强判断八件套包 | 涉及资格、名誉、权利、资源、处分、公共记忆、公开点名或重大组织行动。 | `v5-open-assertion-proposition-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-low-power-protection-pack`, `v5-seven-gates-diagnosis-pack`, `v5-source-evidence-separation-pack` |
| `v5-open-assertion-proposition-pack` | 开放断言与命题验证包 | 证据不足但风险不能无视、用户要求判断、需要提出命题或预测。 | `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-core-concept-integrity-pack` | 核心概念完整性包 | 输出要使用承接、回流、锚点、结构负荷、修复副产品、责任链等高风险概念。 | `v5-anchor-dynamics-structure-process-pack` |
| `v5-anchor-dynamics-structure-process-pack` | 锚点、动力、结构与过程包 | 解释一个系统为什么能启动、卡住、转译失败、责任断裂或忙而无积累。 | `v5-core-concept-integrity-pack` |
| `v5-root-assumptions-meta-rules-pack` | 根假设与元规则包 | 用户问框架是否成立、概念是否自洽、理论后台、第一因、意义或抽象命题。 | `v5-domain-translation-normative-source-pack`, `v5-use-boundary-governance-pack`, `v5-concept-weaponization-dogma-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-core-concept-integrity-pack`, `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-anchor-dynamics-structure-process-pack`, `v5-source-evidence-separation-pack` |
| `v5-state-coordinate-lifecycle-pack` | 状态坐标与生命周期包 | 生命周期判断、阶段判断、发展阶段、成熟/衰退、长期演化或阶段 6。 | `v5-observation-reflexivity-release-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-long-evolution-progression-field-pack` | 长期演化、递进与势场包 | 战略推进、长期修复、忙但没有积累、系统停滞、组织演化、文明尺度压力测试。 | `v5-state-coordinate-lifecycle-pack`, `v5-governance-continuity-multicenter-pack`, `v5-observation-reflexivity-release-pack`, `v5-public-power-institution-pack`, `v5-responsibility-intervention-separation-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-low-power-protection-pack` |
| `v5-governance-continuity-multicenter-pack` | 治理连续性与多中心包 | 组织修复、制度治理、长期项目、公共承诺、代际承接或平台治理。 | `v5-public-power-institution-pack`, `v5-responsibility-intervention-separation-pack`, `v5-low-power-protection-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-action-healing-transfer-pack` | 行动、疗愈与转移包 | 用户要下一步、修复方案、疗愈、退出、关系/组织重建或低条件试探行动。 | `v5-responsibility-intervention-separation-pack`, `v5-low-power-protection-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-responsibility-intervention-separation-pack` | 责任链与干预边界分离包 | 组织复盘、公共评论、亲密关系、团队修复、问责和行动建议。 | `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-love-trapped-trauma-pack` | 爱、无法退出与复杂创伤包 | 亲密关系、家庭、照护、创伤性生存策略、无健康基准、爱被要求或道德化。 | `v5-low-power-protection-pack`, `v5-action-healing-transfer-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-responsibility-intervention-separation-pack` |
| `v5-public-power-institution-pack` | 公共权力与制度包 | 平台治理、政策、机构责任、公共争议、公共评论、申诉、合规和制度修复。 | `v5-low-power-protection-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack` |
| `v5-domain-translation-normative-source-pack` | 领域转译、规范前提与来源透明包 | 对外文章、读书互读、理论解释、跨学科转译、概念阐释和公共评论。 | `v5-use-boundary-governance-pack`, `v5-concept-weaponization-dogma-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-core-concept-integrity-pack`, `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-anchor-dynamics-structure-process-pack`, `v5-source-evidence-separation-pack` |
| `v5-media-platform-crisis-pack` | 媒体、平台与危机包 | 媒体事件、平台处罚、公共争议、危机公关、公开发文、舆论反转。 | `v5-public-power-institution-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-strong-judgment-eight-pack`, `v5-low-power-protection-pack`, `v5-source-evidence-separation-pack`, `v5-open-assertion-proposition-pack`, `v5-seven-gates-diagnosis-pack` |
| `v5-framework-self-diagnosis-falsification-pack` | 框架自诊、证伪与回滚包 | 用户要求评估框架、比较 3.0/5.0、检查输出是否执行框架或质疑框架有效性。 | `v5-root-assumptions-meta-rules-pack`, `v5-use-boundary-governance-pack`, `v5-domain-translation-normative-source-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-concept-weaponization-dogma-pack`, `v5-seven-gates-diagnosis-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-core-concept-integrity-pack`, `v5-source-evidence-separation-pack`, `v5-anchor-dynamics-structure-process-pack` |
| `v5-toolization-accessibility-release-pack` | 工具化、可及性与发布包 | 技能封装、工具化、公开发布、商业化、培训认证、自动化审查或大规模部署。 | `v5-use-boundary-governance-pack`, `v5-framework-self-diagnosis-falsification-pack`, `v5-low-power-protection-pack`, `v5-diagnosis-admission-downgrade-exit-pack`, `v5-concept-weaponization-dogma-pack`, `v5-root-assumptions-meta-rules-pack`, `v5-source-evidence-separation-pack`, `v5-evidence-downgrade-action-ceiling-pack`, `v5-seven-gates-diagnosis-pack`, `v5-core-concept-integrity-pack`, `v5-domain-translation-normative-source-pack`, `v5-anchor-dynamics-structure-process-pack` |

## 基础路由

| 用户请求 | 必读 | 连续联读包 |
| --- | --- | --- |
| 快速诊断 | protocols/diagnosis-protocol.md; worksheets/intake-worksheet.md; worksheets/seven-gates-worksheet.md | `v5-diagnosis-admission-downgrade-exit-pack`, `v5-seven-gates-diagnosis-pack` |
| 完整诊断 / 审计 / 深度分析 | protocols/diagnosis-protocol.md; references/runtime-read-policy.md; references/continuity-closure-map.md; 按需定向读取 v5 source module 局部 | `v5-seven-gates-diagnosis-pack`, `v5-source-evidence-separation-pack`, `v5-core-concept-integrity-pack` |
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

## 连续联读执行规则

- 只要上表的连续联读包不是空，默认先读 `references/continuity-closure-map.md` 展开闭包；需要包说明、源锚点或降档细节时，再读 `references/continuity-bundles.md` 和对应 `references/continuity-bundles/v5/<bundle-id>.md`。
- 连读包不是孤立按需检索。命中入口包后，必须递归展开该包的“必须同读闭包”；闭包中的包是硬依赖。
- 默认最多读取 3 个入口核心包 + 2 个相邻辅助包；这个上限不限制必须同读闭包。若闭包无法读完，必须降档或暂停强判断。
- 相邻候选包只在硬依赖闭包完成后按题材追加，不能替代必须同读包。
- 深度、审计、高责任、公共制度、亲密关系、长期演化、框架治理和文章输出场景，必须检查相邻章节；默认通过包文件、闭包图和已有 V5-H 锚点完成，只有锚点不足或需要源审计时，才定向读取 `v5-source-spine.md` 或 `v5-section-digest-index.md` 的相关局部。
- 若 v5 与历史 v3/v2 的理解冲突，以 v5 为准；只有用户要求版本追踪或回退审计时才读取历史文件。
- 输出前使用 `worksheets/source-continuity-check.md`：若发现只读了单张概念卡，且本文件要求联读，必须补读或降档。
- 输出前使用 `worksheets/source-anchor-integrity-check.md`：中心命题、机制候选、高风险概念和行动边界无法回指胶囊源锚点时，必须标为本文推断、表达转译或外部思想映射。
- 成文后如果正文后半段新增现实关系、低权力、创伤、控制、无法退出、长期单方承接、公共处置、责任链、强行动建议或概率排序判断，即使原任务是哲学、读书或概念解释，也要触发对应包的定向补读或显式降档。正文新增判断不能绕过入口路由。
- 下游 essay、专项 skill 和 review 默认复用 `v5-read-state-capsule`；只有胶囊缺少关键锚点、高责任审计或完整性检查失败时，才按具体锚点定向补读。
- 正常运行不得读取 `evals/`、`examples/`、完整成功案例或完整失败案例；这些只用于开发验证、压测和调试。
- `templates/reasoning-outline-output.md` 中的本次连续联读包只列包名，不展开完整工作表。

## 高风险概念触发

| 触发词或判断动作 | 必读概念卡或协议 | 默认 v5 包 |
| --- | --- | --- |
| 证据、材料、报告、弱信号、AI 合规、自评 | `concept-cards/evidence-cost.md` | `v5-source-evidence-separation-pack`, `v5-ai-process-artifact-boundary-pack` |
| 档位、能否强判断、能否处置、能否公开 | `concept-cards/judgment-grades.md` | `v5-evidence-downgrade-action-ceiling-pack`, `v5-strong-judgment-eight-pack` |
| 尺度升维、换层解释、大局、历史、制度 | `concept-cards/scale-transfer.md` | `v5-cross-scale-context-translation-pack` |
| 被诊断后变化、表演、反制、策略反应 | `concept-cards/reflexivity.md` | `v5-observation-reflexivity-release-pack` |
| 爱、牺牲、忍耐、照护、开放行动、承接、回流、创伤、控制、长期单方承接、无法安全表达 | `concept-cards/love-open-action.md`; `protocols/intimate-relationship-protocol.md` | `v5-love-trapped-trauma-pack`, `v5-low-power-protection-pack`, `v5-action-healing-transfer-pack` |
| 公共承诺、平台治理、制度、分配回流 | `protocols/public-institution-protocol.md` | `v5-public-power-institution-pack` |
| 阶段、生命周期、回退、混合阶段 | `protocols/lifecycle-diagnosis-protocol.md` | `v5-state-coordinate-lifecycle-pack` |
| 工具化、公开发布、AI 工具、认证 | `references/framework-ontology-protection.md` | `v5-toolization-accessibility-release-pack` |

## 输出路由

- 默认输出使用 `templates/reasoning-outline-output.md` 作为前置提纲。
- 快速诊断：`templates/quick-diagnosis-output.md`
- 完整诊断：`templates/full-diagnosis-output.md`
- 推演：`templates/inference-output.md`
- 开放断言：`templates/open-assertion-output.md`
- 概念解释：`templates/concept-explanation-output.md`
- 强判断：`templates/strong-judgment-output.md`
- 高反身性：`templates/high-reflexivity-output.md`
- 亲密关系轻量入口：`templates/intimate-relationship-output.md`
- 疗愈与转移：`templates/healing-transfer-output.md`
- 公共制度专项：`templates/public-institution-output.md`
- 框架边界：`templates/framework-boundary-output.md`
- 生命周期：`templates/lifecycle-output.md`
- 递进模式：`templates/progression-output.md`
- 势场与自主解离：`templates/field-dissociation-output.md`
- 治理连续性：`templates/governance-continuity-output.md`
- 超大规模压力测试：`templates/large-scale-stress-output.md`
- 对外表达翻译：`templates/expression-translation-output.md`

输出前必须读或内化 `templates/user-facing-language.md` 的表达闸。
