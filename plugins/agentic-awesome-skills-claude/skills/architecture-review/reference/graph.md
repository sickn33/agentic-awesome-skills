# Software Graph Evidence

Use Software Graph evidence as the primary source of truth. Prefer deterministic identifiers over prose names.

Evidence fields to capture:

- graph hash
- capability invoked
- node id and node type
- edge type and direction
- source span when present
- diagnostic codes when relevant
- confidence and reason for confidence

Do not infer relationships that are absent from the graph. You may make a clearly labeled inference only after stating the graph evidence that supports it.
