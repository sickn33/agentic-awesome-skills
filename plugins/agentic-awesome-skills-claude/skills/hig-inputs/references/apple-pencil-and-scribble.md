---
title: "Apple Pencil and Scribble | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble

# Apple Pencil and Scribble

Apple Pencil helps make drawing, handwriting, and marking effortless and natural, in addition to performing well as a pointer and UI interaction tool.

![A sketch of a scribble mark, suggesting drawing with Apple Pencil. The image is overlaid with rectangular and circular grid lines and is tinted purple to subtly reflect the purple in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/48578c745cec42fe322ab69c99575b38/inputs-apple-pencil-and-scribble-intro%402x.png)

Apple Pencil is a versatile, intuitive tool for iPad apps that offers pixel‑level precision when jotting notes, sketching, painting, marking up documents, and more. Scribble lets people use Apple Pencil to enter text in any text field through fast, private, on-device handwriting recognition.

For details on Apple Pencil features and compatibility, see [Apple Pencil](https://www.apple.com/apple-pencil/).

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Best-practices)

**Support behaviors people intuitively expect when using a marking instrument.** Most people have a lot of experience with real-world marking tools, and this knowledge informs their expectations when they use Apple Pencil with your app. To provide a delightful experience, think about the ways people interact with nondigital pencils, pens, and other marking instruments, and proactively support actions that people may naturally attempt. For example, people often want to write in the margins of documents or books.

**Let people choose when to switch between Apple Pencil and finger input.** For example, if your app supports Apple Pencil for marking, also ensure that your app’s controls respond to Apple Pencil so people don’t have to switch to using their finger to activate them. In this scenario, a control that doesn’t support Apple Pencil input might seem to be unresponsive, giving the impression of a malfunction or low battery. (Scribble only supports Apple Pencil input.)

**Let people make a mark the moment Apple Pencil touches the screen**. You want the experience of putting Apple Pencil to screen to mirror the experience of putting a classic pencil to paper, so it’s essential to avoid requiring people to tap a button or enter a special mode before they can make a mark.

**Help people express themselves by responding to the way they use Apple Pencil.** Apple Pencil may sense tilt (altitude), force (pressure), orientation (azimuth), and [barrel roll](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Barrel-roll). Use this information to affect the strokes Apple Pencil makes, such as by varying thickness and intensity. When responding to pressure, keep things simple and intuitive. For example, it feels natural to affect continuous properties — such as ink opacity or brush size — by varying the pressure.

![An illustration of Apple Pencil tilted up from a horizontal line by 45 degrees.](https://docs-assets.developer.apple.com/published/71e341540baa3fa3bd5bdf01a55cc8a8/apple-pencil-altitude%402x.png)Altitude

![An illustration of Apple Pencil drawing a curved line that increases in thickness as more pressure is applied to the tool.](https://docs-assets.developer.apple.com/published/ce6370f2a90cf23b39ee77f7ba64ff02/apple-pencil-pressure%402x.png)Pressure

![An illustration of Apple Pencil balancing on its tip at the center of a circle that has degree marks around its circumference. A line from the center of the circle to one of the degree marks indicates the angle at which Apple Pencil is tilted.](https://docs-assets.developer.apple.com/published/e3cd83ae350aac7fe4886903d65ac495/apple-pencil-azimuth%402x.png)Azimuth

**Provide visual feedback to indicate a direct connection with content.** Make sure Apple Pencil appears to directly and immediately manipulate content it touches onscreen. Avoid letting Apple Pencil appear to initiate seemingly disconnected actions, or affect content on other parts of the screen.

**Design a great left- and right-handed experience.** Avoid placing controls in locations that may be obscured by either hand. If there’s a chance controls may become obscured, consider letting people reposition them.

![An illustration of an iPad app that shows a stack of three circular controls on both side edges. A drawing of a person’s left hand holding an Apple Pencil is shown at the bottom-left corner of the screen, partially obscuring the controls on that side. The controls on the left edge are grayed out to indicate the original position they no longer occupy, while the controls on the right edge are bright to indicate their final position.](https://docs-assets.developer.apple.com/published/386201ad5a8d093d8c72fc4db57978aa/apple-pencil-controls-moved-right%402x.png)

![An illustration of an iPad app that shows a stack of three circular controls on both side edges. A drawing of a person’s right hand holding an Apple Pencil is shown at the bottom-right corner of the screen, partially obscuring the controls on that side. The controls on the right edge are grayed out to indicate the original position they no longer occupy, while the controls on the left edge are bright to indicate their final position.](https://docs-assets.developer.apple.com/published/6b9182644f4624493d4fbe541186a4dc/apple-pencil-controls-moved-left%402x.png)

## [Hover](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Hover)

**Use hover to help people predict what will happen when Apple Pencil touches the screen.** For example, as people hold Apple Pencil above the screen, a hover preview can show the dimensions and color of the mark that the current tool can make. As much as possible, avoid continuously modifying the preview as people move Apple Pencil closer or farther from the screen. A preview that changes according to height is unlikely to clarify the mark Apple Pencil will make, and frequent visual variations can be very distracting to people.

**Avoid using hover to initiate an action.** Unlike tapping a button or marking the screen, hovering is a relatively imprecise motion that doesn’t require people to think about the actual distance between Apple Pencil and the display. You don’t want people to inadvertently perform an action — especially a destructive action that they might want to undo — just because they hold Apple Pencil near the screen.

**Prefer showing a preview value that’s near the middle in a range of dynamic values.** Dynamic properties like opacity or flow can be difficult to depict at the highest or lowest ends of the spectrum. For example, previewing the appearance of a brush mark made with the maximum pressure could occlude the area in which people are marking; in contrast, depicting a mark made with the minimum pressure could be hard for people to detect, making the preview an inaccurate representation of an actual mark or even invisible.

![An illustration of Apple Pencil hovering slightly above a gray rectangle that represents the screen. A small blue oval beneath the tip represents a preview.](https://docs-assets.developer.apple.com/published/d18ccebb3a51a66f6c6151bc1414d9a1/apple-pencil-preview-small%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

![An illustration of Apple Pencil hovering slightly above a gray rectangle that represents the screen. A medium blue oval beneath the tip represents a preview.](https://docs-assets.developer.apple.com/published/4c5b24f4381fc1ed83af48f2a7ae3268/apple-pencil-preview-medium%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)

![An illustration of Apple Pencil hovering slightly above a gray rectangle that represents the screen. A large blue oval beneath the tip represents a preview.](https://docs-assets.developer.apple.com/published/50d3aa8162579aced9bd752b856b5f6b/apple-pencil-preview-large%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)

**Consider using hover to support relevant interactions close to where people are marking.** For example, you might respond to hover by displaying a contextual menu of tool sizes when people perform a gesture like [squeeze](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Squeeze) or press a modifier key on an attached keyboard. Revealing a menu near where people are marking lets them make choices without moving Apple Pencil or their hands to another part of the screen.

**Prefer showing hover previews for Apple Pencil, not for a pointing device.** Although a pointing device can also respond to hover gestures, it might be confusing to provide the same visual feedback for both devices. If it makes sense in your app, you can restrict your hover preview to Apple Pencil only. For developer guidance, see [Adopting hover support for Apple Pencil](https://developer.apple.com/documentation/UIKit/adopting-hover-support-for-apple-pencil).

## [Double tap](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Double-tap)

**Respect people’s settings for the double-tap gesture when they make sense in your app.** By default, models of Apple Pencil that support the double-tap gesture respond by toggling between the current tool and the eraser, but people can set the gesture to toggle between the current and previous tool, show and hide the color picker, or do nothing at all. If your app supports these behaviors, let people use their preferred gestures to perform them. If the systemwide double-tap settings don’t make sense in your app, you can still use the gesture to change the interaction mode. For example, a 3D app that offers a mesh-editing tool could use double tap to toggle between the tool’s raise and lower modes.

**Give people a way to specify custom double-tap behavior if necessary.** If you offer custom double-tap behavior in addition to some or all of the default behaviors, provide a control that lets people choose the custom behavior mode. People need to know which mode they’re in; otherwise, they may get confused when your app responds differently to their interactions. In this scenario, make sure it’s easy for people to discover the custom behavior your app supports, but don’t turn it on by default.

**Avoid using the double-tap gesture to perform an action that modifies content.** In rare cases, it’s possible for people to double-tap accidentally, which means that they may not even be aware that your app has performed the action. Prefer using double tap to perform actions that are easy for people to undo. In particular, avoid using double tap to perform a potentially destructive action that might result in data loss.

## [Squeeze](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Squeeze)

Using Apple Pencil Pro, people can squeeze to perform an action. You can design a custom behavior that responds to squeeze, but recognize that people may choose to configure the squeeze gesture to run an [App Shortcut](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts) instead of app-specific actions.

Note

The squeeze gesture is available only when the paired iPad screen is on and while the Apple Pencil Pro is not directly contacting it. Because squeeze works when there’s distance between Apple Pencil Pro and iPad, people might not always be visually aware of the gesture’s onscreen result.

**Treat squeeze as a single, quick gesture that performs a discrete — not continuous — action.** People sometimes squeeze with a lot of force, so holding a squeeze or squeezing several times quickly can be tiring. Help people remain comfortable by responding to a single squeeze and promptly displaying the result.

**If you use squeeze to reveal app UI, like a contextual menu, display it close to Apple Pencil Pro.** Displaying the result of a squeeze near the tip of Apple Pencil Pro strengthens the connection between the device and the gesture, and can help people stay engaged with their task.

**Define squeeze actions that are nondestructive and easy to undo.** As with the double-tap gesture, people can make the squeeze gesture without meaning to, so it’s essential to avoid using squeeze to perform an action that could result in data loss.

## [Barrel roll](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Barrel-roll)

While marking with Apple Pencil Pro, people can use a barrel-roll gesture to change the type of mark they’re making. For example, while using Apple Pencil Pro to highlight content in Notes, people can barrel-roll to rotate the angle of the mark.

**Use barrel roll only to modify marking behavior, not to enable navigation or display other controls.** In contrast to double tap and squeeze, barrel roll is naturally related to marking and doesn’t make sense for performing an interface action.

## [Scribble](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Scribble)

With Scribble and Apple Pencil, people can simply write wherever text is accepted in your app — they don’t have to tap or switch modes first. Because Scribble is fully integrated into iPadOS, it’s available to all apps by default.

**Make text entry feel fluid and effortless.** By default, Scribble works in all standard text components — such as text fields, text views, search fields, and editable fields in web content — except password fields. If you use a custom text field in your app, avoid making people tap or select it before they can begin writing.

**Make Scribble available everywhere people might want to enter text.** Unlike using the keyboard, using Apple Pencil encourages people to treat the screen the way they treat a sheet of paper. Help strengthen this perception in your app by making Scribble consistently available in places where text entry seems natural. For example, in Reminders, it’s natural for people to create a new reminder by writing it in the blank space below the last item, even though the area doesn’t contain a text field. For developer guidance, see [`UIIndirectScribbleInteraction`](https://developer.apple.com/documentation/UIKit/UIIndirectScribbleInteraction-1nfjm).

**Avoid distracting people while they write.** Some text field behaviors work well for keyboard input, but can disrupt the natural writing experience that Apple Pencil provides. For example, it’s best to avoid displaying autocompletion text as people write in a text field because the suggestions can visually interfere with their writing. It’s also a good idea to hide a field’s placeholder text the moment people begin to write so that their input doesn’t appear to overlap it.

**While people are writing in a text field, make sure it remains stationary.** In some cases, it can make sense to move a text field when it becomes focused: for example, a search field might move to make more room to display results. Such a movement is fine when people are using the keyboard, but when they’re writing it can make them feel like they’ve lost control of where their input is going. If you can’t prevent a text field from moving or resizing, consider delaying the change until people pause their writing.

**Prevent autoscrolling text while people are writing and editing in a text field.** When transcribed text autoscrolls, people might try to avoid writing on top of it. Worse, if text scrolls while people are using Apple Pencil to select it, they might select a different range of text than they want.

**Give people enough space to write.** A small text field can feel uncomfortable to write in. When you know that Apple Pencil input is likely, improve the writing experience in your app by increasing the size of the text field before people begin to write in it or when they pause writing; avoid resizing a text field while people are writing. For developer guidance, see [`UIScribbleInteraction`](https://developer.apple.com/documentation/UIKit/UIScribbleInteraction).

![An illustration showing a stack of two text fields, where the top field is about half the width of the bottom field. Both text fields contain the word Name in the leading end, followed by a person's signature. The top text field is too narrow to fit all of the signature and is marked with an X in a circle to indicate incorrect usage. The bottom text field is wide enough to fit the full signature and is marked with a checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/0e2cd3f5562569097b9f668253dac0f7/apple-pencil-scribble%402x.png)

## [Custom drawing](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Custom-drawing)

Using [PencilKit](https://developer.apple.com/documentation/PencilKit), you can let people take notes, annotate documents and images, and draw with the same low-latency experience that iOS provides. PencilKit also makes it easy to create a custom drawing canvas in your app and offer a state-of-the-art tool picker and ink palette.

**Help people draw on top of existing content.** By default, the colors on your PencilKit canvas dynamically adjust to Dark Mode, so people can create content in either mode and the results will look great in both. However, when people draw on top of existing content like a PDF or a photo, you want to prevent the dynamic adjustment of colors so that the markup remains sharp and visible.

**Consider displaying custom undo and redo buttons when your app runs in a compact environment.** In a regular environment, the tool picker includes undo and redo buttons, but in a compact environment it doesn’t. In a compact environment, you could display undo and redo buttons in a toolbar. You might also consider supporting the standard 3-finger undo/redo gesture, so people can use it in any environment. For guidance, see [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo).

![An illustration of an iPad screen in landscape on the left and an iPhone screen in portrait on the right. Both screens show the tool picker at the bottom edge of the screen. The iPad screen shows the standard undo and redo buttons in the left end of the tool picker, and the iPhone screen shows the undo button in the top toolbar.](https://docs-assets.developer.apple.com/published/7587fbeb4272d990e295d093f79e1ef8/apple-pencil-undo-redo-buttons%402x.png)

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Platform-considerations)

 _Not supported in iOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Related)

[Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Developer-documentation)

[PencilKit](https://developer.apple.com/documentation/PencilKit)

[PaperKit](https://developer.apple.com/documentation/PaperKit)

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/3055294D-836B-4513-B7B0-0BC5666246B0/BE1C66C1-9D8C-4EF7-BE9A-A36251A00B86/10006_wide_250x141_1x.jpg) Meet PaperKit ](https://developer.apple.com/videos/play/wwdc2025/285)

[![](https://devimages-cdn.apple.com/wwdc-services/images/C03E6E6D-A32A-41D0-9E50-C3C6059820AA/2104DC8F-01CE-453F-AF0E-A499CB193E97/9354_wide_250x141_1x.jpg) Squeeze the most out of Apple Pencil ](https://developer.apple.com/videos/play/wwdc2024/10214)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble#Change-log)

Date| Changes  
---|---  
May 7, 2024| Added guidance for handling squeeze and barrel roll on Apple Pencil Pro.  
September 12, 2023| Updated artwork.  
November 3, 2022| Added guidelines for using hover to enhance your app.  
  
