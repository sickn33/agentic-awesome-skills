# Audit output template

## Intent

Use this structure when reporting SwiftUI performance findings so the user can quickly see the symptom, evidence, likely cause, and next validation step.

## Template

```markdown
## Summary

[One short paragraph on the most likely bottleneck and whether the conclusion is code-backed or trace-backed.]

## Findings

1. [Issue title]
   - Symptom: [what the user sees]
   - Likely cause: [root cause]
   - Evidence: [code reference or profiling evidence]
   - Fix: [specific change]
   - Validation: [what to measure after the fix]

2. [Issue title]
   - Symptom: ...
   - Likely cause: ...
   - Evidence: ...
   - Fix: ...
   - Validation: ...

## Metrics

| Metric | Before | After | Notes |
| --- | --- | --- | --- |
| CPU | [value] | [value] | [note] |
| Frame drops / hitching | [value] | [value] | [note] |
| Memory peak | [value] | [value] | [note] |

## Next step

[One concrete next action: apply a fix, capture a better trace, or validate on device.]
```

## Notes

- Order findings by impact, not by file order.
- Say explicitly when a conclusion is still a hypothesis.
- If no metrics are available, omit the table and say what should be measured next.
