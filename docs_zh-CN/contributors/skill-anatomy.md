# 技能解剖 - 理解结构

**想了解技能在底层如何工作？** 本指南分解了技能文件的每个部分。

---

## 📁 基本文件夹结构

```
skills/
└── my-skill-name/
    ├── SKILL.md              ← 必需：主要技能定义
    ├── examples/             ← 可选：示例文件
    │   ├── example1.js
    │   └── example2.py
    ├── scripts/              ← 可选：辅助脚本
    │   └── helper.sh
    ├── templates/            ← 可选：代码模板
    │   └── template.tsx
    ├── references/           ← 可选：参考文档
    │   └── api-docs.md
    └── README.md             ← 可选：附加文档
```

**关键规则：**只有 `SKILL.md` 是必需的。其他一切都是可选的！

---

## SKILL.md 结构

每个 `SKILL.md` 文件有两个主要部分：

### 1. 前置元数据（元数据）
### 2. 内容（指令）

让我们分解每个部分：

---

## 第 1 部分：前置元数据

前置元数据在最顶部，用 `---` 包裹：

```markdown
---
name: my-skill-name
description: "简要描述此技能的作用"
risk: safe
source: community
---
```

### 必需字段

#### `name`
- **它是什么：**技能的标识符
- **格式：**小写-带-连字符
- **必须匹配：**文件夹名称完全一致
- **示例：**`stripe-integration`

#### `description`
- **它是什么：**一句话摘要
- **格式：**引号中的字符串
- **长度：**保持在 200 字符以内
- **示例：**`"Stripe 支付集成模式，包括结账、订阅和 Webhook"`

#### `risk`
- **它是什么：**技能的安全分类
- **值：**`none` | `safe` | `critical` | `offensive` | `unknown`
- **示例：**`risk: safe`
- **指南：**
  - `none` — 纯文本/推理，无命令或变更
  - `safe` — 读取文件，运行非破坏性命令
  - `critical` — 修改状态，删除文件，推送到生产环境
  - `offensive` — 渗透测试/红队工具；**必须**包括 "授权使用" 警告
  - `unknown` — 遗留或未分类；新技能优先使用具体级别

#### `source`
- **它是什么：**技能来源的归属
- **格式：**URL 或简短标签
- **示例：**`source: community`、`source: "https://example.com/original"`
- **使用 `"self"`**如果您是原始作者

### 可选字段

某些技能包括附加元数据：

```markdown
---
name: my-skill-name
description: "简要描述"
risk: safe
source: community
author: "your-name-or-handle"
tags: ["react", "typescript", "testing"]
tools: [claude, cursor, gemini]
---
```

---

## 第 2 部分：内容

前置元数据之后是实际的技能内容。这是推荐的结构：

### 推荐的部分

#### 1. 标题（H1）
```markdown
# 技能标题
```
- 使用清晰、描述性的标题
- 通常与技能名称匹配或扩展

#### 2. 概述
```markdown
## 概述

简要解释此技能的作用及其存在原因。
2-4 句话完美。
```

#### 3. 使用时机
```markdown
## 使用此技能的时机

- 当您需要 [场景 1] 时使用
- 在处理 [场景 2] 时使用
- 当用户询问 [场景 3] 时使用
```

**为什么这很重要：**帮助 AI 知道何时激活此技能

#### 4. 核心指令
```markdown
## 工作原理

### 步骤 1：[操作]
详细指令...

### 步骤 2：[操作]
更多指令...
```

**这是技能的核心** - 清晰、可操作的步骤

#### 5. 示例
```markdown
## 示例

### 示例 1：[用例]
\`\`\`javascript
// 示例代码
\`\`\`

### 示例 2：[另一个用例]
\`\`\`javascript
// 更多代码
\`\`\`
```

**为什么示例很重要：**它们向 AI 精确展示良好的输出是什么样的

#### 6. 最佳实践
```markdown
## 最佳实践

- ✅ 这样做
- ✅ 也这样做
- ❌ 不要这样做
- ❌ 避免这个
```

#### 7. 常见陷阱
```markdown
## 常见陷阱

- **问题：**描述
  **解决方案：**如何修复它
```

#### 8. 安全与安全说明（针对命令/网络/攻击性技能）

如果您的技能包括：

- shell 命令或类似命令的示例
- 远程获取/安装或令牌使用指导
- 文件变更、破坏性操作或特权操作

在最终总结之前添加专用部分：

```markdown
## 安全与安全说明

- 这是安全/不安全的范围
- 所需的确认或授权
- 示例允许列表说明（如果需要）：
  `<!-- security-allowlist: ... -->`
```

#### 9. 相关技能
```markdown
## 相关技能

- `@other-skill` - 何时使用此替代
- `@complementary-skill` - 如何协同工作
```

---

## 编写有效的指令

### 使用清晰、直接的语言

**❌ 不佳：**
```markdown
您可能想要考虑检查用户是否有身份验证。
```

**✅ 良好：**
```markdown
在继续之前检查用户是否已通过身份验证。
```

### 使用动作动词

**❌ 不佳：**
```markdown
文件应该被创建...
```

**✅ 良好：**
```markdown
创建文件...
```

### 具体明确

**❌ 不佳：**
```markdown
正确设置数据库。
```

**✅ 良好：**
```markdown
1. 创建 PostgreSQL 数据库
2. 运行迁移：`npm run migrate`
3. 播种初始数据：`npm run seed`
```

---

## 可选组件

### 脚本目录

如果您的技能需要辅助脚本：

```
scripts/
├── setup.sh          ← 设置自动化
├── validate.py       ← 验证工具
└── generate.js       ← 代码生成器
```

**在 SKILL.md 中引用它们：**
```markdown
运行设置脚本：
\`\`\`bash
bash scripts/setup.sh
\`\`\`
```

### 示例目录

展示技能的真实示例：

```
examples/
├── basic-usage.js
├── advanced-pattern.ts
└── full-implementation/
    ├── index.js
    └── config.json
```

### 模板目录

可重用的代码模板：

```
templates/
├── component.tsx
├── test.spec.ts
└── config.json
```

**在 SKILL.md 中引用：**
```markdown
使用此模板作为起点：
\`\`\`typescript
{{#include templates/component.tsx}}
\`\`\`
```

### 参考目录

外部文档或 API 参考：

```
references/
├── api-docs.md
├── best-practices.md
└── troubleshooting.md
```

---

## 技能大小指南

### 最小可行技能
- **前置元数据：**name + description
- **内容：**100-200 字
- **部分：**概述 + 指令

### 标准技能
- **前置元数据：**name + description
- **内容：**300-800 字
- **部分：**概述 + 使用时机 + 指令 + 示例

### 综合技能
- **前置元数据：**name + description + 可选字段
- **内容：**800-2000 字
- **部分：**所有推荐的部分
- **额外：**脚本、示例、模板

**经验法则：**从小处开始，根据反馈扩展

---

## 格式最佳实践

### 有效使用 Markdown

#### 代码块
始终指定语言：
```markdown
\`\`\`javascript
const example = "code";
\`\`\`
```

#### 列表
使用一致的格式：
```markdown
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
```

#### 强调
- **粗体**用于重要术语：`**重要**`
- *斜体*用于强调：`*强调*`
- `代码`用于命令/代码：`` `代码` ``

#### 链接
```markdown
[链接文本](https://example.com)
```

---

## ✅ 质量检查清单

在完成技能之前：

### 内容质量
- [ ] 指令清晰且可操作
- [ ] 示例现实且有帮助
- [ ] 无拼写错误或语法错误
- [ ] 技术准确性已验证

### 结构
- [ ] 前置元数据是有效的 YAML
- [ ] 名称与文件夹名称匹配
- [ ] 部分逻辑组织
- [ ] 标题遵循层次结构（H1 → H2 → H3）

### 完整性
- [ ] 概述解释了"为什么"
- [ ] 指令解释了"如何"
- [ ] 示例展示了"什么"
- [ ] 边缘情况已处理

### 可用性
- [ ] 初学者可以遵循
- [ ] 专家会发现有用
- [ ] AI 可以正确解析
- [ ] 解决实际问题

---

## 🔍 真实示例分析

让我们分析一个真实技能：`brainstorming`

```markdown
---
name: brainstorming
description: "You MUST use this before any creative work..."
---
```

**分析：**
- ✅ 清晰的名称
- ✅ 强有力的描述和紧迫感（"MUST use"）
- ✅ 解释何时使用

```markdown
# Brainstorming Ideas Into Designs

## Overview
Help turn ideas into fully formed designs...
```

**分析：**
- ✅ 清晰的标题
- ✅ 简洁的概述
- ✅ 解释价值主张

```markdown
## The Process

**Understanding the idea:**
- Check out the current project state first
- Ask questions one at a time
```

**分析：**
- ✅ 分解为清晰的阶段
- ✅ 具体、可操作的步骤
- ✅ 易于遵循

---

## 高级模式

### 条件逻辑

```markdown
## 指令

如果用户使用 React：
- 使用函数组件
- 优先使用 hooks 而不是类组件

如果用户使用 Vue：
- 使用组合式 API
- 遵循 Vue 3 模式
```

### 渐进式披露

```markdown
## 基本用法
[常见情况的简单指令]

## 高级用法
[高级用户的复杂模式]
```

### 交叉引用

```markdown
## 相关工作流

1. 首先，使用 `@brainstorming` 进行设计
2. 然后，使用 `@writing-plans` 进行规划
3. 最后，使用 `@test-driven-development` 进行实现
```

---

## 技能有效性指标

如何知道您的技能是否良好：

### 清晰度测试
- 不熟悉该主题的人可以遵循吗？
- 是否有任何模棱两可的指令？

### 完整性测试
- 它覆盖了快乐路径吗？
- 它处理边缘情况吗？
- 错误场景是否已解决？

### 有用性测试
- 它解决了实际问题吗？
- 您自己会使用它吗？
- 它节省时间或提高质量吗？

---

## 从现有技能学习

### 研究这些示例

**初学者：**
- `skills/brainstorming/SKILL.md` - 清晰的结构
- `skills/git-pushing/SKILL.md` - 简单且专注
- `skills/copywriting/SKILL.md` - 良好的示例

**高级：**
- `skills/systematic-debugging/SKILL.md` - 全面
- `skills/react-best-practices/SKILL.md` - 多个文件
- `skills/loki-mode/SKILL.md` - 复杂工作流

---

## 💡 专业提示

1. **从"使用时机"部分开始** - 这阐明了技能的目的
2. **先编写示例** - 它们帮助您理解您在教什么
3. **用 AI 测试** - 在提交之前看看它是否真的有效
4. **获取反馈** - 请其他人审查您的技能
5. **迭代** - 技能根据使用情况随时间改进

---

## 要避免的常见错误

### ❌ 错误 1：太模糊
```markdown
## 指令
使代码更好。
```

**✅ 修复：**
```markdown
## 指令
1. 将重复逻辑提取到函数中
2. 为边缘情况添加错误处理
3. 为核心功能编写单元测试
```

### ❌ 错误 2：太复杂
```markdown
## 指令
[5000 字密集的技术术语]
```

**✅ 修复：**
分解为多个技能或使用渐进式披露

### ❌ 错误 3：无示例
```markdown
## 指令
[没有任何代码示例的指令]
```

**✅ 修复：**
添加至少 2-3 个真实的示例

### ❌ 错误 4：过时信息
```markdown
使用 React 类组件...
```

**✅ 修复：**
使用当前最佳实践更新技能

---

## 🎯 下一步

1. **阅读 3-5 个现有技能**以查看不同的风格
2. **尝试技能模板**来自 [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)
3. **创建一个简单的技能**用于您熟悉的内容
4. **用您的 AI 助手测试它**
5. **通过拉取请求分享**

---

**记住：**每个专家都曾经是初学者。从简单开始，从反馈中学习，并随时间改进！🚀
