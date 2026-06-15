---
name: crossframe-essay
description: "Use when explicit CrossFrame work needs a Chinese critical insight essay, commentary, concept essay, public piece, or structure-to-article draft after diagnosis."
category: content
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
  - essay
  - writing
  - commentary
---
# CrossFrame Essay


## When to Use This Skill

- Use only after explicit CrossFrame Essay invocation or after `crossframe-suite` routes a CrossFrame task into article output.
- Use for Chinese critical insight essays, public commentary, concept essays, long-form reader replies, and structure-to-article drafting.
- Do not use as a generic writing skill outside explicit CrossFrame context.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

如果用户任务需要先诊断、再进入公共/组织/辩论/读书等专项判断，最后才成文，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责文章底稿与正文生成。

## 语言原则

中文为权威语义。`CrossFrame Essay` 只是写作入口和 skill id，不承担概念解释权；英文只用于文件名、接口、必要双语标注或对外传播名。遇到中英文理解冲突时，以中文术语、中文判断和普通中文读者可理解的表达为准。

CrossFrame Essay 是 `crossframe` 的平行写作 skill，不替代 `crossframe`。它把 CrossFrame 的结构诊断、概念保真、尺度拆分和证据边界，转成面向普通中文读者的批判性洞察文章；当主题需要更深表达时，再把结构判断提升为上位概念、思想参照和经典互文。自动成文默认使用 `full-visible-v5-longform` 输出档位：完整可见底稿 + 完整长文正文。声口由 `crossframe-suite` 传入的 `voice_mode`、角色和 `topic_sensitivity` 决定；用户显式要求亲切/编辑口吻时启用现代编辑底色，显式要求中性报告、备忘录、表格、纯诊断或学术摘要时关闭文章声口。

核心原则：先形成结构洞察底稿，再写文章正文。不要跳过推理直接成文。

长文原则：底稿不是正文的替代品。输出了完整可见底稿之后，仍必须写完整文章正文；凡来自 `crossframe-suite` 且未显式关闭文章层的任务，一律按完整文章处理，不压缩成摘要、短答或项目符号说明。

## 必须执行的顺序

1. 判断写作模式：
   - 自动成文：一次性输出 `结构洞察底稿` 和 `文章正文`，默认 `output_mode=full-visible-v5-longform`。
   - 互动打磨：给候选开头、中心命题和文章骨架，再逐段推进。
2. 读取 `../crossframe/SKILL.md`。
3. 读取 `../crossframe/references/runtime-read-policy.md` 和 `../crossframe/references/read-routing-map.md`，把主题路由到相应 CrossFrame protocol。
4. 读取 `../crossframe/references/continuity-closure-map.md`，至少确认 `v5-seven-gates-diagnosis-pack` 与 `v5-domain-translation-normative-source-pack`，并展开它们的必须同读闭包；公共、亲密、长期演化、AI 材料或高责任主题追加对应 v5 联读包及其闭包。需要包说明时再定向读取 `../crossframe/references/continuity-bundles.md` 或具体包文件。
5. 用 `../crossframe/worksheets/source-continuity-check.md` 检查是否只读了孤立概念卡；深度文章只在源锚点不足、用户要求源审计或高责任核验时，定向读取 `../crossframe/references/v5-source-spine.md`、`../crossframe/references/v5-section-digest-index.md`、`../crossframe/references/v5-material-selection-map.md` 或 `../crossframe/references/v5-term-fidelity.md` 的相关局部。
6. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`；若上游未生成，回到 `../crossframe/SKILL.md` 补齐，不在 essay 内重新发明源路由。
7. 用 `../crossframe/worksheets/source-anchor-integrity-check.md` 检查文章中心命题、机制候选、高风险概念、行动边界和文章转译是否能回指胶囊源锚点；不能回指的内容必须标为“本文推断 / 表达转译 / 外部思想映射”。
8. 读取 `references/evidence-and-search-rules.md` 和 `../crossframe/references/source-ledger-workflow.md`，决定本次是否需要联网或查源，并统一写入来源台账。
9. 按需读取 `references/critical-insight-principles.md`。
10. 如果主题是思想文章、公共议题、复杂关系/组织文章，或用户要求深度、概念上升、引经据典，读取 `protocols/concept-elevation-protocol.md`、`references/reference-and-allusion-rules.md` 和 `references/concept-reference-map.md`。
11. 按 suite 传入的 `voice_mode` 判断是否读取 `protocols/editorial-comrade-voice-protocol.md` 和 `references/editorial-voice-principles.md`，并在底稿中写出 `正文声口方案`。如果用户明确要求中性报告、备忘录、表格、纯诊断或学术摘要，才可关闭文章声口，并说明关闭原因。
12. 自动成文时读取 `protocols/essay-protocol.md`，互动打磨时读取 `protocols/interactive-drafting-protocol.md`。
13. 先生成 `结构洞察底稿`，底稿中写出 `文章类型推荐与待选择`，但不先读取写作技法文件。
14. 底稿后确认文章类型：若用户或 suite 已显式指定 `article_type`，在底稿中记录并直接采用；若未指定且文章层开启，必须完整渲染 `templates/article-type-selection-dialog.md` 的九个选项、填入基于底稿的推荐项和推荐理由，并等待用户回复；若用户回复“默认/自动/都行”，采用选择器中的推荐项。不得只写“已展示文章类型选择器（1-9）”。
15. 用户选择文章类型后，再读取技法路由表和技法文件，然后生成 `文章正文`：读取 `references/article-technique-routing-map.md`，默认最多读取 3 个核心技法 + 2 个辅助技法，再读取对应 `references/writing-techniques/*.md` 文件。
16. 补全底稿中的 `文章类型与写作技法选择` 字段，再从底稿转译出 `文章正文`。

## 读取规则

- 默认遵守 `../crossframe/references/runtime-read-policy.md`：正常成文不读取 evals、examples、完整成功/失败案例、全量 v5 大索引或全量 50 技法卡。
- 自动成文：读取 `templates/insight-dossier-template.md` 和 `templates/essay-output-template.md`；默认执行 `full-visible-v5-longform`。
- 互动打磨：读取 `templates/interactive-session-template.md`。
- 如果主题涉及公共议题、最新事实、真实组织、平台、政策、公司、人物、法律、技术标准或数据，必须查源并按 `../crossframe/references/source-ledger-workflow.md` 写来源台账；来源只进入证据边界、反例、现实案例和事实限制，不接管文章命题。
- 如果主题是私人关系、泛论随笔、哲学概念或用户给出的虚构/概括性材料，默认不联网，除非用户要求或文章需要现实来源来避免误导。
- 如果启用概念上升，先从 CrossFrame 机制抽象上位概念，再选择中西经典、历史经验、理论或文学互文，最后回落到现实判断。
- 自动成文先写 `正文声口方案`，再成文。声口由 suite 传入的 `voice_mode` 决定：`neutral-analysis` / `neutral-decisive` / `editorial-reply` / `editorial-commentary`。只有显式短答/中性报告/备忘录/表格/纯诊断/学术摘要才关闭声口或长文档位。
- 先生成 `结构洞察底稿`，再展示文章类型选择器；文章类型选择器只在底稿之后、正文之前出现。文章类型只决定正文组织和写作技法读取，不改变事实边界、判断档位、连续联读包、证据责任和质量闸。
- 写作技法只在用户选择文章类型后按需读取。每次默认最多读取 3 个核心技法 + 2 个辅助技法；不得全量读取 50 个技法文件。技法只能改变表达结构，不能越过 `v5-read-state-capsule` 的源锚点边界新增事实、强判断或框架原义。
- `full-visible-v5-longform` 默认要求正文 1200-2200 中文字，不能用“如果只要一句话”“换成人话说”或项目符号回答替代文章开篇。
- 如果文章判断使用高风险 CrossFrame 概念，按 `../crossframe/references/read-routing-map.md` 读取对应概念卡，并用 `../crossframe/worksheets/concept-fidelity-check.md` 做保真检查。
- 如果文章判断触发 v5.0 连续板块，先按 `../crossframe/references/continuity-closure-map.md` 展开闭包，再读取必要联读包文件，并在底稿中写出“源结构连续性检查”。
- 如果文章中心命题、概念上升、经典互文或行动建议不能回指胶囊源锚点，正文必须写成“本文推断 / 表达转译 / 外部思想映射”，不得声称是 CrossFrame v5 原义。若外部来源只能支持背景或弱信号，也必须在来源台账中写明“不能证明什么”，不得用来源气势抬高判断档位。
- 如果文章使用引经据典、概念上升、隐喻、来源谱系或规范性前提，读取 `../crossframe/references/concept-cards/metaphor-source-transparency.md`；直接引用必须可核验，不确定时只做意译或思想映射。
- 如果文章涉及 AI 合规、弱信号、无法退出、无制度基础设施、工具化或开放断言退场，必须按 v5.0 对应联读包先完成现实保护检查，再成文。

## 硬规则

- 不准只写正文，不出底稿。
- 不准用检索材料决定文章立场；检索只能佐证、限定、反驳或补现实感。涉及真实公共对象时，不准只写“已查源”，必须列出来源类型、支持的命题、不能证明什么、证据档位、使用位置和降档理由。
- 不准把批判写成人格审判、嘲讽、道德宣判或情绪宣泄。
- 不准把术语当结论。前台说人话，后台保留概念链。
- 不准伪造原文、出处、页码、作者观点；不确定原句时只能意译或写思想映射。
- 不准让经典参照接管文章命题；引用只能照亮现实机制，不能压过证据。
- 不准把亲切写成和稀泥，不准把严厉写成人格审判，不准用“同志”称呼和口号替代分析。
- 不准把 CrossFrame 写成万能解释机器；超出结构判断能力时要写边界。
- 不准把文章写成新闻综述、资料拼贴或百科解释，除非用户明确要这种体裁。
- 文章的段落顺序必须服从信息依赖：读者先需要知道什么，后面的判断才能成立。
- 不准把完整底稿当成正文；底稿之后必须有完整文章。
- 不准把 suite 默认文章压缩成 600 字以内短答，除非用户明确要求短答。

## 默认输出

自动成文默认输出两个连续部分，输出档位为 `full-visible-v5-longform / 5.0混合长文`：

```text
# 结构洞察底稿

# 文章正文
```

`结构洞察底稿` 至少包含：

- 分析对象与事实边界
- 表面现象与高成本信号
- CrossFrame 路由与本次读取
- 读态胶囊摘要：source modules、入口连续联读包、必须同读闭包、相邻候选包、下游读取策略
- 源结构连续性检查：触发的连续联读包、是否读取源脊柱/逐节摘要、是否存在读少风险
- 源锚点完整性检查：中心命题、机制候选、高风险概念、行动边界、文章类型转译和写作技法是否能回指胶囊；无法回指内容如何标注或降档
- v5.0 源结构保真与概念风险：哪些概念不能孤立读取，哪些相邻约束进入本文判断
- 尺度窗口与机制候选
- 责任链、受益链、成本链
- 权力、证据与弱信号检查
- 检索材料与证据边界
- 反向条件与证据缺口
- 概念上升与参照系：上位概念、思想参照、引用方式、回落到现实的句子、引用风险
- 正文声口方案：默认启用现代编辑底色；选择答复体/评论体/中性说明体；写明读者处境、情绪入口、批评对象、劝告边界、结尾姿态
- 文章类型推荐与待选择：推荐文章类型、推荐理由、默认采用项
- 文章类型与写作技法选择：用户选择后补全文章类型、读取的技法文件、主心骨、入口技法、结构技法、批判技法、结尾技法和技法执行摘要；摘要要记录好句类型、段落前后关系、文章类型微用法和失败示例反查
- 来源台账摘要：公共议题、真实机构、平台、政策、人物、公司、最新事实和 AI/过程性产物必须写清来源用途、证据档位、能支持什么、仍不能证明什么
- 文章中心命题、开头入口、递进顺序、结尾余味

`文章正文` 至少包含：

- 一个具体入口
- 一个清楚的中心命题
- 3-5 个递进段落或小节
- 按需加入概念上升、经典/理论参照和回落现实的段落
- 按题切换答复体或评论体；默认先接住问题，再给判断、批评和意见；显式中性说明体可更克制，但仍不能退回概念堆砌
- 默认 1200-2200 中文字；哲学概念、思想文章、关系/组织/公共评论必须有铺陈、转折和余味，不写成短答
- 至少一个边界、反例、撤回条件或证据缺口
- 一个不喊口号、不把问题封死的结尾

## 写作气质

- 有锋利判断，但不装作全知。
- 有批判性，但保留证据边界和反向条件。
- 能指出责任链，但不把复杂问题压成某个人的坏。
- 面向普通读者，第一段删掉所有术语后仍能读懂。
- 可以像一位现代编辑同志那样耐心回应读者：亲切但不和稀泥，果敢但不审判人。
- 结尾要有余味，不用宏大口号替代思考。
