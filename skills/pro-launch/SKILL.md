---
name: pro-launch
description: "Build an app or product from 0 to 1, taste-first, with phase gates: references, naming, style frames, UI loop, launch video, GTM and shipping. Use for 做产品, 起名, 找参考, UI 太丑, launch plans."
category: business
risk: safe
source: self
source_repo: jack-reson8/pro-launch
source_type: self
date_added: "2026-10-24"
author: jack-reson8
tags: [product, launch, naming, ui, gtm]
tools: [claude, codex, cursor]
license: "MIT"
license_source: "https://github.com/jack-reson8/pro-launch/blob/main/LICENSE"
---

# pro-launch · 产品全生命周期（审美优先）

来源：一个 iOS 图像创作 App 做了 16 版、另一个品牌从 0 起名到社媒矩阵的真实过程。**结论：失败几乎都不是技术问题，而是（1）没看真参考就动手，（2）自己给自己打高分，（3）旧上下文越改越差。** 所以本 skill 只做三件事：逼你先产出文件、卡住门槛、不让你重犯旧错。

## When to Use This Skill

- you are building an app or product from zero to one and want references, naming, style frames, UI iteration, launch and shipping handled in phases
- the user asks to name a product, hunt references, plan a launch video or GTM, or says the UI looks generic

## 他最在意的 8 件事（全文：`references/user-repeated-demands.md`，带 ★ 的会被 phase_gate 检查）
1. **先学参考**：GitHub 开源、获奖作品、App Store、React Bits，先拆机制再动手 → D1
2. **沉淀**：纠正和新坑当场写进 CLAUDE.md / 记忆 / skill，永远有效 → D2
3. **强风格化、不规整、indie**：规整圆角矩形就是失败 → D3
4. **GTM、增长、aha**：从第一天按能卖来做，先验证有人付钱 → D4
5. **审美与手感不达标就打回**：丑、土、web 感；要丝滑转场、一气呵成 → D5 D7
6. **高效省 token**：一键执行，走不通回头，不反复验证，调研交子代理 → D6
7. **要深度**：交完整报告而不是问答，做完直接打开给他看 → D8 D18
8. **自己做别问我，用好现有工具**：只问口味/花钱/发布/账号；先查连接器与 MCP → D9 D10

## 开工三步（每次，不问用户小事）
0. 读 `references/user-repeated-demands.md`（一页，19 条），并把项目文件夹与记忆里已有的材料先翻一遍，再决定缺什么。
1. `python3 scripts/phase_gate.py <项目目录> all` 看现在在哪个阶段、前一阶段产物是否是真的。
2. 读 `references/mistakes.md`（错误账本，每条有"检查动作"）；在当前阶段结束前逐条过一遍相关项。
3. 项目根没有 `CLAUDE.md` 就建一个：产品一句话、审美红线（要/不要）、目录、"旧会话为什么变差"。红线只写这里，所有会话共用。

## 阶段流程：必须产物 → 通过门槛

| # | 阶段 | 必须产物（写进项目 docs/） | 门槛（不满足不进下一阶段） | 细则 |
|---|---|---|---|---|
| 1 | 想法与定位 | `positioning.md`：品类一句话、用户、3 个相邻品类对比表、为什么现在、最大风险，每个数字标【实查】/【判】 | 能用一句话讲清"和谁不同"；至少一个数字来自实查；报告要有深度、有证据（D8 D12） | 01 |
| 2 | 起名与品牌 | `naming.md` + `trademark.md`（商标，见 `references/13-trademark-ip.md`）：评分表（含义/多语读音/独特性/域名/气质/风险）+ 淘汰理由 + 域名与同名 App 检索结果 | 用 `scripts/domain_check.py` 跑过 ≥8 个候选；前 3 名给用户 2–4 个选项，**付款与注册由用户本人**；报告要完整（D8） | 02 |
| 3 | 找参考 | `refs/style-refs/INDEX.md`（每张图一张"反推提示词卡"）+ `competitors.md`（只当功能清单） | **顺序铁律：GitHub 开源与高质量库 → App Store 获奖/宣传图 → 游戏 UI/海报/艺术作品 → 灵感平台。** ★≥8 个来源，≥4 个不是 App，≥2 个开源/获奖，每张卡有反推提示词（D1） | 03 |
| 4 | 风格圣经 | `style-bible.md`：规则（可检查的"要/不要"）+ 色字体 token + 3 个反例 | ★≥3 张反推提示词卡；规则可被截图验证，含"反例"；项目 CLAUDE.md 有"审美红线"（D2 D3） | 04 |
| 5 | 功能策划 | `feature-map.md`：入口层级图、功能优先级表（乘法增量/成本）、"砍掉"清单 | ★写明 aha 及 ≤3 步到达（D4）；每个功能写乘法增量；有"砍掉"清单（D15） | 05 |
| 6 | UI/UX 构建循环 | `ui-log.md`：每版一节（参考→机制→SwiftUI 能力→截图→"哪里不如它"） | **先出 2–3 个风格预览给用户选，再写真代码**；★"哪里不如它"表 ≥3 行、无 N/10；每屏 ≥2 项平台能力；第 3 版仍不满意 → 停下写方案（D5 D7 D16 D17） | 06 |
| 7 | 素材生成 | `asset-list.md`：每个素材谁生成、提示词、出处/授权、处理方式 | 素材不用代码画；★每项有来源/授权；去底/矢量化走 `scripts/cutout_vector.sh`；不重复同一张（D11 D19） | 07 |
| 8 | 真机与 QA | `qa-walkthrough.md`：新用户走查（每屏截图+问题）、权限被拒/离线/空状态、性能数 | 真机或标明"仅模拟器"；失败不能显示成功（D12）；卡死先量原因再动手（D6） | 08 |
| 9 | 发布视频 | `video-brief.md`：音乐机制、主角、镜头表 | **音频先行**，★写明转场方式（D7）；成片前先抽帧联系表；委托 `pro-motion` | 09 |
| 10 | GTM 与社媒 | `gtm.md`（渠道/顺序/内容支柱）+ **`manual-tasks.md`（只有用户本人能做的事，一次列全）** | 账号注册/付款/验证码/发帖/DM 一律用户本人；发布前把内容摆给用户确认一次；文案走 `renhua`，配图走 `post`（D14） | 10 |
| 11 | 增长与数据 | `metrics.md`：事件表、漏斗每环健康线、一周一个假设 | ★写明 aha 指标（D4）；一周只验一个假设；未达线不加流量、不开新市场 | 11 |
| 12 | 开源与上架 | `ship-checklist.md` + `lessons.md` | 隐私政策/条款真实链接、订阅页合规、许可证、素材授权、无密钥入库；★`docs/lessons.md` 记下本项目新坑与落盘位置（D2） | 12 |

细则（到该阶段**才读**那一页，读完必须产出上表那个文件）：
`references/01-idea-positioning.md` · `02-naming-brand.md` · `03-find-references.md` · `04-style-bible.md` · `05-feature-planning.md` · `06-ui-build-loop.md` · `07-asset-generation.md` · `08-device-qa.md` · `09-launch-video.md` · `10-gtm-social.md` · `11-growth-data.md` · `12-ship-opensource.md`（均在 `references/`），错误账本 `references/mistakes.md`。

## 不问小事（硬规则）
只问四类：**口味、花钱、对外发布、账号登录付款**。其余一律自己查、自己定、做完告诉他（放哪、下载不下载、先做哪个、要不要初始化 git）。缺材料先翻项目文件夹、`docs/`、记忆、`~/.claude/ai-history/`，找不到再自己调研。需要他本人做的事进 `docs/manual-tasks.md` 一次列全。

## 铁律（违反就会被用户打回）
1. **参考先于代码。** 没有 INDEX.md 里的具体参考作品，不写任何 UI 代码。
2. **示例只是种子。** 用户给的例子要扩成整个品类研究，找他没说的，再收拢成 2–4 个互相咬合的机制。
3. **自评不可信。** 验收 = 截图与具体参考并排 + 写"哪里不如它"。分数只能当参考，不能当结论。
4. **口味问题必须带可见预览**（图/HTML/截图），给 2–4 个选项加推荐；没有预览先做预览。
5. **一个会话一个里程碑。** 约 300 回合或开始变卡，把红线/结论/未完成项写进 CLAUDE.md，新开会话；别在旧上下文里继续堆。
6. **第 3 版不满意就停。** 写诊断和新方案，不在旧方案上堆补丁。
7. **美术不靠代码画。** 用真实资产或生成资产；代码只做排版与效果。
8. **失败不能伪装成功。** 权限被拒、离线、没识别出人像，都要如实提示并给补救按钮。
9. **复用优先。** 动手前查已有资产清单，能改就不重写；新增可复用物当天登记。
10. **清单一次给全。** 开工前把"需要用户本人做的事"（登录、付款、发布、授权）列成一张表，之后不逐个打断。

## 脚本（`scripts/`，都能直接跑）
- `phase_gate.py` 阶段门槛检查（产物存在且非空模板）。
- `appstore_refs.py` 批量下载 App Store 宣传图（免费、免注册；用 `/usr/bin/python3`）。
- `ref_archive.py` 参考图归档并生成"反推提示词卡"；`commons` 子命令找出多张图的共同词。
- `domain_check.py` 域名（RDAP）+ 各区 App Store 同名检索。
- `cutout_vector.sh` 生成图 → Vision 抠图（缩边）→ vtracer 矢量化 → svgo；`--mono` 走 potrace。依赖同目录的 `scripts/cut.swift`、`scripts/vectorize.js`。

## Runtime prerequisite

Pinned upstream reference: [jack-reson8/pro-launch at 3422b3f89fffb1b6917610f1dc5a3c6e576d8705](https://github.com/jack-reson8/pro-launch/tree/3422b3f89fffb1b6917610f1dc5a3c6e576d8705).

This catalog entry bundles documentation, templates, and `LICENSE` only; the `scripts/` helpers (`phase_gate.py`, `appstore_refs.py`, `ref_archive.py`, `domain_check.py`, `cutout_vector.sh`, `cut.swift`, `vectorize.js`) are not bundled. Perform phase-gate checks directly against the required artifact files, or obtain user consent before fetching and inspecting the upstream scripts at the pinned commit above.

## 模板与例子
- `assets/templates.md`：风格预览 brief、"哪里不如它"对比表、需求卡、交接块。
- `references/example-ui-iteration.md`：一个 UI 从被骂到被接受的完整循环（泛化）。
- `references/example-brand-launch.md`：起名→域名→账号矩阵→首周内容的完整例子（泛化）。

## 配套 skill（到点就调用，不要自己重造）
| 阶段 | skill | 何时用 |
|---|---|---|
| 06 UI | `apple-design` | iOS/macOS 每版改完自动审查 HIG 与"像不像模板" |
| 09 发布视频 | `pro-motion` | 音频先行的 MG 发布片、BGM、多比例交付 |
| 10 社媒 | `post` | 小红书/X 组图、封面、App Store 海报式版式 |
| 02/10/11 | `renhua` | 任何中文文案发出前去 AI 味 |
| 11 / 报告 | `dataviz` | 漏斗、指标、对比做成图不做表 |
| 全程 | `skill-skill` | 阶段结束把新坑沉淀成 skill/记忆，并审计本 skill |

**待吸收**（pro-launch 稳定后，反过来读这些 skill 的经验并并入对应阶段细则）：pro-motion 的联系表与音频先行流程 → 09；post 的网感与系列化 → 10；apple-design 的审查清单 → 06；renhua 的口吻规则 → D14。吸收时只摘可检查的规则，别整段搬。

## Examples

- **0-to-1 product positioning and naming:** "Help me position and name a photo-effect iOS app for Gen-Z." Produce `docs/positioning.md` with sourced category comparisons, then generate candidate names with a transparent rubric in `docs/naming.md` and `docs/trademark.md`, leaving domain purchase and registration to the user.
- **Taste-first UI iteration:** "My app home screen looks like a generic web template." Collect ≥8 non-generic visual references in `refs/style-refs/INDEX.md`, propose 2–3 style previews before writing UI code, and evaluate each iteration with a side-by-side gap table in `docs/ui-log.md`.

## Limitations

- It guides process and produces artifacts; it does not register trademarks, publish, or pay for anything on the user's behalf.
- Domain, trademark and store checks are research aids and not legal advice.
