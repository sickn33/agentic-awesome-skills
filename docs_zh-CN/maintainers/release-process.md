# 发布流程

本页概述当前受保护流程；完整规范是[英文发布指南](../../docs/maintainers/release-process.md)和[维护技能](../../skills/antigravity-maintainer-batch-release/SKILL.md)。发布必须得到单独授权。

## 顺序

1. 从干净且等于 `origin/main` 的维护检出开始。先通过源 PR 准备 `CHANGELOG.md`，核实来源、测试、风险与生成状态。
2. 运行 `npm run release:preflight`、`npm run security:docs`，以及当前基线要求的检查。
3. 运行 `npm run sync:release-state`、`npm run plugin-compat:check`、`npm run bundles:check`；第二次生成必须无差异。
4. 运行 `npm run release:prepare -- X.Y.Z`。它对齐版本、推送 `release/vX.Y.Z` 并打开发布 PR；此时不创建发布 tag，也不直接推送 `main`。
5. 通过受保护检查合并该精确发布 PR，并完成规范同步。
6. 运行 `npm run release:publish -- X.Y.Z`。它验证唯一、已合并且身份匹配的发布 PR，然后创建或复用对应 tag 和 GitHub Release。
7. 等待发布工作流，验证 npm 版本与预期 dist-tag。GitHub Release 对象本身不证明 npm 发布成功。
8. 仅从获批的不可变 `vX.Y.Z` tag 调度 Pages，验证精确提交的 CI、CodeQL、Pages、实时目录和旧网址跳转。不能从 `main` 调度发布。
9. 发现已配置的本地 AAS MCP 主机，使用发布包的 `aas mcp configure` 双阶段摘要确认流程更新现有条目并保留备份；验证真实 `initialize` 和 `tools/list` 握手报告相同版本。新建未配置主机需要另行授权。
10. 再次获取 `origin/main`，验证本地和远程一致，生成物无漂移，所有发布证据绑定到目标版本。任一步骤未完成，发布就未完成。

## 规范同步与恢复

派生文件由 `automation/canonical-repo-state` 受保护 PR 管理，不使用跳过 CI 的直接推送。普通源 PR 不提交这些生成物。

不要删除或重写已发布 tag，不要复用已发布 npm 版本。已发布版本的问题通过受保护的修复 PR 和获批的新版本解决。实验性功能或紧急情况不取消精确提交与完整对齐检查。
