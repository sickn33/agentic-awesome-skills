# AAS Core

**AAS Core** 是 Agentic Awesome Skills 推荐的本地、代理优先控制层。它让 Codex 或 Claude Code 根据经过验证的本地目录搜索和检查技能、生成确定性的最小技能栈建议，并在任何变更发生前提供可审查的 `aas-stack.json` 和 CLI 计划。

> **发布边界：** 14.6.0 npm 包早于 AAS Core，不能用于 Core 引导。支持 Core 的包从 15.x 系列开始；请只使用发布说明明确声明包含 AAS Core 的精确版本。

## 工作流程

1. 使用官方 AAS CLI 为 Codex 或 Claude Code 配置本地 stdio MCP。
2. 让代理调用 `search_skills`、`get_skill` 和 `recommend_stack`；需要时再调用 `inspect_stack` 或 `diff_stack`。
3. 检查代理提出的 `aas-stack.json`。
4. 使用 AAS CLI 验证清单并预览精确计划。
5. 检查计划后停止；只有在您明确参与受控预览开发时，才继续研究后续阶段。

## 信任边界

- AAS MCP 在本地运行，并且只提供读取功能；它不会安装、删除、应用或更新任何内容。
- 建议来自确定性规则和目录证据，而不是另一次隐藏的模型调用。
- `validate` 和 `plan` 是当前有文档支持的预览路径。`apply` 和 `recover` 默认禁用，不属于已经认证的预览安全声明。
- 目录和运行时身份在本地验证。默认情况下，项目数据不会发送到 AAS 服务。

## 与插件和直接安装的关系

AAS Core 是编排和决策层。插件、专用插件包和完整技能库安装仍然是技能内容的交付方式。对于 Codex 和 Claude Code，建议先使用 Core 确定最小技能栈，再选择适当的交付方式。

尚未提供 Core 主机适配器的工具仍可使用传统的直接安装、插件或自定义清单集成。

完整的英文命令和当前配置要求请参阅 [`docs/users/aas-core.md`](../../docs/users/aas-core.md)。
