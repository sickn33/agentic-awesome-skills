# CI 漂移修复指南

规范流程见[英文指南](../../docs/maintainers/ci-drift-fix.md)。`main` 只接受受保护的 PR；生成物也不能直接推送。

1. 在干净、已同步的维护检出中运行 `npm run sync:repo-state`，用 `git status --short` 和 `git diff` 检查差异。
2. 普通源 PR 不提交派生注册表、插件副本和 marketplace。`data/` 中的编辑输入不是一概禁止；以 `tools/scripts/generated_files.js` 的当前分类为准。
3. 仅生成物漂移由可信 `main` 工作流创建或更新 `automation/canonical-repo-state` PR。不要手工新建普通的 generated-only PR，也不要使用 `[ci skip]` 直接推送。
4. 该 PR 必须通过来源策略、精确 Git 树重建和预览检查，再受保护合并。最终 `main` 仍运行 CI 和 CodeQL。
5. 如果存在非托管漂移或工作流失败，先检查证据，在主题 PR 中修复源代码原因，再重试现有工作流。保留无关用户修改。

最后更新本地 `main`，验证重新生成不产生差异。同步不授权发布版本或部署网站。
