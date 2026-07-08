---
title: "Loading | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/loading

# Loading

The best content-loading experience finishes before people become aware of it.

![A sketch of a spinning indeterminate activity indicator, suggesting data loading. The image is overlaid with rectangular and circular grid lines and is tinted orange to subtly reflect the orange in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/cfdf824156ed794426ac55a2cb38ec15/patterns-loading-intro%402x.png)

If your app or game loads assets, levels, or other content, design the behavior so it doesn’t disrupt or negatively impact the user experience.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/loading#Best-practices)

**Show something as soon as possible.** If you make people wait for loading to complete before displaying anything, they can interpret the lack of content as a problem with your app or game. Instead, consider showing placeholder text, graphics, or animations as content loads, replacing these elements as content becomes available.

**Let people do other things in your app or game while they wait for content to load.** Loading content in the background helps give people access to other actions. For example, a game could load content in the background while players learn about the next level or view an in-game menu. For developer guidance, see [Improving the player experience for games with large downloads](https://developer.apple.com/documentation/GameKit/improving-the-player-experience-for-games-with-large-downloads).

**If loading takes an unavoidably long time, give people something interesting to view while they wait.** For example, you might provide gameplay hints, display tips, or introduce people to new features. Gauge the remaining loading time as accurately as possible to help you avoid giving people too little time to enjoy your placeholder content or having so much time that you need to repeat it.

**Improve installation and launch time by downloading large assets in the background.** Consider using the [Background Assets](https://developer.apple.com/documentation/BackgroundAssets) framework to schedule asset downloads — like game level packs, 3D character models, and textures — to occur immediately after installation, during updates, or at other nondisruptive times.

## [Showing progress](https://developer.apple.com/design/human-interface-guidelines/loading#Showing-progress)

**Clearly communicate that content is loading and how long it might take to complete.** Ideally, content displays instantly, but for situations where loading takes more than a moment or two, you can use system-provided components — called _progress indicators_ — to show that loading is ongoing. In general, you use a _determinate_ progress indicator when you know how long loading will take, and you use an _indeterminate_ progress indicator when you don’t. For guidance, see [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators).

**For games, consider creating a custom loading view.** Standard progress indicators work well in most apps, but can sometimes feel out of place in a game. Consider designing a more engaging experience by using custom animations and elements that match the style of your game.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/loading#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, or visionOS._

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/loading#watchOS)

**As much as possible, avoid showing a loading indicator in your watchOS experience.** People expect quick interactions with their Apple Watch, so aim to display content immediately. In situations where content needs a second or two to load, it’s better to display a loading indicator than a blank screen.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/loading#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/loading#Related)

[Launching](https://developer.apple.com/design/human-interface-guidelines/launching)

[Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/loading#Developer-documentation)

[Background Assets](https://developer.apple.com/documentation/BackgroundAssets)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/loading#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/A51258F3-769A-4301-BE75-0DDE23322569/9860_wide_250x141_1x.jpg) Discover Apple-Hosted Background Assets ](https://developer.apple.com/videos/play/wwdc2025/325)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/loading#Change-log)

Date| Changes  
---|---  
June 9, 2025| Revised guidance for storing downloads to reflect downloading large assets in the background.  
June 10, 2024| Added guidelines for showing progress and storing downloads, and enhanced guidance for games.  
  
