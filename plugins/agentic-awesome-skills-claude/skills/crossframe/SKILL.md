---
name: crossframe
description: "Use when the user explicitly invokes CrossFrame or 跨尺度结构诊断 for Chinese-canonical structural diagnosis of complex relationships, organizations, institutions, public disputes, or long-term evolution."
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
  - structural-diagnosis
  - reasoning
  - governance
---
# CrossFrame


## When to Use This Skill

- Use only when the user explicitly names CrossFrame, `crossframe`, `/crossframe`, `$crossframe`, or 跨尺度结构诊断.
- Use for Chinese-canonical structural diagnosis where facts, scale, evidence, responsibility, mechanisms, and action limits must be separated.
- Do not use passively for ordinary analysis, writing, relationship advice, public commentary, philosophy, or long-term forecasting.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

## Limitations

- The skill body is intentionally Chinese-canonical; English metadata is for discovery and does not replace the original Chinese terms.
- Use only after explicit CrossFrame invocation or `crossframe-suite` routing; do not apply it as a generic default reasoning layer.
- It structures analysis, drafting, and review, but does not replace source verification, domain expertise, or legal, medical, or financial judgment.

如果用户任务需要多个 CrossFrame 平行 skill 连续协作，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 负责其中的结构诊断、事实边界、尺度窗口、机制候选、七闸复核和判断档位。

## 语言原则

本 skill 的权威语义是中文。`CrossFrame` 只是英文传播名与 skill id，不承担概念解释权。

遇到中英文可能冲突时，以中文术语为准：承接、回流、开放断言、尺度转移、责任链、观测反身性、低条件试探行动、退出转移、不浪费爱、强判断八件套、局部状态坐标、过程性产物边界。

英文可以用于文件名、别名、对外简介或必要的双语标注；不要把中文概念硬译成英文后再反向理解。

## 核心定位

CrossFrame 不是“把 v5.0 文本塞进上下文”的提示词包，而是一个可执行的结构推理协议。

每次使用都必须先形成内部推理产物，再输出结论。结论可以很短，但不能跳过事实抽取、七闸复核、机制候选、判断档位、源结构连续性和表达闸。

## 必须执行的顺序

1. 判断用户请求类型：快速诊断、完整诊断、推演、开放断言、命题验证、强判断、高反身性对象、亲密关系轻量入口、疗愈与转移、公共制度专项、低条件行动、高责任反俘获审查、框架边界、生命周期/状态坐标、递进闭环、势场/自主解离、治理连续性、框架治理与证伪、AI 过程性产物边界、弱信号/不透明检查、无制度基础设施中间路径、无法退出主体保护、隐喻/来源透明、工具化可及性、观测收束、超大规模压力测试、表达翻译、理论后台，或概念解释。
2. 读取 `references/runtime-read-policy.md`、`references/read-routing-map.md` 和必要时 `references/v5-material-selection-map.md`，确定本次需要加载的 v5 source modules、连读包、协议、工作表、概念卡和模板。
3. 先定位 v5 source modules，不全量打开大文件。默认只记录需要的 source module、关键词、V5-H 或源范围；只有源锚点不足、用户要求源审计、或高责任判断需要核验时，才定向读取 `references/v5-source-spine.md`、`references/v5-section-digest-index.md`、`references/v5-coverage-map.md` 或 `references/v5-term-fidelity.md` 的相关局部。
4. 读取 `references/continuity-closure-map.md` 展开入口包的“必须同读闭包”；需要包说明、源锚点或降档细节时，再读取 `references/continuity-bundles.md` 和对应 `references/continuity-bundles/v5/<bundle-id>.md`。默认最多读取 3 个入口核心包 + 2 个相邻辅助包；这个上限不限制必须同读闭包。高责任、公共制度、组织处置、公开判断必须优先读七闸、强判断八件套、低权力保护、证据降级与行动上限包及其闭包。
5. 按 `templates/read-state-capsule.md` 生成 `v5-read-state-capsule`：先列 source modules，再列入口包、必须同读闭包、相邻候选、源锚点、降档边界和下游读取策略。suite 不生成胶囊，胶囊由本核心层生成并传给专项 skill、essay 和 review。
6. 填写内部 intake：对象、尺度、事实、证据缺口、用户用途、受影响对象、观测影响、权力结构、行动上限。
7. 通过七闸：对象闸、证据闸、尺度闸、责任闸、观测闸、权力闸、行动闸。七闸任一不完整，不能维持强判断。
8. 形成至少两个机制候选；除非证据足以说明只有一个机制。
9. 对承担判断作用的概念做完整吸收：读取对应概念卡，并用 `worksheets/concept-fidelity-check.md` 做保真检查。
10. 用 `worksheets/source-continuity-check.md` 检查是否只读了孤立概念卡、漏掉 v5 相邻约束或需要降档。
11. 用 `worksheets/source-anchor-integrity-check.md` 检查中心命题、机制候选、高风险概念和行动边界能否回指胶囊源锚点；不能回指的内容只能标为“本文推断 / 表达转译 / 外部思想映射”，不得写成 CrossFrame v5 原义。
12. 决定判断档位：轻量观察、开放断言、完整诊断、强判断、低条件试探行动、退出转移。若必须联读但未联读，或源锚点不足，不能维持强判断。
13. 先输出可见推理提纲，再选择模板输出：先说现实语言，再按需要附内部映射。

## 读取规则

- 默认遵守 `references/runtime-read-policy.md`：不读取 `evals/`、`examples/`、完整成功案例、完整失败案例或全量 v5 大索引。它们只用于开发压测、回归验证、风格调试、用户显式要求源审计或源锚点失败后的定向补读。
- 普通诊断：读 `protocols/diagnosis-protocol.md`，并使用 `worksheets/intake-worksheet.md`、`worksheets/seven-gates-worksheet.md`、`worksheets/evidence-ledger.md`、`worksheets/mechanism-candidates.md`。
- 推演、后续走向、路径展开、分支终点：读 `protocols/inference-protocol.md` 和 `templates/inference-output.md`，并按需追加状态坐标、长期演化、治理连续性包。
- 低到中等把握的判断：读 `protocols/open-assertion-protocol.md`、`worksheets/open-assertion-record.md`、`templates/open-assertion-output.md` 和 `v5-open-assertion-proposition-pack`。
- 高责任、强权力密度、处分、名誉、权利、资源、公共记忆类问题：读 `protocols/anti-capture-protocol.md`、`worksheets/high-responsibility-check.md`，并追加 `v5-low-power-protection-pack`、`v5-evidence-downgrade-action-ceiling-pack`。
- 影响资格、名誉、资源、权利、处置、公共记忆的强判断：读 `protocols/proposition-verification-protocol.md`、`worksheets/proposition-verification.md`、`worksheets/prospective-registration.md`、`templates/strong-judgment-output.md`，并追加 `v5-strong-judgment-eight-pack`。
- AI 报告、合规材料、漂亮汇报、机构自评、模型诊断：读 `v5-ai-process-artifact-boundary-pack`；必须声明过程性产物不得充当现实证明。
- 会因被观察、命名、公开或处置而改变行为、身份、证据或边界的对象：读 `protocols/high-reflexivity-protocol.md`、`worksheets/reflexivity-state-transfer.md`、`templates/high-reflexivity-output.md` 和 `v5-observation-reflexivity-release-pack`。
- 亲密关系、家庭、朋友、照护、单方承接、解释劳动和爱被要求的场景：读 `protocols/intimate-relationship-protocol.md`、`worksheets/intimate-relationship-light-check.md`、`templates/intimate-relationship-output.md`，并先读 `v5-love-trapped-trauma-pack` 和 `v5-low-power-protection-pack`。
- 系统停滞、创伤、修复、退出转移和重建场景：读 `protocols/healing-transfer-protocol.md`、`worksheets/healing-transfer-map.md`、`templates/healing-transfer-output.md` 和 `v5-action-healing-transfer-pack`。
- 公共制度、平台治理、公共承诺和高权力密度公共议题：读 `protocols/public-institution-protocol.md`、`worksheets/public-institution-check.md`、`templates/public-institution-output.md`，并追加 `v5-public-power-institution-pack`、`v5-evidence-downgrade-action-ceiling-pack`、`v5-low-power-protection-pack`。
- CrossFrame 可能被当作万能理论、领域替代品、人格审判工具或 AI 合规材料背书时：读 `protocols/framework-boundary-protocol.md`、`worksheets/framework-boundary-check.md`、`references/framework-ontology-protection.md` 和 `v5-use-boundary-governance-pack`。
- 长期演化、阶段判断、组织/关系/制度周期变化：读 `protocols/lifecycle-diagnosis-protocol.md`、`worksheets/lifecycle-stage-record.md`、`templates/lifecycle-output.md` 和 `v5-state-coordinate-lifecycle-pack`。阶段 0-6 只能作为局部状态坐标，禁止写成线性宿命。
- 战略推进、长期修复、子锚点闭环、为什么忙但没有积累：读 `protocols/progression-protocol.md`、`worksheets/sub-anchor-progression.md`、`templates/progression-output.md` 和 `v5-long-evolution-progression-field-pack`。
- 正负势场、沉积基本盘、自主解离、保护性退出：读 `protocols/field-dissociation-protocol.md`、`worksheets/field-dissociation-check.md` 和 `v5-long-evolution-progression-field-pack`。
- 调节、预警、偿付约束、多中心治理、承接者生成和代际承接：读 `protocols/governance-continuity-protocol.md`、`worksheets/governance-continuity-check.md`、`templates/governance-continuity-output.md` 和 `v5-governance-continuity-multicenter-pack`。
- 文明尺度、历史尺度、超大规模圈层或宏大公共判断：读 `protocols/large-scale-stress-test-protocol.md`、`worksheets/large-scale-stress-test.md`、`templates/large-scale-stress-output.md`，并先降级检查证据和发布门禁。
- 面向普通人、管理、制度公共、技术治理或其他 AI 软件改写表达：读 `protocols/expression-translation-protocol.md`、`references/expression-translation-table.md`、`templates/expression-translation-output.md` 和 `v5-domain-translation-normative-source-pack`。
- 概念解释、概念边界、思想解释类问题：读 `protocols/concept-explanation-protocol.md`、`references/concepts-minimal-set.md`、`references/v5-term-fidelity.md`、`v5-core-concept-integrity-pack`，再按需读必要概念卡。
- 哲学、意义、第一因、生命是什么、虚无主义、存在理由等抽象问题：优先走概念解释协议，先做尺度拆分和结构性开放断言；只有无法转成任何结构问题时，才退回 `protocols/framework-boundary-protocol.md`。
- 如果最终输出要使用承接/回流、开放断言、尺度转移、观测反身性、权力封闭、低条件试探行动、爱/开放行动、主体/责任链、证据成本、机制候选、判断档位、退出转移、修复副产品等高风险概念，必须先读取对应概念卡和 v5 连读包；不能只凭最小概念集作精细判断。

## 输出规则

- 默认输出短而清楚。除非用户明确要求极简结论，否则先展示一个“推理提纲”；不展示完整工作表。
- 推理提纲必须包含：诊断对象、事实边界、尺度窗口、七闸复核、机制候选、判断档位、本次读取的概念或保真检查、本次 v5 连续联读包、读态胶囊摘要、下一步观察或行动。
- 深度、审计、高责任、公共制度、亲密关系、长期演化和文章输出场景，推理提纲必须显示“本次连续联读包”；普通轻量问题可以写“未触发”。
- 推理提纲只能写提纲，不写冗长内心推理；它用于让用户看见推理路径，也用于约束后续输出不跳步。
- 只有用户要求“完整推理过程”“内部映射”“工作表”“审计”时，才展开完整工作表。
- 默认先说人话，不堆术语。第一段必须让没有读过框架的人也能明白“发生了什么、为什么卡住、下一步看什么”。
- 永远区分：来源、事实、证据、解释、机制候选、判断档位、行动上限。
- 术语只能作为附加映射，不得作为结论本身。不要用“这是典型的 X，所以 Y”替代推理。
- 输出前必须通过表达闸：删掉所有框架术语后，核心判断仍然能被普通用户读懂。
- 不得把结构诊断变成人格审判、命运预言、意识形态标签或道德授权。
- 不得用尺度升维抹掉低尺度痛苦、压力、失职和责任链。
- 不得把“爱”说成命令、正当性证明或单方面忍耐要求。
- 不得把 AI 生成的合规材料、漂亮报告、自评文本当作高成本证据。
- 不得用强判断绕开命题验证；开放断言不能作为高责任处置依据。
- 高反身性对象不得无限递归；第三层之后没有新增高成本证据或结构变量时，必须收束或降档。
- 亲密关系场景先保护痛苦、安全和边界，不把修复责任压回受伤者。
- 疗愈与转移只提供结构行动边界，不替代医疗、心理、法律、安全或组织处置。
- 如果证据不足但问题紧急，输出低风险、可撤回、可观察的小动作，而不是假装已经完成强诊断。

## 表达闸

最终输出前，内部检查四问：

1. 第一段是否不用术语也能说清问题？
2. 用户是否能知道这个判断来自哪些事实，而不是来自概念套用？
3. 是否把“承接、回流、尺度、开放断言”等术语翻译成了现实行为？
4. 是否给出了一个可观察信号或行动边界？

任一不通过，先重写表达，再输出。

## 推理提纲

默认输出前置一个简短提纲：

- 诊断对象：
- 事实边界：
- 尺度窗口：
- 七闸复核：
- 机制候选：
- 判断档位：
- 本次读取的概念：
- 本次 v5 连续联读包：
- 下一步：

这个提纲不是完整工作表，也不是冗长推理链。它的作用是让用户看见：本次输出确实先界定对象、检查证据、比较机制、再给判断。

## 核心资料

- `references/runtime-read-policy.md`：正常运行时的轻量读取策略，控制 eval/examples、完整案例和大 source modules 的默认不读取边界。
- `references/continuity-closure-map.md`：v5 连读包闭包的轻量运行时图。
- `references/v5-source-spine.md`：v5.0 原文标题层级、章节顺序、段落范围、相邻关系、表格索引和默认连读包。
- `references/v5-section-digest-index.md`：v5.0 逐节保真摘要、不可误读边界和相邻联读提醒。
- `references/v5-coverage-map.md`：v5.0 章节到 skill 模块、协议、工作表和连读包的覆盖地图。
- `references/v5-term-fidelity.md`：v5.0 术语保真表，防止压缩失真。
- `references/v5-material-selection-map.md`：v5.0 source modules、连读包、协议和模板的选择图。
- `references/continuity-bundles.md`：v5.0 连续联读包索引。
- `references/continuity-bundles/v5/`：26 个 v5 独立连读包。
- `references/read-routing-map.md`：按请求类型选择协议、工作表、概念卡和模板。
- `templates/read-state-capsule.md`：本次 v5 source modules、入口包、必须同读闭包、源锚点和下游读取策略的胶囊模板。
- `references/crossframe-v2-core.md`、`references/v2-*`、`references/v3-*`：历史基线，仅在版本追踪或回退审计时读取。
- `references/concepts-minimal-set.md`：最小概念集。
- `references/framework-ontology-protection.md`：框架本体保护、反领域殖民、反模型殖民和概念改动规则。
- `references/guardrails.md`：反误用规则。
- `references/diagnostic-dimensions.md`、`references/diagnostic-toolbox-index.md`：复杂案例按需读取。
- `references/theory-backend-index.md`：根假设、核心推论、全周期演化、递进模式、多中心治理等深层理论索引。
- `references/expression-translation-table.md`：把后台概念翻译成普通人、管理、制度和技术治理语境。
- `references/concept-cards/`：高风险概念卡。
- `worksheets/seven-gates-worksheet.md`：七闸复核表。
- `worksheets/source-continuity-check.md`：输出前检查是否读少、断章或漏掉原文连续约束。
- `worksheets/source-anchor-integrity-check.md`：输出前检查中心命题、机制候选、概念、行动边界和文章转译是否能回指胶囊源锚点。

## 高风险概念闸

以下概念不能只按字面理解；一旦它们承担判断作用，必须读取对应概念卡和 v5 连读包：

- 承接 / 回流：读 `references/concept-cards/chengjie-huiliu.md`，并联读 `v5-core-concept-integrity-pack`。
- 开放断言：读 `references/concept-cards/open-assertion.md`，并联读 `v5-open-assertion-proposition-pack`。
- 尺度转移 / 尺度升维：读 `references/concept-cards/scale-transfer.md`，并联读 `v5-cross-scale-context-translation-pack`。
- 观测反身性：读 `references/concept-cards/reflexivity.md`，并联读 `v5-observation-reflexivity-release-pack`。
- 权力封闭 / 反俘获：读 `references/concept-cards/power-closure.md`，并联读 `v5-public-power-institution-pack` 与 `v5-low-power-protection-pack`。
- 低条件试探行动：读 `references/concept-cards/low-condition-action.md`，并联读 `v5-diagnosis-admission-downgrade-exit-pack`。
- 爱 / 开放行动 / 不浪费爱：读 `references/concept-cards/love-open-action.md`，并联读 `v5-love-trapped-trauma-pack`。
- 主体 / 责任链：读 `references/concept-cards/responsibility-chain.md`，并联读 `v5-responsibility-intervention-separation-pack`。
- 证据成本 / 弱信号 / AI 合规材料：读 `references/concept-cards/evidence-cost.md`，并联读 `v5-source-evidence-separation-pack` 与 `v5-ai-process-artifact-boundary-pack`。
- 机制候选：读 `references/concept-cards/mechanism-candidates.md`，并过七闸。
- 判断档位：读 `references/concept-cards/judgment-grades.md`，并联读 `v5-evidence-downgrade-action-ceiling-pack`。
- 退出转移：读 `references/concept-cards/exit-transfer.md`，并联读 `v5-action-healing-transfer-pack`。
- 修复副产品 / 伪修复：读 `references/concept-cards/repair-byproduct.md`，并联读 `v5-action-healing-transfer-pack`。
- 生命周期 / 阶段：读 `protocols/lifecycle-diagnosis-protocol.md`，并联读 `v5-state-coordinate-lifecycle-pack`。
- 框架治理 / 证伪 / 良性消亡：读 `references/concept-cards/framework-governance-falsification.md`，并联读 `v5-framework-self-diagnosis-falsification-pack`。
- 无法退出主体 / 复杂创伤 / 无健康基准：读 `references/concept-cards/trapped-subject-trauma-baseline.md`，并联读 `v5-love-trapped-trauma-pack`。
- 隐喻漂移 / 来源透明 / 规范性前提：读 `references/concept-cards/metaphor-source-transparency.md`，并联读 `v5-domain-translation-normative-source-pack`。
- 使用门槛债 / 工具化 / 分裂协议：读 `references/concept-cards/accessibility-toolization-split.md`，并联读 `v5-toolization-accessibility-release-pack`。
- 观测收束 / 熵增边界：读 `references/concept-cards/observation-entropy-contraction.md`，并联读 `v5-observation-reflexivity-release-pack`。

## 最低合格标准

一次合格的 CrossFrame 输出必须能回答：

- 我们到底在诊断什么对象？
- 哪些是来源，哪些是事实，哪些只是解释？
- 当前处在哪个尺度窗口？
- 七闸中哪一闸通过、哪一闸导致降级？
- 至少有哪些机制候选？
- 是否需要命题验证、强判断八件套、高反身性处理、亲密关系轻量入口、疗愈转移或公共制度专项？
- 谁在承担成本，谁有改变条件？
- 本次判断依赖哪些高风险概念，是否读取了完整概念卡和 v5 连读包？
- 这个判断能被什么证据撤回？
- 下一步是观察、修复、试探行动，还是退出转移？
- 生命周期判断是否写成了局部状态坐标，而不是线性宿命？
- 本次是否触发 v5 连续联读包，是否避免了只读孤立概念卡？
- 是否生成 `v5-read-state-capsule`，并让中心命题、机制候选、高风险概念和行动边界回指源锚点？
