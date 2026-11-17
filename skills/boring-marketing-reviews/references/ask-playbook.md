# Ask playbook

**Load this when** setting up the ask (Phase 6). Scripts by trade and channel, the setup
by tool, and the lines that break the rules. Samples use the sample business Hartline
Plumbing, Dallas TX (illustrative). Replace `[link]` with the profile's own review link
from "Ask for reviews" in the Business Profile.

## Every script follows the same rules

- It goes to every customer after every finished job.
- It names a person (the tech, the hygienist, the service writer) when possible. People
  review people.
- It asks for a review, not a rating. No "5 stars", no "if you loved us".
- It asks for nothing specific to be mentioned.
- It offers nothing in return. No discount, no entry into a drawing, no gift card.
- It's short enough to read on a lock screen.

## In person, at the end of the job (home services)

The tech says it while the customer is looking at the fixed thing:

> "You'll get a text from us in a bit with a link to our Google page. If we did right by
> you today, a review there helps us a lot."

Then the tech leaves. No standing in the kitchen while the customer types, and never on
the tech's phone.

## Text, same day (home services)

Before the first text goes out, in the US the number has to be registered for business
texting (A2P 10DLC), and the message stays about their job, never a promotion. Registration
and consent are covered in `/boring-marketing-speed-to-lead`. Keep the opt-out working (a reply of STOP ends
the texts).

Send it within a couple of hours of the job closing:

> Hi Maria, it's Hartline Plumbing. Thanks for having Luis out today. If you have a
> minute, a Google review helps a small business like ours more than anything: [link]

## Text reminder, day 3 to 5 (once, then stop)

> Hi Maria, Hartline again. If you didn't get a chance, here's the link for a quick
> Google review: [link]. And if anything isn't right with the repair, reply here and
> we'll fix it.

The "if anything isn't right" line goes to everyone, in the same message as the link,
with no condition. That's customer service. It turns into gating when the link only
comes after the customer says they're happy, or when unhappy customers are steered away
from it.

## Email (no mobile on file, or commercial accounts)

Subject: Thanks from Hartline Plumbing

> Hi Robert, thanks for having us out to the Elm Street property today. If you have a
> minute, a short Google review helps other property managers find us: [link]
> Anything not right with the work, reply to this email and I'll handle it. Sam

## Walk-in businesses (dental office, auto shop, med spa)

- A small card or invoice line with the QR code: "Reviews on Google help us. Scan to
  leave one." The customer scans it on their own phone, at home or in the car.
- Front desk line at checkout: "We'll send you a link to our Google page. A review there
  helps us a lot."
- For health businesses, the text names no treatment and no visit details:
  > Thanks for visiting us today. If you have a minute, a Google review helps:
  > [link]
- Never hand the customer the office tablet or ask them to post before leaving.

## Past customers (the backlog, once)

Customers from the last 6 to 12 months who were never asked:

> Hi Daniel, it's Sam at Hartline Plumbing. We did your water heater back in the spring.
> We're asking past customers for Google reviews this month. If you have a minute: [link]

Send in small batches (say a few dozen a week, illustrative) over a few weeks, not one
blast.

## Lines that break the rules

| Line | Why it's out |
|---|---|
| "Leave us 5 stars!" | Influences the rating (Google) |
| "Get $25 off your next service for a review" | Incentive (Google; FTC if tied to a positive review) |
| "Happy with us? Leave a review. Not happy? Call us first." as a gate before the link | Steers unhappy customers away (gating) |
| A 1-to-5 survey that sends only 4s and 5s to Google | Gating |
| "Mention our same-day service in your review!" | Requests specific content |
| Asking staff, family or friendly vendors to review | Conflict of interest |
| Trading reviews with another business | Conflict of interest, fake engagement |

## Setting it up

Pick by what the business already uses. Any of these works; none is required.

| Setup | How the ask fires | Effort |
|---|---|---|
| Field service software with review requests built in (Jobber, Housecall Pro, ServiceTitan and others) | Turn it on, set the text, trigger on job closed or invoice paid | Under an hour |
| A review tool (NiceJob, Podium, Birdeye, GatherUp and others) | Connects to the job or booking system, sends and reminds | An hour or two, monthly fee |
| An automation tool (Zapier, Make) between the job system and a text sender | "Job closed" step sends the text | An hour or two |
| No software | The office sends the saved text at the end of each day from the business phone | 10 minutes a day |

Check before turning any tool on: it sends the link to every customer, it doesn't offer a
"how did we do" screen that hides the link from low scores (some tools ship with this
on), and the texts go from a number customers recognize.

## What to measure

Each month: jobs finished, asks sent, reviews received, replies posted. The share of asks
that turn into reviews is the number to watch; when it drops, look at timing (sent too
late) and the tech's in-person line (skipped) first.
