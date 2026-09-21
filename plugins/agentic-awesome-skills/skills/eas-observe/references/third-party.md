# Add an EAS Observe integration to a third-party package

This reference is for **package authors**, not app developers. It describes how a library ships an optional EAS Observe integration so that apps using the library get events about problems that application code cannot detect on its own.

> Source: https://docs.expo.dev/eas/observe/integrations/third-party/ — consult this page for the latest guidance.

App-side setup lives in [`./setup.md`](./setup.md). Querying the resulting events is in [`./queries.md`](./queries.md).

## When to use this

Report actionable issues the developer can fix. Good candidates:

- An image decoded at far higher resolution than the device screen needs.
- A background task that exceeds its expected duration.
- A native resource that loads slowly.

Do not use it for general product analytics or for anything the app author could log themselves.

## Requirements

- **Expo SDK 57 or later.** `Observe.registerIntegration()` is not available earlier.
- The consuming app must already have `expo-observe` installed and a build produced.

## Step 1 — Depend on `expo-observe` optionally

The package must keep working when `expo-observe` is absent. Declare it as an **optional peer dependency** plus a dev dependency for types and tests. Never make it a required runtime dependency.

```json
{
  "peerDependencies": { "expo-observe": ">=57.0.0" },
  "peerDependenciesMeta": { "expo-observe": { "optional": true } },
  "devDependencies": { "expo-observe": "^57.0.0" }
}
```

Load it with `require()` inside `try/catch`, and type it with `typeof import()` so the types survive:

```ts
// observe.ts
let observeModule: typeof import('expo-observe') | undefined;

try {
  observeModule = require('expo-observe') as typeof import('expo-observe');
} catch {
  // The integration stays disabled when expo-observe is not installed.
}
```

## Step 2 — Declare the integration config

Use declaration merging to add your integration key to `ObserveIntegrationsConfig`:

```ts
// observe.types.ts
export type YourPackageIntegrationConfig = {
  thresholdMs?: number;
};

declare module 'expo-observe' {
  interface ObserveIntegrationsConfig {
    'your-package'?: boolean | YourPackageIntegrationConfig;
  }
}
```

Export this declaration from the package entry point so TypeScript loads it when the app imports your package. App developers then enable it the same way they enable the first-party integrations:

```tsx
Observe.configure({
  integrations: {
    'your-package': true,
    // or, with options:
    // 'your-package': { thresholdMs: 1500 },
  },
});
```

## Step 3 — Register the integration

`Observe.registerIntegration(name, callback)` invokes the callback once, when the named integration config becomes available. The callback does not run when the key is omitted or set to `false`.

```ts
// observe.ts
export function initObserveIntegration() {
  // The `typeof window` check skips initialization during server-side rendering on web.
  if (typeof window !== 'undefined' && observeModule) {
    const { Observe } = observeModule;

    Observe.registerIntegration('your-package', config => {
      if (config) {
        enableObserveIntegration(config === true ? {} : config);
      }
    });
  }
}
```

Call the initializer from the package entry point:

```ts
// index.ts
import { initObserveIntegration } from './observe';

export type { YourPackageIntegrationConfig } from './observe.types';

initObserveIntegration();
```

Note the `config === true` normalization: the key accepts either a boolean or an options object, so collapse `true` to `{}` before using it.

## Step 4 — Log events

Emit through `Observe.logEvent()` when the package detects an actionable issue. Guard on both module presence and enablement, so a disabled integration costs nothing.

```ts
export function logExpensiveOperation(durationMs: number, thresholdMs: number) {
  if (!observeModule || !enabled) {
    return;
  }

  const { Observe } = observeModule;

  Observe.logEvent('your-package.expensive-operation', {
    severity: 'warn',
    body: 'Reduce the work performed by this operation or increase the configured threshold.',
    attributes: { durationMs, thresholdMs },
  });
}
```

Naming rules, matching the app-side event conventions in [`./setup.md`](./setup.md):

- Lowercase, dot-separated, with **your package name as the first segment**: `your-package.expensive-operation`.
- Keep names stable. The dashboard groups by exact name.
- No PII in names, attribute keys, or attribute values.
- Use `severity` to separate warnings from errors, and `body` for the remediation hint. The attributes carry the measurements.
