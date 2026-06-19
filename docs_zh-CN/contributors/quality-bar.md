# 🏆 质量标准与验证标准

要将 **Antigravity Awesome Skills** 从脚本集合转变为可信平台，每个技能都必须达到特定的质量和安全标准。

## "Validated" 徽章 ✅

技能只有在满足以下 **6 项质量检查** 后才能获得 "Validated" 徽章。其中一些检查目前已自动执行，而其他检查仍需要审查人员判断：

### 1. 元数据完整性

`SKILL.md` 前置元数据必须是有效的 YAML 并包含：

- `name`：kebab-case 格式，与文件夹名称匹配
- `description`：200 字符以内，清晰的价值主张
- `risk`：`[none, safe, critical, offensive, unknown]` 之一。仅对遗留或未分类技能使用 `unknown`；新技能优先使用具体级别
- `source`：指向原始源的 URL（如果是原创则为 "self"）

### 2. 清晰的触发条件（"使用时机"）

技能必须有一个明确说明何时触发它的部分。

- **良好**："当用户要求调试 React 组件时使用"
- **不佳**："此技能帮助你处理代码"
接受的标题：`## When to Use`、`## Use this skill when`、`## When to Use This Skill`

### 3. 安全与风险分类

每个技能必须声明其风险级别：

- 🟢 **none**：纯文本/推理（例如：头脑风暴）
- 🔵 **safe**：读取文件、运行安全命令（例如：代码检查器）
- 🟠 **critical**：修改状态、删除文件、推送到生产环境（例如：Git 推送）
- 🔴 **offensive**：渗透测试/红队工具。**必须**有 "授权使用" 警告

### 4. 可复制粘贴的示例

至少有一个代码块或交互示例，用户（或代理）可以立即使用。

### 5. 明确的限制

已知边缘情况或技能_无法_做的事情列表。

- _示例_："在没有 WSL 的 Windows 上不工作"

### 6. 指令安全审查

如果技能包含命令示例、远程获取步骤、密钥或变更指导，PR 必须记录风险并通过 `npm run security:docs` 以及正常验证。

对于添加或修改 `SKILL.md` 的拉取请求，GitHub 还会运行自动化的 `skill-review` 工作流。将该审查视为正常 PR 质量门槛的一部分，并在合并前解决任何可操作的发现。

`npm run security:docs` 强制执行仓库范围的扫描：

- 命令管道，如 `curl ... | bash`、`wget ... | sh`、`irm ... | iex`
- 内联令牌/密钥风格的命令示例
- 通过 `<!-- security-allowlist: ... -->` 明确允许的高风险文档命令

### 额外的维护者审计

当您需要超出架构验证的仓库范围报告时，使用 `npm run audit:skills` 并回答：

- 哪些技能结构有效但仍需要可用性清理
- 哪些技能仍有截断的描述（问题 `#365`）
- 哪些技能缺少示例或限制
- 哪些技能具有最高浓度的警告/错误

---

## 支持级别

我们还按维护者分类技能：

| 级别         | 徽章 | 含义                                             |
| :------------ | :---- | :-------------------------------------------------- |
| **Official**  | 🟣    | 由核心团队维护。高可靠性。      |
| **Community** | ⚪    | 由生态系统贡献。尽力支持。  |
| **Verified**  | ✨    | 已通过深度手动审查的社区技能。 |

---

## 如何验证您的技能

规范的验证器是 `tools/scripts/validate_skills.py`，但在提交 PR 之前推荐的入口点是 `npm run validate`：

```bash
npm run validate
npm run audit:skills
npm run validate:references
npm test
npm run security:docs
```

注意：

- `npm run validate` 是操作性的贡献者门槛
- `npm run audit:skills` 是面向维护者的整个库的合规性/可用性报告
- `npm run security:docs` 对于命令繁重或风险技能内容是必需的
- 触及 `SKILL.md` 的 PR 还会获得自动化的 `skill-review` GitHub Actions 检查
- `npm run validate:strict` 是一个有用的加固过程，但仓库仍包含尚未满足严格验证的遗留技能
- 示例和限制即使当前验证器未完全自动强制执行，仍是质量标准的一部分
