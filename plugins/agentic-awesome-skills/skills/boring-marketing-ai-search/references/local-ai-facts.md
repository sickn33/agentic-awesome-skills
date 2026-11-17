# Local AI answer facts (perishable, check the header first)

last-verified: 2026-11-13 · ttl-days: 60 · refresh: fetch https://blog.google/products-and-platforms/products/maps/ and the latest "Google Small Business Bulletin" thread at support.google.com/business, then web-search "Ask Maps local businesses {month year}" and "Google local AI Overview business profile {month year}"; update every line, keep the Confirmed/Observed labels, and bump last-verified.
changes: 2026-11-13 first version, for the /boring-marketing-ai-search Local branch.

Load for any local business in /boring-marketing-ai-search. **Confirmed** = Google says so. **Observed** = documented by practitioners or independent tests, not confirmed by Google. Present Observed items as observations.

## Ask Maps (Google Maps with Gemini)

- **Confirmed.** Launched Mar 12, 2026, rolling out in the US and India on Android and iOS. A conversational feature in Google Maps that answers questions about places with recommendations, drawing on Maps data for over 300 million places and reviews from more than 500 million contributors. Source: https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/
- **Confirmed.** It replaces the old Q&A on business profiles: customers ask in Maps and get AI answers built from the business's information and relevant reviews. Owners can no longer seed their own questions. (Google product expert, Business Profile forum, Dec 2025, reported at https://www.seroundtable.com/google-maps-qa-feature-ask-40594.html.) The Q&A API was discontinued Nov 3, 2025: https://developers.google.com/my-business/content/qanda/change-log
- **Observed (independent testing, one market, Apr 2026).** For plumber, electrician and HVAC queries, Ask Maps returned a tight set of businesses, about 3 to 5 per query, and spent more of its answer on why each fits (responsiveness, specialization, honesty) as the questions got more conversational. Treat as directional.
- Practical consequence: the levers are the Google profile (categories, services, description, hours), the review text customers write, and the business's site. A business with thin reviews that never mention the service has little for the answer to quote.

## Google Search

- **Observed (Sept 17, 2026, unconfirmed rollout).** Local knowledge panels carrying an "AI Overview" label with a "Show more" control that opens an AI Mode style chat. If it ships broadly, the first description a searcher reads is generated from the profile, reviews and site.
- **Confirmed.** Google's AI features follow the same spam policies as web results. Doorway town pages and fake reviews are no safer in AI answers than in the ten blue links. Spam policy text: https://developers.google.com/search/docs/essentials/spam-policies

## Assistants outside Google

- ChatGPT, Perplexity and Gemini answer "best <service> in <city>" questions by retrieving pages, directories, review sites and lists. Which sources each one leans on differs and shifts month to month; check the current per-engine notes in `aeo-facts.md` (for example, Reddit's share differs sharply by engine).
- Location handling differs by engine and by whether the user is signed in. Write the city into every question rather than relying on the engine's guess, and record the location setting when capturing by hand.

## Calls and messages from the profile

- **Confirmed (Nov 2026).** Google Maps shows a Message button next to Call on Android and iOS, routing to the linked channel (including WhatsApp and SMS). An AI answer that sends a customer to the profile is wasted if nobody answers the message. Source: https://support.google.com/business/thread/476642299
