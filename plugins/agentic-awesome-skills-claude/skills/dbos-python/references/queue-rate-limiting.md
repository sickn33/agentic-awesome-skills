---
title: Rate Limit Queue Execution
impact: HIGH
impactDescription: Prevents hitting API rate limits
tags: queue, rate-limit, api, throttle
---

## Rate Limit Queue Execution

Use rate limits when working with rate-limited APIs (like LLM APIs). Limits are global across all processes.

**Incorrect (no rate limiting):**

```python
queue = Queue("llm_tasks")

@DBOS.step()
def call_llm(prompt):
    # May hit rate limits if too many calls
    return openai.chat.completions.create(...)
```

**Correct (with rate limit):**

```python
# Max 50 tasks started per 30 seconds
queue = Queue("llm_tasks", limiter={"limit": 50, "period": 30})

@DBOS.step()
def call_llm(prompt):
    return openai.chat.completions.create(...)

@DBOS.workflow()
def process_prompts(prompts):
    handles = []
    for prompt in prompts:
        # Queue enforces rate limit
        handle = queue.enqueue(call_llm, prompt)
        handles.append(handle)
    return [h.get_result() for h in handles]
```

Rate limit parameters:
- `limit`: Maximum number of functions to start in the period
- `period`: Time period in seconds

Rate limits can be combined with concurrency limits:

```python
queue = Queue("api_tasks",
    worker_concurrency=5,
    limiter={"limit": 100, "period": 60})
```

Reference: [Rate Limiting](https://docs.dbos.dev/python/tutorials/queue-tutorial#rate-limiting)
