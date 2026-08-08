---
title: "Icons | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/icons

# Icons

An effective icon is a graphic asset that expresses a single concept in ways people instantly understand.

![A sketch of the Command key icon. The image is overlaid with rectangular and circular grid lines and is tinted yellow to subtly reflect the yellow in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/e71f139e5e50d9d10d91830b0af405c1/foundations-icons-intro%402x.png)

Apps and games use a variety of simple icons to help people understand the items, actions, and modes they can choose. Unlike [app icons](https://developer.apple.com/design/human-interface-guidelines/app-icons), which can use rich visual details like shading, texturing, and highlighting to evoke the app’s personality, an _interface icon_ typically uses streamlined shapes and touches of color to communicate a straightforward idea.

You can design interface icons — also called _glyphs_ — or you can choose symbols from the SF Symbols app, using them as-is or customizing them to suit your needs. Both interface icons and symbols use black and clear colors to define their shapes; the system can apply other colors to the black areas in each image. For guidance, see [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/icons#Best-practices)

**Create a recognizable, highly simplified design.** Too many details can make an interface icon confusing or unreadable. Strive for a simple, universal design that most people will recognize quickly. In general, icons work best when they use familiar visual metaphors that are directly related to the actions they initiate or content they represent.

**Maintain visual consistency across all interface icons in your app.** Whether you use only custom icons or mix custom and system-provided ones, all interface icons in your app need to use a consistent size, level of detail, stroke thickness (or weight), and perspective. Depending on the visual weight of an icon, you may need to adjust its dimensions to ensure that it appears visually consistent with other icons.

![Diagram of four glyphs in a row. From the left, the glyphs are a camera, a heart, an envelope, and an alarm clock. Two horizontal dashed lines show the bottom and top boundaries of the row and a horizontal red line shows the midpoint. All four glyphs are solid black; some include interior detail lines in white. Parts of the alarm clock extend above the top dashed line because its lighter visual weight requires greater height to achieve balance with the other glyphs.](https://docs-assets.developer.apple.com/published/f1cf8ce0ca53b7cb3bce1391a378f6ce/custom-icon-sizes%402x.png)To help achieve visual consistency, adjust individual icon sizes as necessary…

![Diagram of the same four glyphs shown above and the same horizontal dashed lines at top and bottom and horizontal red line through the middle. In this diagram, all four glyphs are solid gray; the interior detail lines are black to emphasize that all lines use the same weight.](https://docs-assets.developer.apple.com/published/91320cdd7a31574df355383d83eb1ceb/custom-icon-line-weights%402x.png)…and use the same stroke weight in every icon.

**In general, match the weights of interface icons and adjacent text.** Unless you want to emphasize either the icons or the text, using the same weight for both gives your content a consistent appearance and level of emphasis.

**If necessary, add padding to a custom interface icon to achieve optical alignment.** Some icons — especially asymmetric ones — can look unbalanced when you center them geometrically instead of optically. For example, the download icon shown below has more visual weight on the bottom than on the top, which can make it look too low if it’s geometrically centered.

![Two images of a white arrow that points down to a white horizontal line segment within a black disk. The image on the right includes two horizontal pink bars — one between the top of the glyph and the top of the disk and the other between the bottom of the glyph and the bottom of the disk — that show the glyph is geometrically centered within the disk.](https://docs-assets.developer.apple.com/published/1c13eed753a1ebcfd6d35929738476c7/asymmetric-glyph%402x.png)An asymmetric icon can look off center even though it’s not.

In such cases, you can slightly adjust the position of the icon until it’s optically centered. When you create an asset that includes your adjustments as padding around an interface icon (as shown below on the right), you can optically center the icon by geometrically centering the asset.

![Two images of a white arrow that points down to a white horizontal line segment within a black disk. The image on the left includes the two horizontal pink bars in the same locations as in the previous illustration, but the glyph has been moved up by a few pixels. The image on the right includes a pink rectangle overlaid on top of the glyph to represent a padding area, which includes the extra pixels below the glyph.](https://docs-assets.developer.apple.com/published/c31bce31456820badff997c95db264c6/asymmetric-glyph-optically-centered%402x.png)Moving the icon a few pixels higher optically centers it; including the pixels in padding simplifies centering.

Adjustments for optical centering are typically very small, but they can have a big impact on your app’s appearance.

![Two images of a white arrow that points down to a white horizontal line segment within a black disk. The glyph on the left is geometrically centered and the one on the right is optically centered.](https://docs-assets.developer.apple.com/published/5d9da37476ee3225a29ce3efbfd86cac/asymmetric-glyph-before-and-after%402x.png)Before optical centering (left) and after optical centering (right).

**Provide a selected-state version of an interface icon only if necessary.** You don’t need to provide selected and unselected appearances for an icon that’s used in standard system components such as toolbars, tab bars, and buttons. The system updates the visual appearance of the selected state automatically.

![An image of two toolbar buttons that share a background. The left button shows the Filter icon in a selected state, using a blue tint color for its background. The right button shows the More icon in an unselected state, using the default appearance for toolbar buttons.](https://docs-assets.developer.apple.com/published/b5c874fca24c428b421c008b29709986/icons-selection-correct%402x.png)In a toolbar, a selected icon receives the app’s accent color.

**Use inclusive images.** Consider how your icons can be understandable and welcoming to everyone. Prefer depicting gender-neutral human figures and avoid images that might be hard to recognize across different cultures or languages. For guidance, see [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion).

**Include text in your design only when it’s essential for conveying meaning.** For example, using a character in an interface icon that represents text formatting can be the most direct way to communicate the concept. If you need to display individual characters in your icon, be sure to localize them. If you need to suggest a passage of text, design an abstract representation of it, and include a flipped version of the icon to use when the context is right-to-left. For guidance, see [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left).

![A partial screenshot of the SF Symbols app showing the info panel for the character symbol, which looks like the capital letter A. Below the image, the following eight localized versions of the symbol are listed: Latin, Arabic, Hebrew, Hindi, Japanese, Korean, Thai, and Chinese.](https://docs-assets.developer.apple.com/published/1037fd04c26206ca1b1dee2e34e123af/character-in-glyph%402x.png)Create localized versions of an icon that displays individual characters.

![A partial screenshot of the SF Symbols app showing the info panel for the text dot page symbol, which looks like three left-aligned horizontal lines inside a rounded rectangle. Below the image, the left-to-right and right-to-left localized versions are shown.](https://docs-assets.developer.apple.com/published/2edc8ff4ae7af79f32543009ba2f7084/abstract-text-in-glyph%402x.png)Create a flipped version of an icon that suggests reading direction.

**If you create a custom interface icon, use a vector format like PDF or SVG.** The system automatically scales a vector-based interface icon for high-resolution displays, so you don’t need to provide high-resolution versions of it. In contrast, PNG — used for app icons and other images that include effects like shading, textures, and highlighting — doesn’t support scaling, so you have to supply multiple versions for each PNG-based interface icon. Alternatively, you can create a custom SF Symbol and specify a scale that ensures the symbol’s emphasis matches adjacent text. For guidance, see [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols).

**Provide alternative text labels for custom interface icons.** Alternative text labels — or accessibility descriptions — aren’t visible, but they let VoiceOver audibly describe what’s onscreen, simplifying navigation for people with visual disabilities. For guidance, see [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover).

**Avoid using replicas of Apple hardware products.** Hardware designs tend to change frequently and can make your interface icons and other content appear dated. If you must display Apple hardware, use only the images available in [Apple Design Resources](https://developer.apple.com/design/resources/) or the SF Symbols that represent various Apple products.

## [Standard icons](https://developer.apple.com/design/human-interface-guidelines/icons#Standard-icons)

For icons to represent common actions in [menus](https://developer.apple.com/design/human-interface-guidelines/menus), [toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), and other places in interfaces across Apple platforms, you can use these [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols).

### [Editing](https://developer.apple.com/design/human-interface-guidelines/icons#Editing)

Action| Icon| Symbol name  
---|---|---  
Cut| ![An icon showing a pair of scissors.](https://docs-assets.developer.apple.com/published/16c5fe84ae743e06cf2d388fc64e0cf4/icons-symbols-meaning-cut%402x.png)| `scissors`  
Copy| ![An icon showing two copies of a document.](https://docs-assets.developer.apple.com/published/a88919c55265efbadeac0df5e16ffd05/icons-symbols-meaning-copy%402x.png)| `document.on.document`  
Paste| ![An icon showing a document in front of a clipboard.](https://docs-assets.developer.apple.com/published/20e32bbb2a3a94eb35d01ddfa9c630e0/icons-symbols-meaning-paste%402x.png)| `document.on.clipboard`  
Done| ![An icon showing a checkmark.](https://docs-assets.developer.apple.com/published/833bd3b8ccdf0e2fee0893b3858ddae5/icons-symbols-meaning-done-save%402x.png)| `checkmark `  
Save  
Cancel| ![An icon showing an X.](https://docs-assets.developer.apple.com/published/b834206c8d155bc1b0d9d17c206c6da3/icons-symbols-meaning-close-cancel%402x.png)| `xmark`  
Close  
Delete| ![An icon showing a trash can.](https://docs-assets.developer.apple.com/published/61f8368d02b05af22d3253a892ced7f3/icons-symbols-meaning-delete%402x.png)| `trash`  
Undo| ![An icon showing an arrow curving toward the top left.](https://docs-assets.developer.apple.com/published/e3e973d07e4cfa983c92e37da5b3e104/icons-symbols-meaning-undo%402x.png)| `arrow.uturn.backward`  
Redo| ![An icon showing an arrow curving toward the top right.](https://docs-assets.developer.apple.com/published/0f263db97ca2b7c31bbbd3cd5682d071/icons-symbols-meaning-redo%402x.png)| `arrow.uturn.forward`  
Compose| ![An icon showing a pencil positioned over a square.](https://docs-assets.developer.apple.com/published/cfac914468b7fa2f287495f8644f3937/icons-symbols-meaning-compose%402x.png)| `square.and.pencil`  
Duplicate| ![An icon showing a square with a plus sign on top of another square.](https://docs-assets.developer.apple.com/published/96323f746d3c67172648745420a15c27/icons-symbols-meaning-duplicate%402x.png)| `plus.square.on.square`  
Rename| ![An icon showing a pencil.](https://docs-assets.developer.apple.com/published/8d3692b6e29cf0cdcb7885af414b2693/icons-symbols-meaning-rename%402x.png)| `pencil`  
Move to| ![An icon showing a folder.](https://docs-assets.developer.apple.com/published/77c3e45c395bf2d2225c85979eca53a8/icons-symbols-meaning-move-to-folder%402x.png)| `folder`  
Folder  
Attach| ![An icon showing a paperclip.](https://docs-assets.developer.apple.com/published/e493eab83f8cc2a6f0aaa2ced386dcff/icons-symbols-meaning-attach%402x.png)| `paperclip`  
Add| ![An icon showing a plus sign.](https://docs-assets.developer.apple.com/published/e0a7d36fc7aecfd6e49a4d0c0cb196af/icons-symbols-meaning-add%402x.png)| `plus`  
More| ![An icon showing an ellipsis.](https://docs-assets.developer.apple.com/published/92e0b17a3881b62008563deb4a2aca40/icons-symbols-meaning-more%402x.png)| `ellipsis`  
  
### [Selection](https://developer.apple.com/design/human-interface-guidelines/icons#Selection)

Action| Icon| Symbol name  
---|---|---  
Select| ![An icon showing a checkmark in a circle.](https://docs-assets.developer.apple.com/published/7eac493b5a3896062a90328117d43e90/icons-symbols-meaning-select-all%402x.png)| `checkmark.circle`  
Deselect| ![An icon showing an X.](https://docs-assets.developer.apple.com/published/b834206c8d155bc1b0d9d17c206c6da3/icons-symbols-meaning-deselect-close%402x.png)| `xmark`  
Close  
Delete| ![An icon showing a trash can.](https://docs-assets.developer.apple.com/published/61f8368d02b05af22d3253a892ced7f3/icons-symbols-meaning-delete%402x.png)| `trash`  
  
### [Text formatting](https://developer.apple.com/design/human-interface-guidelines/icons#Text-formatting)

Action| Icon| Symbol name  
---|---|---  
Superscript| ![An icon showing the capital letter A with the number 1 in the upper right corner.](https://docs-assets.developer.apple.com/published/7e5e3d9b1b0eb6f340f531841d6b27f9/icons-symbols-meaning-superscript%402x.png)| `textformat.superscript`  
Subscript| ![An icon showing the capital letter A with the number 1 in the lower right corner.](https://docs-assets.developer.apple.com/published/aac330c124cac37a78e02d6049943e53/icons-symbols-meaning-subscript%402x.png)| `textformat.subscript`  
Bold| ![An icon showing the capital letter B in bold.](https://docs-assets.developer.apple.com/published/c8695e06d6461e79c145e9b6627f70ac/icons-symbols-meaning-bold%402x.png)| `bold`  
Italic| ![An icon showing the capital letter I in italics.](https://docs-assets.developer.apple.com/published/9f560283ff88d8d1d4b48f278a831b7b/icons-symbols-meaning-italic%402x.png)| `italic`  
Underline| ![An icon showing the capital letter U with an underline.](https://docs-assets.developer.apple.com/published/3b0d371f10bde381bfa1c9a8999797ec/icons-symbols-meaning-underline%402x.png)| `underline`  
​​Align Left| ![An icon showing a stack of four horizontal lines of varying widths that align at the left edge.](https://docs-assets.developer.apple.com/published/68c0ff42aa0ac813b57b663562198e15/icons-symbols-meaning-align-left%402x.png)| `text.alignleft`  
Center| ![An icon showing a stack of four horizontal lines of varying widths that align in the center.](https://docs-assets.developer.apple.com/published/a10b48c850a047efd4a72cc2919c30da/icons-symbols-meaning-align-center%402x.png)| `text.aligncenter`  
Justified| ![An icon showing a stack of four horizontal lines of identical widths.](https://docs-assets.developer.apple.com/published/d71f35b4f71149b0b908dd1ff8cfe01e/icons-symbols-meaning-align-justified%402x.png)| `text.justify`  
Align Right| ![An icon showing a stack of four horizontal lines of varying widths that align at the right edge.](https://docs-assets.developer.apple.com/published/8af1da29f8f3173510521492642a82be/icons-symbols-meaning-align-right%402x.png)| `text.alignright`  
  
### [Search](https://developer.apple.com/design/human-interface-guidelines/icons#Search)

Action| Icon| Symbol name  
---|---|---  
Search| ![An icon showing a magnifying glass.](https://docs-assets.developer.apple.com/published/585f5454757731f942979247bf886ecb/icons-symbols-meaning-search%402x.png)| `magnifyingglass`  
Find| ![An icon showing a magnifying glass above a document.](https://docs-assets.developer.apple.com/published/646c6a152822dde685e52a2791ff672f/icons-symbols-meaning-find%402x.png)| `text.page.badge.magnifyingglass`  
Find and Replace  
Find Next  
Find Previous  
Use Selection for Find  
Filter| ![An icon showing a stack of three horizontal lines decreasing in width from top to bottom.](https://docs-assets.developer.apple.com/published/e0924492d663dac952860673a61f4f96/icons-symbols-meaning-filter%402x.png)| `line.3.horizontal.decrease`  
  
### [Sharing and exporting](https://developer.apple.com/design/human-interface-guidelines/icons#Sharing-and-exporting)

Action| Icon| Symbol name  
---|---|---  
Share| ![An icon showing an arrow pointing up from the middle of square.](https://docs-assets.developer.apple.com/published/b5fa28be3d82955fc380f44783befd32/icons-symbols-meaning-sharing%402x.png)| `square.and.arrow.up`  
Export  
Print| ![An icon showing a printer.](https://docs-assets.developer.apple.com/published/9de4d23e30e6fd8331215dd6dab12878/icons-symbols-meaning-print%402x.png)| `printer`  
  
### [Users and accounts](https://developer.apple.com/design/human-interface-guidelines/icons#Users-and-accounts)

Action| Icon| Symbol name  
---|---|---  
Account| ![An icon showing an abstract representation of a person’s head and shoulders in a circular outline.](https://docs-assets.developer.apple.com/published/512c86a1c2c99bc09991c89c1e535441/icons-symbols-meaning-account-user%402x.png)| `person.crop.circle`  
User  
Profile  
  
### [Ratings](https://developer.apple.com/design/human-interface-guidelines/icons#Ratings)

Action| Icon| Symbol name  
---|---|---  
Dislike| ![An icon showing a hand giving a thumbs down gesture.](https://docs-assets.developer.apple.com/published/189b97655ff655985deec03d0466b898/icons-symbols-meaning-dislike%402x.png)| `hand.thumbsdown`  
Like| ![An icon showing a hand giving a thumbs up gesture.](https://docs-assets.developer.apple.com/published/6f38eef523ffbb4f1d6de22a6a022309/icons-symbols-meaning-like%402x.png)| `hand.thumbsup`  
  
### [Layer ordering](https://developer.apple.com/design/human-interface-guidelines/icons#Layer-ordering)

Action| Icon| Symbol name  
---|---|---  
Bring to Front| ![An icon showing a stack of three squares overlapping each other, with the top square using a solid fill style while the other squares are outlines.](https://docs-assets.developer.apple.com/published/c5da334738c9baf5ddaa0d6ed9de0af6/icons-symbols-meaning-bring-to-front%402x.png)| `square.3.layers.3d.top.filled`  
Send to Back| ![An icon showing a stack of three squares overlapping each other, with the bottom square using a solid fill style while the other squares are outlines.](https://docs-assets.developer.apple.com/published/1006037b6fa15950ca7ceb933dbb4805/icons-symbols-meaning-send-to-back%402x.png)| `square.3.layers.3d.bottom.filled`  
Bring Forward| ![An icon showing a stack of two squares overlapping each other, with the top square using a solid fill style while the other square is an outline.](https://docs-assets.developer.apple.com/published/88b18e0384bca2cd93151169bd507aa3/icons-symbols-meaning-bring-forward%402x.png)| `square.2.layers.3d.top.filled`  
Send Backward| ![An icon showing a stack of two squares overlapping each other, with the bottom square using a solid fill style while the other square is an outline.](https://docs-assets.developer.apple.com/published/49eb0ed5381249d763d30d4e515bc57b/icons-symbols-meaning-send-backwards%402x.png)| `square.2.layers.3d.bottom.filled`  
  
### [Other](https://developer.apple.com/design/human-interface-guidelines/icons#Other)

Action| Icon| Symbol name  
---|---|---  
Alarm| ![An icon showing an alarm clock.](https://docs-assets.developer.apple.com/published/b777cb6bcc99642b037824c78a7efb0e/icons-symbols-meaning-alarm%402x.png)| `alarm`  
Archive| ![An icon showing a file box.](https://docs-assets.developer.apple.com/published/50a3b677d72b3d031ea66d10198bfb59/icons-symbols-meaning-archive%402x.png)| `archivebox`  
Calendar| ![An icon showing a calendar.](https://docs-assets.developer.apple.com/published/4b14bf07cf562405caebedb2e200e3dc/icons-symbols-meaning-calendar%402x.png)| `calendar`  
  
## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/icons#Platform-considerations)

 _No additional considerations for iOS, iPadOS, tvOS, visionOS, or watchOS._

### [macOS](https://developer.apple.com/design/human-interface-guidelines/icons#macOS)

#### [Document icons](https://developer.apple.com/design/human-interface-guidelines/icons#Document-icons)

If your macOS app can use a custom document type, you can create a document icon to represent it. Traditionally, a document icon looks like a piece of paper with its top-right corner folded down. This distinctive appearance helps people distinguish documents from apps and other content, even when icon sizes are small.

If you don’t supply a document icon for a file type you support, macOS creates one for you by compositing your app icon and the file’s extension onto the canvas. For example, Preview uses a system-generated document icon to represent JPG files.

![An image of the Preview document icon for a JPG file.](https://docs-assets.developer.apple.com/published/bfe462604c63811cb542e7c0fc46185e/doc-icon-generated%402x.png)

In some cases, it can make sense to create a set of document icons to represent a range of file types your app handles. For example, Xcode uses custom document icons to help people distinguish projects, AR objects, and Swift code files.

![Image of an Xcode project document icon.](https://docs-assets.developer.apple.com/published/8cd56a7291cd6b41fe391958f704c823/doc-icon-custom-1%402x.png)

![Image of a document icon for an AR object.](https://docs-assets.developer.apple.com/published/a1449177968f693c1bd68c2b146df7c3/doc-icon-custom-2%402x.png)

![Image of a document icon for a Swift file.](https://docs-assets.developer.apple.com/published/495bd043bf65349ec96f6728941386f8/doc-icon-custom-3%402x.png)

To create a custom document icon, you can supply any combination of background fill, center image, and text. The system layers, positions, and masks these elements as needed and composites them onto the familiar folded-corner icon shape.

![A square canvas that contains a grid of pink lines and a jagged white EKG line that runs horizontally across the middle. The pink grid gets lighter in color toward the bottom edge.](https://docs-assets.developer.apple.com/published/2aed446834a2dc6e8275b6bd7a797ca9/doc-icon-parts-background-fill%402x.png)Background fill

![A solid pink heart.](https://docs-assets.developer.apple.com/published/b59c836903d1b409ab9e21f81762df3e/doc-icon-parts-center-image%402x.png)Center image

![The word heart in all caps.](https://docs-assets.developer.apple.com/published/56c5adedc0c08a167a4a03e706924ee6/doc-icon-parts-text%402x.png)Text

![A custom document icon that displays the pink heart and the word heart on top of the pink grid and white EKG line.](https://docs-assets.developer.apple.com/published/d5da9148d27f60891780ab1a9546a111/doc-icon-parts%402x.png)macOS composites the elements you supply to produce your custom document icon.

[Apple Design Resources](https://developer.apple.com/design/resources/#macos-apps) provides a template you can use to create a custom background fill and center image for a document icon. As you use this template, follow the guidelines below.

**Design simple images that clearly communicate the document type.** Whether you use a background fill, a center image, or both, prefer uncomplicated shapes and a reduced palette of distinct colors. Your document icon can display as small as 16x16 px, so you want to create designs that remain recognizable at every size.

**Designing a single, expressive image for the background fill can be a great way to help people understand and recognize a document type.** For example, Xcode and TextEdit both use rich background images that don’t include a center image.

![Image of an Xcode project document icon.](https://docs-assets.developer.apple.com/published/8cd56a7291cd6b41fe391958f704c823/doc-icon-custom-1%402x.png)

![Image of a TextEdit rich text document icon.](https://docs-assets.developer.apple.com/published/f32709a5ff5742e79fd03a58ae1dd9c6/doc-icon-fill-only%402x.png)

**Consider reducing complexity in the small versions of your document icon.** Icon details that are clear in large versions can look blurry and be hard to recognize in small versions. For example, to ensure that the grid lines in the custom heart document icon remain clear in intermediate sizes, you might use fewer lines and thicken them by aligning them to the reduced pixel grid. In the 16x16 px size, you might remove the lines altogether.

![Pixelated image of the heart document icon. The grid, the EKG line, the heart shape, and the word heart are visible but blurry.](https://docs-assets.developer.apple.com/published/1f8bc7946a75363224f373924b557a3a/doc-icon-fewer-details-1%402x.png)The 32x32 px icon has fewer grid lines and a thicker EKG line.

![Pixelated image of the heart document icon, in which only the blurry heart shape and EKG line are visible.](https://docs-assets.developer.apple.com/published/e46ac887801d9a16393948c3f2098715/doc-icon-fewer-details-2%402x.png)The 16x16 px @2x icon retains the EKG line but has no grid lines.

![Pixelated image of the heart document icon, in which only the blurry heart shape is visible.](https://docs-assets.developer.apple.com/published/fd0d2afcd76a9b25c1217ef2ffb1ad0e/doc-icon-fewer-details-3%402x.png)The 16x16 px @1x icon has no EKG line and no grid lines.

**Avoid placing important content in the top-right corner of your background fill.** The system automatically masks your image to fit the document icon shape and draws the white folded corner on top of the fill. Create a set of background images in the sizes listed below.

  * 512x512 px @1x, 1024x1024 px @2x

  * 256x256 px @1x, 512x512 px @2x

  * 128x128 px @1x, 256x256 px @2x

  * 32x32 px @1x, 64x64 px @2x

  * 16x16 px @1x, 32x32 px @2x




**If a familiar object can convey a document’s type or its connection with your app, consider creating a center image that depicts it.** Design a simple, unambiguous image that’s clear and recognizable at every size. The center image measures half the size of the overall document icon canvas. For example, to create a center image for a 32x32 px document icon, use an image canvas that measures 16x16 px. You can provide center images in the following sizes:

  * 256x256 px @1x, 512x512 px @2x

  * 128x128 px @1x, 256x256 px @2x

  * 32x32 px @1x, 64x64 px @2x

  * 16x16 px @1x, 32x32 px @2x




**Define a margin that measures about 10% of the image canvas and keep most of the image within it.** Although parts of the image can extend into this margin for optical alignment, it’s best when the image occupies about 80% of the image canvas. For example, most of the center image in a 256x256 px canvas would fit in an area that measures 205x205 px.

![Diagram of the solid pink heart shape within blue margins that measure 10 percent of the canvas width.](https://docs-assets.developer.apple.com/published/7cc19b2ae1e99d26ba69e1351683ede1/doc-icon-parts-margins%402x.png)

**Specify a succinct term if it helps people understand your document type.** By default, the system displays a document’s extension at the bottom edge of the document icon, but if the extension is unfamiliar you can supply a more descriptive term. For example, the document icon for a SceneKit scene file uses the term _scene_ instead of the file extension _scn_. The system automatically scales the extension text to fit in the document icon, so be sure to use a term that’s short enough to be legible at small sizes. By default, the system capitalizes every letter in the text.

![Image of a SceneKit scene document icon.](https://docs-assets.developer.apple.com/published/3b4bb7de9edb5870d3a162aae8153163/doc-icon-custom-extension%402x.png)

## [Resources](https://developer.apple.com/design/human-interface-guidelines/icons#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/icons#Related)

[App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)

[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/icons#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/7/597D59A1-F123-4B08-BEE1-6D79A4C22268/1914_wide_250x141_1x.jpg) Designing Glyphs ](https://developer.apple.com/videos/play/wwdc2017/823)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/icons#Change-log)

Date| Changes  
---|---  
June 9, 2025| Added a table of SF Symbols that represent common actions.  
June 21, 2023| Updated to include guidance for visionOS.  
  
