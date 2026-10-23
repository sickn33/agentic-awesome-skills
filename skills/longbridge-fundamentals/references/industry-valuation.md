# longbridge-industry-valuation

Prompt-only analysis skill. Fetches Longbridge industry-valuation data to produce a cross-peer matrix, percentile ranking, and premium/discount analysis for a target stock within its industry.

## CLI

Run `longbridge industry-valuation --help` to verify exact flags. Call concurrently:

```bash
# Peer comparison matrix
longbridge industry-valuation TSLA.US --format json

# Percentile distribution in the industry
longbridge industry-valuation dist TSLA.US --format json

# With explicit currency normalisation (verify flag with --help)
longbridge industry-valuation TSLA.US --currency USD --format json
longbridge industry-valuation 700.HK  --currency HKD --format json
longbridge industry-valuation 600519.SH --currency CNY --format json

# If unsure about any flag:
longbridge industry-valuation --help
```

## Workflow

1. **Resolve symbol** to `<CODE>.<MARKET>`. Multiple unrelated sectors → run per symbol.
2. **Call CLI concurrently**: `industry-valuation <symbol>` + `industry-valuation dist <symbol>`.
3. If `longbridge` is not installed, fall back to MCP.
4. **In-LLM analysis**:

   | Quantity                        | Method                                                                                                                                    |
   | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
   | **Industry premium / discount** | `(target PE − industry median PE) / industry median PE × 100%`                                                                            |
   | **Percentile rank**             | Position of target in the `dist` distribution; bucket into low (<33rd) / mid (33–67th) / high (>67th pct)                                 |
   | **Multi-metric view**           | Repeat for PB, PS, dividend yield — note when metrics diverge                                                                             |
   | **Cross-currency caveat**       | If peers span markets (USD / HKD / CNY), each ratio needs numerator/denominator in compatible currency, same share basis and period; normalize absolute market caps, and check ADR ratios/accounting differences |

5. **Flag cyclical industries** (energy, materials, shipping, banks, property): PE can invert near cycle peaks/troughs — add caveat.
6. Output structured report; cite **Longbridge Securities**; end with disclaimer.

## Output template

```
{Symbol} ({code}) Industry Valuation — Source: Longbridge Securities
Industry: {industry_name}  |  Peers in sample: N  |  Currency: {currency}

[Peer valuation matrix]
| Symbol | PE (TTM) | PB | PS | Div Yield |
|--------|---------|----|----|-----------|
| {sym}  | {PE}    | {PB}| {PS}| {Y%}    |
| ...    | ...     | ...|... | ...       |
| {TARGET} ★ | {PE} | {PB} | {PS} | {Y%} |
| Industry median | {PE} | {PB} | {PS} | {Y%} |

[Industry premium / discount]
- vs industry median PE: {TARGET} trades at {+N% premium / −N% discount}
- vs industry median PB: {+N% / −N%}
- vs industry median PS: {+N% / −N%}

[Industry percentile rank]
- PE percentile: {N}th  → {low / mid / high} valuation bucket
- PB percentile: {N}th
- Overall: {valuation characterisation}

[Context]
{1–2 sentences on why premium/discount may be justified: growth rate, margins, moat, or flag if stretched}

{Cyclical caveat if applicable}

⚠️ 以上数据仅供参考，不构成投资建议。/ 以上數據僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

(State "data unavailable" for any section that returns no data; do not invent values.)

## Error handling

| Situation                          | 简体中文回复                                                  | 繁體中文 / English                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `command not found: longbridge`    | 回退到 MCP；如 MCP 也不可用，请用户安装 longbridge-terminal。 | 回退到 MCP；如也不可用，請安裝 longbridge-terminal。/ Fall back to MCP; if also unavailable, tell user to install longbridge-terminal. |
| stderr `not logged in`             | 请运行 `longbridge auth login` 登录。                         | 請執行 `longbridge auth login`。/ Run `longbridge auth login`.                                                                         |
| `industry-valuation` returns empty | "{symbol} 暂无行业估值数据（可能为新上市或行业覆盖不足）。"   | "{symbol} 暫無行業估值數據。" / "{symbol} has no industry valuation data (newly listed or insufficient coverage)."                     |
| Industry sample < 5 peers          | 注明"同业样本较少，百分位仅供参考"。                          | 注明"同業樣本不足"。/ Caveat: "industry sample sparse; percentile is indicative only."                                                 |
| `dist` returns empty               | 跳过百分位分析，仅展示对比矩阵。                              | 跳過百分位分析。/ Skip percentile analysis; show matrix only.                                                                          |
| Cross-currency peers               | 添加汇率差异提示，不对市值类指标做绝对比较。                  | 添加匯率差異提示。/ Flag FX differences; do not compare market-cap metrics absolutely.                                                 |
| Other stderr                       | 直接显示原始错误，不静默重试。                                | 顯示原始錯誤。/ Surface a redacted error summary — do not retry silently.                                                                              |
