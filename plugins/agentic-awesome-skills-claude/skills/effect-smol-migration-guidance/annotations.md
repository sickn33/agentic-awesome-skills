# Migration Annotations

Add or update one YAML file per v3 module under `migration/annotations/`. Use
stable API IDs without trailing `#type` or `#value` facets:

```yaml
effect/Effect#async:
  replacement: Effect.callback
  note: Use the callback constructor.
  example: Effect.callback((resume) => resume(Effect.void))
```

Every annotation requires `replacement` and `note`; `example` is optional. Use
`replacement: none` when there is no direct replacement and explain the
supported migration strategy instead of inventing an equivalent API.
