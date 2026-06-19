# 日期跟踪实施摘要

本文档解释了在 `apps/` 和 `tools/` 重构之后，`date_added` 支持如何融入当前仓库结构。

## 现有功能

### 前置元数据支持

新技能可以在 `SKILL.md` 前置元数据中包含 `date_added` 字段:

```yaml
---
name: skill-name
description: "Description"
date_added: "2026-03-06"
---
```

### 验证器支持

活跃的验证器理解 `date_added`:

- `tools/scripts/validate_skills.py` 检查 `YYYY-MM-DD` 格式
- 支持的 JS 验证/测试辅助工具在相关的地方知道该字段

### 索引和 Web 应用程序支持

- `tools/scripts/generate_index.py` 将 `date_added` 导出到 `skills_index.json`
- `npm run app:setup` 将生成的索引复制到 `apps/web-app/public/skills.json`
- Web 应用程序可以在 UI 显示它的任何地方渲染该字段

### 维护脚本

- `tools/scripts/manage_skill_dates.py` 管理技能日期
- `tools/scripts/generate_skills_report.py` 从当前技能元数据生成 JSON 报告

## 规范文档

日期跟踪的规范文档现在位于:

- [`skills-date-tracking.md`](skills-date-tracking.md)
- [`../contributors/skill-template.md`](../contributors/skill-template.md)
- [`../contributors/skill-anatomy.md`](../contributors/skill-anatomy.md)

使用这些文件作为真实来源，而不是旧的根级文档名称。

## 常用命令

```bash
# 查看当前日期覆盖范围
python tools/scripts/manage_skill_dates.py list

# 添加缺失的日期
python tools/scripts/manage_skill_dates.py add-missing

# 更新一个技能
python tools/scripts/manage_skill_dates.py update skill-name 2026-03-06

# 生成报告
python tools/scripts/generate_skills_report.py --output reports/skills_report.json
```

## 注意事项

- 随着新的社区技能添加，仓库范围的覆盖范围可能会随时间变化，因此本文档避免硬编码计数
- `date_added` 是有用的元数据，但操作贡献者门槛仍然是 `npm run validate`；严格验证是遗留清理的单独加固目标
