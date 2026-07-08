---
title: "Outline views | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/outline-views

# Outline views

An outline view presents hierarchical data in a scrolling list of cells that are organized into columns and rows.

![A stylized representation of a list of folders and images, displayed in an outline view containing four columns: \[Name\], \[Date Modified\], \[Size\], and \[Kind\]. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/30462b13b59c89c7ba9e142a2fcef05b/components-outline-view-intro%402x.png)

An outline view includes at least one column that contains primary hierarchical data, such as a set of parent containers and their children. You can add columns, as needed, to display attributes that supplement the primary data; for example, sizes and modification dates. Parent containers have disclosure triangles that expand to reveal their children.

Finder windows offer an outline view for navigating the file system.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/outline-views#Best-practices)

Outline views work well to display text-based content and often appear in the leading side of a [split view](https://developer.apple.com/design/human-interface-guidelines/split-views), with related content on the opposite side.

**Use a table instead of an outline view to present data that’s not hierarchical.** For guidance, see [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables).

**Expose data hierarchy in the first column only.** Other columns can display attributes that apply to the hierarchical data in the primary column.

**Use descriptive column headings to provide context.** Use nouns or short noun phrases with [title-style capitalization](https://help.apple.com/applestyleguide/#/apsgb744e4a3?sub=apdca93e113f1d64) and no punctuation; in particular, avoid adding a trailing colon. Always provide column headings in a multi-column outline view. If you don’t include a column heading in a single-column outline view, use a label or other means to make sure there’s enough context.

**Consider letting people click column headings to sort an outline view.** In a sortable outline view, people can click a column heading to perform an ascending or descending sort based on that column. You can implement additional sorting based on secondary columns behind the scenes, if necessary. If people click the primary column heading, sorting occurs at each hierarchy level. For example, in the Finder, all top-level folders are sorted, then the items within each folder are sorted. If people click the heading of a column that’s already sorted, the folders and their contents are sorted again in the opposite direction.

**Let people resize columns.** Data displayed in an outline view often varies in width. It’s important to let people adjust column width as needed to reveal data that’s wider than the column.

**Make it easy for people to expand or collapse nested containers.** For example, clicking a disclosure triangle for a folder in a Finder window expands only that folder. However, Option-clicking the disclosure triangle expands all of its subfolders.

**Retain people’s expansion choices.** If people expand various levels of an outline view to reach a specific item, store the state so you can display it again the next time. This way, people won’t need to navigate back to the same place again.

**Consider using alternating row colors in multi-column outline views.** Alternating colors can make it easier for people to track row values across columns, especially in wide outline views.

**Let people edit data if it makes sense in your app.** In an editable outline view cell, people expect to be able to single-click a cell to edit its contents. Note that a cell can respond differently to a double click. For example, an outline view listing files might let people single-click a file’s name to edit it, but double-click a file’s name to open the file. You can also let people reorder, add, and remove rows if it would be useful.

**Consider using a centered ellipsis to truncate cell text instead of clipping it.** An ellipsis in the middle preserves the beginning and end of the cell text, which can make the content more distinct and recognizable than clipped text.

**Consider offering a search field to help people find values quickly in a lengthy outline view.** Windows with an outline view as the primary feature often include a search field in the toolbar. For guidance, see [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/outline-views#Platform-considerations)

 _Not supported in iOS, iPadOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/outline-views#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/outline-views#Related)

[Column views](https://developer.apple.com/design/human-interface-guidelines/column-views)

[Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)

[Split views](https://developer.apple.com/design/human-interface-guidelines/split-views)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/outline-views#Developer-documentation)

[`OutlineGroup`](https://developer.apple.com/documentation/SwiftUI/OutlineGroup) — SwiftUI

[`NSOutlineView`](https://developer.apple.com/documentation/AppKit/NSOutlineView) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/outline-views#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/49/1636D358-5C36-4027-B204-81FFE4D05B7D/3455_wide_250x141_1x.jpg) Stacks, Grids, and Outlines in SwiftUI ](https://developer.apple.com/videos/play/wwdc2020/10031)

