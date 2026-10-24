---
title: Use .get() and .set() for Reanimated Shared Values (not .value)
impact: LOW
impactDescription: required for React Compiler compatibility
tags: reanimated, react-compiler, shared-values
---

## Use .get() and .set() for Shared Values with React Compiler

With React Compiler enabled, use `.get()` and `.set()` instead of reading or
writing `.value` directly on Reanimated shared values. The compiler can't track
property access—explicit methods ensure correct behavior.

**Incorrect (breaks with React Compiler):**

```tsx
import { useSharedValue } from 'react-native-reanimated'

function Counter() {
  const count = useSharedValue(0)

  const increment = () => {
    count.value = count.value + 1 // opts out of react compiler
  }

  return <Button onPress={increment} title={`Count: ${count.value}`} />
}
```

**Correct (React Compiler compatible):**

```tsx
import { useState } from 'react'
import { Button } from 'react-native'

function Counter() {
  // This value is React-rendered text, so React state is the appropriate primitive.
  const [count, setCount] = useState(0)
  return <Button onPress={() => setCount((n) => n + 1)} title={`Count: ${count}`} />
}
```

See the
[Reanimated docs](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/#react-compiler-support)
for more.

For animation worklets, use shared-value `.get()`/`.set()` inside callbacks such as `useAnimatedStyle`. Neither API belongs in JSX/render; shared-value updates do not cause React to rerender text.
