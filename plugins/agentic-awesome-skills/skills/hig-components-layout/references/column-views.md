---
title: "Column views | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/column-views

# Column views

A column view — also called a _browser_ — lets people view and navigate a data hierarchy using a series of vertical columns.

![A stylized representation of three columns containing a list of folders, images, and file information. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/34ebf07677359428c45cbda0b9c1641e/components-column-view-intro%402x.png)

Each column represents one level of the hierarchy and contains horizontal rows of data items. Within a column, any parent item that contains nested child items is marked with a triangle icon. When people select a parent, the next column displays its children. People can continue navigating in this way until they reach an item with no children, and can also navigate back up the hierarchy to explore other branches of data.

Note

If you need to manage the presentation of hierarchical content in your iPadOS or visionOS app, consider using a [split view](https://developer.apple.com/design/human-interface-guidelines/split-views).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/column-views#Best-practices)

Consider using a column view when you have a deep data hierarchy in which people tend to navigate back and forth frequently between levels, and you don’t need the sorting capabilities that a [list or table](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) provides. For example, Finder offers a column view (in addition to icon, list, and gallery views) for navigating directory structures.

**Show the root level of your data hierarchy in the first column.** People know they can quickly scroll back to the first column to begin navigating the hierarchy from the top again.

**Consider showing information about the selected item when there are no nested items to display.** The Finder, for example, shows a preview of the selected item and information like the creation date, modification date, file type, and size.

**Let people resize columns.** This is especially important if the names of some data items are too long to fit within the default column width.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/column-views#Platform-considerations)

 _Not supported in iOS, iPadOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/column-views#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/column-views#Related)

[Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)

[Outline views](https://developer.apple.com/design/human-interface-guidelines/outline-views)

[Split views](https://developer.apple.com/design/human-interface-guidelines/split-views)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/column-views#Developer-documentation)

[`NSBrowser`](https://developer.apple.com/documentation/AppKit/NSBrowser) — AppKit

