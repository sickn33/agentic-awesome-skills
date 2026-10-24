---
name: react-native-skills
description: "Review React Native and Expo rendering, lists, animations, navigation and native UI against project versions and measured behavior."
risk: safe
source: "https://github.com/vercel-labs/agent-skills"
date_added: "2026-06-02"
---

# React Native Skills

Comprehensive best practices for React Native and Expo applications. Contains
rules across multiple categories covering performance, animations, UI patterns,
and platform-specific optimizations.

## When to Use
Reference these guidelines when:

- Building React Native or Expo apps
- Optimizing list and scroll performance
- Implementing animations with Reanimated
- Working with images and media
- Configuring native modules or fonts
- Structuring monorepo projects with native dependencies

## Rule Categories by Priority

| Priority | Category         | Impact   | Prefix               |
| -------- | ---------------- | -------- | -------------------- |
| 1        | List Performance | CRITICAL | `list-performance-`  |
| 2        | Animation        | HIGH     | `animation-`         |
| 3        | Navigation       | HIGH     | `navigation-`        |
| 4        | UI Patterns      | HIGH     | `ui-`                |
| 5        | State Management | MEDIUM   | `react-state-`       |
| 6        | Rendering        | MEDIUM   | `rendering-`         |
| 7        | Monorepo         | MEDIUM   | `monorepo-`          |
| 8        | Configuration    | LOW      | `fonts-`, `imports-` |

## Quick Reference

### 1. List Performance (CRITICAL)

- `list-performance-virtualize` - Use FlashList for large lists
- `list-performance-item-memo` - Memoize list item components
- `list-performance-callbacks` - Stabilize callback references
- `list-performance-inline-objects` - Avoid inline style objects
- `list-performance-function-references` - Extract functions outside render
- `list-performance-images` - Optimize images in lists
- `list-performance-item-expensive` - Move expensive work outside items
- `list-performance-item-types` - Use item types for heterogeneous lists

### 2. Animation (HIGH)

- `animation-gpu-properties` - Prefer transform and opacity when layout need not change
- `animation-derived-value` - Use useDerivedValue for computed animations
- `animation-gesture-detector-press` - Consider Gesture.Tap for animated press feedback while preserving accessibility

### 3. Navigation (HIGH)

- `navigation-native-navigators` - Use native stack and native tabs over JS navigators

### 4. UI Patterns (HIGH)

- `ui-expo-image` - Use expo-image for all images
- `ui-image-gallery` - Use Galeria for image lightboxes
- `ui-pressable` - Use Pressable over TouchableOpacity
- `ui-safe-area-scroll` - Handle safe areas in ScrollViews
- `ui-scrollview-content-inset` - Use contentInset for headers
- `ui-menus` - Use native context menus
- `ui-native-modals` - Use native modals when possible
- `ui-measure-views` - Use onLayout, not measure()
- `ui-styling` - Use StyleSheet.create or Nativewind

### 5. State Management (MEDIUM)

- `react-state-minimize` - Minimize state subscriptions
- `react-state-dispatcher` - Use dispatcher pattern for callbacks
- `react-state-fallback` - Show fallback on first render
- `react-compiler-destructure-functions` - Destructure for React Compiler
- `react-compiler-reanimated-shared-values` - Handle shared values with compiler

### 6. Rendering (MEDIUM)

- `rendering-text-in-text-component` - Wrap text in Text components
- `rendering-no-falsy-and` - Avoid falsy && for conditional rendering

### 7. Monorepo (MEDIUM)

- `monorepo-native-deps-in-app` - Keep native dependencies in app package
- `monorepo-single-dependency-versions` - Use single versions across packages

### 8. Configuration (LOW)

- `fonts-config-plugin` - Use config plugins for custom fonts
- `imports-design-system-folder` - Organize design system imports
- `js-hoist-intl` - Hoist Intl object creation

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/list-performance-virtualize.md
rules/animation-gpu-properties.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

The catalog bundles the individual `rules/` files; the upstream compiled `AGENTS.md` is not included.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

Examples are contextual snippets: supply project imports, types and components. Check installed RN/Expo/Reanimated/list versions before copying APIs; performance labels are qualitative priorities, not measured guarantees. Preserve existing stack choices, accessibility, focus, keyboard and platform behavior. Install compatible native dependencies only within the requested task; prebuild/rebuild can modify native projects.
