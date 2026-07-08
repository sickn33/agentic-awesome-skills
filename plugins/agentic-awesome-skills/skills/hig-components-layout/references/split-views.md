---
title: "Split views | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/split-views

# Split views

A split view manages the presentation of multiple adjacent panes of content, each of which can contain a variety of components, including tables, collections, images, and custom views.

![A stylized representation of a window consisting of three areas: a sidebar, a canvas, and an inspector. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/68c529d6dd40b4b46f1862f1cdbadec4/components-split-view-intro%402x.png)

Typically, you use a split view to show multiple levels of your app’s hierarchy at once and support navigation between them. In this scenario, selecting an item in the view’s primary pane displays the item’s contents in the secondary pane. Similarly, a split view can display a tertiary pane if items in the secondary pane contain additional content.

It’s common to use a split view to display a [sidebar](https://developer.apple.com/design/human-interface-guidelines/sidebars) for navigation, where the leading pane lists the top-level items or collections in an app, and the secondary and optional tertiary panes can present child collections and item details. Rarely, you might also use a split view to provide groups of functionality that supplement the primary view — for example, Keynote in macOS uses split view panes to present the slide navigator, the presenter notes, and the inspector pane in areas that surround the main slide canvas.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/split-views#Best-practices)

**To support navigation, persistently highlight the current selection in each pane that leads to the detail view.** The selected appearance clarifies the relationship between the content in various panes and helps people stay oriented.

**Consider letting people drag and drop content between panes.** Because a split view provides access to multiple levels of hierarchy, people can conveniently move content from one part of your app to another by dragging items to different panes. For guidance, see [Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/split-views#Platform-considerations)

### [iOS](https://developer.apple.com/design/human-interface-guidelines/split-views#iOS)

**Prefer using a split view in a regular — not a compact — environment.** A split view needs horizontal space in which to display multiple panes. In a compact environment, such as iPhone in portrait orientation, it’s difficult to display multiple panes without wrapping or truncating the content, making it less legible and harder to interact with.

### [iPadOS](https://developer.apple.com/design/human-interface-guidelines/split-views#iPadOS)

In iPadOS, a split view can include either two vertical panes, like Mail, or three vertical panes, like Keynote.

**Account for narrow, compact, and intermediate window widths.** Since iPad windows are fluidly resizable, it’s important to consider the design of a split view layout at multiple widths. In particular, ensure that it’s possible to navigate between the various panes in a logical way. For guidance, see [Layout](https://developer.apple.com/design/human-interface-guidelines/layout). For developer guidance, see [`NavigationSplitView`](https://developer.apple.com/documentation/SwiftUI/NavigationSplitView) and [`UISplitViewController`](https://developer.apple.com/documentation/UIKit/UISplitViewController).

### [macOS](https://developer.apple.com/design/human-interface-guidelines/split-views#macOS)

In macOS, you can arrange the panes of a split view vertically, horizontally, or both. A split view includes dividers between panes that can support dragging to resize them. For developer guidance, see [`VSplitView`](https://developer.apple.com/documentation/SwiftUI/VSplitView) and [`HSplitView`](https://developer.apple.com/documentation/SwiftUI/HSplitView).

  * Vertical 
  * Horizontal 
  * Multiple 



![An illustration of a laptop screen that shows two panes stacked vertically.](https://docs-assets.developer.apple.com/published/8c23f101a012db47a8e2350e50432617/vertical-split-view%402x.png)

![An illustration of a laptop screen that shows two panes arranged side by side, with a narrower pane on the left and a wider pane on the right.](https://docs-assets.developer.apple.com/published/713be8f9e61a9578b26087ad71ca6b23/horizontal-split-view%402x.png)

![An illustration of a laptop screen divided into three panes, split both vertically and horizontally.](https://docs-assets.developer.apple.com/published/3e315fbb8f8ade8b2d3d4f105f8c4482/multiple-split-view%402x.png)

**Set reasonable defaults for minimum and maximum pane sizes.** If people can resize the panes in your app’s split view, make sure to use sizes that keep the divider visible. If a pane gets too small, the divider can seem to disappear, becoming difficult to use.

**Consider letting people hide a pane when it makes sense.** If your app includes an editing area, for example, consider letting people hide other panes to reduce distractions or allow more room for editing — in Keynote, people can hide the navigator and presenter notes panes when they want to edit slide content.

**Provide multiple ways to reveal hidden panes.** For example, you might provide a toolbar button or a menu command — including a keyboard shortcut — that people can use to restore a hidden pane.

**Prefer the thin divider style.** The thin divider measures one point in width, giving you maximum space for content while remaining easy for people to use. Avoid using thicker divider styles unless you have a specific need. For example, if both sides of a divider present table rows that use strong linear elements that might make a thin divider hard to distinguish, it might work to use a thicker divider. For developer guidance, see [`NSSplitView.DividerStyle`](https://developer.apple.com/documentation/AppKit/NSSplitView/DividerStyle-swift.enum).

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/split-views#tvOS)

In tvOS, a split view can work well to help people filter content. When people choose a filter category in the primary pane, your app can display the results in the secondary pane.

**Choose a split view layout that keeps the panes looking balanced.** By default, a split view devotes a third of the screen width to the primary pane and two-thirds to the secondary pane, but you can also specify a half-and-half layout.

**Display a single title above a split view, helping people understand the content as a whole.** People already know how to use a split view to navigate and filter content; they don’t need titles that describe what each pane contains.

**Choose the title’s alignment based on the type of content the secondary pane contains.** Specifically, when the secondary pane contains a content collection, consider centering the title in the window. In contrast, if the secondary pane contains a single main view of important content, consider placing the title above the primary view to give the content more room.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/split-views#visionOS)

**To display supplementary information, prefer a split view instead of a new window.** A split view gives people convenient access to more information without leaving the current context, whereas a new window may confuse people who are trying to navigate or reposition content. Opening more windows also requires you to carefully manage the relationship between views in your app or game. If you need to request a small amount of information or present a simple task that someone must complete before returning to their main task, use a [sheet](https://developer.apple.com/design/human-interface-guidelines/sheets).

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/split-views#watchOS)

In watchOS, the split view displays either the list view or a detail view as a full-screen view.

**Automatically display the most relevant detail view.** When your app launches, show people the most pertinent information. For example, display information relevant to their location, the time, or their recent actions.

**If your app displays multiple detail pages, place the detail views in a vertical[tab view](https://developer.apple.com/design/human-interface-guidelines/tab-views).** People can then use the Digital Crown to scroll between the detail view’s tabs. watchOS also displays a page indicator next to the Digital Crown, indicating the number of tabs and the currently selected tab.

![A screenshot showing a detail view with a vertical tab on Apple Watch. The page indicator next to the Digital Crown shows that the fifth tab is currently selected.](https://docs-assets.developer.apple.com/published/3f36258648d54880e800568e88b5076b/split-view-watch-vertical-tab%402x.png)

## [Resources](https://developer.apple.com/design/human-interface-guidelines/split-views#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/split-views#Related)

[Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)

[Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/split-views#Developer-documentation)

[`NavigationSplitView`](https://developer.apple.com/documentation/SwiftUI/NavigationSplitView) — SwiftUI

[`UISplitViewController`](https://developer.apple.com/documentation/UIKit/UISplitViewController) — UIKit

[`NSSplitViewController`](https://developer.apple.com/documentation/AppKit/NSSplitViewController) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/split-views#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/A8CAF870-197F-4982-83D8-56513E5D7D0B/10000_wide_250x141_1x.jpg) Make your UIKit app more flexible ](https://developer.apple.com/videos/play/wwdc2025/282)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/split-views#Change-log)

Date| Changes  
---|---  
June 9, 2025| Added iOS and iPadOS platform considerations.  
December 5, 2023| Added guidance for split views in visionOS.  
June 5, 2023| Added guidance for split views in watchOS.  
  
