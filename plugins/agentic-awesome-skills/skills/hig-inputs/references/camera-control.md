---
title: "Camera Control | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/camera-control

# Camera Control

The Camera Control provides direct access to your app’s camera experience.

![A stylized representation of the Camera Control.](https://docs-assets.developer.apple.com/published/73774a69a0e7738c02ffdaeccfe03830/inputs-camera-control-intro%402x.png)

On iPhone 16 and iPhone 16 Pro models, the Camera Control quickly opens your app’s camera experience to capture moments as they happen. When a person lightly presses the Camera Control, the system displays an overlay that extends from the device bezel.

![A screenshot showing callouts to the Camera Control and overlay on iPhone in landscape orientation.](https://docs-assets.developer.apple.com/published/3d9efd41aaf5eb91e9d51fdf57a26472/camera-control-button-callout%402x.png)

The overlay allows people to quickly adjust controls. A person can view the available controls by lightly double-pressing the Camera Control. After selecting a control, they can slide their finger on the Camera Control to adjust a value to capture their content as they want.

![A partial screenshot of the Camera Control overlay displaying its controls.](https://docs-assets.developer.apple.com/published/59fe90435020556bfc9b5ed3f003b651/camera-control-picker%402x.png)Controls in the overlay

## [Anatomy](https://developer.apple.com/design/human-interface-guidelines/camera-control#Anatomy)

The Camera Control offers two types of controls for adjusting values or changing between options:

  * A _slider_ provides a range of values to choose from, such as how much contrast to apply to the content.

  * A _picker_ offers discrete options, such as turning a grid on and off in the viewfinder.




![A partial screenshot of the Camera Control overlay displaying a slider control.](https://docs-assets.developer.apple.com/published/3bb2ecfcd292742f087c064e5dfd1ec5/camera-control-slider-control%402x.png)Slider control

![A partial screenshot of the Camera Control overlay displaying a picker control.](https://docs-assets.developer.apple.com/published/27e6bc8836d9265133dd150098c3865d/camera-control-picker-control%402x.png)Picker control

In addition to custom controls that you create, the system provides a set of standard controls that you can optionally include in the overlay to allow someone to adjust their camera’s zoom and exposure.

![A partial screenshot of the Camera Control overlay displaying the system zoom factor control.](https://docs-assets.developer.apple.com/published/3bb2ecfcd292742f087c064e5dfd1ec5/system-control-type-zoom-factor%402x.png)Zoom factor control

![A partial screenshot of the Camera Control overlay displaying the system exposure bias control.](https://docs-assets.developer.apple.com/published/47568cc559bb20a5cea03ded2199916b/system-control-type-exposure-bias%402x.png)Exposure bias control

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/camera-control#Best-practices)

**Use SF Symbols to represent control functionality.** The system doesn’t support custom symbols; instead, pick a symbol from SF Symbols that clearly denotes a control’s behavior. iOS offers thousands of symbols you can use to represent the controls your app shows in the overlay. Symbols for controls don’t represent their current state. To view available symbols, see the Camera & Photos section in the [SF Symbols app](https://developer.apple.com/sf-symbols/).

![A partial screenshot of the Camera Control overlay displaying a camera flash control that uses the bolt.fill symbol.](https://docs-assets.developer.apple.com/published/29e9dac71ac35e1d3d9510a545fce3c3/camera-control-picker-sf-symbols-flash%402x.png)The `bolt.fill` symbol that represents a control for the camera flash

![A partial screenshot of the Camera Control overlay displaying a camera filters control that uses the camera.filters symbol.](https://docs-assets.developer.apple.com/published/17466338143a202a0241d26725f23048/camera-control-picker-sf-symbols-filters%402x.png)The `camera.filters` symbol that represents a control for filters

**Keep names of controls short.** Control labels adhere to Dynamic Type sizes, and longer names may obfuscate the camera’s viewfinder.

**Include units or symbols with slider control values to provide context.** Providing descriptive information in the overlay, such as EV, %, or a custom string, helps people understand what the slider controls. For developer guidance, see [`localizedValueFormat`](https://developer.apple.com/documentation/AVFoundation/AVCaptureSlider/localizedValueFormat).

![A partial screenshot showing an example of the Camera Control overlay with a slider control displaying a value and context for the type of value.](https://docs-assets.developer.apple.com/published/00f466e6926811164965fdb40483a34c/system-control-with-label%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)Value with context

![A partial screenshot showing an example of the Camera Control overlay with a slider control displaying a value without information about what the value represents.](https://docs-assets.developer.apple.com/published/b965fe40e836dfce1361f8653c3d2abb/system-control-no-label%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)Value without context

**Define prominent values for a slider control.** Prominent values are ones people choose most frequently, or values that are evenly spaced, like the major increments of zoom factor. When a person slides on the Camera Control to adjust a slider control, the system more easily lands on prominent values you define. For developer guidance, see [`prominentValues`](https://developer.apple.com/documentation/AVFoundation/AVCaptureSlider/prominentValues-199dz).

**Make space for the overlay in the viewfinder.** The overlay and control labels occupy the screen area adjacent to the Camera Control in both portrait and landscape orientations. To avoid overlapping the interface elements of your camera capture experience, place your UI outside of the overlay areas. Maximize the height and width of the viewfinder and allow the overlay to appear and disappear over it.

![Partial screenshots showing the Camera Control overlay with its control's label in the viewport in portrait and landscape orientations on iPhone.](https://docs-assets.developer.apple.com/published/efa0584ce5fa07cd540174b71ef59d6d/camera-control-portrait-landscape-orientation%402x.png)

**Minimize distractions in the viewfinder.** When capturing a photo or video, people appreciate a large preview image with as few visual distractions as possible. Avoid duplicating controls, like sliders and toggles, in your UI and the overlay when the system displays the overlay.

![A partial screenshot showing an example of the Camera Control overlay with UI elements removed from the capture viewport.](https://docs-assets.developer.apple.com/published/9cd4da3793671dd837c50d855ab265df/camera-control-screen-ui-good-example%402x.png)

![A checkmark in a circle to indicate correct usage.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)Keep UI minimal.

![A partial screenshot showing an example of the Camera Control overlay with UI elements duplicated in the capture viewport.](https://docs-assets.developer.apple.com/published/eb4a1bc88b0f16c3074d57f8ff3afb9f/camera-control-screen-ui-bad-example%402x.png)

![An X in a circle to indicate incorrect usage.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)Avoid showing controls in the viewfinder that people access in the overlay.

**Enable or disable controls depending on the camera mode.** For example, disable video controls when taking photos. The overlay supports multiple controls, but you can’t remove or add controls at runtime.

**Consider how to arrange your controls.** Order commonly used controls toward the middle to allow quick access, and include lesser used controls on either side. When a person lightly presses the Camera Control to open the overlay again, the system remembers the last control they used in your app.

**Allow people to use the Camera Control to launch your experience from anywhere.** Create a locked camera capture extension that lets people configure the Camera Control to launch your app’s camera experience from their locked device, the Home Screen, or from within other apps. For guidance, see [Camera experiences on a locked device](https://developer.apple.com/design/human-interface-guidelines/controls#Camera-experiences-on-a-locked-device).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/camera-control#Platform-considerations)

 _Not supported in iPadOS, macOS, watchOS, tvOS, or visionOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/camera-control#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/camera-control#Related)

[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

[Controls](https://developer.apple.com/design/human-interface-guidelines/controls)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/camera-control#Developer-documentation)

[Enhancing your app experience with the Camera Control](https://developer.apple.com/documentation/AVFoundation/enhancing-your-app-experience-with-the-camera-control) — AVFoundation

[`AVCaptureControl`](https://developer.apple.com/documentation/AVFoundation/AVCaptureControl) — AVFoundation

[LockedCameraCapture](https://developer.apple.com/documentation/LockedCameraCapture)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/camera-control#Change-log)

Date| Changes  
---|---  
September 9, 2024| New page.  
  
