# Voice Extraction Judgment: falsifiability, exhibits, and the competitor-paste test

**When to load:** before writing or updating ANY voice profile (all four modes). This is
the quality bar the profile must clear before the Voice Test Loop runs.

## The Barnum problem

Most voice profiles fail the same way horoscopes succeed: every line reads as true
because every line would be true of anyone. "Authentic and approachable, with a
confident but humble tone" describes every brand that has ever existed, which means it
constrains nothing. A writer holding that profile produces the same generic copy they'd
produce with no profile at all. A voice profile's value is exactly proportional to what
it RULES OUT.

## The Falsifiability Rule

Every trait, every tone-spectrum row, every vocabulary claim, every rhythm claim in the
profile must satisfy BOTH:

1. **Cite an exhibit.** The claim names at least one exhibit ID (E1, E2, ...) from the
   Evidence Appendix: a verbatim quote from the brand's actual corpus that demonstrates
   the claim. Build mode has no corpus, so cite the user's answer verbatim ("from
   intake: 'I never want to sound like a LinkedIn guru'") and mark the profile
   `Evidence: INTAKE (exhibits pending first published content)`.
2. **Survive the competitor-paste test** (below).

A line that fails either test gets sharpened or deleted. Deleting is fine. A 6-line
profile that's all signal beats a 40-line profile that's mostly horoscope.

## The competitor-paste test

Imagine pasting the line into the voice profile of the brand's most direct competitor.
Would anyone notice it doesn't belong?

- "Values clarity and avoids jargon" → survives the paste → DELETE or sharpen. Everyone
  claims this.
- "Explains pricing mechanics with restaurant-margin math because the founder ran a
  kitchen for 9 years (E4, E11)" → would be instantly wrong in a competitor's profile →
  KEEP.

The test catches virtue-claims (authentic, bold, human, no-nonsense), universal
aspirations (clear, concise, engaging), and category-wide norms ("casual on social,
professional in proposals" is true of the whole industry). What passes: named behaviors,
countable habits, specific references, biographical anchors, idiosyncratic phrases,
stated enemies.

## Exhibit mechanics

- Subagent evidence packs supply candidate exhibits; the merge step assigns stable IDs
  (E1...En) and writes them into the profile's **Evidence Appendix** with source URL and
  source type.
- An exhibit is a verbatim quote, 5-60 words, long enough to show the pattern. Never
  paraphrase, because paraphrase launders the voice back into model-speak.
- One exhibit can support several claims; a claim needing zero exhibits is a claim about
  nothing.
- Weight exhibits by authenticity of source: unscripted speech (podcast/video
  transcripts) > social posts > newsletter > website copy. Website copy is frequently
  agency-written; when website exhibits contradict spoken/social exhibits, trust the
  latter and say so in the profile ("site copy runs two notches more formal than the
  founder's actual voice: write to the founder, not the site").

## Granularity: claims name observable behavior

A passing claim is countable or quotable. Convert virtues into behaviors:

- "confident" → what does confidence DO in their prose? (states numbers without hedges?
  opens with the conclusion? never uses "I think"?)
- "humorous" → what KIND? (self-deprecation about specific failures? absurdist
  analogies? dry understatement? one per piece or constant?)
- "direct" → directly WHAT? (names competitors? tells readers what not to buy? gives the
  answer in the first line?)

## Calibrated pairs: generic → sharp

**Pair 1: personality trait**

- ✗ Generic: "**Authentic and relatable:** shares real experiences and connects with the
  audience on a human level."
- ✓ Sharp: "**Failure-led teaching:** opens roughly half of long posts with a specific
  past mistake and its cost before the lesson, as in 'I spent $14k on a rebrand nobody asked
  for' (E3); 'the first cohort had four students and two were my friends' (E9). Never
  opens with the win."

**Pair 2: tone spectrum row**

- ✗ Generic: "Formal ↔ Casual: casual but professional, conversational without being
  sloppy."
- ✓ Sharp: "Formal ↔ Casual: casual to the edge of texting, with sentence fragments (E2,
  E7), 'gonna' in headers (E12), but zero emoji and zero exclamation marks anywhere in
  the corpus. The casualness is in syntax, never in punctuation."

**Pair 3: vocabulary**

- ✗ Generic: "Avoids jargon and buzzwords; prefers plain, simple language."
- ✓ Sharp: "Uses practitioner jargon freely (CAC, churn cohorts, 'payback math', E5,
  E14) but bans aspiration-speak: 'scale,' 'journey,' and '10x' appear zero times in 31
  posts. Jargon signals peer; hype signals seller. Keep the first, kill the second."

## When nothing sharp emerges

Two honest possibilities, with different responses:

1. **Corpus too thin or too ghostwritten.** Under ~1,500 words, or all-website-copy with
   no social/spoken material, patterns are noise. Say so, ask for more sources, or fall
   back to Build mode. Do not extract a horoscope from a brochure.
2. **The voice genuinely is mild.** Some brands really are clean, neutral,
   low-personality, and that is itself falsifiable if stated concretely: "no humor in 28
   posts, no first-person singular, no rhetorical questions; the distinguishing move is
   information density per sentence (E1, E6)." Mild is a voice. Vague is not.
