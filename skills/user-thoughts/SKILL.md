---
name: user-thoughts
description: >-
  Persist user decisions and project constraints to mdbase across sessions.
  Trigger on /user-thoughts or /ustht, or when user discusses architecture,
  tech stack, rules, UI/UX, or mentions '想法', '记录', 'mdbase'.
license: MIT
source: JularDepick/user-thoughts.SKILL
risk: safe
allowed-tools: read write bash
metadata:
  author: JularDepick
  source_repo: JularDepick/user-thoughts.SKILL
  category: productivity
  date_added: "2026-05-31"
  tags: "[userthoughts, documentation, project-management, mdbase]"
  supported_agents: "[claude, cursor, gemini]"
---

# user-thoughts.SKILL

## 概述

跨会话、跨 Agent 时，用户积累的决策和约束会彻底丢失。user-thoughts.SKILL 将这些想法持久化到 mdbase，绑定于项目而非会话——任何接手的 Agent 读取 mdbase 即可继承用户的完整意图，无需重新推导。

## 重要声明

- **本 SKILL** 系指本文档及同目录下内容，整体称 `user-thoughts.SKILL`
- **用户**：使用、调用、提及本 SKILL 的发言人
- **行为边界**：SKILL 只做想法分析和记录，不干预 Agent 对用户指令的执行。这是核心设计——当用户说"把按钮改成红色"时，Agent 应同时执行修改并记录偏好，两者并行互不干扰。记录行为不应延迟或阻塞用户的实际工作

## When to Use

## 使用指南

- 用户发言包含项目想法、决策、需求、规则、偏好时，SKILL 自动激活
- 命令以 `/user-thoughts` 或 `/ustht` 引导（详见 [references/commands.md](references/commands.md)）
- 自然语言触发兼容任何语言——Agent 应匹配用户意图，而非特定关键词

**命令前缀**：`/user-thoughts` 为完整前缀，`/ustht` 为简写，两者等价可互换。

**激活边界**：当用户发言同时包含指令和想法时（如"把这个按钮改成红色"），Agent 应执行指令并同时记录想法。仅当发言纯粹是闲聊或与项目完全无关时（如"今天天气不错"）才不激活。

## 语言策略

- **SKILL 本体**（SKILL.md、references/、assets/）语言固定为中文，不随用户语言变化
- **Agent 输出适配用户语言**：命令反馈、sortin 摘要、mdbase 展示、提示信息等面向用户的输出，应使用用户当前对话所用的语言——用户无需切换语言即可理解反馈
- **想法原文保留**：raw 记录和 mdbase 中的想法内容保持用户原始语言，不翻译、不转换——保持原文可避免翻译引入的歧义，且用户原始表述是最权威的意图表达

## 工作原理

### 工作流

```
用户发言 → Agent 识别项目想法 → 写入 raw/（即时计划）
         ↓
用户执行 /ustht sortin → Agent 处理 raw/ → 按维度追加到 mdbase/
         ↓
用户执行 /ustht mdbase show → Agent 展示组织好的想法库
```

### 工作模式

- **被动模式**（`INSTANT_STATUS=off`）：仅响应技能命令，不自动识别想法
- **即时计划模式**（`INSTANT_STATUS=on` 且 `SKILL_STATUS=on`）：自动识别用户想法并写入 `#raw/`，mdbase 写入延迟到 sortin
- **忽略模式**：`ignore start`/`end` 区间内发言不记入
- **只读模式**（必需工具缺失时）：只读命令可用，写入命令返回提示

模式组合：即时计划 + 忽略可同时生效。`SKILL_STATUS=off` 时即时计划自动暂停，无论 `INSTANT_STATUS` 值如何。被动/即时计划通过 define.ini 持久化；忽略区间仅上下文有效。

---

## 目录定义

- `@/`：SKILL 安装目录（SKILL.md 所在目录，即 `user-thoughts/`）
- `~/`：工作目录
- `#ustht/` = `~/.ustht/`（`.ustht` 是 `user-thoughts` 的运行时缩写）
- `#mdbase/` = `~/.ustht/mdbase/`
- `#ignored/` = `~/.ustht/ignored/`
- `#raw/` = `~/.ustht/raw/`
- `#export/` = `~/.ustht/export/`

---

## #ustht 目录结构

```
.ustht/
├── define.ini           # SKILL 运行状态
├── README.ai.md         # .ustht/ 目录说明
├── raw/                 # 用户原始发言(按日期分片)
│   └── yyyy-mm-dd.md
├── ignored/             # 被标记忽略的发言
│   └── yyyy-mm-dd.md
├── mdbase/              # 整理后的用户想法库
│   ├── backlog.md       # 待办事项（用户明确提出但尚未开始的事项，由 sortin 归入）
│   ├── README.ai.md     # mdbase 索引与概览
│   └── details/         # 按维度组织的想法文件
│       ├── rules.md     # 项目规则、约束、原则
│       ├── plans.md     # 项目规划、方向性想法
│       ├── ui/
│       │   ├── outline.md  # UI 整体设计
│       │   └── details.md  # UI 细节设计
│       ├── dev-stack.md # 技术栈选型、框架决策
│       ├── general.md   # 通用（不属于其他维度的想法）
│       └── ...          # 按需扩展
└── export/              # 从 mdbase 导出的内容
```

---

## 工具与环境

依赖（本 SKILL 不提供）：
- **read/write**（必需）：读写 `#ustht/` 下各文件，也用于初始化时逐文件复制模板
- **bash**（必需）：目录创建、文件删除。不使用 `cp -r` 等递归命令（防止符号链接攻击）
- **SubAgent**（可选）：并行维护 mdbase 维度文件

SubAgent 可用时**必须使用**，不得由主 Agent 自行维护。原因：mdbase 维护涉及多文件读写，SubAgent 可并行处理各维度文件，显著减少主 Agent 的上下文占用和执行时间。SubAgent 不可用时主 Agent 才直接执行。

必需工具缺失时向用户发出警告，SKILL 进入只读模式：`mdbase show`、`raw`、`status`、`ignore show` 等只读命令仍可用，`sortin`、`ignore start/end`、`ignore --last`、`init` 等写入命令返回提示。

### 内置脚本

`@/scripts/` 下提供 Python 脚本，Agent 可通过 bash 直接调用，减少多文件操作的 token 消耗：

| 脚本 | 用途 | 调用示例 |
|------|------|---------|
| `common.py` | 共享工具函数（供其他脚本导入） | 不直接调用 |
| `status.py` | 显示当前状态 | `python @/scripts/status.py` |
| `init.py` | 初始化 .ustht/ | `python @/scripts/init.py` |
| `show_raw.py` | 查看未处理 raw | `python @/scripts/show_raw.py` |
| `show_mdbase.py` | 查看 mdbase 索引/维度 | `python @/scripts/show_mdbase.py show [--all\|--维度名]` |
| `sortin.py` | 执行软维护 | `python @/scripts/sortin.py [--dry]` |
| `write_raw.py` | 写入 raw 条目 | `python @/scripts/write_raw.py "想法" [--dim 维度]` |
| `toggle.py` | 切换状态 | `python @/scripts/toggle.py skill\|instant [on\|off]` |
| `ignore_ops.py` | 忽略操作 | `python @/scripts/ignore_ops.py show\|remove_last\|add_suffix` |

> **resort（硬维护）** 无独立脚本——该操作需要 Agent 语义分析（去重、归类、合并），由 Agent 直接执行。

脚本自动检测工作目录下的 `.ustht/`，无需手动指定路径。所有脚本支持 `--help` 参数查看详细用法。优先使用脚本处理机械性操作，将 Agent 的上下文留给语义分析（如维度归类）。

---

## 语法定义

本文档中 `&[keyname]` 表示引用 `#ustht/define.ini` 中 keyname 的值，是文档内的简写记法。Agent 通过读取 define.ini 获取实际值。define.ini 的写入由 sortin/resort/init 通过整文件覆写完成，不使用 `&[keyname]=value` 语法。

| 键名 | 类型 | 说明 |
|------|------|------|
| SKILL_STATUS | on\|off | 技能启用状态 |
| INSTANT_STATUS | on\|off | 即时计划启用状态（需 SKILL_STATUS=on 才生效） |
| LAST_SORTIN | yyyy-mm-dd HH:MM | 上次 sortin 时间戳 |

---

## 技能命令

命令以 `/user-thoughts` 或 `/ustht` 引导，两者等价。完整正则语法和自然语言映射见 [references/commands.md](references/commands.md)。

### 状态与开关

- `/ustht init` — 初始化工作目录（创建 `.ustht/` 及模板）
- `/ustht status` — 输出全部状态（SKILL_STATUS、INSTANT_STATUS、LAST_SORTIN、未处理 raw 数、mdbase 维度文件数）
- `/ustht skill` — 输出技能状态
- `/ustht skill on|off` — 开启/关闭技能
- `/ustht instant` — 输出即时计划状态
- `/ustht instant on|off` — 开启/关闭即时计划

### 维护流程

- `/ustht sortin [--dry]` — 软维护（追加新想法），`--dry` 预览不写入
- `/ustht resort [--dry]` — 硬维护（重整全部 mdbase），`--dry` 预览不写入

### 忽略管理

- `/ustht ignore start|end` — 开始/结束忽略区间（仅上下文有效）
- `/ustht ignore --last` — 忽略上一条已记录的想法（从 raw 中删除该条目，记入 `#ignored/`；若 raw 文件变空，保留空文件不删除）
- `/ustht ignore` — 独立使用时等价于 `--last`（优先匹配全行命令正则，不触发后缀模式）
- `/ustht ignore show` — 列举 `#ignored/` 目录内容（只读命令，SKILL 关闭时仍可用）
- `.*/ustht ignore` — 后缀模式，忽略本条消息的想法（不记入 raw，记入 `#ignored/`；不受 SKILL_STATUS 控制）

### 内容查看与导出

- `/ustht raw` — 查看未处理的 raw 记录
- `/ustht mdbase show [--all|--维度名]` — 查看索引或指定维度
- `/ustht mdbase export [--all|--维度名]` — 导出到 `#export/`
- `/ustht import <路径>` — 扫描路径下 .md 文件，并入 mdbase

**触发规则：** 用户发言匹配命令，或自然语言意图明确指向唯一命令时触发。详细映射见 [references/commands.md](references/commands.md)。

**链式命令：** 使用 `&&` 连接多条命令，按顺序依次执行。如 `/ustht skill on && instant on`。

---

## 即时计划

当 `&[INSTANT_STATUS]` 为 `on` 时自动执行：

1. **识别**：判断用户发言是否包含项目想法、决策、需求、规则、偏好
2. **制订计划**：写入 `#raw/` 当天日期.md，格式 `- [HH:MM] 想法原文 | 待归入:预判维度`
3. **不执行**：不改动 mdbase，延迟到 sortin 时统一执行
4. **过滤**：忽略区间内或末尾携带 `/ustht ignore`（或 `/user-thoughts ignore`）的发言不写入
5. **不中断**：后台静默执行，不打断正常对话
6. **自动建议**：单日 raw 条目超过 5 条时，主动建议用户执行 sortin

---

## 维护流程

流程入参：`sortin` 软维护（追加）| `resort` 硬维护（重整）。

1. 读取 `#raw/` 全部 `.md`，过滤掉已含 `<!-- processed -->` 标记的文件
2. 逐条分析归属维度
3. 追加（soft）或重整（hard）mdbase 对应文件
4. 在已处理 raw 文件头部插入 `<!-- processed -->` 标记
5. 更新 `define.ini` 中 `LAST_SORTIN` 时间戳
6. 更新 `#mdbase/README.ai.md` 索引和概要
7. 输出摘要

维度文件管理、raw 状态机制详见 [references/sortin.md](references/sortin.md)。

---

## 第一次使用

当工作目录下不存在 `.ustht/` 时，Agent 自动触发 `/ustht init`，或用户手动执行：

1. 在 `~/` 创建 `.ustht/` 目录
2. 复制 `@/assets/Runtime-Template/` 全部内容到 `#ustht/`
3. 用 bash 创建 `#raw/`、`#ignored/`、`#export/` 目录（若模板未包含）
4. 确认 `define.ini` 包含完整键值（SKILL_STATUS、INSTANT_STATUS、LAST_SORTIN）
5. 输出初始化确认：目录结构概览 + 可用命令列表（命令以 `/ustht` 形式展示）

已存在 `.ustht/` 时执行 `/ustht init`：输出提示"已初始化"，不覆盖。

---

## 示例

### 基本对话捕获

```
User: "登录页用 OAuth2，别用 JWT——上个项目吃过 token 过期的亏。"
Agent: [即时计划] 已记录到 raw/2026-05-31.md

User: "/ustht sortin"
Agent: [sortin] 1 条新想法归入 rules.md

User: "/ustht mdbase show rules"
Agent:
  ## rules.md
  - [2026-05-31 14:00] 登录页用 OAuth2，别用 JWT——上个项目吃过 token 过期的亏。
```

### 忽略区间

```
User: "/ustht ignore start"
User: "今天天气不错，中午吃什么？"
User: "/ustht ignore end"
User: "首页按钮改成圆角 8px"
Agent: [即时计划] 已记录到 raw/2026-05-31.md（仅"圆角 8px"一条）
```

### 跨会话接手

```
[会话 1]
User: "Next.js + Prisma，不要 MongoDB。暗色主题优先。"
Agent: [即时计划] 已记录

[会话 2 / 不同 Agent]
Agent 读取 .ustht/mdbase/ → 已知技术栈和 UI 偏好 → 直接实现
```

---

## 最佳实践

- ✅ **用户发言优先**：明确表述都应记录，不得以 Agent 判断为由忽略——用户说了就记，这是用户的决策库，不是 Agent 的判断库
- ✅ **不过度推断**：只记录用户明确表达或可直接推导的想法——过度推断会污染 mdbase，让用户难以分辨哪些是自己的原意
- ✅ **保持原文**：保留用户原始表述，不简化、不改写、不丢失细节。sortin 的"格式化"仅指：去除 raw 中的时间戳前缀和 `| 待归入:维度名` 后缀，按日期分组加标题，不改动想法正文。原文中的否定句、具体数值、限定条件都是关键意图，丢失它们等于丢失决策
- ✅ **维度归类**：优先归入已有维度，无合适维度则归入 `general.md`，待办类想法归入 `backlog.md`
- ✅ **冲突处理**：以最新发言为准，原记录标注被替代并附日期——用户的决策会演进，保留历史但以最新为准
- ✅ **单条多想法拆分**：一条消息包含多个独立想法时，拆分为多条记录——便于 sortin 按维度分别归类
- ❌ **非项目内容不记录**：闲聊、与项目无关的话题不记入想法——mdbase 是项目决策库，不是聊天日志

---

## 局限性

- 本 SKILL 不能替代用户自身的判断——Agent 按规则记录，但不验证想法的可行性或一致性，这是有意为之：mdbase 是用户的决策记录，不是 Agent 的建议系统
- sortin 的维度归类依赖 Agent 语义分析，可能需要用户通过 `resort` 纠正——语义理解有边界，用户纠正是正常的迭代过程
- 忽略区间仅在当前上下文有效，跨会话自动失效——忽略通常是临时性需求，持久化反而可能造成意外遗漏
- `.ustht/` 目录的安全性由用户保障，SKILL 不做脱敏处理——保持原文原则要求不修改内容，敏感数据由用户通过 `ignore` 主动管理

---

## 安全规范

- **路径安全**：维度名每段仅允许 `[a-z0-9]` 开头和结尾的 `[a-z0-9-]` 序列，支持 `/` 作为子目录分隔符（如 `ui/outline`），禁止 `..`、`\`——维度名会被拼接为文件路径，特殊字符可能导致路径遍历攻击。所有操作限制在 `#ustht/` 内
- **内容安全**：想法原文保留不转义，`<!-- processed -->` 仅检查文件第一行——防止用户想法中的标记字符串干扰 sortin 判断
- **define.ini 安全**：值不得含换行符或 `=`——防止键值注入。写入使用整文件覆写
- **bash 安全**：不执行用户任意 shell 命令，文件名从已验证维度名构造——防止命令注入
- **敏感数据**：不脱敏，用户通过 `ignore` 主动排除，`.ustht/` 安全性由用户保障

完整安全规范见 [references/safety.md](references/safety.md)。

---

## 常见陷阱

- **ignore 区间不持久化**：`ignore start` 仅在当前上下文有效，跨会话自动失效——这是设计选择，不是缺陷，因为忽略意图通常只对当前对话有意义
- **命令与想法共存时**：先执行命令，再做想法记录，顺序不可颠倒。命令触发词本身不记入想法内容
- **raw 的 `<!-- processed -->` 标记**：必须在文件第一行，不能放在其他位置——sortin 仅检查第一行来判断文件是否已处理
- **sortin 不锁文件**：依赖 Agent 协调，sortin 期间新发言正常记入 raw
- **不主动删除维度文件**：用户明确要求时才标记 `<!-- deprecated -->`，不物理删除——保留历史可追溯性
- **resort 模式**：不是只追加，而是去重、归类、合并，必要时调整结构——与 sortin 的"只追加"策略不同
- **ignore --last 无上一条**：返回提示，不报错——静默失败比报错更符合忽略操作的语义
- **维度名验证**：每段须以 `[a-z0-9]` 开头和结尾，仅 `[a-z0-9-]`，支持 `/` 子目录分隔，含 `..`、`\` 的参数必须拒绝——防止路径遍历攻击
- **define.ini 写入**：值不得含换行符或 `=`，整文件覆写不追加——防止键值注入
- **通用兜底**：无法归入已有维度的想法追加到 `general.md`，不轻易新建维度——维度膨胀会降低 mdbase 的可用性

---

## 边界场景

- **SKILL 关闭后**：文件保留，写入类命令返回提示，只读命令仍可用
- **跨会话恢复**：读取 define.ini 恢复状态，忽略区间不恢复
- **多项目隔离**：各工作目录独立 `.ustht/`，互不影响

更多边界场景和完整交互示例见 [references/edge-cases.md](references/edge-cases.md)。

---

## 关联技能

- 无直接关联技能。本 SKILL 专注于用户想法的持久化，与其他技能无依赖关系。
