---
title: "NFC | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/nfc

# NFC

Near-field communication (NFC) allows devices within a few centimeters of each other to exchange information wirelessly.

![A sketch of progressively larger curved lines extending toward the right, suggesting near-field communication. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/5635074c80716ec35b369bee5dc930d0/technologies-nfc-intro%402x.png)

iOS apps running on supported devices can use NFC scanning to read data from electronic tags attached to real-world objects. For example, a person can scan a toy to connect it with a video game, a shopper can scan an in-store sign to access coupons, or a retail employee can scan products to track inventory.

## [In-app tag reading](https://developer.apple.com/design/human-interface-guidelines/nfc#In-app-tag-reading)

An app can support single- or multiple-object scanning when the app is active, and display a scanning sheet whenever people are about to scan something.

![An illustration of a scanning sheet on iPhone, which includes the text Ready to Scan and Hold your device near the NFC tag, and a Cancel button.](https://docs-assets.developer.apple.com/published/588da10ebfa2ce6ed48d0ebdd9507735/nfc-ready-to-scan%402x.png)

**Don’t encourage people to make contact with physical objects.** To scan a tag, an iOS device must simply be within close proximity of the tag. It doesn’t need to actually touch the tag. Use terms like _scan_ and _hold near_ instead of _tap_ and _touch_ when asking people to scan objects.

**Use approachable terminology.** Near-field communication may be unfamiliar to some people. To make it approachable, avoid referring to technical, developer-oriented terms like _NFC_ , _Core NFC_ , _Near-field communication_ , and _tag_. Instead, use friendly, conversational terms that most people will understand.

Use| Don’t use  
---|---  
Scan the [_object name_].| Scan the NFC tag.  
Hold your iPhone near the [_object name_] to learn more about it.| To use NFC scanning, tap your phone to the [_object_].  
  
**Provide succinct instructional text for the scanning sheet.** Provide a complete sentence, in sentence case, with ending punctuation. Identify the object to scan, and revise the text appropriately for subsequent scans. Keep the text short to avoid truncation.

First scan| Subsequent scans  
---|---  
Hold your iPhone near the [_object name_] to learn more about it.| Now hold your iPhone near another [_object name_].  
  
## [Background tag reading](https://developer.apple.com/design/human-interface-guidelines/nfc#Background-tag-reading)

Background tag reading lets people scan tags quickly any time, without needing to first open your app and initiate scanning. On devices that support background tag reading, the system automatically looks for nearby compatible tags whenever the screen is illuminated. After detecting and matching a tag with an app, the system shows a notification that the people can tap to send the tag data to the app for processing. Note that background reading isn’t available when an NFC scanning sheet is visible, Wallet or Apple Pay are in use, cameras are in use, the device is in Airplane Mode, and the device is locked after a restart.

![An illustration of a notification banner above the Home screen on iPhone, which offers an opportunity to open a specific app to process NFC tag data detected nearby.](https://docs-assets.developer.apple.com/published/f42e796e585f504e450d1bf030a66d69/nfc-background%402x.png)

**Support both background and in-app tag reading.** Your app must still provide an in-app way to scan tags, for people with devices that don’t support background tag reading.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/nfc#Platform-considerations)

 _No additional considerations for iOS or iPadOS. Not supported in macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/nfc#Resources)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/nfc#Developer-documentation)

[Core NFC](https://developer.apple.com/documentation/CoreNFC)

