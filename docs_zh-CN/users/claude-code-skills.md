# Claude Code 技能

如果您正在寻找可以从 GitHub 安装的 **Claude Code 技能**，此仓库旨在帮助您从首次克隆到快速上手第一个有用的提示词。

Antigravity Awesome Skills 为 Claude Code 用户提供了一个可安装的 `SKILL.md` 剧本库、基于角色的捆绑包和执行工作流。我们的目标不仅是收集提示词，而是让可重复的工程任务更容易调用、审查和重用。

## 如何在 Claude Code 中使用 Antigravity Awesome Skills

将库安装到 Claude Code 中，然后直接在对话中或通过插件市场路径调用专注的技能。当您保持提示词具体针对技能、范围和预期输出时，Claude Code 效果最佳。

## 为什么在 Claude Code 中使用此仓库

- 它包含 1,436+ 个技能，而不是狭窄的单域入门包。
- 它支持标准的 `.claude/skills/` 路径和 Claude Code 插件市场流程。
- 它包括入门文档、捆绑包和工作流，因此新用户无需猜测从何处开始。
- 它涵盖日常工程任务和专业工作，如安全审查、基础设施、产品规划和文档。

## 安装 Claude Code 技能

### 选项 A：安装程序 CLI

```bash
npx antigravity-awesome-skills --claude
```

### 选项 B：Claude Code 插件市场

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

### 验证安装

```bash
test -d .claude/skills || test -d ~/.claude/skills
```

## Claude Code 最佳入门技能

- [`brainstorming`](../../skills/brainstorming/)：在编写代码之前规划功能和规范。
- [`lint-and-validate`](../../skills/lint-and-validate/)：在提交之前运行快速质量检查。
- [`create-pr`](../../skills/create-pr/)：将您的工作打包成整洁的拉取请求。
- [`systematic-debugging`](../../skills/systematic-debugging/)：通过可重复的过程调查失败。
- [`security-auditor`](../../skills/security-auditor/)：以安全视角审查 API、身份验证和敏感流程。

## Claude Code 提示词示例

```text
Use @brainstorming to design a new billing workflow for my SaaS.
```

```text
Use @lint-and-validate on src/routes/api.ts and fix the issues you find.
```

```text
Use @create-pr to turn these changes into a clean PR summary and checklist.
```

## 接下来做什么

- 如果您想要基于角色的简短列表，请从 [`bundles.md`](bundles.md) 开始。
- 如果您想要逐步执行的剧本，请使用 [`workflows.md`](workflows.md)。
- 如果您仍在评估仓库，请比较 [`best-claude-code-skills-github.md`](best-claude-code-skills-github.md) 中的选项。
- 当您想要完整的安装矩阵时，请返回 [`README.md`](../../README.md) 中的主登陆页面。
