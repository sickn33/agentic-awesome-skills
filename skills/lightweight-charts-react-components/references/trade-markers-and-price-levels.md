# Trade markers and price levels

Use this for execution history, strategy signals, entry/stop/target overlays, or
click-to-place horizontal levels. These are visual annotations. The chart does
not execute orders, persist edits, or turn a marker into a drawing tool.

## Choose the annotation by what it represents

| Requirement                                                | Primitive                           | Ownership                                                  |
| ---------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| An execution or signal at a candle                         | `Markers`                           | Child of the candle series                                 |
| A horizontal entry, stop, target, or alert level           | `PriceLine`                         | Child of the series whose price scale it uses              |
| A vertical event line, region, or arbitrary custom drawing | `SeriesPrimitive` / `PanePrimitive` | See [session overlays](session-overlays-and-primitives.md) |

Keep domain IDs stable. A level's React key must be its ID, not its changing price,
so edits update an existing price line. Marker order must be ascending by time;
multiple markers can belong to one candle. `Markers` expects the **complete list**
on every reactive change, including `[]` to clear it.

## Recipe: executions, editable levels, and click-to-place alerts

`candles` is an ascending unique UTC-second snapshot. Each execution's `barTime`
already identifies its containing candle on that exact timeline. The market-data
adapter must map an execution instant to a bar using the venue's interval and
session rules. A naive local-time rounding operation is unsafe for session-based
bars. Events outside loaded history are retained upstream and become visible
when that history is loaded.

```tsx
import { useCallback, useMemo, useRef, useState } from "react";
import { LineStyle } from "lightweight-charts";
import type {
  CandlestickData,
  MouseEventParams,
  SeriesMarker,
  UTCTimestamp,
} from "lightweight-charts";
import {
  CandlestickSeries,
  Chart,
  Markers,
  Pane,
  PriceLine,
  TimeScale,
  TimeScaleFitContentTrigger,
  type SeriesApiRef,
} from "lightweight-charts-react-components";

type Execution = {
  id: string;
  barTime: UTCTimestamp;
  side: "buy" | "sell";
  quantity: number;
};
type Level = { id: string; price: number; title: string; color: string };

const quantize = (rawPrice: number, tickSize: number, precision: number) =>
  Number((Math.round(rawPrice / tickSize) * tickSize).toFixed(precision));

function PriceInput({
  price,
  tickSize,
  precision,
  onCommit,
}: {
  price: number;
  tickSize: number;
  precision: number;
  onCommit: (price: number) => void;
}) {
  // Hold the typed text and round on commit. Rounding each keystroke would rewrite
  // the field mid-entry: with a tick of 5, typing "105" would turn "1" into 0.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const rawPrice = Number(draft);
    if (draft !== "" && Number.isFinite(rawPrice)) {
      onCommit(quantize(rawPrice, tickSize, precision));
    }
  };
  return (
    <input
      type="number"
      step={tickSize}
      value={draft ?? price}
      onChange={event => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === "Enter") commit();
      }}
    />
  );
}

export function TradeAnnotations({
  candles,
  executions,
  initialLevels,
  tickSize,
  precision,
}: {
  candles: CandlestickData<UTCTimestamp>[];
  executions: Execution[];
  initialLevels: Level[];
  tickSize: number;
  precision: number;
}) {
  const seriesRef = useRef<SeriesApiRef<"Candlestick">>(null);
  const [levels, setLevels] = useState(initialLevels);
  const [showExecutions, setShowExecutions] = useState(true);
  const [placing, setPlacing] = useState(false);

  const markers = useMemo<SeriesMarker<UTCTimestamp>[]>(() => {
    if (!showExecutions) return [];
    const loadedTimes = new Set(candles.map(bar => bar.time));
    return executions
      .filter(execution => loadedTimes.has(execution.barTime))
      .map(execution => ({
        id: execution.id,
        time: execution.barTime,
        position:
          execution.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
        shape: execution.side === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
        color: execution.side === "buy" ? "#16a34a" : "#dc2626",
        text: `${execution.side.toUpperCase()} ${execution.quantity}`,
      }))
      .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  }, [candles, executions, showExecutions]);

  const onClick = useCallback(
    (param: MouseEventParams) => {
      if (!placing || !param.point || !(tickSize > 0) || !Number.isFinite(tickSize))
        return;
      const series = seriesRef.current?.api();
      if (!series || param.paneIndex !== series.getPane().paneIndex()) return;
      // Convert from pane-local pixels using the target series' actual scale.
      // point.y is not a price and may refer to an unrelated pane.
      const rawPrice = series.coordinateToPrice(param.point.y);
      if (rawPrice === null || !Number.isFinite(rawPrice)) return;
      const price = quantize(rawPrice, tickSize, precision);
      const id = crypto.randomUUID();
      setLevels(previous => [
        ...previous,
        { id, price, title: "Alert", color: "#f59e0b" },
      ]);
      setPlacing(false);
    },
    [placing, tickSize, precision]
  );

  return (
    <section>
      <button onClick={() => setShowExecutions(value => !value)}>
        {showExecutions ? "Hide executions" : "Show executions"}
      </button>
      <button onClick={() => setPlacing(value => !value)}>
        {placing ? "Cancel placement" : "Place alert level"}
      </button>
      <Chart
        options={{ autoSize: true }}
        containerProps={{ style: { height: 360 } }}
        onClick={onClick}
      >
        <Pane>
          <CandlestickSeries
            ref={seriesRef}
            data={candles}
            options={{
              priceLineVisible: false,
              priceFormat: { type: "price", minMove: tickSize, precision },
            }}
          >
            <Markers markers={markers} options={{ zOrder: "normal" }} />
            {levels.map(level => (
              <PriceLine
                key={level.id}
                price={level.price}
                options={{
                  title: level.title,
                  color: level.color,
                  lineStyle: LineStyle.Dashed,
                  axisLabelVisible: true,
                }}
              />
            ))}
          </CandlestickSeries>
        </Pane>
        <TimeScale>
          <TimeScaleFitContentTrigger deps={[]} />
        </TimeScale>
      </Chart>
      {levels.map(level => (
        <label key={level.id} style={{ display: "block" }}>
          {level.title}
          <PriceInput
            price={level.price}
            tickSize={tickSize}
            precision={precision}
            onCommit={price =>
              setLevels(previous =>
                previous.map(item => (item.id === level.id ? { ...item, price } : item))
              )
            }
          />
          <button
            onClick={() =>
              setLevels(previous => previous.filter(item => item.id !== level.id))
            }
          >
            Remove
          </button>
        </label>
      ))}
    </section>
  );
}
```

Validate `tickSize` as a positive finite number and `precision` as the instrument's
supported nonnegative integer before rendering. The rounding above is display
rounding for a tick grid starting at zero. Instruments with different price-band
rules need the venue-specific quantizer; do not reuse this as an order validator.
`initialLevels` is a mount-time seed. Mount by instrument ID or replace it with a
controlled `levels`/`onLevelsChange` contract when annotation state lives upstream.

## Lifecycle and adaptation details

`PriceLine` reacts to both `price` and `options` changes and removes its upstream
line when unmounted. The explicit `price` prop is separate from `options`; do
not put the price only inside options. Disabling the candle series' default last
price line reduces visual confusion with domain levels.

`Markers` creates the upstream plugin and updates marker lists reactively, but
the current hook does not apply new `options` after creation. To change a plugin
option such as `zOrder`, remount `Markers` with a key identifying that option or
call `markersRef.current?.api()?.applyOptions(...)`. The latter requires a
`MarkersApiRef` and initialized API. Showing/hiding the list uses `markers={[]}`
without recreating the plugin.

For marker click details, `MouseEventParams.hoveredObjectId` can identify a marker
whose `id` was supplied. Resolve it against application execution IDs. For
draggable lines or regions, implement interaction and hit testing in a drawing
plugin; `PriceLine` alone has no drag callbacks.

Keep persistence and network changes in the application's annotation store.
Changing local chart state should not imply placing a live order or registering
an alert on a server. Add the application's explicit save/submit flow if requested.

## Acceptance checks

- Add two executions to the same candle, reorder input, and verify sorted markers
  remain. Hide them and verify the complete list is cleared; show them again.
- With a tick of 5, type 105 into a level's price: the field keeps each digit, and
  the line moves on blur or Enter. Clear the field and blur: the price is restored.
- Edit a level's price and title without changing its ID. Remove it and verify the
  line disappears. Change instrument and verify annotations do not leak across it.
- In placement mode, click the price pane at a known price. Verify tick rounding.
  Add another pane and verify clicks there do not create levels on the price series.
- Change marker options and verify the chosen remount/API path actually applies
  them; simply changing the options prop is insufficient in the current hook.
