# Backtesting Frameworks Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Core Concepts

### 1. Backtesting Biases

| Bias | Description | Mitigation |
|------|-------------|------------|
| **Look-ahead** | Using future information | Point-in-time data |
| **Survivorship** | Only testing on survivors | Use delisted securities |
| **Overfitting** | Curve-fitting to history | Out-of-sample testing |
| **Selection** | Cherry-picking strategies | Pre-registration |
| **Transaction** | Ignoring trading costs | Realistic cost models |

### 2. Proper Backtest Structure

```
Historical Data
      │
      ▼
┌─────────────────────────────────────────┐
│              Training Set               │
│  (Strategy Development & Optimization)  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│             Validation Set              │
│  (Parameter Selection, No Peeking)      │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│               Test Set                  │
│  (Final Performance Evaluation)         │
└─────────────────────────────────────────┘
```

### 3. Walk-Forward Analysis

```
Window 1: [Train──────][Test]
Window 2:     [Train──────][Test]
Window 3:         [Train──────][Test]
Window 4:             [Train──────][Test]
                                     ─────▶ Time
```

## Implementation Patterns

### Pattern 1: Event-Driven Backtester

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional
import pandas as pd
import numpy as np

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"

@dataclass
class Order:
    symbol: str
    side: OrderSide
    quantity: Decimal
    order_type: OrderType
    limit_price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    timestamp: Optional[datetime] = None

@dataclass
class Fill:
    order: Order
    fill_price: Decimal
    fill_quantity: Decimal
    commission: Decimal
    slippage: Decimal
    timestamp: datetime

@dataclass
class Position:
    symbol: str
    quantity: Decimal = Decimal("0")
    avg_cost: Decimal = Decimal("0")
    realized_pnl: Decimal = Decimal("0")

    def update(self, fill: Fill) -> None:
        if fill.order.side == OrderSide.BUY:
            new_quantity = self.quantity + fill.fill_quantity
            if new_quantity != 0:
                self.avg_cost = (
                    (self.quantity * self.avg_cost + fill.fill_quantity * fill.fill_price)
                    / new_quantity
                )
            self.quantity = new_quantity
        else:
            self.realized_pnl += fill.fill_quantity * (fill.fill_price - self.avg_cost)
            self.quantity -= fill.fill_quantity

@dataclass
class Portfolio:
    cash: Decimal
    positions: Dict[str, Position] = field(default_factory=dict)

    def get_position(self, symbol: str) -> Position:
        if symbol not in self.positions:
            self.positions[symbol] = Position(symbol=symbol)
        return self.positions[symbol]

    def process_fill(self, fill: Fill) -> None:
        position = self.get_position(fill.order.symbol)
        position.update(fill)

        if fill.order.side == OrderSide.BUY:
            self.cash -= fill.fill_price * fill.fill_quantity + fill.commission
        else:
            self.cash += fill.fill_price * fill.fill_quantity - fill.commission

    def get_equity(self, prices: Dict[str, Decimal]) -> Decimal:
        equity = self.cash
        for symbol, position in self.positions.items():
            if position.quantity != 0 and symbol in prices:
                equity += position.quantity * prices[symbol]
        return equity

class Strategy(ABC):
    @abstractmethod
    def on_bar(self, timestamp: datetime, data: pd.DataFrame) -> List[Order]:
        pass

    @abstractmethod
    def on_fill(self, fill: Fill) -> None:
        pass

class ExecutionModel(ABC):
    @abstractmethod
    def execute(self, order: Order, bar: pd.Series) -> Optional[Fill]:
        pass

class SimpleExecutionModel(ExecutionModel):
    def __init__(self, slippage_bps: float = 10, commission_per_share: float = 0.01):
        self.slippage_bps = slippage_bps
        self.commission_per_share = commission_per_share

    def execute(self, order: Order, bar: pd.Series) -> Optional[Fill]:
        if order.order_type == OrderType.MARKET:
            base_price = Decimal(str(bar["open"]))

            # Apply slippage
            slippage_mult = 1 + (self.slippage_bps / 10000)
            if order.side == OrderSide.BUY:
                fill_price = base_price * Decimal(str(slippage_mult))
            else:
                fill_price = base_price / Decimal(str(slippage_mult))

            commission = order.quantity * Decimal(str(self.commission_per_share))
            slippage = abs(fill_price - base_price) * order.quantity

            return Fill(
                order=order,
                fill_price=fill_price,
                fill_quantity=order.quantity,
                commission=commission,
                slippage=slippage,
                timestamp=bar.name
            )
        return None

class Backtester:
    def __init__(
        self,
        strategy: Strategy,
        execution_model: ExecutionModel,
        initial_capital: Decimal = Decimal("100000")
    ):
        self.strategy = strategy
        self.execution_model = execution_model
        self.portfolio = Portfolio(cash=initial_capital)
        self.equity_curve: List[tuple] = []
        self.trades: List[Fill] = []

    def run(self, data: pd.DataFrame) -> pd.DataFrame:
        """Run backtest on OHLCV data with DatetimeIndex."""
        pending_orders: List[Order] = []

        for timestamp, bar in data.iterrows():
            # Execute pending orders at today's prices
            for order in pending_orders:
                fill = self.execution_model.execute(order, bar)
                if fill:
                    self.portfolio.process_fill(fill)
                    self.strategy.on_fill(fill)
                    self.trades.append(fill)

            pending_orders.clear()

            # Get current prices for equity calculation
            prices = {data.index.name or "default": Decimal(str(bar["close"]))}
            equity = self.portfolio.get_equity(prices)
            self.equity_curve.append((timestamp, float(equity)))

            # Generate new orders for next bar
            new_orders = self.strategy.on_bar(timestamp, data.loc[:timestamp])
            pending_orders.extend(new_orders)

        return self._create_results()

    def _create_results(self) -> pd.DataFrame:
        equity_df = pd.DataFrame(self.equity_curve, columns=["timestamp", "equity"])
        equity_df.set_index("timestamp", inplace=True)
        equity_df["returns"] = equity_df["equity"].pct_change()
        return equity_df
```

### Pattern 2: Vectorized Backtester (Fast)

```python
import pandas as pd
import numpy as np
from typing import Callable, Dict, Any

class VectorizedBacktester:
    """Fast vectorized backtester for simple strategies."""

    def __init__(
        self,
        initial_capital: float = 100000,
        commission: float = 0.001,  # 0.1%
        slippage: float = 0.0005   # 0.05%
    ):
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage

    def run(
        self,
        prices: pd.DataFrame,
        signal_func: Callable[[pd.DataFrame], pd.Series]
    ) -> Dict[str, Any]:
        """
        Run backtest with signal function.

        Args:
            prices: DataFrame with 'close' column
            signal_func: Function that returns position signals (-1, 0, 1)

        Returns:
            Dictionary with results
        """
        # Generate signals (shifted to avoid look-ahead)
        signals = signal_func(prices).shift(1).fillna(0)

        # Calculate returns
        returns = prices["close"].pct_change()

        # Calculate strategy returns with costs
        position_changes = signals.diff().abs()
        trading_costs = position_changes * (self.commission + self.slippage)

        strategy_returns = signals * returns - trading_costs

        # Build equity curve
        equity = (1 + strategy_returns).cumprod() * self.initial_capital

        # Calculate metrics
        results = {
            "equity": equity,
            "returns": strategy_returns,
            "signals": signals,
            "metrics": self._calculate_metrics(strategy_returns, equity)
        }

        return results

    def _calculate_metrics(
        self,
        returns: pd.Series,
        equity: pd.Series
    ) -> Dict[str, float]:
        """Calculate performance metrics."""
        total_return = (equity.iloc[-1] / self.initial_capital) - 1
        annual_return = (1 + total_return) ** (252 / len(returns)) - 1
        annual_vol = returns.std() * np.sqrt(252)
        sharpe = annual_return / annual_vol if annual_vol > 0 else 0

        # Drawdown
        rolling_max = equity.cummax()
        drawdown = (equity - rolling_max) / rolling_max
        max_drawdown = drawdown.min()

        # Win rate
        winning_days = (returns > 0).sum()
        total_days = (returns != 0).sum()
        win_rate = winning_days / total_days if total_days > 0 else 0

        return {
            "total_return": total_return,
            "annual_return": annual_return,
            "annual_volatility": annual_vol,
            "sharpe_ratio": sharpe,
            "max_drawdown": max_drawdown,
            "win_rate": win_rate,
            "num_trades": int((returns != 0).sum())
        }

# Example usage
def momentum_signal(prices: pd.DataFrame, lookback: int = 20) -> pd.Series:
    """Simple momentum strategy: long when price > SMA, else flat."""
    sma = prices["close"].rolling(lookback).mean()
    return (prices["close"] > sma).astype(int)

# Run backtest
# backtester = VectorizedBacktester()
# results = backtester.run(price_data, lambda p: momentum_signal(p, 50))
```

### Pattern 3: Walk-Forward Optimization

```python
from typing import Callable, Dict, List, Tuple, Any
import pandas as pd
import numpy as np
from itertools import product

class WalkForwardOptimizer:
    """Walk-forward analysis with anchored or rolling windows."""

    def __init__(
        self,
        train_period: int,
        test_period: int,
        anchored: bool = False,
        n_splits: int = None
    ):
        """
        Args:
            train_period: Number of bars in training window
            test_period: Number of bars in test window
            anchored: If True, training always starts from beginning
            n_splits: Number of train/test splits (auto-calculated if None)
        """
        self.train_period = train_period
        self.test_period = test_period
        self.anchored = anchored
        self.n_splits = n_splits

    def generate_splits(
        self,
        data: pd.DataFrame
    ) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
        """Generate train/test splits."""
        splits = []
        n = len(data)

        if self.n_splits:
            step = (n - self.train_period) // self.n_splits
        else:
            step = self.test_period

        start = 0
        while start + self.train_period + self.test_period <= n:
            if self.anchored:
                train_start = 0
            else:
                train_start = start

            train_end = start + self.train_period
            test_end = min(train_end + self.test_period, n)

            train_data = data.iloc[train_start:train_end]
            test_data = data.iloc[train_end:test_end]

            splits.append((train_data, test_data))
            start += step

        return splits

    def optimize(
        self,
        data: pd.DataFrame,
        strategy_func: Callable,
        param_grid: Dict[str, List],
        metric: str = "sharpe_ratio"
    ) -> Dict[str, Any]:
        """
        Run walk-forward optimization.

        Args:
            data: Full dataset
            strategy_func: Function(data, **params) -> results dict
            param_grid: Parameter combinations to test
            metric: Metric to optimize

        Returns:
            Combined results from all test periods
        """
        splits = self.generate_splits(data)
        all_results = []
        optimal_params_history = []

        for i, (train_data, test_data) in enumerate(splits):
            # Optimize on training data
            best_params, best_metric = self._grid_search(
                train_data, strategy_func, param_grid, metric
            )
            optimal_params_history.append(best_params)

            # Test with optimal params
            test_results = strategy_func(test_data, **best_params)
            test_results["split"] = i
            test_results["params"] = best_params
            all_results.append(test_results)

            print(f"Split {i+1}/{len(splits)}: "
                  f"Best {metric}={best_metric:.4f}, params={best_params}")

        return {
            "split_results": all_results,
            "param_history": optimal_params_history,
            "combined_equity": self._combine_equity_curves(all_results)
        }

    def _grid_search(
        self,
        data: pd.DataFrame,
        strategy_func: Callable,
        param_grid: Dict[str, List],
        metric: str
    ) -> Tuple[Dict, float]:
        """Grid search for best parameters."""
        best_params = None
        best_metric = -np.inf

        # Generate all parameter combinations
        param_names = list(param_grid.keys())
        param_values = list(param_grid.values())

        for values in product(*param_values):
            params = dict(zip(param_names, values))
            results = strategy_func(data, **params)

            if results["metrics"][metric] > best_metric:
                best_metric = results["metrics"][metric]
                best_params = params

        return best_params, best_metric

    def _combine_equity_curves(
        self,
        results: List[Dict]
    ) -> pd.Series:
        """Combine equity curves from all test periods."""
        combined = pd.concat([r["equity"] for r in results])
        return combined
```

### Pattern 4: Monte Carlo Analysis

```python
import numpy as np
import pandas as pd
from typing import Dict, List

class MonteCarloAnalyzer:
    """Monte Carlo simulation for strategy robustness."""

    def __init__(self, n_simulations: int = 1000, confidence: float = 0.95):
        self.n_simulations = n_simulations
        self.confidence = confidence

    def bootstrap_returns(
        self,
        returns: pd.Series,
        n_periods: int = None
    ) -> np.ndarray:
        """
        Bootstrap simulation by resampling returns.

        Args:
            returns: Historical returns series
            n_periods: Length of each simulation (default: same as input)

        Returns:
            Array of shape (n_simulations, n_periods)
        """
        if n_periods is None:
            n_periods = len(returns)

        simulations = np.zeros((self.n_simulations, n_periods))

        for i in range(self.n_simulations):
            # Resample with replacement
            simulated_returns = np.random.choice(
                returns.values,
                size=n_periods,
                replace=True
            )
            simulations[i] = simulated_returns

        return simulations

    def analyze_drawdowns(
        self,
        returns: pd.Series
    ) -> Dict[str, float]:
        """Analyze drawdown distribution via simulation."""
        simulations = self.bootstrap_returns(returns)

        max_drawdowns = []
        for sim_returns in simulations:
            equity = (1 + sim_returns).cumprod()
            rolling_max = np.maximum.accumulate(equity)
            drawdowns = (equity - rolling_max) / rolling_max
            max_drawdowns.append(drawdowns.min())

        max_drawdowns = np.array(max_drawdowns)

        return {
            "expected_max_dd": np.mean(max_drawdowns),
            "median_max_dd": np.median(max_drawdowns),
            f"worst_{int(self.confidence*100)}pct": np.percentile(
                max_drawdowns, (1 - self.confidence) * 100
            ),
            "worst_case": max_drawdowns.min()
        }

    def probability_of_loss(
        self,
        returns: pd.Series,
        holding_periods: List[int] = [21, 63, 126, 252]
    ) -> Dict[int, float]:
        """Calculate probability of loss over various holding periods."""
        results = {}

        for period in holding_periods:
            if period > len(returns):
                continue

            simulations = self.bootstrap_returns(returns, period)
            total_returns = (1 + simulations).prod(axis=1) - 1
            prob_loss = (total_returns < 0).mean()
            results[period] = prob_loss

        return results

    def confidence_interval(
        self,
        returns: pd.Series,
        periods: int = 252
    ) -> Dict[str, float]:
        """Calculate confidence interval for future returns."""
        simulations = self.bootstrap_returns(returns, periods)
        total_returns = (1 + simulations).prod(axis=1) - 1

        lower = (1 - self.confidence) / 2
        upper = 1 - lower

        return {
            "expected": total_returns.mean(),
            "lower_bound": np.percentile(total_returns, lower * 100),
            "upper_bound": np.percentile(total_returns, upper * 100),
            "std": total_returns.std()
        }
```

## Performance Metrics

```python
def calculate_metrics(returns: pd.Series, rf_rate: float = 0.02) -> Dict[str, float]:
    """Calculate comprehensive performance metrics."""
    # Annualization factor (assuming daily returns)
    ann_factor = 252

    # Basic metrics
    total_return = (1 + returns).prod() - 1
    annual_return = (1 + total_return) ** (ann_factor / len(returns)) - 1
    annual_vol = returns.std() * np.sqrt(ann_factor)

    # Risk-adjusted returns
    sharpe = (annual_return - rf_rate) / annual_vol if annual_vol > 0 else 0

    # Sortino (downside deviation)
    downside_returns = returns[returns < 0]
    downside_vol = downside_returns.std() * np.sqrt(ann_factor)
    sortino = (annual_return - rf_rate) / downside_vol if downside_vol > 0 else 0

    # Calmar ratio
    equity = (1 + returns).cumprod()
    rolling_max = equity.cummax()
    drawdowns = (equity - rolling_max) / rolling_max
    max_drawdown = drawdowns.min()
    calmar = annual_return / abs(max_drawdown) if max_drawdown != 0 else 0

    # Win rate and profit factor
    wins = returns[returns > 0]
    losses = returns[returns < 0]
    win_rate = len(wins) / len(returns[returns != 0]) if len(returns[returns != 0]) > 0 else 0
    profit_factor = wins.sum() / abs(losses.sum()) if losses.sum() != 0 else np.inf

    return {
        "total_return": total_return,
        "annual_return": annual_return,
        "annual_volatility": annual_vol,
        "sharpe_ratio": sharpe,
        "sortino_ratio": sortino,
        "calmar_ratio": calmar,
        "max_drawdown": max_drawdown,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "num_trades": int((returns != 0).sum())
    }
```

## Best Practices

### Do's
- **Use point-in-time data** - Avoid look-ahead bias
- **Include transaction costs** - Realistic estimates
- **Test out-of-sample** - Always reserve data
- **Use walk-forward** - Not just train/test
- **Monte Carlo analysis** - Understand uncertainty

### Don'ts
- **Don't overfit** - Limit parameters
- **Don't ignore survivorship** - Include delisted
- **Don't use adjusted data carelessly** - Understand adjustments
- **Don't optimize on full history** - Reserve test set
- **Don't ignore capacity** - Market impact matters

## Resources

- [Advances in Financial Machine Learning (Marcos López de Prado)](https://www.amazon.com/Advances-Financial-Machine-Learning-Marcos/dp/1119482089)
- [Quantitative Trading (Ernest Chan)](https://www.amazon.com/Quantitative-Trading-Build-Algorithmic-Business/dp/1119800064)
- [Backtrader Documentation](https://www.backtrader.com/docu/)
