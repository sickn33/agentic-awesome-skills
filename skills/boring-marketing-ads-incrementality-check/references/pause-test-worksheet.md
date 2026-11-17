# Pause test worksheet

Load when the user has no python, wants to do the test in a spreadsheet, or needs to hand
the method to someone else. The script (`scripts/call_log.py pause-test`) computes the same
numbers. All figures in the examples below are illustrative.

## 1. Get the exports

| Source | What to export | Where |
|---|---|---|
| Phone system | Every call, both directions, all lines, 60+ days before the test through the end | The call history or reporting export in the phone system's web app. Quo (OpenPhone), CallRail, RingCentral and most carriers' business portals export CSV. Google Voice exports are awkward: Google Takeout gives the call history, which may need copying into a sheet |
| Google Business Profile | Calls, by day or week, same dates | The profile's Performance view. Write the numbers down if there's no export |
| Ad platform | Spend and claimed conversions per day for the campaign, same dates | Google Ads campaign report with a day segment; Meta Ads Manager breakdown by day |
| Job system (optional) | Jobs booked per day or week, same dates | The job, invoicing or CRM system |

Column names differ by system. You need, per call: when it started, inbound or outbound,
answered or missed (or voicemail), duration, the customer's number, and which line.

## 2. Clean it

1. Keep inbound calls only.
2. Keep the lines the public dials. A tech's direct line and an internal line add noise.
3. Drop numbers on a staff, vendor and known-spam list.
4. Mark each call "real" if it was answered and lasted 30 seconds or longer.
5. Normalize phone numbers to their last 10 digits so `+1 (214) 555-0100` and
   `2145550100` match.
6. Add a column for the date (not the time), the weekday, and the window
   (before, during, after).
7. If the export's times are in UTC, convert to the business's local time first.
   A 7 pm call in Dallas is 1 am UTC the next day, which moves it to the wrong date.

## 3. The summary table

One row per window. Per-day values are totals divided by the days in the window,
including days with zero calls.

| Window | Days | Inbound/day | Real calls/day | Unique callers/day | GBP call clicks/day | Claimed conversions/day |
|---|---|---|---|---|---|---|
| Before | 28 | say 14.0 | say 7.5 | say 9.0 | say 4.8 | say 4.0 |
| During pause | 28 | | | | | 0 |
| After | 28 | | | | | |

Unique callers per day: count distinct numbers per date, then average over the window.

## 4. The normal swing

Split the before window into whole weeks. Average real calls per day for each week. The
lowest and highest weekly averages are the normal swing. Example: weeks of 6.8, 7.9, 7.1
and 8.2 real calls a day give a swing of 6.8 to 8.2. A pause window at 7.4 is inside it:
no detectable change. A pause window at 5.1 is well outside it.

## 5. Season adjustment (when the log covers last year)

Expected during = this year's before x (last year's during / last year's before).

Example: last year the same before and during weeks averaged 7.0 and 7.7 real calls a day,
a seasonal rise of 10%. This year's before is 7.5, so the season predicts 8.25 during the
pause. If the pause window shows 7.4, the campaign may be worth about 0.85 calls a day.
That is still small next to a claim of 4 a day, and it should be checked against the normal
swing before anyone acts on it.

## 6. Cost per extra call

Cost per extra call = monthly spend / (real calls lost per day x 30).

Value of a call = close rate x average gross margin per job.

Keep the campaign when the cost per extra call is below the value of a call, with room for
error. Example: $2,000 a month and 0.85 calls a day lost gives $78 a call. At a 35% close
rate and $400 margin a call is worth $140, so it earns its keep, if the 0.85 is outside
the normal swing.

## 7. Plan template (copy into the output file before pausing)

```
Campaign: <name>                   Monthly spend: $<n>
Platform claim: <n> conversions over <dates> = <n> per day
Measures: inbound/day, real calls/day (answered, 30s+), unique callers/day,
          GBP call clicks/day, [new callers/day], [jobs/week]
Lines included: <names>            Numbers excluded: <count> (staff, vendors, spam)
Before: <date> to <date>   During: <date> to <date>   After: <date> to <date>
Decision rule: If real calls/day fall below <lowest before week> and unique callers
  fall too, resume. If both stay within <low> to <high>, keep paused and move the
  budget to <where>. Otherwise rerun with a longer window.
Owner approved: <name>, <date>
```

## 8. Variants

- **Branded search:** pause the brand campaign only. Measure the same calls plus organic
  clicks on brand terms from Search Console. If the business ranks first organically for
  its name and no competitor bids on it, the brand campaign usually buys clicks it would
  get free.
- **Meta:** pause the campaign and use the same phone and form measures. Meta's default
  attribution setting includes a 1-day view window, which credits people who scrolled past an ad
  and called anyway.
- **Online business:** replace calls with orders or signups from the order system,
  split new and returning customers, and measure new-customer orders per day.
