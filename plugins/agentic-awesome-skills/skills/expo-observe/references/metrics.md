# EAS Observe metrics — interpretation cheatsheet

Quick reference for reading EAS Observe dashboards and CLI output.

> Source: https://docs.expo.dev/eas/observe/reference/metrics/ — this is the canonical reference for metrics. Consult this page for the latest guidance, full prose definitions, optimization tips, and rationale.

All durations are in seconds. Data is retained for 90 days. All durations are in seconds. By default, every installation dispatches all of its events. Apps with high volumes can opt into per-installation sampling via configure({ sampleRate }). See [Sampling](https://docs.expo.dev/eas/observe/configuration/#sampling).

## Target thresholds

| Metric | Full name | Target | Auto-collected? |
|---|---|---|---|
| Cold launch | `expo.app_startup.cold_launch_time` | **< 1.5s** | Yes (native-only — JS code does not affect it) |
| Warm launch | `expo.app_startup.warm_launch_time` | **< 0.5s** | Yes (OS decides when warm vs cold happens) |
| Bundle load | `expo.app_startup.bundle_load_time` | **< 0.3s** | Yes (JS load + evaluation, before `runApplication`) |
| Time to first render (TTR) | `expo.app_startup.ttr` | **< 2s** incl. cold launch | Yes when root is wrapped with `AppMetricsRoot` (SDK 55) / `ObserveRoot` (SDK 56+) |
| Time to interactive (TTI) | `expo.app_startup.tti` | **< 3s** incl. cold launch | **No** — call `markInteractive()` once the screen is genuinely usable |

Both TTR and TTI are measured *from native launch* through the React render, so the cold-launch portion counts against them.

## Interpreting TTI events (frameRate params)

Every TTI event carries three frame-rate params. The pattern of high/low values across them tells you *what kind* of slowness you're seeing.

| Param | Definition | What it indicates |
|---|---|---|
| `expo.frameRate.slowFrames` | Count of frames ≥ 17ms | Main thread consistently busy during launch (heavy layout, sync bridge calls, too many components rendering) |
| `expo.frameRate.frozenFrames` | Count of frames ≥ 700ms | Hard freezes. Even one during startup is a serious issue (sync I/O, large JSON parsing, blocking network) |
| `expo.frameRate.totalDelay` | Total accumulated time (seconds) frames exceeded their target duration | Best single "smoothness" number — compare to TTI |

**Diagnostic patterns:**

- **High TTI + low totalDelay** → slow but smooth. The launch sequence itself is long. Optimize bundle size, data-fetch waterfalls, initialization chains.
- **High TTI + high totalDelay + many slowFrames** → main-thread contention. Offload work, simplify the initial render tree.
- **High TTI + high totalDelay + any frozenFrames** → something is blocking hard. Look for synchronous I/O, large JSON parsing, or blocking network calls.

## Dispatch caveats

- **Debug builds** (native debug OR JS bundle with `__DEV__` = true) do **not** dispatch metrics unless `configure({ dispatchInDebug: true })` is set.
- The `environment` tag (defaults to `process.env.NODE_ENV`) is metadata only — it does not gate dispatch by itself.
- Offline events are buffered on-device and flushed when the app backgrounds or `Observe.dispatchEvents()` is called.

## Cross-references

- Full metric definitions and optimization guidance: https://docs.expo.dev/eas/observe/reference/metrics/
- Setup steps (`AppMetricsRoot` / `ObserveRoot`, `markInteractive`): see [`./setup.md`](./setup.md).
- Querying metrics via the EAS CLI: see [`./queries.md`](./queries.md).
