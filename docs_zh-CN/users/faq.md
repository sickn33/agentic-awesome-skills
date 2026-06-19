# 常见问题解答 (FAQ)

**有问题？**你并不孤单！这里是关于 Antigravity Awesome Skills 最常见问题的答案。

---

## 一般问题

### "技能"究竟是什么？

技能是专门的指令文件，用于教 AI 助手如何处理特定任务。将它们想象成你的 AI 可以按需加载的专业知识模块。
**简单类比：**就像你可能咨询不同的专家（律师、医生、机械师），这些技能让你的 AI 在需要时成为不同领域的专家。

### 我需要安装每个技能吗？

**不需要！**当你克隆仓库时，所有技能都可用，但你的 AI 仅在你使用 `@skill-name` 显式调用它们时才加载它们。
这就像拥有一个图书馆 - 所有书籍都在那里，但你只阅读你需要的那本。
**专业提示：**使用 [入门包](bundles.md) 首先专注于与你角色匹配的技能。

### 捆绑包和工作流有什么区别？

- **捆绑包**是按角色或域分类的精选推荐。
- **工作流**是具体结果的有序执行剧本。

当你决定_包括哪些技能_时使用捆绑包。当你需要_逐步执行_时使用工作流。

从以下开始：

- [bundles.md](bundles.md)
- [workflows.md](workflows.md)

### 技能和 MCP 工具有什么区别？

- **技能**是可重用的 `SKILL.md` 剧本，用于指导 AI 助手完成工作流。
- **MCP 工具**是集成或可调用功能，让助手能够与外部系统交互。

当你想要更好的流程、结构和执行质量时使用技能。当你需要访问 API、服务、数据库或其他系统时使用 MCP 工具。当你想要可靠的工作流加上外部功能时，同时使用两者。

有关更长的解释，请阅读 [skills-vs-mcp-tools.md](skills-vs-mcp-tools.md)。

### 哪些 AI 工具可以使用这些技能？

- ✅ **Claude Code** (Anthropic CLI)
- ✅ **Gemini CLI** (Google)
- ✅ **Codex CLI** (OpenAI)
- ✅ **Cursor** (AI IDE)
- ✅ **Antigravity IDE**
- ✅ **OpenCode**
- ✅ **Kiro CLI** (Amazon)
- ✅ **Kiro IDE** (Amazon)
- ✅ **AdaL CLI**
- ⚠️ **GitHub Copilot**（通过复制粘贴部分支持）

### 这些技能可以免费使用吗？

**可以。**原始代码和工具采用 MIT 许可，原始文档/非代码书面内容采用 CC BY 4.0 许可。

- ✅ 免费供个人使用
- ✅ 免费供商业使用
- ✅ 你可以修改它们

有关归属和第三方许可详细信息，请参阅 [../../LICENSE](../../LICENSE)、[../../LICENSE-CONTENT](../../LICENSE-CONTENT) 和 [../sources/sources.md](../sources/sources.md)。

### 这些技能如何避免溢出模型上下文？

一些主机工具（例如，在 Jetski/Cortex + Gemini 上构建的自定义代理）可能想要**将每个 `SKILL.md` 文件连接到单个系统提示词中**。
这**不是**设计使用此仓库的方式，如果你将整个仓库连接到一个提示词中，几乎肯定会溢出模型的上下文窗口。

相反，主机应该：

- 使用 `data/skills_index.json` 作为**轻量级清单**进行发现；以及
- **仅在调用技能时**（例如，通过对话中的 `@skill-id`）加载单个 `SKILL.md` 文件。

有关具体示例（包括伪代码），请参阅：

- [`docs/integrations/jetski-cortex.md`](../integrations/jetski-cortex.md)

### 技能可以离线工作吗？

技能文件本身存储在你的计算机上，但你的 AI 助手需要互联网连接才能运行。

---

## 安全与信任

### 风险标签是什么意思？

我们对技能进行分类，以便你知道你正在运行什么。这些值直接映射到每个 `SKILL.md` 前置元数据中的 `risk:` 字段：

- 🔵 **`none`**：纯参考或规划内容 — 无 shell 命令、无变更、无网络访问。
- ⚪ **`safe`**：非破坏性的社区技能（只读、规划、代码审查、分析）。
- 🔴 **`critical`**：修改文件、删除数据、使用网络扫描器或执行破坏性操作的技能。**谨慎使用。**
- 🟣 **`offensive`**：专注于安全性的进攻技术（渗透测试、利用）。**仅授权使用** — 始终确认目标在范围内。
- ⬜ **`unknown`**：遗留或未分类的内容。在使用前手动检查技能。

### 这些技能可以入侵我的计算机吗？

**不可以。**技能是文本文件。但是，它们_指示_ AI 运行命令。如果技能说"删除所有文件"，一个顺从的 AI 可能会尝试这样做。
_始终检查风险标签并审查代码。_

---

## 安装和设置

### 我应该在哪里安装技能？

这取决于你如何安装：

- **使用安装程序 CLI (`npx antigravity-awesome-skills`)**：
  默认安装目标是 Antigravity 全局库的 `~/.agents/skills/`。
- **使用特定于工具的标志**：
  使用 `--claude`、`--cursor`、`--gemini`、`--codex`、`--kiro` 或 `--antigravity` 自动定位匹配的工具路径。
- **使用手动克隆或自定义工作区路径**：
  `.agent/skills/` 对于 Antigravity/自定义设置仍然是一个很好的通用工作区约定。

如果你从 npm 收到 404，请使用：`npx github:sickn33/antigravity-awesome-skills`

**使用 git clone：**

```bash
git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
```

**特定于工具的路径：**

- Claude Code: `.claude/skills/`
- Gemini CLI: `.gemini/skills/`
- Codex CLI: `.codex/skills/`
- Cursor: `.cursor/skills/` 或项目根目录

**Claude Code 插件市场替代方案：**

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

此仓库现在包括 `.claude-plugin/marketplace.json` 和 `.claude-plugin/plugin.json`，因此 Claude Code 可以通过插件市场安装相同的技能树。

### 这可以在 Windows 上使用吗？

**可以。**使用与其他平台相同的标准安装流程：

```bash
npx antigravity-awesome-skills
```

如果你在已删除的符号链接解决方法周围创建了较旧的克隆，请重新安装到新目录或重新运行 `npx antigravity-awesome-skills`。

### 我在 Windows 上遇到截断或上下文崩溃循环。如何恢复？

如果 Antigravity 或基于 Jetski/Cortex 的主机不断重新打开到：

> `TrajectoryChatConverter: could not convert a single message before hitting truncation`

使用专用的 Windows 恢复指南：

- [`windows-truncation-recovery.md`](windows-truncation-recovery.md)

它包括：

- 针对损坏的本地存储/会话存储/IndexedDB 状态的手动清理步骤
- 首先要备份的默认 Antigravity Windows 路径
- 根据 [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274) 改编的可选批处理脚本

### 我在 Linux 或 macOS 上遇到上下文过载。我该怎么办？

如果 Antigravity 仅在激活完整技能库时变得不稳定，请切换到激活流程，而不是一次暴露每个技能：

- [agent-overload-recovery.md](agent-overload-recovery.md)

该指南展示了如何从此仓库的克隆副本运行 `scripts/activate-skills.sh`，以便只有你需要的捆绑包或技能 ID 在 `~/.agents/skills` 中保持活动状态。

### Gemini CLI 在几轮之后挂起或说"This is taking a bit longer, we're still on it"。我该怎么办？

首先进行快速隔离检查：

1. 开始一个全新的 Gemini CLI 对话。
2. 尝试一个完全没有技能的提示词。
3. 仅使用一个小技能（例如 `brainstorming`）再次尝试相同的任务。
4. 临时将你的活动技能集减少到 2-5 个技能并重试。

如何解释结果：

- 如果即使没有技能，普通 Gemini CLI 也挂起，则问题可能出在 Gemini CLI/运行时方面，而不是此仓库。
- 如果普通 Gemini 可以工作，但仅当存在技能时或在几轮之后挂起，则可能的原因是对话/上下文增长。

在这种情况下：

- 保持更小的活动集
- 更频繁地开始新对话
- 使用过载指南：[agent-overload-recovery.md](agent-overload-recovery.md)

### 如何更新技能？

导航到你的技能目录并拉取最新更改：

```bash
cd .agent/skills
git pull origin main
```

---

## 使用技能

> **💡 有关包含示例的完整指南，请参阅 [usage.md](usage.md)**

### 如何调用技能？

使用 `@` 符号后跟技能名称：

```bash
@brainstorming help me design a todo app
```

### 我可以调用整个捆绑包，如 `@Essentials` 或 `/web-wizard` 吗？

不可以。捆绑包是技能的精选列表，不是独立的可调用超级技能。

通过以下两种方式之一使用它们：

- 从捆绑包中选择单个技能并直接调用它们
- 如果你只想在 Antigravity 中激活该捆绑包的技能，请使用激活脚本

示例：

```bash
./scripts/activate-skills.sh --clear Essentials
./scripts/activate-skills.sh --clear "Web Wizard"
```

### 我可以一次使用多个技能吗？

**可以！**你可以调用多个技能：

```bash
@brainstorming help me design this, then use @writing-plans to create a task list.
```

### 我如何知道使用哪个技能？

1. **浏览目录**：查看[技能目录](../../CATALOG.md)。
2. **搜索**：`ls skills/ | grep "keyword"`
3. **询问你的 AI**："你有哪些关于测试的技能？"

---

## 故障排除

### 我的 AI 助手无法识别技能

**可能的原因：**

1. **错误的安装路径**：检查你的工具文档。尝试 `.agent/skills/`。
2. **需要重启**：安装后重启你的 AI/IDE。
3. **拼写错误**：你是输入了 `@brain-storming` 而不是 `@brainstorming` 吗？

### 技能给出了不正确或过时的建议

请[打开问题](https://github.com/sickn33/antigravity-awesome-skills/issues)！包括：

- 哪个技能
- 出了什么问题
- 应该发生什么

---

## 贡献

### 我是开源新手。我可以贡献吗？

**当然可以！**我们欢迎初学者。

- 修复拼写错误
- 添加示例
- 改进文档
  查看有关说明的 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

### 我的 PR 未通过"质量标准"检查。为什么？

仓库强制执行自动质量控制。你的技能可能缺少：

1. 有效的 `description`。
2. 清晰的使用指导或示例。
3. PR 主体中的预期 PR 模板检查清单。

在推送之前在本地运行 `npm run validate`，并确保你使用默认模板打开了 PR，以便存在质量标准检查清单。

### 我的 PR 未通过"安全文档"检查。我该怎么办？

在本地运行安全文档门并处理发现的问题：

```bash
npm run security:docs
```

常见修复：

- 用更安全的替代方案替换有风险的示例，如 `curl ... | bash`、`wget ... | sh`、`irm ... | iex`。
- 删除或编辑类似令牌的命令行示例。
- 对于故意的高风险指导，通过以下方式添加明确的理由：

```markdown
<!-- security-allowlist: reason and scope -->
```

### 我的 PR 触发了 `skill-review` 自动检查。它是什么？

从 v8.0.0 开始，GitHub 会自动在任何添加或修改 `SKILL.md` 文件的 PR 上运行 `skill-review` 工作流。它根据质量标准审查你的技能，并标记常见问题 — 缺少部分、触发器弱或有风险的命令模式。

**如果它报告发现：**

1. 在你的 PR 上打开**检查**选项卡并阅读 `skill-review` 作业输出。
2. 解决任何**可操作的**发现（缺少"何时使用"、触发器不清晰、被阻止的安全模式）。
3. 将新提交推送到同一分支 — 检查会自动重新运行。

你不需要关闭并重新打开 PR。信息性或仅风格的发现不会阻止合并。

### 社区 PR 需要生成的文件，如 `CATALOG.md` 或 `skills_index.json` 吗？

**不需要。**社区 PR 应该保持**仅源代码**。

**不要**包括生成的注册表工件，例如：

- `CATALOG.md`
- `skills_index.json`
- `data/*.json`

维护者在合并后在 `main` 上重新生成和规范化这些文件。如果你接触文档、工作流或基础设施，请在本地改为运行 `npm run validate:references` 和 `npm test`。

### 我可以更新"官方"技能吗？

**不可以。**官方技能（在 `skills/official/` 中）是从供应商镜像的。改为打开问题。

---

## 专业提示

- 在构建任何新内容之前使用 `@brainstorming`
- 在遇到错误时使用 `@systematic-debugging`
- 尝试 `@test-driven-development` 以获得更好的代码质量
- 探索 `@skill-creator` 制作你自己的技能

**仍然困惑？**[打开讨论](https://github.com/sickn33/antigravity-awesome-skills/discussions)，我们会帮助你！🙌
