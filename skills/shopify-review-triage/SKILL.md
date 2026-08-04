---
name: shopify-review-triage
description: "Turn public 1-3-star Shopify App Store review rows into a P0-P3 triage brief: incident risk, repeated friction, pricing confusion, feature requests, and an explicit needs-human-read bucket."
category: product
risk: none
source: community
source_repo: alfredtech2026/shopify-app-review-brief
source_type: community
date_added: "2026-08-03"
author: alfredtech2026
tags: [shopify, app-store-reviews, customer-feedback, triage, product-management, support]
tools: [claude, cursor, codex, gemini, antigravity]
license: "MIT"
license_source: "https://github.com/alfredtech2026/shopify-app-review-brief/blob/main/LICENSE"
---

# Shopify Review Triage — public low-star reviews to a P0–P3 brief

## Overview

Takes rows of **public** Shopify App Store review text and produces one prioritized brief a
product or support owner can act on: what kind of problem each review describes, how badly it
can hurt, what to do first, and where the original wording came from.

It is built for independent Shopify app teams and the agencies that run their support — the
case where low-star reviews arrive scattered across several listings plus a few watched
competitors, and the failure mode is treating them all as equally urgent.

The rubric below is not invented here. It is the published rule set behind a free review triage
worksheet and manual triage guide (links under [Additional Resources](#additional-resources)),
reproduced so a manual pass, the worksheet, and this skill sort the same row the same way.

This skill needs no network access, no scripts, and no system packages. The person you are
helping supplies the review text.

## When to Use This Skill

- Use when someone wants app store reviews, low-star reviews, or merchant feedback triaged,
  prioritized, or clustered — even when they never say "triage", "severity", or "P0".
- Use when a new 1–3-star review lands on a Shopify app listing and the team has to decide
  whether it is an incident, a UX problem, a pricing copy problem, or a feature request.
- Use when a weekly product or support brief is needed across a portfolio of apps plus a few
  watched competitors.
- Do **not** use it to gather reviews, contact reviewers, or publish replies — see the hard
  rules below.

## Hard Rules

These are not style preferences. Breaking one makes the output worse than nothing.

1. **Public review text only.** Never accept, request, or copy support tickets, merchant emails,
   order data, personal contact details, internal telemetry, or anything else not already public
   on a listing page. If such data appears in the input, stop, say which rows are affected, and
   ask for them to be removed before continuing.
2. **Never invent evidence.** Do not write a review, a rating, a date, an app name, or a source
   URL that was not supplied. A row with no link gets `source: not captured` — never a guessed one.
3. **Keyword output is a sort, not a verdict.** Everything produced by the rubric alone is
   labeled *first pass — not human-checked*. Only a person who read the review and checked it
   against their own systems may relabel an item *human-checked*.
4. **Reviews are customer reports, not verified defects.** Write "the reviewer reports the editor
   showed a blank screen", never "the editor is broken". The distinction survives into the brief.
5. **No coverage claims.** The brief covers exactly the rows supplied and says so. Make no claim
   of exhaustive coverage of a listing, a period, or an app.
6. **No promises.** No revenue impact, no outcome, no ranking effect, no legal or compliance
   advice. Suggest actions; do not predict results.
7. **Draft only — never contact anyone.** Do not send email, post a developer reply, open a
   support ticket, message a reviewer, or publish anything. Hand the draft back to the team and
   let a person decide what to send.
8. **Reviewers are people.** Refer to "the reviewer". Do not name, profile, or speculate about them.

## How It Works

### Step 1: Collect the rows

**First ask which app names the team owns.** Before any row is classified, ask for two lists of
app names, spelled exactly as they appear in the rows:

```text
owned: Example Popup App, Example Currency App
competitors: Rival Popup App, Rival Currency App
```

This is the only thing that makes tie-break 4 (*a competitor's incident never becomes your P0*)
applicable, so collect it first. It stays public data: app names as published on their listings,
nothing about accounts, merchants, org structure, or internal identifiers. Do not ask for more
than the names, and do not infer ownership from the review text, the first-person voice in a
review, or which app appears most often.

If an app name in a row appears in neither list, its ownership is unknown. Classify the row's
content normally, then file it under **needs human read** with `ownership: not supplied` instead
of placing it in a priority bucket or in competitor watch — a guessed owner is exactly the kind
of invented evidence hard rule 2 forbids.

Then ask for one review per line. The full form keeps the source link, which the brief needs:

```text
rating | app name | review date | public reviews URL | review text
```

The shorter form used by the free worksheet is also fine — treat field 1 as the rating when it
is a bare 1–5 (optionally followed by `star`/`stars`/`★`), otherwise as the app name:

```text
rating | app name | review text
```

Rules for this step:

- Lines starting with `#` are comments. Blank lines are skipped.
- If a row lacks a source URL, carry `source: not captured` through to the brief. Do not drop
  the row and do not fabricate a link.
- Do not go and fetch anything yourself. This skill needs no network access; the person you are
  helping pastes the public rows they already opened.
- The trigger this rubric is tuned for is a **new 1–3-star review**. Higher-rated rows still
  classify correctly (a 5★ review often lands in feature requests or needs-human-read), so keep
  them if they were supplied, but never present them as low-star signal.

### Step 2: First pass — apply the rubric

Lower-case the review text and normalize curly apostrophes (`’` → `'`) before matching, so a
pasted "won’t load" still matches `won't load`.

Five buckets. Each row gets exactly **one primary** bucket — the first dimension below, in this
order, with any matching keyword. Further matches are recorded as **secondary**, never as a
second brief item.

#### P0 · Incident risk

The purchase path, app activation, or merchant data may be at stake right now. Left alone it
costs the merchant money and the team installs.

**Suggested action.** Try to reproduce on a test store today. If confirmed, treat it as an incident: fix or mitigate first, then reply to the reviewer with what changed.

**Signal keywords.** `won't load`, `wont load`, `won't open`, `wont open`, `can't close`, `cannot close`, `won't close`, `blank screen`, `broken`, `crash`, `stopped working`, `not working`, `doesn't work`, `does not work`, `checkout`, `losing sales`, `lost sales`, `error`

#### P1 · Repeated friction

The product works, but the same struggle keeps showing up across reviews or against an open
support theme. Repetition is the signal, not volume of adjectives.

**Suggested action.** Log it against the matching support theme. If the same complaint repeats across rows, schedule a UX fix ahead of new feature work.

**Signal keywords.** `confusing`, `unclear`, `hard to`, `difficult`, `complicated`, `clunky`, `slow`, `couldn't figure`, `could not figure`, `annoying`, `had to contact support`, `setup took`, `too many steps`

#### P2 · Pricing confusion

What the merchant expected to pay and what happened diverged. Usually a copy problem in the
listing, the plan limits, or the upgrade prompts — not a code problem.

**Suggested action.** Compare what the reviewer expected with the listing's pricing section and in-app upgrade prompts; clarify the copy where they diverge.

**Signal keywords.** `pricing`, `price`, `charged`, `charge`, `billing`, `billed`, `expensive`, `free plan`, `trial`, `refund`, `hidden fee`, `hidden cost`, `paywall`

#### P3 · Feature request

The merchant wants something the app does not do, or could not find. Valuable as a log entry,
rarely urgent on its own.

**Suggested action.** Add it to the feature-request log with a link to the review. If the capability already exists, reply to the reviewer with where to find it.

**Signal keywords.** `wish`, `would be great`, `would love`, `please add`, `feature request`, `missing`, `if only`, `would like`, `no option to`, `needs an option`, `hope you add`, `add support for`

#### Needs human read

No keyword matched. Vague frustration, sarcasm, mixed praise, or a story that needs context.

**Suggested action.** No keyword matched. Read the full review yourself and file it manually — the heuristic makes no guess here.

**Priority.** The worksheet labels this bucket `P2` and sorts it last. Treat that label as
provisional placement in the queue, not as a severity judgment — nothing has been judged yet.

#### Tie-breaks and escalation

1. **Most severe wins.** A row naming both a broken checkout and a billing surprise files under
   P0 with pricing noted as secondary. Never split one review across two brief items.
2. **Repetition escalates.** If the same friction or pricing theme appears in three or more
   reviews within about 60 days, move it up one level and say how many rows drove the change.
3. **Age discounts.** A review older than a year is background, not evidence of a current
   problem, unless a recent row corroborates it. Cite it as context, never as the headline.
4. **Competitor reviews never create a P0 for you.** Resolve the row's app name against the
   ownership lists from step 1: `owned` keeps its rubric bucket, `competitors` moves to the
   competitor watch section whatever its keywords matched, and a name in neither list goes to
   needs human read with `ownership: not supplied`. A competitor's incident is roadmap,
   positioning, or copy input — never your P0.
5. **When unsure, choose needs human read.** The bucket exists so the rubric never launders
   uncertainty into a priority label.

### Step 3: Human pass — verify before you promote anything

The first pass is where this skill stops being able to help on its own. Before any item is
presented as more than a keyword match, a person on the team has to:

- read the full original review at its source link;
- for P0 candidates, attempt to reproduce on a development store and check the error tracker and
  support inbox for matching signals from the same period;
- record the outcome as *reproduced*, *not reproduced*, or *attempted — notes attached*.

Ask for these outcomes rather than assuming them. Until you have them, every item stays labeled
*first pass — not human-checked*, including in the summary line. An unverified P0 is a candidate,
not an incident.

Known limits to state plainly when they apply: keyword matching is English-only, misses sarcasm
and context, can misfile a review that mentions "checkout" in passing, and sees only the rows
supplied.

### Step 4: Write the brief

One document per portfolio, sections in rubric order, every item carrying an owner, a next
action, and a source link. An item without an owner is a note, not a brief entry.

<!-- brief-template -->
```markdown
# Low-star review brief — {portfolio or team name} — week of {YYYY-MM-DD}

Scope: {apps monitored} · {competitors watched} · {N} rows supplied, {date range}.
Covers only the rows supplied — no claim of exhaustive coverage.
Reviews are customer reports, not verified defects. Items marked "first pass" are
unverified keyword matches; "human-checked" means a person read the review and checked it.

## P0 — Incident risk
- **{App} — {signal in a few words}** ({rating}★, {review date}, source: {public reviews URL or not captured})
  - Reviewer reports: {one sentence, in their words where possible}
  - Status: first pass — not human-checked / human-checked
  - Reproduced: {yes / no / attempted — notes}
  - Next action: {action} — owner {name}, due {date}

## P1 — Repeated friction
- **{App} — {theme}** ({rating}★, {date}, source: {public reviews URL or not captured}; also seen: {where})
  - Status: first pass — not human-checked / human-checked
  - Next action: {UX or docs change} — owner {name}, due {date}

## P2 — Pricing confusion
- **{App} — {signal}** ({rating}★, {date}, source: {public reviews URL or not captured})
  - Expected vs. actual: {one line}
  - Status: first pass — not human-checked / human-checked
  - Next action: {copy or prompt change} — owner {name}, due {date}

## P3 — Feature requests
- **{App} — {request}** ({rating}★, {date}, source: {public reviews URL or not captured}) — {log it / already exists → reply with where to find it}

## Needs human read
- **{App}** ({rating}★, {date}, source: {public reviews URL or not captured}) — {no keyword matched; what a human should look for}{, or: ownership: not supplied — app name on neither list}

## Competitor watch
- **{Competitor} — {signal}**: {what it implies for our roadmap, copy, or positioning}

## Decisions this week
- {one decision or experiment, with the row(s) that motivated it}
```

Open the summary line with the counts, e.g. *"Triaged 8 rows supplied: 3 incident risk,
2 repeated friction, 1 pricing confusion, 1 feature request, 1 needs human read — first pass,
not human-checked."*

### Step 5: Self-check before you hand it over

Refuse to deliver until every line is true:

- [ ] Every item names its bucket and priority from the rubric above, and nothing else.
- [ ] Every item carries a source link or an explicit `source: not captured`.
- [ ] Every P0–P3 item is an app on the `owned` list; every competitor row sits in competitor
      watch; every unlisted app name says `ownership: not supplied` under needs human read.
- [ ] No review text, rating, date, app name, or URL appears that was not supplied.
- [ ] Every unverified item says *first pass — not human-checked*; nothing claims a human check
      that did not happen.
- [ ] Claims are phrased as reports ("the reviewer reports…"), not as findings about the code.
- [ ] The scope line says how many rows were supplied and makes no coverage claim.
- [ ] No promise about revenue, ratings, outcomes, or compliance appears anywhere.
- [ ] No private data survived into the output.
- [ ] Nothing was sent, posted, or published — the brief is a draft for the team.

## Examples

### Example 1: Worked example — eight rows in, first pass out

These eight fictional rows are the worksheet's own example set, so the two tools can be compared
directly. Two of them are deliberately 4★ and 5★, to exercise the feature-request and
needs-human-read buckets.

Ownership context, collected before any of it is classified:

```text
owned: Example Popup App, Example Currency App, Example Reviews App
competitors: (none supplied)
```

```text
1 | Example Popup App | The editor shows a blank screen and the popup won't load. We are losing sales every day.
2 | Example Popup App | The overlay can't close on mobile and it blocks the checkout button.
1 | Example Currency App | Conversion is broken at checkout and we were still billed for the month.
3 | Example Currency App | Setup took hours and the settings screen is confusing. Support was slow to reply.
3 | Example Reviews App | The widget looks fine but the template editor is confusing and hard to use on a tablet.
2 | Example Currency App | We kept getting charged after uninstalling, and the pricing page never mentioned this.
4 | Example Reviews App | Great app, but I wish it could export reviews to CSV. Please add filtering by country.
5 | Example Reviews App | Does what it promises and support replied the same day.
```

First pass over those rows:

```text
row 1 → P0 incident risk
row 2 → P0 incident risk
row 3 → P0 incident risk (secondary: pricing confusion)
row 4 → P1 repeated friction
row 5 → P1 repeated friction
row 6 → P2 pricing confusion
row 7 → P3 feature request
row 8 → needs human read
```

**Explanation:** Rows 4 and 5 both matched `confusing`, so they are flagged as a repeated theme —
two rows, which is a cluster to watch, not yet the three that trigger escalation. Row 3 is a
single P0 item with pricing recorded as secondary, never two items. Row 8 matched nothing and
stays unjudged. All three app names are on the `owned` list, so every bucket above is the team's
own queue and competitor watch is empty; had `Example Reviews App` been listed as a competitor
instead, rows 5, 7, and 8 would move there and none of them could become a P0. None of these rows
carried a source URL, so each item would read `source: not captured` until the team supplies the
listing links.

### Example 2: A row that carries its source link

```text
1 | Example Popup App | 2026-07-28 | https://apps.shopify.com/example-popup-app/reviews?ratings%5B%5D=1 | The editor shows a blank screen and the popup won't load. We are losing sales every day.
```

Rendered into the brief:

```markdown
## P0 — Incident risk
- **Example Popup App — editor reported blank, popup reported not loading** (1★, 2026-07-28, [source](https://apps.shopify.com/example-popup-app/reviews?ratings%5B%5D=1))
  - Reviewer reports: the editor shows a blank screen, the popup does not load, and they are losing sales daily.
  - Status: first pass — not human-checked
  - Reproduced: not yet attempted
  - Next action: attempt reproduction on a development store today — owner {name}, due {date}
```

**Explanation:** It files as a P0 only because `Example Popup App` is on the `owned` list; the
same row from a competitor listing would render under competitor watch instead. The wording stays
a report ("the reviewer reports"), the status stays *first pass — not human-checked* until a
person verifies it, and the source link is the listing's public reviews page with the rating
filter kept — the App Store has no per-review permalink.

## Best Practices

- ✅ **Do:** keep one review in exactly one bucket, and record extra matches as secondary notes.
- ✅ **Do:** carry `source: not captured` forward when a row has no link, so the gap is visible.
- ✅ **Do:** label every unverified item *first pass — not human-checked*, including in the summary.
- ✅ **Do:** phrase every finding as a customer report, not as a confirmed defect.
- ✅ **Do:** state how many rows were supplied and refuse any coverage claim beyond them.
- ❌ **Don't:** fetch reviews, scrape listings, or ask for support tickets, emails, or order data.
- ❌ **Don't:** invent a rating, date, app name, or URL that was not supplied.
- ❌ **Don't:** send, post, or publish anything — including a developer reply to a reviewer.
- ❌ **Don't:** promise a revenue, ratings, or compliance outcome from any suggested action.

## Limitations

- Keyword matching is **English-only**. Non-English reviews match nothing and land in
  needs-human-read; that is the correct outcome, not a bug to work around by translating first.
- The rubric misses sarcasm, irony, and context, and can misfile a review that mentions
  "checkout" or "missing" in passing.
- It sees only the rows the person supplies. It cannot know a listing's full review history, the
  team's error tracker, or their support inbox.
- It cannot verify anything. Every P0 it produces is a *candidate*, not a confirmed incident,
  until a person reproduces it.
- It does not replace environment-specific validation, testing, or expert review. Stop and ask
  for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- **No commands, no network, no credentials.** This skill runs on pasted text only. It must not
  fetch listings, call APIs, or read files outside what the person supplies.
- **Private data is a stop condition.** If support tickets, merchant emails, order records,
  personal contact details, or internal telemetry appear in the input, stop, name the affected
  rows, and ask for them to be removed before continuing.
- **No outbound messaging.** The output is a draft handed back to the team. Sending email,
  posting a public developer reply, opening a ticket, or contacting a reviewer is out of scope
  under every circumstance (hard rule 7).
- **Reviewers are people.** Do not name, profile, or speculate about a reviewer; refer to
  "the reviewer".
- **No promises.** No revenue, ratings, ranking, legal, or compliance claims belong in a brief.

## Common Pitfalls

- **Problem:** The Shopify App Store has no stable per-review permalink.
  **Solution:** Cite the listing's public reviews page, keep the rating filter if one was used
  (`…/reviews?ratings%5B%5D=1`), and pin the item with the review date plus the reviewer's first
  few words so a human can find it again.
- **Problem:** `checkout` is the noisiest keyword in the set — it fires on "we love the checkout
  upsell".
  **Solution:** A P0 whose only evidence is the word `checkout` is a needs-human-read row wearing
  a P0 badge. Say so instead of promoting it.
- **Problem:** `missing` and `error` cross buckets — "missing a dark mode" is P3, "settings page
  errors out" is P0.
  **Solution:** Primary-bucket order resolves the collision mechanically; the human pass fixes
  the ones where it guessed wrong.
- **Problem:** A competitor's incident looks worse than anything on the team's own listings.
  **Solution:** It still goes to competitor watch. A competitor's P0 is never yours.
- **Problem:** One review gets split across two sections, double-counting the same merchant and
  inflating every count in the summary line.
  **Solution:** One review, one item. Secondary matches are annotations.
- **Problem:** The free in-browser worksheet parses three fields and folds everything after the
  second `|` into the review text, so a five-field row displays its date and URL inside the quote.
  **Solution:** Paste the short form into the worksheet and keep the long form here.

## Related Skills

- `@customer-research` — when the goal is broader voice-of-customer synthesis rather than
  prioritizing a specific set of low-star review rows.
- `@shopify-apps` — when the next step is actually building or fixing the Shopify app behavior a
  triaged P0 points at.
- `@before-you-build` — when a P3 feature request needs product-risk review before it becomes
  roadmap work.

## Additional Resources

This skill packages the public rubric behind **Shopify App Review Brief**, an independent
open-source project that is not affiliated with or endorsed by Shopify Inc. or any app developer.
The same four dimensions, priorities, keyword lists, and suggested actions are published in three
places:

- [Manual guide, tie-break rules, and brief template](https://alfredtech2026.github.io/shopify-app-review-brief/guides/shopify-app-review-triage.html)
- [Free in-browser worksheet that automates the first pass](https://alfredtech2026.github.io/shopify-app-review-brief/tools/review-triage-worksheet.html)
- [Two worked sample briefs over real public reviews](https://alfredtech2026.github.io/shopify-app-review-brief/#samples)

Upstream source repository: [alfredtech2026/shopify-app-review-brief](https://github.com/alfredtech2026/shopify-app-review-brief) (MIT).
