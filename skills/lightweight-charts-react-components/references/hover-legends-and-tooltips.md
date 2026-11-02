# Hover legends and tooltips

Use this for “show OHLC under the cursor,” a persistent latest-bar legend, or a
floating details box. The chart renders a canvas; the wrapper supplies event
handlers but no tooltip or legend UI. Keep the HTML details alongside the chart
in a positioned application container.

## Architecture choices

- Use `onCrosshairMove` on `Chart`; the wrapper owns subscription and cleanup.
  Do not also call `subscribeCrosshairMove()` for the same handler.
- Look up `param.seriesData` by the **native series API** returned by
  `seriesRef.current.api()`. The map is not keyed by wrapper refs or string IDs.
- The map can omit a series at a given time. Check presence and the appropriate
  shape (`close` for candles, `value` for lines/histograms) before reading values.
- Keep selection by time and read current data from the application snapshot.
  Updating the currently hovered candle then updates the legend even when the
  pointer stays still. Comparing only timestamps would leave stale OHLC values.
- Ignore identical selection/position updates. Native option/data updates can
  emit crosshair events; always creating new React state can feed back into
  another options update and cause a render loop. Selection equality is safe
  here because displayed OHLC comes from current data, not cached event values.
- `param.point` is local to the chart pane, not the viewport. This recipe is for
  one pane; add each pane's DOM offset for tooltips over a multi-pane chart.

## Recipe: live OHLC legend and clamped tooltip

`data` is normalized, ascending, unique UTC-second candles; the initial snapshot
is ready before mounting. The application owns live updates through the complete
array. Copy this as one component module. The details are React text, so symbol
labels and values are not interpolated into `innerHTML`.

```tsx
import { useCallback, useMemo, useRef, useState } from "react";
import type { CandlestickData, MouseEventParams, UTCTimestamp } from "lightweight-charts";
import {
  CandlestickSeries,
  Chart,
  TimeScale,
  TimeScaleFitContentTrigger,
  type SeriesApiRef,
} from "lightweight-charts-react-components";

type Hover = { time: UTCTimestamp; x: number; y: number };
const tooltipWidth = 190;
const tooltipHeight = 96;
const chartOptions = { autoSize: true, timeScale: { timeVisible: true } };

export function CandleDetails({
  symbol,
  data,
}: {
  symbol: string;
  data: CandlestickData<UTCTimestamp>[];
}) {
  const seriesRef = useRef<SeriesApiRef<"Candlestick">>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const byTime = useMemo(() => new Map(data.map(bar => [bar.time, bar])), [data]);
  const selected = hover ? byTime.get(hover.time) : undefined;
  // Leaving the plot, missing data, and an empty dataset are distinct states.
  const legend = selected ?? data[data.length - 1];

  const onCrosshairMove = useCallback((param: MouseEventParams) => {
    const series = seriesRef.current?.api();
    const container = containerRef.current;
    const point = param.point;
    if (
      !series ||
      !container ||
      !point ||
      typeof param.time !== "number" ||
      point.x < 0 ||
      point.y < 0 ||
      point.x > container.clientWidth ||
      point.y > container.clientHeight
    ) {
      setHover(null);
      return;
    }
    const bar = param.seriesData.get(series);
    if (!bar || !("close" in bar)) {
      setHover(null);
      return;
    }
    // Clamp in the same coordinate system as the positioned chart container.
    // If the card is narrower than the tooltip, CSS also shrinks its width.
    const width = Math.min(tooltipWidth, container.clientWidth);
    const x = Math.max(0, Math.min(point.x + 12, container.clientWidth - width));
    const y = Math.max(0, Math.min(point.y + 12, container.clientHeight - tooltipHeight));
    const next = { time: param.time as UTCTimestamp, x, y };
    // Native updates can emit the same crosshair event without pointer movement.
    // Preserve state identity in that case; current data still refreshes OHLC.
    setHover(previous =>
      previous?.time === next.time && previous.x === x && previous.y === y
        ? previous
        : next
    );
  }, []);

  const describe = (bar: CandlestickData<UTCTimestamp>) =>
    `O ${bar.open.toFixed(2)} · H ${bar.high.toFixed(2)} · L ${bar.low.toFixed(2)} · C ${bar.close.toFixed(2)}`;

  return (
    <section style={{ minWidth: 0 }}>
      <p>
        {symbol}: {legend ? describe(legend) : "No data"}
      </p>
      <div style={{ position: "relative" }}>
        <Chart
          containerRef={containerRef}
          containerProps={{ style: { height: 360 } }}
          options={chartOptions}
          onCrosshairMove={onCrosshairMove}
        >
          <CandlestickSeries ref={seriesRef} data={data} />
          <TimeScale>
            <TimeScaleFitContentTrigger deps={[]} />
          </TimeScale>
        </Chart>
        {hover && selected && (
          <div
            style={{
              position: "absolute",
              left: hover.x,
              top: hover.y,
              width: tooltipWidth,
              maxWidth: "100%",
              height: tooltipHeight,
              boxSizing: "border-box",
              padding: 10,
              background: "#0f172a",
              color: "white",
              borderRadius: 4,
              pointerEvents: "none", // Hover details must not steal chart pointer events.
              zIndex: 2,
            }}
          >
            <strong>{symbol}</strong>
            <div>{new Date(selected.time * 1000).toISOString().slice(0, 16)} UTC</div>
            <div style={{ fontSize: 12 }}>{describe(selected)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
```

The plain 2-decimal formatter is appropriate only for assets with that precision.
Use the same precision as the series' `priceFormat` for other tick sizes. For
business dates, format the date fields directly; a numeric timestamp is epoch
seconds and requires multiplying by 1000 before constructing a `Date`.

This recipe falls back to the latest candle when the hovered series has no
data. If the user wants to distinguish a gap from leaving the chart, keep an
explicit “gap” state and show “No bar at this time” instead. A timezone or locale
formatter changes labels, never the underlying bar timestamps.

## Adaptation: several series or a fixed legend

For several lines, keep refs indexed by a stable application series ID. For each
series, retrieve its native API, then read `param.seriesData.get(api)`. Display
`—` when the map has no point; do not show another asset's value at the same
logical index. Derive labels/colors from the application's ID mapping, not the
order in which map entries happen to appear.

For a fixed legend, omit the floating box and position updates. Keep the selected
time and derive the displayed values from the latest data, as above. For very
high pointer-event rates, batch the HTML update with `requestAnimationFrame`;
cancel the pending frame on cleanup. Avoid writing React state for every series
separately within one crosshair callback.

For a tooltip in a scrollable portal attached to `document.body`, convert the
chart-local coordinate using `getBoundingClientRect()` and the portal's positioning
model. Do not reuse the local x/y unchanged as page coordinates. With multiple
panes, `param.paneIndex` identifies the source pane; compute its offset or put the
tooltip inside the appropriate pane container.

## Acceptance checks

- Hover first/last bars and whitespace; leave the canvas and price axis. Missing
  map entries never throw, the floating box disappears, and the legend falls back.
- Update a hovered candle at the same timestamp without moving the pointer.
  Its OHLC changes in the legend and tooltip.
- Hover near all four edges at a narrow width. The box remains inside the chart
  and does not prevent dragging, scrolling, or crosshair movement.
- Do not suppress legend updates when only the hovered timestamp matches: a live
  same-bar revision keeps the time but changes the values. Guard against a
  missing lookup entry before reading candle fields.
- For multi-series adaptation, test different calendars and missing points.
