# Numeric axes and chart types

Use this for an options surface slice over strikes, a payoff profile over
underlying prices, a yield curve over maturities, or a custom horizontal scale.
The misleading part is that upstream series call the x field `time` even when
the horizontal item is a **number representing a strike or maturity**.

## Choose the chart constructor from the horizontal domain

| Horizontal domain                            | Wrapper                 | Series/type contract                               |
| -------------------------------------------- | ----------------------- | -------------------------------------------------- |
| Dates or UTC time                            | `Chart`                 | `Time`, including UTC-second timestamps            |
| Strike / underlying price                    | `OptionsChart`          | `number`, e.g. `LineData<number>`                  |
| Time to maturity in one numeric unit         | `YieldCurveChart`       | `number`; only `LineSeries` and `AreaSeries`       |
| A genuinely different horizontal behavior    | `CustomChart`           | Explicit `IHorzScaleBehavior<HorzScaleItem>`       |
| Existing dates with a different label format | Usually `Chart` options | A formatter may be enough; no new domain is needed |

Do not convert strikes into `UTCTimestamp` just to satisfy `Chart` typings.
For yield curves, decide whether one x unit is a month or a year and keep every
dataset and formatter consistent. All numeric x values must be finite, ascending,
and unique. A refreshed curve is normally a full snapshot, not an appended tick.

## Recipe: implied volatility by strike

The pricing/market-data layer supplies volatility **in percentage points**, so
24.5 means 24.5%, not 0.245. This component visualizes those observations; it does
not price options or calculate volatility. Different expiries can be represented
by separate line series when they use the same strike domain.

```tsx
import type { DeepPartial, LineData, PriceChartOptions } from "lightweight-charts";
import {
  LineSeries,
  OptionsChart,
  TimeScale,
  TimeScaleFitContentTrigger,
} from "lightweight-charts-react-components";

const strikeOptions = {
  autoSize: true,
  // Built-in horizontal ticks use precision. timeFormatter formats the
  // horizontal crosshair label; the series controls the vertical value format.
  localization: {
    precision: 0,
    timeFormatter: (strike: number) => `$${strike.toFixed(0)}`,
  },
} satisfies DeepPartial<PriceChartOptions>;

export function VolatilitySmile({
  data,
  expiryId,
}: {
  data: LineData<number>[];
  expiryId: string;
}) {
  return (
    <OptionsChart
      key={expiryId}
      options={strikeOptions}
      containerProps={{ style: { height: 320 } }}
    >
      <LineSeries<number>
        data={data}
        alwaysReplaceData
        options={{
          color: "#2563eb",
          priceLineVisible: false,
          priceFormat: {
            type: "custom",
            minMove: 0.01,
            formatter: (value: number) => `${value.toFixed(2)}%`,
          },
        }}
      />
      <TimeScale<number>>
        <TimeScaleFitContentTrigger deps={[]} />
      </TimeScale>
    </OptionsChart>
  );
}

export const exampleSmile: LineData<number>[] = [
  { time: 80, value: 31.2 },
  { time: 90, value: 26.5 },
  { time: 100, value: 24.5 },
  { time: 110, value: 25.7 },
  { time: 120, value: 29.1 },
];
```

`expiryId` changes dataset identity and resets the chart's initial view. Routine
quote refreshes keep it stable and replace data without fitting each refresh.
Choose strike precision from the instrument; whole-dollar labels here are merely
the sample domain. Numeric x ticks are whole strikes, and the horizontal crosshair
label includes the currency prefix. A payoff chart uses the same wrapper with y
values and a formatter representing payoff currency instead of volatility.

Do not use `localization.priceFormatter` to label strikes: it overrides the
**vertical** price-scale formatter, including a series custom price formatter.
The built-in numeric horizontal behavior uses `localization.precision` for ticks
and `localization.timeFormatter` for the horizontal crosshair label. Formatting
every horizontal tick with a prefix requires an appropriate custom behavior.

## Recipe: current and previous yield curves

Both datasets use **months to maturity** for x and percentage points for y. The
wrapper configures upstream yield-curve semantics; it is not a date-time chart
with labels renamed. The two lines share a scale so their levels are comparable.

```tsx
import type { DeepPartial, LineData, YieldCurveChartOptions } from "lightweight-charts";
import {
  LineSeries,
  TimeScale,
  TimeScaleFitContentTrigger,
  YieldCurveChart,
} from "lightweight-charts-react-components";

const yieldOptions = {
  autoSize: true,
  localization: { priceFormatter: (value: number) => `${value.toFixed(2)}%` },
  yieldCurve: {
    startTimeRange: 0,
    minimumTimeRange: 360,
    formatTime: (months: number) => (months < 12 ? `${months}M` : `${months / 12}Y`),
  },
} satisfies DeepPartial<YieldCurveChartOptions>;

export function YieldComparison({
  current,
  previous,
  curveId,
}: {
  current: LineData<number>[];
  previous: LineData<number>[];
  curveId: string;
}) {
  return (
    <YieldCurveChart
      key={curveId}
      options={yieldOptions}
      containerProps={{ style: { height: 320 } }}
    >
      <LineSeries<number>
        data={current}
        alwaysReplaceData
        options={{ color: "#2563eb", priceLineVisible: false }}
      />
      <LineSeries<number>
        data={previous}
        alwaysReplaceData
        options={{ color: "#94a3b8", lineStyle: 2, priceLineVisible: false }}
      />
      <TimeScale<number>>
        <TimeScaleFitContentTrigger deps={[]} />
      </TimeScale>
    </YieldCurveChart>
  );
}

export const exampleYields: LineData<number>[] = [
  { time: 1, value: 4.8 },
  { time: 6, value: 4.5 },
  { time: 12, value: 4.1 },
  { time: 60, value: 3.7 },
  { time: 120, value: 3.6 },
  { time: 360, value: 3.8 },
];
```

`YieldCurveChart` accepts only line and area series through the wrapper's runtime
guard. Do not add candle, bar, histogram, or custom series to this chart. The
minimum 360-month span is an explicit display choice here; adapt it to the
product's intended tenor domain. Negative yield values remain legitimate y data;
do not clamp them to zero.

## Recipe: reuse upstream time behavior for quarterly labels

This is a custom behavior example when an application chooses to package its
quarterly formatting as an upstream horizontal-scale behavior. For simple label
changes, ordinary `timeScale.tickMarkFormatter` and `localization.timeFormatter`
on `Chart` are smaller. Extend the default behavior instead of reimplementing
sorting, time conversion, caching, and tick generation.

```tsx
import { useState } from "react";
import { defaultHorzScaleBehavior } from "lightweight-charts";
import type { LineData, LocalizationOptions, TickMark, Time } from "lightweight-charts";
import {
  CustomChart,
  LineSeries,
  TimeScale,
  TimeScaleFitContentTrigger,
} from "lightweight-charts-react-components";

function quarterLabel(time: Time): string {
  const date =
    typeof time === "number"
      ? new Date(time * 1000)
      : typeof time === "string"
        ? new Date(`${time}T00:00:00Z`)
        : new Date(Date.UTC(time.year, time.month - 1, time.day));
  return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
}

const DefaultTimeBehavior = defaultHorzScaleBehavior();
function isTime(time: unknown): time is Time {
  return (
    typeof time === "number" ||
    typeof time === "string" ||
    (typeof time === "object" &&
      time !== null &&
      "year" in time &&
      typeof time.year === "number" &&
      "month" in time &&
      typeof time.month === "number" &&
      "day" in time &&
      typeof time.day === "number")
  );
}

class QuarterBehavior extends DefaultTimeBehavior {
  override formatTickmark(
    mark: TickMark,
    _localization: LocalizationOptions<Time>
  ): string {
    // TickMark.originalTime is unknown; narrow it before formatting.
    return isTime(mark.originalTime)
      ? quarterLabel(mark.originalTime)
      : super.formatTickmark(mark, _localization);
  }
}

export function QuarterlyChart({ data }: { data: LineData<Time>[] }) {
  // This constructor behavior belongs to one chart instance. Changing the
  // behavior later requires a chart remount rather than an options update.
  const [behavior] = useState(() => new QuarterBehavior());
  return (
    <CustomChart<Time, QuarterBehavior>
      horzScaleBehavior={behavior}
      options={{ autoSize: true, localization: { timeFormatter: quarterLabel } }}
      containerProps={{ style: { height: 320 } }}
    >
      <LineSeries data={data} />
      <TimeScale>
        <TimeScaleFitContentTrigger deps={[]} />
      </TimeScale>
    </CustomChart>
  );
}
```

Use quarterly observations for quarterly labels; applying this formatter to
daily observations can produce repeated quarter labels. The `time` field still
contains valid dates/UTC times. For a non-time domain, implement its actual
`IHorzScaleBehavior` contract and pass the matching horizontal type through
`CustomChart`, series, `TimeScale`, refs, and handlers. Do not use a cast to mask
an incompatible horizontal domain.

## Refs, events, and acceptance checks

Numeric charts' handlers receive `MouseEventParams<number>`. A hovered `param.time`
is a strike or tenor, not epoch seconds. Format it with that domain's formatter;
do not call `new Date(param.time * 1000)`. Numeric series refs use
`SeriesApiRef<"Line", number>`; numeric scale refs use `TimeScaleApiRef<number>`.
For native chart methods, type the wrapper ref with the corresponding upstream
`IChartApiBase<number>` or `IYieldCurveChartApi` API type.

- Verify a strike at 100 is labeled as a strike and volatility 24.5 as 24.5%.
  Refresh the entire smile and ensure removed strikes disappear.
- Verify tenors 6, 12, and 120 mean 6M, 1Y, and 10Y. Test negative yields and
  both curves on one scale. Change curve identity and verify the initial range.
- Confirm non-line/area series are rejected for yield curves. Check that custom
  behavior instances remain stable during unrelated application renders.
- Hover every chart type and verify the correct horizontal item type reaches
  the tooltip. Test quarterly labels around year and timezone boundaries.
