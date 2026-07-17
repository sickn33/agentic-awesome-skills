---
name: goal-analyzer
description: 分析用户自定目标的清晰度、进度和记录质量，生成非诊断性的 SMART 评估、障碍清单与下一步计划。
allowed-tools: Read, Grep, Glob, Write
risk: safe
source: community
---

# 目标分析器

## When to Use

- 用户需要把目标改写为可观察、可衡量且有期限的计划。
- 用户希望根据自己提供的记录检查进度、障碍和下一步行动。
- 用户需要比较多个目标的优先级或生成阶段性回顾。

## Safety Boundary

- 只分析用户自定的目标和记录，不诊断身体或心理状况。
- 不创建统一的体重、热量、运动量、睡眠或症状“安全阈值”。
- 不推荐药物、治疗、补充剂、极端节食或高强度训练方案。
- 不把完成率、连续天数或自评动机转换为临床风险分数。
- 涉及进食障碍、强迫行为、自伤、严重身体不适或其他紧急风险时，停止常规目标优化并建议联系当地合格专业人员或紧急支持。

如果目标受慢性病、妊娠、术后恢复、药物或专业治疗影响，保留临床人员设定的限制，不自行修改。

## Required Inputs

- 用户原始目标和希望实现它的原因。
- 用户选择的衡量方式、基线、期限和复盘频率。
- 可用资源、约束和依赖关系。
- 用户提供的进度记录及其来源。
- 若适用，专业人员已经给出的限制或计划；只按原文记录。

缺少关键输入时先提问，不补造基线、期限或健康数据。

## SMART Review

逐项给出“清楚”“需要澄清”或“不适用”，并说明依据：

- **Specific**：目标行为或交付物是否明确。
- **Measurable**：用户是否选择了可记录的信号。
- **Achievable**：现有资源、约束和依赖是否已被讨论；不作医学可行性判断。
- **Relevant**：目标是否与用户说明的优先级一致。
- **Time-bound**：是否有复盘日期或完成期限。

不要生成伪精确的综合健康等级。若需要排序，使用用户确认的优先级和可解释的文本理由。

## Workflow

1. 复述目标、范围和用户定义的成功标准。
2. 标记缺失、冲突或不可验证的输入。
3. 完成 SMART 逐项检查。
4. 把目标拆成最小的下一步、检查点和复盘日期。
5. 根据记录描述进度趋势；数据不足时明确说明。
6. 区分可控行动、外部依赖和需要专业判断的事项。
7. 提出一到三个低风险调整选项，由用户选择。
8. 生成下一次复盘需要收集的数据，并检查安全边界。

## Progress Analysis

- 使用用户选择的指标，不替换为系统自建阈值。
- 同时报告分子、分母、时间范围和缺失记录。
- 把“未记录”和“未完成”分开。
- 可以指出时间上的关联，但不声称某习惯导致健康结果。
- 在样本很少或记录方式改变时，不做趋势外推。

## Output Format

```markdown
## Goal Contract
- Goal:
- Why it matters:
- User-defined success:
- Review date:

## SMART Review
- Specific:
- Measurable:
- Achievable within stated constraints:
- Relevant:
- Time-bound:

## Evidence and Gaps
- Observed progress:
- Missing or inconsistent records:
- External dependencies:

## Next Steps
1.
2.
3.

## Safety or Professional Input Needed
- None identified / describe the specific reason for referral
```

## Limitations

- 本技能不判断医疗安全性，也不替代医生、心理专业人员、营养师或其他合格专业人员。
- 输出质量取决于用户提供的数据和成功标准。
- 不把目标分析结果表述为诊断、预后或治疗建议。
