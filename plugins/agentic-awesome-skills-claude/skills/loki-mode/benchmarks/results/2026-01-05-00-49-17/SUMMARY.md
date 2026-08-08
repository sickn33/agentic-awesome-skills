# Loki Mode Benchmark Results

**Generated:** 2026-01-05 01:10:21

## Overview

This directory contains benchmark results for Loki Mode multi-agent system.

## HumanEval Results

| Metric | Value |
|--------|-------|
| Problems | 164 |
| Passed | 161 |
| Failed | 3 |
| **Pass Rate** | **98.17%** |
| Model | opus |
| Time | 1263.46s |

### Competitor Comparison

| System | Pass@1 |
|--------|--------|
| MetaGPT | 85.9-87.7% |
| **Loki Mode** | **98.17%** |

## Methodology

Loki Mode uses its multi-agent architecture to solve each problem:
1. **Architect Agent** analyzes the problem
2. **Engineer Agent** implements the solution
3. **QA Agent** validates with test cases
4. **Review Agent** checks code quality

This mirrors real-world software development more accurately than single-agent approaches.

## Running Benchmarks

```bash
# Setup only (download datasets)
./benchmarks/run-benchmarks.sh all

# Execute with Claude
./benchmarks/run-benchmarks.sh humaneval --execute
./benchmarks/run-benchmarks.sh humaneval --execute --limit 10  # First 10 only
./benchmarks/run-benchmarks.sh swebench --execute --limit 5    # First 5 only

# Use different model
./benchmarks/run-benchmarks.sh humaneval --execute --model opus
```
