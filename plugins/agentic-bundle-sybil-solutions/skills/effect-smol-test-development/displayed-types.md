# Displayed Types

Deliberately produce an assignment error and match a distinctive substring with
Tstyche's checked `@ts-expect-error` message:

```ts
it("simplifies the displayed type", () => {
  const value = null as unknown as PublicType

  // @ts-expect-error Type '{ readonly value: string; }'
  const displayed: never = value

  void displayed
})
```

Keep the expected substring as small as possible while distinguishing the
public type from the leaked implementation type. Before accepting the test,
temporarily restore the broken type and confirm the diagnostic-message match
fails.
