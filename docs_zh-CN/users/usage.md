# 使用指南：如何实际使用这些技能

> **安装后感到困惑？**本指南将一步步指导你接下来该做什么。

---

## "我刚刚安装了仓库。现在该怎么办？"

好问题！以下是刚刚发生的事情和接下来的步骤：

### 你刚刚做了什么

当你运行 `npx antigravity-awesome-skills` 或克隆仓库时，你：

✅ **下载了 1,436+ 个技能文件**到你的计算机（默认路径：`~/.gemini/antigravity/skills/`；如果你使用了 `--path`，则是自定义路径如 `~/.agent/skills/`）
✅ **使它们对你的 AI 助手可用**
❌ **并未自动启用所有技能**（它们只是在那里等待使用）

把它想象成安装一个工具箱。你现在拥有所有工具，但你需要为每项工作**选择使用哪些工具**。

---

## 步骤 1：理解"捆绑包"（这不是另一次安装！）

**常见困惑：**"我需要分别下载每个技能吗？"

**答案：不需要！**以下是捆绑包的实际含义：

### 捆绑包是什么

捆绑包是按角色分组的技能**推荐列表**。它们帮助你决定开始使用哪些技能。

**类比：**

- 你安装了一个包含 1,436+ 个工具的工具箱（✅ 完成）
- 捆绑包就像**贴有标签的整理托盘**，上面写着："如果你是木匠，从这 10 个工具开始"
- 你不需要安装捆绑包——你从它们中**选择技能**

### 捆绑包不是什么

❌ 单独的安装
❌ 不同的下载命令
❌ 大多数用户在正常安装期间需要激活的东西
❌ 可调用的超级技能，如 `@essentials` 或 `/web-wizard`

### 示例："Web Wizard" 捆绑包

当你看到 [Web Wizard 捆绑包](bundles.md#-the-web-wizard-pack)时，它列出了：

- `frontend-design`
- `react-best-practices`
- `tailwind-patterns`
- 等等

这些是关于 Web 开发人员应该首先尝试哪些技能的**推荐**。它们已经安装了——你只需要**在你的提示词中使用它们**。

如果你想在 Antigravity 中一次只激活一个捆绑包，请使用激活脚本，而不是尝试直接调用捆绑包名称：

```bash
./scripts/activate-skills.sh --clear Essentials
./scripts/activate-skills.sh --clear "Web Wizard"
```

---

## 步骤 2：如何实际执行/使用技能

这是本应该更好地解释的部分！以下是使用技能的方法：

### 简单答案

**只需在与 AI 助手的对话中提及技能名称。**

### 不同的工具，不同的语法

确切的语法因工具而异，但总是很简单：

#### Claude Code (CLI)

```bash
# 在你的终端/与 Claude Code 的聊天中：
>> Use @brainstorming to help me design a todo app
```

#### Cursor (IDE)

```bash
# 在 Cursor 聊天面板中：
@brainstorming help me design a todo app
```

#### Gemini CLI

```bash
# 在你与 Gemini 的对话中：
Use the brainstorming skill to help me plan my app
```

如果 Gemini CLI 在几轮对话后开始挂起，请尝试一个新对话，并暂时将活动集减少到只有 2-5 个技能，以排除上下文增长的问题。

#### Codex CLI

```bash
# 在你与 Codex 的对话中：
Apply @brainstorming to design a new feature
```

#### Antigravity IDE

```bash
# 在代理模式下：
Use @brainstorming to plan this feature
```

> **专业提示：**大多数现代工具使用 `@skill-name` 语法。如有疑问，先试试这个！

---

## 步骤 3：我的提示词应该是什么样的？

以下是**真实示例**的良好提示词：

### 示例 1：开始一个新项目

**糟糕的提示词：**

> "Help me build a todo app"

**良好的提示词：**

> "Use @brainstorming to help me design a todo app with user authentication and cloud sync"

**为什么更好：**你明确调用了技能并提供了上下文。

---

### 示例 2：审查代码

**糟糕的提示词：**

> "Check my code"

**良好的提示词：**

> "Use @lint-and-validate to check `src/components/Button.tsx` for issues"

**为什么更好：**特定技能 + 特定文件 = 精确结果。

---

### 示例 3：安全审计

**糟糕的提示词：**

> "Make my API secure"

**良好的提示词：**

> "Use @api-security-best-practices to review my REST endpoints in `routes/api/users.js`"

**为什么更好：**AI 知道确切要应用哪个技能的标准。

---

### 示例 4：组合多个技能

**良好的提示词：**

> "Use @brainstorming to design a payment flow, then apply @stripe-integration to implement it"

**为什么好：**你可以在单个提示词中链接技能！

---

## 步骤 4：你的第一个技能（动手教程）

让我们现在实际使用一个技能。按照以下步骤操作：

### 场景：你想规划一个新功能

1. **选择一个技能：**让我们使用 `brainstorming`（来自"Essentials"捆绑包）

2. **打开你的 AI 助手**（Claude Code、Cursor 等）

3. **输入这个确切的提示词：**

   ```
   Use @brainstorming to help me design a user profile page for my app
   ```

4. **按 Enter 键**

5. **接下来会发生什么：**
   - AI 加载 brainstorming 技能
   - 它将开始向你提出结构化问题（一次一个）
   - 它将引导你完成理解、需求和设计
   - 你回答每个问题，它构建完整的规范

6. **结果：**你最终会得到一个详细的设计文档——还没有写一行代码！

---

## 步骤 5：选择你的前几个技能（实用建议）

不要试图一次使用所有 1,436+ 个技能。这里有一个明智的方法：

如果在选择技能之前你需要特定于工具的起点，请使用：

- [Claude Code 技能](claude-code-skills.md)
- [Cursor 技能](cursor-skills.md)
- [Codex CLI 技能](codex-cli-skills.md)
- [Gemini CLI 技能](gemini-cli-skills.md)

### 从"Essentials"开始（5 个技能，每个人都需要这些）

1. **`@brainstorming`** - 在构建之前规划
2. **`@lint-and-validate`** - 保持代码整洁
3. **`@git-pushing`** - 安全地保存工作
4. **`@systematic-debugging`** - 更快地修复错误
5. **`@concise-planning`** - 组织任务

**如何使用它们：**

- 在编写新代码之前 → `@brainstorming`
- 编写代码之后 → `@lint-and-validate`
- 在提交之前 → `@git-pushing`
- 当卡住时 → `@systematic-debugging`

### 然后添加特定于角色的技能（再添加 5-10 个）

在 [bundles.md](bundles.md) 中找到你的角色，并从该捆绑包中选择 5-10 个技能。

**Web 开发人员示例：**

- `@frontend-design`
- `@react-best-practices`
- `@tailwind-patterns`
- `@seo-audit`

**安全工程师示例：**

- `@api-security-best-practices`
- `@vulnerability-scanner`
- `@ethical-hacking-methodology`

### 最后，按需添加即时技能

将 [CATALOG.md](../../CATALOG.md) 保持打开作为参考。当你需要特定的东西时：

> "我需要集成 Stripe 付款"
> → 搜索目录 → 找到 `@stripe-integration` → 使用它！

---

## 完整示例：端到端构建功能

让我们通过一个现实场景来完成：

### 任务："为我的 Next.js 网站添加博客"

#### 步骤 1：规划（使用 @brainstorming）

```
You: Use @brainstorming to design a blog system for my Next.js site

AI: [询问关于需求的结构化问题]
You: [回答问题]
AI: [生成详细的设计规范]
```

#### 步骤 2：实现（使用 @nextjs-best-practices）

```
You: Use @nextjs-best-practices to scaffold the blog with App Router

AI: [创建文件结构，设置路由，添加组件]
```

#### 步骤 3：样式（使用 @tailwind-patterns）

```
You: Use @tailwind-patterns to make the blog posts look modern

AI: [应用 Tailwind 样式和响应式设计]
```

#### 步骤 4：SEO（使用 @seo-audit）

```
You: Use @seo-audit to optimize the blog for search engines

AI: [添加 meta 标签、站点地图、结构化数据]
```

#### 步骤 5：测试和部署

```
You: Use @test-driven-development to add tests, then @vercel-deployment to deploy

AI: [创建测试，设置 CI/CD，部署到 Vercel]
```

**结果：**使用最佳实践构建的专业博客，无需手动研究每个步骤！

---

## 常见问题

### "我应该使用哪个工具？Claude Code、Cursor、Gemini？"

**任何一个都可以！**技能通用适用。选择你已经使用或喜欢的工具：

- **Claude Code** - 最适合终端/CLI 工作流
- **Cursor** - 最适合 IDE 集成
- **Gemini CLI** - 最适合 Google 生态系统
- **Codex CLI** - 最适合 OpenAI 生态系统

### "我可以查看所有可用的技能吗？"

可以！三种方式：

1. 浏览 [CATALOG.md](../../CATALOG.md)（可搜索列表）
2. 运行 `ls ~/.gemini/antigravity/skills/`（或你的实际安装路径）
3. 询问你的 AI："你有哪些关于[主题]的技能？"

### "安装后我需要重启 IDE 吗？"

通常不需要，但如果你的 AI 无法识别技能：

1. 尝试重启你的 IDE/CLI
2. 检查安装路径是否与你的工具匹配
3. 尝试显式路径：`npx antigravity-awesome-skills --claude`（或 `--cursor`、`--gemini` 等）

### "我可以一次将所有技能加载到模型中吗？"

不可以。即使你在本地安装了 1,436+ 个技能，你**不应该**将每个 `SKILL.md` 连接到单个系统提示词或上下文块中。

预期的模式是：

- 使用 `data/skills_index.json`（清单）来发现存在哪些技能；以及
- 仅为你实际在对话中使用的特定 `@skill-id` 值加载 `SKILL.md` 文件。

如果你正在构建自己的主机/代理（例如 Jetski/Cortex + Gemini），请参阅：

- [`docs/integrations/jetski-cortex.md`](../integrations/jetski-cortex.md)

### "我可以创建自己的技能吗？"

可以！使用 `@skill-creator` 技能：

```
Use @skill-creator to help me build a custom skill for [your task]
```

### "如果技能没有按预期工作怎么办？"

1. 直接在安装路径中检查技能的 `SKILL.md` 文件，例如：`~/.gemini/antigravity/skills/[skill-name]/SKILL.md`
2. 阅读描述以确保你正确使用它
3. [打开问题](https://github.com/sickn33/antigravity-awesome-skills/issues)并提供详细信息

---

## 快速参考卡

**保存此内容以供快速查找：**

| 任务             | 使用的技能                   | 示例提示词                                      |
| ---------------- | ------------------------------ | --------------------------------------------------- |
| 规划新功能 | `@brainstorming`               | `Use @brainstorming to design a login system`       |
| 审查代码      | `@lint-and-validate`           | `Use @lint-and-validate on src/app.js`              |
| 调试问题      | `@systematic-debugging`        | `Use @systematic-debugging to fix login error`      |
| 安全审计   | `@api-security-best-practices` | `Use @api-security-best-practices on my API routes` |
| SEO 检查        | `@seo-audit`                   | `Use @seo-audit on my landing page`                 |
| React 组件  | `@react-patterns`              | `Use @react-patterns to build a form component`     |
| 部署应用       | `@vercel-deployment`           | `Use @vercel-deployment to ship this to production` |

---

## 下一步

既然你了解了如何使用技能：

1. ✅ **现在就尝试一个技能** - 从 `@brainstorming` 开始，尝试任何想法
2. 📚 **从你的角色捆绑包中选择 3-5 个技能**，来自 [bundles.md](bundles.md)
3. 🔖 **将** [CATALOG.md](../../CATALOG.md) **加入书签**，当你需要特定东西时使用
4. 🎯 **从** [workflows.md](workflows.md) **尝试一个工作流**，以获得完整的端到端流程

---

## 最大化效果的专业提示

### 提示 1：使用 @brainstorming 开始每个功能

> 在编写代码之前，使用 `@brainstorming` 进行规划。你将节省数小时的重构时间。

### 提示 2：按顺序链接技能

> 不要试图一次完成所有事情。按顺序使用技能：规划 → 构建 → 测试 → 部署

### 提示 3：在提示词中具体化

> 糟糕："Use @react-patterns"
> 良好："Use @react-patterns to build a modal component with animations"

### 提示 4：引用文件路径

> 帮助 AI 专注："Use @security-auditor on routes/api/auth.js"

### 提示 5：组合技能以完成复杂任务

> "Use @brainstorming to design, then @test-driven-development to implement with tests"

---

## 仍然困惑？

如果有些东西仍然不合理：

1. 查看 [FAQ](faq.md)
2. 查看[真实示例](../contributors/examples.md)
3. [打开讨论](https://github.com/sickn33/antigravity-awesome-skills/discussions)
4. [提交问题](https://github.com/sickn33/antigravity-awesome-skills/issues)以帮助我们改进此指南！

记住：你并不孤单！这个项目的全部意义是让 AI 助手更易于使用。如果本指南没有帮助，请告诉我们，以便我们修复它。🙌
