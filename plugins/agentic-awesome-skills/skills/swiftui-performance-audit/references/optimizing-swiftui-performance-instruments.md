# Optimizing SwiftUI Performance with Instruments (Summary)

Context: WWDC session introducing the next-generation SwiftUI Instrument in Instruments 26 and how to diagnose SwiftUI-specific bottlenecks.

## Key takeaways

- Profile SwiftUI issues with the SwiftUI template (SwiftUI instrument + Time Profiler + Hangs/Hitches).
- Long view body updates are a common bottleneck; use "Long View Body Updates" to identify slow bodies.
- Set inspection range on a long update and correlate with Time Profiler to find expensive frames.
- Keep work out of `body`: move formatting, sorting, image decoding, and other expensive work into cached or precomputed paths.
- Use Cause & Effect Graph to diagnose *why* updates occur; SwiftUI is declarative, so backtraces are often unhelpful.
- Avoid broad dependencies that trigger many updates (e.g., `@Observable` arrays or global environment reads).
- Prefer granular view models and scoped state so only the affected view updates.
- Environment values update checks still cost time; avoid placing fast-changing values (timers, geometry) in environment.
- Profile early and often during feature development to catch regressions.

## Suggested workflow (condensed)

1. Record a trace in Release mode using the SwiftUI template.
2. Inspect "Long View Body Updates" and "Other Long Updates."
3. Zoom into a long update, then inspect Time Profiler for hot frames.
4. Fix slow body work by moving heavy logic into precomputed/cache paths.
5. Use Cause & Effect Graph to identify unintended update fan-out.
6. Re-record and compare the update counts and hitch frequency.

## Example patterns from the session

- Caching formatted distance strings in a location manager instead of computing in `body`.
- Replacing a dependency on a global favorites array with per-item view models to reduce update fan-out.
