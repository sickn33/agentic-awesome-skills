---
title: "Buttons | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/buttons

# Buttons

A button initiates an instantaneous action.

![A stylized representation of two horizontally aligned buttons. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/15781cd4e57f0e78b7a388a3fa009fa8/components-buttons-intro%402x.png)

Versatile and highly customizable, buttons give people simple, familiar ways to do tasks in your app. In general, a button combines three attributes to clearly communicate its function:

  * **Style.** A visual style based on size, color, and shape.

  * **Content.** A symbol (or icon), text label, or both that a button displays to convey its purpose.

  * **Role.** A system-defined role that identifies a button’s semantic meaning and can affect its appearance.




There are also many button-like components that have distinct appearances and behaviors for specific use cases, like [toggles](https://developer.apple.com/design/human-interface-guidelines/toggles), [pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons), and [segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/buttons#Best-practices)

When buttons are instantly recognizable and easy to understand, an app tends to feel intuitive and well designed.

**Make buttons easy for people to use.** It’s essential to include enough space around a button so that people can visually distinguish it from surrounding components and content. Giving a button enough space is also critical for helping people select or activate it, regardless of the method of input they use. As a general rule, a button needs a hit region of at least 44x44 pt — in visionOS, 60x60 pt — to ensure that people can select it easily, whether they use a fingertip, a pointer, their eyes, or a remote.

**Always include a press state for a custom button.** Without a press state, a button can feel unresponsive, making people wonder if it’s accepting their input.

## [Style](https://developer.apple.com/design/human-interface-guidelines/buttons#Style)

System buttons offer a range of styles that support customization while providing built-in interaction states, accessibility support, and appearance adaptation. Different platforms define different styles that help you communicate hierarchies of actions in your app.

**In general, use a button that has a prominent visual style for the most likely action in a view.** To draw people’s attention to a specific button, use a prominent button style so the system can apply an accent color to the button’s background. Buttons that use color tend to be the most visually distinctive, helping people quickly identify the actions they’re most likely to use. Keep the number of prominent buttons to one or two per view. Presenting too many prominent buttons increases cognitive load, requiring people to spend more time considering options before making a choice.

**Use style — not size — to visually distinguish the preferred choice among multiple options.** When you use buttons of the same size to offer two or more options, you signal that the options form a coherent set of choices. By contrast, placing two buttons of different sizes near each other can make the interface look confusing and inconsistent. If you want to highlight the preferred or most likely option in a set, use a more prominent button style for that option and a less prominent style for the remaining ones.

**Avoid applying a similar color to button labels and content layer backgrounds.** If your app already has bright, colorful content in the content layer, prefer using the default monochromatic appearance of button labels. For more guidance, see [Liquid Glass color](https://developer.apple.com/design/human-interface-guidelines/color#Liquid-Glass-color).

## [Content](https://developer.apple.com/design/human-interface-guidelines/buttons#Content)

**Ensure that each button clearly communicates its purpose.** Depending on the platform, a button can contain a symbol (or icon), a text label, or both to help people understand what it does.

Note

In macOS and visionOS, the system displays a tooltip after people hover over a button for a moment. A tooltip displays a brief phrase that explains what a button does; for guidance, see [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help).

**Try to associate familiar actions with familiar icons.** For example, people can predict that a button containing the `square.and.arrow.up` symbol will help them perform share-related activities. If it makes sense to use an icon in your button, consider using an existing or customized [symbol](https://developer.apple.com/design/human-interface-guidelines/sf-symbols). For a list of symbols that represent common actions, see [Standard icons](https://developer.apple.com/design/human-interface-guidelines/icons#Standard-icons).

**Consider using text when a short label communicates more clearly than an icon.** To use text, write a few words that succinctly describe what the button does. Using [title-style capitalization](https://help.apple.com/applestyleguide/#/apsgb744e4a3?sub=apdca93e113f1d64), consider starting the label with a verb to help convey the button’s action — for example, a button that lets people add items to their shopping cart might use the label “Add to Cart.”

## [Role](https://developer.apple.com/design/human-interface-guidelines/buttons#Role)

A system button can have one of the following roles:

  * **Normal.** No specific meaning.

  * **Primary.** The button is the default button — the button people are most likely to choose.

  * **Cancel.** The button cancels the current action.

  * **Destructive.** The button performs an action that can result in data destruction.




A button’s role can have additional effects on its appearance. For example, a primary button uses an app’s accent color, whereas a destructive button uses the system red color.

![An example alert with three system buttons, labeled Primary, Destructive, and Cancel. The primary button uses a blue accent color, the destructive button uses text in the system red color, and the cancel button appears as a standard button.](https://docs-assets.developer.apple.com/published/ffa011d457181b94f56257d7d59f71aa/buttons-roles-alert%402x.png)

**Assign the primary role to the button people are most likely to choose.** When a primary button responds to the Return key, it makes it easy for people to quickly confirm their choice. In addition, when the button is in a temporary view — like a [sheet](https://developer.apple.com/design/human-interface-guidelines/sheets), an editable view, or an [alert](https://developer.apple.com/design/human-interface-guidelines/alerts) — assigning it the primary role means that the view can automatically close when people press Return.

**Don’t assign the primary role to a button that performs a destructive action, even if that action is the most likely choice.** Because of its visual prominence, people sometimes choose a primary button without reading it first. Help people avoid losing content by assigning the primary role to nondestructive buttons.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/buttons#Platform-considerations)

 _No additional considerations for tvOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/buttons#iOS-iPadOS)

**Configure a button to display an activity indicator when you need to provide feedback about an action that doesn’t instantly complete.** Displaying an activity indicator within a button can save space in your user interface while clearly communicating the reason for the delay. To help clarify what’s happening, you can also configure the button to display a different label alongside the activity indicator. For example, the label “Checkout” could change to “Checking out…” while the activity indicator is visible. When a delay occurs after people click or tap your configured button, the system displays the activity indicator next to the original or alternative label, hiding the button image, if there is one.

![An illustration of a button labeled Checkout.](https://docs-assets.developer.apple.com/published/f7a2f53cdd4755b1121c34f1df0e94ae/button-activity-indicator-hidden%402x.png)

![An illustration of a button labeled Checking out, with an activity indicator on the leading side of the label.](https://docs-assets.developer.apple.com/published/f2d6023f16eed80487f72b630903d220/button-activity-indicator-visible%402x.png)

### [macOS](https://developer.apple.com/design/human-interface-guidelines/buttons#macOS)

Several specific button types are unique to macOS.

#### [Push buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#Push-buttons)

The standard button type in macOS is known as a _push button_. You can configure a push button to display text, a symbol, an icon, or an image, or a combination of text and image content. Push buttons can act as the default button in a view and you can tint them.

**Use a flexible-height push button only when you need to display tall or variable height content.** Flexible-height buttons support the same configurations as regular push buttons — and they use the same corner radius and content padding — so they look consistent with other buttons in your interface. If you need to present a button that contains two lines of text or a tall icon, use a flexible-height button; otherwise, use a standard push button. For developer guidance, see [`NSButton.BezelStyle.flexiblePush`](https://developer.apple.com/documentation/AppKit/NSButton/BezelStyle-swift.enum/flexiblePush).

**Append a trailing ellipsis to the title when a push button opens another window, view, or app.** Throughout the system, an ellipsis in a control title signals that people can provide additional input. For example, the Edit buttons in the AutoFill pane of Safari Settings include ellipses because they open other views that let people modify autofill values.

**Consider supporting spring loading.** On systems with a Magic Trackpad, _spring loading_ lets people activate a button by dragging selected items over it and force clicking — that is, pressing harder — without dropping the selected items. After force clicking, people can continue dragging the items, possibly to perform additional actions.

#### [Square buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#Square-buttons)

A _square button_ (also known as a _gradient button_) initiates an action related to a view, like adding or removing rows in a table.

Square buttons contain symbols or icons — not text — and you can configure them to behave like push buttons, toggles, or pop-up buttons. The buttons appear in close proximity to their associated view — usually within or beneath it — so people know which view the buttons affect.

**Use square buttons in a view, not in the window frame.** Square buttons aren’t intended for use in toolbars or status bars. If you need a button in a [toolbar](https://developer.apple.com/design/human-interface-guidelines/toolbars), use a toolbar item.

**Prefer using a symbol in a square button.** [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) provides a wide range of symbols that automatically receive appropriate coloring in their default state and in response to user interaction.

**Avoid using labels to introduce square buttons.** Because square buttons are closely connected with a specific view, their purpose is generally clear without the need for descriptive text.

For developer guidance, see [`NSButton.BezelStyle.smallSquare`](https://developer.apple.com/documentation/AppKit/NSButton/BezelStyle-swift.enum/smallSquare).

#### [Help buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#Help-buttons)

A _help button_ appears within a view and opens app-specific help documentation.

Help buttons are circular, consistently sized buttons that contain a question mark. For guidance on creating help documentation, see [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help).

**Use the system-provided help button to display your help documentation.** People are familiar with the appearance of the standard help button and know that choosing it opens help content.

**When possible, open the help topic that’s related to the current context.** For example, the help button in the Rules pane of Mail settings opens the Mail User Guide to a help topic that explains how to change these settings. If no specific help topic applies directly to the current context, open the top level of your app’s help documentation when people choose a help button.

**Include no more than one help button per window.** Multiple help buttons in the same context make it hard for people to predict the result of clicking one.

**Position help buttons where people expect to find them.** Use the following locations for guidance.

View style| Help button location  
---|---  
Dialog with dismissal buttons (like OK and Cancel)| Lower corner, opposite to the dismissal buttons and vertically aligned with them  
Dialog without dismissal buttons| Lower-left or lower-right corner  
Settings window or pane| Lower-left or lower-right corner  
  
**Use a help button within a view, not in the window frame.** For example, avoid placing a help button in a toolbar or status bar.

**Avoid displaying text that introduces a help button.** People know what a help button does, so they don’t need additional descriptive text.

#### [Image buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#Image-buttons)

An _image button_ appears in a view and displays an image, symbol, or icon. You can configure an image button to behave like a push button, toggle, or pop-up button.

**Use an image button in a view, not in the window frame.** For example, avoid placing an image button in a toolbar or status bar. If you need to use an image as a button in a toolbar, use a toolbar item. See [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars).

**Include about 10 pixels of padding between the edges of the image and the button edges.** An image button’s edges define its clickable area even when they aren’t visible. Including padding ensures that a click registers correctly even if it’s not precisely within the image. In general, avoid including a system-provided border in an image button; for developer guidance, see [`isBordered`](https://developer.apple.com/documentation/AppKit/NSButton/isBordered).

**If you need to include a label, position it below the image button.** For related guidance, see [Labels](https://developer.apple.com/design/human-interface-guidelines/labels).

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/buttons#visionOS)

A visionOS button typically includes a visible background that can help people see it, and the button plays sound to provide feedback when people interact with it.

Video with custom controls. 

Content description: A recording showing the top portion of a window in visionOS. The window contains several buttons, including a 'More' button, which receives the hover effect. The button is selected and a menu containing additional options appears. 

Play 

There are three standard button shapes in visionOS. Typically, an icon-only button uses a [`circle`](https://developer.apple.com/documentation/SwiftUI/ButtonBorderShape/circle) shape, a text-only button uses a [`roundedRectangle`](https://developer.apple.com/documentation/SwiftUI/ButtonBorderShape/roundedRectangle) or [`capsule`](https://developer.apple.com/documentation/SwiftUI/ButtonBorderShape/capsule) shape, and a button that includes both an icon and text uses the capsule shape.

visionOS buttons use different visual styles to communicate four different interaction states.

![An image of a circular button that contains an icon of an outlined square with rounded corners. The button background is dark and the dashed outline is white.](https://docs-assets.developer.apple.com/published/aed0b1c313448f088dd1ee24663db11e/visionos-button-state-idle%402x.png)Idle

![An image of a circular button that contains an icon of an outlined square with rounded corners. The button background is medium dark and the outline is white.](https://docs-assets.developer.apple.com/published/29d708fd7985184cbee9d90d7684da92/visionos-button-state-hover%402x.png)Hover

![An image of a circular button that contains an icon of an outlined square with rounded corners. The button background is white and the outline is black.](https://docs-assets.developer.apple.com/published/0b94e710605235dfca19ef853499cf26/visionos-button-state-selected%402x.png)Selected

![An image of a circular button that contains an icon of an outlined square with rounded corners. The button background is very dark and the outline is light.](https://docs-assets.developer.apple.com/published/737120252765e5427161af32bb17e7fb/visionos-button-state-unavailable%402x.png)Unavailable

Note

In visionOS, buttons don’t support custom hover effects.

In addition to the four states shown above, a button can also reveal a tooltip when people look at it for a brief time. In general, buttons that contain text don’t need to display a tooltip because the button’s descriptive label communicates what it does.

Video with custom controls. 

Content description: An animation showing a tooltip appearing beneath a visionOS button. 

Play 

In visionOS, buttons can have the following sizes.

Shape| Mini (28 pt)| Small (32 pt)| Regular (44 pt)| Large (52 pt)| Extra large (64 pt)  
---|---|---|---|---|---  
Circular| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)  
Capsule (text only)| | ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)|   
Capsule (text and icon)| | | ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)|   
Rounded rectangle| | ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)| ![A checkmark denoting availability.](https://docs-assets.developer.apple.com/published/9c1e6292b0ff3ee8f9e10917ad97f3da/table-availability-checkmark%402x.png)|   
  
**Prefer buttons that have a discernible background shape and fill.** It tends to be easier for people to see a button when it’s enclosed in a shape that uses a contrasting background fill. The exception is a button in a toolbar, context menu, alert, or [ornament](https://developer.apple.com/design/human-interface-guidelines/ornaments) where the shape and material of the larger component make the button comfortably visible. The following guidelines can help you ensure that a button looks good in different contexts:

  * When a button appears on top of a glass [window](https://developer.apple.com/design/human-interface-guidelines/windows#visionOS), use the [`thin`](https://developer.apple.com/documentation/SwiftUI/Material/thin) material as the button’s background.

  * When a button appears floating in space, use the [glass material](https://developer.apple.com/design/human-interface-guidelines/materials#visionOS) for its background.




**Avoid creating a custom button that uses a white background fill and black text or icons.** The system reserves this visual style to convey the toggled state.

**In general, prefer circular or capsule-shape buttons.** People’s eyes tend to be drawn toward the corners in a shape, making it difficult to keep looking at the shape’s center. The more rounded a button’s shape, the easier it is for people to look steadily at it. When you need to display a button by itself, prefer a capsule-shape button.

**Provide enough space around a button to make it easy for people to look at it.** Aim to place buttons so their centers are always at least 60 pts apart. If your buttons measure 60 pts or larger, add 4 pts of padding around them to keep the hover effect from overlapping. Also, it’s usually best to avoid displaying small or mini buttons in a vertical stack or horizontal row.

**Choose the right shape if you need to display text-labeled buttons in a stack or row.** Specifically, prefer the rounded-rectangle shape in a vertical stack of buttons and prefer the capsule shape in a horizontal row of buttons.

**Use standard controls to take advantage of the audible feedback sounds people already know.** Audible feedback is especially important in visionOS, because the system doesn’t play haptics.

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/buttons#watchOS)

watchOS displays all inline buttons using the [`capsule`](https://developer.apple.com/documentation/SwiftUI/ButtonBorderShape/capsule) button shape. When you place a button inline with content, it gains a material effect that contrasts with the background to ensure legibility.

![An illustration that represents a screen on Apple Watch, which includes capsule-shaped Primary and Secondary buttons.](https://docs-assets.developer.apple.com/published/79565402ab107166de9aa0fe6eab4e6d/buttons-watch-full-width%402x.png)

**Use a toolbar to place buttons in the corners.** The system automatically moves the time and title to accommodate toolbar buttons. The system also applies the [Liquid Glass](https://developer.apple.com/design/human-interface-guidelines/materials#Liquid-Glass) appearance to toolbar buttons, providing a clear visual distinction from the content beneath them.

![An illustration showing toolbar buttons in the top leading and trailing corners, as well as three toolbar buttons across the bottom of the screen.](https://docs-assets.developer.apple.com/published/28835a2c6f34513eb0758beef1f6015d/buttons-watch-toolbar-corners%402x.png)

**Prefer buttons that span the width of the screen for primary actions in your app.** Full-width buttons look better and are easier for people to tap. If two buttons must share the same horizontal space, use the same height for both, and use images or short text titles for each button’s content.

**Use toolbar buttons to provide either navigation to related areas or contextual actions for the view’s content.** These buttons provide access to additional information or secondary actions for the view’s content.

**Use the same height for vertical stacks of one- and two-line text buttons.** As much as possible, use identical button heights for visual consistency.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/buttons#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/buttons#Related)

[Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons)

[Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons)

[Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)

[Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)

[Location button](https://developer.apple.com/design/human-interface-guidelines/privacy#Location-button)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/buttons#Developer-documentation)

[`Button`](https://developer.apple.com/documentation/SwiftUI/Button) — SwiftUI

[`UIButton`](https://developer.apple.com/documentation/UIKit/UIButton) — UIKit

[`NSButton`](https://developer.apple.com/documentation/AppKit/NSButton) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/buttons#Change-log)

Date| Changes  
---|---  
December 16, 2025| Updated guidance for Liquid Glass.  
June 9, 2025| Updated guidance for button styles and content.  
February 2, 2024| Noted that visionOS buttons don’t support custom hover effects.  
December 5, 2023| Clarified some terminology and guidance for buttons in visionOS.  
June 21, 2023| Updated to include guidance for visionOS.  
June 5, 2023| Updated guidance for using buttons in watchOS.  
  
