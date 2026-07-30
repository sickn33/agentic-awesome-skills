---
name: fact-check-x-complete
description: 完整采集并比较多家 AI 平台的回答、引用和页面证据，按需使用可信搜索逐点核验，生成四阶段可追溯报告。
category: research
risk: critical
source: https://github.com/ASI2030/Fact-Check-X
source_repo: ASI2030/Fact-Check-X
source_type: official
date_added: "2026-07-31"
author: ASI2030
tags: [fact-checking, research, evidence, browser-automation, source-verification]
tools: [claude, codex, cursor, gemini]
license: Apache-2.0
license_source: https://github.com/ASI2030/Fact-Check-X/blob/main/LICENSE
metadata:
  slug: fact-check-x
  displayName: 全知晓（Fact-Check-X）
  version: "1.1.0"
  summary: 正式支持 6 个 AI 平台，完整采集回答与引用、比较关键事实，并按需用权威证据逐点核验。
  tags: [事实核验, 多平台对比, 可信搜索, 深度研究]
  homepage: https://github.com/ASI2030/Fact-Check-X
---

# 全知晓（Fact-Check-X）

把同一个问题交给多个 AI 平台，完整保留每家的回答和引用，再把关键事实逐点对齐、核验并形成可追溯结论。用户只需说出问题和要比较的平台，不需要学习平台 ID、内部流程编号或报告术语。

## When to Use（适用场景）

- 需要核验一个或多个 AI 平台回答中的事实、数字、政策条件或来源时。
- 需要比较多个平台的共识、冲突、引用忠实性和回答完整性时。
- 需要把原始回答、页面存证、知识点对比和权威证据保留为可追溯报告时。

## Limitations（限制）

- 网页平台登录、短信验证码和人机验证必须由用户本人处理。
- 第三方网页结构变化可能导致采集暂停；选定平台全部成功前不会进入后续阶段。
- 可信搜索只在权威核验阶段按需使用，未配置时不会影响原始采集和知识点对比。

## 支持平台

当前内置以下网页端平台，按用户本次输入动态选择任意 `N≥1` 个：

| 平台 | 能力 |
|---|---|
| 深知晓 | 标准问答、引用与官方来源采集 |
| 深知晓（深度研究） | 等待普通回答完成后启动深度研究，并作为独立结果采集 |
| 豆包 | 回答、引用与页面存证 |
| DeepSeek | 回答、引用与页面存证 |
| 通义千问 | 回答、引用与页面存证 |
| 腾讯元宝 | 回答、引用与页面存证 |
平台由用户选择，不存在固定“五平台模式”。`N=1` 可完成单平台事实核验；`N≥2` 会额外比较各平台的共识、冲突和来源差异。网页结构变化时，技能会明确报告失败并停在当前阶段，不会用部分结果冒充完整报告。

## 使用体验

- 用户只需提供核验问题和想比较的平台；没有指定平台时，先用自然语言询问，不要求记平台 ID。
- 第一次使用某个平台时打开浏览器，由用户本人完成登录或验证码；会话保存后自动复用。
- 每一步都交付可打开的独立报告：原始答案与引用、知识点对比（未核验）、权威证据核验、平台表现与完整证据。
- 多平台采集与知识点对比不需要 API Key。只有用户继续进行权威证据核验，且现有材料不足以直接裁决时，才检查可信搜索配置。
- 可信搜索未配置时，只引导用户登录深知智能平台；技能自动获取或创建专用 Key 并安全保存在本机，不要求用户复制粘贴密钥。
- 语义分析由 Codex、Claude Code、WorkBuddy 等当前运行载体完成，不调用外部大模型 API。

## 强制执行门禁（任何动作前先读）

1. **语言硬门禁**：读取本技能后的第一句话、过程更新、命令说明、阶段检查点、错误说明和最终答复全部只使用简体中文；不得输出英文句子。命令、路径、平台 ID 和数据字段名可以保留原文。第一条回复直接使用“我会核验这个问题：先采集您选择的平台原回答和引用，再比较共识与分歧；如需权威结论，最后用可信搜索逐点核验。每一步都会给您一份可打开的报告。”，不得先用英文介绍技能或内部流程编号。
2. 执行任何命令前先检查当前会话可调用的工具。完整在线采集优先由包内 Playwright 直接启动并控制系统 Chrome、Microsoft Edge、Brave 或 Chromium；Computer Use 不是正常采集的前置条件，只是自动化失败后的恢复手段。只有命令工具时可以前台执行一次 `login` 验证可见浏览器，但没有真实成功输出前不得声称浏览器已启动。
3. 所有流水线命令必须前台直接执行并等待真实退出状态，包括 `login`、`run`、`prepare-comparison`、`complete-comparison`、`prepare-authority`、`search-authority`、`finalize-authority` 和 `deliver`。执行工具因等待用户操作而返回可轮询的运行会话 ID 时，应保留并轮询该会话；禁止使用 shell 后台任务，禁止给任何流水线命令添加 `| tail`、`| tee`、`|| true` 或其他会掩盖退出码的包装。
4. `login` 是可见浏览器命令，必须严格按本技能给出的参数执行，不得添加 `--headed` 或其他未列出的参数。精确命令尚未失败时，不得先检查 CLI 帮助、源码或浏览器环境；精确命令失败后只按错误与 `capture-recovery.json` 恢复。
5. 未看到 `login` 成功、可提问页面已建立或 `results.json` 全平台成功证据前，禁止告诉用户“浏览器已启动”“采集已在后台运行”或“将自动进入后续流程”。
6. `login` 或 `run` 运行期间出现登录、短信验证码、人机验证或 CAPTCHA 时，保持命令和当前 Playwright 页面运行，立即提示用户本人处理；检测到处理完成后自动继续，不得关闭页面、重输问题或提前结束任务。
7. `login` 或 `run` 非零退出、浏览器意外关闭、人工处理超时或采集失败时，立即读取 `capture-recovery.json`。运行载体有 Computer Use 时调用它恢复；没有时明确说明“当前载体无法调用 Computer Use，原始答案采集已停止”，停在原始答案采集阶段。
8. 进入 Computer Use 恢复后，禁止改用 headless/无头浏览器、清理锁文件、修改启动参数或用命令行诊断规避接管。允许使用原持久化配置重新打开同一平台，并直接复用 `capture-recovery.json.question`。
9. `capture-gate.json` 未证明所有指定平台均成功前，禁止进入知识点对比和后续流程。不得用已有材料、搜索结果、空回答或部分成功结果替代失败平台。
10. **分阶段交付门禁**：默认在原始答案采集、知识点对比和权威证据核验各自完成后，先向用户发送本阶段真实可打开的独立产物，再询问用户选择“继续下一步”“修正当前结果”或“到此结束并保留产物”。收到“继续下一步”前禁止执行下一阶段命令。用户在最初请求中明确要求“完整跑完、无需逐步确认”时，可以连续执行，但仍必须逐阶段发送可打开产物和状态，不得只在最后一次性汇报。平台表现评估完成后交付第四阶段产物，并允许用户确认完成或指定返回修正的阶段。程序硬门禁、登录、验证码和待复核状态不受自动连续执行授权影响。

本技能是对外唯一入口，包内自带三个独立业务模块：

1. `llm-answer-reference-compare`：多端回答、原始引用与现场存证无损采集。
2. `fact-check-x-knowledge-compare`：原子知识点拆解、主张对齐、来源忠实性判断。
3. `fact-check-x-authoritative-verify`：逐知识点可信搜索、证据裁决、独立权威核验报告与最终平台表现报告。

脚本只负责采集、校验、编排和渲染。知识点拆解、证据理解与裁决由当前运行载体完成，禁止调用任何外部模型 API。

所有面向用户的提示、阶段检查点、错误说明和最终答复必须使用中文。不得因为运行载体的默认语言改用英文。

## 首次运行

先定位包内模块：

```bash
python3 scripts/fact_check_x.py locate
```

仅当需要从真实 AI 网页采集时安装采集运行依赖：

```bash
cd modules/llm-answer-reference-compare/assets/tool
npm ci --omit=dev
cd ../../../..
```

正常在线采集直接使用系统 Chromium 浏览器，不要求下载 Chrome for Testing。
只有无头/CI 回归确有需要时才单独安装 Playwright 测试浏览器。

macOS 可见登录与交互采集按以下顺序自动选择系统浏览器：用户通过
`FACT_CHECK_X_BROWSER_EXECUTABLE` 指定的 Chromium 浏览器、Google Chrome、
Microsoft Edge、Brave、Chromium。Playwright 自带的 Chrome for Testing
默认只用于无头/CI 回归。系统没有上述浏览器时，使用 Computer Use 或提示用户
安装任一受支持浏览器；不得反复启动 Chrome for Testing。

## 完整流程

### 第一步：原始答案与引用

首次采集某个平台时，必须先在对话中告诉用户“将打开浏览器，请完成登录；检测到可提问界面后自动保存会话”。不得把提示只藏在命令输出里。然后逐个平台打开可见浏览器并等待登录准备命令成功：

```bash
node modules/llm-answer-reference-compare/assets/tool/dist/cli.js login \
  --platform dknowc-chat \
  --question "<用户原始问题>" \
  --out <run目录>/capture

node modules/llm-answer-reference-compare/assets/tool/dist/cli.js login \
  --platform doubao \
  --question "<用户原始问题>" \
  --out <run目录>/capture
```

不得代替用户填写账号、密码、短信验证码或处理人机验证。登录会话只保存在 `~/.fact-check-x/browser-profiles`，不得写入技能包、任务产物或报告。已有持久化会话可以减少用户登录操作，但不能跳过载体能力预检、前台执行和可见页面成功验证。

豆包未登录页面也可能显示输入框。不得用“找到输入框”代替登录确认：豆包右上角登录入口仍可见时，只提示并等待用户完成登录，禁止填入或提交核验问题；登录入口消失并检测到可提问界面后才开始采集。

```bash
node modules/llm-answer-reference-compare/assets/tool/dist/cli.js run \
  --question "<用户原始问题>" \
  --platform dknowc-chat \
  --platform doubao \
  --out <run目录>/capture \
  --headed \
  --interactive \
  --timeout 180000 \
  --retries 2
```

默认使用 2 个平台，也允许重复 `--platform` 选择任意 N 个平台（N≥1）。`N=1` 执行单平台知识点结构化与权威核验；`N≥2` 额外执行跨平台一致性和差异对比。
标准深知晓使用 `dknowc-chat`。深知晓（深度研究）使用
`dknowc-deep-research`：采集器会在同一会话先等待普通回答完整生成，再点击
“深度研究”，接管新打开的可信溯源报告页，等待结果完整生成后独立保存为一个
平台；按钮缺失、报告页未打开或结果未完成均按采集失败处理。平台组合完全按用户输入决定，
正式支持的内置选项包括
`dknowc-chat`、`dknowc-deep-research`、`doubao`、`yuanbao`、`deepseek`、
`qianwen`；`generic` 仅供开发者适配和验证新网页，不属于正式支持平台。
不存在固定“五平台模式”或固定上限。所有选定平台必须
采集成功后才允许进入知识点对比。原始答案、知识点对比、权威证据核验与平台表现报告均按本次
实际平台集合动态展示。

保留完整原答案、原始 URL、引用标记、引用正文、截图和失败状态。不得摘要、改写或用搜索结果替换原始来源。

当深知平台所附来源只有标题或截断摘要时，采集阶段用可信搜索 `return_full_content=true` 补全与该标题或原始 URL 匹配的同一材料全文；返回全文或段落直接用于判断，不访问源网址二次抓取正文。可信搜索返回的 `源网址` 作为官方来源主链接，深知收录页作为辅助链接；未返回源网址时保留深知收录页兜底。不得另找材料替换平台引用。其他平台已绑定 PDF 经可信搜索与直接提取仍无正文时必须失败关闭并进入 OCR 或 Computer Use，不能把采集缺口计为平台幻觉。

### 采集完成硬门禁与 Computer Use 恢复

- 回答开始后持续等待，直到内容稳定且页面不再生成；不得按固定短等待时间提前收走。
- 完整回答中出现“登录”操作说明，或页面底部仍有地区提示，不等于回答本身是登录/地区门禁；只有短小且主体为门禁提示的内容才可判失败。
- 单个平台失败、超时、只返回登录/地区提示或没有完整回答时，先自动重采。
- 自动重采后仍失败，采集器会写出 `capture-recovery.json` 并以非零状态退出。此时必须暂停流水线。
- Playwright 检测到登录、验证码或人机验证时，优先保持当前命令与页面运行，提示用户本人完成；完成后自动续采。
- 登录准备命令非零退出、浏览器意外关闭或人工处理超时时，同样会写出 `capture-recovery.json`；这已经是 Computer Use 接管信号，不是继续诊断浏览器环境的授权。
- `capture-recovery.json` 的 `action` 为 `computer_use` 时，有 Computer Use 的运行载体立即恢复同一平台，处理登录后的页面操作、地区选择、问题提交和回答完成等待；没有该能力时停在原始答案采集阶段，不得直接跳到知识点对比。
- 禁止以 headless 测试、另一套浏览器、锁文件清理、显示会话检查或启动参数调整代替恢复。
- 接管时必须直接读取并复用 `capture-recovery.json.question`，不得要求用户滚动到旧会话开头寻找或复制原问题。
- 登录、验证或人工发送需要用户参与时，保持当前 Playwright 页面和采集上下文，不得关闭页面、重复打开浏览器或机械重采。明确告诉用户直接在页面处理即可，也可回复“验证已完成”或“答案已生成”；不得要求用户暂停或取消任务。
- Computer Use 遇到账号、密码、短信验证码、人机验证或 CAPTCHA 时，交给用户本人处理；检测用户处理完成或收到“验证已完成”“答案已生成”后，重新检查当前页面，等待回答完全停止生成并自动续采。
- Computer Use 恢复页面后重新运行原始答案采集。只有 `results.json` 中所有指定平台均为 `success`、回答非空且 `capture-recovery.json.status` 不再是 `required`，才允许运行 `prepare-comparison`。
- 统一入口生成的 `capture-gate.json` 是程序级硬门禁；失败平台、空回答和初始化提示都无法进入知识点对比、权威核验或最终报告。

### 第二步：知识点对比（未核验）

```bash
python3 scripts/fact_check_x.py prepare-comparison \
  --results <run目录>/capture/results.json \
  --run-dir <run目录>
```

命令成功后，必须立刻向用户发送一条独立的 **原始答案采集完成检查点**，展示每个平台的采集状态、可回溯参考文献数量、无 URL 来源标签数量和耗时，并提供以下可点击产物：

- `capture/report.html`：原始答案、参考文献和引用关系；
- `capture/results.json`：无损结构化采集结果；
- `capture/report.md`：可迁移文本报告；
- `capture-gate.json`：全部平台采集成功证明。

必须使用命令返回的 `deliverables[0].path` 作为真正的 Markdown 文件链接目标，链接文字使用“打开原始答案与引用报告”；禁止仅用反引号显示路径。该检查点必须在开始知识点对比前对用户可见。默认询问用户选择“继续下一步”“修正当前结果”或“到此结束并保留产物”，并等待选择；只有最初请求已明确授权完整自动跑完时才可不等待。不得只把路径藏在“运行命令”、折叠执行详情或最终总结中。

豆包等页面可能只显示来源名称而不暴露原文 URL。采集器会先尝试展开来源标签获取真实链接；仍无链接时写入 `sourceMentions`。此时必须表述为“0 条可回溯参考文献，N 个无 URL 来源标签”，不得说“页面没有来源”，也不得把标签伪造成参考文献。

读取 `comparison-task.json`，由当前承载智能体直接写 `comparison-analysis.json`。每个知识点只表达一个可核验事实变量；同一事实的不同数值必须对齐在同一点；只能使用原始答案采集阶段已经保存的来源判断来源忠实性，禁止联网补证。顶层必须填写 `synthesisDraft`，其 `status` 固定为 `unverified`，正文综合所有相关知识点并保留冲突、条件和缺口，`basisKnowledgePointIds` 只能引用当前知识点；它是“综合草案（未核验）”，不得写成权威最终答案。

原子性必须落实到每个平台的 `claim`，不能只把知识点标题写得宽泛。原回答一句话同时包含多个可独立判真的义务、条件、对象、数值或后果时，必须拆成多个知识点；各点的 `claim` 只保留当前事实，`answerExcerpt` 可以复用同一段原文。仅个别平台增加的实质事实也要单独成点，其他平台标为未覆盖，禁止把新增事实并入宽泛知识点后借用深知晓锚点免查。`trustedAnchor` 只能覆盖与深知晓权威结论相同的单一事实变量；超出该变量的主张必须成为无锚点知识点，交给后续一次可信搜索。

每个 `covered=true` 的 claim 必须填写 `answerExcerpt`：它必须是原始 `answerMarkdown` 的连续子串，并覆盖当前原子主张。载体负责知识点、主张和原回答片段的语义判断；程序负责从已捕获来源中校验脚标、重建可定位证据摘录、归一化引用方式，并自动生成合格的深知晓可信锚点。

- 局部角标优先：脚标实际出现在 `answerExcerpt` 内时列入 `citedReferenceIndexes`；当前主张已有局部脚标后，答案后段或回答级官方来源不得反向抬高它。
- 没有局部角标时，可把平台为该主张返回的来源索引写入 `citedReferenceIndexes` 或 `answerLevelReferenceIndexes`。程序会在对应 `capturedText` 中定位支持当前主张的原文，并归一化为回答级语义溯源；定位失败才进入待复核。
- 回答级语义匹配不等于整篇自动继承来源。证据必须实际支持当前主张；只支持补充点的官方来源不得抬高核心点。
- 溯源方式会标准化为 `local`、`declared_global`、`answer_level_semantic` 或 `none`，最终报告分别外显为“逐段溯源 / 无对应的清单 / 全文语义溯源 / 未建立溯源”。缺少可定位证据时保守降级，不得默认为官方依据。

```bash
python3 scripts/fact_check_x.py complete-comparison \
  --results <run目录>/capture/results.json \
  --run-dir <run目录>
```

若命令返回 `fact-check-x/product-truth@1` 契约错误，必须停留在知识点对比阶段：
按错误路径补齐或重写 `comparison-analysis.json`，随后重新执行
`complete-comparison`，最多自动修复 2 次。两次后仍失败则明确报告知识点对比
阻断及缺失字段，禁止进入 `prepare-authority`，也禁止静默结束任务。

命令成功后，必须立刻向用户发送一条独立的 **知识点对比完成检查点**，展示知识点数量、待复核数量和“综合草案（未核验）”。必须使用 `deliverables[0].path` 作为 Markdown 文件链接目标，链接文字使用“打开知识点对比报告（未核验）”，不能只写 `comparison.html` 或把表格补在最终答复中。默认询问用户选择“继续下一步”“修正当前结果”或“到此结束并保留产物”，并等待选择；只有最初请求已明确授权完整自动跑完时才可不等待。

### 第三步：权威证据核验（可选增强）

可信搜索使用跨载体共享的本机配置。每次进入权威核验前先自动检查；已有有效 Key 时直接继续，不打开登录页，也不要求用户重复配置。首次缺少 Key 时，向用户说明“将打开深知 MaaS 页面，您只需完成登录，后续由技能自动配置”，随后立即执行命令返回的 `configuration.command`。配置组件会使用包内 Playwright 打开系统浏览器并等待用户本人完成短信、密码、验证码或人机验证；登录成功后自动读取已有完整 Key，没有可复用 Key 时创建名称为 `Fact-Check-X` 的专用 Key，验证后写入 `~/.fact-check-x/credentials/trusted-search-key`。该配置供 Codex、Claude Code、WorkBuddy 等载体共同复用。

用户不需要查找、复制、粘贴或回复 Key，也不需要编辑 shell 文件、执行环境变量命令或回复“已配置”。配置命令成功后自动重新执行 `prepare-authority` 并继续。若用户在对话中粘贴疑似密钥，仍必须视为已经泄露：不得复制到命令、脚本、日志、配置或报告中，不得用该值继续执行；立即提示用户在 MaaS 控制台吊销，然后重新运行自动配置。

只有可信搜索返回 401/403 时才把现有 Key 视为失效并进入自动配置。超时、断网或服务异常必须保留现有配置，直接按服务异常进入待复核，不得要求用户重新登录。

```bash
python3 scripts/fact_check_x.py prepare-authority --run-dir <run目录>
python3 scripts/fact_check_x.py search-authority --run-dir <run目录> --max-workers 12
```

`prepare-authority` 会先统计必须调用可信搜索的知识点。只要存在非免查知识点且本机共享配置与既有环境都没有可用 Key，命令就返回 `status=configuration_required`、`action=configure_trusted_search`、`configuration.command` 和可直接展示的 `userPrompt`，并以非零状态退出。此时先向用户展示简短登录提示，再立即前台执行返回的配置命令：

> 部分知识点还需要调用可信搜索。首次使用将打开深知智能 MaaS 平台，您只需完成登录；技能会自动获取或创建 Fact-Check-X 专用 Key，验证并保存后继续。本机已有配置时会直接跳过。

配置组件返回 `status=configured` 或 `status=already_configured` 后，自动重新执行 `prepare-authority`；只有返回 `status=prepared` 才能继续搜索。登录期间保持浏览器与命令运行，用户完成登录后自动续接。不得自行决定“直接基于深知晓官方来源裁决”，不得以普通联网搜索代替可信搜索，也不得让用户在对话中发送密钥。

`comparison-gate.json` 会锁定采集结果、`comparison-analysis.json` 与 `comparison.json` 的摘要；`authority-gate.json` 会继续锁定 request、evidence、assessment 和 result 的精确文件集合及摘要。后续发现文件被修改、ID 不一致、额外/陈旧 result、缺失 assessment（已取得证据的知识点）或手工结果时必须拒绝继续。只有 `search-authority` 正常完成并把门禁更新为 `searched` 后，才能写 assessment、运行 `finalize-authority` 或生成最终报告。禁止手工伪造 evidence、result，禁止通过修改中间 JSON 消除待复核，禁止在缺钥时宣称“核心事实核验已完成”。

逐个读取 `authority/requests` 和 `authority/evidence`，由当前运行载体直接把裁决写入 `authority/assessments/<知识点ID>.json`。已有合格深知晓官方锚点时必须免查；否则每个知识点只调用一次可信搜索。多个知识点独立并发，不上传无关回答全文。

免查模式下，`trustedAnchor.officialAnswer` 是当前知识点的权威结论，锚点证据列表用于来源追溯，不要求每条标题或截断摘录逐字复述该结论。平台主张与 `officialAnswer` 语义一致，或可由其直接推出时，必须裁决为 `supported` 并引用当前锚点中的有效证据 ID。只有平台主张增加了 `officialAnswer` 和锚点均不能支持的实质事实，或者事实确实无法判定时，才使用 `insufficient`。不得仅因锚点摘录较短，就把与 `officialAnswer` 同义的主张判为证据不足。

知识点对比阶段的引用忠实性和本阶段的事实正确性必须分别保留：平台自己的引用不支持其主张时，继续记录 `faithfulness=insufficient`；若该主张经权威结论证实，本阶段仍裁决为 `supported`，最终分类由程序据此形成 `coincidental`，不能用引用缺口代替事实裁决。

每个裁决文件必须严格使用以下结构；平台键必须与 request 中已覆盖的平台 ID 一致，`evidenceIds` 只能引用当前 evidence 文件中的证据 ID：

```json
{
  "authoritativeFinding": "由权威证据支持的知识点结论",
  "verdicts": {
    "dknowc-chat": {
      "verdict": "supported",
      "reason": "主张与 E1 一致",
      "evidenceIds": ["E1"]
    },
    "doubao": {
      "verdict": "contradicted",
      "reason": "主张与 E1 冲突",
      "evidenceIds": ["E1"]
    }
  }
}
```

`verdict` 只能是 `supported`、`contradicted` 或 `insufficient`。禁止使用顶层 `verdict`、`officialAnswer` 或 `platformAssessment` 代替规定字段。结构错误、证据 ID 不存在、平台裁决缺失都会被程序拒绝，必须修正后重新执行。

```bash
python3 scripts/fact_check_x.py finalize-authority --run-dir <run目录>
```

`finalize-authority` 完成裁决后会独立生成 `verification.json` 和
`03-authority-report.html`；即使返回 `status=needs_review`，也必须生成并返回明确标记待复核的阶段报告，同时继续禁止最终报告。必须立即发送 **权威证据核验检查点**，使用
`deliverables[0].path` 作为 Markdown 文件链接目标，链接文字使用“打开权威证据核验报告”；报告顶部
在完成状态展示“权威核验后的最终答案”，在待复核状态展示“当前核验结论（待复核）”，下方保留逐知识点证据和平台裁决。默认询问用户
选择“继续下一步”“修正当前结果”或“到此结束并保留产物”，并等待选择；只有
最初请求已明确授权完整自动跑完且当前状态为 `completed` 时才可不等待。

### 第四步：平台表现与完整证据

用户确认后再生成平台表现评估与完整报告包：

```bash
python3 scripts/fact_check_x.py deliver \
  --results <run目录>/capture/results.json \
  --run-dir <run目录>
```

`finalize-authority` 或 `deliver` 返回非零状态，或返回 `status=needs_review` 时，必须停在“待复核”，读取错误或 `needsReview` 修正后重跑。此时禁止宣称“事实核验完成”，禁止把待复核结论包装成确定答案。

可信搜索返回成功但当前知识点 `no_evidence` 时，也必须归类为“证据不足、待复核”并停止交付。单次检索未返回材料不等于官方明确否定，更不等于平台主张“编造”；不得据此生成 `fabricated` 或 `completed`。

最终必须交付：

- `05-complete-report-package.zip`：可直接发送给他人的完整报告包，内含四份 HTML、原始 JSON、截图、页面存证和逐知识点核验数据；
- `01-capture-report.html`：原始答案、参考文献与引用存证报告；
- `02-comparison-report.html`：知识点结构化对比报告（未核验）；
- `03-authority-report.html`：逐知识点权威结论、官方证据和各平台裁决的权威证据核验报告；
- `04-final-report.html`：按本次动态平台集合生成的平台表现评价、综合指标、关键发现与原始存证汇总；
- `capture/results.json`：原始回答、参考文献、原始 URL、引用标记和现场存证索引；
- `capture/capture-recovery.json`：在线采集时记录 Computer Use 恢复状态；
- `capture/report.html`：原始答案、参考文献与引用关系可视化报告；
- `capture/report.md`：原始答案与引用的可迁移文本报告；
- `capture-gate.json`：全部指定平台采集成功的程序级门禁证明；
- `comparison-gate.json`：知识点对比输入、分析与归一化结果未被后改的 provenance 证明；
- `comparison.html`：知识点结构化对比报告（未核验）；
- `verification.json`、`report.html`、`pipeline.json`：权威核验数据、最终平台表现报告和全链路清单；
- 每个知识点的 request、evidence、assessment 和 result。

最终对话必须使用 `deliverables` 返回路径，按“完整可分发报告包、原始答案与引用报告、知识点对比报告（未核验）、权威证据核验报告、平台表现与完整证据报告、全链路清单”给出实际状态。即使最终报告已经生成，也不得省略三个阶段报告；并允许用户确认完成或指定返回修正的阶段。

本机文件链接只用于当前运行会话内查看，禁止把 macOS 用户目录、Windows 本地盘符路径或本机文件协议地址描述成群成员、客户或共享链接访问者可以打开的对外交付地址。需要对外发送或转交时：

1. 优先把 `05-complete-report-package.zip` 作为真实文件附件上传到目标会话、群聊、邮件或云盘；
2. 目标平台支持多附件时，同时上传 `01-capture-report.html`、`02-comparison-report.html`、`03-authority-report.html` 和 `04-final-report.html`；
3. 目标平台不支持文件上传时，必须明确提示“当前链接仅在执行机器可用”，并请用户选择可上传的交付渠道；不得只发送本机 Markdown 链接后宣称交付完成；
4. `05-complete-report-package.zip` 内部必须使用相对路径，解压后可直接打开四份报告，不得包含可执行机器的绝对路径。

## 在线配置

仅当知识点没有合格深知晓锚点且本机尚无共享配置时，统一入口会自动返回并执行：

```bash
python3 scripts/trusted_search_config.py configure
```

命令会打开深知 MaaS 登录页。用户只完成登录，技能自动获取或创建专用 Key、
验证并保存；后续任何承载端均直接复用。Key 禁止写入对话、命令输出、报告、
请求文件或技能包。

## 执行边界

- 原始答案阶段只采集，不核验。
- 知识点对比阶段只比较原回答与其自带来源，不联网找真相。
- 权威层一次只处理一个知识点，可信搜索只返回证据，不负责最终裁决。
- 运行载体是 WorkBuddy、Codex、Claude Code 等智能体，不把运行载体称为“模型”。
- 任何登录失败、验证码、搜索错误、证据不足和抽取异常都必须显式报告，不得伪装成功。
- 深知晓来源列表由可信搜索生成；程序在回答主张、来源原文和链接均可定位时自动生成 `trustedAnchor.eligible=true`。外部官方链接与深知内部收录链接均按官方来源直接准确处理；只有自动锚点不合格的知识点才进入二次可信搜索。
