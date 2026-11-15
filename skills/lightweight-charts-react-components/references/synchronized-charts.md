# Synchronized charts

Use this when independent chart cards need shared scrolling, zoom, and a cursor:
for example a price chart beside a benchmark or two separate dashboard widgets.
For price, volume, and indicators in a vertically stacked view, first use
[one chart with panes](price-volume-and-indicators.md); the shared horizontal scale
already provides that coordination.

The library has no dedicated synchronization component; the recipe below combines
the public chart and time-scale APIs.

## Choose the synchronization coordinate

| Relationship                        | Range to synchronize          | Constraint                                   |
| ----------------------------------- | ----------------------------- | -------------------------------------------- |
| Identical timestamp grid            | Time bounds or logical bounds | Same time/index meaning in both charts       |
| Different calendars or missing bars | Time bounds                   | Logical index 50 need not mean the same date |
| Same visible bar count only         | Logical bounds                | This is not necessarily calendar alignment   |

The recipe below requires the **same complete UTC-second grid in both charts**.
Use time bounds so the intended calendar window is explicit. With differing
histories, upstream range clamping can produce competing ranges; normalize the
shared domain first or use a designated leader and a documented follower-clamping
policy. Do not blindly use bidirectional callbacks over incompatible domains.

## Recipe: two line charts with range and crosshair synchronization

`first` and `second` contain sorted unique real-valued points with identical
timestamps. Mount by dataset identity after both snapshots load. Chart widths
can differ: time bounds synchronize the displayed dates, not pixel spacing.
`CrosshairMode.Normal` keeps cursor behavior predictable when transferring a
time/value to another series.

```tsx
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CrosshairMode } from "lightweight-charts";
import type {
  IChartApi,
  IRange,
  LineData,
  MouseEventParams,
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

type Side = "first" | "second";
type Point = LineData<UTCTimestamp>;

export function SynchronizedCharts({
  first,
  second,
}: {
  first: Point[];
  second: Point[];
}) {
  const firstChart = useRef<ChartApiRef<Time, IChartApi>>(null);
  const secondChart = useRef<ChartApiRef<Time, IChartApi>>(null);
  const firstSeries = useRef<SeriesApiRef<"Line">>(null);
  const secondSeries = useRef<SeriesApiRef<"Line">>(null);
  const forwardingRange = useRef(false);
  const pointerOwner = useRef<Side | null>(null);
  const firstValues = useMemo(
    () => new Map(first.map(point => [point.time, point.value])),
    [first]
  );
  const secondValues = useMemo(
    () => new Map(second.map(point => [point.time, point.value])),
    [second]
  );

  const forwardRange = useCallback((source: Side, range: IRange<Time> | null) => {
    if (!range || forwardingRange.current) return;
    const target = (source === "first" ? secondChart : firstChart).current
      ?.api()
      ?.timeScale();
    if (!target) return;
    const existing = target.getVisibleRange();
    // Equality also stops deferred notifications after the synchronous guard
    // has been cleared. Inputs here use numeric timestamps exclusively.
    if (existing?.from === range.from && existing?.to === range.to) return;
    forwardingRange.current = true;
    try {
      target.setVisibleRange(range);
    } finally {
      forwardingRange.current = false;
    }
  }, []);

  const forwardCrosshair = useCallback(
    (source: Side, param: MouseEventParams) => {
      // Only a chart currently under the user's pointer can lead. Programmatic
      // changes on the follower must not become new input on the source.
      if (pointerOwner.current !== source) return;
      const targetChart = (source === "first" ? secondChart : firstChart).current?.api();
      const targetSeries = (
        source === "first" ? secondSeries : firstSeries
      ).current?.api();
      const values = source === "first" ? secondValues : firstValues;
      if (!targetChart || !targetSeries) return;
      const value =
        typeof param.time === "number"
          ? values.get(param.time as UTCTimestamp)
          : undefined;
      if (!param.point || value === undefined || typeof param.time !== "number") {
        targetChart.clearCrosshairPosition();
        return;
      }
      // A matching time uses the target's own value, never the source's price or
      // y pixel. The target series provides the correct price scale and pane.
      targetChart.setCrosshairPosition(value, param.time, targetSeries);
    },
    [firstValues, secondValues]
  );

  useEffect(() => {
    let frame = 0;
    const initialize = () => {
      const a = firstChart.current?.api();
      const b = secondChart.current?.api();
      if (!a || !b || !firstSeries.current?.api() || !secondSeries.current?.api()) {
        frame = requestAnimationFrame(initialize);
        return;
      }
      a.timeScale().fitContent();
      const range = a.timeScale().getVisibleRange();
      if (range) b.timeScale().setVisibleRange(range);
    };
    initialize();
    return () => cancelAnimationFrame(frame);
  }, []);

  const leave = () => {
    pointerOwner.current = null;
    firstChart.current?.api()?.clearCrosshairPosition();
    secondChart.current?.api()?.clearCrosshairPosition();
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: 16,
      }}
    >
      <Chart
        ref={firstChart}
        options={{ autoSize: true, crosshair: { mode: CrosshairMode.Normal } }}
        containerProps={{
          style: { height: 300 },
          onPointerEnter: () => {
            pointerOwner.current = "first";
          },
          onPointerLeave: leave,
        }}
        onCrosshairMove={param => forwardCrosshair("first", param)}
      >
        <LineSeries ref={firstSeries} data={first} options={{ color: "#2563eb" }} />
        <TimeScale onVisibleTimeRangeChange={range => forwardRange("first", range)} />
      </Chart>
      <Chart
        ref={secondChart}
        options={{ autoSize: true, crosshair: { mode: CrosshairMode.Normal } }}
        containerProps={{
          style: { height: 300 },
          onPointerEnter: () => {
            pointerOwner.current = "second";
          },
          onPointerLeave: leave,
        }}
        onCrosshairMove={param => forwardCrosshair("second", param)}
      >
        <LineSeries ref={secondSeries} data={second} options={{ color: "#ea580c" }} />
        <TimeScale onVisibleTimeRangeChange={range => forwardRange("second", range)} />
      </Chart>
    </div>
  );
}
```

Use `onPointerDown` as another owner-setting signal when adapting to touch input
whose hover behavior differs. The wrapper cleans up `TimeScale` and chart
subscriptions; this recipe cleans up only its own readiness frame. Do not remove
wrapper-owned native charts in a separate effect.

## Adaptation and failure modes

For intrabar precision or future right-side whitespace on identical grids, logical
bounds can preserve fractional bar positions better than time bounds. Replace
both range callbacks and getters/setters consistently with their logical variants,
and compare both numeric endpoints before setting. Keep a reentrancy guard as well.

For different calendars, resolve the target crosshair by exact time and clear it
when missing, as above. If the product wants nearest-previous matching, implement
that search deliberately and indicate the actual matched timestamp in hover UI.
Never copy the source y pixel or use its price on a target with different units.

Two independently fitting charts can undo synchronization after data changes.
Let a selected leader choose the view after both datasets update; follower charts
should not also fit on each tick. For large dashboard grids, store one shared
range in the application and broadcast only when endpoints change.

## Acceptance checks

- Pan/zoom either chart and verify the other shows matching dates without an
  event loop. Test differing widths and a resize of the cards.
- Move the crosshair in both directions. The target selects its own value at the
  same time, even when one series' values are 100 times larger.
- Leave a card or hover missing data: the follower cursor clears. Programmatic
  updates never become a new crosshair leader.
- Remount under a new dataset key and verify old callbacks/frames do not retain
  the removed chart. Test any calendar policy added during adaptation.
