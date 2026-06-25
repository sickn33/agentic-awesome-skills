# 发布流程

这是维护者切发布版本时使用的操作手册。历史发布记录属于 [`CHANGELOG.md`](../../CHANGELOG.md)；本文档只记录可重复的当前流程。

## 前置条件

- 受 Git 跟踪的工作树是干净的。
- 当前分支是 `main`。
- `CHANGELOG.md` 已经包含准备发布的版本段落。
- README 统计、徽章、致谢和支持链接是最新的。

## 发布检查清单

1. 运行脚本化预检：

```bash
npm run release:preflight
```

该预检会运行确定性的 `sync:release-state` 流程，刷新 `apps/web-app/public` 中受跟踪的 Web 资产，执行本地测试套件，安装 Web 应用依赖，构建 Web 应用，并执行 `npm pack --dry-run --json`，因此发布标签会用与 CI 后续相同的 artifact 路径验证。

当前 CI/发布契约还要求：

- Python 依赖来自 `tools/requirements.txt`。
- Web 应用覆盖率任务（`npm run app:test:coverage`）保持通过。
- `npm run security:docs` 通过，且不依赖非阻塞审计警告。

2. 运行必需的文档安全加固检查：

```bash
npm run security:docs
```

该检查用于在发布前验证整个仓库的高风险命令模式和类似 token 的内联示例。

3. 可选强化检查：

```bash
npm run validate:strict
```

它适合发现历史质量债务，但目前不是整个仓库的发布阻断条件。

4. 更新发布面向文档：

- 在 [`CHANGELOG.md`](../../CHANGELOG.md) 中添加发布条目。
- 确认 `README.md` 反映当前版本和生成计数。
- 确认 Credits & Sources、贡献者和支持链接仍然正确。
- 如果 PR 或 CI 工作流行为在本周期发生变化，确认维护者和贡献者文档提到了当前检查。
- 如果维护者运行了 `npm run sync:risk-labels` 或类似清理流程，确认维护者文档仍描述当前 audit -> sync -> repo-state 循环。

5. 在本地准备发布提交和标签：

```bash
npm run release:prepare -- X.Y.Z
```

该命令会：

- 检查 `CHANGELOG.md` 中是否存在 `X.Y.Z`。
- 对齐 `package.json` / `package-lock.json`。
- 运行完整发布套件。
- 刷新 `README.md` 中的发布元数据。
- 暂存规范发布文件。
- 创建 `chore: release vX.Y.Z` 提交。
- 创建本地标签 `vX.Y.Z`。

6. 发布 GitHub Release：

```bash
npm run release:publish -- X.Y.Z
```

该命令会推送 `main`，推送 `vX.Y.Z`，并根据匹配的 `CHANGELOG.md` 段落创建 GitHub Release 对象。

7. 如有需要发布到 npm：

```bash
npm publish
```

通常 npm 发布仍由 GitHub Release 发布后的现有工作流完成。该工作流会重新运行 `sync:release-state`，从 `tools/requirements.txt` 安装 Python 依赖，刷新受跟踪的 Web 资产，通过 `git diff --exit-code` 检测规范漂移，执行测试和文档安全检查，运行 Web 应用覆盖率门禁，执行 `npm audit --audit-level=high`，构建 Web 应用，并在 `npm publish` 前 dry-run npm 包。

## 规范同步 Bot

`main` 仍使用仓库的自动同步模型来维护规范生成物，但契约必须保持窄而可预测：

- PR 保持 source-only。
- 合并后，`main` 工作流可以用 `[ci skip]` 将规范生成文件直接提交到 `main`。
- 这些 bot 提交会跳过 CI，因此只能暂存规范/生成文件；任何非托管漂移都必须让工作流失败，而不是被静默推送。
- bot 只允许暂存 `tools/scripts/generated_files.js --include-mixed` 解析出的文件。
- 如果 repo-state sync 后留下任何非托管的受跟踪或未跟踪漂移，工作流必须失败。
- 定时 hygiene workflow 使用相同契约和 concurrency group，确保同一时间只有一个规范同步写入者运行。

## 回滚说明

- 如果发布标签错误，在重新发布前同时删除本地和远程标签。
- 如果打标签后生成文件发生漂移，切一个后续 patch release，而不是修改已发布标签。
- 如果 npm publish 在打标签后失败，修复问题、递增版本并发布新版本，不要复用同一个版本号。
