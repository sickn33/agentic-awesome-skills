---
title: Hoist callbacks to the root of lists
impact: MEDIUM
impactDescription: Fewer re-renders and faster lists
tags: tag1, tag2
---

## List performance callbacks

**Impact: HIGH (Fewer re-renders and faster lists)**

When passing callback functions to list items, create a single instance of the
callback at the root of the list. Items should then call it with a unique
identifier.

**Incorrect (creates a new callback on each render):**

```typescript
return (
  <LegendList
    renderItem={({ item }) => {
      // bad: creates a new callback on each render
      const onPress = () => handlePress(item.id)
      return <Item key={item.id} item={item} onPress={onPress} />
    }}
  />
)
```

**Correct (stable parent dispatcher; bind the ID inside a memoized item for stable item props):**

```typescript
const onPress = useCallback((id: string) => handlePress(id), [handlePress])

return (
  <LegendList
    renderItem={({ item }) => (
      <Item item={item} onPressId={onPress} />
    )}
  />
)
```

`Item` accepts `onPressId: (id: string) => void` and calls `onPressId(item.id)` from its own press handler.

Reference: [React useCallback](https://react.dev/reference/react/useCallback)
