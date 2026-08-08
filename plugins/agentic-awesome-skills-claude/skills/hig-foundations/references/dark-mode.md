---
title: "Dark Mode | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/dark-mode

# Dark Mode

Dark Mode is a systemwide appearance setting that uses a dark color palette to provide a comfortable viewing experience tailored for low-light environments.

![A sketch of concentric circles with half-filled areas, suggesting the presence of light and dark. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/f354bd96f1890df83e7f8e31835f80bc/foundations-dark-mode-intro%402x.png)

In iOS, iPadOS, macOS, and tvOS, people often choose Dark Mode as their default interface style, and they generally expect all apps and games to respect their preference. In Dark Mode, the system uses a dark color palette for all screens, views, menus, and controls, and may also use greater perceptual contrast to make foreground content stand out against the darker backgrounds.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Best-practices)

**Avoid offering an app-specific appearance setting.** An app-specific appearance mode option creates more work for people because they have to adjust more than one setting to get the appearance they want. Worse, they may think your app is broken because it doesn’t respond to their systemwide appearance choice.

**Ensure that your app looks good in both appearance modes.** In addition to using one mode or the other, people can choose the Auto appearance setting, which switches between the light and dark appearances as conditions change throughout the day, potentially while your app is running.

**Test your content to make sure that it remains comfortably legible in both appearance modes.** For example, in Dark Mode with Increase Contrast and Reduce Transparency turned on (both separately and together), you may find places where dark text is less legible when it’s on a dark background. You might also find that turning on Increase Contrast in Dark Mode can result in reduced visual contrast between dark text and a dark background. Although people with strong vision might still be able to read lower contrast text, such text could be illegible for many. For guidance, see [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

**In rare cases, consider using only a dark appearance in the interface.** For example, it can make sense for an app that supports immersive media viewing to use a permanently dark appearance that lets the UI recede and helps people focus on the media.

![A screenshot of the Stocks app on iPhone in its standard dark-only appearance, showing the Apple Inc. stock in detail. The view includes a summary of the current stock price along with a graph of its performance over the past year.](https://docs-assets.developer.apple.com/published/50e3d01e38e69e84976f7a1747321ba8/dark-mode-stocks-app-dark-only-mode%402x.png)

The Stocks app uses a dark-only appearance

## [Dark Mode colors](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Dark-Mode-colors)

The color palette in Dark Mode includes dimmer background colors and brighter foreground colors. It’s important to realize that these colors aren’t necessarily inversions of their light counterparts: while many colors are inverted, some are not. For more information, see [Specifications](https://developer.apple.com/design/human-interface-guidelines/color#Specifications).

**Embrace colors that adapt to the current appearance.** Semantic colors (like [`labelColor`](https://developer.apple.com/documentation/AppKit/NSColor/labelColor) and [`controlColor`](https://developer.apple.com/documentation/AppKit/NSColor/controlColor) in macOS or [`separator`](https://developer.apple.com/documentation/UIKit/UIColor/separator) in iOS and iPadOS) automatically adapt to the current appearance. When you need a custom color, add a Color Set asset to your app’s asset catalog in Xcode, and specify the bright and dim variants of the color. Avoid using hard-coded color values or colors that don’t adapt.

![An illustration of a square with a light background and four color swatches representing system colors in the light appearance.](https://docs-assets.developer.apple.com/published/083d8f0f70c26b7fdea230f7da1edfeb/dark-mode-system-colors-light%402x.png)System colors in the light appearance

![An illustration of a square with a dark background and four color swatches representing system colors in the dark appearance.](https://docs-assets.developer.apple.com/published/247df4f7b00e65cdd3827de84135fcda/dark-mode-system-colors-dark%402x.png)System colors in the dark appearance

**Aim for sufficient color contrast in all appearances.** Using system-defined colors can help you achieve a good contrast ratio between your foreground and background content. At a minimum, make sure the contrast ratio between colors is no lower than 4.5:1. For custom foreground and background colors, strive for a contrast ratio of 7:1, especially in small text. This ratio ensures that your foreground content stands out from the background, and helps your content meet recommended accessibility guidelines.

**Soften the color of white backgrounds.** If you display a content image that includes a white background, consider slightly darkening the image to prevent the background from glowing in the surrounding Dark Mode context.

### [Icons and images](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Icons-and-images)

The system uses [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) (which automatically adapt to Dark Mode) and full-color images that are optimized for both the light and dark appearances.

**Use SF Symbols wherever possible.** Symbols work well in both appearance modes when you use dynamic colors to tint them or when you add vibrancy. For guidance, see [Color](https://developer.apple.com/design/human-interface-guidelines/color).

**Design separate interface icons for the light and dark appearances if necessary.** For example, an icon that depicts a full moon might need a subtle dark outline to contrast well with a light background, but need no outline when it displays on a dark background. Similarly, an icon that represents a drop of oil might need a slight border to make the edge visible against a dark background.

![An illustration of a black droplet icon against a light background.](https://docs-assets.developer.apple.com/published/5377a16f9c47c32d5716a2de9e7e5ddb/dark-mode-icon-in-light-mode%402x.png)Icon in the light appearance with no border

![An illustration of a black droplet icon against a dark background. The icon has a white border to distinguish it from the similar surrounding color.](https://docs-assets.developer.apple.com/published/a2ebe256a3e677367cc3e965e8282168/dark-mode-icon-in-dark-mode%402x.png)Icon in the dark appearance with border for better contrast

**Make sure full-color images and icons look good in both appearances.** Use the same asset if it looks good in both the light and dark appearances. If an asset looks good in only one mode, modify the asset or create separate light and dark assets. Use asset catalogs to combine your assets into a single named image.

![An illustration of two people sitting at a restaurant table done in a simple, abstract style. The illustration has a light background and its details are clearly visible.](https://docs-assets.developer.apple.com/published/017a90f0e42a841edec3d4238f408e9e/dark-mode-illustration-in-light-mode%402x.png)Illustration on a light background

![An illustration of two people sitting at a restaurant table done in a simple, abstract style. The illustration has a dark background, and the darker portions of the image are hard to distinguish from the background.](https://docs-assets.developer.apple.com/published/97c07bc517069bf9175e7a3374ed95aa/dark-mode-illustration-in-dark-mode-incorrect%402x.png)On a dark background, the same illustration has poor contrast and many details are lost

![An illustration of two people sitting at a restaurant table done in a simple, abstract style. The illustration has a dark background, and its color values are adjusted to be clearly visible in contrast to the background.](https://docs-assets.developer.apple.com/published/fa4aec31ae33aadce2ed0a0434c9c605/dark-mode-illustration-in-dark-mode-correct%402x.png)Illustration adjusted for better contrast on a dark background

### [Text](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Text)

The system uses vibrancy and increased contrast to maintain the legibility of text on darker backgrounds.

**Use the system-provided label colors for labels.** The primary, secondary, tertiary, and quaternary label colors adapt automatically to the light and dark appearances.

![An illustration of a button in the light appearance with dark primary label text.](https://docs-assets.developer.apple.com/published/4dc33e45cd6cae3da766f885044174e9/dark-mode-label-in-light-mode%402x.png)Primary label in the light appearance

![An illustration of a button in the dark appearance with light secondary label text.](https://docs-assets.developer.apple.com/published/5a2df784b29a55d1db485c30efb94009/dark-mode-label-in-dark-mode%402x.png)Secondary label in the dark appearance

**Use system views to draw text fields and text views.** System views and controls make your app’s text look good on all backgrounds, adjusting automatically for the presence or absence of vibrancy. When possible, use a system-provided view to display text instead of drawing the text yourself.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Platform-considerations)

 _No additional considerations for tvOS. Dark Mode isn’t supported in visionOS or watchOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/dark-mode#iOS-iPadOS)

In Dark Mode, the system uses two sets of background colors — called _base_ and _elevated_ — to enhance the perception of depth when one dark interface is layered above another. The base colors are dimmer, making background interfaces appear to recede, and the elevated colors are brighter, making foreground interfaces appear to advance.

![A diagram that shows a stack of 4 terms on top of a black background. The term at the top shows the most contrast with the background and the term at the bottom shows the least.](https://docs-assets.developer.apple.com/published/0d71ac9f5186541dce35b5f702311bd0/base-with-four-semantic-colors%402x.png)Base

![A diagram that shows a stack of 4 terms on top of a nearly black background. The term at the top shows the most contrast with the background and the term at the bottom shows the least.](https://docs-assets.developer.apple.com/published/0dacc182adc819b08eb8cdcc897b08a4/elevated-with-four-semantic-colors%402x.png)Elevated

![A diagram that shows a stack of 4 terms on top of a white background. The term at the top shows the most contrast with the background and the term at the bottom shows the least.](https://docs-assets.developer.apple.com/published/cbbe9a39049fd3d3d2122876de64d207/light-with-four-semantic-colors%402x.png)Light

**Prefer the system background colors.** Dark Mode is dynamic, which means that the background color automatically changes from base to elevated when an interface is in the foreground, such as a popover or modal sheet. The system also uses the elevated background color to provide visual separation between apps in a multitasking environment and between windows in a multiple-window context. Using a custom background color can make it harder for people to perceive these system-provided visual distinctions.

### [macOS](https://developer.apple.com/design/human-interface-guidelines/dark-mode#macOS)

When people choose the graphite accent color in General settings, macOS causes window backgrounds to pick up color from the current desktop picture. The result — called _desktop tinting_ — is a subtle effect that helps windows blend more harmoniously with their surrounding content.

**Include some transparency in custom component backgrounds when appropriate.** Transparency lets your components pick up color from the window background when desktop tinting is active, creating a visual harmony that can persist even when the desktop picture changes. To help achieve this harmony, add transparency only to a custom component that has a visible background or bezel, and only when the component is in a neutral state, such as state that doesn’t use color. You don’t want to add transparency when the component is in a state that uses color, because doing so can cause the component’s color to fluctuate when the window background adjusts to a different location on the desktop or when the desktop picture changes.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Related)

[Color](https://developer.apple.com/design/human-interface-guidelines/color)

[Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

[Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/5CD0E251-424E-490F-89CF-1E64848209A6/9910_wide_250x141_1x.jpg) Meet Liquid Glass ](https://developer.apple.com/videos/play/wwdc2025/219)

[![](https://devimages-cdn.apple.com/wwdc-services/images/48/174747D6-8723-4194-A932-7765179F1108/2949_wide_250x141_1x.jpg) Implementing Dark Mode on iOS ](https://developer.apple.com/videos/play/wwdc2019/214)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/dark-mode#Change-log)

Date| Changes  
---|---  
August 6, 2024| Added art contrasting the light and dark appearances.  
  
