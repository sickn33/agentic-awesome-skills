---
title: "Segmented controls | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/segmented-controls

# Segmented controls

A segmented control is a linear set of two or more segments, each of which functions as a button.

![A stylized representation of a selected segment in a segmented control. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/89298764551d236435a7057412cf2e06/components-segmented-control-intro%402x.png)

Within a segmented control, all segments are usually equal in width. Like [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), segments can contain text or images. Segments can also have text labels beneath them (or beneath the control as a whole).

A segmented control offers a single choice from among a set of options, or in macOS, either a single choice or multiple choices. For example, in macOS Keynote people can select only one segment in the alignment options control to align selected text. In contrast, people can choose multiple segments in the font attributes control to combine styles like bold, italics, and underline. The toolbar of a Keynote window also uses a segmented control to let people show and hide various editing panes within the main window area.

![A partial screenshot of a segmented control that consists of four text-alignment options. The center alignment option is selected.](https://docs-assets.developer.apple.com/published/7ed5112804ec078b8ba281e30a30ec85/segmented-control-one-choice%402x.png)Single choice

![A partial screenshot of a segmented control that consists of four font types. Three of the four options are selected.](https://docs-assets.developer.apple.com/published/0b1d550e9c4fc6e201d45640fad819eb/segmented-control-multiple-choices%402x.png)Multiple choices

In addition to representing the state of a single or multiple-choice selection, a segmented control can function as a set of buttons that perform actions without showing a selection state. For example, the Reply, Reply all, and Forward buttons in macOS Mail. For developer guidance, see [`isMomentary`](https://developer.apple.com/documentation/UIKit/UISegmentedControl/isMomentary) and [`NSSegmentedControl.SwitchTracking.momentary`](https://developer.apple.com/documentation/AppKit/NSSegmentedControl/SwitchTracking/momentary).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Best-practices)

**Use a segmented control to provide closely related choices that affect an object, state, or view.** For example, a segmented control in an inspector could let people choose one or more attributes to apply to a selection, or a segmented control in a toolbar could offer a set of actions to perform on the current view.

![A screenshot of the top half of the Activity screen in the iOS Health app, showing graphs of Move and Exercise activity. The segmented control above the graphs has D selected, indicating that the graphs show one day of activity.](https://docs-assets.developer.apple.com/published/f82bafe0f162b0181f6d50661109464b/segmented-controls-activity-charts%402x.png)

In the iOS Health app, a segmented control provides a choice of time ranges for the activity graphs to display.

**Consider a segmented control when it’s important to group functions together, or to clearly show their selection state.** Unlike other button styles, segmented controls preserve their grouping regardless of the view size or where they appear. This grouping can also help people understand at a glance which controls are currently selected.

**Keep control types consistent within a single segmented control.** Don’t assign actions to segments in a control that otherwise represents selection state, and don’t show a selection state for segments in a control that otherwise performs actions.

**Limit the number of segments in a control.** Too many segments can be hard to parse and time-consuming to navigate. Aim for no more than about five to seven segments in a wide interface and no more than about five segments on iPhone.

**In general, keep segment size consistent.** When all segments have equal width, a segmented control feels balanced. To the extent possible, it’s best to keep icon and title widths consistent too.

## [Content](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Content)

**Prefer using either text or images — not a mix of both — in a single segmented control.** Although individual segments can contain text labels or images, mixing the two in a single control can lead to a disconnected and confusing interface.

**As much as possible, use content with a similar size in each segment.** Because all segments typically have equal width, it doesn’t look good if content fills some segments but not others.

**Use nouns or noun phrases for segment labels.** Write text that describes each segment and uses [title-style capitalization](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web#apdca93e113f1d64). A segmented control that displays text labels doesn’t need introductory text.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Platform-considerations)

 _Not supported in watchOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#iOS-iPadOS)

**Consider a segmented control to switch between closely related subviews.** A segmented control can be useful as a way to quickly switch between related subviews. For example, the segmented control in Calendar’s New Event sheet switches between the subviews for creating a new event and a new reminder. For switching between completely separate sections of an app, use a [tab bar](https://developer.apple.com/design/human-interface-guidelines/tab-bars) instead.

![A screenshot of the top half of the iOS Calendar app, showing the New Event sheet. A segmented control provides the ability to switch between adding a new event and a new reminder.](https://docs-assets.developer.apple.com/published/2438acc643ee037a518cad7a15b18709/segmented-controls-calendar-new-event%402x.png)

### [macOS](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#macOS)

**Consider using introductory text to clarify the purpose of a segmented control.** When the control uses symbols or interface icons, you could also add a label below each segment to clarify its meaning. If your app includes tooltips, provide one for each segment in a segmented control.

**Use a tab view in the main window area — instead of a segmented control — for view switching.** A [tab view](https://developer.apple.com/design/human-interface-guidelines/tab-views) supports efficient view switching and is similar in appearance to a [box](https://developer.apple.com/design/human-interface-guidelines/boxes) combined with a segmented control. Consider using a segmented control to help people switch views in a toolbar or inspector pane.

![A screenshot of the macOS Calendar app. The main window area shows a tab view that contains four tabs: Day, Week, Month, and Year. The sidebar shows a segmented control that contains two segments: New and Replied.](https://docs-assets.developer.apple.com/published/e0a8dd930dcd6e099b72c643b6077a7b/macos-calendar-tab-view-segmented-control-comparison%402x.png)

**Consider supporting spring loading.** On a Mac equipped with a Magic Trackpad, spring loading lets people activate a segment by dragging selected items over it and force clicking without dropping the selected items. People can also continue dragging the items after a segment activates.

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#tvOS)

**Consider using a split view instead of a segmented control on screens that perform content filtering.** People generally find it easy to navigate back and forth between content and filtering options using a split view. Depending on its placement, a segmented control may not be as easy to access.

**Avoid putting other focusable elements close to segmented controls.** Segments become selected when focus moves to them, not when people click them. Carefully consider where you position a segmented control relative to other interface elements. If other focusable elements are too close, people might accidentally focus on them when attempting to switch between segments.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#visionOS)

When people look at a segmented control that uses icons, the system displays a tooltip that contains the descriptive text you supply.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Related)

[Split views](https://developer.apple.com/design/human-interface-guidelines/split-views)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Developer-documentation)

[`segmented`](https://developer.apple.com/documentation/SwiftUI/PickerStyle/segmented) — SwiftUI

[`UISegmentedControl`](https://developer.apple.com/documentation/UIKit/UISegmentedControl) — UIKit

[`NSSegmentedControl`](https://developer.apple.com/documentation/AppKit/NSSegmentedControl) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/segmented-controls#Change-log)

Date| Changes  
---|---  
June 21, 2023| Updated to include guidance for visionOS.  
  
