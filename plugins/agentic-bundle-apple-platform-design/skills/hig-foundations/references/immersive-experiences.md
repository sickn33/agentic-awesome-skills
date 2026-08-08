---
title: "Immersive experiences | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/immersive-experiences

# Immersive experiences

In visionOS, you can design apps and games that extend beyond windows and volumes, immersing people in your content.

![A sketch that suggests Apple Vision Pro. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/63fd96e56c2b19f4451f688728f0b013/foundations-immersive-experiences-intro%402x.png)

You can choose whether your visionOS app or game launches in the Shared Space or in a Full Space. In the _Shared Space_ , your software runs alongside other experiences, and people can switch between them much as they do on a Mac; in a _Full Space_ , your app or game runs alone, hiding other experiences and helping people immerse themselves in your content. Apps and games can support different types of immersion, and can transition fluidly between the Shared Space and a Full Space at any time.

## [Immersion and passthrough](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Immersion-and-passthrough)

In visionOS, people use passthrough to see their physical surroundings. _Passthrough_ provides real-time video from the device’s external cameras, helping people feel comfortable and connected to their physical context.

People can also use the [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown) at any time to manage app or game content or adjust passthrough. For example, people can press and hold the Digital Crown to recenter content in their field of view or double-click it to briefly hide all content and show passthrough for a clear view of their surroundings.

The system also helps people remain comfortable by automatically changing the opacity of content in certain situations. For example, if someone gets too close to a physical object in `mixed` immersion, the content in front of them dims briefly so they can see their immediate physical surroundings more clearly. In more immersive experiences — such as in the `progressive` and `full` styles described below — the system defines a boundary that extends about 1.5 meters from the initial position of the wearer’s head. As their head gets close to this boundary, the entire experience begins to fade and passthrough increases. When their head moves beyond this boundary, the immersive visuals are replaced in space by the app’s icon, and are restored when the wearer returns to their original location or recenters their view using the Digital Crown.

### [Immersion styles](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Immersion-styles)

When your app or game transitions to a Full Space, the system hides other apps so people can focus on yours. In a Full Space, you can display 3D content that isn’t bound by a window, in addition to content in standard windows and volumes. For developer guidance, see [`automatic`](https://developer.apple.com/documentation/SwiftUI/ImmersionStyle/automatic).

visionOS offers several ways to immerse people in your content in the Shared Space as well as when you transition to a Full Space. For example, you can:

  * **Use dimmed passthrough to bring attention to your content.** You can subtly dim or tint passthrough and other visible content to bring attention to your app in the Shared Space without hiding other apps and games, or create a more focused experience in a Full Space. While passthrough is tinted black by default, you can apply a custom tint color to create a dynamic experience in your app. For developer guidance, see [`SurroundingsEffect`](https://developer.apple.com/documentation/SwiftUI/SurroundingsEffect).




  * Without dimmed passthrough 
  * With dimmed passthrough 



![A screenshot of a window in the Shared Space.](https://docs-assets.developer.apple.com/published/3aa6d97e5947c39a73cfd8dd7e9c4dff/immersive-spaces-shared-space-regular-content%402x.png)

![A screenshot of a highlighted window in the Shared Space with dimmed passthrough.](https://docs-assets.developer.apple.com/published/d6645a2853d8dc87e99062f5f575222b/immersive-spaces-shared-space-dimmed-content%402x.png)

  * **Create unbounded 3D experiences.** Use the `mixed` immersion style in a Full Space to blend your content with passthrough. When your app or game runs in a Full Space, you can request access to information about nearby physical objects and room layout, helping you display virtual content in a person’s surroundings. The `mixed` immersion style doesn’t define a boundary. Instead, when a person gets too close to a physical object, the system automatically makes nearby content semi-opaque to help them remain aware of their surroundings. For developer guidance, see [`mixed`](https://developer.apple.com/documentation/SwiftUI/ImmersionStyle/mixed) and [ARKit](https://developer.apple.com/documentation/ARKit).

  * **Use`progressive` immersion to blend your custom environment with a person’s surroundings.** You can use the `progressive` style in a Full Space to display a custom environment that partially replaces passthrough. You can also define a specific range of immersion that works best with your app or game, and display content in portrait or landscape orientation. While in your immersive experience, people can use the Digital Crown to adjust the amount of immersion within either the default range of 120- to 360-degrees or a custom range, if you specify one. The system automatically defines an approximately 1.5-meter boundary when an experience transitions to the `progressive` style. For developer guidance, see [`progressive`](https://developer.apple.com/documentation/SwiftUI/ImmersionStyle/progressive).




Video with custom controls. 

Content description: A recording of a fully immersive experience in which a video player window appears on top of an Environment. As the viewer adjusts the Digital Crown, passthrough increases to reveal more of the person's physical surroundings. 

Play 

  * **Use`full` immersion to create a fully immersive experience.** You can use the `full` style in a Full Space to display a 360-degree custom environment that completely replaces passthrough and transports people to a new place. As with the `progressive` style, the system defines an approximately 1.5-meter boundary when a fully immersive experience starts. For developer guidance, see [`full`](https://developer.apple.com/documentation/SwiftUI/ImmersionStyle/full).




  * Full Space (Mixed) 
  * Full Space (Progressive) 
  * Full Space (Immersive) 



![A screenshot of an app running in a Full Space using the mixed immersion style in visionOS.](https://docs-assets.developer.apple.com/published/bb7e4d2d5f14673af8223f16b8ef8367/immersive-spaces-full-space-mixed-style%402x.png)Mixed immersion style in a Full Space blending in-app objects with real-world surroundings

![A screenshot of an app running in a Full Space using the progressive immersion style in visionOS.](https://docs-assets.developer.apple.com/published/7c6bd28f709239805551dfe4db2f4f0e/immersive-spaces-full-space-progressive-style%402x.png)Progressive immersion style in a Full Space blending the app’s custom environment with real-world surroundings

![A screenshot of an app running in a Full Space using the full immersion style in visionOS.](https://docs-assets.developer.apple.com/published/3e8f31614811987239868bca745cd798/immersive-spaces-full-space-full-style%402x.png)Full immersion style in a Full Space showing a 360-degree custom environment

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Best-practices)

**Offer multiple ways to use your app or game.** In addition to giving people the freedom to choose their experiences, it’s essential to design your software to support the accessibility features people use to personalize the ways they interact with their devices. For guidance, see [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

**Prefer launching your app or game in the Shared Space or using the`mixed` immersion style.** Launching in the Shared Space lets people reference your app or game while using other running software, and enables seamless switching between them. If your app or game provides a fully immersive or `progressive` style experience, launching in the `mixed` immersion style or with a window-based experience in the Shared Space gives people more control, letting them choose when to increase immersion.

**Reserve immersion for meaningful moments and content.** Not every task benefits from immersion, and not every immersive task needs to be fully immersive. Although people sometimes want to enter a different world, they often want to stay grounded in their surroundings while they’re using your app or game, and they can appreciate being able to use other software and system features at the same time. Instead of assuming that your app or game needs to be fully immersive most of the time, design ways for people to immerse themselves in the individual tasks and content that make your experience unique. For example, people can browse their albums in Photos using a familiar app window in the Shared Space, but when they want to examine a single photo, they can temporarily transition to a more immersive experience in a Full Space where they can expand the photo and appreciate its details.

**Help people engage with key moments in your app or game, regardless of the level of immersion.** Cues like dimming, tinting, [motion](https://developer.apple.com/design/human-interface-guidelines/motion), [scale](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Scale), and [Spatial Audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio#visionOS) can help draw people’s attention to a specific area of content, whether it’s in a window in the Shared Space or in a completely immersive experience in a Full Space. Start with subtle cues that gently guide people’s attention, strengthening the cues only when there’s a good reason to do so.

**Prefer subtle tint colors for passthrough.** In visionOS 2 and later, you can tint passthrough to help a person’s surroundings visually coordinate with your content, while also making their hands look like they belong in your experience. Avoid bright or dramatic tints that can distract people and diminish the sense of immersion. For developer guidance, see [`SurroundingsEffect`](https://developer.apple.com/documentation/SwiftUI/SurroundingsEffect).

## [Promoting comfort](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Promoting-comfort)

**Be mindful of people’s visual comfort.** For example, although you can place 3D content anywhere while your app or game is running in a Full Space, prefer placing it within people’s [field of view](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Field-of-view). Also, make sure you display motion in comfortable ways while your software runs in a Full Space to avoid causing distraction, confusion, or discomfort. For guidance, see [Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

**Choose a style of immersion that supports the movements people might make while they’re in your app or game.** It’s essential to choose the right style for your immersive experience because it allows the system to respond appropriately when people move. Although people can make minor physical movements while in an immersive experience — such as shifting their weight, turning around, or switching between sitting and standing — making excessive movements can cause the system to interrupt some experiences. In particular, avoid using the `progressive` or `full` immersion styles or transition back to the `mixed` immersion style if you think people might need to move beyond the 1.5-meter boundary.

**Avoid encouraging people to move while they’re in a progressive or fully immersive experience.** Some people may not want to move, or are unable to move because of a disability or their physical surroundings. Design ways for people to interact with content without moving. For example, let people bring a virtual object closer to them instead of expecting them to move closer to the object.

**If you use the`mixed` immersion style, avoid obscuring passthrough too much.** People use passthrough to help them understand and navigate their physical surroundings, so it’s important to avoid displaying virtual objects that block too much of their view. If your app or game displays virtual objects that could substantially obscure passthrough, use the `full` or `progressive` immersion styles instead of `mixed`.

**Adopt ARKit if you want to blend custom content with someone’s surroundings.** For example, you might want to integrate virtual content into someone’s surroundings or use the wearer’s hand positions to inform your experience. If you need access to these types of sensitive data, you must request people’s permission. For guidance, see [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy); for developer guidance, see [`SceneReconstructionProvider`](https://developer.apple.com/documentation/ARKit/SceneReconstructionProvider).

## [Transitioning between immersive styles](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Transitioning-between-immersive-styles)

**Design smooth, predictable transitions when changing immersion.** Help people prepare for different experiences by providing gentle transitions that let people visually track changes. Avoid sudden, jarring transitions that might be disorienting or uncomfortable. For developer guidance, see [`CoordinateSpaceProtocol`](https://developer.apple.com/documentation/SwiftUI/CoordinateSpaceProtocol).

**Let people choose when to enter or exit a more immersive experience.** It can be disorienting for someone to suddenly enter a more immersive experience when they’re not expecting it. Instead, provide a clear action to enter or exit immersion so people can decide when to be more immersed in your content, and when to leave. For example, Keynote provides a prominent Exit button in its fully immersive Rehearsal environment to help people return to the slide-viewing window. Avoid requiring people to use system controls to reduce immersion in your experience.

**Indicate the purpose of an exit control.** Make sure your button clarifies whether it returns people to a previous, less immersive context or quits an experience altogether. If exiting your immersive experience also quits your app or game, consider providing controls that let people pause or return to a place where they can save their progress before quitting.

## [Displaying virtual hands](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Displaying-virtual-hands)

When your immersive app or game transitions to a Full Space, it can ask permission to hide a person’s hands and instead show virtual hands that represent them.

**Prefer virtual hands that match familiar characteristics.** For example, match the positions and gestures of the viewer’s hands so they can continue to interact with your app or game in ways that feel natural. Hands that work in familiar ways help people stay immersed in the experience when in fully virtual worlds.

**Use caution if you create virtual hands that are larger than the viewer’s hands.** Virtual hands that are significantly bigger than human hands can prevent people from seeing the content they’re interested in and can make interactions feel clumsy. Also, large virtual hands can seem out of proportion with the space, appearing to be too close to the viewer’s face.

**If there’s an interruption in hand-tracking data, fade out virtual hands and reveal the viewer’s own hands.** Don’t let the virtual hands become unresponsive and appear frozen. When hand-tracking data returns, fade the virtual hands back in.

## [Creating an environment](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Creating-an-environment)

When your app or game transitions to a Full Space, you can replace passthrough with a custom environment that partially or completely surrounds a person, transporting them to a new place. The following guidelines can help you design a beautiful environment that people appreciate.

**Minimize distracting content.** To help immerse people in a primary task like watching a video, avoid displaying a lot of movement or high-contrast details in your environment. Alternatively, when you want to draw people’s attention to certain areas of your environment, consider techniques like using the highest quality textures and shapes in the important area while using lower quality assets and dimming in less important areas.

**Help people distinguish interactive objects in your environment.** People often use an object’s proximity to help them decide if they can interact with it. For example, when you place a 3D object far away from people, they often don’t try to touch or move toward it, but when you place a 3D object close to people, they’re more likely to try interacting with it.

**Keep animation subtle.** Small, gentle movements, like clouds drifting or transforming, can enrich your custom environment without distracting people or making them uncomfortable. Always avoid displaying too much movement near the edges of a person’s field of view. For guidance, see [Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

**Create an expansive environment, regardless of the place it depicts.** A small, restrictive environment can make people feel uncomfortable and even claustrophobic.

**Use Spatial Audio to create atmosphere.** In visionOS, you use Spatial Audio to play sound that people can perceive as coming from specific locations in space, not just from speakers (for guidance, see [Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)). As you design a soundscape that enhances your custom environment, keep the experience fresh and captivating by avoiding too much repetition or looping. If people can play other audio while they’re in your environment — for example, while watching a movie — be sure to lower the volume of the soundscape or stop it completely.

**In general, avoid using a flat 360-degree image to create your environment.** A 360-degree image doesn’t tend to give people a sense of scale when they view it in an environment, so it can reduce the immersiveness of the experience. Prefer creating object meshes that include lighting, and use shaders to implement subtle animations like the movements of clouds or leaves or the reflections of objects.

**Help people feel grounded.** Always provide a ground plane mesh so people don’t feel like they’re floating. If you must use a flat 360-degree image in your environment, adding a ground plane mesh can help it feel more realistic.

**Minimize asset redundancy.** Using the same assets or models too frequently tends to make an environment feel less realistic.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Platform-considerations)

 _Not supported in iOS, iPadOS, macOS, tvOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Related)

[Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)

[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Developer-documentation)

[Creating fully immersive experiences in your app](https://developer.apple.com/documentation/visionOS/creating-fully-immersive-experiences) — visionOS

[Incorporating real-world surroundings in an immersive experience](https://developer.apple.com/documentation/visionOS/incorporating-real-world-surroundings-in-an-immersive-experience) — visionOS

[`ImmersionStyle`](https://developer.apple.com/documentation/SwiftUI/ImmersionStyle) — visionOS

[Immersive spaces](https://developer.apple.com/documentation/SwiftUI/Immersive-spaces) — SwiftUI

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/15489B11-8744-483D-AD38-EF78D8962FF4/8126_wide_250x141_1x.jpg) Principles of spatial design ](https://developer.apple.com/videos/play/wwdc2023/10072)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/942191E7-9B98-487D-AE81-400D58285B31/8129_wide_250x141_1x.jpg) Design spatial SharePlay experiences ](https://developer.apple.com/videos/play/wwdc2023/10075)

[![](https://devimages-cdn.apple.com/wwdc-services/images/C03E6E6D-A32A-41D0-9E50-C3C6059820AA/BEBF6FDD-D987-4A45-AF6F-6D4C4575E69F/9198_wide_250x141_1x.jpg) Create custom environments for your immersive apps in visionOS ](https://developer.apple.com/videos/play/wwdc2024/10087)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences#Change-log)

Date| Changes  
---|---  
June 9, 2025| Clarified guidance and noted the availability of portrait-oriented progressive immersion.  
November 19, 2024| Refined immersion style guidance and added artwork.  
June 10, 2024| Added guidance for tinting passthrough and specifying initial, minimum, and maximum immersion levels.  
May 7, 2024| Added guidance for creating an environment.  
February 2, 2024| Clarified guidance for choosing an immersion style that matches the experience your app provides.  
October 24, 2023| Updated artwork.  
June 21, 2023| New page.  
  
