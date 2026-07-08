---
title: "Web views | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/web-views

# Web views

A web view loads and displays rich web content, such as embedded HTML and websites, directly within your app.

![A stylized representation of a compass icon. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/ae2c2f04ee2e04730e29b26e7e9bff19/components-web-view-intro%402x.png)

For example, Mail uses a web view to show HTML content in messages.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/web-views#Best-practices)

**Support forward and back navigation when appropriate.** Web views support forward and back navigation, but this behavior isn’t available by default. If people are likely to use your web view to visit multiple pages, allow forward and back navigation, and provide corresponding controls to initiate these features.

**Avoid using a web view to build a web browser.** Using a web view to let people briefly access a website without leaving the context of your app is fine, but Safari is the primary way people browse the web. Attempting to replicate the functionality of Safari in your app is unnecessary and discouraged.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/web-views#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, or visionOS. Not supported in tvOS or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/web-views#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/web-views#Related)

[Webkit.org](https://webkit.org/)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/web-views#Developer-documentation)

[`WKWebView`](https://developer.apple.com/documentation/WebKit/WKWebView) — WebKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/web-views#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/8A0A5E12-9D2C-4629-A13C-8EB702A9DA28/4920_wide_250x141_1x.jpg) Explore WKWebView additions ](https://developer.apple.com/videos/play/wwdc2021/10032)

