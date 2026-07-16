---
title: "Status bars | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/status-bars

# Status bars

A status bar appears along the upper edge of the screen and displays information about the device’s current state, like the time, cellular carrier, and battery level.

![A stylized representation of an iPhone status bar with labels showing the time and cellular, Wi-Fi, and battery levels. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/f26343633aeaea4ae5297fae42787bf2/components-status-bar-intro%402x.png)

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/status-bars#Best-practices)

**Obscure content under the status bar.** By default, the background of the status bar is transparent, allowing content beneath to show through. This transparency can make it difficult to see information presented in the status bar. If controls are visible behind the status bar, people may attempt to interact with them and be unable to do so. Be sure to keep the status bar readable, and don’t imply that content behind it is interactive. Prefer using a scroll edge effect to place a blurred view behind the status bar. For developer guidance, see [`ScrollEdgeEffectStyle`](https://developer.apple.com/documentation/SwiftUI/ScrollEdgeEffectStyle) and [`UIScrollEdgeEffect`](https://developer.apple.com/documentation/UIKit/UIScrollEdgeEffect).

**Consider temporarily hiding the status bar when displaying full-screen media.** A status bar can be distracting when people are paying attention to media. Temporarily hide these elements to provide a more immersive experience. The Photos app, for example, hides the status bar and other interface elements when people browse full-screen photos.

![A screenshot of the top half of the Photos app on iPhone, showing a photo filling the screen. The status bar is visible at the top of the screen.](https://docs-assets.developer.apple.com/published/7312261e2309c5707b50e5361375c651/status-bar-visible%402x.png)

The Photos app with the status bar visible

![A screenshot of the top half of the Photos app on iPhone, showing a photo filling the screen. The status bar is hidden, and only the photo is visible.](https://docs-assets.developer.apple.com/published/546831607b77b71bf7928e60e9949e9b/status-bar-hidden%402x.png)

The Photos app with the status bar hidden

**Avoid permanently hiding the status bar.** Without a status bar, people have to leave your app to check the time or see if they have a Wi-Fi connection. Let people redisplay a hidden status bar with a simple, discoverable gesture. For example, when browsing full-screen photos in the Photos app, a single tap shows the status bar again.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/status-bars#Platform-considerations)

 _No additional considerations for iOS or iPadOS. Not supported in macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/status-bars#Resources)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/status-bars#Developer-documentation)

[`UIStatusBarStyle`](https://developer.apple.com/documentation/UIKit/UIStatusBarStyle) — UIKit

[`preferredStatusBarStyle`](https://developer.apple.com/documentation/UIKit/UIViewController/preferredStatusBarStyle) — UIKit

