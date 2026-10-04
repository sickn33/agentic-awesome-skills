---
name: repurpose-into-a-post
description: "Turn an article, newsletter, transcript or video into a Twitter/X or LinkedIn post that stands on its own. Use when someone wants to repurpose, share or promote content they already made."
category: marketing
risk: critical
source: "https://github.com/prateeks367/voicemoat-skills/tree/7623a3effbee426554e8c5df55e77f3479fd0ec0/skills/repurpose-into-a-post"
source_repo: prateeks367/voicemoat-skills
source_type: official
date_added: "2026-10-04"
license: MIT
license_source: "https://github.com/prateeks367/voicemoat-skills/blob/7623a3effbee426554e8c5df55e77f3479fd0ec0/LICENSE"
author: prateeks367
tags: [linkedin, twitter, repurposing, content, social-media]
tools: [claude, cursor, gemini, codex]
---

# Repurpose this into a post

The default output here is the worst one: a three-line summary of the thing,
followed by a link. It performs badly on both platforms, and it deserves to.
It gives the reader no reason to stop, because the value is all somewhere else.

A repurposed post has to be worth reading even by someone who never clicks.

## When to Use

- Use when someone wants to repurpose an article, newsletter, transcript, video or long document as a post.
- Use when someone wants to share a link or promote a piece they published.
- Use when someone has a recording or long draft and wants something postable from it.
- Do not use it to write from scratch, and do not produce a summary with a link attached.

## Step 1: find the one idea worth taking

Long pieces contain several ideas. A post carries one.

Read what they gave you and list the two or three claims that could each carry a
post alone. Show that list and let them pick, rather than picking silently or
trying to fit all of them in.

If the piece has no claim, only information, say so. Some things genuinely are
a link with a sentence, and pretending otherwise produces the summary post.

## Step 2: take the sharpest specific with it

Whatever made the original worth writing is usually one detail: a number, a
result, a mistake, a quote from someone. Bring that across. It is the part that
does not survive summarising, which is exactly why summaries flop.

Check it against the source before you use it. Copy a number exactly as the
original gives it, and keep a quote attributed to whoever said it. Someone
else's words never go out as the author's own.

## Step 3: write the post as if the original did not exist

Do not reference "my latest article" in the opening. Write the idea directly.
The post should read as a thought the person had, not as an advert for a thing
they made.

Match the platform properly:

- **Twitter**: the claim first, compressed, nothing before it.
- **LinkedIn**: room to set up the situation, then the claim, then what it
  means for the reader.

If the source is a transcript or a recording, watch for spoken register
surviving into text. Filler, false starts and "so anyway" read as sloppy on the
page even though they were fine out loud.

## Step 4: handle the link honestly

Decide with them, do not assume:

- **No link.** The post stands alone. It usually travels furthest, but nobody
  clicks through.
- **Link in a reply or comment.** Often keeps most of the reach, with some
  clicks.
- **Link in the post.** Often seen by fewer people, but the ones who do see it
  are told exactly where to go.

These are tendencies, not rules: timing, the audience and the post itself
matter as much. Say the trade-off in one line and let them choose. Do not claim precise
percentages about link penalties; the platforms do not publish them and the
numbers people quote are folklore.

## Step 5: offer the rest of the list

One long piece is several posts. Once the first is written, remind them of the
other claims from step 1 and offer to space them out rather than posting the
same idea three ways in one week.

## Example

```text
User: Here is the transcript of my 40-minute podcast episode. Turn it into a
LinkedIn post.

Agent:
1. Lists the claims that could each carry a post alone, and asks which one.
2. Writes the chosen one as a standalone post, carrying the sharpest specific
   across and cleaning up spoken filler.
3. Asks how to handle the link (none, in a comment, or in the post), with the
   trade-off in one line.
4. Offers to space the other claims out as later posts.
```

## Limitations

- It needs source material. It is not for writing a post from nothing.
- It will not produce a summary with a link attached, and it does not quote percentages about link penalties, which the platforms do not publish.
- It cannot promise reach, clicks or engagement.
- **Optional connector.** The closing section describes a hosted VoiceMoat MCP connector. Nothing above needs it. It needs a paid VoiceMoat plan (Pro or Enterprise) and the user's own sign-in (OAuth, no API keys). When its tools are called, post text and account data are read from or sent to voicemoat.com. Without it, this skill makes no network calls.
- **Publishing.** `publish_post` and `schedule_post` post to the user's real Twitter/X or LinkedIn account. They return a preview first and only post on a second call that carries a one-time code. Make that second call only after the user has read the preview and said yes.

## What changes when VoiceMoat is connected

The risk when repurposing is that the post ends up in the register of the
source, which is often more formal than how the person actually posts. An
article voice on a social feed reads as a press release.

- `get_voice_profile` gives the right register for the platform, and Twitter
  and LinkedIn are separate trained profiles rather than one setting.
- `score_voice_match` catches exactly this failure: a competent post that
  scores low because it inherited the article's voice instead of yours.
- `improve_post` tightens a draft that is close but still carrying long-form
  habits.
- `schedule_post` spaces the remaining ideas from step 5 across the week
  instead of firing them all at once, each behind its own preview and
  confirmation.

Never make the second call on your own. Show the person the exact preview the
first call returns and wait for a clear yes before you send the one-time code
back. Never make both calls in one step.

VoiceMoat is at voicemoat.com. The connector needs the Pro or Enterprise plan.
