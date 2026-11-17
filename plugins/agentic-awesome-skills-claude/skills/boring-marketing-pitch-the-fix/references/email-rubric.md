# The email rubric, two calibrated emails, and the sending rules

Load before the first score of a session. Uncalibrated scoring drifts generous. Scores are an internal check: the user sees the passing email, never the scores or this rubric.

## Five dimensions, 1 to 5 each

| Dimension | 5 looks like | 1 looks like |
|---|---|---|
| Specific | Their business, their page, their words quoted | Could be sent to any business in the trade |
| Evidence | A stranger could re-check it in a minute (the ad text, the page, the date) | A claim with nothing behind it ("your SEO needs work") |
| One thing | One problem and one fix | A list of problems, or a menu of services |
| Proof | Says how both of you will know it worked, with a number they already trust | No way to tell if it worked, or a promise of results |
| Plain | Under ~120 words, no jargon, no "AI", sounds like one person writing to another | Agency copy, buzzwords, long paragraphs |

Ship at 21 of 25 with nothing under 4. Honesty and compliance are pass or fail (below), not a score.

## A weak email, 6 of 25: don't send

```
Subject: Quick question

Hi there,

I hope this email finds you well! I'm reaching out because I help home
service businesses like yours leverage AI-powered marketing to generate
more leads and grow revenue. After reviewing your online presence, I
noticed several opportunities for improvement in your SEO, website design,
Google Business Profile and social media.

Our proven system has helped clients achieve up to 300% more leads. Would
you be open to a 30-minute strategy call next week to discuss?
```

Specific 1 (fits any business), evidence 1 ("several opportunities", none named), one thing 1 (four areas), proof 1 ("up to 300%" is a promise with nothing behind it, and likely a borrowed number), plain 2 (filler opener, "leverage", "AI-powered"). Total 6 of 25. The subject line is the classic bait, and the ask is a half-hour meeting with a stranger.

## A strong email, 23 of 25: send

The Hartline Plumbing sample in SKILL.md, Phase 4 (a sample business; the ad text is invented).

Specific 5 (their ad, their page, their promise quoted), evidence 5 (the ad text and the page are both re-checkable), one thing 5 (one page, one fix), proof 4 (calls from the page before and after; a 5 would name where the count comes from, such as the tracking number already on the site), plain 4 (about 100 words; "the way a customer would" earns its place, though line 1 could be shorter). Total 23 of 25. Ship.

What separates them is not writing skill. It is one real observation, their own words, and a fix small enough to picture.

## Subject lines

Good: their thing in two to five words, lower case is fine. `your 24/7 ad` · `the call button on your site` · `last month's reviews`.
Bad: "Quick question", "Partnership opportunity", their name and an emoji, "Re:" on a first email, anything in all capitals.

## Sending rules (CAN-SPAM basics, from the FTC's compliance guide)

These are hard rules for US recipients. The law makes no exception for business-to-business email.

1. The From, To, Reply-To and routing information are accurate and identify you.
2. The subject line reflects what's in the email.
3. It's clear the email is a pitch. Plain wording does this ("I build sites for plumbers... I can fix it this week").
4. It carries your valid physical mailing address. A registered PO box or private mailbox counts.
5. It tells the reader how to opt out, and the way out keeps working for at least 30 days after you send.
6. Opt-outs are honored within 10 business days, with no fee and no hoops.
7. If someone sends for you, you are still responsible.

Each email that breaks the law can cost up to $53,088 (FTC, as of Nov 2026). Outside the US: Canada's CASL, and the UK and EU rules, are stricter about consent. Check before sending there.

## Delivery, kept small

- Send from a real inbox with a real signature, a few a day at first. Volume is what gets a domain flagged.
- Many agencies send cold email from a second domain so their main domain's mail keeps landing. Set it up with SPF, DKIM and DMARC before the first send. Give this as one line of advice; never audit a domain the user hasn't named.
- Over about 5,000 a day to Gmail, Yahoo or Outlook addresses, the bulk-sender rules apply (one-click unsubscribe, complaint rate under 0.1%). A local agency pitching one town shouldn't be anywhere near that.
- No tracking pixels or link tracking in the first email.
