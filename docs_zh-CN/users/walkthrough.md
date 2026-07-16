# 演练：v8.2.0 版本维护清理

## 概述

本演练记录了 **v8.2.0** 版本在 2026-03-18 维护清理后的维护者端文档和发布工作。

## 已验证的更改

### 1. 社区 PR 批次已集成

- **PR #333**：修复了 `skill-anatomy` 和 `adapter-patterns` 中缺失的必需前置元数据字段
- **PR #336**：添加了 `astro`、`hono`、`pydantic-ai` 和 `sveltekit`
- **PR #338**：修复了 `browser-extension-builder` 中的格式错误标记
- **PR #343**：为 `devcontainer-setup` 添加了缺失的元数据标签
- **PR #340**：添加了 `openclaw-github-repo-commander`
- **PR #334**：添加了 `goldrush-api`
- **PR #345**：将 `Wolfe-Jam/faf-skills` 添加到 README 源致谢中

### 2. 面向发布的文档已刷新

- **README.md**：
  - 当前发布版本已更新为 **v8.2.0**
  - 发布摘要文本与已合并的 PR 批次保持一致
  - 贡献者致谢与最新合并集保持同步
- **docs/users/getting-started.md**：
  - 版本标题已更新为 **v8.2.0**
- **CHANGELOG.md**：
  - 添加了 **8.2.0** 的发布说明部分

### 3. 维护修复已验证

- **Issue #344**：修正了 `.claude-plugin/marketplace.json` 以使用 `source: "./"` 并为 Claude Code 市场条目添加了回归测试
- **.github/MAINTENANCE.md**：记录了分叉门控工作流和过时 PR 元数据的维护者流程

### 4. 发布协议已执行

- `npm run release:preflight`
- `npm run security:docs`
- `npm run validate:strict`（诊断，可选阻止器）
- `npm run release:prepare -- 8.2.0`
- `npm run release:publish -- 8.2.0`

## 预期结果

- 文档、变更日志和生成的元数据在发布状态上保持一致。
- 仓库成功发布了 `v8.2.0` 标签和 GitHub 发布版本。
