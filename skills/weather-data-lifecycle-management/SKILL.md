---
name: weather-data-lifecycle-management
description: "Manage ownership, retention, and cleanup of downloaded weather data across one-shot jobs, interactive viewers, caches, failures, and cancellation."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-24"
author: ShianMike
tags: [weather, data-lifecycle, cleanup, caching, desktop-apps]
tools: [claude, cursor, gemini, codex]
---

# Weather Data Lifecycle Management

## Overview

Keep downloaded and derived weather data for exactly as long as its consumer
needs it. Make ownership explicit so one-shot jobs clean promptly, interactive
views retain their inputs until close, and shared caches are never deleted as
request cleanup.

This skill governs lifetime and ownership. It does not choose a provider,
decode scientific data, or define a cache eviction policy by itself.

## When to Use This Skill

- A completed render leaves large temporary files behind.
- An interactive view fails because its backing data was deleted too early.
- Cancellation or exceptions leak partial downloads and derived files.
- Request-owned files and a shared user cache are mixed together.
- Background workers transfer ownership of data to a UI or later processing
  stage.

## Classify Every Path

Assign each file or directory one owner and one lifetime:

| Class | Owner | Delete when |
| --- | --- | --- |
| Request workspace | One operation | Operation finishes or fails after durable outputs are saved |
| Interactive-session data | Viewer or session | Final consumer closes or display creation fails |
| Shared cache | Cache manager | Explicit eviction policy permits it |
| User export | User | Never as automatic request cleanup |
| Partial file | Active writer | Failure, cancellation, or successful atomic promotion |

If ownership cannot be stated, do not delete the path. Resolve ownership first.

## One-Shot Workflow

Use a request-specific temporary directory, keep all transient downloads and
intermediate products inside it, and copy or atomically move only the requested
artifact to its durable destination.

```python
from pathlib import Path
from tempfile import TemporaryDirectory


def render_once(destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(prefix="weather-job-") as workspace:
        workspace = Path(workspace)
        source = fetch_into(workspace)
        temporary_output = render(source, workspace / "result.png")
        temporary_output.replace(destination)

    return destination
```

The final artifact must live outside the temporary directory. If replacement
across filesystems is not atomic, copy to a temporary file beside the final
destination, verify it, then replace locally.

## Interactive Workflow

An interactive consumer outlives the worker that created its data. Transfer
ownership only after the viewer or session is successfully created:

1. The worker owns the request workspace during acquisition.
2. If acquisition or display creation fails, the worker cleans it immediately.
3. On successful display, attach one idempotent cleanup callback to the real
   consumer close or destroyed event.
4. The consumer becomes the owner; the worker must not also delete the data in
   its ordinary `finally` path.
5. If multiple consumers share the same data, release it only after the final
   lease closes.

Do not tie cleanup to a temporary dialog, local variable, or signal that can
fire before the actual consumer is finished.

## Failure and Cancellation Rules

- Keep incomplete downloads under a distinct suffix or directory so they cannot
  be mistaken for valid data.
- Close datasets, file handles, and memory maps before removing their paths.
- Put request-owned cleanup in `finally`, but exclude resources whose ownership
  was successfully transferred.
- Make cleanup idempotent; a cancellation signal and a close event may race.
- Preserve a durable partial-result manifest when the user can retry remaining
  work.
- On cleanup failure, report the exact owned path without deleting broader
  parent directories.

## Shared Cache Boundary

- A request may read or populate a shared cache but does not own the cache root.
- Promote validated entries atomically; never expose a partial file as a hit.
- Use cache identity and eviction metadata rather than deleting files by age or
  filename guesswork inside request code.
- Do not place user exports inside a directory that normal cache cleanup owns.
- Test that two concurrent consumers do not remove data still leased by the
  other.

## Verification Checklist

- Every created path has a named owner and deletion event.
- One-shot operations retain only requested durable outputs.
- Interactive data remains available until the final consumer closes.
- Display-creation failure cleans immediately.
- Exceptions and cancellation remove partial request-owned files.
- Cleanup is idempotent and closes open handles first.
- Shared caches and user exports are outside request cleanup scope.
- Tests exercise success, failure, cancellation, and close-event paths.

## Security & Safety Notes

- Resolve and verify cleanup targets before recursive deletion.
- Never delete a home directory, workspace root, shared cache root, or user-
  selected directory as a computed fallback.
- Avoid globs and unresolved environment variables for destructive cleanup.
- Do not follow untrusted symlinks or junctions outside the owned workspace.
- Keep sensitive temporary data in an access-controlled location and remove it
  when its approved lifetime ends.
- Report material cleanup failures instead of silently leaving private data.

## Common Pitfalls

- **The image renders but source data leaks:** Cleanup is absent from the
  one-shot `finally` path or data was written outside the request workspace.
- **The viewer opens and then breaks:** The worker deleted data immediately
  after emitting the viewer. Transfer ownership to the viewer close event.
- **Cancellation deletes useful completed work:** Durable artifacts and
  request-owned intermediates share a directory. Separate them.
- **A cache disappears:** Request cleanup treated a shared cache as owned data.
  Delegate eviction to the cache manager.
- **Windows refuses deletion:** A dataset or mapped file is still open. Close
  every consumer before cleanup.

## Limitations

- Multi-process leases require coordination beyond an in-memory reference
  count.
- Some decoders create files outside their requested directory; configure or
  inventory those outputs before promising complete cleanup.
- Lifecycle correctness prevents leaks and premature deletion but does not
  validate the scientific contents of retained data.
