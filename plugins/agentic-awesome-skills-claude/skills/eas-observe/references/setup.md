# Set up EAS Observe in an existing project

EAS Observe collects app-startup performance metrics (cold launch, warm launch, bundle load, TTR, TTI) from production Expo apps. This reference summarizes the steps to add `expo-observe` to an existing project.

> Source: https://docs.expo.dev/eas/observe/get-started/ — consult this page for the latest guidance.

## SDK 55 vs SDK 56+ at a glance

The library exports differ between SDK versions. Pick the right one for the project's SDK before copying any snippet below.

| Concern | SDK 55 | SDK 56 and later |
|---|---|---|
| Root layout HOC | `AppMetricsRoot.wrap(...)` | `ObserveRoot.wrap(...)` |
| `markInteractive()` API | Global: `AppMetrics.markInteractive()` | Hook: `const { markInteractive } = useObserve()` |
| Import source | `expo-observe` | `expo-observe` (same package) |

Everything else — package name, build process, dashboard, debug-mode behavior — is the same across versions.

## Prerequisites

Before installing, confirm all of the following:

1. **An Expo account.** Sign up at [expo.dev/signup](https://expo.dev/signup) if needed.
2. **Expo SDK 55 or later.** Run `npx expo-doctor` to check, and `npx expo install --fix` to update dependencies. SDK 56+ unlocks the newer `ObserveRoot` / `useObserve` API.
3. **An EAS project.** The app must have `extra.eas.projectId` set in its app config. If not, run `eas init` to create one.
4. **A development build or a production build.** `expo-observe` is a native library, so it does **not** work in Expo Go. Testing the integration requires a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Step 1 — Install the library

From the project root:

```sh
npx expo install --fix
npx expo install expo-observe
```

## Step 2 — Wrap the root layout

The HOC automatically measures **Time to First Render (TTR)**. Apply it to the file that exports the app's root component. The HOC name depends on the SDK version.

**SDK 55** — use `AppMetricsRoot`:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { AppMetricsRoot } from 'expo-observe';

function RootLayout() {
  return <Stack />;
}

export default AppMetricsRoot.wrap(RootLayout);
```

**SDK 56 and later** — use `ObserveRoot`:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { ObserveRoot } from 'expo-observe';

function RootLayout() {
  return <Stack />;
}

export default ObserveRoot.wrap(RootLayout);
```

**Without Expo Router** (`App.tsx`): wrap the default-exported `App` component the same way — `export default AppMetricsRoot.wrap(App);` on SDK 55, or `export default ObserveRoot.wrap(App);` on SDK 56+.

## Step 3 — Mark the app as interactive

TTI is **not** collected automatically. Signal it once the screen is genuinely ready for the user — i.e. after splash-screen-blocking work like update checks, authentication, initial data fetching, or splash animations finishes. Place the call in a `useEffect` that runs once that work resolves.

**SDK 55** — call the global `AppMetrics.markInteractive()`:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppMetrics, AppMetricsRoot } from 'expo-observe';
import { useEffect, useState } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await authenticateUser();
        await fetchInitialData();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
      AppMetrics.markInteractive();
    }
  }, [isReady]);

  if (!isReady) return null;
  return <Stack />;
}

export default AppMetricsRoot.wrap(RootLayout);
```

**SDK 56 and later** — use the `useObserve()` hook to get a bound `markInteractive`:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ObserveRoot, useObserve } from 'expo-observe';
import { useEffect, useState } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { markInteractive } = useObserve();

  useEffect(() => {
    async function prepare() {
      try {
        await authenticateUser();
        await fetchInitialData();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
      markInteractive();
    }
  }, [isReady, markInteractive]);

  if (!isReady) return null;
  return <Stack />;
}

export default ObserveRoot.wrap(RootLayout);
```

**Without Expo Router:** the structure is the same in `App.tsx`. Use `SplashScreen.hideAsync()` instead of `SplashScreen.hide()` and replace `<Stack />` with the app's root tree.

### Multiple entry screens

`markInteractive()` is safe to call repeatedly — only the **first** call per session is recorded. If the app has more than one entry screen (onboarding, login, deep-link targets), call `markInteractive()` on **each one**. Otherwise TTI will be missing for sessions that open via a deep link to a screen without the call.

### Custom params and route name

`markInteractive()` accepts an options object. Use `params` to slice TTI by an app-specific dimension (cohort, tenant, feature-flag variant, cache hit). Use `routeName` to override the route the event is tagged with — useful when the logical screen name differs from the router path, when the route is dynamic, or when the app does not use Expo Router. Param values may be strings, numbers, booleans, or any JSON-serializable value.

```tsx
// SDK 56+: const { markInteractive } = useObserve();
// SDK 55:  AppMetrics.markInteractive({ ... })
markInteractive({
  routeName: '/feed',
  params: { tenant: 'acme', cohort: 'beta', cacheHit: true },
});
```

### Declarative alternative: `<ObserveInteractiveMarker />` (SDK 56+)

Instead of calling `markInteractive()` from an effect, render the marker component at the point the screen becomes interactive. It renders nothing and calls `markInteractive()` once on mount.

```tsx
import { ObserveInteractiveMarker } from 'expo-observe';

function Feed({ items }) {
  if (!items) return <Spinner />;

  return (
    <>
      <FeedList items={items} />
      <ObserveInteractiveMarker params={{ cacheHit: true }} />
    </>
  );
}
```

The marker fires **once**, on mount, so its `params` are read from the first render. Changing them later has no effect and logs a development warning. When the params are only known later, call `useObserve().markInteractive(...)` imperatively instead.

## Step 4 — Build the app

Metrics are collected from real builds, not from `expo start`:

```sh
eas build
```

> By default, metrics collected from **debug builds** are not dispatched. A build is treated as a debug build when either the native app is a debug build or the JS bundle is a development bundle (`__DEV__` is `true`). To dispatch anyway while testing the integration, set `dispatchInDebug: true` when calling `configure()` — see [Enable metrics in development](https://docs.expo.dev/eas/observe/configuration/#enable-metrics-in-development). This has no effect on release builds.

## Step 5 — View the metrics

Open the **Observe** tab in the EAS dashboard at `https://expo.dev/accounts/[account]/projects/[project]/observe` to view metrics from the app.

To query metrics from the terminal with the EAS CLI, see [`./queries.md`](./queries.md). For interpreting the metrics themselves, see [`./metrics.md`](./metrics.md).

## Optional — per-route navigation metrics (SDK 56+)

By default `expo-observe` records app-wide startup metrics only. To additionally get **per-route / per-screen** navigation metrics (`cold_ttr`, `warm_ttr`, and a per-navigation `tti`, each tagged with the route/screen), enable one of the navigation integrations. These require **SDK 56 or later**; on earlier SDKs they are silent no-ops. Query the resulting data with `eas observe:routes`, or with `observe:metrics` / `observe:metrics-summary` under the CLI aliases `nav_cold_ttr`, `nav_warm_ttr`, and `nav_tti` (see [`./queries.md`](./queries.md)).

Pick the integration that matches the app's router:

### Expo Router

Docs: https://docs.expo.dev/eas/observe/integrations/expo-router/

1. Enable the integration at module scope, **before any screen mounts** (it cannot be toggled at runtime — calling `configure()` after mount throws):

   ```tsx
   // app/_layout.tsx
   import { Observe } from 'expo-observe';

   Observe.configure({
     integrations: { 'expo-router': true },
   });
   ```

2. Call `useObserve()` inside each screen to get a `markInteractive` scoped to the current route, and call it from a `useEffect` once the screen is interactive:

   ```tsx
   import { useObserve } from 'expo-observe';
   import { useEffect } from 'react';

   export default function Home() {
     const { markInteractive } = useObserve();
     useEffect(() => {
       markInteractive();
     }, [markInteractive]);
     return (/* screen content */);
   }
   ```

Events are tagged with the route **pattern** (e.g. `/(tabs)/sessions/[sessionId]`) so the dashboard buckets distinct param values together; the resolved `url` and `routeParams` are also included. Requires `expo-router` installed at runtime, or the integration no-ops.

`router.prefetch()` does not count as a user navigation and never seeds a `cold_ttr` or `warm_ttr` measurement. The next user-driven navigation to a prefetched route emits `warm_ttr`, because the screen already rendered.

### React Navigation

Docs: https://docs.expo.dev/eas/observe/integrations/react-navigation/

Requires `@react-navigation/native` 7.0.0 or later. Same `useObserve()` screen usage as above, plus **two** extra changes:

1. Enable the integration at module scope, before mount:

   ```tsx
   // App.tsx
   import { Observe } from 'expo-observe';

   Observe.configure({
     integrations: { 'react-navigation': true },
   });
   ```

2. Connect the integration to the navigation tree. Which component you use depends on whether the app uses React Navigation's dynamic or static configuration. Both record the same per-screen metrics.

   **Dynamic configuration** — replace the top-level `<NavigationContainer>` with `<ObserveNavigationContainer>`. It is a drop-in replacement that accepts the same props and forwards the same ref. If you pass a `linking` config it is used to resolve a human-readable screen path; otherwise the metric falls back to `route.name`.

   ```tsx
   import { ObserveNavigationContainer } from 'expo-observe/integrations/react-navigation';

   export default function App() {
     return <ObserveNavigationContainer>{/* navigators */}</ObserveNavigationContainer>;
   }
   ```

   **Static configuration** — `createStaticNavigation()` renders the container for you, so there is nothing to replace. Create the navigation ref yourself, pass it to both `<Navigation>` and `<ObserveNavigationProvider>`, and the provider records the same timings by listening through that ref.

   ```tsx
   import { createStaticNavigation, useNavigationContainerRef } from '@react-navigation/native';
   import { ObserveNavigationProvider } from 'expo-observe/integrations/react-navigation';

   const Navigation = createStaticNavigation(RootStack);

   export default function App() {
     const navigationRef = useNavigationContainerRef();

     return (
       <ObserveNavigationProvider navigationRef={navigationRef}>
         <Navigation ref={navigationRef} />
       </ObserveNavigationProvider>
     );
   }
   ```

   `ObserveNavigationProvider` renders no container of its own, but it must be an ancestor of every screen so `useObserve()` works inside them. Pass the **same** ref to both elements; a ref that is not connected to a container emits no metrics.

With React Navigation v7's default `lazy: true`, unfocused tabs stay unmounted, so their first focus records as `cold_ttr` rather than `warm_ttr`.

In both integrations, `useObserve()` is safe to leave in place even when the integration is disabled or the router package is absent — it falls back to the global `markInteractive`.

### Per-route event params

Navigation events carry these params in addition to any custom ones passed to `markInteractive`:

| Param | Type | Notes |
|---|---|---|
| `routeName` | string | Route pattern (`/(tabs)/sessions/[sessionId]`) with Expo Router, route-name path (`/Tabs/Sessions`) with React Navigation. Never contains param values. |
| `url` | string | Resolved pathname. Expo Router only. |
| `routeParams` | object | Resolved route params, e.g. `{ sessionId: 'abc' }`. |
| `isAppLaunch` | boolean | `cold_ttr` only. `true` when measured from process start rather than from a navigation action. |
| `urlHidden` | boolean | Present as `true` when a filtered param caused `url` to be omitted. See below. |

### Filter sensitive params (SDK 57+)

By default the integrations export the resolved URL and every serializable route and query param. If any of those carry sensitive values, list their keys in `filteredParams`:

```tsx
Observe.configure({
  integrations: {
    'expo-router': { filteredParams: ['userId', 'token'] },
    // or: 'react-navigation': { filteredParams: ['userId', 'token'] },
  },
});
```

Filtered keys are removed from `routeParams`, and the event drops `url` in favor of `urlHidden: true`. `routeName` is unaffected, because it is a pattern and never contains param values.

### Common integration mistakes

- Calling `Observe.configure()` after mount, or toggling an integration flag mid-session, **throws**. Enable it at module scope.
- `Calling markInteractive on unmounted screen` or `No metadata available for the current screen` means the call ran outside a screen component or after unmount. Move it into a `useEffect` inside the screen component.
- Call `useObserve()` inside the screen component, not in a wrapper above it. A screen identity that changes between renders logs a warning.
- With React Navigation, `markInteractive()` records only once the screen is focused. A call on an unfocused screen updates internal state but emits no `tti` event until focus.

## Optional — user-defined events (SDK 56+)

Beyond the automatic startup and navigation metrics, you can record your own named events from anywhere in the app to track product moments — a completed onboarding, an exported report, a selected item. Use `Observe.logEvent(name, options?)`.

> Source: https://docs.expo.dev/eas/observe/events/ — consult this page for the latest guidance.

```tsx
import { Observe } from 'expo-observe';

function handleOnboardingComplete() {
  Observe.logEvent('onboarding.completed');
}
```

`logEvent` is a plain function call — it is **not** a hook and needs no `useObserve()`. Call it from event handlers, effects, or any non-render code. The event is persisted on-device and dispatched on the next flush (see dispatch notes below); the call returns immediately and never blocks the UI.

### Parameters

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Stable, dot-separated identifier, e.g. `'report.exported'`. |
| `options.attributes` | `Record<string, string \| number \| boolean \| array \| nested object>` | no | Structured context attached to the event. Other JS values (`Date`, `undefined`, functions) are dropped. |
| `options.body` | `string` | no | Free-form message complementing the structured attributes. |
| `options.severity` | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal'` | no | Defaults to `'info'`. |
| `options.displayName` | `string` | no | Human-friendly label, e.g. `'Onboarding completed'`. Used **only** in the dashboard's session timeline view; grouping still keys off `name`. |

**Attributes** are the primary way to make an event queryable — attach the identifiers and measurements you'll want to filter or break down by:

```tsx
Observe.logEvent('report.exported', {
  attributes: {
    format: 'csv',
    rowCount: 1248,
    durationMs: 532,
    filters: ['status:active', 'region:us-west'],
  },
});
```

**Severity and body** may be used for operational events you may want to triage by level:

```tsx
Observe.logEvent('cache.evicted', {
  body: 'Cache evicted because disk pressure exceeded the configured threshold.',
  severity: 'warn',
  attributes: { evictedItemCount: 42, freedBytes: 1048576 },
});
```

### Naming and privacy

- **Use lowercase, dot-separated names** (`task.completed`, `onboarding.skipped`). Keep them stable — `report_exported` and `report.exported` bucket as two separate events in the dashboard.
- **Never put PII in event names, attribute keys, or attribute values.** Everything is transmitted off-device and visible in the dashboard.

### Dispatch

User-defined events are persisted on-device, batched, and dispatched on the next flush as **OpenTelemetry log records** — the same delivery path and timing as other metrics. The debug-build caveat from [Step 4](#step-4--build-the-app) applies unchanged: debug builds don't dispatch unless `configure({ dispatchInDebug: true })` is set.

### Viewing events

User-defined events appear under the **Events** tab in the Observe dashboard, and are queryable from the terminal with `eas observe:events` — see [`./queries.md`](./queries.md).

## Optional — error reporting

`expo-observe` records errors as non-fatal `exception` log events alongside the performance metrics. They arrive by three paths, and they are **not** a replacement for a crash reporter such as Sentry — EAS Observe has no crash reporting yet.

> These APIs ship in `expo-observe` but are not covered by the published docs yet. Verify the exports against the installed package version before relying on them.

**1. Unhandled JS errors — automatic.** A global `ErrorUtils` handler is installed when the package is first imported, which is earlier than any `configure()` call, so errors thrown before configuration are still recorded. React Native's own behavior is unchanged: the red box in development and fatal termination in production still happen. Turn the recording off with `configure({ errorHandlingEnabled: false })`.

**2. Render-phase errors — `<ObserveErrorBoundary>`.** Render errors never reach `ErrorUtils`, so a boundary is the only way to capture them with the React component stack. The boundary records the error and then renders `fallback` in place of the subtree.

```tsx
import { ObserveErrorBoundary } from 'expo-observe';

<ObserveErrorBoundary
  fallback={({ error, resetError }) => <ErrorScreen error={error} onRetry={resetError} />}>
  <Feed />
</ObserveErrorBoundary>;
```

`fallback` is required and accepts a React element, `null`, or a function receiving `{ error, resetError }`. `resetError()` clears the caught error and re-mounts the children, so they restart from a clean state. There is no capture-and-rethrow mode — a boundary always renders one of the three fallback forms. Errors that no boundary catches still reach the global handler.

**3. Handled errors — `Observe.reportError(error)`.** Report failures your code caught and recovered from, which reach neither the global handler nor a boundary.

```tsx
try {
  await syncCart();
} catch (error) {
  Observe.reportError(error);
}
```

The value is normalized before it is sent: an `Error` contributes `name`, `message`, and `stack`; any other thrown value (a string, a plain object, a number) is stringified into the message with no stack. `reportError` never throws — it is called from a `catch` block, so a failure inside it must not turn a handled error into an unhandled one.

## Optional — runtime configuration

`Observe.configure()` controls collection and dispatch. Call it at module scope, before mount. Integration flags in particular cannot be toggled at runtime.

| Option | Type | Default | What it does |
|---|---|---|---|
| `environment` | string | `process.env.NODE_ENV`, falling back to `'production'` | Metadata tag used to group metrics; filterable in the dashboard. Does not gate dispatch. |
| `dispatchingEnabled` | boolean | `true` | Master switch. While `false`, pending metrics are dropped, not queued. |
| `dispatchInDebug` | boolean | `false` | Dispatch metrics collected from debug builds. No effect on release builds. |
| `sampleRate` | number | `undefined` (all installations) | Fraction of installations that dispatch, in `[0, 1]`. |
| `errorHandlingEnabled` | boolean | `true` | Record unhandled JS errors as `exception` events. |
| `integrations` | object | `undefined` | Opt in to `expo-router`, `react-navigation`, or a third-party integration. |

**Network request monitoring is automatic and has no off switch.** `expo-observe` observes `URLSession` traffic on iOS and `OkHttpClient` traffic on Android from launch, and attaches a rollup of the launch window to the TTI event — including the **host** of the slowest request (see [`./metrics.md`](./metrics.md)). Observe's own uploads are excluded. No `configure()` option disables it as of `expo-observe` 57.0.9, so treat request hosts as data that leaves the device.

**Sampling** is deterministic per installation: an installation is permanently in-sample or out-of-sample for a given rate, so the slice is stable across launches rather than a random subset of sessions. Out-of-sample installations drop pending metrics instead of accumulating them, so lowering the rate later does not retroactively send earlier sessions. Values outside `[0, 1]` are clamped. Sampling depends on `dispatchingEnabled`.

**Manual flush.** Events dispatch automatically when the app backgrounds — on Android through a background worker once connectivity returns, on iOS when the app resigns active or is about to terminate. Call `await Observe.dispatchEvents()` to flush early, which is mainly useful while testing.

**Custom endpoint.** EAS Observe sends OTLP over HTTP with a JSON payload, posting to `<endpointUrl>/<project-id>/v1/metrics` and `<endpointUrl>/<project-id>/v1/logs`. Point it at any OpenTelemetry-compatible backend or collector through the **app config**, not `configure()`:

```json
{ "expo": { "extra": { "eas": { "observe": { "endpointUrl": "https://your-endpoint.com" } } } } }
```

The URL is baked into the native layer at build time, so run `npx expo prebuild` and rebuild after changing it. If the backend expects standard OTLP paths without the project-ID prefix, route through a collector.

## Quick checklist

- [ ] SDK ≥ 55, EAS project linked, development or production build (not Expo Go).
- [ ] `expo-observe` installed via `npx expo install`.
- [ ] Root component exported through `AppMetricsRoot.wrap(...)` (SDK 55) or `ObserveRoot.wrap(...)` (SDK 56+).
- [ ] `markInteractive()` called from every entry screen once it is genuinely interactive — global `AppMetrics.markInteractive()` on SDK 55, or `useObserve()` hook on SDK 56+.
- [ ] (Optional, SDK 56+) Per-route metrics enabled via `Observe.configure({ integrations: { ... } })`, plus `<ObserveNavigationContainer>` (dynamic) or `<ObserveNavigationProvider>` (static) for React Navigation.
- [ ] (Optional, SDK 57+) Sensitive route/query params listed in `filteredParams`.
- [ ] (Optional, SDK 56+) User-defined events emitted via `Observe.logEvent(name, { attributes })` with stable, lowercase, dot-separated names and no PII.
- [ ] (Optional) `<ObserveErrorBoundary>` around risky subtrees and `Observe.reportError` in recovery paths.
- [ ] New build produced with `eas build` and metrics visible in the Observe dashboard.
