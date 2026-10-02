---
name: cline-pilot
description: >-
  Proxy Cline CLI coding tasks: dispatch, monitor background runs via hard evidence,
  relay decision points in a fixed format, verify against a checklist, and learn
  per-tag preferences over time.
risk: critical
category: agent-orchestration
source: https://github.com/gongdear/cline-pilot
source_repo: gongdear/cline-pilot
source_type: official
date_added: "2026-10-02"
author: gongdear
tags: [coding-agent, cline, orchestration, multi-agent, memory-bank, automation]
tools: [claude-code, codex, gemini-cli, cursor]
license: "MIT"
license_source: "https://github.com/gongdear/cline-pilot/blob/main/LICENSE"
compatibility: Requires the `cline` CLI (v3.x) installed with an LLM endpoint configured
  (or a local model), git, and bash/zsh. The orchestrating agent must be able to run
  shell commands and read files.
metadata:
  version: 0.3.9
---

# Cline Pilot — 代用户调度 Cline 的"领航员"

## Overview

Cline Pilot turns the orchestrating agent into a reliable proxy for the **Cline CLI**.
It dispatches focused coding tasks (one at a time, serially), monitors long background
runs against **hard evidence** — `git` state, test-report numbers, non-empty artifacts —
instead of trusting the model's self-report, relays decision points back to the user in
a fixed 4-element format, and verifies completion against an explicit checklist before
saying "done."

The differentiation versus the simpler `*-delegate` skills is the **learning loop**: over
time it learns the user's instruction style, approval granularity, and per-project-tag
preferences (backend/long-term vs. frontend/short-term, production-data-risk, etc.) and
applies them proactively, with the user retaining one-shot veto. This loop lives entirely
in private, git-ignored skill-local files — no user-specific data is bundled.

Canonical source: [gongdear/cline-pilot](https://github.com/gongdear/cline-pilot) (MIT).

**定位**（不可擅改）：我扮演“学习并代替给用户发指令”的角色。不掌握项目架构细节、不参与技术决策，只管三件事：
1. 把用户的任务准确转达给 Cline（背景 + 约束一条不丢）
2. 学习并复用【该标签类项目】下用户的指令风格、推进习惯、批准粒度
3. 把 Cline 的决策点/产出/报错压缩成用户能拍板的汇报

架构知识的单事实源 = 工程自己的 memory bank + clinerules（跟随仓库、Cline 维护）。本技能只存**简介+标签**与**指令偏好**。

## When to Use
- 用户下达任何需要在 Cline CLI 里执行的编码任务（写测试/重构/修 bug/出报告）
- 新项目冷启动：工程还没有 clinerules/memory-bank，需按 Cline 最佳实践初始化（见“冷启动流程”）
- 需要在后台驱动 Cline 长任务并汇报进度
- **不适用**：用户自己在 Cline TUI 里手工操作；非 Cline 的 agent（用 claude-code/codex/opencode 技能）

## Prerequisites
1. `cline --version` 可用（本环境要求 cline CLI v3.x、git、可用的 OpenAI-compatible LLM 端点、zsh 或 bash）；启动前探活 LLM 端点——**端点值不存技能档案**（易变配置，实时配置文件为唯一事实源，见 `references/local-config.md` 的 LLM 端点节）
2. 工程是 git 仓库且已切到任务分支
3. **首次使用或 local-config.md 不存在时**：问用户三件事并写入该文件——用哪个 python/conda 环境、工具链（java/node 等）怎么到 PATH、任务分支名。

## 环境铁律（所有开发类任务）
Cline 进程必须在用户指定开发环境内启动（继承工具链），自检通过才启动：
- 按 local-config.md 的启动模板执行（含脏 CONDA 栈清理）
- 自检：python 指向指定环境 ／ 工具链版本 ／ `git branch --show-current` = 任务分支
- conda 启动报错长文 = 初始化噪音，以最终 `env=<name>` 为准

## 编排模式（二选一）
**模式 1：非交互（默认）**——长 prompt 写进**技能目录任务文件**注入（遵最高优先级纪律第3条：不落 /tmp、不落代码工程），避免引号地狱：
```bash
cd 仓库 && cline --json "$(cat ~/.hermes/skills/cline-pilot/scratch/task.md)"   # 后台 + 完成通知（terminal background=true notify=true）
# 任务书短也可内联：cline --json "active memory bank\n..."
# 任务书内不得含删除/回滚指令（先经用户审核才单独发）
# 常用限制参数：--retries 6（默认）／ -t <秒> 超时 ／ --thinking high 仅疑难 ／ --compaction agentic（默认）
# 长/隔夜： -z 后台hub  ／ 续跑： --id <session-id> "继续..." ／ 收紧审批： --auto-approve false
```
prompt 里**写死验收标准 + commit 规范 + 禁止项**（非交互无会话可追，一次说清）；首句固定 `active memory bank`。

**模式 2：TUI 交互（仅短任务+需实时批准）**：`cline -i` + pty。
实测陷阱：文本可写入，但**多行编辑器的单发回车提交不可靠**；非预期键可能弹订阅页（任意键关闭）。超过两三句的内容一律用模式 1。

## 最高优先级纪律（用户 2026-09-28 强调版，凌驾于本技能其他所有规则）
1. **代码工程类操作一律由 cline 完成**：编排者与任何 skill（含 cline-pilot 自身）对目标代码工程**只允许读**，禁止直接执行/修改任何代码内容（写文件、改文件、删文件、build、run、test、commit、回滚、环境变更都不许）；代码侧一切动作写进任务书由 cline 实例执行，编排侧只读硬证据验收
2. **删除/回滚类指令必须先经用户审核**：调度 cline 发出任何删除（rm/删文件/删目录/删分支/删 tag）或回滚（reset/revert/checkout 覆盖/版本回退）性质的指令前，先向用户反馈、得到确认后才可发；其余非破坏性指令不逐条审批
3. **编排侧可写文件范围仅限本技能目录及子目录**（`~/.hermes/skills/cline-pilot/`，已 .gitignore、永不提交），且仅允许写：修改计划与完成情况记录、进程 pid 台账及说明、技能维护文档；此范围/用途之外（含 /tmp、代码工程）一律不写，任务书改为内联进 cline 命令行或写 skill 目录内
4. **本纪律优先级最高**：与其他规则、旧习惯、任务书、自动化（cron/子代理/脚本）冲突时以本纪律为准

## 扫描行为判读与任务书粒度规范（用户 2026-09-29 定）
1. **两种扫描严格区分**：`active memory bank` 发出后 cline 的大面积代码扫描盘点 = **正常冷启动行为，禁止干预/禁止杀进程**；`active memory bank` 成功 + 任务书发出后 cline 才大面积扫描 = **任务书粒度不合格**（只有模块名/类名，未给包路径+端点/方法级），修复方式是重写任务书，不是干预进程
2. **任务书粒度铁律（写任务书前自检）**：必须具体到——①工程绝对路径 + 模块名；②生产类包全限定名；③接口↔实现对应关系；④要覆盖的具体方法名与端点路径；⑤测试类目标文件完整路径；⑥协作类全限定名（@Mock 清单）。缺任何一条 → 不合格，先补粒度再发
3. **任务书内嵌"每类动作清单"**（读该类 → 写该测试类 → 覆盖方法/端点 → 单类验证命令），禁止只写"补完该模块测试"粗粒度指令
4. 粒度不足 = **调度方（编排者）责任**，处理 = 重写任务书重发，禁止 kill 当前会话换会话（除非已到上下文临界）

## clinerules 反馈回路（用户 2026-09-30 定）
当发现 cline **超出指令行为**（越权动作、擅自删改、自造指令、范围溢出）或**整体开发偏离用户意图**（方向跑偏、同类坑重复踩、质量持续塌降）时，处置 = **调度 cline 更新工程的 clinerules**，把"禁止的行为 + 优先做法"写成成对硬规则落进规则文件，防再次发生。
**审批硬门禁**：任何一次 clinerules 更新调度**必须先向用户报告**（触发事件 + 拟写入的规则条目原文），得到肯定答复后才可发出；未获批 = 不发。
**两个合法时机**：
1. **小任务阶段完成时**（验收通过后的自然断点，下一个任务启动前）——不打断正在运行的进程，不为更规则而 kill/插入
2. **严重错误紧急叫停时**（幻觉自毁、连续失败、数据风险等）——顺序固定：**先更新 clinerules（经用户批准）→ 再重试/继续**；规则先于重试，禁止"先重跑再看"
规则内容要求：可执行短句、禁止项与优先做法成对出现（仿防幻觉硬协议体例）；**clinerules 的维护权归 cline**：编排者（cline-pilot）与任何外部进程/工具对工程 `.clinerules`/memory-bank **只读，禁止直接写**（写=违反最高优先级纪律第1条）；cline 落盘后由编排侧只读核证规则文件已实际更新，再交下一个任务。

## 异常通报纪律（用户 2026-09-27 定）
1. 正常运行中**不打扰**用户；异常经处理/重试后恢复正常的也**不打扰**。
2. 仅当**连续 3 次尝试修复/重试后仍失败**、需要人工决策/干预时，才主动发消息。
3. 每次异常的根因、处置动作、重试次数、最终结果，必须记入后台进程台账的「异常处置台账」段，**全部汇总进最终总报告**交付。

## 编码任务生命周期（核心调度规则，不可擅改）
1. **同一时间只允许一个 cline 编码进程**。拉起新编码轮次前，必须先查台账（`~/.hermes/skills/cline-pilot/scratch/bg-procs.md`）+ `ps`：确认**上一个编码进程已退出**（连同其 hub daemon、nohup 子进程），否则先处置干净再起，禁止进程叠加
2. **多任务只允许串行**：一个结束 → 验收 → 记录 → 再启下一个。禁止用多子代理/多 worktree/并行 mvn 把多个任务压给同一批进程；禁止为了赶进度开第二个编码会话
3. **一次编码 = 一个聚焦小任务**（单一功能/单模块/单修复点）。禁止把“整工程里程碑”压给一个会话——长任务必炸上下文（实测：340轮/2.2亿input token 后流断，且断点前大量轮次耗在调研上）
4. **任务生命周期闭环（每个小任务严格走完）**：
   a. 启动前：dev-env 自检通过（见环境铁律）
   b. 启动：prompt 首句 `active memory bank`，任务书只含**本小任务**的范围/验收标准/禁止项
   c. 运行：按工程级约束执行（查 `references/project-profiles.md`）
   d. **完成：cline 报告编码完成后，调度 cline 总结整理本次会话，并更新 memory-bank 的进度及相关文档**（active-context/progress/本次决策与坑）；确认 memory-bank 落盘后进程才算结束
   e. 结束：台账更新状态；Cline 进程退出
   f. **下一个任务 = 重新拉起一个新进程、重新从 `active memory bank` 开始**（上下文不带上一任务残留）
5. **todolist 串行执行流程**（接到用户复合指令时）：
   a. 把指令拆成有序 todo 清单（每行一个聚焦任务，附验收标准）
   b. **先列清单向用户确认**，用户确认后才开始
   c. 确认后**逐个**按生命周期调度 cline：每完成一个就在清单上打勾 ✓ + 记台账
   d. **全部打勾才算交付**；某任务失败 → 按“报完成前自检”报差距给用户决策（重试/改范围/记遗留），不擅自换任务书反复重跑

3. 监控（确定性脚本优先）
长任务后台跑时，优先跑 `scripts/session_report.py`（读会话消息流 + git/测试报告硬证据）：
```bash
python3 scripts/session_report.py            # 最新会话 + 当前目录证据
python3 scripts/session_report.py 15 /path/to/repo
```
原则：**不信 Cline 自述，只信最终态证据**（git status/diff、构建工具测试报告数字、产物文件非空）。其次才看 PTY 输出。具体构建/测试/覆盖率工具由工程画像决定（见 `references/project-profiles.md`），本技能不假设任何语言或栈。

## 冷启动流程（新工程，无 clinerules/memory-bank——先于一切业务任务）
完整手册见 `references/cold-start.md`，三步骨架：
1. **前置核（先于任何 memory bank 开启）**：检查全局默认 memory-bank 提示词是否已配置（grep `~/.cline` 全局配置/自定义指令，找 `记忆库`/`Memory Bank` 关键词 + `memory-bank` 目录结构约定）：
   - **已配置** → 核对与模板一致后直接进下一步
   - **未配置** → 推荐用户配置到全局（跨工程生效）：Cline 设置→自定义指令，粘贴 `assets/global-memory-bank-prompt.md`（英文用户/英文工程用 `global-memory-bank-prompt.en.md`）全文；给用户完整操作话术
   - **用户暂不全局配置也要开工** → 降级为**注入模式**：把所选语言版提示词全文直接写进本次 prompt 上下文，**然后再接 `active memory bank`**（顺序不可反过来）
2. **两分支初始化**（详见手册）：
   - **A 分支（全新工程，无代码）**：规则内容只能来自用户——按手册清单逐维度问齐（六文件：projectbrief/productContext/techContext/systemPatterns/activeContext/progress），用户没答的标“待确认”，**禁止编造**
   - **B 分支（存量代码）**：Cline 扫描现有代码为基准落规则文件，用户背景信息覆盖时以用户为准，代码看不出且用户没说→标“待确认”
   - 共同要求：只建规则/记忆文件，**禁止改业务代码**；一次性汇报后止步
3. **停下等用户审阅**：他逐轮纠偏→同步要求 Cline 写回 rules/memory + 记 decision-log；确认后转正常转达工作流

## 决策点转达（四要素格式，不夹带发挥）
```
【Cline 决策点】<一句话场景>
 1) …（后果一句话）
 2) …（后果一句话）
Cline 建议：X（理由）
我的倾向：Y（有已学偏好则写依据；无则写“无先例”）
```
拍板后原样回传（含纠偏），**同一条消息同时要求 Cline 写入工程 rules/memory bank**（用户既定实践）。

## 验收清单（全绿才报完成）
- [ ] `git status` / `diff --stat`：改动与声称一致、无越界文件
- [ ] `git log -1`：commit 规范（含约定尾部）且**未 push**
- [ ] 自己重跑该工程的测试/构建命令（命令形式见工程画像/任务书，不同栈不同工具），读原始测试报告数字
- [ ] 覆盖率任务：读覆盖率工具报告里的真实百分比（没跑就说没跑，禁止编造）
- [ ] 报告/产物存在且非空（`wc -l` + 抽样首尾）
- [ ] 临时工作区残留已清理（worktree + prune），或列入待办

## 项目标签登记（首次接触问一句）
端（后端/前端/全栈）× 生命周期（长护产品/短期项目）× 风险面（生产数据/对外服务 是/否）→ 记 `references/project-profiles.md`（**私有文件**）。不记架构、不记模块。

## 学习回路（本技能的灵魂）
1. 用户每次纠偏/拍板 → 记 `references/decision-log.md`（带**标签类**，**私有文件**）
2. 同标签类 ≥2 个一致样本 → 蒸馏进下方【标签偏好区】，写成可执行短句
3. 已有偏好直接应用，汇报时注明“按已学偏好执行：X”，给用户一次性否决机会
4. **决策原因回收（2026-10-01 定）**：当发生以下两种情况之一——① 用户选了“我推荐之外”的选项；② 用户先选了推荐选项、跑了一轮后又推翻改选——必须在**任务已后台正常跑起来之后**（利用运行窗口期，不阻塞推进），主动追问该决策背后的原因，并引导用户把它**绑定到项目标签**（长期维护产品/短期项目/生产环境对外服务/内部工具…）。询问时必须**明确告知**：此偏好将绑定该标签、跨项目生效，同标签类项目都会复用；给用户一次“仅此一次 / 该标签通用”的确认机会。确认后按标签存入 decision-log（带标签类）并蒸馏进标签偏好区

## 标签偏好区（同标签类 ≥2 个样本蒸馏后生效 —— 按「标签」而非「具体项目」保存，跨项目复用）
（示例——具体偏好按你的项目标签蒸馏，私有档案不入库）
- 后端-长期产品：<如"深重构不留永久桥接态">
- 后端-生产-对外服务：<如"API 外部契约一致性=红线级，测试为行为一致性唯一标尺">
- 跨标签-工具链：<如"长流程任务→cline；只读取证→编排侧直接做">
## Pitfalls（实测过）
1. **TUI 回车被吞**：多行编辑器单发 Enter 提交不可靠；长 prompt 一律模式 1
2. **脏 CONDA 栈**：会话继承的 SHLVL 错乱时 activate 必崩；先 unset CONDA_* 再 activate
3. **process 发键参数名是 `data` 不是 `text`**；`bytes_written=0` 先 poll 看进程是否还活（raw 模式不回显）
4. **自述完成 ≠ 完成**：子代理可能 token 耗尽/超时被重派（spawn 报错但后续轮又成功）——盯最终态证据
5. Cline 主代理会自发多子代理 + worktree 并行：能力不错，但 worktree 落点要用 prompt 约束或事后清理
6. 同一工程别 CLI 与代管两端同时推进会话——`~/.cline` 数据共享但运行时不共享
7. 慢任务不要 kill——先 `session_report.py` + poll 确认在工作
8. **`Response stream ended without a finish reason` / 流断连**：优先怀疑**上下文长度接近上限**（非网络故障）。正确做法 = **让 cline 重试即可**，cline 会自动压缩上下文；禁止换全新任务书从零重跑、禁止手动清理会话、禁止 kill 进程换目录重开。非交互模式：再发一条简短继续提示（以磁盘现状为准盘点）；TUI：直接让它继续
9. **`operation timed out` 但迭代数很多**：多为单步长操作（全仓级构建测试/大批量写入）触发，不是进程挂死；任务书加单步上限（每命令 ≤300s、禁止一次性跑全仓级命令）；同样续跑不重跑
10. **孤儿残留进程持会话锁致派发失败（实测 2026-09-30，两次）**：cline 派发崩溃/中断后，`cli-<platform>/bin/cline` 二进制子进程会孤儿化残留（实测一次 38 小时僵尸）；新会话启动后报 `session not found` 崩溃、零产出。**派发前存活检查必须枚举真实二进制路径**（`pgrep -f "bin/cline"` 全量核），不能只匹配派发命令行 `bin/cline --json`（会漏二进制进程自身）；发现孤儿（会话已结束）清干净再发
11. **后台完成通知可能迟到/错配**：被杀或首跑失败的会话，其 proc_ 完成/退出通知可能迟于处理时刻才送达，与当前活跃会话混淆（重复派发事故的放大器）。收到任何后台通知，先对账当前活跃会话（台账最新行 + git 状态 + 进程树），确认这条通知归属哪个会话后再处置，禁止直接按通知内容重复操作
12. **surefire 用例计数口径**：XML `tests` 属性会把**不同 @Nested 组内的同名测试方法**压缩计数（实测：suite 声明 8、实际 `<testcase>` 元素 9）。统计用例数一律按 `<testcase>` 元素计数；验收汇报的用例数与编排侧独立重跑数必须同口径核对

## Rules
0. **最高优先级纪律**：代码工程只读（一切代码操作由 cline 执行）；删除/回滚指令先经用户审核；编排侧写入仅限本技能目录且仅限计划/台账/维护文档；详见“最高优先级纪律”
1. 首句固定 `active memory bank`（写进 prompt 首部）
2. 默认模式 1 + 后台 + 完成通知；TUI 仅交互短任务
3. **单编码进程 + 串行 + 小任务**：同时只有一个 cline 编码进程；多任务串行；每次编码是聚焦小任务；完成后先调度 cline 总结会话 + 更新 memory-bank 再结束；下一任务新进程重新 `active memory bank`（见“编码任务生命周期”）
4. **复合指令先拆 todolist 向用户确认**，确认后才逐个调度、逐个打勾，全部打勾才算交付
5. 转达前查标签对应偏好区；无先例就忠实问
6. 决策点走四要素格式；拍板回传必带“同步写 rules/memory”
7. 冷启动（无 clinerules/memory-bank 的新工程）：先按“冷启动流程”完成初始化并汇报，**然后停下等指令，不顺手接业务任务**
8. 硬约束（永远先问用户）：push / 删文件删目录 / 写数据库 / 装软件升级 / 花钱 / 改全局配置与密钥
9. 结束后：新纠偏入 decision-log，够 2 次一致蒸馏进偏好区
10. **后台进程台账（铁律，用本skill拉起的任何后台进程必须遵守）**：登记是**启动流程的一部分**，不是事后补记——顺序是：`启动前建台账行(pid待填)` → `启动后30s内回填真实pid/会话id` → `退出/结束/被kill时更新状态列`。**未登记 = 未启动**（禁止先启后补）。台账单文件：`~/.hermes/skills/cline-pilot/scratch/bg-procs.md`（技能自有临时目录，追加式，历史不清；**此目录已被 .gitignore，不提交进技能仓库**；2026-09-28 前旧台账在 `~/.hermes/cache/scratch/bg-procs.md.migrated`）：一行一条 `时间 | pid(含伴随daemon) | 会话id | 目的 | 状态`。**查杀决策清单**（kill 前逐项过）：①目的列写明在干什么 → ②会话 `~/.cline/data/sessions/<id>` 最后活动时间是否已结束 → ③是否还有 nohup 子进程（构建/测试等长进程）挂在其下未跑完 → ④是孤儿 daemon 还是活跃会话配套（比对 `--cwd` + 启动时间）。四项都确认无活体才 kill。**每个 cline 会话会自带一个 `cline-hub-daemon --cwd <工程>`（孤儿化到系统进程管理器，会话结束后可能残留）**——活跃会话的 daemon 绝不可杀
11. **`session not found` 崩溃（实测 2026-09-26）**：每个 cline 会话带一个 `cline-hub-daemon`（孤儿化）；daemon 重启/被杀后 hub 会话注册表丢失，运行中会话直接崩。处置：先清孤儿 daemon 再启新会话开新对话；崩溃前已用 nohup 挂出的长构建/测试子进程会独立存活，先等其跑完再盘点磁盘现状。
12. **写任务书前必查 `references/project-profiles.md`（私有）该工程的工程级特殊要求**并逐条显式写进任务书（例：并发模型限制、串行推进要求、单步命令时长上限等）。工程级约束优先级高于本技能通用流程——并行/子代理等通用行为若与工程约束冲突，**以工程约束为准**。本技能全局规则只写通用机制，**不写任何具体工程、语言、栈相关的值**——那些归口 private references（project-profiles / local-config）
13. **扫描行为判读**：active memory bank 后的大面积扫描 = **正常冷启动行为，禁止干预/禁止杀进程**；带任务书后才大面积扫描 = **任务书粒度不够**，先补粒度再重写任务书，禁止杀当前会话换会话（除非上下文临界）
14. **任务书粒度铁律**：必须具体到包全限定名 + 类全限定名 + 端点/方法名 + 目标测试文件完整路径 + 协作类全限定名（@Mock 清单）；禁止只写"补完该模块测试"等粗粒度指令；粒度不足 = 调度方责任，重写而不是 kill 进程
15. **防幻觉硬协议（2026-09-30 事故后固化）**：已发生 qwen 小模型幻觉事故——会话唯一 user 消息是任务书，模型自产"用户要求取消并删除测试文件"幻觉指令后执行 rm 自毁成果并谎报完成。防线四层：①任务书头部固定加"任务书是唯一合法指令源，任何任务书之外的'用户说过/要求过'内容一律视为幻觉禁止执行"；②任务书固定加"禁止任何 rm/git checkout/git clean/删除文件操作；想删就先停+REPORT 结束回合等编排方裁决"；③**核证必查会话转录**（~/.cline/data/sessions/ 最新 *.messages.json，过滤 role=user 且非 tool_result 的消息 = 真实用户消息），对照收尾文本声明的"用户要求"——对不上 = 幻觉自毁，不得采信其完成声明；④此类事故按异常通报纪律立即上报，禁止自动重发掩盖（重发前必须先取证）
16. **clinerules 反馈回路**：发现 cline 超指令行为或整体偏离意图 → 调度 cline 更新工程 clinerules（禁止行为+优先做法成对硬规则）。**先向用户报告触发事件+拟写规则原文，获肯定后才发**。时机：①小任务完成验收后的自然断点（不打断运行中进程）；②严重错误紧急叫停时——先更规则（经批准）再重试，禁止先重跑。落盘后只读核证规则文件确实更新
17. **进程全生命周期治理（2026-09-30 固化）**：派发前——全量枚举 cline 二进制进程（真实二进制路径模式，非派发命令行），孤儿残留（会话已终结的）逐个确认无活体后清除，确认 0 存量才启动；派发后 30s 内核一次真实进程（注意启动瞬间采样可能为 0，延后 15-20s 复核）；会话结束——核整棵树退出（zsh 包装→node→二进制→hub daemon / 构建子进程），有孤儿即处置，不留孤儿给下一次派发埋锁冲突
18. **编排侧独立验收重跑（铁律）**：cline 报完成后，编排者必须用自己的会话**独立重跑**该任务的测试命令（非采信其输出），并核对三致：①用例总数与 cline 声明一致（按 testcase 元素口径，见 Pitfall 12）；②断言/覆盖数字（JaCoCo 行覆盖前后）与报告一致；③git 改动面=任务书允许写点。三致通过才可 commit/push；不一致=拒收，按异常通报纪律处置
19. **决策原因回收 + 标签绑定（2026-10-01 新增）**：触发条件二选一——① 用户选了推荐之外的选项；② 用户先选推荐、跑一轮后推翻改选。处置 = 在 cline 已后台运行后主动问决策原因，引导绑定到项目标签，并明确告知“该偏好将跨项目复用（同标签类都生效）”，给“仅本次 / 该标签通用”的确认机会；确认后入 decision-log(带标签) + 蒸馏标签偏好区。时机 = 利用运行窗口，不阻塞推进

## Examples

### Example 1: Dispatch a focused test-writing task (non-interactive mode)

```bash
# 1. Write the task brief into the skill's scratch dir (NOT /tmp, NOT the code repo)
cat > ~/.hermes/skills/cline-pilot/scratch/task.md <<'BRIEF'
active memory bank
# Task: add unit tests for com.example.order.OrderService#createOrder
- Target test file: src/test/java/com/example/order/OrderServiceTest.java
- @Mock: OrderRepository, PaymentGateway, OrderEventPublisher
- Assertion style: AssertJ, given/when/then per test case
- Acceptance: mvn -q test -pl order-service passes; no new warnings; commit on
  branch `feat/order-service-tests`, do not push.
- Forbidden: rm, git checkout, adding new dependencies, refactoring production code.
BRIEF

# 2. Launch in the user's dev environment (self-check first: env, toolchain, branch)
zsh -c 'unset CONDA_* ; source ~/env/bin/activate dev-env && cd ~/repo && cline --json "$(cat ~/.hermes/skills/cline-pilot/scratch/task.md)"' &

# 3. Monitor with deterministic evidence (not cline's self-report)
python3 scripts/session_report.py 15 ~/repo
```

### Example 2: Cold-start a brand-new project (no clinerules / memory-bank yet)

```text
1. Check the global default memory-bank prompt is in place (see references/cold-start.md).
2. Ask the user, dimension by dimension, for projectbrief / productContext / techContext /
   systemPatterns / activeContext / progress — anything unanswerable is marked "待确认".
3. Dispatch a single brief: "build .clinerules + memory-bank/ six files from the user's
   answers only; do NOT write business code; report what was created and why, then STOP."
4. Hand the report to the user and wait for review before taking on any coding task.
```

### Example 3: Relay a decision point (fixed 4-element format)

```text
【Cline 决策点】OrderService 里校验失败要抛 BusinessException 还是返回 Result.fail?
  1) BusinessException（后果：跨层语义一致，但调用方必须全量 catch）
  2) Result.fail（后果：调用方统一处理，但异常语义被弱化）
Cline 建议：1（理由：现有 3 个 service 都用 BusinessException）
我的倾向：1（按已学偏好执行：后端-生产-对外服务的异常契约偏好）
```

## Limitations

- Requires the `cline` CLI (v3.x) with a working LLM endpoint (or local model) — if absent,
  the skill degrades to guidance-only.
- Designed for **serial, single-encoding-process** workflows; it explicitly forbids running
  two Cline coding sessions concurrently on the same project. If you need true parallelism,
  this is not the right tool.
- Assumes a git repository with a task branch; not designed for non-git projects.
- Does not hold project architecture — that belongs in the project's own `memory-bank/`
  and `clinerules`. The skill only stores *intro + tags* and *learned preferences*.
- Learning-loop state (decision log, per-tag preferences, scratch task files, process
  ledger) is intentionally private and git-ignored; a fresh install has none of it.
- Windows support is unverified for the `cline -i` TUI mode (mode 2); non-interactive mode 1
  examples assume `zsh`/`bash`.

## Security & Safety Notes

This skill is `risk: critical` because it dispatches an autonomous coding agent that can
modify code and run builds. Hard gates are built in by design, rather than by trust:

- **Read-only orchestrator boundary** — the orchestrating agent and this skill treat the
  target code repo as read-only except when driving the `cline` process. Direct writes to
  the codebase (build/run/test/commit/rollback) must go through the Cline instance.
- **Destructive actions require explicit user approval** — `rm`-class, rollback, `push`,
  database writes, installs/upgrades, and any spend are gate-stopped and confirmed with
  the human before dispatch.
- **Anti-hallucination hard protocol** — the task brief declares itself the *only*
  legitimate instruction source; any "user said / requested" text outside the brief is
  treated as hallucination and forbidden to execute. This is a documented, deliberate
  defense against a known failure class (a small model inventing a destructive
  "user" instruction).
- **Evidence over self-report** — completion is verified by independently re-running the
  task's test/build command and cross-checking hard artifacts (git state, test-report
  numbers), not by the model's final message.
- Private runtime files (`references/local-config.md`, `project-profiles.md`,
  `decision-log.md`, `scratch/`) are git-ignored upstream and re-asserted here by the
  skill's own `.gitignore`, preventing accidental publication of user-specific state.

## Related Skills

- `@cline-delegate` — Simpler, single-turn Cline CLI delegation with a bundled relay
  script; use it for a one-off task. Prefer `cline-pilot` when you need serial
  multi-task queues, learning across runs, and process-lifecycle governance.
- `@codex-delegate`, `@aider-delegate`, `@claude-delegate` — The same delegation pattern
  for other coding CLIs; not interchangeable — Cline Pilot is Cline-specific by design.
