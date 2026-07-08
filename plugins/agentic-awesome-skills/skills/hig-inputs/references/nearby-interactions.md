---
title: "Nearby interactions | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/nearby-interactions

# Nearby interactions

Nearby interactions support on-device experiences that integrate the presence of people and objects in the nearby environment.

![A sketch of curved lines beside a circular area containing a smaller circle, suggesting audio approaching a person in a room from a specific direction. The image is overlaid with rectangular and circular grid lines and is tinted purple to subtly reflect the purple in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/4ee9418314d3a8bbdc8e7586a9e3c787/inputs-nearby-interactions-intro%402x.png)

A great nearby interaction feels intuitive and natural to people, because it builds on their innate awareness of the world around them. For example, a person playing music on their iPhone can continue listening on their HomePod mini when they bring the devices close together, simply by transferring the audio output from their iPhone to the HomePod mini.

Nearby interactions are available on devices that support Ultra Wideband technology (to learn more, see [Ultra Wideband availability](https://support.apple.com/en-us/HT212274)), and rely on the [Nearby Interaction](https://developer.apple.com/documentation/NearbyInteraction) framework. Before participating in nearby interaction experiences, people grant permission for their device to interact while they’re using your app. The Nearby Interaction APIs help you preserve people’s privacy by relying on randomly generated device identifiers that last only as long as the interaction session your app initiates.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Best-practices)

**Consider a task from the perspective of the physical world to find inspiration for a nearby interaction.** For example, although people can easily use your app’s UI to transfer a song from their iPhone to their HomePod mini, initiating the transfer by bringing the devices close together makes the task feel rooted in the physical world. Discovering the physical actions that inform the concept of a task can help you create an engaging experience that makes performing it feel easy and natural.

**Use distance, direction, and context to inform an interaction.** Although your app may get information from a variety of sources, prioritizing nearby, contextually relevant information can help you deliver experiences that feel organic. For example, if people want to share content with a friend in a crowded room, the iOS share sheet can suggest a likely recipient by using on-device knowledge about the person’s most frequent and recent contacts. Combining this knowledge with information from nearby devices that include the U1 chip can let the share sheet improve the experience by suggesting the closest contact the person is facing.

**Consider how changes in physical distance can guide a nearby interaction.** In the physical world, people generally expect their perception of an object to sharpen as they get closer to it. A nearby interaction can mirror this experience by providing feedback that changes with the proximity of an object. For example, when people use iPhone to find an AirTag, the display transitions from a directional arrow to a pulsing circle as they get closer.

**Provide continuous feedback.** Continuous feedback reflects the dynamism of the physical world and strengthens the connection between a nearby interaction and the task people are performing. For example, when looking for a lost item in Find My, people get continuous updates that communicate the item’s direction and proximity. Keep people engaged by providing uninterrupted feedback that responds to their movements.

**Consider using multiple feedback types to create a holistic experience.** Fluidly transitioning among visual, audible, and haptic feedback can help a nearby interaction’s task feel more engaging and real. Using more than one type of feedback also lets you vary the experience to coordinate with both the task and the current context. For example, while people are interacting with the device screen, visual feedback makes sense; while people are interacting with their environment, audible and haptic feedback often work better.

**Avoid using a nearby interaction as the only way to perform a task.** You can’t assume that everyone can experience a nearby interaction, so it’s essential to provide alternative ways to get things done in your app.

## [Device usage](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Device-usage)

**Encourage people to hold the device in portrait orientation.** Holding a device in landscape can decrease the accuracy and availability of information about the distance and relative direction of other devices. If you support only portrait orientation while your nearby interaction feature runs, prefer giving people implicit, visual feedback on how to hold the device for an optimal experience; when possible, avoid explicitly telling people to hold the device in portrait.

**Design for the device’s directional field of view.** Nearby interaction relies on a hardware sensor with a specific field of view similar to that of the Ultra Wide camera in iPhone 11 and later. If a participating device is outside of this field of view, your app might receive information about its distance, but not its relative direction.

**Help people understand how intervening objects can affect the nearby interaction experience in your app.** When other people, animals, or sufficiently large objects come between two participating devices, the accuracy or availability of distance and direction information can decrease. Consider adding advice on avoiding this situation to onboarding or tutorial content you present.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Platform-considerations)

 _No additional considerations for iPadOS. Not supported in macOS, tvOS, or visionOS._

### [iOS](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#iOS)

On iPhone, Nearby Interaction APIs provide a peer device’s distance and direction.

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#watchOS)

On Apple Watch, Nearby Interaction APIs provide a peer device’s distance. Also, all watchOS apps participating in a nearby interaction experience must be in the foreground.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Related)

[Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Developer-documentation)

[Nearby Interaction](https://developer.apple.com/documentation/NearbyInteraction)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/0F487599-C14E-48B0-AEB0-A752DFF26E95/5165_wide_250x141_1x.jpg) Design for spatial interaction ](https://developer.apple.com/videos/play/wwdc2021/10245)

[![](https://devimages-cdn.apple.com/wwdc-services/images/49/E6812719-14BF-4392-84FC-E1CFC1650B71/3558_wide_250x141_1x.jpg) Meet Nearby Interaction ](https://developer.apple.com/videos/play/wwdc2020/10668)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions#Change-log)

Date| Changes  
---|---  
June 21, 2023| Changed page title from Spatial interactions.  
  
