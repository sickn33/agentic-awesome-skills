---
title: Configure Step Retries for Transient Failures
impact: HIGH
impactDescription: Automatic retries handle transient failures without manual code
tags: step, retry, exponential-backoff, resilience
---

## Configure Step Retries for Transient Failures

Steps can automatically retry on failure with exponential backoff. This handles transient failures like network issues.

**Incorrect (manual retry logic):**

```python
@DBOS.step()
def fetch_data():
    # Manual retry logic is error-prone
    for attempt in range(3):
        try:
            return requests.get("https://api.example.com").json()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
```

**Correct (built-in retries):**

```python
@DBOS.step(retries_allowed=True, max_attempts=10, interval_seconds=1.0, backoff_rate=2.0)
def fetch_data():
    # Retries handled automatically
    return requests.get("https://api.example.com").json()
```

Retry parameters:
- `retries_allowed`: Enable automatic retries (default: False)
- `max_attempts`: Maximum retry attempts (default: 3)
- `interval_seconds`: Initial delay between retries (default: 1.0)
- `backoff_rate`: Multiplier for exponential backoff (default: 2.0)

With defaults, retry delays are: 1s, 2s, 4s, 8s, 16s...

Reference: [Configurable Retries](https://docs.dbos.dev/python/tutorials/step-tutorial#configurable-retries)
