---
title: "Managing notifications | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/managing-notifications

# Managing notifications

Notifications can give people timely and important information, whether the device is locked or in use.

![A sketch of bell with a small overlapping circle, suggesting a notification sound. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/ba0d1e169421e490842a4009ee7d09e5/patterns-managing-notifications-intro%402x.png)

You need to get permission before sending any notification. The system lets people change this decision in settings, where they can also silence all notifications (except for government alerts in some locales).

## [Integrating with Focus](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Integrating-with-Focus)

People appreciate receiving a notification for something they care about, but they don’t always appreciate being interrupted. To help people manage the experience, the system lets them specify delivery times and set up a Focus.

  * A Focus helps people filter notifications during a time period they reserve for an activity like sleeping, working, reading, or driving.

  * Delivery scheduling lets people choose whether to receive notification alerts immediately or in a summary that’s delivered at times they choose.




People identify the contacts and apps that can break through a Focus to deliver notification alerts. In a Work Focus, for example, people might want to receive alerts from work colleagues, family members, and work-related apps as soon as notifications arrive. People might also want to receive all Time Sensitive notification alerts during a Focus. A _Time Sensitive_ notification contains essential information people appreciate getting right away.

Important

Even though a Focus might delay the delivery of a notification alert, the notification itself is available as soon as it arrives.

To support these behavior customizations, you first identify the types of notifications your app or game can send. If you support direct communications — like phone calls and messages — you use _communication_ notifications; for all other types of tasks, you use _noncommunication_ notifications. To support communication notifications, you adopt SiriKit intents, which means people can use Siri to customize notification behaviors; for developer guidance, see [`INSendMessageIntent`](https://developer.apple.com/documentation/Intents/INSendMessageIntent) and [`UNNotificationContentProviding`](https://developer.apple.com/documentation/UserNotifications/UNNotificationContentProviding).

You need to specify a system-defined interruption level for each noncommunication notification you send. The system uses the interruption level to help determine when to deliver the alert; when a communication notification arrives, the system uses the sender to determine when to deliver the alert.

The system defines four interruption levels for noncommunication notifications:

  * _Passive_. Information people can view at their leisure, like a restaurant recommendation.

  * _Active_ (the default). Information people might appreciate knowing about when it arrives, like a score update on their favorite sports team.

  * _Time Sensitive_. Information that directly impacts the person and requires their immediate attention, like an account security issue or a package delivery.

  * _Critical_. Urgent information about health and safety that directly impacts the person and demands their immediate attention. Critical notifications are extremely rare and typically come from governmental and public agencies or apps that help people manage their health or home.




Notification alerts in each system-defined interruption level can behave in the following ways:

Interruption level| Overrides scheduled delivery| Breaks through Focus| Overrides Ring/Silent switch on iPhone and iPad  
---|---|---|---  
Passive| No| No| No  
Active| No| No| No  
Time Sensitive| Yes| Yes| No  
Critical| Yes| Yes| Yes  
  
Note

Because a Critical notification can override the Ring/Silent switch and break through scheduled delivery and Focus, you must get an entitlement to send one.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Best-practices)

**Build trust by accurately representing the urgency of each notification.** People have several ways to adjust how they receive your notifications — including turning off all notifications — so it’s essential to be as realistic as possible when assigning an interruption level. You don’t want people to feel that a notification uses a high level of urgency to interrupt them with low-priority information.

**Use the Time Sensitive interruption level only for notifications that are relevant in the moment.** To help people understand the benefits of letting Time Sensitive notifications break through a Focus or scheduled delivery, make sure the notification is about an event that’s happening now or will happen within an hour. The first time a Time Sensitive notification arrives from your app, the system describes how such a notification works and gives people a way to turn it off if they don’t agree that the information requires their immediate attention. Going forward, the system periodically gives people additional opportunities to evaluate how your Time Sensitive notification is working for them. For developer guidance, see [`UNNotificationInterruptionLevel`](https://developer.apple.com/documentation/UserNotifications/UNNotificationInterruptionLevel).

## [Sending marketing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Sending-marketing-notifications)

Don’t use notifications to send marketing or promotional content unless people explicitly agree to receive such information. When people want to learn about new features, content, or events related to your app or game, they can grant their permission to receive marketing notifications. For example, people who use a subscription app might appreciate getting an offer to become a subscriber, and game players might want to receive a special offer related to a live game event.

**Never use the Time Sensitive interruption level to send a marketing notification.** People may have agreed to receive marketing notifications from your app, but such a notification must never break through a Focus or scheduled delivery setting.

**Get people’s permission if you want to send them promotional or marketing notifications.** Before you send these notifications to people, you must receive their explicit permission to do so. Create an alert, modal view, or other interface that describes the types of information you want to send and gives people a clear way to opt in or out.

**Make sure people can manage their notification settings within your app.** In addition to requesting permission to send informational or marketing notifications, you must also provide an in-app settings screen that lets people change their choice. For guidance, see [Settings](https://developer.apple.com/design/human-interface-guidelines/settings).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, or visionOS._

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#watchOS)

By default, the notification settings people use for apps on their iPhone apply to the same apps on their Apple Watch. People can manage these settings in the Apple Watch app on iPhone, or they can access per-notification options — such as Mute 1 Hour or Turn off Time Sensitive — by swiping left when a notification arrives on their Apple Watch.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Related)

[Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Developer-documentation)

[User Notifications](https://developer.apple.com/documentation/UserNotifications)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/managing-notifications#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/B63A08EA-8856-4C77-9E1B-EA1CAD990619/4986_wide_250x141_1x.jpg) Send communication and Time Sensitive notifications ](https://developer.apple.com/videos/play/wwdc2021/10091)

[![](https://devimages-cdn.apple.com/wwdc-services/images/49/3D8237BC-06E3-4711-8552-7008A5D5BAAD/3764_wide_250x141_1x.jpg) The Push Notifications primer ](https://developer.apple.com/videos/play/wwdc2020/10095)

