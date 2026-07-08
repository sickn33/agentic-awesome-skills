---
title: "Search fields | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/search-fields

# Search fields

A search field lets people search a collection of content for specific terms they enter.

![A stylized representation of a search field containing placeholder text and a dictation icon. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/73f9e564b79cbe48e29ae2a9f7b83682/components-search-field-intro%402x.png)

A search field is an editable text field that displays a Search icon, a Clear button, and placeholder text where people can enter what they are searching for. Search fields can use a [scope control](https://developer.apple.com/design/human-interface-guidelines/search-fields#Scope-controls-and-tokens) as well as [tokens](https://developer.apple.com/design/human-interface-guidelines/search-fields#Scope-controls-and-tokens) to help filter and refine the scope of their search. Across each platform, there are different patterns for accessing search based on the goals and design of your app.

For developer guidance, see [Adding a search interface to your app](https://developer.apple.com/documentation/SwiftUI/Adding-a-search-interface-to-your-app); for guidance related to systemwide search, see [Searching](https://developer.apple.com/design/human-interface-guidelines/searching).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/search-fields#Best-practices)

**Display placeholder text that describes the type of information people can search for.** For example, the Apple TV app includes the placeholder text _Shows, Movies, and More_. Avoid using a term like _Search_ for placeholder text because it doesn’t provide any helpful information.

**If possible, start search immediately when a person types.** Searching while someone types makes the search experience feel more responsive because it provides results that are continuously refined as the text becomes more specific.

**Consider showing suggested search terms before search begins, or as a person types.** This can help someone search faster by suggesting common searches, even when the search itself doesn’t begin immediately.

**Simplify search results.** Provide the most relevant search results first to minimize the need for someone to scroll to find what they’re looking for. In addition to prioritizing the most likely results, consider categorizing them to help people find what they want.

**Consider letting people filter search results.** For example, you can include a scope control in the search results content area to help people quickly and easily filter search results.

## [Scope controls and tokens](https://developer.apple.com/design/human-interface-guidelines/search-fields#Scope-controls-and-tokens)

Scope controls and tokens are components you can use to let someone narrow the parameters of a search either before or after they make it.

  * A _scope control_ acts like a [segmented control](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) for choosing a category for the search.

  * A _token_ is a visual representation of a search term that someone can select and edit, and acts as a filter for any additional terms in the search.




![A diagram of the Mail app on iPhone with the search field open above the keyboard and the word Design entered in the field. Callouts indicate a scope control at the top of the screen to switch between searching all mailboxes and the current mailbox, and a list of tokens in a Suggestions area beneath the control that represent different filters for the search.](https://docs-assets.developer.apple.com/published/c39602d60041fae736e46f91641d8373/search-fields-scope-control-tokens%402x.png)

**Use a scope control to filter among clearly defined search categories.** A scope control can help someone move from a broader scope to a narrower one. For example, in Mail on iPhone, a scope control helps people move from searching their entire mailbox to just the specific mailbox they’re viewing. For developer guidance, see [Scoping a search operation](https://developer.apple.com/documentation/SwiftUI/Scoping-a-search-operation).

**Default to a broader scope and let people refine it as they need.** A broader scope provides context for the full set of available results, which helps guide people in a useful direction when they choose to narrow the scope.

**Use tokens to filter by common search terms or items.** When you define a token, the term it represents gains a visual treatment that encapsulates it, indicating that people can select and edit it as a single item. Tokens can clarify a search term, like filtering by a specific contact in Mail, or focus a search to a specific set of attributes, like filtering by photos in Messages. For the related macOS component, see [Token fields](https://developer.apple.com/design/human-interface-guidelines/token-fields).

**Consider pairing tokens with search suggestions.** People may not know which tokens are available, so pairing them with search suggestions can help people learn how to use them.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/search-fields#Platform-considerations)

 _No additional considerations for visionOS_.

### [iOS](https://developer.apple.com/design/human-interface-guidelines/search-fields#iOS)

There are three main places you can position the entry point for search:

  * In a tab bar at the bottom of the screen

  * In a toolbar at the bottom or top of the screen

  * Directly inline with content




Where search makes the most sense depends on the layout, content, and navigation of your app.

#### [Search in a tab bar](https://developer.apple.com/design/human-interface-guidelines/search-fields#Search-in-a-tab-bar)

You can place search as a visually distinct tab on the trailing side of a tab bar, which keeps search visible and always available as people switch between the sections of your app.

![An illustration of a tab bar at the bottom of an iPhone screen. A tab for search appears on the trailing edge in a visually distinct group.](https://docs-assets.developer.apple.com/published/ca6977596a62743265fdd2132616a4c8/search-fields-search-as-tab%402x.png)

When someone navigates to the search tab, the search field that appears can start as _focused_ or _unfocused_.

![An illustration of an iPhone screen with search in a tab bar at the bottom of the screen. The tab bar is hidden by the keyboard and the search field is open above the keyboard, ready for text entry.](https://docs-assets.developer.apple.com/published/cbd1eb280ecd0f8f71aab784a2bcd042/search-fields-tab-focused%402x.png)

Focused

![An illustration of an iPhone screen with search in a tab bar at the bottom of the screen. The search tab is expanded into a field that hides the tabs to its leading side. A single remaining tab on the leading edge of the screen indicates that it's possible to navigate away, and the space above the tab bar is empty and available for other content.](https://docs-assets.developer.apple.com/published/196b81213f5131b324f952180a4e9c46/search-fields-tab-unfocused%402x.png)

Unfocused

**Start with the search field focused to help people quickly find what they need.** When the search field starts focused, the keyboard immediately appears with the search field above it, ready to begin the search. This provides a more transient experience that brings people directly back to their previous tab after they exit search, and is ideal when you want search to resolve quickly and seamlessly.

**Start with the search field unfocused to promote discovery and exploration.** When the search field starts unfocused, the search tab expands into an unselected field at the bottom of the screen. This provides space on the rest of the screen for additional discovery or navigation before someone taps the field to begin the search. This is great for an app with a large collection of content to showcase, like Music or TV.

#### [Search in a toolbar](https://developer.apple.com/design/human-interface-guidelines/search-fields#Search-in-a-toolbar)

As an alternative to search in a tab bar, you can also place search in a toolbar either at the bottom or top of the screen.

  * You can include search in a bottom toolbar either as an expanded field or as a toolbar button, depending on how much space is available and how important search is to your app. When someone taps it, it animates into a search field above the keyboard so they can begin typing.

  * You can include search in a top toolbar, also called a navigation bar, where it appears as a toolbar button. When someone taps it, it animates into a search field that appears either above the keyboard or inline at the top if there isn’t space at the bottom.




![An illustration of an iPhone screen with search in a bottom toolbar. The search field is positioned in an isolated group between a Filter button on the leading edge and a Compose button on the trailing edge.](https://docs-assets.developer.apple.com/published/face9eed2f9c99f2c12ca3a400919e03/search-fields-ios-toolbar-with-items%402x.png)

Search in a bottom toolbar

![An illustration of an iPhone screen with search in a top toolbar. A Back button appears on the leading edge, and an Add button appears on the trailing edge. An button group with Search and More appears next to the Add button.](https://docs-assets.developer.apple.com/published/ca4d0118cd29bd05bd2fd114163a1f64/search-fields-ios-navigation-bar-item%402x.png)

Search in a top toolbar

**Place search at the bottom if there’s room.** You can either add a search field to an existing toolbar, or as a new toolbar where search is the only item. Search at the bottom is useful in any situation where search is a priority, since it keeps the search experience easy to reach. Examples of apps with search at the bottom in various toolbar layouts include Settings, where it’s the only item, and Mail and Notes, where it fits alongside other important controls.

**Place search at the top when itʼs important to defer to content at the bottom of the screen, or thereʼs no bottom toolbar.** Use search at the top in cases where covering the content might interfere with a primary function of the app. The Wallet app, for example, includes event passes in a stack at the bottom of the screen for easy access and viewing at a glance.

#### [Search as an inline field](https://developer.apple.com/design/human-interface-guidelines/search-fields#Search-as-an-inline-field)

In some cases you might want your app to include a search field inline with content.

**Place search as an inline field when its position alongside the content it searches strengthens that relationship.** When you need to filter or search within a single view, it can be helpful to have search appear directly next to content to illustrate that the search applies to it, rather than globally. For example, although the main search in the Music app is in the tab bar, people can navigate to their library and use an inline search field to filter their songs and albums.

**Prefer placing search at the bottom.** Generally, even for search that applies to a subset of your app’s content, it’s better to locate search where people can reach it easily. The Settings app, for example, places search at the bottom both for its top-level search and for search in the section for individual apps. If there isn’t space at the bottom (because it’s occupied by a tab bar or other important UI, for example), it’s okay to place search inline at the top.

**When at the top, position an inline search field above the list it searches, and pin it to the top toolbar when scrolling.** This helps keep it distinct from search that appears in other locations.

### [iPadOS, macOS](https://developer.apple.com/design/human-interface-guidelines/search-fields#iPadOS-macOS)

The placement and behavior of the search field in iPadOS and macOS is similar; on both platforms, clearing the field exits search and dismisses the keyboard if present. If your app is available on both iPad and Mac, try to keep the search experience as consistent as possible across both platforms.

![An illustration of an iPad screen with a search field on the trailing edge of the top toolbar. The search field has the word Design entered into the field, and three search suggestions appear in a list beneath the field. The toolbar also includes an Inspector button, a group with New Folder and Favorite buttons, and a Share button next to the search field.](https://docs-assets.developer.apple.com/published/368ba21a44b4c65a4e53d3d2197d061b/search-fields-toolbar-search-ipad%402x.png)iPadOS

![An illustration of a Mac screen with a search field on the trailing edge of the toolbar. The search field has the word Design entered into the field, and three search suggestions appear in a list beneath the field. The toolbar also includes an Inspector button, a group with New Folder and Favorite buttons, and a Share button next to the search field.](https://docs-assets.developer.apple.com/published/eb1970b09f7b35b39757201a31289bc3/search-fields-toolbar-search-mac%402x.png)macOS

**Put a search field at the trailing side of the toolbar for many common uses.** Many apps benefit from the familiar pattern of search in the toolbar, particularly apps with split views or apps that navigate between multiple sources, like Mail, Notes, and Voice Memos. The persistent availability of search at the side of the toolbar gives it a global presence within your app, so it’s generally appropriate to start with a global scope for the initial search.

**Include search at the top of the sidebar when filtering content or navigation there.** Apps such as Settings take advantage of search to quickly filter the sidebar and expose sections that may be multiple levels deep, providing a simple way for people to search, preview, and navigate to the section or setting they’re looking for.

![An illustration of an iPad screen with a search field at the top of the sidebar on the leading edge of the screen.](https://docs-assets.developer.apple.com/published/8aed61a23fe2a9885d1a1d1da15a4b09/search-fields-ipad-search-in-sidebar%402x.png)

**Include search as an item in the sidebar or tab bar when you want an area dedicated to discovery.** If your search is paired with rich suggestions, categories, or content that needs more space, it can be helpful to have a dedicated area for it. This is particularly true for apps where browsing and search go hand in hand, like Music and TV, where it provides a unified location to highlight suggested content, categories, and recent searches. A dedicated area also ensures search is always available as people navigate and switch sections of your app.

![An illustration of an iPad screen with a tab bar at the top edge. The trailing side of the tab bar includes a Search tab with a distinct background color to differentiate it from other tab areas.](https://docs-assets.developer.apple.com/published/a2ab9bc29018fc1bbc604a91dfc905c7/search-fields-ipad-search-in-tab-bar%402x.png)

**In a search field in a dedicated area, consider immediately focusing the field when a person navigates to the section to help people search faster and locate the field itself more easily.** An exception to this is on iPad when only a virtual keyboard is available, in which case it’s better to leave the field unfocused to prevent the keyboard from unexpectedly covering the view.

**Account for window resizing with the placement of the search field.** On iPad, the search field fluidly resizes with the app window like it does on Mac. However, for compact views on iPad, itʼs important to ensure that search is available where it’s most contextually useful. For example, Notes and Mail place search above the column for the content list when they resize down to a compact view.

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/search-fields#tvOS)

A search screen is a specialized keyboard screen that helps people enter search text, displaying search results beneath the keyboard in a fully customizable view. For developer guidance, see [`UISearchController`](https://developer.apple.com/documentation/UIKit/UISearchController).

![An illustration of a search screen in tvOS. The screen includes a field with a keyboard input area at the top, a scope control, and a grid of top results at the bottom.](https://docs-assets.developer.apple.com/published/590a4ef7b02ccd9758f0e52e5c261574/search-fields-tvos-search%402x.png)

**Provide suggestions to make searching easier.** People typically don’t want to do a lot of typing in tvOS. To improve the search experience, provide popular and context-specific search suggestions, including recent searches when available. For developer guidance, see [Using suggested searches with a search controller](https://developer.apple.com/documentation/UIKit/using-suggested-searches-with-a-search-controller).

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/search-fields#watchOS)

When someone taps the search field, the system displays a text-input control that covers the entire screen. The app only returns to the search field after they tap the Cancel or Search button.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/search-fields#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/search-fields#Related)

[Searching](https://developer.apple.com/design/human-interface-guidelines/searching)

[Token fields](https://developer.apple.com/design/human-interface-guidelines/token-fields)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/search-fields#Developer-documentation)

[Adding a search interface to your app](https://developer.apple.com/documentation/SwiftUI/Adding-a-search-interface-to-your-app) — SwiftUI

[`searchable(text:placement:prompt:)`](https://developer.apple.com/documentation/SwiftUI/View/searchable\(text:placement:prompt:\)) — SwiftUI

[`UISearchBar`](https://developer.apple.com/documentation/UIKit/UISearchBar) — UIKit

[`UISearchTextField`](https://developer.apple.com/documentation/UIKit/UISearchTextField) — UIKit

[`NSSearchField`](https://developer.apple.com/documentation/AppKit/NSSearchField) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/search-fields#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/1AAA030E-2ECA-47D8-AE09-6D7B72A840F6/10044_wide_250x141_1x.jpg) Get to know the new design system ](https://developer.apple.com/videos/play/wwdc2025/356)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/BE8FF113-0FE1-40FC-86BF-FE95BE2FF7A5/5027_wide_250x141_1x.jpg) Discoverable design ](https://developer.apple.com/videos/play/wwdc2021/10126)

[![](https://devimages-cdn.apple.com/wwdc-services/images/119/D45C244B-2038-4692-99A0-6131ED5FD984/5084_wide_250x141_1x.jpg) Craft search experiences in SwiftUI ](https://developer.apple.com/videos/play/wwdc2021/10176)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/search-fields#Change-log)

Date| Changes  
---|---  
June 9, 2025| Updated guidance for search placement in iOS, consolidated iPadOS and macOS platform considerations, and added guidance for tokens.  
September 12, 2023| Combined guidance common to all platforms.  
June 5, 2023| Added guidance for using search fields in watchOS.  
  
