# SwiftUI Charts Reference

## Table of Contents

- [Overview](#overview)
- [Availability](#availability)
- [Core APIs](#core-apis)
- [Chart Types](#chart-types)
- [Axis Tweaks](#axis-tweaks)
- [Selection APIs](#selection-apis)
- [Annotations](#annotations)
- [ChartProxy and Custom Touch Handling](#chartproxy-and-custom-touch-handling)
- [Modifier Scope](#modifier-scope)
- [Styling and Visual Channels](#styling-and-visual-channels)
- [Composing Multiple Marks](#composing-multiple-marks)
- [Animating Chart Data](#animating-chart-data)
- [Best Practices](#best-practices)

## Overview

Swift Charts is Apple's native charting framework for SwiftUI. Use `Chart` with one or more marks to build bar, line, area, point, rule, rectangle, and sector charts. This reference covers the standard 2D chart APIs, axis customization, built-in selection APIs, annotations, and custom touch handling.

## Availability

Base `Chart`, custom axes, scales, and most marks require iOS 16 or later.

- `BarMark`, `LineMark`, `AreaMark`, `PointMark`, `RectangleMark`, and `RuleMark` are available on iOS 16+
- `SectorMark`, built-in selection, and scrollable chart axes require iOS 17+
- Data-driven plot types such as `BarPlot` and `LinePlot` require iOS 18+
- Chart3D and Z-axis APIs exist on iOS 26+; this reference is primarily about 2D `Chart`, with a dedicated Chart3D section below

```swift
if #available(iOS 17, *) {
    // Selection, SectorMark, scrollable axes
} else {
    // Base Chart, axes, scales, and core marks
}
```

## Core APIs

### Import the Framework

Always check that the file imports `Charts` before using `Chart`, `Chart3D`, `BarMark`, `SectorMark`, or `ChartProxy`.

```swift
import SwiftUI
import Charts
```

If chart types are unresolved, the first thing to verify is that `Charts` is imported in that file.

### Chart Container

`Chart` is the root view. Add one or more marks inside it.

```swift
Chart(sales) { item in
    BarMark(
        x: .value("Month", item.month),
        y: .value("Revenue", item.revenue)
    )
}
```

### Data Models Should Be Identifiable

Prefer `Identifiable` models for chart data so identity stays stable as data changes.

```swift
struct SalesPoint: Identifiable {
    let id: UUID
    let month: String
    let revenue: Double
}
```

If your model cannot conform to `Identifiable`, provide an explicit id key path:

```swift
Chart(sales, id: \.month) { item in
    BarMark(
        x: .value("Month", item.month),
        y: .value("Revenue", item.revenue)
    )
}
```

### Plottable Values

Use `.value(_, _)` to describe what each axis value means. Those labels are reused by axes, legends, and accessibility.

```swift
LineMark(
    x: .value("Day", entry.date),
    y: .value("Steps", entry.count)
)
```

## Chart Types

### BarMark

```swift
BarMark(
    x: .value("Product", product.name),
    y: .value("Units", product.units)
)
```

Stacking via `MarkStackingMethod`: `.standard`, `.normalized`, `.center`, `.unstacked`.

### LineMark

```swift
LineMark(
    x: .value("Day", day.date),
    y: .value("Steps", day.count)
)
.interpolationMethod(.monotone)
```

Interpolation methods: `.linear`, `.monotone`, `.cardinal`, `.catmullRom`, `.stepStart`, `.stepCenter`, `.stepEnd`. Cardinal and Catmull-Rom accept optional tension/alpha parameters.

### AreaMark

```swift
AreaMark(
    x: .value("Hour", sample.hour),
    y: .value("Temperature", sample.value),
    stacking: .unstacked
)
```

Ranged areas use `yStart`/`yEnd` for bands like min/max or confidence intervals:

```swift
AreaMark(
    x: .value("Day", sample.day),
    yStart: .value("Low", sample.low),
    yEnd: .value("High", sample.high)
)
```

### PointMark

```swift
PointMark(
    x: .value("Time", measurement.time),
    y: .value("Value", measurement.value)
)
```

### RectangleMark

```swift
RectangleMark(
    xStart: .value("Start Day", cell.startDay),
    xEnd: .value("End Day", cell.endDay),
    yStart: .value("Low", cell.low),
    yEnd: .value("High", cell.high)
)
```

### RuleMark

```swift
RuleMark(y: .value("Goal", 10_000))
    .foregroundStyle(.red)
```

### SectorMark

Use `SectorMark` for pie and donut-style charts. `SectorMark` requires iOS 17 or later.

```swift
Chart(expenses) { expense in
    SectorMark(
        angle: .value("Amount", expense.amount),
        innerRadius: .ratio(0.6),
        angularInset: 2
    )
    .foregroundStyle(by: .value("Category", expense.category))
}
```

Use `innerRadius` to turn a pie chart into a donut chart, and `angularInset` to separate slices visually.

### Plot Types (iOS 18+)

iOS 18 adds data-driven plot wrappers: `AreaPlot`, `BarPlot`, `LinePlot`, `PointPlot`, `RectanglePlot`, `RulePlot`, and `SectorPlot`.

`LinePlot` and `AreaPlot` also accept function closures for plotting mathematical functions without discrete data:

```swift
if #available(iOS 18, *) {
    Chart {
        LinePlot(x: "x", y: "sin(x)") { x in
            sin(x)
        }
    }
    .chartXScale(domain: -Double.pi ... Double.pi)
    .chartYScale(domain: -1.5 ... 1.5)
}
```

Use plot types when you want a data-first API surface or need function plotting. The underlying chart families stay the same.

### Chart3D (iOS 26+)

`Chart3D` is a separate API for 3D chart content. It supports 3D `PointMark`, `RectangleMark`, `RuleMark`, and `SurfacePlot`.

```swift
if #available(iOS 26, *) {
    Chart3D(points) { point in
        PointMark(
            x: .value("X", point.x),
            y: .value("Y", point.y),
            z: .value("Z", point.z)
        )
    }
    .chart3DPose(.front)
    .chart3DCameraProjection(.perspective)
}
```

`SurfacePlot` visualizes mathematical surfaces by evaluating a two-variable function:

```swift
if #available(iOS 26, *) {
    Chart3D {
        SurfacePlot(x: "x", y: "height", z: "z") { x, z in
            sin(x) * cos(z)
        }
    }
    .chartXScale(domain: -Double.pi ... Double.pi)
    .chartZScale(domain: -Double.pi ... Double.pi)
}
```

Camera and pose configuration:

- **Projection**: `.chart3DCameraProjection(.orthographic)` (default, precise measurements) or `.perspective` (depth effect)
- **Pose presets**: `.chart3DPose(.default)`, `.front`, `.back`, `.left`, `.right`
- **Custom pose**: `.chart3DPose(azimuth: .degrees(45), inclination: .degrees(30))`
- On visionOS, Chart3D supports natural 3D interaction gestures for rotation and exploration

**Always** gate `Chart3D` with `#available(iOS 26, *)` — it is not available on earlier OS versions.

## Axis Tweaks

### Axis Visibility and Labels

Use `chartXAxis`, `chartYAxis`, `chartXAxisLabel`, and `chartYAxisLabel` on the `Chart` container.
Axis visibility supports `.automatic`, `.visible`, and `.hidden`.

```swift
Chart(data) { item in
    BarMark(
        x: .value("Month", item.month),
        y: .value("Revenue", item.revenue)
    )
}
.chartXAxis(.visible)
.chartYAxis(.hidden)
.chartXAxisLabel("Month")
.chartYAxisLabel("Revenue")
```

### Custom Axis Marks

Use `AxisMarks` to control tick placement, labels, and grid lines.

```swift
Chart(steps) { day in
    LineMark(
        x: .value("Day", day.date),
        y: .value("Steps", day.count)
    )
}
.chartXAxis {
    AxisMarks(
        preset: .aligned,
        position: .bottom,
        values: .stride(by: .day)
    ) {
        AxisGridLine()
        AxisTick(length: .label)
        AxisValueLabel(format: .dateTime.weekday(.abbreviated))
    }
}
```

Useful `AxisMarks` inputs:

- `preset`: `.automatic`, `.extended`, `.aligned`, `.inset`
- `position`: `.automatic`, `.leading`, `.trailing`, `.top`, `.bottom`
- `values`: `.automatic`, `.automatic(desiredCount:)`, `.stride(by:)`, `.stride(by:count:)`, or an explicit array

### Axis Components

Within `AxisMarks`, combine the built-in axis components as needed:

```swift
AxisGridLine()
AxisTick()
AxisValueLabel()
```

`AxisValueLabel` can be tuned for dense axes:

```swift
AxisValueLabel(
    collisionResolution: .greedy(minimumSpacing: 8),
    orientation: .vertical
)
```

Label orientations: `.automatic`, `.horizontal`, `.vertical`, `.verticalReversed`.

Collision strategies: `.automatic`, `.greedy`, `.greedy(priority:minimumSpacing:)`, `.truncate`, `.disabled`.

### Axis Domains and Plot Area Tweaks

Use scales when you need explicit axis domains or plot area control.

```swift
Chart(data) { item in
    LineMark(
        x: .value("Index", item.index),
        y: .value("Score", item.score)
    )
}
.chartXScale(domain: 0...30)
.chartYScale(domain: 0...100)
.chartPlotStyle { plotArea in
    plotArea
        .background(.gray.opacity(0.08))
}
```

You can set one axis domain without forcing the other:

```swift
.chartXScale(domain: startDate...endDate)
```

### Scrollable Axes (iOS 17+)

For larger datasets, make the plot area scroll and control the visible domain.

```swift
@State private var scrollX = 7

Chart(data) { item in
    BarMark(
        x: .value("Day", item.day),
        y: .value("Value", item.value)
    )
}
.chartScrollableAxes(.horizontal)
.chartXVisibleDomain(length: 7)
.chartScrollPosition(x: $scrollX)
```

## Selection APIs

### Single-Value Selection

Use `chartXSelection(value:)` or `chartYSelection(value:)` for one selected value.

```swift
@State private var selectedDate: Date?

Chart(steps) { day in
    LineMark(x: .value("Day", day.date), y: .value("Steps", day.count))

    if let selectedDate {
        RuleMark(x: .value("Selected Day", selectedDate))
            .foregroundStyle(.secondary)
    }
}
.chartXSelection(value: $selectedDate)
```

### Range Selection

Use `chartXSelection(range:)` or `chartYSelection(range:)` for a dragged range. Bind to a `ClosedRange` whose bound type matches the plotted axis value.

```swift
@State private var selectedWeeks: ClosedRange<Int>?

Chart(weeks) { week in
    BarMark(x: .value("Week", week.index), y: .value("Revenue", week.revenue))
}
.chartXSelection(range: $selectedWeeks)
```

### Choosing Single vs Range

- Use `value:` bindings when only one point or axis value should be selected.
- Use `range:` bindings when users should brush a span (for zoom windows, comparisons, or grouped summaries).

### Angle Selection

Use `chartAngleSelection(value:)` with `SectorMark` charts. No built-in range overload for angle selection.

```swift
@State private var selectedAmount: Double?

Chart(expenses) { expense in
    SectorMark(angle: .value("Amount", expense.amount))
        .foregroundStyle(by: .value("Category", expense.category))
}
.chartAngleSelection(value: $selectedAmount)
```

**Important**: Selection bindings return the plottable axis value, not the full data element. Map back to your model if you need the selected record.

## Annotations

Use `annotation(position:)` on a mark when you need labels, callouts, or highlighted values attached to the plotted content.

```swift
BarMark(
    x: .value("Month", item.month),
    y: .value("Revenue", item.revenue)
)
.annotation(position: .top) {
    Text(item.revenue.formatted())
}
```

This is useful for selected values, thresholds, summaries, and direct labeling. Common positions include `.overlay`, `.top`, `.bottom`, `.leading`, and `.trailing`.

## ChartProxy and Custom Touch Handling

Use `chartOverlay`/`chartBackground` (iOS 16+) or `chartGesture` (iOS 17+) with `ChartProxy` when built-in selection modifiers are not enough.

```swift
.chartOverlay { proxy in
    GeometryReader { geometry in
        Rectangle().fill(.clear).contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        guard let plotFrame = proxy.plotFrame else { return } // iOS 16: use proxy.plotAreaFrame
                        let frame = geometry[plotFrame]
                        let x = value.location.x - frame.origin.x
                        guard x >= 0, x <= frame.size.width else { return }
                        selectedDate = proxy.value(atX: x, as: Date.self)
                    }
                    .onEnded { _ in selectedDate = nil }
            )
    }
}
```

Use `proxy.plotFrame` (iOS 17+) or `proxy.plotAreaFrame` (iOS 16) to get the plot area anchor.

`ChartProxy` gives you lower-level access to:

- `value(atX:as:)`, `value(atY:as:)`, and `value(at:as:)` for converting gesture coordinates into chart values
- `position(forX:)`, `position(forY:)`, and `position(for:)` for placing custom overlays or indicators
- `selectXValue(at:)`, `selectYValue(at:)`, `selectXRange(from:to:)`, and `selectYRange(from:to:)` for driving built-in selection from custom gestures
- `plotFrame` (iOS 17+) or `plotAreaFrame` (iOS 16) with `plotSize` for converting between gesture coordinates and the plot area

`select*` ChartProxy selection methods and `chartGesture` are available on iOS 17+.

## Modifier Scope

Apply chart-wide modifiers to the `Chart` container and mark-specific modifiers to the individual mark.

```swift
Chart(data) { item in
    LineMark(
        x: .value("Day", item.date),
        y: .value("Value", item.value)
    )
    .interpolationMethod(.monotone)   // Mark-level modifier
}
.chartXAxis { AxisMarks() }            // Chart-level modifier
.chartYScale(domain: 0...100)          // Chart-level modifier
.chartPlotStyle { $0.background(.thinMaterial) }
```

## Styling and Visual Channels

### Categorical Coloring

Use `foregroundStyle(by: .value(...))` to color marks by a data property. Swift Charts generates a legend automatically.

```swift
Chart(sales) { item in
    BarMark(
        x: .value("Month", item.month),
        y: .value("Revenue", item.revenue)
    )
    .foregroundStyle(by: .value("Region", item.region))
}
```

**Avoid** applying `.foregroundStyle(.red)` per mark for categorical data — this suppresses the automatic legend and breaks accessibility.

### Custom Color Scales

Use `chartForegroundStyleScale` to control the mapping from data values to colors.

```swift
.chartForegroundStyleScale([
    "North": .blue,
    "South": .orange,
    "East": .green
])
```

For dynamic data where not all series appear at every point, use the mapping overload:

```swift
.chartForegroundStyleScale(domain: regions, mapping: { region in
    colorForRegion(region)
})
```

### Symbol and Size Channels

Use `symbol(by:)` and `symbolSize(by:)` to encode additional data dimensions on `PointMark` and `LineMark`.

```swift
Chart(measurements) { item in
    PointMark(
        x: .value("Time", item.time),
        y: .value("Value", item.value)
    )
    .foregroundStyle(by: .value("Category", item.category))
    .symbol(by: .value("Category", item.category))
    .symbolSize(by: .value("Weight", item.weight))
}
```

### Legend Control

```swift
.chartLegend(.visible)
.chartLegend(.hidden)
.chartLegend(position: .bottom, alignment: .center)
```

## Composing Multiple Marks

Combine different mark types inside the same `Chart` closure:

```swift
// Line with points
LineMark(x: .value("Day", day.date), y: .value("Steps", day.count))
    .interpolationMethod(.monotone)
PointMark(x: .value("Day", day.date), y: .value("Steps", day.count))

// Bars with threshold line
BarMark(x: .value("Month", item.month), y: .value("Revenue", item.revenue))
RuleMark(y: .value("Target", 10_000))
    .foregroundStyle(.red)
    .lineStyle(StrokeStyle(dash: [5, 3]))
```

## Animating Chart Data

Chart marks animate automatically when data identity is stable and changes are wrapped in an animation.

```swift
withAnimation(.easeInOut) {
    chartData = updatedData
}
```

**Always** use `Identifiable` models (or explicit `id:`) so Swift Charts can match old and new data points and animate transitions between them.

## Best Practices

### Do

- Use semantic `.value(_, _)` labels so axes and accessibility read clearly
- Prefer `Identifiable` models (or explicit `id:`) for stable chart data identity
- Use `foregroundStyle(by:)` for categorical series to get automatic legends and accessibility
- Use `RuleMark` for goals, thresholds, and selected-value indicators
- Use explicit `AxisMarks(values:)` when automatic tick generation gets crowded
- Use `chartXScale` and `chartYScale` when you need stable visual comparisons
- Use `chartXSelection(range:)` or `chartYSelection(range:)` for brushed selection
- Gate iOS 17+ APIs such as `SectorMark` and selection with `#available`

### Don't

- Put chart-wide modifiers such as `chartXAxis` or `chartXSelection` on individual marks
- Apply manual `.foregroundStyle(.color)` per mark for categorical data — use `foregroundStyle(by:)` instead
- Rely on unstable identities when chart data can be inserted, removed, or reordered
- Use string values for naturally numeric or date-based axes unless you want categorical behavior
- Stack unrelated series by default just because `BarMark` and `AreaMark` allow it
- Force every tick label to display when collision handling or stride values would be clearer
- Assume selection returns a model object; it only returns the plottable axis value
- Forget that range selection is available only for X and Y axes, not angle selection

For chart accessibility (VoiceOver, Audio Graph, `AXChartDescriptorRepresentable`), fallback strategies, WWDC sessions, and a full summary checklist, see `charts-accessibility.md`.
