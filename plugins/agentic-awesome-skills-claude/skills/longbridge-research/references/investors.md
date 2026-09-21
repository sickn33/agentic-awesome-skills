# longbridge-investors

Prompt-only skill. Provides a **fund-manager–centric** view of SEC 13F filings via the Longbridge CLI — who the biggest players are, what a specific manager holds, and how their portfolio changed quarter over quarter.

## CLI

Run `longbridge investors --help` to verify exact flags before use. Common calls:

```bash
# Top-50 active fund managers by AUM (includes CIK for each)
longbridge investors --format json

# Full portfolio snapshot for a specific manager
longbridge investors <CIK> --format json
longbridge investors 0001067983 --format json    # Berkshire Hathaway (Buffett)
longbridge investors 0001364742 --format json    # BlackRock

# Limit to top N positions by market value
longbridge investors <CIK> --top 20 --format json

# Quarter-over-quarter holding changes
longbridge investors changes <CIK> --format json
longbridge investors changes 0001067983 --format json

# Help
longbridge investors --help
```

Well-known CIKs (verify via the top-50 list first):

| Manager                      | CIK        |
| ---------------------------- | ---------- |
| Berkshire Hathaway (Buffett) | 0001067983 |
| BlackRock                    | 0001364742 |

## Workflow

1. **Identify intent**: ranking → run `investors`; portfolio snapshot → run `investors <CIK>`; changes → run `investors changes <CIK>`.
2. **Resolve CIK** if not provided: run `longbridge investors --format json` to get the top-50 list and find the matching manager's CIK.
3. **Fetch data** concurrently where possible.
4. **Present results**:
   - Ranking: table of rank / manager name / AUM / CIK.
   - Portfolio snapshot: table of symbol / shares / market value / % of portfolio; note filing date and reporting period.
   - Changes: group by action (NEW / ADDED / REDUCED / EXITED); show symbol, shares delta, value delta.
5. Cite **Longbridge Securities / SEC 13F**; add disclaimer.

## Output

**Ranking** — _Top-50 institutional investors_

```
Rank | Manager                   | AUM (USD B) | CIK
  1  | BlackRock                 | 10,200      | 0001364742
  2  | Vanguard Group            | 8,400       | 0000102909
  …
```

**Portfolio snapshot** — _Berkshire Hathaway as of {filing date}_

```
Symbol     | Shares (M) | Market Value (USD M) | % Portfolio
AAPL.US    | 905.6      | 174,300              | 47.2%
BAC.US     | 1,032.8    | 35,100               | 9.5%
…
```

**Changes** — _Berkshire Hathaway: Q4 2024 → Q1 2025_

```
NEW:     OXY.US (+18.9M shares, +$1.1B)
ADDED:   AAPL.US (+3.2M, +$620M)
REDUCED: BYD.US (−5.0M, −$280M)
EXITED:  HPQ.US (−7.2M, −$195M)
```

⚠️ 13F 数据滞后约 45 天，仅供参考，不构成投资建议。  
⚠️ 13F 數據滯後約 45 天，僅供參考，不構成投資建議。  
⚠️ 13F filings lag ~45 days. For reference only. Not investment advice.

## Error handling

| Situation                       | 简体中文回复                                                                | 繁體中文 / English                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `command not found: longbridge` | 回退到 MCP；如也不可用，请安装 longbridge-terminal。                        | 回退到 MCP；如也不可用，請安裝 longbridge-terminal。/ Fall back to MCP; if unavailable, install longbridge-terminal. |
| `investors` returns empty       | "暂无 13F 数据，CIK 可能有误，请用 `longbridge investors` 列出前50名确认。" | "暫無 13F 數據，請確認 CIK。" / "No 13F data — verify CIK via `longbridge investors`."                               |
| CIK not found in top-50         | 提示用户运行 `longbridge investors --format json` 获取完整 CIK 列表。       | 提示用戶查看完整 CIK 列表。/ Ask user to run `longbridge investors` for the full CIK list.                           |
| Other stderr                    | 直接显示原始错误，不静默重试。                                              | 顯示原始錯誤。/ Surface verbatim — do not retry silently.                                                            |
