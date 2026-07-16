---
title: "CarPlay | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/carplay

# CarPlay

CarPlay lets people get directions, make calls, send and receive messages, listen to music, and more from their car’s built-in display, all while staying focused on the road.

![A sketch of the CarPlay icon. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/a1087b54e07bb75c8e79e0f764d21ca1/technologies-CarPlay-intro%402x.png)

People download CarPlay apps from the App Store and install them on iPhone like any other app. When people connect their iPhone with their vehicle, app icons for installed CarPlay apps appear on the CarPlay Home screen.

CarPlay is designed for drivers to use while they’re driving. Keep this context in mind as you design your CarPlay app, providing features that help people perform tasks quickly and with minimal interaction.

To create the interface of your CarPlay app, you use the system-defined templates that are appropriate for the type of app you’re developing, such as audio, communication, navigation, or fueling. For each template, your app provides the content and iOS renders it in CarPlay. Because the system displays UI components and handles the interface with the vehicle, you don’t need to adjust your layout for different screen resolutions, or manage input from different types of hardware like touchscreens, knobs, or touch pads.

To learn how to create various types of CarPlay apps and use the system-provided templates, see [CarPlay App Programming Guide](https://developer.apple.com/carplay/documentation/CarPlay-App-Programming-Guide.pdf). The general design guidelines below apply to all types of CarPlay apps.

## [iPhone interactions](https://developer.apple.com/design/human-interface-guidelines/carplay#iPhone-interactions)

CarPlay shows compatible apps from the connected iPhone on the car’s built-in display, applying simplified interfaces that are optimized for use while driving.

**Eliminate app interactions on iPhone when CarPlay is active.** Interactions with your app need to occur using the car’s built-in controls and display. If your app requires setup on iPhone, make sure people perform it before the vehicle is in motion.

**Never lock people out of CarPlay because the connected iPhone requires input.** Your app needs to function when iPhone is inaccessible — for example, when people put it in a bag or in the trunk while driving. If people must resolve a problem on the connected iPhone, let them do so after the vehicle stops.

**Make sure your app works without requiring people to unlock iPhone.** Most people use CarPlay while their iPhone is locked, so ensure that the features you provide in your CarPlay app work as expected in this scenario.

### [Audio](https://developer.apple.com/design/human-interface-guidelines/carplay#Audio)

In CarPlay, keep in mind that your app coexists with other audio sources, such as the car’s own built-in radio and voice prompts from the navigation system. Regardless of whether audio is a primary aspect of your app’s experience, you need to know how people expect audio to behave so you can meet those expectations.

**Let people choose when to start playback.** In general, avoid beginning playback automatically unless your app’s purpose is to play a single source of audio, or your app is resuming previously interrupted audio. Also, avoid starting an audio session until you’re ready to actually play audio because starting a session silences other audio sources, like the car’s built-in radio.

**Start playback as soon as audio has sufficiently loaded.** After people make a selection, it may take several seconds for audio to begin playing, depending on buffering and network conditions. The system keeps the selection highlighted and displays a spinning activity indicator until your app signals that the audio is ready to play.

**Display the Now Playing screen when audio is ready to play.** Don’t delay playback until descriptive information completes loading. If necessary, continue loading such information in the background, and show it when it’s available.

**Resume audio playback after an interruption only when it’s appropriate.** For example, your app can resume audio after a temporary interruption like a phone call. Permanent interruptions, such as a music playlist initiated by Siri, are nonresumable. When a resumable interruption occurs, your app needs to resume playback when the interruption ends if audio was actively playing when the interruption started.

**When necessary, automatically adjust audio levels, but don’t change the overall volume.** Although your app can adjust relative, independent volume levels to achieve a great mix of audio, people need to control the final output volume.

## [Layout](https://developer.apple.com/design/human-interface-guidelines/carplay#Layout)

CarPlay supports a wide range of display resolutions with varying pixel densities and aspect ratios. The system automatically scales app icons and interfaces based on the resolution of the display, so they always appear onscreen at roughly the same size. Some common screen sizes are listed in the table below.

Dimensions (pixels)| Aspect ratio  
---|---  
800x480| 5:3  
960x540| 16:9  
1280x720| 16:9  
1920x720| 8:3  
  
**Provide useful, high-value information in a clean layout that’s easy to scan from the driver’s seat.** Don’t clutter the screen with nonessential details and unnecessary visual embellishments.

**Maintain an overall consistent appearance throughout your app.** In general, ensure that elements with similar functions look similar.

**Ensure that primary content stands out and feels actionable.** Large items tend to appear more important than smaller ones and are easier for people to tap. In general, place the most important content and controls in the upper half of the screen.

## [Color](https://developer.apple.com/design/human-interface-guidelines/carplay#Color)

Color can indicate interactivity, impart vitality, and provide visual continuity.

**In general, prefer a limited color palette that coordinates with your app logo.** Subtle use of color is a great way to communicate your brand.

**Avoid using the same color for interactive and noninteractive elements.** If interactive and noninteractive elements have the same color, it’s hard for people to know where to tap.

**Test your app’s color scheme under a variety of lighting conditions in an actual car.** Lighting varies significantly based on time of day, weather, window tinting, and more. Colors you see on your computer at design time won’t always look the same when your app is used in the real world. Consider how color brightness might affect the experience of driving at night, and how low-contrast colors can wash out in direct sunlight. If necessary, make adjustments to provide the best possible viewing experience in the majority of use cases.

**Ensure your app looks great in both dark and light environments.** CarPlay supports both light and dark appearances, and may automatically adjust the current appearance based on lighting conditions.

**Choose colors that help you communicate effectively with everyone.** Different people see and interpret colors differently. For guidance on using colors in ways that people appreciate, see [Inclusive color](https://developer.apple.com/design/human-interface-guidelines/color#Inclusive-color).

## [Icons and images](https://developer.apple.com/design/human-interface-guidelines/carplay#Icons-and-images)

CarPlay supports both landscape and portrait displays and both @2x (low resolution) and @3x (high resolution) scale factors.

**Supply high-resolution images with scale factors of @2x and @3x for all CarPlay artwork in your app.** The system automatically shows the correct images and scales them appropriately, based on the resolution and size of the car’s display.

**Mirror your iPhone app icon.** A well-designed app icon works well in CarPlay and on iPhone, without the need for a second design.

**Don’t use black for your icon’s background.** Lighten a black background or add a border so the icon doesn’t blend into the display background.

Create your CarPlay app icon in the following sizes:

@2x (pixels)| @3x (pixels)  
---|---  
120x120| 180x180  
  
## [Error handling](https://developer.apple.com/design/human-interface-guidelines/carplay#Error-handling)

A CarPlay app needs to handle errors gracefully and report them to people only when absolutely necessary.

**Report errors in CarPlay, not on the connected iPhone.** If you must notify people of a problem, do so clearly in CarPlay. Never direct people to pick up their iPhone to read or resolve an error.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/carplay#Platform-considerations)

 _No additional considerations for iOS. Not supported in iPadOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/carplay#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/carplay#Related)

[CarPlay](http://developer.apple.com/carplay/)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/carplay#Developer-documentation)

[CarPlay App Programming Guide](https://developer.apple.com/carplay/documentation/CarPlay-App-Programming-Guide.pdf)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/carplay#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/3AE21C44-8831-4C0A-BCBE-68C437FB8FC8/9903_wide_250x141_1x.jpg) Turbocharge your app for CarPlay ](https://developer.apple.com/videos/play/wwdc2025/216)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/carplay#Change-log)

Date| Changes  
---|---  
May 2, 2023| Consolidated guidance into one page.  
  
