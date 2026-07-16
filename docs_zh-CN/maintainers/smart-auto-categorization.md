# 智能自动分类指南

## 概述

技能集合现在使用智能自动分类来消除"未分类"，并根据内容将技能组织成有意义的类别。

## 当前状态

✅ 当前仓库通过生成的目录索引
- 大多数技能都在有意义的类别中
- 较小的尾部仍需要手动审查或更好的关键词覆盖
- `skills_index.json` 是当前类别标签和计数的事实来源
- 类别过滤器应在构建时从生成索引派生

## 类别分布

不要把固定计数复制到面向用户的文档中。要查看当前分布，请从索引生成：

```bash
node - <<'NODE'
const fs = require('fs');
const skills = JSON.parse(fs.readFileSync('skills_index.json', 'utf8'));
const counts = new Map();
for (const skill of skills) {
  const category = skill.category || 'uncategorized';
  counts.set(category, (counts.get(category) || 0) + 1);
}
console.log(`skills=${skills.length} categories=${counts.size}`);
for (const [category, count] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`${category}: ${count}`);
}
NODE
```

## 工作原理

### 1. **基于关键词的分析**
系统分析技能名称和描述中的关键词:
- **Backend**: nodejs、express、fastapi、django、server、api、database
- **Web Dev**: react、vue、angular、frontend、css、html、tailwind
- **AI/ML**: ai、machine learning、tensorflow、nlp、gpt
- **DevOps**: docker、kubernetes、ci/cd、deploy
- 更多...

### 2. **优先级系统**
前置元数据类别 > 检测到的关键词 > 回退（未分类）

如果技能已经有前置元数据类别，则保留该类别。

### 3. **基于范围的匹配**
- 完全短语匹配的权重是部分匹配的 2 倍
- 使用单词边界以避免误报

## 使用自动分类

### 对未分类技能运行
```bash
python tools/scripts/auto_categorize_skills.py
```

### 首先预览更改（试运行）
```bash
python tools/scripts/auto_categorize_skills.py --dry-run
```

### 输出
```
======================================================================
AUTO-CATEGORIZATION REPORT
======================================================================

Summary:
   ✅ Categorized: 776
   ⏭️  Already categorized: 46
   ❌ Failed to categorize: 124
   📈 Total processed: full repository

Sample changes:
   • 3d-web-experience
     uncategorized → web-development
   • ab-test-setup
     uncategorized → testing
   • agent-framework-azure-ai-py
     uncategorized → backend
```

## Web 应用程序改进

### 类别过滤器
**之前:**
- 包括"未分类"的无序列表
- 没有类别大小指示

**之后:**
- 类别按技能数量排序（最多的在前，"未分类"最后）
- 显示从生成索引计算出的计数，而不是文档中的硬编码数字
- 更易于浏览

### 示例下拉菜单

**排序顺序:**
1. All Categories
2. 技能数最高的生成类别
3. 下一个生成类别
4. ... 更多生成类别 ...
5. Uncategorized（如果存在）放在最后

## 对于技能创建者

### 添加新技能时

在前置元数据中包含类别:
```yaml
---
name: my-skill
description: "..."
category: web-development
date_added: "2026-03-06"
---
```

### 如果您不确定

系统将在下次索引重新生成时自动分类:
```bash
python tools/scripts/generate_index.py
```

## 关键词参考

按类别可用的自动分类关键词:

**Backend**: nodejs、node.js、express、fastapi、django、flask、spring、java、python、golang、rust、server、api、rest、graphql、database、sql、mongodb

**Web Development**: react、vue、angular、html、css、javascript、typescript、frontend、tailwind、bootstrap、webpack、vite、pwa、responsive、seo

**Database**: database、sql、postgres、mysql、mongodb、firestore、redis、orm、schema

**AI/ML**: ai、machine learning、ml、tensorflow、pytorch、nlp、llm、gpt、transformer、embedding、training

**DevOps**: docker、kubernetes、ci/cd、git、jenkins、terraform、ansible、deploy、container、monitoring

**Cloud**: aws、azure、gcp、serverless、lambda、storage、cdn

**Security**: encryption、cryptography、jwt、oauth、authentication、authorization、vulnerability

**Testing**: test、jest、mocha、pytest、cypress、selenium、unit test、e2e

**Mobile**: mobile、react native、flutter、ios、android、swift、kotlin

**Automation**: automation、workflow、scripting、robot、trigger、integration

**Game Development**: game、unity、unreal、godot、threejs、2d、3d、physics

**Data Science**: data、analytics、pandas、numpy、statistics、visualization

## 自定义

### 添加自定义关键词

编辑 [`tools/scripts/auto_categorize_skills.py`](../../tools/scripts/auto_categorize_skills.py):

```python
CATEGORY_KEYWORDS = {
    'your-category': [
        'keyword1', 'keyword2', 'exact phrase', 'another-keyword'
    ],
    # ... 其他类别
}
```

然后重新运行:
```bash
python tools/scripts/auto_categorize_skills.py
python tools/scripts/generate_index.py
```

## 故障排除

### "分类失败"的技能

某些技能可能太通用或独特。您可以:

1. **在技能的前置元数据中手动设置类别**:
```yaml
category: your-chosen-category
```

2. **向 CATEGORY_KEYWORDS 配置添加关键词**

3. **移动到文件夹**（如果它适合更广泛的类别）:
```
skills/backend/my-new-skill/SKILL.md
```

### 重新生成索引

对 SKILL.md 文件进行更改后:
```bash
python tools/scripts/generate_index.py
```

这将:
- 解析前置元数据类别
- 回退到文件夹结构
- 生成新的 skills_index.json
- 复制到 apps/web-app/public/skills.json

## 后续步骤

1. **在 Web 应用程序中测试**: 尝试改进的类别过滤器
2. **添加缺失的关键词**: 如果某些技能仍未分类
3. **组织剩余的未分类技能**: 自动分配或手动审查
4. **监控增长**: 使用报告来跟踪新技能与已分类技能

---

**结果**: 更清晰的类别过滤器，具有智能、有意义的组织！🎉
