---
title: "Activity views | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/activity-views

# Activity views

An activity view — often called a _share sheet_ — presents a range of tasks that people can perform in the current context.

![A stylized representation of an activity view or share sheet. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/74899abd7c2a017fc05523d112743616/components-activity-view-intro%402x.png)

Activity views present sharing activities like messaging and actions like Copy and Print, in addition to quick access to frequently used apps. People typically reveal a share sheet by choosing an Action button while viewing a page or document, or after they’ve selected an item. An activity view can appear as a sheet or a popover, depending on the device and orientation.

You can provide app-specific activities that can appear in a share sheet when people open it within your app or game. For example, Photos provides app-specific actions like Copy Photo, Add to Album, and Adjust Location. By default, the system lists app-specific actions before actions — such as Add to Files or AirPlay — that are available in multiple apps or throughout the system. People can edit the list of actions to ensure that it displays the ones they use most and to add new ones.

You can also create app extensions to provide custom share and action activities that people can use in other apps. (An _app extension_ is code you provide that people can install and use outside of your app.) For example, you might create a custom share activity that people can install to help them share a webpage with a specific social media service. Even though macOS doesn’t provide an activity view, you can create share and action app extensions that people can use on a Mac. For guidance, see [Share and action extensions](https://developer.apple.com/design/human-interface-guidelines/activity-views#Share-and-action-extensions).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/activity-views#Best-practices)

**Avoid creating duplicate versions of common actions that are already available in the activity view.** For example, providing a duplicate Print action is unnecessary and confusing because people wouldn’t know how to distinguish your action from the system-provided one. If you need to provide app-specific functionality that’s similar to an existing action, give it a custom title. For example, if you let people use custom formatting to print a bank transaction, use a title that helps people understand what your print activity does, like “Print Transaction.”

**Consider using a symbol to represent your custom activity.** [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) provides a comprehensive set of configurable symbols you can use to communicate items and concepts in an activity view. If you need to create a custom interface icon, center it in an area measuring about 70x70 pixels. For guidance, see [Icons](https://developer.apple.com/design/human-interface-guidelines/icons).

**Write a succinct, descriptive title for each custom action you provide.** If a title is too long, the system wraps it and may truncate it. Prefer a single verb or a brief verb phrase that clearly communicates what the action does. Avoid including your company or product name in an action title. In contrast, the share sheet displays the title of a share activity — typically a company name — below the icon that represents it.

**Make sure activities are appropriate for the current context.** Although you can’t reorder system-provided tasks in an activity view, you can exclude tasks that aren’t applicable to your app. For example, if it doesn’t make sense to print from within your app, you can exclude the Print activity. You can also identify which custom tasks to show at any given time.

**Use the Share button to display an activity view.** People are accustomed to accessing system-provided activities when they choose the Share button. Avoid confusing people by providing an alternative way to do the same thing.

![A screenshot of the Notes app on iPhone, with an open Notes document titled Nature Walks. The top toolbar includes a Share button grouped with a More button on its trailing edge.](https://docs-assets.developer.apple.com/published/5cdc980290422f59da0f79ab5f5efd13/activity-views-share-button%402x.png)

![A screenshot of the Notes app on iPhone, with an open Notes document titled Nature Walks. An activity view is open from the Share button, including controls for sharing the document with contacts or other apps, and copying, exporting, or adding markup to the document.](https://docs-assets.developer.apple.com/published/68a789fa9a70048fcef600615af180fd/activity-views-share-sheet%402x.png)

## [Share and action extensions](https://developer.apple.com/design/human-interface-guidelines/activity-views#Share-and-action-extensions)

Share extensions give people a convenient way to share information from the current context with apps, social media accounts, and other services. Action extensions let people initiate content-specific tasks — like adding a bookmark, copying a link, editing an inline image, or displaying selected text in another language — without leaving the current context.

The system presents share and action extensions differently depending on the platform:

  * In iOS and iPadOS, share and action extensions are displayed in the share sheet that appears when people choose an Action button.

  * In macOS, people access share extensions by clicking a Share button in the toolbar or choosing Share in a context menu. People can access an action extension by holding the pointer over certain types of embedded content — like an image they add to a Mail compose window — clicking a toolbar button, or choosing a quick action in a Finder window.




**If necessary, create a custom interface that feels familiar to people.** For a share extension, prefer the system-provided composition view because it provides a consistent sharing experience that people already know. For an action extension, include your app name. If you need to present an interface, include elements of your app’s interface to help people understand that your extension and your app are related.

**Streamline and limit interaction.** People appreciate extensions that let them perform a task in just a few steps. For example, a share extension might immediately post an image to a social media account with a single tap or click.

**Avoid placing a modal view above your extension.** By default, the system displays an extension within a modal view. While it might be necessary to display an alert above an extension, avoid displaying additional modal views.

**If necessary, provide an image that communicates the purpose of your extension.** A share extension automatically uses your app icon, helping give people confidence that your app provided the extension. For an action extension, prefer using a [symbol](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) or creating an interface [icon](https://developer.apple.com/design/human-interface-guidelines/icons) that clearly identifies the task.

**Use your main app to denote the progress of a lengthy operation.** An activity view dismisses immediately after people complete the task in your share or action extension. If a task is time-consuming, continue it in the background, and give people a way to check the status in your main app. Although you can use a notification to tell people about a problem, don’t notify them simply because the task completes.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/activity-views#Platform-considerations)

 _No additional considerations for iOS, iPadOS, or visionOS. Not supported in macOS, tvOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/activity-views#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/activity-views#Related)

[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

[Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/activity-views#Developer-documentation)

[`UIActivityViewController`](https://developer.apple.com/documentation/UIKit/UIActivityViewController) — UIKit

[`UIActivity`](https://developer.apple.com/documentation/UIKit/UIActivity) — UIKit

[App Extension Support](https://developer.apple.com/documentation/Foundation/app-extension-support) — Foundation

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/activity-views#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/124/74342B30-92E9-48F3-B0F2-6E42C8FD9391/6506_wide_250x141_1x.jpg) Design for Collaboration with Messages ](https://developer.apple.com/videos/play/wwdc2022/10015)

