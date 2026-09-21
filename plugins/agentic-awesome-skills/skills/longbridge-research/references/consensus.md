# longbridge-consensus

Prompt-only analysis skill. Orchestrates Longbridge CLI commands to surface analyst consensus estimates, estimate revision trends, beat/miss history, and post-earnings announcement drift (PEAD) signals.

## CLI

Run `longbridge --help` to see all available subcommands, then `longbridge <subcommand> --help` before calling. Types of data needed (call concurrently):

- Coverage count, buy/hold/sell distribution, consensus target price
- Revenue / EPS estimates (high / low / mean / median)
- Forward EPS by period
- Institution rating distribution + median target price
- Rating and target price change history (for revision trend — run `--help` for available history flags)

```bash
longbridge <subcommand> TSLA.US --format json   # run --help for available flags and subcommand names
```

## Workflow

1. **Resolve symbol** to `<CODE>.<MARKET>` format.
2. **Determine scope** from the user prompt:

   | Prompt intent                      | Data to fetch                                                |
   | ---------------------------------- | ------------------------------------------------------------ |
   | Consensus snapshot                 | Coverage count + buy/hold/sell + EPS estimates + forward EPS |
   | Rating distribution / target price | Institution rating distribution + median target              |
   | Revision trend                     | Rating and target price change history                       |
   | Beat / miss analysis               | EPS actuals vs consensus mean                                |
   | PEAD signal                        | EPS actuals + consensus + price context                      |

3. **In-LLM analysis**:

   | Quantity                        | Method                                                                                                                                                                            |
   | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
   | **Estimate revision direction** | Compare current mean EPS vs prior period from rating history; rising / flat / falling                                                                                             |
   | **Beat / miss**                 | Actual EPS vs consensus mean; beat threshold > +2%                                                                                                                                |
   | **PEAD signal**                 | Consecutive beats + upward revisions → positive momentum; consecutive misses + downward revisions → negative momentum. **Note**: PEAD is a statistical tendency, not a guarantee. |
   | **Surprise %**                  | `(Actual − Estimate) /                                                                                                                                                            | Estimate | × 100%` |

4. Output structured report; cite **Longbridge Securities**; end with disclaimer.

## Output template

```
{Symbol} ({code}) Analyst Consensus — Source: Longbridge Securities
As of: {date}

[Coverage & ratings]
- Analysts covering: N  |  Buy: X / Hold: Y / Sell: Z
- Median target price: {price} ({currency})  |  Upside from last: ±X%

[EPS consensus]
- Current-quarter estimate: mean {X}, range [{low} – {high}]
- Next-quarter estimate:    mean {X}, range [{low} – {high}]
- FY estimate:              mean {X}, range [{low} – {high}]

[Revenue consensus]
- Current-quarter estimate: mean {X}  YoY ±Y%
- FY estimate:              mean {X}  YoY ±Y%

[Estimate revision trend]
- Direction (past 30/90 days): {rising / flat / falling}
- Key revisions: {summary from rating/target price change history}

[Beat / miss history (last 4 quarters)]
| Quarter | Actual EPS | Estimate | Surprise % |
|---------|-----------|----------|-----------|
| {Q}     | {A}       | {E}      | {±X%}     |
...

[PEAD signal]
- Pattern: {N consecutive beats / misses / mixed}
- Revision bias: {upward / neutral / downward}
- PEAD inference: {positive momentum / neutral / negative momentum}
⚠️ PEAD is a statistical tendency, not a forecast.

⚠️ 以上数据仅供参考，不构成投资建议。/ 以上數據僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

(Omit sections where data is unavailable; state so explicitly.)

## Error handling

| Situation                            | 简体中文回复                                                  | 繁體中文 / English                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `command not found: longbridge`      | 回退到 MCP；如 MCP 也不可用，请用户安装 longbridge-terminal。 | 回退到 MCP；如也不可用，請安裝 longbridge-terminal。/ Fall back to MCP; if also unavailable, tell user to install longbridge-terminal. |
| stderr `not logged in`               | 请运行 `longbridge auth login` 登录。                         | 請執行 `longbridge auth login`。/ Run `longbridge auth login`.                                                                         |
| Consensus data has < 3 analysts      | 覆盖分析师不足 3 位，一致预期仅供参考。                       | 覆蓋分析師不足 3 位，僅供參考。/ Fewer than 3 analysts — consensus is indicative only.                                                 |
| Analyst estimates data returns empty | "{symbol} 暂无分析师预期数据。"                               | "{symbol} 暫無分析師預期。" / "{symbol} has no analyst estimates."                                                                     |
| No actuals for beat/miss             | 跳过超预期/低于预期分析，注明无历史实际值。                   | 跳過超預期分析，注明無歷史數據。/ Skip beat/miss analysis; note no historical actuals available.                                       |
| Other stderr                         | 直接显示原始错误，不静默重试。                                | 顯示原始錯誤。/ Surface verbatim — do not retry silently.                                                                              |
