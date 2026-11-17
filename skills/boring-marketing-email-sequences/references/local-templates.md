# Local Service Sequences: Templates and Timing

Load when the business is one customers call from a map or a search (plumbers, roofers,
HVAC, dentists, med spas, cleaners, auto repair) and the sequence is a quote follow-up, a
review ask, a seasonal reminder, a win-back, a missed-call follow-up, a treatment-plan
follow-up or appointment reminders. Copy uses
Hartline Plumbing, Dallas TX (hartlineplumbing.com), a sample business. Brackets are
merge fields; blanks are for the owner's real numbers.

## Rules that apply to all seven

- **Text and email do different jobs.** Text is for speed and short replies (the missed
  call, the day-after quote check, the review link). Email carries detail (the written
  quote, the checklist, photos). Most sequences use both.
- **Texting needs care.** In the US, business texting runs over registered (10DLC)
  numbers, and marketing texts need the customer's consent. A reply to someone who just
  called is the safest kind of text; adding them to promotions is not. Check the texting
  provider's rules before automating anything.
- **A named person, not "the team".** "This is Marcus, the tech who quoted your water
  heater" gets replies; "Hartline Plumbing Customer Care" doesn't.
- **Stop on any reply or booking.** Every step checks status first. Nothing kills trust
  like an automated "still thinking about it?" the day after they paid.
- **Short.** Under 120 words for email, under 300 characters for text.

## 1. Quote follow-up (quotes that didn't book)

Trigger: a quote was sent and not accepted. Channel: text plus email. Stop: accepted,
declined, or a reply.

Why front-load it: in Level's quote dataset (794 contractor companies; article updated
Nov 7, 2026; vendor data), winning quotes were accepted in a median of 2 days, while lost
quotes were marked lost a median of 29 days after sending. That 29 days is when the office
closed the quote, not when the customer decided, and the data doesn't show follow-up
activity, so it's a reason to follow up early, not proof that it wins jobs. In
ServiceTitan's 2025 Residential Services Report (a Thrive Analytics survey of 1,000+
residential contractors, released March 25, 2025; vendor data), 47% of contractors with
$10M+ in revenue said following up on estimates results in 11-15% of their income.

| Step | When | Channel | Job |
|---|---|---|---|
| 1 | With the quote | email + text | The quote in writing, what's included, how to accept in one tap |
| 2 | Day 1 | text from the tech | "Any questions on the quote?" |
| 3 | Day 3 | email | Answer the likely objection: price (options, financing) or trust (photos of a similar job, reviews) |
| 4 | Day 7 | call, then text | The direct ask, with a real reason to decide (slot or price held until a date) |
| 5 | Day 14 | email | Close the loop politely ("should I close this out?") |

Step 2 (text): "Hi [first name], it's Marcus from Hartline. Any questions on the water
heater quote I sent yesterday? Happy to walk through the options. Reply here or call
[number]."

Step 3 (email). Subject: "Your water heater options, side by side". Body: "Hi [first
name], a few people ask whether the [option] is worth it over the standard tank, so here
are both with what changes: [table of 2-3 options with price and warranty]. If the total
is the sticking point, financing runs about $____ a month on approved credit [lender's
required wording]. Your price is good through [date]. Marcus, Hartline Plumbing,
[number]"

Step 5 (email). Subject: "Should I close out your quote?" Body: "Hi [first name], I
haven't heard back on the water heater quote, which usually means the timing isn't right
or you went another way. Either is fine. Reply 'later' and I'll check in next month, or
'done' and I'll close it out. Marcus"

A one-word reply option makes it easy to answer. Note "later" replies for a 30-day
check-in.

## 2. Review ask after the job

Trigger: the job is marked complete or paid. Channel: text, then one email. Stop: a
review posted, a reply, or after step 2.

Ask every customer, every job. In BrightLocal's Local Consumer Review Survey 2026 (1,002
US consumers, published Feb 11, 2026; vendor data), 83% of people asked to leave a review
went on to leave one, and 74% look for reviews written in the last three months, so a
steady flow matters more than a one-time push.

| Step | When | Channel | Job |
|---|---|---|---|
| 1 | Within a few hours of the job | text | Thanks from the tech by name, one direct link to the review form |
| 2 | Day 2-3, only if no review | email | One reminder with the same link, a line about what the review helps |

Step 1 (text): "Hi [first name], thanks for having us out today. If Marcus did right by
you, a quick Google review helps neighbors find us: [direct review link]. Anything not
right? Reply here and I'll fix it. [Owner name], Hartline"

Step 2 (email). Subject: "How did Marcus do?". Body: two sentences of thanks, the link, and
"if anything wasn't right, reply and it comes straight to me."

Don't offer discounts or gifts for reviews, and don't filter who gets asked based on
whether they're happy; Google's review policies prohibit both. The full review system
(replies, pace, the ask at the door) is `/boring-marketing-reviews`.

## 3. Seasonal maintenance reminder

Trigger: a date before the season, sent to past customers with that system (and anyone
who opted in from a seasonal checklist). Channel: email, plus one text to people who agreed
to texts. Stop: booked.

| Step | When (default) | Job |
|---|---|---|
| 1 | about 6 weeks before the season | What to check, the tune-up price, the booking link |
| 2 | about 3 weeks before | Book before the rush; slots left this month |
| 3 | about 1 week before (text to opted-in) | Last call for pre-season slots |

Make the timing the local season: first freeze for pipes, the first 90-degree week for AC,
storm season for roofs. Step 1 earns the open by being useful on its own:

Step 1 (email). Subject: "Before the first freeze: 3 things to check this weekend". Body:
the three checks in one line each, then "Want us to do it? Our winter plumbing check is
$____ and takes about an hour: [book link]. Members get it free." The membership mention
is the natural place to sell a maintenance plan.

Real scarcity only. "Slots left this month" needs the real count.

## 4. Win-back for past customers

Trigger: last job 12-24 months ago, no job since, and not unsubscribed. Channel: email.
Stop: booked, a reply, or step 3.

| Step | When | Job |
|---|---|---|
| 1 | Day 0 | A specific, useful note about their system ("the water heater we installed in [year] is due for a flush") |
| 2 | Day 7 | A reason to book now: a priority slot, a tune-up price, the membership |
| 3 | Day 21 | Re-permission: "Want to keep hearing from us? One click to stay, or we'll stop." |

Step 1 is what makes it work. A note that shows the business remembers their house reads
as service, not marketing. Pull the install year and system from the job records; skip
anyone without one.

Step 3 keeps the list clean. Suppress anyone who doesn't click "stay" from future
marketing sends (they can still get service emails).

## 5. Missed-call follow-up by text and email

Trigger: an inbound call that wasn't answered (from the phone system or call tracking).
Channel: text first, call back, email only if the email is known. Stop: they reply, a call
connects, or a booking.

| Step | When | Channel | Job |
|---|---|---|---|
| 1 | within 1-2 minutes | text | Sorry we missed you, a real name, ask what's going on, say when you'll call |
| 2 | within about 10 minutes | call back | A person, with the text thread in front of them |
| 3 | about 1 hour if no contact | text | One more short try, with booking options |
| 4 | next morning | text (or email if known) | Last try; how to reach a person |

Step 1 (text): "Hi, this is Dana at Hartline Plumbing. Sorry we missed your call. What's
going on? Reply here, or I'll call you back in 10 minutes. If water is leaking, shut off
the main valve now: [how-to link]."

Step 3 (text): "Hi, Dana at Hartline again. Still need a plumber? Reply with what's going on
and a good time, or book here: [link]."

After hours, say what's true: "We're closed until 7am. Reply with what's going on and
you're first on the list," or the emergency number if one exists. Promising 24/7 and
going quiet is how the bad review gets written. The missed-call system itself (the
text-back setup, routing, measuring answer rates) is `/boring-marketing-speed-to-lead`; this file is only
the words and the timing.

## 6. Treatment-plan follow-up (consult done, treatment not started)

For dentists, med spas, vets, orthodontists and cosmetic practices, this is usually the
biggest money on the table: a patient sat for a consult, got a plan worth hundreds or
thousands, and never scheduled. It's a quote follow-up with a longer clock, because the
decision is bigger and often waits on money, a spouse or fear.

Trigger: a treatment plan presented and not scheduled. Channel: email plus text from the
treatment coordinator by name. Stop: scheduled, declined, or a reply.

| Step | When | Channel | Job |
|---|---|---|---|
| 1 | Same day | email | The plan in writing: what, why, the estimate after expected insurance, payment options, one-tap scheduling |
| 2 | Day 2 | text from the coordinator | "Any questions about the plan Dr. [name] went over?" |
| 3 | Day 7 | email | Answer the likely objection: cost (financing, phasing the work) or fear (what it feels like, recovery time) |
| 4 | Day 21 | call, then text | The direct ask with a real reason (chair time held, the benefits year) |
| 5 | Day 45 | email | What waiting changes, in the dentist's own honest words; no scare tactics |
| 6 | Day 90 | email | Close the loop: "later" moves them to a 6-month recall check |

**The benefits-reset email.** Most dental plans reset their annual maximum on January 1,
though some run on a different plan year. In October or November, send everyone with an
unscheduled plan one email: "If your plan renews January 1, the benefits you haven't used
this year don't carry over. Here's what your plan could cover before then." The office
confirms each patient's plan year before any number goes in.

Keep clinical details out of subject lines and texts, since they show on lock screens:
"your treatment plan", not the procedure. Check the practice's privacy policy for email
and text before automating.

## 7. Appointment reminders (cutting no-shows)

Trigger: an appointment is booked. Channel: text first, email for the details. Stop:
confirmed (skip to step 3), rescheduled, or cancelled.

| Step | When | Channel | Job |
|---|---|---|---|
| 1 | At booking | email + text | Date, time, address, parking, what to bring, how to reschedule |
| 2 | 2 days before | text | "Reply C to confirm or R to reschedule" |
| 3 | Morning of | text | Short reminder with the time and the address link |
| 4 | 15 minutes after a missed start | text | "We missed you today. Want the next opening? Reply with a day that works." |
| 5 | Day 2 after a no-show | call, then email | Rebook; repeat no-shows go to the owner for a deposit or confirmation policy |

Step 2 (text): "Hi [first name], it's [name] at [practice]. You're booked for [day] at
[time]. Reply C to confirm or R to reschedule."
