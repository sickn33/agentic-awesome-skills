# Benchmark runner example

Supply the project's actual model and metric adapters and an already authorized, sanitized, materialized dataset. The pure control flow below does not supply inference, retrieval, external judges or a dataset. Bind tool versions, held-out coverage, hosted data/cost approval and a total run deadline before connecting a real model. Exceptions are incomplete runs, never a passed benchmark; retain the failed case and repair/re-run before publishing aggregate claims.

```python
import math
import numpy as np

class BenchmarkRunner:
    def __init__(self, benchmark_dataset, max_examples=1000):
        if not isinstance(max_examples, int) or max_examples < 1:
            raise ValueError("Positive example limit required")
        if not benchmark_dataset or len(benchmark_dataset) > max_examples:
            raise ValueError("Require a nonempty bounded materialized dataset")
        self.dataset = benchmark_dataset

    def run_benchmark(self, model, metrics):
        names = [metric.name for metric in metrics]
        if not names or len(set(names)) != len(names):
            raise ValueError("Require distinct declared metrics")
        results = {name: [] for name in names}
        for example in self.dataset:
            prediction = model.predict(example["input"])
            for metric in metrics:
                score = metric.calculate(prediction=prediction,
                    reference=example["reference"], context=example.get("context"))
                if not isinstance(score, (int, float)) or not math.isfinite(score):
                    raise ValueError("Missing or nonfinite metric result")
                results[metric.name].append(score)
        return {name: {"mean": np.mean(scores), "std": np.std(scores),
                       "min": min(scores), "max": max(scores)}
                for name, scores in results.items()}
```

Report dataset/model/metric identity, actual coverage, failed cases, observation count and uncertainty alongside these descriptive statistics. A successful local fake-adapter example is not a real model benchmark, and these aggregates do not establish factual accuracy, safety or legal compliance.
