---
title: "Feedback | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/feedback

# Feedback

Feedback helps people know what’s happening, discover what they can do next, understand the results of actions, and avoid mistakes.

![A sketch of a pointer surrounded by a circular set of short lines, suggesting a response to a mouse click. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/d7e2c91a509e05b5e8ee422c6fea86b3/patterns-feedback-intro%402x.png)

Providing clear, consistent feedback as people interact with your app or game can make it feel intuitive and encourage deeper exploration. Feedback can communicate several different things, such as:

  * The current status of something

  * The success or failure of an important task or action

  * A warning about an action that can have negative consequences

  * An opportunity to correct a mistake or problematic situation




The most effective feedback tends to match the significance of the information to the way it’s delivered. For example, it often works well to display status information in a passive way so that people can view it when they need it. In contrast, a warning about possible data loss needs to interrupt people so they have a chance to avoid the problem.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/feedback#Best-practices)

**Make sure all feedback is accessible.** When you use multiple ways to provide feedback, you reach more people and give them the opportunity to receive the feedback in ways that work for them. For example, when you provide feedback using color, text, sound, and haptics, people can receive it whether they silence their device, look away from the screen, or use VoiceOver. (For guidance on providing haptic feedback, see [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics).)

**Consider integrating status feedback into your interface.** When status feedback is available near the items it describes, people get important information without having to take action or leave their current context. For example, Mail in iOS and iPadOS describes the most recent update and displays the number of unread messages in the toolbar of the mailbox screen, making the information unobtrusive but easy for people to check when they’re interested.

**Use alerts to deliver critical — and ideally actionable — information.** By design, alerts disrupt the current context, so you need to match the importance of the information to the level of interruption. Alerts can lose their impact if you use them too often or to deliver unimportant information. For guidance, see [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts).

**Warn people when they initiate a task that can cause data loss that’s unexpected and irreversible.** In contrast, don’t warn people when data loss is the expected result of their action. For example, the Finder doesn’t warn people every time they throw away a file because deleting the file is the expected result.

**When it makes sense, confirm that a significant action or task has completed.** For example, people appreciate getting feedback that confirms a successful Apple Pay transaction. It’s generally best to reserve this type of confirmation for activities that are sufficiently important — because people typically expect their action or task to succeed, they only need to know when it doesn’t.

**Show people when a command can’t be carried out and help them understand why.** For example, if people request directions without specifying a destination, Maps tells them that it can’t provide directions to and from the same location.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/feedback#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, or visionOS._

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/feedback#watchOS)

**Avoid displaying an indeterminate progress indicator — such as a loading indicator — in a watchOS app.** An animated indicator can make people think they need to continue paying attention to the display, which isn’t a good user experience. To provide a better experience, reassure people that they’ll receive a notification when the process completes.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/feedback#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/feedback#Related)

[Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)

[Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)

[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/feedback#Developer-documentation)

[Animation and haptics](https://developer.apple.com/documentation/UIKit/animation-and-haptics) — UIKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/feedback#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/42/E55D60D2-C7D7-4F96-9A9D-8AF4C7D6BB49/2247_wide_250x141_1x.jpg) Designing Fluid Interfaces ](https://developer.apple.com/videos/play/wwdc2018/803)

[![](https://devimages-cdn.apple.com/wwdc-services/images/7/2546ECBD-6443-41EC-921D-6429026F8B67/1700_wide_250x141_1x.jpg) Essential Design Principles ](https://developer.apple.com/videos/play/wwdc2017/802)

