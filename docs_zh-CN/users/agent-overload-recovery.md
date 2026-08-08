# 针对上下文过载和截断的 Antigravity 恢复

当 Antigravity 为当前任务加载了太多技能并开始出现截断、上下文或轨迹转换错误时，请使用本指南。

典型症状：

- 代理仅当存在大型技能文件夹时崩溃
- 错误提到截断、上下文转换或无法转换的轨迹/消息
- 问题在大型仓库或长时间运行的任务中更频繁出现

## Linux 和 macOS 快速路径

使用激活脚本保持完整库归档，同时在实时 Antigravity 目录中仅暴露您需要的包或技能。

1. 完全关闭 Antigravity。
2. 如果您还没有克隆此仓库，请在本地某处克隆。
3. 从克隆的仓库运行激活脚本。

示例：

```bash
./scripts/activate-skills.sh "Web Wizard" "Integration & APIs"
./scripts/activate-skills.sh --clear
./scripts/activate-skills.sh brainstorming systematic-debugging
```

脚本的作用：

- 将仓库 `skills/` 树同步到 `~/.agents/skills_library`
- 在后备存储中保留您的完整库
- 仅将请求的包或技能 ID 激活到 `~/.agents/skills`
- `--clear` 首先归档当前活动目录，然后恢复选定的集合

可选的环境覆盖：

```bash
AG_BASE_DIR=/custom/antigravity ./scripts/activate-skills.sh --clear Essentials
AG_REPO_SKILLS_DIR=/path/to/repo/skills ./scripts/activate-skills.sh brainstorming
```

## Windows 恢复

如果 Antigravity 在 Windows 上陷入重启循环，请使用 Windows 特定的恢复指南：

- [windows-truncation-recovery.md](windows-truncation-recovery.md)

该指南涵盖了当主机不断重新打开相同损坏会话时所需的浏览器/应用存储清理。

## 预防提示

- 从包中的 3-5 个技能开始，而不是一次暴露整个库
- 在打开非常大的仓库之前使用包激活
- 保持特定于角色的栈活动，归档其余部分
- 如果主机存储了损坏的会话状态，请在恢复较小的活动集之前清除该主机状态
