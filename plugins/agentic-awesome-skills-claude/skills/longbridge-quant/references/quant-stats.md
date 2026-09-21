# longbridge-quant-stats

Apply rigorous statistical methods to financial time-series data retrieved from Longbridge — test assumptions before modelling, diagnose residuals, and produce statistically sound inferences.

## Prerequisites

```bash
pip install statsmodels scipy numpy pandas
```

## Workflow and test catalogue

### Step 1 — Fetch price data

```bash
longbridge kline --help
longbridge kline <SYMBOL> --period day --count 252 --format json
```

Extract the `close` price series. Compute log returns: `r_t = ln(P_t / P_{t-1})`.

### Step 2 — Stationarity: ADF Unit Root Test

**When to use**: Before regression or time-series modelling — most models require stationary series.

**Python (statsmodels)**:

```python
from statsmodels.tsa.stattools import adfuller
result = adfuller(series, autolag='AIC')
# result: (adf_stat, p_value, lags, n_obs, critical_values, icbest)
```

**Interpretation**:

- p < 0.05 → reject unit root → series is stationary.
- p ≥ 0.05 → fail to reject → series has unit root → difference the series.
- Log prices: usually non-stationary. Log returns: usually stationary.

### Step 3 — Cointegration Test

**When to use**: Two non-stationary series may share a long-run equilibrium (pairs trading).

**Engle-Granger (two-series)**:

```python
from statsmodels.tsa.stattools import coint
t_stat, p_value, critical_values = coint(series_A, series_B)
# p < 0.05 → cointegrated
```

**Johansen (multivariate)**:

```python
from statsmodels.tsa.vector_ar.vecm import coint_johansen
result = coint_johansen(df, det_order=0, k_ar_diff=1)
# trace statistic vs critical values at 90%/95%/99%
```

Report: test statistic, p-value, critical values, and cointegrating vector.

### Step 4 — GARCH Volatility Modelling

**When to use**: Financial returns show volatility clustering (ARCH effects).

```python
from arch import arch_model
model = arch_model(returns * 100, vol='Garch', p=1, q=1)
res = model.fit(disp='off')
print(res.summary())
```

Note: `pip install arch` required in addition to statsmodels.

**Output**: omega, alpha (ARCH), beta (GARCH) coefficients. Persistence = alpha + beta. If > 0.95, volatility is highly persistent.

**ARCH-LM test first** (to verify ARCH effects exist):

```python
from statsmodels.stats.diagnostic import het_arch
lm_stat, p_value, f_stat, f_p = het_arch(residuals)
```

### Step 5 — Regression Diagnostics

After running OLS (`statsmodels.api.OLS`), check:

| Test          | Purpose                             | Command                                                          |
| ------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Durbin-Watson | Serial autocorrelation in residuals | `statsmodels.stats.stattools.durbin_watson(resid)`               |
| Breusch-Pagan | Heteroskedasticity                  | `statsmodels.stats.diagnostic.het_breuschpagan(resid, exog)`     |
| Jarque-Bera   | Normality of residuals              | `statsmodels.stats.stattools.jarque_bera(resid)`                 |
| VIF           | Multicollinearity                   | `statsmodels.stats.outliers_influence.variance_inflation_factor` |

Interpret Durbin-Watson: ~2.0 = no autocorrelation; < 1.5 = positive autocorrelation; > 2.5 = negative autocorrelation.

### Step 6 — Bootstrap Confidence Intervals

**When to use**: Non-normal distributions; small samples; estimating CI for Sharpe ratio, IC, or any statistic.

```python
import numpy as np

def bootstrap_ci(data, stat_fn, n_boot=10000, ci=0.95):
    boots = [stat_fn(np.random.choice(data, len(data), replace=True))
             for _ in range(n_boot)]
    lo = np.percentile(boots, (1 - ci) / 2 * 100)
    hi = np.percentile(boots, (1 + ci) / 2 * 100)
    return lo, hi

# Example: Sharpe ratio CI
sharpe_lo, sharpe_hi = bootstrap_ci(returns, lambda x: x.mean() / x.std() * np.sqrt(252))
```

### Step 7 — Hypothesis Tests

| Test                | Use case                                    | Function                                     |
| ------------------- | ------------------------------------------- | -------------------------------------------- |
| t-test (one sample) | Is mean IC > 0?                             | `scipy.stats.ttest_1samp(ic_series, 0)`      |
| t-test (two sample) | Is long portfolio return > short portfolio? | `scipy.stats.ttest_ind(long_ret, short_ret)` |
| F-test / ANOVA      | Are returns different across deciles?       | `scipy.stats.f_oneway(*decile_returns)`      |
| Mann-Whitney U      | Non-parametric alternative to t-test        | `scipy.stats.mannwhitneyu(a, b)`             |

Always report: test statistic, p-value, degrees of freedom, and conclusion at 5% significance level.

## CLI

```bash
longbridge kline --help
longbridge kline <SYMBOL> --period day --count 252 --format json
```

## Output

For each test present:

1. Test name and null hypothesis.
2. Test statistic and p-value.
3. Critical values (where applicable).
4. Conclusion at 5% significance.
5. Practical implication for the user's use case.

## Error handling

| Situation                             | 简体回复                                              | 繁體回覆                                              | English reply                                                  |
| ------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `command not found: longbridge`       | 请安装 longbridge-terminal 或检查 MCP 配置。          | 請安裝 longbridge-terminal 或檢查 MCP 配置。          | Install longbridge-terminal or check MCP config.               |
| `ModuleNotFoundError: statsmodels`    | 请运行 `pip install statsmodels scipy numpy pandas`。 | 請執行 `pip install statsmodels scipy numpy pandas`。 | Run `pip install statsmodels scipy numpy pandas`.              |
| Insufficient data (< 30 observations) | 样本量过小，统计结论可靠性有限，建议延长数据期。      | 樣本量過小，建議延長數據期。                          | Sample too small; extend the data period for reliable results. |
| ARCH module missing for GARCH         | 请运行 `pip install arch` 以使用 GARCH 模型。         | 請執行 `pip install arch` 以使用 GARCH 模型。         | Run `pip install arch` for GARCH modelling.                    |
