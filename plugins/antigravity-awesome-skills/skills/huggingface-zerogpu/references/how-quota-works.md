# How ZeroGPU duration and quota are checked

Mechanism for `duration` validation and quota pre-checks. Useful when choosing `duration` values, debugging `illegal duration` vs `quota exceeded` errors, and understanding why the default 60s is pessimistic for short tasks.

For per-tier numerical thresholds (free vs Pro vs Team vs Enterprise quota minutes), the daily quota window length, runs-per-day limits, and pay-as-you-go pricing, see [the ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) — those values change over time and are deliberately kept out of this skill.

## What `duration` actually requests

Whatever value is passed to `@spaces.GPU(duration=N)` (or the default 60s when unspecified) becomes the `requested duration` the platform checks against. For `xlarge`, the request is doubled internally:

```
requested = N * 2 if size == "xlarge" else N
```

So `@spaces.GPU(duration=60, size="xlarge")` is internally a 120-second request — both for the tier-max check and the quota pre-check below.

## Two distinct error modes

Two failure messages can come back from the scheduler before the call runs:

| Error | Trigger | What helps |
|---|---|---|
| **`ZeroGPU illegal duration`** | `requested duration > visitor's tier per-call cap` | Lower `duration`. Sign in / upgrade tier. **Waiting does not help.** |
| **`ZeroGPU quota exceeded`** | `remaining quota < requested duration`, OR runs-per-day cap reached | Wait for the quota window to reset. For Pro / Team / Enterprise, pay-as-you-go credits cover the overflow. |

The error wording for `quota exceeded` includes the explicit numbers, e.g.:

```
You have exceeded your Pro ZeroGPU quota
(60s requested vs. 30s left). Try again in 1:23:45.
```

The comparison is **`requested` vs `remaining`** — not `actual run time` vs `remaining`. A 10-second task left at the default 60s requests 60s of quota; once `remaining < 60s` the call fails even though the actual work would have fit.

## Why the default 60s is pessimistic for short tasks

`DEFAULT_SCHEDULE_DURATION` in the `spaces` package is **60 seconds**. So an undecorated `@spaces.GPU` (or `@spaces.GPU()` with no `duration=`) requests 60s of quota.

For a task that actually takes ~10 seconds:

- The user's 60s quota gets reserved up front.
- Once their remaining quota drops below 60s, your Space fails for them — even though they could have run many more 10s tasks if the request matched reality.
- Your call also ranks lower in the queue than equivalent calls declaring smaller durations.

The fix is to declare the realistic duration explicitly:

```python
@spaces.GPU(duration=15)
def fast_task(...):
    ...
```

For workloads where runtime depends on inputs, use a callable (per-request estimator):

```python
def estimate_duration(prompt, steps):
    return int(steps * 3.5)

@spaces.GPU(duration=estimate_duration)
def variable_task(prompt, steps):
    ...
```

This preserves quota for light inputs and reserves more only when needed.

## Quota window: 24h fixed from first use

The quota window's TTL is set when the first call of a fresh window lands and counts down unconditionally — it is not a sliding window, not a calendar-day reset, and not extended by subsequent use. A user who runs a call at 14:00 sees their next reset at 14:00 the following day, regardless of how heavily or lightly they use the Space in between.

For exact tier thresholds, runs-per-day caps, and pay-as-you-go billing rates, see the [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu).

## Queue priority

The queue is **node-level** — requests from every Space scheduled on the same physical node compete for that node's GPU slots. Among queued requests, **shorter declared `duration` ranks higher**. So tight per-request `duration` estimates serve two goals at once: they preserve the user's quota and move the request up the queue.
