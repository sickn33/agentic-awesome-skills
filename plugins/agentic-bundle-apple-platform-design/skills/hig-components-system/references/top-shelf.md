---
title: "Top Shelf | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/top-shelf

# Top Shelf

The Apple TV Home Screen provides an area called Top Shelf, which showcases your content in a rich, engaging way while also giving people access to their favorite apps in the Dock.

![A stylized representation of a horizontal list of media previews above rows of Apple TV apps. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/73359c0fed7c9f8fd20b9a2c03ebfe66/components-top-shelf-intro%402x.png)

When you support full-screen Top Shelf, people can swipe through multiple full-screen content views, play trailers and previews, and get more information about your content.

Top Shelf is a unique opportunity to highlight new, featured, or recommended content and let people jump directly to your app or game to view it. For example, when people select Apple TV in the Dock, full-screen previews immediately begin playing and soon the Dock slides away. As people watch previews for the first show, they can swipe through previews of all other featured shows, stopping to select Play or More Info for a preview that interests them.

The system defines several layout templates that you can use to give people a compelling Top Shelf experience when they select your app in the Dock. To help you position content, you can download these templates from [Apple Design Resources](https://developer.apple.com/design/resources/#tvos-apps).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Best-practices)

**Help people jump right into your content.** Top Shelf provides a path to the content people care about most. Two of the system-provided layout templates — [carousel actions](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Carousel-actions) and [carousel details](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Carousel-details) — each include two buttons by default: A primary button intended to begin playback and a More Info button intended to open your app to a view that displays details about the content.

**Feature new content.** For example, showcase new releases or episodes, highlight upcoming movies and shows, and avoid promoting content that people have already purchased, rented, or watched.

**Personalize people’s favorite content.** People typically put the apps they use most often into Top Shelf. You can personalize their experience by showing targeted recommendations in the Top Shelf content you supply, letting people resume media playback or jump back into active gameplay.

**Avoid showing advertisements or prices.** People put your app into Top Shelf because you’ve already sold them on it, so they may not appreciate seeing lots of ads from your app. Showing purchasable content in the Top Shelf is fine, but prefer putting the focus on new and exciting content, and consider displaying prices only when people show interest.

**Showcase compelling dynamic content that can help draw people in and encourage them to view more.** If necessary, you can supply static images, but people typically prefer a captivating, dynamic Top Shelf experience that features the newest or highest rated content. To provide this experience, prefer creating [layered images](https://developer.apple.com/design/human-interface-guidelines/images#Layered-images) to display in Top Shelf.

**If you don’t provide the recommended full-screen content, supply at least one static image as a fallback.** The system displays a static image when your app is in the Dock and in focus and full-screen content is unavailable. tvOS flips and blurs the image, ensuring that it fits into a width of 1920 pixels at the 16:9 aspect ratio. Use the following values for guidance.

Image size  
---  
2320x720 pt (2320x720 px @1x, 4640x1440 px @2x)  
  
**Avoid implying interactivity in a static image.** A static Top Shelf image isn’t focusable, and you don’t want to make people think it’s interactive.

## [Dynamic layouts](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Dynamic-layouts)

Dynamic Top Shelf images can appear in several ways:

  * A carousel of full-screen video and images that includes two buttons and optional details

  * A row of focusable content

  * A set of scrolling banners




### [Carousel actions](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Carousel-actions)

The carousel actions layout style focuses on full-screen video and images and includes a few unobtrusive controls that help people see more. This layout style works especially well to showcase content that people already know something about. For example, it’s great for displaying user-generated content, like photos, or new content from a franchise or show that people are likely to enjoy.

**Provide a title.** Include a succinct title, like the title of the show or movie or the title of a photo album. If necessary, you can also provide a brief subtitle. For example, a subtitle for a photo album could be a range of dates; a subtitle for an episode could be the name of the show.

### [Carousel details](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Carousel-details)

This layout style extends the carousel actions layout style, giving you the opportunity to include some information about the content. For example, you might provide information like a plot summary, cast list, and other metadata that helps people decide whether to choose the content.

**Provide a title that identifies the currently playing content.** The content title appears near the top of the screen so it’s easy for people to read it at a glance. Above the title, you can also provide a succinct phrase or app attribution, like “Featured on _My App_.”

### [Sectioned content row](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Sectioned-content-row)

This layout style shows a single labeled row of sectioned content, which can work well to highlight recently viewed content, new content, or favorites. Row content is focusable, which lets people scroll quickly through it. A label appears when an individual piece of content comes into focus, and small movements on the remote’s Touch surface bring the focused image to life. You can also configure a sectioned content row to show multiple labels.

**Provide enough content to constitute a complete row.** At a minimum, load enough images in a sectioned content row to span the full width of the screen. In addition, include at least one label for greater platform consistency and to provide additional context.

You can use the following image sizes in a sectioned content row.

#### [Poster (2:3)](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Poster-23)

![An illustration showing an outlined rectangle that contains a slightly smaller rectangle, which contains a slight narrower rectangle. The outermost rectangle represents the actual size, the middle rectangle represents the visible or safe zone, and the innermost rectangle represents the unfocused size.](https://docs-assets.developer.apple.com/published/13d162f243a286d45bb107b4a7cb799b/icons-and-images-content-layout-2x3%402x.png)

Aspect| Image size  
---|---  
Actual size| 404x608 pt (404x608 px @1x, 808x1216 px @2x)  
Focused/Safe zone size| 380x570 pt (380x570 px @1x, 760x1140 px @2x)  
Unfocused size| 333x570 pt (333x570 px @1x, 666x1140 px @2x)  
  
#### [Square (1:1)](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Square-11)

![An illustration showing an outlined square that contains a slightly smaller square, which contains a slightly smaller square. The outermost  square represents the actual size, the middle square represents the visible or safe zone, and the innermost square represents the unfocused size.](https://docs-assets.developer.apple.com/published/eba53b409d9ed6226c9b1e965dc17033/icons-and-images-content-layout-1x1%402x.png)

Aspect| Image size  
---|---  
Actual size| 608x608 pt (608x608 px @1x, 1216x1216 px @2x)  
Focused/Safe zone size| 570x570 pt (570x570 px @1x, 1140x1140 px @2x)  
Unfocused size| 500x500 pt (500x500 px @1x, 1000x1000 px @2x)  
  
#### [16:9](https://developer.apple.com/design/human-interface-guidelines/top-shelf#169)

![An illustration showing an outlined rectangle that contains a slightly smaller rectangle, which contains a slightly smaller rectangle. The outermost rectangle represents the actual size, the middle rectangle represents the visible or safe zone, and the innermost rectangle represents the unfocused size.](https://docs-assets.developer.apple.com/published/2b45c73a75fdeafef21cbb3c2923259a/icons-and-images-content-layout-16x9%402x.png)

Aspect| Image size  
---|---  
Actual size| 908x512 pt (908x512 px @1x, 1816x1024 px @2x)  
Focused/Safe zone size| 852x479 pt (852x479 px @1x, 1704x958 px @2x)  
Unfocused size| 782x440 pt (782x440 px @1x, 1564x880 px @2x)  
  
**Be aware of additional scaling when combining image sizes.** If your Top Shelf design includes a mixture of image sizes, keep in mind that images will automatically scale up to match the height of the tallest image if necessary. For example, a 16:9 image scales to 500 pixels high if included in a row with a poster or square image.

#### [Scrolling inset banner](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Scrolling-inset-banner)

This layout shows a series of large images, each of which spans almost the entire width of the screen. Apple TV automatically scrolls through these banners on a preset timer until people bring one into focus. The sequence circles back to the beginning after the final image is reached.

When a banner is in focus, a small, circular gesture on the remote’s Touch surface enacts the system focus effect, animating the item, applying lighting effects, and, if the banner contains layered images, producing a 3D effect. Swiping on the Touch surface pans to the next or previous banner in the sequence. Use this style to showcase rich, captivating content, such as a popular new movie.

**Provide three to eight images.** A minimum of three images is recommended for a scrolling banner to feel effective. More than eight images can make it hard to navigate to a specific image.

**If you need text, add it to your image.** This layout style doesn’t show labels under content, so all text must be part of the image itself. In layered images, consider elevating text by placing it on a dedicated layer above the others. Add the text to the accessibility label of the image too, so [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover) can read it.

![An illustration showing a wide rectangle that contains of a smaller rectangle, which contains a slightly narrower rectangle. The outermost rectangle represents the actual size, the middle rectangle represents the visible or safe zone, and the innermost rectangle represents the unfocused size.](https://docs-assets.developer.apple.com/published/e7ca852b559e9d981c968703dbad0315/icons-and-images-content-layout-extra-wide%402x.png)

Use the following size for a scrolling inset banner image:

Aspect| Image size  
---|---  
Actual size| 1940x692 pt (1940x692 px @1x, 3880x1384 px @2x)  
Focused/Safe zone size| 1740x620 pt (1740x620 px @1x, 3480x1240 px @2x)  
Unfocused size| 1740x560 pt (1740x560 px @1x, 3480x1120 px @2x)  
  
## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Platform-considerations)

 _Not supported in iOS, iPadOS, macOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Related)

[Apple Design Resources](https://developer.apple.com/design/resources/#tvos-apps)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/top-shelf#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/48/21CB7C2D-31A3-4DE5-A0EE-58FE214031F0/2713_wide_250x141_1x.jpg) Mastering the Living Room With tvOS ](https://developer.apple.com/videos/play/wwdc2019/211)

