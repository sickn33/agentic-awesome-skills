---
title: "Multitasking | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/multitasking

# Multitasking

Multitasking lets people switch quickly from one app to another, performing tasks in each.

![A sketch of two side-by-side windows in a split view arrangement, suggesting multitasking. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/94f1391bf700ee7af09ad0f966dd7b36/patterns-multitasking-intro%402x.png)

People expect to use multitasking on their devices, and they may think something is wrong if your app doesn’t allow it. With rare exceptions — such as some games, and Apple Vision Pro apps running in a Full Space — every app needs to work well with multitasking.

In addition to app switching, multitasking can present different experiences on different devices; see [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/multitasking#Platform-considerations).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/multitasking#Best-practices)

A great multitasking experience helps people accomplish tasks in multiple apps by managing content in a variety of simultaneous contexts. Because you don’t know when people will initiate multitasking, your app or game always needs to be prepared to save and restore their context.

**Pause activities that require people’s attention or active participation when they switch away.** If your app is a game or a media-viewing app, for example, make sure people don’t miss anything when they switch to another app. When they switch back, let them continue as if they never left.

**Respond smoothly to audio interruptions.** Occasionally, audio from another app or the system itself may interrupt your app’s audio. For example, an incoming phone call or a music playlist initiated by Siri might interrupt your app’s audio. When situations like these occur, people expect your app to respond in the following ways:

  * Pause audio indefinitely for primary audio interruptions, such as playing music, podcasts, or audiobooks.

  * Temporarily lower the volume or pause the audio for shorter interruptions, such as GPS directional notifications, and resume the original volume or playback when the interruption ends.




For guidance, see [Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio).

**Finish user-initiated tasks in the background.** When someone starts a task like downloading assets or processing a video file, they expect it to finish even if they switch away from your app. If your app is in the middle of performing a task that doesn’t need additional input, complete it in the background before suspending.

**Use notifications sparingly.** Your app can send notifications when it’s suspended or running in the background. If people start an important or time-sensitive task in your app, and then switch away from it, they might appreciate receiving a notification when the task completes so they can switch back to your app and take the next step. In contrast, people don’t generally need to know the moment a routine or secondary task completes. In this scenario, avoid sending an unnecessary notification; instead, let people check on the task when they return to your app. For guidance, see [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/multitasking#Platform-considerations)

 _Not supported in watchOS._

### [iOS](https://developer.apple.com/design/human-interface-guidelines/multitasking#iOS)

On iPhone, multitasking lets people use FaceTime or watch a video in Picture in Picture while they also use a different app.

![A screenshot of the app switcher on iPhone, showing four open apps.](https://docs-assets.developer.apple.com/published/519ce5b2d1298e573aab62d4ea3427c9/multitasking-app-switcher-iphone%402x.png)

The app switcher displays all currently open apps.

![A screenshot of Mail on iPhone, showing an individual email. On top of the email body content, a small image in the bottom-left corner shows the person currently in a FaceTime call.](https://docs-assets.developer.apple.com/published/f68005bf620706a5d6c6c03d09af37f4/multitasking-pip-iphone%402x.png)

A current FaceTime call can continue while people use another app.

### [iPadOS](https://developer.apple.com/design/human-interface-guidelines/multitasking#iPadOS)

On iPad, people can view and interact with the [windows](https://developer.apple.com/design/human-interface-guidelines/windows) of several different apps at the same time. An individual app can also support multiple open windows, which lets people view and interact with more than one window in the same app at one time.

People can use iPad with either full-screen or windowed apps. When full screen, apps occupy the full screen, and people can switch between individual app windows using the app switcher.

![A screenshot of the iPad app switcher in landscape orientation, showing five open apps. Thumbnail representations of the apps are arranged in a grid.](https://docs-assets.developer.apple.com/published/b1c2946808ad75c7036af18706a55b79/multitasking-ipad-app-switcher%402x.png)

When using windowed apps, app windows are resizable, and people can arrange them to suit their needs with behavior similar to macOS. The system provides window controls for common tiling configurations, entering full screen, minimizing, and closing windows. The system identifies the frontmost window by coloring its window controls and casting a drop shadow on windows behind it. For guidance, see [Windows > iPadOS](https://developer.apple.com/design/human-interface-guidelines/windows#iPadOS).

![A screenshot of two windowed apps on iPad in landscape orientation. The frontmost app window overlaps and casts a shadow on the one behind it, and has colored window controls to indicate that the window is active. Both windows sit atop the Home Screen background, and the Dock appears at the bottom.](https://docs-assets.developer.apple.com/published/433d49d66e117152f7cca9605ebe9628/multitasking-ipad-windows-maps-landmarks%402x.png)

Additionally, videos and FaceTime calls can also play in a Picture in Picture overlay above other content regardless of whether apps are full screen or windowed.

Note

Apps don’t control multitasking configurations or receive any indication of the ones that people choose.

To help your app respond correctly when people open it while windowed, make sure it adapts gracefully to different screen sizes. For guidance, see [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) and [Windows](https://developer.apple.com/design/human-interface-guidelines/windows); for developer guidance, see [Multitasking on iPad, Mac, and Apple Vision Pro](https://developer.apple.com/documentation/UIKit/multitasking-on-ipad-mac-and-apple-vision-pro). To learn more about how people use iPad multitasking features, see [Use multitasking on your iPad](https://support.apple.com/en-us/HT207582).

### [macOS](https://developer.apple.com/design/human-interface-guidelines/multitasking#macOS)

On Mac, multitasking is the default experience because people typically run more than one app at a time, switching between windows and tasks as they work. When multiple app windows are open, macOS applies drop shadows that make the windows appear layered on the desktop, and applies other visual effects to help people distinguish different window states; for guidance, see [macOS window states](https://developer.apple.com/design/human-interface-guidelines/windows#macOS-window-states).

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/multitasking#tvOS)

On Apple TV, people can play or browse content while also playing movies or TV shows in Picture in Picture (where supported).

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/multitasking#visionOS)

On Apple Vision Pro, people can run multiple apps at the same time in the Shared Space, viewing and switching between windows and volumes throughout the space.

Only one window is active at a time in the Shared Space. When people look from one window to another, the window they’re currently looking at becomes active while the previous window becomes more translucent and appears to recede along the z-axis. Closing an app window in the Shared Space transitions the app to the background without quitting it.

Note

When an app is the Now Playing app, closing its window automatically pauses audio playback; if people want to resume playback, they can do so in Control Center without opening the window.

**Avoid interfering with the system-provided multitasking behavior.** When people look from one window to another, visionOS applies a feathered mask to the window they look away from to clarify its changed state. To avoid interfering with this visual feedback, don’t change the appearance of a window’s edges.

Video with custom controls. 

Content description: A recording showing the Notes app and the Settings app in the Shared Space in visionOS. The viewer first repositions the Notes window to slightly overlap the Settings window before activating Settings and then switching back to Notes. Each time an app becomes active, the system applies feathering to the inactive app's window. 

Play 

**Don’t pause a window’s video playback when people look away from it.** In visionOS, as in macOS, people expect the playback they start in one window to continue while they view or perform a task in another window.

**Be prepared for situations where your audio can duck.** Unless an app is currently the Now Playing app, its audio can duck when people look away from it to another app.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/multitasking#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/multitasking#Related)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

[Windows](https://developer.apple.com/design/human-interface-guidelines/windows)

[Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/multitasking#Developer-documentation)

[Responding to the launch of your app](https://developer.apple.com/documentation/UIKit/responding-to-the-launch-of-your-app) — UIKit

[Multitasking on iPad, Mac, and Apple Vision Pro](https://developer.apple.com/documentation/UIKit/multitasking-on-ipad-mac-and-apple-vision-pro) — UIKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/multitasking#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/873F40BE-101A-4C0D-99F0-F5C7CE7B47A3/10046_wide_250x141_1x.jpg) Elevate the design of your iPad app ](https://developer.apple.com/videos/play/wwdc2025/208)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/A8CAF870-197F-4982-83D8-56513E5D7D0B/10000_wide_250x141_1x.jpg) Make your UIKit app more flexible ](https://developer.apple.com/videos/play/wwdc2025/282)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/multitasking#Change-log)

Date| Changes  
---|---  
June 9, 2025| Reorganized guidance in platform considerations, and added guidance for multitasking with multiple windows in iPadOS.  
December 5, 2023| Added artwork for primary and auxiliary windows in iPadOS.  
June 21, 2023| Updated to include guidance for visionOS.  
  
