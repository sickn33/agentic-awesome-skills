# Real-estate reference

Subcommands: `zillow-listing`, `zillow-property`, `redfin-listing`, `redfin-property` — 5 credits each.

For short-term rentals (Airbnb), hotels (Booking) and flights, see `travel.md`.

`*-listing` is for filtered searches; `*-property` is a single-property deep dive.

---

## zillow-listing

```bash
hasdata zillow-listing --keyword "Austin, TX" --type forSale [filters] --raw | jq '.results[]'
```

Required:
- `--keyword "City, ST"` (default: `New York, NY`)
- `--type forSale|forRent|sold` (default: `forSale`)

Price / size (bracketed pairs, kept as floats):
- `--price-min N --price-max N`
- `--beds-min N --beds-max N`
- `--baths-min N --baths-max N`
- `--square-feet-min N --square-feet-max N`
- `--lot-size-min N --lot-size-max N`
- `--year-built-min N --year-built-max N`
- `--hoa N` — max HOA fee
- `--parking-spots-min N`

Array filters (enum-validated, lowercase camelCase values):
- `--home-types house|townhome|multiFamily|condo|lot|apartment|manufactured` (repeatable)
- `--pets allowsLargeDogs|allowsSmallDogs|allowsCats` (repeatable)
- `--other-amenities ac|pool|waterfront|onsiteParking|inUnitLaundry|acceptZillowApplications|incomeRestricted|apartmentCommunity` (repeatable)
- `--views city|mountain|park|water` (repeatable)
- `--basement finished|unfinished` (repeatable)
- `--property-status comingSoon|acceptingBackupOffers|pendingAndUnderContract` (repeatable)
- `--listing-publish-options ownerPosted|agentListed|newConstruction|foreclosures|auctions|foreclosed|preForeclosures` (repeatable)
- `--tours open|3d` (repeatable)

Booleans:
- `--must-have-garage` — only listings with a garage
- `--single-story-only`
- `--hide55plus-communities`

Other:
- `--listing-type byAgent|byOwner`
- `--days-on-zillow 1|7|14|30|90|6m|12m|24m|36m`
- `--keywords "open floor plan"` — refinement keywords (matches in description)
- `--move-in-date 2026-06-01`
- `--page N` — pagination
- `--sort verifiedSource|homesForYou|priceHighToLow|priceLowToHigh|paymentHighToLow|paymentLowToHigh|newest|bedrooms|bathrooms|squareFeet|lotSize`

### Examples

```bash
# Family home, mid-market, sorted cheapest first
hasdata zillow-listing \
  --keyword "Austin, TX" --type forSale \
  --price-min 400000 --price-max 900000 \
  --beds-min 3 --beds-max 5 --baths-min 2 \
  --home-types house --home-types townhome \
  --sort priceLowToHigh --raw | jq '.results[] | {address, price, beds, baths}'

# Pet-friendly rental
hasdata zillow-listing \
  --keyword "Seattle, WA" --type forRent \
  --price-max 4000 \
  --pets allowsSmallDogs --pets allowsCats \
  --parking-spots-min 1 --must-have-garage \
  --raw

# Recently sold comps
hasdata zillow-listing \
  --keyword "Miami, FL" --type sold \
  --square-feet-min 1500 --square-feet-max 4000 \
  --year-built-min 2000 --year-built-max 2020 \
  --days-on-zillow 12m --sort newest --raw
```

Bracketed query params (`price[max]`, `homeTypes[]`, `yearBuilt[min]`) are handled by the CLI — pass the kebab-case flags shown above, not the raw API names.

## zillow-property

```bash
hasdata zillow-property --url "https://www.zillow.com/homedetails/.../123_zpid/" --raw | jq .
```

Or with `--zpid <ID>`. Returns full property details (photos, history, schools, taxes, walk-score, etc.).

## redfin-listing

Similar shape to `zillow-listing` but Redfin's enums differ. Run `hasdata redfin-listing --help` for the exact list. Common pattern:

```bash
hasdata redfin-listing --location "San Francisco, CA" --status forSale \
  --min-price 800000 --max-price 1500000 \
  --min-beds 2 --raw
```

## redfin-property

```bash
hasdata redfin-property --url "https://www.redfin.com/CA/San-Francisco/.../home/12345" --raw
```

---

## Non-obvious use cases

- **Investment screening** — combine `--type sold` + `--days-on-zillow 12m` + `--year-built-min` + `--lot-size-min` to surface flip / value-add candidates. Then `xargs` into `zillow-property` for ARV analysis.
- **Tax-appeal comps** — `--type sold --keyword "ZIP CODE" --days-on-zillow 12m` filtered to your home's beds/baths/sqft band gives recent sales the assessor used; export to CSV with `jq -r '.results[] | [.address, .price, .beds, .baths, .squareFootage, .soldDate] | @csv'`.
- **Appraiser comp pull** — same trick, narrower square-footage and same year-built band.
- **Motivated-seller signal** — `--type forSale --days-on-zillow 90` returns listings that have lingered. Often willing to negotiate.
- **Pre-relocation neighborhood scan** — run the same `--type forRent` filter across 5–10 neighborhoods, dump rent distributions with `jq '.results[].price'`, eyeball cost differences before booking visits.
- **STR-vs-LTR feasibility** — pair `airbnb-listing` (see `travel.md`) for nightly rates with `zillow-listing --type forSale` for purchase price in the same area; compute gross yield client-side.
- **HOA filter** — `--hoa N` caps fee; useful for buyers who want max payment ceilings.
- **School-driven house hunt** — `zillow-property` returns school ratings; filter `zillow-listing` results down by walking each property and keeping those with rating ≥ X.
- **Open-houses this weekend** — Zillow tags open-house listings; check `.results[].openHouseTimes` for upcoming slots.
- **3D-tour / virtual-tour-only filter** — `--tours 3d` → only listings with virtual tours. Useful for remote / international buyers.
- **Pet-friendly rentals at scale** — `--pets allowsLargeDogs --pets allowsCats` for multi-pet households. Pairs well with `--keyword` for specific neighborhoods.
- **Foreclosure and pre-foreclosure leads** — `--listing-publish-options foreclosures --listing-publish-options preForeclosures`.
- **Non-traditional listing types** — `--listing-type byOwner` for FSBO; `--listing-type byAgent` for agent-listed (default mix).
- **Move-in date constraint** — `--move-in-date YYYY-MM-DD` for rental searches with a hard timing requirement.
- **Bulk address verification** — pipe a list of property URLs through `zillow-property` to confirm they resolve and pull the canonical address Zillow uses.
- **Verify a Redfin/Zillow listing is real** — `redfin-property --url X --raw | jq .status` to confirm it hasn't been pulled.
