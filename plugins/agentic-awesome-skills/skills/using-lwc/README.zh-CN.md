<h1 align="center">LWC — 面向 AI Agent 的主动记忆</h1>

<p align="center">
  <strong>Agent 驱动 · 持久化 · 来源可追溯</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@i-xor/lwc"><img alt="npm: @i-xor/lwc" src="https://img.shields.io/badge/npm-%40i--xor%2Flwc-CB3837?logo=npm"></a>
  <a href="https://crates.io/crates/lwc"><img alt="crates.io: lwc" src="https://img.shields.io/crates/v/lwc.svg"></a>
  <img alt="Node.js 22 or newer" src="https://img.shields.io/badge/node-%3E%3D22-5FA04E?logo=nodedotjs">
  <img alt="平台：macOS、Linux、Windows" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-666666">
  <a href="https://github.com/JanYork/llm-wiki-cli/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/JanYork/llm-wiki-cli/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://skills.sh/janyork/llm-wiki-cli/using-lwc"><img alt="skills.sh: using-lwc" src="https://img.shields.io/badge/skills.sh-using--lwc-000000?logo=vercel"></a>
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/JanYork/llm-wiki-cli/main/docs/images/lwc-agent-memory-zh.png" alt="LWC Agent 记忆" width="100%">
</p>

`lwc` 是一个由 Agent 驱动的主动记忆 CLI，让 AI Agent 能够跨会话自主召回、维护和
演进持久化、来源可追溯的知识。

**兼容 Claude Code、Codex、Cursor、OpenCode、Gemini CLI、Kiro、Hermes、
Antigravity 和 pi。**

LWC 把经过筛选的文档转化为可长期维护的 Wiki。Agent 负责理解与综合，`lwc` 负责
保存来源、页面、引用、链接、索引和历史，让知识持续积累，而不是每次查询都重新拼接
原始片段。

<p align="center">
  <img src="https://raw.githubusercontent.com/JanYork/llm-wiki-cli/main/docs/images/lwc-overview-zh.png" alt="LWC 产品概览" width="820">
</p>

## LWC 是 Agent 记忆，不是 RAG

RAG 和 LWC 都能帮助大模型使用外部文档，但二者把状态留在不同的地方。典型的
RAG 会在每次查询时检索原始片段，再生成一次性答案：

```text
查询 -> 检索片段 -> 生成答案
```

LWC 会把已经完成的有效工作保留下来：

```text
任务 -> 读取持续维护的 Wiki -> 结合来源与已有综合进行推理
     -> 把值得复用的改进写回
```

检索只是 LWC 的一项操作，而不是它的组织原则。LWC 的核心产物是一个来源可追溯、
持续修订的 Wiki，其中的页面、引用、链接、矛盾和历史会随着认识变化而更新。因此，
LWC 不依赖 embedding 或向量数据库，也不会在回答完成后丢弃本次综合结果。它可以
与 RAG 配合，但它本身不是查询时 RAG。

<p align="center">
  <img src="https://raw.githubusercontent.com/JanYork/llm-wiki-cli/main/docs/images/lwc-source-grounding-zh.png" alt="LWC 来源追溯与可靠回答" width="820">
</p>

### LWC 应当由 Agent 操作

`lwc` 是提供给 Agent 的机器接口，不是面向人类的笔记应用。正常使用时，人类负责
选择来源、提出目标和问题，并审阅答案或投影出来的 Markdown；Agent 负责调用 CLI、
管理作用域、整合来源、维护引用与链接，以及判断哪些知识值得读取或写回。

除非正在开发或排查 `lwc` 本身，否则人类不应手工驱动日常工作流。需要使用 LWC
时，请让 Agent 激活规范的 `using-lwc` Skill，通常调用名为 `$using-lwc`。

## 让 Agent 自动完成安装与配置

把下面的提示词交给你正在使用的 Agent。它会安装全局 CLI，把已支持宿主的配置交给
LWC 幂等 AgentTarget 安装器；只有尚未注册的 Agent 才按自身官方规范弱适配。

<details>
<summary><strong>复制完整配置提示词</strong></summary>

```text
请为当前用户完整安装并配置 LWC。请直接执行并验证，不要只输出一份让我手工执行的
教程。

权威来源：
- https://github.com/JanYork/llm-wiki-cli
- https://github.com/JanYork/llm-wiki-cli/tree/main/skills/using-lwc

要求：
1. 阅读本 README、`SECURITY.md` 和 `skills/using-lwc/SKILL.md`。如果 `lwc` 尚不能
   全局调用，安装经过 checksum 校验的官方 Release；日常命令不得拼接私有二进制路径
   或 `LWC_PROJECT_ROOT`。
2. 运行 `lwc --version`；全局记忆缺失时仅执行一次 `lwc --scope global init`；然后
   执行 `lwc agent install --yes`。该命令会自动检测已安装的受支持 Agent，并按官方
   路径安全安装 MCP、Skill、Hook 与 Instructions。不得手工重写这套逻辑，也不得给
   同一个 Agent 同时安装原生包和直接配置。
3. 检查 `lwc agent status --target all --location global`。按需重启受影响的 Agent，
   并完成宿主正常的 Hook 信任审查。没有项目级明确授权时，不得初始化项目 Wiki 或
   任一图能力。
4. 如果当前运行时不在 LWC 已注册 AgentTarget 中，才按该运行时的官方用户级规范安装
   规范 `using-lwc` Skill、追加式指导区块、`lwc serve --mcp`，并只在官方支持时安装
   有界会话 Hook。保留已有配置、保证幂等；没有官方表面就报告不支持，不得猜路径或
   配置键。

最后报告 LWC 版本、检测并配置的 Target、status 结果、修改文件、不支持的能力，以及
仍需完成的重启或信任操作。
```

</details>

## 思想来源与致谢

`lwc` 以 Andrej Karpathy 提出的
[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
模式为核心准则：让 LLM 增量构建并持续维护一个持久、互联的 Wiki，而不是每次查询
都从原始文档重新组织知识。项目的 CLI 架构与部分实现细节也参考了
[`nashsu/llm_wiki`](https://github.com/nashsu/llm_wiki)。

`lwc` 在此基础上采用 Rust 与 SQLite，实现面向 Agent 的本地命令行工具。

## 核心设计

<p align="center">
  <img src="https://raw.githubusercontent.com/JanYork/llm-wiki-cli/main/docs/images/lwc-architecture-zh.png" alt="LWC 架构图" width="100%">
</p>

持久化知识模型分为三个逻辑层：

| 层 | 内容 | 约束 |
| --- | --- | --- |
| Raw sources | 经过筛选的输入内容的不可变快照 | 通过 `source` 加入，不改写来源事实。 |
| Wiki | Agent 维护的页面、引用、链接和来源类型 | 通过 `page` 更新；引用来源，并分类需要长期保留的非来源知识。 |
| Schema and purpose | 维护规则与项目目标 | 约束后续每一次 ingest 和修订。 |

SQLite 是唯一的规范事实源。Markdown 树是供人和 Obsidian 等工具使用的可重建
投影。Agent 通过 `lwc` 修改知识，而不是直接编辑 `.lwc/wiki.db` 或投影出来的
Markdown。命令成功时向 stdout 返回 JSON，失败时向 stderr 返回结构化 JSON。

对于当前格式的 store，读取命令保持只读；新版 CLI 第一次打开可写的旧版 store
时，会先在事务中完成一次 schema 迁移，再继续读取。

## 分层检索与知识图

每个当前 Source 和 Wiki 页面都会被确定性拆分并索引为段、句和规范化词。SQLite
仍是权威数据源；Span FTS 与类型化规范图都是可重建索引。现有搜索默认仍只返回
文档，只有显式指定粒度才检索段句：

<p align="center">
  <img src="https://raw.githubusercontent.com/JanYork/llm-wiki-cli/main/docs/images/lwc-memory-graph-zh.png" alt="LWC 记忆图" width="100%">
</p>

```bash
lwc search "投影一致性" --granularity sentence --type page
lwc search "投影一致性" --granularity passage
lwc search "投影一致性" --granularity all --group-by document
lwc span get <SPAN_ID>
lwc span expand <SPAN_ID> --before 1 --after 1 --children 20
```

Span locator 绑定文档指纹和切分器版本。页面正文替换后，旧 locator 会以
`stale_span` 失败并返回新旧元数据；LWC 不会把它模糊映射到相似文本。

无需关键词也可使用有界、类型化图 API：

```bash
lwc graph explore
lwc graph node page:projection-policy
lwc graph neighbors page:projection-policy --direction outgoing
lwc graph path page:implementation page:policy --max-depth 6
lwc graph impact page:policy --max-depth 4
lwc graph overview
lwc graph status
lwc graph verify
```

自动边只表达结构或可证明的证据关系；语义关系必须显式写入并可审计：

```bash
lwc graph relation set page:implementation DEPENDS_ON page:policy \
  --provenance source-grounded --source 12 \
  --reason "来源 12 明确给出该约束" --confidence 0.95
lwc graph relation list --from page:implementation
lwc graph relation retract page:implementation DEPENDS_ON page:policy \
  --reason "该依赖已被新证据取代"
```

关系理由是持久内容，不得写入凭证、秘密或原始思维链。

SQLite 文档仍是唯一权威数据。图默认禁用；需要图遍历时显式选择一个外部引擎。
配置按内置、全局、项目三层解析，项目值可继承：

```bash
lwc config show
lwc config set --graph grafeo
lwc config set --graph surrealdb
lwc config set --graph disabled
lwc config unset --graph
```

Markdown 转换是独立的可选操作。`lwc init` 会返回同样的机器可读配置指引，但不会
安装或启用转换器。安装并显式选择一个适配器，先转换为新的本地 Markdown 文件并
检查内容，确认后再导入：

```bash
# 二选一；未配置时两者都不会启用。
npm install --global @firecrawl/anydoc
lwc config set --trans anydoc

# 或：
python3 -m pip install 'markitdown[all]'
lwc config set --trans markitdown

lwc trans INPUT --output OUTPUT.md
lwc source add OUTPUT.md
```

配置支持 `--trans-timeout 1..900`，并可为当前适配器重复传入
`--trans-arg=<value>`。LWC 只会直接执行已选择的固定适配器，不会自动回退到另一个
适配器；仅接受本地文件，输入输出均限制为 64 MiB，且绝不覆盖已有输出。凭证应由
适配器从环境变量读取，不得写入 LWC 配置。格式和可选参数以
[Anydoc](https://github.com/firecrawl/anydoc) 与
[MarkItDown](https://github.com/microsoft/markitdown) 官方文档为准。

Grafeo 与嵌入式 SurrealDB 使用 `.lwc/` 下可重建的 sidecar。每个
`graph-project` Work 会先完整提交一篇当前 Source/Page 及其自有链接、引用和显式关系，
确认可用后才开始下一篇。更新和删除只排入实际触及的文档；重建和恢复也使用相同的
单文档单元。历史 source 版本保持不可变，永不重新分词或投影。使用
`work list/status/watch` 查看进度，中断后使用 `work resume`；`graph status` 显示当前
引擎与文档数，`graph verify` 对照 SQLite 的当前文档键。

## 安装

大多数用户应直接使用上面的 Agent 配置提示词。下面的手动命令主要用于维护、排障，
或无法安装配套 Skill 的 Agent 环境。

使用 Homebrew 安装（提供 Apple 芯片 macOS 与 x86_64 Linux 预编译 Bottle）：

```bash
brew install JanYork/tap/lwc
```

使用 npm 安装（Node.js 22+）：

```bash
npm install --global @i-xor/lwc
```

从 crates.io 安装：

```bash
cargo install --locked lwc
```

从 GitHub 安装：

```bash
installer="$(mktemp)"
curl --proto '=https' --tlsv1.2 -fsSL \
  https://github.com/JanYork/llm-wiki-cli/releases/download/v0.14.7/install.sh \
  -o "$installer"
less "$installer" # 执行前先检查脚本
sh "$installer"
```

安装脚本支持 x86_64/aarch64 的 macOS、glibc Linux 和 Windows Git Bash，校验
Release 文件的 SHA-256 后安装或更新 `lwc`。默认安装到 `~/.local/bin`；
如果 `~/.local/bin` 或 `~/.cargo/bin` 中已有 `lwc`，则会原地更新。也可以指定
安装目录：

```bash
installer="$(mktemp)"
curl --proto '=https' --tlsv1.2 -fsSL \
  https://github.com/JanYork/llm-wiki-cli/releases/download/v0.14.7/install.sh \
  -o "$installer"
less "$installer" # 执行前先检查脚本
LWC_INSTALL_DIR="$HOME/bin" sh "$installer"
```

也可以使用 Cargo 从 GitHub 源码构建并安装：

```bash
cargo install --locked --git https://github.com/JanYork/llm-wiki-cli
```

也可以安装本地检出的源码：

```bash
git clone https://github.com/JanYork/llm-wiki-cli.git
cd llm-wiki-cli
cargo install --locked --path .
```

## 配套 Agent Skill

仓库内置 [`skills/using-lwc`](https://github.com/JanYork/llm-wiki-cli/blob/main/skills/using-lwc) Agent Skill，让 `lwc` 在有长期
价值的会话中主动承担外部记忆层。可从
[skills.sh](https://skills.sh/JanYork/llm-wiki-cli) 安装：

```bash
npx skills add JanYork/llm-wiki-cli --skill using-lwc -g
```

也可以从本地检出复制到当前 Agent 运行时的用户级 Skill 目录。以 Codex 为例：

```bash
mkdir -p "$HOME/.agents/skills"
cp -R skills/using-lwc "$HOME/.agents/skills/"
```

规范调用名是 `$using-lwc`。

Skill 触发后会：

- 查找兼容 CLI；如需安装经过校验的官方 Release，则先报告并取得明确授权；
- 报告缺失的全局记忆，并仅在明确授权后初始化；
- 在重复调查前读取有界的全局与项目上下文；
- 用户显式调用时初始化当前项目，否则创建项目级 `.lwc/` 前先询问；
- 拒绝向当前授权工作区根目录之外写入项目内容；
- 区分项目事实与可跨项目复用的全局知识；
- 完整整合来源，并把值得保留的答案写回 Wiki。

`SKILL.md` 只保留精简路由，不再充当一篇超长总手册。它会分别链接基础记忆、触发
时机、主动记忆、物理文档图、有界词网图、CodeGraph、强标签、文档转换、Agent
首次引导以及恢复维护十篇能力文档；每篇都明确说明何时使用、何时跳过、最小流程、
授权边界与完成证据。

Skill 默认从当前目录发现活动项目，并直接调用全局安装的 `lwc` 命令。
`LWC_PROJECT_ROOT` 只用于明确指定项目边界，不是在已经位于当前项目时每条命令都要
导出的前缀。

默认不自动安装 CLI。取得明确授权后，只在一次 bootstrap 命令中设置
`LWC_AUTO_INSTALL=1`。Skill 随附、经过审查的本地安装器固定使用 LWC
`v0.14.7`，并以脚本中经过审查的各平台 SHA-256 验证下载归档；该校验不是发布者
代码签名，升级必须重新审查并更新固定版本。全局记忆初始化同样只在明确授权后，以一次性
`LWC_GLOBAL_INIT=1` 重试启用。Release 二进制覆盖
x86_64/aarch64 的 macOS、glibc Linux，以及 Windows Git Bash。`SKILL.md` 遵循
Agent Skills 的资源目录形式，`agents/openai.yaml` 提供 OpenAI/Codex 元数据。
CLI 本身不绑定具体运行时：任何能够执行 CLI，并加载或适配 Skill 指令的 Agent 都能
使用 LWC；Skill 命令、全局指令和 Hook 的注册方式由各运行时决定，因此上面的配置
提示词会先识别并适配当前宿主。

### 原生 Agent 配置

LWC 可以检测已安装的 Agent，并配置一个统一只读的 LWC MCP。全部 12 个已注册
AgentTarget 都是强适配：针对每个宿主和全局/项目范围，安装官方支持的 MCP、Skill、
Hook 与 Instructions；由 UI 管理、处于 preview 或官方不支持的能力会被明确标记。

```bash
lwc agent install --yes
lwc agent status --target all --location global
lwc agent install --print-config codex
lwc agent refresh --target codex,claude
lwc agent uninstall --target codex,claude --yes
```

`--yes` 默认选择检测到的 Agent、全局配置和各 Target 的默认生命周期/prompt Hook；使用
`--no-prompt-hook` 可省略 Claude 的逐 prompt Hook。安装项固定为
`lwc -> serve --mcp`；唯一的 `lwc_explore` 工具默认读取有界 Wiki
记忆，并支持显式 `code`/`all` 模式；请求的 `projectPath` 必须位于 MCP 宿主启动 LWC
时的工作区内，且绝不会在查询时下载或初始化 CodeGraph。重复安装
和刷新逐字节幂等；卸载只恢复 LWC 拥有的状态，不删除项目索引。`integrations/` 提供
可选的 Codex、Claude Code 和 Pi 原生包；安装包不等于授权或信任，也不要为同一个
Agent 同时安装原生包和直接配置。每个原生包都内置完整的 `using-lwc` Skill，普通用户
不依赖任何第三方 Skill 管理器或维护者本机环境。

Pi 因官方没有内置 MCP，使用原生扩展桥接 LWC MCP。其余 Target 只注册
`lwc serve --mcp`；CodeGraph 是 LWC 内部的代码上下文能力，不会作为第二个 Agent MCP
暴露。由宿主 UI 管理的信任与权限仍由用户决定；preview 能力会明确标记。某个项目范围
只支持部分能力时，安装器会安装这些能力，而不是把整个 Target 降级或拒绝。Kiro 全局
路径遵循 `KIRO_HOME`。

Target 接口、注册顺序、检测规则和 MCP 路径参考 CodeGraph 的 MIT 许可安装器适配设计；
LWC 在其上增加统一 LWC MCP、逐能力状态、Skills、Hooks、共享文件所有权和精确回滚。
许可证声明见 [`THIRD_PARTY_NOTICES.md`](https://github.com/JanYork/llm-wiki-cli/blob/main/THIRD_PARTY_NOTICES.md)。

新项目执行 `lwc init` 后，以及会话开始/上下文压缩 Hook 中，都会输出有界的
`LWC_READINESS`：包括 Wiki、物理文档图、CodeGraph 全局运行时与项目索引状态，
以及 Agent 集成检查命令。物理图会区分“已经授权配置”和“投影仍在等待或失败”。
检测过程只读，不会静默启用或初始化任何图。当两个图都需要授权时，最低兼容协议
使用纯文本，因此不支持勾选框的 Agent 也能正常工作：

```text
1. 同时启用物理文档图和 CodeGraph（推荐）
2. 仅启用物理文档图
3. 仅启用 CodeGraph
4. 稍后
```

用户明确选择 `1` 后，Agent 才会按需初始化项目 Wiki、启用 Grafeo、等待并验证投影
Work、初始化 CodeGraph，并分别核验两个结果。选择“稍后”不会修改任何状态，也不会
阻塞当前任务。原生插件可以把相同编号渲染成自己的 UI，但绝不依赖勾选能力。

强标签用于不经过搜索、按上限完整载入少量核心规则或手册：

```bash
lwc tag set "运维手册" incident-response --priority 100 --reason "主响应手册"
lwc load tag "运维手册" --limit 3
lwc tag autoload "运维手册" --enable --priority 100 --limit 3 \
  --max-chars 50000 --reason "会话边界必须载入"
```

它不是根据分词自动推断的搜索标签；系统会先按索引、篇数和字符预算选页，再把完整
页面放入 Agent 上下文，绝不会一次载入全部分词关系。

## 快速开始

本节记录的是 Agent 实际执行的 CLI 协议；正常使用时，人类不需要手工运行这些命令。

### 1. 初始化项目 Wiki

```bash
cd your-project
lwc init
printf '# Schema\nEvery page declares provenance; source-grounded claims cite sources.\n' | lwc schema set -
printf '# Purpose\nBuild a durable project Wiki.\n' | lwc purpose set -
```

初始化项目时，LWC 会按需把项目相对路径 `.lwc/` 加入 Git 的本地
`info/exclude`，不会修改仓库 `.gitignore`。只有明确准备版本化 Wiki 时才使用
`lwc init --no-git-exclude`。

### 2. 加入来源材料

```bash
lwc source add-dir docs/
```

没有显式标题的文件会确定性地使用来源路径作为可读标题；内容相同的文件会通过
SHA-256 去重。

解析后位于当前项目 Wiki 根目录之外的来源必须显式传入
`--allow-external-source`。检测到高置信度凭证特征时默认拒绝；只有确认不可变
快照安全后，才能传入 `--acknowledge-sensitive-source`。

每次成功加入来源时，LWC 还会记录本次观察到的文件路径及其当前不可变快照。
依赖文件证据前，只检查本次任务真正相关的来源：

```bash
lwc source status 7 12
```

该只读命令会流式计算实时文件的 SHA-256，并分别返回路径版本状态（`current` 或
`superseded`）与文件系统状态（`current`、`modified`、`missing`、`unreadable`、
`oversized` 或 `unstable`）。`source status --all` 的成本与所有被跟踪文件的总字节数
成正比，只应在明确的维护任务中使用。发现文件变化后先检查差异和直接引用者：

```bash
lwc source diff 7
lwc source refs 7 --limit 1000
```

`source diff` 默认比较不可变来源与当前文件，也可用 `--to-source` 比较两个不可变
版本。每侧最多 8 MiB、200,000 行；默认返回 20,000 个 Unicode 字符，
`--max-chars` 最高 100,000。一个来源对应多个路径时必须用 `--path` 精确选择；
`truncated=true` 只代表不完整预览。`source refs` 返回的是直接引用旧来源、需要复核
的候选页面，不代表这些页面一定受到了语义影响。确认变化有实际含义后，才对同一路径
再次执行 `source add`、完成 ingest，并按判断更新相关声明。即使内容从 A 变为 B 后
又回到 A，LWC 仍保留三次路径观察，只复用 A 原有的 source ID。检查外部路径时必须
再次传入 `--allow-external-source`；实时内容触发敏感信息检查时，还必须在人工检查后
传入 `--acknowledge-sensitive-source`。

旧版数据库迁移后，原有来源会明确显示为未跟踪；LWC 不会猜测历史路径。对目标文件
重新执行一次 `source add`，即可建立第一条路径版本记录。如果检查期间文件或路径头
版本发生变化，LWC 会返回 `source_status_unstable`；应重试，不要采信跨时点结果。

需要原子导入经过筛选的一组来源时，可使用相对 manifest 所在目录解析的 JSON：

```json
{
  "sources": [
    {"path": "ARCHITECTURE.md", "title": "Architecture contract"},
    {"path": "src/store.rs", "title": "SQLite store"}
  ]
}
```

```bash
lwc source add-manifest lwc-sources.json
```

### 3. 分析并整合一个来源

```bash
lwc ingest next --context-limit 50 --source-max-chars 100000
lwc ingest analyze 1 --file analysis.md
```

如果 manifest 或调度器已经选定明确的 pending source ID，使用
`lwc ingest claim 7` 精确领取。

如果返回的 `source_window.has_more` 为 true，就从
`source_window.next_offset_chars` 继续读取：

```bash
lwc source show 1 --offset-chars 100000 --max-chars 100000
```

完成 ingest 之前，既要创建带引用的 source-summary 页面，也要把这个来源的贡献
整合进至少一个非 source 页面：

```bash
lwc page put source-1 \
  --title "Source 1 Summary" \
  --kind source \
  --summary "What this source contributes" \
  --file source-summary.md \
  --source 1

lwc page put durable-concept \
  --title "Durable Concept" \
  --kind concept \
  --summary "How this source changes shared knowledge" \
  --file concept.md \
  --source 1

lwc ingest complete 1
```

两层都必需：source 页面负责导航和来源追溯，非 source 页面让知识真正持续积累。
如果某个来源确实不应改变任何共享页面，需要记录一条具体且可审计的说明：

```bash
lwc ingest complete 1 \
  --no-derived-pages-reason "Duplicate evidence; existing synthesis already covers every supported claim"
```

页面只要带 `--source` 引用，就会自动得到 `source-grounded`。如果长期知识来自
用户陈述、Agent 观察或明确的假设，不要伪造来源；按需重复传入 `--provenance`：

```bash
lwc page put architecture-decision \
  --title "Architecture decision" \
  --kind query \
  --summary "Accepted constraint and remaining uncertainty" \
  --file decision.md \
  --provenance user-provided \
  --provenance hypothesis
```

`page put` 会整体替换引用集合和显式 provenance 集合。更新前先读取旧页面，再重复
传入所有仍有效的 `--source`，以及非来源类的 `--provenance`。不要显式传
`source-grounded`，它由引用自动推导。页面读取、context、search、source refs 和
Markdown 投影都会返回 provenance，但 provenance 不参与搜索排序。

### 4. 查询已沉淀的 Wiki

```bash
lwc context --limit 50
lwc search "question keywords" --limit 20
lwc search "question keywords" --limit 20 --explain
lwc search "concept only" --type page --kind concept
lwc search "exact evidence" --type source
lwc page show source-1
```

## Agent 工作流

标准工作流如下：

1. 收集不可变来源。
2. 用有界的 `lwc ingest next` 领取任务；已经明确 source ID 时使用
   `ingest claim <ID>`。
3. 读完所有来源窗口，以及返回的 schema、purpose 和有界上下文。
4. 先分析，再生成页面。
5. 用显式 `--source` 引用写入或修订 source 摘要与共享知识页面。
6. 只有两道整合门禁都通过，或明确记录无需更新共享页面的原因后，才能 complete。
7. 多命令 ingest 或大范围修订放进一个 changeset；先验证草稿，再原子发布。
8. 用 `search`、`context`、`graph` 和 `lint` 持续维护 Wiki 的一致性。

完整操作约定见 [docs/agent-workflow.md](https://github.com/JanYork/llm-wiki-cli/blob/main/docs/agent-workflow.md)。
运行 `lwc --help` 或 `lwc <command> --help`，可以查看面向 Agent 编写的前置条件、状态变化、副作用和下一步动作。

## 原子化多命令变更

单个 `source` 或 `page` 命令本身已有事务保护。当一个逻辑更新需要多条命令、又不能
让使用者看到半成品 Wiki 时，使用 changeset：

```bash
lwc --scope project changeset begin architecture-refresh
lwc --scope project --changeset architecture-refresh source add-manifest sources.json
lwc --scope project --changeset architecture-refresh ingest claim 1
# 使用同一个 selector 完成分析、引用页面写入和 ingest complete。
lwc --scope project --changeset architecture-refresh lint
lwc --scope project --changeset architecture-refresh search "expected answer" --limit 5
lwc --scope project changeset show architecture-refresh
lwc --scope project changeset commit architecture-refresh
```

草稿读取能看到同一批已暂存变更，而 live SQLite 与 Markdown 保持不变。草稿从小型
稀疏 overlay 开始，不复制或 checkpoint 整个 live Wiki。`changeset show` 只报告
暂存操作、revision 和可提交状态，不运行 lint。commit 只校验和应用触达实体，因此无关
live 写入会保留；同一实体的 revision 冲突会失败，不覆盖任何一方。空草稿和 lint
问题都会阻止提交；没有强制提交或自动合并。只有经过
审计、且并非本批变更新增的既有债务，才能使用
`--allow-lint-issues --reason "reviewed pre-existing debt"`。提交后，还要用原先
固定的检索问题在 live 状态复验。commit 会在发布前冻结已审查的草稿；此后的暂存
写入会返回 `changeset_frozen`。此时只能重试同一次 commit 完成恢复，或在明确冲突
后 discard，不能再向冻结草稿追加工作。

```bash
lwc --scope project changeset discard architecture-refresh
lwc --scope project changeset rollback <CHANGESET_ID>
```

discard 只删除未提交草稿。commit 会为触达实体写入带校验和的 inverse patch，并返回
精确的回滚 ID；rollback 只恢复这些实体，某个实体后来再次变化时会拒绝覆盖。
project 与 global changeset 相互独立；`--scope all` 无效；`init`、`maintenance`、
`checkpoint` 和嵌套 changeset 命令都会拒绝 `--changeset`。草稿不会生成第二套
Markdown 投影。如果结构化错误返回 `committed=true`，但仍有 cleanup 或
materialization 工作，不要重复执行知识变更；应执行响应中给出的恢复动作。

稀疏 commit 当前为 Source 新增/ingest、Page put/remove、schema、purpose 和记录型
search 提供精确 patch。检索权重与显式语义关系暂未提供稀疏 inverse patch，会在创建
checkpoint、获取 live 写锁或修改 live Wiki 前返回 `changeset_sparse_unsupported`；
当前应将它们作为直接的单实体事务执行。

## 作用域

`lwc` 支持三种 scope：

| Scope | Store | 用途 |
| --- | --- | --- |
| `project` | 最近祖先目录中的 `.lwc/wiki.db` | 默认使用，保存项目级知识 |
| `global` | `~/.lwc/wiki.db` | 保存可跨项目复用的知识 |
| `all` | project 与 global | 仅用于合并 `search` 和 `context` |

示例：

```bash
lwc --scope global init
lwc --scope global source add shared.md
lwc --scope all search "shared term"
lwc --scope all context
```

知识写入始终是显式的。`all` 不会隐式创建跨 store 的引用或链接；`search --record`
只会向每个选中的 store 追加查询操作记录。

## 搜索与 CJK 文本

搜索是词法型（lexical）且确定性的。

- 搜索词是纯文本，不是原始 FTS 语法。
- 默认的 `--type auto` 会优先返回已编译的 Wiki 页面、隐藏与其配对的 raw
  source，并在页面不足时回退到 raw source。
- 用 `--type page`、`--type source` 或 `--type all` 选择检索层；可重复传入
  `--kind` 限定页面类型，例如 `--kind concept --kind synthesis`。
- 多字 CJK 查询使用相邻 bigram；索引还会保留非停用单字，使单字查询仍可检索。
- 拉丁文本会被切成小写的字母数字 token。
- 排名会区分标题、来源文件名、路径/slug、摘要和正文；标题与路径的精确或部分匹配
  使用有界加权。
- README、index、overview 和明确的导航枢纽会按查询降权，让具体功能文档优先；
  查询明确要求 README 或总览时不降权。
- 页面候选可以获得有界的直接链接或共享来源加权。只有共同邻居、没有直接证据的
  关系不会改变搜索顺序；宽泛导航枢纽会得到有界图惩罚。
- `--explain` 返回可精确复算的词法、通用文档、图、人工权重与查询反馈信号。
  它不会记录查询；只有显式 `--record` 才会写入搜索历史。
- 固定系数和“数值越低越相关”的 rank 让 `--scope all` 中的 project/global 结果
  保持可比。

这里刻意不依赖词典分词。目标是在产品名、代号、混合语言术语和新出现词汇上保持稳定行为，而不依赖外部分词词典。

### 显式检索权重与反馈

文档权重用于长期、与具体查询无关的页面/来源判断；反馈只作用于同一个有序 token
查询指纹：

```bash
lwc weight set page payment-rules \
  --value 2 \
  --reason "支付规则的权威规范" \
  --provenance agent-observed
lwc weight list page payment-rules

lwc weight feedback page payment-rules \
  --query "支付对账规则" \
  --signal relevant \
  --reason "已按预期答案核验" \
  --provenance agent-observed

lwc weight feedback-clear page payment-rules \
  --query "支付对账规则" \
  --provenance agent-observed
lwc weight clear page payment-rules --provenance agent-observed
```

文档权重只能取 `-2`、`-1`、`1`、`2`，归零使用 `clear`。两种机制都只重排已经
通过词法召回的候选，不会凭空召回不匹配文档。`user-provided` 优先于
`agent-observed`，但两行都会保留供审计。反馈只保存 SHA-256 指纹，不保存原始
查询，也不会泛化到 token 不同的改写。原因和操作记录会持久化，因此不要把敏感
查询复制到 `--reason`。变更必须明确使用 `project` 或 `global`；`--scope all`
会被拒绝。

## 只读预览与 CodeGraph

`lwc view` 会以前台方式在本机回环地址启动项目预览并打开浏览器。Web
应用使用 TS + Lit 构建并嵌入二进制，运行时不依赖 CDN 或 Node；服务只
接受 GET/HEAD。页面、来源、Markdown、知识图以及可选代码图均从当前项目
只读加载，不会触发迁移、刷新或建图：

```bash
lwc view
lwc view --port 4173 --no-open
```

预览默认使用英文。通过页面内的 `中文` / `EN` 控件切换语言；浏览器会记住选择，
但不会自动翻译 Wiki 正文。知识图和代码图统一使用受 Obsidian 启发的 3D 关系视图，
采用小节点、常驻标签、细连线，并支持旋转与缩放。

<p align="center">
  <img src="https://raw.githubusercontent.com/JanYork/llm-wiki-cli/main/docs/images/lwc-codegraph-zh.png" alt="LWC 代码图" width="100%">
</p>

代码索引只支持项目级，默认不启用。首次显式执行 `lwc cg init` 时，LWC
会从 GitHub Release 下载锁定版本的 CodeGraph 分支包并校验 SHA-256。运行时只
下载一次，缓存到 `~/.lwc/runtime/codegraph/<PIN>/<TARGET>/`；每个项目只保留自己
的 `.lwc/codegraph` 索引。遥测始终关闭，也不创建 `.codegraph` 状态。

```bash
lwc cg status
lwc cg init                 # 仅下载一次，随后逐个完整文件建立索引
lwc cg sync
lwc cg query UserService
lwc cg node UserService
lwc cg callers UserService
lwc cg callees UserService
lwc cg impact UserService
lwc cg files
```

CodeGraph 的查询能力均可通过 `lwc cg` 使用。全局生命周期命令
（`install`、`uninstall`、`upgrade`、`telemetry`、`daemon`、`daemons`）会被
拒绝。精确命令 `lwc cg serve --mcp` 仅保留为旧版手工桥接兼容；新的 Agent 集成统一
使用 `lwc serve --mcp`，在一个只读工具后融合有界 Wiki 与 CodeGraph 探索。运行时仍由
LWC 管理并保持项目边界。首次、增量、全量、更新、
删除、引用解析和恢复写入都以所属文件为事务：一篇文件完全可用后才处理下一
篇；当前图保持可读，历史文档版本永不刷新。

## 维护与投影

常用维护命令：

```bash
lwc lint
lwc maintenance reindex
lwc maintenance materialize
lwc maintenance compact
lwc work list
lwc work status <WORK_ID>
lwc work watch <WORK_ID>
lwc work cancel <WORK_ID>
lwc work resume <WORK_ID>
lwc checkpoint create before-large-update
lwc checkpoint list
lwc log --limit 20
```

说明：

- 维护命令会立即返回持久化 `work`。使用 `work status` 查看进度，或使用
  `work watch` 等待完成并读取 `work.result`。v10 到 v11 的 schema 迁移也会
  自动进入同一机制，普通命令不会再在前台执行迁移。
- `lint` 默认完全只读；只有这次检查确实需要进入持久操作历史时才加 `--record`。
- `maintenance reindex` 从 SQLite 重建派生搜索产物。
- `maintenance materialize` 从 SQLite 重建投影出来的 Markdown 树。
- `maintenance compact` 只尝试执行 WAL truncate checkpoint，不再暗中执行全量 FTS
  优化。应在 Wiki 空闲时运行，并检查返回的 `busy` 与 `after_bytes`；存在活动 reader
  时会快速返回，不修改 canonical 内容。
- 搜索查询默认是私有的；只有需要把查询文本写入持久化操作日志时，才加 `--record`。

`lwc checkpoint create <NAME>` 使用 SQLite 在线备份 API。执行
`lwc checkpoint restore <NAME>` 时，LWC 会先创建 `pre-restore-*` 安全
checkpoint，再恢复数据库并重建投影。受保护删除使用 `source remove <ID>` 和
`page remove <SLUG>`：仍被页面引用的来源、仍有入链的页面都会被拒绝删除。删除某
路径的当前来源时，该路径会明确停止跟踪，不会把旧版本悄悄恢复成“当前版本”。

多来源 ingest 或大范围页面替换应优先使用 changeset，而不是手动 checkpoint：
commit 使用稀疏 inverse patch，在短事务中只发布触达的 canonical 实体，并增量更新
live Markdown；不会自动复制整库。发布后会尝试 WAL truncate；
`wal_checkpointed=false` 表示活动 reader 阻止了立即截断，不表示 canonical commit
失败。

需要文件系统级外部备份时，应先停止正在运行的 `lwc` 命令并复制完整 `.lwc/`
目录；写入进程可能仍在使用 WAL 文件时，不要只复制 `wiki.db`。

## 基准测试集

可选基准会把本地 UTF-8 语料导入临时 Wiki，并报告导入耗时、搜索 P50/P95、
Recall@5/10、MRR，以及 compact 前后的存储占用。Ground truth 使用 JSONL
描述查询与期望命中的语料相对路径：

```bash
cargo build --release
LWC_BENCH_CORPUS=/path/to/sanitized-corpus \
LWC_BENCH_QUERY_SET=/path/to/query-set.jsonl \
LWC_BENCH_BINARY="$PWD/target/release/lwc" \
cargo test --test search_benchmark -- --ignored --nocapture
```

常规 `cargo test --all-targets` 覆盖 page-first 搜索、type/kind 过滤、UTF-8
来源窗口、ingest 完成门禁、图关系精度、迁移、lint 与 WAL compact。工作负载约定
和公平前后对比规则见 [benchmarks/README.md](https://github.com/JanYork/llm-wiki-cli/blob/main/benchmarks/README.md)。

## 限制与非目标

当前设计约束：

- 单机、单用户知识库；
- UTF-8 文本工作流；
- 每个 schema、purpose、source 或 page body 的输入上限为 64 MiB；
- 提供词法搜索，不提供语义向量检索。

这个 CLI 当前明确不做：

- 不内置 LLM 调用；
- 不接入向量数据库；
- 不提供守护进程或后台服务；
- 不提供 Web UI 或桌面 UI；
- 不提供直接编辑数据库的工作模式。

如果投影出来的 Markdown 漂移了，就重建它；如果 SQLite schema 有问题，就通过 CLI 和 migration 修复，而不是手改。

## 参与贡献

欢迎提交 issue 和 pull request，尤其是围绕以下方向：

- Agent 工作流的人机工程；
- 确定性的投影行为；
- 持久化引用与页面维护约定；
- 面向多语言技术语料的搜索质量。

提交 Pull Request 前请阅读 [CONTRIBUTING.md](https://github.com/JanYork/llm-wiki-cli/blob/main/CONTRIBUTING.md)。安全问题请按照 [SECURITY.md](https://github.com/JanYork/llm-wiki-cli/blob/main/SECURITY.md) 报告。

## 许可证

本项目使用 [Apache License 2.0](LICENSE)。
