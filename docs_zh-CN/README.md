<!-- registry-sync: version=10.7.0; skills=1436; stars=35188; updated_at=2026-04-26T14:16:16+00:00 -->
# 🌌 Antigravity Awesome Skills: 1,436+ 代理技能，适用于 Claude Code、Gemini CLI、Cursor、Copilot 及更多工具

> **可安装的 GitHub 技能库，包含 1,436+ 个代理技能，适用于 Claude Code、Cursor、Codex CLI、Gemini CLI、Antigravity 和其他 AI 编码助手。**

Antigravity Awesome Skills 是一个 GitHub 仓库和安装器 CLI，提供可复用的 `SKILL.md` 剧本。与其收集随机提示词，你可以获得一个可搜索、可安装的技能库，涵盖规划、编码、调试、测试、安全审查、基础设施工作、产品工作流和成长任务，支持主流 AI 编码助手。

**从这里开始：** [为仓库加星](https://github.com/sickn33/antigravity-awesome-skills/stargazers) · [1 分钟安装](#installation) · [选择你的工具](#choose-your-tool) · [按工具查看最佳技能](#best-skills-by-tool) · [捆绑包](docs/users/bundles.md) · [工作流](docs/users/workflows.md)

[![GitHub stars](https://img.shields.io/badge/⭐%2035%2C000%2B%20Stars-gold?style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Anthropic-purple)](https://claude.ai)
[![Cursor](https://img.shields.io/badge/Cursor-AI%20IDE-orange)](https://cursor.sh)
[![Codex CLI](https://img.shields.io/badge/Codex%20CLI-OpenAI-green)](https://github.com/openai/codex)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-Google-blue)](https://github.com/google-gemini/gemini-cli)
[![Latest Release](https://img.shields.io/github/v/release/sickn33/antigravity-awesome-skills?display_name=tag&style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills/releases/latest)
[![Install with NPX](https://img.shields.io/badge/Install-npx%20antigravity--awesome--skills-black?style=for-the-badge&logo=npm)](#installation)
[![Kiro](https://img.shields.io/badge/Kiro-AWS-orange?style=for-the-badge)](https://kiro.dev)
[![Copilot](https://img.shields.io/badge/Copilot-GitHub-lightblue?style=for-the-badge)](https://github.com/features/copilot)
[![OpenCode](https://img.shields.io/badge/OpenCode-CLI-gray?style=for-the-badge)](https://github.com/opencode-ai/opencode)
[![Antigravity](https://img.shields.io/badge/Antigravity-AI%20IDE-red?style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills)

**当前版本：V10.7.0。** 值得 35k+ GitHub 星标信赖，该仓库结合了官方和社区的技能集合，提供捆绑包、工作流、安装路径和文档，帮助你从首次安装快速过渡到日常使用。

## 为什么开发者为这个仓库加星

- **可安装，而不仅是启发式**：使用 `npx antigravity-awesome-skills` 将技能放置在你的工具期望的位置。
- **为主要代理工作流构建**：Claude Code、Cursor、Codex CLI、Gemini CLI、Antigravity、Kiro、OpenCode、Copilot 等。
- **广泛的覆盖范围和实用价值**：1,436+ 个技能，涵盖开发、测试、安全、基础设施、产品和营销。
- **更快的入门**：捆绑包和工作流减少了从"发现这个仓库"到"使用第一个技能"的时间。
- **无论你需要广度还是精选都有用**：浏览完整目录、从顶级捆绑包开始，或在安装前比较替代方案。

## 目录

- [🚀 新手入门？从这里开始！](#新手指手从这里开始)
- [📖 完整使用指南](docs/users/usage.md) - **如果安装后有困惑，从这里开始！**
- [🧠 核心概念](#核心概念)
- [🔌 兼容性与调用](#兼容性与调用)
- [🛠️ 安装](#安装)
- [🧭 集成指南](#集成指南)
- [🧰 按工具查看最佳技能](#按工具查看最佳技能)
- [❓ 快速常见问题](#快速常见问题)
- [🛡️ 安全态势](#安全态势)
- [🧯 故障排除](#故障排除)
- [🎁 精选集合（捆绑包）](#精选集合)
- [🧭 Antigravity 工作流](#antigravity-工作流)
- [⚖️ 替代方案与比较](#替代方案与比较)
- [📦 功能与类别](#功能与类别)
- [📚 浏览 1,436+ 技能](#浏览-1436-技能)
- [🤝 贡献](#贡献)
- [💬 社区](#社区)
- [☕ 支持项目](#支持项目)
- [🏆 致谢与来源](#致谢与来源)
- [👥 仓库贡献者](#仓库贡献者)
- [⚖️ 许可证](#许可证)
- [🌟 星标历史](#星标历史)

---

## 新手指手？从这里开始！

如果你搜索了 **Claude Code 技能**、**Cursor 技能**、**Codex CLI 技能**、**Gemini CLI 技能**或 **GitHub 上的 AI 代理技能**，这是安装严肃工作库并在当天使用的最快路径。

### 1. 🐣 背景：这是什么？

**Antigravity Awesome Skills**（版本 8.10.0）是一个大型可安装技能库，适用于 AI 编码助手。它包括入门文档、捆绑包、工作流、生成的目录和 CLI 安装器，让你无需手动拼接数十个仓库就能从发现过渡到实际使用。

AI 代理很聪明，但仍需要**特定于任务的操作指令**。技能是专注的 markdown 剧本，教代理如何重复执行工作流并提供更好的上下文，无论是部署、API 设计、测试、产品策略、SEO 还是文档。

### 2. ⚡️ 快速开始（1 分钟）

安装一次；然后使用 [`docs/users/bundles.md`](docs/users/bundles.md) 中的入门包来专注于你的角色。

1. **安装**：

   ```bash
   # 默认：~/.gemini/antigravity/skills（Antigravity 全局）。使用 --path 指定其他位置。
   npx antigravity-awesome-skills
   ```
2. **验证**：

   ```bash
   test -d ~/.gemini/antigravity/skills && echo "Skills installed in ~/.gemini/antigravity/skills"
   ```
3. **运行你的第一个技能**：

   > "使用 **@brainstorming** 规划 SaaS MVP。"
   >
4. **选择一个捆绑包**：

   - **Web 开发？** 从 `Web Wizard` 开始。
   - **安全？** 从 `Security Engineer` 开始。
   - **通用？** 从 `Essentials` 开始。

### 3. 🧠 如何使用

安装后，只需自然地向你的代理提问：

> "使用 **@brainstorming** 技能帮我规划 SaaS。"
> "在这个文件上运行 **@lint-and-validate**。"

👉 **新功能：** [**完整使用指南 - 请先阅读！**](docs/users/usage.md)（回答："安装后我该做什么？"、"如何执行技能？"、"提示词应该是什么样的？"）

👉 **[完整入门指南](docs/users/getting-started.md)**

---

## 核心概念

在比较捆绑包或开始安装工具特定路径之前，最好先区分四个概念：

- **技能**：可复用的 `SKILL.md` 剧本，教 AI 助手如何良好执行工作流。
- **MCP 工具**：助手可以调用的集成和外部功能。工具提供操作；技能提供操作指令。
- **捆绑包**：针对角色或领域的推荐技能精选。
- **工作流**：有序执行剧本，展示如何逐步组合多个技能。

如果你想要**技能 vs MCP/工具**的最清晰解释，从这里开始：

- [技能 vs MCP 工具](docs/users/skills-vs-mcp-tools.md)
- [捆绑包](docs/users/bundles.md)
- [工作流](docs/users/workflows.md)

## 集成指南

如果你的真实问题是"如何在我的工具中使用 Antigravity Awesome Skills？"，请使用相应的指南：

- **[Claude Code](docs/users/claude-code-skills.md)**：安装路径、入门提示词、插件市场流程和首次使用指南。
- **[Cursor](docs/users/cursor-skills.md)**：聊天优先使用、前端/全栈入门技能和实用提示词。
- **[Codex CLI](docs/users/codex-cli-skills.md)**：本地编码工作的规划、实现、调试、测试和审查循环。
- **[Gemini CLI](docs/users/gemini-cli-skills.md)**：广泛的工程、代理系统、集成和 AI 工作流覆盖。
- **[AI 代理技能指南](docs/users/ai-agent-skills.md)**：如何根据更广泛或更窄的替代方案评估此仓库。

## 快速常见问题

### 什么是 Antigravity Awesome Skills？

它是一个可安装的 GitHub 库，包含适用于 Claude Code、Cursor、Codex CLI、Gemini CLI、Antigravity 和相关 AI 编码助手的可复用 `SKILL.md` 剧本。

### 如何安装它？

使用 `npx antigravity-awesome-skills`，或工具特定标志，如 `--codex`、`--cursor`、`--gemini` 或 `--claude`，当你希望安装器定位到特定技能目录时。

### 技能和 MCP 工具有什么区别？

技能是可复用的剧本，告诉 AI 助手如何执行工作流。MCP 工具暴露代理可以调用的外部系统或操作。技能指导行为；MCP 工具提供功能。

### 捆绑包和工作流有什么区别？

捆绑包是推荐技能的精选集。工作流是针对具体结果的有序执行剧本。

查看扩展版本，请阅读 [FAQ](docs/users/faq.md)。

---

## 兼容性与调用

这些技能遵循通用的 **SKILL.md** 格式，适用于任何支持代理技能的 AI 编码助手。

| 工具                  | 类型 | 调用示例                  | 路径                                                                      |
| :-------------------- | :--- | :---------------------------------- | :------------------------------------------------------------------------ |
| **Claude Code** | CLI  | `>> /skill-name help me...`       | `.claude/skills/`                                                       |
| **Gemini CLI**  | CLI  | `(User Prompt) Use skill-name...` | `.gemini/skills/`                                                       |
| **Codex CLI**   | CLI  | `(User Prompt) Use skill-name...` | `.codex/skills/`                                                        |
| **Kiro CLI**    | CLI  | `(Auto) Skills load on-demand`    | 全局:`~/.kiro/skills/` · 工作区：`.kiro/skills/`                |
| **Kiro IDE**    | IDE  | `/skill-name or (Auto)`           | 全局:`~/.kiro/skills/` · 工作区：`.kiro/skills/`                |
| **Antigravity** | IDE  | `(Agent Mode) Use skill...`       | 全局:`~/.gemini/antigravity/skills/` · 工作区：`.agent/skills/` |
| **Cursor**      | IDE  | `@skill-name (in Chat)`           | `.cursor/skills/`                                                       |
| **Copilot**     | Ext  | `(Paste content manually)`        | N/A                                                                       |
| **OpenCode**    | CLI  | `opencode run @skill-name`        | `.agents/skills/`                                                       |
| **AdaL CLI**    | CLI  | `(Auto) Skills load on-demand`    | `.adal/skills/`                                                         |

> [!TIP]
> **默认安装器路径**：`~/.gemini/antigravity/skills`（Antigravity 全局）。使用 `--path ~/.agent/skills` 进行工作区特定安装。对于手动克隆，`.agent/skills/` 可用作 Antigravity 的工作区路径。
> **OpenCode 路径更新**：opencode 路径已更改为 `.agents/skills` 用于全局技能。请参阅 OpenCode 文档中的[放置文件](https://opencode.ai/docs/skills/#place-files)指令。

> [!TIP]
> **Windows 用户**：使用标准安装命令。不再需要旧的 `core.symlinks=true` / 开发者模式变通方法。

## 安装

要将这些技能与 **Claude Code**、**Gemini CLI**、**Codex CLI**、**Kiro CLI**、**Kiro IDE**、**Cursor**、**Antigravity**、**OpenCode** 或 **AdaL** 一起使用：

### 选项 A：npx（推荐）

```bash
npx antigravity-awesome-skills
```

2. 验证默认安装：

```bash
test -d ~/.gemini/antigravity/skills && echo "Skills installed"
```

3. 使用你的第一个技能：

```text
Use @brainstorming to plan a SaaS MVP.
```

4. 在 [`docs/users/bundles.md`](docs/users/bundles.md) 中浏览入门集合，在 [`docs/users/workflows.md`](docs/users/workflows.md) 中浏览执行剧本。

### 选项 B：Claude Code 插件市场

如果你使用 Claude Code 并更喜欢插件市场流程，此仓库现在提供了根 `.claude-plugin/marketplace.json`：

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

这通过 Claude Code 的插件市场入口点安装了相同的支持仓库的技能库。

### 选项 C：Codex 插件市场元数据

如果你使用 Codex 并更喜欢市场风格的插件源，而不是将技能复制到 `.codex/skills/`，此仓库现在提供：

- `.agents/plugins/marketplace.json`
- `plugins/antigravity-awesome-skills/.codex-plugin/plugin.json`

Codex 插件通过仓库本地插件入口指向相同的精选 `skills/` 树，因此库可以作为可安装的 Codex 插件源公开，而无需重复目录。

## 选择你的工具

| 工具           | 安装                                                                  | 首次使用                                              |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Claude Code    | `npx antigravity-awesome-skills --claude` 或 Claude 插件市场 | `>> /brainstorming help me plan a feature`           |
| Cursor         | `npx antigravity-awesome-skills --cursor`                              | `@brainstorming help me plan a feature`              |
| Gemini CLI     | `npx antigravity-awesome-skills --gemini`                              | `Use brainstorming to plan a feature`                |
| Codex CLI      | `npx antigravity-awesome-skills --codex`                               | `Use brainstorming to plan a feature`                |
| Antigravity    | `npx antigravity-awesome-skills --antigravity`                         | `Use @brainstorming to plan a feature`               |
| Kiro CLI       | `npx antigravity-awesome-skills --kiro`                                | `Use brainstorming to plan a feature`                |
| Kiro IDE       | `npx antigravity-awesome-skills --path ~/.kiro/skills`                 | `Use @brainstorming to plan a feature`               |
| GitHub Copilot | _无安装器 — 手动粘贴技能或规则_                       | `Ask Copilot to use brainstorming to plan a feature` |
| OpenCode       | `npx antigravity-awesome-skills --path .agents/skills`                 | `opencode run @brainstorming help me plan a feature` |
| AdaL CLI       | `npx antigravity-awesome-skills --path .adal/skills`                   | `Use brainstorming to plan a feature`                |
| 自定义路径    | `npx antigravity-awesome-skills --path ./my-skills`                    | 取决于你的工具                                   |

## 按工具查看最佳技能

如果你想要比"浏览所有 1,436+ 技能"更快的答案，请从工具特定指南开始：

- **[Claude Code 技能](docs/users/claude-code-skills.md)**：安装路径、入门技能、提示词示例和插件市场流程。
- **[Cursor 技能](docs/users/cursor-skills.md)**：`.cursor/skills/` 的最佳入门技能、UI 重型工作和配对编程流程。
- **[Codex CLI 技能](docs/users/codex-cli-skills.md)**：本地编码循环的规划、实现、调试和审查技能。
- **[Gemini CLI 技能](docs/users/gemini-cli-skills.md)**：研究、代理系统、集成和工程工作流的入门栈。
- **[AI 代理技能指南](docs/users/ai-agent-skills.md)**：如何评估技能库、选择广度 vs 精选以及选择正确的起点。

## 安全态势

这些技能经过持续审查和加固，但集合并非"默认安全"。它们是可能包含设计上的风险操作的指令和示例。

- 运行时加固现在在任何仓库变更之前保护 `/api/refresh-skills` 变更流程（方法/主机检查和可选令牌门）。
- Web 应用中的 markdown 渲染避免原始 HTML 传递（`rehype-raw`），并为技能内容显示遵循更安全的默认值。
- 仓库范围的 `SKILL.md` 安全扫描检查高风险命令模式（例如 `curl|bash`、`wget|sh`、`irm|iex`、命令行令牌示例），并对故意异常进行明确白名单。
- 触及 `SKILL.md` 文件的拉取请求现在还会运行自动化的 `skill-review` GitHub Actions 检查，因此贡献者和维护者会获得专注于技能结构和审查质量的第二遍检查。
- 面向维护者的工具具有额外的路径/符号链接检查和解析器健壮性保护，以实现更安全的同步、索引和安装操作。
- 端点授权、渲染安全和文档风险模式的安全测试覆盖是正常 CI/发布验证流程的一部分。

---

## 此仓库包含的内容

- **技能库**：`skills/` 包含可复用的 `SKILL.md` 集合。
- **安装器**：npm CLI 将技能安装到每个工具的正确目录中。
- **目录**：[`CATALOG.md`](CATALOG.md)、`skills_index.json` 和 `data/` 提供生成的索引。
- **Web 应用**：[`apps/web-app`](apps/web-app) 提供搜索、过滤器、渲染和复制助手。
- **捆绑包**：[`docs/users/bundles.md`](docs/users/bundles.md) 按角色分组入门技能。
- **工作流**：[`docs/users/workflows.md`](docs/users/workflows.md) 提供逐步执行剧本。

## 项目结构

| 路径                   | 目的                                                   |
| ---------------------- | --------------------------------------------------------- |
| `skills/`            | 规范技能库                               |
| `docs/users/`        | 入门、使用、捆绑包、工作流、可视化指南 |
| `docs/contributors/` | 模板、解剖、示例、质量标准、社区文档 |
| `docs/maintainers/`  | 发布、审计、CI 偏移、元数据维护文档       |
| `docs/sources/`      | 归属和许可参考                      |
| `apps/web-app/`      | 技能目录的交互式浏览器                 |
| `tools/`             | 安装器、验证器、生成器和支持脚本    |
| `data/`              | 生成的目录、别名、捆绑包和工作流        |

## 顶级入门技能

- `@brainstorming` 用于实现前的规划。
- `@architecture` 用于系统和组件设计。
- `@test-driven-development` 用于 TDD 导向的工作。
- `@doc-coauthoring` 用于结构化文档编写。
- `@lint-and-validate` 用于轻量级质量检查。
- `@create-pr` 用于将工作打包成干净的拉取请求。
- `@debugging-strategies` 用于系统性故障排除。
- `@api-design-principles` 用于 API 形状和一致性。
- `@frontend-design` 用于 UI 和交互质量。
- `@security-auditor` 用于安全重点的审查。


### 社区贡献的技能

- [Overnight Worker](https://github.com/fullstackcrew-alpha/skill-overnight-worker) - 自主隔夜工作代理。睡前分配任务，早上获得结构化结果。
- [Cost Optimizer](https://github.com/fullstackcrew-alpha/skill-cost-optimizer) - 通过智能模型路由、上下文压缩和心跳调优节省 60-80% 的 AI 令牌成本。
- [DevOps Agent](https://github.com/fullstackcrew-alpha/skill-devops-agent) - 一键部署、监控设置、定期备份、故障诊断，具有安全优先设计。
- [CN Content Matrix](https://github.com/fullstackcrew-alpha/skill-cn-content-matrix) - 中文多平台内容生成器，支持小红书、微信、抖音、Bilibili，具有真正的风格转换。
- [Smart PR Review](https://github.com/fullstackcrew-alpha/skill-smart-pr-review) - 有主见的 AI 代码审查器，具有 6 层深度审查、魔鬼代言人模式、必须修复/应该修复/建议输出。
- [HubSpot Admin Skills](https://github.com/TomGranot/hubspot-admin-skills) - 32 个 Claude Code 技能，用于审计、清理、丰富和自动化 HubSpot CRM。包括 Python 脚本、Breeze AI 工作流提示词以及完整的审计 → 规划 → 执行 → 维护流程。
- [Tutor Skills](https://github.com/RoundTable02/tutor-skills) - 将 PDF、文档和代码库转换为 Obsidian 学习库，具有交互式基于测验的学习和熟练度跟踪。

## 三个真实示例

```text
Use @brainstorming to turn this product idea into a concrete MVP plan.
```

```text
Use @security-auditor to review this API endpoint for auth and validation risks.
```

## 精选集合

**捆绑包**是针对特定角色或目标（例如：`Web Wizard`、`Security Engineer`、`OSS Maintainer`）的精选技能组。

它们帮助你避免逐一浏览完整目录。

### ⚠️ 重要：捆绑包不是单独的安装！

**常见困惑**："我需要单独安装每个捆绑包吗？"

**答案：不需要！** 以下是捆绑包的实际含义：

**捆绑包是什么：**

- ✅ 按角色组织的推荐技能列表
- ✅ 精选起点，帮助你决定使用什么
- ✅ 发现相关技能的省时捷径

**捆绑包不是什么：**

- ❌ 单独的安装或下载
- ❌ 不同的 git 命令
- ❌ 大多数用户在正常安装期间需要激活的东西

### 如何使用捆绑包：

1. **安装一次仓库**（你已经拥有所有技能）
2. **在 [docs/users/bundles.md](docs/users/bundles.md) 中浏览捆绑包**以找到你的角色
3. **从该捆绑包中选择 3-5 个技能**开始在提示词中使用
4. **在与 AI 的对话中引用它们**（例如，"使用 @brainstorming..."）

如果 Antigravity 因活动技能过多而开始达到上下文限制，[`docs/users/agent-overload-recovery.md`](docs/users/agent-overload-recovery.md) 中的可选激活脚本可以仅将你想要的捆绑包或技能 ID 实例化到活动的 Antigravity 目录中。

有关如何实际使用技能的详细示例，请参阅[**使用指南**](docs/users/usage.md)。

### 示例：

- 构建 SaaS MVP：`Essentials` + `Full-Stack Developer` + `QA & Testing`。
- 加固生产：`Security Developer` + `DevOps & Cloud` + `Observability & Monitoring`。
- 发布 OSS 变更：`Essentials` + `OSS Maintainer`。

## Antigravity 工作流

捆绑包帮助你选择技能。工作流帮助你按顺序执行它们。

- 当你需要按角色进行精选推荐时，使用捆绑包。
- 当你需要针对具体目标的逐步执行时，使用工作流。

从这里开始：

- [docs/users/workflows.md](docs/users/workflows.md)：人类可读剧本。
- [data/workflows.json](data/workflows.json)：机器可读的工作流元数据。

初始工作流包括：

- 发布 SaaS MVP
- Web 应用安全审计
- 构建 AI 代理系统
- QA 和浏览器自动化（可选 `@go-playwright` 支持 Go 栈）
- 设计 DDD 核心域

## 替代方案与比较

在安装之前需要将此仓库与其他技能库进行比较？从这里开始：

- **[Antigravity Awesome Skills vs Awesome Claude Skills](docs/users/antigravity-awesome-skills-vs-awesome-claude-skills.md)** 了解广度 vs 精选列表的权衡。
- **[GitHub 上最佳 Claude Code 技能](docs/users/best-claude-code-skills-github.md)** 了解高意图短名单。
- **[GitHub 上最佳 Cursor 技能](docs/users/best-cursor-skills-github.md)** 了解兼容 Cursor 的选项和选择标准。

## 功能与类别

仓库组织为专门的领域，将你的 AI 转变为整个软件开发生命周期的专家：

| 类别       | 重点                                              | 示例技能                                                                        |
| :------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------ |
| 架构   | 系统设计、ADR、C4 和可扩展模式     | `architecture`、`c4-context`、`senior-architect`                                |
| 业务       | 增长、定价、CRO、SEO 和进入市场        | `copywriting`、`pricing-strategy`、`seo-audit`                                  |
| 数据与 AI      | LLM 应用、RAG、代理、可观测性、分析    | `rag-engineer`、`prompt-engineer`、`langgraph`                                  |
| 开发    | 语言精通、框架模式、代码质量 | `typescript-expert`、`python-patterns`、`react-patterns`                        |
| 通用        | 规划、文档、产品运营、写作、指南   | `brainstorming`、`doc-coauthoring`、`writing-plans`                             |
| 基础设施 | DevOps、云、无服务器、部署、CI/CD       | `docker-expert`、`aws-serverless`、`vercel-deployment`                          |
| 安全       | AppSec、渗透测试、漏洞分析、合规      | `api-security-best-practices`、`sql-injection-testing`、`vulnerability-scanner` |
| 测试        | TDD、测试设计、修复、QA 工作流              | `test-driven-development`、`testing-patterns`、`test-fixing`                    |
| 工作流       | 自动化、编排、作业、代理            | `workflow-automation`、`inngest`、`trigger-dev`                                 |

计数随着新技能的添加而变化。有关当前完整注册表，请参阅 [CATALOG.md](CATALOG.md)。

## 浏览 1,436+ 技能

- 在 [`apps/web-app`](apps/web-app) 中打开交互式浏览器。
- 在 [`CATALOG.md`](CATALOG.md) 中阅读完整目录。
- 从 [`docs/users/claude-code-skills.md`](docs/users/claude-code-skills.md)、[`docs/users/cursor-skills.md`](docs/users/cursor-skills.md)、[`docs/users/codex-cli-skills.md`](docs/users/codex-cli-skills.md) 和 [`docs/users/gemini-cli-skills.md`](docs/users/gemini-cli-skills.md) 中的工具特定指南开始。
- 从 [`docs/users/bundles.md`](docs/users/bundles.md) 中基于角色的捆绑包开始。
- 在 [`docs/users/workflows.md`](docs/users/workflows.md) 中遵循结果驱动的工作流。
- 使用 [`docs/users/getting-started.md`](docs/users/getting-started.md) 和 [`docs/users/usage.md`](docs/users/usage.md) 中的入门指南。

## 文档

| 对于用户                                                       | 对于贡献者                                                          | 对于维护者                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/users/getting-started.md`](docs/users/getting-started.md) | [`CONTRIBUTING.md`](CONTRIBUTING.md)                                       | [`docs/maintainers/release-process.md`](docs/maintainers/release-process.md)                                                              |
| [`docs/users/usage.md`](docs/users/usage.md)                     | [`docs/contributors/skill-anatomy.md`](docs/contributors/skill-anatomy.md) | [`docs/maintainers/audit.md`](docs/maintainers/audit.md)                                                                                  |
| [`docs/users/faq.md`](docs/users/faq.md)                         | [`docs/contributors/quality-bar.md`](docs/contributors/quality-bar.md)     | [`docs/maintainers/ci-drift-fix.md`](docs/maintainers/ci-drift-fix.md)                                                                    |
| [`docs/users/claude-code-skills.md`](docs/users/claude-code-skills.md) · [`docs/users/cursor-skills.md`](docs/users/cursor-skills.md) · [`docs/users/codex-cli-skills.md`](docs/users/codex-cli-skills.md) · [`docs/users/gemini-cli-skills.md`](docs/users/gemini-cli-skills.md) | [`docs/contributors/examples.md`](docs/contributors/examples.md)           | [`docs/maintainers/repo-growth-seo.md`](docs/maintainers/repo-growth-seo.md) · [`docs/maintainers/skills-update-guide.md`](docs/maintainers/skills-update-guide.md) · [`.github/MAINTENANCE.md`](.github/MAINTENANCE.md) |
| [`docs/users/visual-guide.md`](docs/users/visual-guide.md) · [`docs/users/ai-agent-skills.md`](docs/users/ai-agent-skills.md) · [`docs/users/best-claude-code-skills-github.md`](docs/users/best-claude-code-skills-github.md) · [`docs/users/best-cursor-skills-github.md`](docs/users/best-cursor-skills-github.md) |  |  |

## 故障排除

### Windows 安装说明

在 Windows 上使用正常安装流程：

```bash
git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
```

如果你有在移除的符号链接变通方法附近创建的旧克隆，请重新安装到新目录或重新运行 `npx antigravity-awesome-skills` 安装器。

### Windows 截断或上下文崩溃循环

如果 Antigravity 或基于 Jetski/Cortex 的主机不断重新打开并出现截断错误，请使用专用恢复指南：

- [`docs/users/windows-truncation-recovery.md`](docs/users/windows-truncation-recovery.md)

该指南包括：

- 清理前的备份路径
- 通常需要清除的存储文件夹
- 根据 [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274) 改编的可选批处理助手

### Linux 和 macOS 代理过载

如果 Antigravity 仅在同时激活过多技能时变得不稳定，请使用跨平台过载指南：

- [`docs/users/agent-overload-recovery.md`](docs/users/agent-overload-recovery.md)

### 修复代理过载（激活脚本）

如果你的代理由于加载的技能过多而面临上下文窗口限制，请使用激活脚本。它们将完整库保留在单独的存档文件夹中，仅将你需要的捆绑包或技能激活到活动的 Antigravity 技能目录中。

**重要使用说明：**

1. **首先，手动关闭仓库**（例如，退出你的 AI 代理或关闭 IDE）。
2. 在你克隆此仓库的文件夹内打开终端（注意：必须已克隆仓库）。
3. 运行位于 `scripts` 文件夹中的脚本。

macOS/Linux 示例：

```bash
# 激活特定捆绑包
./scripts/activate-skills.sh "Web Wizard" "Integration & APIs"

# 激活字面技能 ID
./scripts/activate-skills.sh brainstorming systematic-debugging

# 清除和重置（首先归档活动目录）
./scripts/activate-skills.sh --clear
```

Windows 示例：

```bat
:: 激活特定捆绑包
.\scripts\activate-skills.bat "Web Wizard" "Integration & APIs"

:: 清除和重置（删除除 Essentials 捆绑包之外的所有技能）
.\scripts\activate-skills.bat --clear
```

## Web 应用

Web 应用是导航如此大型仓库的最快方式。

**本地运行：**

```bash
npm run app:install
npm run app:dev
```

这将将生成的技能索引复制到 `apps/web-app/public/skills.json`，将当前的 `skills/` 树镜像到 `apps/web-app/public/skills/`，并启动 Vite 开发服务器。

**在线托管：**相同的应用可在 [https://sickn33.github.io/antigravity-awesome-skills/](https://sickn33.github.io/antigravity-awesome-skills/) 获得，并在每次推送到 `main` 时自动部署。要启用一次：**设置 → 页面 → 构建和部署 → 源：GitHub Actions**。

## 贡献

- 在 `skills/<skill-name>/SKILL.md` 下添加新技能。
- 遵循 [`CONTRIBUTING.md`](CONTRIBUTING.md) 中的贡献者指南。
- 使用 [`docs/contributors/skill-template.md`](docs/contributors/skill-template.md) 中的模板。
- 在打开 PR 之前使用 `npm run validate` 进行验证。
- 保持社区 PR 仅包含源代码：不要提交生成的注册表工件，如 `CATALOG.md`、`skills_index.json` 或 `data/*.json`。
- 如果你的 PR 更改了 `SKILL.md`，请预期 GitHub 上的自动 `skill-review` 检查，以及通常的验证和安全扫描。

## 社区

- [Discussions](https://github.com/sickn33/antigravity-awesome-skills/discussions) 用于提问、想法、展示帖子和社区反馈。
- [Issues](https://github.com/sickn33/antigravity-awesome-skills/issues) 用于可重现的错误和具体的、可操作的改进请求。
- [在 X 上关注 @sickn33](https://x.com/sickn33) 获取项目更新和发布。
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) 用于社区期望和审核标准。
- [`SECURITY.md`](SECURITY.md) 用于安全报告。

## 支持项目

支持是可选的。该项目对每个人保持免费和开源。

- [在 Buy Me a Coffee 上给我买一本书](https://buymeacoffee.com/sickn33)
- 为仓库加星
- 提出可重现的问题
- 贡献文档、修复和技能

---

## 致谢与来源

我们站在巨人的肩膀上。

👉 **[查看完整归属账本](docs/sources/sources.md)**

主要贡献者和来源包括：

- **HackTricks**
- **OWASP**
- **Anthropic / OpenAI / Google**
- **开源社区**

如果没有 Claude Code 社区和官方来源的惊人工作，这个集合就不可能实现：

### 官方来源

- **[anthropics/skills](https://github.com/anthropics/skills)**：官方 Anthropic 技能仓库 - 文档操作（DOCX、PDF、PPTX、XLSX）、品牌指南、内部通信。
- **[anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)**：使用 Claude 构建的官方笔记本和配方。
- **[remotion-dev/skills](https://github.com/remotion-dev/skills)**：官方 Remotion 技能 - 在 React 中创建视频，具有 28 个模块化规则。
- **[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)**：Vercel Labs 官方技能 - React 最佳实践、Web 设计指南。
- **[openai/skills](https://github.com/openai/skills)**：OpenAI Codex 技能目录 - 代理技能、技能创建者、简洁规划。
- **[supabase/agent-skills](https://github.com/supabase/agent-skills)**：Supabase 官方技能 - Postgres 最佳实践。
- **[microsoft/skills](https://github.com/microsoft/skills)**：官方 Microsoft 技能 - Azure 云服务、Bot Framework、认知服务和企业开发模式，涵盖 .NET、Python、TypeScript、Go、Rust 和 Java。
- **[google-gemini/gemini-skills](https://github.com/google-gemini/gemini-skills)**：官方 Gemini 技能 - Gemini API、SDK 和模型交互。
- **[apify/agent-skills](https://github.com/apify/agent-skills)**：官方 Apify 技能 - Web 抓取、数据提取和自动化。

### 社区贡献者

- **[rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills)**：感谢贡献 300+ 企业技能和目录生成逻辑。
- **[amartelr/antigravity-workspace-manager](https://github.com/amartelr/antigravity-workspace-manager)**：官方工作区管理器 CLI 伴侣，用于在无限本地开发环境中动态自动配置技能子集。
- **[obra/superpowers](https://github.com/obra/superpowers)**：Jesse Vincent 的原始"Superpowers"。
- **[guanyang/antigravity-skills](https://github.com/guanyang/antigravity-skills)**：核心 Antigravity 扩展。
- **[diet103/claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)**：基础设施和后端/前端指南。
- **[ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)**：React UI 模式和设计系统。
- **[travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)**：Loki 模式和 Playwright 集成。
- **[Dimillian/Skills](https://github.com/Dimillian/Skills)**：精选的 Codex 技能，专注于 Apple 平台、GitHub 工作流、重构和性能。`app-store-changelog`、`github`、`ios-debugger-agent`、`macos-menubar-tuist-app`、`macos-spm-app-packaging`、`orchestrate-batch-refactor`、`project-skill-audit`、`react-component-performance`、`simplify-code`、`swift-concurrency-expert`、`swiftui-liquid-glass`、`swiftui-performance-audit`、`swiftui-ui-patterns` 和 `swiftui-view-refactor` 的来源（MIT）。
- **[zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)**：综合安全套件和指南（约 60 个新技能的来源）。
- **[alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)**：高级工程和 PM 工具包。
- **[karanb192/awesome-claude-skills](https://github.com/karanb192/awesome-claude-skills)**：Claude Code 的大量已验证技能列表。
- **[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)**：精选的 61 个高质量技能集合，包括 Sentry、Trail of Bits、Expo、Hugging Face 的官方团队技能以及综合上下文工程套件（v4.3.0 集成）。
- **[zircote/.claude](https://github.com/zircote/.claude)**：Shopify 开发技能参考。
- **[vibeforge1111/vibeship-spawner-skills](https://github.com/vibeforge1111/vibeship-spawner-skills)**：AI 代理、集成、制造工具（57 个技能，Apache 2.0）。
- **[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)**：CRO、文案、SEO、付费广告和增长的营销技能（23 个技能，MIT）。
- **[AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)**：SEO 工作流集合，涵盖技术 SEO、hreflang、站点地图、地理位置、架构和程序化 SEO 模式。
- **[jonathimer/devmarketing-skills](https://github.com/jonathimer/devmarketing-skills)**：开发者营销技能 — HN 策略、技术教程、文档即营销、Reddit 参与、开发者入门等（33 个技能，MIT）。
- **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)**：专注于 Obsidian 的技能，用于 markdown、Bases、JSON Canvas、CLI 工作流和内容清理。
- **[Silverov/yandex-direct-skill](https://github.com/Silverov/yandex-direct-skill)**：Yandex Direct（API v5）广告审计技能 — 55 项自动检查、A-F 评分、活动/广告/关键词分析，面向俄罗斯 PPC 市场（MIT）。
- **[vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit)**：AI 代理模板，包含技能、代理和工作流（33 个技能，MIT）。
- **[affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)**：Anthropic 黑客马拉松获胜者的完整 Claude Code 配置集合 - 仅技能（8 个技能，MIT）。
- **[whatiskadudoing/fp-ts-skills](https://github.com/whatiskadudoing/fp-ts-skills)**：TypeScript 的实用 fp-ts 技能 – fp-ts-pragmatic、fp-ts-react、fp-ts-errors（v4.4.0）。
- **[webzler/agentMemory](https://github.com/webzler/agentMemory)**：agent-memory-mcp 技能的来源。
- **[sstklen/claude-api-cost-optimization](https://github.com/sstklen/claude-api-cost-optimization)**：通过智能优化策略节省 50-90% 的 Claude API 成本（MIT）。
- **[rafsilva85/credit-optimizer-v5](https://github.com/rafsilva85/credit-optimizer-v5)**：Manus AI 信用优化器技能 — 智能模型路由、上下文压缩和智能测试。在 53 个场景中经过审计，节省 30-75% 的信用，零质量损失。
- **[Wittlesus/cursorrules-pro](https://github.com/Wittlesus/cursorrules-pro)**：8 个框架的专业 .cursorrules 配置 - Next.js、React、Python、Go、Rust 等。适用于 Cursor、Claude Code 和 Windsurf。
- **[nedcodes-ok/rule-porter](https://github.com/nedcodes-ok/rule-porter)**：Cursor (.mdc)、Claude Code (CLAUDE.md)、GitHub Copilot、Windsurf 和传统 .cursorrules 格式之间的双向规则转换器。零依赖。
- **[SSOJet/skills](https://github.com/ssojet/skills)**：适用于流行框架和平台的生产就绪 SSOJet 技能和集成指南 — Node.js、Next.js、React、Java、.NET Core、Go、iOS、Android 等。与 SSOJet SAML、OIDC 和企业 SSO 流程无缝协作。适用于 Cursor、Antigravity、Claude Code 和 Windsurf。
- **[MojoAuth/skills](https://github.com/MojoAuth/skills)**：适用于流行框架的生产就绪 MojoAuth 指南和示例，如 Node.js、Next.js、React、Java、.NET Core、Go、iOS 和 Android。
- **[Xquik-dev/x-twitter-scraper](https://github.com/Xquik-dev/x-twitter-scraper)**：X (Twitter) 数据平台 — 推文搜索、用户查找、关注者提取、参与指标、抽奖、监控、webhook、19 个提取工具、MCP 服务器。
- **[shmlkv/dna-claude-analysis](https://github.com/shmlkv/dna-claude-analysis)**：个人基因组分析工具包 — Python 脚本，分析 17 个类别的原始 DNA 数据（健康风险、血统、药物基因组学、营养、心理学等），具有终端风格的单页 HTML 可视化。
- **[AlmogBaku/debug-skill](https://github.com/AlmogBaku/debug-skill)**：AI 代理的交互式调试器技能 — 通过 `dap` CLI 实现断点、单步执行、变量检查和堆栈跟踪。支持 Python、Go、Node.js/TypeScript、Rust 和 C/C++。
- **[uberSKILLS](https://github.com/uberskillsdev/uberSKILLS)**：通过可视化、AI 辅助的工作流设计、测试和部署 Claude Code 代理技能。
- **[christopherlhammer11-ai/tool-use-guardian](https://github.com/christopherlhammer11-ai/tool-use-guardian)**：Tool Use Guardian 技能的来源 — 工具调用可靠性包装器，具有重试、恢复和失败分类。
- **[christopherlhammer11-ai/recallmax](https://github.com/christopherlhammer11-ai/recallmax)**：RecallMax 技能的来源 — 用于代理的长上下文记忆、摘要和对话压缩。
- **[tsilverberg/webapp-uat](https://github.com/tsilverberg/webapp-uat)**：完整浏览器 UAT 技能 — Playwright 测试，具有控制台/网络错误捕获、WCAG 2.2 AA 可访问性检查、i18n 验证、响应式测试和 P0-P3 错误分类。默认只读，适用于 React、Vue、Angular、Ionic、Next.js。
- **[Wolfe-Jam/faf-skills](https://github.com/Wolfe-Jam/faf-skills)**：AI 上下文和项目 DNA 技能 — `.faf` 格式管理、AI 就绪评分、双向同步、MCP 服务器构建和冠军级测试（17 个技能，MIT）。
- **[fullstackcrew-alpha/privacy-mask](https://github.com/fullstackcrew-alpha/privacy-mask)**：用于 AI 编码代理的本地图像隐私屏蔽。通过 OCR + 47 条正则规则检测并编辑截图中的 PII、API 密钥和机密。Claude Code 挂钩集成，用于自动屏蔽。支持 Tesseract 和 RapidOCR。100% 离线（MIT）。

### 灵感来源

- **[f/awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts)**：提示词库的灵感。
- **[leonardomso/33-js-concepts](https://github.com/leonardomso/33-js-concepts)**：JavaScript 精通的灵感。

### 附加来源

- **[agent-cards/skill](https://github.com/agent-cards/skill)**：为 AI 代理管理预付虚拟 Visa 卡。创建卡片、检查余额、查看凭证、关闭卡片并通过 MCP 工具获得支持。

## 仓库贡献者

<a href="https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sickn33/antigravity-awesome-skills" alt="Repository contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks)。*（图像可能已缓存；[在 GitHub 上查看实时贡献者](https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors)。)*

我们正式感谢以下贡献者帮助使这个仓库变得出色！

- [@sck000](https://github.com/sck000)
- [@github-actions[bot]](https://github.com/apps/github-actions)
- [@sickn33](https://github.com/sickn33)
- [@munir-abbasi](https://github.com/munir-abbasi)
- [@Mohammad-Faiz-Cloud-Engineer](https://github.com/Mohammad-Faiz-Cloud-Engineer)
- [@zinzied](https://github.com/zinzied)
- [@ssumanbiswas](https://github.com/ssumanbiswas)
- [@Dokhacgiakhoa](https://github.com/Dokhacgiakhoa)
- [@IanJ332](https://github.com/IanJ332)
- [@sx4im](https://github.com/sx4im)
- [@maxdml](https://github.com/maxdml)
- [@skyruh](https://github.com/skyruh)
- [@Champbreed](https://github.com/Champbreed)
- [@ar27111994](https://github.com/ar27111994)
- [@chauey](https://github.com/chauey)
- [@itsmeares](https://github.com/itsmeares)
- [@suhaibjanjua](https://github.com/suhaibjanjua)
- [@GuppyTheCat](https://github.com/GuppyTheCat)
- [@Copilot](https://github.com/apps/copilot-swe-agent)
- [@8hrsk](https://github.com/8hrsk)
- [@fernandorych](https://github.com/fernandorych)
- [@nikolasdehor](https://github.com/nikolasdehor)
- [@SnakeEye-sudo](https://github.com/SnakeEye-sudo)
- [@talesperito](https://github.com/talesperito)
- [@zebbern](https://github.com/zebbern)
- [@sstklen](https://github.com/sstklen)
- [@0xrohitgarg](https://github.com/0xrohitgarg)
- [@tejasashinde](https://github.com/tejasashinde)
- [@jackjin1997](https://github.com/jackjin1997)
- [@HuynhNhatKhanh](https://github.com/HuynhNhatKhanh)
- [@taksrules](https://github.com/taksrules)
- [@liyin2015](https://github.com/liyin2015)
- [@fullstackcrew-alpha](https://github.com/fullstackcrew-alpha)
- [@arathiesh](https://github.com/arathiesh)
- [@Tiger-Foxx](https://github.com/Tiger-Foxx)
- [@RamonRiosJr](https://github.com/RamonRiosJr)
- [@Musayrlsms](https://github.com/Musayrlsms)
- [@AssassinMaeve](https://github.com/AssassinMaeve)
- [@fernandezbaptiste](https://github.com/fernandezbaptiste)
- [@Gizzant](https://github.com/Gizzant)
- [@JayeHarrill](https://github.com/JayeHarrill)
- [@truongnmt](https://github.com/truongnmt)
- [@uriva](https://github.com/uriva)
- [@babysor](https://github.com/babysor)
- [@SenSei2121](https://github.com/SenSei2121)
- [@code-vj](https://github.com/code-vj)
- [@viktor-ferenczi](https://github.com/viktor-ferenczi)
- [@vprudnikoff](https://github.com/vprudnikoff)
- [@Vonfry](https://github.com/Vonfry)
- [@wahidzzz](https://github.com/wahidzzz)
- [@Wittlesus](https://github.com/Wittlesus)
- [@Wolfe-Jam](https://github.com/Wolfe-Jam)
- [@Cerdore](https://github.com/Cerdore)
- [@TomGranot](https://github.com/TomGranot)
- [@terryspitz](https://github.com/terryspitz)
- [@Onsraa](https://github.com/Onsraa)
- [@SebConejo](https://github.com/SebConejo)
- [@SuperJMN](https://github.com/SuperJMN)
- [@Enreign](https://github.com/Enreign)
- [@sohamganatra](https://github.com/sohamganatra)
- [@Silverov](https://github.com/Silverov)
- [@conspirafi](https://github.com/conspirafi)
- [@shubhamdevx](https://github.com/shubhamdevx)
- [@ronanguilloux](https://github.com/ronanguilloux)
- [@sraphaz](https://github.com/sraphaz)
- [@jamescha-earley](https://github.com/jamescha-earley)
- [@vuth-dogo](https://github.com/vuth-dogo)
- [@yang1002378395-cmyk](https://github.com/yang1002378395-cmyk)
- [@viliawang-pm](https://github.com/viliawang-pm)
- [@uucz](https://github.com/uucz)
- [@tsilverberg](https://github.com/tsilverberg)
- [@thuanlm215](https://github.com/thuanlm215)
- [@shmlkv](https://github.com/shmlkv)
- [@rafsilva85](https://github.com/rafsilva85)
- [@nocodemf](https://github.com/nocodemf)
- [@marsiandeployer](https://github.com/marsiandeployer)
- [@ksgisang](https://github.com/ksgisang)
- [@KrisnaSantosa15](https://github.com/KrisnaSantosa15)
- [@junited31](https://github.com/junited31)
- [@fbientrigo](https://github.com/fbientrigo)
- [@dz3ai](https://github.com/dz3ai)
- [@digitamaz](https://github.com/digitamaz)
- [@developer-victor](https://github.com/developer-victor)
- [@ckdwns9121](https://github.com/ckdwns9121)
- [@christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)
- [@c1c3ru](https://github.com/c1c3ru)
- [@buzzbysolcex](https://github.com/buzzbysolcex)
- [@BenZinaDaze](https://github.com/BenZinaDaze)
- [@avimak](https://github.com/avimak)
- [@antbotlab](https://github.com/antbotlab)
- [@amalsam](https://github.com/amalsam)
- [@ziuus](https://github.com/ziuus)
- [@qcwssss](https://github.com/qcwssss)
- [@rcigor](https://github.com/rcigor)
- [@hvasconcelos](https://github.com/hvasconcelos)
- [@Guilherme-ruy](https://github.com/Guilherme-ruy)
- [@FrancyJGLisboa](https://github.com/FrancyJGLisboa)
- [@Digidai](https://github.com/Digidai)
- [@dbhat93](https://github.com/dbhat93)
- [@decentraliser](https://github.com/decentraliser)
- [@MAIOStudio](https://github.com/MAIOStudio)
- [@wd041216-bit](https://github.com/wd041216-bit)
- [@conorbronsdon](https://github.com/conorbronsdon)
- [@RoundTable02](https://github.com/RoundTable02)
- [@ChaosRealmsAI](https://github.com/ChaosRealmsAI)
- [@kriptoburak](https://github.com/kriptoburak)
- [@BenedictKing](https://github.com/BenedictKing)
- [@acbhatt12](https://github.com/acbhatt12)
- [@Andruia](https://github.com/Andruia)
- [@AlmogBaku](https://github.com/AlmogBaku)
- [@Allen930311](https://github.com/Allen930311)
- [@alexmvie](https://github.com/alexmvie)
- [@Sayeem3051](https://github.com/Sayeem3051)
- [@Abdulrahmansoliman](https://github.com/Abdulrahmansoliman)
- [@ALEKGG1](https://github.com/ALEKGG1)
- [@8144225309](https://github.com/8144225309)
- [@1bcMax](https://github.com/1bcMax)
- [@ProgramadorBrasil](https://github.com/ProgramadorBrasil)
- [@PabloASMD](https://github.com/PabloASMD)
- [@yubing744](https://github.com/yubing744)
- [@olgasafonova](https://github.com/olgasafonova)
- [@sharmanilay](https://github.com/sharmanilay)
- [@KhaiTrang1995](https://github.com/KhaiTrang1995)
- [@LocNguyenSGU](https://github.com/LocNguyenSGU)
- [@nedcodes-ok](https://github.com/nedcodes-ok)
- [@iftikharg786](https://github.com/iftikharg786)
- [@halith-smh](https://github.com/halith-smh)
- [@mertbaskurt](https://github.com/mertbaskurt)
- [@MatheusCampagnolo](https://github.com/MatheusCampagnolo)
- [@Marvin19700118](https://github.com/Marvin19700118)
- [@djmahe4](https://github.com/djmahe4)
- [@MArbeeGit](https://github.com/MArbeeGit)
- [@majorelalexis-stack](https://github.com/majorelalexis-stack)
- [@Svobikl](https://github.com/Svobikl)
- [@kromahlusenii-ops](https://github.com/kromahlusenii-ops)
- [@Krishna-Modi12](https://github.com/Krishna-Modi12)
- [@k-kolomeitsev](https://github.com/k-kolomeitsev)
- [@kennyzheng-builds](https://github.com/kennyzheng-builds)
- [@keyserfaty](https://github.com/keyserfaty)
- [@kage-art](https://github.com/kage-art)
- [@whatiskadudoing](https://github.com/whatiskadudoing)
- [@jonathimer](https://github.com/jonathimer)
- [@JaskiratAnand](https://github.com/JaskiratAnand)

## 许可证

原始代码和工具根据 MIT 许可证授权。请参阅 [LICENSE](LICENSE)。

原始文档和其他非代码编写内容根据 [CC BY 4.0](LICENSE-CONTENT) 授权，除非更具体的上游通知另有说明。有关归属和第三方许可证详细信息，请参阅 [docs/sources/sources.md](docs/sources/sources.md)。

---

## 星标历史

[![sickn33/antigravity-awesome-skills - Star History Chart](https://api.star-history.com/image?repos=sickn33/antigravity-awesome-skills&style=landscape1)](https://star-history.com/sickn33/antigravity-awesome-skills)

[![Star History Chart](https://api.star-history.com/svg?repos=sickn33/antigravity-awesome-skills&type=date&legend=top-left)](https://www.star-history.com/#sickn33/antigravity-awesome-skills&type=date&legend=top-left)

如果 Antigravity Awesome Skills 对你有帮助，请考虑 ⭐ 为仓库加星！

<!-- GitHub Topics (for maintainers): claude-code, gemini-cli, codex-cli, antigravity, cursor, github-copilot, opencode, agentic-skills, ai-coding, llm-tools, ai-agents, autonomous-coding, mcp, ai-developer-tools, ai-pair-programming, vibe-coding, skill, skills, SKILL.md, rules.md, CLAUDE.md, GEMINI.md, CURSOR.md -->
