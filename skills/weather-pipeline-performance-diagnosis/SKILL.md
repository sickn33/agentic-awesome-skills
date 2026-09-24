---
name: weather-pipeline-performance-diagnosis
description: "Diagnose slow weather-data workflows by measuring discovery, transfer, parsing, scientific processing, and rendering separately before changing code."
category: data
risk: safe
source: self
source_type: self
date_added: "2026-09-24"
author: ShianMike
tags: [weather, performance, profiling, diagnostics, pipelines]
tools: [claude, cursor, gemini, codex]
---

# Weather Pipeline Performance Diagnosis

## Overview

Find the stage that actually makes a weather workflow slow before optimizing it.
Measure the real runtime path from source discovery through the final artifact,
including optional companion data and fallback work.

This skill diagnoses latency and throughput. It does not prescribe a particular
data provider, file format, decoder, or optimization.

## When to Use This Skill

- A fetch, sounding, map, animation, or batch job feels slower than before.
- A parser or native backend is blamed without stage-level timing evidence.
- Local runs and packaged or hosted runs have different performance.
- A cache, provider fallback, optional enrichment, or rendering step may hide
  the real cost.
- A proposed performance fix needs a repeatable before-and-after comparison.

Do not activate this skill for a correctness bug unless performance is also part
of the observed failure.

## Reproduce the Real Path

Record one fixed workload before editing code:

- requested source, time, location, variables, and output;
- application commit and runtime version;
- active implementation or backend, including fallback reason;
- cold-cache or warm-cache state;
- machine, operating system, worker count, and relevant resource limits;
- bytes transferred and final artifact size;
- whether optional guidance, overlays, or secondary sources were enabled.

Use the same workload for the baseline and candidate measurement. A faster run
with fewer inputs or a warm cache is not evidence that the original path
improved.

## Divide the Pipeline into Stages

At minimum, time these boundaries independently:

1. request validation and source discovery;
2. availability checks and fallback selection;
3. network transfer or cache read;
4. parsing or decoding;
5. supplemental-data retrieval;
6. profile, grid, or derived-value construction;
7. visualization or export;
8. cleanup and final publication.

Add sub-stages only where the first pass shows meaningful time. Preserve the
existing behavior while instrumenting; diagnostics must not silently disable
expensive work.

## Lightweight Timing Example

Use a monotonic clock and emit structured records that can be compared across
runs:

```python
import json
import time
from contextlib import contextmanager


@contextmanager
def timed_stage(name, report):
    started = time.perf_counter()
    outcome = "ok"
    try:
        yield
    except BaseException:
        outcome = "error"
        raise
    finally:
        report.append({
            "stage": name,
            "outcome": outcome,
            "seconds": round(time.perf_counter() - started, 6),
        })


timings = []
with timed_stage("source_discovery", timings):
    source = discover_source()
with timed_stage("transfer", timings):
    local_path = fetch_source(source)
with timed_stage("processing", timings):
    result = build_result(local_path)

print(json.dumps(timings, sort_keys=True))
```

Instrument production boundaries or the same public APIs used by production.
Avoid a benchmark helper that bypasses the path users report as slow.

## Interpret the Evidence

- Long discovery with little transfer suggests broad listings, excessive
  retries, provider timeouts, or repeated availability probes.
- Long transfer with expected parsing time suggests bandwidth, object size,
  throttling, or failure to reuse a valid cache.
- Long parsing requires proof that the intended backend is active and that the
  input volume is comparable.
- Long processing after parsing points to interpolation, secondary retrieval,
  profile construction, or repeated computation.
- Long rendering can come from layout, rasterization, font loading, excessive
  redraws, or large output dimensions.
- High variance across identical runs suggests external services, contention,
  cold starts, garbage collection, or uncontrolled parallelism.

Measure wall time, CPU time, bytes, item counts, cache state, and worker count
where they explain the result. A single total duration cannot locate a
bottleneck.

## Validate a Fix

1. Preserve the baseline report and environment description.
2. Change the smallest shared cause supported by the measurements.
3. Rerun the identical workload several times in the same cache state.
4. Compare the affected stage, total duration, output identity, and resource
   use.
5. Run correctness tests for the changed path.
6. Report both improvement and measurement variability.

Do not call a slowdown fixed when only a suspected backend, log message, or
microbenchmark changed. Require an end-to-end result from the reported path.

## Verification Checklist

- The measured workload matches the user's slow workflow.
- Active backend and fallback state are observed, not inferred.
- Network, parsing, processing, rendering, and cleanup are separate timings.
- Cold and warm cache results are labeled.
- Optional or supplemental work remains visible.
- Baseline and candidate use equivalent inputs, outputs, and worker settings.
- The fix has correctness checks plus repeatable before-and-after evidence.

## Security & Safety Notes

- Remove credentials, signed URLs, private paths, and sensitive coordinates
  from timing reports before sharing them.
- Bound benchmark repetitions, downloads, concurrency, and disk usage.
- Do not disable certificate verification or safety checks to improve timing.
- Avoid profiling production services in a way that increases load without
  authorization.
- Keep diagnostic logs from capturing raw private datasets unnecessarily.

## Common Pitfalls

- **The decoder is blamed first:** Transfer or supplemental data dominates.
  Measure each boundary before changing the decoder.
- **The candidate looks faster:** It used a warm cache or smaller request.
  Restore equivalent conditions.
- **A unit benchmark passes:** The real application takes a fallback or render
  path the benchmark omits. Measure the application entry point.
- **A timing limit is raised:** No stage-level regression analysis was done.
  Inspect evidence and rerun before changing a budget.
- **Parallelism increases latency:** Workers contend for network, memory, or
  decoder resources. Measure throughput and resource saturation together.

## Limitations

- External-service latency and hosted-runner capacity can remain variable even
  with correct instrumentation.
- Instrumentation has overhead; keep it lightweight and measure coarse stages
  before adding fine-grained probes.
- This skill identifies bottlenecks but does not determine whether an expensive
  scientific operation is necessary or meteorologically appropriate.
