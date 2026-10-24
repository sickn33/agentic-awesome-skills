---
name: weightloss-analyzer
description: 分析减肥数据、计算代谢率、追踪能量缺口、管理减肥阶段
risk: critical
source: community
date_added: "2026-03-06"
---

# 减肥分析技能

分析减肥数据，计算代谢率，追踪能量缺口，管理减肥阶段。

## When to Use
- 需要分析减重数据、代谢率、能量缺口或减脂阶段管理时使用。
- 任务涉及 BMI、体脂、围度、BMR/TDEE 或体重变化趋势分析。
- 用户请求减肥进度评估、目标规划或个性化减重建议时使用。

## 功能

### 1. 身体成分分析

**BMI计算与分类**
- BMI = 体重(kg) / 身高(m)²
- 成人筛查分类（CDC，适用于20岁及以上；不是诊断，具体地区临床标准可能不同）：
  - 偏瘦：BMI < 18.5
  - 正常：18.5 ≤ BMI < 25
  - 超重：25 ≤ BMI < 30
  - 肥胖：BMI ≥ 30

**体脂、围度和目标体重**
- 记录测量方法、单位和误差；不要把家用体脂秤读数当作诊断。
- 不从单个 BMI、围度或公式自动指定“理想体重”；由用户与合格医护人员结合年龄、病史、用药和目标评估。

### 2. 代谢率计算

**Harris-Benedict修订公式（1984系数；不是1919原始版）**
- 男性：BMR = 88.362 + (13.397 × 体重kg) + (4.799 × 身高cm) - (5.677 × 年龄)
- 女性：BMR = 447.593 + (9.247 × 体重kg) + (3.098 × 身高cm) - (4.330 × 年龄)

**Mifflin-St Jeor估算公式（个体误差不可忽略）**
- 男性：BMR = (10 × 体重kg) + (6.25 × 身高cm) - (5 × 年龄) + 5
- 女性：BMR = (10 × 体重kg) + (6.25 × 身高cm) - (5 × 年龄) - 161

**Katch-McArdle公式（基于瘦体重）**
- BMR = 370 + (21.6 × 瘦体重kg)
- 瘦体重 = 体重kg × (1 - 体脂率)

**TDEE计算**
- TDEE = BMR × 活动系数
- 活动系数：
  - 久坐：1.2
  - 轻度活动：1.375
  - 中度活动：1.55
  - 高度活动：1.725
  - 非常高度活动：1.9

### 3. 能量缺口管理

**每日能量缺口追踪**
- 缺口估算 = TDEE - 实际摄入；若活动系数已包含运动，不再重复加运动消耗
- 缺口达标分析：实际缺口 vs 目标缺口

**减重估算**
- 1kg脂肪 ≈ 7700大卡
- 预计周减重 = 每日缺口 × 7 / 7700
- CDC通常建议逐渐减重约每周1–2磅；这不是对每个人的安全保证，不据此自动开具热量缺口

**热量边界**
- 不提供适用于所有人的最低热量或自动节食处方；`BMR × 1.2` 不是绝对安全下限。
- 公式、活动系数和 7700 大卡换算仅为粗略估算，不能预测线性的个人减重结果。

### 4. 阶段管理

**减重期**
- 追踪体重变化
- 计算减重进度
- 监测减重速度

**平台期检测**
- 定义：2周以上体重无明显变化（波动<0.5kg）
- 原因分析：代谢适应、水分滞留、肌肉增加
- 先检查测量一致性、趋势、健康状况和执行记录；不因两周波动自动减少热量或建议断食

**维持期**
- 目标体重±2kg范围内
- 定期监测体重
- 及时调整方案

## 数据源

### 主要数据源

1. **健身追踪器**
   - 路径：`data/fitness-tracker.json`
   - 内容：体重记录、身体成分、代谢率、阶段管理

2. **营养追踪器**
   - 路径：`data/nutrition-tracker.json`
   - 内容：热量摄入、能量缺口、膳食计划

3. **健康日志**
   - 路径：`data/health-logs/YYYY-MM/YYYY-MM-DD.json`
   - 内容：每日体重、饮食记录

## 输出格式

返回可复核的报告，而不是虚构示例中的“安全通过”结论：

1. 输入来源、日期范围、单位、缺失记录和测量误差。
2. BMI及所选成人筛查标准；不作疾病诊断。
3. 每个代谢估算公式的实际代入值和结果、活动假设及不确定性。
4. 体重趋势：有效记录数、原始日期、均值算法与异常值处理；不补造缺失日数据。
5. 能量收支估算，注明活动是否已计入；不重复计算运动。
6. 与医护人员讨论的问题和未验证的因素；不自动生成低热量计划。

## 使用方法

这些数据文件和 `/fitness:weightloss-*`、`/nutrition:weightloss-*` 命令未随本技能提供；只有在用户已有相应实现并核验后才能调用。可独立分析用户授权提供的数据，不声称命令已执行。

### 示例命令

```bash
# 设置减肥计划
/fitness:weightloss-setup --weight 75 --height 175 --age 52 --gender male

# 计算代谢率
/fitness:weightloss-bmr --formula mifflin

# 追踪能量缺口
/nutrition:weightloss-track --intake 1800 --exercise 350

# 生成阶段报告
/fitness:weightloss-report

# 检测平台期
/fitness:weightloss-plateau-check
```

## 安全原则

### 适用范围
- 不为未成年人、孕期/哺乳期、进食障碍风险者或有复杂病史者自动制定减重或热量限制计划。
- 明显不适、非预期快速体重变化或用药相关问题应联系合格医护人员。
- 不从 BMI 单项判断是否需要减重。

### 医学免责声明

本技能仅供健康参考，不构成医疗建议。

以下情况请咨询医生：
- BMI > 35
- 有心脏病、高血压、糖尿病等慢性病
- 服用处方药物
- 女性怀孕或哺乳期
- 任何健康状况不确定的情况

---

**技能版本**: v1.0
**最后更新**: 2026-01-14
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

参考：[CDC成人BMI分类](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html)、[CDC渐进减重](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html)、[NIDDK体重规划](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner)。健康日志属于敏感数据；仅处理用户授权的数据，不自动上传、持久保存或分享。
