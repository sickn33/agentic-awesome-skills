# Session overlays and primitives

Use this for market-session shading, selected backtest intervals, maintenance
windows, or custom annotations that must follow chart scrolling and zooming.
The overlay should stay attached to chart coordinates rather than a DOM pixel
rectangle captured once.

## Choose the narrowest extension

| Needed visual                                            | Implementation                                        | Reason                                                      |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Event on one bar                                         | `Markers`                                             | Built-in marker layout                                      |
| Horizontal threshold                                     | `PriceLine`                                           | Built-in price conversion and axis label                    |
| Background across a pane                                 | `PanePrimitive`                                       | It belongs to the pane, not one series' price scale         |
| Price-dependent drawing, series axis labels, hit testing | `SeriesPrimitive`                                     | Native attachment supplies the owning series                |
| A new data series renderer                               | `CustomSeries` with an `ICustomSeriesPaneView` plugin | It participates as a series, including data and autoscaling |
| New horizontal-axis semantics                            | `CustomChart`                                         | A renderer is not a horizontal-scale behavior               |

## Recipe: reusable session bands on price and volume panes

Session boundaries are prepared by the application's market-calendar adapter as
UTC-second timestamps. Do not hard-code a fixed UTC offset for exchanges that
observe daylight saving time. The example shades from `from` to `to` between
the **centers** of two loaded timeline observations; it does not extend through
half a bar on either side.

This concrete plugin skips bands whose endpoints cannot be converted by
`timeToCoordinate()`. For windows beginning outside loaded history, clip to the
loaded timeline in the adapter. If the product needs exact boundaries between
bars, provide an explicit boundary-to-coordinate interpolation policy instead of
pretending an unknown time maps automatically.

Save this as `SessionBands.ts`. Inferring the draw target's type from the upstream
renderer interface avoids introducing a direct runtime dependency on
`fancy-canvas`. Media coordinate space uses CSS pixels and handles device pixel
ratios through the target; bitmap coordinate space would require explicit x/y
pixel-ratio conversion.

```ts file=SessionBands.ts
import type {
  IChartApiBase,
  IPanePrimitive,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  PaneAttachedParameter,
  Time,
  UTCTimestamp,
} from "lightweight-charts";

export type SessionBand = {
  id: string;
  from: UTCTimestamp;
  to: UTCTimestamp;
  color: string;
};
type DrawTarget = Parameters<IPrimitivePaneRenderer["draw"]>[0];
type Rect = { x: number; width: number; color: string };

export class SessionBands implements IPanePrimitive<Time> {
  private rects: Rect[] = [];
  private requestUpdate: (() => void) | undefined;
  private readonly views: IPanePrimitivePaneView[];

  constructor(
    private readonly chart: IChartApiBase<Time>,
    private bands: SessionBand[]
  ) {
    this.views = [
      {
        zOrder: () => "bottom", // Shading remains behind candles and volume.
        renderer: () => ({ draw: target => this.draw(target) }),
      },
    ];
  }

  attached({ requestUpdate }: PaneAttachedParameter<Time>) {
    this.requestUpdate = requestUpdate;
  }

  detached() {
    this.requestUpdate = undefined;
  }

  setBands(bands: SessionBand[]) {
    this.bands = bands;
    this.requestUpdate?.(); // External plugin mutations need a redraw request.
  }

  updateAllViews() {
    const scale = this.chart.timeScale();
    this.rects = this.bands.flatMap(band => {
      const from = scale.timeToCoordinate(band.from);
      const to = scale.timeToCoordinate(band.to);
      if (from === null || to === null) return [];
      return [{ x: Math.min(from, to), width: Math.abs(to - from), color: band.color }];
    });
  }

  paneViews() {
    return this.views;
  }

  private draw(target: DrawTarget) {
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      context.save();
      for (const rect of this.rects) {
        context.fillStyle = rect.color;
        context.fillRect(rect.x, 0, rect.width, mediaSize.height);
      }
      context.restore();
    });
  }
}
```

Save the following as `SessionChart.tsx`. `candles` and `volume` share the same
normalized ascending UTC-second grid. A stable `bands` array preserves the
render callback's identity. A new array intentionally recreates the primitives
with the new session definition.

```tsx
import { useCallback, useState } from "react";
import type { CandlestickData, HistogramData, UTCTimestamp } from "lightweight-charts";
import {
  CandlestickSeries,
  Chart,
  HistogramSeries,
  Pane,
  PanePrimitive,
  TimeScale,
  TimeScaleFitContentTrigger,
  type RenderPanePrimitive,
} from "lightweight-charts-react-components";
import { SessionBands, type SessionBand } from "./SessionBands";

export function SessionChart({
  candles,
  volume,
  bands,
}: {
  candles: CandlestickData<UTCTimestamp>[];
  volume: HistogramData<UTCTimestamp>[];
  bands: SessionBand[];
}) {
  const [showBands, setShowBands] = useState(true);
  const renderBands = useCallback<RenderPanePrimitive>(
    ({ chart }) => new SessionBands(chart, bands),
    [bands]
  );

  return (
    <section>
      <button onClick={() => setShowBands(value => !value)}>
        {showBands ? "Hide sessions" : "Show sessions"}
      </button>
      <Chart options={{ autoSize: true }} containerProps={{ style: { height: 450 } }}>
        <Pane stretchFactor={3}>
          <CandlestickSeries data={candles} />
          {/* Each invocation constructs a separate attachment instance. */}
          {showBands && <PanePrimitive render={renderBands} />}
        </Pane>
        <Pane stretchFactor={1}>
          <HistogramSeries data={volume} options={{ priceFormat: { type: "volume" } }} />
          {showBands && <PanePrimitive render={renderBands} />}
        </Pane>
        <TimeScale>
          <TimeScaleFitContentTrigger deps={[]} />
        </TimeScale>
      </Chart>
    </section>
  );
}
```

`PanePrimitive` requires a `Pane` ancestor; it throws outside one. A primitive
can be passed as `plugin` **or** created with `render`, not both. The render
factory receives initialized `{ chart, pane }`; it is useful when construction
needs those APIs. The wrapper attaches it and detaches it on unmount.

## Identity and updating choices

The wrapper uses `plugin ?? render` identity as the attachment identity. A new
plugin object or callback detaches the previous instance and attaches a new one.
Do not inline a new factory on every pointer move or tick. The recipe memoizes
it by the session definition, so intentional definition changes recreate it.
Do not reuse one stateful plugin instance across two panes/charts: its attached
state and redraw callback belong to one attachment.

For frequent changes, create a stable plugin and call its own `setBands()` method
through an application-owned instance or ref. The wrapper's primitive ref exposes
the upstream interface, not custom methods; keep the concrete plugin typed in
application code when calling those methods. `setBands()` above requests a redraw;
changing a class field without that request need not repaint immediately.

Compute coordinates in `updateAllViews()`, then draw the cached views. Upstream
invokes this during relevant chart updates, so scrolling/zooming refreshes the
geometry. Do not calculate x once in a React effect and retain it through zoom.
If the plugin subscribes to external events, unsubscribe in `detached()` using
the same handler identity. This recipe has no custom event subscriptions.

## Series-specific drawings and custom-series boundaries

For a vertical event line with a time-axis label, use a `SeriesPrimitive` under
the target series. Implement `ISeriesPrimitive` with one `IPrimitivePaneView`
whose `update()` caches `chart.timeScale().timeToCoordinate(time)` and whose
renderer fills a full-height rectangle in the bitmap coordinate space (scale x
and width by `horizontalPixelRatio`), plus one `ISeriesPrimitiveAxisView` from
`timeAxisViews()` for the label. Format the label explicitly for UTC timestamps
or business dates; `.toString()` on a `BusinessDay` object does not give a useful
date. The `SeriesPrimitive` render factory receives `{ chart, series }`; use the
series API for price conversion when drawing price-dependent shapes.

For grouped volume bars or a genuinely new plot type, use `CustomSeries` with a
plugin implementing upstream `ICustomSeriesPaneView`. The plugin supplies
`renderer`, `update`, `priceValueBuilder`, `isWhitespace`, and `defaultOptions`.
The price-value builder must include all values that should participate in
autoscaling. Keep custom payloads in `customValues` and preserve
the custom data shape when updating. `CustomSeries` requires a plugin instance;
`CustomChart` instead changes the horizontal scale and is a different extension.

## Acceptance checks

- Pan, zoom, resize, and change device pixel ratio: bands remain attached to
  the intended bars and fill only their owning pane.
- Toggle sessions on/off repeatedly and change the bands array. Old attachments
  disappear and no stale background persists.
- Test missing/off-history endpoints and zero-width intervals against the stated
  clipping policy. Verify daylight-saving changes in the calendar adapter.
- For an external plugin update, call `setBands()` and verify it repaints without
  requiring the user to move the chart. Confirm each pane has its own instance.
