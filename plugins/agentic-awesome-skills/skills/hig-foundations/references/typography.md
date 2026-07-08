---
title: "Typography | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/typography

# Typography

Your typographic choices can help you display legible text, convey an information hierarchy, communicate important content, and express your brand or style.

![A sketch of a small letter A to the left of a large letter A, suggesting the use of typography to convey hierarchical information. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/d90940d120149af7220e4fedfd1c10bd/foundations-typography-intro%402x.png)

## [Ensuring legibility](https://developer.apple.com/design/human-interface-guidelines/typography#Ensuring-legibility)

**Use font sizes that most people can read easily.** People need to be able to read your content at various viewing distances and under a variety of conditions. Follow the recommended default and minimum text sizes for each platform — for both custom and system fonts — to ensure your text is legible on all devices. Keep in mind that font weight can also impact how easy text is to read. If you use a custom font with a thin weight, aim for larger than the recommended sizes to increase legibility.

Platform| Default size| Minimum size  
---|---|---  
iOS, iPadOS| 17 pt| 11 pt  
macOS| 13 pt| 10 pt  
tvOS| 29 pt| 23 pt  
visionOS| 17 pt| 12 pt  
watchOS| 16 pt| 12 pt  
  
**Test legibility in different contexts.** For example, you need to test game text for legibility on each platform on which your game runs. If testing shows that some of your text is difficult to read, consider using a larger type size, increasing contrast by modifying the text or background colors, or using typefaces designed for optimized legibility, like the system fonts.

![A screenshot that shows a game running on iPhone in landscape. A name appears above each of 3 plants and a status message appears in a rounded rectangle in the top-right corner. All text uses a size that's too small, and the 3 plant names don't have visible backgrounds.](https://docs-assets.developer.apple.com/published/aaf334356178859f6e86eb42913c53dd/game-typography-incorrect%402x.png)

Testing a game on a new platform can show where text is hard to read.

![A screenshot that shows a game running on iPhone in landscape. A name appears within a shaded lozenge shape above each of 3 plants and a status message appears in a rounded rectangle in the top-right corner. All text uses a size that's at least the recommended minimum.](https://docs-assets.developer.apple.com/published/4c38de72c94767cbb6bd7763720ef281/game-typography-correct%402x.png)

Increasing text size and adding visible background shapes can help make text easier to read.

**In general, avoid light font weights.** For example, if you’re using system-provided fonts, prefer Regular, Medium, Semibold, or Bold font weights, and avoid Ultralight, Thin, and Light font weights, which can be difficult to see, especially when text is small.

## [Conveying hierarchy](https://developer.apple.com/design/human-interface-guidelines/typography#Conveying-hierarchy)

**Adjust font weight, size, and color as needed to emphasize important information and help people visualize hierarchy.** Be sure to maintain the relative hierarchy and visual distinction of text elements when people adjust text sizes.

**Minimize the number of typefaces you use, even in a highly customized interface.** Mixing too many different typefaces can obscure your information hierarchy and hinder readability, in addition to making an interface feel internally inconsistent or poorly designed.

**Prioritize important content when responding to text-size changes.** Not all content is equally important. When someone chooses a larger text size, they typically want to make the content they care about easier to read; they don’t always want to increase the size of every word on the screen. For example, when people increase text size to read the content in a tabbed window, they don’t expect the tab titles to increase in size. Similarly, in a game, people are often more interested in a character’s dialog than in transient hit-damage values.

## [Using system fonts](https://developer.apple.com/design/human-interface-guidelines/typography#Using-system-fonts)

Apple provides two typeface families that support an extensive range of weights, sizes, styles, and languages.

**San Francisco (SF)** is a sans serif typeface family that includes the SF Pro, SF Compact, SF Arabic, SF Armenian, SF Georgian, SF Hebrew, and SF Mono variants.

![The phrase 'The quick brown fox jumps over the lazy dog.' shown in the San Francisco Pro font.](https://docs-assets.developer.apple.com/published/e270b0f4e91f523bb7372a39447ad4e4/typography-sanfrancisco%402x.png)

The system also offers SF Pro, SF Compact, SF Arabic, SF Armenian, SF Georgian, and SF Hebrew in rounded variants you can use to coordinate text with the appearance of soft or rounded UI elements, or to provide an alternative typographic voice.

**New York (NY)** is a serif typeface family designed to work well by itself and alongside the SF fonts.

![The phrase 'The quick brown fox jumps over the lazy dog.' shown in the New York font.](https://docs-assets.developer.apple.com/published/8dcb4d6f97b97a957a0d73e4ee85730c/typography-new-york%402x.png)

You can download the San Francisco and New York fonts [here](https://developer.apple.com/fonts/).

The system provides the SF and NY fonts in the _variable_ font format, which combines different font styles together in one file, and supports interpolation between styles to create intermediate ones.

Note

Variable fonts support _optical sizing_ , which refers to the adjustment of different typographic designs to fit different sizes. On all platforms, the system fonts support _dynamic optical sizes_ , which merge discrete optical sizes (like Text and Display) and weights into a single, continuous design, letting the system interpolate each glyph or letterform to produce a structure that’s precisely adapted to the point size. With dynamic optical sizes, you don’t need to use discrete optical sizes unless you’re working with a design tool that doesn’t support all the features of the variable font format.

To help you define visual hierarchies and create clear and legible designs in many different sizes and contexts, the system fonts are available in a variety of weights, ranging from Ultralight to Black, and — in the case of SF — several widths, including Condensed and Expanded. Because SF Symbols use equivalent weights, you can achieve precise weight matching between symbols and adjacent text, regardless of the size or style you choose.

![The word 'text' shown in the SF Pro font, repeated in two rows of nine columns each. The rows show upright and italic styles, and the columns show font weights ranging from ultralight to black.](https://docs-assets.developer.apple.com/published/8b07ec795d9ad16c787edb0030018a09/font-weight-sf-pro%402x.png)

Note

[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) provides a comprehensive library of symbols that integrate seamlessly with the San Francisco system font, automatically aligning with text in all weights and sizes. Consider using symbols when you need to convey a concept or depict an object, especially within text.

The system defines a set of typographic attributes — called text styles — that work with both typeface families. A _text style_ specifies a combination of font weight, point size, and leading values for each text size. For example, the _body_ text style uses values that support a comfortable reading experience over multiple lines of text, while the _headline_ style assigns a font size and weight that help distinguish a heading from surrounding content. Taken together, the text styles form a typographic hierarchy you can use to express the different levels of importance in your content. Text styles also allow text to scale proportionately when people change the system’s text size or make accessibility adjustments, like turning on Larger Text in Accessibility settings.

**Consider using the built-in text styles.** The system-defined text styles give you a convenient and consistent way to convey your information hierarchy through font size and weight. Using text styles with the system fonts also ensures support for Dynamic Type and larger accessibility type sizes (where available), which let people choose the text size that works for them. For guidance, see [Supporting Dynamic Type](https://developer.apple.com/design/human-interface-guidelines/typography#Supporting-Dynamic-Type).

**Modify the built-in text styles if necessary.** System APIs define font adjustments — called _symbolic traits_ — that let you modify some aspects of a text style. For example, the bold trait adds weight to text, letting you create another level of hierarchy. You can also use symbolic traits to adjust leading if you need to improve readability or conserve space. For example, when you display text in wide columns or long passages, more space between lines (_loose leading_) can make it easier for people to keep their place while moving from one line to the next. Conversely, if you need to display multiple lines of text in an area where height is constrained — for example, in a list row — decreasing the space between lines (_tight leading_) can help the text fit well. If you need to display three or more lines of text, avoid tight leading even in areas where height is limited. For developer guidance, see [`leading(_:)`](https://developer.apple.com/documentation/SwiftUI/Font/leading\(_:\)).

Developer note

You can use the constants defined in [`Font.Design`](https://developer.apple.com/documentation/SwiftUI/Font/Design) to access all system fonts — don’t embed system fonts in your app or game. For example, use [`Font.Design.default`](https://developer.apple.com/documentation/SwiftUI/Font/Design/default) to get the system font on all platforms; use [`Font.Design.serif`](https://developer.apple.com/documentation/SwiftUI/Font/Design/serif) to get the New York font.

**If necessary, adjust tracking in interface mockups.** In a running app, the system font dynamically adjusts tracking at every point size. To produce an accurate interface mockup of an interface that uses the variable system fonts, you don’t have to choose a discrete optical size at certain point sizes, but you might need to adjust the tracking. For guidance, see [Tracking values](https://developer.apple.com/design/human-interface-guidelines/typography#Tracking-values).

## [Using custom fonts](https://developer.apple.com/design/human-interface-guidelines/typography#Using-custom-fonts)

**Make sure custom fonts are legible.** People need to be able to read your custom font easily at various viewing distances and under a variety of conditions. While using a custom font, be guided by the recommended minimum font sizes for various styles and weights in [Specifications](https://developer.apple.com/design/human-interface-guidelines/typography#Specifications).

**Implement accessibility features for custom fonts.** System fonts automatically support Dynamic Type (where available) and respond when people turn on accessibility features, such as Bold Text. If you use a custom font, make sure it implements the same behaviors. For developer guidance, see [Applying custom fonts to text](https://developer.apple.com/documentation/SwiftUI/Applying-Custom-Fonts-to-Text). In a Unity-based game, you can use [Apple’s Unity plug-ins](https://github.com/apple/unityplugins) to support Dynamic Type. If the plug-in isn’t appropriate for your game, be sure to let players adjust text size in other ways.

## [Supporting Dynamic Type](https://developer.apple.com/design/human-interface-guidelines/typography#Supporting-Dynamic-Type)

Dynamic Type is a system-level feature in iOS, iPadOS, tvOS, visionOS, and watchOS that lets people adjust the size of visible text on their device to ensure readability and comfort. For related guidance, see [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

![A screenshot of a Mail message on iPhone, using the default font size. From the left, the message header displays the sender's contact photo or initials, followed by a two-line layout with the sender name and date on top and the recipient name and attachment glyph on the bottom. The message body contains four lines of text and the address of Muir Woods National Monument.](https://docs-assets.developer.apple.com/published/65fab16931136a1aa542fb71e9ec181b/typography-default-type%402x.png)

Mail content at the default text size

![A screenshot of a Mail message on iPhone, using the largest accessibility font size. From the top, the message header displays the sender name on one line, followed by the truncated recipient name on the next line, and the date and attachment glyph on the third line. Below the header and message title, the first line and part of the second line of body text are visible on the screen.](https://docs-assets.developer.apple.com/published/5840a6f168607659543494f5cebe266d/typography-dynamic-type%402x.png)

Mail content at the largest accessibility text size

For a list of available Dynamic Type sizes, see [Specifications](https://developer.apple.com/design/human-interface-guidelines/typography#Specifications). You can also download Dynamic Type size tables in the [Apple Design Resources](https://developer.apple.com/design/resources/) for each platform.

For developer guidance, see [Text input and output](https://developer.apple.com/documentation/SwiftUI/Text-input-and-output). To support Dynamic Type in Unity-based games, use [Apple’s Unity plug-ins](https://github.com/apple/unityplugins).

**Make sure your app’s layout adapts to all font sizes.** Verify that your design scales, and that text and glyphs are legible at all font sizes. On iPhone or iPad, turn on Larger Accessibility Text Sizes in Settings > Accessibility > Display & Text Size > Larger Text, and confirm that your app remains comfortably readable.

**Increase the size of meaningful interface icons as font size increases.** If you use interface icons to communicate important information, make sure they’re easy to view at larger font sizes too. When you use [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols), you get icons that scale automatically with Dynamic Type size changes.

**Keep text truncation to a minimum as font size increases.** In general, aim to display as much useful text at the largest accessibility font size as you do at the largest standard font size. Avoid truncating text in scrollable regions unless people can open a separate view to read the rest of the content. You can prevent text truncation in a label by configuring it to use as many lines as needed to display a useful amount of text. For developer guidance, see [`numberOfLines`](https://developer.apple.com/documentation/UIKit/UILabel/numberOfLines).

**Consider adjusting your layout at large font sizes.** When font size increases in a horizontally constrained context, inline items (like glyphs and timestamps) and container boundaries can crowd text and cause truncation or overlapping. To improve readability, consider using a stacked layout where text appears above secondary items. Multicolumn text can also be less readable at large sizes due to horizontal space constraints. Reduce the number of columns when the font size increases to avoid truncation and enhance readability. For developer guidance, see [`isAccessibilityCategory`](https://developer.apple.com/documentation/UIKit/UIContentSizeCategory/isAccessibilityCategory).

**Maintain a consistent information hierarchy regardless of the current font size.** For example, keep primary elements toward the top of a view even when the font size is very large, so that people don’t lose track of these elements.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/typography#Platform-considerations)

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/typography#iOS-iPadOS)

SF Pro is the system font in iOS and iPadOS. iOS and iPadOS apps can also use NY.

### [macOS](https://developer.apple.com/design/human-interface-guidelines/typography#macOS)

SF Pro is the system font in macOS. NY is available for Mac apps built with Mac Catalyst. macOS doesn’t support Dynamic Type.

**When necessary, use dynamic system font variants to match the text in standard controls.** Dynamic system font variants give your text the same look and feel of the text that appears in system-provided controls. Use the variants listed below to achieve a look that’s consistent with other apps on the platform.

Dynamic font variant| API  
---|---  
Control content| [`controlContentFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/controlContentFont\(ofSize:\))  
Label| [`labelFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/labelFont\(ofSize:\))  
Menu| [`menuFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/menuFont\(ofSize:\))  
Menu bar| [`menuBarFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/menuBarFont\(ofSize:\))  
Message| [`messageFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/messageFont\(ofSize:\))  
Palette| [`paletteFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/paletteFont\(ofSize:\))  
Title| [`titleBarFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/titleBarFont\(ofSize:\))  
Tool tips| [`toolTipsFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/toolTipsFont\(ofSize:\))  
Document text (user)| [`userFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/userFont\(ofSize:\))  
Monospaced document text (user fixed pitch)| [`userFixedPitchFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/userFixedPitchFont\(ofSize:\))  
Bold system font| [`boldSystemFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/boldSystemFont\(ofSize:\))  
System font| [`systemFont(ofSize:)`](https://developer.apple.com/documentation/AppKit/NSFont/systemFont\(ofSize:\))  
  
### [tvOS](https://developer.apple.com/design/human-interface-guidelines/typography#tvOS)

SF Pro is the system font in tvOS, and apps can also use NY.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/typography#visionOS)

SF Pro is the system font in visionOS. If you use NY, you need to specify the type styles you want.

visionOS uses bolder versions of the Dynamic Type body and title styles and it introduces Extra Large Title 1 and Extra Large Title 2 for wide, editorial-style layouts. For guidance using vibrancy to indicate hierarchy in text and symbols, see [Materials > visionOS](https://developer.apple.com/design/human-interface-guidelines/materials#visionOS).

**In general, prefer 2D text.** The more visual depth text characters have, the more difficult they can be to read. Although a small amount of 3D text can provide a fun visual element that draws people’s attention, if you’re going to display content that people need to read and understand, prefer using text that has little or no visual depth.

![A screenshot that shows the correct placement of 2D text on a window in visionOS.](https://docs-assets.developer.apple.com/published/b7eca42cb50603b5ae1630781ce6d4c7/visionos-typography-2d-text-correct%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![A screenshot that shows the incorrect placement of 3D text on a window in visionOS.](https://docs-assets.developer.apple.com/published/8568cd71b363e427fb91a874b8c30aa8/visionos-typography-3d-text-incorrect%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

**Make sure text looks good and remains legible when people scale it.** Use a text style that makes the text look good at full scale, then test it for legibility at different scales.

**Maximize the contrast between text and the background of its container.** By default, the system displays text in white, because this color tends to provide a strong contrast with the default system background material, making text easier to read. If you want to use a different text color, be sure to test it in a variety of contexts.

**If you need to display text that’s not on a background, consider making it bold to improve legibility.** In this situation, you generally want to avoid adding shadows to increase text contrast. The current space might not include a visual surface on which to cast an accurate shadow, and you can’t predict the size and density of shadow that would work well with a person’s current Environment.

**Keep text facing people as much as possible.** If you display text that’s associated with a point in space, such as a label for a 3D object, you generally want to use _billboarding_ — that is, you want the text to face the wearer regardless of how they or the object move. If you don’t rotate text to remain facing the wearer, the text can become impossible to read because people may view it from the side or a highly oblique angle. For example, imagine a virtual lamp that appears to be on a physical desk with a label anchored directly above it. For the text to remain readable, the label needs to rotate around the y-axis as people move around the desk; in other words, the baseline of the text needs to remain perpendicular to the person’s line of sight.

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/typography#watchOS)

SF Compact is the system font in watchOS, and apps can also use NY. In complications, watchOS uses SF Compact Rounded.

## [Specifications](https://developer.apple.com/design/human-interface-guidelines/typography#Specifications)

You can display emphasized variants of system text styles using symbolic traits. In SwiftUI, use the [`bold()`](https://developer.apple.com/documentation/SwiftUI/Text/bold\(\)) modifier; in UIKit, use [`traitBold`](https://developer.apple.com/documentation/UIKit/UIFontDescriptor/SymbolicTraits-swift.struct/traitBold) in the [`UIFontDescriptor`](https://developer.apple.com/documentation/UIKit/UIFontDescriptor) API. The emphasized weights can be medium, semibold, bold, or heavy. The following specifications include the emphasized weight for each text style.

### [iOS, iPadOS Dynamic Type sizes](https://developer.apple.com/design/human-interface-guidelines/typography#iOS-iPadOS-Dynamic-Type-sizes)

  * xSmall 
  * Small 
  * Medium 
  * Large (default) 
  * xLarge 
  * xxLarge 
  * xxxLarge 



#### [xSmall](https://developer.apple.com/design/human-interface-guidelines/typography#xSmall)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 31| 38| Bold  
Title 1| Regular| 25| 31| Bold  
Title 2| Regular| 19| 24| Bold  
Title 3| Regular| 17| 22| Semibold  
Headline| Semibold| 14| 19| Semibold  
Body| Regular| 14| 19| Semibold  
Callout| Regular| 13| 18| Semibold  
Subhead| Regular| 12| 16| Semibold  
Footnote| Regular| 12| 16| Semibold  
Caption 1| Regular| 11| 13| Semibold  
Caption 2| Regular| 11| 13| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [Small](https://developer.apple.com/design/human-interface-guidelines/typography#Small)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 32| 39| Bold  
Title 1| Regular| 26| 32| Bold  
Title 2| Regular| 20| 25| Bold  
Title 3| Regular| 18| 23| Semibold  
Headline| Semibold| 15| 20| Semibold  
Body| Regular| 15| 20| Semibold  
Callout| Regular| 14| 19| Semibold  
Subhead| Regular| 13| 18| Semibold  
Footnote| Regular| 12| 16| Semibold  
Caption 1| Regular| 11| 13| Semibold  
Caption 2| Regular| 11| 13| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [Medium](https://developer.apple.com/design/human-interface-guidelines/typography#Medium)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 33| 40| Bold  
Title 1| Regular| 27| 33| Bold  
Title 2| Regular| 21| 26| Bold  
Title 3| Regular| 19| 24| Semibold  
Headline| Semibold| 16| 21| Semibold  
Body| Regular| 16| 21| Semibold  
Callout| Regular| 15| 20| Semibold  
Subhead| Regular| 14| 19| Semibold  
Footnote| Regular| 12| 16| Semibold  
Caption 1| Regular| 11| 13| Semibold  
Caption 2| Regular| 11| 13| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [Large (default)](https://developer.apple.com/design/human-interface-guidelines/typography#Large-default)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 34| 41| Bold  
Title 1| Regular| 28| 34| Bold  
Title 2| Regular| 22| 28| Bold  
Title 3| Regular| 20| 25| Semibold  
Headline| Semibold| 17| 22| Semibold  
Body| Regular| 17| 22| Semibold  
Callout| Regular| 16| 21| Semibold  
Subhead| Regular| 15| 20| Semibold  
Footnote| Regular| 13| 18| Semibold  
Caption 1| Regular| 12| 16| Semibold  
Caption 2| Regular| 11| 13| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [xLarge](https://developer.apple.com/design/human-interface-guidelines/typography#xLarge)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 36| 43| Bold  
Title 1| Regular| 30| 37| Bold  
Title 2| Regular| 24| 30| Bold  
Title 3| Regular| 22| 28| Semibold  
Headline| Semibold| 19| 24| Semibold  
Body| Regular| 19| 24| Semibold  
Callout| Regular| 18| 23| Semibold  
Subhead| Regular| 17| 22| Semibold  
Footnote| Regular| 15| 20| Semibold  
Caption 1| Regular| 14| 19| Semibold  
Caption 2| Regular| 13| 18| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [xxLarge](https://developer.apple.com/design/human-interface-guidelines/typography#xxLarge)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 38| 46| Bold  
Title 1| Regular| 32| 39| Bold  
Title 2| Regular| 26| 32| Bold  
Title 3| Regular| 24| 30| Semibold  
Headline| Semibold| 21| 26| Semibold  
Body| Regular| 21| 26| Semibold  
Callout| Regular| 20| 25| Semibold  
Subhead| Regular| 19| 24| Semibold  
Footnote| Regular| 17| 22| Semibold  
Caption 1| Regular| 16| 21| Semibold  
Caption 2| Regular| 15| 20| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [xxxLarge](https://developer.apple.com/design/human-interface-guidelines/typography#xxxLarge)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 40| 48| Bold  
Title 1| Regular| 34| 41| Bold  
Title 2| Regular| 28| 34| Bold  
Title 3| Regular| 26| 32| Semibold  
Headline| Semibold| 23| 29| Semibold  
Body| Regular| 23| 29| Semibold  
Callout| Regular| 22| 28| Semibold  
Subhead| Regular| 21| 28| Semibold  
Footnote| Regular| 19| 24| Semibold  
Caption 1| Regular| 18| 23| Semibold  
Caption 2| Regular| 17| 22| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

### [iOS, iPadOS larger accessibility type sizes](https://developer.apple.com/design/human-interface-guidelines/typography#iOS-iPadOS-larger-accessibility-type-sizes)

  * AX1 
  * AX2 
  * AX3 
  * AX4 
  * AX5 



#### [AX1](https://developer.apple.com/design/human-interface-guidelines/typography#AX1)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 44| 52| Bold  
Title 1| Regular| 38| 46| Bold  
Title 2| Regular| 34| 41| Bold  
Title 3| Regular| 31| 38| Semibold  
Headline| Semibold| 28| 34| Semibold  
Body| Regular| 28| 34| Semibold  
Callout| Regular| 26| 32| Semibold  
Subhead| Regular| 25| 31| Semibold  
Footnote| Regular| 23| 29| Semibold  
Caption 1| Regular| 22| 28| Semibold  
Caption 2| Regular| 20| 25| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [AX2](https://developer.apple.com/design/human-interface-guidelines/typography#AX2)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 48| 57| Bold  
Title 1| Regular| 43| 51| Bold  
Title 2| Regular| 39| 47| Bold  
Title 3| Regular| 37| 44| Semibold  
Headline| Semibold| 33| 40| Semibold  
Body| Regular| 33| 40| Semibold  
Callout| Regular| 32| 39| Semibold  
Subhead| Regular| 30| 37| Semibold  
Footnote| Regular| 27| 33| Semibold  
Caption 1| Regular| 26| 32| Semibold  
Caption 2| Regular| 24| 30| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [AX3](https://developer.apple.com/design/human-interface-guidelines/typography#AX3)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 52| 61| Bold  
Title 1| Regular| 48| 57| Bold  
Title 2| Regular| 44| 52| Bold  
Title 3| Regular| 43| 51| Semibold  
Headline| Semibold| 40| 48| Semibold  
Body| Regular| 40| 48| Semibold  
Callout| Regular| 38| 46| Semibold  
Subhead| Regular| 36| 43| Semibold  
Footnote| Regular| 33| 40| Semibold  
Caption 1| Regular| 32| 39| Semibold  
Caption 2| Regular| 29| 35| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [AX4](https://developer.apple.com/design/human-interface-guidelines/typography#AX4)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 56| 66| Bold  
Title 1| Regular| 53| 62| Bold  
Title 2| Regular| 50| 59| Bold  
Title 3| Regular| 49| 58| Semibold  
Headline| Semibold| 47| 56| Semibold  
Body| Regular| 47| 56| Semibold  
Callout| Regular| 44| 52| Semibold  
Subhead| Regular| 42| 50| Semibold  
Footnote| Regular| 38| 46| Semibold  
Caption 1| Regular| 37| 44| Semibold  
Caption 2| Regular| 34| 41| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [AX5](https://developer.apple.com/design/human-interface-guidelines/typography#AX5)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 60| 70| Bold  
Title 1| Regular| 58| 68| Bold  
Title 2| Regular| 56| 66| Bold  
Title 3| Regular| 55| 65| Semibold  
Headline| Semibold| 53| 62| Semibold  
Body| Regular| 53| 62| Semibold  
Callout| Regular| 51| 60| Semibold  
Subhead| Regular| 49| 58| Semibold  
Footnote| Regular| 44| 52| Semibold  
Caption 1| Regular| 43| 51| Semibold  
Caption 2| Regular| 40| 48| Semibold  
  
Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

### [macOS built-in text styles](https://developer.apple.com/design/human-interface-guidelines/typography#macOS-built-in-text-styles)

Text style| Weight| Size (points)| Line height (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 26| 32| Bold  
Title 1| Regular| 22| 26| Bold  
Title 2| Regular| 17| 22| Bold  
Title 3| Regular| 15| 20| Semibold  
Headline| Bold| 13| 16| Heavy  
Body| Regular| 13| 16| Semibold  
Callout| Regular| 12| 15| Semibold  
Subheadline| Regular| 11| 14| Semibold  
Footnote| Regular| 10| 13| Semibold  
Caption 1| Regular| 10| 13| Medium  
Caption 2| Medium| 10| 13| Semibold  
  
Point size based on image resolution of 144 ppi for @2x designs.

### [tvOS built-in text styles](https://developer.apple.com/design/human-interface-guidelines/typography#tvOS-built-in-text-styles)

Text style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Title 1| Medium| 76| 96| Bold  
Title 2| Medium| 57| 66| Bold  
Title 3| Medium| 48| 56| Bold  
Headline| Medium| 38| 46| Bold  
Subtitle 1| Regular| 38| 46| Medium  
Callout| Medium| 31| 38| Bold  
Body| Medium| 29| 36| Bold  
Caption 1| Medium| 25| 32| Bold  
Caption 2| Medium| 23| 30| Bold  
  
Point size based on image resolution of 72 ppi for @1x and 144 ppi for @2x designs.

### [watchOS Dynamic Type sizes](https://developer.apple.com/design/human-interface-guidelines/typography#watchOS-Dynamic-Type-sizes)

  * xSmall 
  * Small 
  * Large 
  * xLarge 
  * xxLarge 
  * xxxLarge 



#### [xSmall](https://developer.apple.com/design/human-interface-guidelines/typography#xSmall)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 30| 32.5| Bold  
Title 1| Regular| 28| 30.5| Semibold  
Title 2| Regular| 24| 26.5| Semibold  
Title 3| Regular| 17| 19.5| Semibold  
Headline| Semibold| 14| 16.5| Semibold  
Body| Regular| 14| 16.5| Semibold  
Caption 1| Regular| 13| 15.5| Semibold  
Caption 2| Regular| 12| 14.5| Semibold  
Footnote 1| Regular| 11| 13.5| Semibold  
Footnote 2| Regular| 10| 12.5| Semibold  
  
#### [Small (default 38mm)](https://developer.apple.com/design/human-interface-guidelines/typography#Small-default-38mm)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 32| 34.5| Bold  
Title 1| Regular| 30| 32.5| Semibold  
Title 2| Regular| 26| 28.5| Semibold  
Title 3| Regular| 18| 20.5| Semibold  
Headline| Semibold| 15| 17.5| Semibold  
Body| Regular| 15| 17.5| Semibold  
Caption 1| Regular| 14| 16.5| Semibold  
Caption 2| Regular| 13| 15.5| Semibold  
Footnote 1| Regular| 12| 14.5| Semibold  
Footnote 2| Regular| 11| 13.5| Semibold  
  
#### [Large (default 40mm/41mm/42mm)](https://developer.apple.com/design/human-interface-guidelines/typography#Large-default-40mm41mm42mm)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 36| 38.5| Bold  
Title 1| Regular| 34| 36.5| Semibold  
Title 2| Regular| 27| 30.5| Semibold  
Title 3| Regular| 19| 21.5| Semibold  
Headline| Semibold| 16| 18.5| Semibold  
Body| Regular| 16| 18.5| Semibold  
Caption 1| Regular| 15| 17.5| Semibold  
Caption 2| Regular| 14| 16.5| Semibold  
Footnote 1| Regular| 13| 15.5| Semibold  
Footnote 2| Regular| 12| 14.5| Semibold  
  
#### [xLarge (default 44mm/45mm/49mm)](https://developer.apple.com/design/human-interface-guidelines/typography#xLarge-default-44mm45mm49mm)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 40| 42.5| Bold  
Title 1| Regular| 38| 40.5| Semibold  
Title 2| Regular| 30| 32.5| Semibold  
Title 3| Regular| 20| 22.5| Semibold  
Headline| Semibold| 17| 19.5| Semibold  
Body| Regular| 17| 19.5| Semibold  
Caption 1| Regular| 16| 18.5| Semibold  
Caption 2| Regular| 15| 17.5| Semibold  
Footnote 1| Regular| 14| 16.5| Semibold  
Footnote 2| Regular| 13| 15.5| Semibold  
  
#### [xxLarge](https://developer.apple.com/design/human-interface-guidelines/typography#xxLarge)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 41| 43.5| Bold  
Title 1| Regular| 39| 41.5| Semibold  
Title 2| Regular| 31| 33.5| Semibold  
Title 3| Regular| 21| 23.5| Semibold  
Headline| Semibold| 18| 20.5| Semibold  
Body| Regular| 18| 20.5| Semibold  
Caption 1| Regular| 17| 19.5| Semibold  
Caption 2| Regular| 15| 18.5| Semibold  
Footnote 1| Regular| 15| 17.5| Semibold  
Footnote 2| Regular| 14| 16.5| Semibold  
  
#### [xxxLarge](https://developer.apple.com/design/human-interface-guidelines/typography#xxxLarge)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 42| 44.5| Bold  
Title 1| Regular| 40| 42.5| Semibold  
Title 2| Regular| 32| 34.5| Semibold  
Title 3| Regular| 22| 24.5| Semibold  
Headline| Semibold| 19| 21.5| Semibold  
Body| Regular| 19| 21.5| Semibold  
Caption 1| Regular| 18| 20.5| Semibold  
Caption 2| Regular| 17| 19.5| Semibold  
Footnote 1| Regular| 16| 18.5| Semibold  
Footnote 2| Regular| 15| 17.5| Semibold  
  
### [watchOS larger accessibility type sizes](https://developer.apple.com/design/human-interface-guidelines/typography#watchOS-larger-accessibility-type-sizes)

  * AX1 
  * AX2 
  * AX3 



#### [AX1](https://developer.apple.com/design/human-interface-guidelines/typography#AX1)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 44| 46.5| Bold  
Title 1| Regular| 42| 44.5| Semibold  
Title 2| Regular| 34| 41| Semibold  
Title 3| Regular| 24| 26.5| Semibold  
Headline| Semibold| 21| 23.5| Semibold  
Body| Regular| 21| 23.5| Semibold  
Caption 1| Regular| 18| 20.5| Semibold  
Caption 2| Regular| 17| 19.5| Semibold  
Footnote 1| Regular| 16| 18.5| Semibold  
Footnote 2| Regular| 15| 17.5| Semibold  
  
#### [AX2](https://developer.apple.com/design/human-interface-guidelines/typography#AX2)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 45| 47.5| Bold  
Title 1| Regular| 43| 46| Semibold  
Title 2| Regular| 35| 37.5| Semibold  
Title 3| Regular| 25| 27.5| Semibold  
Headline| Semibold| 22| 24.5| Semibold  
Body| Regular| 22| 24.5| Semibold  
Caption 1| Regular| 19| 21.5| Semibold  
Caption 2| Regular| 18| 20.5| Semibold  
Footnote 1| Regular| 17| 19.5| Semibold  
Footnote 2| Regular| 16| 17.5| Semibold  
  
#### [AX3](https://developer.apple.com/design/human-interface-guidelines/typography#AX3)

Style| Weight| Size (points)| Leading (points)| Emphasized weight  
---|---|---|---|---  
Large Title| Regular| 46| 48.5| Bold  
Title 1| Regular| 44| 47| Semibold  
Title 2| Regular| 36| 38.5| Semibold  
Title 3| Regular| 26| 28.5| Semibold  
Headline| Semibold| 23| 25.5| Semibold  
Body| Regular| 23| 25.5| Semibold  
Caption 1| Regular| 20| 22.5| Semibold  
Caption 2| Regular| 19| 21.5| Semibold  
Footnote 1| Regular| 18| 20.5| Semibold  
Footnote 2| Regular| 17| 19.5| Semibold  
  
### [Tracking values](https://developer.apple.com/design/human-interface-guidelines/typography#Tracking-values)

#### [iOS, iPadOS, visionOS tracking values](https://developer.apple.com/design/human-interface-guidelines/typography#iOS-iPadOS-visionOS-tracking-values)

  * SF Pro 
  * SF Pro Rounded 
  * New York 



#### [SF Pro](https://developer.apple.com/design/human-interface-guidelines/typography#SF-Pro)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +41| +0.24  
7| +34| +0.23  
8| +26| +0.21  
9| +19| +0.17  
10| +12| +0.12  
11| +6| +0.06  
12| 0| 0.0  
13| -6| -0.08  
14| -11| -0.15  
15| -16| -0.23  
16| -20| -0.31  
17| -26| -0.43  
18| -25| -0.44  
19| -24| -0.45  
20| -23| -0.45  
21| -18| -0.36  
22| -12| -0.26  
23| -4| -0.10  
24| +3| +0.07  
25| +6| +0.15  
26| +8| +0.22  
27| +11| +0.29  
28| +14| +0.38  
29| +14| +0.40  
30| +14| +0.40  
31| +13| +0.39  
32| +13| +0.41  
33| +12| +0.40  
34| +12| +0.40  
35| +11| +0.38  
36| +10| +0.37  
37| +10| +0.36  
38| +10| +0.37  
39| +10| +0.38  
40| +10| +0.37  
41| +9| +0.36  
42| +9| +0.37  
43| +9| +0.38  
44| +8| +0.37  
45| +8| +0.35  
46| +8| +0.36  
47| +8| +0.37  
48| +8| +0.35  
49| +7| +0.33  
50| +7| +0.34  
51| +7| +0.35  
52| +6| +0.33  
53| +6| +0.31  
54| +6| +0.32  
56| +6| +0.30  
58| +5| +0.28  
60| +4| +0.26  
62| +4| +0.24  
64| +4| +0.22  
66| +3| +0.19  
68| +2| +0.17  
70| +2| +0.14  
72| +2| +0.14  
76| +1| +0.07  
80| 0| 0  
84| 0| 0  
88| 0| 0  
92| 0| 0  
96| 0| 0  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [SF Pro Rounded](https://developer.apple.com/design/human-interface-guidelines/typography#SF-Pro-Rounded)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +87| +0.51  
7| +80| +0.54  
8| +72| +0.57  
9| +65| +0.57  
10| +58| +0.57  
11| +52| +0.56  
12| +46| +0.54  
13| +40| +0.51  
14| +35| +0.48  
15| +30| +0.44  
16| +26| +0.41  
17| +22| +0.37  
18| +21| +0.37  
19| +20| +0.37  
20| +18| +0.36  
21| +17| +0.35  
22| +16| +0.34  
23| +16| +0.35  
24| +15| +0.35  
25| +14| +0.35  
26| +14| +0.36  
27| +14| +0.36  
28| +13| +0.36  
29| +13| +0.37  
30| +12| +0.37  
31| +12| +0.36  
32| +12| +0.38  
33| +12| +0.39  
34| +12| +0.38  
35| +11| +0.38  
36| +11| +0.39  
37| +10| +0.38  
38| +10| +0.39  
39| +10| +0.38  
40| +10| +0.39  
41| +10| +0.38  
42| +10| +0.39  
43| +9| +0.38  
44| +8| +0.37  
45| +8| +0.37  
46| +8| +0.36  
47| +8| +0.37  
48| +8| +0.35  
49| +8| +0.36  
50| +7| +0.34  
51| +6| +0.32  
52| +6| +0.33  
53| +6| +0.31  
54| +6| +0.32  
56| +6| +0.30  
58| +4| +0.25  
60| +4| +0.23  
62| +4| +0.21  
64| +3| +0.19  
66| +2| +0.16  
68| +2| +0.13  
70| +2| +0.14  
72| +2| +0.11  
76| +1| +0.07  
80| 0| 0.00  
84| 0| 0.00  
88| 0| 0.00  
92| 0| 0.00  
96| 0| 0.00  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [New York](https://developer.apple.com/design/human-interface-guidelines/typography#New-York)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +40| +0.23  
7| +32| +0.22  
8| +25| +0.20  
9| +20| +0.18  
10| +16| +0.15  
11| +11| +.12  
12| +6| +0.07  
13| +4| +0.05  
14| +2| +0.03  
15| +0| +0.00  
16| -2| -0.03  
17| -4| -0.07  
18| -6| -0.11  
19| -8| -0.15  
20| -10| -0.20  
21| -10| -0.21  
22| -10| -0.23  
23| -11| -0.25  
24| -11| -0.26  
25| -11| -0.27  
26| -12| -0.29  
27| -12| -0.32  
28| -12| -0.33  
29| -12| -0.34  
30| -12| -0.37  
31| -13| -0.39  
32| -13| -0.41  
33| -13| -0.42  
34| -14| -0.45  
35| -14| -0.48  
36| -14| -0.49  
38| -14| -0.52  
40| -14| -0.55  
42| -14| -0.57  
44| -14| -0.62  
46| -14| -0.65  
48| -14| -0.68  
50| -14| -0.71  
52| -14| -0.74  
54| -15| -0.79  
58| -15| -0.85  
62| -15| -0.91  
66| -15| -0.97  
70| -16| -1.06  
72| -16| -1.09  
80| -16| -1.21  
88| -16| -1.33  
96| -16| -1.50  
100| -16| -1.56  
120| -16| -1.88  
140| -16| -2.26  
160| -16| -2.58  
180| -17| -2.99  
200| -17| -3.32  
220| -18| -3.76  
240| -18| -4.22  
260| -18| -4.57  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [macOS tracking values](https://developer.apple.com/design/human-interface-guidelines/typography#macOS-tracking-values)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +41| +0.24  
7| +34| +0.23  
8| +26| +0.21  
9| +19| +0.17  
10| +12| +0.12  
11| +6| +0.06  
12| 0| 0.0  
13| -6| -0.08  
14| -11| -0.15  
15| -16| -0.23  
16| -20| -0.31  
17| -26| -0.43  
18| -25| -0.44  
19| -24| -0.45  
20| -23| -0.45  
21| -18| -0.36  
22| -12| -0.26  
23| -4| -0.10  
24| +3| +0.07  
25| +6| +0.15  
26| +8| +0.22  
27| +11| +0.29  
28| +14| +0.38  
29| +14| +0.40  
30| +14| +0.40  
31| +13| +0.39  
32| +13| +0.41  
33| +12| +0.40  
34| +12| +0.40  
35| +11| +0.38  
36| +10| +0.37  
37| +10| +0.36  
38| +10| +0.37  
39| +10| +0.38  
40| +10| +0.37  
41| +9| +0.36  
42| +9| +0.37  
43| +9| +0.38  
44| +8| +0.37  
45| +8| +0.35  
46| +8| +0.36  
47| +8| +0.37  
48| +8| +0.35  
49| +7| +0.33  
50| +7| +0.34  
51| +7| +0.35  
52| +6| +0.31  
53| +6| +0.33  
54| +6| +0.32  
56| +6| +0.30  
58| +5| +0.28  
60| +4| +0.26  
62| +4| +0.24  
64| +4| +0.22  
66| +3| +0.19  
68| +2| +0.17  
70| +2| +0.14  
72| +2| +0.14  
76| +1| +0.07  
80| 0| 0  
84| 0| 0  
88| 0| 0  
92| 0| 0  
96| 0| 0  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [tvOS tracking values](https://developer.apple.com/design/human-interface-guidelines/typography#tvOS-tracking-values)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +41| +0.24  
7| +34| +0.23  
8| +26| +0.21  
9| +19| +0.17  
10| +12| +0.12  
11| +6| +0.06  
12| 0| 0.0  
13| -6| -0.08  
14| -11| -0.15  
15| -16| -0.23  
16| -20| -0.31  
17| -26| -0.43  
18| -25| -0.44  
19| -24| -0.45  
20| -23| -0.45  
21| -18| -0.36  
22| -12| -0.26  
23| -4| -0.10  
24| +3| +0.07  
25| +6| +0.15  
26| +8| +0.22  
27| +11| +0.29  
28| +14| +0.38  
29| +14| +0.40  
30| +14| +0.40  
31| +13| +0.39  
32| +13| +0.41  
33| +12| +0.40  
34| +12| +0.40  
35| +11| +0.38  
36| +10| +0.37  
37| +10| +0.36  
38| +10| +0.37  
39| +10| +0.38  
40| +10| +0.37  
41| +9| +0.36  
42| +9| +0.37  
43| +9| +0.38  
44| +8| +0.37  
45| +8| +0.35  
46| +8| +0.36  
47| +8| +0.37  
48| +8| +0.35  
49| +7| +0.33  
50| +7| +0.34  
51| +7| +0.35  
52| +6| +0.31  
53| +6| +0.33  
54| +6| +0.32  
56| +6| +0.30  
58| +5| +0.28  
60| +4| +0.26  
62| +4| +0.24  
64| +4| +0.22  
66| +3| +0.19  
68| +2| +0.17  
70| +2| +0.14  
72| +2| +0.14  
76| +1| +0.07  
80| 0| 0  
84| 0| 0  
88| 0| 0  
92| 0| 0  
96| 0| 0  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x and 216 ppi for @3x designs.

#### [watchOS tracking values](https://developer.apple.com/design/human-interface-guidelines/typography#watchOS-tracking-values)

  * SF Compact 
  * SF Compact Rounded 



#### [SF Compact](https://developer.apple.com/design/human-interface-guidelines/typography#SF-Compact)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +50| +0.29  
7| +30| +0.21  
8| +30| +0.23  
9| +30| +0.26  
10| +30| +0.29  
11| +24| +0.26  
12| +20| +0.23  
13| +16| +0.20  
14| +14| +0.19  
15| +4| +0.06  
16| 0| 0.00  
17| -4| -0.07  
18| -8| -0.14  
19| -12| -0.22  
20| 0| 0.00  
21| -2| -0.04  
22| -4| -0.09  
23| -6| -0.13  
24| -8| -0.19  
25| -10| -0.24  
26| -11| -0.28  
27| -12| -0.30  
28| -12| -0.34  
29| -14| -0.38  
30| -14| -0.42  
31| -15| -0.45  
32| -16| -0.50  
33| -17| -0.55  
34| -18| -0.60  
35| -18| -0.63  
36| -20| -0.69  
37| -20| -0.72  
38| -20| -0.74  
39| -20| -0.76  
40| -20| -0.78  
41| -20| -0.80  
42| -20| -0.82  
43| -20| -0.84  
44| -20| -0.86  
45| -20| -0.88  
46| -20| -0.92  
47| -20| -0.94  
48| -20| -0.96  
49| -21| -1.00  
50| -21| -1.03  
51| -21| -1.05  
52| -21| -1.07  
53| -22| -1.11  
54| -22| -1.13  
56| -22| -1.20  
58| -22| -1.25  
60| -22| -1.32  
62| -22| -1.36  
64| -23| -1.44  
66| -24| -1.51  
68| -24| -1.56  
70| -24| -1.64  
72| -24| -1.69  
76| -25| -1.86  
80| -26| -1.99  
84| -26| -2.13  
88| -26| -2.28  
92| -28| -2.47  
96| -28| -2.62  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x designs.

#### [SF Compact Rounded](https://developer.apple.com/design/human-interface-guidelines/typography#SF-Compact-Rounded)

Size (points)| Tracking (1/1000 em)| Tracking (points)  
---|---|---  
6| +28| +0.16  
7| +26| +0.18  
8| +24| +0.19  
9| +22| +0.19  
10| +20| +0.20  
11| +18| +0.19  
12| +16| +0.19  
13| +14| +0.18  
14| +12| +0.16  
15| +10| +0.15  
16| +8| +0.12  
17| +6| +0.10  
18| +4| +0.07  
19| +2| +0.04  
20| 0| 0.00  
21| -2| -0.04  
22| -4| -0.09  
23| -6| -0.13  
24| -8| -0.19  
25| -10| -0.24  
26| -11| -0.28  
27| -12| -0.30  
28| -12| -0.34  
29| -14| -0.38  
30| -14| -0.42  
31| -15| -0.45  
32| -16| -0.50  
33| -17| -0.55  
34| -18| -0.60  
35| -18| -0.63  
36| -20| -0.69  
37| -20| -0.72  
38| -20| -0.74  
39| -20| -0.76  
40| -20| -0.78  
41| -20| -0.80  
42| -20| -0.82  
43| -20| -0.84  
44| -20| -0.86  
45| -20| -0.88  
46| -20| -0.92  
47| -20| -0.94  
48| -20| -0.96  
49| -21| -1.00  
50| -21| -1.03  
51| -21| -1.05  
52| -21| -1.07  
53| -22| -1.11  
54| -22| -1.13  
56| -22| -1.20  
58| -22| -1.25  
60| -22| -1.32  
62| -22| -1.36  
64| -23| -1.44  
66| -24| -1.51  
68| -24| -1.56  
70| -24| -1.64  
72| -24| -1.69  
76| -25| -1.86  
80| -26| -1.99  
84| -26| -2.13  
88| -26| -2.28  
92| -28| -2.47  
96| -28| -2.62  
  
Not all apps express tracking values as 1/1000 em. Point size based on image resolution of 144 ppi for @2x designs.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/typography#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/typography#Related)

[Fonts for Apple platforms](https://developer.apple.com/fonts/)

[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/typography#Developer-documentation)

[Text input and output](https://developer.apple.com/documentation/SwiftUI/Text-input-and-output) — SwiftUI

[Text display and fonts](https://developer.apple.com/documentation/UIKit/text-display-and-fonts) — UIKit

[Fonts](https://developer.apple.com/documentation/AppKit/fonts) — AppKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/typography#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/C03E6E6D-A32A-41D0-9E50-C3C6059820AA/E4CD1309-352A-444E-96A5-FB5D6BA69725/9167_wide_250x141_1x.jpg) Get started with Dynamic Type ](https://developer.apple.com/videos/play/wwdc2024/10074)

[![](https://devimages-cdn.apple.com/wwdc-services/images/124/F688D32F-15D2-4082-9505-DB2FA7FE0B0B/6736_wide_250x141_1x.jpg) Meet the expanded San Francisco font family ](https://developer.apple.com/videos/play/wwdc2022/110381)

[![](https://devimages-cdn.apple.com/wwdc-services/images/49/EA12E035-968D-4B74-AC8D-26CFD8F365A7/3823_wide_250x141_1x.jpg) The details of UI typography ](https://developer.apple.com/videos/play/wwdc2020/10175)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/typography#Change-log)

Date| Changes  
---|---  
December 16, 2025| Added emphasized weights to the Dynamic Type style specifications for each platform.  
March 7, 2025| Expanded guidance for Dynamic Type.  
June 10, 2024| Added guidance for using Apple’s Unity plug-ins to support Dynamic Type in a Unity-based game and enhanced guidance on billboarding in a visionOS app or game.  
September 12, 2023| Added artwork illustrating system font weights, and clarified tvOS specification table descriptions.  
June 21, 2023| Updated to include guidance for visionOS.  
  
