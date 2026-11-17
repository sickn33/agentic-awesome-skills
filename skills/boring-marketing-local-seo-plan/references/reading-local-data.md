# Reading local data without fooling yourself

Load before interpreting any volume, Search Console figure, job count or review count in /boring-marketing-local-seo-plan. Each rule names the mistake it prevents. The figures in the examples are illustrative, not real data.

## Search volume

### Keep geographic panels separate

There are four common ways to ask "how many people search for this here", and they overlap:

| Panel | What it measures | Use it for |
|---|---|---|
| Metro (Nielsen DMA or similar) | Searches from people inside the metro | Market-level planning |
| City or county | Searches from people inside that boundary | Comparing towns against each other |
| A set of counties that don't overlap | A true corridor total | Only when you genuinely need one rollup |
| Phrase with the city in it, searched nationally | How often anyone anywhere types "water heater repair garland tx" | Whether people type the town name at all |

Dallas city sits inside Dallas County, which sits inside the Dallas-Fort Worth metro. Adding the three counts the same searches three times. The last panel is the most misread: a national volume for "plumber garland tx" says people type that wording, not how many people in Garland need a plumber. Most local searchers type "plumber near me" and let their location do the rest.

### Don't sum close variants

Keyword tools often return the same number and the same monthly series for phrasings Google treats as one intent, for example "water heater repair near me" and "hot water heater repair near me". That is one family observed twice. When the difference matters, request each form separately, keep a shared group id, show them side by side, and use one representative or the group maximum. Never produce a total by adding them.

When you validate demand town by town, send one representative phrase per group, not every variant, and send the variants separately only when the difference changes a decision. It keeps the request small and stops variants from being read as separate markets.

### Keep null, zero and the floor apart

- **No estimate returned** means the tool had nothing reportable. Write "no reportable estimate", never 0.
- **0** means the tool returned zero for that period and place.
- **The lowest reporting tier** (often 10 in local data) is a rounding floor, not ten people.

A plan that turns a null into a zero will drop real towns. A plan that reads the floor as a count will promise traffic that was never there.

Errors are a fourth state. A request that timed out or failed observed nothing, so it stays unknown, never zero, and it's named in the plan's gaps. A "no results" reply is different: the tool looked and found none, which is an observed zero.

### CPC is not difficulty

Cost per click and the "competition" field describe the ad auction. A high CPC says the clicks are commercially valuable. It says nothing about how hard the organic result or the map pack is to win. Organic difficulty comes from reading the actual results: who ranks, how strong their pages are, whether the map pack is full of businesses with ten times the reviews.

### Read the monthly series

Don't let one month become the baseline. Plumbing demand jumps after a hard freeze, AC repair peaks in summer, roofing spikes after hail. Keep the monthly numbers, mark one-month spikes, and ask what in the weather or the season explains a change before calling it a trend.

## Search Console

- It shows the demand that already reaches the site, not the market. A town with no impressions may have plenty of demand and simply no page.
- Use property-level query totals for clicks and impressions. Use page-by-query rows to see which page wins each query and where two pages compete for the same one (cannibalization).
- Don't add page-by-query impressions across pages as if each were separate demand.
- "Near me" queries carry no reliable city. Don't assign them to towns.
- Exports are capped at the top rows. Say so in the watermark ("top 5,000 page-query rows, Jan 1 to Jul 12").
- Strip competitor brand queries before reading totals.
- Sort every query into exactly one bucket, in a fixed order, so nothing is counted twice: brand, then near-me, then town plus service, then informational, then service only. The first bucket that matches wins.
- Average position across many queries is weighted by impressions (the sum of position times impressions, divided by total impressions). A plain average lets a query with three impressions move the number as much as one with three thousand.

## Job records and invoices

- Filter to paid work, then read every candidate record. Structured fields (vehicle, equipment, job type) are often wrong. The notes are usually right.
- Merge duplicates before counting: same customer, same address or asset, nearby dates, an estimate followed by an invoice, a return visit.
- Paid doesn't mean the repair succeeded. Use "paid service record" unless the notes or a review confirm the outcome.
- Estimates, leads and dispatch lines are not capability.

## Reviews

Reviews are the strongest outcome proof when they name the thing, the problem, the place and the result ("replaced our water heater in Garland the same afternoon"). Quote them verbatim with the date. They never enumerate every job, so a missing review isn't evidence the work wasn't done.

## Calls

Calls are the best record of what customers ask for and why jobs are won or lost. They count as quantitative demand only when most calls are logged and classified. A pile of unclassified recordings is a sample, and a "processed" counter can include calls that were skipped for having no content. Check what the number actually counts before quoting it.

## Map pack and organic results

- Record query, date, location and device for every check.
- A result checked from the wrong place is mislabeled evidence, not a finding.
- Something you couldn't observe is "unobserved", never "not ranking".
- Results move day to day. Treat one check as a sample and re-check before quoting it to a client.
