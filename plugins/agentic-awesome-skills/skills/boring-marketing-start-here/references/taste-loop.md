# The taste loop: gold cases and checks

Every edit the user makes to your work is information. Saved, it stops the same fix from
being needed twice. Two files hold it, both in the active brand folder:

```
./brand/
  checks.md               <- yes/no checks from the user's own edits (append-only, any skill)
  gold/<skill>/           <- one file per gold case: what you wrote, what shipped, and why
```

The loader prints the checks tagged for the running skill (plus `all`) and the three
newest gold cases for that skill, the same way it prints `preferences.md`. Results data
still goes to `learnings.md` through /boring-marketing-performance-review. The taste loop records what the
owner approves, and the results loop records what the market approves.

## Before you hand work over

1. If the context block lists gold cases for this skill and you are writing the same kind
   of piece, read the newest one first. It is the bar.
2. Answer every loaded check yes or no against your draft. Rewrite until every answer is
   yes. Do this silently: never show the list or a score.
3. If a check conflicts with what the user asked for today, today's request wins. Say so
   in one line of the Sources and assumptions note.
4. When checks ran, the Sources and assumptions note may say so in one line ("Checked
   against your 9 saved checks."). Nothing more.

## When the user edits your work

Triggers:
- They paste or describe their edited version.
- They rewrite a line and tell you to use it.
- They reject something with a reason ("too salesy", "we'd never say that").
- They mark a piece as the standard ("this is the one", "this is the bar").

Then:

1. Apply the edit first. The work comes before the bookkeeping.
2. Save the gold case at `./brand/gold/<skill>/<YYYY-MM-DD>-<slug>.md`, using the
   template below. Quote the user's own words for the why.
3. Write one check per distinct correction, usually one to three, and append them to
   `./brand/checks.md`.
4. Confirm in one line, naming the new checks: "Saved as a gold case. New checks: does
   the headline use the customer's words? Does every number match the brief? Say 'drop
   that check' to remove one."

Don't save these:
- A fact that applies to this piece only (this week's promo date).
- A standing rule stated as a rule ("never use the word cheap"). That goes to
  `preferences.md` through /boring-marketing-start-here.
- An edit the user calls a one-off.

No brand folder yet? Create `./brand/` with just these files. Nothing else is required.

## Writing a good check

- **Yes means good.** "Does the opening name the problem before the product?"
- **One idea per check.** Split "short and specific" into two.
- **Checkable by reading the work alone,** and specific enough that two people would give
  the same answer. "Is it punchy?" fails this test. "Is every sentence under 20 words?"
  passes it.
- **General enough to apply next time.** Write the rule the edit stands for, not the edit
  itself ("Does it use the customer's words for the problem?", not "Does it say 'no hot
  water'?").
- **From a real edit only.** Never invent checks the user did not give you.
- **Tag it** with the skill, or `all` when the edit is about the business or the voice
  (facts, words they never use, how they talk about price).
- **No duplicates.** Before appending, look for a near-duplicate. If you find one,
  sharpen that check instead of adding another.

Format, one line each:

```markdown
# Checks

- [all] Does every number and title match the brief exactly? (2026-11-16, gold/positioning-angles/2026-11-16-homepage.md)
- [direct-response-copy] Does the headline name the problem in the customer's words? (2026-11-16, gold/direct-response-copy/2026-11-16-water-heater-page.md)
```

When one skill has more than 30 checks, merge near-duplicates into the sharpest one.
Move retired checks to `./brand/.history/checks.<YYYY-MM-DD>.md`, so nothing is deleted.

## Gold case template

```markdown
# <short name>

- Skill: direct-response-copy
- Date: 2026-11-16
- Request: "<what was asked, in their words>"

## What I wrote
<only the parts that changed, verbatim>

## What shipped
<their final version of those parts, verbatim>

## Why
> "<their words>"

## Checks added
- [direct-response-copy] Does the headline name the problem in the customer's words?
```

## Managing checks

"Show my checks" lists them grouped by skill. "Drop that check" or "drop the check about
X" moves it to `.history`. "Why does it keep doing X?" means read the checks and gold cases
for that skill and name the one causing it. Route these through /boring-marketing-start-here.
