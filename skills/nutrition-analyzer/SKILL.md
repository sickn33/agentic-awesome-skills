---
name: nutrition-analyzer
description: 分析营养数据、识别营养模式、评估营养状况，并提供个性化营养建议。支持与运动、睡眠、慢性病数据的关联分析。
allowed-tools: Read, Grep, Glob, Write
risk: critical
source: community
date_added: "2026-03-06"
---

# 营养分析器技能

分析饮食和营养数据，识别营养模式，评估营养状况，并提供个性化营养改善建议。

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- 需要分析营养摄入、饮食模式或营养素达标情况时使用。
- 任务涉及宏量/微量营养素评估、RDA 对比、饮食趋势或膳食改进建议。
- 需要把营养数据与运动、睡眠或慢性病数据关联分析时使用。

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## 数据和医学限制

示例报告、目标、评分与时间表均为虚构教学数据，不是个人营养处方。RDA/AI/UL 必须按权威来源、日期、年龄和生理阶段选择；低于参考值不等于缺乏，超过 RDA 也不等于中毒。数据路径、RDA 常量、评分模型及分析程序未随技能提供，不能声称已运行或验证。记录缺失不能当作零；统一 mg/μg、食物与补充剂来源、份量及热量单位。自定义评分权重与 HEI 不同，且示例营养密度函数的字段与 JSON 不一致，需映射后才可运行；不要输出其临床等级。相关性需要样本数、缺失处理、多重比较与混杂说明。健康记录和报告仅写入用户授权位置，不上传或覆盖原始记录。
