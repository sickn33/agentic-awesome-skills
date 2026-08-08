# 工作流

lore 有七个工作流。本文用平实语言解释每个什么时候用。Agent 跑它们时的 operational 规范见 [`SKILL.md`](SKILL.md)。

> [English](./WORKFLOWS.md)

## 概览

| Workflow | 做什么 | 频率 |
|---|---|---|
| [`init`](#init) | 建 `.lore/` + 接管平台 mirror 文件 | 每个项目 1 次 |
| [`sync`](#sync) | 代码变更后更新 `.lore/` | 每个 feature 后 |
| [`query`](#query) | 搜 `.lore/` 找答案 | 每个 session |
| [`audit`](#audit) | 找 stale / 矛盾的 entry | 季度 |
| [`compress`](#compress) | 重建 `SUMMARY.md` | SUMMARY 过期时 |
| [`mirror`](#mirror) | 从 `.lore/` 重新生成平台文件 | 一批 sync 后 |
| [`history`](#history) | 列出 entry / 文件 / scope 的 git commits | 调查时 |

---

## `init`

**一句话**：建 `.lore/`，接管你已有的 `CLAUDE.md` / `AGENTS.md`。

**怎么用**：`lore init` —— 每个项目 1 次，或老项目第一次接入 lore。

**agent 做什么**：
1. 扫现有平台文件（`CLAUDE.md`、`AGENTS.md`、`.cursorrules` 等）
2. 每个文件问你：接管 / 保留 / 中止
3. 检测 monorepo 结构（pnpm workspaces、Cargo workspace 等），给 scope 列表
4. 写初始 `.lore/draft/`（entry 带 `#added:<today>` + 确定性 ID）
5. 给你看 summary
6. 你确认后：移到 `.lore/`，生成 `SUMMARY.md`，刷新平台文件

**真实场景**：
- 新项目第一次用 lore → `lore init`
- 老项目已有 `CLAUDE.md`，想让 lore 接管 → `lore init` 选「接管」
- Monorepo 有 `frontend/` 和 `backend/` → init 自动识别两个 scope，问名字

**输出**：完整 `.lore/` 目录 + 更新过的平台文件 + 写好的 `.config.json`。

---

## `sync`

**一句话**：代码改了，把变化落到 `.lore/`。

**怎么用**：`lore sync` —— 提交完 feature / refactor / 依赖变更后。

**agent 做什么**：
1. 跑 `git diff --stat HEAD` 看变更
2. 变更显著时（≥50 行 / 跨 ≥2 目录，或新 module/dir/dep），agent 主动提议
3. 每个变更分类成 `[NEW]` / `[STALE]` / `[REFINED]`
4. 输出 marker 提案
5. 你按 marker 接受 / 拒绝
6. 接受的 marker 落到 `.lore/*.md`

**真实场景**：
- 「我刚加了新依赖 —— 更新 lore」 → `lore sync`
- 「我们决定不用 React Query 了，换 SWR」 → 代码改完后 `lore sync`
- 「新加了个 module —— 记一下」 → `lore sync`

**输出**：更新过的 `.lore/*.md` 文件（新 entry 和 `#verified` / `#stale` tag）。

**注意**：`sync` 不会更新平台 mirror 文件（那是独立的 `mirror` 命令）。理由：保持 agent 端文件 `git log` 可读。

---

## `query`

**一句话**：搜 `.lore/` 找答案。

**怎么用**：`lore query <term>` —— 任何想问「memory 里有什么」的时候。

**agent 做什么**：
1. 读 `.lore/SUMMARY.md`（目录）
2. 对 entry 文本做模糊匹配
3. 返回命中 entry，带稳定 `[file#ID]` 引用
4. 可选地深入具体 scope 文件拿更完整上下文

**真实场景**：
- 「这个项目用什么数据库？」 → `lore query database`
- 「为什么选 Zustand？」 → `lore query zustand`
- 「backend module 的约定是什么？」 → `lore query backend:conventions`

**输出**：bounded 命中列表：

```
[_global/DECISIONS.md#DEC-2026-07-11-6137] Picked OpenAI-compatible LLM API
[scopes/backend/CONVENTIONS.md#CONV-2026-07-11-9b89] Embedding has two backends
```

`[file#ID]` 引用让 agent `cat` 文件对应行拿完整文本。

---

## `audit`

**一句话**：找 `.lore/` 里的 stale / 矛盾 entry。

**怎么用**：`lore audit` —— 季度 review，或大重构前。

**agent 做什么**：
1. 跑 `find_stale.py` 找 `#added` > 90 天且无 `#verified` 的 entry
2. 跑 `find_duplicates.py` 找互相矛盾的 entry
3. 交叉检查 entry 引用的代码路径
4. 输出 `[ALERT]` 报告

**真实场景**：
- 「有没有跟现状矛盾的 lore entry？」 → `lore audit`
- 季度体检 → `lore audit`
- onboarding 新贡献者前 → `lore audit` 清 stale

**输出**：按问题类型分组的报告：

```
[ALERT] 5 entries may be stale (no #verified in >90 days):
  - ARCH-2026-01-15-d7a3  last verified 2026-04-12
  ...

[ALERT] 2 entries contradict current code:
  - CONV-2026-03-01-1f8c  says "use webpack"; project now uses Vite
```

**注意**：`audit` 不改文件。要落地整改，跑 `sync` 走提案流程。

---

## `compress`

**一句话**：从当前 entry 重建 `.lore/SUMMARY.md`。

**怎么用**：`lore compress` —— SUMMARY 过期时（entries > 500 或 > 30 天没压），或分享 lore 前。

**agent 做什么**：
1. 跑 `list_entries.py` 枚举所有 entry
2. 跳过 recently-stale 的 entry
3. 每个 `(scope, layer)` 对，按规则挑 3–5 条最重要的
4. 按模板写 `SUMMARY.md`
5. 如果 config 里 `auto_mirror: true`，重生成平台 mirror；否则每个 mirror 目标单独问，只写你确认的（这是第二个 mirror 触发点——`sync` 故意不更新 mirror）
6. mirror 处理完（写或拒绝）后停止

**真实场景**：
- 「刷新一下 summary」 → `lore compress`
- 「两个月没压了」 → `lore compress`
- 「onboarding 新人 —— 确保 SUMMARY 是最新的」 → `lore compress`

**输出**：更新过的 `SUMMARY.md`（以及可能的 mirror 文件）。

**幂等**：跑两次产出同样的结果（日期戳除外）。

---

## `mirror`

**一句话**：从 `.lore/` 重新生成平台文件（`CLAUDE.md`、`AGENTS.md` 等）。

**怎么用**：`lore mirror` —— 一批 sync 之后，或手动改过 `.lore/*.md` 想同步到 mirror。

**agent 做什么**：
1. 读当前 `.lore/SUMMARY.md` 和 scope 索引
2. 对每个 target 检测段边界（`## Lore` / `---` / `## My notes`）
3. 计算新 Lore 段内容
4. **Content-based dedup**：跟现有 byte-identical 就跳过
5. 替换 Lore 段；My notes 段原样保留
6. 写回文件

**真实场景**：
- 「刚做完一批 sync —— 同步到 agent 端文件」 → `lore mirror`
- 「我手动改过 `.lore/SUMMARY.md` —— 推到 mirror」 → `lore mirror`
- 「验证 mirror 没漂移」 → `lore mirror`（无变化报告即确认）

**输出**：更新过的 `CLAUDE.md` / `AGENTS.md` 等，或「No changes needed」无变化报告。

---

## `history`

**一句话**：列出与某 entry / 文件 / scope 相关的 git commits。

**怎么用**：`lore history <entry-id>|<file-path>|--scope=<name>` —— 调查「为什么有这个」或「什么时候改的」。

**agent 做什么**：
- **Entry 形式**：`lore history DEC-2026-02-03-7c19` —— 找 entry，导 `#added` 日期，跑 `git log --since=<date>` 在引用的代码文件上
- **File 形式**：`lore history frontend/src/store.ts` —— 跑 `git log --since=1970` 在该路径上
- **Scope 形式**：`lore history --scope=frontend` —— 对 `.lore/scopes/frontend/*.md` 每个跑 file 形式

**真实场景**：
- 「为什么选 Postgres？」 → 先 `query` 找到 entry，再 `lore history <id>`
- 「这个文件什么时候改的？」 → `lore history <file>`
- 调试：「这个 module 最近的 history？」 → `lore history <path>`

**输出**：

```markdown
# history: [DEC-2026-02-03-7c19]

  abc1234  2026-05-12  refactor: extract chat agent_loop (#87)
  def5678  2026-03-08  feat: switch chat chain to chat_fast (#74)
```

---

## 速查

| 我想…… | 用 |
|---|---|
| 在项目上启动 lore | `init` |
| 代码改了更新 lore | `sync` |
| 找 memory 里有什么 | `query` |
| 找 stale entry | `audit` |
| 刷新 summary | `compress` |
| 更新 agent 端文件 | `mirror` |
| 查「为什么有这个」 | `history` |

Agent 跑命令时的 operational 规范（一步步做什么）见 [`SKILL.md`](SKILL.md)。各平台文件映射（哪些 agent 读哪些文件）见 [`references/platform-mirrors.md`](references/platform-mirrors.md)。