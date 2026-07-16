---
title: "Offering help | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/offering-help

# Offering help

Although the most effective experiences are approachable and intuitive, you can provide contextual help when necessary.

![A sketch of a question mark, suggesting help is available. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/c09494b87143553d5b544aade5282148/patterns-offering-help-intro%402x.png)

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/offering-help#Best-practices)

**Let your app’s tasks inform the types of help people might need.** For example, you might help people perform simple, one- or two-step tasks by displaying an inline view that succinctly describes the task. In contrast, if your app or game supports complex or multistep tasks you might want to provide a tutorial that teaches people how to accomplish larger goals. In general, directly relate the help you provide to the precise action or task people are doing right now and make it easy for people to dismiss or avoid the help if they don’t need it.

**Use relevant and consistent language and images in your help content.** Always make sure guidance is appropriate for the current context. For example, if someone’s using the Siri Remote with your tvOS experience, don’t show tips or images that feature a game controller. Also be sure the terms and descriptions you use are consistent with the platform. For example, don’t write copy that tells people to click a button on an iPhone or tap a menu item on a Mac.

**Make sure all help content is inclusive.** For guidance, see [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion).

**Avoid bloating your help content by explaining how standard components or patterns work.** Instead, describe the specific action or task that a standard element performs in your app or game. If your experience introduces a unique control or expects people to use an input device in a nonstandard way — such as holding the Siri Remote rotated 90 degrees — orient people quickly, preferring animation or graphics to educate instead of a lengthy description.

## [Creating tips](https://developer.apple.com/design/human-interface-guidelines/offering-help#Creating-tips)

A tip is a small, transient view that briefly describes how to use a feature in your app. Tips are a great way to teach people about new or less obvious features in your app, or help them discover faster ways to accomplish a task. For developer guidance, see [TipKit](https://developer.apple.com/documentation/TipKit).

**Use the most appropriate tip type for your app’s user interface.** Display a popover tip when you want to preserve the content flow, or an inline tip when you want to ensure that surrounding information is visible. You can use an annotation-style inline tip when pointing to a specific UI element, or a hint-style tip when it’s not related to a specific piece of UI.

![An illustration of a popover-style tip on iPhone. The tip appears atop nearby content, and points to a feature depicted by a blue star icon. The content beneath the tip is obscured.](https://docs-assets.developer.apple.com/published/2a1deca274cc855ac01321f3a583b858/offering-help-tip-popover%402x.png)

Popover

![An illustration of an annotation-style tip on iPhone. The tip is embedded among the surrounding content, and points to a feature depicted by a blue star icon. Displaced text appears above and below the tip.](https://docs-assets.developer.apple.com/published/e2b5c6a0a9d94a6c7a16cb1b2c9be517/offering-help-tip-annotation%402x.png)

Annotation

![An illustration of an hint-style tip on iPhone. The tip is embedded among the surrounding content. Displaced text appears above and below the tip.](https://docs-assets.developer.apple.com/published/706238176beb6869a8cf4cd06e22912c/offering-help-tip-hint%402x.png)

Hint

**Use tips for simple features.** Tips work best on features that are easy to describe and that people can complete with a few simple steps. If a feature requires more than three actions, it’s probably too complicated for a tip.

**Make tips short, actionable, and engaging.** A tip’s goal is to encourage people to try new features. Use direct, action-oriented language to describe what the feature does and explain how to use it. Keep your tips to one or two sentences and avoid including content that’s promotional or related to a different feature or user flow. Promotional content is anything that advertises, sells, or isn’t aligned with the current context of what the person is doing.

**Define rules to help ensure your tips reach the intended audience.** Not everyone benefits from every tip. For example, people who’ve already used a feature won’t appreciate viewing a tip that describes it. Use parameter-based or event-based eligibility rules to control when a tip appears, and only display a tip if someone might benefit from its use. When your app has more than one tip, set the display frequency so tips display at a reasonable cadence — for example, once every 24 hours.

**If there’s an image or symbol that people associate with the feature, consider including it in the tip, and prefer the filled variant.** For example, a tip with a star can help people understand that the tip is related to favorites.

![An illustration of a hint-style tip with an unfilled blue star symbol on the leading side.](https://docs-assets.developer.apple.com/published/e4a119cd09255a5e22c5132263c39cd9/offering-help-tip-symbol-usage-unfilled-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of a hint-style tip with a filled blue star symbol on the leading side.](https://docs-assets.developer.apple.com/published/be5eb0f23474419bcb3b182b24c24d77/offering-help-tip-symbol-usage-filled-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

If the feature is represented by an image that the tip connects to directly, avoid repeating the same image in both the tip and the UI.

![An illustration of an annotation-style tip pointing to a feature depicted by a blue star icon. The tip includes a similar blue star symbol on its leading side.](https://docs-assets.developer.apple.com/published/b35499b146567d76a7ca996cf3efb9e9/offering-help-tip-symbol-usage-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of an annotation-style tip pointing to a feature depicted by a blue star icon. The tip is text-only and omits an accompanying symbol.](https://docs-assets.developer.apple.com/published/afa3b233a9ec05e15e54fd1ec909c015/offering-help-tip-symbol-usage-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

**Use buttons to direct people to information or options.** If your feature has settings people can customize, or you want to redirect people to an area where they can learn more about a feature, consider adding a button. Buttons can take people directly to the settings where they make adjustments. Or if there’s more information people might find useful, add a button to take them to additional resources, such as a setup flow.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/offering-help#Platform-considerations)

 _No additional considerations for iOS, iPadOS, tvOS, or watchOS._

### [macOS, visionOS](https://developer.apple.com/design/human-interface-guidelines/offering-help#macOS-visionOS)

A _tooltip_ (called a _help tag_ in user documentation) displays a small, transient view that briefly describes how to use a component in the interface. In apps that run on a Mac — including iPhone and iPad apps — tooltips can appear when a person holds the pointer over an element; in visionOS apps, a tooltip can appear when a person looks at an element or holds the pointer over it. For developer guidance, see [`help(_:)`](https://developer.apple.com/documentation/SwiftUI/View/help\(_:\)-6oiyb).

![An illustration of a toolbar in macOS Finder with the pointer over the Back button. A tooltip with the title See folders you viewed previously appears beneath the pointer.](https://docs-assets.developer.apple.com/published/a5dc5c63ac62773df2b4aea95ad85f39/offering-help-macos-tooltip-help-tag%402x.png)

**Describe only the control that people indicate interest in.** When people want to know how to use a specific control, they don’t want to learn how to use nearby controls or how to perform a larger task.

**Explain the action or task the control initiates.** It often works well to begin the description with a verb — for example, “Restore default settings” or “Add or remove a language from the list.”

**In general, avoid repeating a control’s name in its tooltip.** Repeating the name takes up space in the tooltip and rarely adds value to the description.

**Be brief.** As much as possible, limit tooltip content to a maximum of 60 to 75 characters (note that localization often changes the length of text). To make a description brief and direct, consider using a sentence fragment and omitting articles. If you need a lot of text to describe a control, consider simplifying your interface design.

**Use sentence case.** Sentence case tends to appear more casual and approachable. If you write complete sentences, omit ending punctuation unless it’s required to be consistent with your app’s style.

**Consider offering context-sensitive tooltips.** For example, you could provide different text for a control’s different states.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/offering-help#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/offering-help#Related)

[Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)

[Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)

[Writing](https://developer.apple.com/design/human-interface-guidelines/writing)

[Help menu](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar#Help-menu)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/offering-help#Developer-documentation)

[TipKit](https://developer.apple.com/documentation/TipKit)

[`NSHelpManager`](https://developer.apple.com/documentation/AppKit/NSHelpManager) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/offering-help#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/7BCB7D16-5D51-419D-B332-E008219FB631/8293_wide_250x141_1x.jpg) Make features discoverable with TipKit ](https://developer.apple.com/videos/play/wwdc2023/10229)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/offering-help#Change-log)

Date| Changes  
---|---  
December 5, 2023| Included visionOS in guidance for creating tooltips.  
September 12, 2023| Added guidance for creating tips.  
  
