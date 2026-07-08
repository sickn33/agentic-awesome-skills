---
title: "Gyroscope and accelerometer | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer

# Gyroscope and accelerometer

On-device gyroscopes and accelerometers can supply data about a device’s movement in the physical world.

![A sketch of a gyroscope, suggesting movement. The image is overlaid with rectangular and circular grid lines and is tinted purple to subtly reflect the purple in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/d095e989767ecf0537fa99b6ea46b50a/inputs-gyroscope-intro%402x.png)

You can use accelerometer and gyroscope data to provide experiences based on real-time, motion-based information in apps and games that run in iOS, iPadOS, and watchOS. tvOS apps can use gyroscope data from the Siri Remote. For developer guidance, see [Core Motion](https://developer.apple.com/documentation/CoreMotion).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer#Best-practices)

**Use motion data only to offer a tangible benefit to people.** For example, a fitness app might use the data to provide feedback about people’s activity and general health, and a game might use the data to enhance gameplay. Avoid gathering data simply to have the data.

Important

If your experience needs to access motion data from a device, you must provide copy that explains why. The first time your app or game tries to access this type of data, the system includes your copy in a permission request, where people can grant or deny access.

**Outside of active gameplay, avoid using accelerometers or gyroscopes for the direct manipulation of your interface.** Some motion-based gestures may be difficult to replicate precisely, may be physically challenging for some people to perform, and may affect battery usage.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer#Related)

[Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer#Developer-documentation)

[Getting processed device-motion data](https://developer.apple.com/documentation/CoreMotion/getting-processed-device-motion-data) — Core Motion

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/5077B5B0-643B-4E31-9C5E-6E766326D3F3/5225_wide_250x141_1x.jpg) Measure health with motion ](https://developer.apple.com/videos/play/wwdc2021/10287)

