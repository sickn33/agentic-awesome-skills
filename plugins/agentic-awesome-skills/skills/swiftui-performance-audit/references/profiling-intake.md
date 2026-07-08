# Profiling intake and collection checklist

## Intent

Use this checklist when code review alone cannot explain the SwiftUI performance issue and you need runtime evidence from the user.

## Ask for first

- Exact symptom: CPU spike, dropped frames, memory growth, hangs, or excessive view updates.
- Exact interaction: scrolling, typing, initial load, navigation push/pop, animation, sheet presentation, or background refresh.
- Target device and OS version.
- Whether the issue was reproduced on a real device or only in Simulator.
- Build configuration: Debug or Release.
- Whether the user already has a baseline or before/after comparison.

## Default profiling request

Ask the user to:
- Run the app in a Release build when possible.
- Use the SwiftUI Instruments template.
- Reproduce the exact problematic interaction only long enough to capture the issue.
- Capture the SwiftUI timeline and Time Profiler together.
- Export the trace or provide screenshots of the key SwiftUI lanes and the Time Profiler call tree.

## Ask for these artifacts

- Trace export or screenshots of the relevant SwiftUI lanes
- Time Profiler call tree screenshot or export
- Device/OS/build configuration
- A short note describing what action was happening at the time of the capture
- If memory is involved, the memory graph or Allocations data if available

## When to ask for more

- Ask for a second capture if the first run mixes multiple interactions.
- Ask for a before/after pair if the user has already tried a fix.
- Ask for a device capture if the issue only appears in Simulator or if scrolling smoothness matters.

## Common traps

- Debug builds can distort SwiftUI timing and allocation behavior.
- Simulator traces can miss device-only rendering or memory issues.
- Mixed interactions in one capture make attribution harder.
- Screenshots without the reproduction note are much harder to interpret.
