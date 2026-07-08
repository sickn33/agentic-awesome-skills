---
title: "Alerts | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/alerts

# Alerts

An alert gives people critical information they need right away.

![A stylized representation of an alert mockup that includes a title, description, primary button, and secondary button. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/89439ba152693e294fbb3298c00b2b48/components-alert-intro%402x.png)

For example, an alert can tell people about a problem, warn them when their action might destroy data, and give them an opportunity to confirm a purchase or another important action they initiated.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/alerts#Best-practices)

**Use alerts sparingly.** Alerts give people important information, but they interrupt the current task to do so. Encourage people to pay attention to your alerts by making certain that each one offers only essential information and useful actions.

**Avoid using an alert merely to provide information.** People don’t appreciate an interruption from an alert that’s informative, but not actionable. If you need to provide only information, prefer finding an alternative way to communicate it within the relevant context. For example, when a server connection is unavailable, Mail displays an indicator that people can choose to learn more.

**Avoid displaying alerts for common, undoable actions, even when they’re destructive.** For example, you don’t need to alert people about data loss every time they delete an email or file because they do so with the intention of discarding data, and they can undo the action. In comparison, when people take an uncommon destructive action that they can’t undo, it’s important to display an alert in case they initiated the action accidentally.

**Avoid showing an alert when your app starts.** If you need to inform people about new or important information the moment they open your app, design a way to make the information easily discoverable. If your app detects a problem at startup, like no network connection, consider alternative ways to let people know. For example, you could show cached or placeholder data and a nonintrusive label that describes the problem.

## [Anatomy](https://developer.apple.com/design/human-interface-guidelines/alerts#Anatomy)

An alert is a modal view that can look different in different platforms and devices.

  * iOS 
  * macOS 
  * tvOS 
  * visionOS 
  * watchOS 



![An illustration of an alert in the middle of the screen on iPhone.](https://docs-assets.developer.apple.com/published/ec9df875e228750105a393c96279bea5/alert-ios%402x.png)

![An illustration of an alert in the middle of the screen on a Mac.](https://docs-assets.developer.apple.com/published/0dfc6fd9de495ce3b7201169d829d760/alert-macos%402x.png)

![An illustration of an alert on tvOS.](https://docs-assets.developer.apple.com/published/63dde83c2b156231420f095a4d9dfae3/alert-tvos%402x.jpg)

![An illustration of an alert on Apple Vision Pro.](https://docs-assets.developer.apple.com/published/1abb6467cc401af501648da039b2b317/alert-visionos%402x.png)

![An illustration of an alert on Apple Watch.](https://docs-assets.developer.apple.com/published/a452534204f5ddb4aaa6ba7679946f2e/alert-watchos%402x.png)

## [Content](https://developer.apple.com/design/human-interface-guidelines/alerts#Content)

In all platforms, alerts display a title, optional informative text, and up to three buttons. On some platforms, alerts can include additional elements.

  * In iOS, iPadOS, macOS, and visionOS, an alert can include a text field.

  * Alerts in macOS and visionOS can include an icon and an accessory view.

  * macOS alerts can add a suppression [checkbox](https://developer.apple.com/design/human-interface-guidelines/toggles#Checkboxes) and a [Help button](https://developer.apple.com/design/human-interface-guidelines/buttons#Help-buttons).




**In all alert copy, be direct, and use a neutral, approachable tone.** Alerts often describe problems and serious situations, so avoid being oblique or accusatory, or masking the severity of the issue.

**Write a title that clearly and succinctly describes the situation.** You need to help people quickly understand the situation, so be complete and specific, without being verbose. As much as possible, describe what happened, the context in which it happened, and why. Avoid writing a title that doesn’t convey useful information — like “Error” or “Error 329347 occurred” — but also avoid overly long titles that wrap to more than two lines. If the title is a complete sentence, use [sentence-style capitalization](https://help.apple.com/applestyleguide/#/apsgb744e4a3?sub=apdca93e113f1d64) and appropriate ending punctuation. If the title is a sentence fragment, use title-style capitalization, and don’t add ending punctuation.

**Include informative text only if it adds value.** If you need to add an informative message, keep it as short as possible, using complete sentences, sentence-style capitalization, and appropriate punctuation.

**Avoid explaining alert buttons.** If your alert text and button titles are clear, you don’t need to explain what the buttons do. In rare cases where you need to provide guidance on choosing a button, use a term like _choose_ to account for people’s current device and interaction method, and refer to a button using its exact title without quotes. For guidance, see [Buttons](https://developer.apple.com/design/human-interface-guidelines/alerts#Buttons).

**If supported, include a text field only if you need people’s input to resolve the situation.** For example, you might need to present a secure text field to receive a password.

## [Buttons](https://developer.apple.com/design/human-interface-guidelines/alerts#Buttons)

**Create succinct, logical button titles.** Aim for a one- or two-word title that describes the result of selecting the button. Prefer verbs and verb phrases that relate directly to the alert text — for example, “View All,” “Reply,” or “Ignore.” In informational alerts only, you can use “OK” for acceptance, avoiding “Yes” and “No.” Always use “Cancel” to title a button that cancels the alert’s action. As with all button titles, use [title-style capitalization](https://help.apple.com/applestyleguide/#/apsgb744e4a3?sub=apdca93e113f1d64) and no ending punctuation.

**Avoid using OK as the default button title unless the alert is purely informational.** The meaning of “OK” can be unclear even in alerts that ask people to confirm that they want to do something. For example, does “OK” mean “OK, I want to complete the action” or “OK, I now understand the negative results my action would have caused”? A specific button title like “Erase,” “Convert,” “Clear,” or “Delete” helps people understand the action they’re taking.

**Place buttons where people expect.** In general, place the button people are most likely to choose on the trailing side in a row of buttons or at the top in a stack of buttons. Always place the default button on the trailing side of a row or at the top of a stack. Cancel buttons are typically on the leading side of a row or at the bottom of a stack.

**Use the destructive style to identify a button that performs a destructive action people didn’t deliberately choose.** For example, when people deliberately choose a destructive action — such as Empty Trash — the resulting alert doesn’t apply the destructive style to the Empty Trash button because the button performs the person’s original intent. In this scenario, the convenience of pressing Return to confirm the deliberately chosen Empty Trash action outweighs the benefit of reaffirming that the button is destructive. In contrast, people appreciate an alert that draws their attention to a button that can perform a destructive action they didn’t originally intend.

**If there’s a destructive action, include a Cancel button to give people a clear, safe way to avoid the action.** Always use the title “Cancel” for a button that cancels an alert’s action. Note that you don’t want to make a Cancel button the default button. If you want to encourage people to read an alert and not just automatically press Return to dismiss it, avoid making any button the default button. Similarly, if you must display an alert with a single button that’s also the default, use a Done button, not a Cancel button.

**Provide alternative ways to cancel an alert when it makes sense.** In addition to choosing a Cancel button, people appreciate using keyboard shortcuts or other quick ways to cancel an onscreen alert. For example:

Action| Platform  
---|---  
Exit to the Home Screen| iOS, iPadOS  
Pressing Escape (Esc) or Command-Period (.) on an attached keyboard| iOS, iPadOS, macOS, visionOS  
Pressing Menu on the remote| tvOS  
  
## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/alerts#Platform-considerations)

 _No additional considerations for tvOS or watchOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/alerts#iOS-iPadOS)

**Use an action sheet — not an alert — to offer choices related to an intentional action.** For example, when people cancel the Mail message they’re editing, an action sheet provides three choices: delete the edits (or the entire draft), save the draft, or return to editing. Although an alert can also help people confirm or cancel an action that has destructive consequences, it doesn’t provide additional choices related to the action. For guidance, see [Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets).

**When possible, avoid displaying an alert that scrolls.** Although an alert might scroll if the text size is large enough, be sure to minimize the potential for scrolling by keeping alert titles short and including a brief message only when necessary.

### [macOS](https://developer.apple.com/design/human-interface-guidelines/alerts#macOS)

macOS automatically displays your app icon in an alert, but you can supply an alternative icon or symbol. In addition, macOS lets you:

  * Configure repeating alerts to let people suppress subsequent occurrences of the same alert.

  * Append a custom view if it’s necessary to provide additional information (for developer guidance, see [`accessoryView`](https://developer.apple.com/documentation/AppKit/NSAlert/accessoryView)).

  * Include a Help button that opens your help documentation (see [Help buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#Help-buttons)).




**Use a caution symbol sparingly.** Using a caution symbol like `exclamationmark.triangle` too frequently in your alerts diminishes its significance. Use the symbol only when extra attention is really needed, as when confirming an action that might result in unexpected loss of data. Don’t use the symbol for tasks whose only purpose is to overwrite or remove data, such as a save or empty trash.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/alerts#visionOS)

When your app is running in the Shared Space, visionOS displays an alert in front of the app’s window, slightly forward along the z-axis.

Video with custom controls. 

Content description: A video of an alert in the Freeform app running in the Shared Space in visionOS. When the video plays, someone chooses to permanently delete a recently deleted Freeform board. An alert then appears in front of the Freeform window to ask for confirmation. 

Play 

If someone moves a window without dismissing its alert, the alert remains anchored to the window. If your app is running in a Full Space, the system displays the alert centered in the wearer’s [field of view](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Field-of-view).

Video with custom controls. 

Content description: A video of an alert in the Freeform app running in the Shared Space in visionOS. When the video plays, someone chooses to permanently delete a recently deleted Freeform board. An alert then appears in front of the Freeform window to ask for confirmation. The alert is not dismissed and remains anchored to the Freeform window as it’s moved around the Shared Space. 

Play 

If you need to display an accessory view in a visionOS alert, create a view that has a maximum height of 154 pt and a 16-pt corner radius.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/alerts#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/alerts#Related)

[Modality](https://developer.apple.com/design/human-interface-guidelines/modality)

[Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets)

[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/alerts#Developer-documentation)

[`alert(_:isPresented:actions:)`](https://developer.apple.com/documentation/SwiftUI/View/alert\(_:isPresented:actions:\)-1bkka) — SwiftUI

[`UIAlertController`](https://developer.apple.com/documentation/UIKit/UIAlertController) — UIKit

[`NSAlert`](https://developer.apple.com/documentation/AppKit/NSAlert) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/alerts#Change-log)

Date| Changes  
---|---  
February 2, 2024| Enhanced guidance for using default and Cancel buttons.  
September 12, 2023| Added anatomy artwork for visionOS.  
June 21, 2023| Updated to include guidance for visionOS.  
  
