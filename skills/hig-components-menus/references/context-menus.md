---
title: "Context menus | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/context-menus

# Context menus

A context menu provides access to functionality that’s directly related to an item, without cluttering the interface.

![A stylized representation of a contextual menu beneath a clicking pointer. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/6145c402544704012a48978cf5ceb87a/components-context-menu-intro%402x.png)

Although a context menu provides convenient access to frequently used items, it’s hidden by default, so people might not know it’s there. To reveal a context menu, people generally choose a view or select some content and then perform an action, using the input modes their current configuration supports. For example:

  * The system-defined touch or pinch and hold gesture in visionOS, iOS, and iPadOS

  * Pressing the Control key while clicking a pointing device in macOS and iPadOS

  * Using a secondary click on a Magic Trackpad in macOS or iPadOS




## [Best practices](https://developer.apple.com/design/human-interface-guidelines/context-menus#Best-practices)

**Prioritize relevancy when choosing items to include in a context menu.** A context menu isn’t for providing advanced or rarely used items; instead, it helps people quickly access the commands they’re most likely to need in their current context. For example, the context menu for a Mail message in the Inbox includes commands for replying and moving the message, but not commands for editing message content, managing mailboxes, or filtering messages.

**Aim for a small number of menu items.** A context menu that’s too long can be difficult to scan and scroll.

**Support context menus consistently throughout your app.** If you provide context menus for items in some places but not in others, people won’t know where they can use the feature and may think there’s a problem.

**Always make context menu items available in the main interface, too.** For example, in Mail in iOS and iPadOS, the context menu items that are available for a message in the Inbox are also available in the toolbar of the message view. In macOS, an app’s menu bar menus list all the app’s commands, including those in various context menus.

**If you need to use submenus to manage a menu’s complexity, keep them to one level.** A submenu is a menu item that reveals a secondary menu of logically related commands. Although submenus can shorten a context menu and clarify its commands, more than one level of submenu complicates the experience and can be difficult for people to navigate. If you need to include a submenu, give it an intuitive title that helps people predict its contents without opening it. For guidance, see [Submenus](https://developer.apple.com/design/human-interface-guidelines/menus#Submenus).

**Hide unavailable menu items, don’t dim them.** Unlike a regular menu, which helps people discover actions they can perform even when the action isn’t available, a context menu displays only the actions that are relevant to the currently selected view or content. In macOS, the exceptions are the Cut, Copy, and Paste menu items, which may appear unavailable if they don’t apply to the current context.

**Aim to place the most frequently used menu items where people are likely to encounter them first.** When a context menu opens, people often read it starting from the part that’s closest to where their finger or pointer revealed it. Depending on the location of the selected content, a context menu might open above or below it, so you might also need to reverse the order of items to match the position of the menu.

**Show keyboard shortcuts in your app’s main menus, not in context menus.** Context menus already provide a shortcut to task-specific commands, so it’s redundant to display keyboard shortcuts too.

**Follow best practices for using separators.** As with other types of menus, you can use separators to group items in a context menu and help people scan the menu more quickly. In general, you don’t want more than about three groups in a context menu. For guidance, see [Menus](https://developer.apple.com/design/human-interface-guidelines/menus).

**In iOS, iPadOS, and visionOS, warn people about context menu items that can destroy data.** If you need to include potentially destructive items in your context menu — such as Delete or Remove — list them at the end of the menu and identify them as destructive (for developer guidance, see [`destructive`](https://developer.apple.com/documentation/UIKit/UIMenuElement/Attributes/destructive)). The system can display a destructive menu item using a red text color.

## [Content](https://developer.apple.com/design/human-interface-guidelines/context-menus#Content)

A context menu seldom displays a title. In contrast, each item in a context menu needs to display a short label that clearly describes what it does. For guidance, see [Menus > Labels](https://developer.apple.com/design/human-interface-guidelines/menus#Labels).

**Include a title in a context menu only if doing so clarifies the menu’s effect.** For example, when people select multiple Mail messages and tap the Mark toolbar button in iOS and iPadOS, the resulting context menu displays a title that states the number of selected messages, reminding people that the command they choose affects all the messages they selected.

**Represent menu item actions with familiar icons.** Icons help people recognize common actions throughout your app. Use the same icons as the system to represent actions such as Copy, Share, and Delete, wherever they appear. For a list of icons that represent common actions, see [Standard icons](https://developer.apple.com/design/human-interface-guidelines/icons#Standard-icons). For additional guidance, see [Menus](https://developer.apple.com/design/human-interface-guidelines/menus).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/context-menus#Platform-considerations)

 _No additional considerations for tvOS. Not supported in watchOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/context-menus#iOS-iPadOS)

**Provide either a context menu or an edit menu for an item, but not both.** If you provide both features for the same item, it can be confusing to people — and difficult for the system to detect their intent. See [Edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus).

**In iPadOS, consider using a context menu to let people create a new object in your app.** iPadOS lets you reveal a context menu when people perform a long press on the touchscreen or use a secondary click with an attached trackpad or keyboard. For example, Files lets people create a new folder by revealing a context menu in an area between existing files and folders.

In iOS and iPadOS, a context menu can display a preview of the current content near the list of commands. People can choose a command in the menu or — in some cases — they can tap the preview to open it or drag it to another area.

**Prefer a graphical preview that clarifies the target of a context menu’s commands.** For example, when people reveal a context menu on a list item in Notes or Mail, the preview shows a condensed version of the actual content to help people confirm that they’re working with the item they intend.

**Ensure that your preview looks good as it animates.** As people reveal a context menu on an onscreen object, the system animates the preview image as it emerges from the content, dimming the screen behind the preview and the menu. It’s important to adjust the preview’s clipping path to match the shape of the preview image so that its contours, such as the rounded corners, don’t appear to change during animation. For developer guidance, see [`UIContextMenuInteractionDelegate`](https://developer.apple.com/documentation/UIKit/UIContextMenuInteractionDelegate).

### [macOS](https://developer.apple.com/design/human-interface-guidelines/context-menus#macOS)

On a Mac, a context menu is sometimes called a _contextual_ menu.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/context-menus#visionOS)

**Consider using a context menu instead of a panel or inspector window to present frequently used functionality.** Minimizing the number of separate views or windows your app opens can help people keep their space uncluttered.

**In general, avoid letting a context menu’s height exceed the height of the window.** In visionOS, a window includes system-provided components above and below its top and bottom edges, such as window-management controls and the Share menu, so a context menu that’s too tall could obscure them. As you consider the number of items to include, be guided by the ways people are likely to use your app. For example, people who use an app to accomplish in-depth, specialist tasks often expect to spend time learning a large number of sophisticated commands and might appreciate contextual access to them. On the other hand, people who use an app to perform a few simple actions may appreciate short contextual menus that are quick to scan and use.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/context-menus#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/context-menus#Related)

[Menus](https://developer.apple.com/design/human-interface-guidelines/menus)

[Edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus)

[Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons)

[Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/context-menus#Developer-documentation)

[`contextMenu(menuItems:)`](https://developer.apple.com/documentation/SwiftUI/View/contextMenu\(menuItems:\)) — SwiftUI

[`UIContextMenuInteraction`](https://developer.apple.com/documentation/UIKit/UIContextMenuInteraction) — UIKit

[`popUpContextMenu(_:with:for:)`](https://developer.apple.com/documentation/AppKit/NSMenu/popUpContextMenu\(_:with:for:\)) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/context-menus#Change-log)

Date| Changes  
---|---  
December 5, 2023| Added guidance on hiding unavailable menu items.  
June 21, 2023| Updated to include guidance for visionOS.  
September 14, 2022| Refined guidance on including a submenu and added a guideline on using a context menu to support object creation in an iPadOS app.  
  
