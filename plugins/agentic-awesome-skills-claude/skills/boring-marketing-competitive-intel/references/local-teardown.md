# Local teardown

**Load this when** running LOCAL mode, before Phase L2. It holds the evidence pack each
rival's subagent returns, the counting rules that keep the comparison fair, and the
judgment for reading local rivals. `teardown-judgment.md` still applies to Phase L3
(paid claims outrank page claims, ad longevity, weighting complaints).

## Evidence pack (one per rival)

Working data: saved to the evidence file, never pasted into chat. The chat shows the
scoreboard and the gaps.

```markdown
## <Rival> (<domain>): local evidence pack, <date>
**Map:** position <n> for "<search>" from <place> | <rating> stars, <total> reviews | ~<n> new in ~90 days | newest: <relative date> | replies: <n>/20 | category: <primary> | hours: <as claimed> [source: phone screenshot / browser / pasted]
**Ads:** Search: "<headline>" / "<description>" -> <final URL> | LSA: <badge or none> | other ads (Transparency Center): <n>, themes: ... [urls]
**Ad page, first screen on a phone:** promise repeated: <yes, quote / no> | number tappable: <yes/no> | rating shown: <yes/no>
**Prices shown:** "<verbatim>" [url] | or "call for pricing" | or NOT FOUND (checked: ...)
**Reviews read:** <n> newest + <n> 1-3 star, sources: Google / Yelp / BBB / Angi
**Complaint themes:** <theme>: <count> (newest <relative date>) "quote" / "quote" | ...
**Praise themes:** <theme>: <count> | ...
**Trust basics:** years: ... | license shown: ... | guarantee: "..." | photos: real / stock
**Flags:** UNVERIFIED / NOT FOUND items
```

## Counting rules (same for every listing)

- **New reviews in about 90 days:** sort by Newest and count every review dated in days,
  weeks, "a month ago", "2 months ago" and "3 months ago". Google rounds relative dates,
  so the window runs a little over 90 days; the same rule for every rival keeps the
  comparison fair. Counts carry `~`.
- **Replies:** of the latest 20 reviews, how many have an owner reply.
- **Complaints:** read the newest ~30 reviews plus the 1 to 3 star reviews from the last
  two years (sort by Lowest). About 5 fetches per source, and stop there. A complaint
  counts once per review even if the review lists three problems under one theme.
- **Where reviews can be read:** Google Maps needs a browser or the user's screen. Yelp
  often blocks plain fetches (Firecrawl helps when keyed). BBB complaint and review pages
  usually fetch. Angi and HomeAdvisor pages sometimes do. Facebook and Nextdoor are
  login-walled; skip them and say so. Paid review data services return full review sets
  with dates when counting by hand across five rivals would take too long.

## Complaint themes that recur in local services

Start from these and add the market's own. Use the customer's words in the theme name.

| Theme | What reviewers say |
|---|---|
| Late or no-show | "said 8 to 12, showed at 4", "never showed, never called" |
| Price changed at the door | "quoted $150 on the phone, bill was $600" |
| Upsell pressure | "came for a clog, tried to sell me a new water heater" |
| Never called back | "left two messages", "form went nowhere" |
| Didn't fix it | "same problem two days later", "had to call someone else" |
| Mess left | "mud on the carpet", "left the old part in my yard" |
| Hard to book | "earliest was next Thursday" |
| Warranty refused | "said it wasn't covered" |
| Rude or rushed | "talked down to me", "in and out in ten minutes" |

Health and beauty businesses add wait time in the office, billing and insurance
surprises, and front-desk manner. Auto shops add "kept my car for a week" and "found
problems that weren't there".

## Reading local rivals

- **The promise they pay for vs the one they keep.** A rival whose ads say "same-day"
  while its reviews complain about waiting days has told you the promise the market wants
  and shown it can't deliver it. That's the strongest local gap there is, if the business
  can keep it.
- **Saturated promises are table stakes, not differentiators.** When every rival says
  "24/7" and "licensed and insured", saying it too is required and wins nothing. The
  differentiator is something specific and checkable: a time window, a price before work,
  a named guarantee.
- **Pace beats totals.** A rival with 1,200 reviews and a falling pace is coasting; a
  rival with 180 and 40 new this quarter is the one taking calls. Customers read the
  newest reviews first.
- **Franchises and call centers have structural gaps.** Central dispatch makes time
  windows wide, commission plans push upsells, and replies tend to be templates. An
  owner-run shop can promise what a franchise can't change quickly.
- **Price shown vs "call for pricing".** When nobody shows a price, a real, specific price
  (or an honest fee structure) is white space. Check the owner will publish it before
  recommending it.
- **Local Services Ads hold the top of the page** for many home services. A rival with
  the badge and strong reviews there takes calls before the map pack is even seen; note
  who has it.
- **Owner replies tell you who's paying attention.** A rival with unanswered 1-stars from
  this month is easy to out-serve in public.

## Non-local businesses

None of this applies to an online business or a software company; their rivals are found
through category searches, review sites and ad libraries, as in TEARDOWN. A business with
both (a multi-location brand that also sells online) runs TEARDOWN for the brand and LOCAL
for its biggest market.
