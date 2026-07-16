# 回滚过程

当结构重构、生成工件刷新或发布准备需要安全撤回时，请使用此过程。

## 回滚之前

- 使用 `git branch --show-current` 捕获当前分支名称
- 使用 `git status --short` 查看更改的文件
- 决定在还原之前是否需要保留任何生成的文件

## 安全回滚流程

1. 创建临时安全分支:

```bash
git switch -c rollback-safety-check
```

2. 验证仓库仍报告预期的更改文件:

```bash
git status --short
```

3. 切换回原始分支:

```bash
git switch -
```

4. 如果您以后需要仅放弃此重构，请恢复相关提交或显式还原特定文件:

```bash
git restore README.md CONTRIBUTING.md package.json package-lock.json
git restore --staged README.md CONTRIBUTING.md package.json package-lock.json
```

5. 如果重构已经提交，优先选择 `git revert <commit>` 而不是历史重写命令。

## 注意事项

- 除非您获得明确批准并了解对无关工作的影响，否则避免使用 `git reset --hard`
- 对于生成的工件，在回滚后使用标准脚本重新生成，而不是手动编辑它们
