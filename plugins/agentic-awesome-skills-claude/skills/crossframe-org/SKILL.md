---
name: crossframe-org
description: "Use when CrossFrame Suite routes explicit Chinese analysis of teams, projects, organizations, responsibility chains, feedback write-back, repair, or retrospectives."
category: business
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
  - organization
  - retrospective
  - repair
---
# CrossFrame Org



## When to Use This Skill

- Use when `crossframe-suite` routes an explicit CrossFrame task about teams, projects, organizations, responsibility chains, authority chains, feedback write-back, retrospectives, or repair.
- Use when an organizational failure needs mechanism candidates rather than personality judgment.
- Do not use independently unless the user explicitly names this sibling skill.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

## Limitations

- The skill body is intentionally Chinese-canonical; English metadata is for discovery and does not replace the original Chinese terms.
- Use only after explicit CrossFrame invocation or `crossframe-suite` routing; do not apply it as a generic default reasoning layer.
- It structures analysis, drafting, and review, but does not replace source verification, domain expertise, or legal, medical, or financial judgment.

> **本 skill 不独立触发。** 所有 CrossFrame 任务统一从 `crossframe-suite` 入口调度。用户无需直接调用本 skill；suite 根据路由规则在需要时自动加载。

如果组织修复判断之后要写文章、沉淀案例、做辩论或评审输出，先读取 `../crossframe-suite/SKILL.md` 做总调度；本 skill 只负责团队、项目和组织修复专项。

CrossFrame Org 是 `crossframe` 的平行组织修复 skill，不替代 canonical `crossframe`，也不复制 CrossFrame 全文。它把 CrossFrame 的事实闸、尺度闸、责任闸、机制候选和概念保真，转成团队、项目、组织场景里的可执行修复备忘录。

中文是权威语义。英文只用于 skill id、文件名或必要的外部接口；不要把“承接、回流、责任链、授权链、修复副产品、停止错误加速”翻译后再反向理解。

## 必须执行的顺序

1. 判断输出类型：组织诊断备忘录、反馈写回方案、复盘改造建议、低风险试点计划，或组合输出。
2. 读取 `../crossframe/SKILL.md`。
3. 读取 `../crossframe/references/read-routing-map.md`，确定本次需要加载的 canonical protocol、worksheet、concept card 和模板。
4. 如果组织判断触发高责任、公共制度、亲密关系、长期演化、框架治理、AI 现实验证、弱信号/不透明、无法退出、工具化、隐喻/来源透明或文章输出，必须追加读取 `../crossframe/references/continuity-bundles.md`，并按需使用 `../crossframe/worksheets/source-continuity-check.md`；未完成联读时只能降档。
5. 复用 `../crossframe/templates/read-state-capsule.md` 规定的 `v5-read-state-capsule`，并在高责任、公共、AI/过程性产物、生命周期、无法退出主体或文章输出场景执行 `../crossframe/worksheets/source-anchor-integrity-check.md`。如果胶囊缺失，回到 `../crossframe/SKILL.md` 补齐；本 skill 不重新发明源路由。
6. 读取 `references/org-routing-map.md`，选择本 skill 的专项协议、引用材料和模板。
7. 按请求读取本地协议：
   - 项目失败、团队反复卡住：`protocols/org-diagnostic-protocol.md`
   - 反馈没有进入下一轮结构改变：`protocols/feedback-writeback-protocol.md`
   - 复盘失真、复盘形式化：`protocols/retrospective-redesign-protocol.md`
   - 需要行动、试点、改造计划：`protocols/low-risk-pilot-protocol.md`
8. 按需读取本地引用：
   - 责任链与授权链：`references/responsibility-authorization-chain.md`
   - 中层承接耗竭：`references/middle-manager-depletion.md`
   - 项目失败与复盘失真信号：`references/org-failure-signals.md`
   - 反管理鸡汤与反甩锅护栏：`references/anti-chicken-soup-guardrails.md`
9. 如果判断使用高风险 CrossFrame 概念，按 `../crossframe/references/read-routing-map.md` 读取对应概念卡，并用 `../crossframe/worksheets/concept-fidelity-check.md` 做概念保真检查。
10. 先形成内部组织 intake，再按模板输出；不要展示完整内部工作表，除非用户要求审计或完整工作表。

## 内部组织 intake

每次输出前，至少在内部写清：

- 组织对象：团队、项目、流程、会议、角色、跨部门接口或治理层。
- 事实边界：用户给出的事实、推测、证据缺口、不能判断的部分。
- 失败现象：延期、返工、沉默、复盘失真、需求漂移、跨部门断裂、加速后更乱。
- 责任链：谁对结果负责，谁能改变条件，谁承担失败成本，谁被要求继续解释。
- 授权链：谁有权限改规则、资源、优先级、时间表、接口和停止条件。
- 反馈链：信号从哪里来，经过谁转译，写回到什么规则、资源、角色或时间表。
- 中层承接负荷：中层是否在替组织吸收冲突、解释、补锅、翻译和情绪成本。
- 机制候选：至少两个互相竞争的解释，不能把问题直接压成“执行力差”。
- 停止条件：哪些动作一旦出现负反馈就必须暂停、降档或撤回。
- 低风险试点：最小、可观察、可撤回、能写回结构的小动作。

## 输出规则

- 默认先给短的 `组织推理提纲`，再输出用户需要的备忘录或方案。
- 输出必须落到现实组织变量：角色、权限、资源、时间、接口、节奏、证据、停止条件。
- 输出不是文章；不要走 `crossframe-essay`，除非用户明确要求写文章。
- 第一段要用普通组织语言说明：发生了什么、为什么重复、下一步先改什么。
- 术语只能做后台映射，不能用“这是典型的 X”替代诊断。

## 硬规则

- 不准写管理鸡汤：不输出“加强沟通、提升主人翁意识、统一思想、提高执行力”这类无结构变量建议。
- 不准把问题压给执行层：任何涉及基层、执行、个人努力的判断，都必须同时检查授权链、资源链、时间链和反馈写回。
- 不准只有复盘没有写回：每个建议都要说明写回到什么规则、资源、角色、接口或时间表。
- 不准只有加速没有停止条件：冲刺、加会、升级管理、强推进都必须有暂停、降档、撤回或保护边界。
- 不准把中层耗竭解释成能力不足或抗压不够；先检查组织是否把翻译、缓冲、补锅和冲突成本长期压给中层。
- 不准把复盘报告、OKR 更新、合规记录、道歉声明或会议纪要当成修复本身；它们最多是修复副产品。
- 不准用组织诊断替代劳动法、合规、心理健康、医疗、安全或正式申诉处置。
- 不准为了显得积极而建议扩大范围；先找最小可逆试点。

## 默认输出

使用 `templates/output-selector.md` 判断模板。常见默认：

```text
# 组织推理提纲

# 组织诊断备忘录

# 反馈写回方案

# 低风险试点计划
```

如果用户只要求复盘改造，使用 `templates/retrospective-redesign-recommendation.md`。如果用户只要求一个行动实验，使用 `templates/low-risk-pilot-plan.md` 并附 `templates/stop-condition-card.md`。
