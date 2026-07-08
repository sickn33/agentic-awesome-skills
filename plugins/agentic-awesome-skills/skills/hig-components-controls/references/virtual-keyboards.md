---
title: "Virtual keyboards | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards

# Virtual keyboards

On devices without physical keyboards, the system offers various types of virtual keyboards people can use to enter data.

![A stylized representation of a numeric keypad shown on top of a grid that suggests the canvas of a design tool. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/d5cea0a3ccb2af2881ade732675a1064/components-virtual-keyboard-intro%402x.png)

A virtual keyboard can provide a specific set of keys that are optimized for the current task; for example, a keyboard that supports entering email addresses can include the “@” character and a period or even “.com”. A virtual keyboard doesn’t support keyboard shortcuts.

When it makes sense in your app, you can replace the system-provided keyboard with a custom view that supports app-specific data entry. In iOS, iPadOS, and tvOS, you can also create an app extension that offers a custom keyboard people can install and use in place of the standard keyboard.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Best-practices)

**Choose a keyboard that matches the type of content people are editing.** For example, you can help people enter numeric data by providing the numbers and punctuation keyboard. When you specify a semantic meaning for a text input area, the system can automatically provide a keyboard that matches the type of input you expect, potentially using this information to refine the keyboard corrections it offers. For developer guidance, see [`keyboardType(_:)`](https://developer.apple.com/documentation/SwiftUI/View/keyboardType\(_:\)) (SwiftUI), [`textContentType(_:)`](https://developer.apple.com/documentation/SwiftUI/View/textContentType\(_:\))(SwiftUI), [`UIKeyboardType`](https://developer.apple.com/documentation/UIKit/UIKeyboardType) (UIKit), and [`UITextContentType`](https://developer.apple.com/documentation/UIKit/UITextContentType) (UIKit).

  * ASCII capable 
  * ASCII capable number pad 
  * Decimal pad 
  * Default 
  * Email address 
  * Name phone pad 
  * Number pad 
  * Numbers and punctuation 
  * Phone pad 
  * Twitter 
  * URL 
  * Web search 



![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, Space, and Return keys. Typing suggestions appear above the keyboard and the Dictation button appears below it.](https://docs-assets.developer.apple.com/published/1aeba403a2942689ee8efbfed71a7943/virtual-keyboard-ascii-capable%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 10 number keys in addition to the Delete key. Keys for the numbers 2 through 9 each include the 3 or 4 letters associated with the number on a phone.](https://docs-assets.developer.apple.com/published/1da579d09964a9bd81a0823d52fa18e5/virtual-keyboard-ascii-capable-number-pad%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 10 number keys in addition to the Delete and period keys. Keys for the numbers 2 through 9 each include the 3 or 4 letters associated with the number on a phone.](https://docs-assets.developer.apple.com/published/4b43048f8d2f13d8322b95266bc4c4f3/virtual-keyboard-decimal-pad%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, Space, and Return keys. Typing suggestions appear above the keyboard and the  Emoji and Dictation buttons appear below it.](https://docs-assets.developer.apple.com/published/34447cdc5d5eb61f1734a046f3d108c6/virtual-keyboard-default%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, Space, period, at symbol, and Return keys. Typing suggestions appear above the keyboard and the Emoji button appears below it.](https://docs-assets.developer.apple.com/published/e7dcd10c36065774ac8cadf76b09d8e4/virtual-keyboard-email-address%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, Space, and Return keys. Typing suggestions appear above the keyboard and the Emoji and Dictation buttons appear below it.](https://docs-assets.developer.apple.com/published/3228cd2d2cd6d36e3db1aff1d50ad903/virtual-keyboard-name-phone-pad%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 10 number keys in addition to the Delete key. Keys for the numbers 2 through 9 each include the 3 or 4 letters associated with the number on a phone.](https://docs-assets.developer.apple.com/published/679c33bdff61bc9e257982b7cffba264/virtual-keyboard-number-pad%402x.png)

![A partial screenshot of a keyboard on iPhone that displays 10 number and 15 punctuation keys in addition to the secondary punctuation key and the Delete, Letters, Space, and Return keys. Typing suggestions appear above the keyboard and the Dictation button appears below it.](https://docs-assets.developer.apple.com/published/916933140730b2db67f8004991c558aa/virtual-keyboard-numbers-and-punctuation%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 10 number keys in addition to the Delete key and a key for plus, star, and hash. Keys for the numbers 2 through 9 each include the 3 or 4 letters associated with the number on a phone.](https://docs-assets.developer.apple.com/published/b1b427eb7252b94e7b9d0095ccd04f56/virtual-keyboard-phone-pad%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, Space, at symbol, and hash keys. Typing suggestions appear above the keyboard and the Emoji and Dictation buttons appear below it.](https://docs-assets.developer.apple.com/published/21b1b12df6335045a6f29efc8cbdb5a1/virtual-keyboard-twitter%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, period, slash, dot com, and Return keys. Typing suggestions appear above the keyboard and the Emoji button appears below it.](https://docs-assets.developer.apple.com/published/daec1d80ab39aff3f52effb615f84425/virtual-keyboard-url%402x.png)

![A partial screenshot of a keyboard on iPhone that displays all 26 letter keys in addition to the Shift, Delete, Numbers, Space, period, and Go keys. Typing suggestions appear above the keyboard and the Emoji and Dictation buttons appear below it.](https://docs-assets.developer.apple.com/published/0618532f75b91e3f3be2416a363d4a43/virtual-keyboard-web-search%402x.png)

**Consider customizing the Return key type if it helps clarify the text-entry experience.** The Return key type is based on the keyboard type you choose, but you can change this if it makes sense in your app. For example, if your app initiates a search, you can use a search Return key type rather than the standard one so the experience is consistent with other places people initiate search. For developer guidance, see [`submitLabel(_:)`](https://developer.apple.com/documentation/SwiftUI/View/submitLabel\(_:\)) (SwiftUI) and [`UIReturnKeyType`](https://developer.apple.com/documentation/UIKit/UIReturnKeyType) (UIKit).

## [Custom input views](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Custom-input-views)

In some cases, you can create an _input view_ if you want to provide custom functionality that enhances data-entry tasks in your app. For example, Numbers provides a custom input view for entering numeric values while editing a spreadsheet. A custom input view replaces the system-provided keyboard while people are in your app. For developer guidance, see [`ToolbarItemPlacement`](https://developer.apple.com/documentation/SwiftUI/ToolbarItemPlacement) (SwiftUI) and [`inputViewController`](https://developer.apple.com/documentation/UIKit/UIResponder/inputViewController) (UIKit).

**Make sure your custom input view makes sense in the context of your app.** In addition to making data entry simple and intuitive, you want people to understand the benefits of using your custom input view. Otherwise, they may wonder why they can’t regain the system keyboard while in your app.

**Play the standard keyboard sound while people type.** The keyboard sound provides familiar feedback when people tap a key on the system keyboard, so they’re likely to expect the same sound when they tap keys in your custom input view. People can turn keyboard sounds off for all keyboard interactions in Settings > Sounds. For developer guidance, see [`playInputClick()`](https://developer.apple.com/documentation/UIKit/UIDevice/playInputClick\(\)) (UIKit).

## [Custom keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Custom-keyboards)

In iOS, iPadOS, and tvOS, you can provide a custom keyboard that replaces the system keyboard by creating an app extension. An _app extension_ is code you provide that people can install and use to extend the functionality of a specific area of the system; to learn more, see [App extensions](https://developer.apple.com/app-extensions/).

After people choose your custom keyboard in Settings, they can use it for text entry within any app, except when editing secure text fields and phone number fields. People can choose multiple custom keyboards and switch between them at any time. For developer guidance, see [Creating a custom keyboard](https://developer.apple.com/documentation/UIKit/creating-a-custom-keyboard).

Custom keyboards make sense when you want to expose unique keyboard functionality systemwide, such as a novel way of inputting text or the ability to type in a language the system doesn’t support. If you want to provide a custom keyboard for people to use only while they’re in your app, consider creating a custom input view instead.

**Provide an obvious and easy way to switch between keyboards.** People know that the Globe key on the standard keyboard — which replaces the dedicated Emoji key when multiple keyboards are available — quickly switches to other keyboards, and they expect a similarly intuitive experience in your keyboard.

**Avoid duplicating system-provided keyboard features.** On some devices, the Emoji/Globe key and Dictation key automatically appear beneath the keyboard, even when people are using custom keyboards. Your app can’t affect these keys, and it’s likely to be confusing if you repeat them in your keyboard.

**Consider providing a keyboard tutorial in your app.** People are used to the standard keyboard, and learning how to use a new keyboard can take time. You can help make the process easier by providing usage instructions in your app — for example, you might tell people how to choose your keyboard, activate it during text entry, use it, and switch back to the standard keyboard. Avoid displaying help content within the keyboard itself.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Platform-considerations)

 _Not supported in macOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#iOS-iPadOS)

**Use the keyboard layout guide to make the keyboard feel like an integrated part of your interface.** Using the layout guide also helps you keep important parts of your interface visible while the virtual keyboard is onscreen. For developer guidance, see [Adjusting your layout with keyboard layout guide](https://developer.apple.com/documentation/UIKit/adjusting-your-layout-with-keyboard-layout-guide).

![An illustration of an app layout on iPhone, showing two stacked text fields and a button above the keyboard.](https://docs-assets.developer.apple.com/published/2d310619deb1ce3587596b7fee6e5b08/ui-fully-visible%402x.png)

![A checkmark in a circle to indicate a correct example.](https://docs-assets.developer.apple.com/published/88662da92338267bb64cd2275c84e484/checkmark%402x.png)The keyboard layout guide helps ensure that app UI and the keyboard work well together.

![An illustration of an app layout on iPhone, showing two stacked text fields. The keyboard covers part of the bottom text field.](https://docs-assets.developer.apple.com/published/b2612a1b69632d398d2744caee9ff1e2/text-field-hidden%402x.png)

![An X in a circle to indicate an incorrect example.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)Without the layout guide, the keyboard could make entering text more difficult.

![An illustration of an app layout on iPhone, showing two stacked text fields and a button above the keyboard. The keyboard covers part of the button.](https://docs-assets.developer.apple.com/published/3a2b1c460427926e69f4d3e8d1383aef/button-hidden%402x.png)

![An X in a circle to indicate an incorrect example.](https://docs-assets.developer.apple.com/published/209f6f0fc8ad99d9bf59e12d82d06584/crossout%402x.png)Without the layout guide, the keyboard could make tapping a button more difficult.

**Place custom controls above the keyboard thoughtfully.** Some apps position an input accessory view containing custom controls above the keyboard to offer app-specific functionality related to the data people are working with. For example, Numbers displays controls that help people apply standard or custom calculations to spreadsheet data. If your app offers custom controls that augment the keyboard, make sure they’re relevant to the current task. If other views in your app use Liquid Glass, or if your view looks out of place above the keyboard, apply Liquid Glass to the view that contains your controls to maintain consistency. If you use a standard toolbar to contain your controls, it automatically adopts Liquid Glass. Use the keyboard layout guide and standard padding to ensure the system positions your controls as expected within the view. For developer guidance, see [`ToolbarItemPlacement`](https://developer.apple.com/documentation/SwiftUI/ToolbarItemPlacement) (SwiftUI), [`inputAccessoryView`](https://developer.apple.com/documentation/UIKit/UIResponder/inputAccessoryView) (UIKit), and [`UIKeyboardLayoutGuide`](https://developer.apple.com/documentation/UIKit/UIKeyboardLayoutGuide) (UIKit).

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#tvOS)

tvOS displays a linear virtual keyboard when people select a text field using the Siri Remote.

Note

A grid keyboard screen appears when people use devices other than the Siri Remote, and the layout of content automatically adapts to the keyboard.

When people activate a digit entry view, tvOS displays a digit-specific keyboard. For guidance, see [Digit entry views](https://developer.apple.com/design/human-interface-guidelines/digit-entry-views).

### [visionOS](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#visionOS)

In visionOS, the system-provided virtual keyboard supports both direct and indirect gestures and appears in a separate window that people can move where they want. You don’t need to account for the location of the keyboard in your layouts.

Video with custom controls. 

Content description: A recording showing a person typing on a virtual keyboard in visionOS. 

Play 

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#watchOS)

On Apple Watch, a text field can show a keyboard if the device screen is large enough. Otherwise, the system lets people use dictation or Scribble to enter information. You can’t change the keyboard type in watchOS, but you can set the content type of the text field. The system uses this information to make text entry easier, such as by offering suggestions. For developer guidance, see [`textContentType(_:)`](https://developer.apple.com/documentation/SwiftUI/View/textContentType\(_:\)) (SwiftUI).

People can also use a nearby paired iPhone to enter text on Apple Watch.

## [Resources](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Related)

[Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)

[Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Developer-documentation)

[`keyboardType(_:)`](https://developer.apple.com/documentation/SwiftUI/View/keyboardType\(_:\)) — SwiftUI

[`textContentType(_:)`](https://developer.apple.com/documentation/SwiftUI/View/textContentType\(_:\)) — SwiftUI

[`UIKeyboardType`](https://developer.apple.com/documentation/UIKit/UIKeyboardType) — UIKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards#Change-log)

Date| Changes  
---|---  
June 9, 2025| Added guidance for displaying custom controls above the keyboard, and updated to reflect virtual keyboard availability in watchOS.  
February 2, 2024| Clarified the virtual keyboard’s support for direct and indirect gestures in visionOS.  
December 5, 2023| Added artwork for visionOS.  
June 21, 2023| Changed page title from Onscreen keyboards and updated to include guidance for visionOS.  
  
