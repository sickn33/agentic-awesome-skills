# 合并拉取请求

**策略：我们总是在 GitHub 上合并 PR，以便贡献者获得信任。我们从未在本地集成他们的工作后关闭 PR。**

## 始终通过 GitHub 合并

- 对每个接受的 PR 使用 GitHub UI **"Squash and merge"**
- PR 必须显示为 **Merged**，而不是 Closed。这样贡献者会出现在仓库的贡献图中，并且 PR 清楚地链接到合并提交
- **不要**通过在本地压缩、推送到 `main` 然后关闭 PR 来集成 PR。这将显示"Closed"，贡献者将无法获得适当的信任
- 在合并之前，要求来自 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) 的正常 PR 检查为绿色。如果 PR 触及 `SKILL.md`，还要求单独的 [`skill-review` 工作流](../../.github/workflows/skill-review.yml) 通过

## 如果 PR 有合并冲突

在 **PR 分支**上解决冲突，使 PR 可合并，然后在 GitHub 上使用 "Squash and merge"。

### 生成文件策略

- 将 `CATALOG.md`、`skills_index.json` 和 `data/*.json` 视为 **派生工件**，而不是贡献者拥有的源文件
- `README.md` 是混合所有权：允许贡献者散文编辑，但工作流管理的元数据在 `main` 上规范化
- 如果派生文件出现在 PR 刷新或合并冲突中，优先选择 **`main` 的一方**并从 PR 分支中删除它们，而不是在那里手动维护它们
- 不要仅因为共享生成文件在其他合并后会以不同方式重新生成而阻止 PR。`main` 在合并后自动同步最终状态

### 步骤（维护者在贡献者分支上解决冲突）

1. **获取 PR 分支**
   `git fetch origin pull/<PR_NUMBER>/head:pr-<PR_NUMBER>`
2. **检出该分支**
   `git checkout pr-<PR_NUMBER>`
3. **将 `main` 合并到其中**
   `git merge origin/main`
   在工作树中解决任何冲突。对于生成的注册表文件（`CATALOG.md`、`data/*.json`、`skills_index.json`），优先选择 `main` 的版本并从贡献者分支中删除它们：
   `git checkout --theirs CATALOG.md data/catalog.json skills_index.json`
   如果 `README.md` 仅因为工作流管理的元数据而冲突，也在那里优先选择 `main` 的一方。当它们是真正的源更改时，保留贡献者散文编辑。
4. **提交合并**
   `git add .` 然后 `git commit -m "chore: merge main to resolve conflicts"`（或保留默认合并消息）。
5. **推送到 PR 来自的同一分支**
   如果 PR 来自贡献者的 fork 分支（例如 `sraphaz:feat/uncle-bob-craft`），您需要对该分支的推送访问权限。选项:
   - **首选：** 要求贡献者将 `main` 合并到他们的分支中，解决冲突，然后推送；然后您在 GitHub 上使用 "Squash and merge"。
   - 如果您有办法推送到他们的分支（例如他们给了您权限，或者分支在这个仓库中），推送：
     `git push origin pr-<PR_NUMBER>:feat/uncle-bob-craft`（替换为 PR 中的实际分支名称）。
6. **在 GitHub 上：** PR 现在应该可以合并了。点击 **"Squash and merge"**。PR 将显示为 **Merged**。

### 如果贡献者解决冲突

要求他们:

```bash
git checkout <their-branch>
git fetch origin main
git merge origin/main
# 解决冲突，然后如果出现派生文件，则从 PR 中删除它们:
# CATALOG.md、skills_index.json、data/*.json
git add .
git commit -m "chore: merge main to resolve conflicts"
git push origin <their-branch>
```

然后您在 GitHub 上使用 **"Squash and merge"**。PR 将是 **Merged**，而不是 Closed。

## 罕见异常：本地压缩（尽可能避免）

只有在无法通过 GitHub 合并的情况下（例如贡献者无法联系且您必须集成他们的工作，或者一次性批量），您可以在本地压缩并推送到 `main`。在这种情况下:

1. 将 **Co-authored-by** 行添加到压缩提交，以便贡献者仍然获得信任（参见 [GitHub：创建具有多个作者的提交](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)）。
2. 关闭 PR 并附上注释，解释为什么在本地集成以及信任在提交中。
3. 优先选择在未来避免此模式，以便 PR 可以正常 **Merged**。

## 摘要

| 目标                         | 操作                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| 给予贡献者信任   | 始终在 GitHub 上使用 **Squash and merge**，以便 PR 显示 **Merged**。  |
| PR 有冲突           | 在 PR 分支上解决（您或贡献者），然后 **Squash and merge**。 |
| 从不                      | 在本地集成然后 **Close** PR 而不合并。          |

## 参考

- [GitHub：创建具有多个作者的提交](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)
- [GitHub：合并 PR](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request)
