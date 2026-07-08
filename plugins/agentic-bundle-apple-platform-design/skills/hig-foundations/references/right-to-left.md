---
title: "Right to left | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/right-to-left

# Right to left

Support right-to-left languages like Arabic and Hebrew by reversing your interface as needed to match the reading direction of the related scripts.

![A sketch of a right-aligned bulleted list within a window, suggesting an interface displayed in a right-to-left language. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/5d683460f2af897b631f4dad86fd3473/foundations-rtl-intro%402x.png)

When people choose a language for their device — or just your app or game — they expect the interface to adapt in various ways (to learn more, see [Localization](https://developer.apple.com/localization/)).

System-provided UI frameworks support right-to-left (RTL) by default, allowing system-provided UI components to flip automatically in the RTL context. If you use system-provided elements and standard layouts, you might not need to make any changes to your app’s automatically reversed interface.

If you want to fine-tune your layout or enhance specific localizations to adapt to different currencies, numerals, or mathematical symbols that can occur in various locales in countries that use RTL languages, follow these guidelines.

## [Text alignment](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Text-alignment)

**Adjust text alignment to match the interface direction, if the system doesn’t do so automatically.** For example, if you left-align text with content in the left-to-right (LTR) context, right-align the text to match the content’s mirrored position in the RTL context.

![An illustration showing a layout of text and images in an interface. Three bars that represent text are left-aligned above a rounded rectangle area. A placeholder image is centered in the area, above another bar at the bottom edge. The bar inside the area is left-aligned.](https://docs-assets.developer.apple.com/published/7bdc0741a96d6e2aa88b79c64e151c8a/text-alignment-ltr-screen%402x.png)Left-aligned text in the LTR context

![An illustration showing a layout of text and images in an interface. Three bars that represent text are right-aligned above a rounded rectangle area. A placeholder image is centered in the area, above another bar at the bottom edge. The bar inside the area is right-aligned. The placeholder image isn't flipped.](https://docs-assets.developer.apple.com/published/10386033d677b3fd65ec33ac16d67e56/text-alignment-rtl-screen%402x.png)Right-aligned content in the RTL context

**Align a paragraph based on its language, not on the current context.** When the alignment of a paragraph — defined as three or more lines of text — doesn’t match its language, it can be difficult to read. For example, right-aligning a paragraph that consists of LTR text can make the beginning of each line difficult to see. To improve readability, continue aligning one- and two-line text blocks to match the reading direction of the current context, but align a paragraph to match its language.

![An image showing two paragraphs of placeholder copy. The first paragraph is in Arabic and is right-aligned. The second paragraph is in English and is left-aligned.](https://docs-assets.developer.apple.com/published/b32ae443b1d7daa1bb661b56b42b8a34/paragraph-alignment-correct%402x.png)A left-aligned paragraph in the RTL context

![A checkmark in a circle to indicate a correct example.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![An image showing two paragraphs of placeholder copy. The first paragraph is in Arabic and the second paragraph is in English. Both paragraphs are right-aligned.](https://docs-assets.developer.apple.com/published/738bda44c81a146b02cbd67db5985ff2/paragraph-alignment-wrong%402x.png)A right-aligned paragraph in the RTL context

![An X in a circle to indicate an incorrect example.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

**Use a consistent alignment for all text items in a list.** To ensure a comfortable reading and scanning experience, reverse the alignment of all items in a list, including items that are displayed in a different script.

![An illustration of a right-aligned list of gray bars that represent right-to-left text.](https://docs-assets.developer.apple.com/published/8e497bdc80a98b7896b492d2e5bfb57b/mixed-script-list-alignment-correct%402x.png)Right-aligned content in the RTL context

![A checkmark in a circle to indicate a correct example.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![An illustration of a list of gray bars. The first, third, fourth, and fifth bars represent right-to-left text. The second bar is incorrectly left-aligned.](https://docs-assets.developer.apple.com/published/8764f467c4870522419bb26fa5894c09/mixed-script-list-alignment-wrong%402x.png)Mixed alignment in the RTL content

![An X in a circle to indicate an incorrect example.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

## [Numbers and characters](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Numbers-and-characters)

Different RTL languages can use different number systems. For example, Hebrew text uses Western Arabic numerals, whereas Arabic text might use either Western or Eastern Arabic numerals. The use of Western and Eastern Arabic numerals varies among countries and regions and even among areas within the same country or region.

If your app covers mathematical concepts or other number-centric topics, it’s a good idea to identify the appropriate way to display such information in each locale you support. In contrast, apps that don’t address number-related topics can generally rely on system-provided number representations.

![From the left, the numerals one, two, and three in Western Arabic numerals.](https://docs-assets.developer.apple.com/published/c40d3d208a9aee56d680d6915fb44fff/textformat-123-ltr%402x.png)Western Arabic numerals

![From the right, the numerals one, two, and three in Eastern Arabic numerals.](https://docs-assets.developer.apple.com/published/8a9f9c2f6fb291304a5d93e27be0bead/textformat-123-ar%402x.png)Eastern Arabic numerals

**Don’t reverse the order of numerals in a specific number.** Regardless of the current language or the surrounding content, the digits in a specific number — such as “541,” a phone number, or a credit card number — always appear in the same order.

![From the left, the two words order and number followed by the number 123456 in Latin script.](https://docs-assets.developer.apple.com/published/e6ae8d9dab2a6da825829cf88bfb6adb/latin-numerals%402x.png)Latin

![From the right, the two words order and number followed by the number 12345 in Hebrew script.](https://docs-assets.developer.apple.com/published/8b4b0b82384424720d861865ac61ad37/hebrew-numerals%402x.png)Hebrew

![From the right, the two words order and number in Arabic script, followed by the number 12345 in Western Arabic numerals.](https://docs-assets.developer.apple.com/published/427e50992b8e4900fa7f64c73ad8c0b1/western-arabic-numerals%402x.png)Arabic (Western Arabic numerals)

![From the right, the two words order and number in Arabic script, followed by the number 12345 in Eastern Arabic numerals.](https://docs-assets.developer.apple.com/published/6edfa8597370c06b66cdbbaae728f97b/eastern-arabic-numerals%402x.png)Arabic (Eastern Arabic numerals)

**Reverse the order of numerals that show progress or a counting direction; never flip the numerals themselves.** Controls like progress bars, sliders, and rating controls often include numerals to clarify their meaning. If you use numerals in this way, be sure to reverse the order of the numerals to match the direction of the flipped control. Also reverse a sequence of numerals if you use the sequence to communicate a specific order.

![A horizontal row of five stars. From the left, the first three and a half stars are filled. Below the stars is a row of Latin numerals, each numeral vertically aligned with a star above. From the left, the numerals are one, two, three, four, and five.](https://docs-assets.developer.apple.com/published/d249f8e9df8a8dfcf1526dc3f5c4dd5b/match-numeral-order-to-directional-controls-latin%402x.png)Latin

![A horizontal row of five stars. From the right, the first three and a half stars are filled. Below the stars is a row of Eastern Arabic numerals, each numeral vertically aligned with a star above. From the right, the numerals are one, two, three, four, and five.](https://docs-assets.developer.apple.com/published/77bb1e2c8c704fa2235bd7cc8d7acf31/match-numeral-order-to-directional-controls-eastern-arabic%402x.png)Arabic (Eastern Arabic numerals)

![A horizontal row of five stars. From the right, the first three and a half stars are filled. Below the stars is a row of Western Arabic numerals, each numeral vertically aligned with a star above. From the right, the numerals are one, two, three, four, and five.](https://docs-assets.developer.apple.com/published/164c27556e186de5aa0c0312639f1c8f/match-numeral-order-to-directional-controls-western-arabic-hebrew%402x.png)Hebrew

![A horizontal row of five stars. From the right, the first three and a half stars are filled. Below the stars is a row of Western Arabic numerals, each numeral vertically aligned with a star above. From the right, the numerals are one, two, three, four, and five.](https://docs-assets.developer.apple.com/published/164c27556e186de5aa0c0312639f1c8f/match-numeral-order-to-directional-controls-western-arabic-hebrew%402x.png)Arabic (Western Arabic numerals)

## [Controls](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Controls)

**Flip controls that show progress from one value to another.** Because people tend to view forward progress as moving in the same direction as the language they read, it makes sense to flip controls like sliders and progress indicators in the RTL context. When you do this, also be sure to reverse the positions of the accompanying glyphs or images that depict the beginning and ending values of the control.

![An illustration of a volume control slider. The left side has a right-facing speaker glyph with no sound emerging, and the right side has a right-facing speaker glyph with sound waves projecting from it, showing that moving the thumb from left to right makes the volume louder.](https://docs-assets.developer.apple.com/published/7ef757b48788617e37c2a275b6b47f6d/flipped-directional-control-ltr%402x.png)A directional control in the LTR context

![An illustration of a volume control slider. The right side has a left-facing speaker glyph with no sound emerging, and the left side has a left-facing speaker glyph with sound waves projecting from it, showing that moving the thumb from right to left makes the volume louder.](https://docs-assets.developer.apple.com/published/b5619e5a9fb04db70e26dac8c20313b2/flipped-directional-control-rtl%402x.png)A directional control in the RTL context

**Flip controls that help people navigate or access items in a fixed order.** For example, in the RTL context, a back button must point to the right so the flow of screens matches the reading order of the RTL language. Similarly, next or previous buttons that let people access items in an ordered list need to flip in the RTL context to match the reading order.

**Preserve the direction of a control that refers to an actual direction or points to an onscreen area.** For example, if you provide a control that means “to the right,” it must always point right, regardless of the current context.

**Visually balance adjacent Latin and RTL scripts when necessary.** In buttons, labels, and titles, Arabic or Hebrew text can appear too small when next to uppercased Latin text, because Arabic and Hebrew don’t include uppercase letters. To visually balance Arabic or Hebrew text with Latin text that uses all capitals, it often works well to increase the RTL font size by about 2 points.

![A horizontal row of three blue oval buttons. Each button is labeled with the word download. From the left, the labels are in Latin, Arabic, and Hebrew scripts, with the English label using all capital letters. Two horizontal red lines run across all three buttons, the top line is the ascender line and the bottom line is the baseline. Every letter in the English label touches both lines. Only the last two letters in the Arabic label touch or extend below the baseline; only the last letter touches the ascender line. No letters in the Hebrew label touch either line. In comparison with the Latin label, both the Arabic and Hebrew labels look small.](https://docs-assets.developer.apple.com/published/190b48a71d8d934047905be986732fb4/download-uneven-vertical-height%402x.png)Arabic and Hebrew text can look too small next to uppercased Latin text of the same font size.

![A horizontal row of three blue oval buttons. Each button is labeled with the word download. From the left, the labels are in Latin, Arabic, and Hebrew scripts, with the English label using all capital letters. Two horizontal red lines run across all three buttons, the top line is the ascender line and the bottom line is the baseline. Every letter in the English label touches both lines. The last two letters in the Arabic label touch or extend below the baseline, and the first and last letters extend above the ascender line. All letters in the Hebrew label touch the base line and the ascender line. The increased size of the Arabic and Hebrew labels make them look similar in size to the Latin label.](https://docs-assets.developer.apple.com/published/19099f313875cd49849a1ca28f1dfca4/download-even-vertical-height%402x.png)You can slightly increase the font size of Arabic and Hebrew text to visually balance uppercased Latin text.

## [Images](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Images)

**Avoid flipping images like photographs, illustrations, and general artwork.** Flipping an image often changes the image’s meaning; flipping a copyrighted image could be a violation. If an image’s content is strongly connected to reading direction, consider creating a new version of the image instead of flipping the original.

![A simplified illustration of a globe that uses solid black shapes to show most of Africa, Europe, Asia, Australia, and Antarctica.](https://docs-assets.developer.apple.com/published/ca80fd6003c4ebff97714123a33c974e/image-displayed-right%402x.png)

![A checkmark in a circle to indicate a correct example.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![A simplified illustration of a globe that shows a horizontally flipped Eastern hemisphere with Africa on the far right and Australia on the far left.](https://docs-assets.developer.apple.com/published/0310648a2b1ff40a796e5544d057d30b/image-displayed-wrong%402x.png)

![An X in a circle to indicate an incorrect example.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

**Reverse the positions of images when their order is meaningful.** For example, if you display multiple images in a specific order like chronological, alphabetical, or favorite, reverse their positions to preserve the order’s meaning in the RTL context.

![An illustration showing a layout of text and images within a rounded rectangle. A short bar representing text is left-aligned in the upper-left corner. Below the bar is an area that contains four squares, including a blue square with a placeholder image on the left side. From the left, a row of five square areas at the bottom of the rectangle contain the following shapes: heart, circle, star, square, and triangle.](https://docs-assets.developer.apple.com/published/f8e833e7f73aa3f6ce268dd33f174862/image-positions-ltr%402x.png)Items with meaningful positions in the LTR context

![An illustration showing a layout of text and images within a rounded rectangle. A short bar representing text is right-aligned in the upper-right corner. Below the bar is an area that contains four squares, including a blue square with a placeholder image on the right side. From the right, a row of five square areas at the bottom of the rectangle contain the following shapes: heart, circle, star, square, and triangle.](https://docs-assets.developer.apple.com/published/5071b9cf5e2c0a2395803018149eab87/image-positions-rtl%402x.png)Items with meaningful positions in the RTL context

## [Interface icons](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Interface-icons)

When you use [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) to supply interface icons for your app, you get variants for the RTL context and localized symbols for Arabic and Hebrew, among other languages. If you create custom symbols, you can specify their directionality. For developer guidance, see [Creating custom symbol images for your app](https://developer.apple.com/documentation/UIKit/creating-custom-symbol-images-for-your-app).

![Three horizontal lines, stacked evenly on top of each other. Each line is preceded by a bullet on left. The shape of a closed book with its spine on the left. A rounded rectangle containing a left-aligned row of three dots. A pencil is slanted at about forty-five degrees, with its point right of the rightmost dot and its eraser extending out of the top-right corner of the rectangle. A rounded rectangle with a black bar across the top that occupies about a quarter of the rectangle's height. A left-aligned row of white dots is in the left side of the bar. A rounded rectangle that contains a smaller, solid-black rounded rectangle near the left side. Outside the rectangle and to the right is a solid-black semicircle with a vertical straight edge that's close to the vertical right side of the rectangle.](https://docs-assets.developer.apple.com/published/eec2236f5595e04904c2b5494696ec1b/directional-symbols-ltr%402x.png)LTR variants of directional symbols

![Three horizontal lines, stacked evenly on top of each other. Each line is preceded by a bullet on right. The shape of a closed book with its spine on the right. A rounded rectangle containing a right-aligned row of three dots. A pencil is slanted at about forty-five degrees, with its point left of the leftmost dot and its eraser extending out of the middle of the rectangle's top. A rounded rectangle with a black bar across the top that occupies about a quarter of the rectangle's height. A right-aligned row of white dots is in the right side of the bar. A rounded rectangle that contains a smaller, solid-black rounded rectangle near the right side. Outside the rectangle and to the left is a solid-black semicircle with a vertical straight edge that's close to the vertical left side of the rectangle.](https://docs-assets.developer.apple.com/published/9f036ccf7a0ca74375f080c94feb77a3/directional-symbols-rtl%402x.png)RTL variants of directional symbols

**Flip interface icons that represent text or reading direction.** For example, if an interface icon uses left-aligned bars to represent text in the LTR context, right-align the bars in the RTL context.

![A rounded rectangle that contains three horizontal left-aligned lines.](https://docs-assets.developer.apple.com/published/298befd594e841846cd466f60d2bea6a/doc-plaintext-ltr%402x.png)LTR variant of a symbol that represents text

![A rounded rectangle that contains three horizontal right-aligned lines.](https://docs-assets.developer.apple.com/published/bfae7054f6aec52f1a63e31b6c0db79d/doc-plaintext-rtl%402x.png)RTL variant of a symbol that represents text

**Consider creating a localized version of an interface icon that displays text.** Some interface icons include letters or words to help communicate a script-related concept, like font-size choice or a signature. If you have a custom interface icon that needs to display actual text, consider creating a localized version. For example, SF Symbols offers different versions of the signature, rich-text, and I-beam pointer symbols for use with Latin, Hebrew, and Arabic text, among others.

![A small X left-aligned above a horizontal line. A stylized signature begins at the X and finishes at the right end of the line. A rounded rectangle containing a capital letter A in the top-left corner and a stack of two horizontal lines in the top-right corner. A placeholder image appears in the bottom half of the rectangle. A large capital letter A to the left of a tall I-beam cursor.](https://docs-assets.developer.apple.com/published/431f27ff945804173931cfd38f595b2c/text-icon-localized-latin%402x.png)Latin

![A small X right-aligned above a horizontal line. A stylized signature begins at the X and finishes at the left end of the line. A rounded rectangle containing the letter Alef in the top-right corner and a stack of two horizontal lines in the top-left corner. A placeholder image appears in the bottom half of the rectangle. A large letter Alef to the right of a tall I-beam cursor.](https://docs-assets.developer.apple.com/published/b457fc7b677ccbf085cd1ea1d8bc5601/text-icon-localized-hebrew%402x.png)Hebrew

![A small X right-aligned above a horizontal line. A stylized signature begins at the X and finishes at the left end of the line. A rounded rectangle containing the letter Ain in the top-right corner and a stack of two horizontal lines in the top-left corner. A placeholder image appears in the bottom half of the rectangle. A large letter Dad to the right of a tall I-beam cursor.](https://docs-assets.developer.apple.com/published/7c91fa369eb21255aed0a545bcf9b62d/text-icon-localized-arabic%402x.png)Arabic

If you have a custom interface icon that uses letters or words to communicate a concept unrelated to reading or writing, consider designing an alternative image that doesn’t use text.

**Flip an interface icon that shows forward or backward motion.** When something moves in the same direction that people read, they typically interpret that direction as forward; when something moves in the opposite direction, people tend to interpret the direction as backward. An interface icon that depicts an object moving forward or backward needs to flip in the RTL context to preserve the meaning of the motion. For example, an icon that represents a speaker typically shows sound waves emanating forward from the speaker. In the LTR context, the sound waves come from the left, so in the RTL context, the icon needs to flip to show the waves coming from the right.

![The outline of a speaker with three concentric curved lines emanating to the right.](https://docs-assets.developer.apple.com/published/d43d629eea61239a9268d6616551b48c/speaker-wave-3-ltr%402x.png)LTR variant of a symbol that depicts forward motion

![The outline of a speaker with three concentric curved lines emanating to the left.](https://docs-assets.developer.apple.com/published/d10bb4c00b214c16a802183377134b59/speaker-wave-3-rtl%402x.png)RTL variant of a symbol that depicts forward motion

**Don’t flip logos or universal signs and marks.** Displaying a flipped logo confuses people and can have legal repercussions. Always display a logo in its original form, even if it includes text. People expect universal symbols and marks like the checkmark to have a consistent appearance, so avoid flipping them.

![A rounded square that contains the black Apple TV logo, which consists of a solid black apple to the left of the lowercase letters T and V.](https://docs-assets.developer.apple.com/published/7c7eb6d19b63d77412c7754893c0f65c/appletv-ltr%402x.png)A logo

![A checkmark.](https://docs-assets.developer.apple.com/published/31cfb3b8b93a1747eddac562a979a9cb/checkmark-ltr%402x.png)A universal symbol or mark

**In general, avoid flipping interface icons that depict real-world objects.** Unless you use the object to indicate directionality, it’s best to avoid flipping an icon that represents a familiar item. For example, clocks work the same everywhere, so a traditional clock interface icon needs to look the same regardless of language direction. Some interface icons might seem to reference language or reading direction because they represent items that are slanted for right-handed use. However, most people are right-handed, so flipping an icon that shows a right-handed tool isn’t necessary and might be confusing.

![A black disk with two white lines in the nine o'clock position.](https://docs-assets.developer.apple.com/published/2d167db99027c9f44270a86a273f225f/clock-fill-ltr%402x.png)

![A pencil with an eraser, slanted at about forty-five degrees with the point in the bottom-left.](https://docs-assets.developer.apple.com/published/6597719e77e19638bb265cd6c58f9a8a/pencil-ltr%402x.png)

![The silhouette of a game controller with a white plus sign on the left and two white buttons on the right.](https://docs-assets.developer.apple.com/published/c3f51c228de248bf096aae7164836eab/gamecontroller-fill-ltr%402x.png)

**Before merely flipping a complex custom interface icon, consider its individual components and the overall visual balance.** In some cases, a component — like a badge, slash, or magnifying glass — needs to adhere to a visual design language regardless of localization. For example, SF Symbols maintains visual consistency by using the same backslash to represent the prohibition or negation of a symbol’s meaning in both LTR and RTL versions.

![A silhouette of a speaker pointing right with a backslash on top of it.](https://docs-assets.developer.apple.com/published/0557fd6fd8fc1b2c347cd869baa6ae0e/speaker-slash-fill-ltr%402x.png)LTR variant of a symbol that includes a backslash

![A silhouette of a speaker pointing left with a backslash on top of it.](https://docs-assets.developer.apple.com/published/42dc822fc59ebc4c8d02d6e6c7fa0959/speaker-slash-fill-rtl%402x.png)RTL variant of a symbol that includes a backslash

In other cases, you might need to flip a component (or its position) to ensure the localized version of the icon still makes sense. For example, if a badge represents the actual UI that people see in your app, it needs to flip if your UI flips. Alternatively, if a badge modifies the meaning of an interface icon, consider whether flipping the badge preserves both the modified meaning and the overall visual balance of the icon. In the images shown below, the badge doesn’t depict an object in the UI, but keeping it in the top-right corner visually unbalances the cart.

![A silhouette of a wheeled shopping cart that faces right. A white plus sign inside a black disk is in the top-right corner.](https://docs-assets.developer.apple.com/published/faa9849953c7b1b1470db91ed25125d0/cart-fill-badge-plus-ltr%402x.png)

![A checkmark in a circle to indicate a correct example.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![A silhouette of a wheeled shopping cart that faces left. A white plus sign inside a black disk is in the top-right corner.](https://docs-assets.developer.apple.com/published/c065f8369e681461bc34ea590b80994b/cart-fill-badge-rtl-unbalanced%402x.png)

![An X in a circle to indicate an incorrect example.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![A silhouette of a wheeled shopping cart that faces left. A white plus sign inside a black disk is in the top-left corner.](https://docs-assets.developer.apple.com/published/97251e1850265c3b1d654d1e4631ca74/cart-fill-badge-plus-rtl%402x.png)

![A checkmark in a circle to indicate a correct example.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

If your custom interface icon includes a component that can imply handedness, like a tool, consider preserving the orientation of the tool while flipping the base image if necessary.

![A rounded rectangle that contains a black dot in the top-right corner. The outline of a magnifying glass that contains a stack of two left-aligned lines is on top of the rectangle and to the left of the dot, slanted at about 135 degrees.](https://docs-assets.developer.apple.com/published/0c8dd8148be262162bb75a017e2ae197/mail-and-text-magnifyingglass-ltr%402x.png)LTR variant of a symbol that depicts a tool

![A rounded rectangle that contains a black dot in the top-left corner. The outline of a magnifying glass that contains a stack of two rightt-aligned lines is on top of the rectangle and to the right of the dot, slanted at about 135 degrees.](https://docs-assets.developer.apple.com/published/f3ca739120456691b67e55d150596716/mail-and-text-magnifyingglass-rtl%402x.png)RTL variant of a symbol that depicts a tool

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Related)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

[Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion)

[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Developer-documentation)

[Localization](https://developer.apple.com/localization/)

[Preparing views for localization](https://developer.apple.com/documentation/SwiftUI/Preparing-views-for-localization) — SwiftUI

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/right-to-left#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/4498DDBC-5903-48A6-85EB-47BCACA39DFB/9915_wide_250x141_1x.jpg) Enhance your app’s multilingual experience ](https://developer.apple.com/videos/play/wwdc2025/222)

[![](https://devimages-cdn.apple.com/wwdc-services/images/124/7F5167EA-F6A3-4605-83FF-FF75E802969C/6527_wide_250x141_1x.jpg) Design for Arabic ](https://developer.apple.com/videos/play/wwdc2022/10034)

