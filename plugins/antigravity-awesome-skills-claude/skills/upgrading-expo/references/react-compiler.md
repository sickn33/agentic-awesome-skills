# React Compiler

React Compiler is stable in Expo SDK 54 and later. It automatically memoizes components and hooks, eliminating the need for manual `useMemo`, `useCallback`, and `React.memo`.

## Enabling React Compiler

Add to `app.json`:

```json
{
  "expo": {
    "experiments": {
      "reactCompiler": true
    }
  }
}
```

## What React Compiler Does

- Automatically memoizes components and values
- Eliminates unnecessary re-renders
- Removes the need for manual `useMemo` and `useCallback`
- Works with existing code without modifications

## Cleanup After Enabling

Once React Compiler is enabled, you can remove manual memoization:

```tsx
// Before (manual memoization)
const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a), [a]);
const MemoizedComponent = React.memo(MyComponent);

// After (React Compiler handles it)
const value = computeExpensive(a, b);
const callback = () => doSomething(a);
// Just use MyComponent directly
```

## Requirements

- Expo SDK 54 or later
- New Architecture enabled (default in SDK 54+)

## Verifying It's Working

React Compiler runs at build time. Check the Metro bundler output for compilation messages. You can also use React DevTools to verify components are being optimized.

## Troubleshooting

If you encounter issues:

1. Ensure New Architecture is enabled
2. Clear Metro cache: `npx expo start --clear`
3. Check for incompatible patterns in your code (rare)

React Compiler is designed to work with idiomatic React code. If it can't safely optimize a component, it skips that component without breaking your app.
