---
title: "Watch faces | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/watch-faces

# Watch faces

A watch face is a view that people choose as their primary view in watchOS.

![A stylized representation of a series of Apple Watch faces. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/bdf9c3962f71506a149c0ee448c2a0ad/components-faces-intro%402x.png)

The watch face is at the heart of the watchOS experience. People choose a watch face they want to see every time they raise their wrist, and they customize it with their favorite complications. People can even customize different watch faces for different activities, so they can switch to the watch face that fits their current context.

In watchOS 7 and later, people can share the watch faces they configure. For example, a fitness instructor might configure a watch face to share with their students by choosing the Gradient watch face, customizing the color, and adding their favorite health and fitness complications. When the students add the shared watch face to their Apple Watch or the Watch app on their iPhone, they get a custom experience without having to configure it themselves.

You can also configure a watch face to share from within your app, on your website, or through Messages, Mail, or social media. Offering shareable watch faces can help you introduce more people to your complications and your app.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/watch-faces#Best-practices)

**Help people discover your app by sharing watch faces that feature your complications.** Ideally, you support multiple complications so that you can showcase them in a shareable watch face and provide a curated experience. For some watch faces, you can also specify a system accent color, images, or styles. If people add your watch face but haven’t installed your app, the system prompts them to install it.

**Display a preview of each watch face you share.** Displaying a preview that highlights the advantages of your watch face can help people visualize its benefits. You can get a preview by using the iOS Watch app to email the watch face to yourself. The preview includes an illustrated device bezel that frames the face and is suitable for display on websites and in watchOS and iOS apps. Alternatively, you can replace the illustrated bezel with a high-fidelity hardware bezel that you can download from [Apple Design Resources](https://developer.apple.com/design/resources/#product-bezels) and composite onto the preview. For developer guidance, see [Sharing an Apple Watch face](https://developer.apple.com/documentation/ClockKit/sharing-an-apple-watch-face).

**Aim to offer shareable watch faces for all Apple Watch devices.** Some watch faces are available on Series 4 and later — such as California, Chronograph Pro, Gradient, Infograph, Infograph Modular, Meridian, Modular Compact, and Solar Dial — and Explorer is available on Series 3 (with cellular) and later. If you use one of these faces in your configuration, consider offering a similar configuration using a face that’s available on Series 3 and earlier. To help people make a choice, you can clearly label each shareable watch face with the devices it supports.

**Respond gracefully if people choose an incompatible watch face.** The system sends your app an error when people try to use an incompatible watch face on Series 3 or earlier. In this scenario, consider immediately offering an alternative configuration that uses a compatible face instead of displaying an error. Along with the previews you provide, help people understand that they might receive an alternative watch face if they choose a face that isn’t compatible with their Apple Watch.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/watch-faces#Platform-considerations)

 _Not supported in iOS, iPadOS, macOS, tvOS, or visionOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/watch-faces#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/watch-faces#Related)

[Apple Design Resources — Product Bezels](https://developer.apple.com/design/resources/#product-bezels)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/watch-faces#Developer-documentation)

[Sharing an Apple Watch face](https://developer.apple.com/documentation/ClockKit/sharing-an-apple-watch-face) — ClockKit

