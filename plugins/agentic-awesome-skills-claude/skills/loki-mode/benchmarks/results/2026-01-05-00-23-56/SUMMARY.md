# Loki Mode Benchmark Results

## Overview

This directory contains benchmark results for Loki Mode multi-agent system.

## Benchmarks Available

### HumanEval
- **Problems:** 164 Python programming problems
- **Metric:** Pass@1 (percentage of problems solved on first attempt)
- **Competitor Baseline:** MetaGPT achieves 85.9-87.7%

### SWE-bench Lite
- **Problems:** 300 real-world GitHub issues
- **Metric:** Resolution rate
- **Competitor Baseline:** Top agents achieve 45-77%

## Running Benchmarks

```bash
# Run all benchmarks
./benchmarks/run-benchmarks.sh all

# Run specific benchmark
./benchmarks/run-benchmarks.sh humaneval --execute
./benchmarks/run-benchmarks.sh swebench --execute
```

## Results Format

Results are saved as JSON files with:
- Timestamp
- Problem count
- Pass rate
- Individual problem results
- Token usage
- Execution time

## Methodology

Loki Mode uses its multi-agent architecture to solve each problem:
1. **Architect Agent** analyzes the problem
2. **Engineer Agent** implements the solution
3. **QA Agent** validates with test cases
4. **Review Agent** checks code quality

This mirrors real-world software development more accurately than single-agent approaches.
