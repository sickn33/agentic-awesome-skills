# CrossFrame Org 读取路由图

本文件只决定组织专项材料怎么读。CrossFrame 本体仍由 `../crossframe/SKILL.md` 与 `../crossframe/references/read-routing-map.md` 决定。

## 基础路由

| 用户请求 | 先读 canonical | 本 skill 必读 | 输出模板 |
| --- | --- | --- | --- |
| 项目失败、延期、反复返工 | `../crossframe/protocols/diagnosis-protocol.md`、`../crossframe/references/concept-cards/mechanism-candidates.md` | `protocols/org-diagnostic-protocol.md`、`references/org-failure-signals.md`、`references/responsibility-authorization-chain.md` | `templates/org-diagnostic-memo.md` |
| 复盘失真、复盘越做越假 | `../crossframe/references/concept-cards/repair-byproduct.md`、`../crossframe/references/concept-cards/evidence-cost.md` | `protocols/retrospective-redesign-protocol.md`、`references/org-failure-signals.md`、`references/anti-chicken-soup-guardrails.md` | `templates/retrospective-redesign-recommendation.md` |
| 基层反馈没人听、问题无法写回 | `../crossframe/references/concept-cards/chengjie-huiliu.md`、`../crossframe/references/concept-cards/responsibility-chain.md` | `protocols/feedback-writeback-protocol.md`、`references/responsibility-authorization-chain.md` | `templates/feedback-writeback-plan.md` |
| 中层疲惫、被夹在中间、长期补锅 | `../crossframe/references/concept-cards/structure-process-group.md`、`../crossframe/references/concept-cards/repair-byproduct.md` | `references/middle-manager-depletion.md`、`protocols/org-diagnostic-protocol.md` | `templates/org-diagnostic-memo.md` |
| 想要组织改造、试点、行动计划 | `../crossframe/protocols/low-condition-action-protocol.md`、`../crossframe/references/concept-cards/low-condition-action.md` | `protocols/low-risk-pilot-protocol.md`、`references/responsibility-authorization-chain.md` | `templates/low-risk-pilot-plan.md`、`templates/stop-condition-card.md` |
| 冲刺、加速、升级管理后更乱 | `../crossframe/references/concept-cards/judgment-grades.md`、`../crossframe/references/concept-cards/evidence-cost.md` | `protocols/low-risk-pilot-protocol.md`、`references/anti-chicken-soup-guardrails.md` | `templates/stop-condition-card.md` |

## 高风险概念补读

- 复盘、修复、道歉、改进项、合规材料：读 `../crossframe/references/concept-cards/repair-byproduct.md`。
- 责任、背锅、负责人、Owner、RACI：读 `../crossframe/references/concept-cards/responsibility-chain.md`。
- 反馈、回流、写回、闭环：读 `../crossframe/references/concept-cards/chengjie-huiliu.md`。
- 中层耗竭、结构负荷、行动承接：读 `../crossframe/references/concept-cards/structure-process-group.md`。
- 弱信号、汇报、报告、自评、复盘记录：读 `../crossframe/references/concept-cards/evidence-cost.md`。
- 试点、低风险行动、可撤回动作：读 `../crossframe/references/concept-cards/low-condition-action.md`。
- 停止条件、能否强推、能否升级：读 `../crossframe/references/concept-cards/judgment-grades.md`。

## 输出选择

- 用户要“怎么看、诊断、为什么”：默认 `组织诊断备忘录`。
- 用户要“怎么改、怎么闭环”：默认 `反馈写回方案`。
- 用户要“复盘怎么做”：默认 `复盘改造建议`。
- 用户要“先试一下、低风险推进”：默认 `低风险试点计划`。
- 用户情绪很急、组织正在加速：先输出 `停止条件卡`，再给低风险试点。
