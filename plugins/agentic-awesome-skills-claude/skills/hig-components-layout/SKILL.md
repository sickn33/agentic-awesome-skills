---
name: hig-components-layout
description: Apple Human Interface Guidelines for layout and navigation components.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Layout and Navigation Components

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

1. **Organize hierarchically.** Structure information from broad categories to specific details. Sidebars for top-level sections, lists for browsable items, detail views for individual content.

2. **Use standard navigation patterns.** Tab bars for flat navigation between peer sections (iPhone). Sidebars for deep hierarchical navigation (iPad, Mac). Match the pattern to the information architecture and platform.

3. **Adapt to screen size.** Three-column on iPad collapses to single-column on iPhone. Use size classes and adaptive APIs (NavigationSplitView) for automatic adaptation.

4. **Support multitasking on iPad.** Respond gracefully to Split View, Slide Over, and Stage Manager. Test at every split ratio and size class transition.

5. **Maintain spatial consistency on visionOS.** Windows, volumes, and ornaments in shared space. Position predictably. Use ornaments for toolbars and controls without occluding content.

6. **Use scroll views for overflow content.** Enable paging for discrete content units. Support pull-to-refresh where appropriate. Respect safe areas.

7. **Keep navigation predictable.** Users should always know where they are, how they got there, and how to go back. Use back buttons, breadcrumbs, and clear section titles.

8. **Prefer system components.** UINavigationController, UISplitViewController, NavigationSplitView, and TabView provide built-in adaptivity, accessibility, and state restoration.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [sidebars.md](references/sidebars.md) | Sidebars | Source lists, selection state, collapsible sections, iPad/Mac patterns |
| [column-views.md](references/column-views.md) | Column Views | Finder-style browsing, progressive disclosure through columns |
| [outline-views.md](references/outline-views.md) | Outline Views | Expandable hierarchies, disclosure triangles, tree structures |
| [split-views.md](references/split-views.md) | Split Views | Two/three column layouts, NavigationSplitView, adaptive collapse |
| [tab-views.md](references/tab-views.md) | Tab Views | Segmented tabs, page-style tabs, macOS tab grouping |
| [tab-bars.md](references/tab-bars.md) | Tab Bars | Bottom tab bars (iOS), badge counts, max tab count |
| [scroll-views.md](references/scroll-views.md) | Scroll Views | Paging, scroll indicators, content insets, pull-to-refresh |
| [windows.md](references/windows.md) | Windows | macOS/visionOS window management, sizing, full-screen, restoration |
| [panels.md](references/panels.md) | Panels | Inspector panels, utility panels, floating panels, macOS conventions |
| [lists-and-tables.md](references/lists-and-tables.md) | Lists and Tables | Plain/grouped/inset-grouped styles, swipe actions, section headers |
| [boxes.md](references/boxes.md) | Boxes | Content grouping containers, labeled boxes, macOS grouping |
| [ornaments.md](references/ornaments.md) | Ornaments | visionOS toolbar attachments, positioning, visibility |

## Navigation Pattern Selection

| App Structure | Recommended Pattern | Platform Adaptation |
|---|---|---|
| 3-5 peer top-level sections | Tab Bar | iPhone: bottom tab bar. iPad: sidebar (`.sidebarAdaptable`, iPadOS 18+). Mac: sidebar or toolbar tabs |
| Deep hierarchical content | Sidebar + NavigationSplitView | iPhone: single column stack. iPad: two/three columns. Mac: full multi-column |
| Deep file/folder tree | Column View | Mac: Finder-style. iPad: adaptable. iPhone: push navigation |
| Flat list with detail | Split View (two column) | iPhone: push/pop stack. iPad/Mac: primary + detail columns |
| Document-based with inspectors | Window + Panels | Mac: main window with inspector. iPad: sheet or popover |
| Spatial app with tools | Window + Ornaments | visionOS: ornaments on window. Other platforms: toolbars |

## Layout Adaptation Checklist

- [ ] **Compact width (iPhone portrait):** Navigation collapses to single stack? Tab bars visible?
- [ ] **Regular width (iPad landscape, Mac):** Navigation expands to sidebar + detail? Space used well?
- [ ] **Multitasking (iPad):** Adapts at every split ratio? Works in Slide Over?
- [ ] **Accessibility:** Supports Dynamic Type at all sizes? VoiceOver order logical?
- [ ] **Orientation:** Content reflows between portrait and landscape?
- [ ] **visionOS:** Windows positioned ergonomically? Ornaments accessible? Depth meaningful?

## Output Format

1. **Recommended navigation pattern** with rationale for the app's information architecture.
2. **Layout hierarchy** from root container down (e.g., TabView > NavigationSplitView > List > Detail).
3. **Platform adaptation** across targeted platforms and size classes.
4. **Size class behavior** at each transition.

## Questions to Ask

1. What is the app's information architecture? (Sections, hierarchy depth, top-level categories?)
2. How many top-level sections?
3. Which platforms?
4. Need multitasking on iPad?
5. SwiftUI or UIKit?

## Related Skills

- **hig-foundations** -- Layout spacing, margins, safe areas, alignment
- **hig-platforms** -- Platform-specific navigation conventions
- **hig-patterns** -- Multitasking, full-screen, and launching patterns
- **hig-components-content** -- Content displayed within layout containers

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
