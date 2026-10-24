# Risk Metrics Calculation Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Risk Metrics Calculation

Comprehensive risk measurement toolkit for portfolio management, including Value at Risk, Expected Shortfall, and drawdown analysis.

## When to Use This Skill

- Measuring portfolio risk
- Implementing risk limits
- Building risk dashboards
- Calculating risk-adjusted returns
- Setting position sizes
- Regulatory reporting

## Core Concepts

### 1. Risk Metric Categories

| Category | Metrics | Use Case |
|----------|---------|----------|
| **Volatility** | Std Dev, Beta | General risk |
| **Tail Risk** | VaR, CVaR | Extreme losses |
| **Drawdown** | Max DD, Calmar | Capital preservation |
| **Risk-Adjusted** | Sharpe, Sortino | Performance |

### 2. Time Horizons

```
Intraday:   Minute/hourly VaR for day traders
Daily:      Standard risk reporting
Weekly:     Rebalancing decisions
Monthly:    Performance attribution
Annual:     Strategic allocation
```

## Model and data contract

Educational calculations, not a certified risk engine, investment recommendation or regulatory model. Use decimal simple returns at one declared frequency, a sorted unique aligned index, finite values, at least two observations and no return <= -1 for the compounding examples. Define missing-data treatment before calculation; do not silently change pairwise covariance samples. Confirm currency, fees, cash flows, leverage and rebalancing assumptions. Fixed weights imply constant rebalancing and exclude its costs. Match risk-free rate, benchmark and downside target to the same periods. Square-root annualization assumes appropriate serial-independence/stationarity and is not a universal rule.

VaR/ES below use a loss sign (negative return quantile), drawdown a negative return sign. A negative VaR is possible when even the tail shows gains; do not silently clamp it. Historical tail mean is a finite-sample estimator with a disclosed percentile convention, not a guaranteed future-loss bound. Report insufficient tail samples and backtest exceptions. All fragments require the imports above.

## Implementation

### Pattern 1: Core Risk Metrics

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Optional, Tuple

class RiskMetrics:
    """Core risk metric calculations."""

    def __init__(self, returns: pd.Series, rf_rate: float = 0.02):
        """
        Args:
            returns: Series of periodic returns
            rf_rate: Annual risk-free rate
        """
        if not isinstance(returns, pd.Series) or len(returns) < 2:
            raise ValueError("At least two periodic returns required")
        if not returns.index.is_unique or not returns.index.is_monotonic_increasing:
            raise ValueError("Returns require a sorted unique index")
        if not np.isfinite(returns.to_numpy(dtype=float)).all() or (returns <= -1).any():
            raise ValueError("Finite simple returns greater than -1 required")
        if not np.isfinite(rf_rate) or rf_rate <= -1:
            raise ValueError("Invalid annual risk-free rate")
        self.returns = returns.astype(float)
        self.rf_rate = rf_rate
        self.ann_factor = 252  # Trading days per year

    # Volatility Metrics
    def volatility(self, annualized: bool = True) -> float:
        """Standard deviation of returns."""
        vol = self.returns.std()
        if annualized:
            vol *= np.sqrt(self.ann_factor)
        return vol

    def downside_deviation(self, threshold: float = 0, annualized: bool = True) -> float:
        """Root mean squared shortfall over ALL observations; threshold is periodic."""
        shortfalls = np.minimum(self.returns - threshold, 0.0)
        dd = np.sqrt(np.mean(shortfalls ** 2))
        if annualized:
            dd *= np.sqrt(self.ann_factor)
        return dd

    def beta(self, market_returns: pd.Series) -> float:
        """Beta relative to market."""
        aligned = pd.concat([self.returns, market_returns], axis=1).dropna()
        if len(aligned) < 2:
            return np.nan
        cov = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])
        return cov[0, 1] / cov[1, 1] if cov[1, 1] != 0 else np.nan

    # Value at Risk
    def var_historical(self, confidence: float = 0.95) -> float:
        """Historical VaR at confidence level."""
        return -np.percentile(self.returns, (1 - confidence) * 100)

    def var_parametric(self, confidence: float = 0.95) -> float:
        """Parametric VaR assuming normal distribution."""
        z_score = stats.norm.ppf(confidence)
        return -self.returns.mean() + z_score * self.returns.std()

    def var_cornish_fisher(self, confidence: float = 0.95) -> float:
        """VaR with Cornish-Fisher expansion for non-normality."""
        z = stats.norm.ppf(1 - confidence)  # lower RETURN tail, then negate
        s = stats.skew(self.returns)  # Skewness
        k = stats.kurtosis(self.returns)  # Excess kurtosis

        # Cornish-Fisher expansion
        z_cf = (z + (z**2 - 1) * s / 6 +
                (z**3 - 3*z) * k / 24 -
                (2*z**3 - 5*z) * s**2 / 36)

        return -(self.returns.mean() + z_cf * self.returns.std())

    # Conditional VaR (Expected Shortfall)
    def cvar(self, confidence: float = 0.95) -> float:
        """Expected Shortfall / CVaR / Average VaR."""
        var = self.var_historical(confidence)
        return -self.returns[self.returns <= -var].mean()

    # Drawdown Analysis
    def drawdowns(self) -> pd.Series:
        """Calculate drawdown series."""
        cumulative = (1 + self.returns).cumprod()
        running_max = cumulative.cummax().clip(lower=1.0)
        return (cumulative - running_max) / running_max

    def max_drawdown(self) -> float:
        """Maximum drawdown."""
        return self.drawdowns().min()

    def avg_drawdown(self) -> float:
        """Average drawdown."""
        dd = self.drawdowns()
        return dd[dd < 0].mean() if (dd < 0).any() else 0

    def drawdown_duration(self) -> Dict[str, int]:
        """Drawdown duration statistics."""
        dd = self.drawdowns()
        in_drawdown = dd < 0

        # Find drawdown periods
        drawdown_starts = in_drawdown & ~in_drawdown.shift(1).fillna(False)
        drawdown_ends = ~in_drawdown & in_drawdown.shift(1).fillna(False)

        durations = []
        current_duration = 0

        for i in range(len(dd)):
            if in_drawdown.iloc[i]:
                current_duration += 1
            elif current_duration > 0:
                durations.append(current_duration)
                current_duration = 0

        if current_duration > 0:
            durations.append(current_duration)

        return {
            "max_duration": max(durations) if durations else 0,
            "avg_duration": np.mean(durations) if durations else 0,
            "current_duration": current_duration
        }

    # Risk-Adjusted Returns
    def sharpe_ratio(self) -> float:
        """Annualized Sharpe ratio."""
        rf_period = (1 + self.rf_rate) ** (1 / self.ann_factor) - 1
        excess_return = (self.returns.mean() - rf_period) * self.ann_factor
        vol = self.volatility(annualized=True)
        return excess_return / vol if vol > 0 else np.nan

    def sortino_ratio(self) -> float:
        """Sortino ratio using downside deviation."""
        rf_period = (1 + self.rf_rate) ** (1 / self.ann_factor) - 1
        excess_return = (self.returns.mean() - rf_period) * self.ann_factor
        dd = self.downside_deviation(threshold=rf_period, annualized=True)
        return excess_return / dd if dd > 0 else np.nan

    def calmar_ratio(self) -> float:
        """Calmar ratio (return / max drawdown)."""
        annual_return = (1 + self.returns).prod() ** (self.ann_factor / len(self.returns)) - 1
        max_dd = abs(self.max_drawdown())
        return annual_return / max_dd if max_dd > 0 else np.nan

    def omega_ratio(self, threshold: float = 0) -> float:
        """Omega ratio."""
        returns_above = self.returns[self.returns > threshold] - threshold
        returns_below = threshold - self.returns[self.returns <= threshold]

        if returns_below.sum() == 0:
            return np.inf

        return returns_above.sum() / returns_below.sum()

    # Information Ratio
    def information_ratio(self, benchmark_returns: pd.Series) -> float:
        """Information ratio vs benchmark."""
        active_returns = self.returns - benchmark_returns
        tracking_error = active_returns.std() * np.sqrt(self.ann_factor)
        active_return = active_returns.mean() * self.ann_factor
        return active_return / tracking_error if tracking_error > 0 else np.nan

    # Summary
    def summary(self) -> Dict[str, float]:
        """Generate comprehensive risk summary."""
        dd_stats = self.drawdown_duration()

        return {
            # Returns
            "total_return": (1 + self.returns).prod() - 1,
            "annual_return": (1 + self.returns).prod() ** (self.ann_factor / len(self.returns)) - 1,

            # Volatility
            "annual_volatility": self.volatility(),
            "downside_deviation": self.downside_deviation(),

            # VaR & CVaR
            "var_95_historical": self.var_historical(0.95),
            "var_99_historical": self.var_historical(0.99),
            "cvar_95": self.cvar(0.95),

            # Drawdowns
            "max_drawdown": self.max_drawdown(),
            "avg_drawdown": self.avg_drawdown(),
            "max_drawdown_duration": dd_stats["max_duration"],

            # Risk-Adjusted
            "sharpe_ratio": self.sharpe_ratio(),
            "sortino_ratio": self.sortino_ratio(),
            "calmar_ratio": self.calmar_ratio(),
            "omega_ratio": self.omega_ratio(),

            # Distribution
            "skewness": stats.skew(self.returns),
            "kurtosis": stats.kurtosis(self.returns),
        }
```

### Pattern 2: Portfolio Risk

```python
class PortfolioRisk:
    """Portfolio-level risk calculations."""

    def __init__(
        self,
        returns: pd.DataFrame,
        weights: Optional[pd.Series] = None
    ):
        """
        Args:
            returns: DataFrame with asset returns (columns = assets)
            weights: Portfolio weights (default: equal weight)
        """
        self.returns = returns
        self.weights = weights if weights is not None else \
            pd.Series(1/len(returns.columns), index=returns.columns)
        self.ann_factor = 252

    def portfolio_return(self) -> float:
        """Weighted portfolio return."""
        return (self.returns @ self.weights).mean() * self.ann_factor

    def portfolio_volatility(self) -> float:
        """Portfolio volatility."""
        cov_matrix = self.returns.cov() * self.ann_factor
        port_var = self.weights @ cov_matrix @ self.weights
        return np.sqrt(port_var)

    def marginal_risk_contribution(self) -> pd.Series:
        """Marginal contribution to risk by asset."""
        cov_matrix = self.returns.cov() * self.ann_factor
        port_vol = self.portfolio_volatility()

        # Marginal contribution
        if port_vol <= 0 or not np.isfinite(port_vol):
            raise ValueError("Undefined risk contributions for zero/invalid volatility")
        mrc = (cov_matrix @ self.weights) / port_vol
        return mrc

    def component_risk(self) -> pd.Series:
        """Component contribution to total risk."""
        mrc = self.marginal_risk_contribution()
        return self.weights * mrc

    def risk_parity_weights(self, target_vol: float = None) -> pd.Series:
        """Calculate risk parity weights."""
        from scipy.optimize import minimize

        n = len(self.returns.columns)
        cov_matrix = self.returns.cov() * self.ann_factor

        def risk_budget_objective(weights):
            port_vol = np.sqrt(weights @ cov_matrix @ weights)
            if port_vol <= 0 or not np.isfinite(port_vol):
                return np.inf
            mrc = (cov_matrix @ weights) / port_vol
            rc = weights * mrc
            target_rc = port_vol / n  # Equal risk contribution
            return np.sum((rc - target_rc) ** 2)

        constraints = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},  # Weights sum to 1
        ]
        if n < 1 or n > 100:
            raise ValueError("1% floor is infeasible for this asset count")
        if target_vol is not None:
            raise NotImplementedError("Leverage/target-vol scaling is not implemented")
        bounds = [(0.01, 1.0) for _ in range(n)]  # Min 1%, max 100%
        x0 = np.array([1/n] * n)

        result = minimize(
            risk_budget_objective,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints
        )

        if not result.success or not np.isfinite(result.x).all():
            raise ValueError("Risk parity optimization failed")
        # Also inspect constraints, positive covariance and residual risk imbalance.
        return pd.Series(result.x, index=self.returns.columns)

    def correlation_matrix(self) -> pd.DataFrame:
        """Asset correlation matrix."""
        return self.returns.corr()

    def diversification_ratio(self) -> float:
        """Diversification ratio (higher = more diversified)."""
        asset_vols = self.returns.std() * np.sqrt(self.ann_factor)
        weighted_vol = (self.weights * asset_vols).sum()
        port_vol = self.portfolio_volatility()
        return weighted_vol / port_vol if port_vol > 0 else 1

    def tracking_error(self, benchmark_returns: pd.Series) -> float:
        """Tracking error vs benchmark."""
        port_returns = self.returns @ self.weights
        active_returns = port_returns - benchmark_returns
        return active_returns.std() * np.sqrt(self.ann_factor)

    def conditional_correlation(
        self,
        threshold_percentile: float = 10
    ) -> pd.DataFrame:
        """Correlation during stress periods."""
        port_returns = self.returns @ self.weights
        threshold = np.percentile(port_returns, threshold_percentile)
        stress_mask = port_returns <= threshold
        return self.returns[stress_mask].corr()
```

### Pattern 3: Rolling Risk Metrics

```python
class RollingRiskMetrics:
    """Rolling window risk calculations."""

    def __init__(self, returns: pd.Series, window: int = 63):
        """
        Args:
            returns: Return series
            window: Rolling window size (default: 63 = ~3 months)
        """
        self.returns = returns
        self.window = window

    def rolling_volatility(self, annualized: bool = True) -> pd.Series:
        """Rolling volatility."""
        vol = self.returns.rolling(self.window).std()
        if annualized:
            vol *= np.sqrt(252)
        return vol

    def rolling_sharpe(self, rf_rate: float = 0.02) -> pd.Series:
        """Rolling Sharpe ratio."""
        rolling_return = self.returns.rolling(self.window).mean() * 252
        rolling_vol = self.rolling_volatility()
        return (rolling_return - rf_rate) / rolling_vol

    def rolling_var(self, confidence: float = 0.95) -> pd.Series:
        """Rolling historical VaR."""
        return self.returns.rolling(self.window).apply(
            lambda x: -np.percentile(x, (1 - confidence) * 100),
            raw=True
        )

    def rolling_max_drawdown(self) -> pd.Series:
        """Rolling maximum drawdown."""
        def max_dd(returns):
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.cummax().clip(lower=1.0)
            drawdowns = (cumulative - running_max) / running_max
            return drawdowns.min()

        return self.returns.rolling(self.window).apply(max_dd, raw=False)

    def rolling_beta(self, market_returns: pd.Series) -> pd.Series:
        """Rolling beta vs market."""
        aligned = pd.concat([self.returns, market_returns], axis=1).dropna()
        portfolio = aligned.iloc[:, 0]
        market = aligned.iloc[:, 1]
        covariance = portfolio.rolling(self.window).cov(market)
        variance = market.rolling(self.window).var()
        return covariance / variance.replace(0, np.nan)

    def volatility_regime(
        self,
        low_threshold: float = 0.10,
        high_threshold: float = 0.20
    ) -> pd.Series:
        """Classify volatility regime."""
        vol = self.rolling_volatility()

        def classify(v):
            if pd.isna(v):
                return "unknown"
            if v < low_threshold:
                return "low"
            elif v > high_threshold:
                return "high"
            else:
                return "normal"

        return vol.apply(classify)
```

### Pattern 4: Stress Testing

```python
class StressTester:
    """Historical and hypothetical stress testing."""

    # Historical crisis periods
    HISTORICAL_SCENARIOS = {
        "2008_financial_crisis": ("2008-09-01", "2009-03-31"),
        "2020_covid_crash": ("2020-02-19", "2020-03-23"),
        "2022_rate_hikes": ("2022-01-01", "2022-10-31"),
        "dot_com_bust": ("2000-03-01", "2002-10-01"),
        "flash_crash_2010": ("2010-05-06", "2010-05-06"),
    }

    def __init__(self, returns: pd.Series, weights: pd.Series = None):
        self.returns = returns
        self.weights = weights

    def historical_stress_test(
        self,
        scenario_name: str,
        historical_data: pd.DataFrame
    ) -> Dict[str, float]:
        """Test portfolio against historical crisis period."""
        if scenario_name not in self.HISTORICAL_SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario_name}")

        start, end = self.HISTORICAL_SCENARIOS[scenario_name]

        # Get returns during crisis
        crisis_returns = historical_data.loc[start:end]
        if crisis_returns.empty:
            raise ValueError("No observations in scenario window")

        if self.weights is not None:
            port_returns = (crisis_returns @ self.weights)
        else:
            if isinstance(crisis_returns, pd.DataFrame):
                if crisis_returns.shape[1] != 1:
                    raise ValueError("Provide weights for multi-asset data")
                port_returns = crisis_returns.iloc[:, 0]
            else:
                port_returns = crisis_returns

        total_return = (1 + port_returns).prod() - 1
        max_dd = self._calculate_max_dd(port_returns)
        worst_day = port_returns.min()

        return {
            "scenario": scenario_name,
            "period": f"{start} to {end}",
            "total_return": total_return,
            "max_drawdown": max_dd,
            "worst_day": worst_day,
            "volatility": port_returns.std() * np.sqrt(252)
        }

    def hypothetical_stress_test(
        self,
        shocks: Dict[str, float]
    ) -> float:
        """
        Test portfolio against hypothetical shocks.

        Args:
            shocks: Dict of {asset: shock_return}
        """
        if self.weights is None:
            raise ValueError("Weights required for hypothetical stress test")

        if set(shocks) != set(self.weights.index):
            raise ValueError("Explicit shocks required for every asset; unknown assets rejected")
        if not all(np.isfinite(v) for v in shocks.values()):
            raise ValueError("Nonfinite shock")
        total_impact = 0
        for asset, shock in shocks.items():
            if asset in self.weights.index:
                total_impact += self.weights[asset] * shock

        return total_impact

    def monte_carlo_stress(
        self,
        n_simulations: int = 10000,
        horizon_days: int = 21,
        vol_multiplier: float = 2.0
    ) -> Dict[str, float]:
        """Monte Carlo stress test with elevated volatility."""
        mean = self.returns.mean()
        vol = self.returns.std() * vol_multiplier

        # Toy unbounded-normal model can generate returns below -1; not a
        # physically constrained price model or calibrated extreme-risk forecast.
        simulations = np.random.default_rng(42).normal(
            mean,
            vol,
            (n_simulations, horizon_days)
        )

        total_returns = (1 + simulations).prod(axis=1) - 1

        return {
            "expected_loss": -total_returns.mean(),
            "var_95": -np.percentile(total_returns, 5),
            "var_99": -np.percentile(total_returns, 1),
            "worst_simulated_loss": -total_returns.min(),
            "prob_10pct_loss": (total_returns < -0.10).mean()
        }

    def _calculate_max_dd(self, returns: pd.Series) -> float:
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.cummax().clip(lower=1.0)
        drawdowns = (cumulative - running_max) / running_max
        return drawdowns.min()
```

## Verification before use

Validate every confidence is strictly between 0 and 1, every rolling window is an integer >=2 and stress/Monte Carlo dimensions and memory are bounded. Portfolio data needs unique columns, exactly matching finite weights, declared cash/leverage and aligned complete observations; reject zero variance for beta/risk-parity rather than inventing zero risk. Validate covariance conditioning and optimization constraints/residual, not merely solver success. Validate benchmarks before alignment.

Concrete regressions: an initial -10% return must produce -10% drawdown (include initial wealth 1); lower-return-tail normal VaR must increase as confidence increases; identical market/portfolio series must yield rolling beta 1 after warmup; all-positive returns have zero downside deviation but an undefined Sortino denominator; tied/small historical tails need an explicit ES estimator. Cornish-Fisher can be nonmonotone/invalid in extreme distributions and must be rejected or compared with a validated alternative. An average drawdown across all underwater observations differs from average episode depth; duration counts observations and includes an unrecovered censored episode.

## Quick Reference

```python
# Daily usage
metrics = RiskMetrics(returns)
print(f"Sharpe: {metrics.sharpe_ratio():.2f}")
print(f"Max DD: {metrics.max_drawdown():.2%}")
print(f"VaR 95%: {metrics.var_historical(0.95):.2%}")

# Full summary
summary = metrics.summary()
for metric, value in summary.items():
    print(f"{metric}: {value:.4f}")
```

## Best Practices

### Do's
- **Use multiple metrics** - No single metric captures all risk
- **Consider tail risk** - VaR isn't enough, use CVaR
- **Rolling analysis** - Risk changes over time
- **Stress test** - Historical and hypothetical
- **Document assumptions** - Distribution, lookback, etc.

### Don'ts
- **Don't rely on VaR alone** - Underestimates tail risk
- **Don't assume normality** - Returns are fat-tailed
- **Don't ignore correlation** - Increases in stress
- **Don't use short lookbacks** - Miss regime changes
- **Don't forget transaction costs** - Affects realized risk

## Resources

- [Risk Management and Financial Institutions (John Hull)](https://www.amazon.com/Risk-Management-Financial-Institutions-5th/dp/1119448115)
- [Quantitative Risk Management (McNeil, Frey, Embrechts)](https://www.amazon.com/Quantitative-Risk-Management-Techniques-Princeton/dp/0691166277)
- [pyfolio Documentation](https://quantopian.github.io/pyfolio/)
