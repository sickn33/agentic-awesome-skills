# React 19

React 19 is included in Expo SDK 54. This release simplifies several common patterns.

## Context Changes

### useContext → use

The `use` hook replaces `useContext`:

```tsx
// Before (React 18)
import { useContext } from "react";
const value = useContext(MyContext);

// After (React 19)
import { use } from "react";
const value = use(MyContext);
```

- The `use` hook can also read promises, enabling Suspense-based data fetching.
- `use` can be called conditionally, this simplifies components that consume multiple contexts.

### Context.Provider → Context

Context providers no longer need the `.Provider` suffix:

```tsx
// Before (React 18)
<ThemeContext.Provider value={theme}>
  {children}
</ThemeContext.Provider>

// After (React 19)
<ThemeContext value={theme}>
  {children}
</ThemeContext>
```

## ref as a Prop

### Removing forwardRef

Components can now receive `ref` as a regular prop. `forwardRef` is no longer needed:

```tsx
// Before (React 18)
import { forwardRef } from "react";

const Input = forwardRef<TextInput, Props>((props, ref) => {
  return <TextInput ref={ref} {...props} />;
});

// After (React 19)
function Input({ ref, ...props }: Props & { ref?: React.Ref<TextInput> }) {
  return <TextInput ref={ref} {...props} />;
}
```

### Migration Steps

1. Remove `forwardRef` wrapper
2. Add `ref` to the props destructuring
3. Update the type to include `ref?: React.Ref<T>`

## Other React 19 Features

- **Actions** — Functions that handle async transitions
- **useOptimistic** — Optimistic UI updates
- **useFormStatus** — Form submission state (web)
- **Document Metadata** — Native `<title>` and `<meta>` support (web)

## Cleanup Checklist

When upgrading to SDK 54:

- [ ] Replace `useContext` with `use`
- [ ] Remove `.Provider` from Context components
- [ ] Remove `forwardRef` wrappers, use `ref` prop instead
