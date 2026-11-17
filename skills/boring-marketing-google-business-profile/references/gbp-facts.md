# Google Business Profile facts (perishable, check the header first)

last-verified: 2026-11-13 · ttl-days: 60 · refresh: fetch the official pages listed under each heading, then web-search "Google Business Profile changes {month year}", "Google Small Business Bulletin {month year}" and "Search Engine Roundtable Google Business Profile {month year}"; update every line, keep the Confirmed/Observed labels, and bump last-verified.
changes: 2026-11-13 first version, built for /boring-marketing-google-business-profile.

Load at the start of /boring-marketing-google-business-profile. If today is past last-verified + ttl-days, refresh first and say so in one line. Per-client observations (their categories, their competitors' review pace) belong in the audit file or `./brand/algo-cache.md`, not here.

Labels: **Confirmed** = Google says so in its help center, blog or an official bulletin. **Observed** = documented by local search practitioners, not confirmed by Google. Never present an Observed item to a client as Google policy.

## How local ranking works (Confirmed)

- Three factors: relevance (how well the profile matches the search), distance (from the searcher), prominence (how well known the business is; reviews and ratings count toward it). "There's no way to request or pay for a better local ranking on Google." Source: https://support.google.com/business/answer/7091
- Google's own tips: verify, complete the info (address, hours, category, attributes), respond to reviews, add photos and videos.
- Google publishes no profile "completeness score". Treat completeness as good practice, not a ranking number.

## Name, address, service area, phone, website (Confirmed)

Source: https://support.google.com/business/answer/3038177 and https://support.google.com/business/answer/9157481
- Name: as on real-world signage. No taglines, locations ("near downtown"), service descriptors, phone numbers, URLs, hours, or all-caps unless the brand is written that way. Since Aug 2026, no repeating the name in two languages or scripts, even when the sign does.
- Service-area businesses that don't serve customers at their address hide it and list service areas: up to 20 (cities, postal codes or areas), with the overall area no more than about 2 hours' drive from the base.
- Virtual offices and PO boxes aren't eligible. Coworking spaces only with signage, staff and customers received during hours.
- Phone: a number the business controls; local numbers preferred over call centers.
- Website: must represent this business location; no redirects to third-party pages.

## Categories, services, attributes (Confirmed)

- Primary category: as specific as possible. "Use as few categories as possible to describe your overall core business." Pick what the business is, not what it has. Source: https://support.google.com/business/answer/3038177
- Adding or editing a category may trigger re-verification. Category unlocks features (menus, booking, services). Source: https://support.google.com/business/answer/7249669
- Services: predefined options per category plus custom services, with optional price and description. No prices, phone numbers or personal info in custom service names. Source: https://support.google.com/business/answer/9455399
- Attributes: availability depends on category, country and location. Identity attributes (veteran-owned, women-owned and others) are owner-set; some attributes are filled from customer input. Source: https://support.google.com/business/answer/9049526

## Photos and video (Confirmed)

Source: https://support.google.com/business/answer/6103862
- Photos: JPG or PNG, 10 KB to 5 MB, recommended 720 x 720 px, minimum 250 x 250 px. In focus, well lit, no heavy filters.
- Video: up to 30 seconds, up to 75 MB, 720p or higher.
- New media can take 24-48 hours to appear; the profile must be verified.

## Posts (Confirmed unless marked)

Sources: https://support.google.com/business/answer/7342169 and https://support.google.com/business/answer/7213077
- Types: updates, offers, events. Buttons: updates and events can carry an action button with a link; offers get a "View offer" button.
- Posts older than 6 months are archived unless a date range is set.
- Text limit: 1,500 characters, as the post editor enforces it (not stated on the help pages above; re-check in the editor on refresh).
- Posts can be scheduled, including recurring schedules.
- Posts with a phone number, email or social handle in the text may be removed if it can't be verified; use the Call button instead.
- Post view counts appear on each post card in the Posts tab, covering posts from the past 18 months and combining Search and Maps views (announced in the Sept 2026 bulletin, live by early Oct 2026). Source: https://support.google.com/business/thread/466498475
- Google Business Profile in Gemini can draft and publish posts and add photos from a chat (Nov 2026 bulletin). Drafts still need a human read. Source: https://support.google.com/business/thread/476642299
- Observed (Oct 2026): the Posts section moves up and down in some local panels. Interface test, no confirmed ranking effect.

## Questions and answers (Confirmed)

- The Q&A API was discontinued on Nov 3, 2025. Source: https://developers.google.com/my-business/content/qanda/change-log
- Dec 2025: Google confirmed Q&A in Maps is being replaced by Ask, where customers get AI answers drawn from the business's information and relevant reviews. Owners can't seed new questions. Reported at https://www.seroundtable.com/google-maps-qa-feature-ask-40594.html
- Ask Maps (Gemini in Google Maps) launched Mar 12, 2026 in the US and India on Android and iOS. It recommends places conversationally from Maps data and reviews. Source: https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/
- Practical consequence: the profile, the reviews and the website are what the AI answer reads. Keep services, hours and descriptions accurate and specific.

## Reviews (Confirmed unless marked)

- Not allowed: incentives of any kind for reviews, discouraging negative reviews or asking only happy customers (review gating), staff review quotas, posting reviews for others. Allowed: asking every customer for an honest review without incentives. Source: https://support.google.com/contributionpolicy/answer/7400114
- Possible restrictions for fake engagement: no new reviews for a period, existing reviews unpublished for a period, and a public warning that fake reviews were removed. Owners are emailed and can appeal. Source: https://support.google.com/business/answer/14114287
- Owner replies post as the business and are reviewed first, usually within 10 minutes, sometimes up to 30 days. The reviewer is notified and can still edit. Source: https://support.google.com/business/answer/3474050
- July 2026: mass review removals hit many profiles; Google called it a false positive and restored reviews. Reviews vanishing overnight isn't always a penalty. (Reported by local search trade press.)
- Observed (Sept 30, 2026, unconfirmed): Google Maps asking users to sign in to read all reviews or sort them. The reviews shown first carry more weight.

## Edits, Collected info, verification, appeals

- Confirmed: owners get 4 days to accept or reject a suggested edit; without a response Google may publish it if public information (such as the website) supports it. Some edits apply without review. Blue text in the editor marks info Google changed. Source: https://support.google.com/business/answer/3480441
- Confirmed (Sept 2026, limited by region, language and category): a Collected info area shows details Google gathered through automated calls, texts or WhatsApp, which owners can review and remove.
- Confirmed: video verification is available for service-area businesses (Sept 2026 bulletin). Observed: a photo-of-location verification option (Sept 2026) and a government ID upload test (Oct 2026).
- Confirmed (Nov 2026): the appeals tool lets owners upload evidence (utility bill, license, tax certificate) before submitting. An appeal can be submitted only once, so the proof must match the profile first. Source: https://support.google.com/business/thread/476642299

## Messaging and buttons

- Confirmed (Nov 2026): Google Maps on Android and iOS shows a Message button next to Call; messages route to the linked channel, including WhatsApp and SMS. Source: https://support.google.com/business/thread/476642299
- Observed (Oct 2026): a WhatsApp button in local panels in Search; some businesses asked for an EIN before turning on messages.
- Observed (Nov 2026): Book Online buttons appearing on some profiles, mostly home services, without owner setup; some links returned errors. Click every button on the profile.
- Confirmed (Nov 2026): hours can be entered in plain language ("closed for lunch 1 to 2:30") and Google fills the hours fields.

## Spam updates and the website (Confirmed)

- Google ran four confirmed spam updates in 2026, the latest Sept 24 to Oct 8 (Google Search Status Dashboard). Spam updates act on web search: doorway town pages and scaled thin pages are website risks, not map pack ones. Policy text: https://developers.google.com/search/docs/essentials/spam-policies

## Secondary sources used for dating

- Local search update log with Confirmed/Observed labels: https://www.searchprex.com/resources/news/local-seo-updates (checked Nov 13, 2026)
