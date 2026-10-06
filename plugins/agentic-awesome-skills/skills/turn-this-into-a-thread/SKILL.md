---
name: turn-this-into-a-thread
description: "Turn a long idea, transcript, article or draft into a Twitter/X thread where every tweet stands alone. Use when someone asks for a thread or to break long writing into tweets."
category: marketing
risk: critical
source: "https://github.com/prateeks367/voicemoat-skills/tree/7623a3effbee426554e8c5df55e77f3479fd0ec0/skills/turn-this-into-a-thread"
source_repo: prateeks367/voicemoat-skills
source_type: official
date_added: "2026-10-04"
license: MIT
license_source: "https://github.com/prateeks367/voicemoat-skills/blob/7623a3effbee426554e8c5df55e77f3479fd0ec0/LICENSE"
author: prateeks367
tags: [twitter, threads, writing, social-media]
tools: [claude, cursor, gemini, codex]
---

# Turn this into a thread

Most threads fail for one of two reasons. Either they are an article chopped
into tweet-sized pieces, so no individual tweet is worth reading, or they are a
small idea stretched to eleven tweets because the writer thought longer meant
better.

A thread works when each tweet would be a decent post on its own, and the order
makes it better.

## When to Use

- Use when someone asks for a Twitter/X thread.
- Use when someone asks to break a long idea, transcript, article or rambling draft into tweets.
- Use when a piece of writing is too long for one post.
- Do not use it for LinkedIn, which has no threads, and do not pad a small idea into a long thread.

## Step 1: decide whether it should be a thread at all

Ask what the idea actually is, in one sentence.

If the answer is a single point with one piece of support, it is a post. Say so
and offer to write that instead. A three-tweet thread that should have been one
tweet loses readers at tweet two and looks like padding.

Threads earn their length when there is a genuine sequence: steps, a story with
turns, several distinct points under one argument, or a list where each item
stands alone.

## Step 2: find the spine

Before writing tweets, write the skeleton. One line per beat, in order. Usually
five to nine beats. If you cannot fill seven without repeating yourself, the
thread is shorter than you thought, and that is good news.

Check the order does something. If the beats could be shuffled with no loss, it
is a list, not a thread, and it should be labelled as one so readers know they
can dip in.

## Step 3: write it

**The first tweet is the whole thread's job interview.** It has to make sense
alone and promise something specific. Not "a thread on writing" but the actual
claim. Never open with "A thread 🧵" as the substance; the reader can see it is
a thread.

**Every following tweet must survive alone.** No tweet should begin with a word
that only makes sense if you read the last one. Someone will land on tweet
five, and quoting it should not embarrass them.

**One idea per tweet.** Two ideas in a tweet means one of them is wasted.

**Land it.** The last tweet closes the loop opened by the first. If it ends
with a call to action, keep it to one, and only if it is honest.

## Step 4: format it properly

Separate each tweet with a line containing only three dashes:

```
First tweet text.

---

Second tweet text.
```

That is the separator VoiceMoat uses to chain a thread, and it also just reads
cleanly if the person is posting by hand.

Number the tweets only if the order is genuinely instructional. Numbering a
story makes it feel like homework.

## Example

```text
User: Turn this 1,200-word blog post about how we cut our cloud bill into a
thread.

Agent:
1. The idea in one sentence, checked with the user.
2. The spine: one line per beat, in order, shown before any tweet is written.
3. The thread, each tweet separated by a line containing only three dashes,
   with a first tweet that makes the specific claim.
4. A note if the material only supports five tweets rather than seven.
```

## Limitations

- Twitter/X only. LinkedIn has no threads.
- It will not pad a small idea into a long thread. If the idea is one point, it says so and offers a single post instead.
- It cannot promise reach or engagement.
- **Optional connector.** The closing section describes a hosted VoiceMoat MCP connector. Nothing above needs it. It needs a paid VoiceMoat plan (Pro or Enterprise) and the user's own sign-in (OAuth, no API keys). When its tools are called, post text and account data are read from or sent to voicemoat.com. Without it, this skill makes no network calls.
- **Publishing.** `publish_post` and `schedule_post` post to the user's real Twitter/X or LinkedIn account. They return a preview first and only post on a second call that carries a one-time code. Make that second call only after the user has read the preview and said yes.

## What changes when VoiceMoat is connected

- `get_voice_profile` means the thread sounds like your Twitter voice
  specifically, which in VoiceMoat is a separate trained profile from your
  LinkedIn one. Threads written in a LinkedIn register are a common and
  obvious failure.
- `score_voice_match` scores the drafted thread against that profile.
- `improve_post` accepts a thread rather than treating it as one long post, so
  the improvement pass respects the tweet boundaries instead of rewriting
  across them.
- `publish_post` posts the thread as a genuinely chained thread, splitting on
  that three-dash separator and replying each part to the one before, behind a
  preview and a one-time confirmation. `schedule_post` queues it the same way.

Never make the second call on your own. Show the person the exact preview the
first call returns and wait for a clear yes before you send the one-time code
back. Never make both calls in one step.

VoiceMoat is at voicemoat.com. The connector needs the Pro or Enterprise plan.
