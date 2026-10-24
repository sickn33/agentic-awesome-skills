---
name: fact-check-x-unified
description: Fact-Check-X 流程编排能力，依次组织各方答案汇总、各方答案聚合（未核验）、权威核验后的最终答案和各方答案测评，生成可打开、可审计、可迁移的阶段产物与完整报告包。
license: Apache-2.0
source_repo: asi2030/fact-check-x
source_type: official
source: asi2030
date_added: '2026-09-21'
risk: critical
compatibility: Requires Python 3, separately reviewed sibling skills and their runtime; online collection/search needs authorized accounts and data-sharing approval.
---
## When to Use
- 用户需要比较一个或多个平台的回答、区分未核验草案与已核验结论，并保留来源、逐知识点裁决和可迁移报告。
- 已有采集结果或准备好独立安装并审查的三个依赖技能；联网、账户配置和本机写入必须符合用户授权。
- 中文是原始工作流的目标语言；用户指定其他语言时用其语言交互，保留数据契约中的字段名。

# Fact-Check-X 统一入口

本技能只做编排，不内嵌三个业务层。它按以下顺序调用兄弟技能：

1. `llm-answer-reference-compare`：多平台回答、引用与现场存证采集。
2. `fact-check-x-knowledge-compare`：本地知识点结构化对比，可选。
3. `fact-check-x-authoritative-verify`：逐知识点并发权威核验与平台表现报告。

所有语义拆解和证据裁决由当前承载技能的智能体完成。脚本不调用任何模型 API。

## 依赖定位

AAS 仅分发本编排技能的脚本与测试，**未分发** `llm-answer-reference-compare`、`fact-check-x-knowledge-compare`、`fact-check-x-authoritative-verify` 的采集器、渲染器和夹具。因此单独安装本技能不能运行完整流水线，也不能假称已经打开登录页面。

依赖恢复：从 [已核对的官方来源](https://github.com/asi2030/fact-check-x/tree/0984307468e58113220215a2639392d6627eb8da) 取得四个完整技能及其依赖。先审查固定修订的来源、许可证、锁文件、浏览器与账户数据边界；不要由本技能静默下载或安装。单独安装的完整三个依赖目录可通过以下变量定位；自动配置组件使用相同的目录：

```bash
export FACTCHECK_SKILLS_DIR="<已审查的完整上游分发包的 skills 绝对目录>"
```

脚本路径相对于本技能安装目录；执行前进入该目录。先检查依赖（缺少可执行入口时明确失败，不以仅存在 SKILL.md 作为就绪证明）：

```bash
python3 scripts/fact_check_x.py locate
```

## 完整流程

先采集 `results.json`，然后准备知识点对比：

```bash
python3 scripts/fact_check_x.py prepare-comparison \
  --results <results.json> \
  --run-dir <run>
```

命令会同步生成“各方答案汇总”，在运行目录顶层生成 `01-capture-report.html`。每个 `deliverables` 条目同时返回已验证存在的本机 `path`、标准 `fileUri` 和可直接展示的 `markdownLink`。调用方必须原样展示 `markdownLink`，不得自行拼接 Windows 路径或把 `path` 直接塞进 Markdown；产物不存在时命令会在当前阶段失败。

默认交互模式下，程序会把阶段状态写入 `stage-checkpoints.json`。调用方发送本阶段产物并收到用户“继续下一步”后，必须使用 `checkpoint.acknowledgement.token` 执行：

```bash
python3 scripts/fact_check_x.py acknowledge-stage \
  --run-dir <run> --stage <checkpoint.stage> \
  --token <checkpoint.acknowledgement.token> --decision continue
```

未确认时，下一阶段命令会直接失败。当前程序实现的是逐阶段确认模式；执行完整流程前说明这一约束。用户要求连续执行时不要假称已经支持自动模式，也不要伪造确认令牌。

当前智能体读取 `<run>/comparison-task.json`，写入 `<run>/comparison-analysis.json`，再执行：

`comparison-task.json` 是自包含的紧凑工作集。阶段确认后只允许“读取任务包一次、写入分析一次、执行验收一次”，以紧凑任务包为主要输入，避免无必要的重复读取或完整转储。发生错误、歧义或契约问题时应读取必要的源码或证据定位原因；三次调用是上游效率建议，不得用它阻止正确性或安全检查。`capturedText` 只是有界原文预览，完整正文由程序在验收时从 `results.json` 校验和重建。

拆解时，原子性同时约束知识点和各平台 `claim`。一个原句包含多个独立义务、条件、对象、数值或后果时必须拆点，每个 `claim` 只保留当前事实；平台独有的实质新增事实也要另起无锚点知识点，不能并入宽泛知识点后复用深知晓锚点免查。每个知识点同时标明 `claimType=fact|recommendation`：纯操作建议可标为 `recommendation`，不因缺少逐句脚标而判引用不忠实；建议中包含的制度事实、条件、数字或时效必须拆成独立 `fact`。

```bash
python3 scripts/fact_check_x.py complete-comparison \
  --results <results.json> \
  --run-dir <run>
```

命令会在运行目录顶层生成 `02-comparison-report.html`，并通过 `deliverables[].markdownLink` 返回可点击链接；调用方必须原样展示。报告必须包含明确标为“未核验”的综合草案。默认交互模式下，用户确认继续后才能进入权威核验。

生成每个知识点的独立云端请求并并发取证：

```bash
python3 scripts/fact_check_x.py prepare-authority --run-dir <run>
python3 scripts/fact_check_x.py search-authority --run-dir <run> --max-workers 12
```

深知晓采集同时保留回答内逐句脚标和“知识专库”中的回答级来源；相同 URL 合并为 `inline_and_global`。回答级来源只有经当前知识点逐条语义匹配且原文可定位时才可支持该事实，不得整库继承。知识点已有深知晓/深知晓（深度溯源）本次回答所附的官方材料，或其他平台本次回答所附的 `gov.cn` 材料，且原文确实支持当前事实主张时，直接复用为官方证据，不调用可信搜索。纯操作建议同样不调用可信搜索；除此之外，已有材料不足以裁决的事实知识点才是非免查知识点。

若存在非免查知识点但本机尚无可信搜索配置，`prepare-authority` 和 `search-authority` 会返回 `status=configuration_required`、`userPrompt` 与 `configuration.command` 并以非零状态退出。调用方先展示登录提示和外部提供方、账户/Key 创建、可能费用、发送数据范围及本机保存位置，获得授权后再前台执行该命令。不得把“配置缺失”当成自动创建账户凭据或联网的授权。用户只需在自动打开的深知 MaaS 页面完成登录；组件会自动复用已有完整 Key，没有时创建 `Fact-Check-X` 专用 Key，验证后保存到 `~/.fact-check-x/credentials/trusted-search-key`。Codex、Claude Code、WorkBuddy 等载体共享该配置，检测到已有 Key 时直接跳过登录。配置成功后调用方自动重跑 `prepare-authority`，不得要求用户复制 Key、编辑 shell 配置、回复“已配置”，也不得改用深知晓来源或普通搜索绕过。

只有可信搜索返回 401/403 时才把现有 Key 视为失效并进入自动配置。超时、断网或服务异常保留现有配置并自动重试；重试后仍失败则停留在搜索阶段返回技术错误，不要求用户重新登录，也不转成人工事实复核。

`prepare-authority` 会写入 `authority-gate.json`。只有可信搜索批次正常完成、门禁状态变为 `searched` 后，`finalize-authority` 才允许运行；手工写 evidence 或 result 不能绕过。

当前智能体逐个读取 `authority/requests` 与 `authority/evidence`，把裁决写入 `authority/assessments/<知识点ID>.json`，然后：

免查模式下，`trustedAnchor.officialAnswer` 是当前事实知识点的权威结论；锚点证据列表用于来源追溯。无论来自深知晓还是 `gov.cn`，都必须确认已捕获正文实际支持该结论，不得仅凭官方属性自动判定。`trustedAnchor.claimEvidenceMap` 记录各平台已经逐主张绑定的官方原文；命中该映射的平台直接复用本次回答自带证据，不得因另一轮可信搜索未召回同一材料而降为证据不足。其他平台主张与 `officialAnswer` 语义一致或可由其直接推出时，裁决为 `supported` 并引用有效锚点证据 ID。仅当平台主张增加了权威结论不能支持的实质事实，或确实无法判定时，才使用 `insufficient`。知识点对比阶段的引用忠实性与本阶段的事实正确性分别保留，不能因平台自身引用不足而拒绝判断已经被权威结论证实的主张。`recommendation` 作为“操作建议”单独展示，不进入事实准确率或幻觉率；若权威证据证明建议会误导，仍可判为 `contradicted`。

```json
{
  "authoritativeFinding": "由权威证据支持的知识点结论",
  "verdicts": {
    "<平台ID>": {
      "verdict": "supported",
      "reason": "主张与 E1 一致",
      "evidenceIds": ["E1"]
    }
  }
}
```

`verdict` 只能使用 `supported`、`contradicted` 或 `insufficient`，证据 ID 必须存在于当前 evidence 文件中。旧式顶层 `verdict`、`officialAnswer`、`platformAssessment` 会被拒绝。

```bash
python3 scripts/fact_check_x.py finalize-authority --run-dir <run>
```

第三步完成后如需修正 assessment，禁止手工清空结果或修改 gate。先执行 `python3 scripts/fact_check_x.py reopen-authority --run-dir <run> --reason "<原因>"`；程序校验锁定摘要并归档旧裁决后回退到 `searched`，再修改 assessment、重新 `finalize-authority` 并重新确认第三步产物。

`finalize-authority` 生成“权威核验后的最终答案”，只将证据充分的直接知识点纳入 `finalAnswer`，将补充参考单独写入 `supplementalFindings`，将证据不足项写入 `evidenceGaps`。第三步只展示直接答案、证据边界和简洁来源索引；逐知识点裁决与评分只在第四步展示。

`finalize-authority` 完成裁决后会独立生成 `03-authority-report.html`，并通过
`deliverables` 返回已验证的路径、文件 URI 和 `markdownLink`。调用方必须原样展示 `markdownLink`；默认交互模式下，
只有状态为 `completed` 且用户确认继续后才执行：

```bash
python3 scripts/fact_check_x.py deliver --results <results.json> --run-dir <run>
```

可信搜索返回 `no_evidence` 时记录为 `insufficient_evidence`：空结果只表示本次没有取得可裁决材料，不能直接判成“编造”；证据边界记录完成后继续生成后续报告。

`deliver` 必须在运行目录顶层生成并返回四份独立可读报告：

- `01-capture-report.html`：各方答案汇总；
- `02-comparison-report.html`：各方答案聚合（未核验）；
- `03-authority-report.html`：权威核验后的最终答案、权威证据和证据边界；
- `04-final-report.html`：各方答案测评报告。

`deliver` 只能读取第三步已锁定的 `verification.json` 和 `03-authority-report.html`；任一文件摘要变化都必须拒绝，不得重算或重写第三步。

缺少任一报告都不得生成或交付 `05-complete-report-package.zip`。

最终保留：

- `capture/results.json`、`capture/report.html`、`capture/report.md`；
- `comparison-task.json`、`comparison-analysis.json`、`comparison.json`、`comparison.html`；
- 每个知识点独立的 request、evidence、assessment、result；
- `authority/batch.json`、`verification.json`、`report.html`、`pipeline.json`；
- 四份阶段报告和 `05-complete-report-package.zip`。

## 跳过知识点对比

知识点对比是可选能力。已有结构化知识点时，可按权威证据核验模块的数据契约直接建立单知识点请求，独立调用 `fact-check-x-authoritative-verify`。统一入口不会强迫用户先采集多个 AI 回答。

## 执行边界

- 原始答案阶段只采集，不核验；可用可信搜索全文参数补全平台已给出的同一来源正文，但不得新增或替换引用。
- 知识点对比只比较原答案与所附来源，不联网找真相。
- 云端层只接收当前知识点；各家主张相同则不上传主张，不同才上传差异。
- 深知晓已有合格官方锚点时不重复搜索。
- 最终报告必须使用权威证据核验模块内的稳定报告渲染器。

## 交付门禁

```bash
# 本地边界检查可离线执行；完整冒烟测试需要上面的三个已审查依赖与夹具。
python3 tests/smoke_test.py
# quick_validate.py 属于可选宿主工具，未随 AAS 分发；仅在当前宿主确实存在且已审查时使用。
```

完整标准见 [验收标准](references/acceptance-criteria.md) 和 [编排契约](references/contracts.md)。


## Examples

```text
用户：比较两份已有回答，区分来源支持、事实核验和证据不足，先生成未核验草案。
助手：确认输入/私有输出目录，检查依赖，准备第一阶段报告；不自动登录云服务、创建 Key 或把证据不足标为误导。
```

## Limitations

- 本技能会写入/清理运行目录，调用外部子技能，配置流程可能创建和保存账户 Key；仅使用专用私有运行目录和已授权账户。`risk: critical` 描述这些能力，不是对内容质量或服务安全的评分。
- 不自动安装所有依赖；安装前审查固定来源、锁文件和生命周期脚本，`prepare-runtime` 默认禁用 npm 生命周期脚本。
- 外部搜索验证会发送请求并可能消耗配额；仅在获授权后执行，禁止向未知地址或重定向传送 Key。
- JSON 摘要门禁防止意外或后续改动，不构成抗恶意本机攻击的签名；运行目录、输入和子技能必须可信。不得在收到第三方产物后直接执行子技能。
- 官方域名不是自动正确性的证明；已获得原文必须支持当前原子主张，技术采集失败保留证据不足。
- 完整 smoke、多平台、阶段门禁测试依赖完整上游分发包；AAS 未包含这些外部夹具，缺失时应说明先决条件，不伪造通过。
- 本地测试/夹具不能证明实际登录、提供方调用或真实平台端到端行为。

### 本地安全补充

运行目录首次必须为空且专用；POSIX上由当前用户拥有并限制为0700。程序拒绝符号/硬链接、特殊文件及超过文件/总量上限的运行树。现有不带运行标记的目录不会自动清空；选用新的目录，不要伪造标记以绕过检查。这些检查不抵御恶意同一用户并发修改；Windows仍须自行验证私有ACL。

默认可信搜索凭据只发送到open.dknowc.cn的HTTPS端点；更改提供方须先获数据和凭据发送授权，并显式设置FACTCHECK_TRUSTED_SEARCH_ALLOWED_HOST。HTTP仅允许显式FACTCHECK_ALLOW_LOOPBACK_FIXTURE=1且fixture_测试Key的回环夹具。子技能默认1800秒、登录配置600秒超时；超时不证明外部行为回滚，恢复前检查状态。并发限制1到12。

便携包包含回答、截图、页面和历史裁决；交付前检查敏感内容和共享范围。HTML及外部子技能必须预先审查；本脚本不提供HTML净化或子进程沙箱。输出捕获受子技能行为影响；输入应保持在约定资源预算内。
