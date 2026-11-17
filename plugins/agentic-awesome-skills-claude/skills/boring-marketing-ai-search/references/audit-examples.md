# Audit examples: what a strong read looks like

Load before writing the audit's read and before writing a MONITOR update. Hartline Plumbing, Dallas TX and Northpeak (scheduling software for multi-location teams) are sample businesses, and every number, competitor slot and finding below is illustrative. The shapes come from the audits that owners and clients acted on; the weak versions come from the ones they didn't.

## What separates a read that gets acted on

1. **It leads with who wins instead,** in the buyer's words, over an observed denominator. Never a score.
2. **Three findings at most in the read, costliest first,** each naming the fact, why it costs in one sentence the owner would nod at, and the competitor who wins it.
3. **One recommended move,** with what it involves, how long the owner's part takes, and how we'll know it worked within a month or two. When the honest answer is "this part is a longer climb", it says so.
4. **Every claim points at a capture** in the notes file: question, engine, date, location.
5. **What wasn't measured is said out loud,** in plain words, once, in the Sources and assumptions note.
6. **No internal language.** No field names, status codes, layer labels or tool names in the report. The receipts sit in the notes file.

## Local audit: Hartline Plumbing (sample)

**Strong read.**

> **What I found:** When people in Dallas ask ChatGPT or Perplexity for a water heater company, they name <competitor A> and <competitor B>, not Hartline. That held in 0 of 6 observed answers. Gemini named Hartline once, but gave its old phone number.
> **Why it matters:** these are the people with a leaking tank today. An assistant that sends them to two other companies, or to a dead number, is a lost job each time.
> **Why now:** two money questions show the same gap, and the wrong number costs calls every day it stays up.
> **What I recommend:** fix the old phone number at its source (an old directory listing and the profile description), then ask the two "best plumbers in Dallas" lists the engines cite to review Hartline. The owner's part is about 30 minutes. We'll know it worked when the next monthly check shows the right number and Hartline named in at least one of the list-driven answers. Getting into the list-driven answers can take a few months; the wrong number can be gone in weeks.

**Weak read of the same evidence.**

> Your AI visibility score is 31/100. You have 17 issues across schema, content and authority. We recommend optimizing your Google Business Profile, adding FAQ schema, building backlinks and creating more content.

Why it fails: a score instead of the people who win, no denominator, seventeen findings with no competitor names, advice that fits every plumber in Texas, and the one finding that costs calls today (the wrong number) is buried or missing.

**Findings, typed (strong).**

| Type | Question | What we saw | Fix |
|---|---|---|---|
| Wrong or merged facts | "water heater leaking from the bottom, who can fix it today in Dallas" | Gemini named Hartline with a number disconnected last year | L1: correct the old directory listing and the profile description |
| Outside-source gap | "best water heater company in Dallas" | 5 of 6 observed answers cite the same two roundups; Hartline is on neither | L3: placement plan for those two lists |
| Expand scope | "best plumber in Garland" | Named in Dallas answers, absent in Garland, where a regional peer is named | Scope drill, then /boring-marketing-local-seo-plan for a Garland page if the proof exists |
| Unmeasured | Ask Maps for Richardson | Not captured | Owner to capture 2 questions from Richardson |

## Software audit: Northpeak (sample)

**Strong read.**

> **What I found:** When operations managers ask assistants how to schedule staff across several locations, the answers recommend two single-site schedulers and cite roundups that never test multi-location features. Northpeak was named in 1 of 12 observed answers and its own site was never a source.
> **Why it matters:** the comparison questions are where buyers form the shortlist, and Northpeak isn't on it.
> **Why now:** This does not look urgent yet. The one high-intent question that named a competitor is a single observation; the next check will tell us if it holds.
> **What I recommend:** publish one number only Northpeak has (how often multi-location schedules change in a week, from its own anonymized data) on a comparison page with a verdict per team type. We'll know it worked when a roundup or an answer quotes the number.

**The empty slot.** If an answer to "what's the best way to schedule staff across locations?" names no product at all, write that down as a finding of its own: nobody to displace, and often the cheapest win in the set.

## MONITOR update (sample)

> **Last decision:** fix the old phone number (shipped 5 weeks ago) and pitch the two lists (one replied, one hasn't).
> **Needs your decision:** add "plumbers like <competitor C> in Dallas" to the question set? <Competitor C> was newly named in two runs in a row. A yes starts a new baseline from this run.
> **What changed:** Gemini now gives the right number (2 of 2 observed). Named in 1 of 6 "best water heater company" answers, up from 0, after the list update shipped; an untouched same-day repeat matched, so it isn't same-day noise. Nothing else moved; 9 of 12 questions held, inside normal churn.
> **Note:** same 12 questions, same engines, Dallas, 34 of 36 observed; Perplexity failed twice and those 2 are indeterminate, not losses.

Weak version: a table of every question with every state, no last decision, no single ask, and two failed captures reported as "lost visibility".

## The Sources and assumptions note

> **Sources and assumptions:**
> - 12 questions on ChatGPT, Perplexity and Gemini, signed out, location set to Dallas, over two days; 30 of 36 answers observed. Ask Maps captured for 4 questions by the owner's phone; the cited pages fetched in full for 5 winners.
> - Google AI Overviews were only seen through organic results, so the Google picture is a proxy. Want me to set a browser to Dallas and capture the 5 money questions? About 15 minutes, no paid tools.
> - AI citations churn month to month; this is a snapshot.

At most 3 receipt lines: what was checked, one named gap, one offer. A list of five optional add-ons makes the user do the diagnosis. The software audit's equivalent line: 12 questions on ChatGPT, Perplexity and Google, signed out, US, one day, 12 of 12 observed, and the brand name resolved correctly on all three engines.
