# Cursor 技能

如果您在 GitHub 上搜索了 **Cursor 技能**，此仓库旨在作为一个实用的起点：可安装的技能、清晰的使用文档，以及与 Cursor 聊天工作流良好配合的大型库。

Antigravity Awesome Skills 通过 `.cursor/skills/` 路径支持 Cursor，并保持入口点简单：一次安装，然后在聊天中调用您需要的技能。

## 如何在 Cursor 中使用 Antigravity Awesome Skills

将库安装到 Cursor 的技能目录中，然后使用 `@skill-name` 在聊天中直接调用技能。当您在一个对话中结合规划、实施和验证技能时，Cursor 的效果特别好。

## 为什么在 Cursor 中使用此仓库

- 它通过专用安装标志直接支持 Cursor。
- 它非常适合 UI 密集型和全栈工作流，Cursor 用户通常希望在一个地方进行规划、实施、验证和调试。
- 它包括捆绑包和工作流，当您不想立即从庞大的目录中手动选择时，这些很有帮助。
- 它足够广泛，涵盖前端、后端、基础设施、测试、产品和增长工作，无需切换仓库。

## 安装 Cursor 技能

```bash
npx antigravity-awesome-skills --cursor
```

### 验证安装

```bash
test -d .cursor/skills || test -d ~/.cursor/skills
```

## Cursor 最佳入门技能

- [`frontend-design`](../../skills/frontend-design/)：改善 UI 方向和交互质量。
- [`react-best-practices`](../../skills/react-best-practices/)：加强 React 和 Next.js 实施模式。
- [`tailwind-patterns`](../../skills/tailwind-patterns/)：整洁地构建实用工具优先的 UI 工作。
- [`testing-patterns`](../../skills/testing-patterns/)：添加专注的单元和集成测试。
- [`api-design-principles`](../../skills/api-design-principles/)：在实施扩散之前定义清晰的接口。

## Cursor 提示词示例

```text
@frontend-design redesign this landing page to feel more premium and conversion-focused.
```

```text
@react-best-practices review this component tree and fix the biggest performance problems.
```

```text
@testing-patterns add tests for the checkout state machine in this folder.
```

## 接下来做什么

- 如果您想要 Cursor 兼容技能的 GitHub 选项简短列表，请阅读 [`best-cursor-skills-github.md`](best-cursor-skills-github.md)。
- 如果您想要基于角色的起点（如 Web Wizard 或全栈开发者），请使用 [`bundles.md`](bundles.md)。
- 如果您想要更多提示词示例和执行模式，请打开 [`usage.md`](usage.md)。
