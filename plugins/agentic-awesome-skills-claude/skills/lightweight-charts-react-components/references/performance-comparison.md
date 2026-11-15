# Performance comparison

Use this when users want to compare several assets whose raw prices differ by
orders of magnitude. A line at 200 and a line at 2 are rarely a useful performance
comparison. Choose and name the comparison baseline before picking a scale mode.

## Two meanings of percentage comparison

| Product requirement                            | Data and scale                                              | Consequence                                             |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Relative movement from the first visible value | Raw prices with `PriceScaleMode.Percentage`                 | Baseline can move when the viewport moves               |
| Return since a fixed date or session open      | Calculate returns upstream, plot on `PriceScaleMode.Normal` | Panning cannot change the meaning of the plotted return |

The recipe below uses a fixed shared baseline. Do not apply percentage scale mode
again to already-calculated returns. It would normalize data a second time and
the starting zero is unsuitable as a percentage denominator.

## Recipe: aligned, fixed-baseline return comparison

Each asset supplies ascending unique UTC-second prices on the desired calendar.
Every value is finite; baseline prices must be positive. Inputs should use the
same currency and adjustment policy when that matters to the requested comparison.
This code displays **price return**, not total return including dividends.

Choose the earliest loaded timestamp present in all assets as the shared baseline.
Keep later gaps as gaps; never invent a price by filling from a different date.
For a contractual “since date X” requirement, have the adapter supply a common
baseline observation at X or report the missing baseline instead of silently
moving it. Mount with a stable dataset key so the initial fit corresponds to the
completed snapshot.

```tsx
import { useMemo, useState } from "react";
import { PriceScaleMode } from "lightweight-charts";
import type { LineData, UTCTimestamp } from "lightweight-charts";
import {
  Chart,
  LineSeries,
  Pane,
  TimeScale,
  TimeScaleFitContentTrigger,
} from "lightweight-charts-react-components";

export type Asset = {
  id: string;
  label: string;
  color: string;
  data: LineData<UTCTimestamp>[];
};

export function buildComparison(assets: Asset[]) {
  if (assets.length === 0) return null;
  const indexes = assets.map(
    asset => new Map(asset.data.map(point => [point.time, point.value]))
  );
  const baselineTime = assets[0].data.find(point =>
    indexes.every(index => index.has(point.time))
  )?.time;
  if (baselineTime === undefined) return null;

  const series = assets.map((asset, index) => {
    const baseline = indexes[index].get(baselineTime);
    if (baseline === undefined || !Number.isFinite(baseline) || baseline <= 0) {
      throw new Error(`Invalid baseline for ${asset.id}`);
    }
    const data = asset.data
      .filter(point => point.time >= baselineTime)
      .map(point => ({ time: point.time, value: (point.value / baseline - 1) * 100 }));
    return { ...asset, data };
  });
  return { baselineTime, series };
}

export function ReturnComparison({ assets }: { assets: Asset[] }) {
  const comparison = useMemo(() => buildComparison(assets), [assets]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  if (!comparison) return <p>No common baseline observation</p>;
  const baselineLabel = new Date(comparison.baselineTime * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <section>
      <p>Price return since {baselineLabel} UTC</p>
      {comparison.series.map(asset => (
        <button
          key={asset.id}
          aria-pressed={!hidden.has(asset.id)}
          onClick={() =>
            setHidden(previous => {
              const next = new Set(previous);
              if (next.has(asset.id)) next.delete(asset.id);
              else next.add(asset.id);
              return next;
            })
          }
        >
          {asset.label}
        </button>
      ))}
      <Chart
        options={{ autoSize: true, rightPriceScale: { mode: PriceScaleMode.Normal } }}
        containerProps={{ style: { height: 360 } }}
      >
        <Pane>
          {comparison.series.map(asset => (
            <LineSeries
              key={asset.id}
              data={asset.data}
              options={{
                color: asset.color,
                visible: !hidden.has(asset.id),
                priceScaleId: "right",
                priceLineVisible: false,
                priceFormat: {
                  type: "custom",
                  minMove: 0.01,
                  formatter: (value: number) =>
                    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
                },
              }}
            />
          ))}
        </Pane>
        <TimeScale>
          {/* Toggling a comparison changes visibility, not its baseline or view. */}
          <TimeScaleFitContentTrigger deps={[comparison.baselineTime]} />
        </TimeScale>
      </Chart>
    </section>
  );
}
```

All lines share one price scale because the transformed values have the same
unit. A stable series ID preserves the upstream series when labels change or
input order changes. `visible` keeps series mounted; conditional mounting is also
valid when removing the series is intended, but may change the shared timeline.
Keeping a hidden series can retain its time positions in that timeline.

## Adaptation boundaries

The earliest-common baseline is suitable for a complete, fixed initial snapshot.
Prepending older history can change it. If the product promises a fixed baseline,
store the chosen baseline time/prices in the application's comparison state and
reuse them for subsequent snapshots; loading history must not redefine “return.”
Likewise, toggling visibility must not recalculate the baseline from only the
visible subset. The recipe always calculates across the full asset list.

If calendars differ, choose the intersection baseline explicitly and leave later
missing observations absent or insert whitespace points on a shared calendar.
Do not align by array index. Crosshair details should read each series' event
entry and show `—` when it is missing; see [hover details](hover-legends-and-tooltips.md).

If the task is explicitly “percentage change relative to the currently visible
window,” use raw price arrays and `rightPriceScale.mode: PriceScaleMode.Percentage`
instead. Label this behavior because zooming and panning can change the displayed
percentage baseline. Use separate axes or panes for metrics with different units.

## Acceptance checks

- At the shared baseline all assets equal 0%. A price moving from 100 to 110
  yields +10%, and from 100 to 90 yields −10%.
- Compare assets priced at 1 and 1000 with the same proportional movement.
  Their return lines coincide. Pan and verify the fixed values do not change.
- Toggle one asset, change input ordering, and update a last price. IDs, colors,
  and the baseline retain their intended meaning.
- Test no common time, missing observations, and an invalid baseline. Do not
  substitute zero or forward-fill a missing price without a product requirement.
