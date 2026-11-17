# Cold Outbound: openers, the sequence, send and stop rules, compliance

Load in cold outbound mode (see SKILL.md). The examples use a sample agency, Northside
Growth (fictional), that sets up missed-call text-back for HVAC companies. Thresholds
below are starting points to adjust with your own data, not industry benchmarks.

Cold email has one job: get a reply from a stranger. Not a sale, not a meeting on the
first touch. Every email is short, gives one reason to answer, and asks for one small yes.

## 1. Signals and the research budget

A signal is a public, checkable reason to email this person now. Budget about 3 minutes
per prospect: the site on a phone, the Google profile, the ad libraries, the jobs page.
No signal in that time means the no-signal opener, not more digging. Research that takes
longer than a few minutes per prospect doesn't scale past a few dozen emails.

| Signal | Where to see it fast | What the opener says |
|---|---|---|
| Hiring (dispatcher, CSR, tech) | Their jobs page, job boards | Calls are outrunning the office |
| Running ads | Google Ads Transparency Center, Meta Ad Library | Paid clicks that may hit voicemail |
| New location or service area | Google profile, site, local news | New area, new numbers to answer |
| A recent review about calls or response time | The last 10 Google reviews | Quote it gently, never to shame |
| Award, press, a new partner | A quick news search | Congratulate in one line, then the point |

Keep one row per prospect in the list file: signal, the line you'll use, source URL, date
checked. Every signal line is specific and checkable. Never fake familiarity ("loved your
recent post") and never guess at a fact you didn't see.

One named business with one broken thing on its own site is a pitch, not a sequence:
that's `/boring-marketing-pitch-the-fix`.

## 2. Openers (each whole email under 80 words)

**Signal opener (hiring).** Subject: `your dispatcher opening`

> Hi Dana, saw Ridgeline Heating is hiring a dispatcher. That usually means calls are
> coming in faster than the office can answer them.
>
> We set up a text that replies to every missed call within a minute, so the job doesn't
> go to the next company on the map while you hire.
>
> I recorded a 2-minute video of what a missed call to your main line gets today. Want
> me to send it?

**No-signal opener (works for the whole list).** Subject: `calls while you're on a job`

> Hi [first name], when a furnace quits, the homeowner calls the first two companies on
> the map and books whoever picks up.
>
> If your line goes to voicemail while the crew is on jobs, that call is gone. We set up
> a text that answers every missed call within a minute, with your name on it.
>
> Want a 2-minute video of what a missed call to [company] gets today?

Each opener: one observation (the signal, or the segment's common problem), one sentence
on the fix, one offer, one yes-or-no question. The footer (section 7) goes under every
email and doesn't count toward the 80 words.

## 3. The offer: concrete and low friction

Something useful they can say yes to with one word, before any meeting:

- a 2-minute video of their site, their phone line or their ad as a customer meets it;
- the three searches where a named competitor shows up above them;
- a one-page comparison of their reviews against the top three in their town;
- a first fix, free or at a small fixed price, with a way to see it worked.

Weak offers: "a quick call", "a free consultation", "a strategy session", a 30-page
audit. Ask for interest, not time: "Want me to send it?" beats "Do you have 15 minutes
on Tuesday?"

## 4. The sequence: 4 or 5 touches over about 3 weeks

| Touch | Day | Job | Shape |
|---|---|---|---|
| 1 | 1 | Opener | Signal or no-signal line, the problem, the offer, one yes-or-no ask. No link |
| 2 | 3 | Same thread, one new thing | A result from a similar business (real only) or the offer made more concrete |
| 3 | 7 | Send the asset | The video or the three searches, unasked. The first link in the sequence |
| 4 | 12 | A different angle | A second problem the same service fixes, or one question ("who answers the phone when the crew is out?") |
| 5 | 18 | Close the loop | "Should I close this out?" with a one-word reply option. Optional for small lists |

Every touch is under 80 words, plain text, with one ask and something new. "Just
following up" is not a touch. Subjects are 2 to 4 words in their terms; no "Quick
question", no fake "Re:", no emoji.

Touch 5 example:

> Hi Dana, I haven't heard back, which usually means the timing is off or someone already
> handles this. Either is fine. Reply "later" and I'll check in after the winter rush, or
> "no" and I'll close it out.

## 5. Send rules

- **Send from a separate domain** that reads as related (tryacme.com beside acme.com),
  never the main business domain, so a reputation problem never reaches invoices and client mail. Set up
  SPF, DKIM and DMARC on it and warm each inbox for 2 to 4 weeks before the first
  campaign. Run the deliverability check in Phase 2 on that real domain once it exists.
- **Start small:** about 20 to 30 new emails per inbox per day. Add inboxes rather than
  volume per inbox, and follow the sending tool's limits where they're lower.
- **Plain text,** no images, no open-tracking pixel, no link before touch 3.
- **Verify every address** before it goes in a send. Never send to a guessed pattern.
- **Use a cold email sending tool,** not a newsletter or list tool: Kit, Beehiiv and
  Mailchimp require opt-in consent in their terms.
- **Test one thing at a time.** Each opener goes to 100 to 200 prospects before you judge
  it. Judge on replies, never opens (Apple Mail Privacy Protection inflates opens).

## 6. Stop rules with metrics

**Per prospect, stop the sequence the same day on:** any reply, positive or negative (an
out-of-office pauses it until the return date); a bounce; an opt-out or "not interested",
which goes on the do-not-contact list permanently; a booking or purchase through any
channel.

**Per campaign** (starting thresholds):

| Metric | Healthy | Stop and fix |
|---|---|---|
| Bounce rate | Under 2% | Over 3%: stop, re-verify the list, then resume |
| Spam complaints | Close to zero | Over 0.1%: pause the domain (Gmail's hard line is 0.3%) |
| Reply rate, any reply | 3% or more of delivered | Under 1% after 200 sends on an opener: rewrite the opener and offer, not the follow-ups |
| Positive replies | 1% or more of delivered | Under 0.5% after 500 sends: the list or the offer is wrong; change one |
| Unsubscribes per touch | Under 1% | Over 2%: the list is off-target |

Review weekly: sends, bounces, replies, positive replies, meetings or sales. Write what
won to `./brand/learnings.md`.

## 7. Compliance

CAN-SPAM (US) covers business-to-business email:

- accurate From, Reply-To and routing, and a subject line that matches the email;
- the email is plainly a pitch, not dressed up as personal or transactional mail;
- a valid physical mailing address (a street address, a USPS-registered PO box, or a
  registered private mailbox);
- a clear way to opt out, honored within 10 business days and working for at least 30
  days after the send;
- you're responsible for anyone who sends on your behalf.

Outside the US the rules are stricter: Canada's CASL needs consent (implied consent can
apply to a business address the person published, when the email fits their role), and
the UK and EU treat individuals and sole traders differently from company addresses.
Check before mailing those lists.

The footer under every email:

```
[Your name], [Agency]
[Street address, city, state ZIP]
Not useful? Reply "no" and I won't email again.
```

## 8. Files

```
./campaigns/<name>/
  brief.md          segment, offer, signals used, domain and inbox setup
  send-plan.md      daily volume per inbox, the stop table, review day, the footer
  prospects.md      or .csv: one row per prospect, signal, line, source URL, date checked
  emails/
    01-opener-hiring.md     one file per signal opener
    01-opener-no-signal.md
    02-new-thing.md
    03-asset.md
    04-angle.md
    05-close.md
```

`sequence-summary.json` uses `sequence_type: "custom"`. Prospect facts stay in the
campaign folder, never in brand memory.
