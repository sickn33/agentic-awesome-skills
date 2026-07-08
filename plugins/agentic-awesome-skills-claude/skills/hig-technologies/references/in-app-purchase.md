---
title: "In-app purchase | Apple Developer Documentation"
source: https://developer.apple.com/design/human-interface-guidelines/in-app-purchase

# In-app purchase

People can use in-app purchase to pay for virtual goods — like premium content, digital goods, and subscriptions — securely within your app.

![A sketch of an add button, suggesting the purchase of additional digital assets within an app. The image is overlaid with rectangular and circular grid lines and is tinted blue to subtly reflect the blue in the original six-color Apple logo.](https://docs-assets.developer.apple.com/published/201d9efc48577c3322506c6fec1d57aa/technologies-IAP-intro%402x.png)

You can also promote and offer in-app purchases directly through the App Store. For developer guidance, see [In-App Purchase](https://developer.apple.com/documentation/StoreKit/in-app-purchase).

Tip

In-app purchase and [Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay) are different technologies that support different use cases. Use in-app purchase to sell virtual goods in your app, such as premium content for your app and subscriptions for digital content. Use Apple Pay in your app to sell physical goods like groceries, clothing, and appliances; for services such as club memberships, hotel reservations, and event tickets; and for donations.

Using in-app purchase, there are four types of content you can offer:

  * _Consumable_ content like lives or gems in a game. After purchase, consumable content depletes as people use it, and people can purchase it again.

  * _Non-consumable_ content like premium features in an app. Purchased non-consumable content doesn’t expire.

  * _Auto-renewable subscriptions_ to virtual content, services, and premium features in your app on an ongoing basis. An auto-renewable subscription continues to automatically renew at the end of each subscription period until people choose to cancel it.

  * _Non-renewing subscriptions_ to a service or content that lasts for a limited time, like access to an in-game battle pass. People purchase a non-renewing subscription each time they want to extend their access to the service or content.




![A screenshot of The Coast game’s in-app purchase store on iPad, featuring a row of five boosts that include lighthouse repairs and a power surge, above a row of five in-game maps with names like World Canals, The Great Lakes, and Famous Bays.](https://docs-assets.developer.apple.com/published/842775b676356f64f170bf778ddcac4f/iap-intro%402x.png)

For marketing and business guidance, see [In-app purchase](https://developer.apple.com/in-app-purchase/) and [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/). For information about what you can and can’t sell in your app, including in-app purchase usage requirements and restrictions, see [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

Note

For apps with exceptionally large, frequently updated catalogs of one-time purchases or subscription content from multiple creators, or apps that provide subscriptions with optional add-on content as a single purchase within the app, the Advanced Commerce API allows you to manage your In-App Purchase catalog directly. See the Advanced Commerce API [App Store support page](https://developer.apple.com/in-app-purchase/advanced-commerce-api/) for an overview, and see [Advanced Commerce API](https://developer.apple.com/documentation/AdvancedCommerceAPI) for developer guidance.

## [Best practices](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Best-practices)

**Let people experience your app before making a purchase.** People may be more inclined to invest in paid items or features after they’ve enjoyed your app and discovered its value. If you offer auto-renewable subscriptions, consider supporting limited free access to your content; for guidance, see [Auto-renewable subscriptions](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Auto-renewable-subscriptions).

**Design an integrated shopping experience.** You don’t want people to think they’ve entered a different app when they browse and purchase your digital products. Present products and handle transactions in ways that mirror the style of your app.

**Use simple, succinct product names and descriptions.** Titles that don’t truncate or wrap and plain, direct language can help people find products quickly.

**Display the total billing price for each in-app purchase you offer, regardless of type.** People need to know the total billing amount for every purchase they consider.

**Display your store only when people can make payments.** If someone canʼt make payments — for example, because of parental restrictions — consider hiding your store or displaying UI that explains why the store isnʼt available. For developer guidance, see [`canMakePayments`](https://developer.apple.com/documentation/StoreKit/AppStore/canMakePayments).

**Use the default confirmation sheet.** When someone initiates an in-app purchase, the system displays a confirmation sheet to help prevent accidental purchases. Don’t modify or replicate this sheet.

### [Supporting Family Sharing](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Supporting-Family-Sharing)

People can use Family Sharing to share access to their purchased content — such as auto-renewable subscriptions and non-consumable in-app purchases — with up to five additional family members, across all their Apple devices. To encourage people to take advantage of the Family Sharing support you offer, consider the following guidelines.

**Prominently mention Family Sharing in places where people learn about the content you offer.** For example, including “Family” or “Shareable” in a subscription or item name and referring to Family Sharing in your sign-up screen can highlight the feature and help people make an informed choice.

**Help people understand the benefits of Family Sharing and how to participate.** When you turn on Family Sharing, people can receive notifications about the change, depending on their current settings. For example, an existing subscriber whose sharing setting is turned off (the default) receives a notice from Apple that invites them to share their subscription with family members. Similarly, a family member can get a notification about content that’s being shared with them. (To learn more about the types of notifications people can receive, see [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/).)

**Aim to customize your in-app messaging so that it makes sense to both purchasers and family members.** For example, when a family member views shared content for the first time, you might welcome them with wording like “Your family subscription includes…”.

### [Providing help with in-app purchases](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Providing-help-with-in-app-purchases)

Sometimes, people need help with a purchase or want to request a refund. To help make this experience convenient, you can present custom UI within your app that provides assistance, offers alternative solutions, and helps people initiate the system-provided refund flow. For developer guidance, see [`beginRefundRequest(for:in:)`](https://developer.apple.com/documentation/StoreKit/Transaction/beginRefundRequest\(for:in:\)-65tph); for related guidance specific to auto-renewable subscriptions, see [Helping people manage their subscriptions](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Helping-people-manage-their-subscriptions).

**Provide help that customers can view before they request a refund.** In addition to including a link to the system-provided refund flow, your custom purchase-help screen can provide assistance you tailor to your app. For example, your custom screen might help people resolve problems with missing purchases, answer frequently asked questions about the in-app purchases you offer, and give people ways to submit feedback or contact you directly for support.

![A partial screenshot of an app’s help screen on iPhone. The Back button is in the top-left of the screen. In a list titled ’How can we help?’ there are the following five help items, each of which can open a new screen: Missing a Purchase, Frequently Asked Questions, Request a Refund, Submit Feedback, and Contact Us.](https://docs-assets.developer.apple.com/published/44193c071a05fe28f61658f9e37204f2/custom-purchase-help%402x.png)

**Use a simple title for the refund action, like “Refund” or “Request a Refund”.** The system-provided refund flow makes it clear that people request a refund from Apple, so there’s no need to reiterate this information.

**Help people find the problematic purchase.** For each recent purchase you display, include contextual information that helps people identify the one they want. For example, you might display an image of the product — along with its name and description — and list the original purchase date.

![A partial screenshot of an app’s refund screen titled Request a Refund on iPhone. The Back button in the top-left of the screen is labeled 'Help' to indicate it takes people back to the help screen. In a list titled Purchases, the screen displays the following three recent purchases: Power Surge, Les Cheneaux Islands, and Cape Cod.](https://docs-assets.developer.apple.com/published/3c43b3f13901fd62f0b6e33ef423bccb/custom-refund-request%402x.png)

**Consider offering alternative solutions.** For example, if the customer didn’t receive the item they purchased, you might offer immediate fulfillment or a conciliatory item. Regardless of the alternatives you offer, make it clear that people can still request a refund.

**Make it easy for people to request a refund.** Although your purchase-help screen can offer useful information and alternative solutions, make sure this content doesn’t create a barrier to requesting a refund. For example, avoid making people scroll or open another screen to reveal your refund-request button. When people choose your refund-request item, they automatically enter the system-provided refund flow shown below.

![A screenshot of the system-provided refund-request sheet on iPhone. The title Request Refund appears in the top center and a close button is in the top right. Below the title, the sheet displays the following information about the refund item: an image of a lighthouse, the title Power Surge for The Coast, the cost $2.99, the purchase date June 5, 2023, and the Apple Account chavez four at iCloud dot com. Below the item information, the sheet lists the following five issues to choose from: I didn’t mean to buy this, A child/minor made purchase without permission, My purchase does not work as expected, Purchase not received, and Other. A checkmark appears next to My purchase does not work as expected. Below the list is the statement ’You may lose access to refunded items’ and a Request Refund button at the bottom of the sheet.](https://docs-assets.developer.apple.com/published/b250a6bd0c37753634151f9684b8fb56/system-refund-flow-1%402x.png)

![A screenshot of the system-provided confirmation sheet on iPhone, which displays a checkmark icon and the title ’Your request has been submitted.’ Below the title, the sheet displays the following text: 'You’ll receive an email at chavez four at iCloud dot com with a status update within 48 hours. To check the status of claims, go to https report a problem dot Apple dot com.' A Done button appears at the bottom of the sheet.](https://docs-assets.developer.apple.com/published/a19a34e3ab18f32175e03f2dd227cd60/system-refund-flow-2%402x.png)

**Avoid characterizing or providing guidance on Apple’s refund policies.** For example, don’t speculate about whether customers will receive the refund they request. To help people understand the refund-request process, you can provide a link to [Request a refund for apps or content that you bought from Apple](https://support.apple.com/en-us/HT204084).

## [Auto-renewable subscriptions](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Auto-renewable-subscriptions)

**Call attention to subscription benefits during onboarding.** By showing the value of your subscription when people first launch your app, you can educate them on how the app works and help them understand what they’ll gain by subscribing. Include a strong call to action and a clear summary of subscription terms (see [Making signup effortless](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Making-signup-effortless)). For related guidance, see [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding).

![A screenshot of the Wave Journal app running on iPhone. The bottom half of the screen includes a highlighted area with the first of five pages that describe the benefits of subscribing, a Try It Free button, and a Sign In button.](https://docs-assets.developer.apple.com/published/84b9d8763a621f9983c223e0a06d8d3d/iphone-onboarding%402x.png)

**Offer a range of content choices, service levels, and durations.** People appreciate the flexibility to choose the subscription that best meets their needs.

**Consider letting people try your content for free before signing up.** Limited free access gives people the opportunity to sample your content and encourages people who already engaged with your content to sign up. For example, you might offer a freemium app, a metered paywall, or a free trial.

  * Freemium app 
  * Metered paywall 
  * Free trial 



![A screenshot of a page titled Upgrade to Pro on a freemium app running on iPhone. The top half of the screen describes pro features and includes a close button in the top right. The bottom half of the screen shows two subscription options: the Annual Plan, which costs $29.99 per year, comes with a 1-week free trial period, and is a savings of 50% over the monthly plan; and a Monthly Plan that costs $4.99 per month. A checkmark appears next to the Annual Plan subscription. The bottom of the screen includes a Try It Free button.](https://docs-assets.developer.apple.com/published/592286b7e427356873de8605db5836f3/freemium-app%402x.png)

![A screenshot of a metered paywall app running on iPhone that offers free viewing of a limited number of articles per month. The screen includes a message indicating that the reader has reached the free article limit for the month, above a button with the title See Your Options. The bottom of the screen includes an option to sign in as an existing subscriber.](https://docs-assets.developer.apple.com/published/cd8631333afb08ae643a553aa484392d/paywall-meter%402x.png)

![A screenshot of the Wave Journal app running on iPhone. The bottom half of the screen includes a highlighted Try It Free button.](https://docs-assets.developer.apple.com/published/a66594e715ba9809c02ff2843dbc32d4/iphone-free-trial%402x.png)

**Prompt people to subscribe at relevant times, like when they near their monthly limit of free content.** Additionally, consider making it easy for people to subscribe at any time by including prompts at relevant points throughout your app.

**Encourage a new subscription only when someone isn’t already a subscriber.** Otherwise, people may believe their existing subscription has lapsed when that’s not actually the case. If you offer the same subscription options in multiple apps or through your website, provide a sign-in option so people don’t think they have to pay multiple times for the same service.

### [Making signup effortless](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Making-signup-effortless)

A simple and informative sign-up experience makes it easy for people to act on their interest in your content, whether they’re in your app or viewing your App Store product page.

**Provide clear, distinguishable subscription options.** Use short, self-explanatory names that differentiate subscription options from one another, and specify the price and duration for each option. If you offer an introductory price, be sure to list the introductory price, the duration of the offer, and the standard price the customer pays after the offer ends.

**Simplify initial signup by asking only for necessary information.** A lengthy sign-up process may lower your subscription conversion rate. Defer asking for additional information until after people have signed up.

**In your tvOS app, help people sign up or authenticate using another device.** Instead of asking people to input information in your tvOS app, send a code to another device where they can enter the information you need.

**Give people more information in your app’s sign-up screen.** In addition to including links to your Terms of Service and Privacy Policy in your app and App Store metadata, the in-app sign-up screen needs to include:

  * The subscription name, duration, and the content or services provided during each subscription period

  * The billing amount, correctly localized for the territories and currencies where the subscription is available for purchase

  * A way for existing subscribers to sign in or restore purchases




For example, the Forest Explorer sign-up screen displays billing totals for monthly, biannual, and annual subscriptions in the most prominent positions. In subordinate positions, it shows breakdowns of the biannual and annual prices, so that people can compare the values and make an informed choice. The sign-up screen also contains a button that existing subscribers can use to restore their purchases.

![A screenshot of the Forest Explorer app running on iPhone. The screenshot displays a forested area as the first of three images in the top half of the screen. Below the image are three buttons with subscription options: Intrepid Pro, which costs $14.99 per month; Intrepid Pro with Ads, which costs $9.99 per month; and Redeem Code.](https://docs-assets.developer.apple.com/published/7a5f5cdc4159bb6dcc1cd7cb56a98267/iphone-upgrade%402x.png)

**Clearly describe how a free trial works.** It’s particularly important to make sure people know that when the free trial is over, a payment will be automatically initiated for the next subscription period. For example, the Ocean Journal sign-up screen explicitly states both the duration of the free trial and the amount that’s billed when it ends.

![A screenshot of the Ocean Journal app running on Apple Watch, and displaying a modal view that describes a benefit of subscribing. Below the description area is a Subscribe Now button with subscription terms below it.](https://docs-assets.developer.apple.com/published/8057a7f6c9b89ff6820aea77d919a408/watch-onboarding%402x.png)

**Include a sign-up opportunity in your app’s settings.** App and account settings are common places for people to look for a way to subscribe.

### [Supporting offer codes](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Supporting-offer-codes)

In iOS and iPadOS, subscription offer codes let you use both online and offline channels to give new, existing, and lapsed subscribers free or discounted access to your subscription content. For example, you might provide offer codes through email, give them out at a store or event, or print one on a physical product.

There are two types of offer codes you can support:

  * A _one-time use code_ is a unique code you generate in App Store Connect. People can redeem a one-time use code through a [redemption URL](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-offer-codes/#distribute-offer-codes) (a shareable link), within your app (when you support redemption), or by entering it in the App Store, where they’re prompted to install your app if they haven’t already. Consider using one-time use codes when your distribution is small or when you need to restrict access to a code.

  * A _custom code_ is a code you create, such as NEWYEAR or SPRINGSALE. People can redeem a custom code through a redemption URL or within your app (when you support redemption). Consider using a custom code when you want to support a large campaign that requires a mass distribution of codes.




For developer guidance on implementing offer codes, see [Offer codes](https://developer.apple.com/documentation/storekit/implementing-offer-codes-in-your-app) and [Set up offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-offer-codes). For guidance on other types of offers, see [Providing subscription offers](https://developer.apple.com/app-store/subscriptions/#providing-subscription-offers).

**Clearly explain offer details.** To help people make an informed decision, provide a straightforward and succinct description of your offer in your marketing materials.

**Follow guidelines for creating a custom code.** A custom code can contain only alphanumeric ASCII characters. Don’t use special characters, including Chinese and Arabic characters.

**Tell people how to redeem a custom code.** Because people can’t redeem a custom code by entering it in their App Store account settings, it’s important to let them know that they can redeem it through a redemption URL or within your app.

**Consider supporting offer redemption within your app.** The system automatically provides screens that present the offer-redemption flow, whether people redeem the offer in your app or in the App Store. When you use StoreKit API to let people redeem offer codes within your app, the only custom UI you need to create is one that initiates the system-provided flow. For developer guidance, see [`presentOfferCodeRedeemSheet(in:)`](https://developer.apple.com/documentation/StoreKit/AppStore/presentOfferCodeRedeemSheet\(in:\)) and [`offerCodeRedemption(isPresented:onCompletion:)`](https://developer.apple.com/documentation/SwiftUI/View/offerCodeRedemption\(isPresented:onCompletion:\)). There are several natural places to provide this custom UI. For example, you could add a “Redeem Code” button to your paywall, onboarding screens, or your app’s settings screen.

![A screenshot of the Forest Explorer app’s subscription sign-up page on iPhone. The Redeem Code button is highlighted out of the three subscription buttons.](https://docs-assets.developer.apple.com/published/d9787d1349b4d5b6a524d8a5debc4e44/iphone-custom-redeem%402x.png)

![A screenshot of an app’s subscription settings screen on iPhone. It includes the app name, subscription level, price, and next billing date, above buttons for Manage Subscription, Restore Purchase, and Redeem Code.](https://docs-assets.developer.apple.com/published/dd8be196f4f16567a2db77fcacce2784/subscription-management%402x.png)

After people tap your custom redeem button, the system automatically provides a series of code-redemption screens like the ones shown below.

![An illustration representing a code redemption screen on iPhone. The top of the screen contains a large icon area above the label Redeem Code and a text field containing placeholder text that says Enter Code. The bottom of the screen contains a tappable link to view Terms and Conditions.](https://docs-assets.developer.apple.com/published/5804d3dd4239644341f2e78fd38fb62e/system-provided-redemption-1%402x.png)

![An illustration representing a code redemption screen on iPhone. The top of the screen contains a photo area. A small icon overlaps some of the lower-left corner of the photo area. Below the photo area is the label Offer Name in large text, and below the label is small text that reads '1 month free, then $4.99 per month.' The bottom of the screen contains a Redeem Offer button and a tappable link to view Terms and Conditions.](https://docs-assets.developer.apple.com/published/365222311809b58c9e80d8462f137d1f/system-provided-redemption-3%402x.png)

**Supply an engaging and informative promotional image.** Creating this optional image can help people understand the value of your content. If you don’t supply a promotional image, the code redemption screens use your app icon by default. To learn more, see [Promoting your in-app purchases](https://developer.apple.com/app-store/promoting-in-app-purchases/).

**Help people benefit from unlocked content as soon as they complete the redemption flow.** Think about ways to align the post-redemption experience in your app with the subscriber’s new status. For example, you might provide a welcome experience for new subscribers or a brief tour of new features for an existing subscriber who’s unlocked additional functionality. In particular, be prepared to welcome people who subscribe before they open your app for the first time. For example, if you require people to create an account or sign in before they can use your app, make this process as smooth as possible for new subscribers who haven’t experienced it before.

### [Helping people manage their subscriptions](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Helping-people-manage-their-subscriptions)

Supporting subscription management means people can upgrade, downgrade, or cancel a subscription without leaving your app. Offering subscription management within your app also gives you a natural place to provide help for common subscriber issues and present alternative offers for people to consider.

![A screenshot of an app’s subscription settings screen on iPhone. It includes the app name, subscription level, price, and next billing date, above buttons for Manage Subscription, Restore Purchase, and Redeem Code.](https://docs-assets.developer.apple.com/published/dd8be196f4f16567a2db77fcacce2784/subscription-management%402x.png)

**Provide summaries of the customer’s subscriptions.** In particular, people appreciate viewing the upcoming renewal date without having to search for it. Consider displaying this information in a settings or account screen, near the subscription-management option. For developer guidance, see [`Product.SubscriptionInfo`](https://developer.apple.com/documentation/StoreKit/Product/SubscriptionInfo).

**Consider using the system-provided subscription-management UI.** Using StoreKit APIs lets you present a consistent experience that helps people manage or cancel their subscriptions without leaving your app. For developer guidance, see [`showManageSubscriptions(in:)`](https://developer.apple.com/documentation/StoreKit/AppStore/showManageSubscriptions\(in:\)).

![A screenshot of an app’s subscription management screen on iPhone. It includes the app name, subscription level, price, and next billing date, above a list of subscription options and a Cancel Subscription button.](https://docs-assets.developer.apple.com/published/ea9b497104cc62f2db2bdb539eecca6b/system-cancel-flow-1%402x.png)

![A screenshot of an app’s subscription management screen on iPhone. An alert in the center of the screen asks for confirmation to cancel the subscription. The alert includes the text: Confirm Cancellation. If you confirm and cancel your subscription now, you can still access it until July 2023. The alert includes Not Now and Confirm buttons.](https://docs-assets.developer.apple.com/published/b9bf428278819948a07d4297ec7f9649/system-cancel-flow-2%402x.png)

**Consider ways to encourage a subscriber to keep their subscription or resubscribe later.** When you use StoreKit APIs, your app is notified when someone chooses to cancel their subscription. In this scenario, you might want to extend a personalized offer as an alternative to cancellation or invite people to describe their reasons for canceling in an exit survey. In addition to giving you insights into various customer problems, survey feedback can also help inform messaging for retention and win-back strategies.

![A screenshot of a resubscribe screen in the Math School app running on iPhone. The bottom half of the screen includes the label Resubscribe to Math School in large text, and the first of five pages which describe benefits of resubscribing. Below the page view area is a Resubscribe Now button with a six-month resubscription offer at 50 percent off, and a Sign In button.](https://docs-assets.developer.apple.com/published/72ac419f0368a58ac5f36dba3b3c8a85/promotional-offer%402x.png)

**Always make it easy for customers to cancel an auto-renewable subscription.** If the manage subscription action is deep within an app — or hard to recognize — subscribers can feel they’re being discouraged or prevented from canceling.

**Consider creating a branded, contextual experience to complement the system-provided management UI.** Within your custom UI, you might offer a popular premium tier or provide personalized suggestions for alternative plans based on what you know about the customer’s preferences or how they use your app. For example, you can create a promotional offer that provides a discounted price for a specific period of time. You might also consider subscription [offer codes](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Supporting-offer-codes) to help you win back lapsed subscribers and encourage existing subscribers to upgrade.

## [Platform considerations](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Platform-considerations)

 _No additional considerations for iOS, iPadOS, macOS, tvOS, or visionOS._

### [watchOS](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#watchOS)

The sign-up screen in your watchOS app needs to display the same set of information about your subscription options that you display in other versions of your app. For the complete list of required items, see [Making signup effortless](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Making-signup-effortless). The following guidelines can help you design a sign-up screen that feels at home on Apple Watch.

**Clearly describe the differences between versions of your app that run on different devices.** If your watchOS app supports different functionality or provides a subset of the content that’s available on other devices, be sure to clarify these differences in your description. Be straightforward about the advantages of accessing subscription content through your watchOS app without implying that the experience is identical to the ones in other versions of your app.

![A screenshot of an app running on Apple Watch. The screen includes text that reads: Intrepid Pro. Unlock 90,000 topographic maps, advanced GPS features, and offline access for trail guidance anywhere. A Close button appears in the top-left corner of the screen.](https://docs-assets.developer.apple.com/published/00bc22f23ed8cc2eb6be337decc3af7b/clarify-description-before%402x.png)

A description that might lead people to expect access to 90,000 maps on their Apple Watch

![A screenshot of an app running on Apple Watch. The screen includes text that reads: Intrepid Pro. Use advanced GPS features for trail guidance on Apple Watch. Unlock 90,000 topographic maps for use on iPhone and other devices. A Close button appears in the top-left corner of the screen.](https://docs-assets.developer.apple.com/published/ee0a650637153e7fd6506555082cca8c/clarify-description-after%402x.png)

A description that clarifies how the subscription works on Apple Watch in contrast with other devices

**Consider using a modal sheet to display the required information.** After people respond to your call to action to learn more about your subscription offers, you can use a modal sheet to present all required items in a single view. Even though people must scroll the view to access all the information, displaying it in a modal sheet helps your app UI remain streamlined and concise. Also, a modal sheet’s default Close button makes it easy for people to return to your free content with one tap. If you create a custom sign-up view instead of using a modal sheet, design a complete, efficient flow and include a Close or Cancel button that lets people return to your free content.

**Make subscription options easy to compare on a small screen.** People need to understand the terms of each subscription option before they can choose one. Aim to display the duration and discount information for each option in a compact way that’s easy to scan and compare. Here are two ways you might present subscription options in your watchOS app:

  * Display each option in a separate button. Using one button per payment option lets people start the signup process with one tap. In this design, it’s important to lock up each button with its description so that people can see how these elements are related, especially while scrolling.

  * Display a list of options, followed by a button people tap to start the signup process. Using a list to display one option per row gives you a compact design that minimizes scrolling while making subscription choices easy to scan and understand. In this design, the button’s title can update to reflect the chosen option.




![A screenshot of an app running on Apple Watch. The screen includes two subscription buttons: $4.99 per month and $29.99 per year. A Close button appears in the top-left corner of the screen.](https://docs-assets.developer.apple.com/published/d1beed8e9dddac07a14bd09ed184a984/lock-up-option-information%402x.png)

One payment option per button

![A screenshot of an app running on Apple Watch. The screen includes a list of subscription options: $4.99 billed monthly and $29.99 billed yearly. The $29.99 option is selected. A $29.99 per year button appears at the bottom of the screen, and a Close button appears in the top-left corner of the screen.](https://docs-assets.developer.apple.com/published/2c6e9ab3b201604f462d49cbd3473813/list-option-information%402x.png)

One payment option per list row, followed by a button that updates to display the chosen option

## [Resources](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Resources)

#### [Related](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Related)

[In-App Purchase](https://developer.apple.com/in-app-purchase/)

[Offering Subscriptions](https://developer.apple.com/app-store/subscriptions/)

[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

#### [Developer documentation](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Developer-documentation)

[In-App Purchase](https://developer.apple.com/documentation/StoreKit/in-app-purchase) — StoreKit

#### [Videos](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Videos)

[![](https://devimages-cdn.apple.com/wwdc-services/images/C03E6E6D-A32A-41D0-9E50-C3C6059820AA/9F28A37E-92AA-46D7-8805-8A7CDE31F9E8/9154_wide_250x141_1x.jpg) What’s new in StoreKit and In-App Purchase ](https://developer.apple.com/videos/play/wwdc2024/10061)

## [Change log](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase#Change-log)

Date| Changes  
---|---  
September 12, 2023| Updated artwork and guidance for redeeming offer codes.  
November 3, 2022| Added a guideline for displaying the total billing price for every in-app purchase item and consolidated guidance into one page.  
  
