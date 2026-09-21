# longbridge-ml-strategy

Walk-forward machine-learning framework for stock direction prediction. Fetches historical OHLCV data, engineers technical features, trains a rolling classifier (Random Forest or Gradient Boosting), generates probabilistic buy/sell signals, and evaluates backtest performance.

## Dependencies

Requires: `scikit-learn`, `pandas`, `numpy` (usually pre-installed).
Optional: `xgboost` or `lightgbm` for gradient-boosting models.
If unavailable, fall back to a simpler logistic-regression model.

## Workflow

1. Fetch 504 daily candles (≈ 2 years):
   `longbridge kline <SYMBOL> --period day --count 504 --format json`

2. **Feature engineering** (compute on rolling windows):
   - MACD line and signal (EMA12 − EMA26, signal EMA9)
   - RSI-14
   - Bollinger Band width: (upper − lower) / mid, window 20
   - Volume change rate: (vol*t − vol*{t-5}) / vol\_{t-5}
   - 5-day price momentum: (close*t / close*{t-5}) − 1
   - Label: 1 if close\_{t+5} > close_t × 1.01, 0 if < close_t × 0.99, else drop

3. **Walk-forward training**:
   - Training window: 252 days; retrain every 60 days
   - Model: `RandomForestClassifier(n_estimators=100)` or `GradientBoostingClassifier`
   - Predict probability for the current bar

4. **Signal generation**:
   - prob > 0.60 → 模型上涨概率偏高 / Model upside probability elevated
   - prob < 0.40 → 模型下跌概率偏高 / Model downside probability elevated
   - Otherwise → 模型无方向性预测 / No directional signal from model

5. **Backtest metrics** (on out-of-sample predictions):
   - Win rate (% correct directional calls)
   - Profit factor (gross profit / gross loss)
   - Annualised Sharpe ratio (assuming daily rebalance)
   - Max drawdown

6. **Feature importance**: rank top-5 features by mean decrease in impurity.

Run `longbridge kline --help` to confirm flag names before calling.

## CLI

```bash
longbridge kline --help

longbridge kline <SYMBOL> --period day --count 504 --format json
```

## Output

| Metric             | 简体     | 繁體     | English            |
| ------------------ | -------- | -------- | ------------------ |
| Current signal     | 当前信号 | 當前訊號 | Current signal     |
| Signal probability | 预测概率 | 預測概率 | Signal probability |
| Win rate           | 胜率     | 勝率     | Win rate           |
| Profit factor      | 盈亏比   | 盈虧比   | Profit factor      |
| Sharpe ratio       | 夏普比率 | 夏普比率 | Sharpe ratio       |
| Max drawdown       | 最大回撤 | 最大回撤 | Max drawdown       |
| Top features       | 重要特征 | 重要特徵 | Top features       |

Output: current signal box → backtest summary table → feature importance list → caveats (past performance, data snooping). Cite **Longbridge Securities** / **数据来源：长桥证券** / **數據來源：長橋證券**.

> 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。
> The above is for reference only and does not constitute investment advice. Investment decisions should be made based on your own risk tolerance.

## Error handling

| Situation                        | 简体回复                                                         | 繁體回復                                  | English reply                                   |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP 或提示安装 longbridge-terminal                        | 回退到 MCP 或提示安裝 longbridge-terminal | Fall back to MCP or install longbridge-terminal |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`                                   | 請執行 `longbridge auth login`            | Run `longbridge auth login`                     |
| `scikit-learn` not found         | 提示 `pip install scikit-learn pandas numpy`，并改用逻辑回归降级 | 提示安裝，降級至邏輯回歸                  | Prompt install; degrade to logistic regression  |
| Fewer than 252 candles           | 数据不足，无法完成 walk-forward 训练                             | 數據不足                                  | Insufficient data for walk-forward              |
| Other stderr                     | 直接显示原始错误                                                 | 直接顯示原始錯誤                          | Surface verbatim                                |
