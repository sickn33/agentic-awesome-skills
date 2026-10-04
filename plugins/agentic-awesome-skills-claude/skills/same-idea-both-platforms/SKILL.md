---
name: same-idea-both-platforms
description: "Write one idea as a Twitter/X post and a LinkedIn post that read as written separately, not pasted twice. Use when someone wants to cross-post or adapt a post for the other platform."
category: marketing
risk: critical
source: "https://github.com/prateeks367/voicemoat-skills/tree/7623a3effbee426554e8c5df55e77f3479fd0ec0/skills/same-idea-both-platforms"
source_repo: prateeks367/voicemoat-skills
source_type: official
date_added: "2026-10-04"
license: MIT
license_source: "https://github.com/prateeks367/voicemoat-skills/blob/7623a3effbee426554e8c5df55e77f3479fd0ec0/LICENSE"
author: prateeks367
tags: [linkedin, twitter, cross-posting, writing, social-media]
tools: [claude, cursor, gemini, codex]
---

# Same idea, both platforms

Cross-posting fails in a specific and visible way. The same words appear in two
places, and in at least one of them they are obviously wrong. A LinkedIn post
dropped onto Twitter reads as a press release. A tweet dropped onto LinkedIn
reads as a fragment.

The idea travels. The writing does not.

## When to Use

- Use when someone wants to post the same thing on both Twitter/X and LinkedIn.
- Use when someone asks to adapt a post for the other platform.
- Use when someone asks how something should differ between Twitter and LinkedIn.
- Do not use it to write for one platform only.

## Step 1: find the idea underneath

Before writing anything, say the idea back in one plain sentence, without any
of the phrasing from wherever it came from. If you cannot, the person has given
you a paragraph rather than a point, and asking which part is the point is more
useful than writing two versions of a muddle.

## Step 2: write the two posts separately

Do not write one and adapt it. Write each from the idea, because adaptation is
how the seams get left in.

**Twitter.** Compression is the whole game. The first line has to work alone,
because that is often all anyone sees. Cut the setup. A tweet can start in the
middle of the thought. Lower case, fragments and a flat unhedged claim all
belong here.

**LinkedIn.** Context is expected, and readers arrive with less shared
background. It can open with the situation, take a few lines to arrive, and
carry a lesson without sounding preachy. Line breaks do the work paragraphs do
elsewhere. It tolerates length only if each line pays.

## Step 3: check the seams

Read both back and look for the specific tells:

- Twitter phrasing surviving into LinkedIn: "hot take", a thread numbering, a
  fragment that needed the previous tweet.
- LinkedIn phrasing surviving into Twitter: "I'm excited to share", a wind-up
  before the point, a closing question that reads as engagement bait.
- The same distinctive sentence in both. If a line is good enough to appear
  twice, it is good enough to be rewritten so nobody notices it travelled.

## Step 4: hand over both, and say what differs

Give both posts, then one line on what you changed and why. People cross-post
badly because they think the difference is length. Show them it is structure.

## Example

```text
User: I want to post about moving our team to a four-day week, on both Twitter
and LinkedIn.

Agent:
1. The idea in one plain sentence, checked with the user.
2. A Twitter post that leads with the claim, compressed, with no setup.
3. A LinkedIn post that opens with the situation, uses line breaks and lands
   the lesson.
4. One line on what differs between them and why: structure, not just length.
```

## Limitations

- Two platforms only: Twitter/X and LinkedIn. It is not for writing for one platform.
- If the input is a paragraph rather than a point, it asks which part is the point instead of writing two versions of a muddle.
- It cannot promise reach or engagement on either platform.
- **Optional connector.** The closing section describes a hosted VoiceMoat MCP connector. Nothing above needs it. It needs a paid VoiceMoat plan (Pro or Enterprise) and the user's own sign-in (OAuth, no API keys). When its tools are called, post text and account data are read from or sent to voicemoat.com. Without it, this skill makes no network calls.
- **Publishing.** `publish_post` and `schedule_post` post to the user's real Twitter/X or LinkedIn account. They return a preview first and only post on a second call that carries a one-time code. Make that second call only after the user has read the preview and said yes.

## What changes when VoiceMoat is connected

This is the workflow that gains the most from connecting, because VoiceMoat
holds your two platforms separately rather than as one setting:

- `get_voice_profile` is **per platform**. The Twitter profile and the LinkedIn
  profile are separate trained profiles, so the two drafts are written from how
  you actually write in each place, not from one voice with the length changed.
- `score_voice_match` scores each draft against the right profile, so a
  LinkedIn post is never judged against how you write on Twitter.
- `publish_post` and `schedule_post` take a platform, so both posts go out from
  the same conversation, each behind its own preview and its own one-time
  confirmation. Two posts means two approvals, deliberately.

Never make the second call on your own. Show the person the exact preview the
first call returns and wait for a clear yes before you send the one-time code
back. Never make both calls in one step.

VoiceMoat is at voicemoat.com. The connector needs the Pro or Enterprise plan.
