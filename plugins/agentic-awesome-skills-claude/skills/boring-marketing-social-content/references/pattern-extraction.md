# Pattern Extraction: reverse-engineering why posts work

Load when: running SETUP Phase A (every scrape subagent loads this), recalibrating the pattern library, or before the first SCORE pass of a session (the calibration example at the bottom is the scoring anchor).

---

## 1. The attribution problem: structure, luck or status

A post's engagement has three possible parents. Only one is worth extracting.

**Control for follower count first.** Raw likes measure the author's distribution, not the post's structure. Normalize: engagement rate = engagement ÷ followers. A 50-like post from a 500-follower account (10%) is a stronger structural signal than a 500-like post from a 200K account (0.25%). The big account's number tells you about the account; the small account's number tells you about the post.

**Status test.** Pull the author's median post. If their median does similar numbers whatever the shape, performance is author status: their audience shows up for them, and their structures won't transfer. Extract only from authors whose top posts beat their own median by 5 to 10 times; the gap is where structure lives.

**Luck test.** Flag and discard news-jacking (performance explained by the event, not the shape), a celebrity reply or repost driving the numbers, and a single outlier in an otherwise flat history. One hit is luck until proven otherwise.

**Repeatability test.** The signal you want: the same author runs the same shape 3 or more times with consistently above-median results. That is a pattern. Weight it further if a second account in the sample wins with the same shape.

## 2. The archetype taxonomy

Eight general shapes. Classify every analyzed post into one, or "none" (plenty of posts are shapeless; that's data too). Repeatability is how reliably a different person can run the shape given the ingredients.

| # | Archetype | Structure template | Min ingredients | Repeatability |
|---|---|---|---|---|
| 1 | **ARTIFACT DROP** (image as payload) | Caption of 2 sentences or fewer ("how to X", "give your Y this Z", an outcome) and the image IS the value: a checklist, a one-pager, an annotated screenshot | A genuinely useful visual payload | Very high |
| 2 | **CREDENTIAL STORY** | "I [specific action] in [timeframe]. [Outcome with number]. [The exact steps, or what I'd do differently]" | A true first-person action and a verifiable number | Low, needs real history |
| 3 | **DISAGREE WITH RECEIPTS** | "[Common belief] is wrong or overrated. [Receipt 1: number or example]. [Receipt 2]." Aimed at the mechanism, never the person | A real common belief and at least one receipt | High |
| 4 | **TUTORIAL DROP** | "how to [outcome] ([clarifier]): 1) step with named tool 2) ..." with 4 to 8 steps, each concrete enough to do | A process the author has actually run | High |
| 5 | **OBSERVATION AGGREGATION** | "I [reviewed, talked to, watched] [N things]. The pattern ..." A sample distilled into one finding | A real sample size, even informal | High |
| 6 | **NUMBERED INSIGHT STACK** | N standalone lines on one theme (insights, not steps; each line survives alone) | One theme, 5+ non-obvious lines | Medium |
| 7 | **TIME ANALOGY** | "[Modern thing] now is like [historical thing] in [specific year]" | A historical anchor that carries weight | Medium; high ceiling, easy to botch |
| 8 | **FUTURE STATE** | "We're not far from [condition]. [Concrete near-term implication]" | A specific implication, not vibes | High |

Failure modes worth recording during extraction: artifact drops with decorative (not payload) images; tutorials whose steps are categories, not actions ("optimize your funnel"); disagreement aimed at a belief nobody holds; insight stacks where half the lines are filler to reach a round number.

## 3. Extraction protocol (what each scrape agent records)

Per top post, structural fields only. **Shapes, never sentences** (a hook fragment of 10 words or fewer at most; no full text leaves the analysis):

- **Hook shape:** question / bare claim / number-led / story open / point-of-view frame
- **Body shape:** list / story / image payload / aphorism / long-form essay
- **Length bucket:** one-liner (under 140 characters) / short (140 to 400) / mid (400 to 900) / long (900+)
- **Format:** text / image / carousel or document / video
- **Credential surfacing:** inline number / inside a story / appeal to bio / none
- **The save:** what a reader would come back for (template / steps / number / screenshot / none)
- **Closer:** cold stop / question / call to action / open loop

Across the account, derive the distributions: which hook shapes dominate the winners, the length mix (top posts cluster differently from the median), format share, how often credentials appear at all, and how many winners carry a save. The merge step compares these distributions across accounts; a hook shape that wins everywhere in the niche outranks one account's quirk.

## 4. Scoring calibration: the same idea at 45 and at 85

One idea, two executions. The idea: a freelancer who builds sites for dental practices believes most of them hide the booking button on a phone. (All numbers below are illustrative. In a real draft they come from the user's credential bank, the brief or the user's messages; a draft never invents one, and carries at most one `[verify: ...]` flag.)

**Draft A: 45 out of 100 (don't ship)**

> Hot take: most dental websites are terrible at getting bookings.
>
> Patients want convenience. Practices need to make booking easier.
>
> Agree?

Breakdown: Hook 11/20 (the "hot take" label spends the hook announcing itself; the claim has no stake) · Specificity 5/20 (no number, no example, no named thing; "terrible" compared to what? "Patients want convenience" is a sentence every reader already believes) · Earned credibility 4/15 (nothing shows the author has opened a single site) · Rhythm 13/15 (clean and scannable; polish isn't the problem) · Pattern integrity 9/15 (a disagreement shape with no receipts is half a shape) · Native fit 13/15 (fine length and format). Subtotal 55, tells -10 ("Hot take" label -5, "Agree?" closer -5). **Total 45.** It also fails the save check: there is nothing to keep. Anyone who has never seen a dental site could have written it.

**Draft B: 85 out of 100 (ship)**

> I opened 40 dental practice sites on my phone last month and tried to book a cleaning.
>
> 26 needed three taps or more before a booking button showed up.
>
> The 9 that booked in one tap had the same first screen: the practice name, a "Book a cleaning" button, and the phone number. No photo slider. No welcome paragraph.
>
> Open yours on your phone tonight and count the taps.
>
> Everyone's redesigning their logo. Almost nobody is counting taps.

Breakdown: Hook 18/20 (number-led, a real sample, opens a loop: what did the one-tap sites do?) · Specificity 18/20 (40 sites, 26 at three taps, 9 at one, the exact first-screen recipe) · Earned credibility 14/15 (OBSERVATION AGGREGATION carries the proof inside the structure; "I opened 40" is the receipt) · Rhythm 13/15 (varied line lengths, the recipe lands as its own paragraph) · Pattern integrity 14/15 (a clean aggregation with a usable recipe on top) · Native fit 13/15 (mid-length X post; on LinkedIn the first two lines survive the fold as they are). Subtotal 90, tells -5 (the last line is a balanced pair that sums up; ending on "count the taps" scores higher). **Total 85.** Save check passes: the three-item first screen is the thing people keep.

The gap between A and B is not writing skill. It is one real sample (40 sites), three real numbers, a recipe the reader can copy, and a committed shape. That is the rubric's center of gravity, and why specificity and credibility together outweigh every style dimension combined.
