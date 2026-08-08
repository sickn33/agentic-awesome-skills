---
title: "Maps | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/maps

# Maps

A map displays outdoor or indoor geographical data in your app or on your website.

![A sketch of a tri-fold map, suggesting navigation. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/2438a971853ddedc25626eb9d276d71e/technologies-maps-intro%402x.png)

A map uses a familiar interface that supports much of the same functionality as the system-provided Maps app, such as zooming, panning, and rotation. A map can also include annotations and overlays and show routing information, and you can configure it to use a standard graphical view, a satellite image-based view, or a view that’s a hybrid of both.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/maps#Best-practices)

**In general, make your map interactive.** People expect to be able to zoom, pan, and otherwise interact with maps in familiar ways. Noninteractive elements that obscure the map can interfere with people’s expectations for how maps behave.

**Pick a map emphasis style that suits the needs of your app.** There are two emphasis styles to choose from:

  * The _default_ style presents a version of the map with fully saturated colors, and is a good option for most standard map applications without a lot of custom elements. This style is also useful for keeping visual alignment between your map and the Maps app, in situations when people might switch between them.

  * The _muted_ style, by contrast, presents a desaturated version of the map. This style is great if you have a lot of information-rich content that you want to stand out against the map.




![A screenshot of a map on iPhone showing Coit Tower with the default emphasis style.](https://docs-assets.developer.apple.com/published/603ad0c458f464ad072a94aa10ee89bb/maps-default-appearance%402x.png)

Default style

![A screenshot of a map on iPhone showing Coit Tower with desaturated colors, representing the muted emphasis style.](https://docs-assets.developer.apple.com/published/31d94cbb32ab028e061cfff44b8e7c6a/maps-muted-appearance%402x.png)

Muted style

For developer guidance, see [`MKStandardMapConfiguration.EmphasisStyle`](https://developer.apple.com/documentation/MapKit/MKStandardMapConfiguration/EmphasisStyle-swift.enum).

**Help people find places in your map.** Consider offering a search feature combined with a way to filter locations by category. The search field for a shopping mall map, for example, might include filters that make it easy to find common store types, like clothing, housewares, electronics, jewelry, and toys.

**Clearly identify elements that people select.** When someone selects a specific area or other element on the map, use distinct styling like an outline and color variation to call attention to the selection.

**Cluster overlapping points of interest to improve map legibility.** A _cluster_ uses a single pin to represent multiple points of interest within close proximity. As people zoom in on a map, clusters expand to progressively reveal individual points of interest.

![A screenshot of a single pin with the number three, representing a cluster of three points of interest that are within close proximity.](https://docs-assets.developer.apple.com/published/26a4541efb07044a1fa8f7a06cd0551c/maps-points-of-interest-cluster%402x.png)Points of interest in a cluster

![A screenshot of three orange pins when zoomed in, representing three individual points of interest.](https://docs-assets.developer.apple.com/published/bb8de6a531cbd567d480addff18221ee/maps-points-of-interest-individual%402x.png)Individual points of interest when zoomed in

**Help people see the Apple logo and legal link.** It’s fine when parts of your interface temporarily cover the logo and link, but don’t cover these elements all the time. Follow these guidelines to help keep the Apple logo and legal link visible:

  * Use adequate padding to separate the logo and link from the map boundaries and your custom controls. For example, it works well to use 7 points of padding on the sides of the elements and 10 points above and below them.

  * Avoid causing the logo and link to move with your interface. It’s best when the Apple logo and legal link appear to be fixed to the map.

  * If your custom interface can move relative to the map, use the lowest position of the custom element to determine the placement of the logo and link. For example, if your app lets people pull up a custom card from the bottom of the screen, place the Apple logo and legal link 10 points above the lowest resting position of the card.




Note

The Apple logo and legal link aren’t shown on maps that are smaller than 200x100 pixels.

## [Custom information](https://developer.apple.com/design/human-interface-guidelines/maps#Custom-information)

**Use annotations that match the visual style of your app.** Annotations identify custom points of interest on your map. The default annotation marker has a red tint and a white pin icon. You can change the tint to match the color scheme of your app. You can also change the icon to a string or image, like a logo. An icon string can contain any characters, including Unicode characters, but keep it to two to three characters in length for readability. For developer guidance, see [`MKAnnotationView`](https://developer.apple.com/documentation/MapKit/MKAnnotationView).

**If you want to display custom information that’s related to standard map features, consider making them independently selectable.** When you support selectable map features, the system treats Apple-provided features (including points of interest, territories, and physical features) independently from other annotations that you add. You can configure custom appearances and information to represent these features when people select them. For developer guidance, see [`MKMapFeatureOptions`](https://developer.apple.com/documentation/MapKit/MKMapFeatureOptions).

**Use overlays to define map areas with a specific relationship to your content.**

  * _Above roads_ , the default level, places the overlay above roads but below buildings, trees, and other features. This is great for situations where you want people to have an idea of what’s below the overlay, while still clearly understanding that it’s a defined space.

  * _Above labels_ places the overlay above both roads and labels, hiding everything beneath it. This is useful for content that you want to be fully abstracted from the features of the map, or when you want to hide areas of the map that aren’t relevant.




For developer guidance, see [Displaying overlays on a map](https://developer.apple.com/documentation/MapKit/displaying-overlays-on-a-map) and [`MKOverlayLevel`](https://developer.apple.com/documentation/MapKit/MKOverlayLevel).

**Make sure there’s enough contrast between custom controls and the map.** Insufficient contrast makes controls hard to see and can cause them to blend in with the map. Consider using a thin stroke or light drop shadow to help a custom control stand out, or applying blend modes to the map area to increase its contrast with the controls atop it.

## [Place cards](https://developer.apple.com/design/human-interface-guidelines/maps#Place-cards)

Place cards display rich place information in your app or website, such as operating hours, phone numbers, addresses, and more. This enables you to provide structured and up-to-date information for places that you specify, and add depth to search results.

### [Displaying place cards in a map](https://developer.apple.com/design/human-interface-guidelines/maps#Displaying-place-cards-in-a-map)

You can present a place card that appears directly in your map anytime someone selects a place. This is a great way to provide place information in a map with multiple places that you specify, like a map of bookstores that an author plans to visit on their book signing tour. For developer guidance, see [`mapItemDetailSelectionAccessory(_:)`](https://developer.apple.com/documentation/MapKit/MapContent/mapItemDetailSelectionAccessory\(_:\)), [`mapView(_:selectionAccessoryFor:)`](https://developer.apple.com/documentation/MapKit/MKMapViewDelegate/mapView\(_:selectionAccessoryFor:\)), and [`selectionAccessory`](https://developer.apple.com/documentation/MapKitJS/Annotation/selectionAccessory).

You can also display place cards for other places on a map, such as points of interest, territories, and physical features, to provide valuable context to people about nearby places. For developer guidance, see [`mapFeatureSelectionAccessory(_:)`](https://developer.apple.com/documentation/SwiftUI/View/mapFeatureSelectionAccessory\(_:\)), [`mapView(_:selectionAccessoryFor:)`](https://developer.apple.com/documentation/MapKit/MKMapViewDelegate/mapView\(_:selectionAccessoryFor:\)), and [`selectableMapFeatureSelectionAccessory`](https://developer.apple.com/documentation/MapKitJS/Map/selectableMapFeatureSelectionAccessory).

Developer note

In websites, you can embed a custom map that displays a place card by default for a single place that you specify. For developer guidance, see [Displaying place information using the Maps Embed API](https://developer.apple.com/documentation/MapKitJS/displaying-place-information-using-the-maps-embed-api).

The system defines several place card styles, which specify the size, appearance, and information included in a place card.

  * The _automatic_ style lets the system determine the place card style based on the size of your map view.

  * The _callout_ style displays a place card in a popover style next to the selected place. You can further specify the style of a callout — the _full_ callout style displays a large, detailed place card, and the _compact_ callout style displays a space-saving, more concise place card. If you don’t specify a callout style, the system defaults to the _automatic_ callout style, which determines the callout style based on your map’s view size.

  * The _caption_ style displays an “Open in Apple Maps” link.

  * The _sheet_ style displays a place card in a [sheet](https://developer.apple.com/design/human-interface-guidelines/sheets).




For developer guidance, see [`MapItemDetailSelectionAccessoryStyle`](https://developer.apple.com/documentation/MapKit/MapItemDetailSelectionAccessoryStyle), [`MKSelectionAccessory.MapItemDetailPresentationStyle`](https://developer.apple.com/documentation/MapKit/MKSelectionAccessory/MapItemDetailPresentationStyle), and [`PlaceSelectionAccessoryStyle`](https://developer.apple.com/documentation/MapKitJS/PlaceSelectionAccessoryStyle).

  * Full callout 
  * Compact callout 
  * Caption 
  * Sheet 



![A screenshot of the full callout style place card in a map on iPad. The top of the place card contains a header image and the place name, category, and rating. The place card also includes a tile with operating hours; a tile with the website, phone number, and address; and a tile with an 'Open in Apple Maps' link.](https://docs-assets.developer.apple.com/published/7b978f0c16b84311c4d3f9f35d9c0fb4/maps-place-card-ipad-full%402x.png)

![A screenshot of the compact callout style place card in a map on iPad. The place card includes the place name, category, shortened address, rating, and 'Open in Apple Maps' link.](https://docs-assets.developer.apple.com/published/ad7dc822fa480dfe3b4fa5d344536518/maps-place-card-ipad-compact%402x.png)

![A screenshot of the caption style place card in a map on iPad. The place card contains an 'Open in Apple Maps' link.](https://docs-assets.developer.apple.com/published/f200b2f25897fefc55d30b6c5b6258c5/maps-place-card-ipad-link%402x.png)

![A screenshot of the sheet style place card in a map on iPad, which appears on top of the map view. The top of the place card contains a header image and the place name, category, and rating. The place card also includes a tile with operating hours; a tile with the website, phone number, and address; and a tile with an 'Open in Apple Maps' link.](https://docs-assets.developer.apple.com/published/d5b8b635c902d62449c481531152bae9/maps-place-card-ipad-sheet%402x.png)

Full callout style place cards appear differently depending on a person’s device. The system presents the full callout style place card in a popover style in iPadOS and macOS, and as a [sheet](https://developer.apple.com/design/human-interface-guidelines/sheets) in iOS.

![A screenshot of the full callout style place card in a map on iPhone. The place card appears as a sheet from the bottom edge of the device.](https://docs-assets.developer.apple.com/published/6499250814a43a161484e99968aa503c/maps-place-card-iphone-full%402x.png)

**Consider your map presentation when choosing a style.** The full callout style place card offers people the richest experience, presenting them with the most information about a place directly in your map. However, be sure to choose a place card style that fits in the context of your map. For example, if your app displays a small map with many annotations, consider using the compact callout style for a space-saving presentation that shows place information while maintaining the context of the other places that you specify in your map.

**Make sure your place card looks great on different devices and window sizes.** If you choose to specify a style, ensure that the content in your place card remains viewable on different devices and as window sizes change. For full callout style place cards, you can set a minimum width to prevent text from overflowing on smaller devices.

**Avoid duplicating information.** Consider what information you already display in your app or website when you choose a place card style. For example, the full callout style place card might display information that your app already shows. In this case, the compact callout or caption style might be a better complement.

**Keep the location on your map visible when displaying a place card.** This helps people maintain a sense of where the location is on your map while getting detailed place information. You can set an offset distance for your place card and point it to the selected location. For developer guidance, see [`offset(_:)`](https://developer.apple.com/documentation/SwiftUI/View/offset\(_:\)), [`accessoryOffset`](https://developer.apple.com/documentation/MapKit/MKAnnotationView/accessoryOffset), and [`selectionAccessoryOffset`](https://developer.apple.com/documentation/MapKitJS/Annotation/selectionAccessoryOffset).

### [Adding place cards outside of a map](https://developer.apple.com/design/human-interface-guidelines/maps#Adding-place-cards-outside-of-a-map)

You can also display place information outside of a map in your app or website. For example, you might want to display a list of places rather than a map, like in search results or a store locator, and present a place card when people select one. For developer guidance, see [`mapItemDetailSelectionAccessory(_:)`](https://developer.apple.com/documentation/MapKit/MapContent/mapItemDetailSelectionAccessory\(_:\)), [`mapItemDetail(_:)`](https://developer.apple.com/documentation/MapKit/MKSelectionAccessory/mapItemDetail\(_:\)), and [`PlaceDetail`](https://developer.apple.com/documentation/MapKitJS/PlaceDetail).

Important

If you don’t display a place card directly within a map view, you must include a map in the place card. For developer guidance, see [`mapItemDetailSheet(item:displaysMap:)`](https://developer.apple.com/documentation/SwiftUI/View/mapItemDetailSheet\(item:displaysMap:\)) and [`init(mapItem:displaysMap:)`](https://developer.apple.com/documentation/MapKit/MKMapItemDetailViewController/init\(mapItem:displaysMap:\)).

**Use location-related cues in surrounding content to help communicate that people can open a place card.** For example, you can display place names and addresses alongside a button for more details to help indicate that people can interact with it to get place information. For a space-efficient design, you can include a map pin icon with a place name to help communicate that people can open a place card.

## [Indoor maps](https://developer.apple.com/design/human-interface-guidelines/maps#Indoor-maps)

Apps connected with specific venues like shopping malls and stadiums can design custom interactive maps that help people locate and navigate to indoor points of interest. Indoor maps can include overlays that highlight specific areas, such as rooms, kiosks, and other locations. They can also include text labels, icons, and routes.

  * Example 1 
  * Example 2 
  * Example 3 



![A screenshot of a map on iPhone, displaying the San Jose International airport and the surrounding area. A card in the bottom half of the screen displays information and options, including the airport name and buttons for sharing, closing the card, navigating to the airport, calling the airport, visiting the airport's website, and more.](https://docs-assets.developer.apple.com/published/669a55f1fc7dd419351d60b4decfbbf5/indoor-maps-example1%402x.png)

![A screenshot of a map on iPhone, displaying Terminal B at the San Jose International airport. Gate numbers are displayed above the terminal on the map. A minimized card containing information and options for the airport is visible at the bottom of the screen.](https://docs-assets.developer.apple.com/published/bd86841c0079e56b609826b4b97c24aa/indoor-maps-example2%402x.png)

![A screenshot of a map on iPhone, displaying a close-up view of a terminal at the San Jose International airport. A security checkpoint, first aid stations, restrooms, an escalator, and a gate number are displayed on the map. A minimized card containing a search field and a Browse SJC button is visible at the bottom of the screen.](https://docs-assets.developer.apple.com/published/b36b5ea10535fbb6b42f3ca319bba1e7/indoor-maps-example3%402x.png)

**Adjust map detail based on the zoom level.** Too much detail can cause a map to appear cluttered. Show large areas like rooms and buildings at all zoom levels. Then, progressively add more detailed features and labels as the map is zoomed in. An airport map might show only terminals and gates when zoomed out, but reveal individual stores and restrooms when zoomed in.

![A screenshot of a map on iPhone, zoomed in to show the location of an elevator in San Jose International airport. A minimized card containing information about the elevator is visible at the bottom of the screen.](https://docs-assets.developer.apple.com/published/b4dc405bf622e949194d8b8e4394ef9f/indoor-maps-elevator%402x.png)

**Use distinctive styling to differentiate the features of your map.** Using color along with icons can help distinguish different types of areas, stores, and services, and make it easy for people to quickly find what they’re looking for.

**Offer a floor picker if your venue includes multiple levels.** A floor picker lets people quickly jump between floors. If you implement this feature, keep floor numbers concise for simplicity. In most cases, a list of floor numbers — rather than floor names — is sufficient.

**Include surrounding areas to provide context.** Adjacent streets, playgrounds, and other nearby locations can all help orient people when they use your map. If these areas are noninteractive, use dimming and a distinct color to make them appear supplemental.

![A screenshot of a map on iPhone, zoomed in to show the numbers and locations of some gates in a terminal at San Jose International airport. Other areas, including parking structures, are displayed without details. A minimized card containing a search field and a Browse SJC button is visible at the bottom of the screen.](https://docs-assets.developer.apple.com/published/222bc580a24623284ceb5a388d31521a/indoor-maps-surroundings%402x.png)

**Consider supporting navigation between your venue and nearby transit points.** Make it easy to enter and exit your venue by offering routing to and from nearby bus stops, train stations, parking lots, garages, and other transit locations. You might also offer a way for people to quickly switch over to Apple Maps for additional navigation options.

**Limit scrolling outside of your venue.** This can help people avoid getting lost when they swipe too hard on your map. When possible, keep at least part of your indoor map visible onscreen at all times. To help people stay oriented, you may need to adjust the amount of scrolling you permit based on the zoom level.

**Design an indoor map that feels like a natural extension of your app.** Don’t try to replicate the appearance of Apple Maps. Instead, make sure area overlays, icons, and text match the visual style of your app. For guidance, see [Indoor Mapping Data Format](https://register.apple.com/resources/imdf/).

![A screenshot of a custom map in an app on iPhone, showing an airport concourse. Elements of the map are tinted green to correspond with the app's UI, and custom icons represent gates, security checkpoints, and an information booth.](https://docs-assets.developer.apple.com/published/d87fb8004dcbd26d042a43ef797a1022/indoor-maps-custom-map-design%402x.png)

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/maps#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, or visionOS._

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/maps#watchOS)

On Apple Watch, maps are static snapshots of geographic locations. Place a map in your interface at design time and show the appropriate region at runtime. The displayed region isn’t interactive; tapping it opens the Maps app on Apple Watch. You can add up to five annotations to a map to highlight points of interest or other relevant information. For developer guidance, see [`WKInterfaceMap`](https://developer.apple.com/documentation/WatchKit/WKInterfaceMap).

![A screenshot of a map on Apple Watch, displaying Apple Park and some of the surrounding area.](https://docs-assets.developer.apple.com/published/befea7e8b96bc123bfef582ba3857d64/maps-watch1%402x.png)

**Fit the map interface element to the screen.** The entire element needs to be visible on the Apple Watch display without requiring scrolling.

**Show the smallest region that encompasses the points of interest.** The content within a map interface element doesn’t scroll, so all key content must be visible within the displayed region.

For developer guidance, see [`WKInterfaceMap`](https://developer.apple.com/documentation/WatchKit/WKInterfaceMap).

## [Resources](https://developer.apple.com/design/human-interface-guidelines/maps#Resources)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/maps#Developer-documentation)

[MapKit](https://developer.apple.com/documentation/MapKit)

[MapKit JS](https://developer.apple.com/documentation/MapKitJS)

[Indoor Mapping Data Format](https://register.apple.com/resources/imdf/)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/maps#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/33B45785-076C-43F4-85FC-8D11F70E7A57/9878_wide_250x141_1x.jpg) Go further with MapKit ](https://developer.apple.com/videos/play/wwdc2025/204)

[![](https://devimages-cdn.apple.com/wwdc-services/images/C03E6E6D-A32A-41D0-9E50-C3C6059820AA/04977BF3-7B89-4A9E-AE42-79BD268F4684/9212_wide_250x141_1x.jpg) Unlock the power of places with MapKit ](https://developer.apple.com/videos/play/wwdc2024/10097)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/maps#Change-log)

Date| Changes  
---|---  
December 18, 2024| Added guidance for place cards and included additional artwork.  
September 12, 2023| Added artwork.  
September 23, 2022| Added guidelines for presenting custom information, refined best practices, and consolidated guidance into one page.  
  
