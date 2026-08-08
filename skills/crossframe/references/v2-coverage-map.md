# v2.0 覆盖地图

本文件用于回答“CrossFrame 相较 v2.0 是否还有遗漏”。它不替代 v2.0 原文，而是记录每个重要模块在 skill 中的承接位置。

章节级覆盖现在以三份文件共同维护：

- `v2-source-spine.md`：从 DOCX 的 Word 标题层级生成，记录 258 个源章节节点、相邻关系、联读包和承接状态。
- `v2-section-digest-index.md`：逐节保真摘要索引，记录每节的用途摘要、不可误读边界和相邻联读提醒。
- `continuity-bundles.md`：规定哪些原文板块不能只读单张概念卡，必须作为连续板块联读。

因此，本文件负责“模块级覆盖判断”；逐节状态以 `v2-source-spine.md` 为准。

## 覆盖状态

- 已协议化：有 protocol、worksheet 或 template，可直接进入推理流程。
- 已概念卡化：有完整概念边界、误用、证据要求和修复动作，按需读取。
- 已索引化：保留触发条件和判断边界，只在深层理论或教学场景读取。
- 不前台化：保留后台约束，不作为普通用户输出术语。
- 已联读约束：该章节或概念已进入 `continuity-bundles.md`，触发时必须同读相邻板块，不能孤立使用。
- 源结构节点：目录、章节骨架或过渡节点，用于保持 2.0 原文顺序，不单独承担判断。

## 章节映射

| v2.0 模块 | CrossFrame 承接位置 | 状态 | 使用边界 |
| --- | --- | --- | --- |
| 框架定位、解释对象、轻量流程 | `SKILL.md`、`crossframe-v2-core.md`、`diagnosis-protocol.md` | 已协议化 | 所有诊断默认启用 |
| 强判断 10 问、开放断言 | `open-assertion-protocol.md`、`proposition-verification-protocol.md`、`judgment-grades.md` | 已协议化 | 影响权利、名誉、资源时必须升级到命题验证 |
| 十二条操作性准则、模块化入口 | `guardrails.md`、`read-routing-map.md`、`v2-term-fidelity.md` | 已协议化 | 输出前必须通过保真和表达检查 |
| 框架本体保护、反领域殖民、反模型殖民 | `framework-ontology-protection.md`、`framework-boundary-protocol.md`、`framework-boundary-check.md` | 已协议化 | 当 CrossFrame 被当成万能理论、领域替代品或审判工具时启用 |
| 盲区声明、超大规模圈层盲区 | `large-scale-stress-test-protocol.md`、`large-scale-stress-test.md` | 已协议化 | 文明尺度、历史尺度、跨制度长期判断时启用 |
| 概念层级与改动规则 | `framework-ontology-protection.md`、`v2-term-fidelity.md` | 已概念卡化 | 不得随意改名、合并或英文化反推中文含义 |
| 锚点组：跨域互操作、多层锚结构、重锚定 | `concept-cards/anchor-group.md`、`scale-transfer-gate.md` | 已概念卡化 | 当判断依赖锚点、保护变量、尺度升维或跨域迁移时读取 |
| 动力组：启动-转译-让渡职责、支撑通道、条件场、环境势场 | `concept-cards/dynamics-group.md` | 已概念卡化 | 当问题涉及行动启动、职责转移、资源通道和外部压力时读取 |
| 结构组：行动承接、中层耗竭、反武器化、跨圈层链 | `concept-cards/structure-process-group.md`、`diagnostic-toolbox-index.md` | 已概念卡化 | 组织、制度、平台、跨圈层问题按需读取 |
| 过程组：结构负荷、维护债、修复余量 | `concept-cards/structure-process-group.md`、`healing-transfer-protocol.md` | 已概念卡化 | 系统疲惫、长期维护、修复窗口判断时读取 |
| 根假设 A1-A9、核心推论 | `theory-backend-index.md` | 已索引化 | 只在深层理论、长期演化、制度生成或教学场景读取 |
| 全周期演化过程 | `lifecycle-diagnosis-protocol.md`、`lifecycle-stage-record.md`、`lifecycle-output.md` | 已协议化 | 阶段判断必须写混合信号、回退条件和撤回条件 |
| 递进模式、子锚点闭环 | `progression-protocol.md`、`sub-anchor-progression.md`、`progression-output.md` | 已协议化 | 判断战略推进、修复积累、项目演化时启用 |
| 双向势场管理、自主解离 | `field-management-and-dissociation.md`、`field-dissociation-protocol.md`、`field-dissociation-check.md` | 已协议化 | 当对象出现正负锚点场、沉积基本盘或保护性解离时启用 |
| 调节、预警与偿付约束 | `governance-continuity-protocol.md`、`governance-continuity-check.md` | 已协议化 | 长期公共承诺、治理系统、组织制度问题启用 |
| 多中心治理与承接者生成 | `governance-continuity-protocol.md`、`theory-backend-index.md` | 已协议化 | 单中心过载、代际承接、制度持续性问题启用 |
| 输出扩展与压力测试 | `large-scale-stress-test-protocol.md`、`crossframe-smoke-tests.md` | 已协议化 | 高责任、公共、文明尺度或用户要求审计时启用 |
| 对外表达与语境翻译 | `expression-translation-protocol.md`、`expression-translation-table.md`、`user-facing-language.md` | 已协议化 | 面向普通读者、管理语境、制度语境或跨平台适配时启用 |

## 章节级覆盖入口

| 覆盖层 | 文件 | 作用 | 维护要求 |
| --- | --- | --- | --- |
| 源结构脊柱 | `v2-source-spine.md` | 记录 2.0 DOCX 的标题顺序、相邻章节、联读包和承接状态 | DOCX 标题变化时重新生成 |
| 逐节保真摘要 | `v2-section-digest-index.md` | 记录每节核心用途、不可误读边界和相邻联读提醒 | 新增章节必须补摘要和边界 |
| 连续联读规则 | `continuity-bundles.md` | 规定哪些概念/章节不能单独读取 | 新增高风险概念必须归入至少一个联读包 |
| 输出前检查 | `worksheets/source-continuity-check.md` | 检查是否只读孤立概念卡、是否需要补读或降档 | 深度、审计、高责任、公共制度、亲密关系、长期演化和文章场景必须启用 |

## 判定结论

当前 CrossFrame 的补全标准不是“复制 v2.0 全文”，而是让 v2.0 每个重要模块都有可追踪入口：

- 普通使用走轻流程。
- 高风险概念走概念卡和保真检查。
- 涉及连续板块的高风险概念走联读包和源结构连续性检查。
- 深水区问题走专项 protocol 与 worksheet。
- 理论后台默认不前台化。

如果未来新增 v2.0 概念，必须先更新 `v2-source-spine.md`、`v2-section-digest-index.md` 和本覆盖地图，再决定它进入 protocol、worksheet、concept card、index、guardrail 还是 continuity bundle。
