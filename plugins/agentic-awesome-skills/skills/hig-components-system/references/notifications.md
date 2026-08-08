---
title: "Notifications | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/notifications

# Notifications

A notification gives people timely, high-value information they can understand at a glance.

![A stylized representation of a notification mockup. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/49d8e391f869407a8b755b57ee180c83/components-notification-intro%402x.png)

Before you can send any notifications to people, you have to get their consent (for developer guidance, see [Asking permission to use notifications](https://developer.apple.com/documentation/UserNotifications/asking-permission-to-use-notifications)). After agreeing, people generally use settings to specify the styles of notification they want to receive, and to specify delivery times for notifications that have different levels of urgency. To learn more about the ways people can customize the notification experience, see [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications).

## [Anatomy](https://developer.apple.com/design/human-interface-guidelines/notifications#Anatomy)

Depending on the platform, a notification can use various styles, such as:

  * A banner or view on a Lock Screen, Home Screen, Home View, or desktop

  * A badge on an app icon

  * An item in Notification Center




In addition, a notification related to direct communication — like a phone call or message — can provide an interface that’s distinct from noncommunication notifications, featuring prominent contact images (or _avatars_) and group names instead of the app icon.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/notifications#Best-practices)

**Provide concise, informative notifications.** People turn on notifications to get quick updates, so you want to provide valuable information succinctly.

**Avoid sending multiple notifications for the same thing, even if someone hasn’t responded.** People attend to notifications at their convenience. If you send multiple notifications for the same thing, you fill up Notification Center, and people may turn off all notifications from your app.

**Avoid sending a notification that tells people to perform specific tasks within your app.** If it makes sense to offer simple tasks that people can perform without opening your app, you can provide [notification actions](https://developer.apple.com/design/human-interface-guidelines/notifications#Notification-actions). Otherwise, avoid telling people what to do because it’s hard for people to remember such instructions after they dismiss the notification.

**Use an alert — not a notification — to display an error message.** People are familiar with both alerts and notifications, so you don’t want to cause confusion by using the wrong component. For guidance, see [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts).

**Handle notifications gracefully when your app is in the foreground.** Your app’s notifications don’t appear when your app is in the front, but your app still receives the information. In this scenario, present the information in a way that’s discoverable but not distracting or invasive, such as incrementing a badge or subtly inserting new data into the current view. For example, when a new message arrives in a mailbox that people are currently viewing, Mail simply adds it to the list of unread messages because sending a notification about it would be unnecessary and distracting.

**Avoid including sensitive, personal, or confidential information in a notification.** You can’t predict what people will be doing when they receive a notification, so it’s essential to avoid including private information that could be visible to others.

## [Content](https://developer.apple.com/design/human-interface-guidelines/notifications#Content)

When a notification includes a title, the system displays it at the top where it’s most visible. In a notification related to direct communication, the system automatically displays the sender’s name in the title area; in a noncommunication notification, the system displays your app name if you don’t provide a title.

**Create a short title if it provides context for the notification content.** Prefer brief titles that people can read at a glance, especially on Apple Watch, where space is limited. When possible, take advantage of the prominent notification title area to provide useful information, like a headline, event name, or email subject. If you can only provide a generic title for a noncommunication notification — like New Document — it can be better to let the system display your app name instead. Use title-style [capitalization](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web#apdca93e113f1d64) and no ending punctuation.

**Write succinct, easy-to-read notification content.** Use complete sentences, sentence case, and proper punctuation, and don’t truncate your message — the system does this automatically when necessary.

**Provide generically descriptive text to display when notification previews aren’t available.** In Settings, people can choose to hide notification previews for all apps. In this situation, the system shows only your app icon and the default title _Notification_. To give people sufficient context to know whether they want to view the full notification, write body text that succinctly describes the notification content without revealing too many details, like “Friend request,” “New comment,” “Reminder,” or “Shipment” (for developer guidance, see [`hiddenPreviewsBodyPlaceholder`](https://developer.apple.com/documentation/UserNotifications/UNNotificationCategory/hiddenPreviewsBodyPlaceholder)). Use sentence-style [capitalization](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web#apdca93e113f1d64) for this text.

**Avoid including your app name or icon.** The system automatically displays a large version of your app icon at the leading edge of each notification; in a communication notification, the system displays the sender’s contact image badged with a small version of your icon.

**Consider providing a sound to supplement your notifications.** Sound can be a great way to distinguish your app’s notifications and get someone’s attention when they’re not looking at the device. You can create a custom sound that coordinates with the style of your app or use a system-provided alert sound. If you use a custom sound, make sure it’s short, distinctive, and professionally produced. A notification sound can enhance the user experience, but don’t rely on it to communicate important information, because people may not hear it. Although people might also want a vibration to accompany alert sounds, you can’t provide such a vibration programmatically. For developer guidance, see [`UNNotificationSound`](https://developer.apple.com/documentation/UserNotifications/UNNotificationSound).

## [Notification actions](https://developer.apple.com/design/human-interface-guidelines/notifications#Notification-actions)

A notification can present a customizable detail view that contains up to four buttons people use to perform actions without opening your app. For example, a Calendar event notification provides a Snooze button that postpones the event’s alarm for a few minutes. For developer guidance, see [Handling notifications and notification-related actions](https://developer.apple.com/documentation/UserNotifications/handling-notifications-and-notification-related-actions).

**Provide beneficial actions that make sense in the context of your notification.** Prefer actions that let people perform common, time-saving tasks that eliminate the need to open your app. For each button, use a short, title-case term or phrase that clearly describes the result of the action. Don’t include your app name or any extraneous information in the button label, keep the text brief to avoid truncation, and take localization into account as you write it.

**Avoid providing an action that merely opens your app.** When people tap a notification or its preview, they expect your app to display related content, so presenting an action button that does the same thing clutters the detail view and can be confusing.

**Prefer nondestructive actions.** If you must provide a destructive action, make sure people have enough context to avoid unintended consequences. The system gives a distinct appearance to the actions you identify as destructive.

**Provide a simple, recognizable interface icon for each notification action.** An interface icon reinforces an action’s meaning, helping people instantly understand what it does. The system displays your interface icon on the trailing side of the action title. When you use [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols), you can choose an existing symbol that represents your command or edit a related symbol to create a custom icon.

## [Badging](https://developer.apple.com/design/human-interface-guidelines/notifications#Badging)

A badge is a small, filled oval containing a number that can appear on an app icon to indicate the number of unread notifications that are available. After people address unread notifications, the badge disappears from the app icon, reappearing when new notifications arrive. People can choose whether to allow an app to display badges in their notification settings.

**Use a badge only to show people how many unread notifications they have.** Don’t use a badge to convey numeric information that isn’t related to notifications, such as weather-related data, dates and times, stock prices, or game scores.

**Make sure badging isn’t the only method you use to communicate essential information.** People can turn off badging for your app, so if you rely on it to show people when there’s important information, people can miss the message. Always make sure that you make important information easy for people to find as soon as they open your app.

**Keep badges up to date.** Update your app’s badge as soon as people open the corresponding notifications. You don’t want people to think there are new notifications available, only to find that they’ve already viewed them all. Note that reducing a badge’s count to zero removes all related notifications from Notification Center.

**Avoid creating a custom image or component that mimics the appearance or behavior of a badge.** People can turn off notification badges if they choose, and will become frustrated if they have done so and then see what appears to be a badge.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/notifications#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, or visionOS._

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/notifications#watchOS)

On Apple Watch, notifications occur in two stages: _short look_ and _long look_. People can also view notifications in Notification Center. On supported devices, people can double-tap to respond to notifications.

You can help people have a great notification experience by designing app-specific assets and actions that are relevant on Apple Watch. If your watchOS app has an iPhone companion that supports notifications, watchOS can automatically provide default short-look and long-look interfaces if necessary.

#### [Short looks](https://developer.apple.com/design/human-interface-guidelines/notifications#Short-looks)

A short look appears when the wearer’s wrist is raised and disappears when it’s lowered.

![An illustration that represents a short look notification from a generic app. It includes a large primary image in the center, a title, and a short preview of the notification content.](https://docs-assets.developer.apple.com/published/609f4ae816d78b5c87a340416f4874a9/notifications-short-looks%402x.png)

**Avoid using a short look as the only way to communicate important information.** A short look appears only briefly, giving people just enough time to see what the notification is about and which app sent it. If your notification information is critical, make sure you deliver it in other ways, too.

**Keep privacy in mind.** Short looks are intended to be discreet, so it’s important to provide only basic information. Avoid including potentially sensitive information in the notification’s title.

#### [Long looks](https://developer.apple.com/design/human-interface-guidelines/notifications#Long-looks)

Long looks provide more detail about a notification. If necessary, people can swipe vertically or use the Digital Crown to scroll a long look. After viewing a long look, people can dismiss it by tapping it or simply by lowering their wrist.

![An illustration that represents a long look notification from a generic app. It includes a small primary image in the upper left corner, badging a platter with the notification title and content. Beneath the notification are two full width action buttons, the second of which extends off the screen to indicate that the view is scrollable.](https://docs-assets.developer.apple.com/published/a48f434c960e0f14429018803ee4b180/notifications-long-looks%402x.png)

A custom long-look interface can be static or dynamic. The _static_ interface lets you display a notification’s message along with additional static text and images. The _dynamic_ interface gives you access to the notification’s full content and offers more options for configuring the appearance of the interface.

You can customize the content area for both static and dynamic long looks, but you can’t change the overall structure of the interface. The system-defined structure includes a _sash_ at the top of the interface and a Dismiss button at the bottom, below all custom buttons.

**Consider using a rich, custom long-look notification to let people get the information they need without launching your app.** You can use SwiftUI [Animations](https://developer.apple.com/documentation/SwiftUI/Animations) to create engaging, interruptible animations; alternatively, you can use [SpriteKit](https://developer.apple.com/documentation/SpriteKit) or [SceneKit](https://developer.apple.com/documentation/SceneKit).

**At the minimum, provide a static interface; prefer providing a dynamic interface too.** The system defaults to the static interface when the dynamic interface is unavailable, such as when there is no network or the iPhone companion app is unreachable. Be sure to create the resources for your static interface in advance and package them with your app.

**Choose a background appearance for the sash.** The system-provided sash, at the top of the long-look interface, displays your app icon and name. You can customize the sash’s color or give it a blurred appearance. If you display a photo at the top of the content area, you’ll probably want to use the blurred sash, which has a light, translucent appearance that gives the illusion of overlapping the image.

**Choose a background color for the content area.** By default, the long look’s background is transparent. If you want to match the background color of other system notifications, use white with 18% opacity; otherwise, you can use a custom color, such as a color within your brand’s palette.

**Provide up to four custom actions below the content area.** For each long look, the system uses the notification’s type to determine which of your custom actions to display as buttons in the notification UI. In addition, the system always displays a Dismiss button at the bottom of the long-look interface, below all custom buttons. If your watchOS app has an iPhone companion that supports notifications, the system shares the actionable notification types already registered by your iPhone app and uses them to configure your custom action buttons.

#### [Double tap](https://developer.apple.com/design/human-interface-guidelines/notifications#Double-tap)

People can double-tap to respond to notifications on supported devices. When a person responds to a notification with a double tap, the system selects the first nondestructive action as the response.

**Keep double tap in mind when choosing the order of custom actions you present as responses to a notification.** Because a double tap runs the first nondestructive action, consider placing the action that people use most frequently at the top of the list. For example, a parking app that provides custom actions for extending the time on a paid parking spot could offer options to extend the time by 5 minutes, 15 minutes, or an hour, with the most common choice listed first.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/notifications#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/notifications#Related)

[Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)

[Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/notifications#Developer-documentation)

[Asking permission to use notifications](https://developer.apple.com/documentation/UserNotifications/asking-permission-to-use-notifications) — User Notifications

[User Notifications UI](https://developer.apple.com/documentation/UserNotificationsUI)

[User Notifications](https://developer.apple.com/documentation/UserNotifications)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/notifications#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/B63A08EA-8856-4C77-9E1B-EA1CAD990619/4986_wide_250x141_1x.jpg) Send communication and Time Sensitive notifications ](https://developer.apple.com/videos/play/wwdc2021/10091)

[![](https://devimages-cdn.apple.com/wwdc-services/images/49/3D8237BC-06E3-4711-8552-7008A5D5BAAD/3764_wide_250x141_1x.jpg) The Push Notifications primer ](https://developer.apple.com/videos/play/wwdc2020/10095)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/notifications#Change-log)

Date| Changes  
---|---  
October 24, 2023| Updated watchOS platform considerations with guidance for presenting notification responses to double tap.  
  
