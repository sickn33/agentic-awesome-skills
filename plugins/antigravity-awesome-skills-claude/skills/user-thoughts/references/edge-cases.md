# 边界场景与交互示例

> 本文档详述 SKILL 的边界场景处理和完整交互示例。SKILL.md 中仅列关键场景概要。
> 以下示例以中文输出为例。实际输出语言适配用户当前对话语言（见 SKILL.md 语言策略）。

---

## 边界场景

### SKILL 关闭后（`skill off`）

- 文件全部保留，Agent 不再执行 SKILL 行为
- 只读命令（`mdbase show`、`raw`、`status`）仍可用
- 写入类命令（`sortin`、`ignore`）返回提示："SKILL 已关闭，操作已忽略"
- 即时计划自动暂停，不识别用户想法

### 跨会话恢复

- 新对话读取 `define.ini` 恢复 `SKILL_STATUS` 和 `INSTANT_STATUS`
- 忽略区间不恢复（仅上下文有效，跨会话自动失效）
- `LAST_SORTIN` 值保留，可用于判断是否需要建议 sortin

### 多项目隔离

- 各工作目录独立 `.ustht/`，互不影响
- SKILL 安装目录（`@/`）共享，模板只读

### 忽略区间边界

- `ignore start` 后到 `ignore end` 前的所有发言不记入计划
- 未配对的 `ignore start` 在会话结束时自动失效
- 忽略区间内的命令（如 `/ustht sortin`）仍正常执行，不受忽略影响
- 嵌套的 `ignore start` 无效，忽略第一个之后的，输出提示："已在忽略区间内"

### 即时计划与命令共存

- 用户发言同时包含想法和命令时，先执行命令，再做想法记录
- 命令本身不记入想法

### 并发写入

- sortin 执行期间新的用户发言正常记入 raw，不阻塞
- sortin 不锁定文件，依赖 Agent 协调

### 空状态

- `#raw/` 为空或不存在 → `/ustht raw` 输出"无未处理记录"
- `#mdbase/` 为空或不存在 → `/ustht mdbase show` 输出"mdbase 尚未初始化"
- `#ignored/` 为空 → `/ustht ignore show` 输出"无被忽略的记录"
- `define.ini` 缺失 → Agent 自动触发第一次使用流程

### 首次使用与初始化

- 工作目录下无 `.ustht/` → Agent 执行初始化：创建目录、复制模板、输出确认
- 初始化失败（权限不足等） → 输出错误原因，暂停 SKILL 功能
- 已存在 `.ustht/` → 不重复初始化，正常读取

---

## 交互示例

### 1. 初始化

```
用户：/ustht init
Agent：已初始化。
  .ustht/
  ├── define.ini (SKILL_STATUS=on, INSTANT_STATUS=off, LAST_SORTIN=)
  ├── raw/
  ├── ignored/
  ├── export/
  └── mdbase/
      ├── README.ai.md
      ├── backlog.md
      └── details/ (rules, plans, dev-stack, general, ui/)
```

### 2. 初始化 — 已存在

```
用户：/ustht init
Agent：已初始化。.ustht/ 目录已存在，跳过创建。
```

### 3. 状态查看

```
用户：/ustht status
Agent：SKILL_STATUS=on | INSTANT_STATUS=off | LAST_SORTIN=2026-05-28 14:00 | raw: 3 | dims: 5

用户：看看状态
Agent：同上（自然语言触发）
```

### 4. 即时计划 — 单条想法

```
用户：把这个按钮改成圆角的
Agent：（执行按钮修改指令）已记入维护计划 #raw/。

用户：登录页用深色主题
Agent：已记入计划：登录页深色主题 | 待归入:ui/outline

用户：API 统一用 RESTful 风格
Agent：已记入计划：API 统一 RESTful | 待归入:dev-stack
```

### 5. 即时计划 — 单条消息包含多个想法

```
用户：首页改成卡片布局，另外搜索框放到顶部，还有分页改成无限滚动
Agent：已记入 3 条计划：
  - 首页卡片布局 | 待归入:ui/outline
  - 搜索框顶部 | 待归入:ui/details
  - 无限滚动分页 | 待归入:ui/details
```

### 6. 即时计划 — 想法与指令共存

```
用户：把登录接口改成 POST 方法，顺便帮我看看当前有几个文件
Agent：（执行查看文件指令）已记入计划：登录接口改 POST | 待归入:dev-stack
```

### 7. 即时计划 — 非项目内容不记录

```
用户：今天天气不错，帮我写个排序算法
Agent：（执行排序算法指令，不记入想法）

用户：中午吃什么
Agent：（正常回应，不记入想法）
```

### 8. 想法冲突 — 用户改变主意

```
用户：数据库用 MySQL
Agent：已记入计划：数据库用 MySQL | 待归入:dev-stack

用户：数据库还是换成 PostgreSQL 吧
Agent：已记入计划：数据库改用 PostgreSQL | 待归入:dev-stack
（sortin 时以最新发言为准，原记录标注被替代并附日期）
```

### 9. raw 查看

```
用户：/ustht raw
Agent：#raw/2026-05-28.md（未处理 3 条）：
  - [14:30] 把这个按钮改成圆角的 | 待归入:ui/details
  - [14:45] 登录页用深色主题 | 待归入:ui/outline
  - [15:10] API 统一用 RESTful 风格，不用 GraphQL | 待归入:dev-stack
```

### 10. raw 查看 — 无未处理记录

```
用户：/ustht raw
Agent：无未处理记录。所有 raw 文件已标记为 processed。
```

### 11. 维护流程 — 软维护预览与执行

```
用户：/ustht sortin --dry
Agent：预览模式：
  → ui/details.md: +1 条（把这个按钮改成圆角的）
  → ui/outline.md: +1 条（登录页用深色主题）
  → dev-stack.md: +1 条（API 统一用 RESTful 风格，不用 GraphQL）
  共 3 条，不实际写入。

用户：/ustht sortin
Agent：已执行软维护，3 条追加到 mdbase。
  ui/details.md: +1 | ui/outline.md: +1 | dev-stack.md: +1
  LAST_SORTIN 已更新为 2026-05-28 15:30
```

### 12. 维护流程 — 想法与 sortin 共存

```
用户：整理一下想法，另外数据库用 PostgreSQL
Agent：已执行软维护（3 条追加），新想法已记入 #raw/。
```

### 13. 维护流程 — 硬维护（维度合并）

```
用户：/ustht resort
Agent：已执行硬维护：
  - 去重：rules.md 中 2 条重复已合并
  - 归类：dev-stack.md 中 1 条移至 architecture.md（新建维度）
  - 合并：ui/outline.md 与 ui/details.md 有重叠内容已整合
  - 索引已更新，README.ai.md 已同步
```

### 14. 维护流程 — 新建维度

```
用户：/ustht sortin
Agent：已执行软维护：
  → architecture.md: +1 条（微服务拆分方案）[新建维度]
  索引已更新。
（想法不属于已有任何维度，自动新建 architecture.md）
```

### 15. 维护流程 — 硬维护预览

```
用户：/ustht resort --dry
Agent：硬维护预览：
  - rules.md: 去重 2 条，合并 1 条
  - dev-stack.md → architecture.md: 迁移 1 条
  - ui/outline.md: 整合 ui/details.md 重叠内容 3 条
  - 新建维度：无
  不实际写入。确认后执行 /ustht resort。
```

### 16. mdbase 查看

```
用户：/ustht mdbase show
Agent：（输出 README.ai.md 索引内容）

用户：/ustht mdbase show --rules
Agent：（输出 rules.md 全文）

用户：/ustht mdbase show --all
Agent：（输出全部维度文件列表及概要）
```

### 17. 忽略管理 — 区间忽略

```
用户：/ustht ignore start
Agent：已进入忽略区间，以下发言不记入想法。

用户：这个报错不用管，是已知问题
Agent：（不记录，正常回应技术问题）

用户：/ustht ignore end
Agent：已退出忽略区间。
```

区间内被忽略的发言记入 `#ignored/yyyy-mm-dd.md`：
```markdown
- [15:00~15:10] 这个报错不用管，是已知问题（区间忽略）
```

### 18. 忽略管理 — 忽略上一条

```
用户：代码细节要把把控好
Agent：已记入计划：代码细节把控 | 待归入:rules

用户：/ustht ignore --last
Agent：已忽略上一条想法"代码细节把控"。
```

被忽略的发言从 raw 中移除该条目（整条删除），同时记入 `#ignored/yyyy-mm-dd.md`。若移除后 raw 文件为空，保留空文件不删除：
```markdown
- [14:45] 代码细节要把把控好（--last 忽略）
```

### 19. 忽略管理 — 后缀模式

```
用户：这个变量名不太规范 /ustht ignore
Agent：（记入 #ignored/，不记入想法，正常回应变量名问题）
```

被忽略的发言记入 `#ignored/yyyy-mm-dd.md`：
```markdown
- [14:30] 这个变量名不太规范（后缀忽略）
```

### 20. 忽略管理 — 无上一条可忽略

```
用户：/ustht ignore --last
Agent：无上一条想法可忽略。
```

### 21. 保持原文 — 正确示例

```
用户：按钮不要用蓝色，用绿色，圆角 8px
Agent 原始记录：- [14:30] 按钮不要用蓝色，用绿色，圆角 8px | 待归入:ui/details
（完整保留，不简化为"按钮改绿色圆角"）
```

### 22. 保持原文 — 错误示例（禁止）

```
用户：按钮不要用蓝色，用绿色，圆角 8px
错误记录：- [14:30] 按钮颜色调整（丢失了"不要用蓝色"的否定意图和"8px"的具体数值）
```

### 23. 导出

```
用户：/ustht mdbase export --rules
Agent：已导出到 #export/rules.md

用户：/ustht mdbase export
Agent：已导出全部维度文件到 #export/。
```

### 24. 自然语言混合（多语言）

```
用户：看看 mdbase 里规则怎么写的
Agent：（输出 rules.md 内容，自然语言触发 show --rules）

用户：帮我深度整理一下想法库
Agent：已执行硬维护。（自然语言触发 resort）

用户：想法库有什么
Agent：（输出 README.ai.md 索引，自然语言触发 mdbase show）

用户：show me the rules
Agent：（输出 rules.md 内容，英文自然语言触发 show --rules）

用户：organize my thoughts
Agent：已执行软维护。（英文自然语言触发 sortin）

ユーザー：想法を整理して
Agent：已执行软维护。（日文自然语言触发 sortin）
```

自然语言触发不限于中文——任何语言的等效表述均可触发对应命令。Agent 匹配用户意图，而非特定语言的关键词。

### 25. SKILL 关闭时的命令行为

```
用户：/ustht skill off
Agent：SKILL 已关闭。即时计划已暂停。

用户：/ustht sortin
Agent：SKILL 已关闭，操作已忽略。

用户：/ustht ignore start
Agent：SKILL 已关闭，操作已忽略。

用户：/ustht ignore show
Agent：无被忽略的记录。（ignore show 是只读命令，仍可用）

用户：/ustht mdbase show
Agent：（正常输出索引，只读命令仍可用）

用户：/ustht skill on
Agent：SKILL 已开启。
```

`SKILL_STATUS=off` 时，即时计划自动暂停（无论 `INSTANT_STATUS` 值）。只读命令（`mdbase show`、`raw`、`status`、`ignore show`）仍可用。

**后缀模式在 SKILL 关闭时的行为**：后缀模式 `.../ustht ignore` 不受 SKILL_STATUS 控制——它是用户对当前消息的主动标记，而非 SKILL 的写入操作。即使 SKILL 关闭，后缀模式仍生效（不记入 raw，记入 `#ignored/`），以避免干扰用户的正常对话流。

### 26. 跨会话恢复

```
（会话 A 结束前）
  define.ini: SKILL_STATUS=on, INSTANT_STATUS=on
  忽略区间：已 start，未 end

（会话 B 开始）
  Agent 读取 define.ini → SKILL_STATUS=on, INSTANT_STATUS=on
  忽略区间：不恢复（已失效）
  用户发言正常记入想法
```

### 27. 即时计划 — 自动建议 sortin

```
Agent：今日已记录 6 条想法，建议执行 /ustht sortin 整理到 mdbase。
用户：好，整理一下
Agent：已执行软维护，6 条追加到 mdbase。
```

### 28. 连续命令执行

```
用户：/ustht status
Agent：SKILL_STATUS=on | INSTANT_STATUS=off | LAST_SORTIN=2026-05-28 14:00 | raw: 3 | dims: 5

用户：/ustht sortin
Agent：已执行软维护，3 条追加到 mdbase。

用户：/ustht status
Agent：SKILL_STATUS=on | INSTANT_STATUS=off | LAST_SORTIN=2026-05-28 15:30 | raw: 0 | dims: 5
```

### 29. 忽略区间内执行命令

```
用户：/ustht ignore start
Agent：已进入忽略区间。

用户：/ustht sortin
Agent：已执行软维护。（命令不受忽略区间影响）

用户：/ustht raw
Agent：无未处理记录。（命令正常执行）

用户：/ustht ignore end
Agent：已退出忽略区间。
```

### 30. 即时计划 — 开启状态下发送命令

```
（INSTANT_STATUS=on）
用户：/ustht sortin
Agent：已执行软维护。（命令正常执行，不记入想法）
```

### 31. 即时计划 — 开启状态下发送无想法内容

```
（INSTANT_STATUS=on）
用户：好的我知道了
Agent：（正常回应，不记入想法——无项目相关内容）
```

### 32. 裸 /ustht 命令

```
用户：/ustht
Agent：可用命令：
  /ustht status | skill [on|off] | instant [on|off]
  /ustht sortin [--dry] | resort [--dry]
  /ustht ignore | show | start | end | [--last]
  /ustht raw | mdbase show | mdbase export | import <路径>
```

### 33. 非法维度名 — 路径遍历

```
用户：/ustht mdbase show --../../../etc/passwd
Agent：维度名非法。仅允许小写字母、数字和连字符，不得含 .. 或路径分隔符。
```

### 34. 非法维度名 — 特殊字符

```
用户：/ustht mdbase export --my file
Agent：维度名非法。不得含空格。合法示例：my-file、ui、dev-stack
```

### 35. 用户想法含 processed 标记

```
用户：我在想可以在代码里加个 <!-- processed --> 标记来标记完成
Agent：已记入计划：代码里加 <!-- processed --> 标记 | 待归入:rules
（想法原文保留不处理，sortin 仅检查文件第一行，不受影响）
```

### 36. define.ini 值注入尝试

```
用户：INSTANT_STATUS=on\nSKILL_STATUS=off
Agent：（不执行。define.ini 写入由 Agent 控制，不接受用户直接输入的键值）
```

### 37. 链式命令 — 成功

```
用户：/ustht skill on && instant on
Agent：SKILL 已开启。即时计划已开启。
```

### 38. 链式命令 — 中间失败

```
用户：/ustht sortin && skill off
Agent：已执行软维护。SKILL 已关闭。
```

### 39. 链式命令 — 混合自然语言

```
用户：/ustht status && sortin --dry
Agent：SKILL_STATUS=on | INSTANT_STATUS=off | LAST_SORTIN=2026-05-28 14:00 | raw: 3 | dims: 5
  预览模式：
  → ui/details.md: +1 条
  共 1 条，不实际写入。
```

### 40. 导入 — 目录扫描

```
用户：/ustht import docs/
Agent：扫描 docs/ 下 5 个 .md 文件，提取 12 条项目想法：
  → rules.md: +3（编码规范、Git 策略、文档同步）
  → dev-stack.md: +4（框架选型、数据库、部署方案）
  → ui/outline.md: +2（布局、配色）
  → general.md: +3（其他）
  来源: docs/conventions.md, docs/architecture.md, docs/design.md
```

### 41. 导入 — 单文件

```
用户：/ustht import docs/design.md
Agent：从 docs/design.md 提取 4 条想法：
  → ui/outline.md: +2
  → ui/details.md: +1
  → dev-stack.md: +1
```

### 42. 导入 — 路径不存在

```
用户：/ustht import docs/missing.md
Agent：路径不存在：docs/missing.md
```

### 43. 导入 — 无相关内容

```
用户：/ustht import README.md
Agent：扫描 README.md，未提取到项目想法。（内容为项目说明，无设计决策）
```
