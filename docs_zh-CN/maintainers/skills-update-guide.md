# 技能更新指南

本地目录来自当前检出中的 `skills/`。重新生成索引不会获取上游代码，也不会发布网站。完整规范见[英文更新指南](../../docs/maintainers/skills-update-guide.md)。

先按根 `package.json` 准备 Node，并安装 `tools/requirements.txt` 中的 Python 依赖。运行 `npm ci` 和 `npm run app:install`。保留未提交工作；只在干净的 `main` 上使用 `git pull --ff-only origin main` 更新源码。

```bash
npm run build
npm run app:dev
```

`npm run update:skills` 只刷新索引和公共副本，不替代完整构建。`START_APP.bat` 准备 Web 依赖、调用 `app:setup` 并启动 Vite；它不会自动拉取 Git、通过 PowerShell 下载技能或安装 Python。

普通 PR 只提交源文件，生成物由受保护的 `automation/canonical-repo-state` PR 管理。本地更新不等于 npm 发布或 Pages 部署。
