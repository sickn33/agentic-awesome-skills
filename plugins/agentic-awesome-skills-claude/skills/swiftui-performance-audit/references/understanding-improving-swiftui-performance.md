# Understanding and Improving SwiftUI Performance (Summary)

Context: Apple guidance on diagnosing SwiftUI performance with Instruments and applying design patterns to reduce long or frequent updates.

## Core concepts

- SwiftUI is declarative; view updates are driven by state, environment, and observable data dependencies.
- View bodies must compute quickly to meet frame deadlines; slow or frequent updates lead to hitches.
- Instruments is the primary tool to find long-running updates and excessive update frequency.

## Instruments workflow

1. Profile via Product > Profile.
2. Choose the SwiftUI template and record.
3. Exercise the target interaction.
4. Stop recording and inspect the SwiftUI track + Time Profiler.

## SwiftUI timeline lanes

- Update Groups: overview of time SwiftUI spends calculating updates.
- Long View Body Updates: orange >500us, red >1000us.
- Long Platform View Updates: AppKit/UIKit hosting in SwiftUI.
- Other Long Updates: geometry/text/layout and other SwiftUI work.
- Hitches: frame misses where UI wasn’t ready in time.

## Diagnose long view body updates

- Expand the SwiftUI track; inspect module-specific subtracks.
- Set Inspection Range and correlate with Time Profiler.
- Use call tree or flame graph to identify expensive frames.
- Repeat the update to gather enough samples for analysis.
- Filter to a specific update (Show Calls Made by `MySwiftUIView.body`).

## Diagnose frequent updates

- Use Update Groups to find long active groups without long updates.
- Set inspection range on the group and analyze update counts.
- Use Cause graph ("Show Causes") to see what triggers updates.
- Compare causes with expected data flow; prioritize the highest-frequency causes.

## Remediation patterns

- Move expensive work out of `body` and cache results.
- Use `Observable()` macro to scope dependencies to properties actually read.
- Avoid broad dependencies that fan out updates to many views.
- Reduce layout churn; isolate state-dependent subtrees from layout readers.
- Avoid storing closures that capture parent state; precompute child views.
- Gate frequent updates (e.g., geometry changes) by thresholds.

## Verification

- Re-record after changes to confirm reduced update counts and fewer hitches.
