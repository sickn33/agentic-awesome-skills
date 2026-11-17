# Scoring: losing customers, can pay, the one problem

Load before Phase 5. The point values below are defaults built for a hand-checkable list. Change a weight when the agency's offer argues for it (an agency that only sells review work can weight the chosen stage up) and say so in the list's note.

## Losing-customers score (0 to 100)

Score each line from the evidence you have. A field you couldn't check scores 0 and goes in the note as not checked, so a missing field never makes a business look worse than it is. The line codes (R1, C3) and point sums here are working notes. The list shows only the score, the tier and the problem in the owner's words.

### Reached: they wanted to call (up to 55)

| Line | Evidence | Points |
|---|---|---|
| R1 Site | Site down, error page, parked domain or certificate warning | 25 |
| | No website at all | 20 |
| | Loads, but no mobile layout (pinch to read, desktop menu on a phone) | 12 |
| R2 Phone on the first screen | No number on the first screen at 390px wide, on the page the customer lands on (including a number that only appears after opening a menu) | 20 |
| | A number is on the first screen but can't be tapped (an image or plain text) | 10 |
| R3 The ad's promise (only when ads run) | The ad promises something (24/7, same day, a price, free estimate) that the first screen of its landing page doesn't say | 10 |
| | The ad sends people to the homepage instead of a page for the service it sells | 5 |

R2 and R3 don't apply when R1 found no site. The landing page is the one the ad opens, found in the Transparency Center, not the homepage.

### Chosen: they saw it and picked someone else (up to 40)

The leaders are the three businesses in the cell with the most reviews, national brands skipped.

| Line | Evidence | Points |
|---|---|---|
| C1 Rating | 0.3 stars or more under the leaders' median | 10 |
| | 0.1 to 0.29 under | 5 |
| C2 Review count | Under a quarter of the leaders' median | 10 |
| | A quarter to a half | 5 |
| C3 Review pace | No new review in the last 60 days | 10 |
| | Last-90-day count under a third of the leaders' | 5 |
| C4 Owner replies | 6 or more of the last 10 reviews have no owner reply, or any 1 or 2 star review in the last 10 has none | 10 |
| | 3 to 5 of the last 10 have none | 5 |

### Found: they never saw it (up to 5)

| Line | Evidence | Points |
|---|---|---|
| F1 AI answers | Two or more leaders are named across the town's questions and this business is named in none | 5 |

If nobody local gets named (the assistants list directories instead), F1 scores 0 for everyone and the note says so.

## Can-pay tier

Count the signals you can see. Each needs evidence a stranger could find.

1. **Review volume** at or above half the leaders' median count.
2. **Paid ads running now**: Google (Transparency Center, last 30 days), Meta (Ad Library, active) or a Local Services badge.
3. **More than one location**, or an office plus a service area across several towns.
4. **A visible crew**: three or more branded trucks in photos, or five or more people on the team page.
5. **Hiring now**: a job post for techs, installers or office staff in the last 60 days.
6. **Five or more years in business**: license issue date, BBB "years in business", or a "since" line.
7. **Financing or a maintenance plan** offered on the site.

A is 4 or more. B is 2 or 3. C is 0 or 1.

Two flags that change the pitch, not the tier:
- **Never bought marketing** (no ads, no "site by" credit, no tracking number): the first sale is harder, and the pitch has to be about customers lost, not money wasted.
- **Already has a vendor** (ads running, an agency credit in the footer): the pitch never trashes the vendor. It names one thing the vendor's work is losing and offers to fix only that.

## Park rules (listed, not ranked)

- Rating well under the leaders (default: more than 0.5 under) with recent reviews about the work itself: no-shows, deposits kept, damage, rudeness. Write "fix the work first".
- Franchise locations, unless the user sells to franchisees.
- Permanently closed, or the phone is disconnected.

## The one problem

Among the lines that scored, pick the one closest to the phone: R before C before F. Within a stage, the higher points win. Tie: the one you can show worked fastest (a call count in two weeks beats a ranking in two months).

Write it in the owner's words, with the evidence in the next column.

| Scored line | How the owner would say it |
|---|---|
| R1 broken | "The site's been down since at least {date}. People who click your Google listing get an error." |
| R2 | "On a phone, your number isn't on the first screen. People have to find the menu to call you." |
| R3 promise | "Your ad says '{their words}'. The page it opens doesn't say it until halfway down." |
| C3 pace | "No new Google reviews since {month}. The top three got {n} between them in that time." |
| C4 unanswered | "{n} of your last 10 reviews have no reply, including a 2-star from {date} about {topic}." |
| F1 | "When I asked ChatGPT and Perplexity for the best {trade} in {town}, they named {leaders} and not you." |

## Three sample rows (calibration)

All three are invented samples with illustrative numbers. The leaders' baseline in this sample cell: 4.8 stars, 1,150 reviews, about 45 reviews in the last 90 days.

**Hartline Plumbing, Dallas TX (sample business). Tier A, score 60.**
4.7 stars, 310 reviews, 9 in the last 90 days. A Google ad reads "24/7 emergency plumber, no overtime fees" and lands on the homepage. At 390px the first screen is a photo slider; the number lives in the menu. 7 of the last 10 reviews have no reply, one of them a 2-star about a missed window. Not named in any AI answer; two leaders are.
Score: R2 20 + R3 10 (the promise is missing; the homepage landing is part of the same problem, so the line takes its higher value) + C1 5 + C2 5 + C3 5 + C4 10 + F1 5 = 60.
Tier signals: ads, a crew (six trucks in photos), hiring (a tech job post), since 2009, financing = 5, tier A.
The one problem: "Your Google ad promises 24/7 emergency service, but the page it opens shows a photo slider and no phone number on a phone screen." Evidence: Transparency Center, domain search, US, last 30 days, ad text quoted; 390px screenshot dated.

**A one-truck plumber in the same cell (sample). Tier C, score 45, not pitched.**
No website, 4.9 stars on 18 reviews, last review five months ago, no ads, and the owner replies to every review himself.
Score: R1 20 + C2 10 + C3 10 + F1 5 = 45. Tier signals: none past "since 2017" = 1, tier C. A real leak with nothing to pay for the fix. This is why the list ranks inside tiers.

**A roofer in Tampa (sample). Parked.**
3.6 stars against a leaders' median of 4.7, with four of the last ten reviews about deposits taken and no crew showing up. The site and ads are fine. Parked: "fix the work first."

## When the score and your gut disagree

The score ranks visible leaks; it can't see an owner who just hired an agency, or a business about to sell. When a row's score and what you saw on the profile disagree, keep the score, add a one-line note, and let the pitch's reply settle it. Changing scores by feel makes the next cell's list impossible to compare.
