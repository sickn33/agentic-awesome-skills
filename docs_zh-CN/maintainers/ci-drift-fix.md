# CI 漂移修复指南

**问题**：失败的作业通常是因为 `main` 上的规范同步步骤运行后仍留下受跟踪的漂移。

**错误**：

```
❌ 检测到由 registry/readme/catalog 脚本产生的未提交更改。
```

**原因**：
规范同步契约不只覆盖根注册表文件。`generate_index.py`、`update_readme.py`、`build-catalog.js`、`setup_web.js` 和插件同步助手可能合法更新：

- `README.md`
- `CATALOG.md`
- `skills_index.json`
- `data/*.json`
- `apps/web-app/public/` 下受跟踪的 Web 资产
- 生成的插件元数据和插件安全副本

工作流期望这些同步步骤结束后仓库是干净的。任何剩余的受跟踪或非托管更改都表示 `main` 与生成管道实际产物不同步。

## Pull Request vs Main

- **Pull Request**：PR 现在应保持 **source-only**。贡献者不应提交派生注册表工件（`CATALOG.md`、`skills_index.json`、`data/*.json`）。CI 会阻止这些直接编辑，并将生成漂移作为信息性预览报告。
- **`main` push**：漂移仍是严格错误。`main` 必须在自动同步步骤后保持干净。

## 如何在 `main` 上修复

1. 在本地运行规范维护者同步：

   ```bash
   npm run sync:repo-state
   ```

2. 检查是否仍有脏工作树：

   ```bash
   git status
   git diff
   ```

3. 如果同步只产生规范/生成文件更改，请暂存并提交它们。优先使用生成文件契约，而不是手写文件列表：

   ```bash
   node tools/scripts/generated_files.js --include-mixed
   git add $(node tools/scripts/generated_files.js --include-mixed)
   git commit -m "chore: sync canonical artifacts"
   git push
   ```

4. 如果 `sync:repo-state` 留下无关或非托管漂移，请停止并检查。`main` 上的 bot 只允许推送规范/生成子集；其他任何东西都应让工作流失败，而不是被静默自动提交。

## PR 维护者指南

- 验证源代码变更，而不是要求贡献者提交生成工件。
- 如果贡献者 PR 直接修改 `CATALOG.md`、`skills_index.json` 或 `data/*.json`，请要求他们从 PR 中删除这些文件，或在刷新分支时移除。
- 如果合并冲突涉及生成注册表文件，请保留 `main` 版本，并让 `main` 合并后自动同步最终生成物。
- 如果 `main` 上的 CI 后续创建带 `[ci skip]` 的 bot 提交，这只对规范/生成子集是预期行为，不代表可以推送任意额外漂移。

**总结**：
只在 `main` 上把生成器漂移视为硬失败。对 PR 来说，契约更简单：审查 source-only 变更，生成输出仅作预览，最终规范工件由 `main` 生成。
