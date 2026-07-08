---
title: "SF Symbols | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/sf-symbols

# SF Symbols

SF Symbols provides thousands of consistent, highly configurable symbols that integrate seamlessly with the San Francisco system font, automatically aligning with text in all weights and sizes.

![A sketch of the SF Symbols icon. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/06d528652b87b23f1cecaf5faceedf30/foundations-sf-symbols-intro%402x.png)

You can use a symbol to convey an object or concept wherever interface icons can appear, such as in toolbars, tab bars, context menus, and within text.

Availability of individual symbols and features varies based on the version of the system you’re targeting. Symbols and symbol features introduced in a given year aren’t available in earlier operating systems.

Visit [SF Symbols](https://developer.apple.com/sf-symbols/) to download the app and browse the full set of symbols. Be sure to understand the terms and conditions for using SF Symbols, including the prohibition against using symbols — or images that are confusingly similar — in app icons, logos, or any other trademarked use. For developer guidance, see [Configuring and displaying symbol images in your UI](https://developer.apple.com/documentation/UIKit/configuring-and-displaying-symbol-images-in-your-ui).

## [Rendering modes](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Rendering-modes)

SF Symbols provides four rendering modes — monochrome, hierarchical, palette, and multicolor — that give you multiple options when applying color to symbols. For example, you might want to use multiple opacities of your app’s accent color to give symbols depth and emphasis, or specify a palette of contrasting colors to display symbols that coordinate with various color schemes.

To support the rendering modes, SF Symbols organizes a symbol’s paths into distinct layers. For example, the `cloud.sun.rain.fill` symbol consists of three layers: the primary layer contains the cloud paths, the secondary layer contains the paths that define the sun and its rays, and the tertiary layer contains the raindrop paths.

![An image of the cloud sun rain fill symbol. The cloud is black and the raindrops and sun are gray to indicate that the cloud is in the primary layer.](https://docs-assets.developer.apple.com/published/42c350caa5e5117d40d45ac28c258832/sf-three-layers-primary%402x.png)Primary

![An image of the cloud sun rain fill symbol. The sun is black and the raindrops and cloud are gray to indicate that the sun is in the secondary layer.](https://docs-assets.developer.apple.com/published/9acc461ef73c512ab21e4713fcdc75a3/sf-three-layers-secondary%402x.png)Secondary

![An image of the cloud sun rain fill symbol. The raindrops are black and the sun and cloud are gray to indicate that the raindrops are in the primary layer.](https://docs-assets.developer.apple.com/published/f2ec783b9aedc7f59c3485efb83fbb94/sf-three-layers-tertiary%402x.png)Tertiary

Depending on the rendering mode you choose, a symbol can produce various appearances. For example, Hierarchical rendering mode assigns a different opacity of a single color to each layer, creating a visual hierarchy that gives depth to the symbol.

![An image of the cloud sun rain fill symbol that uses three different opacities of the system blue color in the symbol’s three different layers: the cloud is fully opaque, the sun is about 50% opaque, and the raindrops are about 25% opaque.](https://docs-assets.developer.apple.com/published/35fe9f56dee989f094845e640951fef5/sf-three-layers-color%402x.png)

To learn more about supporting rendering modes in custom symbols, see [Custom symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Custom-symbols).

SF Symbols supports the following rendering modes.

**Monochrome** — Applies one color to all layers in a symbol. Within a symbol, paths render in the color you specify or as a transparent shape within a color-filled path.

![A diagram showing a row of eight symbols, all of which use a single opacity of the system blue color.](https://docs-assets.developer.apple.com/published/b296a9ee1b06b49c011209c83b537096/sf-monochrome%402x.png)

**Hierarchical** — Applies one color to all layers in a symbol, varying the color’s opacity according to each layer’s hierarchical level.

![A diagram showing a row of eight symbols, each of which uses different opacities of the system blue color. From the left, the square and arrow up symbol uses full opacity for the arrow and low opacity in the square. Next, folder badge plus uses full opacity for the badge and low opacity for the folder. Trash slash uses full opacity for the slash and low opacity for the can. Calendar day timeline right uses full opacity for the horizontal indicator and low opacity for the square and dots. List number uses full opacity for the column of numbers and low opacity for the horizontal lines. Text format A B C dotted underline uses full opacity for the dots under the low-opacity letters. iPhone radio waves left and right uses full opacity for the device outline, mid opacity in the screen area, and low opacity for the radio wave lines. Lastly, the PC symbol uses full opacity for the device outline and the onscreen sad face and horizontal lines and mid opacity in the screen background.](https://docs-assets.developer.apple.com/published/c035476f6266b094b051d4e392329092/sf-hierarchical%402x.png)

**Palette** — Applies two or more colors to a symbol, using one color per layer. Specifying only two colors for a symbol that defines three levels of hierarchy means the secondary and tertiary layers use the same color.

![A diagram showing a row of eight symbols, each of which uses a combination of gray and the system blue color. From the left, the square and arrow up symbol uses blue for the arrow and light gray for the square. Next, folder badge plus uses blue for the badge and light gray for the folder. Trash slash uses blue for the slash and light gray for the can. Calendar day timeline right uses blue for the horizontal indicator and light gray for the square and dots. List number uses blue for the column of numbers and light gray for the horizontal lines. Text format A B C dotted underline uses blue for the dots under the light gray letters. iPhone radio waves left and right uses blue for the device outline, medium gray in the screen area, and light gray for the radio wave lines. Lastly, the PC symbol uses blue for the device outline and the onscreen sad face and horizontal lines and medium gray in the screen background.](https://docs-assets.developer.apple.com/published/5ea6a976464ec36e5dbdbf30588a25e0/sf-palette%402x.png)

**Multicolor** — Applies intrinsic colors to some symbols to enhance meaning. For example, the `leaf` symbol uses green to reflect the appearance of leaves in the physical world, whereas the `trash.slash` symbol uses red to signal data loss. Some multicolor symbols include layers that can receive other colors.

![A diagram showing a row of eight symbols, using combinations of various colors. From the left, the square and arrow up symbol uses blue for all lines. Next, folder badge plus uses green for the badge and blue for the folder. Trash slash uses red for both the slash and the can. Calendar day timeline right uses red for the horizontal indicator, dark gray for the square, and light gray for the dots. List number uses black for the column of numbers and medium gray for the horizontal lines. Text format A B C dotted underline uses red for the dots under the black letters. iPhone radio waves left and right uses blue for all lines. Lastly, the PC symbol uses yellow for the device outline, white for the onscreen sad face and horizontal lines, and blue in the screen background.](https://docs-assets.developer.apple.com/published/82097ab3d98f098d12935ab4d6c1c896/sf-multicolor%402x.png)

Regardless of rendering mode, using system-provided colors ensures that symbols automatically adapt to accessibility accommodations and appearance modes like vibrancy and Dark Mode. For developer guidance, see [renderingMode(_:)](https://developer.apple.com/documentation/swiftui/image/renderingmode\(_:\)).

**Confirm that a symbol’s rendering mode works well in every context.** Depending on factors like the size of a symbol and its contrast with the current background color, different rendering modes can affect how well people can discern the symbol’s details. You can use the automatic setting to get a symbol’s preferred rendering mode, but it’s still a good idea to check the results for places where a different rendering mode might improve a symbol’s legibility.

## [Gradients](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Gradients)

In SF Symbols 7 and later, gradient rendering generates a smooth linear gradient from a single source color. You can use gradients across all rendering modes for both system and custom colors and for custom symbols. Gradients render for symbols of any size, but look best at larger sizes.

![The sun symbol with a solid yellow fill.](https://docs-assets.developer.apple.com/published/2df52fad04d6250f02143138ff76da14/sf-symbols-sun-solid-fill%402x.png)Solid fill

![The sun symbol with a gradient fill derived from a single yellow source color. The gradient color is bright on the left edge of the symbol, and subtly darkens as it approaches the right edge.](https://docs-assets.developer.apple.com/published/18a48b9b3b9f3842ff42f1331edeb5fb/sf-symbols-sun-gradient-fill%402x.png)Gradient fill

## [Variable color](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Variable-color)

With variable color, you can represent a characteristic that can change over time — like capacity or strength — regardless of rendering mode. To visually communicate such a change, variable color applies color to different layers of a symbol as a value reaches different thresholds between zero and 100 percent.

For example, you could use variable color with the `speaker.wave.3` symbol to communicate three different ranges of sound — plus the state where there’s no sound — by mapping the layers that represent the curved wave paths to different ranges of decibel values. In the case of no sound, no wave layers get color. In all other cases, a wave layer receives color when the sound reaches a threshold the system defines based on the number of nonzero states you want to represent.

![A diagram showing four versions of the speaker wave three symbol, each of which displays color in a different number of wave paths. From the left, the number of waves with color is zero, one, two, and three.](https://docs-assets.developer.apple.com/published/e03af602ef484d26ff5cc3428e98079a/sf-variable-color%402x.png)

Sometimes, it can make sense for some of a symbol’s layers to opt out of variable color. For example, in the `speaker.wave.3` symbol shown above, the layer that contains the speaker path doesn’t receive variable color because a speaker doesn’t change as the sound level changes. A symbol can support variable color in any number of layers.

**Use variable color to communicate change — don’t use it to communicate depth.** To convey depth and visual hierarchy, use Hierarchical rendering mode to elevate certain layers and distinguish foreground and background elements in a symbol.

## [Weights and scales](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Weights-and-scales)

SF Symbols provides symbols in a wide range of weights and scales to help you create adaptable designs.

![A diagram showing the square and arrow up symbol in all 27 weights and scales.](https://docs-assets.developer.apple.com/published/a46e2c294c605c4f5e5f626c67d6bb2d/sf-scales-weights%402x.png)

Each of the nine symbol weights — from ultralight to black — corresponds to a weight of the San Francisco system font, helping you achieve precise weight matching between symbols and adjacent text, while supporting flexibility for different sizes and contexts.

Each symbol is also available in three scales: small, medium (the default), and large. The scales are defined relative to the cap height of the San Francisco system font.

![A diagram showing the first of three images of the plus circle symbol followed by the capitalized word add. In each image, the word uses the same size, but the symbol uses a different size. The symbol size is small in this image. Two parallel horizontal lines appear across all three images. The top line shows the height of the capital letter A and the bottom line is the baseline under the word add. In this small symbol, the circle touches both lines.](https://docs-assets.developer.apple.com/published/bf6a6d81c531a772bbe9c768af32f0b8/sf-symbol-scale-small%402x.png)Small

![The second of three images of the plus circle symbol followed by the capitalized word add. In this medium symbol, the circle extends slightly above and below the lines.](https://docs-assets.developer.apple.com/published/aa672f59358a8bb354e4ea9e7d258467/sf-symbol-scale-medium%402x.png)Medium

![The third of three images of the plus circle symbol followed by the capitalized word add. In this large symbol, the vertical line of the plus sign almost touches both lines.](https://docs-assets.developer.apple.com/published/6696a9dbf59f8ef7118ac712067de2e6/sf-symbol-scale-large%402x.png)Large

Specifying a scale lets you adjust a symbol’s emphasis compared to adjacent text, without disrupting the weight matching with text that uses the same point size. For developer guidance, see [`imageScale(_:)`](https://developer.apple.com/documentation/SwiftUI/View/imageScale\(_:\)) (SwiftUI), [`UIImage.SymbolScale`](https://developer.apple.com/documentation/UIKit/UIImage/SymbolScale) (UIKit), and [`NSImage.SymbolConfiguration`](https://developer.apple.com/documentation/AppKit/NSImage/SymbolConfiguration-swift.class) (AppKit).

## [Design variants](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Design-variants)

SF Symbols defines several design variants — such as fill, slash, and enclosed — that can help you communicate precise states and actions while maintaining visual consistency and simplicity in your UI. For example, you could use the slash variant of a symbol to show that an item or action is unavailable, or use the fill variant to indicate selection.

Outline is the most common variant in SF Symbols. An outlined symbol has no solid areas, resembling the appearance of text. Most symbols are also available in a fill variant, in which the areas within some shapes are solid.

In addition to outline and fill, SF Symbols also defines variants that include a slash or enclose a symbol within a shape like a circle, square, or rectangle. In many cases, enclosed and slash variants can combine with outline or fill variants.

![A diagram showing two rows of the same five symbols. In the top row, every symbol uses the outline variant; the bottom row shows the fill variant of each symbol. From the left, the symbols are heart, heart slash, heart circle, heart square, and a heart in a rectangle.](https://docs-assets.developer.apple.com/published/c4486c6d1dc36ea164665276e912139a/sf-variants%402x.png)

SF Symbols provides many variants for specific languages and writing systems, including Latin, Arabic, Hebrew, Hindi, Thai, Chinese, Japanese, Korean, Cyrillic, Devanagari, and several Indic numeral systems. Language- and script-specific variants adapt automatically when the device language changes. For guidance, see [Images](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Images).

![A diagram with eight rows of the same twelve symbols, where each row shows a localized version of the symbol. From the left the symbols are doc rich text, doc rich text fill, character book closed, character book closed fill, character bubble, character bubble fill, character, text format superscript, text format subscript, text format size, character text box, and character cursor I beam.](https://docs-assets.developer.apple.com/published/cf9d526c8f3a39b600f0226125a2b228/sf-localized%402x.png)

Symbol variants support a range of design goals. For example:

  * The outline variant works well in toolbars, lists, and other places where you display a symbol alongside text.

  * Symbols that use an enclosing shape — like a square or circle — can improve legibility at small sizes.

  * The solid areas in a fill variant tend to give a symbol more visual emphasis, making it a good choice for iOS tab bars and swipe actions and places where you use an accent color to communicate selection.




In many cases, the view that displays a symbol determines whether to use outline or fill, so you don’t have to specify a variant. For example, an iOS tab bar prefers the fill variant, whereas a toolbar takes the outline variant.

## [Animations](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Animations)

SF Symbols provides a collection of expressive, configurable animations that enhance your interface and add vitality to your app. Symbol animations help communicate ideas, provide feedback in response to people’s actions, and signal changes in status or ongoing activities.

Animations work on all SF Symbols in the library, in all rendering modes, weights, and scales, and on custom symbols. For considerations when animating custom symbols, see [Custom symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Custom-symbols). You can control the playback of an animation, whether you want the animation to run from start to finish, or run indefinitely, repeating its effect until a condition is met. You can customize behaviors, like changing the playback speed of an animation or determining whether to reverse an animation before repeating it. For developer guidance, see [Symbols](https://developer.apple.com/documentation/Symbols) and [`SymbolEffect`](https://developer.apple.com/documentation/Symbols/SymbolEffect).

**Appear** — Causes a symbol to gradually emerge into view.

Video with custom controls. 

Content description: A video showing three symbols with the same appear animation effect applied to each. In each animation, the symbol layers gradually animate into view. From the left, the symbols are an antenna with radio waves that animate from the center outward, a photo stack with lines representing a stack animating from the bottom to the top, and a waveform animating from left to right. 

Play 

**Disappear** — Causes a symbol to gradually recede out of view.

Video with custom controls. 

Content description: A video showing three symbols with the same disappear animation effect applied to each. In each animation, all the symbol layers gradually animate out of view. From the left, the symbols are a folder with a badge plus icon, two overlapping lightbulbs, and two overlapping chat bubbles 

Play 

**Bounce** — Briefly scales a symbol with an elastic-like movement that goes either up or down and then returns to the symbol’s initial state. The bounce animation plays once by default and can help communicate that an action occurred or needs to take place.

Video with custom controls. 

Content description: A video showing three symbols with the same bounce animation effect applied to each. In each animation, the symbol layers individually bounce. From the left, the symbols are a music note with three lines, text that reads haha, and the Live Photos icon. 

Play 

**Scale** — Changes the size of a symbol, increasing or decreasing its scale. Unlike the bounce animation, which returns the symbol to its original state, the scale animation persists until you set a new scale or remove the effect. You might use the scale animation to draw people’s attention to a selected item or as feedback when people choose a symbol.

Video with custom controls. 

Content description: A video showing three symbols with the same scale animation effect applied to each. In each animation, the symbol decreases in size, and after a pause, increases back to the original size. From the left, the symbols are a PIP exit window, a 3D stack of three diagonally positioned squares, and an overlapping HomePod and HomePod mini. 

Play 

**Pulse** — Varies the opacity of a symbol over time. This animation automatically pulses only the layers within a symbol that are annotated to pulse, and optionally can pulse all layers within a symbol. You might use the pulse animation to communicate ongoing activity, playing it continuously until a condition is met.

Video with custom controls. 

Content description: A video showing three symbols with the same pulse animation effect applied to each. In each animation, one layer pulses its opacity. From the left, the symbols are the AirPlay icon with a pulsing screen, a chat bubble with a waveform that is overlapped with a pulsing pause button, and a pulsing rectangle to represent a screen that is overlapped with a person icon. 

Play 

**Variable color** — Incrementally varies the opacity of layers within a symbol. This animation can be cumulative or iterative. When cumulative, color changes persist for each layer until the animation cycle is complete. When iterative, color changes occur one layer at a time. You might use variable color to communicate progress or ongoing activity, such as playback, connecting, or broadcasting. You can customize the animation to autoreverse — meaning reverse the animation to the starting point and replay the sequence — as well as hide inactive layers rather than reduce their opacity.

The arrangement of layers within a symbol determines how variable color behaves during a repeating animation. Symbols with layers that are arranged linearly where the start and end points don’t meet are annotated as _open loop_. Symbols with layers that follow a complete shape where the start and end points do meet, like in a circular progress indicator, are annotated as _closed loop_. Variable color animations for symbols with closed loop designs feature seamless, continuous playback.

Video with custom controls. 

Content description: A video showing three symbols with the same variable color animation effect applied to each. In each animation, color is added one path at a time. From the left, the symbols are a speaker with color cycling through three sound waves, a Wi-Fi symbol with color cycling through two paths that represent signal strength before reversing and replaying the animation, and a sprinkler icon with color cycling through droplets. 

Play 

**Replace** — Replaces one symbol with another. The replace animation works between arbitrary symbols and across all weights and rendering modes. This animation features three configurations:

  * Down-up, where the outgoing symbol scales down and the incoming symbol scales up, communicating a change in state.

  * Up-up, where both the outgoing and incoming symbols scale up. This configuration communicates a change in state that includes a sense of forward progression.

  * Off-up, where the outgoing symbol hides immediately and the incoming symbol scales up. This configuration communicates a state change that emphasizes the next available state or action.




Video with custom controls. 

Content description: A video showing three symbols with the same replace animation effect applied to each. In each animation, one symbol is replaced by a new symbol, and then replaced by the original symbol. From the left, the symbols are a grid of four squares replaced by a bulleted list, a cloud with rain replaced by a cloud partly blocking the sun, and microphone symbol replaced by an x symbol in a circle. 

Play 

From left to right: down-up, up-up, off-up

**Magic Replace** — Performs a smart transition between two symbols with related shapes. For example, slashes can draw on and off, and badges can appear or disappear, or you can replace them independently of the base symbol. Magic Replace is the new default replace animation, but doesn’t occur between unrelated symbols; the default down-up animation occurs instead. You can choose a custom direction for the fallback animation in these situations if you prefer one other than the default.

Video with custom controls. 

Content description: A video showing three symbols each with a shape being added, removed, or replaced using the Magic Replace animation effect. In each animation, the symbol is transformed, and then the transformation is reverted. From the left, the symbols are a credit card with a triangle caution shape added, a microphone with a diagonal slash added, and a circular ID with a checkmark badge replaced by an X badge. 

Play 

**Wiggle** — Moves the symbol back and forth along a directional axis. You might use the wiggle animation to highlight a change or a call to action that a person might overlook. Wiggle can also add a dynamic emphasis to an interaction or reinforce what the symbol is representing, such as when an arrow points in a specific direction.

Video with custom controls. 

Content description: A video showing three symbols that wiggle laterally, rotationally, or along a linear axis. From the left, the symbols are an arrow pointing down at a container that wiggles vertically; a stack of two photos that wiggles rotationally; and a top-down car between two lane markers with arrows pointing inward that wiggles horizontally. 

Play 

**Breathe** — Smoothly increases and decreases the presence of a symbol, giving it a living quality. You might use the breathe animation to convey status changes, or signal that an activity is taking place, like an ongoing recording session. Breathe is similar to pulse; however pulse animates by changing opacity alone, while breathe changes both opacity and size to convey ongoing activity.

Video with custom controls. 

Content description: A video showing three symbols that breathe in and out, growing and shrinking in size and changing opacity in a smooth rhythm. From the left, the symbols are a stylized waveform of vertical lines that expand and contract from left to right with a pulse of variable opacity; a pair of translation word bubbles that grow with reduced opacity, then shrink with increased opacity; and three concentric mindfulness rings that pulse outward with reduced opacity, then inward with increased opacity. 

Play 

**Rotate** — Rotates the symbol to act as a visual indicator or imitate an object’s behavior in the real world. For example, when a task is in progress, rotation confirms that it’s working as expected. The rotate animation causes some symbols to rotate entirely, while in others only certain parts of the symbol rotate. Symbols like the desk fan, for example, use the By Layer rotation option to spin only the fan blades.

Video with custom controls. 

Content description: A video showing three symbols that either rotate completely or contain a rotating shape. From the left, the symbols are a rotating gear; a desk fan with rotating fan blades; and two dots rotating on concentric orbital paths around a center circle. 

Play 

**Draw On / Draw Off** — In SF Symbols 7 and later, draws the symbol along a path through a set of guide points, either from offscreen to onscreen (Draw On) or from onscreen to offscreen (Draw Off). You can draw all layers at once, stagger them, or draw each layer one at a time. You might use the draw animation to convey progress, as with a download, or to reinforce the meaning of a symbol, like a directional arrow.

**Apply symbol animations judiciously.** While there’s no limit to how many animations you can add to a view, too many animations can overwhelm an interface and distract people.

**Make sure that animations serve a clear purpose in communicating a symbol’s intent.** Each type of animation has a discrete movement that communicates a certain type of action or elicits a certain response. Consider how people might interpret an animated symbol and whether the animation, or combination of animations, might be confusing.

**Use symbol animations to communicate information more efficiently.** Animations provide visual feedback, reinforcing that something happened in your interface. You can use animations to present complex information in a simple way and without taking up a lot of visual space.

**Consider your app’s tone when adding animations.** When animating a symbol, think about what the animation can convey and how that might align with your brand identity and your app’s overall style and tone. For guidance, see [Branding](https://developer.apple.com/design/human-interface-guidelines/branding).

## [Custom symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Custom-symbols)

If you need a symbol that SF Symbols doesn’t provide, you can create your own. To create a custom symbol, first export the template for a symbol that’s similar to the design you want, then use a vector-editing tool to modify it. For developer guidance, see [Creating custom symbol images for your app](https://developer.apple.com/documentation/UIKit/creating-custom-symbol-images-for-your-app).

Important

SF Symbols includes copyrighted symbols that depict Apple products and features. You can display these symbols in your app, but you can’t customize them. To help you identify a noncustomizable symbol, the SF Symbols app badges it with an Info icon; to help you use the symbol correctly, the inspector pane describes its usage restrictions.

Using a process called _annotating_ , you can assign a specific color — or a specific hierarchical level, such as primary, secondary, or tertiary — to each layer in a custom symbol. Depending on the rendering modes you support, you can use a different mode in each instance of the symbol in your app.

**Use the template as a guide.** Create a custom symbol that’s consistent with the ones the system provides in level of detail, optical weight, alignment, position, and perspective. Strive to design a symbol that is:

  * Simple

  * Recognizable

  * Inclusive

  * Directly related to the action or content it represents




For guidance, see [Icons](https://developer.apple.com/design/human-interface-guidelines/icons).

**Assign negative side margins to your custom symbol if necessary.** SF Symbols supports negative side margins to aid optical horizontal alignment when a symbol contains a badge or other elements that increase its width. For example, negative side margins can help you horizontally align a stack of folder symbols, some of which include a badge. The name of each margin includes the relevant configuration — such as “left-margin-Regular-M” — so be sure to use this naming pattern if you add margins to your custom symbols.

**Optimize layers to use animations with custom symbols.** If you want to animate your symbol by layer, make sure to annotate the layers in the SF Symbols app. The Z-order determines the order that you want to apply colors to the layers of a variable color symbol, and you can choose whether to animate those changes from front-to-back, or back-to-front. You can also animate by layer groups to have related layers move together.

**Test animations for custom symbols.** It’s important to test your custom symbols with all of the animation presets because the shapes and paths might not appear how you expect when the layers are in motion. To get the most out of this feature, consider drawing your custom symbols with whole shapes. For example, a custom symbol similar to the `person.2.fill` symbol doesn’t need to create a cutout for the shape representing the person on the left. Instead, you can draw the full shape of the person, and in addition to that, draw an offset path of the person on the right to help represent the gap between them. You can later annotate this offset path as an erase layer to render the symbol as you want. This method of drawing helps preserve additional layer information that allows for animations to perform as you expect.

**Avoid making custom symbols that include common variants, such as enclosures or badges.** The SF Symbols app offers a component library for creating variants of your custom symbol. Using the component library allows you to create commonly used variants of your custom symbol while maintaining design consistency with the included SF Symbols.

**Provide alternative text labels for custom symbols.** Alternative text labels — or accessibility descriptions — let VoiceOver describe visible UI and content, making navigation easier for people with visual disabilities. For guidance, see [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover).

**Don’t design replicas of Apple products.** Apple products are copyrighted and you can’t reproduce them in your custom symbols. Also, you can’t customize a symbol that SF Symbols identifies as representing an Apple feature or product.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Related)

[Download SF Symbols](https://developer.apple.com/sf-symbols/)

[Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

[Icons](https://developer.apple.com/design/human-interface-guidelines/icons)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Developer-documentation)

[Symbols](https://developer.apple.com/documentation/Symbols) — Symbols framework

[Configuring and displaying symbol images in your UI](https://developer.apple.com/documentation/UIKit/configuring-and-displaying-symbol-images-in-your-ui) — UIKit

[Creating custom symbol images for your app](https://developer.apple.com/documentation/UIKit/creating-custom-symbol-images-for-your-app) — UIKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/4F1E5BC7-921E-46C0-927A-D84295787A94/9994_wide_250x141_1x.jpg) What’s new in SF Symbols 7 ](https://developer.apple.com/videos/play/wwdc2025/337)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Change-log)

Date| Changes  
---|---  
July 28, 2025| Updated with guidance for Draw animations and gradient rendering in SF Symbols 7.  
June 10, 2024| Updated with guidance for new animations and features of SF Symbols 6.  
June 5, 2023| Added a new section on animations. Included animation guidance for custom symbols.  
September 14, 2022| Added a new section on variable color. Removed instructions on creating custom symbol paths, exporting templates, and layering paths, deferring to developer articles that cover these topics.  
  
