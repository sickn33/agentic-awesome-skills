---
name: sleep-analyzer
description: 分析睡眠数据、识别睡眠模式、评估睡眠质量，并提供个性化睡眠改善建议。支持与其他健康数据的关联分析。
allowed-tools: Read, Grep, Glob, Write
risk: critical
source: community
date_added: "2026-03-06"
---

# 睡眠分析器技能

分析睡眠数据，识别睡眠模式，评估睡眠质量，并提供个性化睡眠改善建议。

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- 需要分析睡眠时长、效率、作息规律或睡眠质量时使用。
- 任务涉及失眠模式、夜间觉醒、PSQI 评分或睡眠问题识别。
- 需要把睡眠数据与情绪、运动或其他健康因素做关联分析时使用。

## 医学与数据边界

仅描述授权的日记/设备数据；不诊断、不制定用药或睡眠限制方案。严重嗜睡时避免驾驶并及时就医；急性呼吸困难等紧急情况联系当地急救。不要上传、补造或自行关联健康记录。

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
