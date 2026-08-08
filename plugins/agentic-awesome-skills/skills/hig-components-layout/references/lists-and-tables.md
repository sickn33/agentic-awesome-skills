---
title: "Lists and tables | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/lists-and-tables

# Lists and tables

Lists and tables present data in one or more columns of rows.

![A stylized representation of a three-row table with header and footer text. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/c3e26d2515ac05cae7aba2704f8640d6/components-lists-and-tables-intro%402x.png)

A table or list can represent data that’s organized in groups or hierarchies, and it can support user interactions like selecting, adding, deleting, and reordering. Apps and games in all platforms can use tables to present content and options; many apps use lists to express an overall information hierarchy and help people navigate it. For example, iOS Settings uses a hierarchy of lists to help people choose options, and several apps — such as Mail in iPadOS and macOS — use a table within a [split view](https://developer.apple.com/design/human-interface-guidelines/split-views).

Sometimes, people need to work with complex data in a multicolumn table or a spreadsheet. Apps that offer productivity tasks often use a table to represent various characteristics or attributes of the data in separate, sortable columns.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Best-practices)

**Prefer displaying text in a list or table.** A table can include any type of content, but the row-based format is especially well suited to making text easy to scan and read. If you have items that vary widely in size — or you need to display a large number of images — consider using a [collection](https://developer.apple.com/design/human-interface-guidelines/collections) instead.

**Let people edit a table when it makes sense.** People appreciate being able to reorder a list, even if they can’t add or remove items. In iOS and iPadOS, people must enter an edit mode before they can select table items.

**Provide appropriate feedback when people select a list item.** The feedback can vary depending on whether selecting the item reveals a new view or toggles the item’s state. In general, a table that helps people navigate through a hierarchy persistently highlights the selected row to clarify the path people are taking. In contrast, a table that lists options often highlights a row only briefly before adding an image — such as a checkmark — indicating that the item is selected.

## [Content](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Content)

**Keep item text succinct so row content is comfortable to read.** Short, succinct text can help minimize truncation and wrapping, making text easier to read and scan. If each item consists of a large amount of text, consider alternatives that help you avoid displaying over-large table rows. For example, you could list item titles only, letting people choose an item to reveal its content in a detail view.

**Consider ways to preserve readability of text that might otherwise get clipped or truncated.** When a table is narrow — for example, if people can vary its width — you want content to remain recognizable and easy to read. Sometimes, an ellipsis in the middle of text can make an item easier to distinguish because it preserves both the beginning and the end of the content.

**Use descriptive column headings in a multicolumn table.** Use nouns or short noun phrases with [title-style capitalization](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web#apdca93e113f1d64), and don’t add ending punctuation. If you don’t include a column heading in a single-column table view, use a label or a header to help people understand the context.

## [Style](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Style)

**Choose a table or list style that coordinates with your data and platform.** Some styles use visual details to help communicate grouping and hierarchy or to provide specific experiences. In iOS and iPadOS, for example, the grouped style uses headers, footers, and additional space to separate groups of data; the elliptical style available in watchOS makes items appear as if they’re rolling off a rounded surface as people scroll; and macOS defines a bordered style that uses alternating row backgrounds to help make large tables easier to use. For developer guidance, see [`ListStyle`](https://developer.apple.com/documentation/SwiftUI/ListStyle).

**Choose a row style that fits the information you need to display.** For example, you might need to display a small image in the leading end of a row, followed by a brief explanatory label. Some platforms provide built-in row styles you can use to arrange content in list rows, such as the [`UIListContentConfiguration`](https://developer.apple.com/documentation/UIKit/UIListContentConfiguration-swift.struct) API you can use to lay out content in a list’s rows, headers, and footers in iOS, iPadOS, and tvOS.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Platform-considerations)

### [iOS, iPadOS, visionOS](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#iOS-iPadOS-visionOS)

**Use an info button only to reveal more information about a row’s content.** An info button — called a _detail disclosure button_ when it appears in a list row — doesn’t support navigation through a hierarchical table or list. If you need to let people drill into a list or table row’s subviews, use a disclosure indicator accessory control. For developer guidance, see [`UITableViewCell.AccessoryType.disclosureIndicator`](https://developer.apple.com/documentation/UIKit/UITableViewCell/AccessoryType-swift.enum/disclosureIndicator).

![An illustration of a grouped list of rows. Each list item includes an info button at the trailing end of the row.](https://docs-assets.developer.apple.com/published/fd301d26835e0341b95eaa2027f200f2/info-button-in-list%402x.png)An info button shows details about a list item; it doesn’t support navigation.

![An illustration of a grouped list of rows. Each list item includes a right-pointing chevron at the trailing end of the row.](https://docs-assets.developer.apple.com/published/dcb3678fe458846713b03756ab5e1a28/disclosure-indicator-in-list%402x.png)A disclosure indicator reveals the next level in a hierarchy; it doesn’t show details about the item.

**Avoid adding an index to a table that displays controls — like disclosure indicators — in the trailing ends of its rows.** An _index_ typically consists of the letters in an alphabet, displayed vertically at the trailing side of a list. People can jump to a specific section in the list by choosing the index letter that maps to it. Because both the index and elements like disclosure indicators appear on the trailing side of a list, it can be difficult for people to use one element without activating the other.

### [macOS](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#macOS)

**When it provides value, let people click a column heading to sort a table view based on that column**. If people click the heading of a column that’s already sorted, re-sort the data in the opposite direction.

**Let people resize columns.** Data displayed in a table view often varies in width. People appreciate resizing columns to help them concentrate on different areas or reveal clipped data.

**Consider using alternating row colors in a multicolumn table.** Alternating colors can help people track row values across columns, especially in a wide table.

**Use an outline view instead of a table view to present hierarchical data.** An [outline view](https://developer.apple.com/design/human-interface-guidelines/outline-views) looks like a table view, but includes disclosure triangles for exposing nested levels of data. For example, an outline view might display folders and the items they contain.

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#tvOS)

**Confirm that images near a table still look good as each row highlights and slightly increases in size when it becomes focused.** A focused row’s corners can also become rounded, which may affect the appearance of images on either side of it. Account for this effect as you prepare images, and don’t add your own masks to round the corners.

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#watchOS)

**When possible, limit the number of rows.** Short lists are easier for people to scan, but sometimes people expect a long list of items. For example, if people subscribe to a large number of podcasts, they might think something’s wrong if they can’t view all their items. You can help make a long list more manageable by listing the most relevant items and providing a way for people to view more.

**Constrain the length of detail views if you want to support vertical page-based navigation.** People use vertical page-based navigation to swipe vertically among the detail items of different list rows. Navigating in this way saves time because people don’t need to return to the list to tap a new detail item, but it works only when detail views are short. If your detail views scroll, people won’t be able to use vertical page-based navigation to swipe among them.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Related)

[Collections](https://developer.apple.com/design/human-interface-guidelines/collections)

[Outline views](https://developer.apple.com/design/human-interface-guidelines/outline-views)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Developer-documentation)

[`List`](https://developer.apple.com/documentation/SwiftUI/List) — SwiftUI

[Tables](https://developer.apple.com/documentation/SwiftUI/Tables) — SwiftUI

[`UITableView`](https://developer.apple.com/documentation/UIKit/UITableView) — UIKit

[`NSTableView`](https://developer.apple.com/documentation/AppKit/NSTableView) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/49/1636D358-5C36-4027-B204-81FFE4D05B7D/3455_wide_250x141_1x.jpg) Stacks, Grids, and Outlines in SwiftUI ](https://developer.apple.com/videos/play/wwdc2020/10031)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables#Change-log)

Date| Changes  
---|---  
June 21, 2023| Updated to include guidance for visionOS.  
June 5, 2023| Updated guidance to reflect changes in watchOS 10.  
  
