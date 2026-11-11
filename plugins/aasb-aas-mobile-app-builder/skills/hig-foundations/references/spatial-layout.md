---
title: "Spatial layout | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/spatial-layout

# Spatial layout

Spatial layout techniques help you take advantage of the infinite canvas of Apple Vision Pro and present your content in engaging, comfortable ways.

![A sketch of axes in the X, Y, and Z dimensions, suggesting three-dimensional layout. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/e13737927c465ae264094aa019129252/foundations-spatial-layout-intro%402x.png)

## [Field of view](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Field-of-view)

A person’s _field of view_ is the space they can see without moving their head. The dimensions of an individual’s field of view while wearing Apple Vision Pro vary based on factors like the way people configure the Light Seal and the extent of their peripheral acuity.

![A screenshot of a blank app window in visionOS. A series of concentric circles overlay the image, conveying 30-, 60-, and 90-degree fields of view.](https://docs-assets.developer.apple.com/published/88086621da558b375ed5ef8ea0002283/visionos-field-of-view-layout%402x.png)

Important

The system doesn’t provide information about a person’s field of view.

**Center important content within the field of view.** By default, visionOS launches an app directly in front of people, placing it within their field of view. In an immersive experience, you can help people keep their attention on important content by keeping it centered and not displaying distracting motion or bright, high-contrast objects in the periphery.

  * Upright viewing 
  * Angled viewing 



Video with custom controls. 

Content description: An animation of a person wearing Apple Vision Pro and sitting upright in a chair. The person is directly facing a square that represents an app window in visionOS that's centered in the person's field of view. A dotted line animates from the person's eyes to the center of the window. 

Play 

Video with custom controls. 

Content description: An animation of a person wearing Apple Vision Pro and reclining in a chair. The person is looking at a square that represents an app window in visionOS. The app window is positioned a short distance from the person, is raised in the air, and is tilted toward the person so it's centered within the person's field of view. A dotted line animates from the person's eyes to the center of the window. 

Play 

**Avoid anchoring content to the wearer’s head.** Although you generally want your app to stay within the field of view, anchoring content so that it remains statically in front of someone can make them feel stuck, confined, and uncomfortable, especially if the content obscures a lot of passthrough and decreases the apparent stability of their surroundings. Instead, anchor content in people’s space, giving them the freedom to look around naturally and view different objects in different locations.

## [Depth](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Depth)

People rely on visual cues like distance, occlusion, and shadow to perceive depth and make sense of their surroundings. On Apple Vision Pro, the system automatically uses visual effects like color temperature, reflections, and shadow to help people perceive the depth of virtual content. When people move a virtual object in space — or when they change their position relative to that object — the visual effects change the object’s apparent depth, making the experience feel more lifelike.

Because people can view your content from any angle, incorporating small amounts of depth throughout your interface — even in standard windows — can help it look more natural. When you use SwiftUI, the system adds visual effects to views in a 2D window, making them appear to have depth. For developer guidance, see [Adding 3D content to your app](https://developer.apple.com/documentation/visionOS/adding-3d-content-to-your-app).

![A screenshot of a 2D Notes window in visionOS. A note titled Nature Walks is open on the trailing side of the view, with sketches of leaves accompanied by handwritten text descriptions.](https://docs-assets.developer.apple.com/published/2b07a7f22124deaea6c2ce31a93d8833/visionos-spatial-layout-2d-window%402x.png)

If you need to present content with additional depth, you use RealityKit to create a 3D object (for developer guidance, see [RealityKit](https://developer.apple.com/documentation/RealityKit)). You can display the 3D object anywhere, or you can use a _volume_ , which is a component that displays 3D content. A volume is similar to a window, but without a visible frame. For guidance, see [visionOS volumes](https://developer.apple.com/design/human-interface-guidelines/windows#visionOS-volumes).

Video with custom controls. 

Content description: A recording showing a 3D model of a satellite within a visionOS volume. As the viewer approaches the satellite and manipulates its orientation, light reflections adjust based on the position of the viewer and angle of the satellite. 

Play 

**Provide visual cues that accurately communicate the depth of your content.** If visual cues are missing or they conflict with a person’s real-world experience, people can experience visual discomfort.

**Use depth to communicate hierarchy.** Depth helps an object appear to stand out from surrounding content, making it more noticeable. People also tend to notice changes in depth: for example, when a sheet appears over a window, the window recedes along the z-axis, allowing the sheet to come forward and become visually prominent.

**In general, avoid adding depth to text.** Text that appears to hover above its background is difficult to read, which slows people down and can sometimes cause vision discomfort.

**Make sure depth adds value.** In general, you want to use depth to clarify and delight — you don’t need to use it everywhere. As you add depth to your design, think about the size and relative importance of objects. Depth is great for visually separating large, important elements in your app, like making a tab bar or toolbar stand out from a window, but it may not work as well on small objects. For example, using depth to make a button’s symbol stand out from its background can make the button less legible and harder to use. Also review how often you use different depths throughout your app. People need to refocus their eyes to perceive each difference in depth, and doing so too often or quickly can be tiring.

## [Scale](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Scale)

visionOS defines two types of scale to preserve the appearance of depth while optimizing usability.

_Dynamic scale_ helps content remain comfortably legible and interactive regardless of its proximity to people. Specifically, visionOS automatically increases a window’s scale as it moves away from the wearer and decreases it as the window moves closer, making the window appear to maintain the same size at all distances.

Video with custom controls. 

Content description: An animation that shows a square representing an app window in a 3D space. The square animates to move back along its plane from its initial position. As it moves, it dynamically grows in size. A frame representing the original position remains visible for comparison. After the movement is complete, the entire environment rotates to convey that, from the viewer's angle, the window always remains the same size. 

Play 

_Fixed scale_ means that an object maintains the same scale regardless of its proximity to people. A fixed-scale object appears smaller when it moves farther from the viewer along the z-axis, similar to the way an object in a person’s physical surroundings looks smaller when it’s far away than it does when it’s close up.

Video with custom controls. 

Content description: An animation that shows a square representing an app window in a 3D space. The square animates to move back along its plane from its initial position. As it moves, it becomes smaller. A frame representing the original position remains visible for comparison. After the movement is complete, the entire environment rotates to convey that, from the viewer's angle, the window appears to have receded into the distance. 

Play 

To support dynamic scaling and the appearance of depth, visionOS defines a point as an angle, in contrast to other platforms, which define a point as a number of pixels that can vary with the [resolution](https://developer.apple.com/design/human-interface-guidelines/images#Resolution) of a 2D display.

**Consider using fixed scale when you want a virtual object to look exactly like a physical object.** For example, you might want to maintain the life-size scale of a product you offer so it can look more realistic when people view it in their space. Because interactive content needs to scale to maintain usability as it gets closer or farther away, prefer applying fixed scale sparingly, reserving it for noninteractive objects that need it.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Best-practices)

**Avoid displaying too many windows.** Too many windows can obscure people’s surroundings, making them feel overwhelmed, constricted, and even uncomfortable. It can also make it cumbersome for people to relocate an app because it means moving a lot of windows.

**Prioritize standard, indirect gestures.** People can make an _indirect_ gesture without moving their hand into their field of view. In contrast, making a _direct_ gesture requires people to touch the virtual object with their finger, which can be tiring, especially when the object is positioned at or above their line of sight. In visionOS, people use indirect gestures to perform the standard gestures they already know. When you prioritize indirect gestures, people can use them to interact with any object they look at, whatever its distance. If you support direct gestures, consider reserving them for nearby objects that invite close inspection or manipulation for short periods of time. For guidance, see [Gestures > visionOS](https://developer.apple.com/design/human-interface-guidelines/gestures#visionOS).

**Rely on the Digital Crown to help people recenter windows in their field of view.** When people move or turn their head, content might no longer appear where they want it to. If this happens, people can press the [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown) when they want to recenter content in front of them. Your app doesn’t need to do anything to support this action.

**Include enough space around interactive components to make them easy for people to look at.** When people look at an interactive element, visionOS displays a visual hover effect that helps them confirm the element is the one they want. It’s crucial to include enough space around an interactive component so that looking at it is easy and comfortable, while preventing the hover effect from crowding other content. For example, place multiple, regular-size [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#visionOS) so their centers are at least 60 points apart, leaving 16 points or more of space between them. Also, don’t let controls overlap other interactive elements or views, because doing so can make selecting a single element difficult.

**Let people use your app with minimal or no physical movement.** Unless some physical movement is essential to your experience, help everyone enjoy it while remaining stationary.

**Use the floor to help you place a large immersive experience.** If your immersive experience includes content that extends up from the floor, place it using a flat horizontal plane. Aligning this plane with the floor can help it blend seamlessly with people’s surroundings and provide a more intuitive experience.

To learn more about windows and volumes in visionOS, see [Windows > visionOS](https://developer.apple.com/design/human-interface-guidelines/windows#visionOS); for guidance on laying content within a window, see [Layout > visionOS](https://developer.apple.com/design/human-interface-guidelines/layout#visionOS).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Platform-considerations)

 _Not supported in iOS, iPadOS, macOS, tvOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Related)

[Eyes](https://developer.apple.com/design/human-interface-guidelines/eyes)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

[Immersive experiences](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Developer-documentation)

[Presenting windows and spaces](https://developer.apple.com/documentation/visionOS/presenting-windows-and-spaces) — visionOS

[Positioning and sizing windows](https://developer.apple.com/documentation/visionOS/positioning-and-sizing-windows) — visionOS

[Adding 3D content to your app](https://developer.apple.com/documentation/visionOS/adding-3d-content-to-your-app) — visionOS

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/2EFC2AAC-0656-4A18-B4C9-8E23CCD81E90/9989_wide_250x141_1x.jpg) Meet SwiftUI spatial layout ](https://developer.apple.com/videos/play/wwdc2025/273)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/15489B11-8744-483D-AD38-EF78D8962FF4/8126_wide_250x141_1x.jpg) Principles of spatial design ](https://developer.apple.com/videos/play/wwdc2023/10072)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/38E4EE32-29B5-4478-B8B6-35B8ACA67B16/8130_wide_250x141_1x.jpg) Design for spatial user interfaces ](https://developer.apple.com/videos/play/wwdc2023/10076)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/spatial-layout#Change-log)

Date| Changes  
---|---  
March 29, 2024| Emphasized the importance of keeping interactive elements from overlapping each other.  
June 21, 2023| New page.  
  
