---
title: "Modality | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/modality

# Modality

Modality is a design technique that presents content in a separate, dedicated mode that prevents interaction with the parent view and requires an explicit action to dismiss.

![A sketch of an active window above an inactive window, suggesting focus on the frontmost window. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/9efb35fd7fafa01ce3447dc6f13ae2d8/patterns-modality-intro%402x.png)

Presenting content modally can:

  * Ensure that people receive critical information and, if necessary, act on it

  * Provide options that let people confirm or modify their most recent action

  * Help people perform a distinct, narrowly scoped task without losing track of their previous context

  * Give people an immersive experience or help them concentrate on a complex task




Depending on the platform, you might use different components to present these types of modal experiences. For example, all platforms can present an _alert_ , which is a modal view that delivers important information related to your app or game. In addition, each platform may define various types of modal views for presenting context-specific options, such as _activity views,_ _sheets_ , and _confirmation dialogs_ or _action sheets_. To help people perform a distinct task, iOS, iPadOS, and macOS apps tend to use sheets or popovers, but iPadOS, macOS, and visionOS apps might also just use a separate window.

To provide a temporary experience, like viewing media, or to help people perform a distinct, multistep task, like editing content, apps can offer a full-screen modal experience. In contrast, apps may also offer nonmodal types of full-screen experiences; for guidance, see [Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen). visionOS apps can offer a range of immersive experiences; for guidance, see [Immersive experiences](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/modality#Best-practices)

**Present content modally only when there’s a clear benefit.** A modal experience takes people out of their current context and requires an action to dismiss, so it’s important to use modality only when it helps people focus or make choices that affect their content or device.

**Aim to keep modal tasks simple, short, and streamlined.** If a modal task is too complicated, people can lose track of the task they suspended when they entered the modal view, especially if the modal view obscures their previous context.

**Take care to avoid creating a modal experience that feels like an app within your app.** In particular, presenting a hierarchy of views within a modal task can make people forget how to retrace their steps. If a modal task must contain subviews, provide a single path through the hierarchy and avoid including buttons that people might mistake for the button that dismisses the modal view.

**Consider using a full-screen modal style for in-depth content or a complex task.** A modal experience that fills a window or the device display minimizes distractions, so it can work well for presenting videos, photos, or camera views, or to support a multistep task like marking up a document or editing a photo. When a visionOS app runs alongside other apps in the Shared Space, a full-screen modal presentation fills a window; if people transition the app to a Full Space, the full-screen modal presentation can become a more immersive experience.

**Always give people an obvious way to dismiss a modal view.** In general, it works well to follow the platform conventions people already know. For example, in iOS, iPadOS, and watchOS apps, people typically expect to find a button in the top toolbar or swipe down; in macOS and tvOS apps, people expect to find a button in the main content view.

**When necessary, help people avoid data loss by getting confirmation before closing a modal view.** Regardless of whether people use a dismiss gesture or a button, if closing the view could result in the loss of user-generated content, be sure to explain the situation and give people ways to resolve it. For example, in iOS, you might present an action sheet that includes a save option.

**Make it easy to identify a modal view’s task.** When people enter a modal view, they switch away from their previous context and might not return to it right away. When you provide a title that names the modal view’s task — or additional text that describes the task or provides guidance — you can help people keep their place in your app.

**Let people dismiss a modal view before presenting another one.** Allowing multiple modal views to be visible at the same time tends to create visual clutter and can make your app seem scattered and disorganized. People need to remember the context they were in before a modal view appears, so presenting multiple views adds to people’s cognitive load, especially when a modal view hides another one by appearing on top of it. Although an alert can appear on top of all other content — including other modal views — you never want to display more than one alert at the same time.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/modality#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/modality#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/modality#Related)

[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

[Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)

[Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers)

[Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets)

[Activity views](https://developer.apple.com/design/human-interface-guidelines/activity-views)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/modality#Developer-documentation)

[Presentation modifiers](https://developer.apple.com/documentation/SwiftUI/View-Presentation) — SwiftUI

[`UIModalPresentationStyle`](https://developer.apple.com/documentation/UIKit/UIModalPresentationStyle) — UIKit

[Modal Windows and Panels](https://developer.apple.com/documentation/AppKit/modal-windows-and-panels) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/modality#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/1AAA030E-2ECA-47D8-AE09-6D7B72A840F6/10044_wide_250x141_1x.jpg) Get to know the new design system ](https://developer.apple.com/videos/play/wwdc2025/356)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/modality#Change-log)

Date| Changes  
---|---  
December 5, 2023| Enhanced guidance for in-depth modal experiences and clarified guidance on multiple modal views.  
June 21, 2023| Updated to include guidance for visionOS.  
  
