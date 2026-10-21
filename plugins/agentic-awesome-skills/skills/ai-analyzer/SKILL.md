---
name: ai-analyzer
description: AI驱动的综合健康分析系统，整合多维度健康数据、识别异常模式、整理风险因素、提供一般性健康信息。支持智能问答和AI健康报告生成。
allowed-tools: Read, Grep, Glob, Write
risk: critical
source: community
date_added: "2026-03-06"
---
## Supporting material availability

This catalog copy contains the inline guidance below, but does not include the following supporting paths. They are external prerequisites, not bundled files:

- `<support-root>/scripts/generate_ai_report.py`

Ask for the original supporting material or an existing installation before using a step that depends on these paths; this catalog does not identify a verified download source for them. Resolve each path relative to that installation, inspect its contents, and verify any applicable license and execution prerequisites. Do not run a command or claim a referenced procedure was followed until its required file exists. Do not fabricate the missing scripts or treat an unrelated file with the same name as equivalent. Independent steps fully documented here can proceed within the user’s authorized scope; report any dependent step as unavailable.


# AI健康分析器

用于整理已提供的健康数据、描述趋势并准备与医生讨论的问题；这份说明不是经过临床验证的预测系统。

## When to Use
- The user wants AI-driven health analysis across multiple health datasets or lifestyle signals.
- You need anomaly detection, risk prediction, or personalized recommendations based on health inputs.
- You need generated health reports or question-answering over health metrics and trends.

## 输入与证据边界

这些方法是可选分析思路，不是已实现或验证的算法。统计异常不等于医学异常；CUSUM、Z分数和相关性需要足够、可比的样本，相关不证明因果。营养摄入低于参考量不直接证明缺乏，睡眠问卷不诊断睡眠障碍。紧急症状按当地急救流程处理，避免让报告生成延误就医。

参考：[ADA风险筛查](https://diabetes.org/diabetes-risk-test)、[ACC风险工具](https://tools.acc.org/ascvd-risk-estimator-plus/)。

## 核心功能

### 1. 智能健康分析
- **多维度数据整合**: 整合基础指标、生活方式、心理健康、医疗历史等4类数据源
- **异常模式识别**: 使用CUSUM、Z-score等算法检测异常值和变化点
- **相关性分析**: 计算不同健康指标之间的相关性（皮尔逊、斯皮尔曼）
- **趋势预测**: 基于历史数据进行趋势分析和预测

### 2. 健康风险预测
- **高血压风险**: 基于Framingham风险评分模型
- **糖尿病风险**: 基于ADA糖尿病风险评分标准
- **心血管疾病风险**: 基于ACC/AHA ASCVD指南
- **营养缺乏风险**: 基于RDA达成率和饮食模式分析
- **睡眠障碍风险**: 基于PSQI和睡眠模式分析

### 3. 个性化建议引擎
- **基础个性化**: 基于年龄、性别、BMI、活动水平等静态档案
- **建议分级**: Level 1（一般性）、Level 2（参考性）、Level 3（医疗建议）
- **循证依据**: 基于医学指南和循证医学证据
- **可操作性**: 提供具体、可行的改进建议

### 4. 自然语言交互
- **智能问答**: 支持健康数据查询、趋势分析、相关性查询等
- **上下文理解**: 维护对话历史，支持多轮对话
- **意图识别**: 识别用户查询意图，提供精准回复

### 5. AI健康报告生成
- **综合报告**: 包含所有维度健康数据、AI洞察、风险评估
- **快速摘要**: 关键指标概览、异常警示、主要建议
- **风险评估报告**: 各类疾病风险、风险因素分析、预防措施
- **趋势分析报告**: 多维度趋势、变化点识别、预测分析
- **HTML交互式报告**: ECharts图表、Tailwind CSS样式

## 使用说明

### 触发条件

当用户提到以下场景时，使用此技能：

**通用询问**:
- ✅ "AI分析我的健康状况"
- ✅ "我的健康有什么风险？"
- ✅ "生成AI健康报告"
- ✅ "AI分析所有数据"

**风险预测**:
- ✅ "预测我的高血压风险"
- ✅ "我有糖尿病风险吗？"
- ✅ "评估我的心血管风险"
- ✅ "AI预测健康风险"

**智能问答**:
- ✅ "我的睡眠怎么样？"
- ✅ "运动对我的健康有什么影响？"
- ✅ "我应该如何改善健康状况？"
- ✅ "AI健康助手问答"

**报告生成**:
- ✅ "生成AI健康报告"
- ✅ "创建综合分析报告"
- ✅ "AI风险评估报告"

### 执行步骤

#### 步骤 1: 读取AI配置

```javascript
const aiConfig = readFile('data/ai-config.json');
const aiHistory = readFile('data/ai-history.json');
```

检查AI功能是否启用，验证数据源配置。

#### 步骤 2: 读取用户档案

```javascript
const profile = readFile('data/profile.json');
```

获取基础信息：年龄、性别、身高、体重、BMI等。

#### 步骤 3: 读取健康数据

根据配置的数据源读取相关数据：

```javascript
// 基础健康指标
const indexData = readFile('data/index.json');

// 生活方式数据
const fitnessData = readFile('data-example/fitness-tracker.json');
const sleepData = readFile('data-example/sleep-tracker.json');
const nutritionData = readFile('data-example/nutrition-tracker.json');

// 心理健康数据
const mentalHealthData = readFile('data-example/mental-health-tracker.json');

// 医疗历史
const medications = exists('data/medications.json') ? readFile('data/medications.json') : null;
const allergies = exists('data/allergies.json') ? readFile('data/allergies.json') : null;
```

#### 步骤 4: 数据整合和预处理

整合所有数据源，进行数据清洗、时间对齐和缺失值处理。

#### 步骤 5: 多维度分析

**相关性分析**: 计算睡眠↔情绪、运动↔体重、营养↔生化指标等关联

**趋势分析**: 使用线性回归、移动平均等方法识别趋势方向

**异常检测**: 使用CUSUM、Z-score算法检测异常值和变化点

#### 步骤 6: 风险预测

核对具体模型版本、必要输入、适用人群及时间范围；没有这些信息时只描述风险因素，不计算疾病概率：

- 高血压相关因素：只有适用于目标人群的明确验证模型才可计算其规定的时间范围
- 糖尿病风险筛查：ADA问卷分数不是个人10年发病概率
- 心血管风险：仅在全部必要输入、适用年龄和模型版本经核对后使用相应工具
- 营养缺乏风险
- 睡眠障碍风险

#### 步骤 7: 生成个性化建议

根据分析结果生成三级建议：

- **Level 1**: 一般性建议（基于标准指南）
- **Level 2**: 参考性建议（基于个人数据）
- **Level 3**: 医疗建议（需医生确认，包含免责声明）

#### 步骤 8: 生成分析报告

**文本报告**: 包含总体评估、风险预测、关键趋势、相关性发现、个性化建议

**HTML报告**: 调用 `scripts/generate_ai_report.py` 生成包含ECharts图表的交互式报告

#### 步骤 9: 更新AI历史记录

只有用户请求保留记录时，才在其确认的私密目标保存最少必要结果；保留原文件，不自动写入历史。

## 数据源

| 数据源 | 文件路径 | 数据内容 |
|--------|---------|---------|
| 用户档案 | `data/profile.json` | 年龄、性别、身高、体重、BMI |
| 医疗记录 | `data/index.json` | 生化指标、影像检查 |
| 运动追踪 | `data-example/fitness-tracker.json` | 运动类型、时长、强度、MET值 |
| 睡眠追踪 | `data-example/sleep-tracker.json` | 睡眠时长、质量、PSQI评分 |
| 营养追踪 | `data-example/nutrition-tracker.json` | 饮食记录、营养素摄入、RDA达成率 |
| 心理健康 | `data-example/mental-health-tracker.json` | PHQ-9、GAD-7评分 |
| 用药记录 | `data/medications.json` | 药物名称、剂量、用法、依从性 |
| 过敏史 | `data/allergies.json` | 过敏原、严重程度 |

## 算法说明

### 相关性分析
- **皮尔逊相关系数**: 连续变量（如睡眠时长与情绪评分）
- **斯皮尔曼相关系数**: 有序变量（如症状严重程度）

### 异常检测
- **CUSUM算法**: 时间序列变化点检测
- **Z-score方法**: 统计异常值检测（|z| > 2）
- **IQR方法**: 四分位数异常值检测

### 风险预测
- **Framingham风险评分**: 高血压、心血管疾病风险
- **ADA风险评分**: 2型糖尿病风险
- **ASCVD计算器**: 动脉粥样硬化心血管病风险

## 安全与合规

### 必须遵循
- ❌ 不给出医疗诊断
- ❌ 不给出具体用药剂量建议
- ❌ 不判断生死预后
- ❌ 不替代医生建议
- ✅ 所有分析必须标注"仅供参考"
- ✅ Level 3建议必须包含免责声明
- ✅ 高风险预测必须建议咨询医生

### 隐私保护
- 只读取用户授权的数据；缺少记录不等于正常或零值。
- 本技能没有附带这些JSON文件、命令或报告脚本；`readFile`/`exists`片段是伪代码。
- 本地文件仍可能进入宿主模型上下文；不能保证宿主离线或无外部处理。涉及外部服务时先取得明确数据传输授权。
- 生成HTML时转义不可信文本，避免远程脚本、跟踪器和公开健康报告；按授权范围保存私密记录。

## 相关命令

- `/ai analyze` - AI综合分析
- `/ai predict [risk_type]` - 健康风险预测
- `/ai chat [query]` - 自然语言问答
- `/ai report generate [type]` - 生成AI健康报告
- `/ai status` - 查看AI功能状态

## 技术实现

### 工具限制
此Skill仅使用以下工具：
- **Read**: 读取JSON数据文件
- **Grep**: 搜索特定模式
- **Glob**: 按模式查找数据文件
- **Write**: 生成HTML报告和更新历史记录

### 性能优化
- 增量读取：仅读取指定时间范围的数据文件
- 数据缓存：避免重复读取同一文件
- 延迟计算：按需生成图表数据

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
