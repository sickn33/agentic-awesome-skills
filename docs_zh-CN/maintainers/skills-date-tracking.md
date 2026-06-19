# 技能日期跟踪指南

本指南介绍如何使用新的 `date_added` 功能来跟踪技能的创建或添加到集合的时间。

## 概述

技能前置元数据中的 `date_added` 字段允许您跟踪每个技能的创建时间。这对于以下情况很有用:

- **版本控制**: 了解技能的年龄和成熟度
- **变更日志生成**: 随时间跟踪新技能
- **报告**: 分析技能集合增长
- **组织**: 按创建日期对技能进行分组

## 格式

`date_added` 字段使用 ISO 8601 日期格式: **YYYY-MM-DD**

```yaml
---
name: my-skill-name
description: "Brief description"
date_added: "2024-01-15"
---
```

## 快速开始

### 1. 查看所有技能及其日期

```bash
python tools/scripts/manage_skill_dates.py list
```

输出示例:
```
📅 Skills with Date Added (example):
============================================================
  2025-02-26  │  recent-skill
  2025-02-20  │  another-new-skill
  2024-12-15  │  older-skill
  ...

⏳ Skills without Date Added (example):
============================================================
  some-legacy-skill
  undated-skill
  ...

📊 Coverage: example output only
```

### 2. 添加缺失的日期

将今天的日期添加到所有没有 `date_added` 字段的技能:

```bash
python tools/scripts/manage_skill_dates.py add-missing
```

或指定自定义日期:

```bash
python tools/scripts/manage_skill_dates.py add-missing --date 2026-03-06
```

### 3. 添加/更新所有技能

一次为所有技能设置日期:

```bash
python tools/scripts/manage_skill_dates.py add-all --date 2026-03-06
```

### 4. 更新单个技能

更新特定技能的日期:

```bash
python tools/scripts/manage_skill_dates.py update my-skill-name 2026-03-06
```

### 5. 生成报告

生成包含其元数据的所有技能的 JSON 报告:

```bash
python tools/scripts/generate_skills_report.py
```

保存到文件:

```bash
python tools/scripts/generate_skills_report.py --output skills_report.json
```

按名称排序:

```bash
python tools/scripts/generate_skills_report.py --sort name --output sorted_skills.json
```

## 在您的工作流中使用

### 创建新技能时

将 `date_added` 字段添加到您的 SKILL.md 前置元数据:

```yaml
---
name: new-awesome-skill
description: "Does something awesome"
date_added: "2026-03-06"
---
```

### 自动添加

当载入许多技能时，使用:

```bash
python tools/scripts/manage_skill_dates.py add-missing --date 2026-03-06
```

这会将今天的日期添加到所有缺少该字段的技能。

### 验证

验证器现在检查 `date_added` 格式:

```bash
# 运行操作验证器
npm run validate

# 可选的加固通过
npm run validate:strict

# 参考验证
npm run validate:references

# 运行冒烟测试
npm test
```

这些检查会捕获无效日期、损坏的引用和相关回归。

## 生成的报告

`generate_skills_report.py` 脚本生成包含统计数据的 JSON 报告:

```json
{
  "generated_at": "2026-03-06T10:30:00.123456",
  "total_skills": 1234,
  "skills_with_dates": 1200,
  "skills_without_dates": 34,
  "coverage_percentage": 97.2,
  "sorted_by": "date",
  "skills": [
    {
      "id": "recent-skill",
      "name": "recent-skill",
      "description": "A newly added skill",
      "date_added": "2026-03-06",
      "source": "community",
      "risk": "safe",
      "category": "recent"
    },
    ...
  ]
}
```

将其用于:
- 仪表板显示
- 增长指标
- 自动化报告
- 分析

## 与 CI/CD 集成

添加到您的管道:

```bash
# 在 pre-commit 或 CI 管道中
npm run validate
npm run validate:references

# 生成统计报告
python tools/scripts/generate_skills_report.py --output reports/skills_report.json
```

## 最佳实践

1. **使用一致的格式**: 始终使用 `YYYY-MM-DD`
2. **使用真实日期**: 尽可能反映实际技能创建日期
3. **在创建时更新**: 在创建新技能时添加日期
4. **定期验证**: 运行验证器以捕获格式错误
5. **查看报告**: 使用生成的报告来了解集合趋势

## 故障排除

### "Invalid date_added format"

确保日期采用 `YYYY-MM-DD` 格式:
- ✅ 正确: `2024-01-15`
- ❌ 错误: `01/15/2024` 或 `2024-1-15`

### 未找到脚本

确保您从项目根目录运行:
```bash
cd path/to/antigravity-awesome-skills
python tools/scripts/manage_skill_dates.py list
```

### 未找到 Python

从 [python.org](https://python.org/) 安装 Python 3.x

## 相关文档

- [`../contributors/skill-anatomy.md`](../contributors/skill-anatomy.md) - 完整技能结构指南
- [`skills-update-guide.md`](skills-update-guide.md) - 如何更新技能集合
- [`../contributors/examples.md`](../contributors/examples.md) - 示例技能

## 有问题或问题？

参见 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解贡献指南。
