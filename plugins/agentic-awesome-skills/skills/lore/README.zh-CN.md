# lore

<p align="center">
  <img src="docs/lore-poster.svg" alt="lore" width="100%">
</p>

<p align="center"><em><strong>lore</strong>（名词）—— 某一主题的传统与知识，由人口口相传。</em></p>

<p align="right">中文（当前页面）· <a href="https://github.com/TheaDust/lore/blob/main/README.md">English</a></p>

> 框架无关的 AI 编程智能体项目记忆。

一个由 AI 智能体维护的软件项目长期知识库。它捕获那些通常只存在于原始开发者脑中的上下文——架构、决策、约定——并以纯 Markdown 文件形式持久化，任何智能体都能消费。

> **lore 是一个 SKILL，不是 CLI 工具。** 它是一份 Markdown 规范（[`SKILL.md`](SKILL.md)），AI 编程 agent（Claude Code、Cursor、OpenCode、Cline、Aider、GitHub Copilot）读取后获得长期项目记忆。你不需要 `npm install` 或 `pip install` `lore`；把仓库 URL 给 agent，让它装上即可。之后 `lore init`、`lore sync` 这些**短语是你对 agent 说的话**，不是终端命令——你的 `PATH` 上没有 `lore` 这个二进制。

## 安装

```bash
git clone git@github.com:TheaDust/lore.git <你的-agent-skills-目录>
```

或者，更简单——告诉你的 agent：

> 从 https://github.com/TheaDust/lore 安装 skill。

每个 agent host 从自己的目录加载 skill（Claude Code 是 `~/.claude/skills/`，项目级是 `<project>/.claude/skills/`，等等）。你的 agent 知道自己的 skills 目录在哪，能把仓库克隆到正确的位置。

> 找特定章节？跳到：[快速上手](#快速上手) · [实际长什么样](#实际长什么样) · [`.lore/` 目录结构](#lore-目录结构) · [七个工作流](#七个工作流) · [平台 Mirror](#平台-mirror) · [配置](#配置) · [升级](#升级) · [FAQ](#faq)。完整参考文档在 [`references/`](references/)。**想看每个工作流什么时候用的平实解释？** 见 [`WORKFLOWS.md`](WORKFLOWS.md) / [English](./WORKFLOWS.md)。

## 解决什么问题

当你在多个 AI 工具（Claude Code、Cursor、Cline、GitHub Copilot、Aider、LangGraph agent、DeepAgents）和多个会话之间切换工作时，上下文会丢失：

- **每个新会话都要重新解释项目。** "我们用 Next.js App Router，不是 Pages。用 Zustand，不是 Redux。不要提交密钥。"
- **决策被遗忘。** "为什么选 X 不选 Y？" → "我不记得了，问问团队吧。"
- **智能体之间互相矛盾。** Cursor 读 `.cursorrules`，Claude Code 读 `CLAUDE.md`，两个文件逐渐漂移。
- **新成员上手需要数周。** 新成员 / 新 agent 都得从零学项目约定。

lore 维护一个单一事实源（`.lore/`），并把它投影到你的 agent 已经读取的配置文件里。它追踪**为什么**做某个决策，而不只是代码**做了什么**，并把这个历史跨 session、跨工具保留下来。

## 快速上手

下面的命令是**你对 agent 说的短语**——没有 `lore` 这个二进制。Agent 加载本 skill 后，会按 [`SKILL.md`](SKILL.md) 里定义的工作流执行每个短语。原来要在终端敲的活，交给 agent 就行。

```bash
# 1. 初始化（每个项目运行一次）
lore init
# 扫描项目，生成 entry 草案，请用户确认，创建 .lore/

# 2. 完成一个非平凡的改动后
lore sync
# 检测代码 diff，提议 [NEW]/[STALE]/[REFINED] entry，等用户裁决

# 3. 大量改动后，刷新 agent 可见的摘要
lore compress
# 重新生成 SUMMARY.md，更新 CLAUDE.md / .cursorrules 等

# 4. 强制刷新 mirror（比如手动编辑了 .lore/ 之后）
lore mirror
# 用当前状态重写 CLAUDE.md 等平台文件
```

另外三个只读命令：

```bash
lore query                          # 从记忆库回答问题，引用 entry ID
lore audit                          # 检查记忆与现实的偏差，报告写入 .lore/audit/
lore history DEC-2026-02-03-7c19    # 展示某 entry 相关代码的 git commits
lore history frontend/src/store.ts  # ...或某个文件
lore history --scope=frontend       # ...或某个 scope 下的所有 lore 文件
lore history --json                 # 机器可读
```

## 实际长什么样

### 查询 memory

> 你：「这个项目怎么认证 API 请求？」
> Agent（跑 `lore query auth`）：

```
找到 6 个匹配 'auth' 的 entry：

  [_global/DECISIONS.md#DEC-2026-07-10-6d9c]
    用 base64 不透明 token 而非 JWT；理由：撤销更简单，没有库依赖。

  [scopes/backend/ARCHITECTURE.md#ARCH-2026-07-10-59ac]
    backend/app/auth.py 里的认证工具：
    hash_password、issue_token、login_required 装饰器。

  [scopes/backend/CONVENTIONS.md#CONV-2026-07-10-84e3]
    缺失/无效 token 返回 401；资源不存在返回 404。

  [scopes/frontend/ARCHITECTURE.md#ARCH-2026-07-10-6de2]
    认证 token 存到 localStorage，key 是 todo.auth.token。

  [scopes/frontend/DECISIONS.md#DEC-2026-07-10-c1ea]
    用 Axios 而非原生 fetch；理由：拦截器自动注入认证 header。
```

每个回答都精确引用 `[file#ID]`，你可以 `cat` 那个 entry，或跑 `lore history <ID>` 看决策为什么存在。

### `CLAUDE.md` 长什么样

`lore` 每次会话成本保持平——发小索引而非完整 memory：

```markdown
## Lore (auto-managed)

Project memory. Read deeper on demand.

**Structure**:
- Digest: `.lore/SUMMARY.md` (top-level overview)
- Global: `.lore/_global/` (architecture, decisions, conventions)
- Scopes: `.lore/scopes/`
  - `.lore/scopes/backend/` (Flask 3 + SQLAlchemy 2 + pytest; Python 3.11+)
  - `.lore/scopes/frontend/` (React 18 + TypeScript + Vite + Zustand + Axios)
  - `.lore/scopes/shared/` (TypeScript types mirrored as Python dataclasses)

**Query**: `lore query <term>` or `lore query <scope>:<term>`
**Update**: see the `lore` skill (init / sync / query / audit / compress / mirror)

---
## My notes (free edit)

- 你在这里写的内容每次 sync 都原样保留。
```

### 用 `lore history` 追 git 溯源

> `lore history DEC-2026-07-10-e45d`（问「为什么选 bcrypt？」）

```
# history: [DEC-2026-07-10-e45d]

> Entry: scopes\backend\DECISIONS.md
> Since: 2026-07-10 (entry #added date)
> File: backend
> Commits: 2 (showing all)

## 9f264f4 (2026-07-10, Lore Tester)
feat(backend): add alembic migrations and switch password hashing to bcrypt

## ed2b288 (2026-07-10, Lore Tester)
feat(backend): password hashing and JWT-style auth tokens

## Suggested next step
Run `lore sync` to check whether any of these commits
introduce a [REFINED] candidate for this entry.
```

Agent 读 commit message 然后告诉你 *为什么*——你不用手动翻 `git log`。

## `.lore/` 目录结构

```
.lore/
├── SUMMARY.md                    # 顶层摘要；新 agent 先读这个
├── _global/                      # 跨 scope 的事实
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── CONVENTIONS.md
├── scopes/                       # 各 scope 自己的事实（frontend / backend / shared）
│   └── <scope>/
│       ├── ARCHITECTURE.md
│       ├── DECISIONS.md
│       └── CONVENTIONS.md
├── draft/                        # init 阶段用，存待确认的草案
├── audit/                        # audit 阶段用，存报告
└── archive/                      # 旧/过期的 entry
```

每条 entry 是一个 Markdown bullet（≤ 2 行），带确定性 ID 和内联状态 tag：

```markdown
- [ARCH-2026-07-09-a3f2] Use Next.js App Router; reason: streaming + RSC. #added:2026-07-09
- [DEC-2026-02-03-7c19] Chose Zustand over Redux; reason: 60% less boilerplate. #added:2026-02-03 #verified:2026-06-15
- [CONV-2026-01-20-b1e8] Never commit secrets; use `dotenv` + `.env.local`. #added:2026-01-20
```

完整格式规范（ID 生成、tag、拆分规则）见 [`references/entry-format.md`](references/entry-format.md)。

## 七个工作流

| 命令 | 作用 | 写什么 | 参考 |
|---|---|---|---|
| `init` | 首次扫描项目；生成 entry 草案；用户确认 | `.lore/*` + 平台 mirror | [SKILL.md](SKILL.md#init--initialize-the-memory-bank) |
| `sync` | 检测代码变更；提议更新；用户裁决 | 只写 `.lore/*`（不写 mirror）| [SKILL.md](SKILL.md#sync--update-after-a-change) |
| `query` | 只读；从记忆回答问题并引用 entry ID | 不写任何东西 | [SKILL.md](SKILL.md#query--answer-from-memory) |
| `audit` | 只读；检查记忆与现实；写报告 | 只写 `.lore/audit/*` | [`references/audit-template.md`](references/audit-template.md) |
| `compress` | 从当前 entry 生成 `SUMMARY.md` | `SUMMARY.md` + 平台 mirror | [`references/summary-template.md`](references/summary-template.md) |
| `mirror` | 强制重新生成平台 mirror（带内容去重）| `CLAUDE.md`、`.cursorrules` 等 | [`references/platform-mirrors.md`](references/platform-mirrors.md) |
| `history` | 只读；列出与 entry / 文件 / scope 相关的 git commits | 不写任何东西 | [`references/history-command.md`](references/history-command.md) |

想看每个工作流什么时候用、用在哪里的平实解释，见 [`WORKFLOWS.zh-CN.md`](WORKFLOWS.zh-CN.md)（English: [`WORKFLOWS.md`](WORKFLOWS.md)）。

`sync` **不会**更新平台 mirror。这是刻意的：mirror 文件是 agent 入口，不是变更日志。每次 sync 都重写会让 `git log` 变得很乱，稀释"人工合并"这个 mirror 应该提供的信号。当你需要 agent 视图跟上时，跑 `lore mirror`（或 `compress`）。

要恢复老行为（每次 sync 都更新 mirror），在 `.lore/.config.json` 里设 `"sync_updates_mirror": true`。

## Sync 信任级别

`sync` 根据变更类型和配置的信任级别，决定自动应用还是要求确认：

| 变更类型 | `high` | `medium`（默认）| `low` |
|---|---|---|---|
| 去重命中 | 自动 | 自动 | 确认 |
| 等价 REFINED | 自动 | 自动 | 确认 |
| `NEW` entry | 自动 | 确认 | 确认 |
| `STALE` 标记 | 自动 | 确认 | 确认 |
| `ALERT` | 确认 | 确认 | 确认 |

默认 `medium` 是平衡选择：低风险变更静默应用，真正的添加或冲突仍要你点头。完全信任 agent 切 `high`；想 review 每次变更切 `low`。

## 平台 Mirror

lore 的事实源是 `.lore/*`，但它会投影到 agent 已经读取的配置文件。targets 通过扫描 repo 根目录的现有平台文件自动检测（auto-detect）；都没找到时 `lore init` 用 multi-select 问用户想给哪些 agent 写。在 `.lore/.config.json` 显式写 `mirror_targets` 会覆盖这个行为（Replace 语义）。

| 平台 | 文件 | 自动检测？ |
|---|---|---|
| Claude Code | `CLAUDE.md` | ✅ |
| Cursor | `.cursorrules` (或 `.cursor/rules/*.mdc`) | ✅ |
| Cline | `.clinerules` | ✅ |
| Aider / Codex / OpenCode | `AGENTS.md` (或 `CONVENTIONS.md`) | ✅ |
| Windsurf | `.windsurfrules` | ✅ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ |
| Continue.dev | `.continue/rules/lore.md` | ✅ |
| LangGraph / DeepAgents |（无文件 — 直接读 `.lore/*.md`）| n/a |

每个 mirror 文件用 `---` 分隔符切成两段：

```markdown
## Lore (auto-managed)
... Skill 从 .lore/ 写入的内容 ...

---

## My notes (free edit)
... 你手写的笔记，sync 时原样保留 ...
```

Skill 只写 `## Lore` 段。`## My notes` 段以下都是你自由编辑的区域，Skill 在每次 sync 和 compress 时原样保留。

## Token 成本

lore 的 token 模型有 5 个组件；只有 mirror 文件是 per-session，其余都是 on-demand 或 per-invocation。

| 组件 | 何时加载 | 典型大小 | per-session？ |
|---|---|---|---|
| **Mirror 文件**（CLAUDE.md / AGENTS.md 等） | 每次会话启动 | ~500 字节（index mode） | 是 |
| **SKILL.md**（lore 自身规范） | 每次用户说 `lore <cmd>` | ~10 KB | 否，per-invocation |
| **`.lore/SUMMARY.md`** | agent 按需读，作为目录 | 1–30 KB | 否，on demand |
| **`scopes/<scope>/{ARCH,DEC,CON}.md`** | agent 只读相关 scope | 1–5 KB each | 否，on demand |
| **`lore query <term>`** 结果 | agent 跑 query 时 | 按命中条数 bound | 否，per query |

### Mirror 是 constant-cost

`CLAUDE.md` 等平台文件 agent 每次会话都自动加载。lore 通过只输出索引（~500 字节）而不是项目摘要来保持这个成本稳定。这是唯一随会话数线性增长的项。

| 项目规模 | Mirror 大小 | 每次会话成本 |
|---|---|---|
| 空 / 新项目 | ~200 字节 | 可忽略 |
| 小（~30 entries） | ~500 字节 | 可忽略 |
| 中（~120 entries） | ~500 字节 | 可忽略 |
| 大（~250 entries） | ~500 字节 | 可忽略 |

### `.lore/` 是 on-demand

`.lore/*.md` 文件**不会**预加载。agent 读 `SUMMARY.md` 作为目录，再按需深入具体 scope 或 entry（`cat [file#ID]`）。一个 250-entry 的项目，agent 每次会话启动成本 ~500 字节，按需读取另算。

### SKILL.md 是 per-invocation

每次你说 `lore sync` 或 `lore query`，agent 加载 `SKILL.md`（~10 KB）来执行 workflow。不在 lore 调用期间，agent 上下文里没有任何 lore 内容。

### Query 有界

`lore query <term>` 返回命中 entry 的稳定 ID + 一句话摘要，不是整个 `.lore/` 内容。单次 query 的 token 量按命中条数 bound，跟项目总规模无关。

### Ambient 与 on-demand 知识

**Ambient** 知识 = agent 会话启动时已经在上下文里，无需 fetch。**On-demand** 知识 = agent 主动读时才有（`cat [file#ID]`、`lore query <term>`）。

lore 的 mirror 文件（`CLAUDE.md`、`AGENTS.md` 等）是 ambient —— agent 每个 session 自动看到。`.lore/` 下所有内容是 on-demand：`SUMMARY.md` 当目录，entry 按需 fetch。

默认是 on-demand。如果你倾向把整个 `SUMMARY.md` 倒进 `CLAUDE.md`（真 ambient），可行但**不推荐** —— 用「会话启动开销」换「零 fetch」。详见 [`references/platform-mirrors.md`](references/platform-mirrors.md)。

## 脚本

`scripts/` 里的辅助脚本减少重复的机械工作：

```bash
python scripts/id_hash.py "Use Next.js App Router"        # → a3f2（4 字符 ID hash）
python scripts/list_entries.py                            # 列出所有 entry（文本）
python scripts/list_entries.py --scope=frontend --json    # 过滤的 JSON
python scripts/find_duplicates.py                          # 找可能的重复
python scripts/find_stale.py --days=90                    # 找过期的 entry
python scripts/history.py DEC-2026-02-03-7c19             # 展示某 entry 的 git 历史
```

所有脚本都是跨平台 Python 3.6+，无第三方依赖。详见 [`scripts/README.md`](scripts/README.md)（英文）或 [`scripts/README.zh-CN.md`](scripts/README.zh-CN.md)（中文）。

## 配置

`.lore/.config.json` 是可选的。默认值适合大多数项目。

```json
{
  "schema_version": 1,
  "auto_mirror": false,
  "sync_updates_mirror": false,
  "sync_trust": "medium",
  "mirror_targets": ["CLAUDE.md"], // optional — auto-detected if absent
  "mirror_mode": "index",
  "compress_thresholds": { "max_entries": 500, "max_days_since_compress": 30 },
  "sync_thresholds": { "min_lines_changed": 50, "min_directories_changed": 2 }
}
```

字段含义：见 [`references/config.md`](references/config.md)。新 config 会包含 `schema_version: 1`；旧 config 没有这个字段也能用，但会触发 warning。兼容策略见 [`references/compatibility.md`](references/compatibility.md)。

## 升级

`git pull`（或重新 clone）是常规升级路径；你的 `.lore/` 在升级中保持原样。如果未来版本包含破坏性 config 变更，该版本会一起发布 `scripts/migrate.py`；pull 之后跑一次即可。当前 schema 是 `schema_version: 1`；还没有任何迁移发布，所以今天你不需要跑任何东西。完整版本策略与 deprecation 流程见 [`references/compatibility.md`](references/compatibility.md)。

## 不适用场景

lore 为长期项目设计。下列场景过度：

- **短命脚本 / 一次性 demo。** 维护成本大于价值。
- **快速原型**，决策每周都变。决策追踪机制反而碍事。
- **微型单文件项目。** 用 `README.md` 就够了。
- **不希望 AI 做决策的项目。** 如果你想要纯只读 agent，lore 没有价值。
- **超大型 monorepo（50+ packages）**。Scope 树会变得难用，考虑按 package 拆分或每个 cluster 一个 sub-skill。

## FAQ

**Q: 不在 git 仓库里能用 lore 吗？**
A: 部分能。lore **大部分是 agent 工作流**（写在 `SKILL.md` 里）—— agent 读你的文件、起草 entry、编辑 `.lore/*.md`，按需重生成 mirror。没有 git，agent 仍能跑 `init` / `query` / `audit` / `compress` / `mirror`（直接读文件）。失去的：`sync` 用 `git diff` 检变化（没 diff → agent 得问你改了什么）；`lore history` 需要 git 仓库（内部跑 `git log`）。helper scripts（`list_entries.py`、`find_stale.py` 等）两种情况都能跑。

**Q: 我能直接手动编辑 `.lore/*.md` 吗？**
A: 可以。文件就是纯 Markdown。加新 entry 时用 `id_hash.py` 算 ID（保持确定性）。手动编辑后跑 `lore mirror` 同步 agent 端。

**Q: 如果我完全不想要 mirror 文件（只要 `.lore/`）呢？**
A: 在 `.config.json` 里设 `mirror_targets: []`。`compress` 和 `mirror` 在文件系统上就是空操作；只有 `SUMMARY.md` 和 entry 文件生效。

**Q: 这跟 Cursor 的 `.cursorrules` 或 Aider 的 `AGENTS.md` 有什么不同？**
A: 那些是扁平的规则列表。lore 是结构化的（架构 / 决策 / 约定）、原子的（一条事实一个 entry）、有历史的（每条 entry 有 `#added` 和 `#verified` tag）。而且 lore 会替你生成这些文件。

**Q: lore 会调用 agent 的 API 吗？**
A: 不会。lore 是纯文件 I/O。调用 lore 的 agent 做语义工作（扫描代码、决定提取什么、分类变更）；lore 提供文件布局、ID 方案、标记规则和验证脚本。

**Q: agent 原生的 `/init` 或 `/compact` 呢？**
A: 它们用途不同。`/init` 是一次性项目扫描 → `CLAUDE.md`。`/compact` 压缩对话上下文。lore 的 `init` 和 `compress` 管长期项目知识，不是会话上下文。如果你在已经有非 lore `CLAUDE.md` 的项目上跑 `lore init`，接管检测（init step 0）会处理集成。

**Q: `sync` 和 `mirror` 有什么区别？**
A: `sync` 根据代码改动更新 `.lore/`（feature / refactor 后）；`mirror` 把当前 `.lore/` 重新生成到 agent 端文件（`CLAUDE.md`、`.cursorrules` 等）。`sync` **故意不**更新 mirror —— mirror 文件该是人工合并的，不该每次 commit 都重生成，否则 `git log` 会变难读。需要 agent 视图跟上时，显式跑 `mirror`（或 `compress`）。

**Q: 跟 ADR（Architecture Decision Records）有什么区别？**
A: ADR 是文档（每个决策一个 markdown 文件）。lore 是结构化项目记忆 —— 一条事实一个 entry，带稳定 ID 和 `#added` / `#verified` / `#stale` 标记。lore 的 `DEC` 层能替代 `docs/adr/`（一条 DEC entry 对应一个决策），但 lore 还覆盖 `ARCH`（架构）和 `CON`（约定）同仓库存储，并能用 `compress` / `mirror` 生成 agent 视图。可以**替代** ADR，也可以**共存**（一条 DEC entry 指向已有 ADR 文档）。

**Q: agent 写的 entry 我不同意怎么办？**
A: 直接编辑 `.lore/*.md` —— 就是纯 Markdown。下次 `mirror` / `compress` 会反映你的改动；helper scripts 对稳定 ID 跳过重算（只要文本没变，ID 就不变）。想回到 agent 改之前的状态，`git checkout .lore/` 即可。

**Q: 能不能不用 git 多机同步 `.lore/`？**
A: 推荐 git（`.lore/` 就是仓库里的纯文本；`git push` / `git pull` 自带传输）。其它传输（Dropbox、OneDrive、Syncthing）能用，前提是你信它们的文本冲突解决 —— 它们不懂 lore 的 ID 方案和 `#added` 标记。**不要同时在两个 agent 上跑同一个 `.lore/`**，会 last-writer-wins，且 ID 没远程锁保护。

## 许可

[MIT](./LICENSE) —— 可自由使用、修改、再分发、再许可、商业化销售。无任何担保。

---

<p align="center">
  <a href="SKILL.md">SKILL.md</a> ·
  <a href="references/entry-format.md">entry-format</a> ·
  <a href="references/summary-template.md">summary-template</a> ·
  <a href="references/audit-template.md">audit-template</a> ·
  <a href="references/monorepo-detection.md">monorepo-detection</a> ·
  <a href="references/stale-new-markers.md">stale-new-markers</a> ·
  <a href="references/platform-mirrors.md">platform-mirrors</a> ·
  <a href="references/config.md">config</a> ·
  <a href="references/history-command.md">history-command</a> ·
  <a href="references/compatibility.md">compatibility</a> ·
  <a href="scripts/README.md">scripts</a>
</p>
