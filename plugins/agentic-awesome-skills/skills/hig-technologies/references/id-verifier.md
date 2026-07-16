---
title: "ID Verifier | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/id-verifier

# ID Verifier

ID Verifier lets your iPhone app read mobile IDs in person without requiring external hardware.

![A sketch of progressively larger curved lines emerging from the bottom corner of an ID card, suggesting ID Verifier. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/8d77246d289837a097f0556d6e7d2c7d/technologies-ID-Verifier-Apps-intro%402x.png)

Beginning in iOS 17, you can integrate ID Verifier into your app, letting iPhone read ISO18013-5 compliant mobile IDs and helping you support in-person ID verification. For example, personnel at a concert venue can use your app on iPhone to verify customers’ ages.

Using ID Verifier has advantages for both customers and organizations.

  * Customers only present the minimum data needed to prove their age or identity, without handing over their ID card or showing their device.

  * Apple provides the key components of the certificate issuance, management, and validation process, simplifying app development and enabling a consistent and trusted ID verification experience.




Depending on the needs of your app, you can use ID Verifier to make the following types of requests:

  * **Display Only request.** Use a Display Only request to display data — such as a person’s name or age alongside their photo portrait — within system-provided UI on the requester’s iPhone, so the requester can visually confirm the person’s identity. When you make a Display Only request, the customer’s data remains within the system-provided UI and isn’t transmitted to your app. For developer guidance, see [`MobileDriversLicenseDisplayRequest`](https://developer.apple.com/documentation/ProximityReader/MobileDriversLicenseDisplayRequest).

  * **Data Transfer request.** Use a Data Transfer request only when you have a legal verification requirement and you need to store or process information like a person’s address or date of birth. You must request an additional entitlement to make a Data Transfer request. To learn more, see [Get started with ID Verifier](https://developer.apple.com/wallet/id-verifier/); for developer guidance, see [`MobileDriversLicenseDataRequest`](https://developer.apple.com/documentation/ProximityReader/MobileDriversLicenseDataRequest) and [`MobileDriversLicenseRawDataRequest`](https://developer.apple.com/documentation/ProximityReader/MobileDriversLicenseRawDataRequest).




## [Best practices](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Best-practices)

**Ask only for the data you need.** People may lose trust in the experience if you ask for more data than you need to complete the current verification. For example, if you need to ensure that a customer is at least a minimum age, use a request that specifies an age threshold; avoid requesting the customer’s current age or birth date. For developer guidance, see [`ageAtLeast(_:)`](https://developer.apple.com/documentation/ProximityReader/MobileDriversLicenseDataRequest/Element/ageAtLeast\(_:\)).

**If your app qualifies for Apple Business Register, register for ID Verifier to ensure that people can view essential information about your organization when you make a request.** Registering for ID Verifier with Apple Business Register lets you provide your official organization name and logo for the system to display on customers’ devices as part of the ID verification UI. To learn if your app qualifies and how to register, see [Apple Business Register](https://register.apple.com/services/login?returnTo=/signin/tap-to-present-id-on-iphone).

**Provide a button that initiates the verification process.** Use a label like Verify Age in a button that performs a simple age check or Verify Identity for a more detailed identity data request. Avoid including a symbol that specifies a particular type of communication, like NFC or QR codes. Never include the Apple logo in any button label.

Button type| Example usage  
---|---  
![An illustration of a Verify Age button.](https://docs-assets.developer.apple.com/published/68f99fdea3def2ba04aee092c3465400/id-verifier-button-age%402x.png)| An app that checks whether people are old enough to attend an event or access a venue, like a concert hall.  
![An illustration of a Verify Identity button.](https://docs-assets.developer.apple.com/published/1e827d68149ef111a2ff7ebec21912a0/id-verifier-button-identity%402x.png)| An app that verifies whether specific identity information matches expected values, such as name and birth date when picking up a rental car.  
  
**In a Display Only request, help the person using your app provide feedback on the visual confirmation they perform.** For example, when the reader displays the customer’s portrait, you might provide buttons labeled Matches Person and Doesn’t Match Person so your app can receive an approved or rejected value as part of the response.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Platform-considerations)

 _No additional considerations for iOS. Not supported in iPadOS, macOS, tvOS, visionOS, or watchOS._

## [Resources](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Related)

[Apple Business Register](https://register.apple.com/services/login?returnTo=/signin/tap-to-present-id-on-iphone)

[IDs in Wallet](https://learn.wallet.apple/id)

[Identity verification](https://developer.apple.com/design/human-interface-guidelines/wallet#Identity-verification)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Developer-documentation)

[Adopting the Verifier API in your iPhone app](https://developer.apple.com/documentation/ProximityReader/adopting-the-verifier-api-in-your-iphone-app) — ProximityReader

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/D35E0E85-CCB6-41A1-B227-7995ECD83ED5/0F2B5692-7E7D-4716-9E5F-63E4A4FA13ED/8168_wide_250x141_1x.jpg) What’s new in Wallet and Apple Pay ](https://developer.apple.com/videos/play/wwdc2023/10114)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/id-verifier#Change-log)

Date| Changes  
---|---  
September 12, 2023| New page.  
  
