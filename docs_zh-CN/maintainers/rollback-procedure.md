# 回滚流程

新分支只保留已提交历史，不会备份未提交内容。首先检查 `git status --short`，备份并验证相关未跟踪文件及已暂存、未暂存修改，保留无关工作。

已提交变更应在基于当前 `origin/main` 的主题分支中对精确源提交使用 `git revert <commit>`，检查结果并运行对应验证，通过 `npm run merge:batch` 合并。生成物由受保护的规范同步 PR 收敛。

未提交修改只能在确认备份后按路径处理：`git restore --staged -- <path>` 仅取消暂存；`git restore -- <path>` 会丢弃该路径工作树修改。不要把切换分支当作备份，也不要无差别恢复全部文件。

不重写已发布历史或 tag，不复用 npm 版本。需要发布修复时按[发布流程](release-process.md)取得授权。完整说明见[英文回滚指南](../../docs/maintainers/rollback-procedure.md)。
