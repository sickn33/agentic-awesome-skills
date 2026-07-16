---
name: sleep-analyzer
description: 分析睡眠数据、识别睡眠模式、评估睡眠质量，并提供个性化睡眠改善建议。支持与其他健康数据的关联分析。
allowed-tools: Read, Grep, Glob, Write
risk: unknown
source: community
---

# 睡眠分析器技能

分析睡眠数据，识别睡眠模式，评估睡眠质量，并提供个性化睡眠改善建议。

## When to Use
- 需要分析睡眠时长、效率、作息规律或睡眠质量时使用。
- 任务涉及失眠模式、夜间觉醒、PSQI 评分或睡眠问题识别。
- 需要把睡眠数据与情绪、运动或其他健康因素做关联分析时使用。

## 功能

### 1. 睡眠趋势分析

分析睡眠时长、质量、效率的变化趋势，识别改善或需要关注的方面。

**分析维度**：
- 睡眠时长趋势（平均睡眠时长变化）
- 睡眠效率趋势（睡眠效率百分比变化）
- 入睡时间模式（上床时间、入睡时间、起床时间）
- 作息规律性评分（sleep consistency score）
- 周末vs工作日对比（social jetlag）

**输出**：
- 趋势方向（改善/稳定/下降）
- 变化幅度和百分比
- 趋势显著性评估
- 最佳睡眠时间窗口识别
- 改进建议

### 2. 睡眠质量评估

综合评估睡眠质量，识别影响睡眠质量的关键因素。

**评估内容**：
- PSQI分数追踪和趋势
- 主观睡眠质量分布（好/中/差）
- 夜间觉醒分析（次数、时长、原因）
- 睡眠阶段分析（深睡、浅睡、REM比例）
- 睡后恢复感评估

**输出**：
- 睡眠质量等级（优秀/良好/一般/较差）
- 质量变化趋势
- 主要影响因素识别
- 质量改善优先级建议

### 3. 睡眠问题识别

识别常见的睡眠问题和风险因素。

**识别内容**：
- **失眠模式**：
  - 入睡困难（sleep latency >30分钟）
  - 睡眠维持困难（夜间觉醒>2次或总觉醒时间>30分钟）
  - 早醒（比预期提前醒来>30分钟）
  - 混合型失眠

- **呼吸暂停风险**：
  - STOP-BANG问卷评分
  - 症状分析（打鼾、憋醒、白天嗜睡）
  - 风险等级（低/中/高）

- **其他问题**：
  - 作息不规律检测
  - 睡眠债计算（理想时长vs实际时长）
  - 社交时差评估

**输出**：
- 问题存在与否
- 问题类型和严重程度
- 风险因素列表
- 是否需要就医建议

### 4. 相关性分析

分析睡眠与其他健康指标的相关性。

**支持的相关性分析**：
- **睡眠 ↔ 运动**：
  - 运动日vs休息日的睡眠差异
  - 运动时间对睡眠的影响（早晨/下午/晚间运动）
  - 运动强度与睡眠质量的相关性

- **睡眠 ↔ 饮食**：
  - 咖啡因摄入与睡眠时长、入睡时间的关系
  - 酒精摄入对睡眠结构的影响
  - 晚餐时间与睡眠质量的关系

- **睡眠 ↔ 情绪**：
  - 睡眠与情绪的双向关系分析
  - 压力水平对睡眠质量的影响
  - 睡眠剥夺对日间情绪的影响

- **睡眠 ↔ 慢性病**：
  - 睡眠与高血压的关系
  - 睡眠与血糖控制的关联
  - 睡眠与体重变化的关系

**输出**：
- 相关系数（-1到1）
- 相关性强度（弱/中/强）
- 统计显著性
- 因果关系推断
- 实践建议

### 5. 个性化建议生成

基于用户数据生成个性化睡眠改善建议。

**建议类型**：
- **作息调整建议**：
  - 最佳上床/起床时间
  - 作息一致性改善方案
  - 午睡管理建议

- **睡前准备建议**：
  - 睡前例行程序设计
  - 放松技巧推荐
  - 屏幕时间管理

- **睡眠环境优化**：
  - 温度、湿度、光线、噪音优化
  - 床品舒适度建议

- **生活方式调整**：
  - 运动、饮食、咖啡因、酒精管理
  - 压力管理建议

- **CBT-I元素**：
  - 刺激控制建议
  - 睡眠限制建议
  - 认知重构建议

**输出**：
- 优先级排序的建议列表
- 具体实施步骤
- 预期效果说明
- 实施时间线

---

## 使用说明

### 触发条件

当用户请求以下内容时触发本技能：
- 睡眠趋势分析
- 睡眠质量评估
- 睡眠问题识别
- 睡眠改善建议
- 睡眠与其他健康指标的关联分析

### 执行步骤

#### 步骤 1: 确定分析范围

明确用户请求的分析类型和时间范围：
- 分析类型：趋势/质量/问题/相关性/建议
- 时间范围：周/月/季度/自定义

#### 步骤 2: 读取数据

**主要数据源**：
1. `data-example/sleep-tracker.json` - 睡眠追踪主数据
2. `data-example/sleep-logs/YYYY-MM/YYYY-MM-DD.json` - 每日睡眠记录

**关联数据源**：
1. `data-example/fitness-tracker.json` - 运动数据
2. `data-example/hypertension-tracker.json` - 血压数据
3. `data-example/diabetes-tracker.json` - 血糖数据
4. `data-example/diet-records/` - 饮食记录
5. `data-example/mood-tracker.json` - 情绪数据

#### 步骤 3: 数据分析

根据分析类型执行相应的分析算法：

**趋势分析算法**：
- 线性回归计算趋势斜率
- 移动平均平滑波动
- 统计显著性检验

**相关性分析算法**：
- Pearson相关系数计算
- 滞后相关性分析（考虑时间延迟效应）
- 多变量回归分析

**模式识别算法**：
- 时间序列模式识别
- 异常值检测
- 周期性分析

#### 步骤 4: 生成报告

按照标准格式输出分析报告（见"输出格式"部分）

---

## 输出格式

### 睡眠质量分析报告

```markdown
# 睡眠质量分析报告

## 分析周期
2025-03-20 至 2025-06-20（3个月）

---

## 睡眠时长趋势

- **趋势**：⬆️ 改善
- **开始**：平均6.2小时/晚
- **当前**：平均7.1小时/晚
- **变化**：+0.9小时 (+14.5%)
- **解读**：睡眠时长显著增加，接近理想目标（7.5小时）

**趋势线**：
```
6.5h ┤     ╭╮
6.0h ┤   ╭─╯╰╮
5.5h ┤ ╭─╯   ╰─╮
5.0h ┼─┘       ╰─
     └───────────
     3月  4月  5月  6月
```

---

## 睡眠效率

- **平均睡眠效率**：85.3%
- **效率范围**：78%-92%
- **达标率**：63%（>85%为达标）
- **解读**：睡眠效率正常，仍有提升空间

**效率分布**：
- 优秀（>90%）：15晚
- 良好（85-90%）：28晚
- 需改善（<85%）：47晚

---

## 作息规律性

- **平均上床时间**：23:15（范围：22:30-01:00）
- **平均起床时间**：07:05（范围：06:30-08:30）
- **作息一致性评分**：72/100
- **社交时差**：45分钟（周末比工作日晚睡晚起）
- **解读**：作息基本规律，但周末波动较大

**建议**：
- 🎯 保持一致的起床时间，包括周末
- 🎯 逐步调整上床时间，避免周末过度延迟

---

## 睡眠质量分布

| 质量等级 | 天数 | 占比 | 趋势 |
|---------|------|------|------|
| 优秀 | 8 | 9% | ⬆️ |
| 很好 | 12 | 13% | ➡️ |
| 好 | 15 | 17% | ⬆️ |
| 一般 | 42 | 47% | ⬇️ |
| 差 | 10 | 11% | ⬇️ |
| 很差 | 3 | 3% | ➡️ |

**解读**：睡眠质量以"一般"为主，但"好"及以上质量的天数在增加

---

## 夜间觉醒分析

- **平均觉醒次数**：1.8次/晚
- **平均觉醒时长**：18分钟
- **主要原因**：
  1. 尿意（45%）
  2. 噪音（25%）
  3. 温度过热（15%）
  4. 其他（15%）

**建议**：
- 🎯 睡前2小时限制液体摄入
- 🎯 优化卧室温度（18-22℃）
- 🎯 使用白噪音机器遮蔽背景噪音

---

## PSQI 评估趋势

- **最新分数**：8分（睡眠质量一般）
- **上次分数**：10分（2025-03-20）
- **变化**：-2分（改善）
- **趋势**：⬆️ 持续改善

**历史趋势**：
```
12 ┤ ●
10 ┤  ●
 8 ┤    ●
 6 ┤
   └──────
   12月 3月 6月
```

**各成分变化**：
- 主观睡眠质量：2→2（稳定）
- 入睡时间：2→2（稳定）
- 睡眠时长：2→1（改善）
- 睡眠效率：2→1（改善）
- 睡眠障碍：2→1（改善）

---

## 睡眠问题识别

### 失眠评估

- **类型**：混合型失眠
- **频率**：4-5晚/周
- **持续时间**：18个月
- **主要症状**：
  - ✗ 入睡困难（潜伏期>30分钟）
  - ✗ 睡眠维持困难（夜间觉醒>2次）
  - ✓ 无早醒问题

- **影响**：
  - 白天疲劳：中度
  - 情绪烦躁：是
  - 注意力困难：是
  - 工作表现：轻度影响

- **建议**：🏥 持续>3个月，建议就医咨询睡眠专科

### 呼吸暂停筛查（STOP-BANG）

- **评分**：3/8
- **风险等级**：中等风险
- **阳性项目**：
  - ✗ Snoring（打鼾）
  - ✗ Tired（白天疲劳）
  - ✓ Observed apnea（未观察到呼吸暂停）
  - ✗ Pressure（高血压）
  - ✓ BMI > 28
  - ✓ Age > 50
  - ✗ Neck size > 40cm
  - ✓ Gender = male

- **建议**：⚠️ 建议进行睡眠检查（PSG）

---

## 相关性分析

### 睡眠 ↔ 运动

**运动日 vs 休息日**：
- 运动日平均睡眠：7.3小时
- 休息日平均睡眠：6.8小时
- 差异：+0.5小时（+7.4%）

**运动时间对睡眠的影响**：
- 早晨运动：睡眠时长7.5小时，质量评分7.8/10
- 下午运动：睡眠时长7.2小时，质量评分7.5/10
- 晚间运动：睡眠时长6.8小时，质量评分6.8/10

**相关性**：中等正相关（r = 0.42）
**结论**：规律运动有助于改善睡眠，但应避免睡前2-3小时剧烈运动

**建议**：
- 🎯 保持规律运动习惯
- 🎯 将运动时间移至早晨或下午
- 🎯 睡前2-3小时避免剧烈运动

---

### 睡眠 ↔ 咖啡因

**咖啡因摄入时间分析**：
- 下午2点前摄入：平均睡眠7.2小时，入睡潜伏期25分钟
- 下午2点后摄入：平均睡眠6.7小时，入睡潜伏期40分钟
- 差异：-0.5小时时长，+15分钟潜伏期

**相关性**：中等负相关（r = -0.38）
**结论**：下午2点后摄入咖啡因显著影响睡眠

**建议**：
- 🎯 避免下午2点后摄入咖啡因
- 🎯 睡前6小时完全避免咖啡因

---

### 睡眠 ↔ 情绪

**睡眠质量对次日情绪的影响**：
- 睡眠好：次日情绪积极概率82%
- 睡眠一般：次日情绪积极概率45%
- 睡眠差：次日情绪积极概率18%

**睡前情绪对入睡的影响**：
- 睡前压力高：入睡潜伏期45分钟
- 睡前压力低：入睡潜伏期20分钟
- 差异：+25分钟

**相关性**：强双向相关（r = 0.65）
**结论**：睡眠与情绪存在显著的相互影响

**建议**：
- 🎯 睡前进行压力管理（冥想、深呼吸）
- 🎯 建立放松的睡前例行程序
- 🎯 记录情绪日记，识别压力模式

---

## 洞察与建议

### 关键洞察

1. **作息不一致是主要问题**
   - 社交时差45分钟
   - 周末作息显著偏离工作日
   - 影响：生物钟紊乱，周一"时差反应"

2. **晚间运动影响入睡**
   - 晚间运动日入睡潜伏期延长15分钟
   - 建议：调整运动时间

3. **睡眠环境可优化**
   - 噪音觉醒占25%
   - 温度过热占15%
   - 建议针对性改善

---

### 优先级行动计划

#### Priority 1：建立一致作息（2周）

**目标**：提高作息一致性评分至85分

**具体行动**：
1. 固定起床时间07:00（包括周末）
2. 固定上床时间23:00
3. 限制午睡<30分钟，且下午3点前
4. 逐步调整周末作息（每次提前15分钟）

**预期效果**：
- 作息一致性评分：72 → 85
- 睡眠效率提升：+3-5%
- 周一疲劳感减轻

---

#### Priority 2：创建睡前例行程序（3周）

**目标**：建立稳定的睡前例行程序

**具体行动**：
1. 提前1小时开始例行程序（22:00）
2. 关闭电子设备（22:30）
3. 调暗卧室灯光
4. 进行放松活动（阅读、冥想、温水澡）
5. 保持卧室安静、黑暗、凉爽（18-22℃）

**预期效果**：
- 入睡潜伏期缩短：30 → 20分钟
- 睡眠质量提升：一般 → 好
- 睡前压力降低

---

#### Priority 3：优化睡眠环境（1周）

**目标**：消除环境对睡眠的干扰

**具体行动**：
1. 安装遮光窗帘
2. 使用白噪音机器遮蔽背景噪音
3. 优化温度至18-22℃
4. 移除卧室时钟
5. 更换舒适的枕头和床垫

**预期效果**：
- 夜间觉醒减少：1.8 → 1.2次/晚
- 睡眠连续性提升
- 晨起状态改善

---

#### Priority 4：生活方式调整（4周）

**目标**：消除影响睡眠的生活习惯

**具体行动**：
1. 将运动移至早晨或下午
2. 下午2点后停止咖啡因摄入
3. 睡前3小时避免酒精
4. 睡前2小时避免大餐
5. 睡前1小时避免工作相关讨论

**预期效果**：
- 睡眠时长增加：+0.3小时
- 睡眠质量评分提升：+1分
- PSQI分数改善：8 → 6

---

## 长期目标

- **睡眠时长**：达到7.5小时/晚（当前7.1小时）
- **睡眠效率**：提升至>90%（当前85%）
- **PSQI分数**：降至≤5分（当前8分）
- **作息一致性**：提升至≥85分（当前72分）
- **入睡潜伏期**：缩短至<20分钟（当前28分钟）

---

## 医学安全提醒

⚠️ **就医建议**：
- 🏥 失眠持续>3个月，建议咨询睡眠专科
- 🏥 STOP-BANG≥3分，建议进行睡眠检查（PSG）
- 🏥 严重嗜睡影响驾驶安全，需立即就医

---

**报告生成时间**：2025-06-20
**分析周期**：2025-03-20 至 2025-06-20（90天）
**数据记录数**：90晚
**睡眠分析器版本**：v1.0
```

---

## 数据结构

### 睡眠记录数据

```json
{
  "sleep_records": [
    {
      "id": "sleep_20250620001",
      "date": "2025-06-20",
      "sleep_times": {
        "bedtime": "23:00",
        "sleep_onset_time": "23:30",
        "wake_time": "07:00",
        "out_of_bed_time": "07:15"
      },
      "sleep_metrics": {
        "sleep_duration_hours": 7.0,
        "time_in_bed_hours": 8.25,
        "sleep_latency_minutes": 30,
        "sleep_efficiency": 84.8
      },
      "sleep_quality": {
        "subjective_quality": "fair",
        "quality_score": 5,
        "rested_feeling": "somewhat"
      },
      "factors": {
        "exercise": true,
        "exercise_time": "evening",
        "caffeine_after_2pm": false,
        "screen_time_before_bed_minutes": 60
      }
    }
  ]
}
```

---

## 算法说明

### 睡眠质量评分算法

```python
def calculate_sleep_quality_score(record):
    """
    计算睡眠质量评分（0-10分）

    因素权重：
    - 睡眠时长：30%
    - 睡眠效率：25%
    - 入睡潜伏期：20%
    - 夜间觉醒：15%
    - 主观质量：10%
    """
    score = 0

    # 睡眠时长评分（理想7-9小时）
    duration = record['sleep_duration_hours']
    if 7 <= duration <= 9:
        duration_score = 10
    elif 6 <= duration < 7 or 9 < duration <= 10:
        duration_score = 7
    else:
        duration_score = 4
    score += duration_score * 0.30

    # 睡眠效率评分（>90%优秀）
    efficiency = record['sleep_efficiency']
    efficiency_score = min(efficiency / 90 * 10, 10)
    score += efficiency_score * 0.25

    # 入睡潜伏期评分（<15分钟优秀）
    latency = record['sleep_latency_minutes']
    if latency <= 15:
        latency_score = 10
    elif latency <= 30:
        latency_score = 7
    elif latency <= 45:
        latency_score = 4
    else:
        latency_score = 1
    score += latency_score * 0.20

    # 夜间觉醒评分（0次优秀）
    awakenings = record['awakenings']['count']
    awakening_score = max(10 - awakenings * 2, 0)
    score += awakening_score * 0.15

    # 主观质量评分
    quality_map = {
        'excellent': 10,
        'very_good': 8,
        'good': 7,
        'fair': 5,
        'poor': 3,
        'very_poor': 1
    }
    subjective_score = quality_map.get(
        record['sleep_quality']['subjective_quality'],
        5
    )
    score += subjective_score * 0.10

    return round(score, 1)
```

### 作息规律性评分算法

```python
def calculate_sleep_consistency_score(records):
    """
    计算作息规律性评分（0-100分）

    因素：
    - 上床时间标准差
    - 起床时间标准差
    - 睡眠时长标准差
    - 工作日vs周末差异
    """
    # 提取时间数据
    bedtimes = [r['bedtime'] for r in records]
    wake_times = [r['wake_time'] for r in records]
    durations = [r['sleep_duration_hours'] for r in records]

    # 计算标准差（分钟）
    bedtime_std = time_to_minutes_std(bedtimes)
    wake_std = time_to_minutes_std(wake_times)
    duration_std = statistics.stdev(durations)

    # 计算工作日vs周末差异
    weekday_avg = avg([r['sleep_duration_hours']
                       for r in records if is_weekday(r)])
    weekend_avg = avg([r['sleep_duration_hours']
                       for r in records if is_weekend(r)])
    diff = abs(weekday_avg - weekend_avg)

    # 综合评分
    score = 100
    score -= bedtime_std * 0.5  # 上床时间标准差影响
    score -= wake_std * 0.5     # 起床时间标准差影响
    score -= duration_std * 2   # 睡眠时长标准差影响
    score -= diff * 10          # 工作日周末差异影响

    return max(0, min(100, round(score)))
```

### 相关性分析算法

```python
def calculate_correlation(sleep_data, other_data, lag_days=0):
    """
    计算睡眠与其他指标的相关性

    参数：
    - sleep_data: 睡眠数据列表
    - other_data: 其他指标数据列表
    - lag_days: 滞后天数（考虑延迟效应）

    返回：
    - correlation_coefficient: 相关系数
    - p_value: 统计显著性
    - interpretation: 相关性解释
    """
    # 对齐数据（考虑滞后）
    aligned = align_data_with_lag(sleep_data, other_data, lag_days)

    # 计算Pearson相关系数
    from scipy import stats
    corr, p_value = stats.pearsonr(
        aligned['sleep_values'],
        aligned['other_values']
    )

    # 解释相关性
    if abs(corr) < 0.3:
        strength = "弱"
    elif abs(corr) < 0.7:
        strength = "中等"
    else:
        strength = "强"

    direction = "正相关" if corr > 0 else "负相关"
    significant = p_value < 0.05

    interpretation = f"{strength}{direction}"
    if significant:
        interpretation += "（统计学显著）"

    return {
        'correlation_coefficient': round(corr, 3),
        'p_value': round(p_value, 4),
        'interpretation': interpretation,
        'significant': significant
    }
```

---

## 医学安全声明

本技能提供的分析和建议仅供参考，不构成医疗诊断或治疗方案。

**本技能能够做到的**：
- ✅ 分析睡眠数据和模式
- ✅ 识别睡眠问题风险
- ✅ 提供睡眠卫生建议
- ✅ 评估与其他健康指标的相关性

**本技能不能做的**：
- ❌ 诊断失眠、睡眠呼吸暂停等疾病
- ❌ 开具助眠药物或治疗
- ❌ 替代专业睡眠医学治疗
- ❌ 处理严重睡眠障碍

**何时需要就医**：
- 🏥 失眠持续>3个月
- 🏥 疑似睡眠呼吸暂停（STOP-BANG≥3）
- 🏥 严重嗜睡影响安全
- 🏥 突发严重睡眠问题

---

## 参考资源

- AASM 睡眠评分标准：https://aasm.org/
- PSQI 量表：https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3455216/
- STOP-BANG 问卷：https://www.stopbang.ca/
- CBT-I 治疗：https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3455216/

---

**技能版本**: v1.0
**创建日期**: 2026-01-02
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
