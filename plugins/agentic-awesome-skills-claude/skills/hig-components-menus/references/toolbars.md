---
title: "Toolbars | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/toolbars

# Toolbars

A toolbar provides convenient access to frequently used commands, controls, navigation, and search.

![A stylized representation of a toolbar, with a Back control on the leading edge, and Compose, Share, and the More menu on the trailing edge. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/c88cf44cf526483c94aa15bd2eb984e1/components-toolbar-intro%402x.png)

A toolbar consists of one or more sets of controls arranged horizontally along the top or bottom edge of the view, grouped into logical sections.

Toolbars act on content in the view, facilitate navigation, and help orient people in the app. They include three types of content:

  * The title of the current view

  * Navigation controls, like back and forward, and [search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)

  * Actions, or bar items, like [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) and [menus](https://developer.apple.com/design/human-interface-guidelines/menus)




In contrast to a toolbar, a [tab bar](https://developer.apple.com/design/human-interface-guidelines/tab-bars) is specifically for navigating between areas of an app.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/toolbars#Best-practices)

**Choose items deliberately to avoid overcrowding.** People need to be able to distinguish and activate each item, so you don’t want to put too many items in the toolbar. To accommodate variable view widths, define which items move to the overflow menu as the toolbar becomes narrower.

Note

The system automatically adds an overflow menu in macOS or iPadOS when items no longer fit. Don’t add an overflow menu manually, and avoid layouts that cause toolbar items to overflow by default.

**Add a More menu to contain additional actions.** Prioritize less important actions for inclusion in the More menu. Try to include all actions in the toolbar if possible, and only add this menu if you really need it.

  * Standard 
  * Compact 



![A screenshot of the Notes app on Mac, with the window wide enough for the toolbar to include all of the available toolbar items. A More menu button appears on the trailing side of the toolbar, with the menu open beneath it.](https://docs-assets.developer.apple.com/published/38a70b5303c70f442fdf6e60c1caf000/toolbars-notes-app-expanded-icons%402x.png)The standard toolbar in macOS Notes includes a More menu with extra commands.

![A screenshot of the Notes app on Mac, with the window narrow enough that the system moves several items from the toolbar into an overflow menu, including the More menu button. The overflow menu is open to show the items it includes.](https://docs-assets.developer.apple.com/published/d946d1a2815b1a181b0cd090e536cb21/toolbars-notes-app-collapsed-icons%402x.png)As the window narrows, the More menu moves into an overflow menu along with other toolbar items that no longer fit.

**In iPadOS and macOS apps, consider letting people customize the toolbar to include their most common items.** Toolbar customization is especially useful in apps that provide a lot of items — or that include advanced functionality that not everyone needs — and in apps that people tend to use for long periods of time. For example, it works well to make a range of editing actions available for toolbar customization, because people often use different types of editing commands based on their work style and their current project.

**Reduce the use of toolbar backgrounds and tinted controls.** Any custom backgrounds and appearances you use might overlay or interfere with background effects that the system provides. Instead, use the content layer to inform the color and appearance of the toolbar, and use a [`ScrollEdgeEffectStyle`](https://developer.apple.com/documentation/SwiftUI/ScrollEdgeEffectStyle) when necessary to distinguish the toolbar area from the content area. This approach helps your app express its unique personality without distracting from content.

**Avoid applying a similar color to toolbar item labels and content layer backgrounds.** If your app already has bright, colorful content in the content layer, prefer using the default monochromatic appearance of toolbars. For more guidance, see [Liquid Glass color](https://developer.apple.com/design/human-interface-guidelines/color#Liquid-Glass-color).

**Prefer using standard components in a toolbar.** By default, standard buttons, text fields, headers, and footers have corner radii that are concentric with bar corners. If you need to create a custom component, ensure that its corner radius is also concentric with the bar’s corners.

**Consider temporarily hiding toolbars for a distraction-free experience.** Sometimes people appreciate a minimal interface to reduce distractions or reveal more content. If you support this, do so contextually when it makes the most sense, and offer ways to reliably restore hidden interface elements. For guidance, see [Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen). For guidance specific to visionOS, see [Immersive experiences](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences).

## [Titles](https://developer.apple.com/design/human-interface-guidelines/toolbars#Titles)

**Provide a useful title for each window.** A title helps people confirm their location as they navigate your app, and differentiates between the content of multiple open windows. If titling a toolbar seems redundant, you can leave the title area empty. For example, Notes doesn’t title the current note when a single window is open, because the first line of content typically supplies sufficient context. However, when opening notes in separate windows, the system titles them with the first line of content so people can tell them apart.

**Don’t title windows with your app name.** Your app’s name doesn’t provide useful information about your content hierarchy or any window or area in your app, so it doesn’t work well as a title.

**Write a concise title.** Aim for a word or short phrase that distills the purpose of the window or view, and keep the title under 15 characters long so you leave enough room for other controls.

## [Navigation](https://developer.apple.com/design/human-interface-guidelines/toolbars#Navigation)

A toolbar with navigation controls appears at the top of a window, helping people move through a hierarchy of content. A toolbar also often contains a [search field](https://developer.apple.com/design/human-interface-guidelines/search-fields) for quick navigation between areas or pieces of content. In iOS, a navigation-specific toolbar is sometimes called a navigation bar.

**Use the standard Back and Close buttons.** People know that the standard Back button lets them retrace their steps through a hierarchy of information, and the standard Close button closes a modal view. Prefer the standard symbols for each, and don’t use a text label that says _Back_ or _Close_. If you create a custom version of either, make sure it still looks the same, behaves as people expect, and matches the rest of your interface, and ensure you consistently implement it throughout your app or game. For guidance, see [Icons](https://developer.apple.com/design/human-interface-guidelines/icons).

![An illustration of a capsule-shape Back button that includes the Back symbol on the leading side, grouped with Back in text on the trailing side.](https://docs-assets.developer.apple.com/published/de859b5c4d42c9df2e92c680d48a37b2/toolbars-navigation-action-back-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of the standard circular Back button that includes the standard Back symbol.](https://docs-assets.developer.apple.com/published/bf5f1cf48120b10f031bd9df57124f0f/toolbars-navigation-action-back-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

## [Actions](https://developer.apple.com/design/human-interface-guidelines/toolbars#Actions)

**Provide actions that support the main tasks people perform.** In general, prioritize the commands that people are most likely to want. These commands are often the ones people use most frequently, but in some apps it might make sense to prioritize commands that map to the highest level or most important objects people work with.

**Make sure the meaning of each control is clear.** Don’t make people guess or experiment to figure out what a toolbar item does. Prefer simple, recognizable symbols for items instead of text, except for actions like _edit_ that aren’t well-represented by symbols. For guidance on symbols that represent common actions, see [Standard icons](https://developer.apple.com/design/human-interface-guidelines/icons#Standard-icons).

![An illustration of an item group with text button labels for Filter, Delete, and New.](https://docs-assets.developer.apple.com/published/e39b41732b2b7cf5a40c682f6ec28448/toolbars-prefer-symbols-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of an item group with symbol button labels for Filter, Delete, and New.](https://docs-assets.developer.apple.com/published/a90ab6d6f58aa023f4b830e4045b507b/toolbars-prefer-symbols-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

**Prefer system-provided symbols without borders.** System-provided symbols are familiar, automatically receive appropriate coloring and vibrancy, and respond consistently to user interactions. Borders (like outlined circle symbols) aren’t necessary because the section provides a visible container, and the system defines hover and selection state appearances automatically. For guidance, see [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols).

![An illustration of an item group with buttons for Filter and More. The buttons are labeled with symbols with circular borders.](https://docs-assets.developer.apple.com/published/90f36d797636e931c39663c146c1cb11/toolbars-icons-circle-outline-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of an item group with buttons for Filter and More. The buttons are labeled with symbols without borders.](https://docs-assets.developer.apple.com/published/e7b2189bb13488aab5e7eacc5eea9b1b/toolbars-icons-no-outline-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

**Use the`.prominent` style for key actions such as Done or Submit.** This separates and tints the action so there’s a clear focal point. Only specify one primary action, and put it on the trailing side of the toolbar.

![An illustration of two toolbar items, with a Filter button on the leading side and a Done button on the trailing side. The buttons are ungrouped, and the Done button has the prominent style applied to indicate that it's the primary action.](https://docs-assets.developer.apple.com/published/36c552c629c8a980c83501134e53d749/toolbars-prominent-action-tinted%402x.png)

## [Item groupings](https://developer.apple.com/design/human-interface-guidelines/toolbars#Item-groupings)

You can position toolbar items in three locations: the leading edge, center area, and trailing edge of the toolbar. These areas provide familiar homes for navigation controls, window or document titles, common actions, and search.

  * **Leading edge.** Elements that let people return to the previous document and show or hide a sidebar appear at the far leading edge, followed by the view title. Next to the title, the toolbar can include a document menu that contains standard and app-specific commands that affect the document as a whole, such as Duplicate, Rename, Move, and Export. To ensure that these items are always available, items on the toolbar’s leading edge aren’t customizable.

  * **Center area.** Common, useful controls appear in the center area, and the view title can appear here if it’s not on the leading edge. In macOS and iPadOS, people can add, remove, and rearrange items here if you let them customize the toolbar, and items in this section automatically collapse into the system-managed overflow menu when the window shrinks enough in size.

  * **Trailing edge.** The trailing edge contains important items that need to remain available, buttons that open nearby inspectors, an optional search field, and the More menu that contains additional items and supports toolbar customization. It also includes a primary action like Done when one exists. Items on the trailing edge remain visible at all window sizes.




![A diagram of the top toolbar in the Freeform app on iPad. Callouts indicate the location of item groupings on the leading edge, center area, and trailing edge of the toolbar.](https://docs-assets.developer.apple.com/published/882504f8e992b3ce0e373f47523adf5e/toolbars-ipad-anatomy%402x.png)

To position items in the groupings you want, pin them to the leading edge, center, or trailing edge, and insert space between buttons or other items where appropriate.

**Group toolbar items logically by function and frequency of use.** For example, Keynote includes several sections that are based on functionality, including one for presentation-level commands, one for playback commands, and one for object insertion.

**Group navigation controls and critical actions like Done, Close, or Save in dedicated, familiar, and visually distinct sections.** This reflects their importance and helps people discover and understand these actions.

![An illustration of a top toolbar on iPhone, with controls for back, forward, tool selection, and the More menu grouped in a single section on the trailing edge.](https://docs-assets.developer.apple.com/published/9349ac4f406f84c24e98a6b9445b9560/toolbars-layout-grouping-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of a top toolbar on iPhone, with controls for back and forward grouped on the leading edge, and controls for tool selection and the More menu grouped on the trailing edge.](https://docs-assets.developer.apple.com/published/2fede653e14b982c4b2c65f3ca657278/toolbars-layout-grouping-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

**Keep consistent groupings and placement across platforms.** This helps people develop familiarity with your app and trust that it behaves similarly regardless of where they use it.

**Minimize the number of groups.** Too many groups of controls can make a toolbar feel cluttered and confusing, even with the added space on iPad and Mac. In general, aim for a maximum of three.

**Keep actions with text labels separate.** Placing an action with a text label next to an action with a symbol can create the illusion of a single action with a combined text and symbol, leading to confusion and misinterpretation. If your toolbar includes multiple text-labeled buttons, the text of those buttons may appear to run together, making the buttons indistinguishable. Add separation by inserting fixed space between the buttons. For developer guidance, see [`UIBarButtonItem.SystemItem.fixedSpace`](https://developer.apple.com/documentation/UIKit/UIBarButtonItem/SystemItem/fixedSpace).

![An illustration of a top toolbar on iPhone, with an Edit control with a text label and a Share control with a symbol grouped together on the trailing edge.](https://docs-assets.developer.apple.com/published/de7f7298c70900b9c2f65d5cae7c6d60/toolbars-layout-text-action-grouping-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of a top toolbar on iPhone, with an Edit control with a text label and a Share control with a symbol grouped into individual sections on the trailing edge.](https://docs-assets.developer.apple.com/published/c46f284f584841d7783aa2090426ca9b/toolbars-layout-text-action-grouping-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/toolbars#Platform-considerations)

 _No additional considerations for tvOS._

### [iOS](https://developer.apple.com/design/human-interface-guidelines/toolbars#iOS)

**Prioritize only the most important items for inclusion in the main toolbar area.** Because space is so limited, carefully consider which actions are essential to your app and include those first. Create a More menu to include additional items.

**Use a large title to help people stay oriented as they navigate and scroll.** By default, a large title transitions to a standard title as people begin scrolling the content, and transitions back to large when people scroll to the top, reminding them of their current location. For developer guidance, see [`prefersLargeTitles`](https://developer.apple.com/documentation/UIKit/UINavigationBar/prefersLargeTitles).

### [iPadOS](https://developer.apple.com/design/human-interface-guidelines/toolbars#iPadOS)

**Consider combining a toolbar with a tab bar.** In iPadOS, a toolbar and a [tab bar](https://developer.apple.com/design/human-interface-guidelines/tab-bars) can coexist in the same horizontal space at the top of the view. This is particularly useful for layouts where you want to navigate between a few main app areas while keeping the full width of the window available for content. For guidance, see [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) and [Windows](https://developer.apple.com/design/human-interface-guidelines/windows).

### [macOS](https://developer.apple.com/design/human-interface-guidelines/toolbars#macOS)

In a macOS app, the toolbar resides in the frame at the top of a window, either below or integrated with the title bar. Note that window titles can display inline with controls, and toolbar items don’t include a bezel.

![A diagram of a Finder window in macOS with callouts showing the location of the toolbar and the window frame.](https://docs-assets.developer.apple.com/published/a595dda6ba3dd30cbd7c9851d941be72/toolbars-mac-window-anatomy%402x.png)

**Make every toolbar item available as a command in the menu bar.** Because people can customize the toolbar or hide it, it can’t be the only place that presents a command. In contrast, it doesn’t make sense to provide a toolbar item for every menu item, because not all menu commands are important enough or used often enough to warrant space in the toolbar.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/toolbars#visionOS)

In visionOS, the system-provided toolbar appears along the bottom edge of a window, above the window-management controls, and in a parallel plane that’s slightly in front of the window along the z-axis.

![A screenshot of a toolbar along the bottom of the Notes app window in visionOS.](https://docs-assets.developer.apple.com/published/47985b0aebd160790502368ff9e282a1/visionos-toolbar-notes-app%402x.png)

To maintain the legibility of toolbar items as content scrolls behind them, visionOS uses a variable blur in the bar background. The variable blur anchors the bar above the scrolling content while letting the view’s glass material remain uniform and undivided.

In visionOS, you can supply either a symbol or a text label for each toolbar item. When people look at a toolbar item that contains a symbol, visionOS reveals the text label, providing additional information.

**Prefer using a system-provided toolbar.** The standard toolbar has a consistent and familiar appearance and is optimized to work well with eye and hand input. In addition, the system automatically places a standard toolbar in the correct position in relation to its window.

![A screenshot of a toolbar in visionOS.](https://docs-assets.developer.apple.com/published/449acaaf0268d1fff08e9bf41b7c82d9/visionos-toolbar-standard-layout%402x.png)

**Avoid creating a vertical toolbar.** In visionOS, [tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) are vertical, so presenting a vertical toolbar could confuse people.

**Try to prevent windows from resizing below the width of the toolbar.** visionOS doesn’t include a menu bar where each app lists all its actions, so it’s important for the toolbar to provide reliable access to essential controls regardless of a window’s size.

**If your app can enter a modal state, consider offering contextually relevant toolbar controls.** For example, a photo-editing app might enter a modal state to help people perform a multistep editing task. In this scenario, the controls in the modal editing view are different from the controls in the main window. Be sure to reinstate the window’s standard toolbar controls when the app exits the modal state.

**Avoid using a pull-down menu in a toolbar.** A pull-down menu lets you offer additional actions related to a toolbar item, but can be difficult for people to discover and may clutter your interface. Because a toolbar is located at the bottom edge of a window in visionOS, a pull-down menu might obscure the standard window controls that appear below the bottom edge. For guidance, see [Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons).

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/toolbars#watchOS)

A toolbar button lets you offer important app functionality in a view that displays related content. You can place toolbar buttons in the top corners or along the bottom. If you place these buttons above scrolling content, the buttons always remain visible, as the content scrolls under them.

![A screenshot showing toolbar buttons in the top leading and trailing corners.](https://docs-assets.developer.apple.com/published/464c7be02e97dcb7470c9b8202dc2b59/toolbars-watch-top-buttons%402x.png)

Top toolbar buttons

![A screenshot showing two toolbar buttons in the bottom leading and trailing corners.](https://docs-assets.developer.apple.com/published/53d742601fa4b250207336099587e1d3/toolbars-watch-bottom-buttons%402x.png)

Bottom toolbar buttons

For developer guidance, see [`topBarLeading`](https://developer.apple.com/documentation/SwiftUI/ToolbarItemPlacement/topBarLeading), [`topBarTrailing`](https://developer.apple.com/documentation/SwiftUI/ToolbarItemPlacement/topBarTrailing), or [`bottomBar`](https://developer.apple.com/documentation/SwiftUI/ToolbarItemPlacement/bottomBar).

You can also place a button in the scrolling view. By default, a scrolling toolbar button remains hidden until people reveal it by scrolling up. People frequently scroll to the top of a scrolling view, so discovering a toolbar button is automatic.

![A screenshot showing two toolbar buttons in the top leading and trailing corners. The toolbar also has a primary action button in the scroll view, but it's hidden.](https://docs-assets.developer.apple.com/published/027a24ac805a9e7976a1ccd1df68f0d3/toolbars-watch-primary-button-hidden%402x.png)

Toolbar button hidden

![A screenshot showing two toolbar buttons in the top leading and trailing corners. The toolbar also displays a primary action button in the scroll view.](https://docs-assets.developer.apple.com/published/e010a0cdf42f792ebb4715cdd5f65676/toolbars-watch-primary-button-visible%402x.png)

Toolbar button shown

For developer guidance, see [`primaryAction`](https://developer.apple.com/documentation/SwiftUI/ToolbarItemPlacement/primaryAction).

**Use a scrolling toolbar button for an important action that isn’t a primary app function.** A toolbar button gives you the flexibility to offer important functionality in a view whose primary purpose is related to that functionality, but may not be the same. For example, Mail provides the essential New Message action in a toolbar button at the top of the Inbox view. The primary purpose of the Inbox is to display a scrollable list of email messages, so it makes sense to offer the closely related compose action in a toolbar button at the top of the view.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/toolbars#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/toolbars#Related)

[Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)

[Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

[Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

[Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)

[Apple Design Resources](https://developer.apple.com/design/resources/)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/toolbars#Developer-documentation)

[Toolbars](https://developer.apple.com/documentation/SwiftUI/Toolbars) — SwiftUI

[`UIToolbar`](https://developer.apple.com/documentation/UIKit/UIToolbar) — UIKit

[`NSToolbar`](https://developer.apple.com/documentation/AppKit/NSToolbar) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/toolbars#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/1AAA030E-2ECA-47D8-AE09-6D7B72A840F6/10044_wide_250x141_1x.jpg) Get to know the new design system ](https://developer.apple.com/videos/play/wwdc2025/356)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/toolbars#Change-log)

Date| Changes  
---|---  
December 16, 2025| Updated guidance for Liquid Glass.  
June 9, 2025| Added guidance for grouping bar items, updated guidance for using symbols, and incorporated navigation bar guidance.  
June 21, 2023| Updated to include guidance for visionOS.  
June 5, 2023| Updated guidance for using toolbars in watchOS.  
  
