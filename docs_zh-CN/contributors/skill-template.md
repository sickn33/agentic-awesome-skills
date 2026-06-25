---
name: your-skill-name
description: "简要一句话描述这个技能的作用（200字符以内）"
category: your-category
risk: safe
source: community
date_added: "YYYY-MM-DD"
author: your-name-or-handle
tags: [tag-one, tag-two]
tools: [claude, cursor, gemini]
---

# 技能标题

## 概述

简要说明这个技能的作用以及它为什么存在。
2-4句话最合适。

## 何时使用此技能

- 当您需要[场景1]时使用
- 在处理[场景2]时使用
- 当用户询问[场景3]时使用

## 工作原理

### 步骤1：[操作]

详细说明...

### 步骤2：[操作]

更多说明...

## 示例

### 示例1：[用例]

```javascript
// 示例代码或说明
```

### 示例2：[用例]

```python
# Python示例代码
```

## 最佳实践

- 实践建议1
- 实践建议2
- 避免的陷阱

## 相关技能

- `@related-skill-1` - 相关说明
- `@related-skill-2` - 相关说明

## 常见问题

**Q: 常见问题？**
A: 详细回答...

## 限制和注意事项

- 限制1
- 限制2
- 注意事项

---

## 技能模板使用指南

### 📋 前置内容字段说明

**必需字段：**

- `name`: 技能名称（小写，连字符分隔）
- `description`: 一句话技能描述（200字符以内，以中文引号包围）
- `category`: 技能分类（见下方分类列表）
- `risk`: 风险级别（none/safe/critical/offensive/unknown）
- `source`: 来源（community/official/self）
- `date_added`: 添加日期（YYYY-MM-DD格式）

**外部 GitHub 来源必需字段：**

- `source_repo`: 上游仓库（OWNER/REPO）
- `source_type`: README 来源致谢分组（official/community/self）

**可选字段：**

- `author`: 作者名称或handle
- `tags`: 标签列表（最大5个）
- `tools`: 支持的工具列表（claude/cursor/gemini/codex/antigravity等）

**示例：**
```yaml
---
name: react-patterns
description: "React组件设计和状态管理的最佳实践"
category: development
risk: safe
source: community
date_added: "2024-01-15"
author: zhangsan
tags: [react, frontend, patterns, components]
tools: [claude, cursor, gemini]
---
```

### 🎯 技能分类列表

**开发类：**
- `development` - 通用开发
- `frontend` - 前端开发
- `backend` - 后端开发
- `mobile` - 移动开发
- `testing` - 测试
- `devops` - DevOps

**架构类：**
- `architecture` - 系统架构
- `design` - 设计模式
- `database` - 数据库设计
- `api` - API设计

**安全类：**
- `security` - 安全审计
- `pen-testing` - 渗透测试
- `compliance` - 合规检查
- `cryptography` - 加密

**AI类：**
- `ai` - 人工智能
- `machine-learning` - 机器学习
- `prompt-engineering` - 提示工程
- `data-science` - 数据科学

**工具类：**
- `git` - Git操作
- `productivity` - 生产力
- `documentation` - 文档编写
- `deployment` - 部署

**业务类：**
- `product` - 产品管理
- `planning` - 项目规划
- `communication` - 沟通协作
- `research` - 研究分析

### ⚠️ 风险级别定义

**unknown（未知）：**
- 遗留或未分类内容；新技能应尽量避免使用

**none（无风险）：**
- 纯文本或推理指导

**safe（安全）：**
- 代码审查和设计建议
- 文档编写和规范指导
- 只读命令或低风险操作流程

**critical（关键）：**
- 系统修改和配置更改
- 数据处理和转换
- 自动化脚本执行

**offensive（进攻性）：**
- Pentesting 或 red-team 技术
- 必须包含 Authorized Use Only 警告

### 🏷️ 标签规范

**命名规则：**
- 小写字母
- 连字符分隔
- 避免特殊字符
- 最多5个标签

**常用标签：**
- 技术标签：`react`, `python`, `aws`, `kubernetes`
- 概念标签：`patterns`, `security`, `performance`, `testing`
- 领域标签：`frontend`, `backend`, `mobile`, `api`

### 🛠️ 工具支持

**支持的工具：**
- `claude` - Claude Code
- `cursor` - Cursor IDE
- `gemini` - Gemini CLI
- `codex` - Codex CLI
- `antigravity` - Antigravity IDE
- `opencode` - OpenCode CLI
- `kiro` - Kiro CLI

### 📝 内容结构指南

**必需章节：**

1. **概述（Overview）**
   - 2-4句话说明技能作用
   - 解释为什么需要这个技能

2. **何时使用（When to Use This Skill）**
   - 具体的使用场景
   - 使用条件说明

3. **工作原理（How It Works）**
   - 逐步操作说明
   - 清晰的执行流程

**可选章节：**

4. **示例（Examples）**
   - 具体使用示例
   - 代码片段或配置

5. **最佳实践（Best Practices）**
   - 推荐的用法
   - 避免的陷阱

6. **相关技能（Related Skills）**
   - 相关的其他技能
   - 技能组合建议

7. **常见问题（FAQ）**
   - 常见问题和解答
   - 故障排除指南

8. **限制和注意事项（Limitations）**
   - 技能的限制
   - 使用注意事项

### ✅ 质量检查清单

**内容质量：**
- [ ] 描述清晰准确
- [ ] 示例可运行
- [ ] 文档完整
- [ ] 语言简洁明了

**格式规范：**
- [ ] 前置内容完整
- [ ] 分类正确
- [ ] 标签合适
- [ ] 工具支持明确

**技术质量：**
- [ ] 指导可执行
- [ ] 最佳实践遵循
- [ ] 安全考虑周全
- [ ] 错误处理合理

### 🚀 提交指南

**文件命名：**
- 使用小写字母和连字符
- 不要包含特殊字符
- 目录名与技能名称一致
- 文件名为：`SKILL.md`

**目录结构：**
```
skills/
├── skill-name/
│   ├── SKILL.md
│   ├── examples/
│   │   ├── example1.md
│   │   └── example2.md
│   └── scripts/
│       └── helper-script.py
```

**提交流程：**
1. Fork仓库
2. 创建技能目录
3. 编写SKILL.md文件
4. 添加示例和脚本（可选）
5. 运行验证：`npm run validate`
6. 提交Pull Request

### 📞 获取帮助

**资源链接：**
- 📋 [技能结构详细说明](skill-anatomy.md)
- 🎯 [质量标准](quality-bar.md)
- 🤝 [社区讨论](https://github.com/sickn33/antigravity-awesome-skills/discussions)
- 🐛 [问题报告](https://github.com/sickn33/antigravity-awesome-skills/issues)

**联系方式：**
- 📧 skills@antigravity-skills.org
- 💬 Discord: #技能贡献频道

---

## 🎉 开始贡献

感谢您考虑为Antigravity Awesome Skills贡献！使用这个模板，您可以帮助创建高质量、一致性的技能，让整个社区受益。

如果您有任何疑问或需要指导，请随时联系我们。

**期待您的贡献！** 🚀
