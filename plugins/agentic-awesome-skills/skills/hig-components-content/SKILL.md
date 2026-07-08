---
name: hig-components-content
description: Apple Human Interface Guidelines for content display components.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Content Components

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

1. **Adapt to different sizes and contexts.** Content components must work across screen sizes, orientations, and multitasking configurations. Use Auto Layout and size classes.

2. **Make content accessible.** Charts need audio graph support. Images need alt text. Collections need proper VoiceOver navigation order. All content components need labels and descriptions.

3. **Maintain visual hierarchy.** Use spacing, sizing, and grouping to establish clear information hierarchy. Primary content should be visually prominent.

4. **Use system components first.** Evaluate UICollectionView, SwiftUI Charts, WKWebView before building custom. System components come with built-in accessibility and platform adaptation.

5. **Respect platform conventions.** A collection on tvOS uses large lockups with parallax. The same collection on iOS uses compact cells with touch targets. On visionOS, content gains depth and hover effects.

6. **Handle empty states.** Show a meaningful empty state with guidance on how to populate it, not a blank screen.

7. **Optimize for performance.** Use lazy loading, cell reuse, pagination, and prefetching for large datasets.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [charts.md](references/charts.md) | Charts | Swift Charts, bar/line/area/point marks, chart accessibility, audio graphs |
| [collections.md](references/collections.md) | Collections | Grid/list layouts, compositional layout, selection, reordering, diffable data sources |
| [image-views.md](references/image-views.md) | Image Views | Aspect ratio handling, content modes, SF Symbol images, accessibility |
| [image-wells.md](references/image-wells.md) | Image Wells | Drag-and-drop image selection, macOS-specific, placeholder content |
| [color-wells.md](references/color-wells.md) | Color Wells | Color selection UI, system color picker, custom color spaces |
| [web-views.md](references/web-views.md) | Web Views | WKWebView, SFSafariViewController, navigation controls, content restrictions |
| [activity-views.md](references/activity-views.md) | Activity Views | Share sheets, activity items, custom activities, action extensions |
| [lockups.md](references/lockups.md) | Lockups | Image+text elements, tvOS card layouts, focus effects, shelf layouts |

## Component Selection Guide

| Content Need | Recommended Component | Platform Notes |
|---|---|---|
| Visualizing quantitative data | Charts (Swift Charts) | iOS 16+, macOS 13+, watchOS 9+ |
| Browsing a grid or list of items | Collection View | Compositional layout for complex arrangements |
| Displaying a single image | Image View | Support aspect ratio fitting; provide accessibility description |
| Selecting an image via drag or browse | Image Well | macOS primarily; use image pickers on iOS |
| Selecting a color | Color Well | Triggers system color picker; macOS, iOS 14+ |
| Showing web content inline | Web View (WKWebView) | Use SFSafariViewController for external browsing |
| Sharing content to other apps | Activity View | System share sheet with configurable activity types |
| Content card (image + text) | Lockup | Primarily tvOS; adaptable to other platforms |

## Output Format

1. **Component recommendation with rationale**, referencing the relevant HIG reference file.
2. **Configuration guidance** -- key properties and setup.
3. **Accessibility requirements** for the recommended component.
4. **Platform-specific notes** for targeted platforms.

## Questions to Ask

1. What type of content? (Quantitative data, images, web content, browsable collection, share action?)
2. Which platforms?
3. Static or dynamic content?
4. How much content? (Few items vs hundreds/thousands affects component choice and optimization.)

## Related Skills

- **hig-foundations** -- Color, typography, accessibility, and image guidelines
- **hig-patterns** -- Data visualization, sharing, and loading patterns
- **hig-components-layout** -- Structural containers (scroll views, lists, split views) hosting content
- **hig-platforms** -- Platform-specific component behavior (lockups on tvOS, web views on macOS)

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
