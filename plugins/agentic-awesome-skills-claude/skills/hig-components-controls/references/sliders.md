---
title: "Sliders | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/sliders

# Sliders

A slider is a horizontal track with a control, called a thumb, that people can adjust between a minimum and maximum value.

![A stylized representation of a brightness slider. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/ebb02bcf10487e6a03fd081236b35aa0/components-slider-intro%402x.png)

As a slider’s value changes, the portion of track between the minimum value and the thumb fills with color. A slider can optionally display left and right icons that illustrate the meaning of the minimum and maximum values.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/sliders#Best-practices)

**Customize a slider’s appearance if it adds value.** You can adjust a slider’s appearance — including track color, thumb image and tint color, and left and right icons — to blend with your app’s design and communicate intent. A slider that adjusts image size, for example, could show a small image icon on the left and a large image icon on the right.

**Use familiar slider directions.** People expect the minimum and maximum sides of sliders to be consistent in all apps, with minimum values on the leading side and maximum values on the trailing side (for horizontal sliders) and minimum values at the bottom and maximum values at the top (for vertical sliders). For example, people expect to be able to move a horizontal slider that represents a percentage from 0 percent on the leading side to 100 percent on the trailing side.

**Consider supplementing a slider with a corresponding text field and stepper.** Especially when a slider represents a wide range of values, people may appreciate seeing the exact slider value and having the ability to enter a specific value in a text field. Adding a stepper provides a convenient way for people to increment in whole values. For related guidance, see [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) and [Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers).

![An illustration of a horizontal linear slider without tick marks, followed by a text field and a stepper. The thumb is in the center of the slider and the text field displays 50%.](https://docs-assets.developer.apple.com/published/ce79e1e4b3b1faa688862341ed208792/sliders-text-field%402x.png)

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/sliders#Platform-considerations)

 _Not supported in tvOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/sliders#iOS-iPadOS)

**Don’t use a slider to adjust audio volume.** If you need to provide volume control in your app, use a volume view, which is customizable and includes a volume-level slider and a control for changing the active audio output device. For guidance, see [Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio).

### [macOS](https://developer.apple.com/design/human-interface-guidelines/sliders#macOS)

Sliders in macOS can also include tick marks, making it easier for people to pinpoint a specific value within the range.

In a linear slider either with or without tick marks, the thumb is a narrow lozenge shape, and the portion of track between the minimum value and the thumb is filled with color. A linear slider often includes supplementary icons that illustrate the meaning of the minimum and maximum values.

In a circular slider, the thumb appears as a small circle. Tick marks, when present, appear as evenly spaced dots around the circumference of the slider.

![An illustration of a horizontal slider with the thumb in the middle. The leading portion of the track up to the thumb is filled with a blue highlight color.](https://docs-assets.developer.apple.com/published/92445cf683c4dc1b179fb5359a0bdb28/sliders-no-tick-marks%402x.png)Linear slider without tick marks

![An illustration of a horizontal slider with the thumb between two tick marks in the middle of the slider. The leading portion of the track up to the thumb is filled with a blue highlight color.](https://docs-assets.developer.apple.com/published/e31ef9e35e8675bd62f695ba6a988a51/sliders-tick-marks%402x.png)Linear slider with tick marks

![An illustration of a circular slider with the thumb at the 12 o'clock position.](https://docs-assets.developer.apple.com/published/3f253ed199e7e92b6124e6161dd79152/sliders-circular%402x.png)Circular slider

**Consider giving live feedback as the value of a slider changes.** Live feedback shows people results in real time. For example, your Dock icons are dynamically scaled when adjusting the Size slider in Dock settings.

**Choose a slider style that matches peoples’ expectations.** A horizontal slider is ideal when moving between a fixed starting and ending point. For example, a graphics app might offer a horizontal slider for setting the opacity level of an object between 0 and 100 percent. Use circular sliders when values repeat or continue indefinitely. For example, a graphics app might use a circular slider to adjust the rotation of an object between 0 and 360 degrees. An animation app might use a circular slider to adjust how many times an object spins when animated — four complete rotations equals four spins, or 1440 degrees of rotation.

**Consider using a label to introduce a slider.** Labels generally use [sentence-style capitalization](https://help.apple.com/applestyleguide/#/apsgb744e4a3?sub=apdca93e113f1d64) and end with a colon. For guidance, see [Labels](https://developer.apple.com/design/human-interface-guidelines/labels).

**Use tick marks to increase clarity and accuracy.** Tick marks help people understand the scale of measurements and make it easier to locate specific values.

![A partial screenshot of the Energy Saver settings pane in macOS, cropped to show the slider that controls how long the display remains on after inactivity.](https://docs-assets.developer.apple.com/published/90d44ac8355f4a4e672e5e81633814e6/sliders-labels%402x.png)

**Consider adding labels to tick marks for even greater clarity.** Labels can be numbers or words, depending on the slider’s values. It’s unnecessary to label every tick mark unless doing so is needed to reduce confusion. In many cases, labeling only the minimum and maximum values is sufficient. When the values of the slider are nonlinear, like in the Energy Saver settings pane, periodic labels provide context. It’s also a good idea to provide a [tooltip](https://developer.apple.com/design/human-interface-guidelines/offering-help#macOS-visionOS) that displays the value of the thumb when people hold their pointer over it.

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/sliders#visionOS)

**Prefer horizontal sliders.** It’s generally easier for people to gesture from side to side than up and down.

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/sliders#watchOS)

A slider is a horizontal track — appearing as a set of discrete steps or as a continuous bar — that represents a finite range of values. People can tap buttons on the sides of the slider to increase or decrease its value by a predefined amount.

![An illustration of a watchOS volume slider with discrete steps. The first two of three steps are filled with a green highlight color, indicating the volume level.](https://docs-assets.developer.apple.com/published/3acc4339289d9cf65ec982e73f950f97/sliders-watchos-discrete%402x.png)Discrete

![An illustration of a watchOS volume slider with a continuous bar. Two-thirds of the bar is filled with a green highlight color, indicating the volume level.](https://docs-assets.developer.apple.com/published/b356f0616bad32afce9ac9e62763414b/sliders-watchos-continuous%402x.png)Continuous

**If necessary, create custom glyphs to communicate what the slider does.** The system displays plus and minus signs by default.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/sliders#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/sliders#Related)

[Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers)

[Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/sliders#Developer-documentation)

[`Slider`](https://developer.apple.com/documentation/SwiftUI/Slider) — SwiftUI

[`UISlider`](https://developer.apple.com/documentation/UIKit/UISlider) — UIKit

[`NSSlider`](https://developer.apple.com/documentation/AppKit/NSSlider) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/sliders#Change-log)

Date| Changes  
---|---  
June 21, 2023| Updated to include guidance for visionOS.  
  
