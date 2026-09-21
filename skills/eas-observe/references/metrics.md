# EAS Observe metrics — interpretation cheatsheet

Quick reference for reading EAS Observe dashboards and CLI output.

> Source: https://docs.expo.dev/eas/observe/reference/metrics/ — this is the canonical reference for metrics. Consult this page for the latest guidance, full prose definitions, optimization tips, and rationale.

All durations are in seconds. Metric data is retained for a minimum of 60 days. By default, every installation dispatches all of its events; high-volume apps can sample per installation with `configure({ sampleRate })` — see [Sampling](https://docs.expo.dev/eas/observe/configuration/#sampling).

## Target thresholds

| Metric | Full name | Target | Auto-collected? |
|---|---|---|---|
| Cold launch | `expo.app_startup.cold_launch_time` | **< 1.5s** | Yes (native-only — JS code does not affect it) |
| Warm launch | `expo.app_startup.warm_launch_time` | **< 0.5s** | Yes (OS decides when warm vs cold happens) |
| Bundle load | `expo.app_startup.bundle_load_time` | **< 0.3s** | Yes (JS load + evaluation, before `runApplication`) |
| Time to first render (TTR) | `expo.app_startup.ttr` | **< 2s** incl. cold launch | Yes when root is wrapped with `AppMetricsRoot` (SDK 55) / `ObserveRoot` (SDK 56+) |
| Time to interactive (TTI) | `expo.app_startup.tti` | **< 3s** incl. cold launch | **No** — call `markInteractive()` once the screen is genuinely usable |

Both TTR and TTI are measured *from native launch* through the React render, so the cold-launch portion counts against them.

## Interpreting TTI events (automatic params)

Every TTI event carries automatic params in three groups: frame rate, device state, and network state. Read the frame-rate group to classify *what kind* of slowness you're seeing, then read the device and network groups to decide whether the cause is the code or the conditions.

### Frame rate — what kind of slowness

| Param | Definition | What it indicates |
|---|---|---|
| `expo.frameRate.slowFrames` | Count of frames ≥ 17ms | Main thread consistently busy during launch (heavy layout, sync bridge calls, too many components rendering) |
| `expo.frameRate.frozenFrames` | Count of frames ≥ 700ms | Hard freezes. Even one during startup is a serious issue (sync I/O, large JSON parsing, blocking network) |
| `expo.frameRate.totalDelay` | Total accumulated time (seconds) frames exceeded their target duration | Best single "smoothness" number — compare to TTI |

**Diagnostic patterns:**

- **High TTI + low totalDelay** → slow but smooth. The launch sequence itself is long. Optimize bundle size, data-fetch waterfalls, initialization chains.
- **High TTI + high totalDelay + many slowFrames** → main-thread contention. Offload work, simplify the initial render tree.
- **High TTI + high totalDelay + any frozenFrames** → something is blocking hard. Look for synchronous I/O, large JSON parsing, or blocking network calls.

### Device state — is the regression environmental?

| Param | Type | What it indicates |
|---|---|---|
| `expo.device.lowPowerMode` | boolean | OS power saver was active (Low Power Mode on iOS, Battery Saver on Android). It throttles CPU, GPU, and background work. A regression that disappears when you filter this out is environmental, not a code change. |
| `expo.device.thermalState` | `nominal` \| `fair` \| `serious` \| `critical` \| `unknown` | Sustained `serious`/`critical` means the OS is throttling. Startup slows independently of any app change. |
| `expo.device.batteryLevel` | number, 0–1 | Fractional charge at TTI. Rules out throttling on devices that manage performance aggressively at low charge. Omitted when the OS reports no value. |
| `expo.device.batteryCharging` | boolean | Charging raises sustained CPU ceilings on iOS and some Android OEMs. Non-charging samples are the more conservative population. |

### Network state — is startup network-bound?

| Param | Type | What it indicates |
|---|---|---|
| `expo.network.connected` | boolean | If TTI degrades only when `true`, startup is network-bound. If it degrades when `false`, the app does too much before showing cached content. |
| `expo.network.type` | `wifi` \| `cellular` \| `ethernet` \| `none` \| `other` \| `unknown` | Compare cellular against Wi-Fi. A large gap points to network-bound startup work. VPN traffic reports the underlying transport. The value set is identical on both platforms, so dashboards need no per-platform branching. |
| `expo.network.isExpensive` | boolean | Both platforms. The OS considers the connection metered (cellular, hotspot). Present only when a network exists. |
| `expo.network.isConstrained` | boolean | **iOS only.** Low Data Mode is on for this path, so the system defers background transfers. |
| `expo.network.dataSaverEnabled` | boolean | **Android only.** Data Saver is on. It is the nearest equivalent of Low Data Mode, but process-wide rather than per-path, hence the separate key. |

### Network requests — was the network the cause?

TTI events summarize the HTTP requests made during launch, from the end of the native launch to the `markInteractive()` call. Traffic is observed automatically — `URLSession` on iOS, `OkHttpClient` on Android, which covers `fetch` — and Observe's own uploads are excluded. All of these are omitted when the window held no requests.

| Param | Unit | What it indicates |
|---|---|---|
| `expo.network.requests.count` | count | Requests that finished in the window. A request still in flight when the app became interactive is not counted anywhere in this table. |
| `expo.network.requests.failed` | count | Errored, returned 4xx/5xx, never got a response, or broke partway through the body. Redirects are not failures. |
| `expo.network.requests.bytesReceived` / `.bytesSent` | bytes | On-the-wire totals for the window. |
| `expo.network.requests.totalDuration` | seconds | Sum of every request duration, failures included. Exceeds wall-clock when requests overlap; one timeout contributes the client's full timeout interval. |
| `expo.network.requests.throughputBytesPerSecond` | bytes/sec | Received bytes over the time bytes were actually moving (union of transfer windows, measured from each first byte). Excludes DNS, connect, server think time, cache hits, and failures. Requests the OS did not clearly identify as network loads are excluded too. Omitted when nothing was received. |
| `expo.network.requests.slowest.duration` | seconds | The single longest **completed** request. Requests that never produced a response are excluded, since a timeout measures the client's own setting. |
| `expo.network.requests.slowest.host` | string | Host of that request. |
| `expo.network.requests.slowest.statusCode` | number | Explains an empty response: `bytesReceived` of 0 is routine on a 304, a problem on a 200. |
| `expo.network.requests.slowest.timeToFirstByte` | seconds | Includes server processing, so treat it as a proxy for network quality, not a measurement of it. |
| `expo.network.requests.slowest.bytesReceived` | bytes | Separates "slow because it moved a lot of data" from "slow while idle". |

**Diagnostic patterns:**

- **`slowest.duration` mostly `timeToFirstByte`** → the server was slow to answer. Optimize the endpoint, or stop blocking startup on it.
- **Small `timeToFirstByte` + large `bytesReceived`** → the transfer itself was slow. Shrink the payload or defer it.
- **High `failed` + high `totalDuration`** → the launch burned time on requests that never arrived. Add timeouts and render cached content first.
- **Low `throughputBytesPerSecond` on `wifi`** → suspect the population, not the code; cross-check `isExpensive` and `isConstrained` / `dataSaverEnabled`.

> The summary is bounded by an in-memory ring buffer of the 200 most recent requests. A launch that makes more undercounts, so read these as a sample of a very busy window.

### Custom params

You can attach your own params to the TTI event, and override the route name it is tagged with. See [`./setup.md`](./setup.md) for the call syntax.

## Dispatch caveats

- **Debug builds** (native debug OR JS bundle with `__DEV__` = true) do **not** dispatch metrics unless `configure({ dispatchInDebug: true })` is set.
- The `environment` tag (defaults to `process.env.NODE_ENV`) is metadata only — it does not gate dispatch by itself.
- Offline events are buffered on-device and flushed when the app backgrounds or `Observe.dispatchEvents()` is called.

## Cross-references

- Full metric definitions and optimization guidance: https://docs.expo.dev/eas/observe/reference/metrics/
- Setup steps (`AppMetricsRoot` / `ObserveRoot`, `markInteractive`): see [`./setup.md`](./setup.md).
- Querying metrics via the EAS CLI: see [`./queries.md`](./queries.md).
