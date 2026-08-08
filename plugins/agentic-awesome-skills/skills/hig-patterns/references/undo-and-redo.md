---
title: "Undo and redo | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/undo-and-redo

# Undo and redo

Undo and redo gives people easy ways to reverse many types of actions, which can also help people explore and experiment safely as they learn a new interface or task.

![A sketch of an arrow that starts right, curves upward, and points to the left, suggesting a return to the start. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/768e64b5954af63fd6f4e9e4a3c5275a/patterns-undo-redo-intro%402x.png)

People expect undo and redo to let them reverse their recent actions, so they’re likely to try undoing — often multiple times — until something changes. In a situation like this, people might not remember which of their previous actions an undo is targeting, which can lead to unintended changes and frustration. To help people remain in control, it’s essential to help people predict the outcome of undoing and redoing and to highlight the results.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#Best-practices)

**Help people predict the results of undo and redo as much as possible.** On iPhone, for example, you can describe the result in the alert that displays when people shake the device, giving them the option of performing the undo or canceling it. If you provide undo and redo menu items, you can modify the menu item labels to identify the result. For example, a document-based app might use menu item labels like Undo Typing or Redo Bold.

**Show the results of an undo or redo.** Sometimes, the most recent action that people want to undo affects content or an area that’s no longer visible. In cases like this, it’s crucial to highlight the result of each undo and redo to keep people from thinking that the action had no effect, which can lead them to perform it repeatedly. For example, if people undo after deleting a paragraph in a document area that’s no longer onscreen, you might scroll the document to show the restored paragraph.

**Let people undo multiple times.** Avoid placing unnecessary limits on the number of times people can undo or redo. People generally expect to undo every action they’ve performed since taking a logical step like opening a document or saving their work.

**Consider giving people the option to revert multiple changes at once.** In some scenarios, people might appreciate the ability to undo a batch of discrete but related actions — like incremental adjustments to a single property or attribute — so they don’t have to undo each individual adjustment. In other cases, it can make sense to give people a convenient way to undo all the changes they made since opening a document or saving their work.

**Provide undo and redo buttons only when necessary.** People generally expect to initiate undo and redo in system-supported ways, such as choosing the items in a macOS app’s Edit menu, using keyboard shortcuts on a Mac or iPad, or shaking their iPhone. If it’s important to provide dedicated undo and redo buttons in your app, use the standard system-provided symbols and put the buttons in a toolbar.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#Platform-considerations)

 _No additional considerations for visionOS. Not supported in tvOS or watchOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#iOS-iPadOS)

**Avoid redefining standard gestures for undo and redo.** For example, people can use a three-finger swipe to initiate an undo or redo, or shake their iPhone. As with all standard gestures, redefining them in your interface runs the risk of confusing people and making your experience unpredictable.

**Briefly and precisely describe the operation to be undone or redone.** The undo and redo alert title automatically includes a prefix of “Undo ” or “Redo ” (including the trailing space). You need to provide an additional word or two that describes what’s being undone or redone, to appear after this prefix. For example, you might create alert titles such as “Undo Name” or “Redo Address Change.”

### [macOS](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#macOS)

**Place undo and redo commands in the Edit menu and support the standard keyboard shortcuts.** Mac users expect to find undo and redo at the top of the Edit menu; they also expect to use Command–Z and Shift–Command–Z to perform undo and redo, respectively.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#Related)

[Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)

[Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices)

[Standard keyboard shortcuts](https://developer.apple.com/design/human-interface-guidelines/keyboards#Standard-keyboard-shortcuts)

[Edit menu](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar#Edit-menu)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#Developer-documentation)

[`UndoManager`](https://developer.apple.com/documentation/Foundation/UndoManager) — Foundation

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/7/2546ECBD-6443-41EC-921D-6429026F8B67/1700_wide_250x141_1x.jpg) Essential Design Principles ](https://developer.apple.com/videos/play/wwdc2017/802)

