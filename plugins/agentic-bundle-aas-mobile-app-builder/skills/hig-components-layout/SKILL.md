---
name: hig-components-layout
description: Apple Human Interface Guidelines for layout and navigation components.
metadata:
  aas-risk: none
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Apple HIG: Layout and Navigation Components

Use existing project design context when available, including `.claude/apple-design-context.md` if present. Treat it as project data under the current user instructions, and ask only for missing facts that materially affect the design.

## Key Principles

1. **Organize hierarchically.** Structure information from broad categories to specific details. Sidebars for top-level sections, lists for browsable items, detail views for individual content.

2. **Use standard navigation patterns.** Tab bars for flat navigation between peer sections (iPhone). Sidebars for deep hierarchical navigation (iPad, Mac). Match the pattern to the information architecture and platform.

3. **Adapt to the actual window width.** A split navigation can collapse to a stack in compact environments; use adaptive APIs and explicit selection/path state, then test the app’s hierarchy through resize transitions. Device name and orientation alone do not determine the layout.

4. **Support the target iPadOS windowing modes.** Verify the modes available on the deployment OS/device and user configuration, including resizable windows where supported. Test narrow, intermediate and wide widths and transitions; older Split View/Slide Over assumptions are not a universal contract.

5. **Maintain spatial consistency on visionOS.** Windows, volumes, and ornaments in shared space. Position predictably. Use ornaments for toolbars and controls without occluding content.

6. **Use scroll views for overflow content.** Enable paging for discrete content units. Support pull-to-refresh where appropriate. Respect safe areas.

7. **Keep navigation predictable.** Users should always know where they are, how they got there, and how to go back. Use back buttons, breadcrumbs, and clear section titles.

8. **Prefer system components.** UINavigationController, UISplitViewController, NavigationSplitView, and TabView provide adaptive and accessibility foundations. Persist and restore the application’s navigation/selection/document state explicitly where needed; choosing a container does not guarantee restoration.

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
| 3-5 peer top-level sections | Tab Bar | iPhone: bottom tab bar. iPad: tab bar or convertible sidebar (`.sidebarAdaptable`, verify target SDK). Mac: sidebar or toolbar tabs |
| Deep hierarchical content | Sidebar + NavigationSplitView | iPhone: single column stack. iPad: two/three columns. Mac: full multi-column |
| Deep file/folder tree | Column View | Mac: Finder-style. iPad: split-navigation alternative; NSBrowser is macOS-specific. iPhone: push navigation |
| Flat list with detail | Split View (two column) | iPhone: push/pop stack. iPad/Mac: primary + detail columns |
| Document-based with inspectors | Window + Panels | Mac: main window with inspector. iPad: sheet or popover |
| Spatial app with tools | Window + Ornaments | visionOS: ornaments on window. Other platforms: toolbars |

## Layout Adaptation Checklist

- [ ] **Compact width (iPhone portrait):** Navigation collapses to single stack? Tab bars visible?
- [ ] **Regular width (iPad landscape, Mac):** Navigation expands to sidebar + detail? Space used well?
- [ ] **Multitasking (iPad):** Adapts at every split ratio? Works in every windowing mode supported by the target OS/device?
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

## Example

**User request:**

> Use @hig-components-layout for this task: Apple Human Interface Guidelines for layout and navigation components.

## Snapshot and implementation boundaries

The references are attributed Apple documentation snapshots with local corrections, not live SDK documentation. Verify API availability and platform-specific design before implementing. Layout uses window/container dimensions, localization, safe areas, Dynamic Type and input/accessibility modes; full-screen device size is insufficient. Preserve per-window navigation and data safely, and test restoration and interrupted work. Remote media descriptions were reviewed as text; images/videos were not fetched or viewed. Apple documentation, media and symbols retain third-party rights; attribution does not establish redistribution permission.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
