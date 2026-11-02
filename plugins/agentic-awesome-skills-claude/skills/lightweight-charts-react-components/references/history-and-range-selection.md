# History and range selection

Use this when a user scrolls left to fetch older bars, selects a different symbol
or interval, or switches between preset viewing windows. These are distinct
operations: adding history should preserve the view, changing dataset identity
should reset it, and choosing a window should change only the visible range when
the required data is already loaded.

## Recipe: prepend older history without losing the viewed bars

This is a **single-series intraday chart**. `initialData` is a nonempty ascending,
unique array of UTC-second line points. `loadOlder(before, signal)` returns
normalized ascending points and an explicit `hasMore`. Its cursor is exclusive;
the recipe also discards overlap defensively. Mount with a new key for a new
dataset. The adapter owns transport, authentication, and response validation.

Use chart-owned data for this recipe so `setData()` and range restoration occur
together. Capturing the range when a request starts would undo any panning the
user performs while waiting; capture it immediately before applying the response.

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IChartApi,
  LineData,
  LogicalRange,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import {
  Chart,
  LineSeries,
  TimeScale,
  type ChartApiRef,
  type SeriesApiRef,
} from "lightweight-charts-react-components";

type Point = LineData<UTCTimestamp>;
type HistoryPage = { data: Point[]; hasMore: boolean };
type LoadOlder = (before: UTCTimestamp, signal: AbortSignal) => Promise<HistoryPage>;

export function PaginatedHistory({
  initialData,
  loadOlder,
}: {
  initialData: Point[];
  loadOlder: LoadOlder;
}) {
  const [seed] = useState(() => initialData.map(point => ({ ...point })));
  const rows = useRef(seed);
  const chartRef = useRef<ChartApiRef<Time, IChartApi>>(null);
  const seriesRef = useRef<SeriesApiRef<"Line">>(null);
  const alive = useRef(false);
  const inFlight = useRef<AbortController | null>(null);
  const exhausted = useRef(false);
  const failed = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOlder = useCallback(async () => {
    const series = seriesRef.current?.api();
    const scale = chartRef.current?.api()?.timeScale();
    const first = rows.current[0];
    if (!alive.current || !series || !scale || !first) return;
    if (inFlight.current || exhausted.current || failed.current) return;

    // A ref locks synchronously; React loading state alone allows duplicate
    // requests when several range events arrive before a render.
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setError(null);
    try {
      const page = await loadOlder(first.time, controller.signal);
      if (!alive.current || controller.signal.aborted) return;

      const byTime = new Map<UTCTimestamp, Point>();
      for (const point of page.data) {
        if (point.time < first.time) byTime.set(point.time, { ...point });
      }
      const older = [...byTime.values()].sort((a, b) => a.time - b.time);
      if (older.length === 0 && page.hasMore) {
        throw new Error("History cursor made no progress");
      }

      if (older.length > 0) {
        const visible = scale.getVisibleLogicalRange();
        rows.current = [...older, ...rows.current];
        series.setData(rows.current);
        if (visible) {
          // Each inserted point shifts the old point's index by one. Translate
          // both bounds to keep the same old bars and the same zoom width.
          scale.setVisibleLogicalRange({
            from: visible.from + older.length,
            to: visible.to + older.length,
          });
        }
      }
      exhausted.current = !page.hasMore;
    } catch (cause) {
      if (alive.current && !controller.signal.aborted) {
        // Stop event-driven retries after a failure. Let the user retry once
        // instead of turning a drag into a loop of failed network requests.
        failed.current = true;
        setError(cause instanceof Error ? cause.message : "History load failed");
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
      if (alive.current) setLoading(false);
    }
  }, [loadOlder]);

  const onRange = useCallback(
    (range: LogicalRange | null) => {
      if (!range) return;
      const bars = seriesRef.current?.api()?.barsInLogicalRange(range);
      if (bars && bars.barsBefore < 20) void requestOlder();
    },
    [requestOlder]
  );

  useEffect(() => {
    alive.current = true;
    let frame = 0;
    const initializeView = () => {
      const series = seriesRef.current?.api();
      const scale = chartRef.current?.api()?.timeScale();
      if (!series || !scale) {
        frame = requestAnimationFrame(initializeView);
        return;
      }
      // Start near the tail. No fit trigger runs after a page is prepended.
      scale.setVisibleLogicalRange({
        from: Math.max(0, seed.length - 80),
        to: seed.length - 1 + 5,
      });
      onRange(scale.getVisibleLogicalRange());
    };
    initializeView();
    return () => {
      alive.current = false;
      cancelAnimationFrame(frame);
      inFlight.current?.abort();
    };
  }, [seed, onRange]);

  return (
    <section>
      <p>{loading ? "Loading older history…" : "Scroll left for older history"}</p>
      {error && (
        <button
          onClick={() => {
            failed.current = false;
            void requestOlder();
          }}
        >
          Retry: {error}
        </button>
      )}
      <Chart
        ref={chartRef}
        options={{ autoSize: true, timeScale: { timeVisible: true } }}
        containerProps={{ style: { height: 360 } }}
      >
        <LineSeries ref={seriesRef} data={seed} reactive={false} />
        <TimeScale onVisibleLogicalRangeChange={onRange} />
      </Chart>
    </section>
  );
}
```

Keep `loadOlder` stable for one dataset. Changing it restarts the view initialization
effect; changing the dataset should instead remount with a new key. The cancellation
check protects against transports that resolve even after abort.

The index translation above assumes each prepended point adds one chart timeline
position. With several series, logical indices refer to their **union of times**.
Build one aligned timeline for all series and calculate the number of newly added
timeline positions. Do not shift by the page length of an arbitrary indicator.
If a live feed also owns the tail, merge against the current history at response
time and apply updates through the same data owner; do not let the captured request
snapshot overwrite newer ticks.

## Recipe: symbol or interval replacement with stale-response protection

Here the API returns a complete normalized OHLC snapshot. Copy this as a separate
module. A selection ID labels each response, and a chart is mounted only for the
matching result. This prevents showing the prior symbol under the new label and
gives the new dataset its own initial fit.

```tsx
import { useEffect, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import {
  CandlestickSeries,
  Chart,
  TimeScale,
  TimeScaleFitContentTrigger,
} from "lightweight-charts-react-components";

type Interval = "1h" | "1d";
type Selection = { symbol: string; interval: Interval };
type Snapshot = CandlestickData<UTCTimestamp>[];
type LoadSnapshot = (selection: Selection, signal: AbortSignal) => Promise<Snapshot>;

export function InstrumentHistory({ loadSnapshot }: { loadSnapshot: LoadSnapshot }) {
  const [selection, setSelection] = useState<Selection>({
    symbol: "ASSET_A",
    interval: "1d",
  });
  // The effect depends on these values: re-clicking the current interval creates a
  // new selection object but must not refetch or reset the view.
  const { symbol, interval } = selection;
  const id = `${symbol}:${interval}`;
  const [result, setResult] = useState<{ id: string; data: Snapshot } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult(null);
    setError(null);
    void loadSnapshot({ symbol, interval }, controller.signal).then(
      data => {
        if (active) setResult({ id, data });
      },
      cause => {
        if (active) {
          setError({
            id,
            message: cause instanceof Error ? cause.message : "Load failed",
          });
        }
      }
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, symbol, interval, loadSnapshot, retry]);

  const current = result?.id === id ? result : null;
  return (
    <section>
      <select
        aria-label="Instrument"
        value={selection.symbol}
        onChange={event =>
          setSelection(previous => ({ ...previous, symbol: event.target.value }))
        }
      >
        <option value="ASSET_A">Asset A</option>
        <option value="ASSET_B">Asset B</option>
      </select>
      <button onClick={() => setSelection(previous => ({ ...previous, interval: "1h" }))}>
        Hourly
      </button>
      <button onClick={() => setSelection(previous => ({ ...previous, interval: "1d" }))}>
        Daily
      </button>
      {error?.id === id ? (
        <button onClick={() => setRetry(value => value + 1)}>
          Retry: {error.message}
        </button>
      ) : !current ? (
        <p>Loading {id}…</p>
      ) : current.data.length === 0 ? (
        <p>No history for {id}</p>
      ) : (
        <Chart
          key={id}
          options={{
            autoSize: true,
            timeScale: { timeVisible: selection.interval === "1h" },
          }}
          containerProps={{ style: { height: 360 } }}
        >
          <CandlestickSeries data={current.data} alwaysReplaceData />
          <TimeScale>
            <TimeScaleFitContentTrigger deps={[]} />
          </TimeScale>
        </Chart>
      )}
    </section>
  );
}
```

Supply a stable `loadSnapshot` adapter. If a same-symbol refresh should preserve
zoom, keep the chart mounted, replace the full data array, and avoid a new fit
trigger. The recipe intentionally resets on selection because the data identity
and interval changed.

For a preset such as “last month” over already-loaded data, keep the series data
intact and call `timeScale.setVisibleRange({ from, to })` with matching time types,
or update `TimeScale`'s `visibleRange` prop after initialization. For “last 100
bars,” use logical bounds. Do not pass visible-range bounds and a fit trigger for
the same interaction: the fit trigger can overwrite the requested range.
Changing `timeVisible` formats an axis; it does not aggregate daily bars into
hourly bars. The data adapter must return the chosen granularity.

## Acceptance checks

- Drag left rapidly: one request is in flight, overlapping timestamps are not
  duplicated, and the bars visible at response time stay visible after prepend.
- Pan again before the response arrives; the eventual response preserves that
  later view. Keep scrolling until `hasMore` is false; requests stop.
- Simulate an error: the chart remains usable and retry is explicit. Unmount
  while fetching: no response updates a removed chart.
- Select A, B, and a new interval rapidly. Return A's response last and verify
  that only the final selection renders. Cover empty snapshots and retry.
- Click the interval that is already selected: no request starts and the chart
  keeps its zoom and scroll position.
