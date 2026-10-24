# longbridge-valuation-rank

Prompt-only skill. Fetches the **time series of a stock's valuation rank within its industry** — each data point shows where the stock sits among peers (e.g., rank 3 out of 28) for PE, PB, PS, and dividend yield.

## CLI

Run `longbridge valuation-rank --help` to verify exact flags. Common calls:

```bash
# Past 1 year (default) — PE / PB / PS / dividend-yield ranks
longbridge valuation-rank AAPL.US --format json

# Custom date range
longbridge valuation-rank AAPL.US --start 20250101 --end 20251231 --format json
longbridge valuation-rank 700.HK --start 20240101 --end 20251231 --format json

# Help — always verify flags
longbridge valuation-rank --help
```

## Workflow

1. **Resolve symbol** to `<CODE>.<MARKET>` format.
2. **Run** `longbridge valuation-rank <SYMBOL> --format json` (add `--start` / `--end` if the user specifies a range; otherwise omit for the default 1-year window).
3. **Parse** the time series. Each data point includes a `timestamp` and sub-objects for `pe`, `pb`, `ps`, `dvd` — each containing `rank` and `total`.
4. **Compute trend** for each indicator:
   - Verify metric sort direction and peer membership first; a changing rank is not inherently improvement or deterioration.
   - If rank 1 is lowest positive multiple, an ascending rank-position is `(rank - 1) / (total - 1) * 100` for total > 1; define tie handling. Reverse only when explicitly labeling a cheapness score. Verify dividend-yield ordering separately.
   - Identify any notable inflection points (large rank jumps).
5. **Present** as a summary table + trend narrative; omit indicators where data is sparse.

## Output

**AAPL.US — Industry valuation rank history (past 1 year)**
Source: Longbridge Securities

```
Date       | PE rank | PB rank | PS rank | Dvd rank | Peers (n)
2025-01-31 |  8 / 32 |  5 / 32 | 12 / 32 |  28 / 32 | 32
2025-02-28 |  9 / 32 |  5 / 32 | 11 / 32 |  27 / 32 | 32
…
```

_Trend summary_: PE rank improved from 12→8 (valuation became relatively cheaper vs peers) over the period; dividend yield rank remained near bottom (low yield vs peers).

⚠️ 排名数据仅供参考，不构成投资建议。
⚠️ 排名數據僅供參考，不構成投資建議。
⚠️ For reference only. Not investment advice.

## Error handling

| Situation                       | 简体中文回复                                              | 繁體中文 / English                                                                                                   |
| ------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `command not found: longbridge` | 回退到 MCP；如也不可用，请安装 longbridge-terminal。      | 回退到 MCP；如也不可用，請安裝 longbridge-terminal。/ Fall back to MCP; if unavailable, install longbridge-terminal. |
| `valuation-rank` returns empty  | "{symbol} 暂无行业估值排名数据，可能不支持该市场或标的。" | "{symbol} 暫無行業估值排名。" / "{symbol} has no industry valuation rank data."                                      |
| `total` = 0 or null             | 跳过该指标，注明无同行数据。                              | 跳過該指標，注明無同行數據。/ Skip the indicator and note no peer data.                                              |
| Other stderr                    | 直接显示原始错误，不静默重试。                            | 顯示原始錯誤。/ Surface a redacted error summary — do not retry silently.                                                            |
