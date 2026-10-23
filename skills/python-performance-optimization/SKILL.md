---
name: python-performance-optimization
description: "Profile and optimize Python code using cProfile, memory profilers, and performance best practices. Use when debugging slow Python code, optimizing bottlenecks, or improving application performance."
risk: safe
source: community
date_added: "2026-02-27"
---

# Python Performance Optimization

Comprehensive guide to profiling, analyzing, and optimizing Python code for better performance, including CPU profiling, memory optimization, and implementation best practices.

## Use this skill when

- Identifying performance bottlenecks in Python applications
- Reducing application latency and response times
- Optimizing CPU-intensive operations
- Reducing memory consumption and memory leaks
- Improving database query performance
- Optimizing I/O operations
- Speeding up data processing pipelines
- Implementing high-performance algorithms
- Profiling production applications

## Do not use this skill when

- The task is unrelated to python performance optimization
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Measurement and operational limits

The playbook contains standalone demonstrations, not a validated benchmark suite. No timings or speedups are established by this skill. Use representative inputs, equal work, repeated runs and recorded interpreter/platform versions. The Fibonacci comparison measures 1 uncached call against 1,000 mostly warm calls; normalize per call and report cold/warm states separately. `lru_cache(maxsize=None)` retains entries without a bound; choose eviction and invalidation for changing or sensitive data.

`sys.getsizeof` is shallow: a regular instance also owns a `__dict__` and references shared or separately allocated values. The printed object-size multiplication is not total process memory or a fair complete comparison with slots. Measure representative allocations with tracemalloc or an appropriate process profiler.

Use only approved test endpoints and disposable databases; the query example opens an existing database read-only and requires the shown schema. Production profiling requires authorization and bounded collection: profiles can expose code paths, arguments or other sensitive process data. Store artifacts privately. The examples have not been executed or performance-tested here.
