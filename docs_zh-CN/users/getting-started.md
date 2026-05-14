# Antigravity Awesome Skills 入门指南 (V10.7.0)

**新手入门？本指南将在 5 分钟内帮助您增强 AI 代理的能力。**

> **💡 安装后不知道该做什么？** 查看 [**完整使用指南**](usage.md) 获取详细说明和示例！

---

## 什么是"技能"(Skills)？

AI 代理（如 **Claude Code**、**Gemini**、**Cursor**）非常智能，但它们缺乏关于您工具的特定知识。
**技能** 是专门的操作手册（markdown 文件），用于教授您的 AI 如何完美地执行特定任务。

**类比：** 您的 AI 是一个聪明的实习生。**技能** 是使它们成为高级工程师的 SOP（标准操作程序）。

---

## 快速入门："入门包"(Starter Packs)

不要因为仓库的规模而感到恐慌。您不需要一次性安装所有内容。
我们策划了**入门包** 以帮助您立即开始使用。

您**只需安装一次完整的仓库**（通过 npx 或克隆）；入门包是按角色策划的列表，帮助您**选择要使用哪些技能**（例如 Web Wizard、Hacker Pack）——它们不是另一种安装方式。

### 1. 安装仓库

**选项 A — npx（最简单）：**

```bash
npx antigravity-awesome-skills
```

默认情况下，这会克隆到 `~/.gemini/antigravity/skills`。使用 `--cursor`、`--claude`、`--gemini`、`--codex` 或 `--kiro` 为特定工具安装，或使用 `--path <dir>` 指定自定义位置。运行 `npx antigravity-awesome-skills --help` 查看详细信息。

如果看到 404 错误，请使用：`npx github:sickn33/antigravity-awesome-skills`

**选项 B — git clone：**

```bash
# 通用（适用于大多数代理）
git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
```

### 2. 选择您的角色

找到与您角色匹配的捆绑包（参见 [bundles.md](bundles.md)）：

| 角色               | 捆绑包名称    | 内容                                        |
| :-------------------- | :------------- | :------------------------------------------------ |
| **Web 开发者**     | `Web Wizard`   | React 模式、Tailwind 精通、前端设计 |
| **安全工程师** | `Hacker Pack`  | OWASP、Metasploit、渗透测试方法论            |
| **经理 / 产品经理**      | `Product Pack` | 头脑风暴、规划、SEO、战略            |
| **所有功能**        | `Essentials`   | 清洁代码、规划、验证（基础）     |

---

## 捆绑包 vs 工作流

捆绑包和工作流解决不同的问题：

- **捆绑包** = 按角色策划的集合（选择什么）。
- **工作流** = 分步剧本（如何执行）。

首先从 [bundles.md](bundles.md) 中的捆绑包开始，然后在需要指导执行时从 [workflows.md](workflows.md) 运行工作流。

示例：

> "使用 **@antigravity-workflows** 并为我的项目想法运行 `ship-saas-mvp`。"

---

## 如何使用技能

安装后，只需自然地与您的 AI 对话。

### 示例 1：规划功能（**Essentials**）

> "使用 **@brainstorming** 帮助我设计新的登录流程。"

**发生什么：** AI 加载头脑风暴技能，向您提出结构化问题，并生成专业规范。

### 示例 2：检查代码（**Web Wizard**）

> "在此文件上运行 **@lint-and-validate** 并修复错误。"

**发生什么：** AI 遵循技能中定义的严格代码检查规则来清理您的代码。

### 示例 3：安全审计（**Hacker Pack**）

> "使用 **@api-security-best-practices** 审查我的 API 端点。"

**发生什么：** AI 根据 OWASP 标准审计您的代码。

---

## 🔌 支持的工具

| 工具            | 状态          | 路径                                                                  |
| :-------------- | :-------------- | :-------------------------------------------------------------------- |
| **Claude Code** | ✅ 完全支持 | `.claude/skills/` 或通过 `/plugin marketplace add sickn33/antigravity-awesome-skills` 安装 |
| **Gemini CLI**  | ✅ 完全支持 | `.gemini/skills/`                                                     |
| **Codex CLI**   | ✅ 完全支持 | `.codex/skills/`                                                      |
| **Kiro CLI**    | ✅ 完全支持 | 全局：`~/.kiro/skills/` · 工作区：`.kiro/skills/`                |
| **Kiro IDE**    | ✅ 完全支持 | 全局：`~/.kiro/skills/` · 工作区：`.kiro/skills/`                |
| **Antigravity** | ✅ 原生支持       | 全局：`~/.gemini/antigravity/skills/` · 工作区：`.agent/skills/` |
| **Cursor**      | ✅ 原生支持       | `.cursor/skills/`                                                     |
| **OpenCode**    | ✅ 完全支持 | `.agents/skills/`                                                     |
| **AdaL CLI**    | ✅ 完全支持 | `.adal/skills/`                                                       |
| **Copilot**     | ⚠️ 仅文本    | 手动复制粘贴                                                     |

---

## 信任与安全

我们对技能进行分类，以便您了解正在运行的内容：

- 🟣 **官方**：由 Anthropic/Google/供应商维护（高信任度）。
- 🔵 **安全**：非破坏性的社区技能（只读/规划）。
- 🔴 **风险**：修改系统或执行安全测试的技能（仅授权使用）。

添加新技能时，高风险指导会在发布前通过仓库范围的 `security:docs` 扫描进行额外审查。

_查看 [技能目录](../../CATALOG.md) 获取完整列表。_

---

## FAQ

如果您更喜欢使用 Claude Code 的插件市场流程而不是复制到 `.claude/skills/`，请使用：

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

**问：我需要安装每个技能吗？**
答：您只需克隆一次整个仓库；您的 AI 仅_读取_您调用（或相关）的技能，因此保持轻量级。[bundles.md](bundles.md) 中的**入门包** 是策划的列表，帮助您发现适合您角色的正确技能——它们不会改变您的安装方式。

**问：我可以制作自己的技能吗？**
答：可以！使用 **@skill-creator** 技能来构建您自己的技能。

**问：如果 Antigravity 在 Windows 上遇到截断崩溃循环卡住怎么办？**
答：按照 [windows-truncation-recovery.md](windows-truncation-recovery.md) 中的恢复步骤操作。它说明了哪些 Antigravity 存储文件夹需要备份和清除，并包含可选的批处理助手，改编自 [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274)。

**问：如果 Antigravity 在 Linux 或 macOS 上因太多技能激活而过载怎么办？**
答：使用 [agent-overload-recovery.md](agent-overload-recovery.md) 中的激活流程。它展示如何从克隆的仓库运行 `scripts/activate-skills.sh`，以便您可以将完整的库归档，并仅激活实时 Antigravity 目录中所需的捆绑包或技能。

**问：这是免费的吗？**
答：是的。原始代码和工具采用 MIT 许可证，原始文档/非代码编写内容采用 CC BY 4.0。参见 [../../LICENSE](../../LICENSE) 和 [../../LICENSE-CONTENT](../../LICENSE-CONTENT)。

---

## 下一步

首先需要特定工具的起点？

- [Claude Code 技能](claude-code-skills.md)
- [Cursor 技能](cursor-skills.md)
- [Codex CLI 技能](codex-cli-skills.md)
- [Gemini CLI 技能](gemini-cli-skills.md)

1. [浏览捆绑包](bundles.md)
2. [查看真实示例](../contributors/examples.md)
3. [贡献技能](../../CONTRIBUTING.md)
