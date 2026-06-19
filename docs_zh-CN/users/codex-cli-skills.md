# Codex CLI 技能

如果您想要易于安装且在本地编码循环中实用的 **Codex CLI 技能**，这个仓库就是为该确切用例而设计的。

Antigravity Awesome Skills 通过 `.codex/skills/` 路径支持 Codex CLI，并为您提供一套广泛的可重用任务剧本，用于规划、实现、调试、测试、安全审查和交付。

## 如何在 Codex CLI 中使用 Antigravity Awesome Skills

将库安装到您的 Codex 路径中，然后在提示词中直接调用专注的技能。最常见的模式是：

1. 使用 `npx antigravity-awesome-skills --codex` 安装
2. 选择一个工作流导向的技能，例如 `@brainstorming`、`@concise-planning` 或 `@test-driven-development`
3. 要求 Codex 将该技能应用于具体文件、功能、测试或错误修复

## 为什么将此仓库用于 Codex CLI

- 它通过专用安装标志和标准技能布局支持 Codex CLI。
- 它对于本地仓库工作非常强大，您可以在不更改库的情况下从规划到实现到验证。
- 它既包括通用工程技能，也包括更深入的专业轨道。
- 它为您提供文档和捆绑包，而不仅仅是原始技能文件。

## 安装 Codex CLI 技能

```bash
npx antigravity-awesome-skills --codex
```

如果您更喜欢插件风格的 Codex 集成，这个仓库还在 `.agents/plugins/marketplace.json` 和 `plugins/antigravity-awesome-skills/.codex-plugin/plugin.json` 中提供了仓库本地插件元数据。

### 验证安装

```bash
test -d .codex/skills || test -d ~/.codex/skills
```

## Codex CLI 的最佳入门技能

- [`brainstorming`](../../skills/brainstorming/)：在接触代码之前明确需求。
- [`concise-planning`](../../skills/concise-planning/)：将模糊的工作转化为原子执行计划。
- [`test-driven-development`](../../skills/test-driven-development/)：围绕红-绿-重构构建变更。
- [`lint-and-validate`](../../skills/lint-and-validate/)：保持质量检查接近实现循环。
- [`create-pr`](../../skills/create-pr/)：在实现完成后干净地收尾工作。

## Codex CLI 提示词示例

```text
使用 @concise-planning 将此功能请求分解为实施清单。
```

```text
在更改此解析器之前使用 @test-driven-development 添加测试。
```

```text
一旦所有测试都通过，使用 @create-pr 并总结面向用户的变更。
```

## 下一步操作

- 如果您想要一个在广泛和精选技能库之间进行选择的框架，请阅读 [`ai-agent-skills.md`](ai-agent-skills.md)。
- 当您想要常见工程目标的逐步执行模式时，请使用 [`workflows.md`](workflows.md)。
- 返回 [`README.md`](../../README.md) 查看完整兼容性矩阵。
