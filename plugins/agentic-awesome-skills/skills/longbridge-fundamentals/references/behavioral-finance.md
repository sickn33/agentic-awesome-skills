# longbridge-behavioral-finance

Apply behavioral finance theory to identify exploitable market inefficiencies — map common cognitive biases to measurable price/volume patterns using Longbridge data.

## Bias catalogue and tradeable signals

### 1. Overreaction (过度反应)

**Theory**: Investors overweight recent bad/good news, pushing prices beyond fundamental value. De Bondt & Thaler (1985).

**Signal**: Long-term reversal. Historical reversal findings depend on sample and horizon; a 30–50% fall does not establish subsequent outperformance.

**Detect**:

```bash
longbridge kline <SYMBOL> --period day --count 252 --format json
```

Compare 12M return vs peer group. If a stock is in the bottom 10% of sector returns, screen for reversal setup.

### 2. Underreaction (反应不足)

**Theory**: Investors are slow to update beliefs; price drifts gradually toward fair value after earnings surprises.

**Signal**: Post-earnings announcement drift (PEAD). A positive surprise may be followed by drift in some historical samples; this is not a buy rule or a forecast.

**Detect**: Use `longbridge-earnings` to identify beats. Track price drift with `longbridge kline --period day --count 60`.

### 3. Disposition Effect (处置效应)

**Theory**: Investors sell winners too early and hold losers too long (Shefrin & Statman, 1985).

**Market impact**: Selling pressure on recent winners creates resistance near recent highs; support near cost basis concentrations.

**Detect**: Capital-flow aggregates do not identify retail profit-taking or investor motives; assess alternative explanations.

```bash
longbridge capital <SYMBOL> --format json
```

### 4. Anchoring Bias (锚定效应)

**Theory**: Investors anchor to arbitrary reference prices (52-week high, IPO price, round numbers).

**Signal**: 52-week high breakout tends to persist (stocks resist breaking prior highs but accelerate once broken).

**Detect**: Fetch 52-week high from `longbridge calc-index <SYMBOL> --format json` or static data.

### 5. Herding (羊群效应)

**Theory**: Investors follow the crowd, amplifying trends beyond fundamentals.

**Signal**: Abnormal volume + price acceleration without fundamental catalyst = herding. Also: analyst consensus clustering.

**Detect**:

```bash
longbridge market-temp --format json          # Market sentiment index 0-100
longbridge capital <SYMBOL> --format json     # Capital flow concentration
```

If market temperature > 80 and a single sector dominates capital inflow → herding warning.

### 6. Overconfidence (过度自信)

**Theory**: Investors overestimate precision of their forecasts, leading to under-diversification and excess trading.

**Market impact**: High turnover in bull markets; individual stocks show higher volatility than fundamentals justify.

**Detect**: Turnover rate spike from `longbridge quote <SYMBOL> --format json` (turnover_rate field).

## Workflow

1. Identify which bias the user is asking about (or scan all six).
2. Fetch relevant data (kline / market-temp / capital flow).
3. Map observed price/volume pattern to the bias.
4. Quantify signal strength: magnitude, duration, persistence.
5. Suggest a trading implication (entry / exit / avoid) with explicit caveats.

## CLI

```bash
longbridge kline --help
longbridge market-temp --help
longbridge capital --help

longbridge market-temp --format json
longbridge kline <SYMBOL> --period day --count 60 --format json
longbridge capital <SYMBOL> --format json
```

## Output

Present:

1. Identified bias and academic basis.
2. Observable evidence from Longbridge data (specific numbers).
3. Tradeable implication (signal direction, horizon, conviction).
4. Risks: when the bias does not persist (e.g. mean-reversion fails in trending markets).
5. Disclaimer: behavioral signals are probabilistic, not deterministic.

## Error handling

| Situation                       | 简体回复                                           | 繁體回覆                                     | English reply                                                        |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `command not found: longbridge` | 请安装 longbridge-terminal 或检查 MCP 配置。       | 請安裝 longbridge-terminal 或檢查 MCP 配置。 | Install longbridge-terminal or check MCP config.                     |
| stderr: `not logged in`         | 请运行 `longbridge auth login`。                   | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                                         |
| Insufficient price history      | 历史数据不足，无法可靠识别偏差信号，请延长观察期。 | 歷史數據不足，請延長觀察期。                 | Insufficient history to identify bias reliably; extend the lookback. |
