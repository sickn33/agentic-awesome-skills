# All commands

Authoritative source: `hasdata --help`. This file is a snapshot — when in doubt, run `hasdata <api> --help` directly.

## Search

| Command | Cost | Notes |
| --- | --- | --- |
| `google-serp` | 10 | Full Google SERP — organic, ads, knowledge graph, PAA, AI overview |
| `google-serp-light` | 5 | Cheap single-page SERP |
| `google-ai-mode` | 5 | Google AI Mode answer |
| `google-news` | 10 | Google News results |
| `google-shopping` | 10 | Google Shopping results |
| `google-immersive-product` | 5 | Immersive product page details |
| `google-events` | 5 | Google Events |
| `google-short-videos` | 10 | Short videos panel |
| `google-trends` | 5 | Search trends data |
| `google-images` | 5 | Image search |
| `bing-serp` | 10 | Bing SERP |

## Maps & local

| Command | Cost | Notes |
| --- | --- | --- |
| `google-maps` | 5 | Maps search |
| `google-maps-place` | 5 | Single place by place_id |
| `google-maps-reviews` | 5 | Place reviews |
| `google-maps-contributor-reviews` | 5 | Reviews by contributor |
| `google-maps-photos` | 5 | Place photos |
| `google-maps-posts` | 10 | Business-owner posts (offers, events, announcements) |
| `yelp-search` | 5 | Yelp business search |
| `yelp-place` | 5 | Single Yelp business |
| `yellowpages-search` | 5 | YellowPages search |
| `yellowpages-place` | 5 | Single YellowPages listing |

## E-commerce

| Command | Cost | Notes |
| --- | --- | --- |
| `amazon-search` | 5 | Amazon search results |
| `amazon-product` | 5 | Amazon product by ASIN |
| `amazon-seller` | 5 | Amazon seller profile |
| `amazon-seller-products` | 5 | Seller's product catalog |
| `shopify-products` | 5 | Any Shopify store's products |
| `shopify-collections` | 5 | Shopify collections |

## Real estate

| Command | Cost | Notes |
| --- | --- | --- |
| `zillow-listing` | 5 | Zillow filtered search |
| `zillow-property` | 5 | Zillow single property |
| `redfin-listing` | 5 | Redfin filtered search |
| `redfin-property` | 5 | Redfin single property |

## Travel

| Command | Cost | Notes |
| --- | --- | --- |
| `airbnb-listing` | 5 | Airbnb filtered search |
| `airbnb-property` | 5 | Airbnb single listing |
| `booking-search` | 10 | Booking.com search (hotels, apartments) |
| `booking-place` | 10 | Booking.com property + room/rate list |
| `google-flights` | 15 | Flight search via Google Flights |

## Jobs

| Command | Cost | Notes |
| --- | --- | --- |
| `indeed-listing` | 5 | Indeed search |
| `indeed-job` | 5 | Single Indeed posting |
| `glassdoor-listing` | 10 | Glassdoor search (with ratings) |
| `glassdoor-job` | 10 | Single Glassdoor posting |

## Web

| Command | Cost | Notes |
| --- | --- | --- |
| `web-scraping` | 10 | Arbitrary URL — JS rendering, AI extraction, markdown output, screenshots |

## Social

| Command | Cost | Notes |
| --- | --- | --- |
| `instagram-profile` | 5 | Instagram profile by handle |

## YouTube

| Command | Cost | Notes |
| --- | --- | --- |
| `youtube-search-api` | 10 | YouTube search (videos, shorts, channels, playlists) |
| `youtube-video-api` | 10 | Single video metadata + stats + related |
| `youtube-channel-api` | 10 | Channel home / videos / shorts / playlists / community |
| `youtube-transcript-api` | 10 | Full transcript with millisecond offsets |

## Utility (no cost)

| Command | Notes |
| --- | --- |
| `configure` | Interactive setup; writes ~/.hasdata/config.yaml |
| `version` | Print version |
| `update` | Self-update from GitHub Releases |
| `completion {bash\|zsh\|fish\|powershell}` | Generate shell completion |

## Deprecated

`amazon-reviews` is deprecated — Amazon now requires login to access reviews. The subcommand still exists for backwards compatibility but currently returns no data; don't suggest it.
