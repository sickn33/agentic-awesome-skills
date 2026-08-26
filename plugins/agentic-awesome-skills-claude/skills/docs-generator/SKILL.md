---
name: docs-generator
description: "Generate technical deliverables from completed analysis: reverse-engineering reports, penetration-test reports, CTF write-ups, and signature-analysis documentation with evidence-backed structure."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# Technical Documentation
## When to Use

- A finished analysis needs a structured, shareable report.
- Standardizing write-ups across multiple cases.


## 安全/逆向任务文档输出

当逆向/渗透/CTF/安全分析任务完成后，本 skill 负责在**用户项目目录**生成正式技术文档。

### 触发时机

1. 逆向任务完成，已产出核心结论（算法还原、签名破解、绕过方案等）
2. 渗透测试完成，已发现并验证漏洞
3. CTF 题目解出，已拿到 flag
4. 用户明确要求"写一份报告/文档/writeup"

### 模板选择

| 任务类型 | 使用模板 |
|---------|---------|
| APK/二进制/so 逆向 | `references/security-report-templates.md` → 逆向工程报告 |
| 渗透测试/漏洞挖掘 | `references/security-report-templates.md` → 渗透测试报告 |
| CTF 解题 | `references/security-report-templates.md` → CTF Writeup |
| JS/Web 签名逆向 | `references/security-report-templates.md` → 签名逆向报告 |
| 恶意软件 / APT / 病毒分析报告 | `references/security-report-templates.md` + **`references/vendor-report-rules.md`** |
| 通用技术文档 | `references/templates.md` → README / API 文档 |

### 厂商报告结构（Issue #65）

安全类正式报告 **MUST** 读取 `references/vendor-report-rules.md`（只取结构，不抄厂商原文）。仅在任务证据或用户明确要求时选择厂商 flavor；普通逆向和其他任务使用 `flavor = null`。

| Flavor / Overlay | 何时用 | 主参考骨架 |
|------------------|--------|------------|
| `malware` | 明确恶意样本、木马、白加黑、钓鱼投毒 | 火绒式：概述→流程→样本分析→应急处置→IOC |
| `apt` | APT/战役/团伙/多阶段感染链/行业定向 | 卡巴斯基 Securelist 式：摘要→感染链→调查叙事→Interesting findings→技术分析→检测缓解→IOC |
| `flavor = null` | 普通 APK/ELF/PE/Mach-O 逆向、算法/固件分析、渗透 / CTF / JS 签名 | 原任务模板 + Base 通用元素；不套 malware/APT 专属章节 |
| thin `vuln` | 用户明确要求漏洞/补丁/CVE 技术分析 | 概述→影响/复现→崩溃与补丁分析→防护建议（叠加在 null 上，非第 3 默认全文 flavor） |

原则：**模板在精不在多** —— 仅 2 个厂商全文 flavor；`vuln` 仅为可选 thin overlay，不另建第三套默认全文模板。
与 §0 Evidence→Finding→Path **同时生效**；冲突时 Evidence 契约优先。

### 输出规范

- **输出位置**：用户当前项目目录（不是 skill 包目录）
- **文件名格式**：`YYYY-MM-DD_[类型]-[目标简称]-report.md`
- **如果项目有 `docs/` 目录**：优先放在 `docs/` 下
- **编码**：UTF-8
- **语言**：跟随用户对话语言（中文对话出中文报告，英文对话出英文报告）

### 质量要求

- 所有代码块必须可直接运行或有明确上下文
- 不要有 placeholder/TODO
- 关键发现必须有证据支撑
- 复现步骤必须让第三方能独立重现
- 敏感信息（真实 token、密码、内部 URL）用占位符替代
- **MUST** 包含 Evidence → Finding → Path 链（见 `../ops/evidence-finding-path.md` 与模板 §0）
- **MUST** 读取 `references/vendor-report-rules.md`：选定 `malware` / `apt` 或 `flavor = null`（漏洞任务可叠加 thin `vuln`）；无 flavor 时只输出原任务模板和适用的 Base 元素，不强制 IOC/ATT&CK
- **SHOULD** 引用 case `scope.md` / `timeline.md`（`../scripts/case-init.ps1`）

### 图表集成

生成报告时，应在适当位置调用 `diagram-generator` skill 生成可视化图表：

| 报告类型 | 建议图表 | 图表类型 |
|---------|---------|---------|
| 逆向工程报告 | 函数调用关系图、数据流图 | Mermaid flowchart / sequenceDiagram |
| 渗透测试报告 | 攻击路径图、网络拓扑图 | Mermaid flowchart / Graphviz |
| CTF Writeup | 解题思路流程图 | Mermaid flowchart |
| JS 签名逆向报告 | 请求链路时序图、算法流程图 | Mermaid sequenceDiagram / flowchart |

图表以 Mermaid 代码块形式嵌入报告 markdown 中，确保可在 GitHub/GitLab 直接渲染。

---

## Core Principles

### 1. Progressive Disclosure

Reveal information in layers:

| Layer | Content | User Question |
|-------|---------|---------------|
| 1 | One-sentence description | What is it? |
| 2 | Quick start code block | How do I use it? |
| 3 | Full API reference | What are my options? |
| 4 | Architecture deep dive | How does it work? |

**Warnings, breaking changes, and prerequisites go at the TOP.**

### 2. Task-Oriented Writing

```markdown
<!-- Bad: Feature-oriented -->
## AuthService Class
The AuthService class provides authentication methods...

<!-- Good: Task-oriented -->
## Authenticating Users
To authenticate a user, call login() with credentials:
```

### 3. Show, Don't Tell

Every concept needs a concrete example.

## Formatting Standards

- **Sentence case headings**: "Getting started" not "Getting Started"
- **Max 3 heading levels**: Deeper means split the doc
- **Always specify language** in code blocks
- **Relative paths** for internal links
- **Tables** for structured data with 3+ attributes

## Quality Checklist

- [ ] Code examples tested and runnable
- [ ] No placeholder text or TODOs
- [ ] Matches actual code behavior
- [ ] Scannable without reading everything
- [ ] Reader knows what to do next

## Anti-Patterns

| Problem | Fix |
|---------|-----|
| Wall of text | Break up with headings, bullets, code, tables |
| Buried critical info | Warnings/breaking changes at TOP |
| Missing error docs | Always document what can go wrong |

## Templates

For README, API endpoint, and file organization templates, see [references/templates.md](references/templates.md).

## Related Skills

- `Skill(ce:writer)` - Writing style, tone, and voice (load The Engineer persona)
- `Skill(ce:visualizing-with-mermaid)` - Architecture and flow diagrams


---

## 按需自举（On-Demand Bootstrap）

本 skill 不依赖外部工具，纯文本生成。无需 bootstrap。

如果需要渲染图表嵌入报告，会调用 `diagram-generator/` skill。

---

## 路由上下文

**上游入口**: 所有安全/逆向 skill 在任务完成后自动调用本 skill
**触发方式**:
- 自动：任务完成后作为行为链第 9 步执行
- 手动：用户说"写报告"、"出文档"、"writeup"

**同级关联模块**:
- `apk-reverse/` — APK 逆向完成后生成逆向报告
- `ida-reverse/` — 二进制分析完成后生成逆向报告
- `radare2/` — CLI 分析完成后生成逆向报告
- `js-reverse/` — JS 签名逆向完成后生成签名报告
- `reverse-engineering/` — 通用逆向完成后生成逆向报告
- `field-journal/` — 报告内容同时作为进化日志的数据来源

**安全报告模板**: `references/security-report-templates.md`
**厂商报告规则**: `references/vendor-report-rules.md`（flavor: malware | apt | null；optional overlay: vuln）
**通用文档模板**: `references/templates.md`


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 报告是否含 Evidence / Finding / Path（ops 契约）？
- [ ] 是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- Report quality is bounded by the evidence captured during analysis.
- Templates assume technical audiences; executive summaries need tailoring.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
