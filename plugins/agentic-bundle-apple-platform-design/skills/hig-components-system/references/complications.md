---
title: "Complications | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/complications

# Complications

A complication displays timely, relevant information on the watch face, where people can view it each time they raise their wrist.

![A stylized representation of an Apple Watch face that includes the time and a set of differently sized complications with labels. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/0da5c74b1de3ab3c76a9f7ff332dec5d/components-complications-intro%402x.png)

People often prefer apps that provide multiple, powerful complications, because it gives them quick ways to view the data they care about, even when they don’t open the app.

Most watch faces can display at least one complication; some can display four or more.

Starting in watchOS 9, the system organizes complications (also known as _accessories_) into several families — like [circular](https://developer.apple.com/design/human-interface-guidelines/complications#Circular) and [inline](https://developer.apple.com/design/human-interface-guidelines/complications#Inline) — and defines some recommended layouts you can use to display your complication data. A watch face can specify the family it supports in each complication slot. Complications that work in earlier versions of watchOS can use the [legacy templates](https://developer.apple.com/design/human-interface-guidelines/complications#Legacy-templates), which define nongraphic complication styles that don’t take on a wearer’s selected color.

Developer note

Prefer using [WidgetKit](https://developer.apple.com/documentation/WidgetKit) to develop complications for watchOS 9 and later. For guidance, see [Migrating ClockKit complications to WidgetKit](https://developer.apple.com/documentation/WidgetKit/Converting-A-ClockKit-App). To support earlier versions of watchOS, continue to implement the ClockKit complication data source protocol (see [`CLKComplicationDataSource`](https://developer.apple.com/documentation/ClockKit/CLKComplicationDataSource)).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/complications#Best-practices)

**Identify essential, dynamic content that people want to view at a glance.** Although people can use a complication to quickly launch an app, the complication behavior they appreciate more is the display of relevant information that always feels up to date. A static complication that doesn’t display meaningful data may be less likely to remain in a prominent position on the watch face.

**Support all complication families when possible.** Supporting more families means that your complications are available on more watch faces. If you can’t display useful information for a particular complication family, provide an image that represents your app — like your app icon — that still lets people launch your app from the watch face.

**Consider creating multiple complications for each family.** Supporting multiple complications helps you take advantage of shareable watch faces and lets people configure a watch face that’s centered on an app they love. For example, an app that helps people train for triathlons could offer three circular complications — one for each segment of the race — each of which deep-links to the segment-specific area in the app. This app could also offer a shareable watch face that’s preconfigured to include its swimming, biking, and running complications and to use its custom images and colors. When people choose this watch face, they don’t have to do any configuration before they can start using it. For guidance, see [Watch faces](https://developer.apple.com/design/human-interface-guidelines/watch-faces).

**Define a different deep link for each complication you support.** It works well when each complication opens your app to the most relevant area. If all the complications you support open the same area in your app, they can seem less useful.

**Keep privacy in mind.** With the Always-On Retina display, information on the watch face might be visible to people other than the wearer. Make sure you help people prevent potentially sensitive information from being visible to others. For guidance, see [Always On](https://developer.apple.com/design/human-interface-guidelines/always-on).

**Carefully consider when to update data.** You provide a complication’s data in the form of a timeline where each entry has a value that specifies the time at which to display your data on the watch face. Different data sets might require different time values. For example, a meeting app might display information about an upcoming meeting an hour before the meeting starts, but a weather app might display forecast information at the time those conditions are expected to occur. You can update the timeline a limited number of times each day, and the system stores a limited number of timeline entries for each app, so you need to choose times that enhance the usefulness of your data. For developer guidance, see [Migrating ClockKit complications to WidgetKit](https://developer.apple.com/documentation/WidgetKit/Converting-A-ClockKit-App#Configure-your-timeline-provider).

## [Visual design](https://developer.apple.com/design/human-interface-guidelines/complications#Visual-design)

**Choose a ring or gauge style based on the data you need to display.** Many families support a ring or gauge layout that provides consistent ways to represent numerical values that can change over time. For example:

  * The closed style can convey a value that’s a percentage of a whole, such as for a battery gauge.

  * The open style works well when the minimum and maximum values are arbitrary — or don’t represent a percentage of the whole — like for a speed indicator.

  * Similar to the open style, the segmented style also displays values within an app-defined range, and can convey rapid value changes, such as in the Noise complication.




**Make sure images look good in tinted mode.** In tinted mode, the system applies a solid color to a complication’s text, gauges, and images, and desaturates full-color images unless you provide tinted versions of them. For developer guidance, see [`WidgetRenderingMode`](https://developer.apple.com/documentation/WidgetKit/WidgetRenderingMode). (If you’re using legacy templates, tinted mode applies only to graphic complications.) To help your complications perform well in tinted mode:

  * Avoid using color as the only way to communicate important information. You want people to get the same information in tinted mode as they do in nontinted mode.

  * When necessary, provide an alternative tinted-mode version of a full-color image. If your full-color image doesn’t look good when it’s desaturated, you can supply a different version of the image for the system to use in tinted mode.




**Recognize that people might prefer to use tinted mode for complications, instead of viewing them in full color.** When people choose tinted mode, the system automatically desaturates your complication, converting it to grayscale and tinting its images, gauges, and text using a single color that’s based on the wearer’s selected color.

**When creating complication content, generally use line widths of two points or greater.** Thinner lines can be difficult to see at a glance, especially when the wearer is in motion. Use line weights that suit the size and complexity of the image.

**Provide a set of static placeholder images for each complication you support.** The system uses placeholder images when there’s no other content to display for your complication’s data. For example, when people first install your app, the system can display a static placeholder while it checks to see if your app can generate a localized placeholder to use instead. Placeholder images can also appear in the carousel from which people select complications. Note that complication image sizes vary per layout (and per legacy template) and the size of a placeholder image may not match the size of the actual image you supply for that complication. For developer guidance, see [`placeholder(in:)`](https://developer.apple.com/documentation/WidgetKit/TimelineProvider/placeholder\(in:\)).

## [Circular](https://developer.apple.com/design/human-interface-guidelines/complications#Circular)

Circular layouts can include text, gauges, and full-color images in circular areas on the Infograph and Infograph Modular watch faces. The circular family also defines extra-large layouts for displaying content on the X-Large watch face.

![A white musical notes icon displayed within a red circle. The circle’s outline is bright red for about ninety percent of the circumference and dull red for about ten percent, showing current progress.](https://docs-assets.developer.apple.com/published/894b82d3c9a300e9ee13ccb6b5db1b18/circular-closed-gauge-image%402x.png)Closed gauge image

![The number one hundred in white text displayed within a green circle. The circle’s outline appears to overlap the starting point on the circumference by about five percent, showing current progress.](https://docs-assets.developer.apple.com/published/4c708bff423e1259099caeb43d49671e/circular-closed-gauge-text%402x.png)Closed gauge text

![The number one point zero in white text, surrounded by a partial circle that begins at about the 8:00 position and ends at about the 4:00 position. The partial circle’s outline shades from green at the 8:00 position to violet the 4:00 position. A small green sun icon appears at about the 6:00 position.](https://docs-assets.developer.apple.com/published/654cf781ef7b3aae9d4849238bbc4518/circular-open-gauge-image%402x.png)Open gauge image

![The number forty-two in white text, surrounded by a partial circle that begins at about the 8:00 position and ends at about the 4:00 position. The partial circle’s outline shades from blue at the 8:00 position to violet the 4:00 position. The letters A, Q, I appear in green text at about the 6:00 position.](https://docs-assets.developer.apple.com/published/e03f6469e57138b5b81c415a14822592/circular-open-gauge-simple-text%402x.png)Open gauge text

![The number seventy-two in white text, surrounded by a partial circle that begins at about the 8:00 position and ends at about the 4:00 position. The partial circle’s outline shades from green at the 8:00 position to yellow the 4:00 position. Two numbers appear side by side at about the 6:00 position. Fifty-five appears in green text on the left and seventy-six appears in orange text on the right.](https://docs-assets.developer.apple.com/published/07a43e66647416847d4c126f2cc9a3a1/circular-open-gauge-range-text%402x.png)Open gauge range

![An image of the breathe app icon.](https://docs-assets.developer.apple.com/published/f89731b0962fff02483c177a06a158e1/graphic-circular-image%402x.png)Image

![A sunset icon displayed above the time seven twenty-four PM, centered within a circular area.](https://docs-assets.developer.apple.com/published/77444d60c23fb81c91b3cca54fdd0bc3/complication-graphic-circular-stack%402x.png)Stack image

![Two lines of text centered within a circular area. The top line is the Apple stock symbol A A P L in white and the second line is the number 121.96 in green.](https://docs-assets.developer.apple.com/published/d91868e8b2928ef9ae237d15eb98fed0/complication-graphic-circular-stack-text%402x.png)Stack text

You can also add text to accompany a regular-size circular image, using a design that curves the text along the bezel of some watch faces, like Infograph. The text can fill nearly 180 degrees of the bezel before truncating.

![A line of white text that appears to follow the curve of the upper third of a circle. The text reads 8:00 AM yoga, flow studio. Centered below the text is the calendar date friday twenty-three displayed in a circular area.](https://docs-assets.developer.apple.com/published/1d10fccea806be8f043ccc0f39ea4caf/bezel-circular-text%402x.png)Closed gauge image

As you design images for a regular-size circular complication, use the following values for guidance.

Image| 40mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---  
Image| 42x42 pt (84x84 px @2x)| 44.5x44.5 pt (89x89 px @2x)| 47x47 pt (94x94 px @2x)| 50x50 pt (100x100 px @2x)  
Closed gauge| 27x27 pt (54x54 px @2x)| 28.5x28.5 pt (57x57 px @2x)| 31x31 pt (62x62 px @2x)| 32x32 pt (64x64 px @2x)  
Open gauge| 11x11 pt (22x22 px @2x)| 11.5x11.5 pt (23x23 px @2x)| 12x12 pt (24x24 px @2x)| 13x13 pt (26x26 px @2x)  
Stack (not text)| 28x14 pt (56x28 px @2x)| 29.5x15 pt (59X30 px @2x)| 31x16 pt (62x32px @ 2x)| 33.5x16.5 pt (67x33 px @2x)  
  
Note

The system applies a circular mask to each image.

A SwiftUI view that implements a regular-size circular complication uses the following default text values:

  * Style: Rounded

  * Weight: Medium

  * Text size: 12 pt (40mm), 12.5 pt (41mm), 13 pt (44mm), 14.5 pt (45mm/49mm)




If you want to design an oversized treatment of important information that can appear on the X-Large watch face — for example, the Contacts complication, which features a contact photo — use the extra-large versions of the circular family’s layouts. The following layouts let you display full-color images, text, and gauges in a large circular region that fills most of the X-Large watch face. Some of the text fields can support multicolor text.

![A white musical notes icon displayed within a red circle. The circle’s outline is bright red for about sixty-six percent of the circumference and dull red for about ten percent, showing current progress.](https://docs-assets.developer.apple.com/published/6e62e84e78d7206a561aaadff4f7bf9d/complication-graphic-xl-circular-closed-gauge-image%402x.png)Closed gauge image

![The number one eighty-five in blue text displayed within a blue circle. The circle’s outline is bright blue for eighty-five percent of the circumference and dull blue for fifteen percent, showing current progress.](https://docs-assets.developer.apple.com/published/88e7205fd0f8faa2b99412ab707b02d4/complication-graphic-xl-circular-closed-gauge-text%402x.png)Closed gauge text

![The number fifty in light-blue text, surrounded by a partial light-blue circle that includes a teardrop shape at the bottom.](https://docs-assets.developer.apple.com/published/0b73bd54f4052f97317b84828b8ff150/complication-graphic-xl-circular-open-gauge-image%402x.png)Open gauge image

![The number twenty-nine in green text, surrounded by a partial white circle that includes the letters A, Q, I in green text at the bottom.](https://docs-assets.developer.apple.com/published/8a6e7a02ffe907d8c0dd63ffb66e199a/complication-graphic-xl-circular-open-gauge-simple-text%402x.png)Open gauge text

![The number fifty-six in white text, surrounded by a partial circle that shades from green at the 8:00 position to red at the 4:00 position. Two numbers appear side by side at the bottom of the partial circle. Fifty-two appears in green text on the left and eighty-nine appears in red text on the right.](https://docs-assets.developer.apple.com/published/80ec1e90fe34971189a61fc5a3fe04ab/complication-graphic-xl-circular-open-gauge-range-text%402x.png)Open gauge range

![An image of the Breathe app icon.](https://docs-assets.developer.apple.com/published/78a8e3548c6f994f9565cd2e4b4e103b/complication-graphic-xl-circular-image%402x.png)Image

![A red sunset icon displayed above the time seven twenty-four PM, centered within a circular area.](https://docs-assets.developer.apple.com/published/77444d60c23fb81c91b3cca54fdd0bc3/complication-graphic-xl-circular-stack-image%402x.png)Stack image

![Two lines of text centered within a circular area. The top line is the Apple stock symbol A A P L in white and the second line is the number 121.96 in green.](https://docs-assets.developer.apple.com/published/d91868e8b2928ef9ae237d15eb98fed0/complication-graphic-xl-circular-stack-text%402x.png)Stack text

Use the following values for guidance as you create images for an extra-large circular complication.

Image| 40mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---  
Image| 120x120 pt (240x240 px @2x)| 127x127 pt (254x254 px @2x)| 132x132 pt (264x264 px @2x)| 143x143 pt (286x286 px @2x)  
Open gauge| 31x31 pt (62x62 px @2x)| 33x33 pt (66x66 px @2x)| 33x33 pt (66x66 px @2x)| 37x37 pt (74x74 px @2x)  
Closed gauge| 77x77 pt (154x154 px @2x)| 81.5x81.5 (163x163 px @2x)| 87x87 pt (174x174 px @2x)| 91.5x91.5 (183x183 px @2x)  
Stack| 80x40 pt (160x80 px @2x)| 85x42 (170x84 px @2x)| 87x44 pt (174x88 px @2x)| 95x48 pt (190x96 px @2x )  
  
Note

The system applies a circular mask to the circular, open-gauge, and closed-gauge images.

Use the following values to create no-content placeholder images for your circular-family complications.

Layout| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Circular| –| 42x42 pt (84x84 px @2x)| 44.5x44.5 pt (89x89 px @2x)| 47x47 pt (94x94 px @2x)| 50x50 pt (100x100 px @2x)  
Bezel| –| 42x42 pt (84x84 px @2x)| 44.5x44.5 pt (89x89 px @2x)| 47x47 pt (94x94 px @2x)| 50x50 pt (100x100 px @2x)  
Extra Large| –| 120x120 pt (240x240 px @2x)| 127x127 pt (254x254 px @2x)| 132x132 pt (264x264 px @2x)| 143x143 pt (286x286 px @2x)  
  
A SwiftUI view that implements an extra-large circular layout uses the following default text values:

  * Style: Rounded

  * Weight: Medium

  * Text size: 34.5 pt (40mm), 36.5 pt (41mm), 36.5 pt (44mm), 41 pt (45mm/49mm)




## [Corner](https://developer.apple.com/design/human-interface-guidelines/complications#Corner)

Corner layouts let you display full-color images, text, and gauges in the corners of the watch face, like Infograph. Some of the templates also support multicolor text.

![An icon showing a yellow sun partially obscured by a white cloud within a circular area.](https://docs-assets.developer.apple.com/published/d2505fe8bcd6129c02eee89133fae163/corner-circular-image%402x.png)Circular image

![The value fourteen minutes and fifty-nine seconds displayed next to a thin solid bar. The text and the bar appear to follow the curve of the bottom-right quadrant of a circle. The timer app icon appears below the time value.](https://docs-assets.developer.apple.com/published/a21715e44b62556c939eb1031d4d7f55/corner-gauge-image%402x.png)Gauge image

![The weather values fifty-five, shown in green, and seventy-six, shown in orange, displayed with a shaded solid bar between them. The bar shades from green to orange to match the values. The text and the bar appear to follow the curve of the top-right quadrant of a circle. The value seventy-two degrees appears in large white text above the temperature range.](https://docs-assets.developer.apple.com/published/9820a8d14b8494f9bc3992c504baf134/corner-gauge-text%402x.png)Gauge text

![Two lines of text, both of which appear to follow the curve of the top-left quadrant of a circle. The top line contains the word cup in large white text. The bottom line contains the time ten oh nine AM followed by a plus sign and zero hours, all in orange text.](https://docs-assets.developer.apple.com/published/6a3616ce205f69ee7c3deebb63f24c82/corner-stack-text%402x.png)Stack text

![A line displaying zero hours, zero minutes, and zero seconds in orange text. The line appears to follow the curve of the bottom-left quadrant of a circle. The  stopwatch app icon appears below the line of text.](https://docs-assets.developer.apple.com/published/c829cc0f1c923486c897b4328e11559a/corner-text-image%402x.png)Text image

As you design images for a corner complication, use the following values for guidance.

Image| 40mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---  
Circular| 32x32 pt (64x64 px @2x)| 34x34 pt (68x68 px @2x)| 36x36 pt (72x72 px @2x)| 38x38 pt (76x76 px @2x )  
Gauge| 20x20 pt (40x40 px @2x)| 21x21 pt (42x42 px @2x)| 22x22 pt (44x44 px @2x)| 24x24 pt (48x48 px @2x)  
Text| 20x20 pt (40x40 px @2x)| 21x21 pt (42x42 px @2x)| 22x22 pt (44x44 px @2x)| 24x24 pt (48x48 px @2x)  
  
Note

The system applies a circular mask to each image.

Use the following values to create no-content placeholder images for your corner-family complications.

38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---  
–| 20x20 pt (40x40 px @2x)| 21x21 pt (42x42 px @2x)| 22x22 pt (44x44 px @2x)| 24x24 pt (48x48 px @2x)  
  
A SwiftUI view that implements a corner layout uses the following default text values:

  * Style: Rounded

  * Weight: Semibold

  * Text size: 10 pt (40mm), 10.5 pt (41mm), 11 pt (44mm), 12 pt (45mm/49mm)




## [Inline](https://developer.apple.com/design/human-interface-guidelines/complications#Inline)

Inline layouts include utilitarian small and large layouts.

Utilitarian small layouts are intended to occupy a rectangular area in the corner of a watch face, such as the Chronograph and Simple watch faces. The content can include an image, interface icon, or a circular graph.

![The letters L, O, N displayed above the time six oh nine.](https://docs-assets.developer.apple.com/published/269280772375293a9bba7c48384bbc81/complication-utility-small-flat%402x.png)Flat

![Two tear drop icons, each centered within a partial ring.](https://docs-assets.developer.apple.com/published/3321ec0b2fcd3a1aa7d7e50b082a82e2/complication-utility-small-ring-image%402x.png)Ring image

![Two partial rings, each displaying the number sixty-three centered within them.](https://docs-assets.developer.apple.com/published/2fc1e12d51df2d6c708385b7d33ae3ad/complication-utility-small-ring-text%402x.png)Ring text

![An image of the moon.](https://docs-assets.developer.apple.com/published/2316eb7e29bc98cbe606a332543e41ac/complication-utility-small-square%402x.png)Square

As you design images for a utilitarian small layout, use the following values for guidance.

Content| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Flat| 9-21x9 pt (18-42x18 px @2x)| 10-22x10 pt (20-44x20 px @2x)| 10.5-23.5x21 pt (21-47x21 @2x)| N/A| 12-26x12 pt (24-52x24 px @2x)  
Ring| 14x14 pt (28x28 px @2x)| 14x14 pt (28x28 px @2x)| 15x15 pt (30x30 px @2x)| 16x16 pt (32x32 px @2x)| 16.5x16.5 pt (33x33 px @2x)  
Square| 20x20 pt (40x40 px @2x)| 22x22 pt (44x44 px @2x)| 23.5x23.5 pt (47x47 px @2x)| 25x25 pt (50x50 px @2x)| 26x26 pt (52x52 px @2x)  
  
The utilitarian large layout is primarily text-based, but also supports an interface icon placed on the leading side of the text. This layout spans the bottom of a watch face, like the Utility or Motion watch faces.

![The text eleven AM photo shoot displayed on one line in a large text size.](https://docs-assets.developer.apple.com/published/71cce6286d76ea16f2821b0cfdcb453e/complication-utility-large-flat%402x.png)Large flat

As you design images for a utilitarian large layout, use the following values for guidance.

Content| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Flat| 9-21x9 pt (18-42x18 px @2x)| 10-22x10 pt (20-44x20 px @2x)| 10.5-23.5x10.5 pt (21-47x21 px @2x)| N/A| 12-26x12 pt (24-52x24 px @2x)  
  
## [Rectangular](https://developer.apple.com/design/human-interface-guidelines/complications#Rectangular)

Rectangular layouts can display full-color images, text, a gauge, and an optional title in a large rectangular region. Some of the text fields can support multicolor text.

The large rectangular region works well for showing details about a value or process that changes over time, because it provides room for information-rich charts, graphs, and diagrams. For example, the Heart Rate complication displays a graph of heart-rate values within a 24-hour period. The graph uses high-contrast white and red for the primary content and a lower-contrast gray for the graph lines and labels, making the data easy to understand at a glance.

Starting with watchOS 10, if you have created a rectangular layout for your watchOS app, the system may display it in the Smart Stack. You can optimize this presentation in a few ways:

  * By supplying background color or content that communicates information or aids in recognition

  * By using [intents](https://developer.apple.com/documentation/appintents/app-intents) to specify relevancy, and help ensure that your widget is displayed in the Smart Stack at times that are most appropriate and useful to people

  * By creating a custom layout of your information that is optimized for the Smart Stack




For developer guidance, see [`WidgetFamily.accessoryRectangular`](https://developer.apple.com/documentation/WidgetKit/WidgetFamily/accessoryRectangular). See [Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets) for additional guidance on designing widgets for the Smart Stack.

![Three lines of left-aligned text. The first line uses blue text to display the words water reminders. The second line uses white text to display the words thirty-two ounces consumed. The third line uses gray text to display the words four day streak, woo hoo.](https://docs-assets.developer.apple.com/published/eacc51c96f809a72dc4e293e1ce12231/rectangular-standard-body%402x.png)Standard body

![Two lines of text displayed above a bar that can fill with color to indicate progress. The first line uses blue text to display a tear drop icon followed by the words water reminder. The second line uses white text to display the words thirty-two ounces consumed. The bar uses the same blue color as used in the first line of text to fill the bar from the left to about seventy percent of the total length.](https://docs-assets.developer.apple.com/published/cf5c53f181d423b5e950c27b3a8056d6/rectangular-text-gauge%402x.png)Text gauge

![A line of text displayed above a graph. The text displays in white the words sixty-eight B, P, M, followed by the words two minutes ago, in red text. The graph shows many heart rate values over time.](https://docs-assets.developer.apple.com/published/f1b05dfd5648f270edc50eae0cbc2834/rectangular-large-image%402x.png)Large image

Use the following values for guidance as you create images for a rectangular layout.

Content| 40mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---  
Large image with title *| 150x47 pt (300x94 px @2x)| 159x50 pt (318x100 px @2x)| 171x54 pt (342x108 px @2x)| 178.5x56 pt (357x112 px @2x)  
Large image without title *| 162x69 pt (324x138 px @2x)| 171.5x73 pt (343x146 px @2x)| 184x78 pt (368x156 px @2x)| 193x82 pt (386x164 px @2x)  
Standard body| 12x12 pt (24x24 px @2x)| 12.5x12.5 pt (25x25 px @2x)| 13.5x13.5 pt (27x27 px @2x)| 14.5x14.5 pt (29x29 px @2x)  
Text gauge| 12x12 pt (24x24 px @2x)| 12.5x12.5 pt (25x25 px @2x)| 13.5x13.5 pt (27x27 px @2x)| 14.5x14.5 pt (29x29 px @2x)  
  
Note

Both large-image layouts automatically include a four-point corner radius.

A SwiftUI view that implements a rectangular layout uses the following default text values:

  * Style: Rounded

  * Weight: Medium

  * Text size: 16.5 pt (40mm), 17.5 pt (41mm), 18 pt (44mm), 19.5 pt (45mm/49mm)




## [Legacy templates](https://developer.apple.com/design/human-interface-guidelines/complications#Legacy-templates)

### [Circular small](https://developer.apple.com/design/human-interface-guidelines/complications#Circular-small)

Circular small templates display a small image or a few characters of text. They appear in the corner of the watch face (for example, in the Color watch face).

![A tear drop icon centered within a partial ring.](https://docs-assets.developer.apple.com/published/099b811bae2a48a89ccd01a8a526dc78/complication-circular-small-ring-image%402x.png)Ring image

![The number sixty-three centered within a partial ring.](https://docs-assets.developer.apple.com/published/1e800aa127d18b31519bf181383bf13f/complication-circular-small-ring-text%402x.png)Ring text

![A stopwatch icon centered within a circular area.](https://docs-assets.developer.apple.com/published/ea77fbe94ab1c99437b6f05635904912/complication-circular-small-simple-image%402x.png)Simple image

![The number sixty-eight and the degree symbol centered within a circular area.](https://docs-assets.developer.apple.com/published/a5f5c73d96c14ed8b45d4ed14cf5d3fe/complication-circular-small-simple-text%402x.png)Simple text

![A sunset icon displayed above the time seven twenty-four PM, centered within a circular area.](https://docs-assets.developer.apple.com/published/bdbfa5a07a29ae3c91413454c0d45f5c/complication-circular-small-stack-image%402x.png)Stack image

![The letters L, O, N displayed above the time six oh nine.](https://docs-assets.developer.apple.com/published/0bc5cc4c6505b400a2b3ed317c47293c/complication-circular-small-stack-text%402x.png)Stack text

As you design images for a circular small complication, use the following values for guidance.

Image| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Ring| 20x20 pt (40x40 px @2x)| 22x22 pt (44x44 px @2x)| 23.5x23.5 pt (47x47 px @2x)| 24x24 pt (48x48 px @2x)| 26x26 pt (52x52 px @2x)  
Simple| 16x16 pt (32x32 px @2x)| 18x18 pt (36x36 px @2x)| 19x19 pt (38x38 px @2x)| 20x20 pt (40x40 px @2x)| 21.5x21.5 pt (43x43 px @2x)  
Stack| 16x7 pt (32x14 px @2x)| 17x8 pt (34x16 px @2x)| 18x8.5 pt (36x17 px @2x)| 19x9 pt (38x18 px @2x)| 19x9.5 pt (38x19 px @2x)  
Placeholder| 16x16 pt (32x32 px @2x)| 18x18x pt (36x36 px @2x)| 19x19 pt (38x38 px @2x)| 20x20 pt (40x40 px @2x)| 21.5x21.5 pt (43x43 px @2x)  
  
Note

In each stack measurement, the width value represents the maximum size.

### [Modular small](https://developer.apple.com/design/human-interface-guidelines/complications#Modular-small)

Modular small templates display two stacked rows consisting of an icon and content, a circular graph, or a single larger item (for example, the bottom row of complications on the Modular watch face).

![Text and numbers arranged in a two-row column. The top row displays the letters C and P and the number fourteen. The bottom row displays the letters M and H and the number twenty-eight.](https://docs-assets.developer.apple.com/published/d4768440b750b0614aca0bab1754c1bd/complication-modular-small-columns-text%402x.png)Columns text

![A tear drop icon centered within a partial ring.](https://docs-assets.developer.apple.com/published/f89c9c4226b921580000237320197983/complication-modular-small-ring-image%402x.png)Ring image

![The number sixty-three centered within a partial ring.](https://docs-assets.developer.apple.com/published/e9e15b071c1e272ef99ee09a583d6214/complication-modular-small-ring-text%402x.png)Ring text

![An image of the moon.](https://docs-assets.developer.apple.com/published/d5a7bd5314f4a682df263d9f32224665/complication-modular-small-simple-image%402x.png)Simple image

![The number sixty-eight and the degree symbol.](https://docs-assets.developer.apple.com/published/ea5c2c9f8f7d19da47f656816d13ccc4/complication-modular-small-simple-text%402x.png)Simple text

![A sunset icon displayed above the time seven twenty-four PM.](https://docs-assets.developer.apple.com/published/74d96206654ce136baea6153f8f5916e/complication-modular-small-stack-image%402x.png)Stack image

![The letters L, O, N displayed above the time six oh nine.](https://docs-assets.developer.apple.com/published/82cbeeb9536e51537483b6eb9294955d/complication-modular-small-stack-text%402x.png)Stack text

As you design icons and images for a modular small complication, use the following values for guidance.

Image| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Ring| 18x18 pt (36x36 px @2x)| 19x19 pt (38x38 px @2x)| 20x20 pt (40x40 px @2x)| 21x21 pt (42x42 px @2x)| 22.5x22.5 pt (45x45 px @2x)  
Simple| 26x26 pt (52x52 px @2x)| 29x29 pt (58x58 px @2x)| 30.5x30.5 pt (61x61 px @2x)| 32x32 pt (64x64 px @2x)| 34.5x34.5 pt (69x69 px @2x)  
Stack| 26x14 pt (52x28 px @2x)| 29x15 pt (58x30 px @2x)| 30.5x16 pt (61x32 px @2x)| 32x17 pt (64x34 px @2x)| 34.5x18 pt (69x36 px @2x)  
Placeholder| 26x26 pt (52x52 px @2x)| 29x29 pt (58x58 px @2x)| 30.5x30.5 pt (61x61 px @2x)| 32x32 pt (64x64 px @2x)| 34.5x34.5 pt (69x69 px @2x)  
  
Note

In each stack measurement, the width value represents the maximum size.

### [Modular large](https://developer.apple.com/design/human-interface-guidelines/complications#Modular-large)

Modular large templates offer a large canvas for displaying up to three rows of content (for example, in the center of the Modular watch face).

![Activity-related information displayed in a three-row column. The top row displays a calorie count of 396 out of 660. The middle row displays a minute count of 13 out of 30. The bottom row displays an hour count of 3 out of 12.](https://docs-assets.developer.apple.com/published/9e6f3cc81365a53a8509935db81ab4f0/complication-modular-large-columns%402x.png)Columns

![Weather-related information displayed in three left-aligned lines of text. The top row displays the location Cupertino California. The middle row displays sixty-eight degrees and cloudy. The bottom row displays a forecast high of seventy-two degrees and low of sixty-two degrees.](https://docs-assets.developer.apple.com/published/97d75fa71e7d4dcac61d89286cd9e415/complication-modular-large-standard-body%402x.png)Standard body

![Sports-related information displayed in a two-column, two-row table with a title. The table title is Final Score. The first table row contains the number 14 followed by the text Central Prep. The second table row contains the number 28 followed by the text Mission High.](https://docs-assets.developer.apple.com/published/ab811ad4c90cc2c030da750ebd0be495/complication-modular-large-table%402x.png)Table

![Calendar-related information displayed in two lines of fully justified text. The first line displays the word wednesday. The second line displays the abbreviation mar and the number nine in text that is about twice as tall as the text in the first line.](https://docs-assets.developer.apple.com/published/877462cb5be4b9764cf101897b0acc2a/complication-modular-large-tall-body%402x.png)Tall body

As you design icons and images for a modular large complication, use the following values for guidance.

Content| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Columns| 11-32x11 pt (22-64x22 px @2x)| 12-37x12 pt (24-74x24 px @2x)| 12.5-39x12.5 pt (25-78x25 px @2x)| 14-42x14 pt (28-84x28 px @2x)| 14.5-44x14.5 pt (29-88x29 px @2x)  
Standard body| 11-32x11 pt (22-64x22 px @2x)| 12-37x12 pt (24-74x24 px @2x)| 12.5-39x12.5 pt (25-78x25 px @2x)| 14-42x14 pt (28-84x28 px @2x)| 14.5-44x14.5 pt (29-88x29 px @2x)  
Table| 11-32x11 pt (22-64x22 px @2x)| 12-37x12 pt (24-74x24 px @2x)| 12.5-39x12.5 pt (25-78x25 px @2x)| 14-42x14 pt (28-84x28 px @2x)| 14.5-44x14.5 pt (29-88x29 px @2x)  
  
### [Extra large](https://developer.apple.com/design/human-interface-guidelines/complications#Extra-large)

Extra large templates display larger text and images (for example, on the X-Large watch faces).

![A tear drop icon centered within a partial ring.](https://docs-assets.developer.apple.com/published/f89c9c4226b921580000237320197983/complication-extralarge-ring-image%402x.png)Ring image

![The number sixty-three centered within a partial ring.](https://docs-assets.developer.apple.com/published/e9e15b071c1e272ef99ee09a583d6214/complication-extralarge-ring-text%402x.png)Ring text

![An image of the moon.](https://docs-assets.developer.apple.com/published/d5a7bd5314f4a682df263d9f32224665/complication-extralarge-simple-image%402x.png)Simple image

![The number sixty-eight and the degree symbol.](https://docs-assets.developer.apple.com/published/ea5c2c9f8f7d19da47f656816d13ccc4/complication-extralarge-simple-text%402x.png)Simple text

![A sunset icon displayed above the time seven twenty-four PM.](https://docs-assets.developer.apple.com/published/74d96206654ce136baea6153f8f5916e/complication-extralarge-stack-image%402x.png)Stack image

![The letters L, O, N displayed above the time six oh nine.](https://docs-assets.developer.apple.com/published/82cbeeb9536e51537483b6eb9294955d/complication-extralarge-stack-text%402x.png)Stack text

As you design icons and images for an extra large complication, use the following values for guidance.

Image| 38mm| 40mm/42mm| 41mm| 44mm| 45mm/49mm  
---|---|---|---|---|---  
Ring| 63x63 pt (126x126 px @2x)| 66.5x66.5 pt (133x133 px @2x)| 70.5x70.5 pt (141x141 px @2x)| 73x73 pt (146x146 px @2x)| 79x79 pt (158x158 px @2x)  
Simple| 91x91 pt (182x182 px @2x)| 101.5x101.5 pt (203x203 px @2x)| 107.5x107.5 pt (215x215 px @2x)| 112x112 pt (224x224 px @2x)| 121x121 pt (242x242 px @2x )  
Stack| 78x42 pt (156x84 px @2x)| 87x45 pt (174x90 px @2x)| 92x47.5 pt (184x95 px @2x)| 96x51 pt (192x102 px @2x)| 103.5x53.5 pt (207x107 px @2x)  
Placeholder| 91x91 pt (182x182 px @2x)| 101.5x101.5 pt (203x203 px @2x)| 107.5x107.5 pt (215x215 px @2x)| 112x112 pt (224x224 px @2x)| 121x121 pt (242x242 px @2x)  
  
Note

In each stack measurement, the width value represents the maximum size.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/complications#Platform-considerations)

 _Not supported in iOS, iPadOS, macOS, tvOS, or visionOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/complications#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/complications#Related)

[Watch faces](https://developer.apple.com/design/human-interface-guidelines/watch-faces)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/complications#Developer-documentation)

[WidgetKit](https://developer.apple.com/documentation/WidgetKit)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/complications#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/56D03FE8-0566-429A-81D2-2F6566031498/8390_wide_250x141_1x.jpg) Design widgets for the Smart Stack on Apple Watch ](https://developer.apple.com/videos/play/wwdc2023/10309)

[![](https://devimages-cdn.apple.com/wwdc-services/images/124/34240770-1E20-456E-907F-3D06D6C87AFE/6544_wide_250x141_1x.jpg) Go further with Complications in WidgetKit ](https://developer.apple.com/videos/play/wwdc2022/10051)

[![](https://devimages-cdn.apple.com/wwdc-services/images/124/A37E04FC-826F-44B5-A5D8-36B41E5F73E5/6543_wide_250x141_1x.jpg) Complications and widgets: Reloaded ](https://developer.apple.com/videos/play/wwdc2022/10050)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/complications#Change-log)

Date| Changes  
---|---  
October 24, 2023| Replaced links to deprecated ClockKit documentation with links to WidgetKit documentation.  
June 5, 2023| Updated guidance for rectangular complications to support them as widgets in the Smart Stack.  
September 14, 2022| Added specifications for Apple Watch Ultra.  
  
