# 命令参考

> 本文档是 `/ustht` 命令的完整规范，包含正则语法、自然语言映射和错误处理。SKILL.md 中仅列命令概要。

---

## 语法说明

- `^$` 匹配消息首尾（忽略前后空白）
- `^...$` 独立成行命令 | `.*...$` 末尾附加命令
- `(...)` 正则分组 | `(...)?` 可选分组
- `[文字]` 仅用于描述，表示该参数可省略（非正则语法）
- `a|b` 二选一
- **前缀等价**：`/user-thoughts` 为完整前缀，`/ustht` 为简写，两者等价可互换。下文正则均使用 `/(user-thoughts|ustht)` 同时匹配两种形式

---

## 链式命令

使用 `&&` 连接多条命令，按顺序依次执行：

```
/ustht <命令1> && <命令2> && <命令3>
```

规则：
- `&&` 前后可有空格，也可无空格
- 每段独立匹配命令正则，按从左到右顺序执行
- 某条命令失败时中断后续命令，输出错误
- 最终输出每条命令的执行结果

---

## 命令正则表

### 状态与开关

| 命令 | 正则 | 说明 |
|------|------|------|
| `/ustht init` | `^/(user-thoughts|ustht) init$` | 初始化工作目录，创建 `.ustht/` 及模板文件 |
| `/ustht status` | `^/(user-thoughts|ustht) status$` | 输出全部状态：SKILL_STATUS、INSTANT_STATUS、LAST_SORTIN、raw 文件数、mdbase 维度文件数 |
| `/ustht skill` | `^/(user-thoughts|ustht) skill$` | 输出 SKILL_STATUS（等价于 `/ustht skill status`） |
| `/ustht skill on\|off` | `^/(user-thoughts|ustht) skill (on\|off)$` | 执行 SKILL_STATUS=on\|off |
| `/ustht instant` | `^/(user-thoughts|ustht) instant$` | 输出 INSTANT_STATUS（等价于 `/ustht instant status`） |
| `/ustht instant on\|off` | `^/(user-thoughts|ustht) instant (on\|off)$` | 执行 INSTANT_STATUS=on\|off |

### 维护流程

| 命令 | 正则 | 说明 |
|------|------|------|
| `/ustht sortin` | `^/(user-thoughts|ustht) sortin (--dry)?$` | 软维护（追加新想法），`--dry`：预览不写入 |
| `/ustht resort` | `^/(user-thoughts|ustht) resort (--dry)?$` | 硬维护（重整全部 mdbase），`--dry`：预览不写入 |

### 忽略管理

| 命令 | 正则 | 说明 |
|------|------|------|
| `/ustht ignore` | `^/(user-thoughts|ustht) ignore$` | 独立使用，等价于 `--last` |
| `/ustht ignore show` | `^/(user-thoughts|ustht) ignore show$` | 列举 `#ignored/` 内容 |
| `/ustht ignore start\|end` | `^/(user-thoughts|ustht) ignore (start\|end)$` | 开始/结束忽略区间（仅上下文有效，不持久化） |
| `/ustht ignore --last` | `^/(user-thoughts|ustht) ignore --last$` | 忽略上一条已记录的想法 |
| `... /ustht ignore` | `.*/(user-thoughts|ustht) ignore$` | 后缀模式，忽略本条消息的想法 |

**SKILL 关闭时的行为**：`ignore show` 为只读命令，SKILL 关闭时仍可用。后缀模式 `.../ustht ignore` 不受 `SKILL_STATUS` 控制——它是用户对当前消息的主动标记，非 SKILL 写入操作。其他 ignore 子命令（`start`、`end`、`--last`）在 SKILL 关闭时返回提示。

### 内容查看与导出

| 命令 | 正则 | 说明 |
|------|------|------|
| `/ustht raw` | `^/(user-thoughts|ustht) raw$` | 查看 `#raw/` 中未处理的最新记录 |
| `/ustht mdbase show` | `^/(user-thoughts|ustht) mdbase show (--all\|--.+)?$` | 查看索引或指定维度文件 |
| `/ustht mdbase export` | `^/(user-thoughts|ustht) mdbase export (--all\|--.+)?$` | 导出到 `#export/`，默认导出全部 |
| `/ustht import` | `^/(user-thoughts|ustht) import .+$` | 扫描指定路径下 .md 文件，整理内容并入 mdbase |

**维度名参数验证：** `--` 后的维度名每段须以 `[a-z0-9]` 开头和结尾，仅 `[a-z0-9-]`，支持 `/` 子目录分隔，不得含 `..`、`\`，最大 64 字符。详见 [safety.md](safety.md)。

---

## 自然语言触发映射

当用户发言的自然语言意图明确指向唯一命令时，可不使用命令前缀直接触发。`/user-thoughts` 和 `/ustht` 均可作为命令前缀。

**多语言支持**：自然语言触发不限于特定语言。下表以中英文示例说明，Agent 应根据用户实际使用的语言匹配意图。任何语言的等效表述均可触发对应命令。

| 命令 | 自然语言示例 | 触发约束 |
|------|-------------|---------|
| `/ustht init` | "初始化" / "initialize" / "start using" | — |
| `/ustht status` | "看看状态" / "show status" / "what's the current state" | 意图必须明确，不含其他指令 |
| `/ustht skill` | "技能状态" / "skill status" / "is the skill on" | — |
| `/ustht skill on` | "开启技能" / "turn on skill" / "enable skill" | — |
| `/ustht skill off` | "关闭技能" / "turn off skill" / "disable skill" | — |
| `/ustht instant` | "即时计划开着吗" / "is instant plan on" | — |
| `/ustht instant on` | "开启即时计划" / "enable instant planning" | — |
| `/ustht instant off` | "关闭即时计划" / "disable instant planning" | — |
| `/ustht sortin` | "整理一下想法" / "organize thoughts" / "sort in" | 不含 resort/dry 关键词时也可触发 |
| `/ustht sortin --dry` | "预览一下整理结果" / "preview sortin" | — |
| `/ustht resort` | "深度整理" / "deep organize" / "restructure mdbase" | — |
| `/ustht resort --dry` | "预览硬维护结果" / "preview resort" | — |
| `/ustht ignore show` | "看看忽略了什么" / "show ignored" | — |
| `/ustht ignore start` | "这段不用记" / "stop recording" / "ignore this part" | — |
| `/ustht ignore end` | "好了可以记了" / "resume recording" / "end ignore" | — |
| `/ustht ignore --last` | "上一条忽略" / "ignore last" / "undo that thought" | — |
| `/ustht raw` | "看看原始记录" / "show raw" / "view raw thoughts" | — |
| `/ustht mdbase show` | "看看 mdbase" / "show mdbase" / "view idea repository" | — |
| `/ustht mdbase show --rules` | "看看规则" / "show rules" | — |
| `/ustht mdbase export` | "导出 mdbase" / "export mdbase" | — |
| `/ustht import` | "导入文档" / "import docs" / "merge documents into mdbase" | 路径必须明确 |

**约束规则：**
- 意图必须明确指向唯一命令，歧义时不触发
- 用户发言同时包含想法和触发词时，先执行命令再做想法记录
- 匹配用户意图而非关键词——即使用户的表述与示例不同，只要意图明确指向唯一命令即可触发

---

## 错误处理

> 以下示例以中文输出为例。实际输出语言适配用户当前对话语言（见 SKILL.md 语言策略）。

### 命令无法识别

```
用户：/ustht blahblah
Agent：命令无法识别。可用命令（/user-thoughts 或 /ustht）：
  init | status | skill [on|off] | instant [on|off]
  sortin [--dry] | resort [--dry]
  ignore [--last | show | start | end]
  raw | mdbase show [--all|--维度名] | mdbase export [--all|--维度名]
  import <路径>
```

### 无子命令

```
用户：/ustht
Agent：可用命令（/user-thoughts 或 /ustht）：
  init | status | skill [on|off] | instant [on|off]
  sortin [--dry] | resort [--dry]
  ignore [--last | show | start | end]
  raw | mdbase show [--all|--维度名] | mdbase export [--all|--维度名]
  import <路径>
```

### 目录/文件不存在

```
用户：/ustht raw
Agent：#raw/ 目录不存在。请先执行 /ustht init 初始化。

用户：/ustht mdbase show --rules
Agent：mdbase/details/rules.md 不存在。尚未记录相关想法。
```

### 已初始化时重复 init

```
用户：/ustht init
Agent：已初始化。.ustht/ 目录已存在，跳过创建。
```

### 参数不合法

```
用户：/ustht skill toggle
Agent：参数不合法。可用值：on | off
```

### SKILL 关闭时

```
用户：/ustht sortin
Agent：SKILL 已关闭，操作已忽略。使用 /ustht skill on 开启。

用户：/ustht ignore start
Agent：SKILL 已关闭，操作已忽略。

用户：/ustht status
Agent：（正常输出状态，只读命令不受影响）

用户：/ustht mdbase show
Agent：（正常输出索引，只读命令不受影响）
```

### 未知标志

```
用户：/ustht sortin --medium
Agent：参数不合法。/ustht sortin 仅支持 --dry 标志。
  如需硬维护请使用 /ustht resort [--dry]
```

### 空状态

```
用户：/ustht raw
Agent：无未处理记录。

用户：/ustht ignore show
Agent：无被忽略的记录。

用户：/ustht ignore --last
Agent：无上一条想法可忽略。
```

### 必需工具缺失

```
Agent：警告：缺少 bash 工具，SKILL 功能已暂停。请确保运行环境支持 bash 命令执行。
```

### 初始化失败

```
用户：/ustht init
Agent：初始化失败：<具体原因>。请检查目录权限后重试。
```

### import 路径非法

```
用户：/ustht import /etc/passwd
Agent：路径非法。导入路径必须在工作目录内，不得使用绝对路径或 .. 指向系统目录。
```

### import 目录无 .md 文件

```
用户：/ustht import empty-dir/
Agent：empty-dir/ 下未找到 .md 文件。
```

### import 无相关内容

```
用户：/ustht import README.md
Agent：扫描 README.md，未提取到项目想法。
```

---

## 命令执行规则

- **上下文优先**：同一对话中已有的上下文信息优先于重新读取文件
- **命令优先于想法**：用户发言包含命令时，先执行命令，再做想法记录
- **幂等性**：相同命令重复执行结果一致（sortin 不会重复处理已 processed 的 raw）
