# Understanding Hangs in Your App (Summary)

Context: Apple guidance on identifying hangs caused by long-running main-thread work and understanding the main run loop.

## Key concepts

- A hang is a noticeable delay in a discrete interaction (typically >100 ms).
- Hangs almost always come from long-running work on the main thread.
- The main run loop processes UI events, timers, and main-queue work sequentially.

## Main-thread work stages

- Event delivery to the correct view/handler.
- Your code: state updates, data fetch, UI changes.
- Core Animation commit to the render server.

## Why the main run loop matters

- Only the main thread can update UI safely.
- The run loop is the foundation that executes main-queue work.
- If the run loop is busy, it can’t handle new events; this causes hangs.

## Diagnosing hangs

- Observe the main run loop’s busy periods: healthy loops sleep most of the time.
- Hang detection typically flags busy periods >250 ms.
- The Hangs instrument can be configured to lower thresholds.

## Practical takeaways

- Keep main-thread work short; offload heavy work from event handlers.
- Avoid long-running tasks on the main dispatch queue or main actor.
- Use run loop behavior as a proxy for user-perceived responsiveness.
