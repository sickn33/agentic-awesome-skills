---
title: "Remotes | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/remotes

# Remotes

The Siri Remote is the primary input method for Apple TV, helping people feel connected to onscreen content from across the room.

![A sketch of an Apple TV remote, suggesting interaction with onscreen content. The image is overlaid with rectangular and circular grid lines and is tinted purple to subtly reflect the purple in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/04cb8e9dcd1006a14957bda7627222ad/inputs-remotes-intro%402x.png)

In addition to several specific buttons, the Siri Remote combines a clickpad and touch surface to support familiar gestures like swipe and press that people use to navigate tvOS apps, browse channels and content, play and pause media, and make selections.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/remotes#Best-practices)

**Prefer using standard gestures to perform standard actions.** Unless people are actively playing a game, they expect the remote to behave in standard ways in every app they use. Redefining or repurposing standard remote behaviors can cause confusion and add complexity to your experience. For guidance, see [Gestures](https://developer.apple.com/design/human-interface-guidelines/remotes#Gestures).

**Be consistent with the tvOS focus experience.** The [focus experience](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection) forges a strong connection between people and the content they’re viewing. Reinforce this link in your app by ensuring that you combine gestures with the focus experience in ways that are familiar to people, such as always moving focus in the same direction as the gesture.

**Provide clear feedback that shows people what happens when they make gestures in your app.** For example, lightly resting a thumb on the remote shows people where to swipe down so that they can reveal an info area.

**Define new gestures only when it makes sense in your app.** Within gameplay, for example, custom gestures can be a fun part of the experience. In most other situations, people expect to use standard gestures and may not appreciate having to discover or remember new ones.

**Differentiate between press and tap, and avoid responding to an inadvertent tap.** Pressing is an intentional action, and it works well for choosing a button, confirming a selection, and initiating an action during gameplay. Tap gestures are fine for navigation or showing additional information, but keep in mind that people might cause an inadvertent tap when they rest a thumb on the remote, pick it up, move it around, or hand it to someone else, so it often works well to avoid responding to taps during live video playback.

**Consider using the position of a tap to aid with navigation or gameplay.** The remote can differentiate between up, down, left, and right tap gestures on the touch surface. Respond to positional taps only if it makes sense in the context of your app and if such behavior is intuitive and discoverable.

**In almost all cases, open the parent of the current screen when people press the Back button.** At the top level of an app or game, the parent is the Apple TV Home Screen; within an app, the parent is defined by the app hierarchy, and isn’t necessarily the previous screen. The exception to this standard behavior is when people are actively playing a game, where it can be easy to accidentally press the Back button repeatedly. To avoid disrupting gameplay in this scenario, respond to the Back button by opening an in-game pause menu that lets people use a different interaction to navigate back to the game’s main menu. When the in-game pause menu is open, respond to a Back-button press by closing the menu and resuming the game. Note that people press and hold the Back button to go to the Home Screen from any location. For guidance, see [Buttons](https://developer.apple.com/design/human-interface-guidelines/remotes#Buttons).

**Respond correctly to the Play/Pause button during media playback.** When playing music or video, people expect pressing the Play/Pause button to play, pause, or resume playback.

## [Gestures](https://developer.apple.com/design/human-interface-guidelines/remotes#Gestures)

The clickpad’s touch surface detects swipes and presses.

**Swipe.** Swiping lets people scroll effortlessly through large numbers of items with movement that starts fast and then slows down, based on the strength of the swipe. When people swipe up or down on the edge of the remote, they can speed through items very quickly.

**Press.** People press to activate a control or select an item. Also, people press before swiping to activate scrubbing mode.

## [Buttons](https://developer.apple.com/design/human-interface-guidelines/remotes#Buttons)

Ensure that your app or game responds to specific presses in the following ways.

Button or area| Expected behavior in an app| Expected behavior in a game  
---|---|---  
Touch surface (swipe)| Navigates. Changes focus.| Performs directional pad behavior.  
Touch surface (press)| Activates a control or an item. Navigates deeper.| Performs primary button behavior.  
Back| Returns to previous screen. Exits to Apple TV Home Screen.| Pauses/resumes gameplay. Returns to previous screen, exits to main game menu, or exits to Apple TV Home Screen.  
Play/Pause| Activates media playback. Pauses/resumes media playback.| Performs secondary button behavior. Skips intro video.  
  
## [Compatible remotes](https://developer.apple.com/design/human-interface-guidelines/remotes#Compatible-remotes)

Some remotes that are compatible with Apple TV include buttons for browsing live TV or other channel-based content. For example, a remote might include a button people can use to open an electronic program guide (EPG) and other buttons they can use to browse the guide or change channels. For developer guidance, see [Providing Channel Navigation](https://developer.apple.com/documentation/TVServices/providing-channel-navigation); for design guidance, see [EPG experience](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps#EPG-experience).

**If your live-viewing app provides an EPG, respond to a remote’s EPG-browsing buttons in ways people expect.** When people press a “guide” or “browse” button, they expect your EPG to open. While they’re viewing your EPG, people expect to navigate through it by pressing a “page up” or “page down” button. Avoid responding to these buttons in other ways while people are browsing the EPG. On the Siri Remote and compatible remotes, people can also tap on the upper or lower area of the Touch surface to browse the EPG. If your app doesn’t support an EPG experience, the system routes these button presses to the default guide app on the viewer’s device.

**While your content plays, respond to a compatible remote’s “page up” or “page down” button by changing the channel.** People expect these buttons to behave differently when they switch between viewing content and browsing an EPG.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/remotes#Platform-considerations)

 _Not supported in iOS, iPadOS, macOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/remotes#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/remotes#Related)

[Use your Siri Remote or Apple TV Remote with Apple TV](https://support.apple.com/en-us/HT205305)

