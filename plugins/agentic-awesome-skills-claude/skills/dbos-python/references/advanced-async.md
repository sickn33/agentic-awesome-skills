---
title: Use Async Workflows Correctly
impact: LOW
impactDescription: Enables non-blocking I/O in workflows
tags: async, coroutine, await, asyncio
---

## Use Async Workflows Correctly

Coroutine (async) functions can be DBOS workflows. Use async-specific methods and patterns.

**Incorrect (mixing sync and async):**

```python
@DBOS.workflow()
async def async_workflow():
    # Don't use sync sleep in async workflow!
    DBOS.sleep(10)

    # Don't use sync start_workflow for async workflows
    handle = DBOS.start_workflow(other_async_workflow)
```

**Correct (async patterns):**

```python
import asyncio
import aiohttp

@DBOS.step()
async def fetch_async():
    async with aiohttp.ClientSession() as session:
        async with session.get("https://example.com") as response:
            return await response.text()

@DBOS.workflow()
async def async_workflow():
    # Use async sleep
    await DBOS.sleep_async(10)

    # Await async steps
    result = await fetch_async()

    # Use async start_workflow
    handle = await DBOS.start_workflow_async(other_async_workflow)

    return result
```

### Running Async Steps In Parallel

You can run async steps in parallel if they are started in **deterministic order**:

**Correct (deterministic start order):**

```python
@DBOS.workflow()
async def parallel_workflow():
    # Start steps in deterministic order, then await together
    tasks = [
        asyncio.create_task(step1("arg1")),
        asyncio.create_task(step2("arg2")),
        asyncio.create_task(step3("arg3")),
    ]
    # Use return_exceptions=True for proper error handling
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

**Incorrect (non-deterministic order):**

```python
@DBOS.workflow()
async def bad_parallel_workflow():
    async def seq_a():
        await step1("arg1")
        await step2("arg2")  # Order depends on step1 timing

    async def seq_b():
        await step3("arg3")
        await step4("arg4")  # Order depends on step3 timing

    # step2 and step4 may run in either order - non-deterministic!
    await asyncio.gather(seq_a(), seq_b())
```

If you need concurrent sequences, use child workflows instead of interleaving steps.

For transactions in async workflows, use `asyncio.to_thread`:

```python
@DBOS.transaction()
def sync_transaction(data):
    DBOS.sql_session.execute(...)

@DBOS.workflow()
async def async_workflow():
    result = await asyncio.to_thread(sync_transaction, data)
```

Reference: [Async Workflows](https://docs.dbos.dev/python/tutorials/workflow-tutorial#coroutine-async-workflows)
