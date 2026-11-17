# Free sources: what each gives, and the dated facts

last-verified: 2026-11-13 · ttl-days: 90 · refresh: fetch developers.google.com/maps/billing-and-pricing/pricing (free caps per SKU), developers.google.com/maps/documentation/places/web-service/data-fields (which tier each field bills at) and developers.google.com/maps/documentation/places/web-service/policies (storage and scraping rules); open adstransparency.google.com and check the search box still takes a domain. Update this file and say so in one line.

Load at Phase 2, and again before using the Places API.

## The sources, best first

| Source | What it gives | Cost | Notes |
|---|---|---|---|
| State license board | Every licensed business or license holder in the trade; the holder's name, often the owner | Free | Coverage varies by state and trade. Some states don't license roofers or handymen at all. Search "[state] [trade] license lookup". |
| Search results (WebSearch) | Names, sites, phones for the businesses customers actually find | Free | Use 4 to 6 phrasings. Results lean toward businesses with sites; the license list catches the rest. |
| BBB profile | Years in business, owner or management names, complaint count and type | Free | Accreditation is paid, so "not accredited" means nothing. Complaints about the work feed the park rule. |
| Trade association and Chamber directories | Established, owner-run members | Free | Members are self-selected toward businesses that pay for things. |
| Google profile, looked at by a person | Rating, count, newest reviews, owner replies, photos (fleet, crew), the "Google Guaranteed" badge | Free | By hand, shortlist only. No bots. |
| Google Ads Transparency Center | Google ads a business ran, by date and region, with the text and format | Free | Search the domain, not the name: a domain search groups every advertiser account pointing at the site. No export and no API, so it is a hand check. |
| Meta Ad Library | Active Facebook and Instagram ads by page | Free | Search the page name; filter to active ads in the country. |
| Google Places API (New) | Rating, review count, website, phone, open or closed, a stable place ID, for a whole cell in one run | Free inside monthly caps; a Google Cloud project with billing turned on is still required | Optional. `scripts/places_search.py`. Facts below. |

## Texas example (one state, verified 2026-11-13)

- The Texas State Board of Plumbing Examiners publishes free CSV downloads of license holders, including a Responsible Master Plumber list carrying the last known company name for each. A plumbing company offering work to the public must have at least one Responsible Master Plumber, so this list is close to a census of plumbing companies, with a name attached to each.
- The Texas Comptroller's Taxable Entity Search is free and shows a company's registered agent and the officers or managers from its Public Information Report. That is usually the owner. (Used by `/boring-marketing-pitch-the-fix` for owner lookup.)

Other states have their own versions. The Secretary of State business search and the trade's license lookup are the two to look for.

## Google Places API (New): the facts that matter here

- **Free monthly caps per SKU** (Google Maps Platform pricing page): Text Search Essentials (IDs only) unlimited; Text Search Pro 5,000; Text Search Enterprise 1,000. Place Details Essentials 10,000; Pro 5,000; Enterprise 1,000; Enterprise + Atmosphere 1,000.
- **Which tier a field bills at** (data fields page): rating, user rating count, website and phone number are Enterprise. Display name, business status and the Google Maps link are Pro. Reviews are Enterprise + Atmosphere.
- `places_search.py` asks for Enterprise fields in Text Search, so each page of up to 20 results counts against the 1,000 free Text Search Enterprise requests a month. Three phrasings of three pages each is 9 requests per cell.
- **Reviews:** at most 5 per place, sorted by relevance, and the review object has no owner-reply field. Review pace and unanswered reviews stay a hand check.
- **Storage:** place IDs are exempt from the caching limits and can be stored indefinitely. Latitude and longitude can be cached for up to 30 days. The policy also says not to export, extract or scrape Google Maps content for use outside the services, so treat the other fields as a snapshot for this run and refetch by place ID when you need fresh numbers.
- **Attribution:** when you show Places data or reviews to anyone, credit Google Maps, and credit review authors when you show reviews.

## Things that look free and aren't worth it

- **Scraping Maps** with a cloud scraper or a browser bot. It breaks Google's terms, it breaks often, and the free paths above get the fields a ranking needs.
- **Buying a list** of "plumbers in Dallas" from a data vendor. The names are there; the fields that rank (first screen, ad promise, reply rate) are not, so you do Phases 3 and 4 anyway.
