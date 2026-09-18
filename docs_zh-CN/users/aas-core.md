# AAS Core

**AAS Core** 是 Agentic Awesome Skills 推荐的本地、代理优先控制层。它让 Codex 或 Claude Code 搜索并读取经过验证的完整本地目录、自主选择精确的技能 ID，再由 Core 将该选择记录并验证为 `aas-stack.json`，以便在任何变更发生前审查 CLI 计划。Core 不对技能评分、排名或作出推荐。

> **发布边界：** 14.6.0 npm 包早于 AAS Core，不能用于 Core 引导。支持 Core 的包从 15.x 系列开始；请只使用发布说明明确声明包含 AAS Core 的精确版本。

## 工作流程

1. 使用官方 AAS CLI 为 Codex 或 Claude Code 配置本地 stdio MCP。
2. 让代理调用 `search_skills` 和 `get_skill`，自行对结果进行语义判断，然后用项目 `profile` 和已选 ID 调用 `compose_stack`；使用 `inspect_stack` 验证，需要比较时再调用 `diff_stack`。
3. 检查 schema 2 的 `aas-stack.json`，确认其中的 `profile`、技能 ID 及其顺序与代理选择完全一致。
4. 使用 AAS CLI 验证清单并预览精确计划。
5. 检查计划后停止；只有在您明确参与受控预览开发时，才继续研究后续阶段。

## 信任边界

- AAS MCP 在本地运行，并且只提供读取功能；它不会安装、删除、应用或更新任何内容。
- 搜索覆盖完整目录，结果可分页并按稳定的目录顺序返回，不包含相关性分数或排名；Codex 或 Claude Code 自行评估并选择技能。
- `validate` 和 `plan` 是当前有文档支持的预览路径。`apply` 和 `recover` 默认禁用，不属于已经认证的预览安全声明。
- 目录和运行时身份在本地验证。默认情况下，项目数据不会发送到 AAS 服务。

## 与插件和直接安装的关系

AAS Core 是目录访问、选择记录和验证层；Codex 或 Claude Code 才负责语义决策。插件、专用插件包和完整技能库安装仍然是技能内容的交付方式。对于 Codex 和 Claude Code，建议先用 Core 保存代理选定的精确技能栈，再选择适当的交付方式。

尚未提供 Core 主机适配器的工具仍可使用传统的直接安装、插件或自定义清单集成。

完整的英文命令和当前配置要求请参阅 [`docs/users/aas-core.md`](../../docs/users/aas-core.md)。
