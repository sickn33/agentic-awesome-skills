---
title: "Game Center | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/game-center

# Game Center

Game Center is Apple’s social gaming network, which lets players track their progress and connect with friends across Apple platforms, and boosts the discovery of your game across players’ devices.

![A sketch of the Game Center icon. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/4df10f335123d3744626913e7fc71a02/technologies-Game-Center-intro%402x.png)

Supporting Game Center in your game allows players to:

  * Discover new games their friends are playing.

  * Seamlessly invite friends to play.

  * See the latest activity from their games across the system, in the Apple Games app, the App Store, notifications, and more.




By enabling the player activities listed above, supporting Game Center also helps surface your game to more players across Apple platforms.

You can add Game Center into your game using the GameKit framework, which provides a full-featured UI that makes it easy for players to access and view their Game Center data within your game. Alternatively, you can also use GameKit to present this data within your own custom UI. For developer guidance, see [GameKit](https://developer.apple.com/documentation/GameKit).

## [Accessing Game Center](https://developer.apple.com/design/human-interface-guidelines/game-center#Accessing-Game-Center)

To provide the best Game Center experience for your players, begin by determining whether the player is signed in to their Game Center account on the system when they launch your game. If they aren’t, initialize the player with Game Center at that time. This provides the most seamless user experience, and maximizes discovery opportunities for your game, such as in the Top Played chart and in social recommendations through players’ friends.

### [Integrating the access point](https://developer.apple.com/design/human-interface-guidelines/game-center#Integrating-the-access-point)

The Game Center _access point_ is an Apple-designed UI element that lets players view their Game Center profile and information without leaving your game. For developer guidance, see [Adding an access point to your game](https://developer.apple.com/documentation/GameKit/adding-an-access-point-to-your-game).

![An iPhone screenshot of the game The Coast, on the title screen. The access point control, a circular button with a diagonal rocket symbol, sits in the upper corner on the leading edge.](https://docs-assets.developer.apple.com/published/9774fc7f07482493ee1559593dc08e53/games-access-point-collapsed%402x.png)

In iOS, iPadOS, and macOS the access point leads players to the Game Overlay, a system overlay that allows players to view their progress and start game activities.

![An illustration composed of an iPhone screenshot and an iPad screenshot, both of the game The Coast, with the Game Overlay appearing over the top of each. In the iPhone screenshot the overlay covers the entire screen, while in the iPad screenshot the overlay appears vertically on the trailing edge.](https://docs-assets.developer.apple.com/published/bd606a6020d893c8275928bfcf22bc36/games-game-overlay%402x.png)

In visionOS and tvOS, the access point leads players to the in-game dashboard, a full-screen view of a player’s Game Center activity that appears on top of your game.

**Display the access point in menu screens.** Consider adding the access point to the main menu or the settings area of your game. Avoid displaying the access point during active gameplay or in temporary splash screens, cinematic flows, or tutorials that might precede your game’s main menu screen.

**Avoid placing controls near the access point.** You can choose to present the access point at any of the four corners of the screen in a fixed position. Remember that the access point has both a collapsed and expanded version, so check whether the access point overlaps any important UI and controls and adjust your layout accordingly.

Note

In visionOS, the locations of the access point vary based on game type, such as immersive or volume-based. For developer guidance, see [Adding an access point to your game](https://developer.apple.com/documentation/GameKit/adding-an-access-point-to-your-game#Configure-the-access-point-on-visionOS).

**Consider pausing your game while the Game Overlay or dashboard is present.** Pausing your game can help players view their Game Center information without feeling like the game is continuing without them.

### [Using custom UI](https://developer.apple.com/design/human-interface-guidelines/game-center#Using-custom-UI)

Your game can include custom links into the Game Overlay (in iOS, iPadOS, macOS) or the dashboard (in visionOS and tvOS). Your custom UI can deep-link into specific areas within both such as leaderboards or a player’s Game Center profile.

**Use the artwork Game Center provides in custom links.** When referencing Game Center features in custom UI, use the official artwork from [Apple Design Resources](https://developer.apple.com/design/resources/#technologies). Preserve the appearance of this artwork and don’t adjust the dimensions or visual effects.

**Use the correct terminology in custom links.** The following table describes how to use Game Center terminology correctly so that you can avoid confusing players in custom UI.

Term| Incorrect terms| Localization  
---|---|---  
Game Center| GameKit, GameCenter, game center| Use the system-provided translation of _Game Center_  
Game Center Profile| Profile, Account, Player Info| Use the system-provided translation of _Game Center_ and localize _Profile_  
Achievements| Awards, Trophies, Medals|   
Leaderboards| Rankings, Scores, Leaders|   
Challenges| Competitions|   
Add Friends| Add, Add Profiles, Include Friends|   
  
## [Achievements](https://developer.apple.com/design/human-interface-guidelines/game-center#Achievements)

Achievements give players an added incentive to stay engaged with your game. Game Center achievements appear in a collectible card format that highlights the player’s progress and showcases your artwork. For developer guidance, see [Rewarding players with achievements](https://developer.apple.com/documentation/GameKit/rewarding-players-with-achievements).

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the Achievements overview screen.](https://docs-assets.developer.apple.com/published/026715959db42c83de8cc04dc399dd03/games-achievement-overlay%402x.png)

Achievements overview

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the detail view of a single achievement.](https://docs-assets.developer.apple.com/published/fa2b92d24d82b3cae0748a731df621e8/games-achievement-overlay-detail%402x.png)

Achievement detail

### [Integrating achievements into your game](https://developer.apple.com/design/human-interface-guidelines/game-center#Integrating-achievements-into-your-game)

**Align with Game Center achievement states.** Game Center defines four achievement states: locked, in-progress, hidden, and completed. The system groups achievements by completion status, displaying completed achievements in the Completed group and all other achievements in the Locked group. When you map your achievements to the four Game Center achievement states, you give players a consistent experience and you help them see at a glance the types of achievements your game offers.

**Determine a display order.** The order in which you upload achievements is the order in which they appear, so consider the order you want before uploading files. For example, you might want your achievements to appear in an order that corresponds to the most common path through your game.

**Be succinct when describing achievements.** The achievement card limits the title and description to two lines each. If your title or description wraps beyond two lines, the card truncates the text. Use title-style capitalization for the achievement title and sentence-style capitalization for the description.

![A diagram of an achievement card, with callouts indicating the achievement image, title, and description.](https://docs-assets.developer.apple.com/published/54e27c562164cbf32aff9722a4058bf0/games-achievement-anatomy%402x.png)

**Give players a sense of progress.** When you use progressive achievements, the system displays player progress and provides encouraging messages like “Youʼre more than halfway to completing Great Lakes Freighter in The Coast. Keep going!” to help motivate players to complete them.

### [Creating achievement images](https://developer.apple.com/design/human-interface-guidelines/game-center#Creating-achievement-images)

**Design rich, high-quality images that help players feel rewarded.** Achievements are a prominent feature in Game Center UI, so it’s essential to design high-quality assets that catch the eye and encourage players to return to your game. Avoid reusing the same asset to represent more than one achievement. If you don’t provide an asset for an achievement, the card shows a placeholder image instead.

**Create artwork in the appropriate size and format.** The system applies a circular mask to your achievement image, so be sure to keep content centered. Use the following specifications to create images.

  * iOS, iPadOS, macOS, visionOS 
  * tvOS 



![A diagram of the layout for an achievement image in iOS, iPadOS, macOS, and visionOS, with callouts indicating the image size and mask diameter.](https://docs-assets.developer.apple.com/published/ba7aed683c8f0f112ce7024ce5a9a34f/ios-achievement-image-layout%402x.png)

Attribute| Value  
---|---  
Format| PNG, TIF, or JPG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
Image size| 512x512 pt (1024x1024 px @2x)  
Mask diameter| 512 pt (1024 px @2x)  
  
![A diagram of the layout for an achievement image in tvOS, with callouts indicating the image size and mask diameter.](https://docs-assets.developer.apple.com/published/1e98f3b125dd0babeb08bfbaf4873fed/tvos-achievement-image-layout%402x.png)

Attribute| Value  
---|---  
Format| PNG, TIF, or JPG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
Image size| 320x320 pt (640x640 px @2x)  
Mask diameter| 200 pt (400 px @2x)  
  
## [Leaderboards](https://developer.apple.com/design/human-interface-guidelines/game-center#Leaderboards)

Leaderboards are a great way to encourage friendly competition within your game. When you adopt Game Center, players can easily check their ranking against friends and global players as well as receive notifications when their friends challenge them or pass their score on a leaderboard. You can take advantage of the system-designed UI or present leaderboard information within custom UI. For developer guidance, see [Encourage progress and competition with leaderboards](https://developer.apple.com/documentation/GameKit/encourage-progress-and-competition-with-leaderboards).

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the Leaderboards overview screen.](https://docs-assets.developer.apple.com/published/63770530177075f25554a9eefa82a959/games-leaderboards-overlay%402x.png)

Leaderboards overview

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the detail view of a single leaderboard.](https://docs-assets.developer.apple.com/published/825cea7230ad7958b60f681aef7bb407/games-leaderboards-detail%402x.png)

Leaderboard detail

**Choose a leaderboard type.** Game Center supports two types of leaderboards: _classic_ and _recurring_.

  * A _classic leaderboard_ tracks a player’s best all-time score. Classic leaderboards are always active with no ending. The following are examples of goals you might include in a classic leaderboard:

    * Strive for the most perfect score in a rhythm game.

    * Collect the most coins in a single dungeon run.

    * Achieve the longest continuous time in an endless runner.

  * A _recurring leaderboard_ resets based on a time interval you define, such as every week or every day. Recurring leaderboards can increase engagement by giving players more chances to take the lead. The following are examples of features that work well with recurring leaderboards:

    * Daily rotating puzzles

    * Seasonal or holiday-themed events

    * Weekly leaderboards for different battle modes




**Take advantage of leaderboard sets for multiple leaderboards.** Leaderboard sets are an organization system that can make it easier for players to find the board they’re looking for. Consider grouping leaderboard sets by themes or gameplay experiences, such as:

  * Difficulty modes (Easy, Standard, Hard)

  * Activity types (Combat, Crafting, Farming)

  * Genres and themes (Disco, Pop, Rock)




**Add leaderboard images.** Leaderboard artwork gives you another opportunity to reinforce your game’s visual aesthetic. Aim to create a unique image for each leaderboard in your game that reflects and showcases the gameplay involved in leaderboard ranking. Leaderboards appear across the system, promoting ways for players to engage and compete with friends, and having compelling images helps attract players and gives them a sense of the experience.

For games that run in iOS, iPadOS, and macOS, use a single image for your leaderboard image. For games that run in tvOS, provide a set of images that animate when the artwork is in focus. To learn more about focus effects, see [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection). For help creating focusable images, download the tvOS template from [Apple Design Resources](https://developer.apple.com/design/resources/#tvos-apps). Use the following specifications to create leaderboard artwork.

  * iOS, iPadOS, macOS 
  * tvOS 



![A diagram of the layout for a leaderboard image in iOS, iPadOS, and macOS, with callouts indicating the image size and mask diameter.](https://docs-assets.developer.apple.com/published/a41db2a595bec653175fcfb13b50b9ed/leaderboard-image-layout-general%402x.png)

Attribute| Value  
---|---  
Format| JPEG, JPG, or PNG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
Image size| 512x512 pt (1024x1024 px @2x)  
Cropped area| 512x312 pt (1024x624 px @2x)  
  
![A diagram of the layout for a leaderboard image in tvOS, with callouts indicating the image size, focused size, and unfocused size.](https://docs-assets.developer.apple.com/published/631b5255803637a7084fe167f971810c/tvos-multi-layered-leaderboard-image%402x.png)

Attribute| Value  
---|---  
Format| PNG, TIF, or JPG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
Image size| 659x371 pt (1318x742 px @2x)  
Focused size| 618x348 pt (1236x696 px @2x)  
Unfocused size| 548x309 pt (1096x618 px @2x)  
  
Note

Be mindful of how cropping might affect your leaderboard artwork. In iOS, iPadOS, and macOS, the system crops artwork for leaderboards that are part of a leaderboard set. In tvOS, the focus effect on leaderboard artwork may crop your images at the edges of some layers. Make sure your primary content stays comfortably visible in both these scenarios.

## [Challenges](https://developer.apple.com/design/human-interface-guidelines/game-center#Challenges)

Challenges turn single player activities into multiplayer experiences with friends. Challenges are built on top of leaderboards and allow players to connect with their friends and participate in competitions with time limits. For developer documentation, see [Creating engaging challenges from leaderboards](https://developer.apple.com/documentation/GameKit/creating-engaging-challenges-from-leaderboards).

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the Challenges overview screen.](https://docs-assets.developer.apple.com/published/63176e29afb5351d511719cafdf1bb0d/games-challenges-overlay%402x.png)

Challenges overview

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the detail view of a single challenge.](https://docs-assets.developer.apple.com/published/ddfb071869dd7577f3e43f955f1b6ce7/games-challenges-overlay-detail%402x.png)

Challenge detail

**Create engaging challenges.** Challenges are great for short, skill-based gameplay activities that have a clear way of gauging players’ accomplishments. Create challenges that take 1-5 minutes to play, with gameplay that players can complete individually. Examples of compelling challenges are:

  * Complete the fastest lap in a racing level.

  * Defeat the most enemies in a single round.

  * Solve a daily puzzle with the fewest mistakes.




**Avoid creating challenges that track overall progress or personal best scores.** These can give regular players an unfair advantage. Instead, track players’ most recent score after each attempt at your challenge. This helps keep your challenge motivating by placing all players on a level playing field.

**Make it easy to jump into your challenge.** Players can access challenges through invitation links, the Game Overlay, or in the Games app in iOS, iPadOS, and macOS. Always deep-link to the exact mode or level where your challenge begins, and help first-time players complete any initial onboarding before beginning the challenge. For example, if your game requires a tutorial level to understand basic controls, launch the player into the tutorial first and present UI that lets them know your game automatically jumps into the challenge afterward.

![A diagram of a challenge card, with callouts indicating the challenge title, artwork, and number of players, and the system-provided gradient at the bottom of the card.](https://docs-assets.developer.apple.com/published/73d82f1a3511b11cab8ffb1d3026283d/games-challenge-anatomy%402x.png)

**Create high-quality artwork that encourages players to engage with your challenges.** The system shows your challenge’s artwork in the Game Overlay, Games app, and in the preview of an invitation link. Avoid placing the primary content of your artwork in an area where the challenge’s title and description might cover it. If you need to use text in your challenge image, provide the appropriate localized versions through App Store Connect or Xcode. Use the following specifications to create challenge artwork.

![A diagram of the layout for a challenge image, with callouts indicating the image size and cropped area.](https://docs-assets.developer.apple.com/published/3f26192095237c3c95276f37dd349ab6/games-challenge-image-specs%402x.png)

Attribute| Value  
---|---  
Format| JPEG, JPG, or PNG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
Image size| 1920x1080 pt (3840x2160 px @2x)  
Cropped area| 1465x767 pt (2930x1534 px @2x)  
  
## [Multiplayer activities](https://developer.apple.com/design/human-interface-guidelines/game-center#Multiplayer-activities)

Game Center supports both real-time and turn-based multiplayer activities that make it easy to connect players with friends or other players. Players can access multiplayer gameplay through party codes, the Game Overlay, the dashboard, or in the Games app. For developer documentation, see [Creating activities for your game](https://developer.apple.com/documentation/GameKit/creating-activities-for-your-game).

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the Multiplayer levels overview screen.](https://docs-assets.developer.apple.com/published/f89b2ebd744907258cc4543688d5d011/games-multiplayer-overlay%402x.png)

Multiplayer levels overview

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the detail view of a single multiplayer level.](https://docs-assets.developer.apple.com/published/b96755c00a2049def7aa3ce15c11c544/games-multiplayer-overlay-detail%402x.png)

Multiplayer level detail

**Use party codes to invite players to multiplayer activities.** Game Center party codes are a great way to coordinate real-time multiplayer sessions whether you use Game Center matchmaking and networking facilities or provide your own. Game Center generates alpha-numeric party codes that are typically eight characters long, such as “2MP4-9CMF.” When integrating party codes into your multiplayer games, consider the following guidelines for the best player experience:

  * Allow players to join gameplay late, leave early, and return later.

  * Provide a way for players to view the current party code in your game.

  * Allow players to enter a party code manually.




![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the in-game UI for setting up or joining a multiplayer activity using a custom code.](https://docs-assets.developer.apple.com/published/21aa655690fc4f5ec113e47e587774ab/games-multiplayer-custom-code%402x.png)

**Support multiplayer activities through in-game UI.** The Game Overlay and Game Center dashboard help players find other people for a multiplayer match without leaving your game. Game Center’s default multiplayer interface lets a player invite nearby or recent players, Game Center friends, and contacts. You can also choose to present multiplayer functionality within your custom UI. For developer guidance, see [Finding multiple players for a game](https://developer.apple.com/documentation/GameKit/finding-multiple-players-for-a-game).

![An iPhone screenshot of the game The Coast with the Game Overlay open, showing the in-game UI starting a multiplayer activity.](https://docs-assets.developer.apple.com/published/1b1d8dd189678fda25a18976d990b485/games-multiplayer-in-game-ui%402x.png)

**Provide engaging activity artwork.** Players see the preview image for a multiplayer activity throughout the system, such as in a party code, the Games app, or in-game UI. Use the following specifications to create your artwork.

![A diagram of a multiplayer activity card, with callouts indicating the activity title, artwork, and number of players, and the system-provided gradient at the bottom of the card.](https://docs-assets.developer.apple.com/published/8f8b825cdf198a9194e816edefef3c45/games-multiplayer-anatomy%402x.png)

![A diagram of the layout for a multiplayer activity image, with callouts indicating the image size and cropped area.](https://docs-assets.developer.apple.com/published/3f26192095237c3c95276f37dd349ab6/games-multiplayer-image-specs%402x.png)

Attribute| Value  
---|---  
Format| JPEG, JPG, or PNG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
Image size| 1920x1080 pt (3840x2160 px @2x)  
Cropped area| 1465x767 pt (2930x1534 px @2x)  
  
## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/game-center#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, or visionOS._

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/game-center#tvOS)

**Display an optional image at the top of the dashboard.** In tvOS, you can add an additional piece of artwork to the dashboard to highlight your game’s aesthetic. Use a simple, easily recognizable image that looks great at a distance. Consider using your game’s logo or word mark; however, don’t use your app icon for this image. Use the following specifications to create a dashboard image.

![A diagram of the layout for a tvOS dashboard image, with a callout indicating the image size.](https://docs-assets.developer.apple.com/published/438f3caaa842926ba5a0f54470c64373/tvos-dashboard-image%402x.png)

Attribute| Value  
---|---  
Image size| 600x180 pt (1200x360 px @2x)  
Format| PNG, TIF, or JPG  
Color space| sRGB or P3  
Resolution| 72 DPI (minimum)  
  
### [watchOS](https://developer.apple.com/design/human-interface-guidelines/game-center#watchOS)

**Be aware of Game Center support on watchOS.** While GameKit features and API are available for watchOS games, keep in mind that there’s no system-supported Game Center UI that you can invoke on watchOS. Instead, Game Center content for watchOS games appears on a connected iPhone.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/game-center#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/game-center#Related)

[Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games)

[Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)

[Apple Design Resources](https://developer.apple.com/design/resources/#technologies)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/game-center#Developer-documentation)

[GameKit](https://developer.apple.com/documentation/GameKit)

[Creating activities for your game](https://developer.apple.com/documentation/GameKit/creating-activities-for-your-game)

[Creating engaging challenges from leaderboards](https://developer.apple.com/documentation/GameKit/creating-engaging-challenges-from-leaderboards)

[Create games for Apple platforms](https://developer.apple.com/games/)

[Game Porting Toolkit](https://developer.apple.com/games/game-porting-toolkit/)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/game-center#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/0BEC1E9E-5221-48F9-853B-BEDA2BE23D63/9892_wide_250x141_1x.jpg) Get started with Game Center ](https://developer.apple.com/videos/play/wwdc2025/214)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/0C96EE37-E8A0-46DB-88B3-3BF6C3F633DD/9893_wide_250x141_1x.jpg) Engage players with the Apple Games app ](https://developer.apple.com/videos/play/wwdc2025/215)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/game-center#Change-log)

Date| Changes  
---|---  
June 9, 2025| Added guidance for new challenges and multiplayer activities, and considerations for the Apple Games app and Game Overlay. Updated guidance and specifications for activity preview images.  
February 2, 2024| Added links to developer guidance on using the access point and dashboard in a visionOS game.  
September 12, 2023| Added artwork for the iOS achievement layout.  
May 2, 2023| Consolidated guidance into one page.  
  
