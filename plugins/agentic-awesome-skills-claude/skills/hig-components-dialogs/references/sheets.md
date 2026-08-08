---
title: "Sheets | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/sheets

# Sheets

A sheet helps people perform a scoped task that’s closely related to their current context.

![A stylized representation of a sheet extending down from the top of a window. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/357ff0b017e9241da82888bd3aec4372/components-sheet-intro%402x.png)

By default, a sheet is _modal_ , presenting a targeted experience that prevents people from interacting with the parent view until they dismiss the sheet (for more on modal presentation, see [Modality](https://developer.apple.com/design/human-interface-guidelines/modality)). A modal sheet is useful for requesting specific information from people or presenting a simple task that they can complete before returning to the parent view. For example, a sheet might let people supply information needed to complete an action, such as attaching a file, choosing the location for a move or save, or specifying the format for a selection.

In macOS, visionOS, and watchOS, a sheet is always modal, but in iOS and iPadOS, a sheet can also be nonmodal. When a nonmodal sheet is onscreen, people use its functionality to directly affect the current task in the parent view without dismissing the sheet. For example, Notes on iPhone and iPad uses a nonmodal sheet to help people apply different formatting to various text selections as they edit a note.

![A screenshot of an in-progress note on iPhone. Several words are selected and highlighted. In the bottom half of the screen, the format sheet shows that the selected words use the regular body font.](https://docs-assets.developer.apple.com/published/56830eea369c54ce82f6867a0907f3f3/sheets-nonmodal-notes-text-regular%402x.png)

The Notes format sheet lets people apply formatting to selected text in the editing view.

![A screenshot of the same in-progress note on iPhone. Different words are selected and highlighted. The format sheet shows that the selected words use the body font in italics.](https://docs-assets.developer.apple.com/published/f7b427fb2d880e16df4ed1025a43b47c/sheets-nonmodal-notes-text-italic%402x.png)

Because the sheet is nonmodal, people can make additional text selections without dismissing the sheet.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/sheets#Best-practices)

**Use a sheet to present simple content or tasks.** A sheet allows some of the parent view to remain visible, helping people retain their original context as they interact with the sheet.

**For complex or prolonged user flows, consider alternatives to sheets.** For example, iOS and iPadOS offer a full-screen style of modal view that can work well to display content like videos, photos, or camera views or to help people perform multistep tasks like document or photo editing. (For developer guidance, see [`UIModalPresentationStyle.fullScreen`](https://developer.apple.com/documentation/UIKit/UIModalPresentationStyle/fullScreen).) In a macOS experience, you might want to open a new window or let people enter full-screen mode instead of using a sheet. For example, a self-contained task like editing a document tends to work well in a separate window, whereas [going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen) can help people view media. In visionOS, you can give people a way to transition your app to a Full Space where they can dive into content or a task; for guidance, see [Immersive experiences](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences).

**Display only one sheet at a time from the main interface.** When people close a sheet, they expect to return to the parent view or window. If closing a sheet takes people back to another sheet, they can lose track of where they are in your app. If something people do within a sheet results in another sheet appearing, close the first sheet before displaying the new one. If necessary, you can display the first sheet again after people dismiss the second one.

**Use a nonmodal view when you want to present supplementary items that affect the main task in the parent view.** To give people access to information and actions they need while continuing to interact with the main window, consider using a [split view](https://developer.apple.com/design/human-interface-guidelines/split-views) in visionOS or a [panel](https://developer.apple.com/design/human-interface-guidelines/panels) in macOS; in iOS and iPadOS, you can use a nonmodal sheet for this workflow. For guidance, see [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/sheets#iOS-iPadOS).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/sheets#Platform-considerations)

 _No additional considerations for tvOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/sheets#iOS-iPadOS)

A resizable sheet expands when people scroll its contents or drag the _grabber_ , which is a small horizontal indicator that can appear at the top edge of a sheet. Sheets resize according to their _detents_ , which are particular heights at which a sheet naturally rests. Designed for iPhone, detents specify particular heights at which a sheet naturally rests. The system defines two detents: _large_ is the height of a fully expanded sheet and _medium_ is about half of the fully expanded height.

![An illustration showing an iPhone screen in portrait orientation containing a solid rounded rectangle that occupies almost all of the screen, representing a full-screen sheet. A rounded close button appears in the upper-left corner of the sheet.](https://docs-assets.developer.apple.com/published/c2a600adb5237892585d71d2ae61c9a6/sheets-large-detent%402x.png)

Large detent

![An illustration showing an iPhone screen in portrait orientation containing a solid rounded rectangle that occupies half of the screen, representing a half-screen sheet. A rounded close button appears in the upper-left corner of the sheet.](https://docs-assets.developer.apple.com/published/413ac0d4cf462891f2ba9d0cd4bb01f1/sheets-medium-detent%402x.png)

Medium detent

Sheets automatically support the large detent. Adding the medium detent allows the sheet to rest at both heights, whereas specifying only medium prevents the sheet from expanding to full height. For developer guidance, see [`detents`](https://developer.apple.com/documentation/UIKit/UISheetPresentationController/detents).

**In an iPhone app, consider supporting the medium detent to allow progressive disclosure of the sheet’s content.** For example, a share sheet displays the most relevant items within the medium detent, where they’re visible without resizing. To view more items, people can scroll or expand the sheet. In contrast, you might not want to support the medium detent if a sheet’s content is more useful when it displays at full height. For example, the compose sheets in Messages and Mail display only at full height to give people enough room to create content.

**Include a grabber in a resizable sheet.** A grabber shows people that they can drag the sheet to resize it; they can also tap it to cycle through the detents. In addition to providing a visual indicator of resizability, a grabber also works with VoiceOver so people can resize the sheet without seeing the screen. For developer guidance, see [`prefersGrabberVisible`](https://developer.apple.com/documentation/UIKit/UISheetPresentationController/prefersGrabberVisible).

**Support swiping to dismiss a sheet.** People expect to swipe vertically to dismiss a sheet instead of tapping a dismiss button. If people have unsaved changes in the sheet when they begin swiping to dismiss it, use an action sheet to let them confirm their action.

**Position Done and Cancel buttons as people expect.** Typically, a Done or Dismiss button belongs in a sheet’s top-right corner in a left-to-right layout. The Cancel button belongs in a sheet’s top-left corner.

The exception to this is for sheets with additional subviews, where the Cancel button belongs in the top-right; this provides room for the Back button in the top-left on pages after the first. At the end of the navigation flow, replace the Cancel button with the Done button.

![An illustration of the top half of a sheet on iPhone. A Cancel button appears in the top-left corner of the view.](https://docs-assets.developer.apple.com/published/4c0ea03add08b05592c51ed58ebb79f1/sheets-close-button-placement-no-back%402x.png)

Placement of the Cancel button when it appears by itself

![An illustration of the top half of a sheet on iPhone. A Back button appears in the top-left corner of the view, and a Cancel button appears in the top-right corner.](https://docs-assets.developer.apple.com/published/4325d8e5db78c585b01a7137e34189c7/sheets-close-button-placement-with-back%402x.png)

Placement of the Cancel button when it appears as part of a multi-step flow

**Prefer using the page or form sheet presentation styles in an iPadOS app.** Each style uses a default size for the sheet, centering its content on top of a dimmed background view and providing a consistent experience. For developer guidance, see [`UIModalPresentationStyle`](https://developer.apple.com/documentation/UIKit/UIModalPresentationStyle).

### [macOS](https://developer.apple.com/design/human-interface-guidelines/sheets#macOS)

In macOS, a sheet is a cardlike view with rounded corners that floats on top of its parent window. The parent window is dimmed while the sheet is onscreen, signaling that people can’t interact with it until they dismiss the sheet. However, people expect to interact with other app windows before dismissing a sheet.

![A screenshot of the Notes app, with the What's New in Notes sheet centered on top of a dimmed Notes document in the background.](https://docs-assets.developer.apple.com/published/582e02d0df9b4a07dea002053f9ec6ea/sheets-macos-notes%402x.png)

**Present a sheet in a reasonable default size.** People don’t generally expect to resize sheets, so it’s important to use a size that’s appropriate for the content you display. In some cases, however, people appreciate a resizable sheet — such as when they need to expand the contents for a clearer view — so it’s a good idea to support resizing.

**Let people interact with other app windows without first dismissing a sheet.** When a sheet opens, you bring its parent window to the front — if the parent window is a document window, you also bring forward its modeless document-related panels. When people want to interact with other windows in your app, make sure they can bring those windows forward even if they haven’t dismissed the sheet yet.

**Position a sheet’s dismiss buttons as people expect.** People expect to find all buttons that dismiss a sheet — including Done, OK, and Cancel — at the bottom of the view, in the trailing corner.

**Use a panel instead of a sheet if people need to repeatedly provide input and observe results.** A find and replace panel, for example, might let people initiate replacements individually, so they can observe the result of each search for correctness. For guidance, see [Panels](https://developer.apple.com/design/human-interface-guidelines/panels).

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/sheets#visionOS)

While a sheet is visible in a visionOS app, it floats in front of its parent window, dimming it, and becoming the target of people’s interactions with the app.

Video with custom controls. 

Content description: A recording showing a sheet opening above a blank window in visionOS. 

Play 

**Avoid displaying a sheet that emerges from the bottom edge of a window.** To help people view the sheet, prefer centering it in their [field of view](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Field-of-view).

**Present a sheet in a default size that helps people retain their context.** Avoid displaying a sheet that covers most or all of its window, but consider letting people resize the sheet if they want.

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/sheets#watchOS)

In watchOS, a sheet is a full-screen view that slides over your app’s current content. The sheet is semitransparent to help maintain the current context, but the system applies a material to the background that blurs and desaturates the covered content.

![A screenshot of a sheet with a primary Action button and a default cancel button on Apple Watch.](https://docs-assets.developer.apple.com/published/fcdad96a098bea9c7b98a114403e46f2/sheets-watch-overlay%402x.png)

**Use a sheet only when your modal task requires a custom title or custom content presentation.** If you need to give people important information or present a set of choices, consider using an [alert](https://developer.apple.com/design/human-interface-guidelines/alerts) or [action sheet](https://developer.apple.com/design/human-interface-guidelines/action-sheets).

**Keep sheet interactions brief and occasional.** Use a sheet only as a temporary interruption to the current workflow, and only to facilitate an important task. Avoid using a sheet to help people navigate your app’s content.

**Change the default label of the dismiss control only if it makes sense in your app.** By default, the sheet displays a round Cancel button in the upper left corner. Use this button when the sheet lets people make changes to the app’s behavior or to their data. If your sheet simply presents information without enabling a task, use the standard Done button instead. You can use a [toolbar](https://developer.apple.com/design/human-interface-guidelines/toolbars) to display multiple buttons.

![A screenshot of a watch displaying a sheet with the standard check mark Done button on Apple Watch.](https://docs-assets.developer.apple.com/published/bc70ac8a01bd110befa02132e9f53672/sheets-watch-custom%402x.png)

The standard Done button

**If you change the default label, prefer using SF Symbols to represent the action.** Avoid using a label that might mislead people into thinking that the sheet is part of a hierarchical navigation interface. Also, if the text in the top-leading corner looks like a page or app title, people won’t know how to dismiss the sheet. For guidance, see [Standard icons](https://developer.apple.com/design/human-interface-guidelines/icons#Standard-icons).

![A screenshot that shows a top toolbar with the default Cancel button at the top of the screen on Apple Watch.](https://docs-assets.developer.apple.com/published/4b2b3901392b3a2101bf98fbee0b7809/modal-sheet-watchos-do%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![A screenshot that shows a top toolbar with a custom Back button at the top of the screen on Apple Watch.](https://docs-assets.developer.apple.com/published/3342cdf046b51d5b7e22008f4fa36cf8/modal-sheet-watchos-do-not-1%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![A screenshot that shows a top toolbar with a button with the words Page title at the top of the screen on Apple Watch.](https://docs-assets.developer.apple.com/published/7e655a4130904ed5def637dde60325f9/modal-sheet-watchos-do-not-2%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

## [Resources](https://developer.apple.com/design/human-interface-guidelines/sheets#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/sheets#Related)

[Modality](https://developer.apple.com/design/human-interface-guidelines/modality)

[Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets)

[Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers)

[Panels](https://developer.apple.com/design/human-interface-guidelines/panels)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/sheets#Developer-documentation)

[`sheet(item:onDismiss:content:)`](https://developer.apple.com/documentation/SwiftUI/View/sheet\(item:onDismiss:content:\)) — SwiftUI

[`UISheetPresentationController`](https://developer.apple.com/documentation/UIKit/UISheetPresentationController) — UIKit

[`presentAsSheet(_:)`](https://developer.apple.com/documentation/AppKit/NSViewController/presentAsSheet\(_:\)) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/sheets#Change-log)

Date| Changes  
---|---  
March 29, 2024| Added guidance to use form or page sheet styles in iPadOS apps.  
December 5, 2023| Recommended using a split view to offer supplementary items in a visionOS app.  
June 21, 2023| Updated to include guidance for visionOS.  
June 5, 2023| Updated guidance for using sheets in watchOS.  
  
