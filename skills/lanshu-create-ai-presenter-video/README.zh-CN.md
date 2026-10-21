# lanshu-create-ai-presenter-video

[English](README.md) | **简体中文**

[![Agent Skills](https://img.shields.io/badge/Agent_Skills-SKILL.md-111827)](https://agentskills.io)
![Harness Neutral](https://img.shields.io/badge/Harness-Neutral-8B5CF6)
![Provider Neutral](https://img.shields.io/badge/Provider-Neutral-0EA5E9)
![Routes: Presenter | Styled](https://img.shields.io/badge/Routes-Presenter_%7C_Styled-0EA5E9)
[![讲解风格 12 种](https://img.shields.io/badge/%E8%AE%B2%E8%A7%A3%E9%A3%8E%E6%A0%BC-12%20%E7%A7%8D-E8590C)](explainer/STYLES.md)
[![Rendered with HyperFrames](https://img.shields.io/badge/Rendered_with-HyperFrames-2563EB)](https://hyperframes.heygen.com)
<br>
[![Validate Skill](https://github.com/cclank/lanshu-create-ai-presenter-video/actions/workflows/validate.yml/badge.svg)](https://github.com/cclank/lanshu-create-ai-presenter-video/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-F4C430.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/cclank/lanshu-create-ai-presenter-video)](https://github.com/cclank/lanshu-create-ai-presenter-video/releases/latest)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FFmpeg Required](https://img.shields.io/badge/FFmpeg-Required-007808?logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![Node.js for the styled route](https://img.shields.io/badge/Node.js-styled_route-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/cclank/lanshu-create-ai-presenter-video?style=flat)](https://github.com/cclank/lanshu-create-ai-presenter-video/stargazers)
<br>
[![X @LufzzLiz](https://img.shields.io/badge/X-@LufzzLiz-000000?logo=x&logoColor=white)](https://x.com/LufzzLiz)
[![作者 岚叔](https://img.shields.io/badge/%E4%BD%9C%E8%80%85-%E5%B2%9A%E5%8F%94-C2410C)](https://x.com/LufzzLiz)

> 一个主题或一份文案，交给你正在用的 AI agent，产出一条经过验收、可直接发布的讲解视频：可以由数字人出镜讲解（需要一张授权人物图），也可以用十二种讲解风格之一把内容“演”出来。

`lanshu-create-ai-presenter-video` 是一个 [Agent Skill](https://agentskills.io)（岚叔 · 通用数字人与讲解视频制作），带领 AI agent 走完讲解视频的全流程。**数字人路线**包括文案、配音、人物生成、口型同步、字幕与关键词动效、剪辑、渲染和质量验收；**风格化路线**从逐字对时的讲稿出发，用十二种风格之一（九种画风、三种讲法）把每句讲解演成画面，一直到渲染成片。每个阶段都以磁盘上的产物为准入证据，成片在通过完整解码和响度检查之前不会交付。

## 核心特性

- **不绑定 harness**：标准 `SKILL.md`，可在 Claude Code、Codex、Gemini CLI、Cursor、OpenCode、GitHub Copilot 等支持 Agent Skills 的工具中直接加载；任何能读文件、执行 shell 命令的 agent 也能照着执行。
- **不绑定服务商**：数字人路线的配音、数字人视频、口型同步和语音识别都按能力在运行时选型，每个任务记录实际使用的服务商、模型、参数和任务 ID。风格化路线用 MiniMax 配音（逐字时间直接取自配音引擎），也可以用你在别处配好或自己录的配音。
- **十二种可演绎的讲解风格**：九种画风（设计师留白、科技感信号、手帐、纸艺立体书、波普漫画、3D 一镜到底、图纸与注脚、黑板报、黏土小城）加三种讲法（推演、案卷、小剧场）。每种都是可复用的风格包和起步模板，换一个题目几条命令就能完整播放，讲稿也按所选风格来写。
- **配音锁定时间轴**：审定后的完整配音是人物动作、字幕、剪辑点和成片时长的统一时钟，保证口型与段落边界对齐。
- **证据驱动的阶段**：从 `intake` 到 `verified` 共八个阶段，状态由产物计算得出，而不是手工声明。
- **成本护栏**：先做低成本试片；首次付费调用前明确报价；设置重试上限；任务中断时凭任务 ID 恢复，避免重复扣费。
- **交付前验证**：母版与分享版先完成完整解码和响度检查，全部通过才发布。

## 两条路线

| 路线 | 成片 | 你提供 | 付费生成 | 画幅 |
|---|---|---|---|---|
| **数字人讲解** | 数字人出镜讲解，字幕和关键词动效辅助 | 主题或文案 + 授权人物图 | 配音 + 数字人视频 | 任意，默认 9:16 竖屏 |
| **风格化讲解** | 不用数字人：每一句讲解都用画面“演”出来，十二种风格可选（九种画风 + 三种讲法） | 主题或文案（也可以用你自己录好的配音） | 只有配音（自带配音则不花钱） | 16:9 横屏 |

agent 会根据你的需求判断路线；拿不准时会带着风格图只问一次。所有风格共用一套接口（逐字字幕、章节条、结尾金句、一帧复习图）。其中九种是画风，区别在于用什么画面把内容演出来：设计师留白、科技感信号、手帐、纸艺立体书、波普漫画、3D 一镜到底、图纸与注脚、黑板报、黏土小城。下图是仓库自带的 KV cache 讲解片在九种画风里的同一时刻：

![KV cache 讲解片在九种风格里的同一时刻](explainer/gallery/nine-styles-kv-cache.jpg)

另外三种是讲法，画面自带一种讲述方式，写稿时可以参考并调整它的叙事结构：**推演**（在一张画布上把图形和公式一步步推出来，颜色把符号和图形绑在一起）、**案卷**（在调查板上从一起异常查到结案）、**小剧场**（生活场景小剧场：角色遇到误区，用账单、队列或实物对照找到原因，一句话把比喻对上真名）。下图是同一个 KV cache 难题用三种讲法讲：

![同一个 KV cache 难题的三种讲法](explainer/gallery/three-narrative-styles-kv-cache.jpg)

换一个新题目，几条命令就能在任一风格里得到一版能完整播放的初稿：配音、逐字时间、字幕、章节、结尾金句、复习页和音效都自动生成，agent 再把每句话的画面演绎出来。选风格看 [`explainer/STYLES.md`](explainer/STYLES.md)，完整流程看 [`references/styled-explainer.md`](references/styled-explainer.md)，里面也写了想把自己的数字人融进风格片时的做法（可选）。

## 需要提供什么

| 输入 | 必需 | 说明 |
|---|---|---|
| 主题或完整文案 | 是 | 主题会写成 45–75 秒的文案；自带文案保持自然时长。 |
| 人物图 | 数字人路线需要 | 包含一位清晰的成年人物，并已确认使用权。风格化讲解不需要。 |
| 声音样本 | 否 | 仅在明确授权克隆时使用，否则选用库存声音并记录。 |
| 辅助素材 | 否 | 屏幕录制、图片、B-roll 或品牌素材，只用在能证明或说明口播内容的地方。 |
| 交付偏好 | 否 | 目标平台、时长、画幅、风格、水印、音乐和结尾引导。 |

## 工作方式

数字人路线：

```text
主题或文案 + 授权人物图
        │
        ▼
锁定文案与完整配音 ──► 配音成为全片时钟
        │
        ▼
低成本人物试片
        │
        ▼
生成数字人素材（服务商有时长上限时，按真实停顿分段）
        │
        ▼
按音频时间轴剪辑：字幕、关键词动效、封面、结尾
        │
        ▼
技术验收与画面验收
        │
        ▼
母版、分享版、九宫格与交付报告
```

风格化路线：

```text
主题或文案 ──► 选风格（风格菜单 + 效果图，或九种画风都出草稿再挑）
        │
        ▼
按风格写讲稿 ──► 配音并取得逐字时间（或用你自己的配音）
        │
        ▼
用风格起步模板出初稿：字幕、章节、结尾金句、复习页、音效
        │
        ▼
分镜 ──► 每一句都按字演成画面
        │
        ▼
验收（检查、静止检测、封面）──► 渲染 ──► 母版、分享版、字幕、交付报告
```

任务必须具备相应证据才能进入下一阶段，由 `check_state.py` 根据产物计算：

| 阶段 | 所需证据 |
|---|---|
| `intake` | 任务已创建 |
| `content_locked` | 通过的预检报告、文案、节拍表 |
| `audio_locked` | 可解码的最终配音、ASR 报告 |
| `visual_plan_locked` | 时间轴、分镜、已审批的计划 |
| `presenter_generated` | 已记录的数字人能力、选定视频、画面审核 |
| `composition_checked` | 合成检查报告 |
| `rendered` | 同时含音视频、可解码的渲染文件 |
| `verified` | 母版、分享版，以及输出响度达标的交付报告 |

风格化路线的 `audio_locked` 还要求已配音的 `story.json`（`--dry` 草稿不算）；`presenter_generated` 由完成演绎的成片及其画面审核达成，而不是数字人视频。

## 运行环境

- 支持 Agent Skills 的 harness，或任何能读文件、执行 shell 命令的 coding agent。
- Python 3.9+、FFmpeg 与 `ffprobe`、Bash、`jq`、`awk`、`sed`。
- 数字人路线：至少一种可调用的配音、数字人视频生成与口型同步能力，云服务 CLI、API 或本地模型均可；可选 HyperFrames 等确定性时间轴合成器，用于字幕、动效和成片渲染。
- 风格化讲解另需：Node.js（HyperFrames 通过 `npx` 运行）、`rsync`、装有 `numpy` 的 Python（生成音效，用 `PYTHON` 指定），以及 MiniMax API Key（`MINIMAX_API_KEY`，用于配音和逐字时间戳），或者你自己录好的配音。

## 安装

仓库目录本身就是 Skill。把它克隆到所用 harness 的 skills 目录，目录名保持 `lanshu-create-ai-presenter-video`（Agent Skills 规范要求与 Skill 的 `name` 一致）。

| Harness | Skills 目录 | 显式调用 |
|---|---|---|
| Claude Code | `~/.claude/skills/`，或项目内 `.claude/skills/` | `/lanshu-create-ai-presenter-video` |
| Codex | `~/.codex/skills/` | `$lanshu-create-ai-presenter-video` |
| 其他支持 Agent Skills 的工具 | 见该工具文档，[客户端列表](https://agentskills.io/clients)附有各家说明链接 | 按该工具的方式 |

以 Claude Code 为例：

```bash
git clone https://github.com/cclank/lanshu-create-ai-presenter-video.git \
  ~/.claude/skills/lanshu-create-ai-presenter-video
```

在安装目录执行 `git pull` 即可更新。同时使用多个 harness 时，每个 skills 目录各克隆一份。

版本标签和可直接解压到 skills 目录的安装 ZIP 见 [Releases](https://github.com/cclank/lanshu-create-ai-presenter-video/releases)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。

**不支持 Agent Skills 的 agent**：把仓库克隆到任意位置，在对话开头告诉它：

```text
先阅读 /path/to/lanshu-create-ai-presenter-video/SKILL.md，并严格按其中的流程工作。
```

## 快速开始

多数 harness 会根据 Skill 的描述自动选中它，直接描述想要的视频即可：

```text
把这份文案和人物图做成一条 16:9、30 秒、有实时字幕的数字人讲解视频。
```

做风格化讲解时不用先知道有哪些风格，直接问就行，agent 会带着效果图列出十二种风格，并推荐适合你题目的几种：

```text
不要真人，做一个 40 秒讲 RAG 的讲解视频，有哪些风格可以选？
```

想确保命中时，使用上表中的显式调用方式。Skill 会沿用你提问所用的语言。

Agent 会自行调用内置脚本。如需手动建立任务，把 `SKILL_DIR` 指向安装目录：

```bash
SKILL_DIR=~/.claude/skills/lanshu-create-ai-presenter-video

python3 "$SKILL_DIR/scripts/init_job.py" \
  --job-dir ~/Videos/my-presenter-video \
  --presenter-image ~/Pictures/presenter.png \
  --topic "用一分钟讲清楚上下文工程" \
  --duration 60 \
  --aspect 9:16 \
  --rights-confirmed \
  --adult-presenter-confirmed
```

在 `job.json` 中补全人工检查与远程上传许可，然后运行预检：

```bash
python3 "$SKILL_DIR/scripts/preflight.py" ~/Videos/my-presenter-video/job.json
```

每完成一个阶段，在 `job.json` 中登记产物，由检查器计算任务状态：

```bash
python3 "$SKILL_DIR/scripts/check_state.py" ~/Videos/my-presenter-video/job.json --write
```

手动做一条风格化讲解（在任务目录里运行，`X=$SKILL_DIR/explainer`）：

```bash
python3 "$SKILL_DIR/scripts/init_job.py" --job-dir . --route styled --explainer-style v8-chalkboard --topic "40 秒讲清楚 RAG"
python3 "$X/tools/story.py" story              # story/script.md → 配音与逐字时间 → story/story.json
bash "$X/tools/new_film.sh" v8-chalkboard story film   # 能完整播放的初稿；在 film/beats.js 里逐句演绎
python3 "$X/tools/qa.py" film qa/film          # 检查、静止检测、截图、封面
bash "$X/tools/render.sh" film rag outputs     # 母版、分享版、字幕
```

## 脚本

| 脚本 | 用途 |
|---|---|
| `init_job.py` | 创建自包含的任务目录，把全部输入复制进来，并只记录任务内相对路径。 |
| `preflight.py` | 校验素材、人工检查与授权，区分本地错误和远程生成前的阻塞项。 |
| `plan_segments.py` | 服务商限制单次请求或参考音频时长时，按锁定配音的 ASR 真实停顿规划分段。 |
| `check_state.py` | 根据证据计算任务所处阶段；声明的状态超出证据时返回非零。 |
| `finalize_delivery.sh` | 生成母版与分享版，验证完整解码、交付响度、黑帧与冻帧，全部通过后连同九宫格和报告一起发布。 |

## 讲解工具

位于 `explainer/tools/`，用于风格化路线：

| 工具 | 用途 |
|---|---|
| `story.py` | `script.md` → MiniMax 逐句配音并取得引擎返回的逐字时间 → `story.json`；`--audio` 使用你自己的配音，`--dry` 生成无声草稿，`--check` 查看结构与预计时长。 |
| `new_film.sh` / `new_topic.sh` | 用风格起步模板生成能完整播放的片子（或一次生成九种画风的草稿）。 |
| `docs.py` | 从讲稿生成文案、节拍表、时间轴和分镜表。 |
| `qa.py` | 运行 `hyperframes check`，截取每章画面，做静止检测，导出封面图和合成报告。 |
| `render.sh` | 渲染，调用 `finalize_delivery.sh` 交付，生成 SRT 字幕；`DRAFT=1` 输出可发到手机上看的 720p 审片版。 |
| `srt.py`、`still_grid.py`、`fonts.py`、`sync.sh`、`stamp.py` | 字幕、风格对比图、字体子集，以及工程同步。 |

## 参考文档

Agent 只在进入对应阶段时加载相应文档，减少上下文占用。

| 文档 | 内容 |
|---|---|
| [`generation.md`](references/generation.md) | 输入检查、文案与配音、能力选型、付费闸门、分段规划、人物提示词 |
| [`editing.md`](references/editing.md) | 时间轴约定、分段接缝、开场与结尾、字幕、关键词动效、预览与导出 |
| [`qa-recovery.md`](references/qa-recovery.md) | 验收标准，以及口型、人物一致性、接缝、响度和远程任务的故障修复 |
| [`styled-explainer.md`](references/styled-explainer.md) | 风格化讲解路线：讲稿流水线、风格起步模板、画面演绎，以及融入数字人的可选做法 |
| [`explainer/STYLES.md`](explainer/STYLES.md) | 风格菜单与效果图、常见说法对应的风格、按风格写稿要点 |
| [`explainer/KITS.md`](explainer/KITS.md) | 风格包接口、美学基线、起步模板与工具 |
| [`explainer/GOTCHAS.md`](explainer/GOTCHAS.md) | 制作风格过程中踩过的 HyperFrames 坑 |

## 目录结构

```text
lanshu-create-ai-presenter-video/
├── SKILL.md                 # Skill 入口：元数据与工作流
├── README.md
├── README.zh-CN.md
├── agents/
│   └── openai.yaml          # Codex 界面显示信息，其他 harness 会忽略
├── assets/
│   └── job.template.json    # 任务清单模板
├── references/              # 按阶段加载的参考文档
├── scripts/                 # 任务初始化、闸门、分段规划与交付
├── explainer/               # 风格化讲解引擎：核心运行时、十二种风格包与起步模板、工具、示例
│   ├── STYLES.md            # 风格选择指南（含效果图）
│   ├── KITS.md              # 风格包接口与工具
│   ├── kits/<style>/        # 每种风格的视觉，starter/ 是去掉题目的起步模板
│   ├── stories/             # 示例讲稿（KV cache）与草稿测试稿
│   ├── examples/kv-cache/   # 每种风格的 KV cache 成片工程
│   └── tools/               # story.py、new_film.sh、qa.py、render.sh、srt.py 等
└── tests/
    ├── smoke.sh             # 基于合成素材的端到端测试
    └── explainer_smoke.sh   # 风格化路线：建任务、讲稿、模板同步、状态
```

## 默认设置

| 设置 | 默认值 |
|---|---|
| 画幅 | 9:16、1080×1920、30 fps（风格化路线：16:9、1920×1080、30 fps） |
| 时长 | 主题生成 45–75 秒；自带文案保持自然时长 |
| 声音 | 无授权样本时使用库存声音；风格化路线默认 MiniMax `Chinese (Mandarin)_Reliable_Executive`，语速按风格设定 |
| 结构 | 开场钩子、2–4 个内容节拍、简洁结尾 |
| 音乐与结尾引导 | 默认不加，按需添加 |
| 响度 | −16 LUFS ±0.5 LU，真峰值 ≤ −1 dBTP；可用 `PROGRAM_LUFS` 覆盖 |

## 安全与成本控制

- 任何上传前，先确认图片使用权和人物已成年。
- 克隆声音需要明确授权，绝不根据图片推断声音。
- 首次付费调用前，agent 会说明上传内容、请求时长、已知价格、试片规模和重试上限。
- 服务商有时长上限时，按分段计划的总请求秒数报价。
- 远程任务中断后，先用已保存的任务 ID 查询，再考虑重新提交。
- 连续三个付费候选被否决后停止，并总结反复出现的问题和剩余选项。
- 风格化路线唯一的付费调用是配音：每句一次并缓存，改一句只重配那一句；九种画风的草稿不会产生额外费用。

## 隐私

- 仓库不包含 API 密钥、访问令牌、签名下载地址或用户素材。
- 服务商请求记录去除凭据与临时 URL 后再保存。
- 预检与交付报告只记录文件名或任务内相对路径，不写入本机绝对路径。
- 风格化路线会从 Google Fonts 和 jsDelivr 下载字体子集（只含用到的字）；逐字时间直接取自配音服务返回的时间戳，不需要安装任何语音识别模型；截帧检查一律带 `--describe false`，画面不外传。

## 测试

冒烟测试用合成素材把一个任务从 `intake` 推进到 `verified`，不调用任何远程服务。需要 FFmpeg、`jq` 与 Python 3.9+：

```bash
bash tests/smoke.sh
bash tests/explainer_smoke.sh   # 风格化路线；还需要 Node.js 和 rsync
```

每次推送和 Pull Request 都会在 CI 中运行元数据校验、可移植性检查、讲解引擎的语法检查和两组冒烟测试。

## 参与贡献

欢迎提交 Issue 和 Pull Request。特别欢迎反馈在不同 harness、不同服务商下的使用情况，以及对工作流、兼容性和质量检查的改进。想新增讲解风格，请参照 [`explainer/KITS.md`](explainer/KITS.md) 的风格包接口和 [`explainer/STARTER-BRIEF.md`](explainer/STARTER-BRIEF.md) 的起步模板说明。

## 作者

由 **岚叔** 创建并维护。欢迎在 X 上关注，获取更新与更多 AI 视频工作流：

[![在 X 上关注](https://img.shields.io/badge/%E5%9C%A8_X_%E4%B8%8A%E5%85%B3%E6%B3%A8-@LufzzLiz-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/LufzzLiz)

## 许可证

基于 [MIT License](LICENSE) 发布。讲解引擎用到的字体、库和服务见 [`explainer/THIRD_PARTY.md`](explainer/THIRD_PARTY.md)。
