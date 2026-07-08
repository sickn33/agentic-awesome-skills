---
title: "Pickers | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/pickers

# Pickers

A picker displays one or more scrollable lists of distinct values that people can choose from.

![A stylized representation of a selected item in a scrollable list. The image is tinted red to subtly reflect the red in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/56b152d613ef1fc1424549eaa95a23d6/components-pickers-intro%402x.png)

The system provides several styles of pickers, each of which offers different types of selectable values and has a different appearance. The exact values shown in a picker, and their order, depend on the device language.

Pickers help people enter information by letting them choose single or multipart values. Date pickers specifically offer additional ways to choose values, like selecting a day in a calendar view or entering dates and times using a numeric keypad.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/pickers#Best-practices)

**Consider using a picker to offer medium-to-long lists of items.** If you need to display a fairly short list of choices, consider using a [pull-down button](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons) instead of a picker. Although a picker makes it easy to scroll quickly through many items, it may add too much visual weight to a short list of items. On the other hand, if you need to present a very large set of items, consider using a [list or table](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables). Lists and tables can adjust in height, and tables can include an index, which makes it much faster to target a section of the list.

**Use predictable and logically ordered values.** Before people interact with a picker, many of its values can be hidden. It’s best when people can predict what the hidden values are, such as with an alphabetized list of countries, so they can move through the items quickly.

**Avoid switching views to show a picker.** A picker works well when displayed in context, below or in proximity to the field people are editing. A picker typically appears at the bottom of a window or in a popover.

**Consider providing less granularity when specifying minutes in a date picker.** By default, a minute list includes 60 values (0 to 59). You can optionally increase the minute interval as long as it divides evenly into 60. For example, you might want quarter-hour intervals (0, 15, 30, and 45).

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/pickers#Platform-considerations)

 _No additional considerations for visionOS._

### [iOS, iPadOS](https://developer.apple.com/design/human-interface-guidelines/pickers#iOS-iPadOS)

A date picker is an efficient interface for selecting a specific date, time, or both, using touch, a keyboard, or a pointing device. You can display a date picker in one of the following styles:

  * Compact — A button that displays editable date and time content in a modal view.

  * Inline — For time only, a button that displays wheels of values; for dates and times, an inline calendar view.

  * Wheels — A set of scrolling wheels that also supports data entry through built-in or external keyboards.

  * Automatic — A system-determined style based on the current platform and date picker mode.




A date picker has four modes, each of which presents a different set of selectable values.

  * Date — Displays months, days of the month, and years.

  * Time — Displays hours, minutes, and (optionally) an AM/PM designation.

  * Date and time — Displays dates, hours, minutes, and (optionally) an AM/PM designation.

  * Countdown timer — Displays hours and minutes, up to a maximum of 23 hours and 59 minutes. This mode isn’t available in the inline or compact styles.




The exact values shown in a date picker, and their order, depend on the device location.

Here are several examples of date pickers showing different combinations of style and mode.

  * Compact 
  * Inline 
  * Wheels 



![An illustration of a compact date picker, with a single inline row showing the currently selected date. The picker opens as a popover extending down from the row, and includes a full calendar month for choosing the date.](https://docs-assets.developer.apple.com/published/65d6693bf614da95dde6a82006037c86/pickers-date-picker-compact-expanded%402x.png)In a compact layout, a picker opens as a popover over your content.

![An illustration of an inline date picker, titled 'Date'. A toggle at the top is switched on, and a calendar month for choosing the date appears below the title and toggle.](https://docs-assets.developer.apple.com/published/053773055a1630d38d3baa6ec6147f5d/pickers-date-picker-inline-expanded%402x.png)In an inline layout, a picker opens inline with your content.

![An illustration of an inline time picker, titled 'Time'. The currently selected time appears in the title row, and three vertical wheels appear below the title row for choosing the hour, minute, and AM or PM value.](https://docs-assets.developer.apple.com/published/4474f286571f0a7b875bbd940f39bb78/pickers-time-picker-inline-wheel%402x.png)Another example of an inline picker uses wheels to choose values for date and time.

**Use a compact date picker when space is constrained.** The compact style displays a button that shows the current value in your app’s accent color. When people tap the button, the date picker opens a modal view, providing access to a familiar calendar-style editor and time picker. Within the modal view, people can make multiple edits to dates and times before tapping outside the view to confirm their choices.

### [macOS](https://developer.apple.com/design/human-interface-guidelines/pickers#macOS)

**Choose a date picker style that suits your app.** There are two styles of date pickers in macOS: textual and graphical. The textual style is useful when you’re working with limited space and you expect people to make specific date and time selections. The graphical style is useful when you want to give people the option of browsing through days in a calendar or selecting a range of dates, or when the look of a clock face is appropriate for your app.

For developer guidance, see [`NSDatePicker`](https://developer.apple.com/documentation/AppKit/NSDatePicker).

### [tvOS](https://developer.apple.com/design/human-interface-guidelines/pickers#tvOS)

Pickers are available in tvOS with SwiftUI. For developer guidance, see [`Picker`](https://developer.apple.com/documentation/SwiftUI/Picker).

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/pickers#watchOS)

Pickers display lists of items that people navigate using the Digital Crown, which helps people manage selections in a precise and engaging way.

A picker can display a list of items using the wheels style. watchOS can also display date and time pickers using the wheels style. For developer guidance, see [`Picker`](https://developer.apple.com/documentation/SwiftUI/Picker) and [`DatePicker`](https://developer.apple.com/documentation/SwiftUI/DatePicker).

![An illustration representing a screen containing a picker view on Apple Watch, showing three items in a list. The center item is highlighted.](https://docs-assets.developer.apple.com/published/00d1eeb88cc503430767c2318605a71d/pickers-wheel-watch%402x.png)

![An illustration representing a screen containing a date picker on Apple Watch, with the day highlighted.](https://docs-assets.developer.apple.com/published/30053c6f5cb2c0246e5ebecbd8ad70c3/pickers-date-watch%402x.png)

![An illustration representing a screen containing a time picker on Apple Watch, with the minutes highlighted.](https://docs-assets.developer.apple.com/published/842ba89f2c3fdb2894949dee31bf8849/pickers-time-watch%402x.png)

You can configure a picker to display an outline, caption, and scrolling indicator.

For longer lists, the navigation link displays the picker as a button. When someone taps the button, the system shows the list of options. The person can also scrub through the options using the Digital Crown without tapping the button. For developer guidance, see [`navigationLink`](https://developer.apple.com/documentation/SwiftUI/PickerStyle/navigationLink).

![An illustration representing a screen that contains a picker button on Apple Watch. The button’s text denotes that the second item is selected.](https://docs-assets.developer.apple.com/published/657d90a59d600e7eee70effde6784e45/pickers-navigation-button-watch%402x.png)

![An illustration representing a screen showing a list of items on Apple Watch. The second item in the list is selected.](https://docs-assets.developer.apple.com/published/1e533809fb6fc291a53fd12ff0ec41f4/pickers-navigation-list-watch%402x.png)

## [Resources](https://developer.apple.com/design/human-interface-guidelines/pickers#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/pickers#Related)

[Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons)

[Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/pickers#Developer-documentation)

[`Picker`](https://developer.apple.com/documentation/SwiftUI/Picker) — SwiftUI

[`UIDatePicker`](https://developer.apple.com/documentation/UIKit/UIDatePicker) — UIKit

[`UIPickerView`](https://developer.apple.com/documentation/UIKit/UIPickerView) — UIKit

[`NSDatePicker`](https://developer.apple.com/documentation/AppKit/NSDatePicker) — AppKit

## [Change log](https://developer.apple.com/design/human-interface-guidelines/pickers#Change-log)

Date| Changes  
---|---  
June 5, 2023| Updated guidance for using pickers in watchOS.  
  
