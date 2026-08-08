# Swift Charts Accessibility, Fallback, and Resources

## Table of Contents

- [Accessibility](#accessibility)
  - [Meaningful Labels](#meaningful-labels)
  - [Custom Audio Graphs](#custom-audio-graphs)
- [Composite Example](#composite-example)
- [Fallback Strategies](#fallback-strategies)
  - [Version Breakdown](#version-breakdown)
- [WWDC Sessions](#wwdc-sessions)
- [Summary Checklist](#summary-checklist)

---

## Accessibility

Swift Charts provides built-in accessibility support. VoiceOver users get three rotor actions automatically:

- **Describe Chart** — overview of axes and data series
- **Audio Graph** — sonification where pitch represents data values
- **Chart Detail** — interactive mode for exploring individual data points

### Meaningful Labels

**Always** use clear, descriptive strings in `.value(_, _)` calls. These labels are read by VoiceOver and used in the Audio Graph.

```swift
// Good — descriptive labels
LineMark(
    x: .value("Date", entry.date),
    y: .value("Daily Steps", entry.count)
)

// Bad — generic labels
LineMark(
    x: .value("X", entry.date),
    y: .value("Y", entry.count)
)
```

### Custom Audio Graphs

For advanced accessibility, conform your chart view to `AXChartDescriptorRepresentable` and implement `makeChartDescriptor()`. Attach it with `.accessibilityChartDescriptor(self)`.

```swift
struct StepsChart: View, AXChartDescriptorRepresentable {
    let steps: [DailySteps]

    var body: some View {
        Chart(steps) { day in
            LineMark(x: .value("Date", day.date), y: .value("Steps", day.count))
        }
        .accessibilityChartDescriptor(self)
    }

    func makeChartDescriptor() -> AXChartDescriptor {
        guard let first = steps.first, let last = steps.last else {
            return AXChartDescriptor(title: "Daily Step Count", summary: nil,
                xAxis: AXNumericDataAxisDescriptor(title: "Date", range: 0...1, gridlinePositions: []) { "\($0)" },
                yAxis: AXNumericDataAxisDescriptor(title: "Steps", range: 0...1, gridlinePositions: []) { "\($0)" },
                additionalAxes: [], series: [])
        }
        let xAxis = AXDateDataAxisDescriptor(
            title: "Date", range: first.date...last.date, gridlinePositions: [])
        let yAxis = AXNumericDataAxisDescriptor(
            title: "Steps", range: 0...Double(steps.map(\.count).max() ?? 0),
            gridlinePositions: []) { "\(Int($0)) steps" }
        let series = AXDataSeriesDescriptor(
            name: "Daily Steps", isContinuous: true,
            dataPoints: steps.map { .init(x: $0.date, y: Double($0.count)) })
        return AXChartDescriptor(title: "Daily Step Count", summary: nil,
            xAxis: xAxis, yAxis: yAxis, additionalAxes: [], series: [series])
    }
}
```

## Composite Example

A scrollable bar chart with range selection combining multiple iOS 17+ APIs:

```swift
@State private var selectedRange: ClosedRange<Int>?

Chart(weeklyRevenue) { week in
    BarMark(x: .value("Week", week.index), y: .value("Revenue", week.revenue))
        .foregroundStyle(by: .value("Region", week.region))
}
.chartScrollableAxes(.horizontal)
.chartXVisibleDomain(length: 8)
.chartXSelection(range: $selectedRange)
.chartXAxis {
    AxisMarks(values: .stride(by: 1)) {
        AxisGridLine()
        AxisValueLabel { Text("W\($0.as(Int.self) ?? 0)") }
    }
}
```

## Fallback Strategies

Gate advanced APIs with `#available` and provide a fallback chart without the gated features. Because chart modifiers like `.chartXSelection` change the return type, you must duplicate the entire `Chart` — you cannot conditionally apply the modifier:

### Version Breakdown

- iOS 16+: `Chart`, custom axes, scales, `BarMark`, `LineMark`, `AreaMark`, `PointMark`, `RectangleMark`, `RuleMark`, `ChartProxy`, `chartOverlay`, `chartBackground`
- iOS 17+: `SectorMark`, `chartXSelection`, `chartYSelection`, `chartAngleSelection`, `chartScrollableAxes`, visible-domain scrolling APIs, `chartGesture`
- iOS 18+: `AreaPlot`, `BarPlot`, `LinePlot`, `PointPlot`, `RectanglePlot`, `RulePlot`, `SectorPlot`, function plotting
- iOS 26+: `Chart3D`, `SurfacePlot`, Z-axis marks, 3D camera and pose APIs

## WWDC Sessions

- [Hello Swift Charts](https://developer.apple.com/videos/play/wwdc2022/10136/) (WWDC 2022) — introduction to the framework
- [Swift Charts: Raise the bar](https://developer.apple.com/videos/play/wwdc2022/10137/) (WWDC 2022) — marks, composition, customization
- [Design an effective chart](https://developer.apple.com/videos/play/wwdc2022/110340/) (WWDC 2022) — chart design principles
- [Design app experiences with charts](https://developer.apple.com/videos/play/wwdc2022/110342/) (WWDC 2022) — integrating charts into app UX
- [Explore pie charts and interactivity in Swift Charts](https://developer.apple.com/videos/play/wwdc2023/10037/) (WWDC 2023) — SectorMark, selection, scrolling
- [Swift Charts: Vectorized and function plots](https://developer.apple.com/videos/play/wwdc2024/10155/) (WWDC 2024) — LinePlot, AreaPlot, function plotting
- [Bring Swift Charts to the third dimension](https://developer.apple.com/videos/play/wwdc2025/313/) (WWDC 2025) — Chart3D, SurfacePlot, 3D marks

## Summary Checklist

- [ ] `import Charts` is present in files using chart types
- [ ] Deployment target matches the APIs used (`Chart` on iOS 16+, selection and `SectorMark` on iOS 17+, plot types on iOS 18+, `Chart3D` on iOS 26+)
- [ ] Chart data models use `Identifiable` (or `Chart(data, id:)` is provided)
- [ ] All chart families are represented with the correct mark type
- [ ] Axes use `AxisMarks` when default ticks are too dense or unclear
- [ ] `chartXScale` or `chartYScale` is set when fixed domains matter
- [ ] Chart-wide modifiers are applied to `Chart`, not individual marks
- [ ] `foregroundStyle(by:)` used for categorical series (not manual per-mark colors)
- [ ] Single-value selection uses `chartXSelection(value:)` or `chartYSelection(value:)`
- [ ] Range selection uses `chartXSelection(range:)` or `chartYSelection(range:)`
- [ ] `SectorMark` selection uses `chartAngleSelection(value:)`
- [ ] iOS 17+, iOS 18+, and iOS 26+ APIs are guarded with `#available`
- [ ] `.value()` labels are descriptive for VoiceOver and Audio Graph accessibility
