# Migrating from react-navigation to expo-router

In SDK 56+, application code must not import from `@react-navigation/*` directly. Repoint those imports to the matching `expo-router` entry points. Runtime API is unchanged — only the module specifiers move.

## Steps

1. Prefer the automated codemod (see below). If it is not viable, fall back to the manual mapping.
2. Replace imports using the table. Use the entry point that matches the `@react-navigation/*` source.
3. After rewriting, check whether any of the rewritten imports are deprecated in `expo-router` (see [Check for deprecated imports](#check-for-deprecated-imports)). If so, surface the deprecation reason and the suggested replacement to the user before continuing.
4. Validate: search for remaining `@react-navigation/` references in source files, then run typecheck/build/start.
5. Remove `@react-navigation/*` packages that are no longer imported from `package.json` and reinstall (delete `node_modules` if needed).

## Automated migration (preferred)

Run from the project root over your application code (replace `src` with the actual directory or glob):

```sh
npx expo-codemod sdk-56-expo-router-react-navigation-replace src
```

```sh
npx expo-codemod sdk-56-expo-router-react-navigation-replace '**/*.{ts,tsx,js,jsx}'
```

## Manual API mapping

| React Navigation source               | Expo Router target                                                       |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `@react-navigation/native`            | `expo-router/react-navigation`                                           |
| `@react-navigation/core`              | `expo-router/react-navigation`                                           |
| `@react-navigation/elements`          | `expo-router/react-navigation`                                           |
| `@react-navigation/routers`           | `expo-router/react-navigation`                                           |
| `@react-navigation/stack`             | `expo-router/js-stack`                                                   |
| `@react-navigation/bottom-tabs`       | `expo-router/js-tabs`                                                    |
| `@react-navigation/material-top-tabs` | `expo-router/js-top-tabs`                                                |
| `@react-navigation/native-stack`      | No direct equivalent. Use the `Stack` layout from `expo-router` instead. |

**Stack caveat:** Do NOT rewrite `import { Stack } from "expo-router"` to `expo-router/js-stack`. The root `Stack` is the Expo Router layout component used in route files; only use `expo-router/js-stack` when replacing a `@react-navigation/stack` JS stack navigator.

If you encounter a symbol that has no replacement, ask the user to file an issue in the `expo/expo` repository describing what is needed and why.

## Check for deprecated imports

A successful rewrite to `expo-router/*` does not guarantee the new import is the recommended one. Some symbols are re-exported as deprecated shims and the project may need to migrate further (for example, to a different `expo-router` API or to a first-party Expo package).

For each symbol rewritten in step 2:

1. Resolve the rewritten module to its source in `node_modules` (e.g., `node_modules/expo-router/build/react-navigation.d.ts`, `js-stack`, `js-tabs`, `js-top-tabs`).
2. Look for a `@deprecated` JSDoc tag on the named export, or a runtime deprecation warning in the implementation file.
3. If deprecated, capture both the reason and the recommended replacement from the JSDoc/comment.
4. Report each deprecated symbol to the user with: the import path, the symbol, the deprecation reason, and the suggested replacement. Wait for the user to confirm before mass-applying further changes.

## Done when

1. No `@react-navigation/*` imports remain in source files.
2. No unused `@react-navigation/*` entries remain in `package.json`.
3. Typecheck and bundler start without `@react-navigation/*` errors.

## Reference

- Official Expo Router SDK 55 → 56 migration guide: https://docs.expo.dev/router/migrate/sdk-55-to-56
