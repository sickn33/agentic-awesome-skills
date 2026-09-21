# longbridge-hkipo-analysis

Prompt-only 港股打新分析。给定一只新股代码或公司名，输出「推荐打新 / 中性观望 / 建议回避」三档评级 + 四维评分明细 + 招股书精华 + 风险提示 + 申购手数参考；或在日历模式下输出未来 4 周打新日程表 + 评级速览。报告结尾固定输出「数据来源明细」附录，每一行注明来源（Longbridge CLI 子命令 / MCP 工具 / WebSearch URL）、抓取时间和数据期间。

> **Independence statement (mandatory)**: this skill is an independent打新 analysis framework. It is **not** affiliated with the issuer, the sponsoring underwriters, the HKEx, or any cornerstone investor. The rating is model-derived and never a buy / sell recommendation; arrange margin financing (孖展) only after independently understanding the leverage risk.

## Cognitive frame (do not skip)

港股打新分析与二级市场分析的关键区别是 **可用数据窗口非常窄**（招股期通常 3–5 个工作日），且分析对象是「**尚未上市**」或「**刚上市**」的标的，没有 K 线、没有历史财报趋势可读。三件事每次输出都必须明确：

1. **评级是给散户的决策锚，不是预测**。"推荐 / 中性 / 回避" 是基于四维评分的当下判断，不预测首日涨跌幅。任何"预计首日 +XX%"的写法都违反护栏。
2. **数据缺失要披露，不要编造**。招股书未披露的（如尚未公布的回拨倍数、未定的基石名单）必须显式标"招股书未披露 / 待公告"，对应维度按"信息不足"降级，而非用行业均值占位。
3. **孖展（融资打新）必须单独提示**。一旦用户问"打几手"或"借钱打"，输出必须包含一行杠杆风险提示，且不得默认推荐孖展方案。

四种情形要能分辨：

- **招股期内 + 数据齐全** → 走单股完整分析（场景一），输出四维评分 + 招股书精华 + 申购参考。
- **没有具体标的，只问"最近"** → 走日历模式（场景二），输出未来 4 周打新日程 + 每只一句话评级。
- **已上市 ≤ 30 天，用户问"没打中追不追"** → 走次新股追涨模式（场景四），加入暗盘 / 首日实际表现 / 当前价位与发行价偏离度，参考目标价区间，不出具"追 / 不追"指令。
- **已上市 > 30 天** → 拒绝接管，建议改用 `longbridge-stock-research` / `longbridge-fundamental`，本 Skill 不覆盖。

## Workflow

1. **识别模式**。从用户输入判定走「单股」「日历」还是「次新股」分支。模糊或多公司命中时先反问消歧；纯公司名时尝试自动解析为 `<CODE>.HK`，多匹配则列出让用户确认。
2. **市场合法性检查**。本 Skill 只接受港股主板 / GEM 标的。若输入是 `.US` / `.SH` / `.SZ` / `.SG`，直接拒绝并建议改用 `longbridge-ipo` + 对应市场的分析 Skill。
3. **工具发现（必做）**。每次执行前先 `longbridge --help` 拿当前可用子命令清单，再按 [§CLI](#cli) 的"数据需求 → 语义关键词"映射选择具体子命令。**不要把子命令名 / 标志名硬编码进对话**，CLI 会随版本演进。
4. **并行拉取数据**。按当前模式拉取必需项（详见 [§CLI](#cli)）。CLI 命令缺失 → 走 [§MCP fallback](#mcp-fallback)；MCP 工具也没有 → 走 [§WebSearch fallback](#websearch-fallback-only-for-data-longbridge-does-not-provide)；仍然拿不到 → 在对应维度标记"数据不可得"，**不要降级到行业均值或猜测**。
5. **数据一致性检查**。在评分之前做下列轻量校验：
   - 招股书发行价区间、招股期间、上市日期与 `ipo detail` 字段一致；不一致取最新一条并在附录注明冲突。
   - 基石比例、超购倍数、回拨档位若来自不同来源，必须显示各自来源行。
   - 货币：所有金额按招股书原币（默认 HKD）展示，若用户持仓币种不同，附加备注汇率换算口径而不是默默换算。
6. **四维评分**。按 `references/scoring.md` 的指标卡片、阈值、权重打分（满分 10 分）；权重总和 120%，归一化输出。三档评级的硬阈值见 `references/scoring.md` §Pass/reject matrix。**任一关键数据缺失（发行价、基石比例、超购倍数中至少两项缺失）时，不出评级，仅出"数据不足，无法评级"**。
7. **招股书精华提取（标准模式 = 详细输出）**。按 `references/scoring.md` §Prospectus extraction 的章节优先级，从招股书提取 TAM / 财务三年趋势 / 募资用途 / 增长驱动 / 管理层背景 / 风险因素。所有数字必须可溯源到原文章节。
8. **风险与申购参考**。3 条具体风险（不接受"市场风险"这种空话，须挂钩具体业务 / 财务 / 监管事实）+ 申购手数参考分稳健型 / 进取型两档，进取型须显式标杠杆放大损失。
9. **输出报告**。按 `references/output.md` 的对应模板（单股 / 日历 / 次新股 / 拒绝 / 数据不足）渲染，**结尾必为「数据来源明细」附录**，附录之后是免责声明。

## CLI

> 工具发现优先：`longbridge --help` 看当前可用子命令；构造调用前再 `longbridge <subcommand> --help` 核对参数。**下面列出的子命令是"语义示例"，以 `--help` 输出为准。**

按数据需求分类（语义关键词 → 示例子命令）：

| 数据需求                                                             | 语义关键词                                                                                     | 示例子命令                                                                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 港股 IPO 日历                                                        | `ipo` + `calendar` / `subscriptions` / `wait-listing` / `listed`                               | `longbridge ipo calendar --format json` / `longbridge ipo subscriptions --format json` / `longbridge ipo wait-listing --format json` / `longbridge ipo listed --format json` |
| 单只新股招股书摘要、发行价、时间线、基石、超购倍数                   | `ipo` + `detail`                                                                               | `longbridge ipo detail <SYMBOL> --format json`                                                                                                                               |
| 招股书章节级数据（财务摘要 / 募资用途 / 风险因素 / 管理层 / 锁定期） | 先 `longbridge ipo --help` 看 `ipo` 子命令族能否覆盖；典型情况 `ipo detail` 已展开主要章节字段 | `longbridge ipo --help` → 选合适子命令 → `longbridge ipo <sub> <SYMBOL> --format json`；仍缺章节 → WebSearch 拿 HKEXnews 原文                                                |
| 同业上市公司估值（PE / PS / PB 均值与中位数）                        | `valuation` / `peer` / `peer-comparison`                                                       | `longbridge peer-comparison <SYMBOL> --format json` / `longbridge valuation <SYMBOL> --format json`                                                                          |
| 近期港股新股首日表现（用于计算近 3 月破发率）                        | `ipo` + `listed` + `performance`                                                               | `longbridge ipo listed --format json`                                                                                                                                        |
| 恒生指数近月行情（市场时机维度）                                     | `index-quote` / `kline` + HSI                                                                  | `longbridge index-quote HSI.HK --format json` / `longbridge kline HSI.HK --period day --count 60 --format json`                                                              |
| 同行业板块近月平均涨跌                                               | `sector-monitor` / `industry-overview`                                                         | `longbridge sector-monitor --format json` / `longbridge industry-overview <SECTOR> --format json`                                                                            |
| 基石投资者公告 / 招股相关舆情                                        | `news` / `topic`                                                                               | `longbridge news <SYMBOL> --format json` / `longbridge topic <SYMBOL> --format json`                                                                                         |
| 公司基础信息（行业归属 / 注册地）                                    | `basicinfo` / `company-profile`                                                                | `longbridge basicinfo <SYMBOL> --format json` / `longbridge company-profile <SYMBOL> --format json`                                                                          |
| 次新股模式：上市后实际行情 + 暗盘相关数据                            | `quote` / `kline` / `derivatives` / `ipo` + `grey market`                                      | `longbridge quote <SYMBOL> --format json` / `longbridge kline <SYMBOL> --period day --count 60 --format json`                                                                |

并行调用：模式确定后，单股 / 次新股模式默认并行拉取 `ipo detail`、`peer-comparison`、`ipo listed`（破发率）、`index-quote HSI.HK`、`news`、`basicinfo`；招股书更深章节缺失时再按 `longbridge ipo --help` 选具体子命令补拉，仍缺则 WebSearch HKEXnews。日历模式只拉 `ipo subscriptions` + `ipo wait-listing` + `ipo listed`（计算近期破发率作为市场时机锚）。

### WebSearch fallback — only for data Longbridge does not provide

WebSearch 是兜底，**不是默认路径**。仅在 Longbridge CLI + MCP 都拿不到时使用，且必须在附录显式标 `[WebSearch — <publisher>, <date>, <url>]`，禁止伪造来源。

| 缺失数据                                  | WebSearch 查询模式                                                          | 可接受的来源权威                                             |
| ----------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 港交所披露易招股书原文链接                | `"<公司名>" 招股书 site:hkexnews.hk`                                        | HKEXnews（披露易）                                           |
| 行业 TAM / 增速                           | `"<行业名>" 市场规模 2030` / `"<industry>" market size 2030 Frost Sullivan` | 招股书引用机构（弗若斯特沙利文 / 灼识 / 艾瑞）、Gartner、IDC |
| 主承销商近 3 年港股 IPO 承销排名          | `"<投行名>" 香港 IPO 承销 排名 2024` / `"HK IPO league table" 2024 sponsor` | Dealogic、Refinitiv、HKEx 年报                               |
| 基石投资者公告原文 / 历史投资记录         | `"<基石投资者名>" "<公司名>" 基石`                                          | 港交所披露、彭博、路透、公司新闻稿                           |
| 暗盘成交价 / 灰市报价（次新股模式）       | `"<公司名>" 暗盘 报价 / grey market price`                                  | 富途、辉立、耀才、华盛等公开暗盘平台报价（注明平台与时间戳） |
| 近 3 个月港股新股破发率（CLI 数据不够时） | `"港股新股" "破发率" 2025` / `"HK IPO first-day return" YTD`                | 智通财经、华兴、HKEx 月报                                    |
| 监管 / 政策风险（特定行业）               | `"<sector>" 港股 监管 2025`                                                 | SFC、HKEx、FT、Reuters                                       |

每条 WebSearch 引用必须在附录写明 publisher + 报告 / 文章名 + 日期 + URL + 抓取时间；任何"无法核实出处"的数字一律按"数据不可得"处理。

## Output

输出由 `references/output.md` 模板驱动，按用户输入语言整体翻译后发出。三类主报告 + 两类异常报告：

- **场景 A — 单只新股深度分析**（招股期内或刚开始招股）：评级条 → 核心数据卡 → 四维评分明细 → 招股书精华（行业空间 / 商业模式 / 三年财务表 / 募资用途 / 增长驱动 / 管理层）→ 3 条具体风险 → 申购手数参考（稳健 / 进取，附孖展提示）→ 延伸查询入口 → **数据来源明细附录** → 免责声明。
- **场景 B — 打新日历**：未来 4 周日程表（公司名 / 截止日 / 上市日 / 募资规模 / 评级）→ 1–2 只重点关注 + 一句话理由 → 市场整体打新环境评估（基于近 3 月破发率） → **数据来源明细附录** → 免责声明。
- **场景 C — 次新股追涨**：上市首日实际表现（开 / 收 / 振幅 / 当前价偏离发行价幅度）→ 简化四维（重点强调"市场时机"与"基本面展望"）→ 参考目标价区间（基于同业估值倒推，明确标"区间"非"目标点"）→ 3 条具体风险（强调追高与流动性）→ **数据来源明细附录** → 免责声明。
- **异常 D — 数据不足，无法评级**：列出已尝试拉取但缺失的关键字段 → 引导用户等待招股截止日下午（超购倍数公告）或刷新数据源 → **数据来源明细附录**（仍然印出已成功获取的部分） → 免责声明。
- **异常 E — 拒绝接管**：非港股 / 已上市 > 30 天 / 介绍上市 / SPAC 等，给出原因与替代 Skill 推荐，不再进入分析。

字数约束：场景 A 快速模式（仅评级 + 核心数据 + 四维评分 + 风险 + 申购参考）≤ 400 字；详细模式（含完整招股书精华）≤ 2000 字。场景 B / C / D / E ≤ 800 字。

> **数据来源明细附录是强制输出**。无论评级、日历、追涨、数据不足、拒绝接管哪条分支，都必须以「数据来源明细」结尾，每一行须包含：字段类别 / 来源（CLI 子命令 / MCP 工具 / WebSearch URL）/ 抓取时间（YYYY-MM-DD HH:MM）/ 数据期间。WebSearch 行必须额外给出 publisher + 报告名 + 文章日期。任何数据缺失项必须在附录里以 `[unavailable]` 或 `[未披露 — 等待公告]` 注明。

## Error handling

| Situation                                     | 简体回复                                                                                                                        | 繁體回覆                                                                                                                        | English reply                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `command not found: longbridge`               | 回退到 MCP；若 MCP 也不可用，请安装 longbridge-terminal。                                                                       | 回退到 MCP；若 MCP 也不可用，請安裝 longbridge-terminal。                                                                       | Fall back to MCP; if MCP unavailable install longbridge-terminal.                                                               |
| stderr `not logged in` / `unauthorized`       | 本 Skill 公开数据无需登录；若是 `ipo orders` / `ipo profit-loss` 等账户接口，请运行 `longbridge auth login` 并选择 Trade 权限。 | 本 Skill 公開數據無需登入；若是 `ipo orders` / `ipo profit-loss` 等帳戶接口，請執行 `longbridge auth login` 並選擇 Trade 權限。 | Public data needs no login; for `ipo orders` / `ipo profit-loss` run `longbridge auth login` with Trade scope.                  |
| 非港股 IPO 输入                               | 本 Skill 仅覆盖港股主板与 GEM，美股 / A 股请用 `longbridge-ipo` + 对应市场的分析 Skill。                                        | 本 Skill 僅覆蓋港股主板與 GEM，美股 / A 股請用 `longbridge-ipo` + 對應市場的分析 Skill。                                        | This skill covers HK Main Board + GEM only; for US / A-share IPOs use `longbridge-ipo` + a market-specific analysis skill.      |
| 已上市 > 30 天的标的                          | 本 Skill 已不覆盖，请改用 `longbridge-stock-research` / `longbridge-fundamental`。                                              | 本 Skill 已不覆蓋，請改用 `longbridge-stock-research` / `longbridge-fundamental`。                                              | Out of scope; switch to `longbridge-stock-research` / `longbridge-fundamental`.                                                 |
| 介绍上市 / SPAC / 债券上市                    | 本 Skill 仅评估有募资的常规 IPO，不分析介绍上市 / SPAC / 债券。                                                                 | 本 Skill 僅評估有募資的常規 IPO，不分析介紹上市 / SPAC / 債券。                                                                 | Listings without fundraising (介绍上市 / SPAC / bond listing) are out of scope.                                                 |
| 关键数据 ≥ 2 项缺失（发行价、基石、超购倍数） | 不出评级，仅出「数据不足，无法评级」并在附录列出缺失项。                                                                        | 不出評級，僅出「資料不足，無法評級」並在附錄列出缺失項。                                                                        | Do not emit a rating; emit "Insufficient data — no rating" and list missing fields in the appendix.                             |
| 超购倍数尚未公布（招股期未结束）              | 在「发行质量」维度标「等待招股截止日下午公告」，不强行评分。                                                                    | 在「發行質量」維度標「等待招股截止日下午公告」，不強行評分。                                                                    | Tag the "Issue quality" dimension "awaiting close-of-book disclosure"; do not force-score.                                      |
| WebSearch 找不到引用源                        | 该数据点附录写 `[unavailable]`，对应章节给定性描述而非编造数字。                                                                | 該數據點附錄寫 `[unavailable]`，對應章節給定性描述而非編造數字。                                                                | Tag the row `[unavailable]`; qualitative discussion only — never fabricate.                                                     |
| 用户问孖展具体杠杆产品                        | 本 Skill 不推荐具体孖展产品；提示杠杆风险并引导至客服或 Longbridge 孖展页面。                                                   | 本 Skill 不推薦具體孖展產品；提示槓桿風險並引導至客服或 Longbridge 孖展頁面。                                                   | This skill does not recommend specific margin products; surface leverage risk and redirect to support / Longbridge margin page. |
| 其他 stderr                                   | 原样透传错误，不静默重试。                                                                                                      | 原樣透傳錯誤，不靜默重試。                                                                                                      | Surface stderr verbatim; never silently retry.                                                                                  |
