# WorkBuddy 完整验收标准

## A. 离线全链路

运行：

```bash
python3 scripts/workbuddy_acceptance.py --run-dir <输出目录>
```

必须同时满足全部检查：

- `locate` 找到 collector、comparison、authority 三个包内模块。
- 识别一个知识点，并把 `1400 元` 与 `2000 元` 判为冲突。
- 生成独立的 request、evidence、assessment、result。
- 复用深知晓合格官方锚点，`trustedSearchRequestCount=0`、`dknowExemptCount=1`。
- 深知晓为 `direct_accurate`，豆包为 `misleading`。
- 生成 `capture/results.json`、`capture/report.html`、`capture/report.md`、`capture-gate.json`、`comparison.html`、`verification.json`、`report.html`、`pipeline.json`。
- `prepare-comparison` 明确返回 1.0 产物索引，`complete-comparison` 明确返回 1.1 产物索引，`deliver` 返回全部阶段产物。
- 在运行目录顶层生成 `01-capture-report.html`、`02-comparison-report.html`、`03-authority-report.html`、`04-final-report.html`，并要求 WorkBuddy 使用真正的 Markdown 文件链接分别交付。
- 权威裁决结构错误、证据 ID 不存在或覆盖平台缺失时必须失败，不能静默降级。
- `verification.status=needs_review` 时命令必须以非零状态结束，WorkBuddy 不得宣称核验完成。
- 存在非免查知识点且本机没有可信搜索配置时，必须返回 `configuration_required`、MaaS 首页、跨载体配置命令与 `browser_login_only` 交互类型并阻止搜索。调用方前台执行配置命令，用户只完成 MaaS 登录；组件自动复用或创建 `Fact-Check-X` 专用 Key，验证后写入本机共享凭据并自动续接。已有配置必须跳过登录；不得要求用户复制 Key、编辑 shell 配置或回复“已配置”，也不得自行改用深知晓来源。
- `authority-gate.json` 未经过 `prepared → searched → finalized` 时，禁止裁决和生成最终报告。
- `comparison-analysis.json`、`comparison.json`、request、evidence、assessment 或 result 在门禁后被修改，或 results 中出现额外/陈旧 ID 时，必须拒绝继续。

## B. WorkBuddy 语义闭环

WorkBuddy 必须亲自读取 `comparison-task.json` 并写 `comparison-analysis.json`，再读取逐点证据并写 assessment。不得复制内置金标准文件，也不得调用外部模型 API。

验收时检查：

- 知识点粒度是单一事实变量。
- 来源支持关系没有跨平台借证。
- 每个已覆盖主张都有可在原答案定位的 `answerExcerpt`；逐句脚标仅从该片段提取，后段官方脚标不能抬高前段核心主张。
- 原答案和原始 URL 未被改写。
- 裁决理由可由 evidence 中的证据 ID 回溯。
- 最终报告与中间 JSON 数值一致。
- 对话中先后出现原始答案与引用、知识点对比、权威证据核验和平台表现检查点；中间报告链接不能只藏在折叠执行详情中。

## C. 在线闭环

首次运行先在对话中提示用户，再打开可见浏览器完成豆包和深知晓登录，确认登录入口消失且可提问后保存持久化会话，再用同一真实问题采集两端回答。豆包未登录页面即使存在输入框，也不得提前填入问题。采集器必须等待回答停止生成；失败后自动重采，仍失败则生成 `capture-recovery.json` 并由 WorkBuddy 调用 Computer Use 恢复浏览器操作。全部平台成功前，`capture-gate.json` 必须阻止知识点对比及后续流程。无深知晓合格锚点的知识点必须恰好发起一次可信搜索；有锚点的知识点必须免查。

## D. 动态平台报告

- 平台数量由用户输入决定，`N≥1`；当前已接入平台可按任意组合完成采集、知识点结构化、权威核验和最终报告。
- 使用 `N=2/3/4/5` 分别生成四份阶段报告，并在 1440×1000 与 390×844 视口检查。
- `N≤3` 的平台卡片在桌面端等宽对齐；`N=4/5` 的卡片保持等宽并按可用宽度排列。
- 原答案、来源矩阵和逐知识点判定等高密度组件可局部横向滚动；任何报告页面不得出现整页横向溢出。
- 报告中的平台数、平台名称、知识点、权威证据和最终裁决必须与同次运行的 JSON 一致。
