---
name: nutrition-analyzer
description: 分析营养数据、识别营养模式、评估营养状况，并提供个性化营养建议。支持与运动、睡眠、慢性病数据的关联分析。
allowed-tools: Read, Grep, Glob, Write
risk: unknown
source: community
---

# 营养分析器技能

分析饮食和营养数据，识别营养模式，评估营养状况，并提供个性化营养改善建议。

## When to Use
- 需要分析营养摄入、饮食模式或营养素达标情况时使用。
- 任务涉及宏量/微量营养素评估、RDA 对比、饮食趋势或膳食改进建议。
- 需要把营养数据与运动、睡眠或慢性病数据关联分析时使用。

## 功能

### 1. 营养趋势分析

分析营养素摄入的变化趋势，识别改善或需要关注的方面。

**分析维度**：
- 宏量营养素趋势（蛋白质、碳水、脂肪、纤维、卡路里）
- 微量营养素趋势（维生素、矿物质）
- 热量来源分布变化
- 餐食模式（饮食时间、频率）
- 食物类别偏好

**输出**：
- 趋势方向（改善/稳定/下降）
- 变化幅度和百分比
- 趋势显著性
- 改进建议

### 2. 营养素摄入评估

评估营养素摄入是否达到推荐标准（RDA/AI）。

**评估内容**：
- **宏量营养素评估**：
  - 蛋白质摄入量和质量
  - 碳水化合物类型分布（精制 vs 复杂碳水）
  - 脂肪类型分布（饱和/单不饱和/多不饱和/反式脂肪）
  - 膳食纤维摄入量

- **维生素评估**：
  - 维生素A、C、D、E、K
  - 维生素B族（B1、B2、B3、B6、B12、叶酸、泛酸、生物素）
  - 与RDA对比
  - 缺乏风险评估

- **矿物质评估**：
  - 常量矿物质：钙、磷、镁、钠、钾、氯、硫
  - 微量矿物质：铁、锌、铜、锰、碘、硒、铬、钼
  - 与RDA对比
  - 缺乏风险评估

- **特殊营养素评估**：
  - Omega-3脂肪酸（EPA、DHA、ALA）
  - 胆碱
  - 辅酶Q10
  - 植物化学物（类黄酮、类胡萝卜素等）

**输出**：
- 每种营养素的达成率
- 缺乏/不足/充足/过量分级
- 缺乏风险识别
- 优先改善建议

### 3. 营养状况评估

综合评估用户的营养状况。

**评估内容**：
- **整体营养质量评分**：
  - 营养密度评分
  - 食物多样性评分
  - 均衡饮食评分

- **营养模式识别**：
  - 饮食模式类型（地中海式、DASH、素食等）
  - 饮食时间模式（进食频率、进食窗口）
  - 零食和加餐模式

- **营养风险识别**：
  - 营养缺乏风险（如维生素D缺乏、铁缺乏）
  - 营养过量风险（如维生素A过量、钠过量）
  - 不健康饮食习惯（高糖、高脂、高钠）

**输出**：
- 营养状况等级（优秀/良好/一般/较差）
- 主要营养问题识别
- 风险因素列表
- 改善优先级

### 4. 相关性分析

分析营养与其他健康指标的相关性。

**支持的相关性分析**：
- **营养 ↔ 体重**：
  - 卡路里摄入与体重变化的关系
  - 宏量营养素比例与体重管理
  - 进食时间与代谢关系

- **营养 ↔ 运动**：
  - 营养摄入对运动表现的影响
  - 运动日vs休息日的营养需求
  - 蛋白质摄入与肌肉恢复

- **营养 ↔ 睡眠**：
  - 咖啡因摄入与睡眠质量
  - 晚餐时间与入睡时间
  - 特定营养素（如镁、色氨酸）与睡眠

- **营养 ↔ 血压**：
  - 钠摄入与血压
  - 钾/钠比值与血压
  - DASH饮食依从性与血压控制

- **营养 ↔ 血糖**：
  - 碳水化合物类型与血糖波动
  - 膳食纤维与血糖控制
  - 进食时间与血糖曲线

**输出**：
- 相关系数（-1到1）
- 相关性强度（弱/中/强）
- 统计显著性
- 因果关系推断
- 实践建议

### 5. 个性化建议生成

基于用户数据生成个性化营养改善建议。

**建议类型**：
- **营养素调整建议**：
  - 增加缺乏的营养素
  - 减少过量的营养素
  - 优化营养素比例

- **食物选择建议**：
  - 推荐特定食物类别
  - 食物替换建议（更健康的选择）
  - 食物搭配建议（促进吸收）

- **饮食习惯建议**：
  - 进食时间调整
  - 餐食频率调整
  - 烹饪方式建议

- **补充剂建议**（仅供参考）：
  - 基于缺乏风险的补充剂建议
  - 补充剂剂量和时机
  - 相互作用警示

**建议依据**：
- DRIs/RDA标准
- 用户营养历史数据
- 用户健康状况和目标
- 循证营养学证据

---

## 使用说明

### 触发条件

当用户请求以下内容时触发本技能：
- 营养趋势分析
- 营养素摄入评估
- 营养状况评估
- 营养改善建议
- 营养与其他健康指标的关联分析

### 执行步骤

#### 步骤 1: 确定分析范围

明确用户请求的分析类型和时间范围：
- 分析类型：趋势/评估/相关性/建议
- 时间范围：周/月/季度/自定义
- 分析深度：宏量营养素/微量营养素/全面分析

#### 步骤 2: 读取数据

**主要数据源**：
1. `data-example/nutrition-tracker.json` - 营养追踪主数据
2. `data-example/nutrition-logs/YYYY-MM/YYYY-MM-DD.json` - 每日饮食记录

**关联数据源**：
1. `data-example/profile.json` - 体重、BMI等基础数据
2. `data-example/fitness-tracker.json` - 运动数据
3. `data-example/sleep-tracker.json` - 睡眠数据
4. `data-example/hypertension-tracker.json` - 血压数据
5. `data-example/diabetes-tracker.json` - 血糖数据

#### 步骤 3: 数据分析

根据分析类型执行相应的分析算法：

**趋势分析算法**：
- 线性回归计算趋势斜率
- 移动平均平滑波动
- 统计显著性检验

**RDA达成率计算**：
```python
rda_achievement = (actual_intake / rda_value) * 100

status_classification:
- < 50%: 严重缺乏
- 50-75%: 不足
- 75-100%: 接近目标
- 100-150%: 充足（理想范围）
- > 150%: 过量（注意安全上限UL）
```

**营养密度评分**：
```python
nutrient_density_score = (
    (vitamins_achieved / total_vitamins) * 40 +
    (minerals_achieved / total_minerals) * 30 +
    (fiber_achieved / fiber_rda) * 30
)
```

**相关性分析算法**：
- Pearson相关系数计算
- 滞后相关性分析（考虑时间延迟效应）
- 多变量回归分析

#### 步骤 4: 生成报告

按照标准格式输出分析报告（见"输出格式"部分）

---

## 输出格式

### 营养趋势分析报告

```markdown
# 营养摄入趋势分析报告

## 分析周期
2025-03-20 至 2025-06-20（3个月，90天记录）

## 宏量营养素趋势

### 卡路里摄入
- **趋势**：⬇️ 下降
- **开始**：平均2100卡/天
- **当前**：平均1950卡/天
- **变化**：-150卡/天 (-7.1%)
- **解读**：卡路里摄入适度减少，与减重目标一致

**趋势线**：
```
2100 ┤ ╭╮
2050 ┤ ╭╯╰╮
2000 ┼─╯   ╰╮
1950 ┤      ╰
1900 └───────────
     3月  4月  5月  6月
```

### 蛋白质
- **趋势**：➡️ 稳定
- **平均**：82g/天（范围：70-95g）
- **目标**：80g/天
- **达标率**：93%（84/90天达标）
- **解读**：蛋白质摄入稳定，基本达标

### 膳食纤维
- **趋势**：⬆️ 改善
- **开始**：平均18g/天
- **当前**：平均22g/天
- **变化**：+4g/天 (+22%)
- **目标**：30g/天
- **解读**：纤维摄入显著增加，但仍需继续努力

### 脂肪
- **趋势**：⬇️ 下降
- **开始**：平均75g/天
- **当前**：平均68g/天
- **变化**：-7g/天 (-9.3%)
- **目标**：≤65g/天
- **解读**：脂肪摄入减少，接近目标

**脂肪类型分布变化**：
| 脂肪类型 | 开始 | 当前 | 目标 | 趋势 |
|---------|------|------|------|------|
| 饱和脂肪 | 25g | 20g | <20g | ⬇️ 改善 |
| 单不饱和 | 30g | 32g | >35g | ⬆️ 略增 |
| 多不饱和 | 15g | 12g | 15-20g | ⬇️ 需增加 |
| 反式脂肪 | 2g | 0.5g | 0g | ⬇️ 改善 |

## 维生素状况趋势

### 维生素D
- **摄入趋势**：⬆️ 增加（补充剂开始）
- **开始**：平均2μg/天（饮食来源）
- **当前**：平均52μg/天（含2000IU补充剂）
- **RDA**：15μg/天
- **血清水平变化**：
  - 基线（2025-05）：18 ng/mL
  - 当前（2025-06）：22 ng/mL
  - 目标：30-100 ng/mL
- **解读**：✅ 补充剂起效，但需继续监测

### 维生素C
- **趋势**：⬆️ 改善
- **开始**：平均65mg/天
- **当前**：平均85mg/天
- **RDA**：100mg/天
- **达标率**：从65% → 85%
- **建议**：增加柑橘类、奇异果、草莓等水果

### B族维生素
- **维生素B12**：✅ 充足（平均2.5μg，RDA 2.4μg）
- **叶酸**：⚠️ 不足（平均320μg，RDA 400μg）
- **B6**：✅ 充足（平均1.5mg，RDA 1.3mg）

## 矿物质趋势

### 钙
- **趋势**：➡️ 稳定
- **平均**：850mg/天
- **RDA**：1000mg/天
- **达标率**：85%
- **主要来源**：乳制品40%、豆腐25%、绿叶蔬菜20%

### 铁
- **趋势**：✅ 充足
- **平均**：12mg/天
- **RDA**：8mg/天（男性）
- **达标率**：150%
- **主要来源**：肉类、蛋类、豆类、绿叶蔬菜

### 钠
- **趋势**：⬇️ 改善
- **开始**：平均2800mg/天
- **当前**：平均2100mg/天
- **目标**：<2300mg/天（理想<1500mg）
- **解读**：✅ 达到一般目标，⚠️ 理想目标仍需努力

### 钾
- **趋势**：⬆️ 改善
- **开始**：平均2800mg/天
- **当前**：平均3200mg/天
- **目标**：3500-4700mg/天
- **钾/钠比值**：从1.0 → 1.5（目标>2）
- **建议**：继续增加水果和蔬菜

## 特殊营养素趋势

### Omega-3
- **趋势**：⬆️ 增加（鱼油补充剂）
- **开始**：平均150mg/天
- **当前**：平均850mg/天（含补充剂）
- **推荐量**：500-1000mg/天
- **状态**：✅ 达标

### 胆碱
- **趋势**：➡️ 稳定
- **平均**：350mg/天
- **AI（适宜摄入量）**：425mg/天
- **达标率**：82%
- **主要来源**：鸡蛋（60%）、肉类（25%）、豆类（15%）

## 饮食模式分析

### 食物类别分布
| 食物类别 | 占比 | 变化 | 评价 |
|---------|------|------|------|
| 蔬菜水果 | 35% | +8% | ✅ 增加 |
| 全谷物 | 20% | +5% | ✅ 改善 |
| 精制谷物 | 15% | -7% | ✅ 减少 |
| 蛋白质来源 | 20% | 稳定 | ✅ 充足 |
| 添加脂肪 | 8% | -3% | ✅ 减少 |
| 添加糖 | 2% | -2% | ✅ 减少 |

### 进食时间模式
- **平均进食窗口**：12.5小时（07:30 - 20:00）
- **进食频率**：平均4.2次/天
- **最常见餐食时间**：
  - 早餐：07:30（90%天数）
  - 午餐：12:15（95%天数）
  - 晚餐：18:45（98%天数）
  - 加餐：15:30（60%天数）

### 饮食质量评分
- **营养密度评分**：7.2/10（从6.5提升）
- **食物多样性评分**：6.8/10
- **均衡饮食评分**：7.5/10
- **综合评分**：7.2/10 → **良好**

## 洞察与建议

### 关键洞察

1. **膳食纤维持续改善但仍不足**
   - 从18g增至22g，但仍低于目标30g
   - 影响：饱腹感、肠道健康、血糖控制
   - 建议：每餐至少包含5g纤维

2. **脂肪质量改善**
   - 饱和脂肪减少，反式脂肪几乎消除
   - 多不饱和脂肪略低，需增加Omega-3食物
   - 建议：增加深海鱼类、坚果、亚麻籽

3. **钠摄入改善但钾/钠比仍低**
   - 钠减少33%，钾增加14%
   - 钾/钠比从1.0升至1.5，仍低于目标2.0
   - 建议：继续增加高钾食物（香蕉、橙子、土豆、菠菜）

4. **维生素D补充剂有效**
   - 血清水平从18升至22 ng/mL（4周+4ng）
   - 预计3-4个月可达目标范围
   - 建议：继续补充，定期监测

### 优先级行动计划

#### Priority 1：提升膳食纤维至30g/天（2周）

**具体行动**：
1. 早餐：全谷物（燕麦/全麦面包）+ 水果（9g）
2. 午餐：糙米/全麦面 + 2份蔬菜（8g）
3. 晚餐：红薯/杂粮 + 2份蔬菜（8g）
4. 加餐：水果 + 坚果（5g）
**总计**：30g ✅

#### Priority 2：优化钾/钠比值至2.0（4周）

**具体行动**：
1. 减少加工食品（主要钠源）
2. 每日2-3份高钾水果（香蕉、橙子、猕猴桃）
3. 蔬菜选择菠菜、土豆、蘑菇、番茄
4. 使用香料替代盐调味

#### Priority 3：维持维生素D补充（长期）

**监测计划**：
- 3个月后复查血清水平
- 目标：40-60 ng/mL
- 根据结果调整剂量

## 营养目标进度

| 目标 | 开始 | 当前 | 目标值 | 进度 | 状态 |
|------|------|------|--------|------|------|
| 卡路里 | 2100 | 1950 | 1800-2000 | 100% | ✅ 达标 |
| 蛋白质 | 75g | 82g | 80g | 100% | ✅ 达标 |
| 膳食纤维 | 18g | 22g | 30g | 73% | ⚠️ 进行中 |
| 维生素D | 18 ng/mL | 22 ng/mL | 30-100 | 20% | ⚠️ 改善中 |
| 钠摄入 | 2800mg | 2100mg | <2300 | 100% | ✅ 达标 |
| Omega-3 | 150mg | 850mg | 500-1000mg | 100% | ✅ 达标 |

---

**报告生成时间**：2025-06-20
**分析周期**：2025-03-20 至 2025-06-20（90天）
**数据记录数**：90天
**营养分析器版本**：v1.0
```

---

## 数据结构

### 饮食记录数据

```json
{
  "date": "2025-06-20",
  "meals": [
    {
      "type": "breakfast",
      "time": "07:30",
      "foods": ["鸡蛋", "牛奶", "全麦面包"],
      "calories": 450,
      "macronutrients": {
        "protein_g": 20,
        "carbs_g": 55,
        "fat_g": 15,
        "fiber_g": 5,
        "saturated_fat_g": 5,
        "monounsaturated_fat_g": 6,
        "polyunsaturated_fat_g": 3,
        "trans_fat_g": 0.1
      },
      "micronutrients": {
        "vitamin_a_mcg": 150,
        "vitamin_c_mg": 5,
        "vitamin_d_mcg": 1.5,
        "vitamin_e_mg": 1,
        "vitamin_k_mcg": 5,
        "thiamine_mg": 0.3,
        "riboflavin_mg": 0.4,
        "niacin_mg": 4,
        "vitamin_b6_mg": 0.1,
        "folate_mcg": 30,
        "vitamin_b12_mcg": 0.6,
        "calcium_mg": 250,
        "iron_mg": 2,
        "magnesium_mg": 40,
        "phosphorus_mg": 200,
        "zinc_mg": 2,
        "selenium_mcg": 10,
        "potassium_mg": 350,
        "sodium_mg": 300
      },
      "special_nutrients": {
        "omega_3_g": 0.1,
        "choline_mg": 150
      }
    }
  ],
  "daily_summary": {
    "total_calories": 2000,
    "total_macronutrients": {
      "protein_g": 80,
      "carbs_g": 250,
      "fat_g": 65,
      "fiber_g": 30
    },
    "rda_achievement": {
      "protein": 100,
      "vitamin_c": 85,
      "vitamin_d": 35,
      "calcium": 90,
      "iron": 75
    },
    "goal_achieved": true
  }
}
```

---

## 算法说明

### RDA达成率计算

```python
def calculate_rda_achievement(actual_intake, rda_value, ul_value=None):
    """
    计算RDA达成率和状态

    参数：
    - actual_intake: 实际摄入量
    - rda_value: 推荐膳食供给量
    - ul_value: 可耐受最高摄入量（可选）

    返回：
    - achievement_rate: 达成率百分比
    - status: 状态标签
    """
    achievement_rate = (actual_intake / rda_value) * 100

    if ul_value and actual_intake > ul_value:
        status = "exceeds_ul"
        category = "过量（危险）"
    elif achievement_rate < 50:
        status = "severe_deficiency"
        category = "严重缺乏"
    elif achievement_rate < 75:
        status = "insufficient"
        category = "不足"
    elif achievement_rate < 100:
        status = "approaching_target"
        category = "接近目标"
    elif achievement_rate <= 150:
        status = "adequate"
        category = "充足"
    else:
        status = "high_intake"
        category = "较高"

    return {
        'achievement_rate': round(achievement_rate, 1),
        'status': status,
        'category': category
    }
```

### 营养密度评分

```python
def calculate_nutrient_density_score(meal_data):
    """
    计算食物营养密度评分（0-10分）

    因素权重：
    - 维生素达成率：40%
    - 矿物质达成率：30%
    - 膳食纤维：20%
    - 限制性营养素（饱和脂肪、钠、添加糖）：10%
    """
    score = 0

    # 维生素评分
    vitamin_achievements = [
        meal_data['micronutrients'][v] / RDA[v]
        for v in ['vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k']
    ]
    vitamin_score = min(sum(vitamin_achievements) / len(vitamin_achievements), 1.5) * 10
    score += min(vitamin_score, 10) * 0.40

    # 矿物质评分
    mineral_achievements = [
        meal_data['micronutrients'][m] / RDA[m]
        for m in ['calcium', 'iron', 'magnesium', 'zinc']
    ]
    mineral_score = min(sum(mineral_achievements) / len(mineral_achievements), 1.5) * 10
    score += min(mineral_score, 10) * 0.30

    # 膳食纤维评分
    fiber_score = min(meal_data['macronutrients']['fiber_g'] / 5, 2) * 10
    score += min(fiber_score, 10) * 0.20

    # 限制性营养素扣分
    penalty = 0
    if meal_data['macronutrients']['saturated_fat_g'] > 10:
        penalty += 2
    if meal_data['micronutrients']['sodium_mg'] > 600:
        penalty += 2
    if meal_data.get('added_sugars_g', 0) > 10:
        penalty += 2

    score = max(0, score - penalty * 0.10)

    return round(score, 1)
```

### 健康饮食指数评分

```python
def calculate_healthy_eating_index(daily_data):
    """
    计算健康饮食指数（HEI-2015改编）

    评分范围：0-100分
    """
    score = 0

    # 充足性成分（满分50分）
    # 1. 水果（5分）
    fruit_servings = daily_data['fruit_servings']
    score += min(fruit_servings, 2.5) * 2

    # 2. 蔬菜（5分）
    veg_servings = daily_data['vegetable_servings']
    score += min(veg_servings, 3) * 1.67

    # 3. 全谷物（10分）
    whole_grains_oz = daily_data['whole_grains_oz']
    score += min(whole_grains_oz, 3) * 3.33

    # 4. 乳制品（10分）
    dairy_servings = daily_data['dairy_servings']
    score += min(dairy_servings, 3) * 3.33

    # 5. 蛋白质（5分）
    protein_oz = daily_data['protein_oz']
    score += min(protein_oz, 5) * 1

    # 6. 海鲜/植物蛋白（5分）
    plant_protein_oz = daily_data['plant_protein_oz']
    score += min(plant_protein_oz, 2) * 2.5

    # 7. 脂肪酸比例（10分）
    fat_ratio = daily_data['unsaturated_fat_g'] / max(daily_data['saturated_fat_g'], 1)
    score += min(fat_ratio, 2.5) * 4

    # 适度性成分（满分40分，反向计分）
    # 8. 精制谷物（10分，越少越好）
    refined_grains_oz = daily_data['refined_grains_oz']
    score += max(10 - refined_grains_oz * 2, 0)

    # 9. 钠（10分，越少越好）
    sodium_g = daily_data['sodium_mg'] / 1000
    score += max(10 - sodium_g * 2, 0)

    # 10. 添加糖（10分，越少越好）
    added_sugars_pct = daily_data['added_sugars_g'] / (daily_data['total_calories'] / 100)
    score += max(10 - added_sugars_pct * 10, 0)

    # 11. 饱和脂肪（10分，越少越好）
    saturated_fat_pct = daily_data['saturated_fat_g'] / (daily_data['total_calories'] / 100)
    score += max(10 - saturated_fat_pct * 10, 0)

    return round(score, 1)
```

---

## 医学安全边界

⚠️ **重要声明**

本分析仅供健康参考，不构成医疗诊断或营养处方。

### 分析能力范围

✅ **能做到**：
- 营养数据统计和分析
- 趋势识别和可视化
- RDA达成率计算
- 营养缺乏风险评估
- 一般性营养建议
- 补充剂相互作用检查

❌ **不做到**：
- 诊断营养缺乏疾病
- 开具补充剂处方
- 替代注册营养师
- 处理严重营养不良
- 评估食物过敏

### 危险信号检测

在分析过程中检测以下危险信号：

1. **营养素过量**：
   - 维生素A > 3000μg（长期）
   - 维生素D > 100μg（长期）
   - 铁 > 45mg（长期）
   - 硒 > 400μg
   - 钠 > 2300mg（持续）

2. **营养素缺乏**：
   - 维生素D < 10μg/天（血清<12 ng/mL）
   - 维生素B12 < 1.5μg/天（素食者）
   - 铁 < 6mg/天（育龄女性）
   - 钙 < 500mg/天

3. **能量摄入异常**：
   - 持续<1200卡/天（可能营养不良）
   - 持续>3500卡/天（可能超重）

4. **饮食模式异常**：
   - 膳食纤维<10g/天
   - 添加糖>25%热量
   - 饱和脂肪>15%热量

### 建议分级

**Level 1: 一般性建议**
- 基于DRIs/RDA标准
- 适用于一般人群
- 无需医疗监督

**Level 2: 参考性建议**
- 基于用户数据和健康状况
- 需结合个人情况
- 建议咨询营养师

**Level 3: 医疗建议**
- 涉及疾病管理或补充剂
- 需医生确认
- 不得自行调整药物剂量

---

## 参考资源

- 中国居民膳食营养素参考摄入量 (DRIs)：http://www.cnsoc.org/
- 美国膳食指南：https://www.dietaryguidelines.gov/
- USDA FoodData Central：https://fooddatacentral.usda.gov/
- WHO营养建议：https://www.who.int/nutrition/
- 补充剂相互作用数据库：https://naturalmedicines.therapeuticresearch.com/

---

**技能版本**: v1.0
**创建日期**: 2026-01-06
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
