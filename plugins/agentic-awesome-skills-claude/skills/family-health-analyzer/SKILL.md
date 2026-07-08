---
name: family-health-analyzer
description: 分析家族病史、评估遗传风险、识别家庭健康模式、提供个性化预防建议
allowed-tools: Read, Write, Grep, Glob
risk: unknown
source: community
---

# 家庭健康分析技能

## When to Use
- 需要分析家族病史、遗传风险或家庭层面的健康模式时使用。
- 任务涉及家庭健康报告、家族聚集性疾病识别或预防建议生成。
- 需要把多个家庭成员的健康数据汇总后做趋势或风险评估。

## 技能概述

本技能提供家庭健康数据的深度分析,包括:
- 遗传风险评估
- 家族疾病模式识别
- 家庭共同问题分析
- 个性化预防建议
- 可视化报告生成

## 触发条件

当用户请求以下内容时,使用此技能:
- "家庭健康报告"
- "家族病史分析"
- "遗传风险评估"
- "家庭健康趋势"
- 执行 `/family report` 命令
- 执行 `/family risk` 命令

## 分析步骤

### 步骤1: 确定分析目标

识别用户请求类型:
- 家族病史分析
- 遗传风险评估
- 家庭健康趋势
- 家庭健康报告

### 步骤2: 读取家庭数据

**数据源:**
1. 主数据文件: `data/family-health-tracker.json`
2. 集成模块数据:
   - `data/hypertension-tracker.json`
   - `data/diabetes-tracker.json`
   - `data/profile.json`

### 步骤3: 数据验证与清洗

**验证项目:**
- 关系完整性
- 年龄合理性
- 数据一致性

### 步骤4: 遗传模式识别

**识别算法:**
1. 家族聚集性分析
2. 遗传模式识别
3. 早发病例识别(通常<50岁)

### 步骤5: 风险计算算法

**加权计算:**
```python
遗传风险评分 = (一级亲属患病数 × 0.4) +
              (早发病例数 × 0.3) +
              (家族聚集度 × 0.3)

风险等级:
- 高风险: ≥70%
- 中风险: 40%-69%
- 低风险: <40%
```

### 步骤6: 生成预防建议

**建议分类:**
- 筛查建议:定期检查项目
- 生活方式建议:饮食、运动、作息
- 就医建议:何时就医、咨询专科

**示例:**
```json
{
  "category": "screening",
  "action": "定期血压监测",
  "frequency": "每周3次",
  "start_age": 35,
  "priority": "high"
}
```

### 步骤7: 生成可视化报告

**HTML报告组件:**
1. 家谱树(ECharts树图)
2. 遗传风险热力图
3. 疾病分布饼图
4. 预防建议时间线

### 步骤8: 输出结果

**输出格式:**
1. 文本报告(简洁版):命令行输出
2. HTML报告(完整版):可视化图表

## 安全原则

### 医学安全边界
- ✅ 仅基于家族病史进行统计分析
- ✅ 提供预防建议和筛查提醒
- ✅ 明确标注不确定性
- ❌ 不进行遗传疾病诊断
- ❌ 不预测个体发病概率
- ❌ 不推荐具体治疗方案

### 免责声明
每次分析输出必须包含:
```
⚠️ 免责声明:
1. 本分析基于家族病史统计,仅供参考
2. 遗传风险评估不预测个体发病
3. 所有医疗决策请咨询专业医师
4. 遗传咨询建议咨询专业遗传咨询师
```

## 集成现有模块

- 读取高血压管理数据
- 读取糖尿病管理数据
- 关联用药记录

---

**技能版本**: v1.0
**最后更新**: 2025-01-08
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
