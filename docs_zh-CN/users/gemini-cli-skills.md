# Gemini CLI 技能

如果您正在 GitHub 上评估 **Gemini CLI 技能**，这个仓库是一个强大的广泛起点：可安装的技能、广泛的覆盖面，以及首日使用的清晰入门指南。

Antigravity Awesome Skills 通过 `.gemini/skills/` 路径支持 Gemini CLI，并结合了通用工程剧本与针对 AI 系统、集成、基础设施、测试、产品和增长的专业技能。

## 如何在 Gemini CLI 中使用 Antigravity Awesome Skills

安装到 Gemini 技能路径，然后要求 Gemini 一次将一个技能应用于特定任务。当您保持活跃集较小并为面前的工作选择清晰的工作流导向技能时，效果最佳。

##为什么将此仓库用于 Gemini CLI

- 它直接安装到预期的 Gemini 技能路径中。
- 它既包括核心软件工程技能，也包括更深入的代理/LLM 导向技能。
- 它通过捆绑包和工作流帮助新用户入门，而不是强迫从 1,436+ 个文件中冷启动。
- 无论您想要一个广泛的内部技能库，还是想要一个快速测试许多工作流的单一仓库，它都很有用。

## 安装 Gemini CLI 技能

```bash
npx antigravity-awesome-skills --gemini
```

### 验证安装

```bash
test -d .gemini/skills || test -d ~/.gemini/skills
```

## Gemini CLI 的最佳入门技能

- [`brainstorming`](../../skills/brainstorming/)：将模糊的目标转化为更清晰的实现规范。
- [`prompt-engineering`](../../skills/prompt-engineering/)：提高提示质量和任务框架。
- [`rag-engineer`](../../skills/rag-engineer/)：构建和评估检索系统。
- [`langgraph`](../../skills/langgraph/)：设计有状态的代理工作流。
- [`mcp-builder`](../../skills/mcp-builder/)：添加工具集成和外部功能。

## Gemini CLI 提示词示例

```text
使用 @prompt-engineering 改进这个编码助手的系统提示词。
```

```text
使用 @langgraph 为支持分类设计一个有状态的代理工作流。
```

```text
使用 @mcp-builder 规划 GitHub + Slack 集成所需的工具。
```

## 下一步操作

- 如果您想要按角色划分的更小的精选子集，请从 [`bundles.md`](bundles.md) 开始。
- 如果您正在比较通用代理技能库，请阅读 [`ai-agent-skills.md`](ai-agent-skills.md)。
- 如果您想要更多关于如何在真实提示词中调用技能的示例，请使用 [`usage.md`](usage.md)。
