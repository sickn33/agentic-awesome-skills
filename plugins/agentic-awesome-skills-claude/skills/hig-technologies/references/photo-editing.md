---
title: "Photo editing | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/photo-editing
---

# Photo editing

> Reference snapshot adapted from the Apple source above; local corrections are editorial additions, not Apple endorsements. Verify current SDK availability, entitlements, regional eligibility, and App Review rules before implementation. Platform lists, dimensions, and screenshots describe the captured version, not an exhaustive current compatibility guarantee. Remote illustrations are links, not bundled assets or verified renders.


Photo-editing extensions let people modify photos and videos within the Photos app by applying filters or making other changes.

![A sketch of crop marks surrounded by two arrows, suggesting photo editing. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/0923c23bdf3aebd4a8b7d94e43cb0efd/technologies-photo-editing-intro%402x.png)

Use PhotoKit’s non-destructive editing contract to preserve the original asset and supply rendered output and adjustment data. This is not a promise that every custom file operation automatically creates a safe copy.

To access a photo editing extension, a photo must be in edit mode. While in edit mode, tapping the extension icon in the toolbar displays an action menu of available editing extensions. Selecting one displays the extension’s interface in a modal view containing a top toolbar. Handle the host’s Done and Cancel requests explicitly through the content-editing controller lifecycle. Dismissal alone is not proof of a committed save; finish or cancel editing using the host protocol and handle output errors.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/photo-editing#Best-practices)

**Confirm cancellation of edits.** Editing a photo or video can be time consuming. If someone taps the Cancel button, don’t immediately discard their changes. Ask them to confirm that they really want to cancel, and inform them that any edits will be lost after cancellation. There’s no need to show this confirmation if no edits have been made yet.

**Don’t provide a custom top toolbar.** Your extension loads within a modal view that already includes a toolbar. Providing a second toolbar is confusing and takes space away from the content being edited.

**Let people preview edits.** It’s hard to approve an edit if you can’t see what it looks like. Let people see the result of their work before closing your extension and returning to the Photos app.

**Use your app icon for your photo editing extension icon.** This instills confidence that the extension is in fact provided by your app.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/photo-editing#Platform-considerations)

 _No additional considerations for iOS, iPadOS, or macOS. Not supported in tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/photo-editing#Resources)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/photo-editing#Developer-documentation)

[App extensions](https://developer.apple.com/app-extensions/)

[PhotoKit](https://developer.apple.com/documentation/PhotoKit)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/photo-editing#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/48/022CCFA2-C212-48DB-A086-2068695D160D/2961_wide_250x141_1x.jpg) Introducing Photo Segmentation Mattes ](https://developer.apple.com/videos/play/wwdc2019/260)

