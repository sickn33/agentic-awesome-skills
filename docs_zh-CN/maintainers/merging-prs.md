# 合并拉取请求

规范流程见[英文合并指南](../../docs/maintainers/merging-prs.md)和[维护技能](../../skills/antigravity-maintainer-batch-release/SKILL.md)。读取当前基线的 `AGENTS.md`、维护指南和 `package.json` 后再操作。

## 受保护的合并

所有接受的源 PR 使用 `npm run merge:batch`。不得用 GitHub UI、裸合并 API、本地 squash 后直接推送 `main` 或复制工作后关闭 PR 来替代它。

1. 获取最新 `origin/main`，使用干净维护检出并保留用户未提交工作。
2. 在 PR 分支解决冲突；保留贡献者源修改，派生文件使用基线版本，由后续规范同步重新生成。
3. 检查整个变更 skill 子树，包括脚本、资源、来源、许可证、风险与限制。执行当前仓库要求的验证、引用、安全和测试检查。
4. 等待 `pr-policy`、`pr-evidence`、`source-validation`、`artifact-preview`。skill 内容修改还需真实的语义审查结果。`manual-review-required` 表示 Tessl 不可用或未产生通过结果，必须人工审查并绑定完整 head SHA，不能称为 Tessl 通过。
5. 对已审查的精确提交运行：

```bash
npm run merge:batch -- --prs <PR_NUMBER> --dry-run --reviewed-head <FULL_HEAD_SHA>
```

检查通过且 head 未改变后，移除 `--dry-run` 执行。命令负责将审批和合并绑定到当前 PR；基线或 head 改变后必须刷新证据，不能复用过期判断。

## 合并后

等待受保护的 `automation/canonical-repo-state` PR 收敛生成物与贡献者信息，验证最终 `main` 的 CI、CodeQL 和无漂移状态。源合并不代表已发布；没有单独发布授权时不要创建 tag、发布 npm 或部署 Pages。
